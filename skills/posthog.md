---
provider: posthog
display_name: PostHog
category: analytics
subcategories:
  - product-analytics
  - feature-flags
  - session-replay
  - a-b-testing
  - surveys
required_credentials:
  - NEXT_PUBLIC_POSTHOG_KEY
  - NEXT_PUBLIC_POSTHOG_HOST
optional_credentials:
  - POSTHOG_PERSONAL_API_KEY
frameworks:
  - next.js
  - react
  - python
  - node.js
osp_service_id: posthog/analytics
docs_url: https://posthog.com/docs
api_base: https://us.posthog.com
---

# PostHog

Open-source product analytics platform. Event tracking, feature flags, A/B testing, session replay, and user surveys in a single platform. Self-hostable or cloud-hosted.

## Quick Start

### 1. Get project API key

Sign up at https://posthog.com and get your project API key from Project Settings.

### 2. Install

```bash
npm install posthog-js    # Client-side (React/Next.js)
npm install posthog-node  # Server-side (Node.js)
```

### 3. Initialize

```typescript
// Client-side
import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  person_profiles: 'identified_only',
})
```

## Credentials

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Project API key (safe for client) | Project Settings > Project API Key |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog instance URL | `https://us.i.posthog.com` (US) or `https://eu.i.posthog.com` (EU) |
| `POSTHOG_PERSONAL_API_KEY` | Personal API key for server-side ops | My Settings > Personal API Keys |

### US vs EU Cloud

- US Cloud: `https://us.i.posthog.com`
- EU Cloud: `https://eu.i.posthog.com`
- Self-hosted: your instance URL

## Common Operations

### Event Capture

```typescript
// Client-side
import posthog from 'posthog-js'

// Track custom event
posthog.capture('button_clicked', {
  button_name: 'signup',
  page: '/pricing',
})

// Track page view (auto-captured by default)
posthog.capture('$pageview')

// Identify user
posthog.identify('user-123', {
  email: 'alice@example.com',
  name: 'Alice Smith',
  plan: 'pro',
})

// Set user properties
posthog.people.set({
  company: 'Acme Corp',
  role: 'engineer',
})

// Set once (won't overwrite)
posthog.people.set_once({
  first_seen: new Date().toISOString(),
})

// Group analytics (company-level tracking)
posthog.group('company', 'acme-corp', {
  name: 'Acme Corp',
  plan: 'enterprise',
  employee_count: 50,
})

// Revenue tracking
posthog.capture('purchase_completed', {
  $set: { total_spent: 99.99 },
  revenue: 99.99,
  currency: 'USD',
  product: 'Pro Plan',
})

// Reset on logout
posthog.reset()
```

### Server-Side (Node.js)

```typescript
import { PostHog } from 'posthog-node'

const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
})

// Capture event
posthog.capture({
  distinctId: 'user-123',
  event: 'api_call',
  properties: {
    endpoint: '/api/data',
    method: 'GET',
    status: 200,
    duration_ms: 45,
  },
})

// Identify
posthog.identify({
  distinctId: 'user-123',
  properties: {
    email: 'alice@example.com',
    plan: 'pro',
  },
})

// Flush before process exit
await posthog.shutdown()
```

### Feature Flags

```typescript
// Client-side
import posthog from 'posthog-js'

// Check flag
if (posthog.isFeatureEnabled('new-dashboard')) {
  showNewDashboard()
}

// Get flag payload (multivariate)
const variant = posthog.getFeatureFlag('pricing-page')
if (variant === 'control') {
  showOldPricing()
} else if (variant === 'test') {
  showNewPricing()
}

// React hook
import { useFeatureFlagEnabled, useFeatureFlagPayload } from 'posthog-js/react'

function MyComponent() {
  const showBanner = useFeatureFlagEnabled('show-banner')
  const bannerConfig = useFeatureFlagPayload('show-banner')

  if (!showBanner) return null
  return <Banner config={bannerConfig} />
}
```

```typescript
// Server-side flag evaluation
const isEnabled = await posthog.isFeatureEnabled('new-dashboard', 'user-123')

// With properties for targeting
const isEnabled = await posthog.isFeatureEnabled('new-dashboard', 'user-123', {
  personProperties: { plan: 'pro', country: 'US' },
})

// Local evaluation (no network call — requires personal API key)
const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
})
```

