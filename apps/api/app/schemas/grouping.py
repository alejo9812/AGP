from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.common import APIModel, ItemRead, PaginatedResponse


class GroupingMatchRead(APIModel):
    id: int
    donor_item_id: int
    source_type: str
    rank: int
    days_stored_at_decision: int
    explanation: str
    donor_item: ItemRead


class GroupingRecommendationRead(APIModel):
    id: int
    recommendation_uuid: str
    decision_status: str
    summary: str
    analysis_run_id: str
    decision_notes: str | None = None
    decided_at: datetime | None = None
    receiver_item: ItemRead
    selected_donor_item: ItemRead | None = None
    matches: list[GroupingMatchRead] = Field(default_factory=list)


class GroupingRecommendationListResponse(PaginatedResponse):
    items: list[GroupingRecommendationRead]


class GroupingAnalysisResponse(APIModel):
    analysis_run_id: str
    generated_recommendations: int
    skipped_receivers: int
    pending_recommendations: int
    message: str


class GroupingDecisionRequest(APIModel):
    donor_item_id: int | None = None
    notes: str = ""

