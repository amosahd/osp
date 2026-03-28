// Package osp provides a Go SDK for the Open Service Protocol (OSP).
//
// OSP is an open standard for AI agents to discover, provision, and manage
// developer services. This SDK implements the full protocol lifecycle:
// discovery, provisioning, credential management, and usage reporting.
package osp

import (
	"encoding/json"
)

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

// PaymentMethod represents accepted payment methods in OSP.
type PaymentMethod string

const (
	PaymentFree         PaymentMethod = "free"
	PaymentSardisWallet PaymentMethod = "sardis_wallet"
	PaymentStripeSPT    PaymentMethod = "stripe_spt"
	PaymentX402         PaymentMethod = "x402"
	PaymentMPP          PaymentMethod = "mpp"
	PaymentInvoice      PaymentMethod = "invoice"
	PaymentExternal     PaymentMethod = "external"
)

// Currency represents supported currency codes.
type Currency string

const (
	CurrencyUSD  Currency = "USD"
	CurrencyEUR  Currency = "EUR"
	CurrencyGBP  Currency = "GBP"
	CurrencyUSDC Currency = "USDC"
	CurrencyEURC Currency = "EURC"
)

// TrustTier represents the minimum agent trust level required by a provider.
type TrustTier int

const (
	TrustTierAnonymous  TrustTier = 0
	TrustTierVerified   TrustTier = 1
	TrustTierBonded     TrustTier = 2
	TrustTierEnterprise TrustTier = 3
)

// ServiceCategory classifies a service offering.
type ServiceCategory string

const (
	CategoryDatabase   ServiceCategory = "database"
	CategoryHosting    ServiceCategory = "hosting"
	CategoryAuth       ServiceCategory = "auth"
	CategoryAnalytics  ServiceCategory = "analytics"
	CategoryStorage    ServiceCategory = "storage"
	CategoryCompute    ServiceCategory = "compute"
	CategoryMessaging  ServiceCategory = "messaging"
	CategoryMonitoring ServiceCategory = "monitoring"
	CategorySearch     ServiceCategory = "search"
	CategoryAI         ServiceCategory = "ai"
	CategoryOther      ServiceCategory = "other"
)

// FulfillmentProofType describes how a provider proves fulfillment.
type FulfillmentProofType string

const (
	FulfillmentAPIKeyDelivery FulfillmentProofType = "api_key_delivery"
	FulfillmentHealthCheck    FulfillmentProofType = "health_check"
	FulfillmentSignedReceipt  FulfillmentProofType = "signed_receipt"
)

// ProvisionStatus represents the lifecycle state of a provisioned resource.
type ProvisionStatus string

const (
	StatusProvisioning   ProvisionStatus = "provisioning"
	StatusActive         ProvisionStatus = "active"
	StatusFailed         ProvisionStatus = "failed"
	StatusPendingPayment ProvisionStatus = "pending_payment"
	StatusDeprovisioning ProvisionStatus = "deprovisioning"
	StatusDeprovisioned  ProvisionStatus = "deprovisioned"
	StatusSuspended      ProvisionStatus = "suspended"
)

// HealthState represents the health of a provider endpoint.
type HealthState string

const (
	HealthHealthy   HealthState = "healthy"
	HealthDegraded  HealthState = "degraded"
	HealthUnhealthy HealthState = "unhealthy"
)

// EncryptionMethod represents supported credential encryption algorithms.
type EncryptionMethod string

const (
	EncryptionX25519XSalsa20Poly1305 EncryptionMethod = "x25519-xsalsa20-poly1305"
	EncryptionAES256GCM              EncryptionMethod = "aes-256-gcm"
)

// CredentialType classifies the kind of credentials in a bundle.
type CredentialType string

const (
	CredentialAPIKey           CredentialType = "api_key"
	CredentialConnectionString CredentialType = "connection_string"
	CredentialOAuthToken       CredentialType = "oauth_token"
	CredentialCertificate      CredentialType = "certificate"
	CredentialComposite        CredentialType = "composite"
)

// EventType represents webhook event types.
type EventType string

