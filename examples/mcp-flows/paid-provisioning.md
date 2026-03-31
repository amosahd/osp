# MCP Paid Provisioning Flow Examples

## Free Tier Provisioning

```json
// Tool: osp_estimate
{"provider_url": "https://neon.tech", "offering_id": "db-postgres", "tier_id": "free"}

// Response
{
  "offering_id": "db-postgres",
  "tier_id": "free",
  "cost": {"amount": "0.00", "currency": "USD"},
  "accepted_payment_methods": ["free"],
  "escrow_required": false,
  "_trace": {"correlation_id": "osp_abc123", "tool": "osp_estimate"}
}

// Tool: osp_provision
{"provider_url": "https://neon.tech", "offering_id": "db-postgres", "tier_id": "free", "project_name": "my-app"}

// Response
{
  "resource_id": "res_xyz",
  "status": "active",
  "credentials": {"connection_string": "postgres://..."},
  "_trace": {"correlation_id": "osp_def456", "tool": "osp_provision"}
}
```

## Paid Tier with Sardis Wallet

```json
// Tool: osp_estimate
{"provider_url": "https://neon.tech", "offering_id": "db-postgres", "tier_id": "pro"}

// Response
{
  "offering_id": "db-postgres",
  "tier_id": "pro",
  "cost": {"amount": "29.00", "currency": "USD", "interval": "P1M"},
  "accepted_payment_methods": ["sardis_wallet", "stripe_spt"],
  "escrow_required": false,
  "_trace": {"correlation_id": "osp_ghi789"}
}

// Tool: osp_provision (with payment proof)
{
  "provider_url": "https://neon.tech",
  "offering_id": "db-postgres",
  "tier_id": "pro",
  "project_name": "my-app-pro",
  "payment_method": "sardis_wallet",
  "payment_proof": {
    "version": "sardis-proof-v1",
    "wallet_address": "wal_abc",
    "payment_tx": "mnd_xyz",
    "amount": "29.00",
    "currency": "USD",
    "signature_material": "..."
  }
}

// Response
{
  "resource_id": "res_pro1",
  "status": "active",
  "credentials": {"connection_string": "postgres://..."},
  "payment": {"settled": true, "amount": "29.00"},
  "_trace": {"correlation_id": "osp_jkl012", "sardis_trace_id": "sardis_osp_jkl012"}
}
```

## Escrow-Backed Provisioning

```json
// Tool: osp_estimate
{"provider_url": "https://replicate.com", "offering_id": "ml-inference", "tier_id": "gpu-pro"}

// Response
{
  "offering_id": "ml-inference",
  "tier_id": "gpu-pro",
  "cost": {"amount": "199.00", "currency": "USD"},
  "accepted_payment_methods": ["sardis_wallet"],
  "escrow_required": true,
  "_trace": {"correlation_id": "osp_mno345"}
}

// Tool: osp_provision (escrow-backed)
// ... provision request with escrow proof ...

// Response (202 Accepted → async)
{
  "resource_id": "res_ml1",
  "status": "provisioning",
  "escrow_id": "esc_001",
  "poll_url": "/osp/v1/resources/res_ml1/status",
  "_trace": {"correlation_id": "osp_pqr678"}
}
```

## Approval-Required Flow

```json
// Tool: osp_provision (triggers approval gate)
// Response
{
  "status": "approval_required",
  "approval": {
    "reason": "Amount exceeds per-provision limit",
    "threshold": "100.00",
    "requested": "199.00",
    "currency": "USD",
    "approver_hint": "admin@company.com",
    "resume_token": "apr_tok_xyz"
  },
  "_trace": {"correlation_id": "osp_stu901"}
}
```

## Failure Mode: Insufficient Funds

```json
{
  "error": {
    "code": "budget_exceeded",
    "message": "Wallet balance insufficient",
    "retryable": false,
    "details": {"remaining": "5.00", "requested": "29.00"}
  },
  "_trace": {"correlation_id": "osp_vwx234"}
}
```

## Failure Mode: Invalid Proof

```json
{
  "error": {
    "code": "payment_declined",
    "message": "Payment proof signature verification failed",
    "retryable": false
  },
  "_trace": {"correlation_id": "osp_yza567"}
}
```
