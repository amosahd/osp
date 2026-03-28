package osp

import (
	"testing"
)

func TestParseOSPURI(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		wantProvider  string
		wantOffering  string
		wantCredKey   string
		wantErr       bool
	}{
		{
			name:         "full URI",
			input:        "osp://supabase.com/postgres/DATABASE_URL",
			wantProvider: "supabase.com",
			wantOffering: "postgres",
			wantCredKey:  "DATABASE_URL",
		},
		{
			name:         "provider and offering only",
			input:        "osp://neon.tech/serverless-pg",
			wantProvider: "neon.tech",
			wantOffering: "serverless-pg",
		},
		{
			name:         "provider only",
			input:        "osp://upstash.com",
			wantProvider: "upstash.com",
		},
		{
			name:         "with trailing slash",
			input:        "osp://example.com/",
			wantProvider: "example.com",
		},
		{
			name:    "not osp scheme",
			input:   "https://example.com",
			wantErr: true,
		},
		{
			name:    "empty string",
			input:   "",
			wantErr: true,
		},
		{
			name:    "just scheme",
			input:   "osp://",
			wantErr: true,
		},
		{
			name:         "with port",
			input:        "osp://localhost:8080/offering/key",
			wantProvider: "localhost:8080",
			wantOffering: "offering",
			wantCredKey:  "key",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			parsed, err := ParseOSPURI(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if parsed.Provider != tt.wantProvider {
				t.Errorf("provider: expected %s, got %s", tt.wantProvider, parsed.Provider)
			}
			if parsed.Offering != tt.wantOffering {
				t.Errorf("offering: expected %s, got %s", tt.wantOffering, parsed.Offering)
			}
			if parsed.CredentialKey != tt.wantCredKey {
				t.Errorf("credential_key: expected %s, got %s", tt.wantCredKey, parsed.CredentialKey)
			}
		})
	}
}

func TestOSPURIString(t *testing.T) {
	tests := []struct {
		uri      OSPURI
		expected string
	}{
		{
			uri:      OSPURI{Provider: "supabase.com", Offering: "postgres", CredentialKey: "DATABASE_URL"},
			expected: "osp://supabase.com/postgres/DATABASE_URL",
		},
		{
			uri:      OSPURI{Provider: "neon.tech", Offering: "pg"},
			expected: "osp://neon.tech/pg",
		},
		{
			uri:      OSPURI{Provider: "example.com"},
			expected: "osp://example.com",
		},
	}

	for _, tt := range tests {
		result := tt.uri.String()
		if result != tt.expected {
			t.Errorf("expected %s, got %s", tt.expected, result)
		}
	}
}

func TestOSPURIProviderURL(t *testing.T) {
	uri := &OSPURI{Provider: "supabase.com"}
	if uri.ProviderURL() != "https://supabase.com" {
		t.Errorf("expected https://supabase.com, got %s", uri.ProviderURL())
	}
}

func TestParseAndStringRoundtrip(t *testing.T) {
	inputs := []string{
		"osp://supabase.com/postgres/DATABASE_URL",
		"osp://neon.tech/pg",
		"osp://example.com",
	}

	for _, input := range inputs {
		parsed, err := ParseOSPURI(input)
		if err != nil {
			t.Fatalf("parse %s: %v", input, err)
		}
		result := parsed.String()
		if result != input {
			t.Errorf("roundtrip: expected %s, got %s", input, result)
		}
	}
}

func TestResolverResolveURI(t *testing.T) {
	client := NewClient()
	resolver := NewResolver(client)

	resolver.RegisterCredentials("res_123", &CredentialBundle{
		ResourceID: "res_123",
		Credentials: map[string]string{
			"DATABASE_URL": "postgres://user:pass@host:5432/db",
			"API_KEY":      "sk_test_123",
		},
		IssuedAt: "2026-01-01T00:00:00Z",
	})

	val, err := resolver.ResolveURI("osp://supabase.com/postgres/DATABASE_URL")
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}

	if val != "postgres://user:pass@host:5432/db" {
		t.Errorf("expected postgres://user:pass@host:5432/db, got %s", val)
	}
}

