/**
 * OSP (Open Service Protocol) type definitions — v1.1.
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
  osp_spec_version?: string;
  provider_id: string;
  display_name: string;
  provider_url?: string;
  provider_public_key?: string;
  offerings: ServiceOffering[];
  accepted_payment_methods?: PaymentMethod[];
  trust_tier_required?: TrustTier;
  endpoints: ProviderEndpoints;
  a2a?: A2AAgentCard;
  nhi?: NHIConfig;
  finops?: FinOpsConfig;
  dependency_graph?: DependencyGraph;
  scorecards?: Scorecards;
  observability?: ObservabilityConfig;
  mcp?: MCPConfig;
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
  dependencies?: string[];
  sbom_url?: string;
  canary?: CanaryConfig;
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
  sla?: string;
  ttl_seconds?: number | null;
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
  dependency_graph?: string;
  scorecard?: string;
  skills?: string;
}

// ---------------------------------------------------------------------------
// v1.1: A2A Agent Delegation
// ---------------------------------------------------------------------------

/** A2A agent card enabling delegated provisioning. */
export interface A2AAgentCard {
  agent_id?: string;
  capabilities?: A2ACapability[];
  delegation_endpoint?: string;
  task_lifecycle?: boolean;
  agent_public_key?: string;
}

export type A2ACapability = "provision" | "deprovision" | "rotate" | "monitor" | "delegate";

// ---------------------------------------------------------------------------
// v1.1: Non-Human Identity
// ---------------------------------------------------------------------------

/** Non-human identity lifecycle configuration. */
export interface NHIConfig {
  short_lived_tokens?: boolean;
  token_ttl_seconds?: number;
  orphan_detection?: boolean;
  federation?: NHIFederationType[];
  token_endpoint?: string;
}

export type NHIFederationType = "oidc" | "spiffe" | "mtls";

/** Short-lived NHI token details. */
export interface NHIToken {
  token: string;
  token_type: NHITokenType;
  expires_at: string;
  refresh_endpoint?: string;
  identity_id?: string;
}

export type NHITokenType = "bearer" | "dpop" | "mtls";
export type NHITokenMode = "static" | "short_lived" | "federated";

// ---------------------------------------------------------------------------
// v1.1: FinOps / Cost-as-Code
// ---------------------------------------------------------------------------

/** FinOps budget guardrails and cost-as-code configuration. */
export interface FinOpsConfig {
  budget_enforcement?: boolean;
  cost_in_pr?: boolean;
  anomaly_detection?: boolean;
  burn_rate_tracking?: boolean;
  budget_endpoint?: string;
}

/** Budget constraint for cost-aware provisioning. */
export interface BudgetConstraint {
  max_monthly_cost?: string;
  max_total_cost?: string;
  currency?: Currency;
  alert_threshold_percent?: number;
}

/** Budget consumption status. */
export interface BudgetStatus {
  budget_limit?: string;
  consumed?: string;
  remaining?: string;
  percent_used?: number;
  currency?: Currency;
  alert_triggered?: boolean;
}

/** Burn rate for TTL-based environments. */
export interface BurnRate {
  hourly_rate?: string;
  daily_rate?: string;
  ttl_remaining_seconds?: number | null;
  estimated_total_cost?: string;
  currency?: Currency;
}

// ---------------------------------------------------------------------------
// v1.1: Service Dependency Graph
// ---------------------------------------------------------------------------

/** Service dependency graph metadata. */
export interface DependencyGraph {
  auto_generate?: boolean;
  impact_analysis?: boolean;
  health_propagation?: boolean;
  auto_docs?: boolean;
}

// ---------------------------------------------------------------------------
// v1.1: Scorecards & Compliance
// ---------------------------------------------------------------------------

/** Service maturity scorecards. */
export interface Scorecards {
  maturity_scores?: Record<string, number>;
  compliance?: ComplianceFramework[];
  guided_remediation?: boolean;
}

export type ComplianceFramework = "soc2" | "hipaa" | "gdpr" | "pci_dss" | "iso27001";

// ---------------------------------------------------------------------------
// v1.1: Agent Observability
// ---------------------------------------------------------------------------

/** Agent observability and OpenTelemetry configuration. */
export interface ObservabilityConfig {
  otel_endpoint?: string;
  trace_propagation?: TracePropagationFormat[];
  audit_log?: boolean;
  hitl_gates?: boolean;
  cost_per_action?: boolean;
}

