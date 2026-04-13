from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.shapes import Drawing, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from src.utils.formatters import format_int


def _build_styles() -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="HeroTitle",
            parent=styles["Title"],
            fontSize=24,
            leading=28,
            textColor=colors.HexColor("#0F172A"),
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionTitle",
            parent=styles["Heading2"],
            fontSize=15,
            leading=18,
            textColor=colors.HexColor("#1D4ED8"),
            spaceBefore=12,
            spaceAfter=8,
        )
    )
    return styles


def _table(data: list[list[Any]], column_widths: list[float] | None = None) -> Table:
    table = Table(data, colWidths=column_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("LEADING", (0, 0), (-1, -1), 10),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def _bar_chart(title: str, values: dict[str, int]) -> Drawing:
    sanitized = values or {"Sin datos": 0}
    chart_values = [list(sanitized.values())]
    chart_labels = list(sanitized.keys())

    drawing = Drawing(17 * cm, 7.5 * cm)
    drawing.add(String(0, 195, title, fontName="Helvetica-Bold", fontSize=11, fillColor=colors.HexColor("#0F172A")))

    chart = VerticalBarChart()
    chart.x = 35
    chart.y = 35
    chart.height = 120
    chart.width = 380
    chart.data = chart_values
    chart.categoryAxis.categoryNames = chart_labels
    chart.categoryAxis.labels.boxAnchor = "ne"
    chart.categoryAxis.labels.angle = 30
    chart.categoryAxis.labels.fontSize = 7
    chart.valueAxis.valueMin = 0
    max_value = max(chart_values[0]) if chart_values[0] else 0
    chart.valueAxis.valueMax = max(max_value * 1.25, 1)
    chart.valueAxis.valueStep = max(int(chart.valueAxis.valueMax / 5), 1)
    chart.bars[0].fillColor = colors.HexColor("#2563EB")
    chart.bars[0].strokeColor = colors.HexColor("#1D4ED8")
    drawing.add(chart)
    return drawing


def _rows_from_records(records: list[dict[str, Any]], headers: list[str]) -> list[list[str]]:
    rows = [headers]
    for record in records:
        rows.append([str(record.get(header, "")) for header in headers])
    return rows


def generate_pdf_report(
    summary: dict[str, Any],
    detail_df: pd.DataFrame,
    matches_df: pd.DataFrame,
    quality_df: pd.DataFrame,
    output_path: Path,
    source_file: Path,
) -> Path:
    styles = _build_styles()
    story: list[Any] = []

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    story.extend(
        [
            Spacer(1, 4 * cm),
            Paragraph("AGP Warehouse Grouping MVP", styles["HeroTitle"]),
            Paragraph("Informe ejecutivo local de inventario y agrupamiento", styles["Heading2"]),
            Spacer(1, 0.5 * cm),
            Paragraph(f"Fecha de generacion: {summary['generated_at'][:19].replace('T', ' ')}", styles["BodyText"]),
            Paragraph(f"Archivo analizado: {source_file.name}", styles["BodyText"]),
            Spacer(1, 1.2 * cm),
            Paragraph(
                "Este informe resume la calidad de datos, la situacion actual del inventario y las oportunidades de completar pedidos con reglas deterministicas.",
                styles["BodyText"],
            ),
            PageBreak(),
        ]
    )

    executive_bullets = [
        f"Total de inventario evaluado: {format_int(summary['total_records'])} registros.",
        f"Antiguedad maxima detectada: {format_int(summary['oldest_days_stored'])} dias.",
        f"Stock libre: {format_int(summary['free_stock_total'])} registros ({summary['free_stock_percentage']}%).",
        f"Oportunidad de reduccion sobre incompletos: {summary['inventory_reduction_opportunity_percentage']}%.",
        f"Pedidos completables automaticamente: {format_int(summary['completable_total'])}.",
        f"Pedidos que requieren fabricacion: {format_int(summary['requires_fabrication_total'])}.",
    ]
    story.append(Paragraph("Resumen Ejecutivo", styles["SectionTitle"]))
    for bullet in executive_bullets:
        story.append(Paragraph(f"- {bullet}", styles["BodyText"]))
    story.append(Spacer(1, 0.35 * cm))

    quality_rows = [["Metrica", "Valor"]]
    for _, row in quality_df.loc[quality_df["Category"].eq("Calidad de datos")].iterrows():
        quality_rows.append([str(row["Metric"]), format_int(row["Value"])])
    story.append(Paragraph("Hallazgos de Calidad de Datos", styles["SectionTitle"]))
    story.append(_table(quality_rows, [10 * cm, 4 * cm]))
    story.append(Spacer(1, 0.35 * cm))
    if summary["review_rows"]:
        review_headers = ["RecordKey", "OrderID", "Vehicle", "Product", "ReviewReasons"]
        story.append(
            _table(
                _rows_from_records(summary["review_rows"][:8], review_headers),
                [2.4 * cm, 3.2 * cm, 3.2 * cm, 2.5 * cm, 6.2 * cm],
            )
        )
    story.append(PageBreak())

    story.append(Paragraph("Estado del Inventario", styles["SectionTitle"]))
    inventory_rows = [
        ["Indicador", "Valor"],
        ["Completo", format_int(summary["complete_total"])],
        ["Incompleto", format_int(summary["incomplete_total"])],
        ["Adicionales", format_int(summary["additionals_total"])],
        ["Stock libre", format_int(summary["free_stock_total"])],
        ["Casos con revision manual", format_int(summary["manual_review_total"])],
    ]
    story.append(_table(inventory_rows, [8 * cm, 4 * cm]))
    story.append(Spacer(1, 0.35 * cm))
    story.append(_bar_chart("Distribucion por estado del set", summary["set_status_counts"]))
    story.append(Spacer(1, 0.35 * cm))
    story.append(_bar_chart("Distribucion por decision", summary["availability_counts"]))
    story.append(PageBreak())

    story.append(Paragraph("Hallazgos de Agrupamiento", styles["SectionTitle"]))
    grouping_rows = [
        ["Indicador", "Valor"],
        ["Pedidos completables", format_int(summary["completable_total"])],
        ["Matches por additional", format_int(summary["match_type_counts"]["Adicional compatible"])],
        ["Matches por incomplete", format_int(summary["match_type_counts"]["Pedido incompleto compatible"])],
        ["Matches por stock libre", format_int(summary["match_type_counts"]["Stock libre compatible"])],
        ["Pedidos que requieren fabricacion", format_int(summary["requires_fabrication_total"])],
    ]
    story.append(_table(grouping_rows, [8 * cm, 4 * cm]))
    story.append(Spacer(1, 0.35 * cm))

    if summary["top_combinations"]:
        story.append(Paragraph("Top combinaciones mas frecuentes", styles["BodyText"]))
        combo_rows = [["Combinacion", "Frecuencia"]]
        for item in summary["top_combinations"][:10]:
            combo_rows.append([item["combination"], format_int(item["count"])])
        story.append(_table(combo_rows, [11.5 * cm, 2.5 * cm]))
        story.append(Spacer(1, 0.35 * cm))

    if summary["top_oldest_free_stock"]:
        story.append(Paragraph("Top productos mas antiguos sin reserva", styles["BodyText"]))
        free_stock_headers = ["OrderID", "Product", "Vehicle", "DaysStored", "SetStatusLabel"]
        story.append(
            _table(
                _rows_from_records(summary["top_oldest_free_stock"][:10], free_stock_headers),
                [3.2 * cm, 2.2 * cm, 4.2 * cm, 2.3 * cm, 2.6 * cm],
            )
        )
    story.append(PageBreak())

    story.append(Paragraph("Recomendaciones", styles["SectionTitle"]))
    completables = (
        detail_df.loc[detail_df["Completable"]]
        .sort_values(by=["DaysStored", "priority_score"], ascending=[False, True])
        .loc[:, ["OrderID", "Product", "Vehicle", "CustomerDisplay", "candidate_match_orderid", "candidate_match_type_label", "recommendation"]]
        .head(12)
        .fillna("")
    )
    if not completables.empty:
        story.append(Paragraph("Pedidos que podrian completarse de inmediato o con validacion comercial", styles["BodyText"]))
        story.append(
            _table(
                [list(completables.columns)] + completables.astype(str).values.tolist(),
                [2.5 * cm, 1.7 * cm, 3.3 * cm, 3.0 * cm, 2.6 * cm, 2.4 * cm, 4.5 * cm],
            )
        )
        story.append(Spacer(1, 0.35 * cm))

    if summary["top_requires_fabrication"]:
        story.append(Paragraph("Pedidos a priorizar para fabricacion", styles["BodyText"]))
        fabrication_headers = ["OrderID", "Product", "Vehicle", "Customer", "DaysStored"]
        story.append(
            _table(
                _rows_from_records(summary["top_requires_fabrication"][:10], fabrication_headers),
                [3.0 * cm, 2.2 * cm, 4.0 * cm, 4.0 * cm, 2.0 * cm],
            )
        )
        story.append(Spacer(1, 0.35 * cm))

    story.append(
        Paragraph(
            "Se recomienda depurar primero los casos con Vehicle vacio o duplicados, reservar primero los Additional compatibles, luego los Incomplete compatibles, y dejar el stock libre como cola de validacion comercial.",
            styles["BodyText"],
        )
    )
    story.append(Spacer(1, 0.35 * cm))
    story.append(Paragraph("Conclusion", styles["SectionTitle"]))
    story.append(
        Paragraph(
            "El MVP permite pasar del analisis manual en Excel a una lectura operativa, explicable y repetible del inventario. El siguiente paso sugerido es validar reglas finas con negocio y definir si las recomendaciones aprobadas deben integrarse luego con un flujo transaccional.",
            styles["BodyText"],
        )
    )

    doc.build(story)
    return output_path
