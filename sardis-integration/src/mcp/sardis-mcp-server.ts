/**
 * Sardis MCP Server — exposes 9 OSP tools for AI agent consumption.
 *
 * This server wraps the OSP protocol operations with Sardis payment
 * integration, allowing MCP-compatible agents (Claude, Cursor, etc.)
 * to discover, provision, and manage services with Sardis wallet payment.
 *
 * Tools:
 * 1. sardis_discover_services  — Search for available OSP services
 * 2. sardis_provision_service  — Provision with Sardis payment
 * 3. sardis_deprovision        — Remove a provisioned service
 * 4. sardis_rotate_credentials — Rotate credentials for a resource
 * 5. sardis_check_status       — Check resource health/status
 * 6. sardis_get_usage          — Get usage report for a resource
 * 7. sardis_estimate_cost      — Estimate cost before provisioning
 * 8. sardis_list_skills        — List available provider LLM skills
 * 9. sardis_env_generate       — Generate .env file from project
 */

import type { SardisWallet } from "../payment/types.js";
import { SardisWalletClient } from "../payment/sardis-wallet.js";
import { EscrowManager } from "../payment/escrow.js";
import { provisionWithEscrow } from "./bridge.js";

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, MCPPropertySchema>;
    required?: string[];
  };
}

interface MCPPropertySchema {
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string };
  default?: unknown;
}

export const SARDIS_TOOLS: MCPToolDefinition[] = [
  {
    name: "sardis_discover_services",
    description:
      "Search for available developer services (databases, hosting, auth, etc.) across all OSP-compatible providers. Returns matching service offerings with pricing, features, and regions.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "Service category to filter by",
          enum: [
            "database",
            "hosting",
            "auth",
            "analytics",
            "storage",
            "compute",
            "messaging",
            "monitoring",
            "search",
            "ai",
          ],
        },
        query: {
          type: "string",
          description: "Free-text search query (e.g., 'postgres serverless')",
        },
        max_price: {
          type: "string",
          description:
            "Maximum monthly price filter as decimal string (e.g., '25.00')",
        },
        region: {
          type: "string",
          description: "Filter by available region (e.g., 'us-east-1')",
        },
      },
    },
  },
  {
    name: "sardis_provision_service",
    description:
      "Provision a new developer service using your Sardis wallet for payment. Creates a spending mandate, provisions via OSP, and sets up escrow for paid tiers. Returns resource credentials.",
    inputSchema: {
      type: "object",
      properties: {
        provider_url: {
          type: "string",
          description:
            "The provider's base URL (e.g., 'https://supabase.com')",
        },
        offering_id: {
          type: "string",
          description:
            "The offering to provision (e.g., 'supabase/managed-postgres')",
        },
        tier_id: {
          type: "string",
          description: "The tier to provision (e.g., 'free', 'pro')",
        },
        project_name: {
          type: "string",
          description:
            "A short name for this resource (e.g., 'my-app-db'). Lowercase alphanumeric with hyphens.",
        },
        region: {
          type: "string",
          description: "Deployment region (e.g., 'us-east-1'). Optional.",
        },
        configuration: {
          type: "string",
          description:
            "JSON string of configuration options. Provider-specific.",
        },
      },
      required: ["provider_url", "offering_id", "tier_id", "project_name"],
    },
  },
  {
    name: "sardis_deprovision",
    description:
      "Remove a provisioned service. Revokes all credentials and stops billing. Data may be retained for a grace period (typically 7 days).",
    inputSchema: {
      type: "object",
      properties: {
        provider_url: {
          type: "string",
          description: "The provider's base URL",
        },
        resource_id: {
          type: "string",
          description: "The resource ID to deprovision (e.g., 'res_abc123')",
        },
        confirm: {
          type: "string",
          description:
            "Type 'yes' to confirm deprovisioning. This action is irreversible after the grace period.",
        },
      },
      required: ["provider_url", "resource_id", "confirm"],
    },
  },
  {
    name: "sardis_rotate_credentials",
    description:
      "Rotate credentials for a provisioned resource. Old credentials are invalidated and new ones are returned.",
    inputSchema: {
      type: "object",
      properties: {
        provider_url: {
          type: "string",
          description: "The provider's base URL",
        },
        resource_id: {
          type: "string",
          description: "The resource ID to rotate credentials for",
        },
      },
      required: ["provider_url", "resource_id"],
    },
  },
  {
    name: "sardis_check_status",
    description:
      "Check the current status and health of a provisioned resource, or list all resources in a project.",
    inputSchema: {
      type: "object",
      properties: {
        provider_url: {
          type: "string",
          description: "The provider's base URL",
        },
        resource_id: {
          type: "string",
          description: "Specific resource ID to check. Omit to list all.",
        },
        project_id: {
          type: "string",
          description:
            "Project ID to list all resources for. Used when resource_id is omitted.",
        },
      },
      required: ["provider_url"],
    },
  },
  {
    name: "sardis_get_usage",
    description:
      "Get the usage report for a provisioned resource, including metered dimensions and costs for the current billing period.",
    inputSchema: {
      type: "object",
      properties: {
        provider_url: {
          type: "string",
          description: "The provider's base URL",
        },
        resource_id: {
          type: "string",
          description: "The resource ID to get usage for",
        },
        period: {
          type: "string",
          description:
            "Billing period to query (e.g., '2026-03'). Defaults to current period.",
        },
      },
      required: ["provider_url", "resource_id"],
    },
  },
  {
    name: "sardis_estimate_cost",
    description:
      "Estimate the cost of provisioning a service before committing. Returns the price breakdown including base cost, estimated metered charges, and escrow requirements.",
    inputSchema: {
      type: "object",
      properties: {
        provider_url: {
          type: "string",
          description: "The provider's base URL",
        },
        offering_id: {
          type: "string",
          description: "The offering to estimate (e.g., 'supabase/managed-postgres')",
        },
        tier_id: {
          type: "string",
          description: "The tier to estimate (e.g., 'pro')",
        },
        region: {
          type: "string",
          description: "Deployment region for region-specific pricing",
        },
      },
      required: ["provider_url", "offering_id", "tier_id"],
    },
  },
  {
    name: "sardis_list_skills",
    description:
      "List available LLM skills for provisioned services. Skills provide context on how to USE a service (connection strings, common operations, gotchas) — not just how to provision it.",
    inputSchema: {
      type: "object",
      properties: {
        provider_url: {
          type: "string",
          description:
            "Filter skills by provider URL. Omit to list all available.",
        },
        category: {
          type: "string",
          description: "Filter skills by service category",
        },
      },
    },
  },
  {
    name: "sardis_env_generate",
    description:
      "Generate a .env file from all provisioned services in a project. Resolves osp:// URIs to real credential values with framework-appropriate prefixes (NEXT_PUBLIC_, VITE_, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "The OSP project ID to generate env for",
        },
        format: {
          type: "string",
          description: "Output format",
          enum: ["dotenv", "json", "yaml", "shell"],
          default: "dotenv",
        },
        framework: {
          type: "string",
          description: "Target framework for variable prefix generation",
          enum: ["nextjs", "vite", "remix", "express", "generic"],
          default: "generic",
        },
        include_comments: {
          type: "string",
          description: "Include source comments in output ('true' or 'false')",
          default: "true",
        },
      },
      required: ["project_id"],
    },
  },
];

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export interface SardisMCPServerOptions {
  wallet: SardisWallet;
  registryUrl?: string;
  authToken?: string;
}

