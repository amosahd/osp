"""
osp-provider FastAPI router factory.

Creates a FastAPI APIRouter that implements all OSP provider endpoints:
    - GET  /.well-known/osp.json          (manifest discovery)
    - POST /v1/provision                   (provision a resource)
    - DELETE /v1/deprovision/{resource_id} (deprovision a resource)
    - GET  /v1/status/{resource_id}        (resource status)
    - POST /v1/rotate/{resource_id}        (credential rotation)
    - GET  /v1/usage/{resource_id}         (usage report)
    - GET  /v1/health                      (provider health)
    - GET  /v1/cost-summary                (cost summary)

Usage:
    router = create_osp_router(
        manifest=manifest,
        on_provision=handle_provision,
        on_deprovision=handle_deprovision,
        on_status=handle_status,
    )
    app.include_router(router, prefix="/osp")
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Optional

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from osp_provider.types import (
    CredentialBundle,
    CostSummary,
    CostSummaryParams,
    HealthStatus,
    HealthState,
    OSPErrorResponse,
    ProvisionRequest,
    ProvisionResponse,
    ResourceStatus,
    ServiceManifest,
    UsageReport,
)

logger = logging.getLogger("osp.provider")

# ---------------------------------------------------------------------------
# Handler type aliases
# ---------------------------------------------------------------------------

OnProvision = Callable[[ProvisionRequest], Awaitable[ProvisionResponse]]
OnDeprovision = Callable[[str], Awaitable[None]]
OnStatus = Callable[[str], Awaitable[ResourceStatus]]
OnRotate = Callable[[str], Awaitable[CredentialBundle]]
OnUsage = Callable[[str], Awaitable[UsageReport]]
OnHealth = Callable[[], Awaitable[HealthStatus]]
OnCostSummary = Callable[[CostSummaryParams], Awaitable[CostSummary]]


# ---------------------------------------------------------------------------
# Error class
# ---------------------------------------------------------------------------

class OSPError(Exception):
    """
    Custom error class for provider errors with OSP error codes.
    Raise this from handlers to return structured error responses.

    Example:
        raise OSPError(400, "region_unavailable", "Region us-west-3 is not supported")
    """

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.details = details


# ---------------------------------------------------------------------------
# Router factory
# ---------------------------------------------------------------------------

def create_osp_router(
    *,
    manifest: ServiceManifest,
    on_provision: OnProvision,
    on_deprovision: OnDeprovision,
    on_status: OnStatus,
    on_rotate: OnRotate | None = None,
    on_usage: OnUsage | None = None,
    on_health: OnHealth | None = None,
    on_cost_summary: OnCostSummary | None = None,
    enable_logging: bool = True,
) -> APIRouter:
    """
    Create a FastAPI APIRouter with all OSP provider endpoints.

    Args:
        manifest: The ServiceManifest to serve at /.well-known/osp.json.
        on_provision: Handler for provisioning requests.
        on_deprovision: Handler for deprovisioning resources.
        on_status: Handler for resource status queries.
        on_rotate: Optional handler for credential rotation.
        on_usage: Optional handler for usage reports.
        on_health: Optional handler for health checks.
        on_cost_summary: Optional handler for cost summaries.
        enable_logging: Whether to log requests. Default: True.

    Returns:
        A configured FastAPI APIRouter.

    Example:
        router = create_osp_router(
            manifest=manifest,
            on_provision=handle_provision,
            on_deprovision=handle_deprovision,
            on_status=handle_status,
        )
        app.include_router(router, prefix="/osp")
    """

    router = APIRouter()
    osp_version = manifest.osp_spec_version or "1.0"

    # Serialize manifest once for performance
    manifest_dict = manifest.model_dump(mode="json", exclude_none=True)

    # -------------------------------------------------------------------
    # Middleware: add X-OSP-Version header to all responses
    # -------------------------------------------------------------------

    @router.middleware("http")
    async def add_osp_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-OSP-Version"] = osp_version
        return response

    # -------------------------------------------------------------------
    # Logging helper
    # -------------------------------------------------------------------

    def log_request(method: str, path: str, resource_id: str = "-") -> None:
        if enable_logging:
            logger.info(
                "%s %s resource_id=%s",
                method,
                path,
                resource_id,
            )

    # -------------------------------------------------------------------
    # GET /.well-known/osp.json - Manifest discovery
    # -------------------------------------------------------------------

    @router.get("/.well-known/osp.json")
    async def get_manifest():
        log_request("GET", "/.well-known/osp.json")
        return JSONResponse(content=manifest_dict)

    # -------------------------------------------------------------------
    # POST /v1/provision - Provision a resource
    # -------------------------------------------------------------------

    @router.post("/v1/provision")
    async def provision(request: Request) -> Response:
        try:
            body = await request.json()
            req = ProvisionRequest.model_validate(body)
        except ValidationError as e:
            errors = [
                {"path": ".".join(str(loc) for loc in err["loc"]), "message": err["msg"]}
                for err in e.errors()
            ]
            return _error_response(
                400, "invalid_request", "Request validation failed",
                {"validation_errors": errors},
            )
        except Exception:
            return _error_response(400, "invalid_request", "Invalid JSON body")

        log_request("POST", "/v1/provision", req.project_name)

        try:
            response = await on_provision(req)
            status_code = 202 if response.status == "provisioning" else 200
            return JSONResponse(
                status_code=status_code,
                content=response.model_dump(mode="json", exclude_none=True),
            )
        except OSPError as e:
            return _error_response(e.status_code, e.code, str(e), e.details)
        except Exception as e:
            logger.exception("Error in provision handler")
            return _error_response(500, "provider_error", str(e))

    # -------------------------------------------------------------------
    # DELETE /v1/deprovision/{resource_id} - Deprovision a resource
    # -------------------------------------------------------------------

    @router.delete("/v1/deprovision/{resource_id}")
    async def deprovision(resource_id: str) -> Response:
        if not resource_id or not resource_id.strip():
            return _error_response(400, "invalid_request", "Invalid resource_id")

        log_request("DELETE", f"/v1/deprovision/{resource_id}", resource_id)

        try:
            await on_deprovision(resource_id)
            return JSONResponse(
                content={"status": "deprovisioned", "resource_id": resource_id}
            )
        except OSPError as e:
            return _error_response(e.status_code, e.code, str(e), e.details)
        except Exception as e:
            logger.exception("Error in deprovision handler")
            return _error_response(500, "provider_error", str(e))

    # -------------------------------------------------------------------
    # GET /v1/status/{resource_id} - Resource status
    # -------------------------------------------------------------------

    @router.get("/v1/status/{resource_id}")
    async def status(resource_id: str) -> Response:
        if not resource_id or not resource_id.strip():
            return _error_response(400, "invalid_request", "Invalid resource_id")

        log_request("GET", f"/v1/status/{resource_id}", resource_id)

        try:
            result = await on_status(resource_id)
            return JSONResponse(
                content=result.model_dump(mode="json", exclude_none=True)
            )
        except OSPError as e:
            return _error_response(e.status_code, e.code, str(e), e.details)
        except Exception as e:
            logger.exception("Error in status handler")
            return _error_response(500, "provider_error", str(e))

    # -------------------------------------------------------------------
    # POST /v1/rotate/{resource_id} - Credential rotation
    # -------------------------------------------------------------------

    if on_rotate is not None:
        _rotate_handler = on_rotate

        @router.post("/v1/rotate/{resource_id}")
        async def rotate(resource_id: str) -> Response:
            if not resource_id or not resource_id.strip():
                return _error_response(400, "invalid_request", "Invalid resource_id")

            log_request("POST", f"/v1/rotate/{resource_id}", resource_id)

            try:
                result = await _rotate_handler(resource_id)
                return JSONResponse(
                    content=result.model_dump(mode="json", exclude_none=True)
                )
            except OSPError as e:
                return _error_response(e.status_code, e.code, str(e), e.details)
            except Exception as e:
                logger.exception("Error in rotate handler")
                return _error_response(500, "provider_error", str(e))

    # -------------------------------------------------------------------
    # GET /v1/usage/{resource_id} - Usage report
    # -------------------------------------------------------------------

    if on_usage is not None:
        _usage_handler = on_usage

        @router.get("/v1/usage/{resource_id}")
        async def usage(resource_id: str) -> Response:
            if not resource_id or not resource_id.strip():
                return _error_response(400, "invalid_request", "Invalid resource_id")

            log_request("GET", f"/v1/usage/{resource_id}", resource_id)

            try:
                result = await _usage_handler(resource_id)
                return JSONResponse(
                    content=result.model_dump(mode="json", exclude_none=True)
                )
            except OSPError as e:
                return _error_response(e.status_code, e.code, str(e), e.details)
            except Exception as e:
                logger.exception("Error in usage handler")
                return _error_response(500, "provider_error", str(e))

    # -------------------------------------------------------------------
    # GET /v1/health - Provider health check
    # -------------------------------------------------------------------

    @router.get("/v1/health")
    async def health() -> Response:
        log_request("GET", "/v1/health")

        if on_health is None:
            return JSONResponse(content={
                "status": "healthy",
                "checked_at": datetime.now(timezone.utc).isoformat(),
            })

        try:
            result = await on_health()
            status_code = 503 if result.status == HealthState.UNHEALTHY else 200
            return JSONResponse(
                status_code=status_code,
                content=result.model_dump(mode="json", exclude_none=True),
            )
        except Exception as e:
            logger.exception("Error in health handler")
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "checked_at": datetime.now(timezone.utc).isoformat(),
                    "details": {"error": str(e)},
                },
            )

    # -------------------------------------------------------------------
    # GET /v1/cost-summary - Cost summary
    # -------------------------------------------------------------------

    if on_cost_summary is not None:
        _cost_handler = on_cost_summary

        @router.get("/v1/cost-summary")
        async def cost_summary(
            resource_id: str | None = None,
            period_start: str | None = None,
            period_end: str | None = None,
        ) -> Response:
            log_request("GET", "/v1/cost-summary")

            params = CostSummaryParams(
                resource_id=resource_id,
                period_start=period_start,
                period_end=period_end,
            )

            try:
                result = await _cost_handler(params)
                return JSONResponse(
                    content=result.model_dump(mode="json", exclude_none=True)
                )
            except OSPError as e:
                return _error_response(e.status_code, e.code, str(e), e.details)
            except Exception as e:
                logger.exception("Error in cost_summary handler")
                return _error_response(500, "provider_error", str(e))

    return router


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _error_response(
    status_code: int,
    code: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> JSONResponse:
    """Create a standardized OSP error response."""
    body: dict[str, Any] = {"error": message, "code": code}
    if details:
        body["details"] = details
    return JSONResponse(status_code=status_code, content=body)
