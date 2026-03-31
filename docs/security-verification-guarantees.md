# Signature Verification Guarantees

This document defines the security guarantees that OSP signature verification provides to agents and operators.

## What Verification Proves

When an OSP SDK verifies a provider manifest signature:

1. **Integrity**: The manifest has not been modified since the provider signed it. Any change to any field (except `provider_signature` itself) will cause verification to fail.
2. **Authenticity**: The manifest was signed by the holder of the private key corresponding to the `provider_public_key` in the manifest.
3. **Non-repudiation**: The provider cannot deny having published the manifest contents, because only they possess the signing key.

## What Verification Does NOT Prove

1. **Trust**: Verification does not prove the provider is trustworthy, reliable, or honest. Trust is established through the registry, conformance badges, and operational history.
2. **Freshness**: Verification does not prove the manifest is current. Agents MUST check `effective_at` and registry metadata for freshness.
3. **Key Ownership**: Verification does not prove the `provider_public_key` belongs to a specific legal entity. Key-to-identity binding is a registry-level concern.
4. **Price Accuracy**: Verification proves the price was declared by the provider at signing time, not that the price is fair or current.

## Algorithm

- **Signing algorithm**: Ed25519 (RFC 8032)
- **Payload**: Canonical JSON of the manifest object, excluding the `provider_signature` field
- **Canonical JSON**: Keys sorted lexicographically at all nesting levels, no extra whitespace
- **Encoding**: Signature and public key are base64url-encoded (no padding)

## Fingerprint Derivation

Provider fingerprints are used for key pinning and registry lookups:

```
fingerprint = base64url(SHA-256(raw_ed25519_public_key_bytes))
```

All SDKs MUST derive identical fingerprints from the same key material.

## Verification Flow

```
Agent receives manifest
  |
  ├─ Extract provider_signature
  ├─ Remove provider_signature from manifest object
  ├─ Compute canonical JSON of remaining object
  ├─ Decode provider_public_key from base64url
  ├─ Decode provider_signature from base64url
  ├─ Verify Ed25519 signature over canonical JSON bytes
  |
  ├─ SUCCESS → manifest is authentic and unmodified
  └─ FAILURE → manifest MUST be rejected
```

## SDK Requirements

| Requirement | Detail |
|------------|--------|
| Algorithm | Ed25519 only (no fallback) |
| Key format | Raw 32-byte Ed25519 public key, base64url |
| Signature format | 64-byte Ed25519 signature, base64url |
| Canonical JSON | Sorted keys, no whitespace, no trailing commas |
| Error behavior | Return false/error, never throw on invalid input |
| Partial verification | NOT allowed — all-or-nothing |
