/**
 * Type definitions for @osp/mcp-server.
 *
 * These are the subset of OSP types needed by the MCP server tools.
 * Kept self-contained so the package has zero dependency on @osp/client at runtime.
 */

// ---------------------------------------------------------------------------
// Manifest & Catalog
// ---------------------------------------------------------------------------

/** Top-level manifest published by a provider at `/.well-known/osp.json`. */
export interface ServiceManifest {
  manifest_id: string;
  manifest_version: number;
  previous_version: number | null;
  osp_spec_version?: string;
  provider_id: string;
  display_name: string;
  provider_url?: string;
  provider_public_key?: string;
  offerings: ServiceOffering[];
  accepted_payment_methods?: PaymentMethod[];
  endpoints: ProviderEndpoints;
  mcp?: MCPConfig;
  extensions?: Record<string, unknown>;
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
  accepted_payment_methods?: PaymentMethod[];
}

/** Pricing information. */
export interface Price {
  amount: string;
  currency: string;
  interval?: string | null;
}

/** API endpoint paths for the provisioning lifecycle. */
export interface ProviderEndpoints {
  provision: string;
  estimate?: string;
  deprovision: string;
  credentials: string;
  rotate?: string;
  status: string;
  usage?: string;
  health: string;
  skills?: string;
}

/** MCP .well-known alignment and tool advertisement. */
export interface MCPConfig {
  tools?: string[];
  streamable_http?: boolean;
  well_known_url?: string;
  skills_url?: string;
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
  payment_proof?: PaymentProof;
  nonce: string;
  config?: Record<string, unknown>;
}

/** Response returned by a provider after a provisioning request. */
export interface ProvisionResponse {
  resource_id: string;
  status: ProvisionStatus;
  credentials?: CredentialBundle;
  dashboard_url?: string;
  message?: string;
  cost_estimate?: CostEstimate;
}

/** Request to estimate provisioning cost without creating a resource. */
export interface EstimateRequest {
  offering_id: string;
  tier_id: string;
  region?: string;
  configuration?: Record<string, unknown>;
  estimated_usage?: Record<string, number>;
  billing_periods?: number;
}

/** Cost estimate response from a provider. */
export interface EstimateResponse {
  offering_id: string;
  tier_id: string;
  estimate: {
    base_cost?: Price;
    metered_cost?: Record<
      string,
      {
        quantity: number;
        unit_price: string;
        subtotal: string;
        note?: string;
      }
    >;
    total_monthly?: string;
    total_for_period?: string;
    currency?: string;
    billing_periods?: number;
  };
  comparison_hint?: string;
  valid_until?: string;
}

/** An encrypted bundle of credentials returned after provisioning. */
export interface CredentialBundle {
  bundle_id?: string;
  resource_id: string;
  offering_id?: string;
  credentials?: Record<string, string>;
  issued_at: string;
  expires_at?: string | null;
}

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
}

export interface UsageDimension {
  name?: string;
  dimension?: string;
  value?: number;
  unit: string;
}

/** Cost estimate breakdown. */
export interface CostEstimate {
  monthly_estimate?: string;
  currency?: string;
  breakdown?: CostBreakdownItem[];
}

export interface CostBreakdownItem {
  dimension: string;
  estimated_usage: string;
  unit_price: string;
  estimated_cost: string;
}

export type PaymentProof = string | Record<string, unknown>;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type PaymentMethod =
  | "free"
  | "sardis_wallet"
  | "stripe_spt"
  | "x402"
  | "mpp"
  | "invoice"
  | "external";

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
  | "email"
  | "other";

export type ProvisionStatus =
  | "provisioning"
  | "active"
  | "failed"
  | "pending_payment"
  | "deprovisioning"
  | "deprovisioned";
