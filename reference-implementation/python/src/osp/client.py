"""OSP client for discovering and provisioning services — v1.1.

Features: retries with exponential backoff, timeouts, manifest caching,
typed responses, async context manager.

Usage::

    async with OSPClient() as osp:
        manifest = await osp.discover("https://supabase.com")
        response = await osp.provision("https://supabase.com", ProvisionRequest(
            offering_id="supabase/postgres", tier_id="free",
            project_name="my-db", nonce="abc",
        ))
        print(response.credentials)
"""

from __future__ import annotations

import asyncio
import math
import random
import time
from dataclasses import dataclass, field
from types import TracebackType
from typing import Any, Self

import httpx

from osp.manifest import WELL_KNOWN_PATH, fetch_manifest
from osp.types import (
    CostSummary,
    CredentialBundle,
    HealthResponse,
    HealthStatus,
    OSPErrorBody,
    ProvisionRequest,
    ProvisionResponse,
    ResourceStatus,
    ServiceManifest,
    UsageReport,
)

DEFAULT_TIMEOUT = 30.0
DEFAULT_REGISTRY_URL = "https://registry.osp.dev"
DEFAULT_MAX_RETRIES = 3
DEFAULT_BASE_DELAY = 0.5
DEFAULT_MAX_DELAY = 10.0
DEFAULT_JITTER = 0.25

RETRYABLE_STATUS_CODES = frozenset({408, 429, 500, 502, 503, 504})


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass
class RetryConfig:
    """Retry configuration with exponential backoff."""
    max_retries: int = DEFAULT_MAX_RETRIES
    base_delay: float = DEFAULT_BASE_DELAY
    max_delay: float = DEFAULT_MAX_DELAY
    jitter: float = DEFAULT_JITTER


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------

