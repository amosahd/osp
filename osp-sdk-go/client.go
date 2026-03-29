package osp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	// DefaultTimeout is the default HTTP request timeout.
	DefaultTimeout = 30 * time.Second

	// DefaultMaxRetries is the default number of retry attempts for transient errors.
	DefaultMaxRetries = 3

	// DefaultRetryDelay is the initial delay between retries.
	DefaultRetryDelay = 500 * time.Millisecond

	// WellKnownPath is the path where providers publish their OSP manifest.
	WellKnownPath = "/.well-known/osp.json"

	userAgent = "osp-sdk-go/1.0"
)

// ClientOption configures an OSPClient.
type ClientOption func(*OSPClient)

// WithHTTPClient sets a custom HTTP client.
func WithHTTPClient(client *http.Client) ClientOption {
	return func(c *OSPClient) {
		c.httpClient = client
	}
}

// WithTimeout sets the HTTP request timeout.
func WithTimeout(timeout time.Duration) ClientOption {
	return func(c *OSPClient) {
		c.timeout = timeout
	}
}

// WithMaxRetries sets the maximum number of retry attempts.
func WithMaxRetries(n int) ClientOption {
	return func(c *OSPClient) {
		c.maxRetries = n
	}
}

// WithRetryDelay sets the initial retry delay.
func WithRetryDelay(d time.Duration) ClientOption {
	return func(c *OSPClient) {
		c.retryDelay = d
	}
}

// WithKeyPair sets the agent's Ed25519 key pair for credential encryption.
func WithKeyPair(kp *KeyPair) ClientOption {
	return func(c *OSPClient) {
		c.keyPair = kp
	}
}

// WithUserAgent sets a custom User-Agent header.
func WithUserAgent(ua string) ClientOption {
	return func(c *OSPClient) {
		c.userAgent = ua
	}
}

// OSPClient is an HTTP client for interacting with OSP providers.
type OSPClient struct {
	httpClient *http.Client
	timeout    time.Duration
	maxRetries int
	retryDelay time.Duration
	keyPair    *KeyPair
	userAgent  string
}

// NewClient creates a new OSPClient with the given options.
func NewClient(opts ...ClientOption) *OSPClient {
	c := &OSPClient{
		httpClient: &http.Client{Timeout: DefaultTimeout},
		timeout:    DefaultTimeout,
		maxRetries: DefaultMaxRetries,
		retryDelay: DefaultRetryDelay,
		userAgent:  userAgent,
	}
	for _, opt := range opts {
		opt(c)
	}
	if c.httpClient.Timeout == 0 {
		c.httpClient.Timeout = c.timeout
	}
	return c
}

