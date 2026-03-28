import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  OSPResolver,
  parseOSPUri,
  buildOSPUri,
  isOSPUri,
} from "../src/resolver.js";

// ---------------------------------------------------------------------------
// parseOSPUri
// ---------------------------------------------------------------------------

describe("parseOSPUri", () => {
  it("parses a valid osp:// URI", () => {
    const result = parseOSPUri("osp://supabase.com/postgres/connection_string");
    expect(result).toEqual({
      provider: "supabase.com",
      offering: "postgres",
      key: "connection_string",
    });
  });

  it("parses URI with subdomain provider", () => {
    const result = parseOSPUri("osp://api.example.io/auth/api_key");
    expect(result).toEqual({
      provider: "api.example.io",
      offering: "auth",
      key: "api_key",
    });
  });

  it("parses URI with path-like key", () => {
    const result = parseOSPUri("osp://provider.com/svc/deep/nested/key");
    expect(result).toEqual({
      provider: "provider.com",
      offering: "svc",
      key: "deep/nested/key",
    });
  });

  it("returns null for empty string", () => {
    expect(parseOSPUri("")).toBeNull();
  });

  it("returns null for regular URL", () => {
    expect(parseOSPUri("https://example.com/foo")).toBeNull();
  });

  it("returns null for malformed osp URI missing key", () => {
    expect(parseOSPUri("osp://provider.com/offering")).toBeNull();
  });

  it("returns null for malformed osp URI missing offering and key", () => {
    expect(parseOSPUri("osp://provider.com")).toBeNull();
  });

  it("returns null for non-string-like input", () => {
    expect(parseOSPUri("osp://")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildOSPUri
// ---------------------------------------------------------------------------

describe("buildOSPUri", () => {
  it("builds a valid osp:// URI", () => {
    expect(buildOSPUri("supabase.com", "postgres", "connection_string")).toBe(
      "osp://supabase.com/postgres/connection_string",
    );
  });

  it("round-trips with parseOSPUri", () => {
    const uri = buildOSPUri("neon.tech", "pg", "dsn");
    const parsed = parseOSPUri(uri);
    expect(parsed).toEqual({
      provider: "neon.tech",
      offering: "pg",
      key: "dsn",
    });
  });
});

// ---------------------------------------------------------------------------
// isOSPUri
// ---------------------------------------------------------------------------

describe("isOSPUri", () => {
  it("returns true for valid osp:// URIs", () => {
    expect(isOSPUri("osp://supabase.com/postgres/conn")).toBe(true);
    expect(isOSPUri("osp://x.io/y/z")).toBe(true);
  });

  it("returns false for non-osp strings", () => {
    expect(isOSPUri("https://example.com")).toBe(false);
    expect(isOSPUri("postgres://user:pass@host")).toBe(false);
    expect(isOSPUri("")).toBe(false);
    expect(isOSPUri("osp://")).toBe(false);
    expect(isOSPUri("osp://a/b")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// OSPResolver — credential vault
// ---------------------------------------------------------------------------

describe("OSPResolver credential store", () => {
  let resolver: OSPResolver;

  beforeEach(() => {
    resolver = new OSPResolver({ envFallback: false });
  });

  it("stores and resolves credentials", () => {
    resolver.addCredential("supabase.com", "postgres", {
      connection_string: "postgres://host/db",
      api_key: "sk_123",
    });

    expect(
      resolver.resolve("osp://supabase.com/postgres/connection_string"),
    ).toBe("postgres://host/db");
    expect(resolver.resolve("osp://supabase.com/postgres/api_key")).toBe(
      "sk_123",
    );
  });

  it("returns undefined for missing provider", () => {
    expect(resolver.resolve("osp://unknown.com/svc/key")).toBeUndefined();
  });

  it("returns undefined for missing offering", () => {
    resolver.addCredential("a.com", "svc1", { key: "val" });
    expect(resolver.resolve("osp://a.com/svc2/key")).toBeUndefined();
  });

  it("returns undefined for missing key", () => {
    resolver.addCredential("a.com", "svc", { key1: "val1" });
    expect(resolver.resolve("osp://a.com/svc/key2")).toBeUndefined();
  });

  it("returns undefined for invalid URI", () => {
    expect(resolver.resolve("not-an-osp-uri")).toBeUndefined();
  });

  it("overwrites credentials when addCredential is called again", () => {
    resolver.addCredential("a.com", "svc", { key: "v1" });
    resolver.addCredential("a.com", "svc", { key: "v2" });
    expect(resolver.resolve("osp://a.com/svc/key")).toBe("v2");
  });

  it("handles multiple providers and offerings", () => {
    resolver.addCredential("a.com", "svc1", { k: "a1" });
    resolver.addCredential("a.com", "svc2", { k: "a2" });
    resolver.addCredential("b.com", "svc1", { k: "b1" });

    expect(resolver.resolve("osp://a.com/svc1/k")).toBe("a1");
    expect(resolver.resolve("osp://a.com/svc2/k")).toBe("a2");
    expect(resolver.resolve("osp://b.com/svc1/k")).toBe("b1");
  });
});

// ---------------------------------------------------------------------------
// OSPResolver — removeCredential
// ---------------------------------------------------------------------------

describe("OSPResolver.removeCredential", () => {
  it("removes credentials and returns true", () => {
    const resolver = new OSPResolver({ envFallback: false });
    resolver.addCredential("a.com", "svc", { k: "v" });
    expect(resolver.removeCredential("a.com", "svc")).toBe(true);
    expect(resolver.resolve("osp://a.com/svc/k")).toBeUndefined();
  });

  it("returns false when provider does not exist", () => {
    const resolver = new OSPResolver({ envFallback: false });
    expect(resolver.removeCredential("nope.com", "svc")).toBe(false);
  });

  it("returns false when offering does not exist", () => {
    const resolver = new OSPResolver({ envFallback: false });
    resolver.addCredential("a.com", "svc1", { k: "v" });
    expect(resolver.removeCredential("a.com", "svc2")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// OSPResolver — resolveAll
// ---------------------------------------------------------------------------

describe("OSPResolver.resolveAll", () => {
  it("resolves osp:// URIs in a record", () => {
    const resolver = new OSPResolver({ envFallback: false });
    resolver.addCredential("a.com", "svc", { key: "resolved_val" });

    const result = resolver.resolveAll({
      DB_URL: "osp://a.com/svc/key",
      PLAIN: "some_value",
    });

    expect(result.DB_URL).toBe("resolved_val");
    expect(result.PLAIN).toBe("some_value");
  });

  it("keeps unresolvable osp URIs as-is", () => {
    const resolver = new OSPResolver({ envFallback: false });
    const result = resolver.resolveAll({
      MISSING: "osp://unknown.com/svc/key",
    });
    expect(result.MISSING).toBe("osp://unknown.com/svc/key");
  });

  it("handles empty record", () => {
    const resolver = new OSPResolver({ envFallback: false });
    expect(resolver.resolveAll({})).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// OSPResolver — listUris
// ---------------------------------------------------------------------------

describe("OSPResolver.listUris", () => {
  it("lists all stored URIs", () => {
    const resolver = new OSPResolver({ envFallback: false });
    resolver.addCredential("a.com", "svc", { k1: "v1", k2: "v2" });
    resolver.addCredential("b.com", "db", { dsn: "postgres://" });

    const uris = resolver.listUris();
    expect(uris).toHaveLength(3);
    expect(uris).toContain("osp://a.com/svc/k1");
    expect(uris).toContain("osp://a.com/svc/k2");
    expect(uris).toContain("osp://b.com/db/dsn");
  });

  it("returns empty array when no credentials stored", () => {
    const resolver = new OSPResolver({ envFallback: false });
    expect(resolver.listUris()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// OSPResolver — generateDotenv
// ---------------------------------------------------------------------------

describe("OSPResolver.generateDotenv", () => {
  it("generates plain .env format", () => {
    const resolver = new OSPResolver({ envFallback: false });
    resolver.addCredential("supabase.com", "postgres", {
      connection_string: "postgres://host/db",
    });

    const dotenv = resolver.generateDotenv();
    expect(dotenv).toContain("CONNECTION_STRING=postgres://host/db");
    expect(dotenv).toContain("# supabase.com");
    expect(dotenv).toContain("osp://supabase.com/postgres/connection_string");
  });

  it("adds NEXT_PUBLIC_ prefix for anon keys in nextjs mode", () => {
    const resolver = new OSPResolver({ envFallback: false });
    resolver.addCredential("supabase.com", "postgres", {
      supabase_anon_key: "eyJ...",
    });

    const dotenv = resolver.generateDotenv({ framework: "nextjs" });
    expect(dotenv).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...");
  });

  it("adds VITE_ prefix for public keys in vite mode", () => {
    const resolver = new OSPResolver({ envFallback: false });
    resolver.addCredential("stripe.com", "payments", {
      publishable_key: "pk_test_123",
    });

    const dotenv = resolver.generateDotenv({ framework: "vite" });
    expect(dotenv).toContain("VITE_PUBLISHABLE_KEY=pk_test_123");
  });

  it("does not prefix non-public keys in nextjs mode", () => {
    const resolver = new OSPResolver({ envFallback: false });
    resolver.addCredential("a.com", "svc", {
      secret_key: "sk_123",
    });

    const dotenv = resolver.generateDotenv({ framework: "nextjs" });
    expect(dotenv).toContain("SECRET_KEY=sk_123");
    expect(dotenv).not.toContain("NEXT_PUBLIC_SECRET_KEY");
  });

  it("returns empty output when no credentials stored", () => {
    const resolver = new OSPResolver({ envFallback: false });
    expect(resolver.generateDotenv().trim()).toBe("");
  });
});

// ---------------------------------------------------------------------------
// OSPResolver — envFallback
// ---------------------------------------------------------------------------

describe("OSPResolver.envFallback", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = originalEnv;
  });

  it("falls back to environment variable when envFallback is true", () => {
    process.env.CONNECTION_STRING = "env_value";
    const resolver = new OSPResolver({ envFallback: true });

    expect(
      resolver.resolve("osp://any.com/svc/connection_string"),
    ).toBe("env_value");
  });

  it("does not fall back when envFallback is false", () => {
    process.env.CONNECTION_STRING = "env_value";
    const resolver = new OSPResolver({ envFallback: false });

    expect(
      resolver.resolve("osp://any.com/svc/connection_string"),
    ).toBeUndefined();
  });

  it("prefers vault credentials over env variables", () => {
    process.env.CONNECTION_STRING = "env_value";
    const resolver = new OSPResolver({ envFallback: true });
    resolver.addCredential("any.com", "svc", {
      connection_string: "vault_value",
    });

    expect(
      resolver.resolve("osp://any.com/svc/connection_string"),
    ).toBe("vault_value");
  });

  it("uses custom env prefix for provider", () => {
    process.env.SUPABASE_CONNECTION_STRING = "prefixed_value";
    const resolver = new OSPResolver({
      envFallback: true,
      envPrefixes: { "supabase.com": "SUPABASE_" },
    });

    expect(
      resolver.resolve("osp://supabase.com/postgres/connection_string"),
    ).toBe("prefixed_value");
  });
});

// ---------------------------------------------------------------------------
// OSPResolver — constructor defaults
// ---------------------------------------------------------------------------

describe("OSPResolver constructor", () => {
  it("creates resolver with defaults", () => {
    const resolver = new OSPResolver();
    expect(resolver).toBeInstanceOf(OSPResolver);
  });

  it("creates resolver with explicit options", () => {
    const resolver = new OSPResolver({
      envFallback: false,
      envPrefixes: { "a.com": "A_" },
    });
    expect(resolver).toBeInstanceOf(OSPResolver);
  });
});
