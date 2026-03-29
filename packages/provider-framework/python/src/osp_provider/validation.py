"""
osp-provider request validation.

Pydantic models handle validation automatically via FastAPI's dependency
injection. This module provides additional validation utilities for
cases where manual validation is needed.
"""

from __future__ import annotations

import re
from typing import Any

from pydantic import ValidationError

from osp_provider.types import ProvisionRequest, CostSummaryParams


# ---------------------------------------------------------------------------
# Validation patterns (from OSP JSON Schemas)
# ---------------------------------------------------------------------------

OFFERING_ID_PATTERN = re.compile(r"^[a-z0-9-]+/[a-z0-9-]+$")
MANIFEST_ID_PATTERN = re.compile(r"^mf_[a-z0-9_]+$")
PRICE_AMOUNT_PATTERN = re.compile(r"^[0-9]+(\.[0-9]{1,2})?$")


def validate_offering_id(offering_id: str) -> bool:
    """Validate that an offering_id matches the required pattern."""
    return bool(OFFERING_ID_PATTERN.match(offering_id))


def validate_resource_id(resource_id: str) -> bool:
    """Validate that a resource_id is non-empty."""
    return bool(resource_id and resource_id.strip())


def validate_provision_request(data: dict[str, Any]) -> tuple[ProvisionRequest | None, list[dict[str, str]]]:
    """
    Validate a provision request dict and return either the parsed model
    or a list of validation errors.

    Returns:
        Tuple of (parsed_request, errors). If parsing succeeds, errors is
        empty. If it fails, parsed_request is None.
    """
    try:
        req = ProvisionRequest.model_validate(data)
        return req, []
    except ValidationError as e:
        errors = [
            {"path": ".".join(str(loc) for loc in err["loc"]), "message": err["msg"]}
            for err in e.errors()
        ]
        return None, errors


def validate_cost_summary_params(data: dict[str, Any]) -> tuple[CostSummaryParams | None, list[dict[str, str]]]:
    """Validate cost summary query parameters."""
    try:
        params = CostSummaryParams.model_validate(data)
        return params, []
    except ValidationError as e:
        errors = [
            {"path": ".".join(str(loc) for loc in err["loc"]), "message": err["msg"]}
            for err in e.errors()
        ]
        return None, errors
