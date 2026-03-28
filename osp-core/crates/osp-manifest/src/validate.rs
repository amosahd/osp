use jsonschema::JSONSchema;
use serde_json::Value;

use crate::error::ManifestError;

/// Validate a JSON value against a JSON Schema.
pub fn validate_against_schema(instance: &Value, schema: &Value) -> Result<(), ManifestError> {
    let compiled = JSONSchema::compile(schema).map_err(|e| ManifestError::Invalid(e.to_string()))?;

    let result = compiled.validate(instance);
    if let Err(errors) = result {
        let error_messages: Vec<String> = errors
            .map(|e| format!("{} at {}", e, e.instance_path))
            .collect();
        return Err(ManifestError::SchemaValidationError {
            errors: error_messages,
        });
    }

    Ok(())
}

/// Validate a manifest JSON against the built-in ServiceManifest schema.
pub fn validate_manifest(manifest_json: &Value) -> Result<(), ManifestError> {
    // Basic structural validation without requiring the full JSON Schema file
    let obj = manifest_json
        .as_object()
        .ok_or_else(|| ManifestError::Invalid("manifest must be a JSON object".to_string()))?;

    let required_fields = [
        "osp_version",
        "manifest_id",
        "manifest_version",
        "published_at",
        "provider",
        "offerings",
        "accepted_payment_methods",
        "endpoints",
        "provider_signature",
        "provider_public_key",
    ];

    let mut missing: Vec<String> = Vec::new();
    for field in &required_fields {
        if !obj.contains_key(*field) {
            missing.push(field.to_string());
        }
    }

    if !missing.is_empty() {
        return Err(ManifestError::SchemaValidationError {
            errors: missing
                .iter()
                .map(|f| format!("missing required field: {f}"))
                .collect(),
        });
    }

    // Validate osp_version
    if let Some(version) = obj.get("osp_version").and_then(|v| v.as_str()) {
        if version != "1.0" {
            return Err(ManifestError::Invalid(format!(
                "unsupported osp_version: {version}"
            )));
        }
    }

    // Validate offerings is non-empty array
    if let Some(offerings) = obj.get("offerings").and_then(|v| v.as_array()) {
        if offerings.is_empty() {
            return Err(ManifestError::Invalid(
                "offerings must contain at least one offering".to_string(),
            ));
        }
    }

    Ok(())
}

/// Validate a ProvisionRequest JSON.
pub fn validate_provision_request(request_json: &Value) -> Result<(), ManifestError> {
    let obj = request_json
        .as_object()
        .ok_or_else(|| ManifestError::Invalid("request must be a JSON object".to_string()))?;

    let required_fields = ["offering_id", "tier_id", "payment_method", "nonce"];
    let mut missing: Vec<String> = Vec::new();
    for field in &required_fields {
        if !obj.contains_key(*field) {
            missing.push(field.to_string());
        }
    }

    if !missing.is_empty() {
        return Err(ManifestError::SchemaValidationError {
            errors: missing
                .iter()
                .map(|f| format!("missing required field: {f}"))
                .collect(),
        });
    }

    // Validate nonce length (>= 32 chars or UUID format)
    if let Some(nonce) = obj.get("nonce").and_then(|v| v.as_str()) {
        if nonce.len() < 32 && !is_valid_uuid(nonce) {
            return Err(ManifestError::Invalid(
                "nonce must be at least 32 characters or a valid UUID".to_string(),
            ));
        }
    }

    Ok(())
}

fn is_valid_uuid(s: &str) -> bool {
    uuid::Uuid::parse_str(s).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn validate_valid_manifest() {
        let manifest = json!({
            "osp_version": "1.0",
            "manifest_id": "test-001",
            "manifest_version": 1,
            "published_at": "2026-01-01T00:00:00Z",
            "provider": {"provider_id": "test", "display_name": "Test", "homepage_url": "https://test.com"},
            "offerings": [{"offering_id": "test/db"}],
            "accepted_payment_methods": ["free"],
            "endpoints": {"base_url": "https://test.com"},
            "provider_signature": "sig",
            "provider_public_key": "key"
        });
        validate_manifest(&manifest).unwrap();
    }

    #[test]
    fn validate_missing_field() {
        let manifest = json!({"osp_version": "1.0"});
        let result = validate_manifest(&manifest);
        assert!(result.is_err());
    }

    #[test]
    fn validate_empty_offerings() {
        let manifest = json!({
            "osp_version": "1.0",
            "manifest_id": "test-001",
            "manifest_version": 1,
            "published_at": "2026-01-01T00:00:00Z",
            "provider": {},
            "offerings": [],
            "accepted_payment_methods": ["free"],
            "endpoints": {"base_url": "https://test.com"},
            "provider_signature": "sig",
            "provider_public_key": "key"
        });
        assert!(validate_manifest(&manifest).is_err());
    }

    #[test]
    fn validate_provision_request_valid() {
        let req = json!({
            "offering_id": "test/db",
            "tier_id": "free",
            "payment_method": "free",
            "nonce": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
        });
        validate_provision_request(&req).unwrap();
    }

    #[test]
    fn validate_provision_request_short_nonce() {
        let req = json!({
            "offering_id": "test/db",
            "tier_id": "free",
            "payment_method": "free",
            "nonce": "12345"
        });
        assert!(validate_provision_request(&req).is_err());
    }
}
