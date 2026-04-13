from __future__ import annotations

from datetime import datetime
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
SRC_DIR = ROOT_DIR / "src"
INPUT_DIR = ROOT_DIR
OUTPUT_DIR = ROOT_DIR / "outputs"
PREFERRED_INPUT_DIR = ROOT_DIR / "input"
STATIC_DATA_DIR = ROOT_DIR / "data"
STATIC_REPORTS_DIR = ROOT_DIR / "reports"
STREAMLIT_APP_PATH = SRC_DIR / "ui" / "app.py"
LATEST_MANIFEST_PATH = OUTPUT_DIR / "latest_run_manifest.json"


def ensure_output_dir() -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return OUTPUT_DIR


def is_excel_file(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in {".xlsx", ".xls"}


def build_timestamp(now: datetime | None = None) -> str:
    current = now or datetime.now()
    return current.strftime("%Y%m%d_%H%M")


def build_output_path(prefix: str, timestamp: str, suffix: str) -> Path:
    ensure_output_dir()
    normalized_suffix = suffix.lstrip(".")
    return OUTPUT_DIR / f"{prefix}_{timestamp}.{normalized_suffix}"
