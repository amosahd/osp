# Appendix G: Provider Integration Priority

> Extracted from the [OSP v1.0 specification](../spec/osp-v1.0.md) as provider API capabilities change frequently.

Based on API capability analysis, providers are ranked by automation feasibility:

## Tier 1 — Fully Automatable, Instant Provisioning

These providers return full credentials in the API response and provision in under 5 seconds. RECOMMENDED for first OSP integrations.

| Provider | Offering | API | OAuth | Credentials in Response | Provision Time |
|----------|----------|-----|-------|------------------------|----------------|
| Neon | Serverless PostgreSQL | REST + TypeScript SDK | YES (+ Claimable Postgres) | Connection strings, role credentials | <1 second |
| Upstash | Serverless Redis | REST | No (Basic Auth) | Endpoint, password, REST tokens | Instant |
| Turso | Distributed SQLite | REST + TypeScript SDK | No (Bearer) | Hostname + auth token endpoint | Instant |
| Resend | Transactional Email | REST | No (Bearer) | API key token | Instant |

## Tier 2 — Fully Automatable, Minor Friction

Good APIs but with some additional steps (OAuth, delayed credentials, or multi-step flows).

| Provider | Offering | API | OAuth | Notes |
|----------|----------|-----|-------|-------|
| Supabase | Managed PostgreSQL + Auth + Storage | REST Management API | YES (+ project claim) | 30s-3min provision. Full "Platforms" support. |
| Vercel | Serverless Hosting | REST v11 | YES | Instant creation. Env vars via separate API call. |
| Railway | App Hosting + Postgres | GraphQL | YES | Token type confusion (personal/workspace/project). |
| PlanetScale | MySQL | REST | YES | Connection strings per branch. Deploy request workflow. |
| PostHog | Product Analytics | REST | YES | Project API key returned. Broad personal API keys. |

## Tier 3 — Partial Automation

Significant manual steps remain. OSP adapters can automate what's possible and guide users through the rest.

| Provider | What's Automatable | What Requires UI | Pain Points |
|----------|-------------------|-----------------|-------------|
| Stripe | Connected account creation (Connect) | Standalone account + API keys | OAuth deprecated, KYC takes days |
| Cloudflare | Worker deployment, KV/D1/R2 creation | API token creation | Confusing permission scoping |
| Clerk | User/org management within app | Application instance creation | No programmatic app creation |
| Firebase | Add Firebase to GCP project | GCP project creation | Complex IAM, async operations |

## Tier 4 — Manual with Guidance

These providers cannot be automated. OSP provides deep links and step-by-step guidance.

| Provider | Why Not Automatable | OSP Approach |
|----------|-------------------|-------------|
| Coinbase | No provisioning API, 48-hour key activation delay | Deep link to CDP portal + guidance + credential import after manual creation |
| OpenAI | No API for creating API keys | Deep link + clipboard integration |
| AWS | Account creation requires human verification | Assume account exists, automate resource creation via SDK |
