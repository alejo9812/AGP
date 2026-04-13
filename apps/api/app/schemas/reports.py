from pydantic import Field

from app.schemas.common import APIModel


class ReportSummaryRead(APIModel):
    total_inventory: int
    complete_sets: int
    incomplete_sets: int
    additionals: int
    free_stock: int
    review_needed: int
    recommendations_pending: int
    recommendations_approved: int
    oldest_days_stored: int
    inventory_by_status: dict[str, int] = Field(default_factory=dict)
    inventory_by_product: dict[str, int] = Field(default_factory=dict)
