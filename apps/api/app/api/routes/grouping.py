from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.models import GroupingMatch, GroupingRecommendation, UserRole
from app.schemas import GroupingAnalysisResponse, GroupingDecisionRequest, GroupingRecommendationListResponse, GroupingRecommendationRead
from app.services.actors import ensure_role, get_actor_by_email
from app.services.grouping_service import approve_recommendation, reject_recommendation, run_grouping_analysis
from app.services.serialization import recommendation_to_dict

router = APIRouter()


@router.post("/analyze", response_model=GroupingAnalysisResponse)
def analyze_grouping(
    x_demo_user: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    actor = get_actor_by_email(db, x_demo_user)
    ensure_role(actor, {UserRole.ADMIN, UserRole.COMMERCIAL_ANALYST})
    return run_grouping_analysis(db, actor)


@router.get("/recommendations", response_model=GroupingRecommendationListResponse)
def list_recommendations(
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(GroupingRecommendation).options(
        selectinload(GroupingRecommendation.receiver_item),
        selectinload(GroupingRecommendation.selected_donor_item),
        selectinload(GroupingRecommendation.matches).selectinload(GroupingMatch.donor_item),
    )
    if status:
        stmt = stmt.where(GroupingRecommendation.decision_status == status)
    total = len(list(db.scalars(stmt)))
    rows = list(db.scalars(stmt.order_by(GroupingRecommendation.created_at.desc()).offset(offset).limit(limit)))
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [GroupingRecommendationRead.model_validate(recommendation_to_dict(row)) for row in rows],
    }


@router.post("/recommendations/{recommendation_id}/approve", response_model=GroupingRecommendationRead)
def approve(
    recommendation_id: int,
    payload: GroupingDecisionRequest,
    x_demo_user: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    actor = get_actor_by_email(db, x_demo_user)
    ensure_role(actor, {UserRole.ADMIN, UserRole.COMMERCIAL_ANALYST})
    recommendation = db.scalar(
        select(GroupingRecommendation)
        .options(
            selectinload(GroupingRecommendation.receiver_item),
            selectinload(GroupingRecommendation.selected_donor_item),
            selectinload(GroupingRecommendation.matches).selectinload(GroupingMatch.donor_item),
        )
        .where(GroupingRecommendation.id == recommendation_id)
    )
    if recommendation is None:
        raise HTTPException(status_code=404, detail="Recomendacion no encontrada.")
    approved = approve_recommendation(db, recommendation, actor, payload.donor_item_id, payload.notes)
    return recommendation_to_dict(approved)


@router.post("/recommendations/{recommendation_id}/reject", response_model=GroupingRecommendationRead)
def reject(
    recommendation_id: int,
    payload: GroupingDecisionRequest,
    x_demo_user: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    actor = get_actor_by_email(db, x_demo_user)
    ensure_role(actor, {UserRole.ADMIN, UserRole.COMMERCIAL_ANALYST})
    recommendation = db.scalar(
        select(GroupingRecommendation)
        .options(
            selectinload(GroupingRecommendation.receiver_item),
            selectinload(GroupingRecommendation.selected_donor_item),
            selectinload(GroupingRecommendation.matches).selectinload(GroupingMatch.donor_item),
        )
        .where(GroupingRecommendation.id == recommendation_id)
    )
    if recommendation is None:
        raise HTTPException(status_code=404, detail="Recomendacion no encontrada.")
    rejected = reject_recommendation(db, recommendation, actor, payload.notes)
    return recommendation_to_dict(rejected)

