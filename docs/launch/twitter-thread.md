# Twitter/X Launch Thread

## Tweet 1 (Hook)
We just open-sourced OSP — the open standard for AI agents to provision developer services.

What MCP is to tool access, OSP is to service provisioning.

Apache 2.0. No gatekeeping. Any provider. Any payment rail.

Here's what it does and why it matters 🧵

## Tweet 2 (Problem)
AI agents don't just write code anymore — they architect entire systems.

But when Claude needs a database, it can't fill out a signup form. When GPT needs hosting, it can't verify an email.

Every provider has a different, human-only onboarding flow. Agents are locked out.

## Tweet 3 (Stripe Projects)
Stripe Projects launched last week to solve this. It's good — but it's a walled garden.

- Invite-only for providers
- Stripe-only payment rail
- Proprietary protocol

What if we had an open standard instead?

## Tweet 4 (Solution)
OSP: providers publish a manifest at /.well-known/osp.json

Any agent can discover what's available, provision resources in one API call, and receive Ed25519-encrypted credentials.

No browser. No CAPTCHA. No vendor lock-in.

## Tweet 5 (What we built)
This isn't just a spec. We shipped:

- 9,600-line protocol specification
- Rust core (8 crates — crypto, vault, CLI, registry)
- TypeScript SDK with MCP tools (Claude/GPT native)
- Python SDK (async + FastAPI/Django)
- Go SDK
- 497 tests, all green

## Tweet 6 (v1.1 features)
v1.1 goes beyond basic provisioning:

- A2A agent delegation (agent asks agent to provision)
- Short-lived tokens (not static API keys)
- Budget guardrails (agents can spend money — control it)
- Cost-in-PR (see infrastructure cost before you merge)
- OpenTelemetry tracing on every operation

## Tweet 7 (Demo)
```
$ osp discover supabase.com
→ 4 offerings, 3 tiers each

$ osp provision supabase/postgres --tier free
→ Credentials encrypted & stored

$ osp env --framework nextjs
→ .env.local written, ready to dev
```

Clone to running in 3 commands.

## Tweet 8 (Call to action)
OSP is Apache 2.0, built in the open.

We need:
→ Provider feedback (would you implement this?)
→ Agent devs (try the SDKs)
→ Protocol nerds (review the spec)

GitHub: github.com/EfeDurmaz16/osp

The agent economy needs open infrastructure. Let's build it.

## Tweet 9 (Karpathy quote angle)
Karpathy said "the hottest new programming language is English."

If agents are the new developers, they need open infrastructure — not another walled garden.

OSP is that infrastructure.
