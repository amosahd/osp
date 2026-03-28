---
provider: neon
display_name: Neon
category: database
subcategories:
  - postgres
  - serverless
required_credentials:
  - DATABASE_URL
optional_credentials:
  - NEON_API_KEY
  - DATABASE_URL_UNPOOLED
frameworks:
  - prisma
  - drizzle
  - next.js
  - node.js
  - python
osp_service_id: neon/serverless-postgres
docs_url: https://neon.tech/docs
api_base: https://console.neon.tech/api/v2
---

# Neon

Serverless Postgres with branching, autoscaling, and scale-to-zero. Separates storage and compute for instant provisioning and per-query billing.

## Quick Start

### 1. Create a project

```bash
curl -X POST https://console.neon.tech/api/v2/projects \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "project": {
      "name": "my-app",
      "region_id": "aws-us-east-1",
      "pg_version": 16
    }
  }'
```

### 2. Get connection string

From the API response or dashboard. Format:

```
postgresql://user:password@ep-xxx-yyy-123.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 3. Connect

```bash
# Install Neon serverless driver (for edge/serverless runtimes)
npm install @neondatabase/serverless

# Or use standard pg for Node.js
npm install pg
```

```typescript
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const todos = await sql`SELECT * FROM todos WHERE is_complete = ${false}`
```

## Credentials

| Variable | Description | When to use |
|----------|-------------|-------------|
| `DATABASE_URL` | Pooled connection string (via PgBouncer) | Default for all apps, ORMs, serverless |
| `DATABASE_URL_UNPOOLED` | Direct connection string | Migrations, schema changes, long transactions |
| `NEON_API_KEY` | Management API key | Branch creation, project management |

### Connection String Variants

```
# Pooled (default — use this)
postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

# Unpooled (for migrations only)
postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Pooled endpoints use PgBouncer on port 5432. The unpooled endpoint bypasses the pooler and is needed for schema migrations and prepared statements in some ORMs.

## Common Operations

### SQL via Serverless Driver

```typescript
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Simple query
const users = await sql`SELECT * FROM users WHERE active = true`

// Parameterized query
const user = await sql`SELECT * FROM users WHERE id = ${userId}`

// Insert
await sql`INSERT INTO users (name, email) VALUES (${name}, ${email})`

// Transaction (use Pool for transactions)
import { Pool } from '@neondatabase/serverless'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()
try {
  await client.query('BEGIN')
  await client.query('INSERT INTO orders (user_id) VALUES ($1)', [userId])
  await client.query('UPDATE inventory SET stock = stock - 1 WHERE id = $1', [itemId])
  await client.query('COMMIT')
} catch (e) {
  await client.query('ROLLBACK')
  throw e
} finally {
  client.release()
}
```

### Branching (Neon's Killer Feature)

```bash
# Create a branch from main (instant copy-on-write)
curl -X POST "https://console.neon.tech/api/v2/projects/$PROJECT_ID/branches" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": {
      "name": "preview/pr-42",
      "parent_id": "br_main_branch_id"
    },
    "endpoints": [{ "type": "read_write" }]
  }'

# Delete branch when PR closes
curl -X DELETE "https://console.neon.tech/api/v2/projects/$PROJECT_ID/branches/$BRANCH_ID" \
  -H "Authorization: Bearer $NEON_API_KEY"
```

### Neon CLI

```bash
# Install
brew install neonctl
# or
npm install -g neonctl

# Auth
neonctl auth

# Create branch
neonctl branches create --name preview/pr-42 --project-id $PROJECT_ID

# Get connection string
neonctl connection-string --branch preview/pr-42

# List branches
neonctl branches list --project-id $PROJECT_ID
```

## Framework Guides

### Prisma

```bash
npm install prisma @prisma/client @neondatabase/serverless @prisma/adapter-neon
```

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED")
}

model Todo {
  id        Int      @id @default(autoincrement())
  title     String
  complete  Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at")

  @@map("todos")
}
```

```typescript
// lib/prisma.ts
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaNeon(pool)

export const prisma = new PrismaClient({ adapter })
```

```bash
# Run migrations (uses directUrl automatically)
npx prisma migrate dev --name init
npx prisma generate
```

### Drizzle

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

```typescript
// db/schema.ts
import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core'

export const todos = pgTable('todos', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  complete: boolean('complete').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})
```

```typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })

// Usage
const incompleteTodos = await db.query.todos.findMany({
  where: (todos, { eq }) => eq(todos.complete, false),
})
```

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
})
```

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Next.js (App Router)

```typescript
// app/todos/page.tsx
import { db } from '@/db'
import { todos } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function TodosPage() {
  const allTodos = await db.select().from(todos).where(eq(todos.complete, false))

  return (
    <ul>
      {allTodos.map(todo => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  )
}
```

## Gotchas

1. **Use pooled connection for app code, unpooled for migrations.** Prisma's `directUrl` and Drizzle's separate migration config handle this. Mixing them up causes "prepared statement already exists" errors.

2. **Scale-to-zero cold starts.** Free tier computes suspend after 5 minutes of inactivity. First query after suspend takes ~500ms. Set `suspend_timeout_seconds: 0` to keep compute always-on (paid plans).

3. **Connection limits.** Free tier: 100 connections via pooler. Use `@neondatabase/serverless` for HTTP-based queries in serverless runtimes to avoid connection exhaustion.

4. **Branching is copy-on-write, not a full copy.** Storage is shared until data diverges. Branches are nearly instant and free to create, but each branch's compute still counts toward limits.

5. **WebSocket requirement.** The Neon serverless driver uses WebSockets by default. In Node.js, install `ws` and set `neonConfig.webSocketConstructor = ws`. In edge runtimes (Vercel Edge, Cloudflare Workers), use the HTTP mode via `neon()` instead of `Pool`.

6. **SSL is mandatory.** Always include `?sslmode=require` in connection strings. Neon does not accept unencrypted connections.

7. **Autoscaling compute units.** Paid plans autoscale from 0.25 to 8 CU. Set `min_cu` and `max_cu` to control costs. Free tier is fixed at 0.25 CU.

8. **IP Allow List.** For production, restrict connections to known IPs via project settings. This is disabled by default.

9. **Logical replication.** Neon supports logical replication for CDC and syncing to external systems. Enable it in project settings, not enabled by default.

10. **Point-in-time recovery.** Neon retains branch history for 7 days (free) or 30 days (paid). Restore to any point with `neonctl branches restore`.
