---
provider: turso
display_name: Turso
category: database
subcategories:
  - sqlite
  - libsql
  - embedded-replicas
  - edge-database
required_credentials:
  - TURSO_DATABASE_URL
  - TURSO_AUTH_TOKEN
optional_credentials:
  - TURSO_API_TOKEN
  - TURSO_SYNC_URL
frameworks:
  - drizzle
  - next.js
  - node.js
  - python
  - go
  - rust
osp_service_id: turso/libsql
docs_url: https://docs.turso.tech
api_base: https://api.turso.tech
---

# Turso

Managed LibSQL (SQLite fork) with embedded replicas, multi-region replication, and edge deployment. SQLite's simplicity with distributed database capabilities. Per-row pricing with generous free tier.

## Quick Start

### 1. Install CLI

```bash
# macOS
brew install tursodatabase/tap/turso

# Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Auth
turso auth login
```

### 2. Create database

```bash
turso db create my-db --group default

# Get connection info
turso db show my-db --url
turso db tokens create my-db
```

### 3. Install SDK

```bash
npm install @libsql/client
```

### 4. Connect

```typescript
import { createClient } from '@libsql/client'

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

const result = await db.execute('SELECT * FROM users')
console.log(result.rows)
```

## Credentials

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `TURSO_DATABASE_URL` | Database connection URL (`libsql://...`) | `turso db show <db> --url` |
| `TURSO_AUTH_TOKEN` | Database auth token | `turso db tokens create <db>` |
| `TURSO_API_TOKEN` | Platform API token for management | `turso auth token` |
| `TURSO_SYNC_URL` | Remote URL for embedded replicas | Same as `TURSO_DATABASE_URL` |

### URL Formats

```
# Remote (HTTPS)
libsql://my-db-username.turso.io

# Local development
file:local.db

# Embedded replica (local file + remote sync)
file:local.db  (with syncUrl pointing to remote)
```

## Common Operations

### SQL Operations

```typescript
import { createClient } from '@libsql/client'

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// Execute single statement
const result = await db.execute('SELECT * FROM users WHERE active = 1')
// result.rows = [{ id: 1, name: 'Alice', active: 1 }, ...]
// result.columns = ['id', 'name', 'active']
// result.rowsAffected = 0

// Parameterized query (positional)
const user = await db.execute({
  sql: 'SELECT * FROM users WHERE id = ?',
  args: [userId],
})

// Parameterized query (named)
const user = await db.execute({
  sql: 'SELECT * FROM users WHERE email = :email',
  args: { email: 'alice@example.com' },
})

// Insert
const { rowsAffected, lastInsertRowid } = await db.execute({
  sql: 'INSERT INTO users (name, email) VALUES (?, ?)',
  args: ['Bob', 'bob@example.com'],
})

// Update
await db.execute({
  sql: 'UPDATE users SET name = ? WHERE id = ?',
  args: ['Robert', userId],
})

// Delete
await db.execute({
  sql: 'DELETE FROM users WHERE id = ?',
  args: [userId],
})
```

### Transactions

```typescript
const tx = await db.transaction('write')
try {
  await tx.execute({
    sql: 'INSERT INTO orders (user_id, total) VALUES (?, ?)',
    args: [userId, 99.99],
  })
  await tx.execute({
    sql: 'UPDATE inventory SET stock = stock - 1 WHERE product_id = ?',
    args: [productId],
  })
  await tx.commit()
} catch (e) {
  await tx.rollback()
  throw e
}

// Batch (multiple statements, executed atomically)
const results = await db.batch([
  { sql: 'INSERT INTO users (name) VALUES (?)', args: ['Alice'] },
  { sql: 'INSERT INTO users (name) VALUES (?)', args: ['Bob'] },
  'SELECT * FROM users',
], 'write')
```

### Embedded Replicas

The killer feature of Turso. Run a local SQLite replica that syncs with the remote primary. Reads are instant (local file), writes go to the remote.

```typescript
import { createClient } from '@libsql/client'

const db = createClient({
  url: 'file:local-replica.db',        // Local file path
  syncUrl: process.env.TURSO_SYNC_URL!, // Remote Turso URL
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncInterval: 60, // Sync every 60 seconds
})

// Initial sync — pulls all data from remote
await db.sync()

// Reads are instant (from local file)
const result = await db.execute('SELECT * FROM users')

// Writes go to remote, then sync back
await db.execute({
  sql: 'INSERT INTO users (name) VALUES (?)',
  args: ['Alice'],
})

// Manual sync when needed
await db.sync()
```

