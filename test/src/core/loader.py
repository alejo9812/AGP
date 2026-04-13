from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.utils.errors import AGPMVPError, ExcelNotFoundError
from src.utils.paths import INPUT_DIR, is_excel_file


def find_latest_excel(test_dir: Path | None = None) -> Path:
    search_dir = test_dir or INPUT_DIR
    candidates = [path for path in search_dir.iterdir() if is_excel_file(path)] if search_dir.exists() else []
    if not candidates:
        raise ExcelNotFoundError(
            f"No se encontró ningún archivo Excel en la carpeta '{search_dir}'. "
            "Coloca allí un archivo .xlsx o .xls para continuar."
        )
    return max(candidates, key=lambda path: (path.stat().st_mtime, path.name.lower()))


def find_latest_excel_in_search_order(search_dirs: list[Path]) -> Path:
    for search_dir in search_dirs:
        if not search_dir.exists():
            continue
        candidates = [path for path in search_dir.iterdir() if is_excel_file(path)]
        if candidates:
            return max(candidates, key=lambda path: (path.stat().st_mtime, path.name.lower()))

    formatted_dirs = ", ".join(str(path) for path in search_dirs)
    raise ExcelNotFoundError(
        "No se encontrÃ³ ningÃºn archivo Excel en las carpetas configuradas. "
        f"Rutas inspeccionadas: {formatted_dirs}"
    )


def load_excel(file_path: Path) -> pd.DataFrame:
    try:
        if file_path.suffix.lower() == ".xlsx":
            return pd.read_excel(file_path, engine="openpyxl")
        return pd.read_excel(file_path)
    except Exception as exc:  # pragma: no cover - pandas/openpyxl provide rich low-level errors
        raise AGPMVPError(f"No se pudo leer el archivo Excel '{file_path.name}': {exc}") from exc