class OSPClientError(Exception):
    """Raised when an OSP operation fails at the protocol level."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "unknown_error",
        status_code: int | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class OSPClient:
    """Async client for discovering and provisioning OSP services.

    Implements the full OSP client lifecycle with retries, timeouts, and
    manifest caching.

    Prefer using as an async context manager::

        async with OSPClient() as osp:
            ...
    """

    def __init__(
        self,
        registry_url: str | None = None,
        *,
        auth_token: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        retry: RetryConfig | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.registry_url = (registry_url or DEFAULT_REGISTRY_URL).rstrip("/")
        self._auth_token = auth_token
        self._retry = retry or RetryConfig()
        extra_headers: dict[str, str] = {"User-Agent": "osp-python/0.2.0"}
        if auth_token:
            extra_headers["Authorization"] = f"Bearer {auth_token}"
        if headers:
            extra_headers.update(headers)
        self._http = httpx.AsyncClient(timeout=timeout, headers=extra_headers)
        self._manifest_cache: dict[str, ServiceManifest] = {}

    # -- context manager -----------------------------------------------------

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        await self.close()

    # -- discovery -----------------------------------------------------------

    async def discover(self, provider_url: str) -> ServiceManifest:
        """Fetch a provider's manifest from /.well-known/osp.json.

        Results are cached in-memory for the lifetime of this client.
        """
        key = _normalize_url(provider_url)
        if key in self._manifest_cache:
            return self._manifest_cache[key]
        manifest = await fetch_manifest(provider_url, client=self._http)
        self._manifest_cache[key] = manifest
        return manifest

    async def discover_from_registry(
        self,
        category: str | None = None,
    ) -> list[ServiceManifest]:
        """Query the OSP registry for providers matching optional filters."""
        params: dict[str, str] = {}
        if category:
            params["category"] = category
        response = await self._fetch_with_retry(
            "GET",
            f"{self.registry_url}/v1/manifests",
            params=params,
        )
        data = response.json()
        return [ServiceManifest.model_validate(item) for item in data]

    # -- provisioning --------------------------------------------------------

    async def provision(
        self,
        provider_url: str,
        request: ProvisionRequest,
    ) -> ProvisionResponse:
        """Provision a new service resource.

        When ``request.idempotency_key`` is set, the ``Idempotency-Key`` HTTP
        header is sent so that providers can deduplicate retried requests.
        """
        manifest = await self.discover(provider_url)
        url = self._endpoint_url(provider_url, manifest.endpoints.provision)
        extra_headers: dict[str, str] = {}
        if request.idempotency_key:
            extra_headers["Idempotency-Key"] = request.idempotency_key
        response = await self._fetch_with_retry(
            "POST",
            url,
            json=request.model_dump(mode="json", exclude_none=True),
            headers=extra_headers or None,
        )
        return ProvisionResponse.model_validate(response.json())

    async def deprovision(self, provider_url: str, resource_id: str) -> None:
        """Deprovision (delete) a resource."""
        manifest = await self.discover(provider_url)
        url = self._endpoint_url(
            provider_url,
            manifest.endpoints.deprovision.replace(":resource_id", resource_id),
        )
        await self._fetch_with_retry("DELETE", url)

    # -- credentials ---------------------------------------------------------

    async def get_credentials(
        self,
        provider_url: str,
        resource_id: str,
    ) -> CredentialBundle:
        """Fetch current credentials for a resource."""
        manifest = await self.discover(provider_url)
        url = self._endpoint_url(
            provider_url,
            manifest.endpoints.credentials.replace(":resource_id", resource_id),
        )
        response = await self._fetch_with_retry("GET", url)
        return CredentialBundle.model_validate(response.json())

    async def rotate_credentials(
        self,
        provider_url: str,
        resource_id: str,
    ) -> CredentialBundle:
        """Rotate credentials for a resource."""
        manifest = await self.discover(provider_url)
        rotate = manifest.endpoints.rotate or manifest.endpoints.credentials
        url = self._endpoint_url(
            provider_url,
            rotate.replace(":resource_id", resource_id),
        )
        response = await self._fetch_with_retry("POST", url)
        return CredentialBundle.model_validate(response.json())

    # -- status & usage ------------------------------------------------------

    async def get_status(
        self,
        provider_url: str,
        resource_id: str,
    ) -> ResourceStatus:
        """Get the current status of a resource."""
        manifest = await self.discover(provider_url)
        url = self._endpoint_url(
            provider_url,
            manifest.endpoints.status.replace(":resource_id", resource_id),
        )
        response = await self._fetch_with_retry("GET", url)
        return ResourceStatus.model_validate(response.json())

    async def get_usage(
        self,
        provider_url: str,
        resource_id: str,
    ) -> UsageReport:
        """Fetch a usage/metering report for a resource."""
        manifest = await self.discover(provider_url)
        if not manifest.endpoints.usage:
            raise OSPClientError(
                "Provider does not expose a usage endpoint",
                code="NO_USAGE_ENDPOINT",
            )
        url = self._endpoint_url(
            provider_url,
            manifest.endpoints.usage.replace(":resource_id", resource_id),
        )
        response = await self._fetch_with_retry("GET", url)
        return UsageReport.model_validate(response.json())

    # -- health --------------------------------------------------------------

    async def check_health(self, provider_url: str) -> HealthStatus:
        """Check a provider's health endpoint."""
        manifest = await self.discover(provider_url)
        url = self._endpoint_url(provider_url, manifest.endpoints.health)
        start = time.monotonic()
        response = await self._fetch_with_retry("GET", url)
        latency_ms = (time.monotonic() - start) * 1000
        health = HealthStatus.model_validate(response.json())
        health.latency_ms = latency_ms
        return health

    async def get_health(self, provider_url: str) -> HealthResponse:
        """Fetch detailed health response with sub-checks and version info."""
        manifest = await self.discover(provider_url)
        url = self._endpoint_url(provider_url, manifest.endpoints.health)
        response = await self._fetch_with_retry("GET", url)
        return HealthResponse.model_validate(response.json())

    # -- cost summary --------------------------------------------------------

    async def get_cost_summary(
        self,
        provider_url: str,
        *,
        period_start: str | None = None,
        period_end: str | None = None,
        currency: str | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> CostSummary:
        """Fetch an aggregated cost summary from the provider.

        Parameters
        ----------
        provider_url:
            Base URL of the provider.
        period_start / period_end:
            ISO 8601 date strings bounding the billing period.
        currency:
            Preferred currency code for the response.
        limit / offset:
            Pagination for the resources list.
        """
        manifest = await self.discover(provider_url)
        if not manifest.endpoints.usage:
            raise OSPClientError(
                "Provider does not expose a usage endpoint for cost summary",
                code="NO_USAGE_ENDPOINT",
            )
        base_usage = manifest.endpoints.usage.split("/:")[0].rstrip("/")
        url = self._endpoint_url(provider_url, f"{base_usage}/cost-summary")
        params: dict[str, str] = {}
        if period_start:
            params["period_start"] = period_start
        if period_end:
            params["period_end"] = period_end
        if currency:
            params["currency"] = currency
        if limit is not None:
            params["limit"] = str(limit)
        if offset is not None:
            params["offset"] = str(offset)
        response = await self._fetch_with_retry("GET", url, params=params or None)
        return CostSummary.model_validate(response.json())

    # -- cache ---------------------------------------------------------------

    def clear_cache(self) -> None:
        """Clear the in-memory manifest cache."""
        self._manifest_cache.clear()

    # -- lifecycle -----------------------------------------------------------

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._http.aclose()

    # -- internal: retry wrapper ---------------------------------------------

    async def _fetch_with_retry(
        self,
        method: str,
        url: str,
        *,
        json: Any = None,
        params: dict[str, str] | None = None,
        headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        """Central fetch with retries, exponential backoff, and error handling."""
        cfg = self._retry
        last_error: Exception | None = None

        for attempt in range(cfg.max_retries + 1):
            try:
                response = await self._http.request(
                    method,
                    url,
                    json=json,
                    params=params,
                    headers=headers,
                )

                if response.is_success:
                    return response

                # Check if retryable
                if attempt < cfg.max_retries and response.status_code in RETRYABLE_STATUS_CODES:
                    # Respect Retry-After header for 429
                    retry_after = response.headers.get("retry-after")
                    if retry_after:
                        try:
                            delay = min(float(retry_after), cfg.max_delay)
                            await asyncio.sleep(delay)
                            continue
                        except ValueError:
                            pass
                    await asyncio.sleep(_compute_backoff(attempt, cfg))
                    continue

                # Non-retryable or exhausted retries
                try:
                    body = response.json()
                    error_body = OSPErrorBody.model_validate(body)
                    raise OSPClientError(
                        error_body.error,
                        code=error_body.code or f"HTTP_{response.status_code}",
                        status_code=response.status_code,
                        details=error_body.details,
                    )
                except (ValueError, KeyError):
                    raise OSPClientError(
                        response.text or f"HTTP {response.status_code}",
                        code=f"HTTP_{response.status_code}",
                        status_code=response.status_code,
                    )

            except OSPClientError:
                raise
            except Exception as exc:
                last_error = exc
                if attempt < cfg.max_retries:
                    await asyncio.sleep(_compute_backoff(attempt, cfg))
                    continue

        raise OSPClientError(
            str(last_error) if last_error else "Request failed after retries",
            code="RETRY_EXHAUSTED",
        )

    # -- internal: URL helpers -----------------------------------------------

    @staticmethod
    def _endpoint_url(provider_url: str, path: str) -> str:
        base = _normalize_url(provider_url)
        if path.startswith(("http://", "https://")):
            return path
        return f"{base}{'/' if not path.startswith('/') else ''}{path}"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_url(url: str) -> str:
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"
    return url.rstrip("/")


def _compute_backoff(attempt: int, cfg: RetryConfig) -> float:
    exponential = cfg.base_delay * (2 ** attempt)
    capped = min(exponential, cfg.max_delay)
    jitter_amount = capped * cfg.jitter * random.random()
    return capped + jitter_amount
