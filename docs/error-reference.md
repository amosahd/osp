# OSP Error Code Reference

This document is the complete reference for all error codes defined by the Open Service Protocol. Every error response follows the standard format described in [Section 3.5 of the spec](../spec/osp-v1.0.md).

## Error Response Format

All OSP error responses use this structure:

```json
{
  "error": {
    "code": "<error_code>",
    "message": "Human-readable description of what went wrong.",
    "details": {},
    "retryable": true,
    "retry_after_seconds": 30
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | REQUIRED | Machine-readable error code from the table below |
| `message` | `string` | REQUIRED | Human-readable error message |
| `details` | `object` | OPTIONAL | Additional error context (provider-specific) |
| `retryable` | `boolean` | REQUIRED | Whether the agent SHOULD retry the request |
| `retry_after_seconds` | `integer` | OPTIONAL | Suggested wait time before retrying |

---

## Error Codes

### Provisioning Errors

#### `invalid_offering`

| | |
|---|---|
| **HTTP Status** | `400 Bad Request` |
| **Description** | The specified `offering_id` does not exist in the provider's manifest. |
| **Retryable** | No |
| **Agent Action** | Re-fetch the provider manifest and verify the `offering_id`. The offering may have been deprecated or renamed. |

```json
{
  "error": {
    "code": "invalid_offering",
    "message": "Unknown offering_id: supabase/redis",
    "details": {
      "available_offerings": ["supabase/postgres", "supabase/auth", "supabase/storage"]
    },
    "retryable": false
  }
}
```

---

#### `invalid_tier`

| | |
|---|---|
| **HTTP Status** | `400 Bad Request` |
| **Description** | The specified `tier_id` does not exist within the offering. |
| **Retryable** | No |
| **Agent Action** | Check the offering's `tiers` array in the manifest for valid tier IDs. |

```json
{
  "error": {
    "code": "invalid_tier",
    "message": "Tier 'ultra' does not exist for offering supabase/postgres",
    "details": {
      "available_tiers": ["free", "pro", "team", "enterprise"]
    },
    "retryable": false
  }
}
```

---

#### `invalid_region`

| | |
|---|---|
| **HTTP Status** | `400 Bad Request` |
| **Description** | The specified region is not available for this offering. |
| **Retryable** | No |
| **Agent Action** | Check the offering's `regions` array in the manifest for available regions. Choose a different region or omit to let the provider select. |

```json
{
  "error": {
    "code": "invalid_region",
    "message": "Region 'ap-northeast-1' is not available for supabase/postgres",
    "details": {
      "available_regions": ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]
    },
    "retryable": false
  }
}
```

---

#### `invalid_configuration`

| | |
|---|---|
| **HTTP Status** | `400 Bad Request` |
| **Description** | The `configuration` object does not match the offering's `configuration_schema`. |
| **Retryable** | No |
| **Agent Action** | Validate the configuration against the offering's `configuration_schema` before sending. Fix the invalid fields and retry. |

```json
{
  "error": {
    "code": "invalid_configuration",
    "message": "Invalid configuration: 'postgres_version' must be one of [15, 16, 17]",
    "details": {
      "validation_errors": [
        {"field": "postgres_version", "error": "Value '14' is not in the allowed set"}
      ]
    },
    "retryable": false
  }
}
```

---

#### `invalid_config`

| | |
|---|---|
| **HTTP Status** | `400 Bad Request` |
| **Description** | Alias for `invalid_configuration` used in some provider implementations. The configuration parameters are invalid or incompatible. |
| **Retryable** | No |
| **Agent Action** | Same as `invalid_configuration` -- validate against the offering's `configuration_schema`. |

```json
{
  "error": {
    "code": "invalid_config",
    "message": "Configuration parameter 'enable_pooling' requires tier 'pro' or higher",
    "details": {
      "field": "enable_pooling",
      "requires_tier": "pro"
    },
    "retryable": false
  }
}
```

---

#### `offering_unavailable`

| | |
|---|---|
| **HTTP Status** | `503 Service Unavailable` |
| **Description** | The offering exists but is temporarily unavailable (e.g., maintenance, capacity issues in all regions). |
| **Retryable** | Yes |
| **Agent Action** | Wait for `retry_after_seconds` and retry. If persistent, check the provider's status page or try a different offering. |

```json
{
  "error": {
    "code": "offering_unavailable",
    "message": "supabase/postgres is temporarily unavailable due to scheduled maintenance",
    "details": {
      "maintenance_window_end": "2026-03-29T06:00:00Z",
      "status_page": "https://status.supabase.com"
    },
    "retryable": true,
    "retry_after_seconds": 3600
  }
}
```

---

### Payment Errors

#### `payment_required`

| | |
|---|---|
| **HTTP Status** | `402 Payment Required` |
| **Description** | Payment proof is missing or invalid for a paid tier. |
| **Retryable** | Yes (after providing valid payment) |
| **Agent Action** | Include a valid `payment_method` and `payment_proof` in the request. Check the tier's `accepted_payment_methods`. |

```json
{
  "error": {
    "code": "payment_required",
    "message": "Tier 'pro' requires payment. Accepted methods: sardis_wallet, stripe_spt",
    "details": {
      "tier_id": "pro",
      "price": {"amount": "25.00", "currency": "USD", "interval": "P1M"},
      "accepted_payment_methods": ["sardis_wallet", "stripe_spt"]
    },
    "retryable": true,
    "retry_after_seconds": 0
  }
}
```

---

#### `payment_declined`

| | |
|---|---|
| **HTTP Status** | `402 Payment Required` |
| **Description** | The payment method was declined by the payment processor. |
| **Retryable** | Yes (with a different payment method) |
| **Agent Action** | Check the payment method details. Try a different payment method or contact the payment provider. |

```json
{
  "error": {
    "code": "payment_declined",
    "message": "The Stripe payment token was declined. Please check your payment method.",
    "details": {
      "stripe_error_code": "card_declined",
      "decline_code": "insufficient_funds"
    },
    "retryable": true,
    "retry_after_seconds": 0
  }
}
```

---

#### `payment_failed`

| | |
|---|---|
| **HTTP Status** | `402 Payment Required` |
| **Description** | The payment processing failed due to a technical error (distinct from a decline). |
| **Retryable** | Yes |
| **Agent Action** | Retry after a short delay. If persistent, try a different payment method. |

```json
{
  "error": {
    "code": "payment_failed",
    "message": "Payment processing failed due to a temporary error with the payment provider",
    "details": {
      "payment_method": "stripe_spt",
      "processor_error": "timeout"
    },
    "retryable": true,
    "retry_after_seconds": 30
  }
}
```

---

#### `insufficient_funds`

| | |
|---|---|
| **HTTP Status** | `402 Payment Required` |
| **Description** | The payment method has insufficient funds to cover the cost. |
| **Retryable** | Yes (after adding funds) |
| **Agent Action** | Add funds to the payment method or switch to a different one. |

```json
{
  "error": {
    "code": "insufficient_funds",
    "message": "Sardis wallet has insufficient balance. Required: $25.00, Available: $12.30",
    "details": {
      "required_amount": "25.00",
      "available_amount": "12.30",
      "currency": "USD"
    },
    "retryable": true,
    "retry_after_seconds": 0
  }
}
```

---

#### `budget_exceeded`

| | |
|---|---|
| **HTTP Status** | `402 Payment Required` (soft_block) or `403 Forbidden` (hard_block) |
| **Description** | The provisioning request would exceed the organization's budget guardrails. |
| **Retryable** | Yes (for `soft_block` with `budget_override`), No (for `hard_block`) |
| **Agent Action** | For `soft_block`, retry with `"budget_override": true` if the principal approves. For `hard_block`, request a budget increase from the principal. |

```json
{
  "error": {
    "code": "budget_exceeded",
    "message": "Provisioning supabase/managed-postgres (pro, $25.00/mo) would exceed the monthly budget for proj_my-saas ($200.00 limit, $189.50 current spend).",
    "details": {
      "budget_id": "budget_abc123",
      "limit": "200.00",
      "current_spend": "189.50",
      "requested_cost": "25.00",
      "projected_spend": "214.50",
      "enforcement": "soft_block",
      "override_available": true
    },
    "retryable": true,
    "retry_after_seconds": 0
  }
}
```

---

#### `approval_required`

| | |
|---|---|
| **HTTP Status** | `403 Forbidden` |
| **Description** | The request is valid, but execution is paused behind a human approval gate. |
| **Retryable** | Yes (after approval is granted) |
| **Agent Action** | Surface the approval context to the principal. Preserve the same logical operation, wait for approval, then resume using the provided `approval_url` or `poll_url`. |

```json
{
  "error": {
    "code": "approval_required",
    "message": "Provisioning supabase/managed-postgres (pro) requires finance approval before execution.",
    "details": {
      "gate_id": "gate_cost_001",
      "gate_name": "High-Cost Provisioning",
      "approval_url": "https://approvals.acme.com/gates/gate_cost_001/review",
      "poll_url": "/osp/v1/gates/gate_cost_001/status",
      "timeout_at": "2026-03-31T18:30:00Z",
      "requires_approval": true
    },
    "retryable": true,
    "retry_after_seconds": 0
  }
}
```

---

### Authentication and Authorization Errors

#### `trust_tier_insufficient`

| | |
|---|---|
| **HTTP Status** | `403 Forbidden` |
| **Description** | The agent's trust tier does not meet the minimum requirement for the offering. |
| **Retryable** | No (not without upgrading trust tier) |
| **Agent Action** | Check the offering's `trust_tier_required` field. Upgrade the agent's trust tier through TAP or equivalent identity system. |

```json
{
  "error": {
    "code": "trust_tier_insufficient",
    "message": "This offering requires trust tier 'verified' but agent has 'basic'",
    "details": {
      "required_tier": "verified",
      "agent_tier": "basic",
      "upgrade_url": "https://tap.example.com/upgrade"
    },
    "retryable": false
  }
}
```

---

#### `attestation_revoked`

| | |
|---|---|
| **HTTP Status** | `403 Forbidden` |
| **Description** | The agent's attestation token has been revoked, typically due to a key compromise. |
| **Retryable** | No (not with the same attestation) |
| **Agent Action** | Obtain a new attestation token from the identity provider. If the agent's private key was compromised, generate a new key pair first. |

```json
{
  "error": {
    "code": "attestation_revoked",
    "message": "Agent attestation has been revoked. Please obtain a new attestation.",
    "details": {
      "revoked_at": "2026-03-28T10:00:00Z",
      "reason": "key_compromise"
    },
    "retryable": false
  }
}
```

---

#### `delegation_unauthorized`

| | |
|---|---|
| **HTTP Status** | `403 Forbidden` |
| **Description** | The agent is not authorized to perform the delegated operation, or the delegation token is invalid. |
| **Retryable** | No |
| **Agent Action** | Verify the delegation token is valid and has the required permissions. Request a new delegation from the resource owner if needed. |

```json
{
  "error": {
    "code": "delegation_unauthorized",
    "message": "Delegation token does not grant 'rotate' permission on this resource",
    "details": {
      "required_permission": "rotate",
      "granted_permissions": ["read", "monitor"]
    },
    "retryable": false
  }
}
```

---

#### `delegation_depth_exceeded`

| | |
|---|---|
| **HTTP Status** | `400 Bad Request` |
| **Description** | The agent-to-agent delegation chain exceeds the maximum depth of 5 levels. |
| **Retryable** | No |
| **Agent Action** | Reduce the delegation chain depth. Have a higher-level agent perform the operation directly instead of further delegating. |

```json
{
  "error": {
    "code": "delegation_depth_exceeded",
    "message": "Delegation chain depth (6) exceeds maximum allowed depth (5)",
    "details": {
      "current_depth": 6,
      "max_depth": 5
    },
    "retryable": false
  }
}
```

---

#### `nhi_federation_failed`

| | |
|---|---|
| **HTTP Status** | `401 Unauthorized` |
| **Description** | Non-human identity federation failed -- the federated identity token could not be validated. |
| **Retryable** | Yes (with a fresh token) |
| **Agent Action** | Obtain a fresh identity token from the identity provider. Verify the issuer is in the provider's trusted issuers list. Check that `aud`, `iss`, and `exp` claims are correct. |

```json
{
  "error": {
    "code": "nhi_federation_failed",
    "message": "OIDC token validation failed: issuer 'https://untrusted.example.com' is not in the trusted issuers list",
    "details": {
      "method": "oidc",
      "issuer": "https://untrusted.example.com",
      "trusted_issuers": [
        "https://accounts.google.com",
        "https://token.actions.githubusercontent.com"
      ]
    },
    "retryable": true,
    "retry_after_seconds": 0
  }
}
```

---

### Rate Limiting and Quota Errors

#### `rate_limit_exceeded`

| | |
|---|---|
| **HTTP Status** | `429 Too Many Requests` |
| **Description** | Too many requests. The agent has exceeded the rate limit for this endpoint. |
| **Retryable** | Yes |
| **Agent Action** | Read the `Retry-After` header and wait before retrying. Also check `RateLimit-Remaining` and `RateLimit-Reset` headers to adjust request frequency. |

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded: 10 requests per minute for POST /provision",
    "details": {
      "limit": 10,
      "window": "1m",
      "retry_after_seconds": 45
    },
    "retryable": true,
    "retry_after_seconds": 45
  }
}
```

