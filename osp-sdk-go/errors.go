package osp

import (
	"fmt"
	"net/http"
)

// OSPError is the base error type for all OSP SDK errors.
type OSPError struct {
	// StatusCode is the HTTP status code from the provider, if applicable.
	StatusCode int
	// Code is a machine-readable error code.
	Code string
	// Message is a human-readable error description.
	Message string
	// Details contains additional structured error information.
	Details map[string]interface{}
	// Err is the underlying error, if any.
	Err error
}

func (e *OSPError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("osp: %s (code=%s, status=%d): %v", e.Message, e.Code, e.StatusCode, e.Err)
	}
	if e.Code != "" {
		return fmt.Sprintf("osp: %s (code=%s, status=%d)", e.Message, e.Code, e.StatusCode)
	}
	return fmt.Sprintf("osp: %s", e.Message)
}

func (e *OSPError) Unwrap() error {
	return e.Err
}

// DiscoveryError is returned when manifest discovery fails.
type DiscoveryError struct {
	OSPError
	// ProviderURL is the URL that was being discovered.
	ProviderURL string
}

func (e *DiscoveryError) Error() string {
	return fmt.Sprintf("osp discovery: failed to discover %s: %s", e.ProviderURL, e.Message)
}

// ProvisioningError is returned when a provisioning request fails.
type ProvisioningError struct {
	OSPError
	// OfferingID is the offering that was being provisioned.
	OfferingID string
	// TierID is the tier that was requested.
	TierID string
	// ProvisionError contains provider-specific error details.
	ProvisionError *ProvisionError
}

func (e *ProvisioningError) Error() string {
	if e.ProvisionError != nil {
		return fmt.Sprintf("osp provision: %s/%s failed: %s (%s)", e.OfferingID, e.TierID, e.ProvisionError.Message, e.ProvisionError.Code)
	}
	return fmt.Sprintf("osp provision: %s/%s failed: %s", e.OfferingID, e.TierID, e.Message)
}

// DeprovisionError is returned when a deprovision request fails.
type DeprovisionError struct {
	OSPError
	// ResourceID is the resource that was being deprovisioned.
	ResourceID string
}

func (e *DeprovisionError) Error() string {
	return fmt.Sprintf("osp deprovision: resource %s failed: %s", e.ResourceID, e.Message)
}

// CredentialError is returned when credential operations fail.
type CredentialError struct {
	OSPError
	// ResourceID is the resource whose credentials were being accessed.
	ResourceID string
}

func (e *CredentialError) Error() string {
	return fmt.Sprintf("osp credentials: resource %s failed: %s", e.ResourceID, e.Message)
}

// SignatureError is returned when signature verification fails.
type SignatureError struct {
	OSPError
}

func (e *SignatureError) Error() string {
	return fmt.Sprintf("osp signature: %s", e.Message)
}

// EncryptionError is returned when encryption or decryption fails.
type EncryptionError struct {
	OSPError
}

func (e *EncryptionError) Error() string {
	return fmt.Sprintf("osp encryption: %s", e.Message)
}

// ResolverError is returned when an osp:// URI cannot be resolved.
type ResolverError struct {
	OSPError
	// URI is the osp:// URI that could not be resolved.
	URI string
}

func (e *ResolverError) Error() string {
	return fmt.Sprintf("osp resolver: cannot resolve %s: %s", e.URI, e.Message)
}

// newOSPError creates an OSPError from an HTTP response body.
func newOSPError(resp *http.Response, body *OSPErrorBody) *OSPError {
	e := &OSPError{
		StatusCode: resp.StatusCode,
	}
	if body != nil {
		e.Code = body.Code
		e.Message = body.Error
		e.Details = body.Details
	} else {
		e.Message = http.StatusText(resp.StatusCode)
	}
	return e
}

// IsRetryable returns true if the error is likely transient and the
// operation may succeed on retry.
func IsRetryable(err error) bool {
	if e, ok := err.(*OSPError); ok {
		switch e.StatusCode {
		case http.StatusTooManyRequests,
			http.StatusServiceUnavailable,
			http.StatusGatewayTimeout,
			http.StatusBadGateway:
			return true
		}
	}
	if e, ok := err.(*ProvisioningError); ok {
		if e.ProvisionError != nil {
			return e.ProvisionError.Code == ErrCodeRateLimited || e.ProvisionError.Code == ErrCodeProviderError
		}
	}
	return false
}
