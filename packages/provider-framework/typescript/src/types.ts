/**
 * @osp/provider - Type definitions for OSP provider handlers
 *
 * These types define the contract between the framework and provider implementations.
 * They mirror the OSP v1.0 specification protocol objects.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type PaymentMethod =
  | 'free'
  | 'sardis_wallet'
  | 'stripe_spt'
  | 'x402'
  | 'mpp'
  | 'invoice'
  | 'external';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'USDC' | 'EURC';

export type ServiceCategory =
  | 'database'
  | 'hosting'
  | 'auth'
  | 'analytics'
  | 'storage'
  | 'compute'
  | 'messaging'
  | 'monitoring'
  | 'search'
  | 'ai'
  | 'email'
  | 'other';

export type FulfillmentProofType =
  | 'api_key_delivery'
  | 'health_check'
  | 'signed_receipt';

export type ProvisionStatus =
  | 'provisioning'
  | 'active'
  | 'failed'
  | 'pending_payment';

export type EncryptionMethod =
  | 'x25519-xsalsa20-poly1305'
  | 'aes-256-gcm';

export type CredentialType =
  | 'api_key'
  | 'connection_string'
  | 'oauth_token'
  | 'certificate'
  | 'composite'
  | 'short_lived_token';

export type ProvisionErrorCode =
  | 'insufficient_funds'
  | 'payment_failed'
  | 'region_unavailable'
  | 'quota_exceeded'
  | 'invalid_config'
  | 'trust_tier_insufficient'
  | 'offering_unavailable'
  | 'provider_error'
  | 'rate_limited'
  | 'budget_exceeded'
  | 'delegation_unauthorized'
  | 'nhi_federation_failed';

export type HealthState = 'healthy' | 'degraded' | 'unhealthy';

// ---------------------------------------------------------------------------
// Manifest & Catalog
// ---------------------------------------------------------------------------

export interface Price {
  amount: string;
  currency: Currency;
  interval?: string | null;
}

export interface EscrowProfile {
  timeout_seconds?: number;
  verification_window_seconds?: number;
  dispute_window_seconds?: number;
}

export interface UsageMetering {
  dimensions?: string[];
  reporting_window?: string;
  countersignature_required?: boolean;
}

export interface ServiceTier {
  tier_id: string;
  name: string;
  price: Price;
  limits?: Record<string, unknown>;
  features?: string[];
  escrow_profile?: EscrowProfile;
  rate_limit?: string;
  usage_metering?: UsageMetering;
  sla?: string;
  ttl_seconds?: number | null;
}

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
  dependencies?: string[];
  sbom_url?: string;
}

export interface ProviderEndpoints {
  provision: string;
  deprovision: string;
  credentials: string;
  rotate?: string;
  status: string;
  usage?: string;
  health: string;
}

export interface ServiceManifest {
  manifest_id: string;
  manifest_version: number;
  previous_version?: number | null;
  osp_spec_version?: string;
  provider_id: string;
  display_name: string;
  provider_url?: string;
  provider_public_key?: string;
  offerings: ServiceOffering[];
  accepted_payment_methods?: PaymentMethod[];
  trust_tier_required?: number;
  endpoints: ProviderEndpoints;
  extensions?: Record<string, unknown>;
  effective_at?: string;
  provider_signature: string;
}

// ---------------------------------------------------------------------------
// Provisioning
// ---------------------------------------------------------------------------

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
  delegating_agent_id?: string;
  delegation_proof?: string;
  nhi_token_mode?: 'static' | 'short_lived' | 'federated';
  budget?: BudgetConstraint;
  ttl_seconds?: number | null;
  trace_context?: string;
  sandbox?: SandboxConfig;
}

export interface BudgetConstraint {
  max_monthly_cost?: string;
  max_total_cost?: string;
  currency?: Currency;
  alert_threshold_percent?: number;
}

export interface SandboxConfig {
  enabled: boolean;
  ttl_hours?: number;
  seed_data?: boolean;
}

export interface CredentialBundle {
  encrypted_payload: string;
  encryption_method: EncryptionMethod;
  ephemeral_public_key?: string;
  nonce?: string;
  provider_signature: string;
}

export interface FulfillmentProof {
  type: FulfillmentProofType;
  health_check_url?: string;
  receipt_signature?: string;
  receipt_payload?: string;
  timestamp: string;
}

export interface ProvisionError {
  code: ProvisionErrorCode;
  message: string;
  retry_after_seconds?: number;
}

export interface ProvisionResponse {
  request_id: string;
  offering_id: string;
  tier_id: string;
  status: ProvisionStatus;
  resource_id?: string;
  credentials?: CredentialBundle | null;
  fulfillment_proof?: FulfillmentProof | null;
  status_url?: string;
  estimated_ready_seconds?: number;
  region?: string;
  created_at: string;
  expires_at?: string | null;
  dashboard_url?: string;
  error?: ProvisionError;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export interface ResourceStatus {
  resource_id: string;
  status: ProvisionStatus | 'deprovisioned' | 'suspended';
  offering_id: string;
  tier_id: string;
  region?: string;
  created_at: string;
  updated_at?: string;
  dashboard_url?: string;
  message?: string;
}

export interface UsageDimension {
  dimension: string;
  quantity: string;
  unit: string;
  included_quantity?: string;
  overage_quantity?: string;
  unit_price?: string;
  cost?: { amount: string; currency: Currency };
}

export interface UsageReport {
  report_id: string;
  resource_id: string;
  offering_id: string;
  tier_id?: string;
  period_start: string;
  period_end: string;
  dimensions: UsageDimension[];
  total_cost?: { amount: string; currency: Currency };
  provider_signature: string;
  generated_at?: string;
}

export interface HealthStatus {
  status: HealthState;
  version?: string;
  latency_ms?: number;
  checked_at: string;
  details?: Record<string, unknown>;
}

export interface CostSummaryParams {
  resource_id?: string;
  period_start?: string;
  period_end?: string;
}

export interface CostSummary {
  total_cost: { amount: string; currency: Currency };
  resources: Array<{
    resource_id: string;
    offering_id: string;
    cost: { amount: string; currency: Currency };
  }>;
  period_start: string;
  period_end: string;
}

// ---------------------------------------------------------------------------
// Error Response
// ---------------------------------------------------------------------------

export interface OSPErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Provider Handler Types
// ---------------------------------------------------------------------------

/**
 * Handlers that a provider must implement to serve OSP endpoints.
 * All handlers are async functions that return the appropriate response type.
 */
