use osp_crypto::{KeyPair, canonical::canonical_json_bytes};
use uuid::Uuid;

use crate::report::{TestResult, TestStatus};

/// Run agent conformance tests (local, no network required).
pub fn run_agent_tests() -> Vec<TestResult> {
    vec![
        test_manifest_verify(),
        test_nonce_generation(),
        test_credential_encryption(),
        test_canonical_json(),
    ]
}

fn test_manifest_verify() -> TestResult {
    let start = chrono::Utc::now();

    let kp = KeyPair::generate();
    let message = b"test manifest payload";
    let sig = kp.sign(message);

    match kp.public_key().verify(message, &sig) {
        Ok(()) => TestResult::new("agent_manifest_verify", TestStatus::Passed, start),
        Err(e) => TestResult::new(
            "agent_manifest_verify",
            TestStatus::Failed {
                reason: e.to_string(),
            },
            start,
        ),
    }
}

fn test_nonce_generation() -> TestResult {
    let start = chrono::Utc::now();

    let nonce = Uuid::new_v4().to_string();

    // Must be valid UUID v4
    if Uuid::parse_str(&nonce).is_err() {
        return TestResult::new(
            "agent_nonce_generation",
            TestStatus::Failed {
                reason: "generated nonce is not a valid UUID v4".to_string(),
            },
            start,
        );
    }

    // Must be at least 32 characters
    if nonce.len() < 32 {
        return TestResult::new(
            "agent_nonce_generation",
            TestStatus::Failed {
                reason: format!("nonce too short: {} chars", nonce.len()),
            },
            start,
        );
    }

    // Must not be nil UUID
    if nonce == "00000000-0000-0000-0000-000000000000" {
        return TestResult::new(
            "agent_nonce_generation",
            TestStatus::Failed {
                reason: "nonce is nil UUID".to_string(),
            },
            start,
        );
    }

    TestResult::new("agent_nonce_generation", TestStatus::Passed, start)
}

fn test_credential_encryption() -> TestResult {
    let start = chrono::Utc::now();

    let agent_kp = KeyPair::generate();
    let plaintext = br#"{"connection_uri":"postgresql://user:pass@host/db"}"#;

    let encrypted =
        match osp_crypto::encrypt_credentials(agent_kp.public_key().as_bytes(), plaintext) {
            Ok(e) => e,
            Err(e) => {
                return TestResult::new(
                    "agent_credential_encryption",
                    TestStatus::Failed {
                        reason: format!("encryption failed: {e}"),
                    },
                    start,
                );
            }
        };

    match osp_crypto::decrypt_credentials(&agent_kp, &encrypted) {
        Ok(decrypted) => {
            if decrypted == plaintext {
                TestResult::new("agent_credential_encryption", TestStatus::Passed, start)
            } else {
                TestResult::new(
                    "agent_credential_encryption",
                    TestStatus::Failed {
                        reason: "decrypted text does not match original".to_string(),
                    },
                    start,
                )
            }
        }
        Err(e) => TestResult::new(
            "agent_credential_encryption",
            TestStatus::Failed {
                reason: format!("decryption failed: {e}"),
            },
            start,
        ),
    }
}

fn test_canonical_json() -> TestResult {
    let start = chrono::Utc::now();

    let input = r#"{"zebra":1,"apple":{"banana":true,"aardvark":[3,1,2]},"mango":null,"price":{"amount":"25.00","currency":"USD"}}"#;
    let expected = r#"{"apple":{"aardvark":[3,1,2],"banana":true},"mango":null,"price":{"amount":"25.00","currency":"USD"},"zebra":1}"#;

    match canonical_json_bytes(input) {
        Ok(bytes) => {
            let result = String::from_utf8_lossy(&bytes);
            if result == expected {
                TestResult::new("agent_canonical_json", TestStatus::Passed, start)
            } else {
                TestResult::new(
                    "agent_canonical_json",
                    TestStatus::Failed {
                        reason: format!("expected: {expected}\ngot: {result}"),
                    },
                    start,
                )
            }
        }
        Err(e) => TestResult::new(
            "agent_canonical_json",
            TestStatus::Failed {
                reason: e.to_string(),
            },
            start,
        ),
    }
}
