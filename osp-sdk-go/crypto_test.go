package osp

import (
	"crypto/ed25519"
	"testing"
)

func TestGenerateKeyPair(t *testing.T) {
	kp, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("generate key pair: %v", err)
	}

	if len(kp.PublicKey) != ed25519.PublicKeySize {
		t.Errorf("expected public key size %d, got %d", ed25519.PublicKeySize, len(kp.PublicKey))
	}
	if len(kp.PrivateKey) != ed25519.PrivateKeySize {
		t.Errorf("expected private key size %d, got %d", ed25519.PrivateKeySize, len(kp.PrivateKey))
	}
}

func TestKeyPairFromSeed(t *testing.T) {
	seed := make([]byte, ed25519.SeedSize)
	for i := range seed {
		seed[i] = byte(i)
	}

	kp, err := KeyPairFromSeed(seed)
	if err != nil {
		t.Fatalf("key pair from seed: %v", err)
	}

	// Same seed should produce the same key pair.
	kp2, err := KeyPairFromSeed(seed)
	if err != nil {
		t.Fatalf("key pair from seed: %v", err)
	}

	if kp.PublicKeyBase64() != kp2.PublicKeyBase64() {
		t.Error("same seed should produce same public key")
	}
}

func TestKeyPairFromSeedInvalidLength(t *testing.T) {
	_, err := KeyPairFromSeed([]byte{1, 2, 3})
	if err == nil {
		t.Fatal("expected error for invalid seed length")
	}
}

func TestSignAndVerify(t *testing.T) {
	kp, err := GenerateKeyPair()
	if err != nil {
		t.Fatalf("generate key pair: %v", err)
	}

	message := []byte("hello, osp protocol!")
	signature := kp.Sign(message)

	valid, err := kp.Verify(message, signature)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !valid {
		t.Error("expected valid signature")
	}
}

func TestSignAndVerifyWithDifferentKey(t *testing.T) {
	kp1, _ := GenerateKeyPair()
	kp2, _ := GenerateKeyPair()

	message := []byte("hello, osp!")
	signature := kp1.Sign(message)

	valid, err := kp2.Verify(message, signature)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if valid {
		t.Error("signature should not verify with different key")
	}
}

func TestVerifyModifiedMessage(t *testing.T) {
	kp, _ := GenerateKeyPair()

	signature := kp.Sign([]byte("original"))
	valid, err := kp.Verify([]byte("modified"), signature)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if valid {
		t.Error("signature should not verify with modified message")
	}
}

func TestSignTopLevel(t *testing.T) {
	kp, _ := GenerateKeyPair()
	message := []byte("test message")

	sig := Sign(kp.PrivateKey, message)
	valid, err := Verify(kp.PublicKey, message, sig)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !valid {
		t.Error("expected valid signature")
	}
}

func TestVerifyWithBase64Key(t *testing.T) {
	kp, _ := GenerateKeyPair()
	message := []byte("test message")

	sig := kp.Sign(message)
	valid, err := VerifyWithBase64Key(kp.PublicKeyBase64(), message, sig)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !valid {
		t.Error("expected valid signature")
	}
}

func TestVerifyWithBase64KeyInvalid(t *testing.T) {
	_, err := VerifyWithBase64Key("invalid-base64!", []byte("msg"), "sig")
	if err == nil {
		t.Error("expected error for invalid base64 key")
	}
}

func TestVerifyInvalidSignature(t *testing.T) {
	kp, _ := GenerateKeyPair()
	_, err := kp.Verify([]byte("msg"), "not-valid-base64!")
	if err == nil {
		t.Error("expected error for invalid signature encoding")
	}
}

func TestVerifyInvalidSignatureLength(t *testing.T) {
	kp, _ := GenerateKeyPair()
	valid, err := Verify(kp.PublicKey, []byte("msg"), base64url.EncodeToString([]byte("short")))
	if err == nil {
		t.Error("expected error for invalid signature length")
	}
	if valid {
		t.Error("should not be valid")
	}
}

func TestPublicKeyBase64Roundtrip(t *testing.T) {
	kp, _ := GenerateKeyPair()

	encoded := kp.PublicKeyBase64()
	decoded, err := PublicKeyFromBase64(encoded)
	if err != nil {
		t.Fatalf("decode: %v", err)
	}

	if !decoded.Equal(kp.PublicKey) {
		t.Error("decoded key should match original")
	}
}

