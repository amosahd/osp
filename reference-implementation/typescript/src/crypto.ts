/**
 * Cryptographic helpers for OSP manifest verification and credential
 * encryption.
 *
 * Uses the Web Crypto API (available in Node 20+, Deno, Bun, and all
 * modern browsers) so there are zero native dependencies.
 */

// ---------------------------------------------------------------------------
// Base64-url helpers
// ---------------------------------------------------------------------------

/** Decode a base64url string into a Uint8Array. */
export function base64urlDecode(input: string): Uint8Array {
  // Restore standard base64 alphabet and padding
  const base64 = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Encode a Uint8Array as a base64url string (no padding). */
export function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ---------------------------------------------------------------------------
// Ed25519 signature verification
// ---------------------------------------------------------------------------

/**
 * Import a raw Ed25519 public key (base64url) as a CryptoKey for
 * signature verification.
 */
export async function importEd25519PublicKey(
  base64urlKey: string,
): Promise<CryptoKey> {
  const raw = base64urlDecode(base64urlKey);
  return crypto.subtle.importKey(
    "raw",
    raw.buffer as ArrayBuffer,
    { name: "Ed25519" },
    true,
    ["verify"],
  );
}

/**
 * Verify an Ed25519 signature over a UTF-8 payload.
 *
 * @param publicKeyB64 - The signer's public key (base64url).
 * @param signatureB64 - The signature (base64url).
 * @param payload      - The UTF-8 string that was signed.
 * @returns `true` when the signature is valid, `false` otherwise.
 */
export async function verifyEd25519(
  publicKeyB64: string,
  signatureB64: string,
  payload: string,
): Promise<boolean> {
  try {
    const key = await importEd25519PublicKey(publicKeyB64);
    const signature = base64urlDecode(signatureB64);
    const data = new TextEncoder().encode(payload);
    return crypto.subtle.verify("Ed25519", key, signature.buffer as ArrayBuffer, data.buffer as ArrayBuffer);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Canonical JSON
// ---------------------------------------------------------------------------

/**
 * Produce a canonical JSON representation of an object by sorting keys
 * recursively. This is the payload that providers sign.
 */
export function canonicalJson(obj: unknown): string {
  return JSON.stringify(sortKeys(obj));
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

// ---------------------------------------------------------------------------
// Credential encryption helpers (X25519 + AES-GCM)
// ---------------------------------------------------------------------------

/**
 * Decrypt a credential payload that was encrypted with X25519 ECDH +
 * AES-256-GCM.
 *
 * The provider encrypts credentials using:
 *   1. An ephemeral X25519 key pair.
 *   2. ECDH shared secret derived from the ephemeral private key and the
 *      agent's public key.
 *   3. AES-256-GCM encryption of the JSON payload using the shared secret.
 *
 * @param encryptedPayload   - The ciphertext (base64url).
 * @param ephemeralPublicKey - The provider's ephemeral public key (base64url).
 * @param agentPrivateKey    - The agent's X25519 private key as a CryptoKey.
 * @returns The decrypted JSON string.
 */
export async function decryptCredentials(
  encryptedPayload: string,
  ephemeralPublicKey: string,
  agentPrivateKey: CryptoKey,
): Promise<string> {
  // Import the provider's ephemeral public key
  const ephemeralRaw = base64urlDecode(ephemeralPublicKey);
  const ephemeralKey = await crypto.subtle.importKey(
    "raw",
    ephemeralRaw.buffer as ArrayBuffer,
    { name: "X25519" },
    true,
    [],
  );

  // Derive AES-256-GCM key via ECDH
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "X25519", public: ephemeralKey },
    agentPrivateKey,
    256,
  );

  const aesKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  // The first 12 bytes of the ciphertext are the IV
  const ciphertext = base64urlDecode(encryptedPayload);
  const iv = ciphertext.slice(0, 12);
  const data = ciphertext.slice(12);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    data,
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Generate an X25519 key pair for credential encryption.
 *
 * The public key should be included in the ProvisionRequest so the
 * provider can encrypt credentials specifically for this agent.
 */
export async function generateAgentKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey("X25519", true, [
    "deriveBits",
  ]) as Promise<CryptoKeyPair>;
}

/**
 * Export a CryptoKey as a base64url string (raw format).
 */
export async function exportKeyBase64url(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return base64urlEncode(new Uint8Array(raw));
}
