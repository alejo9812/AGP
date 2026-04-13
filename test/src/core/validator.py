from __future__ import annotations

import pandas as pd

from src.core.config import REQUIRED_COLUMNS
from src.utils.errors import InventoryValidationError


def normalize_headers(columns: list[str] | pd.Index) -> list[str]:
    return [str(column).strip() for column in columns]


def validate_required_columns(dataframe: pd.DataFrame) -> None:
    normalized = normalize_headers(dataframe.columns)
    missing = [column for column in REQUIRED_COLUMNS if column not in normalized]
    if missing:
        raise InventoryValidationError(
            "El archivo Excel no tiene la estructura esperada. "
            f"Faltan las columnas obligatorias: {', '.join(missing)}."
        )
