# better Sardis Authentication

## better login --sardis

```
better login --sardis
```

Opens browser for Sardis OAuth flow. Stores credentials in platform keychain.

### Credential Storage

| Platform | Storage |
|----------|---------|
| macOS | Keychain Access |
| Linux | libsecret / GNOME Keyring |
| Windows | Windows Credential Manager |

### Session Management

```
better auth status          # Show current session
better auth logout          # Clear stored credentials
better auth refresh         # Force token refresh
```

### Token Flow

1. `better login --sardis` → opens browser OAuth
2. Callback receives access_token + refresh_token
3. Tokens stored in platform keychain
4. Auto-refresh on expiry
