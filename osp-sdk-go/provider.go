package osp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// Provider defines the interface that an OSP provider must implement.
// Each method corresponds to a lifecycle operation in the OSP protocol.
type Provider interface {
	// Manifest returns the provider's service manifest.
	Manifest(ctx context.Context) (*ServiceManifest, error)

	// Provision handles a provisioning request and returns the response.
	Provision(ctx context.Context, req *ProvisionRequest) (*ProvisionResponse, error)

	// Deprovision handles deprovisioning of a resource.
	Deprovision(ctx context.Context, resourceID string) error

	// GetCredentials retrieves the current credentials for a resource.
	GetCredentials(ctx context.Context, resourceID string) (*CredentialBundle, error)

	// RotateCredentials performs credential rotation for a resource.
	RotateCredentials(ctx context.Context, resourceID string) (*CredentialBundle, error)

	// Status returns the current status of a provisioned resource.
	Status(ctx context.Context, resourceID string) (*ResourceStatus, error)

	// Usage returns a usage report for a provisioned resource.
	Usage(ctx context.Context, resourceID string) (*UsageReport, error)

	// Health returns the provider's health status.
	Health(ctx context.Context) (*HealthStatus, error)
}

// ProviderServer wraps a Provider implementation and exposes it as an HTTP handler.
type ProviderServer struct {
	provider Provider
	keyPair  *KeyPair
	mux      *http.ServeMux
}

// ProviderServerOption configures a ProviderServer.
type ProviderServerOption func(*ProviderServer)

// WithProviderKeyPair sets the provider's signing key pair.
func WithProviderKeyPair(kp *KeyPair) ProviderServerOption {
	return func(s *ProviderServer) {
		s.keyPair = kp
	}
}

// NewProviderServer creates an HTTP server for an OSP provider.
// The endpoints parameter defines the URL paths for each operation.
func NewProviderServer(provider Provider, endpoints ProviderEndpoints, opts ...ProviderServerOption) *ProviderServer {
	s := &ProviderServer{
		provider: provider,
		mux:      http.NewServeMux(),
	}
	for _, opt := range opts {
		opt(s)
	}

	// Register routes.
	s.mux.HandleFunc(WellKnownPath, s.handleManifest)
	s.mux.HandleFunc(endpoints.Provision, s.handleProvision)
	s.mux.HandleFunc(endpoints.Deprovision+"/", s.handleDeprovision)
	s.mux.HandleFunc(endpoints.Credentials+"/", s.handleCredentials)
	if endpoints.Rotate != "" {
		s.mux.HandleFunc(endpoints.Rotate+"/", s.handleRotate)
	}
	s.mux.HandleFunc(endpoints.Status+"/", s.handleStatus)
	if endpoints.Usage != "" {
		s.mux.HandleFunc(endpoints.Usage+"/", s.handleUsage)
	}
	s.mux.HandleFunc(endpoints.Health, s.handleHealth)

	return s
}

// ServeHTTP implements the http.Handler interface.
func (s *ProviderServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *ProviderServer) handleManifest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "GET only")
		return
	}

	manifest, err := s.provider.Manifest(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "provider_error", err.Error())
		return
	}

	// Sign the manifest if we have a key pair and signature is empty.
	if s.keyPair != nil && manifest.ProviderSignature == "" {
		manifest.ProviderPublicKey = s.keyPair.PublicKeyBase64()
		sig, err := SignManifest(manifest, s.keyPair)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "signing_error", err.Error())
			return
		}
		manifest.ProviderSignature = sig
	}

	writeJSON(w, http.StatusOK, manifest)
}

func (s *ProviderServer) handleProvision(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "POST only")
		return
	}

	var req ProvisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", fmt.Sprintf("invalid JSON: %v", err))
		return
	}

	resp, err := s.provider.Provision(r.Context(), &req)
	if err != nil {
		if pe, ok := err.(*ProvisioningError); ok {
			status := http.StatusInternalServerError
			if pe.StatusCode != 0 {
				status = pe.StatusCode
			}
			writeJSON(w, status, &ProvisionResponse{
				Status: StatusFailed,
				Error:  pe.ProvisionError,
			})
			return
		}
		writeError(w, http.StatusInternalServerError, "provider_error", err.Error())
		return
	}

	status := http.StatusOK
	if resp.Status == StatusProvisioning {
		status = http.StatusAccepted
	}
	writeJSON(w, status, resp)
}

func (s *ProviderServer) handleDeprovision(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "DELETE only")
		return
	}

	resourceID := extractLastPathSegment(r.URL.Path)
	if resourceID == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "missing resource_id")
		return
	}

	if err := s.provider.Deprovision(r.Context(), resourceID); err != nil {
		writeError(w, http.StatusInternalServerError, "provider_error", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deprovisioned"})
}

func (s *ProviderServer) handleCredentials(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "GET only")
		return
	}

	resourceID := extractLastPathSegment(r.URL.Path)
	if resourceID == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "missing resource_id")
		return
	}

	bundle, err := s.provider.GetCredentials(r.Context(), resourceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "provider_error", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, bundle)
}

func (s *ProviderServer) handleRotate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "POST only")
		return
	}

	resourceID := extractLastPathSegment(r.URL.Path)
	if resourceID == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "missing resource_id")
		return
	}

	bundle, err := s.provider.RotateCredentials(r.Context(), resourceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "provider_error", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, bundle)
}

func (s *ProviderServer) handleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "GET only")
		return
	}

	resourceID := extractLastPathSegment(r.URL.Path)
	if resourceID == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "missing resource_id")
		return
	}

	status, err := s.provider.Status(r.Context(), resourceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "provider_error", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, status)
}

func (s *ProviderServer) handleUsage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "GET only")
		return
	}

	resourceID := extractLastPathSegment(r.URL.Path)
	if resourceID == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "missing resource_id")
		return
	}

	report, err := s.provider.Usage(r.Context(), resourceID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "provider_error", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, report)
}

func (s *ProviderServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "GET only")
		return
	}

	health, err := s.provider.Health(r.Context())
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, &HealthStatus{
			Status:    HealthUnhealthy,
			CheckedAt: time.Now().UTC().Format(time.RFC3339),
		})
		return
	}

	writeJSON(w, http.StatusOK, health)
}

// extractLastPathSegment returns the last non-empty segment of a URL path.
func extractLastPathSegment(path string) string {
	path = strings.TrimRight(path, "/")
	idx := strings.LastIndex(path, "/")
	if idx < 0 {
		return path
	}
	return path[idx+1:]
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, &OSPErrorBody{
		Error: message,
		Code:  code,
	})
}
