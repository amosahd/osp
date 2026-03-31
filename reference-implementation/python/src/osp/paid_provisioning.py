"""Paid provisioning helpers for the Python OSP SDK.

Provides typed estimate models, payment proof envelope support, and
async polling helpers for paid provisioning flows.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Awaitable, Callable, Optional

from pydantic import BaseModel, Field

from .types import Currency, PaymentMethod


# ---------------------------------------------------------------------------
# Payment Proof Envelope
# ---------------------------------------------------------------------------

class PaymentProofEnvelope(BaseModel):
    """Structured payment proof for Sardis or other payment rails."""

    version: str = "1"
    mandate_id: str
    amount: str
    currency: str
    provider_id: str
    offering_id: str
    tier_id: str
    signature: str
    expires_at: str
    escrow_id: Optional[str] = None
    nonce: Optional[str] = None

    def serialize(self) -> str:
        """Serialize to JSON string for ProvisionRequest.payment_proof."""
        return self.model_dump_json()

    @classmethod
    def parse(cls, raw: str) -> "PaymentProofEnvelope":
        """Parse a JSON string back into a typed envelope."""
        return cls.model_validate_json(raw)

    def is_expired(self) -> bool:
        """Check whether this proof has expired."""
        exp = datetime.fromisoformat(self.expires_at.replace("Z", "+00:00"))
        return exp < datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Estimate Models
# ---------------------------------------------------------------------------

class EstimateCost(BaseModel):
    """Cost breakdown from an estimate response."""

    amount: str
    currency: Currency
    interval: Optional[str] = None


class EstimateResponse(BaseModel):
    """Typed response from POST /osp/v1/estimate."""

    offering_id: str
    tier_id: str
    cost: Optional[EstimateCost] = None
    accepted_payment_methods: list[str] = Field(default_factory=list)
    escrow_required: bool = False
    approval_required: bool = False
    estimated_provision_seconds: Optional[int] = None


class EstimateDecision(BaseModel):
    """Result of evaluating an estimate for payment decisions."""

    estimate: EstimateResponse
    requires_payment: bool
    requires_escrow: bool
    requires_approval: bool
    suggested_payment_method: Optional[PaymentMethod] = None


def evaluate_estimate(estimate: EstimateResponse) -> EstimateDecision:
    """Evaluate an estimate response and produce a payment decision.

    This is the recommended entry point before calling provision() on
    paid tiers.
    """
    is_free = (
        estimate.cost is None
        or estimate.cost.amount in ("0", "0.00", "0.000")
    )

    methods = estimate.accepted_payment_methods
    suggested: Optional[PaymentMethod] = None
    if is_free:
        suggested = PaymentMethod.free
    else:
        for m in methods:
            if m != "free":
                try:
                    suggested = PaymentMethod(m)
                except ValueError:
                    pass
                break

    return EstimateDecision(
        estimate=estimate,
        requires_payment=not is_free,
        requires_escrow=estimate.escrow_required,
        requires_approval=estimate.approval_required,
        suggested_payment_method=suggested,
    )


# ---------------------------------------------------------------------------
# Provision Request Builder
# ---------------------------------------------------------------------------

def build_paid_provision_request(
    decision: EstimateDecision,
    *,
    project_name: str,
    nonce: str,
    idempotency_key: str,
    proof: Optional[PaymentProofEnvelope] = None,
    region: Optional[str] = None,
    config: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Build a provision request dict from an estimate decision.

    For free tiers, no proof is needed. For paid tiers, the proof
    envelope is serialized and attached.
    """
    request: dict[str, Any] = {
        "offering_id": decision.estimate.offering_id,
        "tier_id": decision.estimate.tier_id,
        "project_name": project_name,
        "nonce": nonce,
        "idempotency_key": idempotency_key,
    }

    if region:
        request["region"] = region
    if config:
        request["config"] = config

    if decision.requires_payment:
        if proof is None:
            raise ValueError(
                "Payment proof is required for paid tiers. "
                f"Suggested method: {decision.suggested_payment_method}"
            )
        if proof.is_expired():
            raise ValueError("Payment proof has expired — generate a fresh proof")
        request["payment_method"] = (
            decision.suggested_payment_method.value
            if decision.suggested_payment_method
            else "sardis_wallet"
        )
        request["payment_proof"] = proof.serialize()
    else:
        request["payment_method"] = "free"

    return request


# ---------------------------------------------------------------------------
# Async Polling Helper
# ---------------------------------------------------------------------------

class PaidProvisionError(Exception):
    """Raised when paid provisioning fails."""

    def __init__(self, message: str, response: Optional[dict] = None):
        super().__init__(message)
        self.response = response


class ApprovalRequiredError(Exception):
    """Raised when provisioning requires human approval."""

    def __init__(self, message: str, response: dict):
        super().__init__(message)
        self.response = response


async def poll_paid_provision(
    poll_fn: Callable[[], Awaitable[dict[str, Any]]],
    *,
    max_polls: int = 30,
    poll_interval_seconds: float = 2.0,
    on_poll: Optional[Callable[[int, str], None]] = None,
) -> dict[str, Any]:
    """Poll for async paid provisioning completion.

    When a provider returns 202 Accepted for a paid provision, the
    agent must poll the status endpoint until the resource becomes
    active or the operation fails.

    Args:
        poll_fn: Async function that fetches the current resource status.
        max_polls: Maximum number of poll attempts.
        poll_interval_seconds: Seconds between polls.
        on_poll: Optional callback invoked on each poll with attempt and status.

    Returns:
        The final provision response when status is "active" or terminal.

    Raises:
        PaidProvisionError: On failure or timeout.
        ApprovalRequiredError: When human approval is required.
    """
    for attempt in range(1, max_polls + 1):
        response = await poll_fn()
        status = response.get("status", "unknown")

        if on_poll:
            on_poll(attempt, status)

        if status == "active":
            return response

        if status in ("failed", "deprovisioned") or "error" in response:
            error_msg = response.get("error", {}).get("message", status)
            raise PaidProvisionError(
                f"Paid provisioning failed: {error_msg}", response
            )

        if status == "approval_required":
            raise ApprovalRequiredError(
                "Provision requires human approval before proceeding",
                response,
            )

        await asyncio.sleep(poll_interval_seconds)

    raise PaidProvisionError(
        f"Paid provisioning timed out after {max_polls} polls"
    )
