import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OSPClient, OSPError } from "../src/client.js";
import { findOffering, findTier, verifyManifestSignature, fetchManifest, WELL_KNOWN_PATH } from "../src/manifest.js";
import { canonicalJson, base64urlEncode, base64urlDecode } from "../src/crypto.js";
import type {
  ServiceManifest,
  ProvisionResponse,
  CredentialBundle,
  ResourceStatus,
  HealthStatus,
  UsageReport,
} from "../src/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createTestManifest(overrides?: Partial<ServiceManifest>): ServiceManifest {
  return {
    manifest_id: "mf_test_provider",
    manifest_version: 1,
    previous_version: null,
    osp_spec_version: "1.1",
    provider_id: "test-provider.com",
    display_name: "Test Provider",
    provider_url: "https://test-provider.com",
    provider_public_key: "dGVzdC1wdWJsaWMta2V5LWJhc2U2NHVybA",
    offerings: [
      {
        offering_id: "test-provider/postgres",
        name: "Postgres Database",
        description: "Managed PostgreSQL",
        category: "database",
        tiers: [
          {
            tier_id: "free",
            name: "Free",
            price: { amount: "0.00", currency: "USD", interval: null },
            limits: { storage_mb: 500, connections: 10 },
            features: ["500 MB storage", "10 connections"],
          },
          {
            tier_id: "pro",
            name: "Pro",
            price: { amount: "25.00", currency: "USD", interval: "P1M" },
            limits: { storage_mb: 8192, connections: 100 },
            features: ["8 GB storage", "100 connections", "Point-in-time recovery"],
            escrow_profile: {
              timeout_seconds: 3600,
              verification_window_seconds: 900,
              dispute_window_seconds: 86400,
            },
            sla: "99.9%",
          },
        ],
        credentials_schema: {
          type: "object",
          properties: {
            connection_string: { type: "string" },
            api_key: { type: "string" },
          },
        },
        estimated_provision_seconds: 30,
        fulfillment_proof_type: "api_key_delivery",
        regions: ["us-east-1", "eu-west-1"],
        dependencies: [],
      },
      {
        offering_id: "test-provider/storage",
        name: "Object Storage",
        category: "storage",
        tiers: [
          {
            tier_id: "free",
            name: "Free",
            price: { amount: "0.00", currency: "USD" },
          },
        ],
        credentials_schema: {
          type: "object",
          properties: {
            bucket_url: { type: "string" },
            access_key: { type: "string" },
          },
        },
      },
    ],
    accepted_payment_methods: ["free", "stripe_spt"],
    trust_tier_required: 0,
    endpoints: {
      provision: "/osp/v1/provision",
      deprovision: "/osp/v1/resources/:resource_id",
      credentials: "/osp/v1/resources/:resource_id/credentials",
      rotate: "/osp/v1/resources/:resource_id/credentials/rotate",
      status: "/osp/v1/resources/:resource_id/status",
      usage: "/osp/v1/resources/:resource_id/usage",
      health: "/osp/v1/health",
    },
    a2a: {
      agent_id: "test-agent",
      capabilities: ["provision", "deprovision"],
      task_lifecycle: true,
    },
    nhi: {
      short_lived_tokens: true,
      token_ttl_seconds: 3600,
      federation: ["oidc"],
    },
    finops: {
      budget_enforcement: true,
      cost_in_pr: true,
    },
    mcp: {
      tools: ["test_query"],
      streamable_http: false,
    },
    effective_at: "2026-01-01T00:00:00Z",
    provider_signature: "dGVzdC1zaWduYXR1cmU",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const originalFetch = globalThis.fetch;

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  globalThis.fetch = vi.fn(
    (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      return Promise.resolve(handler(url, init));
    },
  ) as unknown as typeof fetch;
}

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

