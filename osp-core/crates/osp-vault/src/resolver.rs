use crate::error::VaultError;
use crate::store::Vault;

/// Parsed osp:// URI.
///
/// Format: `osp://{provider}/{offering}/{credential_key}`
/// Example: `osp://supabase/managed-postgres/connection_uri`
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OspUri {
    pub provider: String,
    pub offering: String,
    pub credential_key: String,
}

impl OspUri {
    /// Parse an `osp://` URI string.
    pub fn parse(uri: &str) -> Result<Self, VaultError> {
        let stripped = uri
            .strip_prefix("osp://")
            .ok_or_else(|| VaultError::InvalidUri(format!("must start with osp://: {uri}")))?;

        let parts: Vec<&str> = stripped.splitn(3, '/').collect();
        if parts.len() != 3 {
            return Err(VaultError::InvalidUri(format!(
                "expected osp://provider/offering/key, got: {uri}"
            )));
        }

        Ok(Self {
            provider: parts[0].to_string(),
            offering: parts[1].to_string(),
            credential_key: parts[2].to_string(),
        })
    }

    /// The vault lookup key (provider/offering).
    pub fn vault_key(&self) -> String {
        format!("{}/{}", self.provider, self.offering)
    }

    /// Resolve this URI against a vault, returning the credential value.
    pub fn resolve<'a>(&self, vault: &'a Vault) -> Result<&'a str, VaultError> {
        vault.get_credential_value(&self.vault_key(), &self.credential_key)
    }
}

/// Resolve an osp:// URI string against a vault.
pub fn resolve_uri<'a>(uri: &str, vault: &'a Vault) -> Result<&'a str, VaultError> {
    let parsed = OspUri::parse(uri)?;
    parsed.resolve(vault)
}

/// Expand all osp:// references in a string, replacing them with resolved values.
pub fn expand_osp_uris(input: &str, vault: &Vault) -> Result<String, VaultError> {
    let mut result = input.to_string();
    let mut start = 0;

    while let Some(idx) = result[start..].find("osp://") {
        let abs_idx = start + idx;
        // Find the end of the URI (whitespace, quote, or end of string)
        let end = result[abs_idx..]
            .find(|c: char| c.is_whitespace() || c == '"' || c == '\'' || c == ',' || c == '}')
            .map(|i| abs_idx + i)
            .unwrap_or(result.len());

        let uri = &result[abs_idx..end];
        let resolved = resolve_uri(uri, vault)?;
        result.replace_range(abs_idx..end, resolved);
        start = abs_idx + resolved.len();
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_valid_uri() {
        let uri = OspUri::parse("osp://supabase/managed-postgres/connection_uri").unwrap();
        assert_eq!(uri.provider, "supabase");
        assert_eq!(uri.offering, "managed-postgres");
        assert_eq!(uri.credential_key, "connection_uri");
        assert_eq!(uri.vault_key(), "supabase/managed-postgres");
    }

    #[test]
    fn parse_invalid_prefix() {
        assert!(OspUri::parse("http://supabase/db/key").is_err());
    }

    #[test]
    fn parse_missing_parts() {
        assert!(OspUri::parse("osp://supabase/db").is_err());
        assert!(OspUri::parse("osp://supabase").is_err());
    }
}
