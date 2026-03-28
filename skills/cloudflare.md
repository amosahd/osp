---
provider: cloudflare
display_name: Cloudflare
category: platform
subcategories:
  - workers
  - r2-storage
  - d1-database
  - kv
  - queues
  - pages
required_credentials:
  - CLOUDFLARE_API_TOKEN
optional_credentials:
  - CLOUDFLARE_ACCOUNT_ID
  - CLOUDFLARE_ZONE_ID
frameworks:
  - workers
  - pages
  - hono
  - next.js
osp_service_id: cloudflare/workers
docs_url: https://developers.cloudflare.com
api_base: https://api.cloudflare.com/client/v4
---

# Cloudflare

Edge compute and storage platform. Workers run JavaScript/TypeScript/Rust/Python at 300+ PoPs globally with sub-millisecond cold starts. Includes D1 (SQLite), R2 (S3-compatible storage), KV (key-value), Queues, and Pages (static hosting).

## Quick Start

### 1. Install Wrangler

```bash
npm install -D wrangler
```

### 2. Create a Worker

```bash
npx wrangler init my-worker
cd my-worker
```

### 3. Write handler

```typescript
// src/index.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/hello') {
      return Response.json({ message: 'Hello from the edge!' })
    }

    return new Response('Not found', { status: 404 })
  },
}
```

### 4. Deploy

```bash
npx wrangler deploy
```

## Credentials

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | Scoped API token | Dashboard > My Profile > API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Account identifier | Dashboard > any domain > Overview sidebar |
| `CLOUDFLARE_ZONE_ID` | Zone (domain) identifier | Dashboard > domain > Overview sidebar |

### Token Scopes

Create tokens with minimal permissions:
- **Workers**: Account > Workers Scripts > Edit
- **D1**: Account > D1 > Edit
- **R2**: Account > R2 Storage > Edit
- **DNS**: Zone > DNS > Edit

Wrangler authenticates via `wrangler login` (OAuth) or `CLOUDFLARE_API_TOKEN` env var.

## Common Operations

### Workers — Configuration

```toml
# wrangler.toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2026-03-01"

[vars]
ENVIRONMENT = "production"

[[kv_namespaces]]
binding = "CACHE"
id = "abc123"

[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "def456"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "my-bucket"

[[queues.producers]]
binding = "QUEUE"
queue = "my-queue"

[[queues.consumers]]
queue = "my-queue"
max_batch_size = 10
max_batch_timeout = 30
```

```typescript
// Type bindings
interface Env {
  ENVIRONMENT: string
  CACHE: KVNamespace
  DB: D1Database
  STORAGE: R2Bucket
  QUEUE: Queue
}
```

### D1 — SQLite at the Edge

```bash
# Create database
npx wrangler d1 create my-db

# Create migration
npx wrangler d1 migrations create my-db init

# Apply migrations
npx wrangler d1 migrations apply my-db        # remote
npx wrangler d1 migrations apply my-db --local # local dev
```

