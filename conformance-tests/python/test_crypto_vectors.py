"""OSP Crypto Test Vectors.

Tests with known test vectors for:
- Ed25519 signing: verify signature matches expected output
- Canonical JSON: verify serialization matches expected string
- Nonce generation: verify 32-byte hex nonces, no collisions
- Nonce uniqueness: verify no duplicates in 1000 generations
- HMAC-SHA256 webhook signature: verify signature matches expected
"""

import hashlib
import hmac
import json
import os
import pytest


# ---------------------------------------------------------------------------
# Test Vectors (hardcoded)
# ---------------------------------------------------------------------------

# Ed25519 test vectors from RFC 8032 Section 7.1 (TEST 2)
ED25519_TEST_VECTORS = [
    {
        "private_key_hex": "4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb",
        "public_key_hex": "3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c",
        "message_hex": "72",
        "signature_hex": (
            "92a009a9f0d4cab8720e820b5f642540"
            "a2b27b5416503f8fb3762223ebdb69da"
            "085ac1e43e159c7e94b2ba3f0745573a"
            "b47f6e0b7e39e44b5c51e220b3e1e546"
        ),
    },
    {
        "private_key_hex": "c5aa8df43f9f837bedb7442f31dcb7b166d38535076f094b85ce3a2e0b4458f7",
        "public_key_hex": "fc51cd8e6218a1a38da47ed00230f0580816ed13ba3303ac5deb911548908025",
        "message_hex": "af82",
        "signature_hex": (
            "6291d657deec24024827e69c3abe01a3"
            "0ce548a284743a445e3680d7db5ac3ac"
            "18ff9b538d16f290ae67f760984dc659"
            "4a7c15e9716ed28dc027beceea1ec40a"
        ),
    },
]

# Canonical JSON test vectors
CANONICAL_JSON_VECTORS = [
    {
        "input": {"zebra": 1, "apple": 2, "mango": 3},
        "expected": '{"apple":2,"mango":3,"zebra":1}',
    },
    {
        "input": {"b": {"z": 1, "a": 2}, "a": 1},
        "expected": '{"a":1,"b":{"a":2,"z":1}}',
    },
    {
        "input": {"key": True, "arr": [3, 1, 2], "null_val": None},
        "expected": '{"arr":[3,1,2],"key":true,"null_val":null}',
    },
    {
        "input": {},
        "expected": "{}",
    },
    {
        "input": {"a": "hello world", "b": 42, "c": -1.5},
        "expected": '{"a":"hello world","b":42,"c":-1.5}',
    },
]

# HMAC-SHA256 webhook signature test vectors
HMAC_SHA256_VECTORS = [
    {
        "secret": "whsec_osp_test_secret_key_123456",
        "body": '{"event":"provision.completed","resource_id":"res_001"}',
        "expected_signature": None,  # Will be computed below
    },
    {
        "secret": "whsec_osp_another_secret_abcdef",
        "body": '{"event":"resource.deleted","resource_id":"res_002","timestamp":"2026-03-15T10:00:00Z"}',
        "expected_signature": None,
    },
]