const (
	EventProvisionStarted    EventType = "provision.started"
	EventProvisionCompleted  EventType = "provision.completed"
	EventProvisionFailed     EventType = "provision.failed"
	EventDeprovisionStarted  EventType = "deprovision.started"
	EventDeprovisionCompleted EventType = "deprovision.completed"
	EventDeprovisionFailed   EventType = "deprovision.failed"
	EventCredentialsRotated  EventType = "credentials.rotated"
	EventCredentialsExpiring EventType = "credentials.expiring"
	EventResourceWarning     EventType = "resource.warning"
	EventResourceSuspended   EventType = "resource.suspended"
	EventResourceResumed     EventType = "resource.resumed"
	EventUsageThreshold      EventType = "usage.threshold"
	EventUsageReportReady    EventType = "usage.report_ready"
	EventPaymentRequired     EventType = "payment.required"
	EventPaymentConfirmed    EventType = "payment.confirmed"
)

// ProvisionErrorCode represents machine-readable provisioning error codes.
type ProvisionErrorCode string

const (
	ErrCodeInsufficientFunds     ProvisionErrorCode = "insufficient_funds"
	ErrCodePaymentFailed         ProvisionErrorCode = "payment_failed"
	ErrCodeRegionUnavailable     ProvisionErrorCode = "region_unavailable"
	ErrCodeQuotaExceeded         ProvisionErrorCode = "quota_exceeded"
	ErrCodeInvalidConfig         ProvisionErrorCode = "invalid_config"
	ErrCodeTrustTierInsufficient ProvisionErrorCode = "trust_tier_insufficient"
	ErrCodeOfferingUnavailable   ProvisionErrorCode = "offering_unavailable"
	ErrCodeProviderError         ProvisionErrorCode = "provider_error"
	ErrCodeRateLimited           ProvisionErrorCode = "rate_limited"
)

// WarningType classifies resource warnings.
type WarningType string

const (
	WarningApproachingLimit      WarningType = "approaching_limit"
	WarningPerformanceDegraded   WarningType = "performance_degraded"
	WarningMaintenanceScheduled  WarningType = "maintenance_scheduled"
	WarningCredentialExpiring    WarningType = "credential_expiring"
	WarningPaymentOverdue        WarningType = "payment_overdue"
)

// Severity represents the severity level of a warning.
type Severity string

const (
	SeverityInfo     Severity = "info"
	SeverityWarning  Severity = "warning"
	SeverityCritical Severity = "critical"
)

// ---------------------------------------------------------------------------
// Manifest & Catalog
// ---------------------------------------------------------------------------

// ServiceManifest is the top-level manifest published by a provider at
// /.well-known/osp.json. It describes the provider and all of its
// service offerings.
type ServiceManifest struct {
	ManifestID             string                 `json:"manifest_id"`
	ManifestVersion        int                    `json:"manifest_version"`
	PreviousVersion        *int                   `json:"previous_version"`
	ProviderID             string                 `json:"provider_id"`
	DisplayName            string                 `json:"display_name"`
	ProviderURL            string                 `json:"provider_url,omitempty"`
	ProviderPublicKey      string                 `json:"provider_public_key,omitempty"`
	Offerings              []ServiceOffering      `json:"offerings"`
	AcceptedPaymentMethods []PaymentMethod        `json:"accepted_payment_methods,omitempty"`
	TrustTierRequired      *TrustTier             `json:"trust_tier_required,omitempty"`
	Endpoints              ProviderEndpoints      `json:"endpoints"`
	Extensions             map[string]interface{} `json:"extensions,omitempty"`
	EffectiveAt            string                 `json:"effective_at,omitempty"`
	ProviderSignature      string                 `json:"provider_signature"`
}

// ServiceOffering represents a single service within a provider's catalog.
type ServiceOffering struct {
	OfferingID                string                 `json:"offering_id"`
	Name                      string                 `json:"name"`
	Description               string                 `json:"description,omitempty"`
	Category                  ServiceCategory        `json:"category"`
	Tiers                     []ServiceTier          `json:"tiers"`
	CredentialsSchema         map[string]interface{} `json:"credentials_schema"`
	EstimatedProvisionSeconds *int                   `json:"estimated_provision_seconds,omitempty"`
	FulfillmentProofType      FulfillmentProofType   `json:"fulfillment_proof_type,omitempty"`
	Regions                   []string               `json:"regions,omitempty"`
	DocumentationURL          string                 `json:"documentation_url,omitempty"`
}

