import csv
import io
from collections import Counter

import xlsxwriter
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import GroupingDecisionStatus, GroupingRecommendation, InventoryItem, SourceSetStatus
from app.services.serialization import item_to_dict


def build_summary(db: Session) -> dict:
    items = list(db.scalars(select(InventoryItem)))
    recommendations = list(db.scalars(select(GroupingRecommendation)))
    by_status = Counter(item.operational_status.value for item in items)
    by_product = Counter(item.product_name for item in items)

    return {
        "total_inventory": len(items),
        "complete_sets": sum(1 for item in items if item.set_status == SourceSetStatus.COMPLETE),
        "incomplete_sets": sum(1 for item in items if item.set_status == SourceSetStatus.INCOMPLETE),
        "additionals": sum(1 for item in items if item.set_status == SourceSetStatus.ADDITIONALS),
        "free_stock": sum(1 for item in items if item.is_free_stock),
        "review_needed": sum(1 for item in items if item.needs_review),
        "recommendations_pending": sum(1 for item in recommendations if item.decision_status == GroupingDecisionStatus.PENDING),
        "recommendations_approved": sum(1 for item in recommendations if item.decision_status == GroupingDecisionStatus.APPROVED),
        "oldest_days_stored": max((item.days_stored for item in items), default=0),
        "inventory_by_status": dict(by_status),
        "inventory_by_product": dict(by_product),
    }


def export_inventory_csv(db: Session) -> bytes:
    items = list(
        db.scalars(select(InventoryItem).options(selectinload(InventoryItem.location), selectinload(InventoryItem.qr_tag)))
    )
    output = io.StringIO()
    fieldnames = list(item_to_dict(items[0]).keys()) if items else ["id"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for item in items:
        row = item_to_dict(item)
        if row.get("location") is not None:
            row["location"] = item.location.code if item.location else None
        writer.writerow(row)
    return output.getvalue().encode("utf-8")


def export_inventory_xlsx(db: Session) -> bytes:
    items = list(
        db.scalars(select(InventoryItem).options(selectinload(InventoryItem.location), selectinload(InventoryItem.qr_tag)))
    )
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {"in_memory": True})
    worksheet = workbook.add_worksheet("inventory")
    rows = [item_to_dict(item) for item in items]
    headers = list(rows[0].keys()) if rows else ["id"]
    for column, header in enumerate(headers):
        worksheet.write(0, column, header)
    for row_index, row in enumerate(rows, start=1):
        for column, header in enumerate(headers):
            value = row[header]
            if header == "location":
                value = row["location"]["code"] if row["location"] else ""
            worksheet.write(row_index, column, "" if value is None else str(value))
    workbook.close()
    return output.getvalue()


def export_recommendations_csv(db: Session) -> bytes:
    recommendations = list(
        db.scalars(
            select(GroupingRecommendation)
            .options(
                selectinload(GroupingRecommendation.receiver_item),
                selectinload(GroupingRecommendation.selected_donor_item),
            )
        )
    )
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["recommendation_uuid", "receiver_order_id", "decision_status", "selected_donor_order_id", "summary"],
    )
    writer.writeheader()
    for recommendation in recommendations:
        writer.writerow(
            {
                "recommendation_uuid": recommendation.recommendation_uuid,
                "receiver_order_id": recommendation.receiver_item.order_id,
                "decision_status": recommendation.decision_status.value,
                "selected_donor_order_id": recommendation.selected_donor_item.order_id
                if recommendation.selected_donor_item
                else "",
                "summary": recommendation.summary,
            }
        )
    return output.getvalue().encode("utf-8")
