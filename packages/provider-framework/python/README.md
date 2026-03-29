# osp-provider

FastAPI router that turns any FastAPI app into an OSP-compliant provider. Implements the [Open Service Protocol](https://osp.dev) specification for AI agents to discover, provision, and manage your services.

## Quick Start

```bash
pip install osp-provider
```

```python
from fastapi import FastAPI
from osp_provider import create_osp_router, ServiceManifest, ProvisionRequest, ProvisionResponse, ResourceStatus

app = FastAPI()

manifest = ServiceManifest(
    manifest_id="mf_myservice_v1",
    manifest_version=1,
    provider_id="myservice.com",
    display_name="My Service",
    offerings=[{
        "offering_id": "myservice/api",
        "name": "My API Service",
        "category": "ai",
        "tiers": [{"tier_id": "free", "name": "Free", "price": {"amount": "0", "currency": "USD"}}],
        "credentials_schema": {"type": "object", "properties": {"api_key": {"type": "string"}}},
    }],
    endpoints={
        "provision": "/osp/v1/provision",
        "deprovision": "/osp/v1/deprovision",
        "credentials": "/osp/v1/credentials",
        "status": "/osp/v1/status",
        "health": "/osp/v1/health",
    },
    provider_signature="your-ed25519-signature",
)


async def handle_provision(req: ProvisionRequest) -> ProvisionResponse:
    return ProvisionResponse(
        request_id=f"req_{id(req)}",
        offering_id=req.offering_id,
        tier_id=req.tier_id,
        status="active",
        resource_id=f"res_{id(req)}",
        created_at="2026-01-01T00:00:00Z",
    )


async def handle_deprovision(resource_id: str) -> None:
    pass  # Delete the resource


async def handle_status(resource_id: str) -> ResourceStatus:
    return ResourceStatus(
        resource_id=resource_id,
        status="active",
        offering_id="myservice/api",
        tier_id="free",
        created_at="2026-01-01T00:00:00Z",
    )


router = create_osp_router(
    manifest=manifest,
    on_provision=handle_provision,
    on_deprovision=handle_deprovision,
    on_status=handle_status,
)
app.include_router(router, prefix="/osp")
```

Run with `uvicorn main:app` -- your provider is discoverable at `http://localhost:8000/osp/.well-known/osp.json`.

## What You Get

- **Auto-serves `/.well-known/osp.json`** from the manifest you provide
- **Request validation** with Pydantic models matching the OSP spec
- **Rate limiting middleware** with IETF-standard `RateLimit-*` headers (Section 8.6)
- **Standardized error responses** with OSP error codes
- **Request logging** with resource_id tracing
- **`X-OSP-Version` header** on all responses
- **Sandbox mode support** via the `sandbox` field in provision requests

## Endpoints Created

| Method | Path | Handler |
|--------|------|---------|
| GET | `/.well-known/osp.json` | Serves manifest |
| POST | `/v1/provision` | `on_provision` |
| DELETE | `/v1/deprovision/{resource_id}` | `on_deprovision` |
| GET | `/v1/status/{resource_id}` | `on_status` |
| POST | `/v1/rotate/{resource_id}` | `on_rotate` (optional) |
| GET | `/v1/usage/{resource_id}` | `on_usage` (optional) |
| GET | `/v1/health` | `on_health` (optional, defaults to healthy) |
| GET | `/v1/cost-summary` | `on_cost_summary` (optional) |

## Rate Limiting

Add the rate limiter middleware to your FastAPI app:

```python
from osp_provider import RateLimiter, RateLimiterConfig

app.add_middleware(
    RateLimiter,
    config=RateLimiterConfig(window_seconds=60, max_requests=100),
)
```

## Error Handling

Raise `OSPError` from any handler to return structured error responses:

```python
from osp_provider import OSPError

async def handle_provision(req):
    if req.region and req.region not in SUPPORTED_REGIONS:
        raise OSPError(400, "region_unavailable", f"Region {req.region} is not supported")
    # ...
```

## License

Apache-2.0