/**
 * The Sardis MCP Server.
 *
 * Provides the tool definitions and a `handleToolCall` dispatcher
 * that routes MCP tool invocations to the appropriate OSP + Sardis logic.
 */
export class SardisMCPServer {
  readonly tools: MCPToolDefinition[] = SARDIS_TOOLS;

  private readonly walletClient: SardisWalletClient;
  private readonly escrowManager: EscrowManager;
  private readonly registryUrl: string;
  private readonly authToken?: string;

  constructor(options: SardisMCPServerOptions) {
    this.walletClient = new SardisWalletClient(options.wallet);
    this.escrowManager = new EscrowManager();
    this.registryUrl =
      options.registryUrl?.replace(/\/+$/, "") ?? "https://registry.osp.dev";
    this.authToken = options.authToken;
  }

  /**
   * Handle an incoming MCP tool call.
   *
   * @returns The tool result as a JSON-serializable object.
   */
  async handleToolCall(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    switch (toolName) {
      case "sardis_discover_services":
        return this.handleDiscover(args);
      case "sardis_provision_service":
        return this.handleProvision(args);
      case "sardis_deprovision":
        return this.handleDeprovision(args);
      case "sardis_rotate_credentials":
        return this.handleRotate(args);
      case "sardis_check_status":
        return this.handleCheckStatus(args);
      case "sardis_get_usage":
        return this.handleGetUsage(args);
      case "sardis_estimate_cost":
        return this.handleEstimateCost(args);
      case "sardis_list_skills":
        return this.handleListSkills(args);
      case "sardis_env_generate":
        return this.handleEnvGenerate(args);
      default:
        return {
          isError: true,
          content: [
            { type: "text", text: `Unknown tool: ${toolName}` },
          ],
        };
    }
  }