---

#### `quota_exceeded`

| | |
|---|---|
| **HTTP Status** | `429 Too Many Requests` |
| **Description** | The principal has exceeded their quota for this offering (e.g., maximum number of free-tier resources). |
| **Retryable** | No (not without deprovisioning or upgrading) |
| **Agent Action** | Deprovision unused resources or upgrade the account to increase quotas. |

```json
{
  "error": {
    "code": "quota_exceeded",
    "message": "Maximum 3 free-tier databases per principal. Currently using 3.",
    "details": {
      "quota_type": "free_tier_resources",
      "limit": 3,
      "current": 3,
      "offering_id": "supabase/postgres"
    },
    "retryable": false
  }
}
```

---

### Replay and Idempotency Errors

#### `nonce_reused`

| | |
|---|---|
| **HTTP Status** | `409 Conflict` |
| **Description** | The nonce has already been used. This indicates a potential replay attack or a programming error. |
| **Retryable** | Yes (with a new nonce) |
| **Agent Action** | Generate a new UUID v4 nonce and retry. Each request MUST have a unique nonce. If using `idempotency_key` for safe retries, keep the same idempotency key but use a new nonce. |

```json
{
  "error": {
    "code": "nonce_reused",
    "message": "Nonce 'f47ac10b-58cc-4372-a567-0e02b2c3d479' has already been used",
    "details": {
      "original_request_at": "2026-03-28T10:00:00Z"
    },
    "retryable": true,
    "retry_after_seconds": 0
  }
}
```