export type TracePropagationFormat = "w3c" | "b3" | "jaeger";

// ---------------------------------------------------------------------------
// v1.1: MCP Alignment
// ---------------------------------------------------------------------------

/** MCP .well-known alignment and tool advertisement. */
export interface MCPConfig {
  tools?: string[];
  streamable_http?: boolean;
  well_known_url?: string;
  skills_url?: string;
}

// ---------------------------------------------------------------------------
// v1.1: Progressive Deployment / Canary
// ---------------------------------------------------------------------------

/** Canary / progressive deployment configuration. */
export interface CanaryConfig {
  enabled?: boolean;
  strategies?: CanaryStrategy[];
}

export type CanaryStrategy = "percentage" | "blue_green" | "rolling";

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
  // v1.1
  delegating_agent_id?: string;
  delegation_proof?: string;
  nhi_token_mode?: NHITokenMode;
  budget?: BudgetConstraint;
  ttl_seconds?: number | null;
  trace_context?: string;
}

/** Response returned by a provider after a provisioning request. */
export interface ProvisionResponse {
  request_id?: string;
  offering_id?: string;
  tier_id?: string;
  resource_id: string;
  status: ProvisionStatus;
  credentials?: CredentialBundle;
  dashboard_url?: string;
  estimated_ready_seconds?: number;
  fulfillment_proof?: FulfillmentProof | string;
  escrow_id?: string;
  message?: string;
  status_url?: string;
  region?: string;
  created_at?: string;
  expires_at?: string | null;
  error?: ProvisionError;
  // v1.1
  nhi_token?: NHIToken;
  cost_estimate?: CostEstimate;
  trace_id?: string;
  dependency_impact?: string[];
}

/** Fulfillment proof object. */
export interface FulfillmentProof {
  type: FulfillmentProofType;
  health_check_url?: string;
  receipt_signature?: string;
  receipt_payload?: string;
  timestamp: string;
}

/** Provisioning error details. */
export interface ProvisionError {
  code: ProvisionErrorCode;
  message: string;
  retry_after_seconds?: number;
}

/** Cost estimate breakdown. */
export interface CostEstimate {
  monthly_estimate?: string;
  currency?: Currency;
  breakdown?: CostBreakdownItem[];
}

