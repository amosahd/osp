package osp

import (
	"encoding/json"
	"testing"
)

func TestServiceManifestJSON(t *testing.T) {
	manifest := ServiceManifest{
		ManifestID:      "mf_test",
		ManifestVersion: 1,
		ProviderID:      "test.com",
		DisplayName:     "Test Provider",
		ProviderURL:     "https://test.com",
		Offerings: []ServiceOffering{
			{
				OfferingID:  "test/postgres",
				Name:        "Managed PostgreSQL",
				Category:    CategoryDatabase,
				Tiers: []ServiceTier{
					{
						TierID: "free",
						Name:   "Free",
						Price:  Price{Amount: "0.00", Currency: CurrencyUSD},
					},
				},
				CredentialsSchema: map[string]interface{}{"type": "object"},
			},
		},
		Endpoints: ProviderEndpoints{
			Provision:   "/v1/provision",
			Deprovision: "/v1/deprovision",
			Credentials: "/v1/credentials",
			Status:      "/v1/status",
			Health:      "/v1/health",
		},
		ProviderSignature: "test-sig",
	}

	data, err := json.Marshal(manifest)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded ServiceManifest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.ManifestID != "mf_test" {
		t.Errorf("expected manifest_id=mf_test, got %s", decoded.ManifestID)
	}
	if decoded.ManifestVersion != 1 {
		t.Errorf("expected manifest_version=1, got %d", decoded.ManifestVersion)
	}
	if decoded.ProviderID != "test.com" {
		t.Errorf("expected provider_id=test.com, got %s", decoded.ProviderID)
	}
	if decoded.DisplayName != "Test Provider" {
		t.Errorf("expected display_name=Test Provider, got %s", decoded.DisplayName)
	}
	if len(decoded.Offerings) != 1 {
		t.Fatalf("expected 1 offering, got %d", len(decoded.Offerings))
	}
	if decoded.Offerings[0].Category != CategoryDatabase {
		t.Errorf("expected category=database, got %s", decoded.Offerings[0].Category)
	}
}

func TestServiceManifestWithPreviousVersion(t *testing.T) {
	prev := 1
	manifest := ServiceManifest{
		ManifestID:        "mf_v2",
		ManifestVersion:   2,
		PreviousVersion:   &prev,
		ProviderID:        "test.com",
		DisplayName:       "Test",
		Offerings:         []ServiceOffering{},
		Endpoints:         ProviderEndpoints{Provision: "/p", Deprovision: "/d", Credentials: "/c", Status: "/s", Health: "/h"},
		ProviderSignature: "sig",
	}

	data, err := json.Marshal(manifest)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded ServiceManifest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.PreviousVersion == nil {
		t.Fatal("expected previous_version to be non-nil")
	}
	if *decoded.PreviousVersion != 1 {
		t.Errorf("expected previous_version=1, got %d", *decoded.PreviousVersion)
	}
}

func TestPriceJSON(t *testing.T) {
	interval := "P1M"
	price := Price{
		Amount:   "25.00",
		Currency: CurrencyUSD,
		Interval: &interval,
	}

	data, err := json.Marshal(price)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded Price
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Amount != "25.00" {
		t.Errorf("expected amount=25.00, got %s", decoded.Amount)
	}
	if decoded.Currency != CurrencyUSD {
		t.Errorf("expected currency=USD, got %s", decoded.Currency)
	}
	if decoded.Interval == nil || *decoded.Interval != "P1M" {
		t.Errorf("expected interval=P1M, got %v", decoded.Interval)
	}
}

func TestPriceOneTimeJSON(t *testing.T) {
	price := Price{
		Amount:   "100.00",
		Currency: CurrencyEUR,
	}

	data, err := json.Marshal(price)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded Price
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Interval != nil {
		t.Errorf("expected nil interval for one-time, got %v", decoded.Interval)
	}
}

func TestProvisionRequestJSON(t *testing.T) {
	req := ProvisionRequest{
		OfferingID:  "supabase/postgres",
		TierID:      "free",
		ProjectName: "my-project",
		Region:      "us-east-1",
		Nonce:       "abc123",
		Config:      map[string]interface{}{"version": "15"},
	}

	data, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded ProvisionRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.OfferingID != "supabase/postgres" {
		t.Errorf("expected offering_id=supabase/postgres, got %s", decoded.OfferingID)
	}
	if decoded.Nonce != "abc123" {
		t.Errorf("expected nonce=abc123, got %s", decoded.Nonce)
	}
}

