# OSP Crypto Security Audit Checklist

## Scope

The `osp-core/crates/osp-crypto/` crate implements all cryptographic operations for OSP:

1. **Ed25519 signing/verification** — Manifest signatures, webhook authentication
2. **x25519 key exchange** — Diffie-Hellman shared secret for credential encryption
3. **XSalsa20-Poly1305** — Authenticated encryption of credential bundles
4. **Canonical JSON** — Deterministic serialization for signature stability

## Dependencies

| Crate | Version | Purpose | Audit Status |
|-------|---------|---------|--------------|
| `ed25519-dalek` | 2.x | Ed25519 signatures | RustCrypto, widely audited |
| `x25519-dalek` | 2.x | X25519 ECDH | RustCrypto, widely audited |
| `xsalsa20poly1305` | 0.9+ | AEAD encryption | RustCrypto |
| `rand` | 0.8+ | CSPRNG | Standard Rust randomness |
| `base64` | 0.22+ | Base64url encoding | No crypto sensitivity |

## Audit Areas

### 1. Key Generation
- [ ] Ed25519 keypairs generated from CSPRNG (OsRng)
- [ ] No seed reuse across keypairs
- [ ] Private keys zeroed on drop (zeroize trait)
- [ ] Key serialization uses base64url-no-pad consistently

### 2. Manifest Signing
- [ ] Sign(canonical_json(manifest_without_signature), private_key)
- [ ] `provider_signature` field excluded before signing
- [ ] Canonical JSON is deterministic (sorted keys, no whitespace, UTF-8 normalized)
- [ ] Verification rejects modified manifests
- [ ] Verification rejects wrong public key
- [ ] No timing side channels in verification

### 3. Credential Encryption
- [ ] Ephemeral x25519 keypair generated per encryption
- [ ] Ed25519 → x25519 key conversion is correct (Edwards → Montgomery)
- [ ] Shared secret computed correctly (ephemeral_private * recipient_public)
- [ ] Nonce is random (24 bytes from CSPRNG)
- [ ] XSalsa20-Poly1305 used correctly (not raw XSalsa20)
- [ ] Authentication tag verified before decryption
- [ ] Ephemeral public key transmitted alongside ciphertext
- [ ] Shared secret zeroed after use
- [ ] No nonce reuse (random 24-byte nonces have negligible collision probability)

### 4. Canonical JSON
- [ ] Keys sorted lexicographically at all nesting levels
- [ ] No whitespace between tokens
- [ ] Unicode escaping consistent
- [ ] Numbers serialized without trailing zeros
- [ ] Matches spec Appendix E test vectors exactly

### 5. General
- [ ] No use of `unsafe` in crypto code
- [ ] No custom cryptographic primitives (only RustCrypto)
- [ ] Error types don't leak sensitive information
- [ ] Constant-time comparison for signature verification
- [ ] No logging of private keys or plaintexts
- [ ] WASM build doesn't expose internals

## Test Vectors

Spec Appendix E provides test vectors for:
- Ed25519 sign/verify with known keys
- Canonical JSON serialization
- Credential encryption/decryption roundtrip

All vectors must pass in: Rust, TypeScript, Python, Go implementations.

## Recommended External Auditors

1. **Trail of Bits** — Extensive Rust crypto audit experience
2. **NCC Group** — Protocol-level review capability
3. **Cure53** — Web crypto and protocol audits
4. **Sigma Prime** — Rust-focused security firm

## Timeline

- Internal review: Before public launch
- External audit: Engage 4-6 weeks before launch target
- Bug bounty: Activate on launch day