// Discover fetches and parses the OSP manifest from a provider.
// The providerURL should be the base URL of the provider (e.g. "https://supabase.com").
func (c *OSPClient) Discover(ctx context.Context, providerURL string) (*ServiceManifest, error) {
	manifestURL, err := buildManifestURL(providerURL)
	if err != nil {
		return nil, &DiscoveryError{
			OSPError:    OSPError{Message: fmt.Sprintf("invalid provider URL: %v", err)},
			ProviderURL: providerURL,
		}
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, manifestURL, nil)
	if err != nil {
		return nil, &DiscoveryError{
			OSPError:    OSPError{Message: fmt.Sprintf("create request: %v", err)},
			ProviderURL: providerURL,
		}
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", c.userAgent)

	body, resp, err := c.doWithRetries(ctx, req)
	if err != nil {
		return nil, &DiscoveryError{
			OSPError:    OSPError{Message: fmt.Sprintf("fetch manifest: %v", err), Err: err},
			ProviderURL: providerURL,
		}
	}
	if resp.StatusCode != http.StatusOK {
		return nil, &DiscoveryError{
			OSPError:    *newOSPError(resp, parseErrorBody(body)),
			ProviderURL: providerURL,
		}
	}

	var manifest ServiceManifest
	if err := json.Unmarshal(body, &manifest); err != nil {
		return nil, &DiscoveryError{
			OSPError:    OSPError{Message: fmt.Sprintf("parse manifest: %v", err), Err: err},
			ProviderURL: providerURL,
		}
	}

	return &manifest, nil
}

// DiscoverAndVerify fetches the manifest and verifies its signature.
// If publicKeyBase64 is empty, the manifest's own ProviderPublicKey field is used.
func (c *OSPClient) DiscoverAndVerify(ctx context.Context, providerURL string, publicKeyBase64 string) (*ServiceManifest, error) {
	manifest, err := c.Discover(ctx, providerURL)
	if err != nil {
		return nil, err
	}

	valid, err := VerifyManifest(manifest, publicKeyBase64)
	if err != nil {
		return nil, &DiscoveryError{
			OSPError:    OSPError{Message: fmt.Sprintf("verify signature: %v", err), Err: err},
			ProviderURL: providerURL,
		}
	}
	if !valid {
		return nil, &DiscoveryError{
			OSPError:    OSPError{Message: "manifest signature verification failed"},
			ProviderURL: providerURL,
		}
	}

	return manifest, nil
}

// Provision sends a provisioning request to a provider.
// The providerURL is the base URL; the provision endpoint path is taken from
// the manifest's endpoints, or you can call ProvisionWithURL directly.
func (c *OSPClient) Provision(ctx context.Context, providerURL string, endpoints ProviderEndpoints, req *ProvisionRequest) (*ProvisionResponse, error) {
	fullURL, err := resolveEndpoint(providerURL, endpoints.Provision)
	if err != nil {
		return nil, &ProvisioningError{
			OSPError:   OSPError{Message: fmt.Sprintf("resolve endpoint: %v", err)},
			OfferingID: req.OfferingID,
			TierID:     req.TierID,
		}
	}

	// Set the agent's public key if we have a key pair and it's not already set.
	if c.keyPair != nil && req.AgentPublicKey == "" {
		req.AgentPublicKey = c.keyPair.PublicKeyBase64()
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, &ProvisioningError{
			OSPError:   OSPError{Message: fmt.Sprintf("marshal request: %v", err)},
			OfferingID: req.OfferingID,
			TierID:     req.TierID,
		}
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, bytes.NewReader(body))
	if err != nil {
		return nil, &ProvisioningError{
			OSPError:   OSPError{Message: fmt.Sprintf("create request: %v", err)},
			OfferingID: req.OfferingID,
			TierID:     req.TierID,
		}
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)

	respBody, resp, err := c.doWithRetries(ctx, httpReq)
	if err != nil {
		return nil, &ProvisioningError{
			OSPError:   OSPError{Message: fmt.Sprintf("provision request: %v", err), Err: err},
			OfferingID: req.OfferingID,
			TierID:     req.TierID,
		}
	}

	if resp.StatusCode >= 400 {
		errBody := parseErrorBody(respBody)
		return nil, &ProvisioningError{
			OSPError:   *newOSPError(resp, errBody),
			OfferingID: req.OfferingID,
			TierID:     req.TierID,
		}
	}

	var provResp ProvisionResponse
	if err := json.Unmarshal(respBody, &provResp); err != nil {
		return nil, &ProvisioningError{
			OSPError:   OSPError{Message: fmt.Sprintf("parse response: %v", err), Err: err},
			OfferingID: req.OfferingID,
			TierID:     req.TierID,
		}
	}

	return &provResp, nil
}

// Deprovision sends a deprovision request for the given resource.
func (c *OSPClient) Deprovision(ctx context.Context, providerURL string, endpoints ProviderEndpoints, resourceID string) error {
	fullURL, err := resolveEndpoint(providerURL, endpoints.Deprovision)
	if err != nil {
		return &DeprovisionError{
			OSPError:   OSPError{Message: fmt.Sprintf("resolve endpoint: %v", err)},
			ResourceID: resourceID,
		}
	}

	// Append resource ID to URL path.
	fullURL = strings.TrimRight(fullURL, "/") + "/" + url.PathEscape(resourceID)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodDelete, fullURL, nil)
	if err != nil {
		return &DeprovisionError{
			OSPError:   OSPError{Message: fmt.Sprintf("create request: %v", err)},
			ResourceID: resourceID,
		}
	}
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)

	respBody, resp, err := c.doWithRetries(ctx, httpReq)
	if err != nil {
		return &DeprovisionError{
			OSPError:   OSPError{Message: fmt.Sprintf("deprovision request: %v", err), Err: err},
			ResourceID: resourceID,
		}
	}

	if resp.StatusCode >= 400 {
		return &DeprovisionError{
			OSPError:   *newOSPError(resp, parseErrorBody(respBody)),
			ResourceID: resourceID,
		}
	}

	return nil
}

