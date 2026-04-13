from __future__ import annotations

REQUIRED_COLUMNS = [
    "ID",
    "OrderID",
    "Serial",
    "Vehicle",
    "Created",
    "Product",
    "Invoice",
    "InvoiceCost",
    "Customer",
    "DaysStored",
    "SetStatus",
]

TEXT_COLUMNS = [
    "ID",
    "OrderID",
    "Serial",
    "Vehicle",
    "Product",
    "Invoice",
    "Customer",
    "SetStatus",
]

VALID_SET_STATUS = ("Complete", "Incomplete", "Additionals")
SET_STATUS_NORMALIZATION = {
    "complete": "Complete",
    "incomplete": "Incomplete",
    "additionals": "Additionals",
}
SET_STATUS_LABELS = {
    "Complete": "Completo",
    "Incomplete": "Incompleto",
    "Additionals": "Adicionales",
}

DECISION_CODES = {
    "available_complete": "Available Complete",
    "available_from_free_stock": "Available from Free Stock",
    "completable_with_additional": "Completable with Additional",
    "completable_with_incomplete": "Completable with Incomplete",
    "manual_review_required": "Manual Review Required",
    "requires_manufacturing": "Requires Manufacturing",
}
DECISION_LABELS = {
    DECISION_CODES["available_complete"]: "Disponible completo",
    DECISION_CODES["available_from_free_stock"]: "Disponible desde stock libre",
    DECISION_CODES["completable_with_additional"]: "Completable con adicional",
    DECISION_CODES["completable_with_incomplete"]: "Completable con otro incompleto",
    DECISION_CODES["manual_review_required"]: "Requiere revision manual",
    DECISION_CODES["requires_manufacturing"]: "Requiere fabricacion",
}

MATCH_TYPE_LABELS = {
    "additional": "Adicional compatible",
    "incomplete": "Pedido incompleto compatible",
    "free_stock": "Stock libre compatible",
    "none": "Sin coincidencia",
}

PRIORITY_SCORES = {
    "additional": 1,
    "incomplete": 2,
    "free_stock": 3,
    "none": 4,
}

MAX_CANDIDATES_PER_BUCKET = 5
DEFAULT_STREAMLIT_HOST = "127.0.0.1"
DEFAULT_STREAMLIT_PORT = 8501
