from app.services.data_quality import build_review_reasons, summarize_duplicates


def test_build_review_reasons_marks_free_stock_and_review() -> None:
    reasons = build_review_reasons(
        {
            "Customer": "",
            "Vehicle": "",
            "Product": "C34",
            "SetStatus": "Incomplete",
        }
    )

    assert "Customer vacio: se trata como stock libre." in reasons
    assert "Vehicle vacio: requiere revision manual." in reasons


def test_summarize_duplicates_counts_repeated_order_and_serial() -> None:
    summary = summarize_duplicates(
        [
            {"OrderID": "A", "Serial": "1"},
            {"OrderID": "A", "Serial": "2"},
            {"OrderID": "B", "Serial": "2"},
        ]
    )

    assert summary["duplicate_orders"] == 1
    assert summary["duplicate_serials"] == 1