// Rotate requests credential rotation for the given resource.
func (c *OSPClient) Rotate(ctx context.Context, providerURL string, endpoints ProviderEndpoints, resourceID string) (*CredentialBundle, error) {
	if endpoints.Rotate == "" {
		return nil, &CredentialError{
			OSPError:   OSPError{Message: "provider does not support credential rotation"},
			ResourceID: resourceID,
		}
	}

	fullURL, err := resolveEndpoint(providerURL, endpoints.Rotate)
	if err != nil {
		return nil, &CredentialError{
			OSPError:   OSPError{Message: fmt.Sprintf("resolve endpoint: %v", err)},
			ResourceID: resourceID,
		}
	}
	fullURL = strings.TrimRight(fullURL, "/") + "/" + url.PathEscape(resourceID)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, nil)
	if err != nil {
		return nil, &CredentialError{
			OSPError:   OSPError{Message: fmt.Sprintf("create request: %v", err)},
			ResourceID: resourceID,
		}
	}
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)

	respBody, resp, err := c.doWithRetries(ctx, httpReq)
	if err != nil {
		return nil, &CredentialError{
			OSPError:   OSPError{Message: fmt.Sprintf("rotate request: %v", err), Err: err},
			ResourceID: resourceID,
		}
	}

	if resp.StatusCode >= 400 {
		return nil, &CredentialError{
			OSPError:   *newOSPError(resp, parseErrorBody(respBody)),
			ResourceID: resourceID,
		}
	}

	var bundle CredentialBundle
	if err := json.Unmarshal(respBody, &bundle); err != nil {
		return nil, &CredentialError{
			OSPError:   OSPError{Message: fmt.Sprintf("parse response: %v", err), Err: err},
			ResourceID: resourceID,
		}
	}

	return &bundle, nil
}

// Status retrieves the current status of a provisioned resource.
func (c *OSPClient) Status(ctx context.Context, providerURL string, endpoints ProviderEndpoints, resourceID string) (*ResourceStatus, error) {
	fullURL, err := resolveEndpoint(providerURL, endpoints.Status)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("resolve endpoint: %v", err)}
	}
	fullURL = strings.TrimRight(fullURL, "/") + "/" + url.PathEscape(resourceID)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("create request: %v", err)}
	}
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)

	respBody, resp, err := c.doWithRetries(ctx, httpReq)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("status request: %v", err), Err: err}
	}

	if resp.StatusCode >= 400 {
		return nil, newOSPError(resp, parseErrorBody(respBody))
	}

	var status ResourceStatus
	if err := json.Unmarshal(respBody, &status); err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("parse response: %v", err), Err: err}
	}

	return &status, nil
}

// Usage retrieves the usage report for a provisioned resource.
func (c *OSPClient) Usage(ctx context.Context, providerURL string, endpoints ProviderEndpoints, resourceID string) (*UsageReport, error) {
	if endpoints.Usage == "" {
		return nil, &OSPError{Message: "provider does not support usage reporting"}
	}

	fullURL, err := resolveEndpoint(providerURL, endpoints.Usage)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("resolve endpoint: %v", err)}
	}
	fullURL = strings.TrimRight(fullURL, "/") + "/" + url.PathEscape(resourceID)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("create request: %v", err)}
	}
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)

	respBody, resp, err := c.doWithRetries(ctx, httpReq)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("usage request: %v", err), Err: err}
	}

	if resp.StatusCode >= 400 {
		return nil, newOSPError(resp, parseErrorBody(respBody))
	}

	var report UsageReport
	if err := json.Unmarshal(respBody, &report); err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("parse response: %v", err), Err: err}
	}

	return &report, nil
}