### Turso CLI Operations

```bash
# Create database
turso db create my-db

# Create in specific group/region
turso db create my-db --group us-east

# List databases
turso db list

# Open SQL shell
turso db shell my-db

# Run SQL from file
turso db shell my-db < schema.sql

# Create read replica
turso group locations add default lhr  # London
turso group locations add default nrt  # Tokyo

# Destroy database
turso db destroy my-db

# Create token with expiration
turso db tokens create my-db --expiration 7d

# Create read-only token
turso db tokens create my-db --read-only
```

### Schema Management

```sql
-- schema.sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT,
  published INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_published ON posts(published) WHERE published = 1;
```

## Framework Guides

### Drizzle ORM

```bash
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit
```

```typescript
// db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').default('(datetime(\'now\'))'),
})

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  content: text('content'),
  published: integer('published', { mode: 'boolean' }).default(false),
})
```

```typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export const db = drizzle(client, { schema })

// Queries
const allUsers = await db.select().from(schema.users)

const userPosts = await db.query.users.findMany({
  with: { posts: true },
  where: (users, { eq }) => eq(users.email, 'alice@example.com'),
})

// Insert
await db.insert(schema.users).values({
  email: 'bob@example.com',
  name: 'Bob',
})
```

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
})
```

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Drizzle + Embedded Replica

```typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

const client = createClient({
  url: 'file:local.db',
  syncUrl: process.env.TURSO_SYNC_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncInterval: 60,
})

export const db = drizzle(client, { schema })

// Sync on app startup
await client.sync()
```

### Next.js

```typescript
// app/users/page.tsx
import { db } from '@/db'
import { users } from '@/db/schema'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const allUsers = await db.select().from(users)

  return (
    <ul>
      {allUsers.map(user => (
        <li key={user.id}>{user.name} — {user.email}</li>
      ))}
    </ul>
  )
}
```

### Python

```bash
pip install libsql-experimental
```

```python
import libsql_experimental as libsql
import os

conn = libsql.connect(
    os.environ["TURSO_DATABASE_URL"],
    auth_token=os.environ["TURSO_AUTH_TOKEN"]
)

# Execute
cursor = conn.execute("SELECT * FROM users WHERE active = ?", [1])
rows = cursor.fetchall()

# Insert
conn.execute(
    "INSERT INTO users (name, email) VALUES (?, ?)",
    ["Alice", "alice@example.com"]
)
conn.commit()

# Embedded replica
conn = libsql.connect(
    "local.db",
    sync_url=os.environ["TURSO_SYNC_URL"],
    auth_token=os.environ["TURSO_AUTH_TOKEN"]
)
conn.sync()
```

## Gotchas

1. **It is SQLite, not Postgres.** No `serial`, `uuid`, `jsonb`, or `timestamptz` types. Use `INTEGER PRIMARY KEY AUTOINCREMENT`, `TEXT` for UUIDs, `TEXT` with `json()` for JSON, `TEXT` with `datetime()` for timestamps.

2. **Embedded replicas need writable filesystem.** Serverless platforms like Vercel Serverless Functions have a read-only filesystem. Use `/tmp/` prefix for the local file, or skip embedded replicas on serverless.

3. **Sync is not real-time.** Embedded replicas sync at the configured interval (e.g., 60s). Reads may be stale by up to that interval. Call `db.sync()` manually for fresher data.

4. **Write latency.** Writes go to the primary (remote) even with embedded replicas. Write latency depends on distance to the primary region. Reads are always fast (local file).

5. **Connection pooling is not needed.** LibSQL client handles connections internally. Do not create connection pools — instantiate one client per process.

6. **Max database size.** Free tier: 9GB total across all databases. Databases over 500MB may have slower replication.

7. **Token expiration.** Tokens created with `--expiration` expire. Use `turso db tokens create <db>` without expiration for long-lived tokens, or rotate programmatically.

8. **Multi-tenant via database-per-tenant.** Turso supports thousands of databases per group. This is a supported pattern for multi-tenancy, unlike most cloud databases.

9. **No `ALTER TABLE` constraints.** SQLite has limited `ALTER TABLE` support. Adding foreign keys or changing column types requires creating a new table and migrating data. Drizzle Kit handles this automatically.

10. **Local development.** Use `file:dev.db` without `syncUrl` for local development. Apply migrations with `turso db shell file:dev.db < schema.sql` or Drizzle Kit.