---

### Availability Errors

#### `region_unavailable`

| | |
|---|---|
| **HTTP Status** | `503 Service Unavailable` |
| **Description** | The requested region is temporarily unavailable. |
| **Retryable** | Yes |
| **Agent Action** | Wait for `retry_after_seconds` and retry. Alternatively, try a different region. |

```json
{
  "error": {
    "code": "region_unavailable",
    "message": "Region 'us-east-1' is temporarily unavailable due to capacity constraints",
    "details": {
      "region": "us-east-1",
      "alternative_regions": ["us-west-2", "eu-west-1"],
      "estimated_recovery": "2026-03-29T02:00:00Z"
    },
    "retryable": true,
    "retry_after_seconds": 300
  }
}
```

---

#### `capacity_exhausted`

| | |
|---|---|
| **HTTP Status** | `503 Service Unavailable` |
| **Description** | The provider has no available capacity to provision new resources. |
| **Retryable** | Yes |
| **Agent Action** | Wait for `retry_after_seconds` and retry. Consider trying a different region or a different provider. |

```json
{
  "error": {
    "code": "capacity_exhausted",
    "message": "No available capacity for dedicated PostgreSQL instances in us-east-1",
    "details": {
      "offering_id": "supabase/postgres",
      "tier_id": "enterprise",
      "region": "us-east-1",
      "alternative_regions": ["eu-west-1"]
    },
    "retryable": true,
    "retry_after_seconds": 600
  }
}
```

