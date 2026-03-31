/**
 * Sardis payment types for OSP integration.
 *
 * These types model the Sardis payment rail as it maps onto the OSP
 * provisioning and billing protocol objects. Sardis is rail-agnostic:
 * it wraps underlying settlement rails (Stripe, crypto, invoice, etc.)
 * behind a unified spending-policy + escrow model.
 *
 * Key concept: "Reusable credential is the wrong primitive."
 * Every provisioning action gets its own SpendingMandate — a scoped,
 * time-limited, revocable authorization — instead of a long-lived API key.
 */

// ---------------------------------------------------------------------------
// Wallets & Identity
// ---------------------------------------------------------------------------

/** A Sardis wallet represents a funding source with spending policies. */
export interface SardisWallet {
  /** Unique wallet identifier (e.g., "wal_abc123"). */
  wallet_id: string;
  /** Human-readable wallet label. */
  label: string;
  /** Owner principal (user or organization). */
  owner_id: string;
  /** Available balance as a decimal string (e.g., "1500.00"). */
  balance: string;
  /** ISO 4217 currency code. */
  currency: string;
  /** Underlying settlement rail(s) this wallet can use. */
  settlement_rails: SettlementRail[];
  /** Active spending policies applied to this wallet. */
  spending_policies: SpendingPolicy[];
  /** RFC 3339 creation timestamp. */
  created_at: string;
}

/** A supported settlement rail for fund movement. */
export type SettlementRail =
  | "stripe"
  | "usdc"
  | "wire"
  | "ach"
  | "invoice"
  | "internal";

/** A policy that constrains how wallet funds can be spent. */
export interface SpendingPolicy {
  /** Unique policy identifier. */
  policy_id: string;
  /** Maximum single-transaction amount. */
  max_amount_per_tx: string;
  /** Maximum total amount within the time window. */
  max_amount_per_window: string;
  /** Rolling window duration (ISO 8601 duration, e.g., "P1D", "P30D"). */
  window_duration: string;
  /** Allowed service categories (empty = all allowed). */
  allowed_categories: string[];
  /** Allowed provider IDs (empty = all allowed). */
  allowed_providers: string[];
  /** Whether agent-initiated transactions require human approval. */
  requires_approval: boolean;
}

// ---------------------------------------------------------------------------
// Spending Mandates
// ---------------------------------------------------------------------------

/**
 * A SpendingMandate is a scoped, time-limited authorization for a specific
 * provisioning action. It maps 1:1 to an OSP ProvisionRequest.
 *
 * Unlike a reusable API key, a mandate:
 * - Is scoped to a single offering + tier
 * - Has a hard expiry
 * - Carries the maximum authorized amount
 * - Can be revoked at any time
 * - Generates an audit trail
 */
export interface SpendingMandate {
  /** Unique mandate identifier (e.g., "mnd_xyz789"). */
  mandate_id: string;
  /** Wallet funding this mandate. */
  wallet_id: string;
  /** OSP offering this mandate authorizes (e.g., "supabase/managed-postgres"). */
  offering_id: string;
  /** OSP tier this mandate authorizes (e.g., "pro"). */
  tier_id: string;
  /** Maximum amount authorized by this mandate. */
  max_amount: string;
  /** Currency for the authorized amount. */
  currency: string;
  /** RFC 3339 timestamp when this mandate expires. */
  expires_at: string;
  /** Current mandate state. */
  status: MandateStatus;
  /** The spending policy that approved this mandate. */
  policy_id: string;
  /** Optional: restrict to a specific provider. */
  provider_id?: string;
  /** Optional: restrict to a specific region. */
  region?: string;
  /** Metadata carried through to the OSP ProvisionRequest. */
  metadata?: Record<string, string>;
  /** RFC 3339 creation timestamp. */
  created_at: string;
}

export type MandateStatus =
  | "active"
  | "consumed"
  | "expired"
  | "revoked";

/**
 * Sardis proof envelope embedded into OSP `payment_proof`.
 *
 * The envelope binds the wallet, mandate, commercial terms, and request nonce
 * into a stable payload that providers can verify or countersign.
 */
export interface SardisPaymentProof {
  /** Sardis proof envelope format version. */
  version: "sardis-proof-v1";
  /** Wallet funding the provisioning action. */
  wallet_address: string;
  /** Mandate or transaction identifier authorizing the spend. */
  payment_tx: string;
  /** OSP offering covered by the proof. */
  offering_id: string;
  /** OSP tier covered by the proof. */
  tier_id: string;
  /** Authorized amount for the operation. */
  amount: string;
  /** ISO 4217 currency code for the authorization. */
  currency: string;
  /** Request nonce bound into the proof. */
  nonce: string;
  /** RFC 3339 timestamp when the proof expires. */
  expires_at: string;
  /** Optional provider binding when the mandate was scoped. */
  provider_id?: string;
  /** Optional region binding when the mandate was scoped. */
  region?: string;
  /**
   * Canonical material that a wallet or provider can sign to attest the proof.
   * This is deliberately explicit so multiple implementations can generate the
   * same verification payload without hidden conventions.
   */
  signature_material: string;
}

