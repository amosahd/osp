package osp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// ---------------------------------------------------------------------------
// Payment Proof Envelope
// ---------------------------------------------------------------------------

// PaymentProofEnvelope is the structured proof material attached to paid
// provision requests. It carries the mandate authorization, amount binding,
// provider/offering/tier scope, and a cryptographic signature.
type PaymentProofEnvelope struct {
	Version    string `json:"version"`
	MandateID  string `json:"mandate_id"`
	Amount     string `json:"amount"`
	Currency   string `json:"currency"`
	ProviderID string `json:"provider_id"`
	OfferingID string `json:"offering_id"`
	TierID     string `json:"tier_id"`
	Signature  string `json:"signature"`
	ExpiresAt  string `json:"expires_at"`
	EscrowID   string `json:"escrow_id,omitempty"`
	Nonce      string `json:"nonce,omitempty"`
}

// Serialize returns the JSON string for ProvisionRequest.PaymentProof.
func (p *PaymentProofEnvelope) Serialize() (string, error) {
	data, err := json.Marshal(p)
	if err != nil {
		return "", fmt.Errorf("serialize payment proof: %w", err)
	}
	return string(data), nil
}

// ParsePaymentProof parses a JSON string back into a PaymentProofEnvelope.
func ParsePaymentProof(raw string) (*PaymentProofEnvelope, error) {
	var proof PaymentProofEnvelope
	if err := json.Unmarshal([]byte(raw), &proof); err != nil {
		return nil, fmt.Errorf("parse payment proof: %w", err)
	}
	if proof.Version == "" || proof.MandateID == "" || proof.Signature == "" {
		return nil, errors.New("invalid payment proof: missing required fields")
	}
	return &proof, nil
}

// IsExpired checks whether this proof has expired.
func (p *PaymentProofEnvelope) IsExpired() bool {
	exp, err := time.Parse(time.RFC3339, p.ExpiresAt)
	if err != nil {
		return true // Cannot parse → treat as expired
	}
	return time.Now().UTC().After(exp)
}

// ---------------------------------------------------------------------------
// Estimate Types
// ---------------------------------------------------------------------------

// EstimateCost represents the cost breakdown from an estimate response.
type EstimateCost struct {
	Amount   string   `json:"amount"`
	Currency Currency `json:"currency"`
	Interval string   `json:"interval,omitempty"`
}

// EstimateResponse is the typed response from POST /osp/v1/estimate.
type EstimateResponse struct {
	OfferingID              string        `json:"offering_id"`
	TierID                  string        `json:"tier_id"`
	Cost                    *EstimateCost `json:"cost,omitempty"`
	AcceptedPaymentMethods  []string      `json:"accepted_payment_methods,omitempty"`
	EscrowRequired          bool          `json:"escrow_required"`
	ApprovalRequired        bool          `json:"approval_required"`
	EstimatedProvisionSecs  *int          `json:"estimated_provision_seconds,omitempty"`
}

// EscrowMetadata carries escrow state for paid provisions.
type EscrowMetadata struct {
	EscrowID      string `json:"escrow_id"`
	Status        string `json:"status"`
	HoldAmount    string `json:"hold_amount,omitempty"`
	Currency      string `json:"currency,omitempty"`
	TimeoutAt     string `json:"timeout_at,omitempty"`
	DisputeWindow string `json:"dispute_window,omitempty"`
}

// ---------------------------------------------------------------------------
// Estimate Decision
// ---------------------------------------------------------------------------

// EstimateDecision is the result of evaluating an estimate for payment decisions.
type EstimateDecision struct {
	Estimate               EstimateResponse
	RequiresPayment        bool
	RequiresEscrow         bool
	RequiresApproval       bool
	SuggestedPaymentMethod PaymentMethod
}

// EvaluateEstimate evaluates an estimate response and produces a payment decision.
func EvaluateEstimate(est EstimateResponse) EstimateDecision {
	isFree := est.Cost == nil ||
		est.Cost.Amount == "0" ||
		est.Cost.Amount == "0.00" ||
		est.Cost.Amount == "0.000"

	suggested := PaymentFree
	if !isFree {
		for _, m := range est.AcceptedPaymentMethods {
			if m != "free" {
				suggested = PaymentMethod(m)
				break
			}
		}
	}

	return EstimateDecision{
		Estimate:               est,
		RequiresPayment:        !isFree,
		RequiresEscrow:         est.EscrowRequired,
		RequiresApproval:       est.ApprovalRequired,
		SuggestedPaymentMethod: suggested,
	}
}

// ---------------------------------------------------------------------------
// Async Reconciliation Helpers
// ---------------------------------------------------------------------------

// PaidProvisionError is returned when paid provisioning fails or times out.
type PaidProvisionError struct {
	Message  string
	Response map[string]interface{}
}

func (e *PaidProvisionError) Error() string { return e.Message }

// ApprovalRequiredError is returned when provisioning requires human approval.
type ApprovalRequiredError struct {
	Message  string
	Response map[string]interface{}
}

func (e *ApprovalRequiredError) Error() string { return e.Message }

// PollOptions configures async paid provisioning polling.
type PollOptions struct {
	MaxPolls     int
	PollInterval time.Duration
	OnPoll       func(attempt int, status string)
}

// DefaultPollOptions returns sensible defaults for polling.
func DefaultPollOptions() PollOptions {
	return PollOptions{
		MaxPolls:     30,
		PollInterval: 2 * time.Second,
	}
}

// PollPaidProvision polls for async paid provisioning completion.
//
// When a provider returns 202 Accepted for a paid provision, the agent
// must poll the status endpoint until the resource becomes active or
// the operation fails.
func PollPaidProvision(
	ctx context.Context,
	pollFn func(ctx context.Context) (map[string]interface{}, error),
	opts PollOptions,
) (map[string]interface{}, error) {
	if opts.MaxPolls == 0 {
		opts.MaxPolls = 30
	}
	if opts.PollInterval == 0 {
		opts.PollInterval = 2 * time.Second
	}

	for attempt := 1; attempt <= opts.MaxPolls; attempt++ {
		response, err := pollFn(ctx)
		if err != nil {
			return nil, fmt.Errorf("poll attempt %d: %w", attempt, err)
		}

		status, _ := response["status"].(string)
		if opts.OnPoll != nil {
			opts.OnPoll(attempt, status)
		}

		switch status {
		case "active":
			return response, nil
		case "failed", "deprovisioned":
			errMsg := status
			if errObj, ok := response["error"].(map[string]interface{}); ok {
				if msg, ok := errObj["message"].(string); ok {
					errMsg = msg
				}
			}
			return nil, &PaidProvisionError{
				Message:  fmt.Sprintf("paid provisioning failed: %s", errMsg),
				Response: response,
			}
		case "approval_required":
			return nil, &ApprovalRequiredError{
				Message:  "provision requires human approval before proceeding",
				Response: response,
			}
		}

		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(opts.PollInterval):
		}
	}

	return nil, &PaidProvisionError{
		Message: fmt.Sprintf("paid provisioning timed out after %d polls", opts.MaxPolls),
	}
}
