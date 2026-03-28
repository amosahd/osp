"""Tests for Django and FastAPI integrations."""

from __future__ import annotations

import os

import pytest

from osp.integrations.fastapi import (
    OSPDependency,
    get_osp_client,
    get_osp_resolver,
    osp_dependency,
)
from osp.integrations.django import (
    OSPMiddleware,
    configure,
    get_osp_resolver as django_get_resolver,
    get_osp_client as django_get_client,
)
from osp.client import OSPClient
from osp.resolver import OSPResolver


# ---------------------------------------------------------------------------
# FastAPI integration
# ---------------------------------------------------------------------------

class TestFastAPIDependency:
    def test_configure_creates_resolver(self) -> None:
        dep = OSPDependency()
        dep.configure(
            auth_token="test-token",
            credentials={
                "supabase.com": {
                    "postgres": {"conn": "pg://host/db"},
                },
            },
        )
        resolver = dep.get_resolver()
        assert resolver.resolve("osp://supabase.com/postgres/conn") == "pg://host/db"

    def test_get_client(self) -> None:
        dep = OSPDependency()
        dep.configure()
        client = dep.get_client()
        assert isinstance(client, OSPClient)
        # Second call returns same instance
        assert dep.get_client() is client

    def test_get_resolver_default(self) -> None:
        dep = OSPDependency()
        resolver = dep.get_resolver()
        assert isinstance(resolver, OSPResolver)

    async def test_close(self) -> None:
        dep = OSPDependency()
        dep.configure()
        client = dep.get_client()
        assert not client._http.is_closed
        await dep.close()
        assert client._http.is_closed

    async def test_get_osp_client_dependency(self) -> None:
        osp_dependency.configure()
        gen = get_osp_client()
        client = await gen.__anext__()
        assert isinstance(client, OSPClient)
        await osp_dependency.close()

    async def test_get_osp_resolver_dependency(self) -> None:
        osp_dependency.configure()
        gen = get_osp_resolver()
        resolver = await gen.__anext__()
        assert isinstance(resolver, OSPResolver)


# ---------------------------------------------------------------------------
# Django integration
# ---------------------------------------------------------------------------

class TestDjangoIntegration:
    def test_configure(self) -> None:
        resolver = configure(
            credentials={
                "supabase.com": {
                    "postgres": {"SUPABASE_URL": "https://abc.supabase.co"},
                },
            },
            auto_inject_env=False,
        )
        assert resolver.resolve("osp://supabase.com/postgres/SUPABASE_URL") == "https://abc.supabase.co"

    def test_configure_injects_env(self, monkeypatch) -> None:
        # Clear any existing env var
        monkeypatch.delenv("SUPABASE_URL", raising=False)

        configure(
            credentials={
                "supabase.com": {
                    "postgres": {"SUPABASE_URL": "https://injected.supabase.co"},
                },
            },
            auto_inject_env=True,
        )
        assert os.environ.get("SUPABASE_URL") == "https://injected.supabase.co"

    def test_get_resolver_returns_singleton(self) -> None:
        configure(auto_inject_env=False)
        r1 = django_get_resolver()
        r2 = django_get_resolver()
        assert r1 is r2

    def test_get_client_returns_new(self) -> None:
        client = django_get_client()
        assert isinstance(client, OSPClient)

    def test_middleware_init(self) -> None:
        def fake_get_response(request):
            return None

        middleware = OSPMiddleware(fake_get_response)
        assert middleware.get_response is fake_get_response
