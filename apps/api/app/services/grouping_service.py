from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    AuditEventType,
    AuditLog,
    GroupingDecisionStatus,
    GroupingMatch,
    GroupingRecommendation,
    GroupingSourceType,
    InventoryItem,
    OperationalStatus,
    SourceSetStatus,
    StockMovement,
    User,
)


@dataclass
class CandidateContext:
    item: InventoryItem
    source_type: GroupingSourceType
    explanation: str


def _sort_key(item: InventoryItem) -> tuple[int, int, date, str]:
    source_priority = {
        SourceSetStatus.ADDITIONALS: 0,
        SourceSetStatus.INCOMPLETE: 1,
    }.get(item.set_status, 2)
    return (-item.days_stored, source_priority, item.created_date or date.max, item.source_id)


def receiver_sort_key(item: InventoryItem) -> tuple[int, date, str]:
    return (-item.days_stored, item.created_date or date.max, item.source_id)


def _build_explanation(receiver: InventoryItem, donor: InventoryItem, source_type: GroupingSourceType) -> str:
    if source_type == GroupingSourceType.FREE_STOCK:
        return (
            f"Coincide con Vehicle={receiver.vehicle_name} y Product={receiver.product_name}; "
            f"se elige por antiguedad ({donor.days_stored} dias) desde stock libre."
        )
    return (
        f"Coincide con Customer={receiver.customer_name}, Vehicle={receiver.vehicle_name} y Product={receiver.product_name}; "
        f"se prioriza por {donor.days_stored} dias almacenados."
    )


def _eligible_receivers(items: list[InventoryItem]) -> list[InventoryItem]:
    return [
        item
        for item in items
        if item.set_status == SourceSetStatus.INCOMPLETE
        and item.operational_status not in {OperationalStatus.GROUPED, OperationalStatus.COMPLETED, OperationalStatus.DISPATCHED}
        and not item.needs_review
        and bool(item.customer_name)
        and bool(item.vehicle_name)
        and bool(item.product_name)
    ]


def _candidate_pool(receiver: InventoryItem, items: list[InventoryItem], consumed: set[int]) -> list[CandidateContext]:
    candidates: list[CandidateContext] = []
    for item in items:
        if item.id == receiver.id or item.id in consumed:
            continue
        if item.operational_status in {
            OperationalStatus.GROUPED,
            OperationalStatus.COMPLETED,
            OperationalStatus.DISPATCHED,
            OperationalStatus.BLOCKED,
        }:
            continue
        if item.needs_review or item.set_status == SourceSetStatus.COMPLETE:
            continue
        if not item.vehicle_name or item.product_name != receiver.product_name or item.vehicle_name != receiver.vehicle_name:
            continue
        if item.customer_name == receiver.customer_name and item.set_status in {SourceSetStatus.ADDITIONALS, SourceSetStatus.INCOMPLETE}:
            source_type = GroupingSourceType.ADDITIONAL if item.set_status == SourceSetStatus.ADDITIONALS else GroupingSourceType.INCOMPLETE
            candidates.append(CandidateContext(item=item, source_type=source_type, explanation=_build_explanation(receiver, item, source_type)))
        elif item.customer_name is None:
            source_type = GroupingSourceType.FREE_STOCK
            candidates.append(CandidateContext(item=item, source_type=source_type, explanation=_build_explanation(receiver, item, source_type)))
    candidates.sort(key=lambda candidate: _sort_key(candidate.item))
    return candidates


