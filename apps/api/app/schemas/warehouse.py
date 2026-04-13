from __future__ import annotations

from pydantic import Field

from app.models.enums import OperationalStatus
from app.schemas.common import APIModel, ItemRead, PaginatedResponse


class WarehouseScanRequest(APIModel):
    qr_token: str


class WarehouseScanResponse(APIModel):
    qr_token: str
    item: ItemRead
    suggested_action: str
    recommended_status: OperationalStatus


class StockMovementCreate(APIModel):
    item_id: int
    action: str
    to_status: OperationalStatus | None = None
    to_location_code: str | None = None
    notes: str = ""


class StockMovementRead(APIModel):
    id: int
    movement_uuid: str
    action: str
    from_status: OperationalStatus | None = None
    to_status: OperationalStatus | None = None
    notes: str
    created_at: str
    inventory_item: ItemRead


class StockMovementListResponse(PaginatedResponse):
    items: list[StockMovementRead] = Field(default_factory=list)

