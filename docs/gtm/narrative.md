# The Paid Provisioning Narrative

## Positioning

**OSP + Sardis** is not a bundle of APIs. It is a new category:
**safe paid agent provisioning**.

## The Problem

AI agents can discover and provision infrastructure. But without guardrails:
- Agents can spend without limits
- No approval workflow for costly resources
- No escrow for high-value provisioning
- No audit trail for compliance
- No standard for providers to accept agent payments

## The Solution

**OSP** is the open standard for how agents talk to providers.
**Sardis** is the payment, approval, and audit layer that makes it safe.

Together: agents can provision real infrastructure with real money,
within real guardrails.

## Three-Layer Architecture

| Layer | Role | Example |
|-------|------|---------|
| Protocol (OSP) | Standard discovery, provisioning, lifecycle | `POST /osp/v1/provision` |
| Payment Rail (Sardis) | Mandates, escrow, approval, audit | `sardis_wallet` proof |
| Developer Workflow (better) | CLI, CI, env generation | `better provision neon/db-postgres` |

## Category Narrative (One-Pager)

> "AI agents are provisioning cloud infrastructure. Without OSP + Sardis,
> this means uncontrolled spend, no approval flows, and no audit trail.
>
> OSP standardizes how agents discover and provision services.
> Sardis adds the payment rail with spending mandates, escrow,
> approval gates, and full audit trail.
>
> For providers: one integration, all agent platforms.
> For agent platforms: safe paid tooling.
> For enterprises: budget caps, approvals, and compliance."
