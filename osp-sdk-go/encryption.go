package osp

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha512"
	"encoding/json"
	"fmt"

	"golang.org/x/crypto/curve25519"
	"golang.org/x/crypto/nacl/box"
)

// EncryptedEnvelope holds the result of encrypting a credential payload.
type EncryptedEnvelope struct {
	// EncryptedPayload is the base64url-encoded ciphertext.
	EncryptedPayload string
	// EphemeralPublicKey is the base64url-encoded ephemeral X25519 public key.
	EphemeralPublicKey string
	// Nonce is the base64url-encoded 24-byte nonce used for encryption.
	Nonce string
}

// ed25519PublicToX25519 converts an Ed25519 public key to an X25519 public key.
// This uses the standard birational map from the Ed25519 curve to Curve25519.
func ed25519PublicToX25519(edPub ed25519.PublicKey) ([32]byte, error) {
	if len(edPub) != ed25519.PublicKeySize {
		return [32]byte{}, fmt.Errorf("invalid ed25519 public key length: %d", len(edPub))
	}

	// Use the Montgomery conversion from edwards25519.
	// The x25519 public key is derived from the ed25519 public key's
	// compressed Edwards point using the birational map.
	//
	// For Ed25519 keys, the conversion is:
	//   u = (1 + y) / (1 - y)  (mod p)
	// where y is the Edwards y-coordinate (the Ed25519 public key is the
	// compressed point encoding the y-coordinate with the sign bit of x).
	var montPub [32]byte
	edwardsToMontgomeryX(&montPub, edPub)
	return montPub, nil
}

// ed25519PrivateToX25519 converts an Ed25519 private key to an X25519 private key.
// The X25519 private key is the SHA-512 hash of the Ed25519 seed, clamped.
func ed25519PrivateToX25519(edPriv ed25519.PrivateKey) [32]byte {
	h := sha512.Sum512(edPriv.Seed())
	var x25519Priv [32]byte
	copy(x25519Priv[:], h[:32])
	// Clamp according to the X25519 spec.
	x25519Priv[0] &= 248
	x25519Priv[31] &= 127
	x25519Priv[31] |= 64
	return x25519Priv
}

// edwardsToMontgomeryX converts a compressed Edwards point to the u-coordinate
// of the corresponding Montgomery point using the birational map:
//   u = (1 + y) / (1 - y)  mod p
//
// where p = 2^255 - 19.
func edwardsToMontgomeryX(dst *[32]byte, edPub []byte) {
	// The Ed25519 public key is the compressed encoding: the y-coordinate
	// as a 255-bit little-endian integer, with the top bit being the sign of x.
	var y [32]byte
	copy(y[:], edPub)
	y[31] &= 0x7f // Clear the sign bit to get raw y.

	// Compute u = (1 + y) * inverse(1 - y) mod p using field arithmetic.
	// We use big-number operations in a simple field implementation.
	var yfe, one, num, den, denInv fieldElement
	feFromBytes(&yfe, &y)
	feOne(&one)
	feAdd(&num, &one, &yfe)   // num = 1 + y
	feSub(&den, &one, &yfe)   // den = 1 - y
	feInvert(&denInv, &den)   // denInv = 1 / (1 - y)
	feMul(&num, &num, &denInv) // u = (1 + y) / (1 - y)
	feToBytes(dst, &num)
}

// EncryptCredentials encrypts a credential map for a recipient identified by their
// Ed25519 public key. It uses X25519 key agreement and XSalsa20-Poly1305.
func EncryptCredentials(credentials map[string]string, recipientEdPub ed25519.PublicKey) (*EncryptedEnvelope, error) {
	// Convert recipient's Ed25519 public key to X25519.
	recipientX25519, err := ed25519PublicToX25519(recipientEdPub)
	if err != nil {
		return nil, &EncryptionError{OSPError{Message: fmt.Sprintf("convert recipient key: %v", err)}}
	}

	// Generate ephemeral X25519 key pair.
	ephPub, ephPriv, err := box.GenerateKey(rand.Reader)
	if err != nil {
		return nil, &EncryptionError{OSPError{Message: fmt.Sprintf("generate ephemeral key: %v", err)}}
	}

	// Serialize credentials to JSON.
	plaintext, err := json.Marshal(credentials)
	if err != nil {
		return nil, &EncryptionError{OSPError{Message: fmt.Sprintf("marshal credentials: %v", err)}}
	}

	// Generate random nonce.
	var nonce [24]byte
	if _, err := rand.Read(nonce[:]); err != nil {
		return nil, &EncryptionError{OSPError{Message: fmt.Sprintf("generate nonce: %v", err)}}
	}

	// Encrypt using NaCl box (X25519 + XSalsa20-Poly1305).
	ciphertext := box.Seal(nil, plaintext, &nonce, &recipientX25519, ephPriv)

	return &EncryptedEnvelope{
		EncryptedPayload:   base64url.EncodeToString(ciphertext),
		EphemeralPublicKey: base64url.EncodeToString(ephPub[:]),
		Nonce:              base64url.EncodeToString(nonce[:]),
	}, nil
}

