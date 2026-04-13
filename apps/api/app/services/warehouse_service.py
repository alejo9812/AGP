from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import AuditEventType, AuditLog, InventoryItem, OperationalStatus, SourceSetStatus, StockMovement, WarehouseLocation
from app.services.serialization import item_to_dict


def suggested_action(item: InventoryItem) -> tuple[str, OperationalStatus]:
    if item.needs_review:
        return ("Revisar datos antes de operar.", OperationalStatus.REVIEW_NEEDED)
    if item.operational_status == OperationalStatus.IN_STOCK and item.set_status == SourceSetStatus.INCOMPLETE:
        return ("Reservar para agrupacion o analisis comercial.", OperationalStatus.RESERVED)
    if item.operational_status == OperationalStatus.COMPLETED:
        return ("Preparar para despacho.", OperationalStatus.READY_FOR_DISPATCH)
    return ("Registrar escaneo y confirmar estado.", item.operational_status)


def scan_qr(db: Session, qr_token: str, actor_id: int | None = None) -> dict:
    item = db.scalar(
        select(InventoryItem)
        .options(selectinload(InventoryItem.location), selectinload(InventoryItem.qr_tag))
        .join(InventoryItem.qr_tag)
        .where(InventoryItem.qr_tag.has(qr_token=qr_token))
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QR no encontrado.")

    action_text, recommended_status = suggested_action(item)
    db.add(
        AuditLog(
            event_uuid=str(uuid.uuid4()),
            event_type=AuditEventType.SCAN,
            inventory_item_id=item.id,
            actor_user_id=actor_id,
            details={"qr_token": qr_token, "suggested_action": action_text},
        )
    )
    db.commit()
    return {
        "qr_token": qr_token,
        "item": item_to_dict(item),
        "suggested_action": action_text,
        "recommended_status": recommended_status,
    }


def create_movement(
    db: Session,
    item_id: int,
    action: str,
    to_status: OperationalStatus | None,
    to_location_code: str | None,
    actor_id: int | None,
    notes: str,
) -> StockMovement:
    item = db.scalar(
        select(InventoryItem)
        .options(selectinload(InventoryItem.location), selectinload(InventoryItem.qr_tag))
        .where(InventoryItem.id == item_id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item no encontrado.")

    target_location = item.location
    if to_location_code:
        target_location = db.scalar(select(WarehouseLocation).where(WarehouseLocation.code == to_location_code))
        if target_location is None:
            target_location = WarehouseLocation(code=to_location_code)
            db.add(target_location)
            db.flush()

    movement = StockMovement(
        movement_uuid=str(uuid.uuid4()),
        inventory_item_id=item.id,
        action=action,
        from_status=item.operational_status,
        to_status=to_status,
        from_location_id=item.location_id,
        to_location_id=target_location.id if target_location else None,
        actor_user_id=actor_id,
        notes=notes,
    )
    if to_status is not None:
        item.operational_status = to_status
    if target_location is not None:
        item.location_id = target_location.id
    db.add(movement)
    db.add(
        AuditLog(
            event_uuid=str(uuid.uuid4()),
            event_type=AuditEventType.MOVEMENT,
            inventory_item_id=item.id,
            actor_user_id=actor_id,
            details={"action": action, "to_status": to_status.value if to_status else None, "to_location": to_location_code},
        )
    )
    db.commit()
    db.refresh(movement)
    return movement

