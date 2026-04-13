from __future__ import annotations


class AGPMVPError(Exception):
    """Base exception for the AGP local MVP."""


class ExcelNotFoundError(AGPMVPError):
    """Raised when no Excel file can be found in the configured folder."""


class InventoryValidationError(AGPMVPError):
    """Raised when the input dataset does not satisfy the minimum schema."""


class ManifestError(AGPMVPError):
    """Raised when the UI manifest cannot be created or consumed."""
