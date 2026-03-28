package osp

import (
	"crypto/ed25519"
	"testing"
)

func TestEncryptDecryptCredentials(t *testing.T) {
	kp, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("generate key pair: %v", err)
	}

	creds := map[string]string{
		"DATABASE_URL": "postgres://user:pass@host:5432/db",
		"API_KEY":      "sk_test_123456789",
	}

	envelope, err := EncryptCredentials(creds, kp.PublicKey)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}

	if envelope.EncryptedPayload == "" {
		t.Error("expected non-empty encrypted payload")
	}
	if envelope.EphemeralPublicKey == "" {
		t.Error("expected non-empty ephemeral public key")
	}
	if envelope.Nonce == "" {
		t.Error("expected non-empty nonce")
	}

	decrypted, err := DecryptCredentials(envelope, kp.PrivateKey)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}

	if decrypted["DATABASE_URL"] != creds["DATABASE_URL"] {
		t.Errorf("expected DATABASE_URL=%s, got %s", creds["DATABASE_URL"], decrypted["DATABASE_URL"])
	}
	if decrypted["API_KEY"] != creds["API_KEY"] {
		t.Errorf("expected API_KEY=%s, got %s", creds["API_KEY"], decrypted["API_KEY"])
	}
}

func TestEncryptDecryptEmptyCredentials(t *testing.T) {
	kp, _ := GenerateKeyPair()

	creds := map[string]string{}

	envelope, err := EncryptCredentials(creds, kp.PublicKey)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}

	decrypted, err := DecryptCredentials(envelope, kp.PrivateKey)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}

	if len(decrypted) != 0 {
		t.Errorf("expected empty credentials, got %v", decrypted)
	}
}

func TestDecryptWithWrongKey(t *testing.T) {
	kp1, _ := GenerateKeyPair()
	kp2, _ := GenerateKeyPair()

	creds := map[string]string{"KEY": "value"}

	envelope, err := EncryptCredentials(creds, kp1.PublicKey)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}

	// Decrypt with wrong key should fail.
	_, err = DecryptCredentials(envelope, kp2.PrivateKey)
	if err == nil {
		t.Fatal("expected decryption error with wrong key")
	}
}

func TestEncryptCredentialsFromBundle(t *testing.T) {
	kp, _ := GenerateKeyPair()

	creds := map[string]string{
		"CONNECTION_STRING": "redis://localhost:6379",
	}

	envelope, err := EncryptCredentialsFromBundle(creds, kp.PublicKeyBase64())
	if err != nil {
		t.Fatalf("encrypt from bundle: %v", err)
	}

	decrypted, err := DecryptCredentials(envelope, kp.PrivateKey)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}

	if decrypted["CONNECTION_STRING"] != "redis://localhost:6379" {
		t.Errorf("unexpected value: %s", decrypted["CONNECTION_STRING"])
	}
}

func TestEncryptCredentialsFromBundleInvalidKey(t *testing.T) {
	_, err := EncryptCredentialsFromBundle(map[string]string{}, "invalid!")
	if err == nil {
		t.Fatal("expected error for invalid base64 key")
	}
}

func TestEncryptCredentialsFromBundleWrongLength(t *testing.T) {
	_, err := EncryptCredentialsFromBundle(map[string]string{}, base64url.EncodeToString([]byte{1, 2, 3}))
	if err == nil {
		t.Fatal("expected error for wrong key length")
	}
}

func TestDecryptCredentialBundleEncrypted(t *testing.T) {
	kp, _ := GenerateKeyPair()

	creds := map[string]string{
		"DATABASE_URL": "postgres://localhost/db",
	}

	envelope, err := EncryptCredentials(creds, kp.PublicKey)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}

	bundle := &CredentialBundle{
		ResourceID:         "res_123",
		EncryptedPayload:   envelope.EncryptedPayload,
		EncryptionMethod:   EncryptionX25519XSalsa20Poly1305,
		EphemeralPublicKey: envelope.EphemeralPublicKey,
		Nonce:              envelope.Nonce,
		IssuedAt:           "2026-01-01T00:00:00Z",
	}

	decrypted, err := DecryptCredentialBundle(bundle, kp.PrivateKey)
	if err != nil {
		t.Fatalf("decrypt bundle: %v", err)
	}

	if decrypted["DATABASE_URL"] != "postgres://localhost/db" {
		t.Errorf("unexpected value: %s", decrypted["DATABASE_URL"])
	}
}

func TestDecryptCredentialBundlePlaintext(t *testing.T) {
	kp, _ := GenerateKeyPair()

	bundle := &CredentialBundle{
		ResourceID: "res_123",
		Credentials: map[string]string{
			"API_KEY": "test_key",
		},
		IssuedAt: "2026-01-01T00:00:00Z",
	}

	decrypted, err := DecryptCredentialBundle(bundle, kp.PrivateKey)
	if err != nil {
		t.Fatalf("decrypt bundle: %v", err)
	}

	if decrypted["API_KEY"] != "test_key" {
		t.Errorf("unexpected value: %s", decrypted["API_KEY"])
	}
}

func TestDecryptCredentialBundleNoCreds(t *testing.T) {
	kp, _ := GenerateKeyPair()

	bundle := &CredentialBundle{
		ResourceID: "res_123",
		IssuedAt:   "2026-01-01T00:00:00Z",
	}

	_, err := DecryptCredentialBundle(bundle, kp.PrivateKey)
	if err == nil {
		t.Fatal("expected error for bundle with no credentials")
	}
}

