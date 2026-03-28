package osp

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOSPErrorString(t *testing.T) {
	e := &OSPError{
		StatusCode: 400,
		Code:       "invalid_request",
		Message:    "bad request",
	}

	s := e.Error()
	if s != "osp: bad request (code=invalid_request, status=400)" {
		t.Errorf("unexpected error string: %s", s)
	}
}

func TestOSPErrorStringWithWrapped(t *testing.T) {
	inner := errors.New("connection refused")
	e := &OSPError{
		StatusCode: 503,
		Code:       "provider_error",
		Message:    "provider unavailable",
		Err:        inner,
	}

	s := e.Error()
	if s != "osp: provider unavailable (code=provider_error, status=503): connection refused" {
		t.Errorf("unexpected error string: %s", s)
	}
}

func TestOSPErrorStringNoCode(t *testing.T) {
	e := &OSPError{Message: "something went wrong"}
	s := e.Error()
	if s != "osp: something went wrong" {
		t.Errorf("unexpected error string: %s", s)
	}
}

func TestOSPErrorUnwrap(t *testing.T) {
	inner := errors.New("timeout")
	e := &OSPError{Message: "failed", Err: inner}

	if !errors.Is(e, inner) {
		t.Error("expected to unwrap to inner error")
	}
}

func TestDiscoveryErrorString(t *testing.T) {
	e := &DiscoveryError{
		OSPError:    OSPError{Message: "connection refused"},
		ProviderURL: "https://example.com",
	}

	s := e.Error()
	if s != "osp discovery: failed to discover https://example.com: connection refused" {
		t.Errorf("unexpected error string: %s", s)
	}
}

func TestProvisioningErrorString(t *testing.T) {
	e := &ProvisioningError{
		OSPError:   OSPError{Message: "failed"},
		OfferingID: "test/db",
		TierID:     "free",
	}

	s := e.Error()
	if s != "osp provision: test/db/free failed: failed" {
		t.Errorf("unexpected error string: %s", s)
	}
}

func TestProvisioningErrorWithProvisionError(t *testing.T) {
	e := &ProvisioningError{
		OfferingID: "test/db",
		TierID:     "free",
		ProvisionError: &ProvisionError{
			Code:    ErrCodeQuotaExceeded,
			Message: "quota exceeded",
		},
	}

	s := e.Error()
	if s != "osp provision: test/db/free failed: quota exceeded (quota_exceeded)" {
		t.Errorf("unexpected error string: %s", s)
	}
}

func TestDeprovisionErrorString(t *testing.T) {
	e := &DeprovisionError{
		OSPError:   OSPError{Message: "not found"},
		ResourceID: "res_123",
	}

	s := e.Error()
	if s != "osp deprovision: resource res_123 failed: not found" {
		t.Errorf("unexpected error string: %s", s)
	}
}

func TestCredentialErrorString(t *testing.T) {
	e := &CredentialError{
		OSPError:   OSPError{Message: "expired"},
		ResourceID: "res_123",
	}

	s := e.Error()
	if s != "osp credentials: resource res_123 failed: expired" {
		t.Errorf("unexpected error string: %s", s)
	}
}

func TestSignatureErrorString(t *testing.T) {
	e := &SignatureError{
		OSPError: OSPError{Message: "invalid signature"},
	}

	if e.Error() != "osp signature: invalid signature" {
		t.Errorf("unexpected error string: %s", e.Error())
	}
}

func TestEncryptionErrorString(t *testing.T) {
	e := &EncryptionError{
		OSPError: OSPError{Message: "decryption failed"},
	}

	if e.Error() != "osp encryption: decryption failed" {
		t.Errorf("unexpected error string: %s", e.Error())
	}
}

func TestResolverErrorString(t *testing.T) {
	e := &ResolverError{
		OSPError: OSPError{Message: "not found"},
		URI:      "osp://example.com/db/KEY",
	}

	if e.Error() != "osp resolver: cannot resolve osp://example.com/db/KEY: not found" {
		t.Errorf("unexpected error string: %s", e.Error())
	}
}

func TestNewOSPError(t *testing.T) {
	recorder := httptest.NewRecorder()
	recorder.WriteHeader(http.StatusBadRequest)
	resp := recorder.Result()

	body := &OSPErrorBody{
		Error: "invalid_request",
		Code:  "bad_param",
	}

	e := newOSPError(resp, body)
	if e.StatusCode != 400 {
		t.Errorf("expected status 400, got %d", e.StatusCode)
	}
	if e.Code != "bad_param" {
		t.Errorf("expected code=bad_param, got %s", e.Code)
	}
	if e.Message != "invalid_request" {
		t.Errorf("expected message=invalid_request, got %s", e.Message)
	}
}

func TestNewOSPErrorNilBody(t *testing.T) {
	recorder := httptest.NewRecorder()
	recorder.WriteHeader(http.StatusInternalServerError)
	resp := recorder.Result()

	e := newOSPError(resp, nil)
	if e.StatusCode != 500 {
		t.Errorf("expected status 500, got %d", e.StatusCode)
	}
	if e.Message != "Internal Server Error" {
		t.Errorf("expected default message, got %s", e.Message)
	}
}

func TestIsRetryable(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{
			name:     "429",
			err:      &OSPError{StatusCode: http.StatusTooManyRequests},
			expected: true,
		},
		{
			name:     "503",
			err:      &OSPError{StatusCode: http.StatusServiceUnavailable},
			expected: true,
		},
		{
			name:     "504",
			err:      &OSPError{StatusCode: http.StatusGatewayTimeout},
			expected: true,
		},
		{
			name:     "502",
			err:      &OSPError{StatusCode: http.StatusBadGateway},
			expected: true,
		},
		{
			name:     "400",
			err:      &OSPError{StatusCode: http.StatusBadRequest},
			expected: false,
		},
		{
			name:     "404",
			err:      &OSPError{StatusCode: http.StatusNotFound},
			expected: false,
		},
		{
			name: "rate_limited provision error",
			err: &ProvisioningError{
				ProvisionError: &ProvisionError{Code: ErrCodeRateLimited},
			},
			expected: true,
		},
		{
			name: "provider_error provision error",
			err: &ProvisioningError{
				ProvisionError: &ProvisionError{Code: ErrCodeProviderError},
			},
			expected: true,
		},
		{
			name: "quota_exceeded provision error",
			err: &ProvisioningError{
				ProvisionError: &ProvisionError{Code: ErrCodeQuotaExceeded},
			},
			expected: false,
		},
		{
			name:     "non-osp error",
			err:      errors.New("random error"),
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if IsRetryable(tt.err) != tt.expected {
				t.Errorf("expected IsRetryable=%v", tt.expected)
			}
		})
	}
}

func TestParseErrorBody(t *testing.T) {
	body := []byte(`{"error":"not_found","code":"resource_not_found","details":{"id":"123"}}`)
	result := parseErrorBody(body)

	if result == nil {
		t.Fatal("expected non-nil error body")
	}
	if result.Error != "not_found" {
		t.Errorf("expected error=not_found, got %s", result.Error)
	}
	if result.Code != "resource_not_found" {
		t.Errorf("expected code=resource_not_found, got %s", result.Code)
	}
}

func TestParseErrorBodyInvalid(t *testing.T) {
	result := parseErrorBody([]byte("not json"))
	if result != nil {
		t.Error("expected nil for invalid JSON")
	}
}

func TestParseErrorBodyNoError(t *testing.T) {
	result := parseErrorBody([]byte(`{"code":"something"}`))
	if result != nil {
		t.Error("expected nil when error field is empty")
	}
}
