---
provider: clerk
display_name: Clerk
category: authentication
subcategories:
  - user-management
  - session-management
  - organizations
  - webhooks
required_credentials:
  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  - CLERK_SECRET_KEY
optional_credentials:
  - CLERK_WEBHOOK_SECRET
  - CLERK_ENCRYPTION_KEY
frameworks:
  - next.js
  - react
  - remix
  - express
  - fastify
osp_service_id: clerk/auth
docs_url: https://clerk.com/docs
api_base: https://api.clerk.com/v1
---

# Clerk

Drop-in authentication and user management. Provides prebuilt UI components, session management, multi-factor auth, organizations, and webhooks.

## Quick Start

### 1. Create application

Create at https://dashboard.clerk.com — choose sign-in methods (email, Google, GitHub, etc.).

### 2. Install

```bash
npm install @clerk/nextjs
```

### 3. Add environment variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 4. Add ClerkProvider

```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

### 5. Add middleware

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

## Credentials

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public key for client-side SDK | Dashboard > API Keys |
| `CLERK_SECRET_KEY` | Secret key for server-side operations | Dashboard > API Keys |
| `CLERK_WEBHOOK_SECRET` | Webhook signing secret | Dashboard > Webhooks > endpoint |
| `CLERK_ENCRYPTION_KEY` | For encrypting user metadata at rest | Dashboard > Settings |

### Route Configuration

```env
# Optional: customize auth page routes
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding
```

## Common Operations

### Prebuilt Components

```typescript
// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <SignIn />
    </div>
  )
}
```

```typescript
// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <SignUp />
    </div>
  )
}
```

```typescript
// User button (avatar + dropdown)
import { UserButton } from '@clerk/nextjs'

export function Header() {
  return (
    <header>
      <UserButton afterSignOutUrl="/" />
    </header>
  )
}
```

### Server-Side Auth (App Router)

```typescript
// app/dashboard/page.tsx
import { auth, currentUser } from '@clerk/nextjs/server'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) return <div>Not authenticated</div>

  const user = await currentUser()

  return (
    <div>
      <h1>Welcome {user?.firstName}</h1>
      <p>Email: {user?.emailAddresses[0]?.emailAddress}</p>
    </div>
  )
}
```

### API Route Protection

```typescript
// app/api/protected/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ userId, message: 'Authenticated' })
}
```

### Client-Side Hooks

```typescript
'use client'
import { useUser, useAuth, useClerk } from '@clerk/nextjs'

export function Profile() {
  const { user, isLoaded } = useUser()
  const { getToken, signOut } = useAuth()

  if (!isLoaded) return <div>Loading...</div>

  const handleApiCall = async () => {
    const token = await getToken()
    const res = await fetch('/api/protected', {
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  return (
    <div>
      <p>{user?.fullName}</p>
      <button onClick={handleApiCall}>Call API</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
```

### Organizations

```typescript
// Enable orgs in Clerk dashboard first

// List user's organizations
import { auth } from '@clerk/nextjs/server'

export default async function OrgPage() {
  const { orgId, orgRole } = await auth()

  if (!orgId) return <div>No organization selected</div>

  return <div>Org: {orgId}, Role: {orgRole}</div>
}
```

```typescript
// Client-side org switcher
import { OrganizationSwitcher } from '@clerk/nextjs'

export function OrgSwitcher() {
  return <OrganizationSwitcher />
}
```

### Webhooks

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import type { WebhookEvent } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)
  let event: WebhookEvent

  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  switch (event.type) {
    case 'user.created':
      // Sync user to database
      await db.insert(users).values({
        clerkId: event.data.id,
        email: event.data.email_addresses[0]?.email_address,
        name: `${event.data.first_name} ${event.data.last_name}`,
      })
      break
    case 'user.deleted':
      await db.delete(users).where(eq(users.clerkId, event.data.id!))
      break
  }

  return new Response('OK', { status: 200 })
}
```

### Backend API

```bash
# List users
curl https://api.clerk.com/v1/users \
  -H "Authorization: Bearer $CLERK_SECRET_KEY"

# Get specific user
curl https://api.clerk.com/v1/users/$USER_ID \
  -H "Authorization: Bearer $CLERK_SECRET_KEY"

# Update user metadata
curl -X PATCH "https://api.clerk.com/v1/users/$USER_ID/metadata" \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"public_metadata": {"role": "admin"}}'
```

## Framework Guides

### React (standalone, non-Next.js)

```bash
npm install @clerk/clerk-react
```

```typescript
// main.tsx
import { ClerkProvider } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <RouterProvider router={router} />
    </ClerkProvider>
  )
}
```

### Express

```bash
npm install @clerk/express
```

```typescript
import express from 'express'
import { clerkMiddleware, requireAuth, getAuth } from '@clerk/express'

const app = express()

app.use(clerkMiddleware())

app.get('/api/protected', requireAuth(), (req, res) => {
  const { userId } = getAuth(req)
  res.json({ userId })
})

app.listen(3001)
```

## Gotchas

1. **Middleware matcher is critical.** The default matcher excludes static files. If you omit the matcher, middleware runs on every request including images and CSS, slowing your site.

2. **Webhook endpoint must be public.** Add `/api/webhooks(.*)` to your public routes in middleware. Clerk cannot reach authenticated endpoints.

3. **`auth()` is async in Next.js 15+.** You must `await auth()`. Forgetting `await` returns a Promise, not the auth object, causing subtle bugs.

4. **Token refresh happens automatically** but the initial load can cause a flash. Use `<ClerkLoaded>` wrapper or check `isLoaded` from hooks before rendering auth-dependent UI.

5. **Organizations require separate enablement.** Enable in Clerk dashboard > Organizations. Org-related hooks and components return null until enabled.

6. **Webhook retry behavior.** Clerk retries failed webhooks for up to 3 days with exponential backoff. Ensure your webhook handler is idempotent.

7. **Custom claims in JWT.** Add custom claims via Dashboard > JWT Templates. Access them via `auth().sessionClaims`. Useful for role-based access without extra API calls.

8. **Rate limits.** Backend API: 20 requests/second (free), 100/s (pro). Frontend API: 10 requests/10s per client.

9. **Clerk uses Svix for webhooks.** Install `svix` package for webhook verification. Do not try to verify signatures manually.

10. **Multi-domain auth.** For separate frontend/API domains, configure CORS and use `getToken()` to pass JWTs. Cookies only work on the same domain.