func TestProvisionResponseJSON(t *testing.T) {
	resp := ProvisionResponse{
		RequestID:  "req_123",
		OfferingID: "supabase/postgres",
		TierID:     "free",
		Status:     StatusActive,
		ResourceID: "res_456",
		CreatedAt:  "2026-01-01T00:00:00Z",
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded ProvisionResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Status != StatusActive {
		t.Errorf("expected status=active, got %s", decoded.Status)
	}
	if decoded.ResourceID != "res_456" {
		t.Errorf("expected resource_id=res_456, got %s", decoded.ResourceID)
	}
}

func TestCredentialBundleJSON(t *testing.T) {
	bundle := CredentialBundle{
		ResourceID:       "res_123",
		EncryptedPayload: "encrypted-data",
		EncryptionMethod: EncryptionX25519XSalsa20Poly1305,
		IssuedAt:         "2026-01-01T00:00:00Z",
	}

	data, err := json.Marshal(bundle)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded CredentialBundle
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.EncryptionMethod != EncryptionX25519XSalsa20Poly1305 {
		t.Errorf("expected encryption=x25519-xsalsa20-poly1305, got %s", decoded.EncryptionMethod)
	}
}

func TestCredentialBundlePlaintext(t *testing.T) {
	bundle := CredentialBundle{
		ResourceID: "res_123",
		Credentials: map[string]string{
			"DATABASE_URL": "postgres://localhost:5432/db",
			"API_KEY":      "sk_test_123",
		},
		IssuedAt: "2026-01-01T00:00:00Z",
	}

	data, err := json.Marshal(bundle)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded CredentialBundle
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Credentials["DATABASE_URL"] != "postgres://localhost:5432/db" {
		t.Errorf("unexpected DATABASE_URL: %s", decoded.Credentials["DATABASE_URL"])
	}
}

func TestUsageReportJSON(t *testing.T) {
	report := UsageReport{
		ReportID:    "rpt_001",
		ResourceID:  "res_123",
		OfferingID:  "supabase/postgres",
		PeriodStart: "2026-01-01T00:00:00Z",
		PeriodEnd:   "2026-02-01T00:00:00Z",
		Dimensions: []UsageDimension{
			{
				Dimension: "storage_bytes",
				Quantity:  "1073741824",
				Unit:      "bytes",
			},
			{
				Dimension: "api_calls",
				Quantity:  "50000",
				Unit:      "calls",
			},
		},
		TotalCost:         &Cost{Amount: "25.00", Currency: CurrencyUSD},
		ProviderSignature: "sig",
	}

	data, err := json.Marshal(report)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded UsageReport
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if len(decoded.Dimensions) != 2 {
		t.Fatalf("expected 2 dimensions, got %d", len(decoded.Dimensions))
	}
	if decoded.Dimensions[0].Dimension != "storage_bytes" {
		t.Errorf("expected dimension=storage_bytes, got %s", decoded.Dimensions[0].Dimension)
	}
	if decoded.TotalCost == nil || decoded.TotalCost.Amount != "25.00" {
		t.Error("expected total_cost amount=25.00")
	}
}

func TestHealthStatusJSON(t *testing.T) {
	latMs := 42.5
	health := HealthStatus{
		Status:    HealthHealthy,
		Version:   "1.0.0",
		LatencyMs: &latMs,
		CheckedAt: "2026-01-01T00:00:00Z",
	}

	data, err := json.Marshal(health)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded HealthStatus
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Status != HealthHealthy {
		t.Errorf("expected status=healthy, got %s", decoded.Status)
	}
	if decoded.LatencyMs == nil || *decoded.LatencyMs != 42.5 {
		t.Error("expected latency_ms=42.5")
	}
}

func TestWebhookEventJSON(t *testing.T) {
	event := WebhookEvent{
		EventID:           "evt_001",
		EventType:         EventProvisionCompleted,
		ResourceID:        "res_123",
		OfferingID:        "supabase/postgres",
		Timestamp:         "2026-01-01T00:00:00Z",
		ProviderSignature: "sig",
		DeliveryAttempt:   1,
		Data: &EventData{
			Status:  StatusActive,
			Message: "Provisioning complete",
		},
	}

	data, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded WebhookEvent
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.EventType != EventProvisionCompleted {
		t.Errorf("expected event_type=provision.completed, got %s", decoded.EventType)
	}
	if decoded.Data == nil || decoded.Data.Status != StatusActive {
		t.Error("expected data.status=active")
	}
}

func TestResourceStatusJSON(t *testing.T) {
	status := ResourceStatus{
		ResourceID: "res_123",
		Status:     StatusActive,
		OfferingID: "supabase/postgres",
		TierID:     "free",
		CreatedAt:  "2026-01-01T00:00:00Z",
	}

	data, err := json.Marshal(status)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded ResourceStatus
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Status != StatusActive {
		t.Errorf("expected status=active, got %s", decoded.Status)
	}
}

func TestFulfillmentProofJSON(t *testing.T) {
	proof := FulfillmentProof{
		Type:             FulfillmentSignedReceipt,
		ReceiptSignature: "sig123",
		ReceiptPayload:   "payload",
		Timestamp:        "2026-01-01T00:00:00Z",
	}

	data, err := json.Marshal(proof)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded FulfillmentProof
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Type != FulfillmentSignedReceipt {
		t.Errorf("expected type=signed_receipt, got %s", decoded.Type)
	}
}

func TestEscrowProfileJSON(t *testing.T) {
	timeout := 3600
	verify := 900
	dispute := 86400
	profile := EscrowProfile{
		TimeoutSeconds:            &timeout,
		VerificationWindowSeconds: &verify,
		DisputeWindowSeconds:      &dispute,
	}

	data, err := json.Marshal(profile)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded EscrowProfile
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.TimeoutSeconds == nil || *decoded.TimeoutSeconds != 3600 {
		t.Error("expected timeout_seconds=3600")
	}
}

func TestProvisionErrorJSON(t *testing.T) {
	retry := 60
	pe := ProvisionError{
		Code:              ErrCodeRateLimited,
		Message:           "Too many requests",
		RetryAfterSeconds: &retry,
	}

	data, err := json.Marshal(pe)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded ProvisionError
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Code != ErrCodeRateLimited {
		t.Errorf("expected code=rate_limited, got %s", decoded.Code)
	}
	if decoded.RetryAfterSeconds == nil || *decoded.RetryAfterSeconds != 60 {
		t.Error("expected retry_after_seconds=60")
	}
}

func TestOSPErrorBodyJSON(t *testing.T) {
	errBody := OSPErrorBody{
		Error:   "not_found",
		Code:    "resource_not_found",
		Details: map[string]interface{}{"resource_id": "res_123"},
	}

	data, err := json.Marshal(errBody)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded OSPErrorBody
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Error != "not_found" {
		t.Errorf("expected error=not_found, got %s", decoded.Error)
	}
}

func TestManifestWithoutSignature(t *testing.T) {
	manifest := ServiceManifest{
		ManifestID:        "mf_test",
		ManifestVersion:   1,
		ProviderID:        "test.com",
		DisplayName:       "Test",
		Offerings:         []ServiceOffering{},
		Endpoints:         ProviderEndpoints{Provision: "/p", Deprovision: "/d", Credentials: "/c", Status: "/s", Health: "/h"},
		ProviderSignature: "original_sig",
	}

	unsigned := manifest.ManifestWithoutSignature()

	if unsigned.ProviderSignature != "" {
		t.Errorf("expected empty signature, got %s", unsigned.ProviderSignature)
	}
	// Original should be unchanged.
	if manifest.ProviderSignature != "original_sig" {
		t.Errorf("expected original signature unchanged, got %s", manifest.ProviderSignature)
	}
}

func TestEnumValues(t *testing.T) {
	tests := []struct {
		name     string
		value    string
		expected string
	}{
		{"PaymentFree", string(PaymentFree), "free"},
		{"PaymentSardisWallet", string(PaymentSardisWallet), "sardis_wallet"},
		{"PaymentStripeSPT", string(PaymentStripeSPT), "stripe_spt"},
		{"PaymentX402", string(PaymentX402), "x402"},
		{"CurrencyUSD", string(CurrencyUSD), "USD"},
		{"CurrencyEURC", string(CurrencyEURC), "EURC"},
		{"CategoryDatabase", string(CategoryDatabase), "database"},
		{"CategoryAI", string(CategoryAI), "ai"},
		{"StatusProvisioning", string(StatusProvisioning), "provisioning"},
		{"StatusActive", string(StatusActive), "active"},
		{"StatusFailed", string(StatusFailed), "failed"},
		{"StatusDeprovisioned", string(StatusDeprovisioned), "deprovisioned"},
		{"HealthHealthy", string(HealthHealthy), "healthy"},
		{"HealthDegraded", string(HealthDegraded), "degraded"},
		{"HealthUnhealthy", string(HealthUnhealthy), "unhealthy"},
		{"FulfillmentAPIKeyDelivery", string(FulfillmentAPIKeyDelivery), "api_key_delivery"},
		{"FulfillmentHealthCheck", string(FulfillmentHealthCheck), "health_check"},
		{"FulfillmentSignedReceipt", string(FulfillmentSignedReceipt), "signed_receipt"},
		{"EncryptionX25519", string(EncryptionX25519XSalsa20Poly1305), "x25519-xsalsa20-poly1305"},
		{"EncryptionAES256GCM", string(EncryptionAES256GCM), "aes-256-gcm"},
		{"CredentialAPIKey", string(CredentialAPIKey), "api_key"},
		{"CredentialConnectionString", string(CredentialConnectionString), "connection_string"},
		{"EventProvisionStarted", string(EventProvisionStarted), "provision.started"},
		{"EventProvisionCompleted", string(EventProvisionCompleted), "provision.completed"},
		{"EventCredentialsRotated", string(EventCredentialsRotated), "credentials.rotated"},
		{"EventPaymentRequired", string(EventPaymentRequired), "payment.required"},
		{"ErrCodeInsufficientFunds", string(ErrCodeInsufficientFunds), "insufficient_funds"},
		{"ErrCodeRateLimited", string(ErrCodeRateLimited), "rate_limited"},
		{"TrustTierAnonymous", string(rune(TrustTierAnonymous + '0')), "0"},
		{"WarningApproachingLimit", string(WarningApproachingLimit), "approaching_limit"},
		{"SeverityCritical", string(SeverityCritical), "critical"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.value != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, tt.value)
			}
		})
	}
}

