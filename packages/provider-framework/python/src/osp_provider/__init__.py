"""
osp-provider: FastAPI router for building OSP-compliant providers.

Turn any FastAPI app into an OSP provider with a single router.

Example:
    from fastapi import FastAPI
    from osp_provider import create_osp_router

    app = FastAPI()
    router = create_osp_router(
        manifest=manifest,
        on_provision=handle_provision,
        on_deprovision=handle_deprovision,
        on_status=handle_status,
    )
    app.include_router(router, prefix="/osp")
"""

from osp_provider.router import create_osp_router, OSPError
from osp_provider.types import (
    ServiceManifest,
    ServiceOffering,
    ServiceTier,
    Price,
    EscrowProfile,
    UsageMetering,
    ProviderEndpoints,
    ProvisionRequest,
    ProvisionResponse,
    ProvisionError,
    CredentialBundle,
    FulfillmentProof,
    BudgetConstraint,
    SandboxConfig,
    ResourceStatus,
    UsageReport,
    UsageDimension,
    Cost,
    HealthStatus,
    CostSummary,
    CostSummaryParams,
    CostResource,
    OSPErrorResponse,
)
from osp_provider.rate_limiter import RateLimiter, RateLimiterConfig

__version__ = "0.1.0"

__all__ = [
    # Factory
    "create_osp_router",
    "OSPError",
    # Types
    "ServiceManifest",
    "ServiceOffering",
    "ServiceTier",
    "Price",
    "EscrowProfile",
    "UsageMetering",
    "ProviderEndpoints",
    "ProvisionRequest",
    "ProvisionResponse",
    "ProvisionError",
    "CredentialBundle",
    "FulfillmentProof",
    "BudgetConstraint",
    "SandboxConfig",
    "ResourceStatus",
    "UsageReport",
    "UsageDimension",
    "Cost",
    "HealthStatus",
    "CostSummary",
    "CostSummaryParams",
    "CostResource",
    "OSPErrorResponse",
    # Rate limiter
    "RateLimiter",
    "RateLimiterConfig",
]
