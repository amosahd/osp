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
  "status_url": "https://api.yourdomain.com/osp/v1/resources/res_abc123",
  "estimated_ready_seconds": 30
}
```

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

## Next Steps

- Review the full [Protocol Specification](../spec/osp-v1.0.md) for detailed requirements
- Explore the [JSON Schemas](../schemas/) for request/response validation
- Look at the [reference implementations](../reference-implementation/) for working code examples