func TestServiceTierWithAllFields(t *testing.T) {
	timeout := 3600
	csRequired := true
	tier := ServiceTier{
		TierID: "pro",
		Name:   "Pro",
		Price:  Price{Amount: "25.00", Currency: CurrencyUSD},
		Limits: map[string]interface{}{
			"storage_mb": float64(10240),
			"api_calls":  float64(1000000),
		},
		Features: []string{"ssl", "backups", "support"},
		EscrowProfile: &EscrowProfile{
			TimeoutSeconds: &timeout,
		},
		RateLimit: "1000 req/min",
		UsageMetering: &UsageMetering{
			Dimensions:               []string{"storage_bytes", "api_calls"},
			ReportingWindow:          "PT1H",
			CountersignatureRequired: &csRequired,
		},
	}

	data, err := json.Marshal(tier)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded ServiceTier
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if len(decoded.Features) != 3 {
		t.Errorf("expected 3 features, got %d", len(decoded.Features))
	}
	if decoded.RateLimit != "1000 req/min" {
		t.Errorf("expected rate_limit=1000 req/min, got %s", decoded.RateLimit)
	}
	if decoded.UsageMetering == nil || len(decoded.UsageMetering.Dimensions) != 2 {
		t.Error("expected 2 usage metering dimensions")
	}
}

