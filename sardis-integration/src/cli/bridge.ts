/**
 * CLI Bridge: sardis projects add → OSP provision + Sardis payment.
 *
 * Provides a higher-level CLI-friendly wrapper around the MCP bridge
 * that handles:
 * - Interactive confirmation for paid tiers
 * - Cost estimation before provisioning
 * - Human-readable output formatting
 * - Project state persistence
 */

import type { SardisWallet } from "../payment/types.js";
import { SardisWalletClient } from "../payment/sardis-wallet.js";
import { EscrowManager } from "../payment/escrow.js";
import { SardisCLI, type SardisProject, type SardisProjectResource } from "./commands.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CLIBridgeOptions {
  wallet: SardisWallet;
  authToken?: string;
  /** Callback to confirm paid provisioning. Return true to proceed. */
  onConfirm?: (message: string) => Promise<boolean>;
  /** Callback for status messages during provisioning. */
  onProgress?: (message: string) => void;
}

export interface AddServiceParams {
  project_name: string;
  provider_url: string;
  offering_id: string;
  tier_id: string;
  resource_name?: string;
  region?: string;
  configuration?: Record<string, unknown>;
}

export interface AddServiceResult {
  resource: SardisProjectResource;
  cost_summary: {
    amount: string;
    currency: string;
    interval?: string;
    escrow_held: boolean;
  };
}

// ---------------------------------------------------------------------------
// CLIBridge
// ---------------------------------------------------------------------------

/**
 * High-level bridge for the `sardis projects add` CLI command.
 *
 * Usage:
 * ```ts
 * const bridge = new CLIBridge({
 *   wallet: myWallet,
 *   onConfirm: async (msg) => {
 *     console.log(msg);
 *     return readline.question("Proceed? (y/n) ") === "y";
 *   },
 *   onProgress: (msg) => console.log(`  ${msg}`),
 * });
 *
 * const result = await bridge.addService({
 *   project_name: "my-app",
 *   provider_url: "https://supabase.com",
 *   offering_id: "supabase/managed-postgres",
 *   tier_id: "pro",
 * });
 * ```
 */
export class CLIBridge {
  private readonly cli: SardisCLI;
  private readonly walletClient: SardisWalletClient;
  private readonly onConfirm?: (message: string) => Promise<boolean>;
  private readonly onProgress?: (message: string) => void;

  constructor(options: CLIBridgeOptions) {
    this.walletClient = new SardisWalletClient(options.wallet);
    const escrowManager = new EscrowManager();

    this.cli = new SardisCLI({
      walletClient: this.walletClient,
      escrowManager,
      authToken: options.authToken,
    });

    this.onConfirm = options.onConfirm;
    this.onProgress = options.onProgress;
  }

  /**
   * Add a service to a project with cost estimation and confirmation.
   *
   * Flow:
   * 1. Fetch manifest to get pricing info
   * 2. Show cost estimate to user
   * 3. Ask for confirmation (paid tiers only)
   * 4. Provision via OSP with Sardis payment
   * 5. Return result with cost summary
   */
  async addService(
    params: AddServiceParams,
  ): Promise<{ ok: boolean; data?: AddServiceResult; error?: string }> {
    const baseUrl = params.provider_url.replace(/\/+$/, "");

    // Step 1: Fetch manifest for pricing info
    this.onProgress?.("Fetching service manifest...");

    let tier: {
      price?: { amount: string; currency: string; interval?: string | null };
      escrow_profile?: { required: boolean };
    } | undefined;

    try {
      const response = await fetch(`${baseUrl}/.well-known/osp.json`);
      if (response.ok) {
        const manifest = (await response.json()) as {
          offerings?: Array<{
            offering_id: string;
            tiers?: Array<{
              tier_id: string;
              price?: { amount: string; currency: string; interval?: string | null };
              escrow_profile?: { required: boolean };
            }>;
          }>;
        };
        const offering = manifest.offerings?.find(
          (o) => o.offering_id === params.offering_id,
        );
        tier = offering?.tiers?.find((t) => t.tier_id === params.tier_id);
      }
    } catch {
      // Continue without pricing info — provisioning will validate
    }

    const amount = tier?.price?.amount ?? "unknown";
    const currency = tier?.price?.currency ?? "USD";
    const interval = tier?.price?.interval ?? undefined;
    const isFree = amount === "0" || amount === "0.00";
    const escrowRequired = tier?.escrow_profile?.required ?? false;

    // Step 2 + 3: Show cost and confirm for paid tiers
    if (!isFree && this.onConfirm) {
      const costMessage = [
        `Service: ${params.offering_id} (${params.tier_id})`,
        `Cost: ${amount} ${currency}${interval ? ` / ${interval}` : ""}`,
        escrowRequired ? `Escrow: ${amount} ${currency} held until release condition met` : "",
        `Wallet: ${this.walletClient.getWallet().balance} ${this.walletClient.getWallet().currency} available`,
      ]
        .filter(Boolean)
        .join("\n");

      const confirmed = await this.onConfirm(costMessage);
      if (!confirmed) {
        return { ok: false, error: "User cancelled provisioning" };
      }
    }

    // Step 4: Provision via CLI
    this.onProgress?.("Provisioning service...");

    const result = await this.cli.add({
      project_name: params.project_name,
      provider_url: params.provider_url,
      offering_id: params.offering_id,
      tier_id: params.tier_id,
      resource_name: params.resource_name,
      region: params.region,
      configuration: params.configuration,
    });

    if (!result.ok || !result.data) {
      return { ok: false, error: result.error ?? "Provisioning failed" };
    }

    this.onProgress?.(`Service provisioned: ${result.data.resource_id}`);

    // Step 5: Return with cost summary
    return {
      ok: true,
      data: {
        resource: result.data,
        cost_summary: {
          amount,
          currency,
          interval: interval ?? undefined,
          escrow_held: !!result.data.escrow_id,
        },
      },
    };
  }

  /** Delegate to CLI list command. */
  async listProjects() {
    return this.cli.list();
  }

  /** Delegate to CLI remove command. */
  async removeService(params: { project_name: string; resource_id: string }) {
    return this.cli.remove(params);
  }

  /** Delegate to CLI status command. */
  async projectStatus(params: { project_name: string }) {
    return this.cli.status(params);
  }

  /** Access the underlying CLI instance for advanced operations. */
  getCLI(): SardisCLI {
    return this.cli;
  }
}
