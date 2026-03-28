---
provider: resend
display_name: Resend
category: email
subcategories:
  - transactional-email
  - email-templates
  - webhooks
required_credentials:
  - RESEND_API_KEY
optional_credentials:
  - RESEND_WEBHOOK_SECRET
  - RESEND_AUDIENCE_ID
frameworks:
  - next.js
  - react-email
  - node.js
  - python
osp_service_id: resend/email
docs_url: https://resend.com/docs
api_base: https://api.resend.com
---

# Resend

Modern email API built for developers. Send transactional and marketing emails using React components as templates. First-class React Email integration.

## Quick Start

### 1. Get API key

Create at https://resend.com/api-keys.

### 2. Verify domain

Add DNS records from https://resend.com/domains to your domain's DNS settings:
- SPF record (TXT)
- DKIM records (CNAME x3)
- DMARC record (TXT)

### 3. Install

```bash
npm install resend
```

### 4. Send first email

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const { data, error } = await resend.emails.send({
  from: 'Acme <hello@acme.com>',
  to: ['user@example.com'],
  subject: 'Hello World',
  html: '<p>Welcome to Acme!</p>',
})
```

## Credentials

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `RESEND_API_KEY` | API key for sending emails | Dashboard > API Keys |
| `RESEND_WEBHOOK_SECRET` | Secret for verifying webhook signatures | Dashboard > Webhooks |
| `RESEND_AUDIENCE_ID` | Audience ID for managing contacts (marketing) | Dashboard > Audiences |

### API Key Types

- **Full Access**: send emails, manage domains, manage API keys
- **Sending Access**: only send emails — use this in production applications
- Domain-scoped keys restrict sending to a specific verified domain

## Common Operations

### Send Email

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Simple HTML email
const { data, error } = await resend.emails.send({
  from: 'Acme <noreply@acme.com>',
  to: ['user@example.com'],
  subject: 'Order Confirmation',
  html: '<h1>Order #1234 Confirmed</h1><p>Thank you for your purchase.</p>',
})

// With CC, BCC, Reply-To
const { data } = await resend.emails.send({
  from: 'Support <support@acme.com>',
  to: ['user@example.com'],
  cc: ['manager@acme.com'],
  bcc: ['logs@acme.com'],
  replyTo: 'support@acme.com',
  subject: 'Your Support Ticket #567',
  html: '<p>We received your ticket.</p>',
})

// With attachments
const { data } = await resend.emails.send({
  from: 'Billing <billing@acme.com>',
  to: ['user@example.com'],
  subject: 'Invoice #890',
  html: '<p>Please find your invoice attached.</p>',
  attachments: [
    {
      filename: 'invoice.pdf',
      content: Buffer.from(pdfBytes).toString('base64'),
    },
  ],
})

// With custom headers and tags
const { data } = await resend.emails.send({
  from: 'Acme <noreply@acme.com>',
  to: ['user@example.com'],
  subject: 'Welcome',
  html: '<p>Welcome!</p>',
  tags: [
    { name: 'category', value: 'onboarding' },
    { name: 'user_id', value: '123' },
  ],
  headers: {
    'X-Entity-Ref-ID': 'unique-id-123',
  },
})
```

### React Email Templates

```bash
npm install @react-email/components react-email
```

```typescript
// emails/welcome.tsx
import {
  Html, Head, Body, Container, Section,
  Text, Button, Heading, Preview, Hr, Link,
} from '@react-email/components'

interface WelcomeEmailProps {
  userName: string
  loginUrl: string
}

export default function WelcomeEmail({ userName, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Acme, {userName}!</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Heading>Welcome, {userName}!</Heading>
          <Text>Thanks for signing up. Get started by logging in:</Text>
          <Section style={{ textAlign: 'center', marginTop: '32px' }}>
            <Button
              href={loginUrl}
              style={{
                backgroundColor: '#000',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              Log In to Acme
            </Button>
          </Section>
          <Hr />
          <Text style={{ color: '#666', fontSize: '12px' }}>
            If you didn't create this account, please ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

```typescript
// Send using React component
import { Resend } from 'resend'
import WelcomeEmail from '@/emails/welcome'

const resend = new Resend(process.env.RESEND_API_KEY)

