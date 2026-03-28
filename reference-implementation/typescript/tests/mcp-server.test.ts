import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  OSPMCPHandler,
  createOSPMCPHandler,
  OSP_TOOL_DEFINITIONS,
} from "../src/mcp-server.js";
import { OSPClient } from "../src/client.js";
import { OSPResolver } from "../src/resolver.js";
import type {
  ServiceManifest,
  ProvisionResponse,
  ResourceStatus,
  HealthStatus,
  UsageReport,
  CredentialBundle,
} from "../src/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeManifest(overrides?: Partial<ServiceManifest>): ServiceManifest {
  return {
    manifest_id: "mf_test",
    manifest_version: 1,
    previous_version: null,
    osp_spec_version: "1.1",
    provider_id: "test-provider.com",
    display_name: "Test Provider",
    provider_url: "https://test-provider.com",
    provider_public_key: "dGVzdC1rZXk",
    offerings: [
      {
        offering_id: "test-provider/postgres",
        name: "Postgres",
        description: "Managed PG",
        category: "database",
        tiers: [
          {
            tier_id: "free",
            name: "Free",
            price: { amount: "0.00", currency: "USD" },
          },
        ],
        credentials_schema: {
          type: "object",
          properties: { connection_string: { type: "string" } },
        },
        regions: ["us-east-1"],
      },
    ],
    accepted_payment_methods: ["free"],
    trust_tier_required: 0,
    endpoints: {
      provision: "/osp/v1/provision",
      deprovision: "/osp/v1/resources/:resource_id",
      credentials: "/osp/v1/resources/:resource_id/credentials",
      status: "/osp/v1/resources/:resource_id/status",
      usage: "/osp/v1/resources/:resource_id/usage",
      health: "/osp/v1/health",
    },
    mcp: {
      tools: ["test_query"],
      streamable_http: false,
    },
    effective_at: "2026-01-01T00:00:00Z",
    provider_signature: "c2ln",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock helpers
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

describe("OSP_TOOL_DEFINITIONS", () => {
  it("exports exactly 5 tool definitions", () => {
    expect(OSP_TOOL_DEFINITIONS).toHaveLength(5);
  });

  it("includes osp_discover", () => {
    const tool = OSP_TOOL_DEFINITIONS.find((t) => t.name === "osp_discover");
    expect(tool).toBeDefined();
    expect(tool?.description).toContain("Discover");
  });

  it("includes osp_provision", () => {
    const tool = OSP_TOOL_DEFINITIONS.find((t) => t.name === "osp_provision");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema).toHaveProperty("required");
  });

  it("includes osp_env", () => {
    const tool = OSP_TOOL_DEFINITIONS.find((t) => t.name === "osp_env");
    expect(tool).toBeDefined();
  });

  it("includes osp_status", () => {
    const tool = OSP_TOOL_DEFINITIONS.find((t) => t.name === "osp_status");
    expect(tool).toBeDefined();
    expect(tool?.inputSchema).toHaveProperty("required");
  });

  it("includes osp_skills", () => {
    const tool = OSP_TOOL_DEFINITIONS.find((t) => t.name === "osp_skills");
    expect(tool).toBeDefined();
  });

  it("all tools have name, description, and inputSchema", () => {
    for (const tool of OSP_TOOL_DEFINITIONS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// createOSPMCPHandler factory
// ---------------------------------------------------------------------------

describe("createOSPMCPHandler", () => {
  it("creates a handler with defaults", () => {
    const handler = createOSPMCPHandler();
    expect(handler).toBeInstanceOf(OSPMCPHandler);
  });

  it("creates a handler with custom client and resolver", () => {
    const client = new OSPClient();
    const resolver = new OSPResolver();
    const handler = createOSPMCPHandler({ client, resolver });
    expect(handler).toBeInstanceOf(OSPMCPHandler);
  });
});

// ---------------------------------------------------------------------------
// OSPMCPHandler.getToolDefinitions
// ---------------------------------------------------------------------------

describe("OSPMCPHandler.getToolDefinitions", () => {
  it("returns the tool definitions array", () => {
    const handler = new OSPMCPHandler();
    const defs = handler.getToolDefinitions();
    expect(defs).toEqual(OSP_TOOL_DEFINITIONS);
  });
});

// ---------------------------------------------------------------------------
// handleToolCall — unknown tool
// ---------------------------------------------------------------------------

describe("handleToolCall — unknown tool", () => {
  it("returns error for unknown tool", async () => {
    const handler = new OSPMCPHandler();
    const result = await handler.handleToolCall("nonexistent_tool", {});
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Unknown tool");
  });
});

// ---------------------------------------------------------------------------
// osp_discover
// ---------------------------------------------------------------------------

describe("osp_discover", () => {
  it("discovers a provider by URL", async () => {
    const manifest = makeManifest();

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      return jsonResponse({}, 404);
    });

    const handler = new OSPMCPHandler();
    const result = await handler.handleToolCall("osp_discover", {
      provider_url: "https://test-provider.com",
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].provider).toBe("Test Provider");
    expect(parsed[0].offerings).toHaveLength(1);
  });

  it("discovers from registry without provider_url", async () => {
    const manifests = [makeManifest()];

    mockFetch((url) => {
      if (url.includes("registry.osp.dev")) {
        return jsonResponse(manifests);
      }
      return jsonResponse({}, 404);
    });

    const handler = new OSPMCPHandler();
    const result = await handler.handleToolCall("osp_discover", {});

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text);
    expect(parsed).toHaveLength(1);
  });

  it("discovers from registry with category filter", async () => {
    mockFetch((url) => {
      expect(url).toContain("category=database");
      return jsonResponse([makeManifest()]);
    });

    const handler = new OSPMCPHandler();
    const result = await handler.handleToolCall("osp_discover", {
      category: "database",
    });

    expect(result.isError).toBeUndefined();
  });

  it("returns error on network failure", async () => {
    mockFetch(() => {
      throw new Error("Network failure");
    });

    const handler = new OSPMCPHandler(
      new OSPClient({ retry: { maxRetries: 0 } }),
    );
    const result = await handler.handleToolCall("osp_discover", {
      provider_url: "https://fail.com",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Error:");
  });
});

// ---------------------------------------------------------------------------
// osp_provision
// ---------------------------------------------------------------------------

describe("osp_provision", () => {
  it("provisions a resource successfully", async () => {
    const manifest = makeManifest();
    const provisionResp: ProvisionResponse = {
      resource_id: "res_test_123",
      status: "active",
      credentials: {
        resource_id: "res_test_123",
        credentials: { connection_string: "postgres://host/db" },
        issued_at: "2026-01-01T00:00:00Z",
      },
      dashboard_url: "https://test-provider.com/dash",
    };

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      if (url.includes("/osp/v1/provision")) {
        return jsonResponse(provisionResp);
      }
      return jsonResponse({}, 404);
    });

    const handler = new OSPMCPHandler();
    const result = await handler.handleToolCall("osp_provision", {
      provider_url: "https://test-provider.com",
      offering_id: "test-provider/postgres",
      tier_id: "free",
      project_name: "test-db",
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text);
    expect(parsed.resource_id).toBe("res_test_123");
    expect(parsed.status).toBe("active");
    expect(parsed.credentials_available).toBe(true);
  });

  it("returns error on provision failure", async () => {
    const manifest = makeManifest();

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) {
        return jsonResponse(manifest);
      }
      return jsonResponse(
        { error: "quota_exceeded", code: "QUOTA_EXCEEDED" },
        403,
      );
    });

    const handler = new OSPMCPHandler(
      new OSPClient({ retry: { maxRetries: 0 } }),
    );
    const result = await handler.handleToolCall("osp_provision", {
      provider_url: "https://test-provider.com",
      offering_id: "test-provider/postgres",
      tier_id: "free",
      project_name: "test-db",
    });

    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// osp_env
// ---------------------------------------------------------------------------

describe("osp_env", () => {
  it("returns empty message when no credentials stored", async () => {
    const handler = new OSPMCPHandler();
    const result = await handler.handleToolCall("osp_env", {});

    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.text).toContain("No credentials stored");
  });

  it("generates dotenv from stored credentials", async () => {
    const resolver = new OSPResolver({ envFallback: false });
    resolver.addCredential("test.com", "svc", { api_key: "sk_123" });

    const handler = new OSPMCPHandler(undefined, resolver);
    const result = await handler.handleToolCall("osp_env", {
      format: "plain",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.text).toContain("API_KEY=sk_123");
  });

  it("supports nextjs format", async () => {
    const resolver = new OSPResolver({ envFallback: false });
    resolver.addCredential("a.com", "svc", { supabase_anon_key: "eyJ..." });

    const handler = new OSPMCPHandler(undefined, resolver);
    const result = await handler.handleToolCall("osp_env", {
      format: "nextjs",
    });

    expect(result.content[0]?.text).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});

// ---------------------------------------------------------------------------
// osp_status
// ---------------------------------------------------------------------------

describe("osp_status", () => {
  it("returns resource status", async () => {
    const manifest = makeManifest();
    const status: ResourceStatus = {
      resource_id: "res_123",
      status: "active",
      offering_id: "test-provider/postgres",
      tier_id: "free",
      region: "us-east-1",
      created_at: "2026-01-01T00:00:00Z",
    };

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) return jsonResponse(manifest);
      if (url.includes("/status")) return jsonResponse(status);
      return jsonResponse({}, 404);
    });

    const handler = new OSPMCPHandler();
    const result = await handler.handleToolCall("osp_status", {
      provider_url: "https://test-provider.com",
      resource_id: "res_123",
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text);
    expect(parsed.status).toBe("active");
    expect(parsed.region).toBe("us-east-1");
  });

  it("includes usage data when include_usage is true", async () => {
    const manifest = makeManifest();
    const status: ResourceStatus = {
      resource_id: "res_123",
      status: "active",
      offering_id: "test-provider/postgres",
      tier_id: "free",
      created_at: "2026-01-01T00:00:00Z",
    };
    const usage: UsageReport = {
      resource_id: "res_123",
      period_start: "2026-03-01T00:00:00Z",
      period_end: "2026-03-28T00:00:00Z",
      dimensions: [{ name: "storage", value: 1024, unit: "bytes" }],
    };

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) return jsonResponse(manifest);
      if (url.includes("/usage")) return jsonResponse(usage);
      if (url.includes("/status")) return jsonResponse(status);
      return jsonResponse({}, 404);
    });

    const handler = new OSPMCPHandler();
    const result = await handler.handleToolCall("osp_status", {
      provider_url: "https://test-provider.com",
      resource_id: "res_123",
      include_usage: true,
    });

    const parsed = JSON.parse(result.content[0]!.text);
    expect(parsed.usage).toBeDefined();
    expect(parsed.usage.dimensions).toHaveLength(1);
  });

  it("handles usage endpoint failure gracefully", async () => {
    const manifest = makeManifest({
      endpoints: {
        provision: "/osp/v1/provision",
        deprovision: "/osp/v1/resources/:resource_id",
        credentials: "/osp/v1/resources/:resource_id/credentials",
        status: "/osp/v1/resources/:resource_id/status",
        health: "/osp/v1/health",
        usage: undefined,
      },
    });
    const status: ResourceStatus = {
      resource_id: "res_123",
      status: "active",
      offering_id: "test-provider/postgres",
      tier_id: "free",
      created_at: "2026-01-01T00:00:00Z",
    };

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) return jsonResponse(manifest);
      if (url.includes("/status")) return jsonResponse(status);
      return jsonResponse({}, 404);
    });

    const handler = new OSPMCPHandler(
      new OSPClient({ retry: { maxRetries: 0 } }),
    );
    const result = await handler.handleToolCall("osp_status", {
      provider_url: "https://test-provider.com",
      resource_id: "res_123",
      include_usage: true,
    });

    const parsed = JSON.parse(result.content[0]!.text);
    expect(parsed.usage).toBeNull();
    expect(parsed.usage_error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// osp_skills
// ---------------------------------------------------------------------------

describe("osp_skills", () => {
  it("generates skills from manifest when no skills URL", async () => {
    const manifest = makeManifest();

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) return jsonResponse(manifest);
      return jsonResponse({}, 404);
    });

    const handler = new OSPMCPHandler();
    const result = await handler.handleToolCall("osp_skills", {
      provider_url: "https://test-provider.com",
    });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text);
    expect(parsed.provider).toBe("Test Provider");
    expect(parsed.offerings).toHaveLength(1);
    expect(parsed.mcp_tools).toEqual(["test_query"]);
  });

  it("fetches skills from skills_url when available", async () => {
    const manifest = makeManifest({
      mcp: {
        tools: ["test_query"],
        skills_url: "https://test-provider.com/skills.md",
      },
    });
    const skillsContent = "# Test Provider Skills\n\nSetup instructions here.";

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) return jsonResponse(manifest);
      if (url.includes("/skills.md")) {
        return new Response(skillsContent, {
          status: 200,
          headers: { "Content-Type": "text/markdown" },
        });
      }
      return jsonResponse({}, 404);
    });

    const handler = new OSPMCPHandler();
    const result = await handler.handleToolCall("osp_skills", {
      provider_url: "https://test-provider.com",
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0]?.text).toContain("Test Provider Skills");
  });

  it("returns error when skills URL fetch fails", async () => {
    const manifest = makeManifest({
      mcp: {
        tools: [],
        skills_url: "https://test-provider.com/skills.md",
      },
    });

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) return jsonResponse(manifest);
      if (url.includes("/skills.md")) {
        return new Response("Not Found", { status: 404 });
      }
      return jsonResponse({}, 404);
    });

    const handler = new OSPMCPHandler();
    const result = await handler.handleToolCall("osp_skills", {
      provider_url: "https://test-provider.com",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Failed to fetch skills");
  });

  it("uses skills endpoint from manifest endpoints", async () => {
    const manifest = makeManifest({
      mcp: undefined,
      endpoints: {
        provision: "/osp/v1/provision",
        deprovision: "/osp/v1/resources/:resource_id",
        credentials: "/osp/v1/resources/:resource_id/credentials",
        status: "/osp/v1/resources/:resource_id/status",
        health: "/osp/v1/health",
        skills: "https://test-provider.com/api/skills",
      },
    });

    mockFetch((url) => {
      if (url.includes(".well-known/osp.json")) return jsonResponse(manifest);
      if (url.includes("/api/skills")) {
        return new Response("# Skills", { status: 200 });
      }
      return jsonResponse({}, 404);
    });

    const handler = new OSPMCPHandler();
    const result = await handler.handleToolCall("osp_skills", {
      provider_url: "https://test-provider.com",
    });

    expect(result.content[0]?.text).toContain("# Skills");
  });
});

// ---------------------------------------------------------------------------
// OSPMCPHandler — error handling
// ---------------------------------------------------------------------------

describe("OSPMCPHandler error handling", () => {
  it("catches and wraps thrown errors", async () => {
    mockFetch(() => {
      throw new Error("Connection refused");
    });

    const handler = new OSPMCPHandler(
      new OSPClient({ retry: { maxRetries: 0 } }),
    );
    const result = await handler.handleToolCall("osp_discover", {
      provider_url: "https://fail.com",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Connection refused");
  });

  it("catches non-Error thrown values", async () => {
    mockFetch(() => {
      throw "string error";
    });

    const handler = new OSPMCPHandler(
      new OSPClient({ retry: { maxRetries: 0 } }),
    );
    const result = await handler.handleToolCall("osp_discover", {
      provider_url: "https://fail.com",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("string error");
  });
});
