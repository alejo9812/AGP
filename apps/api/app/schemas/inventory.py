from __future__ import annotations

from pydantic import Field

from app.schemas.common import APIModel, ItemRead, PaginatedResponse


class InventoryListResponse(PaginatedResponse):
    items: list[ItemRead]


class InventoryFilterParams(APIModel):
    customer: str | None = None
    vehicle: str | None = None
    product: str | None = None
    set_status: str | None = None
    operational_status: str | None = None
    free_stock_only: bool = False
    review_only: bool = False
    query: str | None = None
    limit: int = 50
    offset: int = 0


class InventoryQualityIssue(APIModel):
    item_id: int
    issue_code: str
    field: str
    severity: str
    message: str


class InventoryQualityResponse(APIModel):
    total_issues: int
    issues: list[InventoryQualityIssue] = Field(default_factory=list)

