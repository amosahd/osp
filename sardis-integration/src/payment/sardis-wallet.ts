/**
 * Sardis Wallet — payment method flow for OSP integration.
 *
 * Implements the `sardis_wallet` payment method defined in OSP spec Section 7.1.
 * Handles:
 * - SpendingMandate creation from OSP offering/tier selection
 * - SpendingMandate → ProvisionRequest.payment_proof mapping
 * - EscrowHold creation on paid provisioning
 * - UsageReport → ChargeIntent mapping for metered billing
 */

import type {
  ChargeIntent,
  ChargeLineItem,
  ChargeStatus,
  EscrowHold,
  EscrowStatus,
  MandateStatus,
  ReleaseCondition,
  SardisError,
  SardisPaymentProof,
  SardisResult,
  SardisWallet,
  SpendingMandate,
  SpendingPolicy,
} from "./types.js";

// ---------------------------------------------------------------------------
// OSP types (minimal subset to avoid circular dependency)
// ---------------------------------------------------------------------------

interface OSPProvisionRequest {
  offering_id: string;
  tier_id: string;
  project_name: string;
  region?: string;
  payment_method: string;
  payment_proof?: SardisPaymentProof;
  nonce: string;
  [key: string]: unknown;
}

interface OSPUsageReport {
  report_id: string;
  resource_id: string;
  period_start: string;
  period_end: string;
  line_items: Array<{
    dimension_id: string;
    description: string;
    quantity: string;
    unit: string;
    included_quantity: string;
    billable_quantity: string;
    unit_price: string;
    amount: string;
  }>;
  total_amount: string;
  currency: string;
}

interface OSPServiceTier {
  tier_id: string;
  name: string;
  price: { amount: string; currency: string; interval?: string | null };
  escrow_profile?: {
    required: boolean;
    provider?: string;
    release_condition?: ReleaseCondition;
    dispute_window_hours?: number;
  };
}

// ---------------------------------------------------------------------------
// SardisWalletClient
// ---------------------------------------------------------------------------

/**
 * Client for the Sardis wallet payment flow within OSP.
 *
 * Usage:
 * ```ts
 * const client = new SardisWalletClient(wallet);
 *
 * // 1. Create a spending mandate for the desired provisioning
 * const mandate = await client.createMandate({
 *   offering_id: "supabase/managed-postgres",
 *   tier_id: "pro",
 *   tier: proTier,
 * });
 *
 * // 2. Build the OSP provision request with Sardis payment proof
 * const request = client.toProvisionRequest(mandate, {
 *   project_name: "my-app-db",
 *   nonce: crypto.randomUUID(),
 * });
 *
 * // 3. After provisioning, create escrow hold
 * const escrow = await client.createEscrowHold(mandate, resourceId, proTier);
 *
 * // 4. On usage report, create charge intent
 * const charge = await client.usageToChargeIntent(usageReport);
 * ```
 */
export class SardisWalletClient {
  private readonly wallet: SardisWallet;
  private readonly mandates = new Map<string, SpendingMandate>();
  private readonly escrows = new Map<string, EscrowHold>();
  private readonly charges = new Map<string, ChargeIntent>();

  constructor(wallet: SardisWallet) {
    this.wallet = wallet;
  }

  // -----------------------------------------------------------------------
  // Spending Mandates
  // -----------------------------------------------------------------------