func TestResolverResolveURINotFound(t *testing.T) {
	client := NewClient()
	resolver := NewResolver(client)

	_, err := resolver.ResolveURI("osp://supabase.com/postgres/NONEXISTENT")
	if err == nil {
		t.Fatal("expected error for nonexistent credential")
	}
}

func TestResolverResolveURIMissingKey(t *testing.T) {
	client := NewClient()
	resolver := NewResolver(client)

	_, err := resolver.ResolveURI("osp://supabase.com/postgres")
	if err == nil {
		t.Fatal("expected error for URI without credential key")
	}
}

func TestResolverResolveAll(t *testing.T) {
	client := NewClient()
	resolver := NewResolver(client)

	resolver.RegisterCredentials("res_123", &CredentialBundle{
		ResourceID: "res_123",
		Credentials: map[string]string{
			"DATABASE_URL": "postgres://localhost/db",
			"REDIS_URL":    "redis://localhost:6379",
		},
		IssuedAt: "2026-01-01T00:00:00Z",
	})

	env := map[string]string{
		"DATABASE_URL": "osp://supabase.com/postgres/DATABASE_URL",
		"REDIS_URL":    "osp://upstash.com/redis/REDIS_URL",
		"APP_NAME":     "my-app",
	}

	result, err := resolver.ResolveAll(env)
	if err != nil {
		t.Fatalf("resolve all: %v", err)
	}

	if result["DATABASE_URL"] != "postgres://localhost/db" {
		t.Errorf("unexpected DATABASE_URL: %s", result["DATABASE_URL"])
	}
	if result["REDIS_URL"] != "redis://localhost:6379" {
		t.Errorf("unexpected REDIS_URL: %s", result["REDIS_URL"])
	}
	if result["APP_NAME"] != "my-app" {
		t.Errorf("non-osp values should pass through: %s", result["APP_NAME"])
	}
}

func TestResolverResolveAllError(t *testing.T) {
	client := NewClient()
	resolver := NewResolver(client)

	env := map[string]string{
		"KEY": "osp://provider.com/offering/NONEXISTENT",
	}

	_, err := resolver.ResolveAll(env)
	if err == nil {
		t.Fatal("expected error for unresolvable URI")
	}
}

func TestIsOSPURI(t *testing.T) {
	tests := []struct {
		input    string
		expected bool
	}{
		{"osp://supabase.com/postgres/DATABASE_URL", true},
		{"osp://example.com", true},
		{"https://example.com", false},
		{"postgres://localhost/db", false},
		{"", false},
		{"osp:", false},
	}

	for _, tt := range tests {
		result := IsOSPURI(tt.input)
		if result != tt.expected {
			t.Errorf("IsOSPURI(%s): expected %v, got %v", tt.input, tt.expected, result)
		}
	}
}

func TestResolverRegisterManifest(t *testing.T) {
	client := NewClient()
	resolver := NewResolver(client)

	manifest := &ServiceManifest{
		ManifestID:  "mf_test",
		ProviderID:  "test.com",
		DisplayName: "Test",
	}

	resolver.RegisterManifest("https://test.com", manifest)

	// The manifest should be cached.
	if resolver.cache["https://test.com"] != manifest {
		t.Error("expected manifest to be cached")
	}
}

func TestResolverMultipleCredentials(t *testing.T) {
	client := NewClient()
	resolver := NewResolver(client)

	resolver.RegisterCredentials("res_1", &CredentialBundle{
		ResourceID: "res_1",
		Credentials: map[string]string{
			"KEY_A": "value_a",
		},
		IssuedAt: "2026-01-01T00:00:00Z",
	})

	resolver.RegisterCredentials("res_2", &CredentialBundle{
		ResourceID: "res_2",
		Credentials: map[string]string{
			"KEY_B": "value_b",
		},
		IssuedAt: "2026-01-01T00:00:00Z",
	})

	valA, err := resolver.ResolveURI("osp://provider.com/offering/KEY_A")
	if err != nil {
		t.Fatalf("resolve KEY_A: %v", err)
	}
	if valA != "value_a" {
		t.Errorf("expected value_a, got %s", valA)
	}

	valB, err := resolver.ResolveURI("osp://provider.com/offering/KEY_B")
	if err != nil {
		t.Fatalf("resolve KEY_B: %v", err)
	}
	if valB != "value_b" {
		t.Errorf("expected value_b, got %s", valB)
	}
}
