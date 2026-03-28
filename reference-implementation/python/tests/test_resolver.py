"""Tests for osp:// URI resolver."""

from __future__ import annotations

import os

import pytest

from osp.resolver import (
    OSPResolver,
    ParsedOSPUri,
    build_osp_uri,
    is_osp_uri,
    parse_osp_uri,
)


# ---------------------------------------------------------------------------
# parse_osp_uri
# ---------------------------------------------------------------------------

class TestParseOSPUri:
    def test_valid_uri(self) -> None:
        result = parse_osp_uri("osp://supabase.com/postgres/connection_string")
        assert result == ParsedOSPUri(
            provider="supabase.com",
            offering="postgres",
            key="connection_string",
        )

    def test_subdomain_provider(self) -> None:
        result = parse_osp_uri("osp://api.example.io/auth/api_key")
        assert result is not None
        assert result.provider == "api.example.io"

    def test_key_with_slashes(self) -> None:
        result = parse_osp_uri("osp://provider.com/svc/deep/nested/key")
        assert result is not None
        assert result.key == "deep/nested/key"

    def test_empty_string(self) -> None:
        assert parse_osp_uri("") is None

    def test_regular_url(self) -> None:
        assert parse_osp_uri("https://example.com/foo") is None

    def test_missing_key(self) -> None:
        assert parse_osp_uri("osp://provider.com/offering") is None

    def test_missing_offering_and_key(self) -> None:
        assert parse_osp_uri("osp://provider.com") is None

    def test_bare_scheme(self) -> None:
        assert parse_osp_uri("osp://") is None


# ---------------------------------------------------------------------------
# build_osp_uri
# ---------------------------------------------------------------------------

class TestBuildOSPUri:
    def test_builds_valid_uri(self) -> None:
        assert build_osp_uri("supabase.com", "postgres", "conn") == "osp://supabase.com/postgres/conn"

    def test_round_trip(self) -> None:
        uri = build_osp_uri("neon.tech", "pg", "dsn")
        parsed = parse_osp_uri(uri)
        assert parsed == ParsedOSPUri(provider="neon.tech", offering="pg", key="dsn")


# ---------------------------------------------------------------------------
# is_osp_uri
# ---------------------------------------------------------------------------

class TestIsOSPUri:
    def test_valid(self) -> None:
        assert is_osp_uri("osp://a.com/b/c") is True

    def test_invalid(self) -> None:
        assert is_osp_uri("https://example.com") is False
        assert is_osp_uri("") is False
        assert is_osp_uri("osp://a/b") is False


# ---------------------------------------------------------------------------
# OSPResolver — vault
# ---------------------------------------------------------------------------

class TestResolverVault:
    def test_store_and_resolve(self) -> None:
        r = OSPResolver(env_fallback=False)
        r.add_credential("supabase.com", "postgres", {
            "connection_string": "postgres://host/db",
            "api_key": "sk_123",
        })
        assert r.resolve("osp://supabase.com/postgres/connection_string") == "postgres://host/db"
        assert r.resolve("osp://supabase.com/postgres/api_key") == "sk_123"

    def test_missing_provider(self) -> None:
        r = OSPResolver(env_fallback=False)
        assert r.resolve("osp://unknown.com/svc/key") is None

    def test_missing_offering(self) -> None:
        r = OSPResolver(env_fallback=False)
        r.add_credential("a.com", "svc1", {"key": "val"})
        assert r.resolve("osp://a.com/svc2/key") is None

    def test_missing_key(self) -> None:
        r = OSPResolver(env_fallback=False)
        r.add_credential("a.com", "svc", {"key1": "v1"})
        assert r.resolve("osp://a.com/svc/key2") is None

    def test_invalid_uri(self) -> None:
        r = OSPResolver(env_fallback=False)
        assert r.resolve("not-a-uri") is None

    def test_overwrite(self) -> None:
        r = OSPResolver(env_fallback=False)
        r.add_credential("a.com", "svc", {"k": "v1"})
        r.add_credential("a.com", "svc", {"k": "v2"})
        assert r.resolve("osp://a.com/svc/k") == "v2"

    def test_multiple_providers(self) -> None:
        r = OSPResolver(env_fallback=False)
        r.add_credential("a.com", "s1", {"k": "a1"})
        r.add_credential("a.com", "s2", {"k": "a2"})
        r.add_credential("b.com", "s1", {"k": "b1"})
        assert r.resolve("osp://a.com/s1/k") == "a1"
        assert r.resolve("osp://a.com/s2/k") == "a2"
        assert r.resolve("osp://b.com/s1/k") == "b1"


# ---------------------------------------------------------------------------
# OSPResolver — remove_credential
# ---------------------------------------------------------------------------

