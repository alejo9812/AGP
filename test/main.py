from __future__ import annotations

import argparse
import os
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

try:
    from src.core.config import DEFAULT_STREAMLIT_HOST, DEFAULT_STREAMLIT_PORT
    from src.core.pipeline import run_pipeline
    from src.utils.errors import AGPMVPError
    from src.utils.paths import ROOT_DIR, STREAMLIT_APP_PATH
except ModuleNotFoundError as exc:  # pragma: no cover - bootstrap path for double-click usage
    missing_package = exc.name or "dependencia requerida"
    print(
        "[ERROR] No pude iniciar el MVP porque faltan dependencias de Python.\n"
        f"Detalle: modulo no encontrado: {missing_package}\n\n"
        "Abre la carpeta test y ejecuta:\n"
        "  .venv\\Scripts\\python.exe -m pip install -r requirements.txt\n"
        "o usa run_agp_mvp.cmd para aprovechar el entorno virtual."
    )
    try:
        input("\nPresiona Enter para cerrar...")
    except EOFError:
        pass
    raise SystemExit(1)


def _build_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="AGP Warehouse Grouping MVP local")
    parser.add_argument("--file", type=str, default="", help="Ruta opcional del Excel a procesar.")
    parser.add_argument("--output-dir", type=str, default="", help="Carpeta opcional para las salidas.")
    parser.add_argument("--host", default=DEFAULT_STREAMLIT_HOST, help="Host para la interfaz Streamlit.")
    parser.add_argument("--port", type=int, default=DEFAULT_STREAMLIT_PORT, help="Puerto para la interfaz Streamlit.")
    parser.add_argument("--no-ui", action="store_true", help="Genera artefactos sin abrir la interfaz.")
    return parser.parse_args()


def _resolve_path(raw_path: str) -> Path:
    candidate = Path(raw_path)
    if candidate.is_absolute():
        return candidate
    return (ROOT_DIR / candidate).resolve()


def _wait_for_port(host: str, port: int, timeout_seconds: int = 25) -> bool:
    start = time.time()
    while time.time() - start < timeout_seconds:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1)
            if sock.connect_ex((host, port)) == 0:
                return True
        time.sleep(0.5)
    return False


def _port_is_available(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return sock.connect_ex((host, port)) != 0


def _pick_available_port(host: str, requested_port: int, max_attempts: int = 20) -> int:
    for candidate_port in range(requested_port, requested_port + max_attempts):
        if _port_is_available(host, candidate_port):
            return candidate_port
    raise AGPMVPError(
        f"No encontre un puerto libre para abrir la interfaz a partir de {requested_port}."
    )


def launch_streamlit(manifest_path: Path, host: str, port: int) -> int:
    resolved_port = _pick_available_port(host, port)
    env = os.environ.copy()
    env["AGP_MVP_MANIFEST_PATH"] = str(manifest_path.resolve())
    command = [
        sys.executable,
        "-m",
        "streamlit",
        "run",
        str(STREAMLIT_APP_PATH.resolve()),
        "--server.address",
        host,
        "--server.port",
        str(resolved_port),
        "--server.headless",
        "false",
        "--browser.gatherUsageStats",
        "false",
    ]

    process = subprocess.Popen(command, cwd=str(ROOT_DIR), env=env)
    url = f"http://{host}:{resolved_port}"
    print(f"[INFO] Abriendo interfaz en {url}")
    if _wait_for_port(host, resolved_port):
        webbrowser.open(url)
    try:
        return process.wait()
    except KeyboardInterrupt:
        process.terminate()
        return process.wait()


def main() -> int:
    args = _build_args()
    try:
        source_file = _resolve_path(args.file) if args.file else None
        if source_file and not source_file.exists():
            raise AGPMVPError(f"El archivo indicado no existe: {source_file}")

        output_dir = _resolve_path(args.output_dir) if args.output_dir else None
        artifacts = run_pipeline(source_file=source_file, output_dir=output_dir)

        print("[OK] Análisis completado")
        print(f"  Excel: {artifacts.source_file}")
        print(f"  PDF: {artifacts.output_paths.pdf_report}")
        print(f"  CSV detalle: {artifacts.output_paths.detail_csv}")
        print(f"  CSV matches: {artifacts.output_paths.matches_csv}")
        print(f"  Manifiesto: {artifacts.output_paths.latest_manifest}")
        print(f"  Total registros: {artifacts.summary['total_records']}")
        print(f"  Completables: {artifacts.summary['completable_total']}")
        print(f"  Requieren fabricación: {artifacts.summary['requires_fabrication_total']}")

        if args.no_ui:
            return 0
        return launch_streamlit(artifacts.output_paths.latest_manifest, args.host, args.port)
    except AGPMVPError as exc:
        print(f"[ERROR] {exc}")
        try:
            input("\nPresiona Enter para cerrar...")
        except EOFError:
            pass
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
