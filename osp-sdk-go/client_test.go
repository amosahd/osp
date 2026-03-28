package osp

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func newTestManifest() *ServiceManifest {
	return &ServiceManifest{
		ManifestID:      "mf_test",
		ManifestVersion: 1,
		ProviderID:      "test.com",
		DisplayName:     "Test Provider",
		Offerings: []ServiceOffering{
			{
				OfferingID:        "test/postgres",
				Name:              "Managed PostgreSQL",
				Category:          CategoryDatabase,
				Tiers:             []ServiceTier{{TierID: "free", Name: "Free", Price: Price{Amount: "0.00", Currency: CurrencyUSD}}},
				CredentialsSchema: map[string]interface{}{"type": "object"},
			},
		},
		Endpoints: ProviderEndpoints{
			Provision:   "/v1/provision",
			Deprovision: "/v1/deprovision",
			Credentials: "/v1/credentials",
			Rotate:      "/v1/rotate",
			Status:      "/v1/status",
			Usage:       "/v1/usage",
			Health:      "/v1/health",
		},
		ProviderSignature: "sig",
	}
}

func TestClientDiscover(t *testing.T) {
	manifest := newTestManifest()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != WellKnownPath {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(manifest)
	}))
	defer server.Close()

	client := NewClient()
	result, err := client.Discover(context.Background(), server.URL)
	if err != nil {
		t.Fatalf("discover: %v", err)
	}

	if result.ManifestID != "mf_test" {
		t.Errorf("expected manifest_id=mf_test, got %s", result.ManifestID)
	}
	if result.DisplayName != "Test Provider" {
		t.Errorf("expected display_name=Test Provider, got %s", result.DisplayName)
	}
	if len(result.Offerings) != 1 {
		t.Fatalf("expected 1 offering, got %d", len(result.Offerings))
	}
}

func TestClientDiscoverNotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	}))
	defer server.Close()

	client := NewClient()
	_, err := client.Discover(context.Background(), server.URL)
	if err == nil {
		t.Fatal("expected error for 404")
	}
}

func TestClientDiscoverInvalidJSON(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("not json"))
	}))
	defer server.Close()

	client := NewClient()
	_, err := client.Discover(context.Background(), server.URL)
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestClientProvision(t *testing.T) {
	expected := &ProvisionResponse{
		RequestID:  "req_123",
		OfferingID: "test/postgres",
		TierID:     "free",
		Status:     StatusActive,
		ResourceID: "res_456",
		CreatedAt:  "2026-01-01T00:00:00Z",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var req ProvisionRequest
		json.NewDecoder(r.Body).Decode(&req)
		if req.OfferingID != "test/postgres" {
			http.Error(w, "wrong offering", http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(expected)
	}))
	defer server.Close()

	client := NewClient()
	endpoints := ProviderEndpoints{Provision: "/v1/provision"}
	req := &ProvisionRequest{
		OfferingID:  "test/postgres",
		TierID:      "free",
		ProjectName: "test-project",
		Nonce:       "nonce123",
	}

	resp, err := client.Provision(context.Background(), server.URL, endpoints, req)
	if err != nil {
		t.Fatalf("provision: %v", err)
	}

	if resp.ResourceID != "res_456" {
		t.Errorf("expected resource_id=res_456, got %s", resp.ResourceID)
	}
	if resp.Status != StatusActive {
		t.Errorf("expected status=active, got %s", resp.Status)
	}
}

func TestClientProvisionError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(&OSPErrorBody{
			Error: "invalid_config",
			Code:  "invalid_config",
		})
	}))
	defer server.Close()

	client := NewClient()
	endpoints := ProviderEndpoints{Provision: "/v1/provision"}
	req := &ProvisionRequest{
		OfferingID:  "test/db",
		TierID:      "free",
		ProjectName: "test",
		Nonce:       "nonce",
	}

	_, err := client.Provision(context.Background(), server.URL, endpoints, req)
	if err == nil {
		t.Fatal("expected error for 400")
	}

	pe, ok := err.(*ProvisioningError)
	if !ok {
		t.Fatalf("expected ProvisioningError, got %T", err)
	}
	if pe.StatusCode != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", pe.StatusCode)
	}
}

func TestClientDeprovision(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "deprovisioned"})
	}))
	defer server.Close()

	client := NewClient()
	endpoints := ProviderEndpoints{Deprovision: "/v1/deprovision"}

	err := client.Deprovision(context.Background(), server.URL, endpoints, "res_123")
	if err != nil {
		t.Fatalf("deprovision: %v", err)
	}
}

func TestClientDeprovisionError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(&OSPErrorBody{Error: "not_found"})
	}))
	defer server.Close()

	client := NewClient()
	endpoints := ProviderEndpoints{Deprovision: "/v1/deprovision"}

	err := client.Deprovision(context.Background(), server.URL, endpoints, "res_nonexistent")
	if err == nil {
		t.Fatal("expected error for 404")
	}
}

