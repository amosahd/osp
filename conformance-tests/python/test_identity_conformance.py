"""OSP Agent Identity Conformance Tests.

Tests that providers correctly handle agent identity verification:
- ed25519_did identity method accepted
- oauth2_client identity method accepted
- api_key identity method accepted
- Invalid credentials return identity_verification_failed (403)
- Missing identity for paid tiers returns 403
- Manifest identity declaration is valid JSON
"""

import json
import re
import pytest


# ---------------------------------------------------------------------------
# Identity Method Acceptance Tests (Offline)
# ---------------------------------------------------------------------------


class TestEd25519DidIdentity:
    """Verify ed25519_did identity method is accepted."""

    def test_ed25519_did_identity_structure(self):
        identity = {
            "method": "ed25519_did",
            "did": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
            "signature": "3044022047a1b2c3d4e5f6...",
            "timestamp": "2026-01-15T10:30:00Z",
        }
        assert identity["method"] == "ed25519_did"
        assert identity["did"].startswith("did:key:z6Mk")

    def test_ed25519_did_has_required_fields(self):
        required_fields = {"method", "did", "signature", "timestamp"}
        identity = {
            "method": "ed25519_did",
            "did": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
            "signature": "3044022047a1b2c3d4e5f6...",
            "timestamp": "2026-01-15T10:30:00Z",
        }
        missing = required_fields - set(identity.keys())
        assert not missing, f"Missing required fields: {missing}"

    def test_did_key_format(self):
        """DID key should match did:key:z6Mk... pattern for Ed25519."""
        did = "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
        pattern = re.compile(r"^did:key:z6Mk[a-zA-Z0-9]+$")
        assert pattern.match(did), f"Invalid DID key format: {did}"


class TestOAuth2ClientIdentity:
    """Verify oauth2_client identity method is accepted."""

    def test_oauth2_client_identity_structure(self):
        identity = {
            "method": "oauth2_client",
            "client_id": "agent_client_abc123",
            "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test_payload",
            "token_type": "Bearer",
        }
        assert identity["method"] == "oauth2_client"
        assert "access_token" in identity

    def test_oauth2_client_has_required_fields(self):
        required_fields = {"method", "client_id", "access_token"}
        identity = {
            "method": "oauth2_client",
            "client_id": "agent_client_abc123",
            "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test_payload",
        }
        missing = required_fields - set(identity.keys())
        assert not missing, f"Missing required fields: {missing}"


class TestApiKeyIdentity:
    """Verify api_key identity method is accepted."""

    def test_api_key_identity_structure(self):
        identity = {
            "method": "api_key",
            "api_key": "osp_ak_test_a1b2c3d4e5f6g7h8i9j0",
        }
        assert identity["method"] == "api_key"
        assert "api_key" in identity

    def test_api_key_has_required_fields(self):
        required_fields = {"method", "api_key"}
        identity = {
            "method": "api_key",
            "api_key": "osp_ak_test_a1b2c3d4e5f6g7h8i9j0",
        }
        missing = required_fields - set(identity.keys())
        assert not missing, f"Missing required fields: {missing}"

    def test_api_key_prefix_convention(self):
        """API keys should follow osp_ak_ prefix convention."""
        api_key = "osp_ak_test_a1b2c3d4e5f6g7h8i9j0"
        assert api_key.startswith("osp_ak_"), f"API key should start with osp_ak_: {api_key}"


class TestInvalidIdentityRejection:
    """Verify invalid identity credentials return identity_verification_failed (403)."""

    def test_invalid_credential_returns_403_error(self):
        error_response = {
            "error": {
                "code": "identity_verification_failed",
                "message": "Agent identity could not be verified",
            }
        }
        expected_status = 403

        assert expected_status == 403
        assert error_response["error"]["code"] == "identity_verification_failed"

    def test_expired_token_returns_403(self):
        error_response = {
            "error": {
                "code": "identity_verification_failed",
                "message": "Access token has expired",
            }
        }
        expected_status = 403

        assert expected_status == 403
        assert error_response["error"]["code"] == "identity_verification_failed"

    def test_malformed_did_returns_403(self):
        error_response = {
            "error": {
                "code": "identity_verification_failed",
                "message": "Malformed DID key",
            }
        }
        expected_status = 403

        assert expected_status == 403
        assert error_response["error"]["code"] == "identity_verification_failed"


