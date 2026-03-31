# OSP Provider Implementation Checklist

Use this checklist to track your progress implementing an OSP-conformant provider. Items marked **(required)** are mandatory for OSP Core conformance. Items marked **(recommended)** improve the provider experience but are not strictly required.

For the full specification, see [osp-v1.0.md](../spec/osp-v1.0.md).

---

## Discovery

- [ ] **(required)** Publish ServiceManifest at `/.well-known/osp.json`
- [ ] **(required)** Manifest validates against the OSP JSON Schema (Appendix A)
- [ ] **(required)** Manifest includes `osp_version`, `manifest_id`, `manifest_version`, `published_at`
- [ ] **(required)** Manifest includes at least one offering with at least one tier
- [ ] **(required)** Manifest includes `accepted_payment_methods` array
- [ ] **(required)** Manifest includes `endpoints` object with base URLs
- [ ] **(recommended)** Publish DNS TXT record at `_osp.{domain}` with public key
- [ ] **(recommended)** Publish JWKS at `/.well-known/osp-keys.json` for key rotation support
- [ ] **(recommended)** Include `provider_key_id` in manifest for JWKS cross-reference

## Core Endpoints

- [ ] **(required)** `POST /osp/v1/provision` -- Provision a new resource
- [ ] **(required)** `DELETE /osp/v1/deprovision/{resource_id}` -- Deprovision a resource
- [ ] **(required)** `GET /osp/v1/credentials/{resource_id}` -- Retrieve credentials
- [ ] **(required)** `POST /osp/v1/rotate/{resource_id}` -- Rotate credentials
- [ ] **(required)** `GET /osp/v1/status/{resource_id}` -- Check resource status
- [ ] **(required)** `GET /osp/v1/usage/{resource_id}` -- Get usage report
- [ ] **(required)** `GET /osp/v1/health` -- Health check endpoint
- [ ] **(required)** `POST /osp/v1/dispute/{resource_id}` -- Dispute initiation

## Extended Endpoints

- [ ] **(recommended)** `POST /osp/v1/webhooks` -- Webhook management (subscribe/unsubscribe)
- [ ] **(recommended)** `GET /osp/v1/events/{resource_id}` -- Audit event stream
- [ ] **(recommended)** `POST /osp/v1/estimate` -- Cost estimation before provisioning
- [ ] **(recommended)** `POST /osp/v1/share/{resource_id}` -- Resource sharing
- [ ] **(recommended)** `POST /osp/v1/delegate/{resource_id}` -- Resource delegation
- [ ] **(recommended)** `GET /osp/v1/metrics/{resource_id}` -- Resource metrics

## Security: Manifest Signing

- [ ] **(required)** Sign manifest with Ed25519 private key
- [ ] **(required)** Include `provider_signature` (Base64url, 64 bytes) in manifest
- [ ] **(required)** Include `provider_public_key` (Base64url, 32 bytes) in manifest
- [ ] **(required)** Signing uses canonical JSON (sorted keys, no whitespace, UTF-8)
- [ ] **(required)** `provider_signature` field excluded from the signed payload
- [ ] **(recommended)** Document key rotation procedure and maintain `previous_public_keys` in extensions

## Security: Credential Encryption

- [ ] **(required)** When agent provides `agent_public_key`, encrypt credentials with `x25519-xsalsa20-poly1305`
- [ ] **(required)** Generate a fresh ephemeral X25519 keypair per encryption operation
- [ ] **(required)** Do NOT store the ephemeral private key after encryption
- [ ] **(required)** Include ephemeral public key in the credential bundle
- [ ] **(recommended)** Do not store plaintext credentials after delivering the encrypted bundle
- [ ] **(recommended)** Support short-lived token issuance for reduced blast radius

## Security: Nonce Validation

- [ ] **(required)** Require unique `nonce` on provision, rotate, and deprovision requests
- [ ] **(required)** Reject duplicate nonces within a 24-hour window
- [ ] **(required)** Return error code `nonce_reused` (HTTP 409) for duplicate nonces
- [ ] **(recommended)** Use bloom filter or similar structure for efficient nonce tracking