// ---------------------------------------------------------------------------
// v1.1 type JSON roundtrips
// ---------------------------------------------------------------------------

func TestNHIConfigJSON(t *testing.T) {
	shortLived := true
	ttl := 3600
	orphan := true
	cfg := NHIConfig{
		ShortLivedTokens: &shortLived,
		TokenTTLSeconds:  &ttl,
		OrphanDetection:  &orphan,
		Federation:       []NHIFederationType{NHIFederationOIDC, NHIFederationSPIFFE},
		TokenEndpoint:    "https://provider.com/v1/nhi/token",
	}

	data, err := json.Marshal(cfg)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded NHIConfig
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.ShortLivedTokens == nil || !*decoded.ShortLivedTokens {
		t.Error("expected short_lived_tokens=true")
	}
	if decoded.TokenTTLSeconds == nil || *decoded.TokenTTLSeconds != 3600 {
		t.Error("expected token_ttl_seconds=3600")
	}
	if len(decoded.Federation) != 2 {
		t.Fatalf("expected 2 federation types, got %d", len(decoded.Federation))
	}
	if decoded.Federation[0] != NHIFederationOIDC {
		t.Errorf("expected federation[0]=oidc, got %s", decoded.Federation[0])
	}
	if decoded.TokenEndpoint != "https://provider.com/v1/nhi/token" {
		t.Errorf("expected token_endpoint, got %s", decoded.TokenEndpoint)
	}
}

