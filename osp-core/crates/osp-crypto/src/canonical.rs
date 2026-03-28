use serde_json::Value;
use std::io::Write;

use crate::error::CryptoError;

/// Produce the canonical JSON serialization of a JSON value.
///
/// Rules from OSP spec Appendix E.3:
/// - Object keys sorted lexicographically at all nesting levels
/// - Array element order preserved (NOT sorted)
/// - No whitespace between tokens
/// - Null represented as `null` literal
pub fn canonical_json(value: &Value) -> Result<String, CryptoError> {
    let mut buf = Vec::new();
    write_canonical(&mut buf, value)?;
    String::from_utf8(buf).map_err(|e| {
        CryptoError::JsonError(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            e,
        )))
    })
}

/// Produce the canonical JSON bytes from a JSON string, useful for signing.
pub fn canonical_json_bytes(json_str: &str) -> Result<Vec<u8>, CryptoError> {
    let value: Value = serde_json::from_str(json_str)?;
    let mut buf = Vec::new();
    write_canonical(&mut buf, &value)?;
    Ok(buf)
}

fn write_canonical<W: Write>(w: &mut W, value: &Value) -> Result<(), CryptoError> {
    match value {
        Value::Null => {
            w.write_all(b"null")
                .map_err(|e| CryptoError::JsonError(serde_json::Error::io(e)))?;
        }
        Value::Bool(b) => {
            let s = if *b { "true" } else { "false" };
            w.write_all(s.as_bytes())
                .map_err(|e| CryptoError::JsonError(serde_json::Error::io(e)))?;
        }
        Value::Number(n) => {
            write!(w, "{n}")
                .map_err(|e| CryptoError::JsonError(serde_json::Error::io(e)))?;
        }
        Value::String(s) => {
            let escaped = serde_json::to_string(s)?;
            w.write_all(escaped.as_bytes())
                .map_err(|e| CryptoError::JsonError(serde_json::Error::io(e)))?;
        }
        Value::Array(arr) => {
            w.write_all(b"[")
                .map_err(|e| CryptoError::JsonError(serde_json::Error::io(e)))?;
            for (i, item) in arr.iter().enumerate() {
                if i > 0 {
                    w.write_all(b",")
                        .map_err(|e| CryptoError::JsonError(serde_json::Error::io(e)))?;
                }
                write_canonical(w, item)?;
            }
            w.write_all(b"]")
                .map_err(|e| CryptoError::JsonError(serde_json::Error::io(e)))?;
        }
        Value::Object(map) => {
            let mut keys: Vec<&String> = map.keys().collect();
            keys.sort();
            w.write_all(b"{")
                .map_err(|e| CryptoError::JsonError(serde_json::Error::io(e)))?;
            for (i, key) in keys.iter().enumerate() {
                if i > 0 {
                    w.write_all(b",")
                        .map_err(|e| CryptoError::JsonError(serde_json::Error::io(e)))?;
                }
                let escaped_key = serde_json::to_string(key)?;
                w.write_all(escaped_key.as_bytes())
                    .map_err(|e| CryptoError::JsonError(serde_json::Error::io(e)))?;
                w.write_all(b":")
                    .map_err(|e| CryptoError::JsonError(serde_json::Error::io(e)))?;
                write_canonical(w, &map[*key])?;
            }
            w.write_all(b"}")
                .map_err(|e| CryptoError::JsonError(serde_json::Error::io(e)))?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    /// Test vector from OSP spec Appendix E.3
    #[test]
    fn spec_appendix_e3_canonical() {
        let input = json!({
            "zebra": 1,
            "apple": {"banana": true, "aardvark": [3, 1, 2]},
            "mango": null,
            "price": {"amount": "25.00", "currency": "USD"}
        });

        let expected = r#"{"apple":{"aardvark":[3,1,2],"banana":true},"mango":null,"price":{"amount":"25.00","currency":"USD"},"zebra":1}"#;

        let result = canonical_json(&input).unwrap();
        assert_eq!(result, expected);
    }

    #[test]
    fn keys_sorted_at_all_levels() {
        let input = json!({"z": {"b": 1, "a": 2}, "a": 0});
        let result = canonical_json(&input).unwrap();
        assert_eq!(result, r#"{"a":0,"z":{"a":2,"b":1}}"#);
    }

    #[test]
    fn arrays_preserve_order() {
        let input = json!({"arr": [3, 1, 2]});
        let result = canonical_json(&input).unwrap();
        assert_eq!(result, r#"{"arr":[3,1,2]}"#);
    }

    #[test]
    fn null_preserved() {
        let input = json!({"key": null});
        let result = canonical_json(&input).unwrap();
        assert_eq!(result, r#"{"key":null}"#);
    }

    #[test]
    fn no_whitespace() {
        let input = json!({"a": 1, "b": [1, 2], "c": {"d": true}});
        let result = canonical_json(&input).unwrap();
        assert!(!result.contains(' '));
        assert!(!result.contains('\n'));
    }

    #[test]
    fn canonical_json_bytes_from_string() {
        let input = r#"{"zebra":1,"apple":2}"#;
        let bytes = canonical_json_bytes(input).unwrap();
        let result = String::from_utf8(bytes).unwrap();
        assert_eq!(result, r#"{"apple":2,"zebra":1}"#);
    }
}
