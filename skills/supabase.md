---
provider: supabase
display_name: Supabase
category: backend-as-a-service
subcategories:
  - database
  - authentication
  - storage
  - realtime
required_credentials:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
optional_credentials:
  - SUPABASE_DB_URL
  - SUPABASE_JWT_SECRET
frameworks:
  - next.js
  - react
  - python
  - go
  - flutter
  - svelte
osp_service_id: supabase/baas
docs_url: https://supabase.com/docs
api_base: https://api.supabase.com
---

# Supabase

Open-source Firebase alternative providing Postgres database, authentication, instant APIs, edge functions, realtime subscriptions, and storage.

## Quick Start

### 1. Create a project

Via dashboard at https://supabase.com/dashboard or via Management API:

```bash
curl -X POST https://api.supabase.com/v1/projects \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-project",
    "organization_id": "org-xxx",
    "region": "us-east-1",
    "db_pass": "your-secure-password",
    "plan": "free"
  }'
```

### 2. Install client

```bash
# JavaScript/TypeScript
npm install @supabase/supabase-js

# Python
pip install supabase

# Go
go get github.com/supabase-community/supabase-go
```

### 3. Initialize client

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)
```

## Credentials

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `SUPABASE_URL` | Project API URL | Settings > API > Project URL |
| `SUPABASE_ANON_KEY` | Public anonymous key (safe for client) | Settings > API > anon/public |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key (NEVER expose to client) | Settings > API > service_role |
| `SUPABASE_DB_URL` | Direct Postgres connection string | Settings > Database > Connection string |
| `SUPABASE_JWT_SECRET` | JWT signing secret for custom tokens | Settings > API > JWT Secret |

### Security Rules

- `SUPABASE_ANON_KEY` is safe for client-side code but MUST be paired with Row Level Security (RLS).
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Use ONLY on server-side. Never include in client bundles.
- For Next.js, prefix client-safe vars with `NEXT_PUBLIC_`.

## Common Operations

### Database — CRUD

```typescript
// Insert
const { data, error } = await supabase
  .from('todos')
  .insert({ title: 'Buy groceries', is_complete: false })
  .select()

// Select with filters
const { data } = await supabase
  .from('todos')
  .select('id, title, created_at')
  .eq('is_complete', false)
  .order('created_at', { ascending: false })
  .limit(10)

// Update
const { data } = await supabase
  .from('todos')
  .update({ is_complete: true })
  .eq('id', 1)
  .select()

// Delete
const { error } = await supabase
  .from('todos')
  .delete()
  .eq('id', 1)
```

### Database — Migrations

```sql
-- supabase/migrations/20260328000000_create_todos.sql
CREATE TABLE todos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  is_complete boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own todos"
  ON todos FOR ALL
  USING (auth.uid() = user_id);
```

### Authentication

```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password',
})

// OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: { redirectTo: 'http://localhost:3000/auth/callback' },
})

// Get current user
const { data: { user } } = await supabase.auth.getUser()

// Sign out
await supabase.auth.signOut()
```

### Storage

```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`public/${userId}.png`, file, {
    cacheControl: '3600',
    upsert: true,
  })

// Get public URL
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('public/avatar.png')

// Download file
const { data, error } = await supabase.storage
  .from('avatars')
  .download('public/avatar.png')
```

### Realtime

```typescript
const channel = supabase
  .channel('todos-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'todos' },
    (payload) => {
      console.log('Change received:', payload)
    }
  )
  .subscribe()

// Cleanup
supabase.removeChannel(channel)
```

### Edge Functions

```typescript
// supabase/functions/hello/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { name } = await req.json()
  return new Response(JSON.stringify({ message: `Hello ${name}!` }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

```bash
# Deploy
supabase functions deploy hello

# Invoke from client
const { data } = await supabase.functions.invoke('hello', {
  body: { name: 'World' },
})
```

## Framework Guides

### Next.js (App Router)

```bash
npm install @supabase/ssr
```

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

```typescript
// app/todos/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function TodosPage() {
  const supabase = await createClient()
  const { data: todos } = await supabase.from('todos').select()
  return <ul>{todos?.map(t => <li key={t.id}>{t.title}</li>)}</ul>
}
```

### Python

```python
from supabase import create_client

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

# Query
result = supabase.table("todos").select("*").eq("is_complete", False).execute()

# Insert
result = supabase.table("todos").insert({
    "title": "Buy groceries",
    "user_id": user_id
}).execute()
```

### Go

```go
import (
    supa "github.com/supabase-community/supabase-go"
)

client, err := supa.NewClient(
    os.Getenv("SUPABASE_URL"),
    os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
    nil,
)

// Query
var todos []Todo
err = client.DB.From("todos").Select("*").Execute(&todos)
```

## Gotchas

1. **RLS is off by default.** Always enable Row Level Security on every table. Without it, the anon key exposes all data.

2. **Service role key bypasses RLS.** Never use it client-side. Never put it in `NEXT_PUBLIC_` variables.

3. **Auth callback URL.** OAuth providers require a callback URL at `/auth/v1/callback`. Add it to your allowed redirect URLs in the dashboard.

4. **Connection pooling.** For serverless (Vercel, AWS Lambda), use the pooled connection string (port 6543), not the direct connection (port 5432). Use `?pgbouncer=true` parameter.

5. **Realtime requires table replication.** Enable replication for tables you want to subscribe to: Dashboard > Database > Replication.

6. **Storage policies.** Storage buckets need their own RLS policies separate from table policies. A common mistake is assuming table policies apply to storage.

7. **Rate limits on free tier.** Auth endpoints have rate limits: 30 requests per hour for sign-ups, 5 for magic links. Use CAPTCHA in production.

8. **Edge Functions cold starts.** First invocation takes 200-500ms. Keep functions warm with periodic pings if latency-sensitive.

9. **Supabase CLI for local dev.** Run `supabase start` to spin up a full local stack (Postgres, Auth, Storage, etc.) via Docker. Migrations run automatically.

10. **Type generation.** Generate TypeScript types from your schema:
    ```bash
    supabase gen types typescript --project-id your-project-id > types/supabase.ts
    ```
