/**
 * OSP (Open Service Protocol) type definitions.
 *
 * These types mirror the canonical JSON Schemas at
 * https://osp.dev/schemas/ and are the TypeScript source of truth for
 * any OSP client or provider implementation.
 */

// ---------------------------------------------------------------------------
// Manifest & Catalog
// ---------------------------------------------------------------------------

/** Top-level manifest published by a provider at `/.well-known/osp.json`. */
export interface ServiceManifest {
  manifest_id: string;
  manifest_version: number;
  previous_version: number | null;
  provider_id: string;
  display_name: string;
  provider_url?: string;
  provider_public_key?: string;
  offerings: ServiceOffering[];
  accepted_payment_methods?: PaymentMethod[];
  trust_tier_required?: TrustTier;
  endpoints: ProviderEndpoints;
  extensions?: Record<string, unknown>;
  effective_at?: string;
  provider_signature: string;
}

/** A single service offering within a provider's catalog. */
export interface ServiceOffering {
  offering_id: string;
  name: string;
  description?: string;
  category: ServiceCategory;
  tiers: ServiceTier[];
  credentials_schema: Record<string, unknown>;
  estimated_provision_seconds?: number;
  fulfillment_proof_type?: FulfillmentProofType;
  regions?: string[];
  documentation_url?: string;
}

/** A pricing / capability tier within a service offering. */
export interface ServiceTier {
  tier_id: string;
  name: string;
  price: Price;
  limits?: Record<string, unknown>;
  features?: string[];
  escrow_profile?: EscrowProfile;
  rate_limit?: string;
  usage_metering?: UsageMetering;
}

/** Pricing information with currency and optional billing interval. */
export interface Price {
  /** Decimal string to avoid floating-point issues (e.g. "25.00"). */
  amount: string;
  currency: Currency;
  /** ISO 8601 duration (e.g. "P1M"), or null for one-time charges. */
  interval?: string | null;
}

/** Escrow timing parameters governing payment hold and release. */
export interface EscrowProfile {
  timeout_seconds?: number;
  verification_window_seconds?: number;
  dispute_window_seconds?: number;
}

/** Usage-based metering configuration. */
export interface UsageMetering {
  dimensions?: string[];
  reporting_window?: string;
  countersignature_required?: boolean;
}

/** API endpoint paths for the provisioning lifecycle. */
export interface ProviderEndpoints {
  provision: string;
  deprovision: string;
  credentials: string;
  rotate?: string;
  status: string;
  usage?: string;
  health: string;
}

// ---------------------------------------------------------------------------
// Provisioning
// ---------------------------------------------------------------------------

/** Request from an AI agent to provision a service resource. */
export interface ProvisionRequest {
  offering_id: string;
  tier_id: string;
  project_name: string;
  region?: string;
  payment_method?: PaymentMethod;
  payment_proof?: string;
  agent_public_key?: string;
  nonce: string;
  config?: Record<string, unknown>;
  webhook_url?: string;
}

/** Response returned by a provider after a provisioning request. */
export interface ProvisionResponse {
  resource_id: string;
  status: ProvisionStatus;
  credentials?: CredentialBundle;
  dashboard_url?: string;
  estimated_ready_seconds?: number;
  fulfillment_proof?: string;
  escrow_id?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

/** An encrypted bundle of credentials returned after provisioning. */
export interface CredentialBundle {
  resource_id: string;
  /** Credentials encrypted with the agent's public key. */
  encrypted_payload?: string;
  /** Plaintext credentials (only for free-tier / testing). */
  credentials?: Record<string, string>;
  encryption_algorithm?: string;
  /** Ephemeral public key used for ECDH key agreement (base64url). */
  ephemeral_public_key?: string;
  issued_at: string;
  expires_at?: string;
}

// ---------------------------------------------------------------------------
// Lifecycle & Usage
// ---------------------------------------------------------------------------

/** Current status of a provisioned resource. */
export interface ResourceStatus {
  resource_id: string;
  status: ProvisionStatus;
  offering_id: string;
  tier_id: string;
  region?: string;
  created_at: string;
  updated_at?: string;
  dashboard_url?: string;
  message?: string;
}

/** Metered usage report for a provisioned resource. */
export interface UsageReport {
  resource_id: string;
  period_start: string;
  period_end: string;
  dimensions: UsageDimension[];
  total_cost?: Price;
  provider_signature?: string;
}

/** A single metered usage dimension within a report. */
export interface UsageDimension {
  name: string;
  value: number;
  unit: string;
}

/** Health status of a provider endpoint. */
export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  version?: string;
  latency_ms?: number;
  checked_at: string;
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Enums / Literals
// ---------------------------------------------------------------------------

export type PaymentMethod =
  | "free"
  | "sardis_wallet"
  | "stripe_spt"
  | "x402"
  | "mpp"
  | "invoice"
  | "external";

export type Currency = "USD" | "EUR" | "GBP" | "USDC" | "EURC";

export type TrustTier = 0 | 1 | 2 | 3;

export type ServiceCategory =
  | "database"
  | "hosting"
  | "auth"
  | "analytics"
  | "storage"
  | "compute"
  | "messaging"
  | "monitoring"
  | "search"
  | "ai"
  | "other";

export type FulfillmentProofType =
  | "api_key_delivery"
  | "health_check"
  | "signed_receipt";

export type ProvisionStatus =
  | "provisioning"
  | "active"
  | "failed"
  | "deprovisioning"
  | "deprovisioned";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Structured error returned by an OSP provider. */
export interface OSPErrorBody {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
