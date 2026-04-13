from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import GroupingDecisionStatus, OperationalStatus, SourceSetStatus, UserRole


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class PaginatedResponse(APIModel):
    total: int
    limit: int
    offset: int


class UserRead(APIModel):
    id: int
    user_uuid: str
    full_name: str
    email: str
    role: UserRole


class LocationRead(APIModel):
    id: int
    code: str
    zone: str | None = None
    aisle: str | None = None
    level: str | None = None


class ItemRead(APIModel):
    id: int
    source_id: str
    order_id: str
    serial: str
    vehicle_name: str | None = None
    created_date: date | None = None
    product_name: str
    invoice: str
    invoice_cost: Decimal
    customer_name: str | None = None
    days_stored: int
    set_status: SourceSetStatus
    operational_status: OperationalStatus
    is_free_stock: bool
    needs_review: bool
    review_reasons: list[str] = Field(default_factory=list)
    location: LocationRead | None = None
    qr_token: str | None = None


class AuditLogRead(APIModel):
    id: int
    event_uuid: str
    event_type: str
    created_at: datetime
    details: dict

