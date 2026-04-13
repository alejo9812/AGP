from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.schemas import ReportSummaryRead
from app.services.report_service import build_summary, export_inventory_csv, export_inventory_xlsx, export_recommendations_csv

router = APIRouter()


@router.get("/summary", response_model=ReportSummaryRead)
def report_summary(db: Session = Depends(get_db)) -> dict:
    return build_summary(db)


@router.get("/export")
def export_report(
    dataset: str = Query(default="inventory", pattern="^(inventory|recommendations)$"),
    format: str = Query(default="csv", pattern="^(csv|xlsx)$"),
    db: Session = Depends(get_db),
) -> Response:
    if dataset == "inventory" and format == "xlsx":
        payload = export_inventory_xlsx(db)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        file_name = "agp_inventory.xlsx"
    elif dataset == "inventory":
        payload = export_inventory_csv(db)
        media_type = "text/csv"
        file_name = "agp_inventory.csv"
    else:
        payload = export_recommendations_csv(db)
        media_type = "text/csv"
        file_name = "agp_grouping_recommendations.csv"
    return Response(
        content=payload,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )
