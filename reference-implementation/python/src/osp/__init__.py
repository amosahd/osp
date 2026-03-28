"""OSP -- Open Service Protocol client and provider SDK for Python v1.1.

Quick start (client)::

    from osp import OSPClient, ProvisionRequest

    async with OSPClient() as client:
        manifest = await client.discover("https://supabase.com")
        resp = await client.provision(
            "https://supabase.com",
            ProvisionRequest(
                offering_id="supabase/postgres", tier_id="free",
                project_name="my-db", nonce="abc",
            ),
        )
        print(resp.credentials)

Quick start (provider)::

    from osp import OSPProvider, ServiceManifest

    class MyProvider(OSPProvider):
        ...

    provider = MyProvider(manifest=my_manifest)
    # provider.app is a ready-to-serve FastAPI application
"""

from osp.types import (
    # Enums
    A2ACapability,
    CanaryStrategy,
    ComplianceFramework,
    CredentialType,
    Currency,
    EncryptionMethod,
    FulfillmentProofType,
    NHIFederationType,
    NHITokenMode,
    NHITokenType,
    PaymentMethod,
    ProvisionErrorCode,
    ProvisionStatus,
    ServiceCategory,
    TracePropagationFormat,
    WarningType,
    WebhookEventType,
    # Core models
    A2AAgentCard,
    BudgetAlert,
    BudgetConstraint,
    BudgetStatus,
    BurnRate,
    CanaryConfig,
    CostBreakdownItem,
    CostEstimate,
    CredentialBundle,
    CredentialBundleRef,
    DependencyEvent,
    DependencyGraph,
    EscrowProfile,
    FinOpsConfig,
    FulfillmentProof,
    HealthStatus,
    MCPConfig,
    NHIConfig,
    NHIEvent,
    NHIToken,
    ObservabilityConfig,
    OSPErrorBody,
    PaymentDetails,
    Price,
    ProviderEndpoints,
    ProvisionError,
    ProvisionRequest,
    ProvisionResponse,
    ResourceStatus,
    ResourceWarning,
    Scorecards,
    ServiceManifest,
    ServiceOffering,
    ServiceTier,
    TTLEvent,
    UsageDimension,
    UsageMetering,
    UsageReport,
    UsageThresholdData,
    WebhookEvent,
    WebhookEventData,
    WebhookEventError,
)
from osp.client import OSPClient, OSPClientError, RetryConfig
from osp.manifest import (
    WELL_KNOWN_PATH,
    canonical_json,
    fetch_manifest,
    find_offering,
    find_offering_and_tier,
    find_tier,
    verify_manifest_signature,
)
from osp.resolver import (
    OSPResolver,
    ParsedOSPUri,
    build_osp_uri,
    is_osp_uri,
    parse_osp_uri,
)

# Provider import is optional (requires fastapi)
try:
    from osp.provider import OSPProvider
except ImportError:  # pragma: no cover
    pass

__all__ = [
    # Enums
    "A2ACapability",
    "CanaryStrategy",
    "ComplianceFramework",
    "CredentialType",
    "Currency",
    "EncryptionMethod",
    "FulfillmentProofType",
    "NHIFederationType",
    "NHITokenMode",
    "NHITokenType",
    "PaymentMethod",
    "ProvisionErrorCode",
    "ProvisionStatus",
    "ServiceCategory",
    "TracePropagationFormat",
    "WarningType",
    "WebhookEventType",
    # Core models
    "A2AAgentCard",
    "BudgetAlert",
    "BudgetConstraint",
    "BudgetStatus",
    "BurnRate",
    "CanaryConfig",
    "CostBreakdownItem",
    "CostEstimate",
    "CredentialBundle",
    "CredentialBundleRef",
    "DependencyEvent",
    "DependencyGraph",
    "EscrowProfile",
    "FinOpsConfig",
    "FulfillmentProof",
    "HealthStatus",
    "MCPConfig",
    "NHIConfig",
    "NHIEvent",
    "NHIToken",
    "ObservabilityConfig",
    "OSPErrorBody",
    "PaymentDetails",
    "Price",
    "ProviderEndpoints",
    "ProvisionError",
    "ProvisionRequest",
    "ProvisionResponse",
    "ResourceStatus",
    "ResourceWarning",
    "Scorecards",
    "ServiceManifest",
    "ServiceOffering",
    "ServiceTier",
    "TTLEvent",
    "UsageDimension",
    "UsageMetering",
    "UsageReport",
    "UsageThresholdData",
    "WebhookEvent",
    "WebhookEventData",
    "WebhookEventError",
    # Client
    "OSPClient",
    "OSPClientError",
    "RetryConfig",
    # Manifest utilities
    "WELL_KNOWN_PATH",
    "canonical_json",
    "fetch_manifest",
    "find_offering",
    "find_offering_and_tier",
    "find_tier",
    "verify_manifest_signature",
    # Resolver
    "OSPResolver",
    "ParsedOSPUri",
    "build_osp_uri",
    "is_osp_uri",
    "parse_osp_uri",
    # Provider
    "OSPProvider",
]
