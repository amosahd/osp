"""Django integration for OSP — middleware and settings helpers.

Usage in settings.py::

    MIDDLEWARE = [
        ...
        "osp.integrations.django.OSPMiddleware",
    ]

    OSP_CONFIG = {
        "credentials": {
            "supabase.com": {
                "postgres": {
                    "SUPABASE_URL": "https://...",
                    "SUPABASE_ANON_KEY": "eyJ...",
                }
            }
        },
        "env_fallback": True,
    }

Usage in views::

    from osp.integrations.django import get_osp_resolver, get_osp_client

    resolver = get_osp_resolver()
    value = resolver.resolve("osp://supabase.com/postgres/SUPABASE_URL")
"""

from __future__ import annotations

import os
from typing import Any

from osp.resolver import OSPResolver

# Module-level singleton
_resolver: OSPResolver | None = None
_configured = False


def configure(
    credentials: dict[str, dict[str, dict[str, str]]] | None = None,
    *,
    env_fallback: bool = True,
    env_prefixes: dict[str, str] | None = None,
    auto_inject_env: bool = True,
) -> OSPResolver:
    """Configure the OSP Django integration.

    This should be called once at app startup (or from the middleware).

    Parameters
    ----------
    credentials:
        Pre-loaded credentials as provider -> offering -> {key: value}.
    env_fallback:
        Whether to fall back to environment variables.
    env_prefixes:
        Custom env var prefixes per provider.
    auto_inject_env:
        If True, injects resolved credentials into os.environ.
    """
    global _resolver, _configured
    _resolver = OSPResolver(env_fallback=env_fallback, env_prefixes=env_prefixes or {})

    if credentials:
        for provider, offerings in credentials.items():
            for offering, creds in offerings.items():
                _resolver.add_credential(provider, offering, creds)

    if auto_inject_env and credentials:
        for provider, offerings in credentials.items():
            for offering, creds in offerings.items():
                for key, value in creds.items():
                    env_key = key.upper()
                    if env_key not in os.environ:
                        os.environ[env_key] = value

    _configured = True
    return _resolver


def get_osp_resolver() -> OSPResolver:
    """Get the configured OSPResolver singleton.

    If not yet configured, creates a default resolver.
    """
    global _resolver
    if _resolver is None:
        _resolver = OSPResolver()
    return _resolver


def get_osp_client(**kwargs: Any) -> Any:
    """Create an OSPClient for use in async Django views.

    This returns a new client each time — callers should use it as
    a context manager::

        async with get_osp_client() as osp:
            manifest = await osp.discover("https://supabase.com")
    """
    from osp.client import OSPClient
    return OSPClient(**kwargs)


class OSPMiddleware:
    """Django middleware that configures OSP from Django settings.

    Reads ``settings.OSP_CONFIG`` on first request and calls
    :func:`configure` with those values.
    """

    def __init__(self, get_response: Any) -> None:
        self.get_response = get_response

    def __call__(self, request: Any) -> Any:
        global _configured
        if not _configured:
            self._configure_from_settings()
        return self.get_response(request)

    @staticmethod
    def _configure_from_settings() -> None:
        try:
            from django.conf import settings
            osp_config = getattr(settings, "OSP_CONFIG", {})
        except Exception:
            osp_config = {}

        configure(
            credentials=osp_config.get("credentials"),
            env_fallback=osp_config.get("env_fallback", True),
            env_prefixes=osp_config.get("env_prefixes"),
            auto_inject_env=osp_config.get("auto_inject_env", True),
        )