// ServiceTier represents a pricing/capability tier within a service offering.
type ServiceTier struct {
	TierID        string                 `json:"tier_id"`
	Name          string                 `json:"name"`
	Price         Price                  `json:"price"`
	Limits        map[string]interface{} `json:"limits,omitempty"`
	Features      []string               `json:"features,omitempty"`
	EscrowProfile *EscrowProfile         `json:"escrow_profile,omitempty"`
	RateLimit     string                 `json:"rate_limit,omitempty"`
	UsageMetering *UsageMetering         `json:"usage_metering,omitempty"`
}

// Price holds pricing information with currency and optional billing interval.
type Price struct {
	// Amount is a decimal string to avoid floating-point issues (e.g. "25.00").
	Amount   string   `json:"amount"`
	Currency Currency `json:"currency"`
	// Interval is an ISO 8601 duration (e.g. "P1M"), or nil for one-time charges.
	Interval *string `json:"interval,omitempty"`
}

// EscrowProfile defines escrow timing parameters governing payment hold and release.
type EscrowProfile struct {
	TimeoutSeconds            *int `json:"timeout_seconds,omitempty"`
	VerificationWindowSeconds *int `json:"verification_window_seconds,omitempty"`
	DisputeWindowSeconds      *int `json:"dispute_window_seconds,omitempty"`
}

// UsageMetering configures usage-based metering for a tier.
type UsageMetering struct {
	Dimensions               []string `json:"dimensions,omitempty"`
	ReportingWindow          string   `json:"reporting_window,omitempty"`
	CountersignatureRequired *bool    `json:"countersignature_required,omitempty"`
}

// ProviderEndpoints lists API endpoint paths for the provisioning lifecycle.
type ProviderEndpoints struct {
	Provision   string `json:"provision"`
	Deprovision string `json:"deprovision"`
	Credentials string `json:"credentials"`
	Rotate      string `json:"rotate,omitempty"`
	Status      string `json:"status"`
	Usage       string `json:"usage,omitempty"`
	Health      string `json:"health"`
}

// ---------------------------------------------------------------------------
// Provisioning
// ---------------------------------------------------------------------------

// ProvisionRequest is the request payload sent by an agent to provision a resource.
type ProvisionRequest struct {
	OfferingID     string                 `json:"offering_id"`
	TierID         string                 `json:"tier_id"`
	ProjectName    string                 `json:"project_name"`
	Region         string                 `json:"region,omitempty"`
	PaymentMethod  PaymentMethod          `json:"payment_method,omitempty"`
	PaymentProof   string                 `json:"payment_proof,omitempty"`
	AgentPublicKey string                 `json:"agent_public_key,omitempty"`
	Nonce          string                 `json:"nonce"`
	Config         map[string]interface{} `json:"config,omitempty"`
	WebhookURL     string                 `json:"webhook_url,omitempty"`
}

// ProvisionResponse is returned by a provider after a provisioning request.
type ProvisionResponse struct {
	RequestID             string           `json:"request_id"`
	OfferingID            string           `json:"offering_id"`
	TierID                string           `json:"tier_id"`
	Status                ProvisionStatus  `json:"status"`
	ResourceID            string           `json:"resource_id,omitempty"`
	Credentials           *CredentialBundle `json:"credentials,omitempty"`
	FulfillmentProof      *FulfillmentProof `json:"fulfillment_proof,omitempty"`
	StatusURL             string           `json:"status_url,omitempty"`
	EstimatedReadySeconds *int             `json:"estimated_ready_seconds,omitempty"`
	Region                string           `json:"region,omitempty"`
	CreatedAt             string           `json:"created_at"`
	ExpiresAt             *string          `json:"expires_at,omitempty"`
	DashboardURL          string           `json:"dashboard_url,omitempty"`
	Error                 *ProvisionError  `json:"error,omitempty"`
	Message               string           `json:"message,omitempty"`
}