def run_grouping_analysis(db: Session, actor: User) -> dict:
    analysis_run_id = str(uuid.uuid4())
    pending_ids = list(
        db.scalars(select(GroupingRecommendation.id).where(GroupingRecommendation.decision_status == GroupingDecisionStatus.PENDING))
    )
    if pending_ids:
        db.execute(delete(GroupingMatch).where(GroupingMatch.recommendation_id.in_(pending_ids)))
        db.execute(delete(GroupingRecommendation).where(GroupingRecommendation.id.in_(pending_ids)))
        db.commit()

    items = list(
        db.scalars(
            select(InventoryItem)
            .options(selectinload(InventoryItem.location), selectinload(InventoryItem.qr_tag))
            .order_by(InventoryItem.days_stored.desc(), InventoryItem.created_date.asc(), InventoryItem.source_id.asc())
        )
    )

    receivers = sorted(_eligible_receivers(items), key=receiver_sort_key)
    consumed_donors: set[int] = set()
    generated = 0
    skipped = 0

    for receiver in receivers:
        candidates = _candidate_pool(receiver, items, consumed_donors)
        if not candidates:
            skipped += 1
            continue

        recommendation = GroupingRecommendation(
            recommendation_uuid=str(uuid.uuid4()),
            receiver_item_id=receiver.id,
            summary=f"Completar {receiver.order_id} con prioridad al inventario mas antiguo compatible.",
            analysis_run_id=analysis_run_id,
        )
        db.add(recommendation)
        db.flush()

        for rank, candidate in enumerate(candidates[:5], start=1):
            db.add(
                GroupingMatch(
                    recommendation_id=recommendation.id,
                    donor_item_id=candidate.item.id,
                    source_type=candidate.source_type,
                    rank=rank,
                    days_stored_at_decision=candidate.item.days_stored,
                    explanation=candidate.explanation,
                )
            )

        recommendation.selected_donor_item_id = candidates[0].item.id
        consumed_donors.add(candidates[0].item.id)
        generated += 1

    db.add(
        AuditLog(
            event_uuid=str(uuid.uuid4()),
            event_type=AuditEventType.GROUPING_ANALYSIS,
            actor_user_id=actor.id,
            details={
                "analysis_run_id": analysis_run_id,
                "generated_recommendations": generated,
                "skipped_receivers": skipped,
            },
        )
    )
    db.commit()

    pending_total = db.scalar(
        select(func.count(GroupingRecommendation.id)).where(GroupingRecommendation.decision_status == GroupingDecisionStatus.PENDING)
    ) or 0

    return {
        "analysis_run_id": analysis_run_id,
        "generated_recommendations": generated,
        "skipped_receivers": skipped,
        "pending_recommendations": pending_total,
        "message": "Analisis de agrupamiento completado.",
    }


def approve_recommendation(
    db: Session,
    recommendation: GroupingRecommendation,
    actor: User,
    donor_item_id: int | None,
    notes: str,
) -> GroupingRecommendation:
    matches = {match.donor_item_id: match for match in recommendation.matches}
    selected_id = donor_item_id or recommendation.selected_donor_item_id
    if selected_id is None or selected_id not in matches:
        raise ValueError("El donante seleccionado no pertenece a la recomendacion.")

    donor = matches[selected_id].donor_item
    receiver = recommendation.receiver_item
    donor_previous_status = donor.operational_status
    receiver_previous_status = receiver.operational_status

    donor.operational_status = OperationalStatus.GROUPED
    receiver.operational_status = OperationalStatus.COMPLETED
    receiver.set_status = SourceSetStatus.COMPLETE

    recommendation.decision_status = GroupingDecisionStatus.APPROVED
    recommendation.selected_donor_item_id = donor.id
    recommendation.decided_at = datetime.utcnow()
    recommendation.decided_by_user_id = actor.id
    recommendation.decision_notes = notes

    db.add_all(
        [
            StockMovement(
                movement_uuid=str(uuid.uuid4()),
                inventory_item_id=donor.id,
                action="group",
                from_status=donor_previous_status,
                to_status=donor.operational_status,
                from_location_id=donor.location_id,
                to_location_id=donor.location_id,
                actor_user_id=actor.id,
                notes=f"Donante aprobado para recomendacion {recommendation.recommendation_uuid}. {notes}".strip(),
            ),
            StockMovement(
                movement_uuid=str(uuid.uuid4()),
                inventory_item_id=receiver.id,
                action="complete",
                from_status=receiver_previous_status,
                to_status=receiver.operational_status,
                from_location_id=receiver.location_id,
                to_location_id=receiver.location_id,
                actor_user_id=actor.id,
                notes=f"Set completado con donante {donor.order_id}. {notes}".strip(),
            ),
            AuditLog(
                event_uuid=str(uuid.uuid4()),
                event_type=AuditEventType.GROUPING_APPROVED,
                inventory_item_id=receiver.id,
                recommendation_id=recommendation.id,
                actor_user_id=actor.id,
                details={
                    "recommendation_uuid": recommendation.recommendation_uuid,
                    "receiver_order_id": receiver.order_id,
                    "donor_order_id": donor.order_id,
                    "notes": notes,
                },
            ),
        ]
    )
    db.commit()
    db.refresh(recommendation)
    return recommendation


def reject_recommendation(db: Session, recommendation: GroupingRecommendation, actor: User, notes: str) -> GroupingRecommendation:
    recommendation.decision_status = GroupingDecisionStatus.REJECTED
    recommendation.decided_at = datetime.utcnow()
    recommendation.decided_by_user_id = actor.id
    recommendation.decision_notes = notes
    db.add(
        AuditLog(
            event_uuid=str(uuid.uuid4()),
            event_type=AuditEventType.GROUPING_REJECTED,
            inventory_item_id=recommendation.receiver_item_id,
            recommendation_id=recommendation.id,
            actor_user_id=actor.id,
            details={"recommendation_uuid": recommendation.recommendation_uuid, "notes": notes},
        )
    )
    db.commit()
    db.refresh(recommendation)
    return recommendation