/** Expected commercial context when validating a Sardis payment proof. */
export interface SardisProofBindingExpectation {
  wallet_address?: string;
  payment_tx?: string;
  provider_id?: string;
  offering_id: string;
  tier_id: string;
  amount: string;
  currency: string;
  nonce?: string;
  region?: string;
}

// ---------------------------------------------------------------------------
// Escrow
// ---------------------------------------------------------------------------

/**
 * An EscrowHold locks funds from a wallet until a release condition is met.
 * Created when an agent provisions a paid OSP service.
 *
 * Lifecycle:
 *   active → released  (provision succeeded, conditions met)
 *   active → disputed  (agent filed dispute)
 *   active → expired   (release condition not met in time)
 *   disputed → released | refunded (dispute resolved)
 */
export interface EscrowHold {
  /** Unique escrow identifier (e.g., "esc_def456"). */
  escrow_id: string;
  /** The mandate that authorized this hold. */
  mandate_id: string;
  /** The wallet funds are held from. */
  wallet_id: string;
  /** OSP resource ID this escrow covers. */
  resource_id: string;
  /** Held amount as a decimal string. */
  amount: string;
  /** Currency of the held amount. */
  currency: string;
  /** Current escrow state. */
  status: EscrowStatus;
  /** Condition that must be met to release funds to the provider. */
  release_condition: ReleaseCondition;
  /** Hours during which the agent can dispute after provisioning. */
  dispute_window_hours: number;
  /** RFC 3339 timestamp when the hold was created. */
  created_at: string;
  /** RFC 3339 timestamp when the hold was released, refunded, or expired. */
  resolved_at?: string;
  /** If disputed, the OSP dispute receipt JWT. */
  dispute_receipt?: string;
  /** Settlement rail used for fund movement on resolution. */
  settlement_rail?: SettlementRail;
}

export type EscrowStatus =
  | "active"
  | "released"
  | "disputed"
  | "refunded"
  | "expired";

export type ReleaseCondition =
  | "provision_success"
  | "uptime_24h"
  | "uptime_7d"
  | "manual";

// ---------------------------------------------------------------------------
// Charge Intents (Usage-Based Billing)
// ---------------------------------------------------------------------------

/**
 * A ChargeIntent represents a pending charge derived from an OSP UsageReport.
 * The Sardis platform validates the report, checks spending policies,
 * and settles the charge against the wallet.
 */
export interface ChargeIntent {
  /** Unique charge intent identifier (e.g., "chi_ghi012"). */
  charge_id: string;
  /** The wallet to charge. */
  wallet_id: string;
  /** OSP resource ID this charge covers. */
  resource_id: string;
  /** OSP UsageReport ID this charge was derived from. */
  report_id: string;
  /** Charge amount as a decimal string. */
  amount: string;
  /** Currency of the charge. */
  currency: string;
  /** Current charge state. */
  status: ChargeStatus;
  /** Itemized breakdown from the usage report. */
  line_items: ChargeLineItem[];
  /** RFC 3339 billing period start. */
  period_start: string;
  /** RFC 3339 billing period end. */
  period_end: string;
  /** RFC 3339 timestamp when the charge was created. */
  created_at: string;
  /** RFC 3339 timestamp when the charge was settled or failed. */
  settled_at?: string;
}

export type ChargeStatus =
  | "pending"
  | "approved"
  | "settled"
  | "failed"
  | "disputed";

/** A single line item within a charge intent. */
export interface ChargeLineItem {
  /** Matches a metered dimension from the OSP tier. */
  dimension_id: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  amount: string;
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

/** A double-entry ledger entry for internal accounting. */
export interface LedgerEntry {
  /** Unique entry identifier. */
  entry_id: string;
  /** The ledger transaction this entry belongs to. */
  transaction_id: string;
  /** Account being debited or credited. */
  account_id: string;
  /** Entry type. */
  type: LedgerEntryType;
  /** Amount as a decimal string (always positive). */
  amount: string;
  /** Currency of the amount. */
  currency: string;
  /** What triggered this entry. */
  reference_type: LedgerReferenceType;
  /** ID of the referenced object (escrow_id, charge_id, etc.). */
  reference_id: string;
  /** Human-readable description. */
  description: string;
  /** RFC 3339 timestamp. */
  created_at: string;
}

export type LedgerEntryType = "debit" | "credit";

export type LedgerReferenceType =
  | "escrow_hold"
  | "escrow_release"
  | "escrow_refund"
  | "charge_settlement"
  | "mandate_authorization"
  | "wallet_deposit"
  | "wallet_withdrawal";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Standard result wrapper for Sardis operations. */
export interface SardisResult<T> {
  ok: boolean;
  data?: T;
  error?: SardisError;
}

export interface SardisError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
