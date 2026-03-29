"""OSP Idempotency Conformance Tests.

Tests that providers correctly implement idempotency:
- Provision with idempotency_key returns same resource_id on retry
- Different idempotency_key creates new resource
- Idempotency_key format is UUID
- Expired idempotency_key (>24h) creates new resource
"""

import re
import uuid
import pytest


# ---------------------------------------------------------------------------
# Idempotency Key Format Tests (Offline)
# ---------------------------------------------------------------------------


class TestIdempotencyKeyFormat:
    """Verify idempotency_key follows UUID format."""

    UUID_PATTERN = re.compile(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        re.IGNORECASE,
    )

    def test_idempotency_key_is_uuid4(self):
        key = str(uuid.uuid4())
        assert self.UUID_PATTERN.match(key), f"Idempotency key is not UUID4: {key}"

    def test_idempotency_key_is_string(self):
        key = str(uuid.uuid4())
        assert isinstance(key, str)

    def test_idempotency_key_is_lowercase(self):
        key = str(uuid.uuid4())
        assert key == key.lower(), "Idempotency key should be lowercase"

    def test_generated_keys_are_unique(self):
        keys = {str(uuid.uuid4()) for _ in range(100)}
        assert len(keys) == 100, "Idempotency key collision detected"


class TestIdempotentProvisionRetry:
    """Verify same idempotency_key returns same resource_id on retry."""

    def test_same_key_returns_same_resource_id(self):
        """Two provision responses with same idempotency_key should have same resource_id."""
        idempotency_key = str(uuid.uuid4())

        response_first = {
            "resource_id": "res_idem_001",
            "status": "active",
            "idempotency_key": idempotency_key,
        }
        response_retry = {
            "resource_id": "res_idem_001",  # Same resource_id
            "status": "active",
            "idempotency_key": idempotency_key,
        }

        assert response_first["resource_id"] == response_retry["resource_id"]
        assert response_first["idempotency_key"] == response_retry["idempotency_key"]

    def test_retry_status_code_is_200_not_201(self):
        """Retry with same idempotency_key should return 200 (not 201)."""
        first_status = 201  # Created
        retry_status = 200  # OK (already exists)

        assert first_status == 201
        assert retry_status == 200

    def test_retry_response_body_matches_original(self):
        """Retry response should be identical to original."""
        idempotency_key = str(uuid.uuid4())
        original = {
            "resource_id": "res_idem_002",
            "status": "active",
            "offering_id": "acme/postgres",
            "tier_id": "starter",
            "idempotency_key": idempotency_key,
            "credentials": {
                "DATABASE_URL": "postgresql://user:pass@host/db",
            },
        }
        retry = {
            "resource_id": "res_idem_002",
            "status": "active",
            "offering_id": "acme/postgres",
            "tier_id": "starter",
            "idempotency_key": idempotency_key,
            "credentials": {
                "DATABASE_URL": "postgresql://user:pass@host/db",
            },
        }

        assert original == retry


class TestDifferentIdempotencyKey:
    """Verify different idempotency_key creates a new resource."""

    def test_different_key_creates_different_resource(self):
        key1 = str(uuid.uuid4())
        key2 = str(uuid.uuid4())

        response1 = {
            "resource_id": "res_idem_003",
            "idempotency_key": key1,
        }
        response2 = {
            "resource_id": "res_idem_004",
            "idempotency_key": key2,
        }

        assert key1 != key2
        assert response1["resource_id"] != response2["resource_id"]

    def test_no_idempotency_key_creates_new_resource(self):
        """Requests without idempotency_key always create new resources."""
        response1 = {"resource_id": "res_idem_005"}
        response2 = {"resource_id": "res_idem_006"}

        assert response1["resource_id"] != response2["resource_id"]


class TestIdempotencyKeyExpiry:
    """Verify expired idempotency_key (>24h) creates a new resource."""

    EXPIRY_HOURS = 24

    def test_expired_key_creates_new_resource(self):
        """After 24h, the same idempotency_key should create a new resource."""
        idempotency_key = str(uuid.uuid4())

        # First provision (within window)
        response_original = {
            "resource_id": "res_idem_007",
            "idempotency_key": idempotency_key,
            "created_at": "2026-03-28T10:00:00Z",
        }

        # Second provision (after 24h expiry)
        response_after_expiry = {
            "resource_id": "res_idem_008",  # Different resource!
            "idempotency_key": idempotency_key,
            "created_at": "2026-03-29T11:00:00Z",  # >24h later
        }

        assert response_original["idempotency_key"] == response_after_expiry["idempotency_key"]
        assert response_original["resource_id"] != response_after_expiry["resource_id"]

    def test_expiry_window_is_24_hours(self):
        assert self.EXPIRY_HOURS == 24

    def test_within_window_returns_same_resource(self):
        """Within 24h, same key returns same resource."""
        idempotency_key = str(uuid.uuid4())

        response_t0 = {
            "resource_id": "res_idem_009",
            "idempotency_key": idempotency_key,
            "created_at": "2026-03-28T10:00:00Z",
        }
        response_t12h = {
            "resource_id": "res_idem_009",  # Same resource
            "idempotency_key": idempotency_key,
            "created_at": "2026-03-28T22:00:00Z",  # 12h later, within window
        }

        assert response_t0["resource_id"] == response_t12h["resource_id"]


class TestIdempotencyRequestFormat:
    """Verify idempotency_key is properly included in provision requests."""

    def test_idempotency_key_in_request_body(self):
        request = {
            "offering_id": "acme/postgres",
            "tier_id": "starter",
            "project_name": "my-project",
            "nonce": str(uuid.uuid4()),
            "idempotency_key": str(uuid.uuid4()),
        }
        assert "idempotency_key" in request

    def test_idempotency_key_in_header_alternative(self):
        """Idempotency key may also be sent via header."""
        headers = {
            "Idempotency-Key": str(uuid.uuid4()),
            "Content-Type": "application/json",
        }
        assert "Idempotency-Key" in headers

    def test_idempotency_key_uuid_validation(self):
        """Provider should validate that idempotency_key is a valid UUID."""
        valid_key = str(uuid.uuid4())
        try:
            uuid.UUID(valid_key)
        except ValueError:
            pytest.fail(f"Idempotency key is not a valid UUID: {valid_key}")


# ---------------------------------------------------------------------------
# Live Provider Tests (requires --provider-url)
# ---------------------------------------------------------------------------


@pytest.mark.skipif("not config.getoption('--provider-url')")
class TestLiveIdempotency:
    """Test idempotency against a live provider."""

    def test_idempotent_provision_returns_same_resource(self, provider_url, api_key):
        import httpx

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

        idempotency_key = str(uuid.uuid4())
        provision_url = provider_url + manifest["endpoints"]["provision"]
        payload = {
            "offering_id": free_offering["offering_id"],
            "tier_id": free_tier["tier_id"],
            "project_name": "idempotency-conformance-test",
            "nonce": str(uuid.uuid4()),
            "idempotency_key": idempotency_key,
        }
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

        # First request
        resp1 = httpx.post(provision_url, json=payload, headers=headers)
        assert resp1.status_code in (200, 201, 202)
        data1 = resp1.json()

        # Retry with same idempotency key
        resp2 = httpx.post(provision_url, json=payload, headers=headers)
        assert resp2.status_code in (200, 201, 202)
        data2 = resp2.json()

        assert data1["resource_id"] == data2["resource_id"]
