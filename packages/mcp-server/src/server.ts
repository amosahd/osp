/**
 * OSP MCP Server — exposes OSP operations as MCP tools.
 *
 * Provides 6 tools for the full service lifecycle:
 *   - osp_discover   — Search for and discover OSP service providers
 *   - osp_estimate   — Estimate cost before provisioning
 *   - osp_provision   — Provision a new service resource
 *   - osp_status      — Check the status of a provisioned resource
 *   - osp_deprovision — Deprovision (delete) a resource
 *   - osp_rotate      — Rotate credentials for a provisioned resource
 *
 * Built on top of the @modelcontextprotocol/sdk.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type {
  ServiceManifest,
  ProvisionResponse,
  EstimateRequest,
  EstimateResponse,
  ResourceStatus,
  CredentialBundle,
  UsageReport,
  OSPErrorPayload,
  OSPErrorResponse,
  PaymentMethod,
  PaymentProof,
} from "./types.js";

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 30_000;
const USER_AGENT = "@osp/mcp-server 0.1.0";

interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export class OSPHTTPError extends Error {
  readonly status: number;
  readonly payload?: OSPErrorResponse;

  constructor(message: string, status: number, payload?: OSPErrorResponse) {
    super(message);
    this.name = "OSPHTTPError";
    this.status = status;
    this.payload = payload;
  }
}

async function ospFetch<T>(url: string, options?: FetchOptions): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      ...options?.headers,
    };

    const response = await fetch(url, {
      method: options?.method ?? "GET",
      headers,
      body: options?.body,
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      let errorPayload: OSPErrorResponse | undefined;
      try {
        const body = (await response.json()) as OSPErrorResponse;
        errorPayload = body;
        if (typeof body?.error === "string") {
          errorMessage = body.error;
        } else if (body?.error && typeof body.error === "object") {
          errorMessage = body.error.message ?? errorMessage;
        }
      } catch {
        // Response body may not be JSON
      }
      throw new OSPHTTPError(errorMessage, response.status, errorPayload);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeUrl(url: string): string {
  let normalized = url;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized.replace(/\/+$/, "");
}

function endpointUrl(providerUrl: string, path: string): string {
  const base = normalizeUrl(providerUrl);
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

// ---------------------------------------------------------------------------
// Manifest cache
// ---------------------------------------------------------------------------

const manifestCache = new Map<string, ServiceManifest>();

async function fetchManifest(providerUrl: string): Promise<ServiceManifest> {
  const key = normalizeUrl(providerUrl);
  const cached = manifestCache.get(key);
  if (cached) return cached;

  const manifest = await ospFetch<ServiceManifest>(
    `${key}/.well-known/osp.json`,
  );
  manifestCache.set(key, manifest);
  return manifest;
}

function resolveAcceptedPaymentMethods(
  manifest: ServiceManifest,
  offeringId: string,
  tierId: string,
): PaymentMethod[] {
  const offering = manifest.offerings.find((entry) => entry.offering_id === offeringId);
  const tier = offering?.tiers.find((entry) => entry.tier_id === tierId);
  const methods = tier?.accepted_payment_methods
    ?? manifest.accepted_payment_methods
    ?? ["free"];
  return [...new Set(methods)];
}

function resolveProvisionPaymentMethod(
  acceptedPaymentMethods: PaymentMethod[],
  requestedPaymentMethod?: PaymentMethod,
): PaymentMethod | undefined {
  if (requestedPaymentMethod) {
    return requestedPaymentMethod;
  }

  if (acceptedPaymentMethods.includes("free")) {
    return "free";
  }

  return undefined;
}

function extractErrorPayload(error: unknown): OSPErrorPayload | undefined {
  if (!(error instanceof OSPHTTPError)) {
    return undefined;
  }

  if (!error.payload) {
    return undefined;
  }

  if (typeof error.payload.error === "string") {
    return { message: error.payload.error };
  }

  return error.payload.error;
}

function isApprovalRequiredError(error: unknown): boolean {
  const payload = extractErrorPayload(error);
  const code = payload?.code?.toLowerCase();
  return code === "approval_required" || payload?.details?.requires_approval === true;
}

function approvalResultFromError(error: OSPHTTPError) {
  const payload = extractErrorPayload(error);
  const details = payload?.details ?? {};

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            status: "approval_required",
            requires_approval: true,
            message: payload?.message ?? error.message,
            code: payload?.code ?? "approval_required",
            gate_id: details.gate_id,
            gate_name: details.gate_name,
            approval_url: details.approval_url,
            poll_url: details.poll_url,
            timeout_at: details.timeout_at,
            details,
          },
          null,
          2,
        ),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export interface CreateOSPServerOptions {
  /** OSP registry URL for federated discovery. */
  registryUrl?: string;
  /** Bearer token for provider authentication. */
  authToken?: string;
}

/**
 * Create and configure an MCP server with all OSP tools registered.
 *
 * @returns A fully configured `McpServer` ready to be connected to a transport.
 */
