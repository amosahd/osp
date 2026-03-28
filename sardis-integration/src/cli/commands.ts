/**
 * Sardis CLI Extension — `sardis projects` commands.
 *
 * Provides CLI commands for managing OSP projects through Sardis:
 * - sardis projects list     — List all projects and their services
 * - sardis projects add      — Add a service to a project (provision + pay)
 * - sardis projects remove   — Remove a service from a project
 * - sardis projects status   — Show detailed project status with cost info
 */

import type { SardisWallet } from "../payment/types.js";
import type { SardisWalletClient } from "../payment/sardis-wallet.js";
import type { EscrowManager } from "../payment/escrow.js";
import { provisionWithEscrow } from "../mcp/bridge.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A tracked project and its provisioned resources. */
export interface SardisProject {
  project_id: string;
  name: string;
  resources: SardisProjectResource[];
  created_at: string;
  updated_at: string;
}

/** A provisioned resource within a project. */
export interface SardisProjectResource {
  resource_id: string;
  provider_url: string;
  offering_id: string;
  tier_id: string;
  status: string;
  escrow_id?: string;
  mandate_id: string;
  provisioned_at: string;
}

/** Result from a CLI command. */
export interface CLIResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ---------------------------------------------------------------------------
// SardisCLI
// ---------------------------------------------------------------------------

export class SardisCLI {
  private readonly walletClient: SardisWalletClient;
  private readonly escrowManager: EscrowManager;
  private readonly projects = new Map<string, SardisProject>();
  private readonly authToken?: string;

  constructor(options: {
    walletClient: SardisWalletClient;
    escrowManager: EscrowManager;
    authToken?: string;
  }) {
    this.walletClient = options.walletClient;
    this.escrowManager = options.escrowManager;
    this.authToken = options.authToken;
  }

  // -----------------------------------------------------------------------
  // sardis projects list
  // -----------------------------------------------------------------------

  /**
   * List all tracked projects and their resources.
   */
  async list(): Promise<CLIResult<SardisProject[]>> {
    const projects = Array.from(this.projects.values());
    return { ok: true, data: projects };
  }

  // -----------------------------------------------------------------------
  // sardis projects add
  // -----------------------------------------------------------------------