```sql
-- migrations/0001_init.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

```typescript
// Usage in Worker
export default {
  async fetch(request: Request, env: Env) {
    // Parameterized query (safe from SQL injection)
    const { results } = await env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind('alice@example.com').all()

    // Insert
    const { meta } = await env.DB.prepare(
      'INSERT INTO users (email, name) VALUES (?, ?)'
    ).bind('bob@example.com', 'Bob').run()

    // Batch (transaction)
    await env.DB.batch([
      env.DB.prepare('INSERT INTO users (email, name) VALUES (?, ?)').bind('a@b.com', 'A'),
      env.DB.prepare('INSERT INTO posts (user_id, title) VALUES (?, ?)').bind(1, 'First Post'),
    ])

    return Response.json(results)
  },
}
```

### R2 — S3-Compatible Object Storage

```typescript
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    const key = url.pathname.slice(1) // strip leading /

    switch (request.method) {
      case 'PUT': {
        await env.STORAGE.put(key, request.body, {
          httpMetadata: { contentType: request.headers.get('content-type') || 'application/octet-stream' },
        })
        return new Response(`Uploaded ${key}`)
      }

      case 'GET': {
        const object = await env.STORAGE.get(key)
        if (!object) return new Response('Not found', { status: 404 })

        return new Response(object.body, {
          headers: {
            'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
            'ETag': object.etag,
          },
        })
      }

      case 'DELETE': {
        await env.STORAGE.delete(key)
        return new Response(`Deleted ${key}`)
      }
    }
  },
}
```

```bash
# R2 CLI operations
npx wrangler r2 object put my-bucket/image.png --file ./image.png
npx wrangler r2 object get my-bucket/image.png --file ./downloaded.png
npx wrangler r2 object delete my-bucket/image.png
```

### KV — Global Key-Value Store

```typescript
export default {
  async fetch(request: Request, env: Env) {
    // Write with TTL
    await env.CACHE.put('config', JSON.stringify({ theme: 'dark' }), {
      expirationTtl: 3600,
    })

    // Read
    const config = await env.CACHE.get('config', 'json')

    // List keys
    const { keys } = await env.CACHE.list({ prefix: 'user:' })

    // Delete
    await env.CACHE.delete('config')

    return Response.json(config)
  },
}
```

### Queues

```typescript
// Producer
export default {
  async fetch(request: Request, env: Env) {
    await env.QUEUE.send({ type: 'email', to: 'user@example.com', subject: 'Hello' })
    return new Response('Queued')
  },

  // Consumer
  async queue(batch: MessageBatch, env: Env) {
    for (const message of batch.messages) {
      try {
        console.log('Processing:', message.body)
        message.ack()
      } catch (e) {
        message.retry()
      }
    }
  },
}
```

## Framework Guides

### Hono (Recommended for Workers)

```bash
npm create hono@latest my-api
```

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  CACHE: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

app.get('/api/users', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM users').all()
  return c.json(results)
})

app.post('/api/users', async (c) => {
  const { email, name } = await c.req.json()
  await c.env.DB.prepare('INSERT INTO users (email, name) VALUES (?, ?)')
    .bind(email, name).run()
  return c.json({ success: true }, 201)
})

export default app
```

### Cloudflare Pages (Full-Stack)

```bash
# Create Pages project
npx wrangler pages project create my-site

# Deploy static site
npx wrangler pages deploy ./dist

# With functions (file-based routing)
# functions/api/hello.ts
export const onRequestGet: PagesFunction = async (context) => {
  return Response.json({ message: 'Hello' })
}
```

### Next.js on Pages

```bash
npx @cloudflare/next-on-pages
```

```typescript
// next.config.ts
const config = {
  experimental: {
    runtime: 'edge',
  },
}
export default config
```

## Gotchas

1. **Worker CPU time limits.** Free: 10ms CPU time per request. Paid: 30s CPU time. This is CPU time, not wall-clock time — network I/O does not count.

2. **No Node.js APIs by default.** Workers use the Web Standards API (fetch, Request, Response, crypto, etc.), not Node.js APIs. Some Node.js compat is available via `node_compat = true` in wrangler.toml.

3. **D1 is SQLite.** No `serial` type — use `INTEGER PRIMARY KEY AUTOINCREMENT`. No `timestamptz` — use `TEXT` with `datetime('now')`. No concurrent writes from multiple Workers — D1 handles serialization.

4. **KV is eventually consistent.** Writes propagate globally in ~60 seconds. Do not use KV for data that needs strong consistency. Use D1 or Durable Objects instead.

5. **R2 egress is free.** R2 charges for storage and operations (Class A/B) but not for egress. This is the main cost advantage over S3.

6. **Wrangler dev vs deploy.** `wrangler dev` runs locally with Miniflare. Bindings (D1, KV, R2) use local simulators unless `--remote` is specified.

7. **Secrets management.** Use `wrangler secret put SECRET_NAME` for secrets. They are encrypted at rest and available as `env.SECRET_NAME`. Do not put secrets in `wrangler.toml`.

8. **Worker size limit.** 10MB compressed after bundling (paid), 1MB (free). Use `wrangler deploy --dry-run` to check size. Tree-shake aggressively.

9. **Durable Objects for coordination.** When you need strong consistency, WebSocket management, or single-point-of-coordination, use Durable Objects instead of Workers + KV.

10. **Custom domains.** Workers can be accessed via `*.workers.dev` or custom domains. Custom domains require the domain's DNS to be on Cloudflare (orange cloud proxy).

11. **Pages vs Workers.** Pages is for full-stack web apps (static + functions). Workers is for APIs and compute. Pages functions are Workers under the hood but with file-based routing.
