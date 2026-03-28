---
provider: upstash
display_name: Upstash
category: database
subcategories:
  - redis
  - kafka
  - qstash
  - vector
  - rate-limiting
required_credentials:
  - UPSTASH_REDIS_REST_URL
  - UPSTASH_REDIS_REST_TOKEN
optional_credentials:
  - UPSTASH_KAFKA_REST_URL
  - UPSTASH_KAFKA_REST_TOKEN
  - QSTASH_TOKEN
  - UPSTASH_VECTOR_REST_URL
  - UPSTASH_VECTOR_REST_TOKEN
frameworks:
  - next.js
  - cloudflare-workers
  - vercel-edge
  - node.js
osp_service_id: upstash/redis
docs_url: https://upstash.com/docs
api_base: https://api.upstash.com
---

# Upstash

Serverless data platform providing Redis, Kafka, QStash (message queue), and Vector databases via REST APIs. Per-request pricing with no persistent connections required. Ideal for serverless and edge runtimes.

## Quick Start

### 1. Create a Redis database

Via dashboard at https://console.upstash.com or via API:

```bash
curl -X POST https://api.upstash.com/v2/redis/database \
  -u "$UPSTASH_EMAIL:$UPSTASH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-cache",
    "region": "us-east-1",
    "tls": true
  }'
```

### 2. Install SDK

```bash
npm install @upstash/redis
```

### 3. Connect

```typescript
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
// reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN

await redis.set('key', 'value')
const value = await redis.get('key')
```

## Credentials

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `UPSTASH_REDIS_REST_URL` | Redis REST API endpoint | Console > Database > REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST API auth token | Console > Database > REST API |
| `QSTASH_TOKEN` | QStash API bearer token | Console > QStash > Details |
| `QSTASH_CURRENT_SIGNING_KEY` | QStash webhook verification key | Console > QStash > Signing Keys |
| `QSTASH_NEXT_SIGNING_KEY` | QStash next rotation signing key | Console > QStash > Signing Keys |
| `UPSTASH_VECTOR_REST_URL` | Vector DB REST endpoint | Console > Vector > Details |
| `UPSTASH_VECTOR_REST_TOKEN` | Vector DB REST auth token | Console > Vector > Details |

### Why REST?

Upstash uses HTTP-based access instead of persistent TCP connections. This works in all runtimes: Vercel Edge, Cloudflare Workers, AWS Lambda, Deno Deploy. Anywhere you can make an HTTP request.

## Common Operations

### Redis -- Basic Operations

```typescript
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

// Strings
await redis.set('user:123', JSON.stringify({ name: 'Alice' }))
await redis.set('session:abc', 'data', { ex: 3600 }) // TTL in seconds
const user = await redis.get<{ name: string }>('user:123')

// Increment
await redis.incr('page:views')
await redis.incrby('balance:123', 50)

// Hash
await redis.hset('user:123', { name: 'Alice', email: 'alice@example.com' })
const name = await redis.hget('user:123', 'name')
const all = await redis.hgetall('user:123')

// List (queue)
await redis.lpush('queue:emails', JSON.stringify({ to: 'user@example.com' }))
const item = await redis.rpop('queue:emails')

// Set
await redis.sadd('tags:post:1', 'typescript', 'redis', 'serverless')
const tags = await redis.smembers('tags:post:1')

// Sorted set (leaderboard)
await redis.zadd('leaderboard', { score: 100, member: 'player1' })
const top10 = await redis.zrange('leaderboard', 0, 9, { rev: true })

// Delete
await redis.del('key')

// Pipeline (batch operations in single HTTP request)
const pipeline = redis.pipeline()
pipeline.set('a', 1)
pipeline.set('b', 2)
pipeline.get('a')
pipeline.get('b')
const results = await pipeline.exec()
```

### Rate Limiting

```bash
npm install @upstash/ratelimit
```

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
  analytics: true,
  prefix: 'ratelimit:api',
})

// In API route or middleware
async function handleRequest(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const { success, limit, remaining, reset } = await ratelimit.limit(ip)

  if (!success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    })
  }

  // proceed with request handling
}
```

### QStash -- Message Queue and Task Scheduling

```bash
npm install @upstash/qstash
```

```typescript
import { Client } from '@upstash/qstash'

const qstash = new Client({ token: process.env.QSTASH_TOKEN! })

