package osp

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

// Base64URL encoding without padding, as used by OSP for keys and signatures.
var base64url = base64.RawURLEncoding

// KeyPair holds an Ed25519 signing key pair.
type KeyPair struct {
	PublicKey  ed25519.PublicKey
	PrivateKey ed25519.PrivateKey
}

// GenerateKeyPair creates a new random Ed25519 key pair.
func GenerateKeyPair() (*KeyPair, error) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("osp: generate key pair: %w", err)
	}
	return &KeyPair{PublicKey: pub, PrivateKey: priv}, nil
}

// KeyPairFromSeed creates an Ed25519 key pair from a 32-byte seed.
func KeyPairFromSeed(seed []byte) (*KeyPair, error) {
	if len(seed) != ed25519.SeedSize {
		return nil, fmt.Errorf("osp: seed must be %d bytes, got %d", ed25519.SeedSize, len(seed))
	}
	priv := ed25519.NewKeyFromSeed(seed)
	pub := priv.Public().(ed25519.PublicKey)
	return &KeyPair{PublicKey: pub, PrivateKey: priv}, nil
}

// PublicKeyBase64 returns the public key encoded as base64url (no padding).
func (kp *KeyPair) PublicKeyBase64() string {
	return base64url.EncodeToString(kp.PublicKey)
}

// PrivateKeyBase64 returns the private key seed encoded as base64url (no padding).
func (kp *KeyPair) PrivateKeyBase64() string {
	return base64url.EncodeToString(kp.PrivateKey.Seed())
}

// Sign produces an Ed25519 signature over the given message using the private key.
// The signature is returned as a base64url-encoded string.
func (kp *KeyPair) Sign(message []byte) string {
	sig := ed25519.Sign(kp.PrivateKey, message)
	return base64url.EncodeToString(sig)
}

// Verify checks an Ed25519 signature (base64url-encoded) against the given
// message using the public key. Returns true if the signature is valid.
func (kp *KeyPair) Verify(message []byte, signatureBase64 string) (bool, error) {
	sig, err := base64url.DecodeString(signatureBase64)
	if err != nil {
		return false, fmt.Errorf("osp: decode signature: %w", err)
	}
	return ed25519.Verify(kp.PublicKey, message, sig), nil
}

// Sign creates an Ed25519 signature over message using the given private key.
// Returns the signature as a base64url-encoded string.
func Sign(privateKey ed25519.PrivateKey, message []byte) string {
	sig := ed25519.Sign(privateKey, message)
	return base64url.EncodeToString(sig)
}

// Verify checks an Ed25519 signature (base64url-encoded) against message
// using the given public key. Returns true if the signature is valid.
func Verify(publicKey ed25519.PublicKey, message []byte, signatureBase64 string) (bool, error) {
	sig, err := base64url.DecodeString(signatureBase64)
	if err != nil {
		return false, fmt.Errorf("osp: decode signature: %w", err)
	}
	if len(sig) != ed25519.SignatureSize {
		return false, fmt.Errorf("osp: invalid signature length: %d", len(sig))
	}
	return ed25519.Verify(publicKey, message, sig), nil
}

// VerifyWithBase64Key checks a signature against message using a base64url-encoded
// public key string. This is the format used in OSP manifests.
func VerifyWithBase64Key(publicKeyBase64 string, message []byte, signatureBase64 string) (bool, error) {
	pubBytes, err := base64url.DecodeString(publicKeyBase64)
	if err != nil {
		return false, fmt.Errorf("osp: decode public key: %w", err)
	}
	if len(pubBytes) != ed25519.PublicKeySize {
		return false, fmt.Errorf("osp: invalid public key length: %d", len(pubBytes))
	}
	return Verify(ed25519.PublicKey(pubBytes), message, signatureBase64)
}

// SignManifest signs a ServiceManifest using the given key pair.
// It computes the canonical JSON of the manifest (with provider_signature
// set to empty string) and signs it with Ed25519.
func SignManifest(manifest *ServiceManifest, kp *KeyPair) (string, error) {
	// Create a copy without the signature for signing.
	unsigned := manifest.ManifestWithoutSignature()

	canonical, err := CanonicalJSON(unsigned)
	if err != nil {
		return "", fmt.Errorf("osp: sign manifest: %w", err)
	}

	return kp.Sign(canonical), nil
}

// VerifyManifest verifies the signature on a ServiceManifest.
// If publicKeyBase64 is empty, it uses the manifest's own ProviderPublicKey field.
func VerifyManifest(manifest *ServiceManifest, publicKeyBase64 string) (bool, error) {
	if publicKeyBase64 == "" {
		publicKeyBase64 = manifest.ProviderPublicKey
	}
	if publicKeyBase64 == "" {
		return false, &SignatureError{OSPError{Message: "no public key available for verification"}}
	}

	signature := manifest.ProviderSignature
	if signature == "" {
		return false, &SignatureError{OSPError{Message: "manifest has no signature"}}
	}

	unsigned := manifest.ManifestWithoutSignature()
	canonical, err := CanonicalJSON(unsigned)
	if err != nil {
		return false, fmt.Errorf("osp: verify manifest: %w", err)
	}

	return VerifyWithBase64Key(publicKeyBase64, canonical, signature)
}

// PublicKeyFromBase64 decodes a base64url-encoded Ed25519 public key.
func PublicKeyFromBase64(encoded string) (ed25519.PublicKey, error) {
	pubBytes, err := base64url.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("osp: decode public key: %w", err)
	}
	if len(pubBytes) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("osp: invalid public key length: %d", len(pubBytes))
	}
	return ed25519.PublicKey(pubBytes), nil
}
