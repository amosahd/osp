"""OSP Provider Conformance Tests.

Tests that a provider correctly implements the OSP specification.
Can run against example data (offline) or a live provider (with --provider-url).
"""

import json
import re
import pytest
import jsonschema


# ---------------------------------------------------------------------------
# Schema Validation Tests (Offline)
# ---------------------------------------------------------------------------


class TestManifestSchema:
    """Verify example manifests conform to the service-manifest schema."""

    def test_all_example_manifests_are_valid(self, schemas, example_manifests):
        schema = schemas["service-manifest"]
        for name, manifest in example_manifests.items():
            try:
                jsonschema.validate(manifest, schema)
            except jsonschema.ValidationError as e:
                pytest.fail(f"Manifest {name} failed validation: {e.message}")

    def test_manifest_has_required_fields(self, example_manifests):
        required = {
            "manifest_id",
            "manifest_version",
            "provider_id",
            "display_name",
            "offerings",
            "endpoints",
            "provider_signature",
        }
        for name, manifest in example_manifests.items():
            missing = required - set(manifest.keys())
            assert not missing, f"{name} missing required fields: {missing}"

    def test_manifest_id_format(self, example_manifests):
        pattern = re.compile(r"^mf_[a-z0-9_]+$")
        for name, manifest in example_manifests.items():
            assert pattern.match(
                manifest["manifest_id"]
            ), f"{name} has invalid manifest_id: {manifest['manifest_id']}"

    def test_manifest_version_is_positive(self, example_manifests):
        for name, manifest in example_manifests.items():
            assert (
                manifest["manifest_version"] >= 1
            ), f"{name} has invalid manifest_version"

    def test_offerings_not_empty(self, example_manifests):
        for name, manifest in example_manifests.items():
            assert len(manifest["offerings"]) > 0, f"{name} has no offerings"

    def test_each_offering_has_tiers(self, example_manifests):
        for name, manifest in example_manifests.items():
            for offering in manifest["offerings"]:
                assert (
                    len(offering.get("tiers", [])) > 0
                ), f"{name}/{offering.get('offering_id', '?')} has no tiers"

    def test_tier_prices_are_valid(self, example_manifests):
        for name, manifest in example_manifests.items():
            for offering in manifest["offerings"]:
                for tier in offering.get("tiers", []):
                    price = tier.get("price", {})
                    assert "amount" in price, f"{name} tier missing price amount"
                    assert "currency" in price, f"{name} tier missing price currency"
                    amount = float(price["amount"])
                    assert amount >= 0, f"{name} tier has negative price"


class TestProvisionRequestSchema:
    """Verify example provision requests conform to the schema."""

    def test_provision_requests_are_valid(self, schemas, example_provisions):
        schema = schemas["provision-request"]
        for name, provision in example_provisions.items():
            if "request" in name:
                try:
                    jsonschema.validate(provision, schema)
                except jsonschema.ValidationError as e:
                    pytest.fail(f"{name} failed validation: {e.message}")

    def test_provision_responses_are_valid(self, schemas, example_provisions):
        schema = schemas["provision-response"]
        for name, provision in example_provisions.items():
            if "response" in name:
                try:
                    jsonschema.validate(provision, schema)
                except jsonschema.ValidationError as e:
                    pytest.fail(f"{name} failed validation: {e.message}")


class TestEndpointPaths:
    """Verify endpoint paths follow the spec convention."""

    def test_endpoints_use_osp_v1_prefix(self, example_manifests):
        for name, manifest in example_manifests.items():
            endpoints = manifest.get("endpoints", {})
            for key, path in endpoints.items():
                assert path.startswith(
                    "/osp/v1/"
                ), f"{name} endpoint {key} doesn't use /osp/v1/ prefix: {path}"


class TestPaymentMethods:
    """Verify payment method declarations."""

    VALID_METHODS = {"free", "sardis_wallet", "stripe_spt", "x402", "mpp", "invoice", "external"}

    def test_payment_methods_are_valid(self, example_manifests):
        for name, manifest in example_manifests.items():
            methods = manifest.get("accepted_payment_methods", [])
            for method in methods:
                assert (
                    method in self.VALID_METHODS
                ), f"{name} has unknown payment method: {method}"


# ---------------------------------------------------------------------------
# Live Provider Tests (requires --provider-url)
# ---------------------------------------------------------------------------


@pytest.mark.skipif("not config.getoption('--provider-url')")
class TestLiveProviderDiscovery:
    """Test discovery against a live provider."""

    def test_well_known_endpoint_returns_json(self, provider_url):
        import httpx

        resp = httpx.get(f"{provider_url}/.well-known/osp.json")
        assert resp.status_code == 200
        assert "application/json" in resp.headers.get("content-type", "")

    def test_well_known_returns_valid_manifest(self, provider_url, schemas):
        import httpx

        resp = httpx.get(f"{provider_url}/.well-known/osp.json")
        manifest = resp.json()
        schema = schemas["service-manifest"]
        jsonschema.validate(manifest, schema)

    def test_health_endpoint_returns_ok(self, provider_url):
        import httpx

        resp = httpx.get(f"{provider_url}/osp/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") in ("healthy", "degraded")


@pytest.mark.skipif("not config.getoption('--provider-url')")
class TestLiveProviderProvisioning:
    """Test provisioning against a live provider (uses free tier only)."""

    def test_provision_free_tier(self, provider_url, api_key):
        import httpx

        # First discover
        resp = httpx.get(f"{provider_url}/.well-known/osp.json")
        manifest = resp.json()

        # Find a free tier
        free_offering = None
        free_tier = None
        for offering in manifest["offerings"]:
            for tier in offering.get("tiers", []):
                if float(tier["price"]["amount"]) == 0:
                    free_offering = offering
                    free_tier = tier
                    break
            if free_tier:
                break

        if not free_tier:
            pytest.skip("No free tier available")

        # Provision
        provision_url = provider_url + manifest["endpoints"]["provision"]
        resp = httpx.post(
            provision_url,
            json={
                "offering_id": free_offering["offering_id"],
                "tier_id": free_tier["tier_id"],
                "project_name": "osp-conformance-test",
                "nonce": "conformance_test_nonce_001",
            },
            headers={"Authorization": f"Bearer {api_key}"} if api_key else {},
        )
        assert resp.status_code in (200, 201, 202)
        data = resp.json()
        assert "resource_id" in data
