# Invalid Manifest Verification Behavior

All OSP SDK implementations MUST produce consistent behavior when verifying manifests that are invalid, tampered, or malformed.

## Required Behavior Matrix

| Scenario | Expected Result | Error Type |
|----------|----------------|------------|
| Valid signature, untampered manifest | `valid` / `true` | — |
| Tampered field (any field except `provider_signature`) | `invalid` / `false` | `signature_mismatch` |
| Missing `provider_signature` field | `invalid` / `false` | `missing_signature` |
| Empty string `provider_signature` | `invalid` / `false` | `invalid_signature_format` |
| Malformed base64url in `provider_signature` | `invalid` / `false` | `invalid_signature_format` |
| Wrong public key (key mismatch) | `invalid` / `false` | `signature_mismatch` |
| Malformed base64url in `provider_public_key` | `invalid` / `false` | `invalid_key_format` |
| Missing `provider_public_key` field | `invalid` / `false` | `missing_public_key` |
| Valid signature but expired `effective_at` | `valid` / `true` | — (freshness is caller responsibility) |

## SDK Alignment Rules

1. **No exceptions on invalid signatures**: SDKs MUST return `false` or an error result — never throw/panic on verification failure.
2. **Consistent error categories**: All SDKs MUST use the error types listed above.
3. **Signature scope**: The signature covers the canonical JSON of the manifest *excluding* the `provider_signature` field itself.
4. **Fingerprint derivation**: Provider fingerprint = SHA-256 of the raw Ed25519 public key bytes, encoded as base64url. All SDKs MUST derive identical fingerprints from the same key material.

## Test Procedure

1. Load `manifests.json` fixtures.
2. For each fixture, call the SDK's manifest verification function.
3. Assert that the result matches `fixture.expect` (`"valid"` or `"invalid"`).
4. For invalid fixtures, assert that the error category matches the expected type.
