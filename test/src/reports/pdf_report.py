from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd
from reportlab.graphics.charts.barcharts import HorizontalBarChart, VerticalBarChart
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


PAGE_WIDTH, PAGE_HEIGHT = A4
BRAND_DARK = colors.HexColor("#102224")
BRAND_ACCENT = colors.HexColor("#1F6B63")
BRAND_SOFT = colors.HexColor("#DCE6E4")
TEXT_SOFT = colors.HexColor("#57696A")
TEXT_DARK = colors.HexColor("#152224")
BORDER = colors.HexColor("#C8D3D1")
WARNING = colors.HexColor("#A65B16")
DANGER = colors.HexColor("#8B3A2A")


def _build_styles() -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="CoverTitle",
            parent=styles["Title"],
            fontSize=24,
            leading=28,
            textColor=TEXT_DARK,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverSubtitle",
            parent=styles["Heading2"],
            fontSize=13,
            leading=17,
            textColor=TEXT_SOFT,
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionTitle",
            parent=styles["Heading2"],
            fontSize=15,
            leading=18,
            textColor=BRAND_ACCENT,
            spaceBefore=12,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Body",
            parent=styles["BodyText"],
            fontSize=9.4,
            leading=13.6,
            textColor=TEXT_DARK,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodySoft",
            parent=styles["BodyText"],
            fontSize=9.2,
            leading=13.4,
            textColor=TEXT_SOFT,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Caption",
            parent=styles["Italic"],
            fontSize=8.2,
            leading=11.2,
            textColor=TEXT_SOFT,
            spaceBefore=4,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Quote",
            parent=styles["BodyText"],
            fontSize=12,
            leading=17,
            textColor=BRAND_ACCENT,
            leftIndent=12,
            rightIndent=12,
            borderPadding=10,
            borderColor=BRAND_SOFT,
            borderWidth=1,
            borderRadius=6,
            backColor=colors.HexColor("#F4F8F7"),
            spaceBefore=6,
            spaceAfter=8,
        )
    )
    return {name: styles[name] for name in styles.byName}


def _safe_int(value: Any) -> int:
    try:
        if pd.isna(value):
            return 0
    except TypeError:
        pass
    return int(float(value or 0))


def _safe_float(value: Any) -> float:
    try:
        if pd.isna(value):
            return 0.0
    except TypeError:
        pass
    return float(value or 0.0)


def _format_int(value: Any) -> str:
    return f"{_safe_int(value):,}".replace(",", ".")


def _format_percent(value: Any) -> str:
    return f"{_safe_float(value):.2f}%".replace(".", ",")


def _format_currency(value: Any) -> str:
    return f"USD {_safe_float(value):,.0f}".replace(",", ".")


def _table(data: list[list[Any]], widths: list[float] | None = None, align: str = "LEFT") -> Table:
    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_SOFT),
                ("TEXTCOLOR", (0, 0), (-1, 0), TEXT_DARK),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.2),
                ("LEADING", (0, 0), (-1, -1), 10.4),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAF9")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("ALIGN", (1, 1), (-1, -1), align),
            ]
        )
    )
    return table


def _caption(text: str, styles: dict[str, ParagraphStyle]) -> Paragraph:
    return Paragraph(text, styles["Caption"])


def _kpi_tiles(rows: list[tuple[str, str, str]]) -> Table:
    cards: list[list[Any]] = []
    current: list[Any] = []
    for label, value, note in rows:
        card = Table(
            [[label], [value], [note]],
            colWidths=[5.5 * cm],
        )
        card.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                    ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("TEXTCOLOR", (0, 0), (-1, 0), TEXT_SOFT),
                    ("TEXTCOLOR", (0, 1), (-1, 1), TEXT_DARK),
                    ("FONTSIZE", (0, 0), (-1, 0), 8),
                    ("FONTSIZE", (0, 1), (-1, 1), 16),
                    ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 2), (-1, 2), 8),
                    ("TEXTCOLOR", (0, 2), (-1, 2), TEXT_SOFT),
                ]
            )
        )
        current.append(card)
        if len(current) == 3:
            cards.append(current)
            current = []
    if current:
        while len(current) < 3:
            current.append("")
        cards.append(current)

    table = Table(cards, colWidths=[5.75 * cm, 5.75 * cm, 5.75 * cm], hAlign="LEFT")
    table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    return table