func TestFinOpsConfigJSON(t *testing.T) {
	budgetEnf := true
	costPR := true
	anomaly := false
	burnRate := true
	cfg := FinOpsConfig{
		BudgetEnforcement: &budgetEnf,
		CostInPR:          &costPR,
		AnomalyDetection:  &anomaly,
		BurnRateTracking:  &burnRate,
		BudgetEndpoint:    "https://provider.com/v1/budget",
	}

	data, err := json.Marshal(cfg)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded FinOpsConfig
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.BudgetEnforcement == nil || !*decoded.BudgetEnforcement {
		t.Error("expected budget_enforcement=true")
	}
	if decoded.CostInPR == nil || !*decoded.CostInPR {
		t.Error("expected cost_in_pr=true")
	}
	if decoded.AnomalyDetection == nil || *decoded.AnomalyDetection {
		t.Error("expected anomaly_detection=false")
	}
	if decoded.BudgetEndpoint != "https://provider.com/v1/budget" {
		t.Errorf("expected budget_endpoint, got %s", decoded.BudgetEndpoint)
	}
}

func TestA2AAgentCardJSON(t *testing.T) {
	taskLC := true
	card := A2AAgentCard{
		AgentID:            "agent_001",
		Capabilities:       []A2ACapability{A2ACapProvision, A2ACapDeprovision, A2ACapMonitor},
		DelegationEndpoint: "https://provider.com/v1/a2a/delegate",
		TaskLifecycle:      &taskLC,
		AgentPublicKey:     "base64-public-key",
	}

	data, err := json.Marshal(card)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded A2AAgentCard
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.AgentID != "agent_001" {
		t.Errorf("expected agent_id=agent_001, got %s", decoded.AgentID)
	}
	if len(decoded.Capabilities) != 3 {
		t.Fatalf("expected 3 capabilities, got %d", len(decoded.Capabilities))
	}
	if decoded.Capabilities[0] != A2ACapProvision {
		t.Errorf("expected capabilities[0]=provision, got %s", decoded.Capabilities[0])
	}
	if decoded.TaskLifecycle == nil || !*decoded.TaskLifecycle {
		t.Error("expected task_lifecycle=true")
	}
	if decoded.DelegationEndpoint != "https://provider.com/v1/a2a/delegate" {
		t.Errorf("expected delegation_endpoint, got %s", decoded.DelegationEndpoint)
	}
}

func TestCanaryConfigJSON(t *testing.T) {
	enabled := true
	cfg := CanaryConfig{
		Enabled:    &enabled,
		Strategies: []CanaryStrategy{CanaryPercentage, CanaryBlueGreen},
	}

	data, err := json.Marshal(cfg)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded CanaryConfig
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Enabled == nil || !*decoded.Enabled {
		t.Error("expected enabled=true")
	}
	if len(decoded.Strategies) != 2 {
		t.Fatalf("expected 2 strategies, got %d", len(decoded.Strategies))
	}
	if decoded.Strategies[0] != CanaryPercentage {
		t.Errorf("expected strategies[0]=percentage, got %s", decoded.Strategies[0])
	}
	if decoded.Strategies[1] != CanaryBlueGreen {
		t.Errorf("expected strategies[1]=blue_green, got %s", decoded.Strategies[1])
	}
}