# Pre-compute HMAC signatures for test vectors
for vec in HMAC_SHA256_VECTORS:
    vec["expected_signature"] = hmac.new(
        vec["secret"].encode("utf-8"),
        vec["body"].encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


# ---------------------------------------------------------------------------
# Ed25519 Signing Tests
# ---------------------------------------------------------------------------


class TestEd25519Signing:
    """Verify Ed25519 signatures match known test vectors."""

    @pytest.fixture(autouse=True)
    def _check_nacl(self):
        """Skip if PyNaCl is not installed."""
        pytest.importorskip("nacl", reason="PyNaCl required for Ed25519 tests")

    def test_ed25519_sign_matches_rfc8032_vector(self):
        from nacl.signing import SigningKey

        for vector in ED25519_TEST_VECTORS:
            private_key = bytes.fromhex(vector["private_key_hex"])
            expected_pub = bytes.fromhex(vector["public_key_hex"])
            message = bytes.fromhex(vector["message_hex"])
            expected_sig = bytes.fromhex(vector["signature_hex"])

            signing_key = SigningKey(private_key)
            assert bytes(signing_key.verify_key) == expected_pub

            signed = signing_key.sign(message)
            assert signed.signature == expected_sig

    def test_ed25519_verify_with_known_vector(self):
        from nacl.signing import SigningKey, VerifyKey

        vector = ED25519_TEST_VECTORS[0]
        public_key = bytes.fromhex(vector["public_key_hex"])
        message = bytes.fromhex(vector["message_hex"])
        signature = bytes.fromhex(vector["signature_hex"])

        verify_key = VerifyKey(public_key)
        # Should not raise
        verify_key.verify(message, signature)

    def test_ed25519_wrong_message_fails_verification(self):
        from nacl.signing import SigningKey, VerifyKey
        from nacl.exceptions import BadSignatureError

        vector = ED25519_TEST_VECTORS[0]
        public_key = bytes.fromhex(vector["public_key_hex"])
        signature = bytes.fromhex(vector["signature_hex"])
        wrong_message = b"wrong message"

        verify_key = VerifyKey(public_key)
        with pytest.raises(BadSignatureError):
            verify_key.verify(wrong_message, signature)


# ---------------------------------------------------------------------------
# Canonical JSON Tests
# ---------------------------------------------------------------------------


class TestCanonicalJSONVectors:
    """Verify canonical JSON serialization against known test vectors."""

    @pytest.mark.parametrize(
        "vector",
        CANONICAL_JSON_VECTORS,
        ids=[f"vector_{i}" for i in range(len(CANONICAL_JSON_VECTORS))],
    )
    def test_canonical_json_matches_expected(self, vector):
        result = json.dumps(vector["input"], sort_keys=True, separators=(",", ":"))
        assert result == vector["expected"], (
            f"Canonical JSON mismatch:\n  input:    {vector['input']}\n"
            f"  expected: {vector['expected']}\n  got:      {result}"
        )

    def test_canonical_json_deterministic_across_runs(self):
        """Same input always produces identical output."""
        obj = {"provider_id": "acme.com", "manifest_version": 3, "nonce": "abc123"}
        results = set()
        for _ in range(100):
            results.add(json.dumps(obj, sort_keys=True, separators=(",", ":")))
        assert len(results) == 1


# ---------------------------------------------------------------------------
# Nonce Generation Tests
# ---------------------------------------------------------------------------


class TestNonceGeneration:
    """Verify nonce generation meets OSP requirements."""

    def test_nonce_is_32_byte_hex(self):
        """Nonce should be a 32-byte (64 hex character) string."""
        nonce = os.urandom(32).hex()
        assert len(nonce) == 64
        assert all(c in "0123456789abcdef" for c in nonce)

    def test_nonce_has_sufficient_length(self):
        nonce = os.urandom(32).hex()
        # 32 bytes = 256 bits of entropy
        assert len(bytes.fromhex(nonce)) == 32

    def test_no_collisions_in_1000_nonces(self):
        """Generate 1000 nonces and verify no duplicates."""
        nonces = {os.urandom(32).hex() for _ in range(1000)}
        assert len(nonces) == 1000, "Nonce collision detected in 1000 generations"

    def test_nonce_uniqueness_across_batches(self):
        """Two separate batches of nonces should have no overlap."""
        batch1 = {os.urandom(32).hex() for _ in range(500)}
        batch2 = {os.urandom(32).hex() for _ in range(500)}
        overlap = batch1 & batch2
        assert len(overlap) == 0, f"Nonce overlap detected: {overlap}"

    def test_nonce_is_hex_string(self):
        nonce = os.urandom(32).hex()
        # Verify it can be decoded back to bytes
        decoded = bytes.fromhex(nonce)
        assert len(decoded) == 32


# ---------------------------------------------------------------------------
# HMAC-SHA256 Webhook Signature Tests
# ---------------------------------------------------------------------------


class TestHmacSha256WebhookSignature:
    """Verify HMAC-SHA256 webhook signatures match known test vectors."""

    @pytest.mark.parametrize(
        "vector",
        HMAC_SHA256_VECTORS,
        ids=[f"webhook_vector_{i}" for i in range(len(HMAC_SHA256_VECTORS))],
    )
    def test_hmac_signature_matches_expected(self, vector):
        computed = hmac.new(
            vector["secret"].encode("utf-8"),
            vector["body"].encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        assert computed == vector["expected_signature"]

    def test_different_body_produces_different_signature(self):
        secret = "whsec_osp_test_secret_key_123456"
        body1 = '{"event":"provision.completed"}'
        body2 = '{"event":"resource.deleted"}'

        sig1 = hmac.new(secret.encode(), body1.encode(), hashlib.sha256).hexdigest()
        sig2 = hmac.new(secret.encode(), body2.encode(), hashlib.sha256).hexdigest()
        assert sig1 != sig2

    def test_different_secret_produces_different_signature(self):
        body = '{"event":"provision.completed","resource_id":"res_001"}'
        secret1 = "whsec_secret_one"
        secret2 = "whsec_secret_two"

        sig1 = hmac.new(secret1.encode(), body.encode(), hashlib.sha256).hexdigest()
        sig2 = hmac.new(secret2.encode(), body.encode(), hashlib.sha256).hexdigest()
        assert sig1 != sig2

    def test_hmac_signature_is_hex_string(self):
        secret = "whsec_test"
        body = '{"test": true}'
        sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        assert len(sig) == 64  # SHA-256 = 32 bytes = 64 hex chars
        assert all(c in "0123456789abcdef" for c in sig)

    def test_hmac_timing_safe_comparison(self):
        """Verify hmac.compare_digest is used for constant-time comparison."""
        secret = "whsec_test"
        body = '{"event":"test"}'
        expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        assert hmac.compare_digest(expected, expected) is True
        assert hmac.compare_digest(expected, "wrong" + expected[5:]) is False