// Health checks the health of a provider.
func (c *OSPClient) Health(ctx context.Context, providerURL string, endpoints ProviderEndpoints) (*HealthStatus, error) {
	fullURL, err := resolveEndpoint(providerURL, endpoints.Health)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("resolve endpoint: %v", err)}
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("create request: %v", err)}
	}
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)

	start := time.Now()
	respBody, resp, err := c.doWithRetries(ctx, httpReq)
	latency := time.Since(start)
	if err != nil {
		return &HealthStatus{
			Status:    HealthUnhealthy,
			CheckedAt: time.Now().UTC().Format(time.RFC3339),
		}, nil
	}

	if resp.StatusCode >= 500 {
		latMs := float64(latency.Milliseconds())
		return &HealthStatus{
			Status:    HealthUnhealthy,
			LatencyMs: &latMs,
			CheckedAt: time.Now().UTC().Format(time.RFC3339),
		}, nil
	}

	var health HealthStatus
	if err := json.Unmarshal(respBody, &health); err != nil {
		// If the health endpoint returns 200 but invalid JSON, still consider it healthy.
		latMs := float64(latency.Milliseconds())
		return &HealthStatus{
			Status:    HealthHealthy,
			LatencyMs: &latMs,
			CheckedAt: time.Now().UTC().Format(time.RFC3339),
		}, nil
	}

	if health.LatencyMs == nil {
		latMs := float64(latency.Milliseconds())
		health.LatencyMs = &latMs
	}
	if health.CheckedAt == "" {
		health.CheckedAt = time.Now().UTC().Format(time.RFC3339)
	}

	return &health, nil
}

// Credentials retrieves the current credentials for a provisioned resource.
func (c *OSPClient) Credentials(ctx context.Context, providerURL string, endpoints ProviderEndpoints, resourceID string) (*CredentialBundle, error) {
	fullURL, err := resolveEndpoint(providerURL, endpoints.Credentials)
	if err != nil {
		return nil, &CredentialError{
			OSPError:   OSPError{Message: fmt.Sprintf("resolve endpoint: %v", err)},
			ResourceID: resourceID,
		}
	}
	fullURL = strings.TrimRight(fullURL, "/") + "/" + url.PathEscape(resourceID)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, &CredentialError{
			OSPError:   OSPError{Message: fmt.Sprintf("create request: %v", err)},
			ResourceID: resourceID,
		}
	}
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)

	respBody, resp, err := c.doWithRetries(ctx, httpReq)
	if err != nil {
		return nil, &CredentialError{
			OSPError:   OSPError{Message: fmt.Sprintf("credentials request: %v", err), Err: err},
			ResourceID: resourceID,
		}
	}

	if resp.StatusCode >= 400 {
		return nil, &CredentialError{
			OSPError:   *newOSPError(resp, parseErrorBody(respBody)),
			ResourceID: resourceID,
		}
	}

	var bundle CredentialBundle
	if err := json.Unmarshal(respBody, &bundle); err != nil {
		return nil, &CredentialError{
			OSPError:   OSPError{Message: fmt.Sprintf("parse response: %v", err), Err: err},
			ResourceID: resourceID,
		}
	}

	return &bundle, nil
}

// GetEvents retrieves the event audit trail for a provisioned resource.
func (c *OSPClient) GetEvents(ctx context.Context, providerURL string, endpoints ProviderEndpoints, resourceID string, opts *GetEventsOptions) (*EventsResponse, error) {
	if endpoints.Events == "" {
		return nil, &OSPError{Message: "provider does not support events"}
	}

	fullURL, err := resolveEndpoint(providerURL, endpoints.Events)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("resolve endpoint: %v", err)}
	}
	fullURL = strings.TrimRight(fullURL, "/") + "/" + url.PathEscape(resourceID)

	if opts != nil {
		params := url.Values{}
		if opts.Since != "" {
			params.Set("since", opts.Since)
		}
		if opts.Until != "" {
			params.Set("until", opts.Until)
		}
		if opts.Limit != nil {
			params.Set("limit", fmt.Sprintf("%d", *opts.Limit))
		}
		if opts.StartingAfter != "" {
			params.Set("starting_after", opts.StartingAfter)
		}
		if opts.EventType != "" {
			params.Set("event_type", opts.EventType)
		}
		if encoded := params.Encode(); encoded != "" {
			fullURL += "?" + encoded
		}
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("create request: %v", err)}
	}
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)

	respBody, resp, err := c.doWithRetries(ctx, httpReq)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("events request: %v", err), Err: err}
	}

	if resp.StatusCode >= 400 {
		return nil, newOSPError(resp, parseErrorBody(respBody))
	}

	var eventsResp EventsResponse
	if err := json.Unmarshal(respBody, &eventsResp); err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("parse response: %v", err), Err: err}
	}

	return &eventsResp, nil
}

