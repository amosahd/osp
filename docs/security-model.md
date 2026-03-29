# OSP Security Threat Model

This document provides a comprehensive security analysis of the Open Service Protocol. It catalogs known threat categories, their attack vectors, the mitigations OSP provides, and residual risks that implementers must be aware of.

For the normative security requirements, see the [OSP v1.0 Specification, Section 8](../spec/osp-v1.0.md#8-security).

---

## Threat Categories

### T1: Manifest Tampering

**Description:** An attacker modifies a provider's ServiceManifest to redirect agents to malicious endpoints, alter pricing, or inject false offering descriptions.

**Attack Vectors:**
- DNS hijacking to serve a modified `/.well-known/osp.json`
- CDN cache poisoning
- BGP hijacking to intercept traffic to the provider's domain
- Compromised CI/CD pipeline publishing a tampered manifest

**Mitigation in OSP:**
- **Ed25519 manifest signatures** (Spec 8.1): Every manifest MUST be signed with the provider's Ed25519 private key. Agents MUST verify the signature before trusting any manifest content.
- **DNS TXT key binding** (Spec 4.3): Providers can publish their public key in a DNS TXT record at `_osp.{domain}`, providing a second verification channel independent of the manifest's delivery path.
- **JWKS endpoint** (Spec 8.9): Providers publish active keys at `/.well-known/osp-keys.json`. Agents can cross-reference the manifest's `provider_key_id` against the JWKS endpoint.
- **Manifest versioning** (Spec 4.4): Monotonically increasing `manifest_version` prevents downgrade attacks.

**Residual Risk:** If the provider's signing key itself is compromised, the attacker can produce valid signatures. See T6 (Provider Key Compromise) for mitigation.

---

### T2: Credential Theft

**Description:** An attacker intercepts credentials during delivery from provider to agent, or extracts them from storage.

**Attack Vectors:**
- Man-in-the-middle on the network path between provider and agent
- Compromised TLS termination proxy
- Log files containing plaintext credentials
- Memory dumps on the agent's host
- Credential leakage into version control

**Mitigation in OSP:**
- **End-to-end credential encryption** (Spec 8.2): When agents provide `agent_public_key`, credentials are encrypted using `x25519-xsalsa20-poly1305` (NaCl `crypto_box`). Even if TLS is compromised, credentials remain encrypted to the agent's key.
- **Ephemeral keypairs**: Providers MUST generate a fresh x25519 keypair for each encryption operation. The ephemeral private key is discarded immediately after encryption.
- **Transport security** (Spec 8.4): TLS 1.2+ is mandatory. TLS 1.3 is recommended.
- **Credential leak detection** (Spec 12.5): OSP defines a framework for detecting leaked credentials in version control and public repositories.
- **Short-lived tokens** (Spec 12.6): Providers are encouraged to issue time-limited credentials that expire automatically.

**Residual Risk:** If the agent's Ed25519 private key is compromised, the attacker can decrypt all credential bundles encrypted to that key. Agents SHOULD rotate keys periodically and use hardware-backed key storage where possible.

---

### T3: Replay Attacks

**Description:** An attacker captures a valid OSP request and replays it to duplicate resource provisioning, trigger duplicate deprovisioning, or re-rotate credentials.

**Attack Vectors:**
- Network traffic capture and replay
- Stolen request logs containing full request bodies
- Compromised intermediate proxy that stores and replays requests

**Mitigation in OSP:**
- **Nonce-based replay protection** (Spec 8.3): Every `ProvisionRequest`, rotation request, and deprovision request MUST include a unique `nonce` (UUID v4 or 32+ character random string).
- **Nonce window**: Providers MUST reject any nonce seen within the previous 24 hours.
- **Idempotency keys** (Spec 5.5): Distinct from nonces -- idempotency keys ensure safe retries while nonces prevent replay. Both may be present in a request.
- **Timestamp validation**: Webhook signatures include timestamps that MUST be within 300 seconds of current time.

**Residual Risk:** Nonce storage has a 24-hour window. Requests replayed after 24 hours could theoretically succeed, though they would require valid authentication credentials that should have been rotated by then.

---

### T4: Sybil Attacks (Free Tier Abuse)

**Description:** An attacker creates many fake agent identities to abuse free-tier provisioning, consuming provider resources at no cost.

**Attack Vectors:**
- Generating thousands of agent keypairs, each provisioning a free resource
- Using compromised machines as distributed agents
- Automating provisioning with minimal identity requirements

**Mitigation in OSP:**
- **Trust tier requirements** (Spec 5.3): Providers declare minimum trust tiers (`none`, `basic`, `verified`, `enterprise`). Higher tiers require external identity verification (e.g., TAP attestation).
- **Per-principal rate limits** (Spec 8.6): Provisioning is rate-limited to 10 requests per minute per principal.
- **Agent attestation**: Providers can require `agent_attestation` tokens that bind agent identities to verified principals.
- **Free tier expiration**: Free-tier resources include `expires_at` timestamps and auto-deprovision on inactivity.

**Residual Risk:** At `trust_tier: none`, Sybil attacks remain feasible. Providers offering free tiers without identity requirements should implement additional heuristics (IP-based limits, behavioral analysis) outside of OSP.

---

### T5: Provider Impersonation

**Description:** An attacker creates a fake provider that mimics a legitimate one, tricking agents into provisioning through the attacker's endpoints and surrendering payment proofs or sensitive metadata.

**Attack Vectors:**
- Registering a similar domain with a convincing manifest
- Publishing to an OSP registry with a display name mimicking a real provider
- Social engineering agents via crafted offering descriptions

**Mitigation in OSP:**
- **Manifest signature verification** (Spec 4.3): Agents MUST verify Ed25519 signatures. A fake provider cannot produce valid signatures for a domain it doesn't control.
- **TLS origin binding**: The manifest is served over TLS from the provider's domain, binding identity to domain ownership.
- **Registry attestation**: OSP registries can implement provider verification workflows before listing.
- **Provider key rotation and JWKS** (Spec 8.9): Agents can verify key provenance via the JWKS endpoint.

**Residual Risk:** Domain-level impersonation (e.g., `supabase-osp.com` vs `supabase.com`) requires agent-side domain reputation checking, which is outside OSP's scope. Agents SHOULD maintain allowlists of known provider domains.

---

### T6: Webhook Forgery

**Description:** An attacker sends forged webhook notifications to an agent's webhook endpoint, potentially triggering incorrect state transitions or injecting false event data.

**Attack Vectors:**
- Guessing or discovering the agent's webhook URL
- Sending crafted webhook payloads that appear to come from a provider
- Replay of a previously captured webhook with a valid signature

**Mitigation in OSP:**
- **HMAC-SHA256 webhook signatures** (Spec 8.5): Every webhook includes an `X-OSP-Signature` header computed as `HMAC-SHA256(webhook_secret, timestamp + "." + request_body)`.
- **Timestamp validation**: Agents MUST reject webhooks where the timestamp is more than 300 seconds old.
- **Constant-time comparison**: Agents MUST use constant-time comparison for HMAC verification to prevent timing attacks.
- **HTTPS-only**: Webhook URLs MUST use HTTPS.
- **Webhook secret rotation**: The webhook secret can be rotated via webhook management endpoints (Spec 6.9).

**Residual Risk:** If the `osp_webhook_secret` is leaked, an attacker can forge valid signatures until the secret is rotated. Agents SHOULD treat webhook secrets with the same sensitivity as API keys.

---

### T7: Agent Impersonation

**Description:** An attacker impersonates a legitimate agent to provision resources, retrieve credentials, or deprovision active resources.

**Attack Vectors:**
- Stolen agent Ed25519 private key
- Compromised agent attestation token
- Session hijacking if sessions are used

**Mitigation in OSP:**
- **Short-lived attestations** (Spec 8.7): Agents SHOULD use attestation tokens with 1-hour expiry, bounding the window of compromise.
- **Principal-initiated revocation** (Spec 8.7): The principal (human/org) can call `POST /osp/v1/revoke-agent` to immediately invalidate a compromised agent's access.
- **Provider revocation checks**: Providers SHOULD verify attestation validity on every `GET /credentials` and `POST /provision` request.
- **Credential encryption to agent key**: Even if an attacker obtains a resource_id, they cannot decrypt credentials without the agent's private key.

**Residual Risk:** Between key compromise and revocation, the attacker has full agent access. This window is bounded by attestation expiry (recommended 1 hour) and principal awareness of the compromise.

---

## Cryptographic Requirements Summary

| Algorithm | Usage | Specification |
|-----------|-------|---------------|
| **Ed25519** | Manifest signing, agent identity keys | Spec 8.1, 9.1, 9.2 |
| **X25519** | Diffie-Hellman key agreement for credential encryption | Spec 8.2 |
| **XSalsa20-Poly1305** | Authenticated encryption of credential bundles (via NaCl `crypto_box`) | Spec 8.2 |
| **HMAC-SHA256** | Webhook signature authentication | Spec 8.5 |
| **Base64url (no padding)** | Encoding of all keys, signatures, and encrypted payloads | Spec 1.5 |

### Key Generation Requirements

- All Ed25519 keypairs MUST be generated from a CSPRNG (e.g., `/dev/urandom`, `OsRng`)
- No seed reuse across keypairs
- Private keys SHOULD be zeroed on drop (zeroize)
- Ephemeral X25519 keypairs MUST be fresh per encryption operation

### Key Encoding

All cryptographic keys use Base64url encoding without padding, per [RFC 4648 Section 5](https://www.rfc-editor.org/rfc/rfc4648#section-5). Ed25519 public keys are 32 bytes (44 Base64url characters). Signatures are 64 bytes (86 Base64url characters).

---

## Transport Security

| Requirement | Level | Details |
|-------------|-------|---------|
| TLS | REQUIRED | All OSP endpoints MUST use TLS |
| TLS 1.3 | RECOMMENDED | Preferred for performance and security |
| TLS 1.2 | MINIMUM | The lowest acceptable TLS version |
| TLS 1.0, 1.1 | PROHIBITED | MUST NOT be supported |
| HSTS | RECOMMENDED | `Strict-Transport-Security` with `max-age` >= 31536000 (1 year) |
| mTLS | RECOMMENDED | For production deployments where both parties manage certificates |
| Certificate pinning | NOT RECOMMENDED | Operational complexity outweighs benefits; providers MAY document certificate chains |

### TLS Cipher Suite Recommendations

Providers SHOULD prefer cipher suites with forward secrecy:
- TLS 1.3: `TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`, `TLS_AES_128_GCM_SHA256`
- TLS 1.2: `ECDHE-ECDSA-AES256-GCM-SHA384`, `ECDHE-RSA-AES256-GCM-SHA384`

---

## Credential Lifecycle Security

### Encryption

1. Agent provides `agent_public_key` (Ed25519) in `ProvisionRequest` or `X-OSP-Agent-Public-Key` header
2. Provider converts agent's Ed25519 public key to X25519 (Edwards to Montgomery curve conversion)
3. Provider generates ephemeral X25519 keypair
4. Provider computes shared secret via Diffie-Hellman: `ephemeral_private * agent_x25519_public`
5. Provider encrypts credentials with XSalsa20-Poly1305 using the shared secret
6. Provider sends encrypted bundle with ephemeral public key attached
7. Provider destroys ephemeral private key and shared secret
8. Agent reverses the process using their Ed25519 private key (converted to X25519)

### Rotation

- Providers expose `POST /osp/v1/rotate/{resource_id}` for credential rotation
- Rotation generates new credentials and invalidates the old ones
- Rate limited to 5 requests per hour per resource to prevent abuse
- Each rotation request requires a unique nonce

### Leak Detection

OSP defines a credential leak detection framework (Spec 12.5):
- Agents SHOULD monitor for credential exposure in version control
- Providers SHOULD support automated rotation on leak detection
- `.gitignore` and `.cursorignore` generation helpers prevent accidental commits (Spec 12.4)

### Credential Visibility Controls

- `env_only`: Credentials delivered only as environment variables, never written to files
- `file_safe`: Credentials may be written to files (with proper permissions)
- `display_safe`: Credentials may be shown in UI/logs (low-sensitivity tokens only)

---

## Agent Identity Security

### Verification Methods

OSP supports multiple agent identity verification levels via the `trust_tier` system:

| Trust Tier | Verification | Use Case |
|------------|-------------|----------|
| `none` | No verification required | Free tiers, public resources |
| `basic` | Email or domain verification | Low-value paid services |
| `verified` | TAP attestation or equivalent identity proof | Production services, sensitive data |
| `enterprise` | Organization-level verification with legal agreements | Enterprise SLAs, compliance-bound services |

### Revocation

**Agent-initiated:** Agent rotates their own keys and re-provisions with new identity.

**Principal-initiated:** The principal calls `POST /osp/v1/revoke-agent` on relevant providers:
```json
{
  "agent_public_key": "compromised_key_base64url",
  "reason": "key_compromised",
  "effective_immediately": true
}
```

**Provider behavior on revocation:**
1. Return `403 Forbidden` with error code `attestation_revoked`
2. Suspend credential delivery for all resources associated with the agent
3. Do NOT deprovision resources (the principal may re-authorize a new agent)

### Attestation Expiry

Short-lived attestations (recommended 1-hour expiry) are the primary defense against key compromise. Even if an attacker obtains an agent's private key, they can only act within the remaining attestation lifetime.

---

## Rate Limiting as DDoS Mitigation

OSP mandates rate limiting on all endpoints (Spec 8.6):

| Endpoint | Minimum Rate Limit |
|----------|-------------------|
| `POST /osp/v1/provision` | 10 req/min per principal |
| `DELETE /osp/v1/deprovision/{id}` | 10 req/min per principal |
| `GET /osp/v1/credentials/{id}` | 30 req/min per resource |
| `POST /osp/v1/rotate/{id}` | 5 req/hour per resource |
| `GET /osp/v1/status/{id}` | 60 req/min per resource |
| `GET /osp/v1/usage/{id}` | 30 req/min per resource |
| `GET /osp/v1/health` | 60 req/min per IP |

### Response Headers

Rate limit responses use HTTP 429 with:
- `Retry-After`: Seconds to wait before retrying
- `RateLimit-Limit`: Maximum requests per window
- `RateLimit-Remaining`: Remaining requests in current window
- `RateLimit-Reset`: Seconds until window resets

### DDoS Considerations

Rate limits alone do not stop distributed attacks. Providers SHOULD additionally implement:
- IP-based rate limiting at the edge (CDN/WAF level)
- Geographic filtering for endpoints not expected to receive global traffic
- Connection-level throttling (e.g., max concurrent connections per IP)
- Challenge-based rate limiting escalation for suspicious traffic patterns

---

## Sandbox Isolation Requirements

OSP supports sandbox environments (Spec 14.3) for testing. Sandbox isolation requirements:

1. **Data isolation**: Sandbox resources MUST NOT share data stores with production resources
2. **Credential isolation**: Sandbox credentials MUST NOT grant access to production systems
3. **Network isolation**: Sandbox resources SHOULD be on isolated network segments
4. **Billing isolation**: Sandbox usage MUST NOT generate real charges
5. **Lifecycle isolation**: Sandbox resources MAY have shorter TTLs and auto-deprovision more aggressively
6. **Rate limit isolation**: Sandbox rate limits MAY be more permissive for testing purposes

---

## Complete Threat Matrix

| ID | Threat | Attack Vector | OSP Mitigation | Residual Risk |
|----|--------|--------------|----------------|---------------|
| T1 | Manifest Tampering | DNS hijack, CDN poisoning | Ed25519 signatures + DNS TXT binding + JWKS | Provider key compromise |
| T2 | Credential Theft | MITM, log exposure | X25519 encryption + TLS 1.2+ + ephemeral keys | Agent private key compromise |
| T3 | Replay Attacks | Request capture and replay | Unique nonces + 24h window + idempotency keys | Replay after 24h window (requires valid auth) |
| T4 | Sybil Attacks | Mass fake identities | Trust tiers + rate limits + attestation | No-auth free tiers remain vulnerable |
| T5 | Provider Impersonation | Fake domain/manifest | Signature verification + TLS origin + registry | Lookalike domain deception |
| T6 | Webhook Forgery | Forged webhook payloads | HMAC-SHA256 + timestamp validation + HTTPS | Leaked webhook secret |
| T7 | Agent Impersonation | Stolen keys/tokens | Short-lived attestations + revocation | Window between compromise and detection |
| T8 | Credential Stuffing | Brute-force credential endpoint | Authentication + rate limiting (30 req/min) | Distributed slow attacks |
| T9 | Usage Report Inflation | Malicious provider inflates usage | Agent-side verification + dispute endpoint | Requires agent monitoring |
| T10 | Provider Key Compromise | Stolen provider signing key | JWKS revocation + emergency rotation | Window before detection |
| T11 | Stale Manifest Attack | Serving old manifest versions | Manifest versioning + freshness checks | Agents not checking `published_at` |
| T12 | Resource Squatting | Provisioning unused resources | Free tier expiry + auto-deprovision + idle timeouts | Paid tier squatting |
| T13 | Cross-Provider Leakage | Metadata correlation across providers | Minimal metadata default + ZKP (planned v1.1) | No ZKP in v1.0 |

---

## Recommendations for Implementers

### For Providers

1. Store signing keys in HSMs or secure key management systems, not in application code
2. Implement nonce storage with bloom filters for memory efficiency
3. Log all provisioning and credential access events for audit
4. Monitor for unusual patterns (mass provisioning, frequent rotation, geographic anomalies)
5. Implement emergency key rotation runbooks and test them regularly
6. Never log plaintext credentials
7. Set `Content-Security-Policy` and `X-Content-Type-Options` headers on all responses

### For Agents

1. Use hardware-backed key storage (TPM, Secure Enclave) where available
2. Rotate agent keys periodically (recommended: every 90 days)
3. Always provide `agent_public_key` for credential encryption, even when TLS is present
4. Verify manifest signatures before trusting any provider data
5. Implement webhook HMAC verification with constant-time comparison
6. Monitor credential usage for anomalies that might indicate compromise
7. Use short-lived attestations (1-hour expiry) rather than long-lived tokens

### For Registry Operators

1. Verify provider domain ownership before listing
2. Implement reputation scoring based on uptime, dispute history, and conformance test results
3. Monitor for manifest changes that could indicate compromise
4. Provide DNSSEC validation for listed provider domains
5. Maintain a public transparency log of registry additions and removals