  // -----------------------------------------------------------------------
  // Tool Handlers
  // -----------------------------------------------------------------------

  private async handleDiscover(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const { category, query, max_price, region } = args as {
      category?: string;
      query?: string;
      max_price?: string;
      region?: string;
    };

    // In production, this queries the OSP registry.
    // Here we return a structured response for the agent.
    const searchParams = new URLSearchParams();
    if (category) searchParams.set("category", category);
    if (query) searchParams.set("q", query);
    if (max_price) searchParams.set("max_price", max_price);
    if (region) searchParams.set("region", region);

    const url = `${this.registryUrl}/v1/manifests?${searchParams.toString()}`;

    try {
      const response = await fetch(url, {
        headers: this.authHeaders(),
      });

      if (!response.ok) {
        return this.errorResult(
          `Registry returned ${response.status}: ${response.statusText}`,
        );
      }

      const manifests = await response.json();
      return this.successResult(manifests);
    } catch (error) {
      return this.errorResult(
        `Failed to query registry: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleProvision(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const {
      provider_url,
      offering_id,
      tier_id,
      project_name,
      region,
      configuration,
    } = args as {
      provider_url: string;
      offering_id: string;
      tier_id: string;
      project_name: string;
      region?: string;
      configuration?: string;
    };

    try {
      const config = configuration ? JSON.parse(configuration) : undefined;

      const result = await provisionWithEscrow({
        walletClient: this.walletClient,
        escrowManager: this.escrowManager,
        providerUrl: provider_url,
        offeringId: offering_id,
        tierId: tier_id,
        projectName: project_name,
        region,
        configuration: config,
        authToken: this.authToken,
      });

      if (!result.ok) {
        return this.errorResult(result.error?.message ?? "Provisioning failed");
      }

      return this.successResult(result.data);
    } catch (error) {
      return this.errorResult(
        `Provisioning failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleDeprovision(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const { provider_url, resource_id, confirm } = args as {
      provider_url: string;
      resource_id: string;
      confirm: string;
    };

    if (confirm !== "yes") {
      return this.errorResult(
        "Deprovisioning requires confirmation. Set confirm to 'yes' to proceed.",
      );
    }

    try {
      const baseUrl = provider_url.replace(/\/+$/, "");
      const response = await fetch(
        `${baseUrl}/osp/v1/deprovision/${resource_id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "X-OSP-Version": "1.0",
            ...this.authHeaders(),
          },
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        return this.errorResult(
          `Deprovisioning failed: ${(body as Record<string, string>).error ?? response.statusText}`,
        );
      }

      // Release any escrow for this resource
      const escrow = this.escrowManager.getByResourceId(resource_id);
      if (escrow && escrow.status === "active") {
        this.escrowManager.refund(escrow.escrow_id);
      }

      return this.successResult({
        resource_id,
        status: "deprovisioned",
        message:
          "Service deprovisioned. Credentials revoked. Data retained for grace period.",
      });
    } catch (error) {
      return this.errorResult(
        `Deprovisioning failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleRotate(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const { provider_url, resource_id } = args as {
      provider_url: string;
      resource_id: string;
    };

    try {
      const baseUrl = provider_url.replace(/\/+$/, "");
      const response = await fetch(
        `${baseUrl}/osp/v1/rotate/${resource_id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-OSP-Version": "1.0",
            ...this.authHeaders(),
          },
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        return this.errorResult(
          `Rotation failed: ${(body as Record<string, string>).error ?? response.statusText}`,
        );
      }

      const credentials = await response.json();
      return this.successResult({
        resource_id,
        status: "rotated",
        credentials,
      });
    } catch (error) {
      return this.errorResult(
        `Rotation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleCheckStatus(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const { provider_url, resource_id } = args as {
      provider_url: string;
      resource_id?: string;
    };

    try {
      const baseUrl = provider_url.replace(/\/+$/, "");
      const url = resource_id
        ? `${baseUrl}/osp/v1/status/${resource_id}`
        : `${baseUrl}/osp/v1/health`;

      const response = await fetch(url, {
        headers: {
          "X-OSP-Version": "1.0",
          ...this.authHeaders(),
        },
      });

      if (!response.ok) {
        return this.errorResult(
          `Status check failed: ${response.statusText}`,
        );
      }

      const status = await response.json();

      // Enrich with escrow info if available
      if (resource_id) {
        const escrow = this.escrowManager.getByResourceId(resource_id);
        if (escrow) {
          (status as Record<string, unknown>).escrow = {
            escrow_id: escrow.escrow_id,
            status: escrow.status,
            amount: escrow.amount,
            currency: escrow.currency,
          };
        }
      }

      return this.successResult(status);
    } catch (error) {
      return this.errorResult(
        `Status check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleGetUsage(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const { provider_url, resource_id, period } = args as {
      provider_url: string;
      resource_id: string;
      period?: string;
    };

    try {
      const baseUrl = provider_url.replace(/\/+$/, "");
      const url = new URL(`${baseUrl}/osp/v1/usage/${resource_id}`);
      if (period) url.searchParams.set("period", period);

      const response = await fetch(url.toString(), {
        headers: {
          "X-OSP-Version": "1.0",
          ...this.authHeaders(),
        },
      });

      if (!response.ok) {
        return this.errorResult(
          `Usage query failed: ${response.statusText}`,
        );
      }

      const usage = await response.json();
      return this.successResult(usage);
    } catch (error) {
      return this.errorResult(
        `Usage query failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleEstimateCost(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const { provider_url, offering_id, tier_id, region } = args as {
      provider_url: string;
      offering_id: string;
      tier_id: string;
      region?: string;
    };

    try {
      const baseUrl = provider_url.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/osp/v1/estimate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-OSP-Version": "1.0",
          ...this.authHeaders(),
        },
        body: JSON.stringify({ offering_id, tier_id, region }),
      });

      if (!response.ok) {
        return this.errorResult(
          `Estimate failed: ${response.statusText}`,
        );
      }

      const estimate = await response.json();

      // Enrich with wallet info
      const wallet = this.walletClient.getWallet();
      (estimate as Record<string, unknown>).wallet_balance = wallet.balance;
      (estimate as Record<string, unknown>).wallet_currency = wallet.currency;

      return this.successResult(estimate);
    } catch (error) {
      return this.errorResult(
        `Estimate failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleListSkills(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const { provider_url, category } = args as {
      provider_url?: string;
      category?: string;
    };

    try {
      if (provider_url) {
        // Fetch skills from a specific provider
        const baseUrl = provider_url.replace(/\/+$/, "");
        const response = await fetch(
          `${baseUrl}/.well-known/osp-llm-context.md`,
          { headers: this.authHeaders() },
        );

        if (!response.ok) {
          return this.errorResult(
            "Provider does not publish LLM skills at /.well-known/osp-llm-context.md",
          );
        }

        const skill = await response.text();
        return this.successResult({ provider_url, skill });
      }

      // Query registry for all available skills
      const searchParams = new URLSearchParams();
      if (category) searchParams.set("category", category);

      const url = `${this.registryUrl}/v1/skills?${searchParams.toString()}`;
      const response = await fetch(url, { headers: this.authHeaders() });

      if (!response.ok) {
        return this.errorResult(
          `Skills query failed: ${response.statusText}`,
        );
      }

      const skills = await response.json();
      return this.successResult(skills);
    } catch (error) {
      return this.errorResult(
        `Skills query failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleEnvGenerate(
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const { project_id, format, framework, include_comments } = args as {
      project_id: string;
      format?: string;
      framework?: string;
      include_comments?: string;
    };

    try {
      const searchParams = new URLSearchParams();
      searchParams.set("format", format ?? "dotenv");
      searchParams.set("framework", framework ?? "generic");
      if (include_comments === "false") {
        searchParams.set("comments", "false");
      }

      const url = `${this.registryUrl}/v1/projects/${project_id}/env?${searchParams.toString()}`;
      const response = await fetch(url, { headers: this.authHeaders() });

      if (!response.ok) {
        return this.errorResult(
          `Env generation failed: ${response.statusText}`,
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const env = await response.json();
        return this.successResult(env);
      }

      const env = await response.text();
      return this.successResult({ format: format ?? "dotenv", content: env });
    } catch (error) {
      return this.errorResult(
        `Env generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  private successResult(data: unknown): MCPToolResult {
    return {
      isError: false,
      content: [
        {
          type: "text",
          text:
            typeof data === "string" ? data : JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  private errorResult(message: string): MCPToolResult {
    return {
      isError: true,
      content: [{ type: "text", text: message }],
    };
  }
}

// ---------------------------------------------------------------------------
// MCP result type
// ---------------------------------------------------------------------------

export interface MCPToolResult {
  isError: boolean;
  content: Array<{ type: string; text: string }>;
}
