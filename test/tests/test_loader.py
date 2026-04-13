from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
import pytest

from src.core.loader import find_latest_excel
from src.utils.errors import ExcelNotFoundError


def test_find_latest_excel_selects_most_recent_file(tmp_path: Path) -> None:
    older = tmp_path / "old.xlsx"
    newer = tmp_path / "new.xlsx"

    pd.DataFrame({"ID": [1]}).to_excel(older, index=False)
    pd.DataFrame({"ID": [2]}).to_excel(newer, index=False)
    os.utime(older, (1_700_000_000, 1_700_000_000))
    os.utime(newer, (1_800_000_000, 1_800_000_000))

    selected = find_latest_excel(tmp_path)

    assert selected.name == "new.xlsx"


def test_find_latest_excel_raises_when_folder_has_no_excel(tmp_path: Path) -> None:
    with pytest.raises(ExcelNotFoundError):
        find_latest_excel(tmp_path)
