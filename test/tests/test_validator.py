from __future__ import annotations

import pandas as pd
import pytest

from src.core.config import REQUIRED_COLUMNS
from src.core.validator import validate_required_columns
from src.utils.errors import InventoryValidationError


def test_validate_required_columns_accepts_full_schema() -> None:
    dataframe = pd.DataFrame(columns=REQUIRED_COLUMNS)
    validate_required_columns(dataframe)


def test_validate_required_columns_raises_when_columns_are_missing() -> None:
    dataframe = pd.DataFrame(columns=[column for column in REQUIRED_COLUMNS if column != "Vehicle"])

    with pytest.raises(InventoryValidationError):
        validate_required_columns(dataframe)