export interface OSPProviderHandlers {
  /** Handle a provisioning request. Returns the provision response. */
  onProvision: (req: ProvisionRequest) => Promise<ProvisionResponse>;

  /** Handle deprovisioning a resource by ID. */
  onDeprovision: (resourceId: string) => Promise<void>;

  /** Get the current status of a provisioned resource. */
  onStatus: (resourceId: string) => Promise<ResourceStatus>;

  /** Rotate credentials for a resource. Returns the new credential bundle. */
  onRotate?: (resourceId: string) => Promise<CredentialBundle>;

  /** Get usage report for a resource. */
  onUsage?: (resourceId: string) => Promise<UsageReport>;

  /** Health check handler. */
  onHealth?: () => Promise<HealthStatus>;

  /** Get cost summary across resources. */
  onCostSummary?: (params: CostSummaryParams) => Promise<CostSummary>;
}

// ---------------------------------------------------------------------------
// Provider Configuration
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Maximum requests per window. Default: 60 */
  windowMs?: number;
  /** Maximum number of requests within the window. Default: 60 */
  maxRequests?: number;
}

export interface OSPProviderConfig {
  /** The service manifest to serve at /.well-known/osp.json */
  manifest: ServiceManifest;

  /** Provider handler implementations */
  onProvision: OSPProviderHandlers['onProvision'];
  onDeprovision: OSPProviderHandlers['onDeprovision'];
  onStatus: OSPProviderHandlers['onStatus'];
  onRotate?: OSPProviderHandlers['onRotate'];
  onUsage?: OSPProviderHandlers['onUsage'];
  onHealth?: OSPProviderHandlers['onHealth'];
  onCostSummary?: OSPProviderHandlers['onCostSummary'];

  /** Rate limiting configuration. Defaults to 60 req/min. */
  rateLimit?: RateLimitConfig;

  /** Enable request logging. Default: true */
  logging?: boolean;
}
