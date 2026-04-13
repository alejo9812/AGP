from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.static_site import build_static_site
from src.utils.errors import AGPMVPError


def _build_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Genera el MVP estatico de AGP dentro de test/.")
    parser.add_argument("--file", type=str, default="", help="Ruta opcional del Excel a procesar.")
    parser.add_argument(
        "--target-root",
        type=str,
        default="",
        help="Carpeta de salida opcional. Por defecto usa la raiz de test/.",
    )
    return parser.parse_args()


def _resolve_path(raw_path: str, base_dir: Path) -> Path:
    candidate = Path(raw_path)
    if candidate.is_absolute():
        return candidate
    return (base_dir / candidate).resolve()


def main() -> int:
    args = _build_args()

    try:
        source_file = _resolve_path(args.file, PROJECT_ROOT) if args.file else None
        target_root = _resolve_path(args.target_root, PROJECT_ROOT) if args.target_root else PROJECT_ROOT
        artifacts = build_static_site(source_file=source_file, target_root=target_root)

        print("[OK] MVP estatico generado")
        print(f"  Excel: {artifacts.source_file}")
        print(f"  Dataset JSON: {artifacts.paths.dataset_json}")
        print(f"  Dataset JS: {artifacts.paths.dataset_js}")
        print(f"  PDF: {artifacts.paths.pdf_report}")
        print(f"  Registros: {len(artifacts.results_payload)}")
        print(f"  Completables: {artifacts.summary_payload['kpis']['completables']}")
        print(f"  Requieren fabricacion: {artifacts.summary_payload['kpis']['requieren_fabricacion']}")
        return 0
    except AGPMVPError as exc:
        print(f"[ERROR] {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
