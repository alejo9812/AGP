from __future__ import annotations

from datetime import date, datetime
from typing import Any

import pandas as pd

from src.core.config import REQUIRED_COLUMNS, SET_STATUS_LABELS, SET_STATUS_NORMALIZATION, TEXT_COLUMNS

EXCEL_EPOCH = pd.Timestamp("1899-12-30")


def _normalize_text(value: Any) -> str | pd.NA:
    if value is None or pd.isna(value):
        return pd.NA
    text = str(value).strip()
    return text if text else pd.NA


def _normalize_set_status(value: Any) -> str | pd.NA:
    text = _normalize_text(value)
    if pd.isna(text):
        return pd.NA
    return SET_STATUS_NORMALIZATION.get(str(text).lower(), pd.NA)


def _normalize_datetime(value: Any) -> pd.Timestamp | pd.NaT:
    if value is None or pd.isna(value):
        return pd.NaT
    if isinstance(value, pd.Timestamp):
        return value
    if isinstance(value, datetime):
        return pd.Timestamp(value)
    if isinstance(value, date):
        return pd.Timestamp(value)
    if isinstance(value, (int, float)) and not pd.isna(value):
        return EXCEL_EPOCH + pd.to_timedelta(float(value), unit="D")

    text = str(value).strip()
    if not text:
        return pd.NaT

    for dayfirst in (False, True):
        parsed = pd.to_datetime(text, errors="coerce", dayfirst=dayfirst)
        if not pd.isna(parsed):
            return parsed
    return pd.NaT


def _coerce_numeric(series: pd.Series, fill_value: float = 0.0) -> pd.Series:
    normalized = series.apply(
        lambda value: value if value is None or pd.isna(value) else str(value).replace(",", "").strip()
    )
    parsed = pd.to_numeric(normalized, errors="coerce")
    return parsed.fillna(fill_value)


def _build_reason_list(row: pd.Series) -> list[str]:
    reasons: list[str] = []
    if row["IsFreeStock"]:
        reasons.append("Customer vacío: se trata como stock libre.")
    if row["MissingVehicle"]:
        reasons.append("Vehicle vacío: requiere revisión manual.")
    if row["MissingProduct"]:
        reasons.append("Product vacío: requiere revisión manual.")
    if row["InvalidSetStatus"]:
        reasons.append("SetStatus inválido: se excluye de agrupación automática.")
    if row["DuplicateID"]:
        reasons.append("ID duplicado: requiere validación manual.")
    if row["DuplicateOrderID"]:
        reasons.append("OrderID duplicado: requiere validación manual.")
    if row["DuplicateSerial"]:
        reasons.append("Serial duplicado: requiere validación manual.")
    if row["InvalidCreated"]:
        reasons.append("Created inválido: se conserva vacío para revisión.")
    return reasons


def clean_inventory_data(raw_df: pd.DataFrame) -> pd.DataFrame:
    cleaned = raw_df.copy()
    cleaned.columns = [str(column).strip() for column in cleaned.columns]

    for column in REQUIRED_COLUMNS:
        cleaned[f"Original_{column}"] = cleaned[column]

    cleaned["RowNumber"] = range(2, len(cleaned) + 2)
    cleaned["RecordKey"] = cleaned["RowNumber"].map(lambda row_number: f"ROW-{row_number:05d}")

    for column in TEXT_COLUMNS:
        cleaned[column] = cleaned[column].apply(_normalize_text)

    cleaned["SetStatus"] = cleaned["Original_SetStatus"].apply(_normalize_set_status)
    cleaned["InvalidSetStatus"] = cleaned["Original_SetStatus"].notna() & cleaned["SetStatus"].isna()

    cleaned["Created"] = cleaned["Original_Created"].apply(_normalize_datetime)
    cleaned["InvalidCreated"] = cleaned["Original_Created"].notna() & cleaned["Created"].isna()

    cleaned["InvoiceCost"] = _coerce_numeric(cleaned["Original_InvoiceCost"]).astype(float)
    cleaned["DaysStored"] = _coerce_numeric(cleaned["Original_DaysStored"]).round().astype(int)

    cleaned["MissingVehicle"] = cleaned["Vehicle"].isna()
    cleaned["MissingProduct"] = cleaned["Product"].isna()
    cleaned["IsFreeStock"] = cleaned["Customer"].isna()

    cleaned["DuplicateID"] = cleaned["ID"].notna() & cleaned.groupby("ID")["ID"].transform("size").gt(1)
    cleaned["DuplicateOrderID"] = cleaned["OrderID"].notna() & cleaned.groupby("OrderID")["OrderID"].transform("size").gt(1)
    cleaned["DuplicateSerial"] = cleaned["Serial"].notna() & cleaned.groupby("Serial")["Serial"].transform("size").gt(1)

    cleaned["NeedsManualReview"] = (
        cleaned["MissingVehicle"]
        | cleaned["MissingProduct"]
        | cleaned["InvalidSetStatus"]
        | cleaned["InvalidCreated"]
        | cleaned["DuplicateID"]
        | cleaned["DuplicateOrderID"]
        | cleaned["DuplicateSerial"]
    )

    cleaned["DuplicateFlags"] = cleaned.apply(
        lambda row: ", ".join(
            [
                flag
                for flag, enabled in (
                    ("ID", row["DuplicateID"]),
                    ("OrderID", row["DuplicateOrderID"]),
                    ("Serial", row["DuplicateSerial"]),
                )
                if enabled
            ]
        ),
        axis=1,
    )
    cleaned["ReviewReasons"] = cleaned.apply(_build_reason_list, axis=1).map(" | ".join)

    cleaned["CustomerDisplay"] = cleaned["Customer"].fillna("Stock libre")
    cleaned["VehicleDisplay"] = cleaned["Vehicle"].fillna("Revisión manual")
    cleaned["ProductDisplay"] = cleaned["Product"].fillna("Sin producto")
    cleaned["CreatedDisplay"] = cleaned["Created"].dt.strftime("%Y-%m-%d").fillna("")

    cleaned["SetStatus"] = cleaned["SetStatus"].astype("string")
    cleaned["SetStatusLabel"] = cleaned["SetStatus"].map(lambda value: SET_STATUS_LABELS.get(str(value), "Sin estado"))
    cleaned["Customer"] = cleaned["Customer"].astype("string")
    cleaned["Vehicle"] = cleaned["Vehicle"].astype("string")
    cleaned["Product"] = cleaned["Product"].astype("string")
    cleaned["OrderID"] = cleaned["OrderID"].astype("string")
    cleaned["Serial"] = cleaned["Serial"].astype("string")
    cleaned["ID"] = cleaned["ID"].astype("string")
    cleaned["Invoice"] = cleaned["Invoice"].astype("string")

    return cleaned
