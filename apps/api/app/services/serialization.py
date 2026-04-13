from app.models import GroupingMatch, GroupingRecommendation, InventoryItem, StockMovement


def item_to_dict(item: InventoryItem) -> dict:
    return {
        "id": item.id,
        "source_id": item.source_id,
        "order_id": item.order_id,
        "serial": item.serial,
        "vehicle_name": item.vehicle_name,
        "created_date": item.created_date,
        "product_name": item.product_name,
        "invoice": item.invoice,
        "invoice_cost": item.invoice_cost,
        "customer_name": item.customer_name,
        "days_stored": item.days_stored,
        "set_status": item.set_status,
        "operational_status": item.operational_status,
        "is_free_stock": item.is_free_stock,
        "needs_review": item.needs_review,
        "review_reasons": item.review_reasons,
        "location": item.location,
        "qr_token": item.qr_token,
    }


def grouping_match_to_dict(match: GroupingMatch) -> dict:
    return {
        "id": match.id,
        "donor_item_id": match.donor_item_id,
        "source_type": match.source_type,
        "rank": match.rank,
        "days_stored_at_decision": match.days_stored_at_decision,
        "explanation": match.explanation,
        "donor_item": item_to_dict(match.donor_item),
    }


def recommendation_to_dict(recommendation: GroupingRecommendation) -> dict:
    return {
        "id": recommendation.id,
        "recommendation_uuid": recommendation.recommendation_uuid,
        "decision_status": recommendation.decision_status,
        "summary": recommendation.summary,
        "analysis_run_id": recommendation.analysis_run_id,
        "decision_notes": recommendation.decision_notes,
        "decided_at": recommendation.decided_at,
        "receiver_item": item_to_dict(recommendation.receiver_item),
        "selected_donor_item": item_to_dict(recommendation.selected_donor_item)
        if recommendation.selected_donor_item
        else None,
        "matches": [grouping_match_to_dict(match) for match in sorted(recommendation.matches, key=lambda value: value.rank)],
    }


def movement_to_dict(movement: StockMovement) -> dict:
    return {
        "id": movement.id,
        "movement_uuid": movement.movement_uuid,
        "action": movement.action,
        "from_status": movement.from_status,
        "to_status": movement.to_status,
        "notes": movement.notes,
        "created_at": movement.created_at.isoformat(),
        "inventory_item": item_to_dict(movement.inventory_item),
    }
