---
provider: vercel
display_name: Vercel
category: hosting
subcategories:
  - deployment
  - serverless-functions
  - edge-network
  - storage
required_credentials:
  - VERCEL_TOKEN
optional_credentials:
  - VERCEL_ORG_ID
  - VERCEL_PROJECT_ID
frameworks:
  - next.js
  - react
  - svelte
  - nuxt
  - astro
osp_service_id: vercel/hosting
docs_url: https://vercel.com/docs
api_base: https://api.vercel.com
---

# Vercel

Frontend cloud platform optimized for Next.js. Provides global edge network, serverless functions, preview deployments, and integrated storage (KV, Postgres, Blob).

## Quick Start

### 1. Install CLI

```bash
npm install -g vercel
```

### 2. Deploy

```bash
# Link to existing project or create new
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 3. Set environment variables

```bash
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development
```

## Credentials

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `VERCEL_TOKEN` | Personal access token or team token | Settings > Tokens |
| `VERCEL_ORG_ID` | Team/org identifier | Settings > General > Team ID |
| `VERCEL_PROJECT_ID` | Project identifier | Project Settings > General |

### Token scopes

- Personal tokens: full access to your account
- Team tokens: scoped to team resources
- OIDC tokens: for CI/CD, auto-rotated per deployment

## Common Operations

### Deployments

```bash
# Deploy preview
vercel

# Deploy production
vercel --prod

# Deploy specific directory
vercel ./out --prod

# Redeploy from existing deployment
vercel redeploy dpl_xxxx
```

### Environment Variables

```bash
# Add variable (interactive)
vercel env add SECRET_KEY

# Add for specific environment
vercel env add API_KEY production

# Pull all env vars to local .env
vercel env pull .env.local

# List all env vars
vercel env ls

# Remove
vercel env rm SECRET_KEY production
```

### Via REST API

```bash
# Create deployment
curl -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app",
    "gitSource": {
      "type": "github",
      "repo": "user/repo",
      "ref": "main"
    }
  }'

# List deployments
curl "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN"

# Get deployment status
curl "https://api.vercel.com/v13/deployments/$DEPLOYMENT_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN"

# Set environment variable
curl -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "DATABASE_URL",
    "value": "postgresql://...",
    "target": ["production", "preview"],
    "type": "encrypted"
  }'
```

### Domains

```bash
# Add domain
vercel domains add example.com

# List domains
vercel domains ls

# Inspect DNS
vercel domains inspect example.com
```

### Vercel Storage

```typescript
// KV (Redis-compatible)
import { kv } from '@vercel/kv'

await kv.set('user:123', { name: 'Alice' })
const user = await kv.get('user:123')

// Blob storage
import { put, list } from '@vercel/blob'

const { url } = await put('avatars/user.png', file, { access: 'public' })
const { blobs } = await list()

// Postgres
import { sql } from '@vercel/postgres'

const { rows } = await sql`SELECT * FROM users WHERE id = ${userId}`
```

## Framework Guides

### Next.js

```json
// vercel.json — usually not needed, zero-config works
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "regions": ["iad1"],
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 0 * * *"
    }
  ]
}
```

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
}

export default config
```

#### API Routes

```typescript
// app/api/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  // Process webhook
  return NextResponse.json({ received: true })
}

// Edge runtime
export const runtime = 'edge'
```

#### Middleware

```typescript
// middleware.ts (runs at the edge)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check auth, redirect, rewrite, etc.
  if (!request.cookies.get('session')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*'],
}
```

#### Server Actions

```typescript
// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache'

export async function createTodo(formData: FormData) {
  const title = formData.get('title') as string
  await db.insert(todos).values({ title })
  revalidatePath('/todos')
}
```

### Static Sites (React/Vite)

```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

## Gotchas

1. **Serverless function timeout.** Hobby: 10s, Pro: 60s (300s with streaming). Long-running tasks must use background functions or external queues.

2. **Cold starts.** Serverless functions cold-start in 250-500ms. Use edge runtime (`export const runtime = 'edge'`) for sub-50ms cold starts, but edge has limited Node.js API access.

3. **Environment variable limits.** Max 100 env vars per project. Variable values max 64KB. Use `type: "encrypted"` for sensitive values.

4. **Preview deployments share env vars** unless you use per-branch overrides. Sensitive preview vars can leak to PR authors — use `target: ["production"]` for secrets.

5. **Build output size.** Max 250MB compressed for serverless functions. Large dependencies (puppeteer, sharp) may require external layers or edge-compatible alternatives.

6. **Middleware runs on every request.** Keep middleware lightweight. It runs at the edge before caching. Heavy middleware increases TTFB globally.

7. **`vercel dev` is not `next dev`.** Use `next dev` for local development. `vercel dev` is for testing Vercel-specific features (crons, KV, etc.) locally.

8. **Git integration conflicts.** If you have both GitHub integration and CLI deployments, they can create duplicate deployments. Disable one or the other.

9. **ISR revalidation.** `revalidate` in fetch/page options sets the stale-while-revalidate window. `revalidatePath()` and `revalidateTag()` purge on-demand. These are different mechanisms.

10. **Monorepo support.** Set root directory in project settings. Use `turbo.json` or `nx.json` for build filtering. Vercel auto-detects Turborepo.

11. **CORS on API routes.** Vercel does not add CORS headers automatically. Add them manually or use `vercel.json` headers config.

12. **Spending limits.** Set spending alerts and hard limits in team settings to avoid surprise bills from traffic spikes.
