"""OSP provider server template built on FastAPI.

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

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from osp.types import (
    CredentialBundle,
    OSPError,
    ProvisionRequest,
    ProvisionResponse,
    ServiceManifest,
    UsageReport,
)


class OSPProvider:
    """Base class for implementing an OSP-compatible provider.

    Subclasses **must** override every ``on_*`` method except
    :meth:`on_health_check` (which has a sensible default).  Unimplemented
    hooks raise :class:`NotImplementedError` at runtime so you get a clear
    signal during development.

    The constructor builds a :class:`FastAPI` application (``self.app``)
    with all required OSP routes already registered.
    """

    def __init__(self, manifest: ServiceManifest) -> None:
        self.manifest = manifest
        self.app = self._create_app()

    # ------------------------------------------------------------------
    # FastAPI application factory
    # ------------------------------------------------------------------

    def _create_app(self) -> FastAPI:
        """Create a FastAPI app with every OSP endpoint wired up."""
        app = FastAPI(
            title=f"OSP Provider - {self.manifest.provider_name}",
            version=self.manifest.osp_version,
        )

        # Global exception handler for OSPProvider hooks that raise
        @app.exception_handler(NotImplementedError)
        async def _not_implemented_handler(request: Request, exc: NotImplementedError) -> JSONResponse:
            return JSONResponse(
                status_code=501,
                content=OSPError(
                    error="not_implemented",
                    message=str(exc) or "This operation is not implemented by the provider.",
                ).model_dump(),
            )

        # --- well-known manifest ------------------------------------------

        @app.get("/.well-known/osp.json")
        async def get_manifest() -> dict[str, Any]:
            """Return the provider's OSP manifest."""
            return self.manifest.model_dump(mode="json")

        # --- provisioning -------------------------------------------------

        @app.post("/osp/v1/provision", status_code=201)
        async def provision(request: ProvisionRequest) -> dict[str, Any]:
            """Provision a new resource."""
            response = await self.on_provision(request)
            return response.model_dump(mode="json")

        # --- resource lifecycle -------------------------------------------

        @app.delete("/osp/v1/resources/{resource_id}", status_code=204)
        async def deprovision(resource_id: str) -> None:
            """Deprovision (destroy) a resource."""
            await self.on_deprovision(resource_id)

        @app.get("/osp/v1/resources/{resource_id}/status")
        async def get_status(resource_id: str) -> dict[str, Any]:
            """Get current resource status."""
            return await self.on_get_status(resource_id)

        # --- credentials --------------------------------------------------

        @app.get("/osp/v1/resources/{resource_id}/credentials")
        async def get_credentials(resource_id: str) -> dict[str, Any]:
            """Get current credentials for a resource."""
            bundle = await self.on_get_credentials(resource_id)
            return bundle.model_dump(mode="json")

        @app.post("/osp/v1/resources/{resource_id}/credentials/rotate")
        async def rotate_credentials(resource_id: str) -> dict[str, Any]:
            """Rotate credentials for a resource."""
            bundle = await self.on_rotate_credentials(resource_id)
            return bundle.model_dump(mode="json")

        # --- usage --------------------------------------------------------

        @app.get("/osp/v1/resources/{resource_id}/usage")
        async def get_usage(resource_id: str) -> dict[str, Any]:
            """Get usage report for a resource."""
            report = await self.on_get_usage(resource_id)
            return report.model_dump(mode="json")

        # --- health -------------------------------------------------------

        @app.get("/osp/v1/health")
        async def health_check() -> dict[str, Any]:
            """Provider health check."""
            return await self.on_health_check()

        return app

    # ------------------------------------------------------------------
    # Hooks — override in your subclass
    # ------------------------------------------------------------------

    async def on_provision(self, request: ProvisionRequest) -> ProvisionResponse:
        """Handle a provisioning request.  Must return a :class:`ProvisionResponse`."""
        raise NotImplementedError("on_provision")

    async def on_deprovision(self, resource_id: str) -> None:
        """Handle deprovisioning of *resource_id*."""
        raise NotImplementedError("on_deprovision")

    async def on_get_credentials(self, resource_id: str) -> CredentialBundle:
        """Return current credentials for *resource_id*."""
        raise NotImplementedError("on_get_credentials")

    async def on_rotate_credentials(self, resource_id: str) -> CredentialBundle:
        """Rotate and return new credentials for *resource_id*."""
        raise NotImplementedError("on_rotate_credentials")

    async def on_get_status(self, resource_id: str) -> dict[str, Any]:
        """Return status information for *resource_id*."""
        raise NotImplementedError("on_get_status")

    async def on_get_usage(self, resource_id: str) -> UsageReport:
        """Return a usage report for *resource_id*."""
        raise NotImplementedError("on_get_usage")

    async def on_health_check(self) -> dict[str, Any]:
        """Return provider health information.

        The default implementation returns ``{"healthy": True}``.  Override
        to add richer checks (database connectivity, queue depth, etc.).
        """
        return {"healthy": True}
