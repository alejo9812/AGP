from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.models import InventoryItem
from app.schemas import InventoryListResponse, InventoryQualityResponse, ItemRead
from app.services.serialization import item_to_dict

router = APIRouter()


@router.get("", response_model=InventoryListResponse)
def list_inventory(
    customer: str | None = Query(default=None),
    vehicle: str | None = Query(default=None),
    product: str | None = Query(default=None),
    set_status: str | None = Query(default=None),
    operational_status: str | None = Query(default=None),
    free_stock_only: bool = Query(default=False),
    review_only: bool = Query(default=False),
    query: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(InventoryItem).options(selectinload(InventoryItem.location), selectinload(InventoryItem.qr_tag))
    if customer:
        stmt = stmt.where(InventoryItem.customer_name == customer)
    if vehicle:
        stmt = stmt.where(InventoryItem.vehicle_name == vehicle)
    if product:
        stmt = stmt.where(InventoryItem.product_name == product)
    if set_status:
        stmt = stmt.where(InventoryItem.set_status == set_status)
    if operational_status:
        stmt = stmt.where(InventoryItem.operational_status == operational_status)
    if free_stock_only:
        stmt = stmt.where(InventoryItem.is_free_stock.is_(True))
    if review_only:
        stmt = stmt.where(InventoryItem.needs_review.is_(True))
    if query:
        like_value = f"%{query}%"
        stmt = stmt.where(
            or_(
                InventoryItem.order_id.ilike(like_value),
                InventoryItem.serial.ilike(like_value),
                InventoryItem.customer_name.ilike(like_value),
                InventoryItem.vehicle_name.ilike(like_value),
                InventoryItem.product_name.ilike(like_value),
            )
        )

    total = len(list(db.scalars(stmt)))
    rows = list(
        db.scalars(
            stmt.order_by(InventoryItem.days_stored.desc(), InventoryItem.created_date.asc())
            .offset(offset)
            .limit(limit)
        )
    )
    items = [ItemRead.model_validate(item_to_dict(item)) for item in rows]
    return {"total": total, "limit": limit, "offset": offset, "items": items}


@router.get("/quality", response_model=InventoryQualityResponse)
def quality_issues(db: Session = Depends(get_db)) -> dict:
    rows = list(db.scalars(select(InventoryItem).where(InventoryItem.needs_review.is_(True)).limit(200)))
    issues = []
    for item in rows:
        for reason in item.review_reasons:
            issues.append(
                {
                    "item_id": item.id,
                    "issue_code": "review_reason",
                    "field": "mixed",
                    "severity": "warning",
                    "message": reason,
                }
            )
    return {"total_issues": len(issues), "issues": issues}


@router.get("/{item_id}", response_model=ItemRead)
def get_inventory_item(item_id: int, db: Session = Depends(get_db)) -> dict:
    item = db.scalar(
        select(InventoryItem)
        .options(selectinload(InventoryItem.location), selectinload(InventoryItem.qr_tag))
        .where(InventoryItem.id == item_id)
    )
    return item_to_dict(item)

