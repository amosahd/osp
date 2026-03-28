# Show HN: OSP – Open standard for AI agents to provision developer services

OSP (Open Service Protocol) is an open standard that lets AI agents discover, provision, and manage developer services like databases, hosting, auth, and analytics — without browser signup flows or proprietary APIs.

**The problem:** AI agents (Claude, GPT, etc.) increasingly need to spin up infrastructure autonomously. But every provider has its own onboarding: browsers, CAPTCHAs, email verification. Stripe Projects (launched last week) solves this but locks you into one payment rail and an invite-only ecosystem.

**What OSP does:**

1. Providers publish a `ServiceManifest` at `/.well-known/osp.json` describing their offerings
2. Agents discover services, provision resources, and receive Ed25519-encrypted credentials
3. Any payment rail works (Stripe, crypto, free tier — OSP doesn't touch the money)
4. Standard endpoints for the full lifecycle: rotate, upgrade, deprovision, health checks

**What we built:**

- Protocol spec: ~9,600 lines covering discovery, provisioning, security, billing, A2A delegation, FinOps, observability
- Rust core: 8 crates (crypto, manifest, vault, CLI, provider adapters, registry, conformance)
- 4 SDKs: TypeScript (with MCP tools for Claude/GPT), Python (async + FastAPI/Django), Go, Rust
- Provider skills for 10 services (Supabase, Neon, Vercel, Clerk, Upstash, Resend, Cloudflare, PostHog, Turso, Railway)
- 497 tests, all passing

**Quick example:**

```
$ osp discover supabase.com
Provider: Supabase — 4 offerings (postgres, auth, storage, realtime)

$ osp provision supabase/postgres --tier free --project my-app
✓ Provisioned. Credentials stored in vault.

$ osp env --framework nextjs
✓ .env.local written (4 variables)
```

**Key design decisions:**

- Payment-rail agnostic (unlike Stripe Projects)
- Self-registration (unlike Stripe Projects' invite-only)
- Ed25519 for all crypto (signatures + credential encryption)
- Short-lived tokens instead of static API keys
- OpenTelemetry-compatible tracing on every operation

Apache 2.0. No gatekeeping.

GitHub: https://github.com/EfeDurmaz16/osp
Spec: https://github.com/EfeDurmaz16/osp/blob/main/spec/osp-v1.0.md

We're looking for: feedback on the protocol, early provider adopters, and anyone interested in contributing.
