"""OSP -- Open Service Protocol client and provider SDK for Python.

Quick start (client)::

    from osp import OSPClient, ProvisionRequest

    async with OSPClient() as client:
        manifest = await client.discover("https://db.example.com")
        resp = await client.provision(
            "https://db.example.com",
            ProvisionRequest(service_id="postgres", tier_id="free"),
        )
        print(resp.credentials_bundle)

Quick start (provider)::

    from osp import OSPProvider, ServiceManifest

    class MyProvider(OSPProvider):
        ...

    provider = MyProvider(manifest=my_manifest)
    # provider.app is a ready-to-serve FastAPI application
"""

from osp.types import (
    BillingCycle,
    CredentialBundle,
    Currency,
    OSPError,
    Price,
    ProvisionRequest,
    ProvisionResponse,
    ResourceStatus,
    ServiceManifest,
    ServiceOffering,
    ServiceTier,
    UsageMetric,
    UsageReport,
)
from osp.client import OSPClient, OSPClientError
from osp.manifest import (
    fetch_manifest,
    find_offering,
    find_offering_and_tier,
    find_tier,
    verify_manifest_signature,
)

# Provider import is optional (requires fastapi)
try:
    from osp.provider import OSPProvider
except ImportError:  # pragma: no cover
    pass

__all__ = [
    # Types
    "BillingCycle",
    "CredentialBundle",
    "Currency",
    "OSPError",
    "Price",
    "ProvisionRequest",
    "ProvisionResponse",
    "ResourceStatus",
    "ServiceManifest",
    "ServiceOffering",
    "ServiceTier",
    "UsageMetric",
    "UsageReport",
    # Client
    "OSPClient",
    "OSPClientError",
    # Manifest utilities
    "fetch_manifest",
    "find_offering",
    "find_offering_and_tier",
    "find_tier",
    "verify_manifest_signature",
    # Provider
    "OSPProvider",
]
