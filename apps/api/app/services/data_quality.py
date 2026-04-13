from __future__ import annotations

from collections import Counter


def build_review_reasons(row: dict[str, str | int | float | None]) -> list[str]:
    reasons: list[str] = []
    customer = str(row.get("Customer") or "").strip()
    vehicle = str(row.get("Vehicle") or "").strip()
    product = str(row.get("Product") or "").strip()
    set_status = str(row.get("SetStatus") or "").strip()

    if not customer:
        reasons.append("Customer vacio: se trata como stock libre.")
    if not vehicle:
        reasons.append("Vehicle vacio: requiere revision manual.")
    if not product:
        reasons.append("Product vacio: bloqueado para agrupacion automatica.")
    if set_status not in {"Complete", "Incomplete", "Additionals"}:
        reasons.append("SetStatus invalido para el flujo del MVP.")

    return reasons


def summarize_duplicates(rows: list[dict[str, str | int | float | None]]) -> dict[str, int]:
    order_counter = Counter(str(row.get("OrderID") or "").strip() for row in rows if row.get("OrderID"))
    serial_counter = Counter(str(row.get("Serial") or "").strip() for row in rows if row.get("Serial"))

    return {
        "duplicate_orders": sum(1 for _, count in order_counter.items() if count > 1),
        "duplicate_serials": sum(1 for _, count in serial_counter.items() if count > 1),
    }