  /**
   * Create a SpendingMandate for a specific OSP offering + tier.
   *
   * The mandate is scoped to exactly one provisioning action and carries
   * the maximum amount the wallet is authorized to spend.
   */
  async createMandate(params: {
    offering_id: string;
    tier_id: string;
    tier: OSPServiceTier;
    provider_id?: string;
    region?: string;
    metadata?: Record<string, string>;
    ttl_hours?: number;
  }): Promise<SardisResult<SpendingMandate>> {
    const policy = this.findApplicablePolicy(
      params.offering_id,
      params.tier.price.amount,
      params.provider_id,
    );

    if (!policy) {
      return {
        ok: false,
        error: {
          code: "POLICY_VIOLATION",
          message: "No spending policy permits this transaction",
          details: {
            offering_id: params.offering_id,
            amount: params.tier.price.amount,
          },
        },
      };
    }

    if (policy.requires_approval) {
      return {
        ok: false,
        error: {
          code: "APPROVAL_REQUIRED",
          message: "This transaction requires human approval before proceeding",
          details: { policy_id: policy.policy_id },
        },
      };
    }

    const amount = params.tier.price.amount;
    if (parseFloat(amount) > parseFloat(this.wallet.balance)) {
      return {
        ok: false,
        error: {
          code: "INSUFFICIENT_BALANCE",
          message: `Wallet balance ${this.wallet.balance} ${this.wallet.currency} is insufficient for ${amount} ${params.tier.price.currency}`,
        },
      };
    }

    const ttlHours = params.ttl_hours ?? 1;
    const expiresAt = new Date(
      Date.now() + ttlHours * 60 * 60 * 1000,
    ).toISOString();

    const mandate: SpendingMandate = {
      mandate_id: `mnd_${generateId()}`,
      wallet_id: this.wallet.wallet_id,
      offering_id: params.offering_id,
      tier_id: params.tier_id,
      max_amount: amount,
      currency: params.tier.price.currency,
      expires_at: expiresAt,
      status: "active",
      policy_id: policy.policy_id,
      provider_id: params.provider_id,
      region: params.region,
      metadata: params.metadata,
      created_at: new Date().toISOString(),
    };

    this.mandates.set(mandate.mandate_id, mandate);
    return { ok: true, data: mandate };
  }

