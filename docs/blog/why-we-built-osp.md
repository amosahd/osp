# Why We Built OSP

*March 2026*

---

On March 26, 2026, Stripe launched Projects — their take on letting AI agents provision developer services. Within hours, we knew the ecosystem needed an open alternative.

Not because Stripe built a bad product. They didn't. But because the way they built it recreates the exact problem we've been trying to solve: proprietary protocols that lock both providers and agents into a single vendor's ecosystem.

## The Problem Nobody Had Solved

AI agents are becoming autonomous economic actors. Claude, GPT, Gemini — they don't just write code anymore. They architect systems. They decide which database to use, which auth provider fits, which hosting platform makes sense. And increasingly, they provision those services themselves.

But here's the thing: every service provider has its own signup flow. Browsers. CAPTCHAs. Email verification. Credit card forms. None of which an agent can navigate.

So we've been stuck with two bad options:

1. **Manual provisioning** — A human sets everything up, then hands credentials to the agent. Defeats the purpose.
2. **Proprietary platforms** — Stripe Projects, where agents can provision from a curated catalog, but only through Stripe's rails, with Stripe's approval process, at Stripe's timeline.

Option 2 is better than option 1. But it's still a walled garden.

## What We Wanted Instead

A world where:

- **Any provider** can make their service agent-provisionable by publishing a single JSON file
- **Any agent** can discover available services without knowing about every provider's API in advance
- **Any payment rail** can settle the transaction — Sardis, Stripe, x402, crypto, or just "free tier"
- **Credentials** are delivered encrypted, rotated automatically, and never exposed in plaintext to the agent's context window

No gatekeepers. No invite lists. No single point of control.

## The Protocol

OSP (Open Service Protocol) is the result. It's intentionally simple:

**Discovery.** Providers publish a `ServiceManifest` at `/.well-known/osp.json`. This describes what they offer, what it costs, and how to provision it. Any agent (or human) can fetch this file and understand what's available.

**Provisioning.** A single `POST /osp/v1/provision` call. The agent says what it wants, provides an Ed25519 public key, and the provider returns encrypted credentials. Synchronous for fast providers, async with webhooks for slow ones.

**Lifecycle.** Standard endpoints for everything else: rotate credentials, check status, report usage, deprovision. No provider-specific APIs to learn.

**Payment-rail agnostic.** OSP defines *what* gets provisioned, not *how* it gets paid for. Providers declare which payment methods they accept. Agents choose which to use. OSP doesn't touch the money.

## What We Built

The spec is ~9,600 lines of RFC-quality protocol definition. But specs without implementations are academic exercises. So we also built:

- **Rust core** — 8 crates handling crypto, manifest management, vault, CLI, provider adapters, registry, conformance testing, and an SDK
- **TypeScript SDK** — Production-grade client with MCP tools (so Claude and GPT can use it natively), Next.js and Vite plugins
- **Python SDK** — Async client with FastAPI and Django integrations
- **Go SDK** — Full client, provider, and crypto implementation
- **10 provider skills** — LLM-readable knowledge files for Supabase, Neon, Vercel, Clerk, Upstash, Resend, Cloudflare, PostHog, Turso, and Railway
- **Sardis integration** — Reference payment rail implementation with escrow lifecycle

577 tests across all SDKs. Everything compiles. Everything is open source under Apache 2.0.

## The v1.1 Additions

We didn't just define the basics. We looked at what's missing from every existing approach and added:

**A2A Agent Delegation.** Agent A can ask Agent B to provision on its behalf, with full delegation chain tracking. Because in a world of multi-agent systems, the agent making the decision isn't always the one doing the provisioning.

**Non-Human Identity Lifecycle.** Static API keys are a security disaster. OSP supports short-lived tokens with automatic rotation, NHI inventory tracking, and orphan detection. No more leaked keys sitting in old .env files.

**FinOps Cost-as-Code.** Budget guardrails, cost-in-PR (see the cost impact before you merge), anomaly detection, and environment TTLs with burn rate tracking. Because agents can spend money, and someone needs to control that.

**Service Dependency Graph.** Impact analysis before deprovisioning, health propagation across dependent services, auto-generated architecture documentation. Because in a world where agents create infrastructure, understanding what depends on what is critical.

**Agent Observability.** OpenTelemetry-compatible tracing for every OSP operation, structured audit logs, human-in-the-loop gates for destructive operations, cost-per-agent-action tracking.

## Why "Open"

We could have built this as a product. Charge providers a percentage. Build a marketplace. Take a cut.

We didn't, for the same reason HTTP isn't a product. The protocol layer needs to be open for the ecosystem to work. If OSP succeeds, it's because every database, every hosting platform, every auth provider, every analytics service publishes an `osp.json` file. That only happens if there's no toll booth.

OSP is maintained by [Sardis](https://sardis.sh), our company. Sardis builds the payment infrastructure that settles OSP transactions. We make money when the ecosystem grows — not by controlling the protocol.

## What's Next

1. **Provider partnerships.** We're reaching out to Neon, Upstash, Turso, and others to implement OSP natively.
2. **IETF Internet-Draft.** `draft-durmaz-osp-00` — because protocols deserve formal standardization.
3. **MCP integration.** OSP tools are already available as MCP tools. We want `.well-known/osp.json` to become part of how MCP servers advertise provisionable services.
4. **Community.** This is day one. We need feedback from providers, agent developers, and protocol designers.

The repo is at [github.com/open-service-protocol/osp](https://github.com/open-service-protocol/osp). The spec is at `spec/osp-v1.0.md`. Pull requests are welcome.

The agent economy needs open infrastructure. Let's build it together.

---

*Efe Baran Durmaz — Founder, [Sardis](https://sardis.sh)*