export interface CostBreakdownItem {
  dimension: string;
  estimated_usage: string;
  unit_price: string;
  estimated_cost: string;
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

/** An encrypted bundle of credentials returned after provisioning. */
export interface CredentialBundle {
  bundle_id?: string;
  resource_id: string;
  offering_id?: string;
  /** Credentials encrypted with the agent's public key. */
  encrypted_payload?: string;
  encryption_method?: EncryptionMethod;
  /** Plaintext credentials (only for free-tier / testing). */
  credentials?: Record<string, string>;
  /** Ephemeral public key used for ECDH key agreement (base64url). */
  ephemeral_public_key?: string;
  nonce?: string;
  provider_signature?: string;
  agent_public_key_fingerprint?: string;
  issued_at: string;
  expires_at?: string | null;
  rotation_available_at?: string | null;
  credential_type?: CredentialType;
  version?: number;
  previous_bundle_id?: string | null;
  decrypted_schema?: Record<string, unknown>;
  // v1.1
  nhi_identity_id?: string;
  token_refresh_endpoint?: string;
  osp_uri?: string;
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
  report_id?: string;
  resource_id: string;
  offering_id?: string;
  tier_id?: string;
  period_start: string;
  period_end: string;
  dimensions: UsageDimension[];
  total_cost?: Price;
  overage_cost?: Price;
  countersignature?: string | null;
  countersignature_deadline?: string | null;
  dispute_window_ends_at?: string;
  provider_signature?: string;
  generated_at?: string;
  metadata?: Record<string, unknown>;
  // v1.1
  budget_status?: BudgetStatus;
  burn_rate?: BurnRate;
  trace_id?: string;
}

/** A single metered usage dimension within a report. */
export interface UsageDimension {
  name?: string;
  dimension?: string;
  value?: number;
  quantity?: string;
  unit: string;
  included_quantity?: string;
  overage_quantity?: string;
  unit_price?: string;
  cost?: Price;
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
// Webhook Events
// ---------------------------------------------------------------------------

/** Webhook event from a provider. */
export interface WebhookEvent {
  event_id: string;
  event_type: WebhookEventType;
  resource_id: string;
  request_id?: string;
  offering_id: string;
  timestamp: string;
  data?: WebhookEventData;
  provider_signature: string;
  delivery_attempt?: number;
  trace_id?: string;
}

export interface WebhookEventData {
  status?: string;
  credentials?: CredentialBundleRef;
  fulfillment_proof?: FulfillmentProof;
  error?: WebhookEventError;
  warning?: ResourceWarning;
  usage_threshold?: UsageThresholdData;
  payment_details?: PaymentDetails;
  budget_alert?: BudgetAlert;
  nhi_event?: NHIEvent;
  dependency_event?: DependencyEvent;
  ttl_event?: TTLEvent;
  dashboard_url?: string;
  message?: string;
}

export interface CredentialBundleRef {
  encrypted_payload: string;
  encryption_method: EncryptionMethod;
  ephemeral_public_key?: string;
  nonce?: string;
  provider_signature: string;
}

export interface WebhookEventError {
  code: string;
  message: string;
  retryable?: boolean;
  retry_after_seconds?: number;
}

export interface ResourceWarning {
  warning_type: WarningType;
  message: string;
  severity?: "info" | "warning" | "critical";
  action_required_by?: string | null;
}

export interface UsageThresholdData {
  dimension: string;
  threshold_percent: number;
  current_usage: string;
  limit: string;
  unit: string;
}

export interface PaymentDetails {
  amount: string;
  currency: Currency;
  payment_method?: string;
  due_by?: string | null;
  transaction_id?: string;
}

export interface BudgetAlert {
  budget_limit?: string;
  current_spend?: string;
  percent_used?: number;
  currency?: Currency;
  action?: "alert" | "throttle" | "block";
}

export interface NHIEvent {
  identity_id?: string;
  token_type?: NHITokenType;
  expires_at?: string;
  refresh_endpoint?: string;
}

export interface DependencyEvent {
  dependency_resource_id?: string;
  dependency_offering_id?: string;
  health_status?: "healthy" | "degraded" | "unhealthy" | "unknown";
  affected_resources?: string[];
}

export interface TTLEvent {
  ttl_remaining_seconds?: number;
  original_ttl_seconds?: number;
  action?: "warning" | "expiring" | "expired" | "extended";
  extension_available?: boolean;
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
  | "email"
  | "other";

export type FulfillmentProofType =
  | "api_key_delivery"
  | "health_check"
  | "signed_receipt";

export type ProvisionStatus =
  | "provisioning"
  | "active"
  | "failed"
  | "pending_payment"
  | "deprovisioning"
  | "deprovisioned";

export type EncryptionMethod = "x25519-xsalsa20-poly1305" | "aes-256-gcm";

export type CredentialType =
  | "api_key"
  | "connection_string"
  | "oauth_token"
  | "certificate"
  | "composite"
  | "short_lived_token";

export type ProvisionErrorCode =
  | "insufficient_funds"
  | "payment_failed"
  | "region_unavailable"
  | "quota_exceeded"
  | "invalid_config"
  | "trust_tier_insufficient"
  | "offering_unavailable"
  | "provider_error"
  | "rate_limited"
  | "budget_exceeded"
  | "delegation_unauthorized"
  | "nhi_federation_failed";

export type WebhookEventType =
  | "provision.started"
  | "provision.completed"
  | "provision.failed"
  | "deprovision.started"
  | "deprovision.completed"
  | "deprovision.failed"
  | "credentials.rotated"
  | "credentials.expiring"
  | "resource.warning"
  | "resource.suspended"
  | "resource.resumed"
  | "usage.threshold"
  | "usage.report_ready"
  | "payment.required"
  | "payment.confirmed"
  | "budget.alert"
  | "budget.exceeded"
  | "nhi.token_expiring"
  | "nhi.token_rotated"
  | "dependency.health_changed"
  | "scorecard.updated"
  | "environment.ttl_expiring"
  | "environment.ttl_expired";

export type WarningType =
  | "approaching_limit"
  | "performance_degraded"
  | "maintenance_scheduled"
  | "credential_expiring"
  | "payment_overdue"
  | "budget_threshold"
  | "ttl_expiring";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Structured error returned by an OSP provider. */
export interface OSPErrorBody {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