  /**
   * Convert a SpendingMandate into an OSP ProvisionRequest with
   * `payment_method: "sardis_wallet"` and the appropriate payment_proof.
   */
  toProvisionRequest(
    mandate: SpendingMandate,
    params: {
      project_name: string;
      nonce: string;
      region?: string;
      configuration?: Record<string, unknown>;
      agent_public_key?: string;
      webhook_url?: string;
      metadata?: Record<string, string>;
    },
  ): SardisResult<OSPProvisionRequest> {
    if (mandate.status !== "active") {
      return {
        ok: false,
        error: {
          code: "MANDATE_NOT_ACTIVE",
          message: `Mandate ${mandate.mandate_id} is ${mandate.status}, not active`,
        },
      };
    }

    if (new Date(mandate.expires_at) < new Date()) {
      mandate.status = "expired";
      return {
        ok: false,
        error: {
          code: "MANDATE_EXPIRED",
          message: `Mandate ${mandate.mandate_id} expired at ${mandate.expires_at}`,
        },
      };
    }

    const request: OSPProvisionRequest = {
      offering_id: mandate.offering_id,
      tier_id: mandate.tier_id,
      project_name: params.project_name,
      region: params.region ?? mandate.region,
      payment_method: "sardis_wallet",
      payment_proof: {
        version: "sardis-proof-v1",
        wallet_address: mandate.wallet_id,
        payment_tx: mandate.mandate_id,
        offering_id: mandate.offering_id,
        tier_id: mandate.tier_id,
        amount: mandate.max_amount,
        currency: mandate.currency,
        nonce: params.nonce,
        expires_at: mandate.expires_at,
        provider_id: mandate.provider_id,
        region: params.region ?? mandate.region,
        signature_material: buildSignatureMaterial(
          mandate,
          params.nonce,
          params.region ?? mandate.region,
        ),
      },
      nonce: params.nonce,
      ...(params.configuration && { configuration: params.configuration }),
      ...(params.agent_public_key && {
        agent_public_key: params.agent_public_key,
      }),
      ...(params.webhook_url && { webhook_url: params.webhook_url }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    return { ok: true, data: request };
  }

  /**
   * Revoke an active mandate, preventing it from being used.
   */
  revokeMandate(mandateId: string): SardisResult<SpendingMandate> {
    const mandate = this.mandates.get(mandateId);
    if (!mandate) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: `Mandate ${mandateId} not found` },
      };
    }
    if (mandate.status !== "active") {
      return {
        ok: false,
        error: {
          code: "INVALID_STATE",
          message: `Cannot revoke mandate in ${mandate.status} state`,
        },
      };
    }
    mandate.status = "revoked";
    return { ok: true, data: mandate };
  }

  // -----------------------------------------------------------------------
  // Escrow
  // -----------------------------------------------------------------------

  /**
   * Create an EscrowHold after successful paid provisioning.
   *
   * Locks the mandate's authorized amount until the release condition
   * defined in the tier's escrow_profile is met.
   */
  async createEscrowHold(
    mandate: SpendingMandate,
    resourceId: string,
    tier: OSPServiceTier,
  ): Promise<SardisResult<EscrowHold>> {
    if (mandate.status !== "active") {
      return {
        ok: false,
        error: {
          code: "MANDATE_NOT_ACTIVE",
          message: `Mandate ${mandate.mandate_id} is ${mandate.status}`,
        },
      };
    }

    const escrowProfile = tier.escrow_profile;
    const releaseCondition: ReleaseCondition =
      escrowProfile?.release_condition ?? "provision_success";
    const disputeWindowHours = escrowProfile?.dispute_window_hours ?? 72;

    const escrow: EscrowHold = {
      escrow_id: `esc_${generateId()}`,
      mandate_id: mandate.mandate_id,
      wallet_id: mandate.wallet_id,
      resource_id: resourceId,
      amount: mandate.max_amount,
      currency: mandate.currency,
      status: "active",
      release_condition: releaseCondition,
      dispute_window_hours: disputeWindowHours,
      created_at: new Date().toISOString(),
    };

    // Mark the mandate as consumed — it can't be reused.
    mandate.status = "consumed";
    this.escrows.set(escrow.escrow_id, escrow);

    return { ok: true, data: escrow };
  }

  // -----------------------------------------------------------------------
  // Usage → Charge Intents
  // -----------------------------------------------------------------------

  /**
   * Convert an OSP UsageReport into a Sardis ChargeIntent.
   *
   * The ChargeIntent captures the metered charges and submits them for
   * validation against the wallet's spending policies before settlement.
   */
  async usageToChargeIntent(
    report: OSPUsageReport,
  ): Promise<SardisResult<ChargeIntent>> {
    const lineItems: ChargeLineItem[] = report.line_items.map((item) => ({
      dimension_id: item.dimension_id,
      description: item.description,
      quantity: item.billable_quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      amount: item.amount,
    }));

    const charge: ChargeIntent = {
      charge_id: `chi_${generateId()}`,
      wallet_id: this.wallet.wallet_id,
      resource_id: report.resource_id,
      report_id: report.report_id,
      amount: report.total_amount,
      currency: report.currency,
      status: "pending",
      line_items: lineItems,
      period_start: report.period_start,
      period_end: report.period_end,
      created_at: new Date().toISOString(),
    };

    // Validate against spending policies
    const policy = this.findApplicablePolicy(
      /* offering_id not available in usage report, skip category check */ "",
      report.total_amount,
    );
    if (!policy) {
      charge.status = "failed";
      return {
        ok: false,
        error: {
          code: "POLICY_VIOLATION",
          message: "Usage charge exceeds spending policy limits",
          details: { amount: report.total_amount, currency: report.currency },
        },
      };
    }

    charge.status = "approved";
    this.charges.set(charge.charge_id, charge);
    return { ok: true, data: charge };
  }

  // -----------------------------------------------------------------------
  // Accessors
  // -----------------------------------------------------------------------

  getMandate(mandateId: string): SpendingMandate | undefined {
    return this.mandates.get(mandateId);
  }

  getEscrow(escrowId: string): EscrowHold | undefined {
    return this.escrows.get(escrowId);
  }

  getCharge(chargeId: string): ChargeIntent | undefined {
    return this.charges.get(chargeId);
  }

  getWallet(): SardisWallet {
    return this.wallet;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private findApplicablePolicy(
    offeringId: string,
    amount: string,
    providerId?: string,
  ): SpendingPolicy | undefined {
    const numAmount = parseFloat(amount);

    return this.wallet.spending_policies.find((policy) => {
      // Check per-transaction limit
      if (numAmount > parseFloat(policy.max_amount_per_tx)) return false;

      // Check category restriction (offering_id format: "provider/service")
      if (
        policy.allowed_categories.length > 0 &&
        offeringId &&
        !policy.allowed_categories.some((cat) => offeringId.includes(cat))
      ) {
        return false;
      }

      // Check provider restriction
      if (
        policy.allowed_providers.length > 0 &&
        providerId &&
        !policy.allowed_providers.includes(providerId)
      ) {
        return false;
      }

      return true;
    });
  }
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

function buildSignatureMaterial(
  mandate: SpendingMandate,
  nonce: string,
  region?: string,
): string {
  return [
    "sardis-proof-v1",
    mandate.wallet_id,
    mandate.mandate_id,
    mandate.offering_id,
    mandate.tier_id,
    mandate.max_amount,
    mandate.currency,
    nonce,
    mandate.expires_at,
    mandate.provider_id ?? "",
    region ?? mandate.region ?? "",
  ].join(":");
}