---

### Provider Errors

#### `provider_error`

| | |
|---|---|
| **HTTP Status** | `500 Internal Server Error` |
| **Description** | An internal provider error occurred. |
| **Retryable** | Yes |
| **Agent Action** | Retry with exponential backoff. If persistent, check the provider's status page or contact support. |

```json
{
  "error": {
    "code": "provider_error",
    "message": "An internal error occurred while provisioning the database",
    "details": {
      "request_id": "req_abc123",
      "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736"
    },
    "retryable": true,
    "retry_after_seconds": 10
  }
}
```

---

### Version Errors

#### `version_not_supported`

| | |
|---|---|
| **HTTP Status** | `406 Not Acceptable` |
| **Description** | The OSP version requested by the agent is not supported by the provider. |
| **Retryable** | No (not with the same version) |
| **Agent Action** | Check the `supported_versions` array in the response and switch to a supported version. |

```json
{
  "error": {
    "code": "version_not_supported",
    "message": "OSP version 1.0 is not supported",
    "supported_versions": ["1.1", "2.0"],
    "recommended_version": "1.1"
  }
}
```

---

## HTTP Status Code to Error Code Mapping

For quick reference, here is the complete mapping from HTTP status codes to their associated error codes:

| HTTP Status | Error Codes |
|-------------|-------------|
| `400 Bad Request` | `invalid_offering`, `invalid_tier`, `invalid_region`, `invalid_configuration`, `invalid_config`, `delegation_depth_exceeded` |
| `401 Unauthorized` | `nhi_federation_failed` |
| `402 Payment Required` | `payment_required`, `payment_declined`, `payment_failed`, `insufficient_funds`, `budget_exceeded` (soft_block) |
| `403 Forbidden` | `trust_tier_insufficient`, `attestation_revoked`, `delegation_unauthorized`, `budget_exceeded` (hard_block) |
| `406 Not Acceptable` | `version_not_supported` |
| `409 Conflict` | `nonce_reused` |
| `429 Too Many Requests` | `rate_limit_exceeded`, `quota_exceeded` |
| `500 Internal Server Error` | `provider_error` |
| `503 Service Unavailable` | `region_unavailable`, `capacity_exhausted`, `offering_unavailable` |

## Retry Decision Tree

When your agent receives an error, use this decision tree:

1. Check `retryable` field. If `false`, do not retry.
2. If `retryable` is `true`, check `retry_after_seconds`. If present, wait that long.
3. If no `retry_after_seconds`, check the `Retry-After` HTTP header.
4. If neither is present, use exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 retries).
5. Always generate a new `nonce` for retry requests.
6. Keep the same `idempotency_key` across retries of the same logical operation.

## Further Reading

- [Protocol Specification](../spec/osp-v1.0.md) -- Full error semantics in Sections 3.5, 6.1, and 8.6
- [Provider Guide](for-providers.md) -- How to implement error responses
- [Agent Guide](for-agents.md) -- How to handle errors in your agent
