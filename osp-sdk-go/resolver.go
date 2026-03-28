package osp

import (
	"fmt"
	"net/url"
	"strings"
)

// OSPURI represents a parsed osp:// URI.
//
// The URI format is: osp://provider/offering/credential_key
//
// Examples:
//
//	osp://supabase.com/postgres/DATABASE_URL
//	osp://neon.tech/serverless-pg/CONNECTION_STRING
//	osp://upstash.com/redis/REDIS_URL
type OSPURI struct {
	// Provider is the provider domain (e.g. "supabase.com").
	Provider string
	// Offering is the offering identifier (e.g. "postgres").
	Offering string
	// CredentialKey is the specific credential key to resolve (e.g. "DATABASE_URL").
	CredentialKey string
	// Raw is the original URI string.
	Raw string
}

// ParseOSPURI parses an osp:// URI string into its components.
func ParseOSPURI(uri string) (*OSPURI, error) {
	if !strings.HasPrefix(uri, "osp://") {
		return nil, &ResolverError{
			OSPError: OSPError{Message: "URI must start with osp://"},
			URI:      uri,
		}
	}

	u, err := url.Parse(uri)
	if err != nil {
		return nil, &ResolverError{
			OSPError: OSPError{Message: fmt.Sprintf("invalid URI: %v", err)},
			URI:      uri,
		}
	}

	provider := u.Host
	if provider == "" {
		return nil, &ResolverError{
			OSPError: OSPError{Message: "missing provider in URI"},
			URI:      uri,
		}
	}

	// Path is /offering/credential_key — strip the leading slash.
	path := strings.TrimPrefix(u.Path, "/")
	parts := strings.SplitN(path, "/", 2)

	parsed := &OSPURI{
		Provider: provider,
		Raw:      uri,
	}

	if len(parts) >= 1 && parts[0] != "" {
		parsed.Offering = parts[0]
	}
	if len(parts) >= 2 && parts[1] != "" {
		parsed.CredentialKey = parts[1]
	}

	return parsed, nil
}

// String returns the canonical string representation of the URI.
func (u *OSPURI) String() string {
	var sb strings.Builder
	sb.WriteString("osp://")
	sb.WriteString(u.Provider)
	if u.Offering != "" {
		sb.WriteByte('/')
		sb.WriteString(u.Offering)
		if u.CredentialKey != "" {
			sb.WriteByte('/')
			sb.WriteString(u.CredentialKey)
		}
	}
	return sb.String()
}

// ProviderURL returns the HTTPS base URL for the provider.
func (u *OSPURI) ProviderURL() string {
	return "https://" + u.Provider
}

// Resolver resolves osp:// URIs to credential values.
type Resolver struct {
	// client is the OSP client used to discover providers and fetch credentials.
	client *OSPClient
	// cache maps provider URLs to their manifests.
	cache map[string]*ServiceManifest
	// credentials maps resource IDs to their credential bundles.
	credentials map[string]*CredentialBundle
}

// NewResolver creates a new URI resolver.
func NewResolver(client *OSPClient) *Resolver {
	return &Resolver{
		client:      client,
		cache:       make(map[string]*ServiceManifest),
		credentials: make(map[string]*CredentialBundle),
	}
}

// RegisterCredentials associates a credential bundle with a resource,
// allowing the resolver to look up credentials without fetching from the provider.
func (r *Resolver) RegisterCredentials(resourceID string, bundle *CredentialBundle) {
	r.credentials[resourceID] = bundle
}

// RegisterManifest caches a manifest for a provider URL, avoiding a network fetch.
func (r *Resolver) RegisterManifest(providerURL string, manifest *ServiceManifest) {
	r.cache[providerURL] = manifest
}

// ResolveURI resolves an osp:// URI to its credential value.
// It returns the string value of the credential key, or an error.
func (r *Resolver) ResolveURI(uri string) (string, error) {
	parsed, err := ParseOSPURI(uri)
	if err != nil {
		return "", err
	}

	return r.Resolve(parsed)
}

// Resolve resolves a parsed OSPURI to its credential value.
func (r *Resolver) Resolve(uri *OSPURI) (string, error) {
	if uri.CredentialKey == "" {
		return "", &ResolverError{
			OSPError: OSPError{Message: "URI must include a credential key"},
			URI:      uri.String(),
		}
	}

	// Look through registered credentials for a matching offering.
	for _, bundle := range r.credentials {
		if bundle.Credentials != nil {
			if val, ok := bundle.Credentials[uri.CredentialKey]; ok {
				return val, nil
			}
		}
	}

	return "", &ResolverError{
		OSPError: OSPError{Message: fmt.Sprintf("credential key %q not found", uri.CredentialKey)},
		URI:      uri.String(),
	}
}

// ResolveAll resolves all osp:// URIs in the given map.
// The input maps environment variable names to their values (which may be osp:// URIs).
// Returns a new map with all osp:// URIs replaced with resolved values.
func (r *Resolver) ResolveAll(env map[string]string) (map[string]string, error) {
	result := make(map[string]string, len(env))
	for k, v := range env {
		if strings.HasPrefix(v, "osp://") {
			resolved, err := r.ResolveURI(v)
			if err != nil {
				return nil, fmt.Errorf("resolve %s=%s: %w", k, v, err)
			}
			result[k] = resolved
		} else {
			result[k] = v
		}
	}
	return result, nil
}

// IsOSPURI returns true if the given string is an osp:// URI.
func IsOSPURI(s string) bool {
	return strings.HasPrefix(s, "osp://")
}
