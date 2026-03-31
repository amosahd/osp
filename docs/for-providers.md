# OSP for Providers

This guide walks you through making your service OSP-compatible so that AI agents can discover, provision, and manage resources programmatically.

## Overview

Becoming an OSP provider involves four steps:

1. [Publish a Service Manifest](#step-1-publish-a-service-manifest)
2. [Implement the OSP endpoints](#step-2-implement-the-osp-endpoints)
3. [Run conformance tests](#step-3-run-conformance-tests)
4. [Register with the OSP registry (optional)](#step-4-register-with-the-osp-registry)

## Step 1: Publish a Service Manifest

Create a JSON file and serve it at `https://yourdomain.com/.well-known/osp.json`.

### Minimal Example

```json
{
  "$schema": "https://osp.dev/schemas/service-manifest.schema.json",
  "osp_version": "1.0",
  "provider_id": "yourdomain.com",
  "provider_name": "Your Company",
  "osp_base_url": "https://api.yourdomain.com/osp/v1",
  "offerings": [
    {
      "offering_id": "yourdomain/your-service",
      "name": "Your Service",
      "description": "A brief description of what the service provides.",
      "category": "database",
      "tiers": [
        {
          "tier_id": "free",
          "name": "Free",
          "description": "Free tier with limited resources.",
          "price": {
            "amount": "0",
            "currency": "USD"
          },
          "limits": {
            "storage_gb": 0.5,
            "requests_per_month": 50000
          }
        },
        {
          "tier_id": "pro",
          "name": "Pro",
          "description": "Production-ready with higher limits.",
          "price": {
            "amount": "25",
            "currency": "USD",
            "interval": "P1M"
          },
          "limits": {
            "storage_gb": 10,
            "requests_per_month": 5000000
          }
        }
      ]
    }
  ]
}
```

### Key Fields

| Field | Required | Description |
|---|---|---|
| `osp_version` | Yes | Protocol version (currently `"1.0"`) |
| `provider_id` | Yes | Unique identifier, typically your domain |
| `provider_name` | Yes | Human-readable name |
| `osp_base_url` | Yes | Base URL for all OSP API endpoints |
| `offerings` | Yes | Array of services you provide |
| `offerings[].offering_id` | Yes | Unique ID for the offering (format: `provider/service`) |
| `offerings[].tiers` | Yes | Available pricing tiers |
| `offerings[].tiers[].price` | Yes | Price object with `amount`, `currency`, and optional `interval` |

### Serving the Manifest

- Serve at `/.well-known/osp.json` with `Content-Type: application/json`
- The file MUST be accessible without authentication
- Use HTTPS in production
- Enable CORS (`Access-Control-Allow-Origin: *`) so browser-based agents can discover your service

## Step 2: Implement the OSP Endpoints

All endpoints are served under your `osp_base_url`. Here are the seven endpoints you need to implement:

### 2.1 Provision — `POST /osp/v1/provision`

Creates a new resource for an agent.

**Request:**
```json
{
  "offering_id": "yourdomain/your-service",
  "tier_id": "free",
  "project_name": "agent-project-42",
  "agent_public_key": "base64url_encoded_ed25519_public_key",
  "idempotency_key": "unique-request-id",
  "payment_context": {
    "method": "sardis",
    "token": "pay_..."
  }
}
```

**Response (synchronous):**
```json
{
  "resource_id": "res_abc123",
  "offering_id": "yourdomain/your-service",
  "tier_id": "free",
  "status": "provisioned",
  "credentials_bundle": {
    "format": "plaintext",
    "credentials": {
      "API_URL": "https://your-instance.yourdomain.com",
      "API_KEY": "sk_live_..."
    }
  },
  "dashboard_url": "https://yourdomain.com/dashboard/res_abc123",
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Response (asynchronous):**

If provisioning takes more than a few seconds, return `202 Accepted` with `"status": "provisioning"` and a `status_url` where the agent can poll:

```json
{
  "resource_id": "res_abc123",
  "status": "provisioning",
  "poll_url": "https://api.yourdomain.com/osp/v1/resources/res_abc123",
  "status_url": "https://api.yourdomain.com/osp/v1/resources/res_abc123",
  "estimated_ready_seconds": 30
}
```

Async response rules:

- Return the same `resource_id` and polling URL for duplicate requests with the same `idempotency_key`.
- Accept a new `nonce` on each retry attempt as long as the `idempotency_key` is unchanged.
- Prefer `poll_url` as the canonical field. You may mirror the same value into `status_url` for compatibility with older agents.
- Once the resource reaches a terminal state, return `active`, `failed`, or `deprovisioned` and stop advertising `estimated_ready_seconds`.

### 2.2 Get Resource Status — `GET /osp/v1/resources/{resource_id}`

Returns the current state of a provisioned resource.

**Response:**
```json
{
  "resource_id": "res_abc123",
  "offering_id": "yourdomain/your-service",
  "tier_id": "free",
  "status": "provisioned",
  "created_at": "2025-01-15T10:30:00Z",
  "dashboard_url": "https://yourdomain.com/dashboard/res_abc123"
}
```

Valid `status` values: `provisioning`, `provisioned`, `suspended`, `deprovisioned`, `error`.

### 2.3 Deprovision — `DELETE /osp/v1/resources/{resource_id}`

Deletes a resource and revokes all credentials.

**Response:**
```json
{
  "resource_id": "res_abc123",
  "status": "deprovisioned",
  "deprovisioned_at": "2025-01-16T08:00:00Z"
}
```

### 2.4 Rotate Credentials — `POST /osp/v1/resources/{resource_id}/credentials`

Generates new credentials and invalidates the previous set.

**Request:**
```json
{
  "agent_public_key": "base64url_encoded_ed25519_public_key",
  "invalidate_previous": true
}
```

**Response:**
```json
{
  "resource_id": "res_abc123",
  "credentials_bundle": {
    "format": "plaintext",
    "credentials": {
      "API_URL": "https://your-instance.yourdomain.com",
      "API_KEY": "sk_live_new_..."
    }
  },
  "rotated_at": "2025-01-16T12:00:00Z"
}
```

### 2.5 Upgrade/Downgrade Tier — `POST /osp/v1/resources/{resource_id}/upgrade`

Changes the tier for an existing resource.

**Request:**
```json
{
  "tier_id": "pro",
  "payment_context": {
    "method": "sardis",
    "token": "pay_..."
  }
}
```

**Response:**
```json
{
  "resource_id": "res_abc123",
  "previous_tier_id": "free",
  "tier_id": "pro",
  "status": "provisioned",
  "effective_at": "2025-01-16T12:00:00Z"
}
```

### 2.6 Get Usage — `GET /osp/v1/resources/{resource_id}/usage`

Returns usage metrics for a resource.

**Response:**
```json
{
  "resource_id": "res_abc123",
  "period_start": "2025-01-01T00:00:00Z",
  "period_end": "2025-02-01T00:00:00Z",
  "metrics": {
    "storage_gb": 0.23,
    "requests": 12450,
    "bandwidth_gb": 1.7
  },
  "limits": {
    "storage_gb": 0.5,
    "requests_per_month": 50000
  }
}
```

## Step 3: Run Conformance Tests

Use the OSP conformance test suite to verify your implementation:

```bash
cd conformance-tests
pip install -r requirements.txt

# Test discovery
pytest test_discovery.py --provider-url https://yourdomain.com

# Test provisioning (requires a test tier)
pytest test_provision.py --provider-url https://yourdomain.com --test-tier free

# Run all tests
pytest --provider-url https://yourdomain.com --test-tier free
```

The conformance tests validate:

- Manifest is valid and accessible at `/.well-known/osp.json`
- Manifest conforms to the JSON Schema
- Provision endpoint creates resources correctly
- Credentials are returned in the correct format
- Deprovision cleans up resources
- Error responses use the correct format and status codes

## Step 4: Register with the OSP Registry

> **Note**: The OSP registry is coming soon. For now, agents discover providers by domain.

Once the registry is available, you can register your service to make it discoverable to all OSP-compatible agents:

```bash
# Future CLI command
osp register --manifest https://yourdomain.com/.well-known/osp.json
```

## Best Practices

### Security

- **Validate `agent_public_key`**: Ensure it is a valid Ed25519 public key before using it for encryption.
- **Encrypt credential bundles**: When an agent provides a public key, encrypt the credentials so only the agent can read them.
- **Authenticate requests**: Use the `Authorization` header (e.g., bearer tokens) for all endpoints except `/.well-known/osp.json`.
- **Support idempotency**: Honor the `idempotency_key` field to prevent duplicate provisioning.

### Reliability

- **Support async provisioning**: If your service takes more than a few seconds to provision, return `202 Accepted` and let agents poll.
- **Return meaningful errors**: Use standard HTTP status codes and include an `error` object with `code` and `message`.
- **Handle rate limiting**: Return `429 Too Many Requests` with a `Retry-After` header.

### Error Response Format

All error responses should follow this format:

```json
{
  "error": {
    "code": "insufficient_quota",
    "message": "Free tier limit reached. Upgrade to Pro for higher limits.",
    "details": {
      "current_usage": 50000,
      "limit": 50000
    }
  }
}
```

Standard error codes:

| Code | HTTP Status | Description |
|---|---|---|
| `invalid_request` | 400 | Malformed request body |
| `unauthorized` | 401 | Missing or invalid authentication |
| `forbidden` | 403 | Insufficient permissions |
| `not_found` | 404 | Resource or offering not found |
| `conflict` | 409 | Resource already exists (duplicate idempotency key) |
| `insufficient_quota` | 429 | Quota or rate limit exceeded |
| `provider_error` | 500 | Internal provider error |

## Sandbox Mode Support

OSP supports ephemeral sandbox environments for testing, PR previews, and experimentation. Providers SHOULD implement sandbox provisioning to attract agent developers who want to test integrations before going to production.

### Handling Sandbox Requests

When an agent sends a provision request with a `sandbox` object, your provider should create a temporary resource:

```json
{
  "offering_id": "yourdomain/your-service",
  "tier_id": "free",
  "project_name": "pr-preview-142",
  "sandbox": {
    "enabled": true,
    "ttl_hours": 24,
    "auto_destroy": true,
    "seed_from": "res_db_production",
    "seed_mode": "schema_only"
  },
  "nonce": "..."
}
```

### Sandbox Fields

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | `boolean` | Whether this is a sandbox resource |
| `ttl_hours` | `integer` | Auto-destroy after this many hours. Max: 720 (30 days). |
| `auto_destroy` | `boolean` | Whether to auto-destroy on TTL expiry |
| `seed_from` | `string` | Resource ID to seed data from (schema and/or data) |
| `seed_mode` | `string` | `schema_only`, `schema_and_sample_data`, `full_clone` |

### Implementation Requirements

- Tag sandbox resources with `osp_sandbox: true` in metadata.
- Send a `resource.sandbox_expiring` webhook 1 hour before TTL expires.
- Exclude sandbox resources from billing (when on free tier) or charge at sandbox rates.
- Support promoting sandbox to permanent via `POST /osp/v1/promote/{resource_id}`.
- When `seed_from` is specified, copy the schema (and optionally data) from the referenced resource to the new sandbox instance.

## Agent Identity Verification

OSP defines multiple methods for agents to prove their identity. Providers MUST support at least one, and SHOULD support all three for maximum compatibility.

### Method 1: Ed25519 DID (via `agent_attestation`)

The recommended approach. Agents present a TAP (Trust & Attestation Protocol) attestation token that binds their Ed25519 public key to a verified identity and trust tier.

```http
POST /osp/v1/provision HTTP/1.1
Authorization: Bearer <agent_attestation_token>
```

**Provider responsibilities:**
- Validate the attestation token signature.
- Verify the trust tier meets the offering's `trust_tier_required` minimum.
- Periodically check for attestation revocation (see Section 8.7 of the spec).
- Return `403 Forbidden` with error code `attestation_revoked` if the attestation has been revoked.

### Method 2: OAuth / OIDC Federation

Agents authenticate using federated identity tokens from standard identity providers (Google, GitHub Actions, Azure AD).

```json
{
  "authentication": {
    "method": "oidc",
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "issuer": "https://accounts.google.com",
    "audience": "com.yourdomain",
    "subject": "agent-12345@my-org.iam.gserviceaccount.com"
  }
}
```

**Provider responsibilities:**
- Validate the JWT signature against the issuer's JWKS endpoint.
- Verify `aud`, `exp`, `iss`, and `iat` claims.
- Cache JWKS responses for no more than 1 hour.
- Advertise supported issuers in your manifest under `extensions.osp_identity_federation`.

### Method 3: API Key

For simpler integrations, agents authenticate with a provider-issued API key via the `Authorization` header or a `resource_access_token` returned in the credential bundle.

```http
GET /osp/v1/credentials/res_abc123 HTTP/1.1
Authorization: Bearer <resource_access_token>
```

**Provider responsibilities:**
- Issue `resource_access_token` in the `ProvisionResponse` credential bundle when applicable.
- Validate the token on every request to credential and resource endpoints.
- Support token rotation through the credential rotation endpoint.

## Cost Summary Endpoint

Implement the cost summary endpoint so agents can track spending across their provisioned resources.

### GET /osp/v1/projects/{project_id}/cost

```json
{
  "project_id": "proj_my-saas",
  "period": {"start": "2026-03-01", "end": "2026-03-31"},
  "total": {"amount": "74.50", "currency": "USD"},
  "by_resource": [
    {
      "resource_id": "res_db",
      "service": "yourdomain/your-service",
      "tier": "pro",
      "base_cost": "25.00",
      "metered_cost": "7.50",
      "total": "32.50"
    }
  ],
  "comparison": {
    "previous_period": "68.20",
    "change_percent": "+9.2%",
    "cost_alerts": [
      {
        "resource": "res_db",
        "alert": "Storage overage increasing — consider upgrading tier"
      }
    ]
  }
}
```

**Implementation notes:**
- Break down costs by `base_cost` (subscription) and `metered_cost` (usage-based).
- Include period-over-period comparisons when data is available.
- Generate `cost_alerts` when usage patterns suggest an upgrade or anomaly.
- Support budget guardrails: respect the `enforcement` mode (`warn`, `soft_block`, `hard_block`) and return `402 Payment Required` with `budget_exceeded` when limits are hit.

## Rate Limiting Requirements

Providers MUST implement rate limiting on all OSP endpoints using the following headers and status codes.

### Required Headers

On **every** response, include these IETF-standard rate limit headers:

| Header | Description |
|--------|-------------|
| `RateLimit-Limit` | Maximum requests per window |
| `RateLimit-Remaining` | Remaining requests in the current window |
| `RateLimit-Reset` | Seconds until the window resets |

> Note: The `X-RateLimit-*` prefix is deprecated. You MAY include both during a transition period, but MUST include the unprefixed versions.

### Minimum Rate Limits

| Endpoint | Minimum Rate Limit |
|----------|-------------------|
| `POST /osp/v1/provision` | 10 requests per minute per principal |
| `DELETE /osp/v1/deprovision/{id}` | 10 requests per minute per principal |
| `GET /osp/v1/credentials/{id}` | 30 requests per minute per resource |
| `POST /osp/v1/rotate/{id}` | 5 requests per hour per resource |
| `GET /osp/v1/status/{id}` | 60 requests per minute per resource |
| `GET /osp/v1/usage/{id}` | 30 requests per minute per resource |
| `GET /osp/v1/health` | 60 requests per minute per IP |

### 429 Response

When rate limited, return `429 Too Many Requests` with a `Retry-After` header:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
RateLimit-Limit: 10
RateLimit-Remaining: 0
RateLimit-Reset: 30
Content-Type: application/json

{
  "error": {
    "code": "rate_limited",
    "message": "Too many requests. Retry after 30 seconds.",
    "retryable": true,
    "retry_after_seconds": 30
  }
}
```

## Webhook Retry Policy Configuration

Providers MUST implement retries for failed webhook deliveries. A delivery is considered failed if the agent's endpoint returns a non-2xx status code, times out (recommended timeout: 10 seconds), or is unreachable.

### Required Retry Schedule

Use exponential backoff with the following schedule:

| Attempt | Delay After Previous | Cumulative Time |
|---------|---------------------|-----------------|
| 1 (initial) | Immediate | 0 |
| 2 | 1 minute | 1 minute |
| 3 | 15 minutes | 16 minutes |
| 4 | 1 hour | 1 hour 16 minutes |
| 5 | 4 hours | 5 hours 16 minutes |
| 6 (final) | 24 hours | 29 hours 16 minutes |

### Implementation Details

- After 6 failed attempts, stop retrying and mark the webhook subscription as `failed`.
- The resource remains provisioned — the agent can recover by polling `GET /osp/v1/status/{resource_id}`.
- Include `X-OSP-Delivery-Attempt` header with the attempt number (1-6) so agents can detect duplicates.
- Include `X-OSP-Signature` header computed as `HMAC-SHA256(webhook_secret, timestamp + "." + request_body)`.
- Include `X-OSP-Timestamp` header with the Unix timestamp used in the signature.
- Send a `resource.sandbox_expiring` webhook 1 hour before sandbox TTL expires.

### Webhook Authentication

The `webhook_secret` is established during provisioning. Include it in the `CredentialBundle` under the key `osp_webhook_secret` when the agent provides a `webhook_url`.

Signature header format: `X-OSP-Signature: t={unix_timestamp},v1={hex_encoded_hmac}`

## Multi-Region Offering Setup

Providers SHOULD declare available deployment regions for each offering to support agents with data residency or latency requirements.

### Declaring Regions in the Manifest

Add a `regions` array to each offering. Each element can be a simple string or a detailed `RegionObject`:

```json
{
  "offerings": [
    {
      "offering_id": "yourdomain/your-service",
      "name": "Your Service",
      "regions": [
        {"id": "us-east-1", "jurisdiction": "US", "provider_region": "aws-us-east-1"},
        {"id": "eu-west-1", "jurisdiction": "EU", "provider_region": "aws-eu-west-1", "gdpr_compliant": true},
        {"id": "ap-southeast-1", "jurisdiction": "SG", "provider_region": "aws-ap-southeast-1"}
      ],
      "tiers": [...]
    }
  ]
}
```

### RegionObject Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | REQUIRED | Region identifier (e.g., `"us-east-1"`) |
| `jurisdiction` | `string` | OPTIONAL | ISO 3166-1 alpha-2 country or region code (e.g., `"US"`, `"EU"`, `"SG"`) |
| `provider_region` | `string` | OPTIONAL | Provider's internal region name |
| `gdpr_compliant` | `boolean` | OPTIONAL | Whether the region complies with GDPR |

### Region Handling Rules

- When the agent specifies a `region` in the `ProvisionRequest`, you MUST honor it or return `invalid_region` error — never silently provision in a different region.
- The `ProvisionResponse` MUST include the actual `region` where the resource was deployed.
- You MUST NOT move a provisioned resource to a different region without the agent's explicit consent.
- If `region_unavailable` is temporary, return that error code with `retryable: true` and a `retry_after_seconds`.

## Next Steps

- Review the full [Protocol Specification](../spec/osp-v1.0.md) for detailed requirements
- Explore the [JSON Schemas](../schemas/) for request/response validation
- Look at the [reference implementations](../reference-implementation/) for working code examples
- See the [Error Code Reference](error-reference.md) for a complete list of error codes