func TestObservabilityConfigJSON(t *testing.T) {
	audit := true
	hitl := false
	costAction := true
	cfg := ObservabilityConfig{
		OTelEndpoint:     "https://otel.provider.com/v1/traces",
		TracePropagation: []TracePropagationFormat{TracePropagationW3C, TracePropagationB3},
		AuditLog:         &audit,
		HITLGates:        &hitl,
		CostPerAction:    &costAction,
	}

	data, err := json.Marshal(cfg)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded ObservabilityConfig
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.OTelEndpoint != "https://otel.provider.com/v1/traces" {
		t.Errorf("expected otel_endpoint, got %s", decoded.OTelEndpoint)
	}
	if len(decoded.TracePropagation) != 2 {
		t.Fatalf("expected 2 trace propagation formats, got %d", len(decoded.TracePropagation))
	}
	if decoded.TracePropagation[0] != TracePropagationW3C {
		t.Errorf("expected trace_propagation[0]=w3c, got %s", decoded.TracePropagation[0])
	}
	if decoded.AuditLog == nil || !*decoded.AuditLog {
		t.Error("expected audit_log=true")
	}
	if decoded.HITLGates == nil || *decoded.HITLGates {
		t.Error("expected hitl_gates=false")
	}
}

func TestMCPConfigJSON(t *testing.T) {
	streamable := true
	cfg := MCPConfig{
		Tools:          []string{"osp_discover", "osp_provision", "osp_status"},
		StreamableHTTP: &streamable,
		WellKnownURL:   "https://provider.com/.well-known/mcp.json",
		SkillsURL:      "https://provider.com/skills",
	}

	data, err := json.Marshal(cfg)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded MCPConfig
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if len(decoded.Tools) != 3 {
		t.Fatalf("expected 3 tools, got %d", len(decoded.Tools))
	}
	if decoded.Tools[0] != "osp_discover" {
		t.Errorf("expected tools[0]=osp_discover, got %s", decoded.Tools[0])
	}
	if decoded.StreamableHTTP == nil || !*decoded.StreamableHTTP {
		t.Error("expected streamable_http=true")
	}
	if decoded.WellKnownURL != "https://provider.com/.well-known/mcp.json" {
		t.Errorf("expected well_known_url, got %s", decoded.WellKnownURL)
	}
}

func TestSandboxConfigJSON(t *testing.T) {
	enabled := true
	autoCleanup := true
	ttl := 7200
	cfg := SandboxConfig{
		Enabled:     &enabled,
		Endpoint:    "https://sandbox.provider.com",
		AutoCleanup: &autoCleanup,
		TTLSeconds:  &ttl,
	}

	data, err := json.Marshal(cfg)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded SandboxConfig
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Enabled == nil || !*decoded.Enabled {
		t.Error("expected enabled=true")
	}
	if decoded.Endpoint != "https://sandbox.provider.com" {
		t.Errorf("expected endpoint, got %s", decoded.Endpoint)
	}
	if decoded.AutoCleanup == nil || !*decoded.AutoCleanup {
		t.Error("expected auto_cleanup=true")
	}
	if decoded.TTLSeconds == nil || *decoded.TTLSeconds != 7200 {
		t.Error("expected ttl_seconds=7200")
	}
}

func TestNHIConfigEmptyJSON(t *testing.T) {
	cfg := NHIConfig{}

	data, err := json.Marshal(cfg)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded NHIConfig
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.ShortLivedTokens != nil {
		t.Error("expected nil short_lived_tokens")
	}
	if decoded.Federation != nil {
		t.Error("expected nil federation")
	}
}

func TestEstimateRequestJSON(t *testing.T) {
	periods := 3
	req := EstimateRequest{
		OfferingID:     "test/postgres",
		TierID:         "pro",
		Region:         "us-east-1",
		BillingPeriods: &periods,
		EstimatedUsage: map[string]float64{"storage_gb": 100, "api_calls": 50000},
	}

	data, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded EstimateRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.OfferingID != "test/postgres" {
		t.Errorf("expected offering_id=test/postgres, got %s", decoded.OfferingID)
	}
	if decoded.BillingPeriods == nil || *decoded.BillingPeriods != 3 {
		t.Error("expected billing_periods=3")
	}
	if decoded.EstimatedUsage["storage_gb"] != 100 {
		t.Errorf("expected estimated_usage.storage_gb=100, got %v", decoded.EstimatedUsage["storage_gb"])
	}
}

