from __future__ import annotations

from datetime import date

from app.models import InventoryItem, OperationalStatus, SourceSetStatus
from app.services.grouping_service import _candidate_pool


def make_item(
    item_id: int,
    source_id: str,
    customer_name: str | None,
    vehicle_name: str,
    product_name: str,
    days_stored: int,
    set_status: SourceSetStatus,
) -> InventoryItem:
    return InventoryItem(
        id=item_id,
        source_id=source_id,
        order_id=f"ORD-{item_id}",
        serial=f"SER-{item_id}",
        vehicle_name=vehicle_name,
        created_date=date(2020, 1, min(item_id, 28)),
        product_name=product_name,
        invoice=f"INV-{item_id}",
        invoice_cost=1000,
        customer_name=customer_name,
        days_stored=days_stored,
        set_status=set_status,
        operational_status=OperationalStatus.IN_STOCK,
        is_free_stock=customer_name is None,
        needs_review=False,
        review_reasons=[],
        product_type_id=1,
    )


def test_candidate_pool_prefers_oldest_available_item() -> None:
    receiver = make_item(1, "src-1", "Customer 01", "Vehicle 01", "C34", 700, SourceSetStatus.INCOMPLETE)
    free_stock_old = make_item(2, "src-2", None, "Vehicle 01", "C34", 1800, SourceSetStatus.INCOMPLETE)
    additional_newer = make_item(3, "src-3", "Customer 01", "Vehicle 01", "C34", 1500, SourceSetStatus.ADDITIONALS)

    candidates = _candidate_pool(receiver, [receiver, free_stock_old, additional_newer], consumed=set())

    assert candidates[0].item.id == free_stock_old.id
    assert candidates[0].item.days_stored == 1800


def test_candidate_pool_excludes_complete_donors() -> None:
    receiver = make_item(1, "src-1", "Customer 01", "Vehicle 01", "C34", 700, SourceSetStatus.INCOMPLETE)
    complete_item = make_item(2, "src-2", "Customer 01", "Vehicle 01", "C34", 1900, SourceSetStatus.COMPLETE)

    candidates = _candidate_pool(receiver, [receiver, complete_item], consumed=set())

    assert candidates == []