def _vertical_chart(title: str, rows: list[dict[str, Any]], value_key: str = "count") -> Drawing:
    sanitized = rows or [{"label": "Sin datos", value_key: 0}]
    labels = [str(item.get("label", "-")) for item in sanitized]
    values = [max(_safe_int(item.get(value_key)), 0) for item in sanitized]

    drawing = Drawing(17.5 * cm, 7.8 * cm)
    drawing.add(String(0, 196, title, fontName="Helvetica-Bold", fontSize=10, fillColor=TEXT_DARK))

    chart = VerticalBarChart()
    chart.x = 32
    chart.y = 26
    chart.width = 410
    chart.height = 122
    chart.data = [values]
    chart.categoryAxis.categoryNames = labels
    chart.categoryAxis.labels.angle = 28
    chart.categoryAxis.labels.boxAnchor = "ne"
    chart.categoryAxis.labels.fontSize = 7
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = max(max(values) * 1.25, 1)
    chart.valueAxis.valueStep = max(int(chart.valueAxis.valueMax / 5), 1)
    chart.bars[0].fillColor = BRAND_ACCENT
    chart.bars[0].strokeColor = BRAND_DARK
    chart.categoryAxis.strokeColor = BORDER
    chart.valueAxis.strokeColor = BORDER
    drawing.add(chart)
    return drawing


def _horizontal_chart(title: str, rows: list[dict[str, Any]], value_key: str = "count") -> Drawing:
    sanitized = rows or [{"label": "Sin datos", value_key: 0}]
    limited = sanitized[:8]
    labels = [str(item.get("label", "-")) for item in limited]
    values = [max(_safe_int(item.get(value_key)), 0) for item in limited]

    drawing = Drawing(17.5 * cm, 8.4 * cm)
    drawing.add(String(0, 208, title, fontName="Helvetica-Bold", fontSize=10, fillColor=TEXT_DARK))

    chart = HorizontalBarChart()
    chart.x = 105
    chart.y = 20
    chart.width = 320
    chart.height = 132
    chart.data = [values]
    chart.categoryAxis.categoryNames = labels
    chart.categoryAxis.labels.fontSize = 7
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = max(max(values) * 1.25, 1)
    chart.valueAxis.valueStep = max(int(chart.valueAxis.valueMax / 5), 1)
    chart.bars[0].fillColor = BRAND_ACCENT
    chart.bars[0].strokeColor = BRAND_DARK
    chart.categoryAxis.strokeColor = BORDER
    chart.valueAxis.strokeColor = BORDER
    drawing.add(chart)
    return drawing


def _flow_band(title: str, values: list[tuple[str, int]]) -> Drawing:
    drawing = Drawing(17.5 * cm, 4.2 * cm)
    drawing.add(String(0, 104, title, fontName="Helvetica-Bold", fontSize=10, fillColor=TEXT_DARK))
    x = 0
    width = 78
    for index, (label, value) in enumerate(values):
        drawing.add(Rect(x, 22, width, 42, fillColor=colors.white, strokeColor=BORDER, strokeWidth=0.6))
        drawing.add(String(x + 8, 50, str(value), fontName="Helvetica-Bold", fontSize=12, fillColor=TEXT_DARK))
        drawing.add(String(x + 8, 32, label[:19], fontName="Helvetica", fontSize=7, fillColor=TEXT_SOFT))
        if index < len(values) - 1:
            drawing.add(String(x + width + 8, 40, ">", fontName="Helvetica-Bold", fontSize=12, fillColor=BRAND_ACCENT))
        x += width + 16
    return drawing