func TestDisputeResponseJSON(t *testing.T) {
	resp := DisputeResponse{
		DisputeID:                "dsp_001",
		ResourceID:               "res_123",
		ReasonCode:               DisputeServiceNotDelivered,
		Status:                   "filed",
		FiledAt:                  "2026-01-01T00:00:00Z",
		OSPDisputeReceipt:        "receipt_xyz",
		SettlementRails:          []string{"escrow"},
		ProviderResponseDeadline: "2026-01-08T00:00:00Z",
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded DisputeResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.DisputeID != "dsp_001" {
		t.Errorf("expected dispute_id=dsp_001, got %s", decoded.DisputeID)
	}
	if decoded.ReasonCode != DisputeServiceNotDelivered {
		t.Errorf("expected reason_code=service_not_delivered, got %s", decoded.ReasonCode)
	}
	if len(decoded.SettlementRails) != 1 {
		t.Fatalf("expected 1 settlement rail, got %d", len(decoded.SettlementRails))
	}
}

func TestEventsResponseJSON(t *testing.T) {
	resp := EventsResponse{
		ResourceID: "res_123",
		Events: []ResourceEvent{
			{
				EventID:   "evt_1",
				EventType: "provision.completed",
				Timestamp: "2026-01-01T00:00:00Z",
				Details:   map[string]interface{}{"region": "us-east-1"},
			},
		},
		HasMore: true,
		Cursor:  "cursor_abc",
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded EventsResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.ResourceID != "res_123" {
		t.Errorf("expected resource_id=res_123, got %s", decoded.ResourceID)
	}
	if len(decoded.Events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(decoded.Events))
	}
	if !decoded.HasMore {
		t.Error("expected has_more=true")
	}
	if decoded.Cursor != "cursor_abc" {
		t.Errorf("expected cursor=cursor_abc, got %s", decoded.Cursor)
	}
}

func TestWebhookResponseJSON(t *testing.T) {
	resp := WebhookResponse{
		WebhookID:  "wh_001",
		ResourceID: "res_123",
		WebhookURL: "https://example.com/webhook",
		Events:     []string{"provision.completed", "credentials.rotated"},
		Secret:     "whsec_secret",
		CreatedAt:  "2026-01-01T00:00:00Z",
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded WebhookResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.WebhookID != "wh_001" {
		t.Errorf("expected webhook_id=wh_001, got %s", decoded.WebhookID)
	}
	if len(decoded.Events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(decoded.Events))
	}
	if decoded.Secret != "whsec_secret" {
		t.Errorf("expected secret=whsec_secret, got %s", decoded.Secret)
	}
}

func TestExportResponseJSON(t *testing.T) {
	size := int64(1048576)
	readySec := 30
	resp := ExportResponse{
		ExportID:              "exp_001",
		ResourceID:            "res_123",
		Status:                "ready",
		Format:                "postgresql_dump",
		EstimatedReadySeconds: &readySec,
		DownloadURL:           "https://exports.provider.com/exp_001",
		DownloadExpiresAt:     "2026-01-02T00:00:00Z",
		SizeBytes:             &size,
		Checksum:              "sha256:abc123",
	}

	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded ExportResponse
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.ExportID != "exp_001" {
		t.Errorf("expected export_id=exp_001, got %s", decoded.ExportID)
	}
	if decoded.Status != "ready" {
		t.Errorf("expected status=ready, got %s", decoded.Status)
	}
	if decoded.SizeBytes == nil || *decoded.SizeBytes != 1048576 {
		t.Error("expected size_bytes=1048576")
	}
	if decoded.Checksum != "sha256:abc123" {
		t.Errorf("expected checksum=sha256:abc123, got %s", decoded.Checksum)
	}
}

func TestProviderEndpointsOptionalFields(t *testing.T) {
	endpoints := ProviderEndpoints{
		Provision:   "/v1/provision",
		Deprovision: "/v1/deprovision",
		Credentials: "/v1/credentials",
		Status:      "/v1/status",
		Health:      "/v1/health",
	}

	data, err := json.Marshal(endpoints)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded ProviderEndpoints
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.Rotate != "" {
		t.Errorf("expected empty rotate, got %s", decoded.Rotate)
	}
	if decoded.Usage != "" {
		t.Errorf("expected empty usage, got %s", decoded.Usage)
	}
}
