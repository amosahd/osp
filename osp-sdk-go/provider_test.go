package osp

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// mockProvider implements the Provider interface for testing.
type mockProvider struct {
	manifest    *ServiceManifest
	resources   map[string]*ResourceStatus
	credentials map[string]*CredentialBundle
}

func newMockProvider() *mockProvider {
	return &mockProvider{
		manifest: &ServiceManifest{
			ManifestID:      "mf_mock",
			ManifestVersion: 1,
			ProviderID:      "mock.test",
			DisplayName:     "Mock Provider",
			Offerings: []ServiceOffering{
				{
					OfferingID:        "mock/db",
					Name:              "Mock Database",
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
		},
		resources: map[string]*ResourceStatus{
			"res_001": {
				ResourceID: "res_001",
				Status:     StatusActive,
				OfferingID: "mock/db",
				TierID:     "free",
				CreatedAt:  "2026-01-01T00:00:00Z",
			},
		},
		credentials: map[string]*CredentialBundle{
			"res_001": {
				ResourceID: "res_001",
				Credentials: map[string]string{
					"DATABASE_URL": "postgres://localhost:5432/mock",
				},
				IssuedAt: "2026-01-01T00:00:00Z",
			},
		},
	}
}

func (m *mockProvider) Manifest(_ context.Context) (*ServiceManifest, error) {
	return m.manifest, nil
}

func (m *mockProvider) Provision(_ context.Context, req *ProvisionRequest) (*ProvisionResponse, error) {
	resourceID := "res_new_" + req.ProjectName
	m.resources[resourceID] = &ResourceStatus{
		ResourceID: resourceID,
		Status:     StatusActive,
		OfferingID: req.OfferingID,
		TierID:     req.TierID,
		CreatedAt:  time.Now().UTC().Format(time.RFC3339),
	}
	m.credentials[resourceID] = &CredentialBundle{
		ResourceID:  resourceID,
		Credentials: map[string]string{"DATABASE_URL": "postgres://localhost/new"},
		IssuedAt:    time.Now().UTC().Format(time.RFC3339),
	}

	return &ProvisionResponse{
		RequestID:  "req_" + resourceID,
		OfferingID: req.OfferingID,
		TierID:     req.TierID,
		Status:     StatusActive,
		ResourceID: resourceID,
		Credentials: m.credentials[resourceID],
		CreatedAt:  time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (m *mockProvider) Deprovision(_ context.Context, resourceID string) error {
	if _, ok := m.resources[resourceID]; !ok {
		return &DeprovisionError{
			OSPError:   OSPError{StatusCode: 404, Message: "not found"},
			ResourceID: resourceID,
		}
	}
	delete(m.resources, resourceID)
	delete(m.credentials, resourceID)
	return nil
}

func (m *mockProvider) GetCredentials(_ context.Context, resourceID string) (*CredentialBundle, error) {
	if bundle, ok := m.credentials[resourceID]; ok {
		return bundle, nil
	}
	return nil, &CredentialError{
		OSPError:   OSPError{StatusCode: 404, Message: "not found"},
		ResourceID: resourceID,
	}
}

func (m *mockProvider) RotateCredentials(_ context.Context, resourceID string) (*CredentialBundle, error) {
	if _, ok := m.credentials[resourceID]; !ok {
		return nil, &CredentialError{
			OSPError:   OSPError{StatusCode: 404, Message: "not found"},
			ResourceID: resourceID,
		}
	}
	m.credentials[resourceID] = &CredentialBundle{
		ResourceID:  resourceID,
		Credentials: map[string]string{"DATABASE_URL": "postgres://localhost/rotated"},
		IssuedAt:    time.Now().UTC().Format(time.RFC3339),
	}
	return m.credentials[resourceID], nil
}

func (m *mockProvider) Status(_ context.Context, resourceID string) (*ResourceStatus, error) {
	if status, ok := m.resources[resourceID]; ok {
		return status, nil
	}
	return nil, &OSPError{StatusCode: 404, Message: "not found"}
}

func (m *mockProvider) Usage(_ context.Context, resourceID string) (*UsageReport, error) {
	return &UsageReport{
		ReportID:    "rpt_" + resourceID,
		ResourceID:  resourceID,
		OfferingID:  "mock/db",
		PeriodStart: "2026-01-01T00:00:00Z",
		PeriodEnd:   "2026-02-01T00:00:00Z",
		Dimensions: []UsageDimension{
			{Dimension: "storage_bytes", Quantity: "1024", Unit: "bytes"},
		},
		ProviderSignature: "sig",
	}, nil
}

func (m *mockProvider) Health(_ context.Context) (*HealthStatus, error) {
	return &HealthStatus{
		Status:    HealthHealthy,
		Version:   "1.0.0",
		CheckedAt: time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func TestProviderServerManifest(t *testing.T) {
	provider := newMockProvider()
	server := NewProviderServer(provider, provider.manifest.Endpoints)

	req := httptest.NewRequest(http.MethodGet, WellKnownPath, nil)
	w := httptest.NewRecorder()
	server.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var manifest ServiceManifest
	json.NewDecoder(w.Body).Decode(&manifest)

	if manifest.DisplayName != "Mock Provider" {
		t.Errorf("expected Mock Provider, got %s", manifest.DisplayName)
	}
}

func TestProviderServerManifestSigned(t *testing.T) {
	kp, _ := GenerateKeyPair()
	provider := newMockProvider()
	server := NewProviderServer(provider, provider.manifest.Endpoints, WithProviderKeyPair(kp))

	req := httptest.NewRequest(http.MethodGet, WellKnownPath, nil)
	w := httptest.NewRecorder()
	server.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var manifest ServiceManifest
	json.NewDecoder(w.Body).Decode(&manifest)

	if manifest.ProviderSignature == "" {
		t.Error("expected non-empty provider_signature")
	}
	if manifest.ProviderPublicKey == "" {
		t.Error("expected non-empty provider_public_key")
	}

	valid, err := VerifyManifest(&manifest, "")
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !valid {
		t.Error("expected valid signature")
	}
}

func TestProviderServerProvision(t *testing.T) {
	provider := newMockProvider()
	server := NewProviderServer(provider, provider.manifest.Endpoints)

	body := `{"offering_id":"mock/db","tier_id":"free","project_name":"test","nonce":"n1"}`
	req := httptest.NewRequest(http.MethodPost, "/v1/provision", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	server.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp ProvisionResponse
	json.NewDecoder(w.Body).Decode(&resp)

	if resp.Status != StatusActive {
		t.Errorf("expected status=active, got %s", resp.Status)
	}
	if resp.ResourceID == "" {
		t.Error("expected non-empty resource_id")
	}
}

func TestProviderServerProvisionInvalidJSON(t *testing.T) {
	provider := newMockProvider()
	server := NewProviderServer(provider, provider.manifest.Endpoints)

	req := httptest.NewRequest(http.MethodPost, "/v1/provision", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	server.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProviderServerDeprovision(t *testing.T) {
	provider := newMockProvider()
	server := NewProviderServer(provider, provider.manifest.Endpoints)

	req := httptest.NewRequest(http.MethodDelete, "/v1/deprovision/res_001", nil)
	w := httptest.NewRecorder()
	server.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestProviderServerDeprovisionNotFound(t *testing.T) {
	provider := newMockProvider()
	server := NewProviderServer(provider, provider.manifest.Endpoints)

	req := httptest.NewRequest(http.MethodDelete, "/v1/deprovision/nonexistent", nil)
	w := httptest.NewRecorder()
	server.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

func TestProviderServerCredentials(t *testing.T) {
	provider := newMockProvider()
	server := NewProviderServer(provider, provider.manifest.Endpoints)

	req := httptest.NewRequest(http.MethodGet, "/v1/credentials/res_001", nil)
	w := httptest.NewRecorder()
	server.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var bundle CredentialBundle
	json.NewDecoder(w.Body).Decode(&bundle)

	if bundle.Credentials["DATABASE_URL"] != "postgres://localhost:5432/mock" {
		t.Errorf("unexpected DATABASE_URL: %s", bundle.Credentials["DATABASE_URL"])
	}
}

func TestProviderServerRotate(t *testing.T) {
	provider := newMockProvider()
	server := NewProviderServer(provider, provider.manifest.Endpoints)

	req := httptest.NewRequest(http.MethodPost, "/v1/rotate/res_001", nil)
	w := httptest.NewRecorder()
	server.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var bundle CredentialBundle
	json.NewDecoder(w.Body).Decode(&bundle)

	if bundle.Credentials["DATABASE_URL"] != "postgres://localhost/rotated" {
		t.Errorf("unexpected rotated DATABASE_URL: %s", bundle.Credentials["DATABASE_URL"])
	}
}

func TestProviderServerStatus(t *testing.T) {
	provider := newMockProvider()
	server := NewProviderServer(provider, provider.manifest.Endpoints)

	req := httptest.NewRequest(http.MethodGet, "/v1/status/res_001", nil)
	w := httptest.NewRecorder()
	server.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var status ResourceStatus
	json.NewDecoder(w.Body).Decode(&status)

	if status.Status != StatusActive {
		t.Errorf("expected status=active, got %s", status.Status)
	}
}

func TestProviderServerUsage(t *testing.T) {
	provider := newMockProvider()
	server := NewProviderServer(provider, provider.manifest.Endpoints)

	req := httptest.NewRequest(http.MethodGet, "/v1/usage/res_001", nil)
	w := httptest.NewRecorder()
	server.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var report UsageReport
	json.NewDecoder(w.Body).Decode(&report)

	if report.ResourceID != "res_001" {
		t.Errorf("expected resource_id=res_001, got %s", report.ResourceID)
	}
}

func TestProviderServerHealth(t *testing.T) {
	provider := newMockProvider()
	server := NewProviderServer(provider, provider.manifest.Endpoints)

	req := httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	w := httptest.NewRecorder()
	server.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var health HealthStatus
	json.NewDecoder(w.Body).Decode(&health)

	if health.Status != HealthHealthy {
		t.Errorf("expected status=healthy, got %s", health.Status)
	}
}

func TestProviderServerMethodNotAllowed(t *testing.T) {
	provider := newMockProvider()
	server := NewProviderServer(provider, provider.manifest.Endpoints)

	tests := []struct {
		method string
		path   string
	}{
		{http.MethodPost, WellKnownPath},
		{http.MethodGet, "/v1/provision"},
		{http.MethodGet, "/v1/deprovision/res_001"},
		{http.MethodPost, "/v1/credentials/res_001"},
		{http.MethodGet, "/v1/rotate/res_001"},
		{http.MethodPost, "/v1/status/res_001"},
		{http.MethodPost, "/v1/usage/res_001"},
		{http.MethodPost, "/v1/health"},
	}

	for _, tt := range tests {
		req := httptest.NewRequest(tt.method, tt.path, nil)
		w := httptest.NewRecorder()
		server.ServeHTTP(w, req)

		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("%s %s: expected 405, got %d", tt.method, tt.path, w.Code)
		}
	}
}

func TestExtractLastPathSegment(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"/v1/status/res_123", "res_123"},
		{"/v1/status/res_123/", "res_123"},
		{"/res_123", "res_123"},
		{"res_123", "res_123"},
		{"/", ""},
	}

	for _, tt := range tests {
		result := extractLastPathSegment(tt.input)
		if result != tt.expected {
			t.Errorf("extractLastPathSegment(%s): expected %s, got %s", tt.input, tt.expected, result)
		}
	}
}

func TestProviderServerMissingResourceID(t *testing.T) {
	provider := newMockProvider()
	endpoints := provider.manifest.Endpoints
	server := NewProviderServer(provider, endpoints)

	// Request with an explicit empty segment should still extract "deprovision"
	// as the last path component and hit the provider, which will return not found.
	req := httptest.NewRequest(http.MethodDelete, "/v1/deprovision/", nil)
	w := httptest.NewRecorder()
	server.ServeHTTP(w, req)

	// Provider returns 500 because "deprovision" is not a valid resource ID.
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500 for missing/invalid resource_id, got %d", w.Code)
	}
}
