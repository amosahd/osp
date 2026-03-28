"""OSP provider server template built on FastAPI — v1.1.

Subclass :class:`OSPProvider` and override the ``on_*`` hooks to build an
OSP-compatible provider with all required endpoints wired up automatically.

Example::

    from osp import OSPProvider, ServiceManifest

    class MyProvider(OSPProvider):
        async def on_provision(self, request):
            ...

    provider = MyProvider(manifest=my_manifest)
    # provider.app is a FastAPI instance ready to serve
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from osp.types import (
    CredentialBundle,
    HealthStatus,
    OSPErrorBody,
    ProvisionRequest,
    ProvisionResponse,
    ResourceStatus,
    ServiceManifest,
    UsageReport,
)


class OSPProvider:
    """Base class for implementing an OSP-compatible provider.

    Subclasses **must** override every ``on_*`` method except
    :meth:`on_health_check` (which has a sensible default).
    """

    def __init__(self, manifest: ServiceManifest) -> None:
        self.manifest = manifest
        self.app = self._create_app()

    # ------------------------------------------------------------------
    # FastAPI application factory
    # ------------------------------------------------------------------

    def _create_app(self) -> FastAPI:
        app = FastAPI(
            title=f"OSP Provider - {self.manifest.display_name}",
            version=self.manifest.osp_spec_version or "1.0",
        )

        @app.exception_handler(NotImplementedError)
        async def _not_implemented_handler(request: Request, exc: NotImplementedError) -> JSONResponse:
            return JSONResponse(
                status_code=501,
                content=OSPErrorBody(
                    error="not_implemented",
                    code="NOT_IMPLEMENTED",
                ).model_dump(mode="json", exclude_none=True),
            )

        # --- well-known manifest ------------------------------------------

        @app.get("/.well-known/osp.json")
        async def get_manifest() -> dict[str, Any]:
            return self.manifest.model_dump(mode="json", exclude_none=True)

        # --- provisioning -------------------------------------------------

        @app.post("/osp/v1/provision", status_code=201)
        async def provision(request: ProvisionRequest) -> dict[str, Any]:
            response = await self.on_provision(request)
            return response.model_dump(mode="json", exclude_none=True)

        # --- resource lifecycle -------------------------------------------

        @app.delete("/osp/v1/resources/{resource_id}", status_code=204)
        async def deprovision(resource_id: str) -> None:
            await self.on_deprovision(resource_id)

        @app.get("/osp/v1/resources/{resource_id}/status")
        async def get_status(resource_id: str) -> dict[str, Any]:
            status = await self.on_get_status(resource_id)
            return status.model_dump(mode="json", exclude_none=True)

        # --- credentials --------------------------------------------------

        @app.get("/osp/v1/resources/{resource_id}/credentials")
        async def get_credentials(resource_id: str) -> dict[str, Any]:
            bundle = await self.on_get_credentials(resource_id)
            return bundle.model_dump(mode="json", exclude_none=True)

        @app.post("/osp/v1/resources/{resource_id}/credentials/rotate")
        async def rotate_credentials(resource_id: str) -> dict[str, Any]:
            bundle = await self.on_rotate_credentials(resource_id)
            return bundle.model_dump(mode="json", exclude_none=True)

        # --- usage --------------------------------------------------------

        @app.get("/osp/v1/resources/{resource_id}/usage")
        async def get_usage(resource_id: str) -> dict[str, Any]:
            report = await self.on_get_usage(resource_id)
            return report.model_dump(mode="json", exclude_none=True)

        # --- health -------------------------------------------------------

        @app.get("/osp/v1/health")
        async def health_check() -> dict[str, Any]:
            health = await self.on_health_check()
            return health.model_dump(mode="json", exclude_none=True)

        return app

    # ------------------------------------------------------------------
    # Hooks — override in your subclass
    # ------------------------------------------------------------------

    async def on_provision(self, request: ProvisionRequest) -> ProvisionResponse:
        raise NotImplementedError("on_provision")

    async def on_deprovision(self, resource_id: str) -> None:
        raise NotImplementedError("on_deprovision")

    async def on_get_credentials(self, resource_id: str) -> CredentialBundle:
        raise NotImplementedError("on_get_credentials")

    async def on_rotate_credentials(self, resource_id: str) -> CredentialBundle:
        raise NotImplementedError("on_rotate_credentials")

    async def on_get_status(self, resource_id: str) -> ResourceStatus:
        raise NotImplementedError("on_get_status")

    async def on_get_usage(self, resource_id: str) -> UsageReport:
        raise NotImplementedError("on_get_usage")

    async def on_health_check(self) -> HealthStatus:
        return HealthStatus(
            status="healthy",
            checked_at="",
        )