func TestDecryptInvalidPayload(t *testing.T) {
	kp, _ := GenerateKeyPair()

	envelope := &EncryptedEnvelope{
		EncryptedPayload:   "invalid-base64!",
		EphemeralPublicKey: base64url.EncodeToString(make([]byte, 32)),
		Nonce:              base64url.EncodeToString(make([]byte, 24)),
	}

	_, err := DecryptCredentials(envelope, kp.PrivateKey)
	if err == nil {
		t.Fatal("expected error for invalid payload encoding")
	}
}

func TestDecryptInvalidEphemeralKey(t *testing.T) {
	kp, _ := GenerateKeyPair()

	envelope := &EncryptedEnvelope{
		EncryptedPayload:   base64url.EncodeToString([]byte("data")),
		EphemeralPublicKey: "invalid!",
		Nonce:              base64url.EncodeToString(make([]byte, 24)),
	}

	_, err := DecryptCredentials(envelope, kp.PrivateKey)
	if err == nil {
		t.Fatal("expected error for invalid ephemeral key")
	}
}

func TestDecryptInvalidNonce(t *testing.T) {
	kp, _ := GenerateKeyPair()

	envelope := &EncryptedEnvelope{
		EncryptedPayload:   base64url.EncodeToString([]byte("data")),
		EphemeralPublicKey: base64url.EncodeToString(make([]byte, 32)),
		Nonce:              "invalid!",
	}

	_, err := DecryptCredentials(envelope, kp.PrivateKey)
	if err == nil {
		t.Fatal("expected error for invalid nonce encoding")
	}
}

func TestDecryptWrongNonceLength(t *testing.T) {
	kp, _ := GenerateKeyPair()

	envelope := &EncryptedEnvelope{
		EncryptedPayload:   base64url.EncodeToString([]byte("data")),
		EphemeralPublicKey: base64url.EncodeToString(make([]byte, 32)),
		Nonce:              base64url.EncodeToString(make([]byte, 12)), // Wrong length
	}

	_, err := DecryptCredentials(envelope, kp.PrivateKey)
	if err == nil {
		t.Fatal("expected error for wrong nonce length")
	}
}

func TestDecryptWrongEphemeralKeyLength(t *testing.T) {
	kp, _ := GenerateKeyPair()

	envelope := &EncryptedEnvelope{
		EncryptedPayload:   base64url.EncodeToString([]byte("data")),
		EphemeralPublicKey: base64url.EncodeToString(make([]byte, 16)), // Wrong length
		Nonce:              base64url.EncodeToString(make([]byte, 24)),
	}

	_, err := DecryptCredentials(envelope, kp.PrivateKey)
	if err == nil {
		t.Fatal("expected error for wrong ephemeral key length")
	}
}

func TestEncryptDecryptLargePayload(t *testing.T) {
	kp, _ := GenerateKeyPair()

	creds := make(map[string]string)
	for i := 0; i < 50; i++ {
		key := "KEY_" + string(rune('A'+i%26)) + string(rune('0'+i/26))
		creds[key] = "value_" + key + "_with_some_padding_to_make_it_longer"
	}

	envelope, err := EncryptCredentials(creds, kp.PublicKey)
	if err != nil {
		t.Fatalf("encrypt: %v", err)
	}

	decrypted, err := DecryptCredentials(envelope, kp.PrivateKey)
	if err != nil {
		t.Fatalf("decrypt: %v", err)
	}

	if len(decrypted) != len(creds) {
		t.Errorf("expected %d credentials, got %d", len(creds), len(decrypted))
	}
}

func TestEncryptInvalidPublicKeyLength(t *testing.T) {
	_, err := EncryptCredentials(map[string]string{}, ed25519.PublicKey(make([]byte, 16)))
	if err == nil {
		t.Fatal("expected error for invalid public key length")
	}
}

func TestComputeSharedSecret(t *testing.T) {
	kp1, _ := GenerateKeyPair()
	kp2, _ := GenerateKeyPair()

	// Convert kp2's public key to X25519.
	x25519Pub2, err := ed25519PublicToX25519(kp2.PublicKey)
	if err != nil {
		t.Fatalf("convert pub key: %v", err)
	}

	secret1, err := ComputeSharedSecret(kp1.PrivateKey, x25519Pub2)
	if err != nil {
		t.Fatalf("compute shared secret: %v", err)
	}

	// Convert kp1's public key to X25519.
	x25519Pub1, err := ed25519PublicToX25519(kp1.PublicKey)
	if err != nil {
		t.Fatalf("convert pub key: %v", err)
	}

	secret2, err := ComputeSharedSecret(kp2.PrivateKey, x25519Pub1)
	if err != nil {
		t.Fatalf("compute shared secret: %v", err)
	}

	if secret1 != secret2 {
		t.Error("shared secrets should match")
	}
}

func TestMultipleEncryptionsProduceDifferentCiphertext(t *testing.T) {
	kp, _ := GenerateKeyPair()
	creds := map[string]string{"KEY": "value"}

	env1, _ := EncryptCredentials(creds, kp.PublicKey)
	env2, _ := EncryptCredentials(creds, kp.PublicKey)

	if env1.EncryptedPayload == env2.EncryptedPayload {
		t.Error("two encryptions should produce different ciphertext (random nonce/ephemeral key)")
	}
	if env1.EphemeralPublicKey == env2.EphemeralPublicKey {
		t.Error("two encryptions should use different ephemeral keys")
	}
}
