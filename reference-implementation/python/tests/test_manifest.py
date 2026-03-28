"""Tests for manifest utilities."""

from __future__ import annotations

import pytest
import respx
import httpx

from osp.manifest import (
    WELL_KNOWN_PATH,
    canonical_json,
    fetch_manifest,
    find_offering,
    find_offering_and_tier,
    find_tier,
    verify_manifest_signature,
)
from osp.types import ServiceManifest


# ---------------------------------------------------------------------------
# WELL_KNOWN_PATH
# ---------------------------------------------------------------------------

class TestWellKnownPath:
    def test_correct_path(self) -> None:
        assert WELL_KNOWN_PATH == "/.well-known/osp.json"


# ---------------------------------------------------------------------------
# fetch_manifest
# ---------------------------------------------------------------------------

class TestFetchManifest:
    @respx.mock
    async def test_fetch_success(self, sample_manifest: ServiceManifest) -> None:
        respx.get("https://test-provider.com/.well-known/osp.json").mock(
            return_value=httpx.Response(
                200,
                json=sample_manifest.model_dump(mode="json"),
            ),
        )

        manifest = await fetch_manifest("https://test-provider.com")
        assert manifest.display_name == "Test Provider"

    @respx.mock
    async def test_strips_trailing_slash(self, sample_manifest: ServiceManifest) -> None:
        respx.get("https://test-provider.com/.well-known/osp.json").mock(
            return_value=httpx.Response(
                200,
                json=sample_manifest.model_dump(mode="json"),
            ),
        )

        manifest = await fetch_manifest("https://test-provider.com/")
        assert manifest.display_name == "Test Provider"

    @respx.mock
    async def test_not_found_raises(self) -> None:
        respx.get("https://missing.com/.well-known/osp.json").mock(
            return_value=httpx.Response(404),
        )

        with pytest.raises(httpx.HTTPStatusError):
            await fetch_manifest("https://missing.com")

    @respx.mock
    async def test_with_custom_client(self, sample_manifest: ServiceManifest) -> None:
        respx.get("https://test-provider.com/.well-known/osp.json").mock(
            return_value=httpx.Response(
                200,
                json=sample_manifest.model_dump(mode="json"),
            ),
        )

        async with httpx.AsyncClient() as client:
            manifest = await fetch_manifest("https://test-provider.com", client=client)

        assert manifest.display_name == "Test Provider"


# ---------------------------------------------------------------------------
# verify_manifest_signature
# ---------------------------------------------------------------------------

class TestVerifySignature:
    def test_returns_true_when_signature_present(self, sample_manifest: ServiceManifest) -> None:
        assert verify_manifest_signature(sample_manifest) is True

    def test_returns_false_when_no_public_key(self, sample_manifest: ServiceManifest) -> None:
        manifest = sample_manifest.model_copy(update={"provider_public_key": None})
        assert verify_manifest_signature(manifest) is False

    def test_returns_false_when_no_signature(self, sample_manifest: ServiceManifest) -> None:
        manifest = sample_manifest.model_copy(update={"provider_signature": ""})
        assert verify_manifest_signature(manifest) is False


# ---------------------------------------------------------------------------
# canonical_json
# ---------------------------------------------------------------------------

class TestCanonicalJson:
    def test_sorts_keys(self) -> None:
        result = canonical_json({"z": 1, "a": 2, "m": {"y": 3, "b": 4}})
        assert result == '{"a":2,"m":{"b":4,"y":3},"z":1}'

    def test_preserves_arrays(self) -> None:
        result = canonical_json({"items": [3, 1, 2]})
        assert result == '{"items":[3,1,2]}'

    def test_handles_null(self) -> None:
        assert canonical_json(None) == "null"

    def test_handles_string(self) -> None:
        assert canonical_json("hello") == '"hello"'

    def test_handles_number(self) -> None:
        assert canonical_json(42) == "42"

    def test_nested_arrays_with_objects(self) -> None:
        result = canonical_json({"arr": [{"z": 1, "a": 2}]})
        assert result == '{"arr":[{"a":2,"z":1}]}'

    def test_empty_structures(self) -> None:
        assert canonical_json({}) == "{}"
        assert canonical_json([]) == "[]"


# ---------------------------------------------------------------------------
# find_offering
# ---------------------------------------------------------------------------

class TestFindOffering:
    def test_finds_existing(self, sample_manifest: ServiceManifest) -> None:
        offering = find_offering(sample_manifest, "test-provider/postgres")
        assert offering is not None
        assert offering.name == "Managed PostgreSQL"

    def test_returns_none_for_missing(self, sample_manifest: ServiceManifest) -> None:
        assert find_offering(sample_manifest, "unknown/service") is None


# ---------------------------------------------------------------------------
# find_tier
# ---------------------------------------------------------------------------

class TestFindTier:
    def test_finds_existing(self, sample_manifest: ServiceManifest) -> None:
        offering = find_offering(sample_manifest, "test-provider/postgres")
        assert offering is not None
        tier = find_tier(offering, "pro")
        assert tier is not None
        assert tier.price.amount == "29.99"

    def test_returns_none_for_missing(self, sample_manifest: ServiceManifest) -> None:
        offering = find_offering(sample_manifest, "test-provider/postgres")
        assert offering is not None
        assert find_tier(offering, "enterprise") is None


# ---------------------------------------------------------------------------
# find_offering_and_tier
# ---------------------------------------------------------------------------

class TestFindOfferingAndTier:
    def test_finds_both(self, sample_manifest: ServiceManifest) -> None:
        offering, tier = find_offering_and_tier(
            sample_manifest, "test-provider/postgres", "free",
        )
        assert offering is not None
        assert tier is not None
        assert tier.tier_id == "free"

    def test_missing_offering(self, sample_manifest: ServiceManifest) -> None:
        offering, tier = find_offering_and_tier(
            sample_manifest, "missing/svc", "free",
        )
        assert offering is None
        assert tier is None

    def test_missing_tier(self, sample_manifest: ServiceManifest) -> None:
        offering, tier = find_offering_and_tier(
            sample_manifest, "test-provider/postgres", "enterprise",
        )
        assert offering is not None
        assert tier is None