// DecryptCredentials decrypts a credential payload using the recipient's
// Ed25519 private key.
func DecryptCredentials(envelope *EncryptedEnvelope, recipientEdPriv ed25519.PrivateKey) (map[string]string, error) {
	// Decode the envelope fields.
	ciphertext, err := base64url.DecodeString(envelope.EncryptedPayload)
	if err != nil {
		return nil, &EncryptionError{OSPError{Message: fmt.Sprintf("decode payload: %v", err)}}
	}

	ephPubBytes, err := base64url.DecodeString(envelope.EphemeralPublicKey)
	if err != nil {
		return nil, &EncryptionError{OSPError{Message: fmt.Sprintf("decode ephemeral key: %v", err)}}
	}
	if len(ephPubBytes) != 32 {
		return nil, &EncryptionError{OSPError{Message: fmt.Sprintf("invalid ephemeral key length: %d", len(ephPubBytes))}}
	}

	nonceBytes, err := base64url.DecodeString(envelope.Nonce)
	if err != nil {
		return nil, &EncryptionError{OSPError{Message: fmt.Sprintf("decode nonce: %v", err)}}
	}
	if len(nonceBytes) != 24 {
		return nil, &EncryptionError{OSPError{Message: fmt.Sprintf("invalid nonce length: %d", len(nonceBytes))}}
	}

	var ephPub [32]byte
	copy(ephPub[:], ephPubBytes)

	var nonce [24]byte
	copy(nonce[:], nonceBytes)

	// Convert recipient's Ed25519 private key to X25519.
	recipientX25519 := ed25519PrivateToX25519(recipientEdPriv)

	// Decrypt.
	plaintext, ok := box.Open(nil, ciphertext, &nonce, &ephPub, &recipientX25519)
	if !ok {
		return nil, &EncryptionError{OSPError{Message: "decryption failed: authentication error"}}
	}

	var credentials map[string]string
	if err := json.Unmarshal(plaintext, &credentials); err != nil {
		return nil, &EncryptionError{OSPError{Message: fmt.Sprintf("unmarshal credentials: %v", err)}}
	}

	return credentials, nil
}

// EncryptCredentialsFromBundle creates an EncryptedEnvelope suitable for populating
// a CredentialBundle.
func EncryptCredentialsFromBundle(credentials map[string]string, agentPublicKeyBase64 string) (*EncryptedEnvelope, error) {
	pubBytes, err := base64url.DecodeString(agentPublicKeyBase64)
	if err != nil {
		return nil, &EncryptionError{OSPError{Message: fmt.Sprintf("decode agent public key: %v", err)}}
	}
	if len(pubBytes) != ed25519.PublicKeySize {
		return nil, &EncryptionError{OSPError{Message: fmt.Sprintf("invalid public key length: %d", len(pubBytes))}}
	}
	return EncryptCredentials(credentials, ed25519.PublicKey(pubBytes))
}

// DecryptCredentialBundle decrypts the encrypted payload in a CredentialBundle.
func DecryptCredentialBundle(bundle *CredentialBundle, recipientEdPriv ed25519.PrivateKey) (map[string]string, error) {
	if bundle.EncryptedPayload == "" {
		// If no encrypted payload, return plaintext credentials.
		if bundle.Credentials != nil {
			return bundle.Credentials, nil
		}
		return nil, &EncryptionError{OSPError{Message: "bundle has no encrypted payload or plaintext credentials"}}
	}

	envelope := &EncryptedEnvelope{
		EncryptedPayload:   bundle.EncryptedPayload,
		EphemeralPublicKey: bundle.EphemeralPublicKey,
		Nonce:              bundle.Nonce,
	}

	return DecryptCredentials(envelope, recipientEdPriv)
}

// ComputeSharedSecret computes an X25519 shared secret between an Ed25519 private
// key and an X25519 public key. This is exposed for advanced use cases.
func ComputeSharedSecret(edPriv ed25519.PrivateKey, x25519Pub [32]byte) ([32]byte, error) {
	x25519Priv := ed25519PrivateToX25519(edPriv)
	shared, err := curve25519.X25519(x25519Priv[:], x25519Pub[:])
	if err != nil {
		return [32]byte{}, fmt.Errorf("osp: x25519 key exchange: %w", err)
	}
	var result [32]byte
	copy(result[:], shared)
	return result, nil
}
