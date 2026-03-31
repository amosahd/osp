# Enterprise Governance

## Organization-Level Policies

### Provider Allowlists and Denylists

```json
{
  "policy_id": "pol_org_001",
  "type": "provider_access",
  "allowlist": ["prv_neon", "prv_supabase", "prv_clerk"],
  "denylist": ["prv_untrusted"],
  "mode": "allowlist_only"
}
```

When `mode` is `allowlist_only`, only providers in the allowlist can be provisioned. When `mode` is `denylist_only`, all providers except those in the denylist are allowed.

### Spend Caps by Environment

```json
{
  "policy_id": "pol_spend_001",
  "type": "spend_cap",
  "caps": {
    "development": {"max_monthly": "100.00", "currency": "USD"},
    "staging": {"max_monthly": "500.00", "currency": "USD"},
    "production": {"max_monthly": "5000.00", "currency": "USD"}
  },
  "enforcement": "hard"
}
```

### Fail-Closed Behavior

When a paid provision request is rejected by policy:

1. Return `policy_violation` error with specific reason
2. Log the attempt with full context
3. Do NOT fall back to a different tier or provider
4. Notify the policy administrator

## Approval Workflow Engine

### Threshold-Based Rules

```json
{
  "rule_id": "apr_001",
  "trigger": "amount_threshold",
  "threshold": "100.00",
  "currency": "USD",
  "approvers": ["admin@company.com"],
  "timeout_hours": 24,
  "auto_deny_on_timeout": true
}
```

### Approver Callback Interface

```
POST /approvals/callback
{
  "approval_id": "apr_req_001",
  "decision": "approved",
  "approver": "admin@company.com",
  "reason": "Approved for Q2 budget",
  "decided_at": "2025-04-01T10:00:00Z"
}
```

### Audit Trail

Every approval decision is logged:
- Who requested, who approved/denied
- Threshold that triggered the approval
- Time to decision
- Policy rule that matched

## End-to-End Observability

### Instrumented Paths

| Path | Metrics |
|------|---------|
| Discovery | search_count, search_latency_ms, results_returned |
| Estimate | estimate_count, estimate_latency_ms, cost_range |
| Provision | provision_count, success_rate, latency_p50/p95/p99 |
| Settlement | settlement_count, time_to_settle_ms, failed_rate |
| Rotate | rotation_count, rotation_latency_ms |
| Deprovision | deprovision_count, cleanup_success_rate |

### Correlation IDs

Every operation gets a correlation ID that propagates through:
- OSP MCP tool invocation
- Sardis mandate/escrow/ledger
- Provider webhook callbacks
- Audit log entries

## SLOs and Alerting

### Defined SLOs

| Path | SLO | Window |
|------|-----|--------|
| Free provision latency | p95 < 5s | 30 days |
| Paid provision latency | p95 < 10s | 30 days |
| Estimate latency | p95 < 2s | 30 days |
| Provision success rate | > 99% | 7 days |
| Settlement completion | > 99.9% | 30 days |

### Alert Conditions

- Timeout spike: >5% of provisions timing out in 1 hour
- Proof failure spike: >10% of paid provisions failing proof in 1 hour
- Orphan resources: any resource provisioned >24h without escrow settlement
- Error budget: <10% remaining in current window

## Reconciliation and Drift Detection

### Payment-Resource Mismatches
- Mandate consumed but no active resource
- Resource active but escrow not settled
- Charge settled but resource deprovisioned

### Env Drift
- Vault credentials older than rotation policy
- .env files referencing rotated credentials
- Environment config diverged from vault state

### Repair Suggestions
- For stale credentials: suggest `better rotate`
- For orphan escrows: suggest manual release/refund
- For env drift: suggest `better env generate`

## Incident Runbooks

### Provider Outage
1. Detect via health check failure
2. Pause new provisions to affected provider
3. Alert operators
4. Auto-retry pending async provisions when restored

### Wallet/Payment Outage
1. Detect via Sardis API failure
2. Queue paid provision requests
3. Allow free provisions to continue
4. Process queue when restored

### Registry Outage
1. Fall back to curated provider pack
2. Log fallback activation
3. Alert operators
4. Resume normal discovery when restored

## Chaos Testing

### Scenarios
- Provider returns 500 on provision
- Sardis returns timeout on mandate creation
- Registry returns stale data
- Webhook delivery fails
- Escrow timeout before provision completes

### Execution
- Run in staging environment only
- Scheduled weekly
- Results tracked over time for trend detection