### A/B Testing (Experiments)

```typescript
// PostHog experiments use feature flags under the hood
// Create experiment in PostHog dashboard, then:

import { useFeatureFlagVariantKey } from 'posthog-js/react'

function CheckoutPage() {
  const variant = useFeatureFlagVariantKey('checkout-experiment')

  // Track conversion goal
  const handlePurchase = () => {
    posthog.capture('purchase_completed', { amount: 49.99 })
  }

  if (variant === 'single-page') {
    return <SinglePageCheckout onPurchase={handlePurchase} />
  }
  return <MultiStepCheckout onPurchase={handlePurchase} />
}
```

## Framework Guides

### Next.js (App Router)

```typescript
// app/providers.tsx
'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: false, // We handle this manually for App Router
      capture_pageleave: true,
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

```typescript
// app/layout.tsx
import { PostHogProvider } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
```

```typescript
// app/PostHogPageView.tsx — track App Router page views
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'
import { useEffect, Suspense } from 'react'

function PageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + '?' + searchParams.toString()
      }
      posthog.capture('$pageview', { $current_url: url })
    }
  }, [pathname, searchParams, posthog])

  return null
}

export default function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PageView />
    </Suspense>
  )
}
```

```typescript
// Server-side capture in Next.js API routes
// app/api/checkout/route.ts
import { PostHog } from 'posthog-node'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  })

  // Get distinct_id from PostHog cookie
  const cookieStore = await cookies()
  const phCookie = cookieStore.get(`ph_${process.env.NEXT_PUBLIC_POSTHOG_KEY}_posthog`)
  const distinctId = phCookie ? JSON.parse(phCookie.value).distinct_id : 'anonymous'

  posthog.capture({
    distinctId,
    event: 'checkout_started',
    properties: { source: 'api' },
  })

  await posthog.shutdown()
  return Response.json({ ok: true })
}
```

### React (Standalone)

```typescript
// main.tsx
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

posthog.init('phc_xxx', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only',
})

createRoot(document.getElementById('root')!).render(
  <PostHogProvider client={posthog}>
    <App />
  </PostHogProvider>
)
```

### Python

```bash
pip install posthog
```

```python
import posthog
import os

posthog.project_api_key = os.environ["NEXT_PUBLIC_POSTHOG_KEY"]
posthog.host = os.environ.get("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com")

# Capture
posthog.capture("user-123", "api_request", {
    "endpoint": "/api/data",
    "method": "POST",
    "status": 201,
})

# Identify
posthog.identify("user-123", {
    "email": "alice@example.com",
    "plan": "pro",
})

# Feature flag
if posthog.feature_enabled("new-dashboard", "user-123"):
    show_new_dashboard()
```

## Gotchas

1. **Autocapture can be noisy.** PostHog autocaptures clicks, inputs, and page views by default. Disable specific autocapture with `autocapture: false` or use `data-ph-no-capture` attribute on elements.

2. **`capture_pageview: false` for Next.js App Router.** The default auto-pageview fires on initial load only. App Router client-side navigation does not trigger new page loads, so you need a custom `PostHogPageView` component.

3. **`person_profiles: 'identified_only'`** is recommended. Without it, PostHog creates anonymous person profiles for every visitor, which consumes your event quota faster.

4. **Feature flag caching.** Client-side flags are cached after initial load. Call `posthog.reloadFeatureFlags()` after user login or property changes to get updated targeting.

5. **Server-side flag latency.** Each `isFeatureEnabled()` call makes a network request unless you use local evaluation (requires `personalApiKey`). Local evaluation polls flag definitions every 30 seconds.

6. **Flush before exit.** Server-side SDK batches events. Call `await posthog.shutdown()` before process exit (Lambda, etc.) or events will be lost.

7. **Session replay increases bundle size.** Session recording adds ~60KB to your client bundle. Only enable if you actively use it. Configure `session_recording: { maskAllInputs: true }` for privacy.

8. **EU vs US data residency.** Choose at project creation time. You cannot migrate between regions later. Use the correct host URL for your region.

9. **Property naming.** Use snake_case for custom properties. Properties starting with `$` are reserved by PostHog. Avoid changing property types (string vs number) after first use.

10. **Rate limits on free tier.** 1M events/month, 5K session recordings. Events beyond the limit are dropped silently. Set up billing alerts in project settings.