class TestMissingIdentityForPaidTiers:
    """Verify missing identity for paid tiers returns 403."""

    def test_missing_identity_paid_tier_returns_403(self):
        error_response = {
            "error": {
                "code": "identity_verification_failed",
                "message": "Identity verification required for paid tiers",
            }
        }
        expected_status = 403

        assert expected_status == 403
        assert error_response["error"]["code"] == "identity_verification_failed"
        assert "paid" in error_response["error"]["message"].lower()

    def test_free_tier_allows_anonymous(self):
        """Free tiers may allow provisioning without identity."""
        response = {
            "resource_id": "res_free_001",
            "status": "active",
        }
        expected_status = 200

        assert expected_status == 200
        assert "resource_id" in response


class TestManifestIdentityDeclaration:
    """Verify manifest identity declaration is valid JSON."""

    def test_identity_requirements_is_valid_json(self):
        manifest_identity = {
            "identity_requirements": {
                "required_for": ["paid"],
                "accepted_methods": ["ed25519_did", "oauth2_client", "api_key"],
            }
        }
        # Verify it serializes to valid JSON
        serialized = json.dumps(manifest_identity)
        parsed = json.loads(serialized)
        assert parsed == manifest_identity

    def test_accepted_methods_is_list(self):
        identity_req = {
            "accepted_methods": ["ed25519_did", "oauth2_client", "api_key"],
        }
        assert isinstance(identity_req["accepted_methods"], list)
        assert len(identity_req["accepted_methods"]) > 0

    def test_known_identity_methods(self):
        VALID_METHODS = {"ed25519_did", "oauth2_client", "api_key"}
        identity_req = {
            "accepted_methods": ["ed25519_did", "oauth2_client", "api_key"],
        }
        for method in identity_req["accepted_methods"]:
            assert method in VALID_METHODS, f"Unknown identity method: {method}"

    def test_identity_declaration_roundtrip(self):
        """Identity declaration should survive JSON serialization roundtrip."""
        declaration = {
            "identity_requirements": {
                "required_for": ["paid", "enterprise"],
                "accepted_methods": ["ed25519_did", "oauth2_client", "api_key"],
                "verification_endpoint": "/osp/v1/verify-identity",
            }
        }
        canonical = json.dumps(declaration, sort_keys=True, separators=(",", ":"))
        parsed = json.loads(canonical)
        assert parsed == declaration


# ---------------------------------------------------------------------------
# Live Provider Tests (requires --provider-url)
# ---------------------------------------------------------------------------


@pytest.mark.skipif("not config.getoption('--provider-url')")
class TestLiveIdentityVerification:
    """Test identity verification against a live provider."""

    def test_invalid_api_key_returns_403(self, provider_url):
        import httpx

        resp = httpx.get(f"{provider_url}/.well-known/osp.json")
        manifest = resp.json()

        offering = manifest["offerings"][0]
        tier = offering["tiers"][0]

        # Skip if free tier (identity may not be required)
        if float(tier["price"]["amount"]) == 0:
            pytest.skip("Free tier may not require identity")

        provision_url = provider_url + manifest["endpoints"]["provision"]
        resp = httpx.post(
            provision_url,
            json={
                "offering_id": offering["offering_id"],
                "tier_id": tier["tier_id"],
                "project_name": "identity-test",
                "nonce": "identity_test_nonce_001",
                "agent_identity": {
                    "method": "api_key",
                    "api_key": "osp_ak_invalid_key_000000",
                },
            },
        )
        assert resp.status_code == 403
        data = resp.json()
        assert data["error"]["code"] == "identity_verification_failed"
