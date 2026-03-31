# better provision — Command Spec

## Synopsis

```
better provision <provider>/<offering> [--tier <tier>] [--project <name>] [--payment <method>] [--json]
```

## Description

Provision a service resource from an OSP provider. Handles free and paid
flows, async polling, and credential storage in the local vault.

## Flow

1. Resolve provider URL from registry or direct URL
2. Fetch manifest and validate offering/tier combination
3. If paid: run estimate, require payment proof
4. Send provision request
5. If async (202): poll until active
6. Store credentials in local vault
7. Generate .env entries if applicable

## Free Provision

```
$ better provision neon/db-postgres --tier free --project my-app
✓ Provisioned neon/db-postgres (free) → res_abc123
  Credentials stored in vault
  Run `better env generate` to create .env
```

## Paid Provision

```
$ better provision neon/db-postgres --tier pro --project my-app --payment sardis_wallet
  Estimated cost: $29.00/month (USD)
  Payment method: sardis_wallet
  Confirm? [y/N] y
✓ Provisioned neon/db-postgres (pro) → res_def456
  Payment settled: $29.00 USD
  Credentials stored in vault
```

## OSP API Calls

1. `GET /.well-known/osp.json` — fetch manifest
2. `POST /osp/v1/estimate` — get cost estimate
3. `POST /osp/v1/provision` — provision resource
4. `GET /osp/v1/resources/{id}/status` — poll if async

## Validation

- Provider must exist in registry or be reachable
- Offering ID must match manifest
- Tier ID must match offering
- Payment method must be accepted by tier
- Payment proof required for non-free tiers

## Async Polling

When provider returns 202 Accepted:
- Poll status endpoint every 2 seconds
- Max 30 poll attempts (configurable with --timeout)
- Show progress spinner in human mode
- Return structured status in JSON mode
