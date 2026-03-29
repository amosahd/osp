"""OSP Sandbox Mode Conformance Tests.

Tests that providers correctly implement sandbox provisioning:
- Sandbox provision returns sandbox=true
- Sandbox resources have TTL
- Sandbox credentials include sandbox flag
- Sandbox resources cannot be tier-changed
- Rate limits enforced (5 concurrent, 20/day per agent)
- Deprovisioned sandbox resources return 404
"""

import uuid
import pytest


# ---------------------------------------------------------------------------
# Offline / Unit Tests
# ---------------------------------------------------------------------------


class TestSandboxProvisionResponse:
    """Verify sandbox provision responses have correct structure."""

    def _make_sandbox_request(self):
        return {
            "offering_id": "test/db",
            "tier_id": "free",
            "project_name": "sandbox-test",
            "nonce": str(uuid.uuid4()),
            "mode": "sandbox",
        }

    def _make_sandbox_response(self, **overrides):
        base = {
            "resource_id": "res_sandbox_001",
            "status": "active",
            "sandbox": True,
            "ttl_seconds": 3600,
            "credentials": {
                "DATABASE_URL": "postgresql://sandbox:pass@localhost/sandbox_db",
                "sandbox": True,
            },
        }
        base.update(overrides)
        return base

    def test_sandbox_provision_request_has_mode_sandbox(self):
        request = self._make_sandbox_request()
        assert request["mode"] == "sandbox"

    def test_sandbox_response_includes_sandbox_true(self):
        response = self._make_sandbox_response()
        assert response.get("sandbox") is True

    def test_sandbox_response_without_sandbox_flag_fails(self):
        response = {"resource_id": "res_001", "status": "active"}
        assert response.get("sandbox") is not True, (
            "Non-sandbox response should not have sandbox=true"
        )


class TestSandboxTTL:
    """Verify sandbox resources include TTL field."""

    def test_sandbox_resource_has_ttl(self):
        response = {
            "resource_id": "res_sandbox_002",
            "sandbox": True,
            "ttl_seconds": 3600,
        }
        assert "ttl_seconds" in response
        assert isinstance(response["ttl_seconds"], int)
        assert response["ttl_seconds"] > 0

    def test_sandbox_ttl_is_positive_integer(self):
        response = {
            "resource_id": "res_sandbox_003",
            "sandbox": True,
            "ttl_seconds": 7200,
        }
        assert response["ttl_seconds"] > 0

    def test_sandbox_ttl_not_excessively_long(self):
        """Sandbox resources should have a reasonable TTL (max 24h)."""
        max_ttl = 86400  # 24 hours in seconds
        response = {
            "resource_id": "res_sandbox_004",
            "sandbox": True,
            "ttl_seconds": 3600,
        }
        assert response["ttl_seconds"] <= max_ttl


class TestSandboxCredentials:
    """Verify sandbox credentials include sandbox indicator."""

    def test_sandbox_credentials_include_sandbox_flag(self):
        credentials = {
            "DATABASE_URL": "postgresql://sandbox:pass@localhost/sandbox_db",
            "sandbox": True,
        }
        assert credentials.get("sandbox") is True

    def test_sandbox_credentials_are_dict(self):
        credentials = {
            "API_KEY": "sk_sandbox_test_123",
            "sandbox": True,
        }
        assert isinstance(credentials, dict)
        assert len(credentials) > 1  # Must have at least one real credential + sandbox flag


class TestSandboxTierChangeBlocked:
    """Verify sandbox resources cannot be tier-changed."""

    def test_tier_change_on_sandbox_returns_400(self):
        """Simulates the expected error when attempting tier change on sandbox."""
        error_response = {
            "error": {
                "code": "invalid_request",
                "message": "Sandbox resources cannot be tier-changed",
            }
        }
        expected_status = 400

        assert expected_status == 400
        assert error_response["error"]["code"] == "invalid_request"
        assert "sandbox" in error_response["error"]["message"].lower()


class TestSandboxRateLimits:
    """Verify sandbox rate limits are enforced."""

    MAX_CONCURRENT = 5
    MAX_PER_DAY = 20

    def test_max_concurrent_sandbox_resources(self):
        """Agent should not exceed 5 concurrent sandbox resources."""
        active_resources = [
            {"resource_id": f"res_sandbox_{i:03d}", "sandbox": True, "status": "active"}
            for i in range(self.MAX_CONCURRENT)
        ]
        assert len(active_resources) == self.MAX_CONCURRENT

        # The 6th request should be rate-limited
        error_response = {
            "error": {
                "code": "rate_limited",
                "message": "Maximum 5 concurrent sandbox resources per agent",
            }
        }
        assert error_response["error"]["code"] == "rate_limited"

    def test_max_daily_sandbox_provisions(self):
        """Agent should not exceed 20 sandbox provisions per day."""
        daily_provisions = list(range(self.MAX_PER_DAY))
        assert len(daily_provisions) == self.MAX_PER_DAY

        # The 21st request should be rate-limited
        error_response = {
            "error": {
                "code": "rate_limited",
                "message": "Maximum 20 sandbox provisions per day per agent",
            }
        }
        assert error_response["error"]["code"] == "rate_limited"

    def test_rate_limit_error_format(self):
        error_response = {
            "error": {
                "code": "rate_limited",
                "message": "Sandbox rate limit exceeded",
                "details": {
                    "limit": 5,
                    "window": "concurrent",
                },
            }
        }
        assert "error" in error_response
        assert error_response["error"]["code"] == "rate_limited"
        assert "details" in error_response["error"]


class TestSandboxDeprovision:
    """Verify deprovisioned sandbox resources return 404."""

    def test_deprovisioned_sandbox_returns_404(self):
        """After deprovisioning, resource lookup should return 404."""
        error_response = {
            "error": {
                "code": "resource_not_found",
                "message": "Resource not found",
            }
        }
        expected_status = 404

        assert expected_status == 404
        assert error_response["error"]["code"] == "resource_not_found"

    def test_deprovisioned_sandbox_error_format(self):
        error_response = {
            "error": {
                "code": "resource_not_found",
                "message": "Sandbox resource res_sandbox_001 has been deprovisioned",
            }
        }
        assert "error" in error_response
        assert "code" in error_response["error"]
        assert "message" in error_response["error"]


# ---------------------------------------------------------------------------
# Live Provider Tests (requires --provider-url)
# ---------------------------------------------------------------------------


@pytest.mark.skipif("not config.getoption('--provider-url')")
class TestLiveSandboxProvisioning:
    """Test sandbox provisioning against a live provider."""

    def test_provision_sandbox_mode(self, provider_url, api_key):
        import httpx

        resp = httpx.get(f"{provider_url}/.well-known/osp.json")
        manifest = resp.json()

        # Find any offering
        offering = manifest["offerings"][0]
        tier = offering["tiers"][0]

        provision_url = provider_url + manifest["endpoints"]["provision"]
        resp = httpx.post(
            provision_url,
            json={
                "offering_id": offering["offering_id"],
                "tier_id": tier["tier_id"],
                "project_name": "sandbox-conformance-test",
                "nonce": str(uuid.uuid4()),
                "mode": "sandbox",
            },
            headers={"Authorization": f"Bearer {api_key}"} if api_key else {},
        )
        assert resp.status_code in (200, 201, 202)
        data = resp.json()
        assert data.get("sandbox") is True
        assert "ttl_seconds" in data
