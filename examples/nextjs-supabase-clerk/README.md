# Example: Next.js + Supabase + Clerk via OSP

This example demonstrates an AI agent provisioning a complete stack using OSP:

1. **Supabase** — PostgreSQL database + auth
2. **Clerk** — User authentication
3. **Vercel** — Hosting

All provisioned programmatically. No browser signup.

## osp.yaml

```yaml
project:
  name: my-saas-app
  framework: nextjs

services:
  database:
    provider: supabase.com
    offering: supabase/postgres
    tier: free

  auth:
    provider: clerk.com
    offering: clerk/auth
    tier: free

  hosting:
    provider: vercel.com
    offering: vercel/hosting
    tier: hobby
```

## Usage

```bash
# 1. Provision everything
osp setup

# 2. Generate env file
osp env --framework nextjs

# 3. Start developing
npm run dev
```

## What Happens

1. `osp setup` reads `osp.yaml`
2. Discovers each provider via `/.well-known/osp.json`
3. Provisions each service on the free/hobby tier
4. Stores encrypted credentials in `.osp/vault.json`
5. `osp env` generates `.env.local` with:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