const { data, error } = await resend.emails.send({
  from: 'Acme <noreply@acme.com>',
  to: ['user@example.com'],
  subject: 'Welcome to Acme!',
  react: WelcomeEmail({ userName: 'Alice', loginUrl: 'https://acme.com/login' }),
})
```

### Batch Sending

```typescript
const { data, error } = await resend.batch.send([
  {
    from: 'Acme <noreply@acme.com>',
    to: ['user1@example.com'],
    subject: 'Welcome',
    html: '<p>Welcome User 1!</p>',
  },
  {
    from: 'Acme <noreply@acme.com>',
    to: ['user2@example.com'],
    subject: 'Welcome',
    html: '<p>Welcome User 2!</p>',
  },
])
// Returns array of { id } for each email
```

### Audiences & Contacts (Marketing)

```typescript
// Add contact to audience
const { data } = await resend.contacts.create({
  audienceId: process.env.RESEND_AUDIENCE_ID!,
  email: 'user@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  unsubscribed: false,
})

// List contacts
const { data } = await resend.contacts.list({
  audienceId: process.env.RESEND_AUDIENCE_ID!,
})

// Remove contact
await resend.contacts.remove({
  audienceId: process.env.RESEND_AUDIENCE_ID!,
  email: 'user@example.com',
})
```

### Webhooks

```typescript
// app/api/webhooks/resend/route.ts
import { Webhook } from 'svix'

export async function POST(req: Request) {
  const body = await req.text()
  const headers = Object.fromEntries(req.headers)

  const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!)

  try {
    const event = wh.verify(body, {
      'svix-id': headers['svix-id'],
      'svix-timestamp': headers['svix-timestamp'],
      'svix-signature': headers['svix-signature'],
    })

    switch ((event as any).type) {
      case 'email.sent':
        console.log('Email sent:', (event as any).data.email_id)
        break
      case 'email.delivered':
        console.log('Email delivered')
        break
      case 'email.bounced':
        console.log('Email bounced — remove from list')
        break
      case 'email.complained':
        console.log('Spam complaint — unsubscribe user')
        break
    }
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  return new Response('OK')
}
```

## Framework Guides

### Next.js — Contact Form

```typescript
// app/actions.ts
'use server'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendContactForm(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const message = formData.get('message') as string

  const { error } = await resend.emails.send({
    from: 'Contact Form <noreply@acme.com>',
    to: ['team@acme.com'],
    replyTo: email,
    subject: `Contact from ${name}`,
    html: `<p><strong>From:</strong> ${name} (${email})</p><p>${message}</p>`,
  })

  if (error) throw new Error('Failed to send email')
  return { success: true }
}
```

### Preview Emails Locally

```json
// package.json
{
  "scripts": {
    "email:dev": "email dev --dir emails --port 3001"
  }
}
```

```bash
npm run email:dev
# Opens browser at localhost:3001 with live preview of all email templates
```

### Python

```bash
pip install resend
```

```python
import resend
import os

resend.api_key = os.environ["RESEND_API_KEY"]

params: resend.Emails.SendParams = {
    "from": "Acme <noreply@acme.com>",
    "to": ["user@example.com"],
    "subject": "Hello from Python",
    "html": "<p>Welcome!</p>",
}

email = resend.Emails.send(params)
print(email["id"])
```

## Gotchas

1. **Domain verification required for production.** Without a verified domain, you can only send from `onboarding@resend.dev` to your own email. Verify your domain first.

2. **DNS propagation takes time.** After adding SPF/DKIM/DMARC records, verification can take 24-72 hours. Do not delete and re-add records during this period.

3. **`from` address format matters.** Use `Name <email@domain.com>` format. The domain must be verified. Subdomains like `mail.acme.com` must be verified separately.

4. **Rate limits.** Free tier: 100 emails/day, 1 email/second. Pro: 50,000/month. Batch endpoint: max 100 emails per call.

5. **React Email requires Node.js.** React components are rendered server-side to HTML. They cannot be used from edge runtimes directly — render to HTML string first, then pass as `html` field.

6. **Webhook verification uses Svix.** Install `svix` package. Resend uses Svix under the hood, same as Clerk webhooks.

7. **Unsubscribe headers.** For marketing emails, include `List-Unsubscribe` header to comply with email standards. Resend adds this automatically for audience-based sends.

8. **Email size limit.** Max 40MB per email including attachments. Base64 encoding increases attachment size by ~33%.

9. **Testing with `onboarding@resend.dev`.** During development, use the Resend test address. Emails sent from this address are not subject to domain verification but can only be delivered to your account email.

10. **Idempotency.** Resend does not deduplicate. If you retry a failed API call, you may send duplicate emails. Use `X-Entity-Ref-ID` header or implement your own deduplication.
