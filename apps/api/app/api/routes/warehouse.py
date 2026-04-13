from __future__ import annotations

from fastapi import APIRouter, Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.models import StockMovement, UserRole
from app.schemas import StockMovementCreate, StockMovementListResponse, StockMovementRead, WarehouseScanRequest, WarehouseScanResponse
from app.services.actors import ensure_role, get_actor_by_email
from app.services.serialization import movement_to_dict
from app.services.warehouse_service import create_movement, scan_qr

router = APIRouter()


@router.post("/scan", response_model=WarehouseScanResponse)
def scan(payload: WarehouseScanRequest, x_demo_user: str | None = Header(default=None), db: Session = Depends(get_db)) -> dict:
    actor = get_actor_by_email(db, x_demo_user)
    return scan_qr(db, payload.qr_token, actor.id)


@router.get("/movements", response_model=StockMovementListResponse)
def list_movements(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)) -> dict:
    stmt = select(StockMovement).options(selectinload(StockMovement.inventory_item))
    total = len(list(db.scalars(stmt)))
    rows = list(db.scalars(stmt.order_by(StockMovement.created_at.desc()).offset(offset).limit(limit)))
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [StockMovementRead.model_validate(movement_to_dict(row)) for row in rows],
    }


@router.post("/movements", response_model=StockMovementRead)
def create_warehouse_movement(
    payload: StockMovementCreate,
    x_demo_user: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    actor = get_actor_by_email(db, x_demo_user)
    ensure_role(actor, {UserRole.ADMIN, UserRole.WAREHOUSE_OPERATOR, UserRole.COMMERCIAL_ANALYST})
    movement = create_movement(
        db=db,
        item_id=payload.item_id,
        action=payload.action,
        to_status=payload.to_status,
        to_location_code=payload.to_location_code,
        actor_id=actor.id,
        notes=payload.notes,
    )
    return movement_to_dict(movement)

