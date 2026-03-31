# Canonical Provisioning Flow Examples

This document defines the normative request-response sequences for free, paid, and escrow-backed provisioning. Implementers MUST support the free flow. Providers claiming **Paid Core** conformance MUST also support the paid flow. Escrow-backed flow is OPTIONAL.

## Free Provisioning

```
Agent                          Provider
  |                               |
  |-- POST /osp/v1/provision ---->|
  |   { offering, tier: "free" }  |
  |                               |
  |<-- 200 OK -------------------|
  |   { resource_id, credentials, |
  |     status: "active" }        |
```

**Request:**
```json
{
  "offering_id": "db-postgres",
  "tier_id": "free",
  "payment_method": "free",
  "idempotency_key": "ik_abc123",
  "nonce": "n_001"
}
```

**Response:**
```json
{
  "resource_id": "res_xyz",
  "status": "active",
  "credentials": {
    "connection_string": "postgres://...",
    "api_key": "sk_..."
  }
}
```

## Paid Provisioning (Non-Escrow)

```
Agent                          Sardis          Provider
  |                               |               |
  |-- create mandate ----------->|               |
  |<-- mandate_id ---------------|               |
  |                               |               |
  |-- POST /osp/v1/estimate ------------------->|
  |<-- { cost, payment_methods } ---------------|
  |                               |               |
  |-- create proof (mandate) ---->|               |
  |<-- payment_proof ------------|               |
  |                               |               |
  |-- POST /osp/v1/provision ------------------->|
  |   { payment_method: "sardis_wallet",         |
  |     payment_proof: { ... } }                 |
  |                               |               |
  |<-- 200 OK ----------------------------------|
  |   { resource_id, credentials, status }       |
```

**Estimate Request:**
```json
{
  "offering_id": "db-postgres",
  "tier_id": "pro"
}
```

**Estimate Response:**
```json
{
  "offering_id": "db-postgres",
  "tier_id": "pro",
  "cost": {
    "amount": "29.00",
    "currency": "USD",
    "interval": "month"
  },
  "accepted_payment_methods": ["sardis_wallet", "stripe_spt"],
  "escrow_required": false
}
```

**Provision Request:**
```json
{
  "offering_id": "db-postgres",
  "tier_id": "pro",
  "payment_method": "sardis_wallet",
  "payment_proof": {
    "version": "1",
    "mandate_id": "mnd_abc",
    "amount": "29.00",
    "currency": "USD",
    "provider_id": "prv_neon",
    "offering_id": "db-postgres",
    "tier_id": "pro",
    "signature": "ed25519:...",
    "expires_at": "2025-04-01T00:00:00Z"
  },
  "idempotency_key": "ik_def456",
  "nonce": "n_002"
}
```

**Provision Response:**
```json
{
  "resource_id": "res_abc",
  "status": "active",
  "credentials": {
    "connection_string": "postgres://..."
  },
  "payment": {
    "settled": true,
    "amount": "29.00",
    "currency": "USD"
  }
}
```

## Paid Provisioning (Escrow-Backed)

```
Agent                          Sardis          Provider
  |                               |               |
  |-- POST /osp/v1/estimate ------------------->|
  |<-- { escrow_required: true } ---------------|
  |                               |               |
  |-- create mandate ----------->|               |
  |-- create escrow hold ------->|               |
  |<-- { escrow_id, hold_id } ---|               |
  |                               |               |
  |-- POST /osp/v1/provision ------------------->|
  |   { payment_method: "sardis_wallet",         |
  |     payment_proof: { escrow_id, ... } }      |
  |                               |               |
  |<-- 202 Accepted ----------------------------|
  |   { resource_id, status: "provisioning",     |
  |     escrow_id }                              |
  |                               |               |
  | ... provider sets up resource ...            |
  |                               |               |
  |<-- webhook: status: "active" ---------------|
  |                               |               |
  |                  Provider --> release escrow  |
  |                               |               |
```

**Escrow Provision Request:**
```json
{
  "offering_id": "ml-inference",
  "tier_id": "gpu-pro",
  "payment_method": "sardis_wallet",
  "payment_proof": {
    "version": "1",
    "mandate_id": "mnd_xyz",
    "escrow_id": "esc_001",
    "amount": "199.00",
    "currency": "USD",
    "provider_id": "prv_replicate",
    "offering_id": "ml-inference",
    "tier_id": "gpu-pro",
    "signature": "ed25519:...",
    "expires_at": "2025-04-01T00:00:00Z"
  },
  "idempotency_key": "ik_ghi789",
  "nonce": "n_003"
}
```

**Async Response (202):**
```json
{
  "resource_id": "res_ml1",
  "status": "provisioning",
  "escrow_id": "esc_001",
  "poll_url": "/osp/v1/resources/res_ml1/status",
  "estimated_ready_at": "2025-03-31T12:05:00Z"
}
```

## Approval-Required Flow

When a paid provision exceeds policy thresholds, the provider or Sardis returns an approval gate:

```json
{
  "status": "approval_required",
  "approval": {
    "reason": "Amount exceeds per-provision limit",
    "threshold": "100.00",
    "requested": "199.00",
    "currency": "USD",
    "approver_hint": "admin@company.com",
    "resume_token": "apr_tok_xyz"
  }
}
```

The agent MUST surface this to the controlling principal. After approval, the agent resumes with:

```json
{
  "offering_id": "ml-inference",
  "tier_id": "gpu-pro",
  "payment_method": "sardis_wallet",
  "payment_proof": { "..." },
  "approval_token": "apr_tok_xyz",
  "idempotency_key": "ik_ghi789",
  "nonce": "n_004"
}
```

## Error Examples

**Invalid proof:**
```json
{
  "error": {
    "code": "payment_declined",
    "message": "Payment proof signature verification failed",
    "retryable": false
  }
}
```

**Budget exceeded:**
```json
{
  "error": {
    "code": "budget_exceeded",
    "message": "Mandate budget exhausted",
    "retryable": false,
    "details": {
      "remaining": "5.00",
      "requested": "29.00",
      "currency": "USD"
    }
  }
}
```

**Provision timeout:**
```json
{
  "error": {
    "code": "provision_timeout",
    "message": "Provider did not complete setup within the declared window",
    "retryable": true,
    "refund_eligible": true,
    "escrow_id": "esc_001"
  }
}
```