// Publish a message (fires webhook to your endpoint)
await qstash.publishJSON({
  url: 'https://myapp.com/api/process',
  body: { userId: '123', action: 'send-welcome-email' },
})

// Scheduled message (cron)
await qstash.publishJSON({
  url: 'https://myapp.com/api/daily-report',
  cron: '0 9 * * *', // daily at 9 AM UTC
})

// Delayed message
await qstash.publishJSON({
  url: 'https://myapp.com/api/reminder',
  body: { userId: '123' },
  delay: 3600, // 1 hour delay in seconds
})
```

```typescript
// Verify incoming QStash webhooks
// app/api/process/route.ts
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'

async function handler(req: Request) {
  const body = await req.json()
  // Process the message
  return new Response('OK')
}

export const POST = verifySignatureAppRouter(handler)
```

### Vector Database

```bash
npm install @upstash/vector
```

```typescript
import { Index } from '@upstash/vector'

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
})

// Upsert vectors
await index.upsert([
  { id: 'doc-1', vector: [0.1, 0.2, 0.3], metadata: { title: 'Hello' } },
  { id: 'doc-2', vector: [0.4, 0.5, 0.6], metadata: { title: 'World' } },
])

// Query similar vectors
const results = await index.query({
  vector: [0.1, 0.2, 0.3],
  topK: 5,
  includeMetadata: true,
})

// Upsert with text (auto-embedding if index configured with a model)
await index.upsert([
  { id: 'doc-1', data: 'Upstash is a serverless data platform', metadata: { source: 'docs' } },
])

// Query with text
const results = await index.query({
  data: 'serverless database',
  topK: 5,
  includeMetadata: true,
})
```

## Framework Guides

### Next.js -- Rate-Limited API

```typescript
// app/api/data/route.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

const redis = Redis.fromEnv()
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(30, '60 s'),
})

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }

  // Cache response in Redis
  const cached = await redis.get<string>('api:data')
  if (cached) return NextResponse.json(JSON.parse(cached))

  const data = await fetchExpensiveData()
  await redis.set('api:data', JSON.stringify(data), { ex: 300 })

  return NextResponse.json(data)
}
```

### Cloudflare Workers

```typescript
import { Redis } from '@upstash/redis/cloudflare'

export default {
  async fetch(request: Request, env: Env) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })

    const count = await redis.incr('visitor-count')
    return new Response('Visitors: ' + count)
  },
}
```

### Session Storage

```typescript
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

// Store session
async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID()
  await redis.set('session:' + sessionId, userId, { ex: 86400 }) // 24h
  return sessionId
}

// Get session
async function getSession(sessionId: string): Promise<string | null> {
  return await redis.get('session:' + sessionId)
}

// Destroy session
async function destroySession(sessionId: string): Promise<void> {
  await redis.del('session:' + sessionId)
}
```

## Gotchas

1. **REST latency vs TCP.** Each Redis command is an HTTP request (~1-5ms from same region). Use `pipeline()` to batch multiple commands into a single HTTP roundtrip.

2. **Data size limits.** Max value size: 1MB per key. Max request body: 1MB. For larger data, split across multiple keys or use a different storage solution.

3. **Free tier limits.** 10,000 commands/day, 256MB storage. Commands reset daily at midnight UTC. QStash: 500 messages/day.

4. **`Redis.fromEnv()` reads specific env var names.** It expects exactly `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Use the constructor for custom variable names.

5. **QStash requires public endpoints.** QStash sends HTTP requests to your endpoints. They must be publicly accessible. For local dev, use `ngrok` or the QStash mock.

6. **Rate limiter stores state in Redis.** If you delete your Redis database, all rate limit windows reset. The `@upstash/ratelimit` library creates keys with the configured prefix.

7. **Pipeline vs multi-exec.** Upstash REST API supports pipelines (batched commands) but does not support Redis MULTI/EXEC transactions. For atomic operations, use Lua scripts via `redis.eval()`.

8. **Regional latency.** Choose the region closest to your compute. If your Vercel functions run in `iad1` (US East), create your Redis database in `us-east-1`.

9. **Eviction policy.** When storage is full, Upstash uses `noeviction` by default so writes fail. Set maxmemory-policy in database settings if you want LRU eviction.

10. **Vector dimension mismatch.** Vector index dimension is fixed at creation. OpenAI `text-embedding-3-small` uses 1536 dimensions. Mismatched dimensions cause errors, not silent truncation.
