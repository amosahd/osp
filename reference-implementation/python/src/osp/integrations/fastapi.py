"""FastAPI integration for OSP — dependency injection helpers.

Usage::

    from fastapi import FastAPI, Depends
    from osp.integrations.fastapi import osp_dependency, get_osp_client

    app = FastAPI()

    @app.on_event("startup")
    async def startup():
        osp_dependency.configure(auth_token="my-token")

    @app.get("/discover")
    async def discover(osp = Depends(get_osp_client)):
        manifest = await osp.discover("https://supabase.com")
        return manifest.model_dump()
"""

from __future__ import annotations

from typing import AsyncIterator

from osp.client import OSPClient, RetryConfig
from osp.resolver import OSPResolver


class OSPDependency:
    """Singleton-style dependency holder for FastAPI apps.

    Call :meth:`configure` once at startup, then use :func:`get_osp_client`
    or :func:`get_osp_resolver` as FastAPI dependencies.
    """

    def __init__(self) -> None:
        self._client: OSPClient | None = None
        self._resolver: OSPResolver | None = None
        self._auth_token: str | None = None
        self._registry_url: str | None = None
        self._retry: RetryConfig | None = None
        self._timeout: float = 30.0

    def configure(
        self,
        *,
        auth_token: str | None = None,
        registry_url: str | None = None,
        retry: RetryConfig | None = None,
        timeout: float = 30.0,
        env_fallback: bool = True,
        credentials: dict[str, dict[str, dict[str, str]]] | None = None,
    ) -> None:
        """Configure the OSP dependency.

        Parameters
        ----------
        auth_token:
            Bearer token for provider authentication.
        registry_url:
            Custom OSP registry URL.
        retry:
            Retry configuration.
        timeout:
            HTTP timeout in seconds.
        env_fallback:
            Whether the resolver should fall back to env vars.
        credentials:
            Pre-loaded credentials as provider -> offering -> {key: value}.
        """
        self._auth_token = auth_token
        self._registry_url = registry_url
        self._retry = retry
        self._timeout = timeout

        self._resolver = OSPResolver(env_fallback=env_fallback)
        if credentials:
            for provider, offerings in credentials.items():
                for offering, creds in offerings.items():
                    self._resolver.add_credential(provider, offering, creds)

    def get_client(self) -> OSPClient:
        """Get or create the shared OSPClient instance."""
        if self._client is None:
            self._client = OSPClient(
                registry_url=self._registry_url,
                auth_token=self._auth_token,
                retry=self._retry,
                timeout=self._timeout,
            )
        return self._client

    def get_resolver(self) -> OSPResolver:
        """Get or create the shared OSPResolver instance."""
        if self._resolver is None:
            self._resolver = OSPResolver()
        return self._resolver

    async def close(self) -> None:
        """Close the shared client."""
        if self._client is not None:
            await self._client.close()
            self._client = None


# Singleton
osp_dependency = OSPDependency()


async def get_osp_client() -> AsyncIterator[OSPClient]:
    """FastAPI dependency that yields the shared OSPClient."""
    yield osp_dependency.get_client()


async def get_osp_resolver() -> AsyncIterator[OSPResolver]:
    """FastAPI dependency that yields the shared OSPResolver."""
    yield osp_dependency.get_resolver()