// RegisterWebhook registers a webhook for a provisioned resource.
func (c *OSPClient) RegisterWebhook(ctx context.Context, providerURL string, endpoints ProviderEndpoints, resourceID string, reg *WebhookRegistration) (*WebhookResponse, error) {
	if endpoints.Webhooks == "" {
		return nil, &OSPError{Message: "provider does not support webhooks"}
	}

	fullURL, err := resolveEndpoint(providerURL, endpoints.Webhooks)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("resolve endpoint: %v", err)}
	}
	fullURL = strings.TrimRight(fullURL, "/") + "/" + url.PathEscape(resourceID)

	body, err := json.Marshal(reg)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("marshal request: %v", err)}
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, bytes.NewReader(body))
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("create request: %v", err)}
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)

	respBody, resp, err := c.doWithRetries(ctx, httpReq)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("webhook request: %v", err), Err: err}
	}

	if resp.StatusCode >= 400 {
		return nil, newOSPError(resp, parseErrorBody(respBody))
	}

	var webhookResp WebhookResponse
	if err := json.Unmarshal(respBody, &webhookResp); err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("parse response: %v", err), Err: err}
	}

	return &webhookResp, nil
}

// DeleteWebhook removes a webhook for a provisioned resource.
func (c *OSPClient) DeleteWebhook(ctx context.Context, providerURL string, endpoints ProviderEndpoints, resourceID string, webhookID string) error {
	if endpoints.Webhooks == "" {
		return &OSPError{Message: "provider does not support webhooks"}
	}

	fullURL, err := resolveEndpoint(providerURL, endpoints.Webhooks)
	if err != nil {
		return &OSPError{Message: fmt.Sprintf("resolve endpoint: %v", err)}
	}
	fullURL = strings.TrimRight(fullURL, "/") + "/" + url.PathEscape(resourceID) + "/" + url.PathEscape(webhookID)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodDelete, fullURL, nil)
	if err != nil {
		return &OSPError{Message: fmt.Sprintf("create request: %v", err)}
	}
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)

	respBody, resp, err := c.doWithRetries(ctx, httpReq)
	if err != nil {
		return &OSPError{Message: fmt.Sprintf("delete webhook request: %v", err), Err: err}
	}

	if resp.StatusCode >= 400 {
		return newOSPError(resp, parseErrorBody(respBody))
	}

	return nil
}

// Estimate requests a cost estimate for provisioning without actually provisioning.
func (c *OSPClient) Estimate(ctx context.Context, providerURL string, endpoints ProviderEndpoints, req *EstimateRequest) (*EstimateResponse, error) {
	if endpoints.Estimate == "" {
		return nil, &OSPError{Message: "provider does not support cost estimation"}
	}

	fullURL, err := resolveEndpoint(providerURL, endpoints.Estimate)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("resolve endpoint: %v", err)}
	}

	body, err := json.Marshal(req)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("marshal request: %v", err)}
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, bytes.NewReader(body))
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("create request: %v", err)}
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)

	respBody, resp, err := c.doWithRetries(ctx, httpReq)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("estimate request: %v", err), Err: err}
	}

	if resp.StatusCode >= 400 {
		return nil, newOSPError(resp, parseErrorBody(respBody))
	}

	var estimateResp EstimateResponse
	if err := json.Unmarshal(respBody, &estimateResp); err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("parse response: %v", err), Err: err}
	}

	return &estimateResp, nil
}

// Dispute files a dispute for a provisioned resource.
func (c *OSPClient) Dispute(ctx context.Context, providerURL string, endpoints ProviderEndpoints, resourceID string, req *DisputeRequest) (*DisputeResponse, error) {
	if endpoints.Disputes == "" {
		return nil, &OSPError{Message: "provider does not support disputes"}
	}

	fullURL, err := resolveEndpoint(providerURL, endpoints.Disputes)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("resolve endpoint: %v", err)}
	}
	fullURL = strings.TrimRight(fullURL, "/") + "/" + url.PathEscape(resourceID)

	body, err := json.Marshal(req)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("marshal request: %v", err)}
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, bytes.NewReader(body))
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("create request: %v", err)}
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)

	respBody, resp, err := c.doWithRetries(ctx, httpReq)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("dispute request: %v", err), Err: err}
	}

	if resp.StatusCode >= 400 {
		return nil, newOSPError(resp, parseErrorBody(respBody))
	}

	var disputeResp DisputeResponse
	if err := json.Unmarshal(respBody, &disputeResp); err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("parse response: %v", err), Err: err}
	}

	return &disputeResp, nil
}