  /**
   * Add a service to a project.
   *
   * If the project doesn't exist, it is created. Then the service is
   * provisioned via OSP with Sardis wallet payment and tracked in the project.
   */
  async add(params: {
    project_name: string;
    provider_url: string;
    offering_id: string;
    tier_id: string;
    resource_name?: string;
    region?: string;
    configuration?: Record<string, unknown>;
  }): Promise<CLIResult<SardisProjectResource>> {
    // Ensure project exists
    let project = this.findProjectByName(params.project_name);
    if (!project) {
      project = {
        project_id: `proj_${generateId()}`,
        name: params.project_name,
        resources: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.projects.set(project.project_id, project);
    }

    // Check for duplicate offering in project
    const existing = project.resources.find(
      (r) =>
        r.offering_id === params.offering_id &&
        r.provider_url === params.provider_url &&
        r.status !== "deprovisioned",
    );
    if (existing) {
      return {
        ok: false,
        error: `Service ${params.offering_id} already exists in project ${params.project_name} (resource: ${existing.resource_id})`,
      };
    }

    // Provision via the bridge
    const result = await provisionWithEscrow({
      walletClient: this.walletClient,
      escrowManager: this.escrowManager,
      providerUrl: params.provider_url,
      offeringId: params.offering_id,
      tierId: params.tier_id,
      projectName: params.resource_name ?? params.project_name,
      region: params.region,
      configuration: params.configuration,
      authToken: this.authToken,
    });

    if (!result.ok || !result.data) {
      return {
        ok: false,
        error: result.error?.message ?? "Provisioning failed",
      };
    }

    const resource: SardisProjectResource = {
      resource_id: result.data.resource_id,
      provider_url: params.provider_url,
      offering_id: params.offering_id,
      tier_id: params.tier_id,
      status: result.data.status,
      escrow_id: result.data.escrow_id,
      mandate_id: result.data.mandate_id,
      provisioned_at: new Date().toISOString(),
    };

    project.resources.push(resource);
    project.updated_at = new Date().toISOString();

    return { ok: true, data: resource };
  }

  // -----------------------------------------------------------------------
  // sardis projects remove
  // -----------------------------------------------------------------------

  /**
   * Remove a service from a project (deprovision).
   */
  async remove(params: {
    project_name: string;
    resource_id: string;
  }): Promise<CLIResult<{ resource_id: string; status: string }>> {
    const project = this.findProjectByName(params.project_name);
    if (!project) {
      return {
        ok: false,
        error: `Project ${params.project_name} not found`,
      };
    }

    const resource = project.resources.find(
      (r) => r.resource_id === params.resource_id,
    );
    if (!resource) {
      return {
        ok: false,
        error: `Resource ${params.resource_id} not found in project ${params.project_name}`,
      };
    }

    if (resource.status === "deprovisioned") {
      return {
        ok: false,
        error: `Resource ${params.resource_id} is already deprovisioned`,
      };
    }

    // Call OSP deprovision endpoint
    try {
      const baseUrl = resource.provider_url.replace(/\/+$/, "");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-OSP-Version": "1.0",
      };
      if (this.authToken) {
        headers["Authorization"] = `Bearer ${this.authToken}`;
      }

      const response = await fetch(
        `${baseUrl}/osp/v1/deprovision/${resource.resource_id}`,
        { method: "DELETE", headers },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: `Deprovisioning failed: ${(body as Record<string, string>).error ?? response.statusText}`,
        };
      }
    } catch (error) {
      return {
        ok: false,
        error: `Deprovisioning failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Handle escrow refund if applicable
    if (resource.escrow_id) {
      const escrow = this.escrowManager.get(resource.escrow_id);
      if (escrow && escrow.status === "active") {
        this.escrowManager.refund(escrow.escrow_id);
      }
    }

    resource.status = "deprovisioned";
    project.updated_at = new Date().toISOString();

    return {
      ok: true,
      data: {
        resource_id: resource.resource_id,
        status: "deprovisioned",
      },
    };
  }

  // -----------------------------------------------------------------------
  // sardis projects status
  // -----------------------------------------------------------------------

  /**
   * Show detailed status for a project including resource health,
   * escrow state, and cost summary.
   */
  async status(params: {
    project_name: string;
  }): Promise<CLIResult<ProjectStatus>> {
    const project = this.findProjectByName(params.project_name);
    if (!project) {
      return {
        ok: false,
        error: `Project ${params.project_name} not found`,
      };
    }

    const resourceStatuses: ResourceStatusDetail[] = [];
    let totalEscrowed = 0;
    let totalActive = 0;

    for (const resource of project.resources) {
      let healthStatus = "unknown";

      // Try to check status via OSP
      if (resource.status !== "deprovisioned") {
        try {
          const baseUrl = resource.provider_url.replace(/\/+$/, "");
          const headers: Record<string, string> = {
            "X-OSP-Version": "1.0",
          };
          if (this.authToken) {
            headers["Authorization"] = `Bearer ${this.authToken}`;
          }

          const response = await fetch(
            `${baseUrl}/osp/v1/status/${resource.resource_id}`,
            { headers },
          );

          if (response.ok) {
            const body = (await response.json()) as { status?: string };
            healthStatus = body.status ?? "unknown";
          }
        } catch {
          healthStatus = "unreachable";
        }

        totalActive++;
      } else {
        healthStatus = "deprovisioned";
      }

      // Get escrow info
      let escrowDetail: EscrowDetail | undefined;
      if (resource.escrow_id) {
        const escrow = this.escrowManager.get(resource.escrow_id);
        if (escrow) {
          escrowDetail = {
            escrow_id: escrow.escrow_id,
            status: escrow.status,
            amount: escrow.amount,
            currency: escrow.currency,
          };
          if (escrow.status === "active") {
            totalEscrowed += parseFloat(escrow.amount);
          }
        }
      }

      resourceStatuses.push({
        resource_id: resource.resource_id,
        offering_id: resource.offering_id,
        tier_id: resource.tier_id,
        provider_url: resource.provider_url,
        health: healthStatus,
        escrow: escrowDetail,
        provisioned_at: resource.provisioned_at,
      });
    }

    const wallet = this.walletClient.getWallet();

    return {
      ok: true,
      data: {
        project_id: project.project_id,
        project_name: project.name,
        total_resources: project.resources.length,
        active_resources: totalActive,
        resources: resourceStatuses,
        wallet: {
          wallet_id: wallet.wallet_id,
          balance: wallet.balance,
          currency: wallet.currency,
        },
        total_escrowed: totalEscrowed.toFixed(2),
        created_at: project.created_at,
        updated_at: project.updated_at,
      },
    };
  }

  // -----------------------------------------------------------------------
  // Project management helpers
  // -----------------------------------------------------------------------

  /** Register an existing project (e.g., loaded from disk). */
  registerProject(project: SardisProject): void {
    this.projects.set(project.project_id, project);
  }

  /** Get a project by ID. */
  getProject(projectId: string): SardisProject | undefined {
    return this.projects.get(projectId);
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private findProjectByName(name: string): SardisProject | undefined {
    for (const project of this.projects.values()) {
      if (project.name === name) return project;
    }
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Status types
// ---------------------------------------------------------------------------

export interface ProjectStatus {
  project_id: string;
  project_name: string;
  total_resources: number;
  active_resources: number;
  resources: ResourceStatusDetail[];
  wallet: {
    wallet_id: string;
    balance: string;
    currency: string;
  };
  total_escrowed: string;
  created_at: string;
  updated_at: string;
}

interface ResourceStatusDetail {
  resource_id: string;
  offering_id: string;
  tier_id: string;
  provider_url: string;
  health: string;
  escrow?: EscrowDetail;
  provisioned_at: string;
}

interface EscrowDetail {
  escrow_id: string;
  status: string;
  amount: string;
  currency: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