def _decorate_page(canvas: Any, doc: SimpleDocTemplate) -> None:
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(doc.leftMargin, PAGE_HEIGHT - 1.2 * cm, PAGE_WIDTH - doc.rightMargin, PAGE_HEIGHT - 1.2 * cm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(TEXT_SOFT)
    canvas.drawString(doc.leftMargin, 0.9 * cm, "AGP | Warehouse Grouping MVP")
    canvas.drawRightString(PAGE_WIDTH - doc.rightMargin, 0.9 * cm, f"Pagina {doc.page}")
    canvas.restoreState()


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
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.4 * cm,
    )

    incomplete_total = _safe_int(summary.get("incomplete_total"))
    free_stock_total = _safe_int(summary.get("free_stock_total"))
    manual_review_total = _safe_int(summary.get("manual_review_total"))
    completable_total = _safe_int(summary.get("completable_total"))
    requires_fabrication_total = _safe_int(summary.get("requires_fabrication_total"))

    kpi_tiles = [
        ("Inventario total", _format_int(summary.get("total_records")), "Registros evaluados en la corrida."),
        ("Pedidos incompletos", _format_int(incomplete_total), "Universo de pedidos a resolver."),
        ("Pedidos completables", _format_int(completable_total), "Oportunidad de cerrar con inventario."),
        ("Requieren fabricacion", _format_int(requires_fabrication_total), "Sin match compatible en inventario."),
        ("Stock libre", _format_int(free_stock_total), "Customer vacio, sujeto a validacion."),
        ("Antiguedad maxima", f"{_format_int(summary.get('oldest_days_stored'))} dias", "Permanencia maxima en bodega."),
    ]

    story.extend(
        [
            Spacer(1, 0.3 * cm),
            Paragraph("AGP Warehouse Grouping MVP", styles["CoverTitle"]),
            Paragraph("Informe ejecutivo local para revision comercial, operativa y gerencial.", styles["CoverSubtitle"]),
            Paragraph(f"Archivo analizado: <b>{source_file.name}</b>", styles["Body"]),
            Paragraph(f"Fecha de generacion: <b>{str(summary.get('generated_at', ''))[:19].replace('T', ' ')}</b>", styles["Body"]),
            Spacer(1, 0.2 * cm),
            Paragraph(
                summary.get("executive_headline")
                or "No se identificaron conclusiones ejecutivas para este lote.",
                styles["Quote"],
            ),
            Spacer(1, 0.2 * cm),
            _kpi_tiles(kpi_tiles),
            Spacer(1, 0.25 * cm),
            Paragraph(
                "El informe prioriza primero la lectura ejecutiva y deja el detalle tecnico al final para no saturar la toma de decision.",
                styles["BodySoft"],
            ),
            PageBreak(),
        ]
    )

    story.append(Paragraph("1. Resumen ejecutivo", styles["SectionTitle"]))
    story.append(
        Paragraph(
            f"Se evaluaron {_format_int(summary.get('total_records'))} registros de inventario. "
            f"Del universo de pedidos incompletos, {_format_percent(summary.get('inventory_reduction_opportunity_percentage'))} "
            "presenta oportunidad de resolucion utilizando inventario ya existente antes de fabricar.",
            styles["Body"],
        )
    )
    story.append(
        Paragraph(
            f"El motor identifica {_format_int(completable_total)} pedidos con resolucion sugerida, "
            f"{_format_int(requires_fabrication_total)} casos que aun dependen de fabricacion y "
            f"{_format_int(manual_review_total)} registros excluidos por calidad de datos o reglas de bloqueo.",
            styles["Body"],
        )
    )
    story.append(
        _table(
            [
                ["Lectura", "Indicador"],
                ["Potencial de reduccion sobre incompletos", _format_percent(summary.get("inventory_reduction_opportunity_percentage"))],
                ["Dependencia de fabricacion", _format_percent(summary.get("manufacturing_dependency_percentage"))],
                ["Cobertura potencial del stock libre", _format_percent(summary.get("stock_free_coverage_percentage"))],
                ["Indice operativo del inventario", _format_percent(summary.get("operational_quality_index"))],
            ],
            [10.5 * cm, 4.7 * cm],
            align="RIGHT",
        )
    )
    story.append(
        _caption(
            "Esta lectura resume el balance entre resolucion con inventario, riesgo por fabricacion y exclusion por calidad de datos.",
            styles,
        )
    )

    story.append(Paragraph("2. Calidad de datos", styles["SectionTitle"]))
    quality_rows = [["Metrica", "Valor"]]
    for item in summary.get("quality_issue_rows", []):
        quality_rows.append([str(item.get("label", "-")), _format_int(item.get("count"))])
    quality_rows.append(["Registros excluidos", _format_percent(summary.get("excluded_percentage"))])
    story.append(_table(quality_rows, [10.5 * cm, 4.7 * cm], align="RIGHT"))
    story.append(
        _caption(
            "Los registros con Vehicle vacio, Product vacio, duplicados o SetStatus invalido salen del agrupamiento automatico y deben resolverse antes de automatizar decisiones.",
            styles,
        )
    )

    if summary.get("review_rows"):
        review_rows = [["OrderID", "Vehicle", "Product", "Motivo"]]
        for row in summary["review_rows"][:8]:
            review_rows.append(
                [
                    str(row.get("OrderID", "-")),
                    str(row.get("Vehicle", "-")),
                    str(row.get("Product", "-")),
                    str(row.get("ReviewReasons", "-"))[:78],
                ]
            )
        story.append(_table(review_rows, [2.6 * cm, 3.0 * cm, 2.6 * cm, 6.7 * cm]))
        story.append(
            _caption(
                "Muestra de casos excluidos. La recomendacion operativa es depurar primero estos registros para ampliar la cobertura del motor.",
                styles,
            )
        )

    story.append(Paragraph("3. Salud del inventario", styles["SectionTitle"]))
    story.append(
        _table(
            [
                ["Indicador", "Valor"],
                ["Complete", _format_int(summary.get("complete_total"))],
                ["Incomplete", _format_int(summary.get("incomplete_total"))],
                ["Additionals", _format_int(summary.get("additionals_total"))],
                ["Stock libre", _format_int(free_stock_total)],
                ["Antiguedad promedio", f"{_format_int(summary.get('average_days_stored'))} dias"],
                ["Valor total estimado", _format_currency(summary.get("total_inventory_value"))],
                ["Valor estimado del stock libre", _format_currency(summary.get("free_stock_value"))],
            ],
            [9.8 * cm, 5.4 * cm],
            align="RIGHT",
        )
    )
    story.append(_caption("La composicion del inventario confirma cuanto del universo actual esta listo, cuanto sigue incompleto y cuanto puede jugar como donante.", styles))
    composition_rows = [
        {"label": str(label), "count": value}
        for label, value in (summary.get("set_status_counts") or {}).items()
    ]
    story.append(_vertical_chart("Composicion del inventario", composition_rows))
    story.append(
        _caption(
            "La mayor parte del inventario incompleto confirma una oportunidad alta de reorganizacion antes de fabricar nuevas piezas.",
            styles,
        )
    )
    story.append(_vertical_chart("Antiguedad por rangos", summary.get("aging_buckets") or []))
    story.append(
        _caption(
            "Los rangos de antiguedad permiten priorizar piezas inmovilizadas y detectar riesgo de obsolescencia o deterioro comercial.",
            styles,
        )
    )

    if summary.get("top_oldest_free_stock"):
        story.append(
            _table(
                [["OrderID", "Producto", "Vehiculo", "Dias", "Valor"]]
                + [
                    [
                        str(row.get("OrderID", "-")),
                        str(row.get("Product", "-")),
                        str(row.get("Vehicle", "-")),
                        _format_int(row.get("DaysStored")),
                        _format_currency(row.get("InvoiceCost")),
                    ]
                    for row in summary["top_oldest_free_stock"][:8]
                ],
                [2.6 * cm, 2.7 * cm, 4.0 * cm, 1.8 * cm, 3.0 * cm],
                align="RIGHT",
            )
        )
        story.append(
            _caption(
                "Estos registros concentran stock libre envejecido y deben revisarse primero para evitar mayor inmovilizacion.",
                styles,
            )
        )

    story.append(PageBreak())

    story.append(Paragraph("4. Oportunidades de agrupamiento", styles["SectionTitle"]))
    story.append(
        _table(
            [
                ["Indicador", "Valor"],
                ["Pedidos completables", _format_int(completable_total)],
                ["Matches con Additional", _format_int((summary.get("match_type_counts") or {}).get("Adicional compatible"))],
                ["Matches con Incomplete", _format_int((summary.get("match_type_counts") or {}).get("Pedido incompleto compatible"))],
                ["Matches con stock libre", _format_int((summary.get("match_type_counts") or {}).get("Stock libre compatible"))],
                ["Requieren fabricacion", _format_int(requires_fabrication_total)],
                ["Valor potencial aprovechable", _format_currency(summary.get("potential_usable_value"))],
            ],
            [9.8 * cm, 5.4 * cm],
            align="RIGHT",
        )
    )
    story.append(
        _caption(
            "La prioridad final del motor queda: Additional primero, luego otro Incomplete compatible, luego stock libre sujeto a validacion comercial.",
            styles,
        )
    )
    story.append(_vertical_chart("Resolucion de pedidos incompletos", summary.get("resolution_mix") or []))
    story.append(
        _caption(
            "La mezcla de resolucion deja ver cuanto depende AGP de inventario adicional, de otros incompletos y de stock libre antes de fabricar.",
            styles,
        )
    )

    flow_rows = [
        ("Incompletos", incomplete_total),
        ("Revision manual", _safe_int(next((item.get("count") for item in summary.get("resolution_mix", []) if item.get("label") == "Revision manual"), 0))),
        ("Additional", _safe_int(next((item.get("count") for item in summary.get("resolution_mix", []) if item.get("label") == "Adicional compatible"), 0))),
        ("Incomplete", _safe_int(next((item.get("count") for item in summary.get("resolution_mix", []) if item.get("label") == "Pedido incompleto compatible"), 0))),
        ("Stock libre", _safe_int(next((item.get("count") for item in summary.get("resolution_mix", []) if item.get("label") == "Stock libre compatible"), 0))),
        ("Fabricacion", requires_fabrication_total),
    ]
    story.append(_flow_band("Secuencia de decision sobre pedidos incompletos", flow_rows))
    story.append(
        _caption(
            "La secuencia de decision ayuda a visualizar donde se pierde cobertura por datos y donde aun queda dependencia de fabricacion.",
            styles,
        )
    )

    if summary.get("top_combinations"):
        combo_rows = [["Combinacion", "Frecuencia"]]
        for item in summary["top_combinations"][:8]:
            combo_rows.append([str(item.get("combination", "-"))[:68], _format_int(item.get("count"))])
        story.append(_table(combo_rows, [12.8 * cm, 2.4 * cm], align="RIGHT"))
        story.append(
            _caption(
                "Las combinaciones mas frecuentes concentran la mayor oportunidad comercial y operacional para cerrar brechas de pedidos.",
                styles,
            )
        )

    if summary.get("top_critical_products"):
        critical_rows = [
            {"label": item.get("product", "-"), "count": item.get("max_days", 0)}
            for item in summary["top_critical_products"][:8]
        ]
        story.append(_horizontal_chart("Productos criticos por mayor antiguedad", critical_rows))
        story.append(
            _caption(
                "Los productos con mayor antiguedad y exposicion deben priorizarse en decisiones de reserva, depuracion o fabricacion.",
                styles,
            )
        )

    story.append(Paragraph("5. Recomendaciones", styles["SectionTitle"]))
    story.append(
        Paragraph(
            "Reservar primero los Additional compatibles, luego los Incomplete compatibles y usar el stock libre solo con validacion comercial explicita. Esta secuencia minimiza fabricacion y protege trazabilidad.",
            styles["Body"],
        )
    )
    story.append(
        Paragraph(
            f"Se recomienda depurar {_format_int(manual_review_total)} registros bloqueados, revisar "
            f"{_format_int(free_stock_total)} piezas de stock libre y priorizar fabricacion solo en los "
            f"{_format_int(requires_fabrication_total)} casos donde no se encontro compatibilidad valida.",
            styles["Body"],
        )
    )

    completables = (
        detail_df.loc[detail_df["Completable"]]
        .sort_values(by=["DaysStored", "priority_score"], ascending=[False, True])
        .loc[:, ["OrderID", "Product", "Vehicle", "CustomerDisplay", "candidate_match_orderid", "candidate_match_type_label"]]
        .head(8)
        .fillna("")
    )
    if not completables.empty:
        story.append(
            _table(
                [list(completables.columns)]
                + [
                    [
                        str(row["OrderID"]),
                        str(row["Product"]),
                        str(row["Vehicle"]),
                        str(row["CustomerDisplay"]),
                        str(row["candidate_match_orderid"]),
                        str(row["candidate_match_type_label"]),
                    ]
                    for _, row in completables.iterrows()
                ],
                [2.1 * cm, 2.2 * cm, 3.6 * cm, 3.1 * cm, 2.4 * cm, 3.6 * cm],
            )
        )
        story.append(
            _caption(
                "Pedidos sugeridos para reserva inmediata o validacion comercial. Se muestran solo los casos mas envejecidos y accionables.",
                styles,
            )
        )

    story.append(PageBreak())

    story.append(Paragraph("6. Anexo", styles["SectionTitle"]))
    story.append(
        Paragraph(
            "El anexo concentra el detalle que puede saturar la lectura principal pero sigue siendo util para seguimiento operativo.",
            styles["BodySoft"],
        )
    )

    if summary.get("review_rows"):
        annex_review_rows = [["RecordKey", "OrderID", "Vehicle", "Product", "Motivo"]]
        for row in summary["review_rows"][:15]:
            annex_review_rows.append(
                [
                    str(row.get("RecordKey", "-")),
                    str(row.get("OrderID", "-")),
                    str(row.get("Vehicle", "-")),
                    str(row.get("Product", "-")),
                    str(row.get("ReviewReasons", "-"))[:78],
                ]
            )
        story.append(_table(annex_review_rows, [2.5 * cm, 2.4 * cm, 2.7 * cm, 2.4 * cm, 6.0 * cm]))
        story.append(Spacer(1, 0.2 * cm))

    fabrication_rows = (
        detail_df.loc[detail_df["RequiresFabrication"]]
        .sort_values(by=["DaysStored", "InvoiceCost"], ascending=[False, False])
        .loc[:, ["OrderID", "Product", "Vehicle", "CustomerDisplay", "DaysStored", "InvoiceCost"]]
        .head(12)
        .fillna("")
    )
    if not fabrication_rows.empty:
        story.append(
            _table(
                [list(fabrication_rows.columns)] + fabrication_rows.astype(str).values.tolist(),
                [2.4 * cm, 2.2 * cm, 3.5 * cm, 3.3 * cm, 2.0 * cm, 2.7 * cm],
            )
        )
        story.append(
            _caption(
                "Casos que hoy siguen dependiendo de fabricacion. Sirven como cola de priorizacion industrial cuando el inventario existente no alcanza.",
                styles,
            )
        )

    doc.build(story, onFirstPage=_decorate_page, onLaterPages=_decorate_page)
    return output_path