// FulfillmentProof represents proof that a provider fulfilled a provisioning request.
type FulfillmentProof struct {
	Type            FulfillmentProofType `json:"type"`
	HealthCheckURL  string               `json:"health_check_url,omitempty"`
	ReceiptSignature string              `json:"receipt_signature,omitempty"`
	ReceiptPayload  string               `json:"receipt_payload,omitempty"`
	Timestamp       string               `json:"timestamp"`
}

// ProvisionError provides error details for failed provisioning.
type ProvisionError struct {
	Code              ProvisionErrorCode `json:"code"`
	Message           string             `json:"message"`
	RetryAfterSeconds *int               `json:"retry_after_seconds,omitempty"`
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

// CredentialBundle is an encrypted bundle of credentials returned after provisioning.
type CredentialBundle struct {
	BundleID                 string                 `json:"bundle_id,omitempty"`
	ResourceID               string                 `json:"resource_id"`
	OfferingID               string                 `json:"offering_id,omitempty"`
	EncryptedPayload         string                 `json:"encrypted_payload,omitempty"`
	EncryptionMethod         EncryptionMethod       `json:"encryption_method,omitempty"`
	EphemeralPublicKey       string                 `json:"ephemeral_public_key,omitempty"`
	Nonce                    string                 `json:"nonce,omitempty"`
	ProviderSignature        string                 `json:"provider_signature,omitempty"`
	AgentPublicKeyFingerprint string                `json:"agent_public_key_fingerprint,omitempty"`
	// Credentials holds plaintext credentials (only for free-tier / testing).
	Credentials              map[string]string      `json:"credentials,omitempty"`
	IssuedAt                 string                 `json:"issued_at"`
	ExpiresAt                *string                `json:"expires_at,omitempty"`
	RotationAvailableAt      *string                `json:"rotation_available_at,omitempty"`
	CredentialType           CredentialType         `json:"credential_type,omitempty"`
	Version                  *int                   `json:"version,omitempty"`
	PreviousBundleID         *string                `json:"previous_bundle_id,omitempty"`
	DecryptedSchema          map[string]interface{} `json:"decrypted_schema,omitempty"`
}

// ---------------------------------------------------------------------------
// Lifecycle & Usage
// ---------------------------------------------------------------------------

// ResourceStatus represents the current status of a provisioned resource.
type ResourceStatus struct {
	ResourceID   string          `json:"resource_id"`
	Status       ProvisionStatus `json:"status"`
	OfferingID   string          `json:"offering_id"`
	TierID       string          `json:"tier_id"`
	Region       string          `json:"region,omitempty"`
	CreatedAt    string          `json:"created_at"`
	UpdatedAt    string          `json:"updated_at,omitempty"`
	DashboardURL string          `json:"dashboard_url,omitempty"`
	Message      string          `json:"message,omitempty"`
}

// UsageReport holds metered usage data for a provisioned resource.
type UsageReport struct {
	ReportID                string            `json:"report_id"`
	ResourceID              string            `json:"resource_id"`
	OfferingID              string            `json:"offering_id"`
	TierID                  string            `json:"tier_id,omitempty"`
	PeriodStart             string            `json:"period_start"`
	PeriodEnd               string            `json:"period_end"`
	Dimensions              []UsageDimension  `json:"dimensions"`
	TotalCost               *Cost             `json:"total_cost,omitempty"`
	OverageCost             *Cost             `json:"overage_cost,omitempty"`
	Countersignature        *string           `json:"countersignature,omitempty"`
	CountersignatureDeadline *string          `json:"countersignature_deadline,omitempty"`
	DisputeWindowEndsAt     string            `json:"dispute_window_ends_at,omitempty"`
	ProviderSignature       string            `json:"provider_signature"`
	GeneratedAt             string            `json:"generated_at,omitempty"`
	Metadata                map[string]interface{} `json:"metadata,omitempty"`
}

// UsageDimension represents a single metered usage dimension within a report.
type UsageDimension struct {
	Dimension        string `json:"dimension"`
	Quantity         string `json:"quantity"`
	Unit             string `json:"unit"`
	IncludedQuantity string `json:"included_quantity,omitempty"`
	OverageQuantity  string `json:"overage_quantity,omitempty"`
	UnitPrice        string `json:"unit_price,omitempty"`
	Cost             *Cost  `json:"cost,omitempty"`
}

// Cost represents a monetary amount with currency.
type Cost struct {
	Amount   string   `json:"amount"`
	Currency Currency `json:"currency"`
}

// HealthStatus represents the health of a provider endpoint.
type HealthStatus struct {
	Status    HealthState            `json:"status"`
	Version   string                 `json:"version,omitempty"`
	LatencyMs *float64               `json:"latency_ms,omitempty"`
	CheckedAt string                 `json:"checked_at"`
	Details   map[string]interface{} `json:"details,omitempty"`
}

// ---------------------------------------------------------------------------
// Webhook Events
// ---------------------------------------------------------------------------

// WebhookEvent represents a webhook payload from a provider.
type WebhookEvent struct {
	EventID           string    `json:"event_id"`
	EventType         EventType `json:"event_type"`
	ResourceID        string    `json:"resource_id"`
	RequestID         string    `json:"request_id,omitempty"`
	OfferingID        string    `json:"offering_id"`
	Timestamp         string    `json:"timestamp"`
	Data              *EventData `json:"data,omitempty"`
	ProviderSignature string    `json:"provider_signature"`
	DeliveryAttempt   int       `json:"delivery_attempt,omitempty"`
}

// EventData holds event-specific payload data.
type EventData struct {
	Status           ProvisionStatus  `json:"status,omitempty"`
	Credentials      *CredentialBundle `json:"credentials,omitempty"`
	FulfillmentProof *FulfillmentProof `json:"fulfillment_proof,omitempty"`
	Error            *EventError      `json:"error,omitempty"`
	Warning          *ResourceWarning `json:"warning,omitempty"`
	UsageThreshold   *UsageThreshold  `json:"usage_threshold,omitempty"`
	PaymentDetails   *PaymentDetails  `json:"payment_details,omitempty"`
	DashboardURL     string           `json:"dashboard_url,omitempty"`
	Message          string           `json:"message,omitempty"`
}

// EventError holds error details for failed webhook events.
type EventError struct {
	Code              string `json:"code"`
	Message           string `json:"message"`
	Retryable         *bool  `json:"retryable,omitempty"`
	RetryAfterSeconds *int   `json:"retry_after_seconds,omitempty"`
}

// ResourceWarning contains information about a resource warning condition.
type ResourceWarning struct {
	WarningType      WarningType `json:"warning_type"`
	Message          string      `json:"message"`
	Severity         Severity    `json:"severity,omitempty"`
	ActionRequiredBy *string     `json:"action_required_by,omitempty"`
}

// UsageThreshold describes when a usage threshold has been reached.
type UsageThreshold struct {
	Dimension        string `json:"dimension"`
	ThresholdPercent int    `json:"threshold_percent"`
	CurrentUsage     string `json:"current_usage"`
	Limit            string `json:"limit"`
	Unit             string `json:"unit"`
}

// PaymentDetails holds payment-related event details.
type PaymentDetails struct {
	Amount        string `json:"amount"`
	Currency      string `json:"currency"`
	PaymentMethod string `json:"payment_method,omitempty"`
	DueBy         *string `json:"due_by,omitempty"`
	TransactionID string `json:"transaction_id,omitempty"`
}

// ---------------------------------------------------------------------------
// Error Response
// ---------------------------------------------------------------------------

// OSPErrorBody is the structured error response returned by an OSP provider.
type OSPErrorBody struct {
	Error   string                 `json:"error"`
	Code    string                 `json:"code,omitempty"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ManifestWithoutSignature returns a copy of the manifest with the
// provider_signature field set to empty, suitable for canonical JSON
// serialization before signing or verifying.
func (m ServiceManifest) ManifestWithoutSignature() ServiceManifest {
	m.ProviderSignature = ""
	return m
}

// MarshalJSON for ServiceManifest ensures the provider_signature field is
// always included (never omitted) since it is required by the schema.
func (m ServiceManifest) MarshalJSON() ([]byte, error) {
	type Alias ServiceManifest
	return json.Marshal(struct {
		Alias
	}{
		Alias: Alias(m),
	})
}
