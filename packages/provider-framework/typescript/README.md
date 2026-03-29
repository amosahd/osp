# @osp/provider

Express.js middleware that turns any Express app into an OSP-compliant provider. Implements the [Open Service Protocol](https://osp.dev) specification for AI agents to discover, provision, and manage your services.

## Quick Start

```bash
npm install @osp/provider express
```

```typescript
import express from 'express';
import { createOSPProvider } from '@osp/provider';

const app = express();

const osp = createOSPProvider({
  manifest: {
    manifest_id: 'mf_myservice_v1',
    manifest_version: 1,
    provider_id: 'myservice.com',
    display_name: 'My Service',
    offerings: [{
      offering_id: 'myservice/api',
      name: 'My API Service',
      category: 'ai',
      tiers: [{ tier_id: 'free', name: 'Free', price: { amount: '0', currency: 'USD' } }],
      credentials_schema: { type: 'object', properties: { api_key: { type: 'string' } } },
    }],
    endpoints: {
      provision: '/osp/v1/provision',
      deprovision: '/osp/v1/deprovision',
      credentials: '/osp/v1/credentials',
      status: '/osp/v1/status',
      health: '/osp/v1/health',
    },
    provider_signature: 'your-ed25519-signature',
  },

  onProvision: async (req) => ({
    request_id: `req_${Date.now()}`,
    offering_id: req.offering_id,
    tier_id: req.tier_id,
    status: 'active',
    resource_id: `res_${Date.now()}`,
    created_at: new Date().toISOString(),
  }),

  onDeprovision: async (resourceId) => {
    // Delete the resource
  },

  onStatus: async (resourceId) => ({
    resource_id: resourceId,
    status: 'active',
    offering_id: 'myservice/api',
    tier_id: 'free',
    created_at: new Date().toISOString(),
  }),
});

app.use('/osp', osp);
app.listen(3000, () => console.log('OSP provider running on :3000'));
```

Your provider is now discoverable at `http://localhost:3000/osp/.well-known/osp.json` and ready for agents.

## What You Get

- **Auto-serves `/.well-known/osp.json`** from the manifest you provide
- **Request validation** with Zod schemas matching the OSP spec
- **Rate limiting** with IETF-standard `RateLimit-*` headers (Section 8.6)
- **Standardized error responses** with OSP error codes
- **Request logging** with resource_id tracing
- **`X-OSP-Version` header** on all responses
- **Sandbox mode support** via the `sandbox` field in provision requests

## Endpoints Created

| Method | Path | Handler |
|--------|------|---------|
| GET | `/.well-known/osp.json` | Serves manifest |
| POST | `/v1/provision` | `onProvision` |
| DELETE | `/v1/deprovision/:resource_id` | `onDeprovision` |
| GET | `/v1/status/:resource_id` | `onStatus` |
| POST | `/v1/rotate/:resource_id` | `onRotate` (optional) |
| GET | `/v1/usage/:resource_id` | `onUsage` (optional) |
| GET | `/v1/health` | `onHealth` (optional, defaults to healthy) |
| GET | `/v1/cost-summary` | `onCostSummary` (optional) |

## Error Handling

Throw `OSPError` from any handler to return structured error responses:

```typescript
import { OSPError } from '@osp/provider';

onProvision: async (req) => {
  if (!isValidRegion(req.region)) {
    throw new OSPError(400, 'region_unavailable', `Region ${req.region} is not supported`);
  }
  // ...
}
```

## Rate Limiting

Rate limiting is enabled by default (60 req/min per IP). Customize it:

```typescript
createOSPProvider({
  // ...
  rateLimit: { windowMs: 60_000, maxRequests: 100 },
});
```

## License

Apache-2.0