## Security: Transport

- [ ] **(required)** All endpoints served over TLS (minimum TLS 1.2)
- [ ] **(required)** TLS 1.0 and 1.1 are NOT supported
- [ ] **(recommended)** Support TLS 1.3
- [ ] **(recommended)** Set `Strict-Transport-Security` header with `max-age` >= 31536000
- [ ] **(recommended)** Support mTLS for production deployments

## Security: Rate Limiting

- [ ] **(required)** Implement rate limiting on all OSP endpoints
- [ ] **(required)** Return HTTP 429 with `Retry-After` header when limits are exceeded
- [ ] **(recommended)** Include `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers
- [ ] **(recommended)** Meet or exceed minimum rate limits from spec (e.g., 10 req/min for provision)

## Security: Webhooks

- [ ] **(recommended)** Include `X-OSP-Signature` header: `t={timestamp},v1={hmac_hex}`
- [ ] **(recommended)** Compute HMAC-SHA256 over `timestamp + "." + request_body`
- [ ] **(recommended)** Include `X-OSP-Timestamp` header
- [ ] **(recommended)** Implement retry with exponential backoff (6 attempts over ~29 hours)
- [ ] **(recommended)** Include `X-OSP-Delivery-Attempt` header (1-6)
- [ ] **(recommended)** Mark webhook subscription as `failed` after 6 failed attempts

## Protocol Compliance

- [ ] **(required)** Include `X-OSP-Version: 1.0` in all responses
- [ ] **(required)** Return well-formed error responses with recognized error codes
- [ ] **(required)** Handle `X-OSP-Version` header from agents and return 406 for unsupported versions
- [ ] **(required)** Support both synchronous and asynchronous provisioning flows
- [ ] **(recommended)** Echo `X-OSP-Trace-Id` header when provided by agent
- [ ] **(recommended)** Generate `X-OSP-Trace-Id` when agent does not provide one

## Sandbox Mode

- [ ] **(recommended)** Offer sandbox/preview environment for agent testing
- [ ] **(recommended)** Sandbox data isolated from production
- [ ] **(recommended)** Sandbox credentials do not grant production access
- [ ] **(recommended)** Sandbox usage does not generate real charges

## Agent Identity Verification

- [ ] **(recommended)** Support `trust_tier_required` in manifest
- [ ] **(recommended)** Validate `agent_attestation` tokens when provided
- [ ] **(recommended)** Check attestation revocation on credential access and provisioning
- [ ] **(recommended)** Support `POST /osp/v1/revoke-agent` for principal-initiated revocation

## Testing and Conformance

- [ ] **(required)** Pass the OSP Core conformance test suite
- [ ] **(recommended)** Run conformance tests in CI on every release
- [ ] **(recommended)** Generate and display OSP conformance badge
- [ ] **(recommended)** Test against multiple agent implementations

## Operational

- [ ] **(recommended)** Monitor health endpoint and report uptime
- [ ] **(recommended)** Document SLA commitments in manifest extensions
- [ ] **(recommended)** Implement provider key rotation runbook
- [ ] **(recommended)** Set up alerting for unusual provisioning patterns
- [ ] **(recommended)** Never log plaintext credentials

---

## Conformance Levels

After completing the above, your provider can advertise one of these levels:

| Level | What's Needed |
|-------|--------------|
| **OSP Core** | All **(required)** items above |
| **OSP Paid Core** | Core + paid tier declaration + structured payment errors + async/idempotent paid provisioning |
| **OSP Core + Webhooks** | Core + webhook management + webhook delivery with retries |
| **OSP Core + Events** | Core + audit event stream with 90-day retention |
| **OSP Core + Escrow** | Core + escrow profiles in tiers + escrow provider integration |
| **OSP Full** | Core + Webhooks + Events + Escrow + JWKS + geographic compliance + all recommended features |
