/**
 * OSPClient — the main entry point for AI agents to discover, provision,
 * and manage developer services via the Open Service Protocol.
 *
 * Usage:
 *
 * ```ts
 * import { OSPClient } from "@osp/client";
 *
 * const osp = new OSPClient();
 * const manifest = await osp.discover("https://supabase.com");
 * const result = await osp.provision("https://supabase.com", {
 *   offering_id: "supabase/postgres",
 *   tier_id: "free",
 *   project_name: "my-project",
 *   nonce: crypto.randomUUID(),
 * });
 * ```
 */

import type {
  CredentialBundle,
  HealthStatus,
  OSPErrorBody,
  ProvisionRequest,
  ProvisionResponse,
  ResourceStatus,
  ServiceManifest,
  UsageReport,
} from "./types.js";
import { fetchManifest } from "./manifest.js";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface OSPClientOptions {
  /**
   * URL of the OSP registry for federated discovery.
   * Defaults to the public OSP registry.
   */
  registryUrl?: string;

  /**
   * Bearer token attached to all requests (when the provider requires
   * agent authentication).
   */
  authToken?: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class OSPClient {
  private readonly registryUrl: string;
  private readonly authToken?: string;

  /** In-memory manifest cache keyed by normalized provider URL. */
  private readonly manifestCache = new Map<string, ServiceManifest>();

  constructor(options?: OSPClientOptions) {
    this.registryUrl =
      options?.registryUrl?.replace(/\/+$/, "") ??
      "https://registry.osp.dev";
    this.authToken = options?.authToken;
  }

  // -----------------------------------------------------------------------
  // Discovery
  // -----------------------------------------------------------------------

  /**
   * Fetch a single provider's manifest from its well-known URL.
   *
   * Results are cached in-memory for the lifetime of this client instance.
   */
  async discover(providerUrl: string): Promise<ServiceManifest> {
    const key = normalizeUrl(providerUrl);
    const cached = this.manifestCache.get(key);
    if (cached) return cached;

    const manifest = await fetchManifest(providerUrl);
    this.manifestCache.set(key, manifest);
    return manifest;
  }

  /**
   * Query the OSP registry for providers matching optional filters.
   *
   * @param options.category - Filter by service category (e.g. "database").
   */
  async discoverFromRegistry(
    options?: { category?: string },
  ): Promise<ServiceManifest[]> {
    const url = new URL("/v1/manifests", this.registryUrl);
    if (options?.category) {
      url.searchParams.set("category", options.category);
    }

    const response = await this.fetch(url.toString());
    const body = await response.json();
    return body as ServiceManifest[];
  }

  // -----------------------------------------------------------------------
  // Provisioning
  // -----------------------------------------------------------------------

  /**
   * Provision a new resource from a provider.
   *
   * The `request.offering_id` and `request.tier_id` must match an offering
   * in the provider's manifest.
   */
  async provision(
    providerUrl: string,
    request: ProvisionRequest,
  ): Promise<ProvisionResponse> {
    const manifest = await this.discover(providerUrl);
    const url = this.endpointUrl(providerUrl, manifest.endpoints.provision);

    const response = await this.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    return response.json() as Promise<ProvisionResponse>;
  }

  // -----------------------------------------------------------------------
  // Credential management
  // -----------------------------------------------------------------------

  /** Retrieve the current credential bundle for a provisioned resource. */
  async getCredentials(
    providerUrl: string,
    resourceId: string,
  ): Promise<CredentialBundle> {
    const manifest = await this.discover(providerUrl);
    const url = this.endpointUrl(
      providerUrl,
      manifest.endpoints.credentials.replace(":resource_id", resourceId),
    );

    const response = await this.fetch(url);
    return response.json() as Promise<CredentialBundle>;
  }

  /** Rotate credentials for a provisioned resource. */
  async rotateCredentials(
    providerUrl: string,
    resourceId: string,
  ): Promise<CredentialBundle> {
    const manifest = await this.discover(providerUrl);
    const rotate = manifest.endpoints.rotate ?? manifest.endpoints.credentials;
    const url = this.endpointUrl(
      providerUrl,
      rotate.replace(":resource_id", resourceId),
    );

    const response = await this.fetch(url, { method: "POST" });
    return response.json() as Promise<CredentialBundle>;
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /** Get the current status of a provisioned resource. */
  async getStatus(
    providerUrl: string,
    resourceId: string,
  ): Promise<ResourceStatus> {
    const manifest = await this.discover(providerUrl);
    const url = this.endpointUrl(
      providerUrl,
      manifest.endpoints.status.replace(":resource_id", resourceId),
    );

    const response = await this.fetch(url);
    return response.json() as Promise<ResourceStatus>;
  }

  /** Deprovision (delete) a resource. */
  async deprovision(
    providerUrl: string,
    resourceId: string,
  ): Promise<void> {
    const manifest = await this.discover(providerUrl);
    const url = this.endpointUrl(
      providerUrl,
      manifest.endpoints.deprovision.replace(":resource_id", resourceId),
    );

    await this.fetch(url, { method: "DELETE" });
  }

  // -----------------------------------------------------------------------
  // Usage
  // -----------------------------------------------------------------------

  /** Fetch a usage / metering report for a provisioned resource. */
  async getUsage(
    providerUrl: string,
    resourceId: string,
  ): Promise<UsageReport> {
    const manifest = await this.discover(providerUrl);
    const usage = manifest.endpoints.usage;
    if (!usage) {
      throw new OSPError("Provider does not expose a usage endpoint", "NO_USAGE_ENDPOINT");
    }
    const url = this.endpointUrl(
      providerUrl,
      usage.replace(":resource_id", resourceId),
    );

    const response = await this.fetch(url);
    return response.json() as Promise<UsageReport>;
  }

  // -----------------------------------------------------------------------
  // Health
  // -----------------------------------------------------------------------

  /** Check the health of a provider. */
  async checkHealth(providerUrl: string): Promise<HealthStatus> {
    const manifest = await this.discover(providerUrl);
    const url = this.endpointUrl(providerUrl, manifest.endpoints.health);

    const start = Date.now();
    const response = await this.fetch(url);
    const latencyMs = Date.now() - start;

    const body = await response.json() as HealthStatus;
    body.latency_ms = latencyMs;
    return body;
  }

  // -----------------------------------------------------------------------
  // Cache management
  // -----------------------------------------------------------------------

  /** Clear the in-memory manifest cache (useful in long-running agents). */
  clearCache(): void {
    this.manifestCache.clear();
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  /**
   * Central fetch wrapper that attaches auth headers and handles errors
   * uniformly.
   */
  private async fetch(
    url: string,
    init?: RequestInit,
  ): Promise<Response> {
    const headers = new Headers(init?.headers);
    if (this.authToken) {
      headers.set("Authorization", `Bearer ${this.authToken}`);
    }
    headers.set("User-Agent", "@osp/client 0.1.0");

    const response = await fetch(url, { ...init, headers });

    if (!response.ok) {
      let errorBody: OSPErrorBody | undefined;
      try {
        errorBody = await response.json() as OSPErrorBody;
      } catch {
        // Response body may not be JSON — that's fine.
      }

      throw new OSPError(
        errorBody?.error ?? `HTTP ${response.status} ${response.statusText}`,
        errorBody?.code ?? `HTTP_${response.status}`,
        response.status,
        errorBody?.details,
      );
    }

    return response;
  }

  /** Resolve an endpoint path against the provider's base URL. */
  private endpointUrl(providerUrl: string, path: string): string {
    const base = normalizeUrl(providerUrl);
    // Path may already be absolute or relative
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Typed error for failures returned by OSP providers. */
export class OSPError extends Error {
  readonly code: string;
  readonly statusCode?: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "OSPError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeUrl(url: string): string {
  let normalized = url;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized.replace(/\/+$/, "");
}
