# OSP 30-Second Demo Script

## Setup

Terminal with `osp` CLI installed. Split screen: terminal left, browser right showing osp.sh.

## Script (30 seconds)

### Scene 1: Discovery (0-8s)

```bash
$ osp discover supabase.com
```

Output:
```
Provider: Supabase (supabase.com)
Verified: ✓ Ed25519 signature valid

Offerings:
  supabase/postgres    Managed PostgreSQL      free / pro ($25/mo) / team ($599/mo)
  supabase/auth        Authentication          free / pro ($25/mo)
  supabase/storage     Object Storage          free / pro ($25/mo)
  supabase/realtime    Realtime Subscriptions  free / pro ($25/mo)

Payment methods: free, sardis_wallet, stripe_spt
```

### Scene 2: Provision (8-18s)

```bash
$ osp provision supabase/postgres --tier free --project my-saas-app
```

Output:
```
Provisioning supabase/postgres (free tier)...
✓ Resource created: proj_7x9k2m

Credentials stored in vault:
  SUPABASE_URL          → osp://supabase/postgres/url
  SUPABASE_ANON_KEY     → osp://supabase/postgres/anon_key
  SUPABASE_SERVICE_KEY  → osp://supabase/postgres/service_key
  DATABASE_URL          → osp://supabase/postgres/database_url

Run `osp env` to generate your .env file.
```

### Scene 3: Environment (18-25s)

```bash
$ osp env --framework nextjs
```

Output:
```
Generated .env.local:
  NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
  DATABASE_URL=postgresql://...

✓ .env.local written (4 variables, 1 provider)
✓ .gitignore updated
```

### Scene 4: Status (25-30s)

```bash
$ osp status
```

Output:
```
Project: my-saas-app

  supabase/postgres  ● healthy   free   proj_7x9k2m   0.0 MB used

Cost: $0.00/mo (1 service, all free tier)
Scorecard: ■■■□□ 6/10 (missing: monitoring, backups, key rotation)

Run `osp fix` to improve your score.
```

## Key Messages

1. **One command to discover** — no documentation hunting
2. **One command to provision** — no browser signup
3. **Encrypted credentials** — never exposed in plaintext
4. **Framework-aware** — auto-detects Next.js, generates correct env vars
5. **Observable** — status, cost, and health in one view

## Recording Notes

- Use `asciinema` or `vhs` (Charm) for terminal recording
- Add subtle typing animation (not instant, not slow)
- Background music: subtle, techy, no vocals
- End card: osp.sh — "Open Service Protocol"
