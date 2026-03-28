use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;

pub fn base64url_encode(data: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(data)
}

pub fn base64url_decode(s: &str) -> Result<Vec<u8>, base64::DecodeError> {
    URL_SAFE_NO_PAD.decode(s)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip() {
        let data = b"hello world";
        let encoded = base64url_encode(data);
        let decoded = base64url_decode(&encoded).unwrap();
        assert_eq!(data.as_slice(), &decoded);
    }

    #[test]
    fn no_padding() {
        let encoded = base64url_encode(b"a");
        assert!(!encoded.contains('='));
    }
}
