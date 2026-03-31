# Registry Trust Metadata Model

## Overview

The OSP registry attaches trust metadata to every provider record. Agents use this metadata to make informed provider selection decisions.

## Trust Score Components

| Component | Weight | Source |
|-----------|--------|--------|
| Manifest signature validity | 20% | Cryptographic verification |
| Conformance level (paid-core, full) | 20% | Conformance test results |
| Provision success rate | 20% | Historical provision data |
| Uptime (30-day rolling) | 15% | Health check monitoring |
| Average provision time | 10% | Performance monitoring |
| Age and activity | 10% | Registration and update history |
| Community reports | 5% | Manual moderation signals |

## Verification Status

- `verified` — Manifest signature valid, conformance tests pass
- `pending` — Submitted but not yet reviewed
- `failed` — Signature invalid or conformance tests fail
- `expired` — Verification older than 30 days
- `unknown` — No verification data available

## Conformance Levels

- `free-core` — Supports free provisioning lifecycle
- `paid-core` — Supports paid provisioning with proof verification
- `full` — Supports all OSP features including escrow and disputes

## Registry Signing

All registry API responses are signed with the registry's Ed25519 key. Clients can verify cached or mirrored responses using the `SignedRegistryRecord` envelope.

### Freshness Rules

- Records older than 1 hour SHOULD be refreshed
- Records older than 24 hours MUST be refreshed
- Clients MUST reject records with expired signatures

### Replay Protection

Each signed record includes a monotonic `record_id`. Clients MUST reject records with `record_id` lower than the last seen value.

## Moderation Workflow

1. Provider submits manifest → status: `submitted`
2. Automated checks run → signature, schema, conformance
3. Manual review for payment-enabled providers → status: `under_review`
4. Approval → status: `approved`, optional certification badge
5. Rejection with notes → status: `rejected`
6. Ongoing monitoring → can transition to `suspended`
