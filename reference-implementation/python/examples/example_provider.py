"""Example: Creating an OSP-compatible provider for a mock database service.

Run with::

    pip install osp-client[provider]
    python examples/example_provider.py

Then try::

    curl http://localhost:8000/.well-known/osp.json | python -m json.tool
    curl -X POST http://localhost:8000/osp/v1/provision \
         -H 'Content-Type: application/json' \
         -d '{"service_id": "mock-postgres", "tier_id": "free"}'
"""

from __future__ import annotations

import uuid
from typing import Any

from osp import (
    CredentialBundle,
    OSPProvider,
    Price,
    ProvisionRequest,
    ProvisionResponse,
    ServiceManifest,
    ServiceOffering,
    ServiceTier,
    UsageMetric,
    UsageReport,
)


class MockDatabaseProvider(OSPProvider):
    """A toy provider that pretends to provision PostgreSQL databases."""

    def __init__(self, manifest: ServiceManifest) -> None:
        super().__init__(manifest)
        # In-memory "database" of provisioned resources
        self._resources: dict[str, dict[str, Any]] = {}

    async def on_provision(self, request: ProvisionRequest) -> ProvisionResponse:
        resource_id = f"db_{uuid.uuid4().hex[:8]}"
        api_key = f"key_{uuid.uuid4().hex}"
        self._resources[resource_id] = {
            "service_id": request.service_id,
            "tier_id": request.tier_id,
            "parameters": request.parameters,
            "api_key": api_key,
        }
        return ProvisionResponse(
            resource_id=resource_id,
            status="provisioned",
            message=f"Database {resource_id} is ready.",
            credentials_bundle=CredentialBundle(
                credentials={
                    "DATABASE_URL": f"postgres://user:pass@{resource_id}.db.example.com:5432/main",
                    "API_KEY": api_key,
                },
            ),
        )

    async def on_deprovision(self, resource_id: str) -> None:
        if resource_id not in self._resources:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Resource not found")
        del self._resources[resource_id]

    async def on_get_credentials(self, resource_id: str) -> CredentialBundle:
        if resource_id not in self._resources:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Resource not found")
        res = self._resources[resource_id]
        return CredentialBundle(
            credentials={
                "DATABASE_URL": f"postgres://user:pass@{resource_id}.db.example.com:5432/main",
                "API_KEY": res["api_key"],
            },
        )

    async def on_rotate_credentials(self, resource_id: str) -> CredentialBundle:
        if resource_id not in self._resources:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Resource not found")
        new_key = f"key_{uuid.uuid4().hex}"
        self._resources[resource_id]["api_key"] = new_key
        return CredentialBundle(
            credentials={
                "DATABASE_URL": f"postgres://user:pass@{resource_id}.db.example.com:5432/main",
                "API_KEY": new_key,
            },
        )

    async def on_get_status(self, resource_id: str) -> dict[str, Any]:
        if resource_id not in self._resources:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Resource not found")
        return {
            "resource_id": resource_id,
            "status": "provisioned",
            "service_id": self._resources[resource_id]["service_id"],
            "tier_id": self._resources[resource_id]["tier_id"],
        }

    async def on_get_usage(self, resource_id: str) -> UsageReport:
        if resource_id not in self._resources:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Resource not found")
        return UsageReport(
            resource_id=resource_id,
            metrics=[
                UsageMetric(name="storage_bytes", value=2_621_440, unit="bytes", limit=1_073_741_824),
                UsageMetric(name="connections", value=2, unit="connections", limit=5),
            ],
            total_cost=0.0,
        )

    async def on_health_check(self) -> dict[str, Any]:
        return {
            "healthy": True,
            "active_resources": len(self._resources),
        }


def create_manifest() -> ServiceManifest:
    """Build the manifest for our mock database provider."""
    return ServiceManifest(
        osp_version="0.1.0",
        provider_name="Mock DB Provider",
        provider_url="http://localhost:8000",
        provider_description="A demonstration OSP provider that simulates managed PostgreSQL.",
        services=[
            ServiceOffering(
                id="mock-postgres",
                name="Mock PostgreSQL",
                description="Simulated managed PostgreSQL for testing the OSP protocol.",
                category="database",
                tiers=[
                    ServiceTier(
                        id="free",
                        name="Free",
                        description="Perfect for development and testing.",
                        price=Price(amount=0, currency="USD", billing_cycle="monthly"),
                        limits={"max_rows": 10_000, "max_connections": 5, "storage_gb": 1},
                        features=["auto-backup", "shared-cpu"],
                    ),
                    ServiceTier(
                        id="pro",
                        name="Pro",
                        description="For production workloads.",
                        price=Price(amount=29.99, currency="USD", billing_cycle="monthly"),
                        limits={"max_rows": 10_000_000, "max_connections": 100, "storage_gb": 100},
                        features=["auto-backup", "dedicated-cpu", "point-in-time-recovery", "read-replicas"],
                    ),
                ],
                documentation_url="https://docs.example.com/mock-postgres",
            ),
        ],
        contact_email="support@example.com",
    )


if __name__ == "__main__":
    import uvicorn

    manifest = create_manifest()
    provider = MockDatabaseProvider(manifest)
    print(f"Starting {manifest.provider_name} on http://localhost:8000")
    print(f"Manifest: http://localhost:8000/.well-known/osp.json")
    print(f"Health:   http://localhost:8000/osp/v1/health")
    uvicorn.run(provider.app, host="0.0.0.0", port=8000)