export function createOSPServer(
  options?: CreateOSPServerOptions,
): McpServer {
  const registryUrl = options?.registryUrl?.replace(/\/+$/, "") ?? "https://registry.osp.dev";
  const authHeaders: Record<string, string> = options?.authToken
    ? { Authorization: `Bearer ${options.authToken}` }
    : {};

  const server = new McpServer(
    {
      name: "@osp/mcp-server",
      version: "0.1.0",
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  // -----------------------------------------------------------------------
  // Tool: osp_discover
  // -----------------------------------------------------------------------

  server.tool(
    "osp_discover",
    "Discover OSP service providers. Returns available providers and their service offerings with pricing, regions, and capabilities.",
    {
      provider_url: z
        .string()
        .optional()
        .describe(
          "URL of a specific provider to discover (e.g., 'https://supabase.com'). If not provided, searches the registry.",
        ),
      category: z
        .string()
        .optional()
        .describe(
          "Filter by service category: database, hosting, auth, analytics, storage, compute, messaging, monitoring, search, ai, email",
        ),
    },
    async ({ provider_url, category }) => {
      try {
        let manifests: ServiceManifest[];

        if (provider_url) {
          const manifest = await fetchManifest(provider_url);
          manifests = [manifest];
        } else {
          const url = new URL("/v1/manifests", registryUrl);
          if (category) {
            url.searchParams.set("category", category);
          }
          manifests = await ospFetch<ServiceManifest[]>(url.toString(), {
            headers: authHeaders,
          });
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

        return {
          content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: osp_estimate
  // -----------------------------------------------------------------------

  server.tool(
    "osp_estimate",
    "Estimate provisioning cost and accepted payment methods before creating a resource.",
    {
      provider_url: z
        .string()
        .describe("URL of the provider (e.g., 'https://supabase.com')"),
      offering_id: z
        .string()
        .describe(
          "Service offering ID from the manifest (e.g., 'supabase/postgres')",
        ),
      tier_id: z
        .string()
        .describe("Tier ID within the offering (e.g., 'free', 'pro')"),
      region: z
        .string()
        .optional()
        .describe("Deployment region (e.g., 'us-east-1')"),
      configuration: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Offering-specific estimate configuration"),
      estimated_usage: z
        .record(z.string(), z.number())
        .optional()
        .describe("Estimated usage dimensions for metered pricing"),
      billing_periods: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Number of billing periods to estimate"),
    },
    async ({
      provider_url,
      offering_id,
      tier_id,
      region,
      configuration,
      estimated_usage,
      billing_periods,
    }) => {
      try {
        const manifest = await fetchManifest(provider_url);
        const url = endpointUrl(
          provider_url,
          manifest.endpoints.estimate ?? "/osp/v1/estimate",
        );

        const response = await ospFetch<EstimateResponse>(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            offering_id,
            tier_id,
            region,
            configuration,
            estimated_usage,
            billing_periods,
          } satisfies EstimateRequest),
        });

        const acceptedPaymentMethods = resolveAcceptedPaymentMethods(
          manifest,
          offering_id,
          tier_id,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  provider_id: manifest.provider_id,
                  offering_id: response.offering_id,
                  tier_id: response.tier_id,
                  accepted_payment_methods: acceptedPaymentMethods,
                  estimate: response.estimate,
                  comparison_hint: response.comparison_hint,
                  valid_until: response.valid_until,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: osp_provision
  // -----------------------------------------------------------------------

  server.tool(
    "osp_provision",
    "Provision a new service resource from an OSP provider. Creates databases, hosting instances, auth services, etc.",
    {
      provider_url: z
        .string()
        .describe("URL of the provider (e.g., 'https://supabase.com')"),
      offering_id: z
        .string()
        .describe(
          "Service offering ID from the manifest (e.g., 'supabase/postgres')",
        ),
      tier_id: z
        .string()
        .describe("Tier ID within the offering (e.g., 'free', 'pro')"),
      project_name: z.string().describe("Name for the provisioned resource"),
      region: z
        .string()
        .optional()
        .describe("Deployment region (e.g., 'us-east-1')"),
      payment_method: z
        .string()
        .optional()
        .describe(
          "Payment method for paid tiers. Must match the tier's accepted_payment_methods.",
        ),
      payment_proof: z
        .union([z.string(), z.record(z.string(), z.unknown())])
        .optional()
        .describe(
          "Payment authorization or receipt for non-free tiers. Omit for free provisioning.",
        ),
      config: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Offering-specific configuration"),
    },
    async ({
      provider_url,
      offering_id,
      tier_id,
      project_name,
      region,
      payment_method,
      payment_proof,
      config,
    }) => {
      try {
        const manifest = await fetchManifest(provider_url);
        const url = endpointUrl(provider_url, manifest.endpoints.provision);
        const acceptedPaymentMethods = resolveAcceptedPaymentMethods(
          manifest,
          offering_id,
          tier_id,
        );
        const resolvedPaymentMethod = resolveProvisionPaymentMethod(
          acceptedPaymentMethods,
          payment_method as PaymentMethod | undefined,
        );

        if (!resolvedPaymentMethod) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error:
                      "This tier requires an explicit payment_method. Run osp_estimate first to compare pricing and available rails.",
                    accepted_payment_methods: acceptedPaymentMethods,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        if (!acceptedPaymentMethods.includes(resolvedPaymentMethod)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: `Payment method '${resolvedPaymentMethod}' is not accepted for tier '${tier_id}'.`,
                    accepted_payment_methods: acceptedPaymentMethods,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        if (resolvedPaymentMethod !== "free" && payment_proof === undefined) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: `Payment proof is required when using payment_method '${resolvedPaymentMethod}'.`,
                    accepted_payment_methods: acceptedPaymentMethods,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        const nonce =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `nonce_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const request = {
          offering_id,
          tier_id,
          project_name,
          region,
          config,
          nonce,
          payment_method: resolvedPaymentMethod,
          payment_proof: payment_proof as PaymentProof | undefined,
        };

        const response = await ospFetch<ProvisionResponse>(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify(request),
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  resource_id: response.resource_id,
                  status: response.status,
                  dashboard_url: response.dashboard_url,
                  credentials_available: !!response.credentials,
                  cost_estimate: response.cost_estimate,
                  estimated_ready_seconds: response.estimated_ready_seconds,
                  poll_url: response.poll_url,
                  requires_approval: response.status === "gate_pending",
                  gate_id: response.gate_id,
                  gate_name: response.gate_name,
                  approval_url: response.approval_url,
                  timeout_at: response.timeout_at,
                  payment_method: resolvedPaymentMethod,
                  message: response.message,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        if (err instanceof OSPHTTPError && isApprovalRequiredError(err)) {
          return approvalResultFromError(err);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: osp_status
  // -----------------------------------------------------------------------

  server.tool(
    "osp_status",
    "Check the status of a provisioned resource, including health, usage, and cost.",
    {
      provider_url: z.string().describe("URL of the provider"),
      resource_id: z.string().describe("Resource ID to check"),
      include_usage: z
        .boolean()
        .optional()
        .describe("Include usage/metering data (default: false)"),
    },
    async ({ provider_url, resource_id, include_usage }) => {
      try {
        const manifest = await fetchManifest(provider_url);
        const url = endpointUrl(
          provider_url,
          manifest.endpoints.status.replace(":resource_id", resource_id),
        );

        const status = await ospFetch<ResourceStatus>(url, {
          headers: authHeaders,
        });

        const result: Record<string, unknown> = { ...status };

        if (include_usage && manifest.endpoints.usage) {
          try {
            const usageUrl = endpointUrl(
              provider_url,
              manifest.endpoints.usage.replace(":resource_id", resource_id),
            );
            const usage = await ospFetch<UsageReport>(usageUrl, {
              headers: authHeaders,
            });
            result.usage = usage;
          } catch {
            result.usage = null;
            result.usage_error = "Usage endpoint not available";
          }
        }

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: osp_deprovision
  // -----------------------------------------------------------------------

  server.tool(
    "osp_deprovision",
    "Deprovision (delete) a previously provisioned resource. This is a destructive action.",
    {
      provider_url: z.string().describe("URL of the provider"),
      resource_id: z.string().describe("Resource ID to deprovision"),
    },
    async ({ provider_url, resource_id }) => {
      try {
        const manifest = await fetchManifest(provider_url);
        const url = endpointUrl(
          provider_url,
          manifest.endpoints.deprovision.replace(":resource_id", resource_id),
        );

        await ospFetch<unknown>(url, {
          method: "DELETE",
          headers: authHeaders,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  resource_id,
                  status: "deprovisioned",
                  message: `Resource ${resource_id} has been deprovisioned.`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------------
  // Tool: osp_rotate
  // -----------------------------------------------------------------------

  server.tool(
    "osp_rotate",
    "Rotate credentials for a provisioned resource. Returns new credential bundle.",
    {
      provider_url: z.string().describe("URL of the provider"),
      resource_id: z
        .string()
        .describe("Resource ID to rotate credentials for"),
    },
    async ({ provider_url, resource_id }) => {
      try {
        const manifest = await fetchManifest(provider_url);
        const rotate =
          manifest.endpoints.rotate ?? manifest.endpoints.credentials;
        const url = endpointUrl(
          provider_url,
          rotate.replace(":resource_id", resource_id),
        );

        const credentials = await ospFetch<CredentialBundle>(url, {
          method: "POST",
          headers: authHeaders,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  resource_id,
                  status: "rotated",
                  bundle_id: credentials.bundle_id,
                  credentials_available: !!credentials.credentials,
                  issued_at: credentials.issued_at,
                  expires_at: credentials.expires_at,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}
