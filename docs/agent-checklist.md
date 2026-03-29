# OSP Agent Implementation Checklist

Use this checklist to track your progress implementing an OSP-conformant agent. Items marked **(required)** are mandatory for OSP Core agent conformance. Items marked **(recommended)** improve reliability and security but are not strictly required.

For the full specification, see [osp-v1.0.md](../spec/osp-v1.0.md).

---

## Discovery and Manifest Handling

- [ ] **(required)** Fetch provider manifest from `/.well-known/osp.json`
- [ ] **(required)** Verify Ed25519 `provider_signature` before trusting any manifest content
- [ ] **(required)** Reject manifests with invalid or missing signatures
- [ ] **(recommended)** Cross-reference `provider_key_id` against provider's JWKS endpoint (`/.well-known/osp-keys.json`)
- [ ] **(recommended)** Check `published_at` freshness -- warn on manifests older than 30 days
- [ ] **(recommended)** Verify DNS TXT record at `_osp.{domain}` when available
- [ ] **(recommended)** Cache manifests with a TTL (recommended: 1 hour) to reduce discovery latency
- [ ] **(recommended)** Maintain an allowlist of known provider domains

## Provisioning Flow

- [ ] **(required)** Send well-formed `ProvisionRequest` to `POST /osp/v1/provision`
- [ ] **(required)** Include `X-OSP-Version: 1.0` in all requests
- [ ] **(required)** Handle synchronous responses (`status: "provisioned"`)
- [ ] **(required)** Handle asynchronous responses (`status: "provisioning"`)
- [ ] **(required)** When async, poll `GET /osp/v1/status/{resource_id}` with minimum 5-second intervals
- [ ] **(required)** Respect 1-hour timeout for async provisioning
- [ ] **(required)** Handle all defined error codes and respect `Retry-After` headers
- [ ] **(recommended)** Include `idempotency_key` for safe retries of failed provision requests
- [ ] **(recommended)** Include `X-OSP-Trace-Id` for distributed tracing across multi-service flows
- [ ] **(recommended)** Validate offering and tier exist in manifest before attempting provision

## Credential Handling

- [ ] **(required)** Provide `agent_public_key` (Ed25519) in provision requests for credential encryption
- [ ] **(required)** Decrypt `x25519-xsalsa20-poly1305` encrypted credential bundles
- [ ] **(required)** Correctly convert Ed25519 private key to X25519 for decryption
- [ ] **(recommended)** Store credentials securely (encrypted at rest, not in plain files)
- [ ] **(recommended)** Never log plaintext credentials
- [ ] **(recommended)** Generate `.gitignore` entries for credential files (Spec 12.4)
- [ ] **(recommended)** Implement credential leak detection for version control monitoring
- [ ] **(recommended)** Support credential rotation via `POST /osp/v1/rotate/{resource_id}`

## Status Checks and Lifecycle

- [ ] **(required)** Check resource status via `GET /osp/v1/status/{resource_id}`
- [ ] **(recommended)** Monitor usage via `GET /osp/v1/usage/{resource_id}`
- [ ] **(recommended)** Implement deprovisioning via `DELETE /osp/v1/deprovision/{resource_id}`
- [ ] **(recommended)** Track `expires_at` on free-tier resources and handle expiration gracefully
- [ ] **(recommended)** Use `POST /osp/v1/estimate` before provisioning to verify cost expectations

## Identity Setup

- [ ] **(recommended)** Generate Ed25519 keypair for agent identity (`ed25519_did`)
- [ ] **(recommended)** Use hardware-backed key storage (TPM, Secure Enclave) where available
- [ ] **(recommended)** Rotate agent keys periodically (recommended: every 90 days)
- [ ] **(recommended)** Use short-lived attestation tokens (1-hour expiry with refresh)
- [ ] **(recommended)** Include `agent_attestation` in requests to providers requiring `trust_tier: verified` or higher

## Security: Nonce Generation

- [ ] **(required)** Include unique `nonce` in every provision, rotate, and deprovision request
- [ ] **(required)** Nonce MUST be UUID v4 or cryptographically random string of 32+ characters
- [ ] **(required)** Generate nonces from a CSPRNG -- never reuse, never predict
- [ ] **(recommended)** Distinguish `nonce` (anti-replay) from `idempotency_key` (safe retry) in requests

## Security: Credential Encryption

- [ ] **(required)** Generate Ed25519 keypair from CSPRNG
- [ ] **(required)** Provide Ed25519 public key as `agent_public_key` in requests
- [ ] **(required)** Correctly perform X25519 key agreement for decryption
- [ ] **(required)** Verify XSalsa20-Poly1305 authentication tag before using decrypted credentials
- [ ] **(recommended)** Zero shared secrets and private keys from memory after use
- [ ] **(recommended)** Support credential re-encryption when rotating agent keys

## Security: Webhook Verification

- [ ] **(recommended)** Verify `X-OSP-Signature` header using HMAC-SHA256
- [ ] **(recommended)** Use constant-time comparison for HMAC verification
- [ ] **(recommended)** Reject webhooks with timestamps older than 300 seconds
- [ ] **(recommended)** Store `osp_webhook_secret` securely (same sensitivity as API keys)
- [ ] **(recommended)** Handle duplicate webhook deliveries idempotently (check `X-OSP-Delivery-Attempt`)

## Sandbox Testing

- [ ] **(recommended)** Test provisioning flow against provider sandbox environments first
- [ ] **(recommended)** Verify credential decryption works end-to-end in sandbox
- [ ] **(recommended)** Test async provisioning polling logic
- [ ] **(recommended)** Test error handling for all error codes (400, 402, 403, 404, 409, 429, 500)
- [ ] **(recommended)** Verify deprovisioning cleans up resources correctly

## Cost Monitoring

- [ ] **(recommended)** Query `GET /osp/v1/usage/{resource_id}` periodically for active resources
- [ ] **(recommended)** Use `POST /osp/v1/estimate` to preview costs before provisioning
- [ ] **(recommended)** Implement budget alerts when usage approaches thresholds
- [ ] **(recommended)** Track total spend across all provisioned resources
- [ ] **(recommended)** Use the dispute endpoint `POST /osp/v1/dispute/{resource_id}` for billing discrepancies

## Idempotency

- [ ] **(recommended)** Generate stable `idempotency_key` per logical operation (not per request attempt)
- [ ] **(recommended)** Retry failed requests with the same `idempotency_key` but a new `nonce`
- [ ] **(recommended)** Handle idempotent responses (same result returned on retry)

## Testing and Conformance

- [ ] **(required)** Pass the OSP Core agent conformance test suite
- [ ] **(recommended)** Run conformance tests in CI on every release
- [ ] **(recommended)** Test against multiple provider implementations
- [ ] **(recommended)** Verify compatibility with OSP reference implementations (TypeScript and Python)

---

## Conformance Levels

After completing the above, your agent can advertise one of these levels:

| Level | What's Needed |
|-------|--------------|
| **OSP Core** | All **(required)** items above |
| **OSP Core + Webhooks** | Core + webhook receiver with HMAC verification |
| **OSP Core + Events** | Core + event polling capability |
| **OSP Core + Escrow** | Core + escrow ACK/NACK support |
| **OSP Full** | Core + Webhooks + Events + Escrow + full credential scope support |
