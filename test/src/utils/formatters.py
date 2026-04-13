from __future__ import annotations

from typing import Any

import pandas as pd


def format_int(value: Any) -> str:
    if value is None or value == "":
        return "0"
    return f"{int(value):,}".replace(",", ".")


def format_currency(value: Any) -> str:
    if value is None or value == "":
        return "$0"
    return f"${float(value):,.0f}".replace(",", ".")


def format_percent(numerator: float, denominator: float) -> str:
    if not denominator:
        return "0.0%"
    return f"{(numerator / denominator) * 100:.1f}%"


def format_date(value: Any) -> str:
    if value is None or value == "":
        return "-"
    timestamp = pd.to_datetime(value, errors="coerce")
    if pd.isna(timestamp):
        return "-"
    return timestamp.strftime("%Y-%m-%d")