// ExportResource initiates an export of a provisioned resource.
func (c *OSPClient) ExportResource(ctx context.Context, providerURL string, endpoints ProviderEndpoints, resourceID string, req *ExportRequest) (*ExportResponse, error) {
	if endpoints.Export == "" {
		return nil, &OSPError{Message: "provider does not support export"}
	}

	fullURL, err := resolveEndpoint(providerURL, endpoints.Export)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("resolve endpoint: %v", err)}
	}
	fullURL = strings.TrimRight(fullURL, "/") + "/" + url.PathEscape(resourceID)

	body, err := json.Marshal(req)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("marshal request: %v", err)}
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, bytes.NewReader(body))
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("create request: %v", err)}
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("User-Agent", c.userAgent)

	respBody, resp, err := c.doWithRetries(ctx, httpReq)
	if err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("export request: %v", err), Err: err}
	}

	if resp.StatusCode >= 400 {
		return nil, newOSPError(resp, parseErrorBody(respBody))
	}

	var exportResp ExportResponse
	if err := json.Unmarshal(respBody, &exportResp); err != nil {
		return nil, &OSPError{Message: fmt.Sprintf("parse response: %v", err), Err: err}
	}

	return &exportResp, nil
}

// doWithRetries executes an HTTP request with exponential backoff retries
// for transient errors.
func (c *OSPClient) doWithRetries(ctx context.Context, req *http.Request) ([]byte, *http.Response, error) {
	var lastErr error
	delay := c.retryDelay

	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return nil, nil, ctx.Err()
			case <-time.After(delay):
			}
			delay *= 2
		}

		// Clone request body for retries.
		var bodyClone io.Reader
		if req.Body != nil {
			bodyBytes, err := io.ReadAll(req.Body)
			if err != nil {
				return nil, nil, fmt.Errorf("read request body: %w", err)
			}
			req.Body = io.NopCloser(bytes.NewReader(bodyBytes))
			bodyClone = bytes.NewReader(bodyBytes)
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = err
			// Restore body for retry.
			if bodyClone != nil {
				req.Body = io.NopCloser(bodyClone)
			}
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			if bodyClone != nil {
				req.Body = io.NopCloser(bodyClone)
			}
			continue
		}

		// Retry on server errors and rate limits.
		if resp.StatusCode == http.StatusTooManyRequests ||
			resp.StatusCode == http.StatusServiceUnavailable ||
			resp.StatusCode == http.StatusGatewayTimeout ||
			resp.StatusCode == http.StatusBadGateway {
			lastErr = fmt.Errorf("HTTP %d: %s", resp.StatusCode, http.StatusText(resp.StatusCode))
			if bodyClone != nil {
				req.Body = io.NopCloser(bodyClone)
			}
			continue
		}

		return body, resp, nil
	}

	return nil, nil, fmt.Errorf("after %d retries: %w", c.maxRetries, lastErr)
}

// buildManifestURL constructs the full .well-known/osp.json URL from a provider base URL.
func buildManifestURL(providerURL string) (string, error) {
	// If no scheme, add https:// so url.Parse treats the first component as host.
	if !strings.Contains(providerURL, "://") {
		providerURL = "https://" + providerURL
	}
	u, err := url.Parse(providerURL)
	if err != nil {
		return "", err
	}
	if u.Scheme == "" {
		u.Scheme = "https"
	}
	u.Path = WellKnownPath
	u.RawQuery = ""
	u.Fragment = ""
	return u.String(), nil
}

// resolveEndpoint combines a provider base URL with an endpoint path.
func resolveEndpoint(providerURL, endpointPath string) (string, error) {
	u, err := url.Parse(providerURL)
	if err != nil {
		return "", err
	}
	if u.Scheme == "" {
		u.Scheme = "https"
	}
	endpoint, err := url.Parse(endpointPath)
	if err != nil {
		return "", err
	}
	return u.ResolveReference(endpoint).String(), nil
}

// parseErrorBody attempts to parse an OSPErrorBody from a response body.
func parseErrorBody(body []byte) *OSPErrorBody {
	var errBody OSPErrorBody
	if err := json.Unmarshal(body, &errBody); err != nil {
		return nil
	}
	if errBody.Error == "" {
		return nil
	}
	return &errBody
}