func TestClientRotate(t *testing.T) {
	expected := &CredentialBundle{
		ResourceID:  "res_123",
		Credentials: map[string]string{"API_KEY": "new_key"},
		IssuedAt:    "2026-01-01T00:00:00Z",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		json.NewEncoder(w).Encode(expected)
	}))
	defer server.Close()

	client := NewClient()
	endpoints := ProviderEndpoints{Rotate: "/v1/rotate"}

	bundle, err := client.Rotate(context.Background(), server.URL, endpoints, "res_123")
	if err != nil {
		t.Fatalf("rotate: %v", err)
	}

	if bundle.Credentials["API_KEY"] != "new_key" {
		t.Errorf("expected API_KEY=new_key, got %s", bundle.Credentials["API_KEY"])
	}
}

func TestClientRotateNotSupported(t *testing.T) {
	client := NewClient()
	endpoints := ProviderEndpoints{} // No rotate endpoint.

	_, err := client.Rotate(context.Background(), "http://localhost", endpoints, "res_123")
	if err == nil {
		t.Fatal("expected error when rotation not supported")
	}
}

func TestClientStatus(t *testing.T) {
	expected := &ResourceStatus{
		ResourceID: "res_123",
		Status:     StatusActive,
		OfferingID: "test/postgres",
		TierID:     "free",
		CreatedAt:  "2026-01-01T00:00:00Z",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(expected)
	}))
	defer server.Close()

	client := NewClient()
	endpoints := ProviderEndpoints{Status: "/v1/status"}

	status, err := client.Status(context.Background(), server.URL, endpoints, "res_123")
	if err != nil {
		t.Fatalf("status: %v", err)
	}

	if status.Status != StatusActive {
		t.Errorf("expected status=active, got %s", status.Status)
	}
}

func TestClientUsage(t *testing.T) {
	expected := &UsageReport{
		ReportID:    "rpt_001",
		ResourceID:  "res_123",
		OfferingID:  "test/postgres",
		PeriodStart: "2026-01-01T00:00:00Z",
		PeriodEnd:   "2026-02-01T00:00:00Z",
		Dimensions: []UsageDimension{
			{Dimension: "storage_bytes", Quantity: "1073741824", Unit: "bytes"},
		},
		ProviderSignature: "sig",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(expected)
	}))
	defer server.Close()

	client := NewClient()
	endpoints := ProviderEndpoints{Usage: "/v1/usage"}

	report, err := client.Usage(context.Background(), server.URL, endpoints, "res_123")
	if err != nil {
		t.Fatalf("usage: %v", err)
	}

	if report.ReportID != "rpt_001" {
		t.Errorf("expected report_id=rpt_001, got %s", report.ReportID)
	}
}

func TestClientUsageNotSupported(t *testing.T) {
	client := NewClient()
	endpoints := ProviderEndpoints{} // No usage endpoint.

	_, err := client.Usage(context.Background(), "http://localhost", endpoints, "res_123")
	if err == nil {
		t.Fatal("expected error when usage not supported")
	}
}

func TestClientHealth(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(&HealthStatus{
			Status:    HealthHealthy,
			Version:   "1.0.0",
			CheckedAt: "2026-01-01T00:00:00Z",
		})
	}))
	defer server.Close()

	client := NewClient()
	endpoints := ProviderEndpoints{Health: "/v1/health"}

	health, err := client.Health(context.Background(), server.URL, endpoints)
	if err != nil {
		t.Fatalf("health: %v", err)
	}

	if health.Status != HealthHealthy {
		t.Errorf("expected status=healthy, got %s", health.Status)
	}
}

func TestClientHealthUnhealthy(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	client := NewClient(WithMaxRetries(0))
	endpoints := ProviderEndpoints{Health: "/v1/health"}

	health, err := client.Health(context.Background(), server.URL, endpoints)
	if err != nil {
		t.Fatalf("health: %v", err)
	}

	if health.Status != HealthUnhealthy {
		t.Errorf("expected status=unhealthy, got %s", health.Status)
	}
}

func TestClientCredentials(t *testing.T) {
	expected := &CredentialBundle{
		ResourceID:  "res_123",
		Credentials: map[string]string{"DATABASE_URL": "postgres://localhost/db"},
		IssuedAt:    "2026-01-01T00:00:00Z",
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(expected)
	}))
	defer server.Close()

	client := NewClient()
	endpoints := ProviderEndpoints{Credentials: "/v1/credentials"}

	bundle, err := client.Credentials(context.Background(), server.URL, endpoints, "res_123")
	if err != nil {
		t.Fatalf("credentials: %v", err)
	}

	if bundle.Credentials["DATABASE_URL"] != "postgres://localhost/db" {
		t.Errorf("unexpected DATABASE_URL: %s", bundle.Credentials["DATABASE_URL"])
	}
}