class TestRemoveCredential:
    def test_remove_success(self) -> None:
        r = OSPResolver(env_fallback=False)
        r.add_credential("a.com", "svc", {"k": "v"})
        assert r.remove_credential("a.com", "svc") is True
        assert r.resolve("osp://a.com/svc/k") is None

    def test_remove_missing_provider(self) -> None:
        r = OSPResolver(env_fallback=False)
        assert r.remove_credential("nope.com", "svc") is False

    def test_remove_missing_offering(self) -> None:
        r = OSPResolver(env_fallback=False)
        r.add_credential("a.com", "svc1", {"k": "v"})
        assert r.remove_credential("a.com", "svc2") is False


# ---------------------------------------------------------------------------
# OSPResolver — resolve_all
# ---------------------------------------------------------------------------

class TestResolveAll:
    def test_resolves_osp_uris(self) -> None:
        r = OSPResolver(env_fallback=False)
        r.add_credential("a.com", "svc", {"key": "resolved"})
        result = r.resolve_all({
            "DB_URL": "osp://a.com/svc/key",
            "PLAIN": "value",
        })
        assert result["DB_URL"] == "resolved"
        assert result["PLAIN"] == "value"

    def test_unresolvable_kept(self) -> None:
        r = OSPResolver(env_fallback=False)
        result = r.resolve_all({"X": "osp://unknown.com/svc/key"})
        assert result["X"] == "osp://unknown.com/svc/key"

    def test_empty_dict(self) -> None:
        r = OSPResolver(env_fallback=False)
        assert r.resolve_all({}) == {}


# ---------------------------------------------------------------------------
# OSPResolver — list_uris
# ---------------------------------------------------------------------------

class TestListUris:
    def test_lists_all(self) -> None:
        r = OSPResolver(env_fallback=False)
        r.add_credential("a.com", "svc", {"k1": "v1", "k2": "v2"})
        r.add_credential("b.com", "db", {"dsn": "pg://"})
        uris = r.list_uris()
        assert len(uris) == 3
        assert "osp://a.com/svc/k1" in uris
        assert "osp://b.com/db/dsn" in uris

    def test_empty_list(self) -> None:
        r = OSPResolver(env_fallback=False)
        assert r.list_uris() == []


# ---------------------------------------------------------------------------
# OSPResolver — generate_dotenv
# ---------------------------------------------------------------------------

class TestGenerateDotenv:
    def test_plain_format(self) -> None:
        r = OSPResolver(env_fallback=False)
        r.add_credential("supabase.com", "postgres", {
            "connection_string": "postgres://host/db",
        })
        dotenv = r.generate_dotenv()
        assert "CONNECTION_STRING=postgres://host/db" in dotenv
        assert "# supabase.com" in dotenv

    def test_nextjs_format(self) -> None:
        r = OSPResolver(env_fallback=False)
        r.add_credential("supabase.com", "postgres", {
            "supabase_anon_key": "eyJ...",
        })
        dotenv = r.generate_dotenv(framework="nextjs")
        assert "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ..." in dotenv

    def test_vite_format(self) -> None:
        r = OSPResolver(env_fallback=False)
        r.add_credential("stripe.com", "payments", {
            "publishable_key": "pk_test_123",
        })
        dotenv = r.generate_dotenv(framework="vite")
        assert "VITE_PUBLISHABLE_KEY=pk_test_123" in dotenv

    def test_no_prefix_for_secret_keys(self) -> None:
        r = OSPResolver(env_fallback=False)
        r.add_credential("a.com", "svc", {"secret_key": "sk"})
        dotenv = r.generate_dotenv(framework="nextjs")
        assert "SECRET_KEY=sk" in dotenv
        assert "NEXT_PUBLIC_SECRET_KEY" not in dotenv

    def test_empty_output(self) -> None:
        r = OSPResolver(env_fallback=False)
        assert r.generate_dotenv().strip() == ""


# ---------------------------------------------------------------------------
# OSPResolver — env fallback
# ---------------------------------------------------------------------------

class TestEnvFallback:
    def test_fallback_to_env(self, monkeypatch) -> None:
        monkeypatch.setenv("CONNECTION_STRING", "env_value")
        r = OSPResolver(env_fallback=True)
        assert r.resolve("osp://any.com/svc/connection_string") == "env_value"

    def test_no_fallback_when_disabled(self, monkeypatch) -> None:
        monkeypatch.setenv("CONNECTION_STRING", "env_value")
        r = OSPResolver(env_fallback=False)
        assert r.resolve("osp://any.com/svc/connection_string") is None

    def test_vault_preferred_over_env(self, monkeypatch) -> None:
        monkeypatch.setenv("CONNECTION_STRING", "env_value")
        r = OSPResolver(env_fallback=True)
        r.add_credential("any.com", "svc", {"connection_string": "vault_value"})
        assert r.resolve("osp://any.com/svc/connection_string") == "vault_value"

    def test_custom_env_prefix(self, monkeypatch) -> None:
        monkeypatch.setenv("SUPABASE_CONNECTION_STRING", "prefixed")
        r = OSPResolver(env_fallback=True, env_prefixes={"supabase.com": "SUPABASE_"})
        assert r.resolve("osp://supabase.com/postgres/connection_string") == "prefixed"
