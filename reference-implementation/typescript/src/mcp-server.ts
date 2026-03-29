/**
 * OSP MCP Server — exposes OSP operations as MCP tools.
 *
 * Provides 7 tools:
 * - osp_discover: Search for and discover OSP providers
 * - osp_provision: Provision a new service resource
 * - osp_env: Generate environment variables from provisioned credentials
 * - osp_status: Check the status of a provisioned resource
 * - osp_skills: Retrieve a provider's LLM integration skill document
 * - osp_cost_summary: Fetch aggregated cost summary from a provider
 * - osp_health: Check the structured health of a provider
 *
 * Usage:
 *
 * ```ts
 * import { createOSPMCPServer } from "@osp/mcp-server";
 *
 * const server = createOSPMCPServer();
 * // Connect to MCP transport (stdio, SSE, etc.)
 * ```
 */

import { OSPClient } from "./client.js";
import { OSPResolver } from "./resolver.js";
import type {
  AgentIdentity,
  CostSummary,
  HealthResponse,
  ServiceManifest,
  ProvisionResponse,
  ResourceStatus,
} from "./types.js";

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export const OSP_TOOL_DEFINITIONS: MCPToolDefinition[] = [
  {
    name: "osp_discover",
    description:
      "Discover OSP service providers. Returns available providers and their service offerings with pricing, regions, and capabilities.",
    inputSchema: {
      type: "object",
      properties: {
        provider_url: {
          type: "string",
          description:
            "URL of a specific provider to discover (e.g., 'https://supabase.com'). If not provided, searches the registry.",
        },
        category: {
          type: "string",
          description:
            "Filter by service category: database, hosting, auth, analytics, storage, compute, messaging, monitoring, search, ai, email",
        },
      },
    },
  },
  {
    name: "osp_provision",
    description:
      "Provision a new service resource from an OSP provider. Creates databases, hosting, auth services, etc.",
    inputSchema: {
      type: "object",
      required: ["provider_url", "offering_id", "tier_id", "project_name"],
      properties: {
        provider_url: {
          type: "string",
          description: "URL of the provider (e.g., 'https://supabase.com')",
        },
        offering_id: {
          type: "string",
          description:
            "Service offering ID from the manifest (e.g., 'supabase/postgres')",
        },
        tier_id: {
          type: "string",
          description: "Tier ID within the offering (e.g., 'free', 'pro')",
        },
        project_name: {
          type: "string",
          description: "Name for the provisioned resource",
        },
        region: {
          type: "string",
          description: "Deployment region (e.g., 'us-east-1')",
        },
        config: {
          type: "object",
          description: "Offering-specific configuration",
        },
        mode: {
          type: "string",
          enum: ["live", "sandbox"],
          description: "Provisioning mode: 'live' for production, 'sandbox' for testing (default: live)",
        },
        idempotency_key: {
          type: "string",
          description: "Unique key to ensure idempotent provisioning (prevents duplicate resources on retry)",
        },
        agent_identity: {
          type: "object",
          description: "Agent identity for authenticated provisioning",
          properties: {
            method: {
              type: "string",
              enum: ["ed25519_did", "oauth2_client", "api_key"],
              description: "Identity verification method",
            },
            credential: {
              type: "string",
              description: "Identity credential (DID, OAuth2 client_id, or API key)",
            },
          },
        },
      },
    },
  },
  {
    name: "osp_env",
    description:
      "Generate environment variables from OSP provisioned credentials. Supports .env, Next.js, and Vite formats.",
    inputSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["plain", "nextjs", "vite"],
          description: "Output format for environment variables (default: plain)",
        },
        provider_url: {
          type: "string",
          description:
            "Provider URL to fetch credentials for. If not provided, lists all stored credentials.",
        },
        resource_id: {
          type: "string",
          description: "Resource ID to fetch credentials for",
        },
      },
    },
  },
  {
    name: "osp_status",
    description:
      "Check the status of a provisioned resource, including health, usage, and cost.",
    inputSchema: {
      type: "object",
      required: ["provider_url", "resource_id"],
      properties: {
        provider_url: {
          type: "string",
          description: "URL of the provider",
        },
        resource_id: {
          type: "string",
          description: "Resource ID to check",
        },
        include_usage: {
          type: "boolean",
          description: "Include usage/metering data (default: false)",
        },
      },
    },
  },
  {
    name: "osp_skills",
    description:
      "Retrieve a provider's LLM integration skills document. Contains provider-specific instructions for setup, credentials, common operations, and gotchas.",
    inputSchema: {
      type: "object",
      required: ["provider_url"],
      properties: {
        provider_url: {
          type: "string",
          description: "URL of the provider",
        },
      },
    },
  },
  {
    name: "osp_cost_summary",
    description:
      "Fetch an aggregated cost summary from a provider. Shows total cost, per-resource breakdown, and projected monthly spend.",
    inputSchema: {
      type: "object",
      required: ["provider_url"],
      properties: {
        provider_url: {
          type: "string",
          description: "URL of the provider",
        },
        period_start: {
          type: "string",
          description: "Start of billing period (ISO 8601 date, e.g. '2026-03-01')",
        },
        period_end: {
          type: "string",
          description: "End of billing period (ISO 8601 date, e.g. '2026-03-31')",
        },
        currency: {
          type: "string",
          description: "Currency code (e.g. 'USD', 'EUR')",
        },
      },
    },
  },
  {
    name: "osp_health",
    description:
      "Check the structured health of a provider. Returns status, version, supported protocol versions, uptime, and individual health checks.",
    inputSchema: {
      type: "object",
      required: ["provider_url"],
      properties: {
        provider_url: {
          type: "string",
          description: "URL of the provider",
        },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export class OSPMCPHandler {
  private readonly client: OSPClient;
  private readonly resolver: OSPResolver;

  constructor(client?: OSPClient, resolver?: OSPResolver) {
    this.client = client ?? new OSPClient();
    this.resolver = resolver ?? new OSPResolver();
  }

  /** Get all tool definitions. */
  getToolDefinitions(): MCPToolDefinition[] {
    return OSP_TOOL_DEFINITIONS;
  }

  /** Handle a tool call. */
  async handleToolCall(
    name: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    try {
      switch (name) {
        case "osp_discover":
          return await this.handleDiscover(args);
        case "osp_provision":
          return await this.handleProvision(args);
        case "osp_env":
          return await this.handleEnv(args);
        case "osp_status":
          return await this.handleStatus(args);
        case "osp_skills":
          return await this.handleSkills(args);
        case "osp_cost_summary":
          return await this.handleCostSummary(args);
        case "osp_health":
          return await this.handleHealth(args);
        default:
          return this.errorResult(`Unknown tool: ${name}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.errorResult(message);
    }
  }

  // -----------------------------------------------------------------------
  // Tool handlers
  // -----------------------------------------------------------------------

  private async handleDiscover(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const providerUrl = args.provider_url as string | undefined;
    const category = args.category as string | undefined;

    let manifests: ServiceManifest[];

    if (providerUrl) {
      const manifest = await this.client.discover(providerUrl);
      manifests = [manifest];
    } else {
      manifests = await this.client.discoverFromRegistry(
        category ? { category } : undefined,
      );
    }

    const summary = manifests.map((m) => ({
      provider: m.display_name,
      provider_id: m.provider_id,
      provider_url: m.provider_url,
      offerings: m.offerings.map((o) => ({
        offering_id: o.offering_id,
        name: o.name,
        category: o.category,
        tiers: o.tiers.map((t) => ({
          tier_id: t.tier_id,
          name: t.name,
          price: `${t.price.amount} ${t.price.currency}${t.price.interval ? `/${t.price.interval}` : " (one-time)"}`,
        })),
        regions: o.regions,
      })),
      payment_methods: m.accepted_payment_methods,
      mcp: m.mcp,
    }));

    return this.textResult(JSON.stringify(summary, null, 2));
  }

  private async handleProvision(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const providerUrl = args.provider_url as string;
    const offeringId = args.offering_id as string;
    const tierId = args.tier_id as string;
    const projectName = args.project_name as string;
    const region = args.region as string | undefined;
    const config = args.config as Record<string, unknown> | undefined;
    const mode = args.mode as "live" | "sandbox" | undefined;
    const idempotencyKey = args.idempotency_key as string | undefined;
    const agentIdentity = args.agent_identity as AgentIdentity | undefined;

    const nonce = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `nonce_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const response: ProvisionResponse = await this.client.provision(providerUrl, {
      offering_id: offeringId,
      tier_id: tierId,
      project_name: projectName,
      region,
      config,
      nonce,
      payment_method: "free",
      mode,
      idempotency_key: idempotencyKey,
      agent_identity: agentIdentity,
    });

    // Store credentials in resolver if available
    if (response.credentials?.credentials) {
      const manifest = await this.client.discover(providerUrl);
      const offering = offeringId.split("/")[1] ?? offeringId;
      this.resolver.addCredential(
        manifest.provider_id,
        offering,
        response.credentials.credentials,
      );
    }

    return this.textResult(JSON.stringify({
      resource_id: response.resource_id,
      status: response.status,
      dashboard_url: response.dashboard_url,
      credentials_available: !!response.credentials,
      cost_estimate: response.cost_estimate,
      message: response.message,
    }, null, 2));
  }

  private async handleEnv(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const format = (args.format as "plain" | "nextjs" | "vite") ?? "plain";
    const providerUrl = args.provider_url as string | undefined;
    const resourceId = args.resource_id as string | undefined;

    if (providerUrl && resourceId) {
      const creds = await this.client.getCredentials(providerUrl, resourceId);
      if (creds.credentials) {
        const manifest = await this.client.discover(providerUrl);
        const offering = creds.offering_id?.split("/")[1] ?? "service";
        this.resolver.addCredential(manifest.provider_id, offering, creds.credentials);
      }
    }

    const dotenv = this.resolver.generateDotenv({ framework: format });

    if (!dotenv.trim()) {
      return this.textResult("No credentials stored. Provision a service first, or provide provider_url and resource_id.");
    }

    return this.textResult(dotenv);
  }

  private async handleStatus(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const providerUrl = args.provider_url as string;
    const resourceId = args.resource_id as string;
    const includeUsage = args.include_usage as boolean | undefined;

    const status: ResourceStatus = await this.client.getStatus(providerUrl, resourceId);

    const result: Record<string, unknown> = { ...status };

    if (includeUsage) {
      try {
        const usage = await this.client.getUsage(providerUrl, resourceId);
        result.usage = usage;
      } catch {
        result.usage = null;
        result.usage_error = "Usage endpoint not available";
      }
    }

    return this.textResult(JSON.stringify(result, null, 2));
  }

  private async handleSkills(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const providerUrl = args.provider_url as string;
    const manifest = await this.client.discover(providerUrl);

    // Try to fetch skills from the MCP config or skills endpoint
    const skillsUrl = manifest.mcp?.skills_url
      ?? manifest.endpoints.skills
      ?? null;

    if (!skillsUrl) {
      // Generate a basic skills summary from the manifest
      const skills = {
        provider: manifest.display_name,
        provider_url: manifest.provider_url,
        offerings: manifest.offerings.map((o) => ({
          offering_id: o.offering_id,
          name: o.name,
          description: o.description,
          category: o.category,
          credential_keys: o.credentials_schema
            ? Object.keys((o.credentials_schema as { properties?: Record<string, unknown> }).properties ?? {})
            : [],
          regions: o.regions,
          documentation_url: o.documentation_url,
        })),
        payment_methods: manifest.accepted_payment_methods,
        mcp_tools: manifest.mcp?.tools,
      };
      return this.textResult(JSON.stringify(skills, null, 2));
    }

    // Fetch the skills document
    const response = await fetch(skillsUrl);
    if (!response.ok) {
      return this.errorResult(`Failed to fetch skills: ${response.status}`);
    }
    const text = await response.text();
    return this.textResult(text);
  }

  private async handleCostSummary(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const providerUrl = args.provider_url as string;
    const periodStart = args.period_start as string | undefined;
    const periodEnd = args.period_end as string | undefined;
    const currency = args.currency as string | undefined;

    const summary: CostSummary = await this.client.getCostSummary(providerUrl, {
      period_start: periodStart,
      period_end: periodEnd,
      currency,
    });

    return this.textResult(JSON.stringify({
      total_cost: summary.total_cost,
      currency: summary.currency,
      period: summary.period,
      projected_monthly: summary.projected_monthly,
      resources: summary.resources,
    }, null, 2));
  }

  private async handleHealth(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const providerUrl = args.provider_url as string;

    const health: HealthResponse = await this.client.getHealth(providerUrl);

    return this.textResult(JSON.stringify({
      status: health.status,
      version: health.version,
      supported_versions: health.supported_versions,
      uptime_seconds: health.uptime_seconds,
      checks: health.checks,
    }, null, 2));
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private textResult(text: string): MCPToolResult {
    return { content: [{ type: "text", text }] };
  }

  private errorResult(message: string): MCPToolResult {
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an OSP MCP handler with default configuration.
 */
export function createOSPMCPHandler(options?: {
  client?: OSPClient;
  resolver?: OSPResolver;
}): OSPMCPHandler {
  return new OSPMCPHandler(options?.client, options?.resolver);
}