func TestClientRetries(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		json.NewEncoder(w).Encode(&HealthStatus{
			Status:    HealthHealthy,
			CheckedAt: "2026-01-01T00:00:00Z",
		})
	}))
	defer server.Close()

	client := NewClient(WithMaxRetries(3), WithRetryDelay(1*time.Millisecond))
	endpoints := ProviderEndpoints{Health: "/v1/health"}

	health, err := client.Health(context.Background(), server.URL, endpoints)
	if err != nil {
		t.Fatalf("health: %v", err)
	}

	if health.Status != HealthHealthy {
		t.Errorf("expected healthy after retries, got %s", health.Status)
	}
	if attempts != 3 {
		t.Errorf("expected 3 attempts, got %d", attempts)
	}
}

func TestClientOptions(t *testing.T) {
	kp, _ := GenerateKeyPair()
	client := NewClient(
		WithTimeout(10*time.Second),
		WithMaxRetries(5),
		WithRetryDelay(100*time.Millisecond),
		WithKeyPair(kp),
		WithUserAgent("test-agent/1.0"),
	)

	if client.timeout != 10*time.Second {
		t.Errorf("expected timeout=10s, got %v", client.timeout)
	}
	if client.maxRetries != 5 {
		t.Errorf("expected maxRetries=5, got %d", client.maxRetries)
	}
	if client.retryDelay != 100*time.Millisecond {
		t.Errorf("expected retryDelay=100ms, got %v", client.retryDelay)
	}
	if client.keyPair != kp {
		t.Error("expected key pair to be set")
	}
	if client.userAgent != "test-agent/1.0" {
		t.Errorf("expected user-agent=test-agent/1.0, got %s", client.userAgent)
	}
}

func TestClientWithHTTPClient(t *testing.T) {
	httpClient := &http.Client{Timeout: 5 * time.Second}
	client := NewClient(WithHTTPClient(httpClient))

	if client.httpClient != httpClient {
		t.Error("expected custom HTTP client to be used")
	}
}

func TestClientProvisionWithKeyPair(t *testing.T) {
	kp, _ := GenerateKeyPair()

	var receivedKey string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req ProvisionRequest
		json.NewDecoder(r.Body).Decode(&req)
		receivedKey = req.AgentPublicKey
		json.NewEncoder(w).Encode(&ProvisionResponse{
			RequestID:  "req_1",
			OfferingID: "test/db",
			TierID:     "free",
			Status:     StatusActive,
			CreatedAt:  "2026-01-01T00:00:00Z",
		})
	}))
	defer server.Close()

	client := NewClient(WithKeyPair(kp))
	endpoints := ProviderEndpoints{Provision: "/v1/provision"}
	req := &ProvisionRequest{
		OfferingID:  "test/db",
		TierID:      "free",
		ProjectName: "test",
		Nonce:       "nonce",
	}

	_, err := client.Provision(context.Background(), server.URL, endpoints, req)
	if err != nil {
		t.Fatalf("provision: %v", err)
	}

	if receivedKey != kp.PublicKeyBase64() {
		t.Errorf("expected agent_public_key=%s, got %s", kp.PublicKeyBase64(), receivedKey)
	}
}

func TestBuildManifestURL(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"https://supabase.com", "https://supabase.com/.well-known/osp.json"},
		{"https://example.com/", "https://example.com/.well-known/osp.json"},
		{"example.com", "https://example.com/.well-known/osp.json"},
		{"https://example.com/some/path", "https://example.com/.well-known/osp.json"},
	}

	for _, tt := range tests {
		result, err := buildManifestURL(tt.input)
		if err != nil {
			t.Errorf("buildManifestURL(%s): %v", tt.input, err)
			continue
		}
		if result != tt.expected {
			t.Errorf("buildManifestURL(%s): expected %s, got %s", tt.input, tt.expected, result)
		}
	}
}

func TestResolveEndpoint(t *testing.T) {
	tests := []struct {
		base     string
		endpoint string
		expected string
	}{
		{"https://example.com", "/v1/provision", "https://example.com/v1/provision"},
		{"https://example.com/", "/v1/provision", "https://example.com/v1/provision"},
	}

	for _, tt := range tests {
		result, err := resolveEndpoint(tt.base, tt.endpoint)
		if err != nil {
			t.Errorf("resolveEndpoint(%s, %s): %v", tt.base, tt.endpoint, err)
			continue
		}
		if result != tt.expected {
			t.Errorf("resolveEndpoint(%s, %s): expected %s, got %s", tt.base, tt.endpoint, tt.expected, result)
		}
	}
}

func TestClientContextCancellation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
	}))
	defer server.Close()

	client := NewClient(WithTimeout(2*time.Second), WithMaxRetries(0))
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	_, err := client.Discover(ctx, server.URL)
	if err == nil {
		t.Fatal("expected error for cancelled context")
	}
}
