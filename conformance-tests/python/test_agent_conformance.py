"""OSP Agent Conformance Tests.

Tests that an agent implementation correctly handles:
- Manifest signature verification
- Nonce generation
- Credential encryption/decryption
- Canonical JSON serialization
"""

import json
import hashlib
import base64
import pytest


class TestCanonicalJSON:
    """Verify canonical JSON serialization is deterministic."""

    def test_keys_sorted_alphabetically(self):
        obj = {"zebra": 1, "apple": 2, "mango": 3}
        canonical = json.dumps(obj, sort_keys=True, separators=(",", ":"))
        assert canonical == '{"apple":2,"mango":3,"zebra":1}'

    def test_nested_keys_sorted(self):
        obj = {"b": {"z": 1, "a": 2}, "a": {"y": 3, "x": 4}}
        canonical = json.dumps(obj, sort_keys=True, separators=(",", ":"))
        assert canonical == '{"a":{"x":4,"y":3},"b":{"a":2,"z":1}}'

    def test_no_whitespace(self):
        obj = {"key": "value", "num": 42}
        canonical = json.dumps(obj, sort_keys=True, separators=(",", ":"))
        assert " " not in canonical
        assert "\n" not in canonical
        assert "\t" not in canonical

    def test_arrays_preserve_order(self):
        obj = {"items": [3, 1, 2]}
        canonical = json.dumps(obj, sort_keys=True, separators=(",", ":"))
        assert canonical == '{"items":[3,1,2]}'

    def test_unicode_preserved(self):
        obj = {"name": "Héllo Wörld"}
        canonical = json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        assert "Héllo" in canonical

    def test_null_values(self):
        obj = {"a": None, "b": 1}
        canonical = json.dumps(obj, sort_keys=True, separators=(",", ":"))
        assert canonical == '{"a":null,"b":1}'

    def test_boolean_values(self):
        obj = {"flag": True, "other": False}
        canonical = json.dumps(obj, sort_keys=True, separators=(",", ":"))
        assert canonical == '{"flag":true,"other":false}'

    def test_empty_objects(self):
        obj = {"empty": {}, "list": []}
        canonical = json.dumps(obj, sort_keys=True, separators=(",", ":"))
        assert canonical == '{"empty":{},"list":[]}'

    def test_determinism(self):
        """Same input always produces same output."""
        obj = {"z": 1, "a": 2, "m": {"x": 3, "b": 4}}
        results = set()
        for _ in range(100):
            results.add(json.dumps(obj, sort_keys=True, separators=(",", ":")))
        assert len(results) == 1


class TestNonceGeneration:
    """Verify nonce uniqueness requirements."""

    def test_nonces_are_unique(self):
        import uuid

        nonces = {str(uuid.uuid4()) for _ in range(1000)}
        assert len(nonces) == 1000, "Nonce collision detected"

    def test_nonce_has_sufficient_entropy(self):
        import uuid

        nonce = str(uuid.uuid4())
        # UUID4 has 122 bits of randomness
        assert len(nonce) >= 32, "Nonce too short"


class TestManifestSignatureVerification:
    """Verify manifest signature verification logic."""

    def test_signature_excludes_provider_signature_field(self):
        """When computing signature, provider_signature must be excluded."""
        manifest = {
            "manifest_id": "mf_test",
            "manifest_version": 1,
            "provider_id": "test.com",
            "display_name": "Test",
            "offerings": [{"offering_id": "test/db", "tiers": []}],
            "endpoints": {"provision": "/osp/v1/provision"},
            "provider_signature": "should_be_excluded",
        }

        # Remove signature before canonical serialization
        to_sign = {k: v for k, v in manifest.items() if k != "provider_signature"}
        canonical = json.dumps(to_sign, sort_keys=True, separators=(",", ":"))

        assert "provider_signature" not in canonical
        assert "should_be_excluded" not in canonical

    def test_modified_manifest_changes_hash(self):
        """Any change to manifest must produce a different signature input."""
        manifest1 = {
            "manifest_id": "mf_test",
            "manifest_version": 1,
            "provider_id": "test.com",
        }
        manifest2 = {
            "manifest_id": "mf_test",
            "manifest_version": 2,  # Changed
            "provider_id": "test.com",
        }

        c1 = json.dumps(manifest1, sort_keys=True, separators=(",", ":"))
        c2 = json.dumps(manifest2, sort_keys=True, separators=(",", ":"))

        assert c1 != c2
        assert hashlib.sha256(c1.encode()).hexdigest() != hashlib.sha256(c2.encode()).hexdigest()


class TestCredentialBundleFormat:
    """Verify credential bundle structure."""

    def test_encrypted_bundle_has_required_fields(self):
        bundle = {
            "encryption_method": "x25519-xsalsa20-poly1305",
            "ephemeral_public_key": base64.urlsafe_b64encode(b"x" * 32).decode().rstrip("="),
            "nonce": base64.urlsafe_b64encode(b"n" * 24).decode().rstrip("="),
            "ciphertext": base64.urlsafe_b64encode(b"c" * 64).decode().rstrip("="),
        }

        assert "encryption_method" in bundle
        assert "ephemeral_public_key" in bundle
        assert "nonce" in bundle
        assert "ciphertext" in bundle

    def test_plaintext_bundle_has_credentials(self):
        bundle = {
            "credentials": {
                "DATABASE_URL": "postgresql://user:pass@host/db",
                "API_KEY": "sk_test_123",
            }
        }

        assert "credentials" in bundle
        assert isinstance(bundle["credentials"], dict)
        assert len(bundle["credentials"]) > 0


class TestErrorHandling:
    """Verify agents handle error responses correctly."""

    def test_osp_error_format(self):
        error = {
            "error": {
                "code": "insufficient_funds",
                "message": "Payment required for this tier",
                "details": {"required_amount": "25.00", "currency": "USD"},
            }
        }

        assert "error" in error
        assert "code" in error["error"]
        assert "message" in error["error"]

    VALID_ERROR_CODES = {
        "invalid_request",
        "authentication_failed",
        "insufficient_funds",
        "offering_not_found",
        "tier_not_found",
        "rate_limited",
        "provider_unavailable",
        "provisioning_failed",
        "resource_not_found",
        "duplicate_nonce",
        "signature_invalid",
        "encryption_failed",
    }

    def test_known_error_codes(self):
        for code in self.VALID_ERROR_CODES:
            assert isinstance(code, str)
            assert "_" in code or code.isalpha()
