# Provider Outreach Email Templates

## Template 1: Cold Outreach to Dev Tool Providers

**Subject:** Making [Provider] agent-provisionable — open standard, no lock-in

**To:** DevRel / Partnerships / CTO

---

Hi [Name],

I'm Efe, building OSP (Open Service Protocol) — an open standard for AI agents to discover and provision developer services.

**The short version:** Agents (Claude, GPT, etc.) can't sign up for services through browser flows. Stripe Projects launched a solution last week, but it's invite-only and locks providers into Stripe's payment rail. We built the open alternative.

**What OSP means for [Provider]:**

1. You publish a manifest at `/.well-known/osp.json` describing your offerings and pricing
2. Any AI agent can discover [Provider] and provision resources programmatically
3. You keep your existing payment processing — OSP is payment-rail agnostic
4. Credentials are delivered encrypted (Ed25519) — no plaintext keys in agent context windows

**What's already built:**

- Protocol spec (~9,600 lines, covering the full lifecycle)
- Rust core + TypeScript/Python/Go SDKs (497 tests passing)
- An LLM skill file for [Provider] already exists (helps agents use your service effectively)
- Provider onboarding SDK — you can become OSP-compatible in hours

**Why now:**

Every major AI lab is building agent frameworks. Those agents need infrastructure. The question isn't whether this gets standardized — it's whether the standard is open or proprietary. We think it should be open.

Would you be up for a 20-minute call to discuss? I can walk you through the spec and the provider integration path.

Best,
Efe Baran Durmaz
Founder, Sardis (sardis.sh)
GitHub: github.com/EfeDurmaz16/osp

---

## Template 2: Follow-up (Technical)

**Subject:** Re: Making [Provider] agent-provisionable

---

Hi [Name],

Quick follow-up with the technical details:

**Integration effort:** Minimal. You add 4 endpoints to your existing API:

```
POST /osp/v1/provision      — create a resource
GET  /osp/v1/status/{id}    — check resource health
POST /osp/v1/rotate/{id}    — rotate credentials
GET  /osp/v1/health          — provider health check
```

Plus `/.well-known/osp.json` serving your manifest.

**What you get:**
- Every OSP-compatible agent can discover and provision [Provider] automatically
- Listed in the OSP registry (searchable by agents)
- Conformance badge for your docs
- Featured in the provider directory at osp.sh

**We already have:**
- A [Provider] example manifest in our schema examples
- An LLM skill file teaching agents how to use [Provider]
- Provider adapter code in our Rust core

Happy to pair on the integration if helpful.

Best,
Efe

---

## Template 3: To Provider Already Using Stripe Projects

**Subject:** Open alternative to Stripe Projects for [Provider]

---

Hi [Name],

I noticed [Provider] is part of the Stripe Projects launch. Congrats on being in the first cohort.

I'm building OSP — the open-source equivalent. The pitch is simple: implement OSP alongside Stripe Projects and you're accessible to every agent framework, not just Stripe's.

The integration is additive (4 endpoints + a JSON manifest). You keep Stripe Projects for Stripe's ecosystem and add OSP for everything else.

We already have your manifest schema and an LLM skill file ready. Want to take a look?

GitHub: github.com/EfeDurmaz16/osp

Best,
Efe

---

## Target Providers (Priority Order)

| Provider | Why | Contact Strategy |
|----------|-----|-----------------|
| **Neon** | Serverless Postgres, dev-friendly, likely to adopt open standards | DevRel team, Twitter DM |
| **Upstash** | Redis/Kafka, already API-first | CEO (Enes Akar) on Twitter |
| **Turso** | LibSQL, open-source DNA | Founder (Glauber Costa) |
| **Resend** | Email API, simple integration surface | CEO (Zeno Rocha) on Twitter |
| **Supabase** | Biggest potential impact, large community | DevRel, Paul Copplestone |
| **Vercel** | Strategic — hosting + framework ecosystem | Partnerships team |
| **Railway** | Dev-friendly, good API | Twitter, Discord |
| **Clerk** | Auth — high value for agents | DevRel team |
| **PostHog** | Analytics, open-source aligned | James Hawkins on Twitter |
| **Cloudflare** | Workers/R2/D1, massive reach | Developer Relations |