func TestPublicKeyFromBase64Invalid(t *testing.T) {
	_, err := PublicKeyFromBase64("not-valid!")
	if err == nil {
		t.Error("expected error for invalid base64")
	}

	// Valid base64 but wrong length.
	_, err = PublicKeyFromBase64(base64url.EncodeToString([]byte{1, 2, 3}))
	if err == nil {
		t.Error("expected error for wrong key length")
	}
}

func TestSignManifest(t *testing.T) {
	kp, _ := GenerateKeyPair()

	manifest := &ServiceManifest{
		ManifestID:      "mf_test",
		ManifestVersion: 1,
		ProviderID:      "test.com",
		DisplayName:     "Test",
		Offerings: []ServiceOffering{
			{
				OfferingID:        "test/db",
				Name:              "Test DB",
				Category:          CategoryDatabase,
				Tiers:             []ServiceTier{{TierID: "free", Name: "Free", Price: Price{Amount: "0.00", Currency: CurrencyUSD}}},
				CredentialsSchema: map[string]interface{}{"type": "object"},
			},
		},
		Endpoints: ProviderEndpoints{
			Provision: "/p", Deprovision: "/d", Credentials: "/c",
			Status: "/s", Health: "/h",
		},
	}

	// Set public key before signing (as providers would).
	manifest.ProviderPublicKey = kp.PublicKeyBase64()

	sig, err := SignManifest(manifest, kp)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}

	manifest.ProviderSignature = sig

	valid, err := VerifyManifest(manifest, "")
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !valid {
		t.Error("expected valid manifest signature")
	}
}

func TestVerifyManifestWithExplicitKey(t *testing.T) {
	kp, _ := GenerateKeyPair()

	manifest := &ServiceManifest{
		ManifestID:      "mf_test",
		ManifestVersion: 1,
		ProviderID:      "test.com",
		DisplayName:     "Test",
		Offerings:       []ServiceOffering{},
		Endpoints: ProviderEndpoints{
			Provision: "/p", Deprovision: "/d", Credentials: "/c",
			Status: "/s", Health: "/h",
		},
	}

	sig, err := SignManifest(manifest, kp)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	manifest.ProviderSignature = sig

	valid, err := VerifyManifest(manifest, kp.PublicKeyBase64())
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !valid {
		t.Error("expected valid signature with explicit key")
	}
}

func TestVerifyManifestNoPublicKey(t *testing.T) {
	manifest := &ServiceManifest{
		ProviderSignature: "some_sig",
	}

	_, err := VerifyManifest(manifest, "")
	if err == nil {
		t.Error("expected error when no public key available")
	}
}

func TestVerifyManifestNoSignature(t *testing.T) {
	manifest := &ServiceManifest{
		ProviderPublicKey: "some_key",
	}

	_, err := VerifyManifest(manifest, "")
	if err == nil {
		t.Error("expected error when no signature")
	}
}

func TestVerifyManifestTamperedData(t *testing.T) {
	kp, _ := GenerateKeyPair()

	manifest := &ServiceManifest{
		ManifestID:      "mf_test",
		ManifestVersion: 1,
		ProviderID:      "test.com",
		DisplayName:     "Test",
		Offerings:       []ServiceOffering{},
		Endpoints: ProviderEndpoints{
			Provision: "/p", Deprovision: "/d", Credentials: "/c",
			Status: "/s", Health: "/h",
		},
	}

	sig, _ := SignManifest(manifest, kp)
	manifest.ProviderSignature = sig
	manifest.ProviderPublicKey = kp.PublicKeyBase64()

	// Tamper with the manifest.
	manifest.DisplayName = "Tampered"

	valid, err := VerifyManifest(manifest, "")
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if valid {
		t.Error("tampered manifest should not verify")
	}
}

func TestPrivateKeyBase64(t *testing.T) {
	kp, _ := GenerateKeyPair()
	encoded := kp.PrivateKeyBase64()
	if encoded == "" {
		t.Error("expected non-empty private key base64")
	}

	decoded, err := base64url.DecodeString(encoded)
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(decoded) != ed25519.SeedSize {
		t.Errorf("expected seed size %d, got %d", ed25519.SeedSize, len(decoded))
	}
}

func TestDeterministicSigning(t *testing.T) {
	kp, _ := GenerateKeyPair()
	message := []byte("deterministic")

	sig1 := kp.Sign(message)
	sig2 := kp.Sign(message)

	if sig1 != sig2 {
		t.Error("Ed25519 signatures should be deterministic")
	}
}
