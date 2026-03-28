# OSP Conformance Tests

Test suites to verify that providers and agents correctly implement the Open Service Protocol.

## Provider Conformance

Tests that a provider correctly implements the 8 mandatory + optional endpoints.

### Levels

| Level | Requirements |
|-------|-------------|
| **Core** | manifest, provision, deprovision, status, health |
| **+Webhooks** | Core + webhook registration and delivery |
| **+Events** | +Webhooks + event stream endpoint |
| **+Escrow** | +Events + escrow-based payment flows |
| **Full** | All endpoints including estimate, share, delegate, snapshots, metrics, migration |

### Running

```bash
# Python
cd python && pytest -v

# Against a live provider
pytest -v --provider-url=https://api.example.com --api-key=test_key
```

## Agent Conformance

Tests that an agent correctly:
1. Fetches and verifies manifest signatures
2. Generates unique nonces
3. Encrypts/decrypts credential bundles
4. Handles async provisioning (polling + webhooks)
5. Serializes canonical JSON correctly
