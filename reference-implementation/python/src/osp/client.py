"""OSP client for discovering and provisioning services.

Usage::

    async with OSPClient() as osp:
        manifest = await osp.discover("https://db.example.com")
        response = await osp.provision(
            "https://db.example.com",
            ProvisionRequest(service_id="postgres", tier_id="free"),
        )
        print(response.credentials_bundle)
"""

from __future__ import annotations

from types import TracebackType
from typing import Self

import httpx

from osp.manifest import WELL_KNOWN_PATH, fetch_manifest
from osp.types import (
    CredentialBundle,
    ProvisionRequest,
    ProvisionResponse,
    ServiceManifest,
    UsageReport,
)

DEFAULT_TIMEOUT = 30.0
DEFAULT_REGISTRY_URL = "https://registry.openserviceprotocol.org"


class OSPClientError(Exception):
    """Raised when an OSP operation fails at the protocol level."""

    def __init__(self, status_code: int, error: str, message: str = "") -> None:
        self.status_code = status_code
        self.error = error
        self.message = message
        super().__init__(f"[{status_code}] {error}: {message}" if message else f"[{status_code}] {error}")


class OSPClient:
    """Client for discovering and provisioning OSP services.

    Implements the full OSP client lifecycle: discovery, provisioning,
    credential management, status polling, usage reporting, and
    deprovisioning.

    The client wraps an :class:`httpx.AsyncClient` and should be closed when
    no longer needed.  Prefer using it as an async context manager::

        async with OSPClient() as osp:
            ...
    """

    def __init__(
        self,
        registry_url: str | None = None,
        *,
        timeout: float = DEFAULT_TIMEOUT,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.registry_url = (registry_url or DEFAULT_REGISTRY_URL).rstrip("/")
        extra_headers = {"User-Agent": "osp-python/0.1.0"}
        if headers:
            extra_headers.update(headers)
        self._http = httpx.AsyncClient(timeout=timeout, headers=extra_headers)

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
        """Fetch and validate a provider's ServiceManifest from ``/.well-known/osp.json``.

        Parameters
        ----------
        provider_url:
            Base URL of the provider.

        Returns
        -------
        ServiceManifest
            The validated manifest.
        """
        return await fetch_manifest(provider_url, client=self._http)

    async def discover_from_registry(
        self,
        category: str | None = None,
    ) -> list[ServiceManifest]:
        """Discover services from the OSP registry.

        Parameters
        ----------
        category:
            Optional category filter (e.g. ``"database"``, ``"storage"``).

        Returns
        -------
        list[ServiceManifest]
            Manifests matching the query.
        """
        params: dict[str, str] = {}
        if category:
            params["category"] = category
        response = await self._http.get(
            f"{self.registry_url}/v1/services",
            params=params,
        )
        response.raise_for_status()
        data = response.json()
        return [ServiceManifest.model_validate(item) for item in data]

    # -- provisioning --------------------------------------------------------

    async def provision(
        self,
        provider_url: str,
        request: ProvisionRequest,
    ) -> ProvisionResponse:
        """Provision a new service resource.

        Parameters
        ----------
        provider_url:
            Base URL of the provider.
        request:
            Provisioning parameters.

        Returns
        -------
        ProvisionResponse
            Details about the newly created resource.
        """
        url = provider_url.rstrip("/") + "/osp/v1/provision"
        response = await self._http.post(url, json=request.model_dump(mode="json"))
        self._raise_for_osp_error(response)
        return ProvisionResponse.model_validate(response.json())

    async def deprovision(self, provider_url: str, resource_id: str) -> None:
        """Deprovision (destroy) a resource.

        Parameters
        ----------
        provider_url:
            Base URL of the provider.
        resource_id:
            Identifier of the resource to destroy.
        """
        url = provider_url.rstrip("/") + f"/osp/v1/resources/{resource_id}"
        response = await self._http.delete(url)
        self._raise_for_osp_error(response)

    # -- credentials ---------------------------------------------------------

    async def get_credentials(
        self,
        provider_url: str,
        resource_id: str,
    ) -> CredentialBundle:
        """Fetch current credentials for a resource.

        Parameters
        ----------
        provider_url:
            Base URL of the provider.
        resource_id:
            Resource identifier.

        Returns
        -------
        CredentialBundle
        """
        url = provider_url.rstrip("/") + f"/osp/v1/resources/{resource_id}/credentials"
        response = await self._http.get(url)
        self._raise_for_osp_error(response)
        return CredentialBundle.model_validate(response.json())

    async def rotate_credentials(
        self,
        provider_url: str,
        resource_id: str,
    ) -> CredentialBundle:
        """Rotate credentials for a resource.

        Parameters
        ----------
        provider_url:
            Base URL of the provider.
        resource_id:
            Resource identifier.

        Returns
        -------
        CredentialBundle
            The new credentials.
        """
        url = provider_url.rstrip("/") + f"/osp/v1/resources/{resource_id}/credentials/rotate"
        response = await self._http.post(url)
        self._raise_for_osp_error(response)
        return CredentialBundle.model_validate(response.json())

    # -- status & usage ------------------------------------------------------

    async def get_status(self, provider_url: str, resource_id: str) -> dict:
        """Get the current status of a resource.

        Parameters
        ----------
        provider_url:
            Base URL of the provider.
        resource_id:
            Resource identifier.

        Returns
        -------
        dict
            Provider-defined status payload.
        """
        url = provider_url.rstrip("/") + f"/osp/v1/resources/{resource_id}/status"
        response = await self._http.get(url)
        self._raise_for_osp_error(response)
        return response.json()

    async def get_usage(self, provider_url: str, resource_id: str) -> UsageReport:
        """Get a usage report for a resource.

        Parameters
        ----------
        provider_url:
            Base URL of the provider.
        resource_id:
            Resource identifier.

        Returns
        -------
        UsageReport
        """
        url = provider_url.rstrip("/") + f"/osp/v1/resources/{resource_id}/usage"
        response = await self._http.get(url)
        self._raise_for_osp_error(response)
        return UsageReport.model_validate(response.json())

    # -- health --------------------------------------------------------------

    async def check_health(self, provider_url: str) -> dict:
        """Check a provider's health endpoint.

        Parameters
        ----------
        provider_url:
            Base URL of the provider.

        Returns
        -------
        dict
            Health status payload.
        """
        url = provider_url.rstrip("/") + "/osp/v1/health"
        response = await self._http.get(url)
        self._raise_for_osp_error(response)
        return response.json()

    # -- lifecycle -----------------------------------------------------------

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._http.aclose()

    # -- internal ------------------------------------------------------------

    @staticmethod
    def _raise_for_osp_error(response: httpx.Response) -> None:
        """Raise :class:`OSPClientError` on non-2xx responses."""
        if response.is_success:
            return
        try:
            body = response.json()
            error = body.get("error", "unknown_error")
            message = body.get("message", "")
        except Exception:
            error = "unknown_error"
            message = response.text
        raise OSPClientError(
            status_code=response.status_code,
            error=error,
            message=message,
        )