beforeEach(() => {
  // Ensure a clean state
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Manifest discovery
// ---------------------------------------------------------------------------

describe("manifest discovery", () => {
  it("fetches manifest from .well-known URL", async () => {
    const manifest = createTestManifest();

    mockFetch((url) => {
      expect(url).toBe("https://test-provider.com/.well-known/osp.json");
      return jsonResponse(manifest);
    });

    const result = await fetchManifest("https://test-provider.com");
    expect(result.manifest_id).toBe("mf_test_provider");
    expect(result.offerings).toHaveLength(2);
  });

  it("adds https:// if no protocol is provided", async () => {
    const manifest = createTestManifest();

    mockFetch((url) => {
      expect(url).toBe("https://test-provider.com/.well-known/osp.json");
      return jsonResponse(manifest);
    });

    await fetchManifest("test-provider.com");
  });

  it("strips trailing slashes from provider URL", async () => {
    const manifest = createTestManifest();

    mockFetch((url) => {
      expect(url).toBe("https://test-provider.com/.well-known/osp.json");
      return jsonResponse(manifest);
    });

    await fetchManifest("https://test-provider.com///");
  });

  it("throws on non-2xx response", async () => {
    mockFetch(() => new Response("Not Found", { status: 404 }));

    await expect(fetchManifest("https://missing.com")).rejects.toThrow(
      /Failed to fetch manifest/,
    );
  });
});

// ---------------------------------------------------------------------------
// OSPClient.discover
// ---------------------------------------------------------------------------

describe("OSPClient.discover", () => {
  it("caches manifests in memory", async () => {
    const manifest = createTestManifest();
    let fetchCount = 0;

    mockFetch(() => {
      fetchCount++;
      return jsonResponse(manifest);
    });

    const client = new OSPClient();
    const first = await client.discover("https://test-provider.com");
    const second = await client.discover("https://test-provider.com");

    expect(first).toStrictEqual(second);
    expect(fetchCount).toBe(1);
  });

  it("clearCache forces a re-fetch", async () => {
    const manifest = createTestManifest();
    let fetchCount = 0;

    mockFetch(() => {
      fetchCount++;
      return jsonResponse(manifest);
    });

    const client = new OSPClient();
    await client.discover("https://test-provider.com");
    client.clearCache();
    await client.discover("https://test-provider.com");

    expect(fetchCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// OSPClient.discoverFromRegistry
// ---------------------------------------------------------------------------

describe("OSPClient.discoverFromRegistry", () => {
  it("queries the registry with optional category filter", async () => {
    const manifests = [createTestManifest()];

    mockFetch((url) => {
      expect(url).toContain("registry.osp.dev/v1/manifests");
      expect(url).toContain("category=database");
      return jsonResponse(manifests);
    });

    const client = new OSPClient();
    const results = await client.discoverFromRegistry({ category: "database" });
    expect(results).toHaveLength(1);
  });

  it("uses a custom registry URL", async () => {
    const manifests: ServiceManifest[] = [];

    mockFetch((url) => {
      expect(url).toContain("my-registry.example.com/v1/manifests");
      return jsonResponse(manifests);
    });

    const client = new OSPClient({ registryUrl: "https://my-registry.example.com" });
    const results = await client.discoverFromRegistry();
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Provisioning
// ---------------------------------------------------------------------------

describe("OSPClient.provision", () => {
  it("sends a POST to the provider provision endpoint", async () => {
    const manifest = createTestManifest();
    const provisionResponse: ProvisionResponse = {
      resource_id: "res_abc123",
      status: "active",
      credentials: {
        resource_id: "res_abc123",
        credentials: {
          connection_string: "postgres://user:pass@host:5432/db",
          api_key: "sk_test_123",
        },
        issued_at: "2026-01-15T10:30:00Z",
      },
      dashboard_url: "https://test-provider.com/dashboard/res_abc123",
      fulfillment_proof: "proof_xyz",
    };

    mockFetch((url, init) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      // Provision endpoint
      expect(url).toBe("https://test-provider.com/osp/v1/provision");
      expect(init?.method).toBe("POST");

      const body = JSON.parse(init?.body as string);
      expect(body.offering_id).toBe("test-provider/postgres");
      expect(body.tier_id).toBe("free");
      expect(body.project_name).toBe("my-test-db");

      return jsonResponse(provisionResponse);
    });

    const client = new OSPClient();
    const result = await client.provision("https://test-provider.com", {
      offering_id: "test-provider/postgres",
      tier_id: "free",
      project_name: "my-test-db",
      nonce: "unique-nonce-123",
    });

    expect(result.resource_id).toBe("res_abc123");
    expect(result.status).toBe("active");
    expect(result.credentials?.credentials?.connection_string).toBe(
      "postgres://user:pass@host:5432/db",
    );
  });

  it("includes auth token in requests", async () => {
    const manifest = createTestManifest();
    const provisionResponse: ProvisionResponse = {
      resource_id: "res_xyz",
      status: "provisioning",
    };

    mockFetch((url, init) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer my-agent-token");
      return jsonResponse(provisionResponse);
    });

    const client = new OSPClient({ authToken: "my-agent-token" });
    const result = await client.provision("https://test-provider.com", {
      offering_id: "test-provider/postgres",
      tier_id: "free",
      project_name: "authed-project",
      nonce: "nonce-456",
    });

    expect(result.resource_id).toBe("res_xyz");
  });

  it("includes v1.1 fields in provision request", async () => {
    const manifest = createTestManifest();
    const provisionResponse: ProvisionResponse = {
      resource_id: "res_v11",
      status: "active",
      cost_estimate: { monthly_estimate: "25.00", currency: "USD" },
      trace_id: "trace_123",
    };

    mockFetch((url, init) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      const body = JSON.parse(init?.body as string);
      expect(body.nhi_token_mode).toBe("short_lived");
      expect(body.budget).toEqual({ max_monthly_cost: "50.00", currency: "USD" });
      expect(body.trace_context).toBe("trace-ctx");
      return jsonResponse(provisionResponse);
    });

    const client = new OSPClient();
    const result = await client.provision("https://test-provider.com", {
      offering_id: "test-provider/postgres",
      tier_id: "pro",
      project_name: "v11-project",
      nonce: "nonce-v11",
      nhi_token_mode: "short_lived",
      budget: { max_monthly_cost: "50.00", currency: "USD" },
      trace_context: "trace-ctx",
    });

    expect(result.cost_estimate?.monthly_estimate).toBe("25.00");
    expect(result.trace_id).toBe("trace_123");
  });
});

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

describe("OSPClient credentials", () => {
  it("getCredentials fetches credential bundle", async () => {
    const manifest = createTestManifest();
    const creds: CredentialBundle = {
      resource_id: "res_abc123",
      credentials: {
        connection_string: "postgres://user:pass@host:5432/db",
        api_key: "sk_live_456",
      },
      issued_at: "2026-01-15T10:30:00Z",
      expires_at: "2026-04-15T10:30:00Z",
    };

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      expect(url).toBe(
        "https://test-provider.com/osp/v1/resources/res_abc123/credentials",
      );
      return jsonResponse(creds);
    });

    const client = new OSPClient();
    const result = await client.getCredentials(
      "https://test-provider.com",
      "res_abc123",
    );

    expect(result.resource_id).toBe("res_abc123");
    expect(result.credentials?.api_key).toBe("sk_live_456");
    expect(result.expires_at).toBe("2026-04-15T10:30:00Z");
  });

  it("rotateCredentials posts to rotate endpoint", async () => {
    const manifest = createTestManifest();
    const newCreds: CredentialBundle = {
      resource_id: "res_abc123",
      credentials: {
        api_key: "sk_live_789_rotated",
      },
      issued_at: "2026-03-27T12:00:00Z",
    };

    mockFetch((url, init) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      expect(url).toBe(
        "https://test-provider.com/osp/v1/resources/res_abc123/credentials/rotate",
      );
      expect(init?.method).toBe("POST");
      return jsonResponse(newCreds);
    });

    const client = new OSPClient();
    const result = await client.rotateCredentials(
      "https://test-provider.com",
      "res_abc123",
    );

    expect(result.credentials?.api_key).toBe("sk_live_789_rotated");
  });
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe("OSPClient lifecycle", () => {
  it("getStatus returns resource status", async () => {
    const manifest = createTestManifest();
    const status: ResourceStatus = {
      resource_id: "res_abc123",
      status: "active",
      offering_id: "test-provider/postgres",
      tier_id: "free",
      region: "us-east-1",
      created_at: "2026-01-15T10:30:00Z",
      updated_at: "2026-01-15T10:31:00Z",
    };

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      expect(url).toBe(
        "https://test-provider.com/osp/v1/resources/res_abc123/status",
      );
      return jsonResponse(status);
    });

    const client = new OSPClient();
    const result = await client.getStatus(
      "https://test-provider.com",
      "res_abc123",
    );

    expect(result.status).toBe("active");
    expect(result.region).toBe("us-east-1");
  });

  it("deprovision sends DELETE", async () => {
    const manifest = createTestManifest();

    mockFetch((url, init) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      expect(url).toBe(
        "https://test-provider.com/osp/v1/resources/res_abc123",
      );
      expect(init?.method).toBe("DELETE");
      return jsonResponse({}, 200);
    });

    const client = new OSPClient();
    await expect(
      client.deprovision("https://test-provider.com", "res_abc123"),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

describe("OSPClient.getUsage", () => {
  it("fetches usage report", async () => {
    const manifest = createTestManifest();
    const usage: UsageReport = {
      resource_id: "res_abc123",
      period_start: "2026-03-01T00:00:00Z",
      period_end: "2026-03-27T00:00:00Z",
      dimensions: [
        { name: "storage_bytes", value: 1073741824, unit: "bytes" },
        { name: "api_calls", value: 15420, unit: "calls" },
      ],
      total_cost: { amount: "0.00", currency: "USD" },
    };

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      expect(url).toBe(
        "https://test-provider.com/osp/v1/resources/res_abc123/usage",
      );
      return jsonResponse(usage);
    });

    const client = new OSPClient();
    const result = await client.getUsage(
      "https://test-provider.com",
      "res_abc123",
    );

    expect(result.dimensions).toHaveLength(2);
    expect(result.dimensions[0]?.name).toBe("storage_bytes");
  });

  it("throws when provider has no usage endpoint", async () => {
    const manifest = createTestManifest({
      endpoints: {
        provision: "/osp/v1/provision",
        deprovision: "/osp/v1/resources/:resource_id",
        credentials: "/osp/v1/resources/:resource_id/credentials",
        status: "/osp/v1/resources/:resource_id/status",
        health: "/osp/v1/health",
        usage: undefined,
      },
    });

    mockFetch(() => jsonResponse(manifest));

    const client = new OSPClient();
    await expect(
      client.getUsage("https://test-provider.com", "res_abc123"),
    ).rejects.toThrow(/usage endpoint/i);
  });
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

describe("OSPClient.checkHealth", () => {
  it("returns health status with latency", async () => {
    const manifest = createTestManifest();
    const health: HealthStatus = {
      status: "healthy",
      version: "1.2.3",
      checked_at: "2026-03-27T12:00:00Z",
    };

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      expect(url).toBe("https://test-provider.com/osp/v1/health");
      return jsonResponse(health);
    });

    const client = new OSPClient();
    const result = await client.checkHealth("https://test-provider.com");

    expect(result.status).toBe("healthy");
    expect(result.version).toBe("1.2.3");
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("error handling", () => {
  it("throws OSPError with structured error body", async () => {
    const manifest = createTestManifest();

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      return jsonResponse(
        {
          error: "Offering not found",
          code: "OFFERING_NOT_FOUND",
          details: { offering_id: "invalid/offering" },
        },
        404,
      );
    });

    const client = new OSPClient({ retry: { maxRetries: 0 } });

    try {
      await client.provision("https://test-provider.com", {
        offering_id: "invalid/offering",
        tier_id: "free",
        project_name: "test",
        nonce: "nonce",
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(OSPError);
      const ospErr = err as OSPError;
      expect(ospErr.code).toBe("OFFERING_NOT_FOUND");
      expect(ospErr.statusCode).toBe(404);
      expect(ospErr.details?.offering_id).toBe("invalid/offering");
    }
  });

  it("handles non-JSON error responses gracefully", async () => {
    const manifest = createTestManifest();

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      return new Response("Internal Server Error", { status: 500 });
    });

    const client = new OSPClient({ retry: { maxRetries: 0 } });

    try {
      await client.getStatus("https://test-provider.com", "res_abc123");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(OSPError);
      const ospErr = err as OSPError;
      expect(ospErr.statusCode).toBe(500);
      expect(ospErr.code).toBe("HTTP_500");
    }
  });
});

// ---------------------------------------------------------------------------
// Retry behavior
// ---------------------------------------------------------------------------

describe("retry behavior", () => {
  it("retries on 500 status codes", async () => {
    const manifest = createTestManifest();
    let attempt = 0;

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      attempt++;
      if (attempt < 3) {
        return new Response("Server Error", { status: 500 });
      }
      return jsonResponse({ status: "healthy", checked_at: "2026-03-27T12:00:00Z" });
    });

    const client = new OSPClient({
      retry: { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 50 },
    });
    const result = await client.checkHealth("https://test-provider.com");
    expect(result.status).toBe("healthy");
    expect(attempt).toBe(3);
  });

  it("retries on 429 with Retry-After header", async () => {
    const manifest = createTestManifest();
    let attempt = 0;

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      attempt++;
      if (attempt === 1) {
        return jsonResponse(
          { error: "rate_limited" },
          429,
          { "Retry-After": "1" },
        );
      }
      return jsonResponse({ status: "healthy", checked_at: "2026-03-27T12:00:00Z" });
    });

    const client = new OSPClient({
      retry: { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 50 },
    });
    const result = await client.checkHealth("https://test-provider.com");
    expect(result.status).toBe("healthy");
    expect(attempt).toBe(2);
  });

  it("does not retry on 400 errors", async () => {
    const manifest = createTestManifest();
    let attempt = 0;

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      attempt++;
      return jsonResponse({ error: "Bad Request", code: "BAD_REQUEST" }, 400);
    });

    const client = new OSPClient({
      retry: { maxRetries: 3, baseDelayMs: 10 },
    });

    await expect(
      client.getStatus("https://test-provider.com", "res_abc"),
    ).rejects.toThrow(OSPError);
    expect(attempt).toBe(1);
  });

  it("respects timeout configuration", async () => {
    const manifest = createTestManifest();

    mockFetch(async (url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      // Simulate a very slow response
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return jsonResponse({});
    });

    const client = new OSPClient({
      timeoutMs: 50,
      retry: { maxRetries: 0 },
    });

    await expect(
      client.checkHealth("https://test-provider.com"),
    ).rejects.toThrow();
  });

  it("uses custom retry configuration", async () => {
    const manifest = createTestManifest();
    let attempt = 0;

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      attempt++;
      return new Response("Error", { status: 503 });
    });

    const client = new OSPClient({
      retry: { maxRetries: 1, baseDelayMs: 10, maxDelayMs: 20 },
    });

    await expect(
      client.checkHealth("https://test-provider.com"),
    ).rejects.toThrow(OSPError);
    // 1 initial + 1 retry = 2
    expect(attempt).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Manifest helpers
// ---------------------------------------------------------------------------

describe("manifest helpers", () => {
  it("findOffering returns matching offering", () => {
    const manifest = createTestManifest();
    const offering = findOffering(manifest, "test-provider/postgres");
    expect(offering).not.toBeNull();
    expect(offering?.name).toBe("Postgres Database");
  });

  it("findOffering returns null for unknown offering", () => {
    const manifest = createTestManifest();
    expect(findOffering(manifest, "unknown/service")).toBeNull();
  });

  it("findTier returns matching tier", () => {
    const manifest = createTestManifest();
    const offering = findOffering(manifest, "test-provider/postgres")!;
    const tier = findTier(offering, "pro");
    expect(tier).not.toBeNull();
    expect(tier?.price.amount).toBe("25.00");
    expect(tier?.price.interval).toBe("P1M");
  });

  it("findTier returns null for unknown tier", () => {
    const manifest = createTestManifest();
    const offering = findOffering(manifest, "test-provider/postgres")!;
    expect(findTier(offering, "enterprise")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Manifest signature verification
// ---------------------------------------------------------------------------

describe("manifest signature verification", () => {
  it("returns false when public key is missing", async () => {
    const manifest = createTestManifest({ provider_public_key: undefined });
    expect(await verifyManifestSignature(manifest)).toBe(false);
  });

  it("returns false when signature is missing", async () => {
    const manifest = createTestManifest();
    (manifest as Record<string, unknown>).provider_signature = "";
    expect(await verifyManifestSignature(manifest)).toBe(false);
  });

  it("returns false for an invalid signature", async () => {
    const manifest = createTestManifest({
      provider_public_key: "dGVzdC1wdWJsaWMta2V5",
      provider_signature: "aW52YWxpZC1zaWduYXR1cmU",
    });
    expect(await verifyManifestSignature(manifest)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Canonical JSON
// ---------------------------------------------------------------------------

describe("canonicalJson", () => {
  it("sorts keys deterministically", () => {
    const obj = { z: 1, a: 2, m: { y: 3, b: 4 } };
    const json = canonicalJson(obj);
    expect(json).toBe('{"a":2,"m":{"b":4,"y":3},"z":1}');
  });

  it("preserves arrays in order", () => {
    const obj = { items: [3, 1, 2] };
    expect(canonicalJson(obj)).toBe('{"items":[3,1,2]}');
  });

  it("handles null and primitives", () => {
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson("hello")).toBe('"hello"');
    expect(canonicalJson(42)).toBe("42");
  });

  it("handles nested arrays with objects", () => {
    const obj = { arr: [{ z: 1, a: 2 }, { y: 3, b: 4 }] };
    expect(canonicalJson(obj)).toBe('{"arr":[{"a":2,"z":1},{"b":4,"y":3}]}');
  });

  it("handles empty objects and arrays", () => {
    expect(canonicalJson({})).toBe("{}");
    expect(canonicalJson([])).toBe("[]");
    expect(canonicalJson({ a: [], b: {} })).toBe('{"a":[],"b":{}}');
  });
});

// ---------------------------------------------------------------------------
// Base64url encoding/decoding
// ---------------------------------------------------------------------------

describe("base64url", () => {
  it("round-trips arbitrary bytes", () => {
    const original = new Uint8Array([0, 1, 2, 255, 254, 128, 63, 62]);
    const encoded = base64urlEncode(original);

    expect(encoded).not.toMatch(/[+/=]/);

    const decoded = base64urlDecode(encoded);
    expect(decoded).toEqual(original);
  });

  it("decodes standard base64url strings", () => {
    const decoded = base64urlDecode("SGVsbG8sIFdvcmxkIQ");
    const text = new TextDecoder().decode(decoded);
    expect(text).toBe("Hello, World!");
  });

  it("handles empty input", () => {
    const encoded = base64urlEncode(new Uint8Array([]));
    expect(encoded).toBe("");
  });

  it("encodes without padding", () => {
    const input = new TextEncoder().encode("test");
    const encoded = base64urlEncode(input);
    expect(encoded).not.toContain("=");
  });
});

// ---------------------------------------------------------------------------
// WELL_KNOWN_PATH constant
// ---------------------------------------------------------------------------

describe("WELL_KNOWN_PATH", () => {
  it("is the correct .well-known path", () => {
    expect(WELL_KNOWN_PATH).toBe("/.well-known/osp.json");
  });
});

// ---------------------------------------------------------------------------
// v1.1 manifest fields
// ---------------------------------------------------------------------------

describe("v1.1 manifest fields", () => {
  it("manifest has A2A agent card", () => {
    const manifest = createTestManifest();
    expect(manifest.a2a).toBeDefined();
    expect(manifest.a2a?.agent_id).toBe("test-agent");
    expect(manifest.a2a?.capabilities).toContain("provision");
    expect(manifest.a2a?.task_lifecycle).toBe(true);
  });

  it("manifest has NHI config", () => {
    const manifest = createTestManifest();
    expect(manifest.nhi).toBeDefined();
    expect(manifest.nhi?.short_lived_tokens).toBe(true);
    expect(manifest.nhi?.token_ttl_seconds).toBe(3600);
    expect(manifest.nhi?.federation).toContain("oidc");
  });

  it("manifest has FinOps config", () => {
    const manifest = createTestManifest();
    expect(manifest.finops).toBeDefined();
    expect(manifest.finops?.budget_enforcement).toBe(true);
    expect(manifest.finops?.cost_in_pr).toBe(true);
  });

  it("manifest has MCP config", () => {
    const manifest = createTestManifest();
    expect(manifest.mcp).toBeDefined();
    expect(manifest.mcp?.tools).toContain("test_query");
    expect(manifest.mcp?.streamable_http).toBe(false);
  });

  it("manifest has osp_spec_version", () => {
    const manifest = createTestManifest();
    expect(manifest.osp_spec_version).toBe("1.1");
  });

  it("offering can have dependencies", () => {
    const manifest = createTestManifest();
    expect(manifest.offerings[0]?.dependencies).toEqual([]);
  });

  it("tier can have SLA and TTL", () => {
    const manifest = createTestManifest();
    const offering = findOffering(manifest, "test-provider/postgres")!;
    const proTier = findTier(offering, "pro");
    expect(proTier?.sla).toBe("99.9%");
  });
});

// ---------------------------------------------------------------------------
// OSPClient constructor options
// ---------------------------------------------------------------------------

describe("OSPClient constructor", () => {
  it("uses default values when no options provided", () => {
    const client = new OSPClient();
    expect(client).toBeInstanceOf(OSPClient);
  });

  it("accepts all option fields", () => {
    const client = new OSPClient({
      registryUrl: "https://custom-registry.com",
      authToken: "my-token",
      timeoutMs: 5000,
      retry: {
        maxRetries: 5,
        baseDelayMs: 100,
        maxDelayMs: 5000,
        jitter: 0.1,
      },
    });
    expect(client).toBeInstanceOf(OSPClient);
  });
});
