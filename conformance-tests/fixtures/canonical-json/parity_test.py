"""
Canonical JSON parity test — Python

Loads the shared vector pack and verifies that the Python SDK's canonical_json()
produces identical output for every test vector.
"""

import json
import sys
from pathlib import Path

# Add the Python SDK to the import path
sdk_path = Path(__file__).resolve().parents[3] / "reference-implementation" / "python" / "src"
sys.path.insert(0, str(sdk_path))

from osp.manifest import canonical_json  # noqa: E402


def load_vectors() -> list[dict]:
    vectors_path = Path(__file__).parent / "vectors.json"
    with open(vectors_path) as f:
        data = json.load(f)
    return data["vectors"]


def test_canonical_json_parity():
    """Verify Python canonical_json matches every shared test vector."""
    vectors = load_vectors()
    passed = 0
    failed = 0

    for v in vectors:
        actual = canonical_json(v["input"])
        if actual == v["expected"]:
            passed += 1
        else:
            failed += 1
            print(f"FAIL [{v['id']}]: {v['description']}")
            print(f"  expected: {v['expected']}")
            print(f"  actual:   {actual}")

    print(f"\nCanonical JSON parity (Python): {passed}/{len(vectors)} passed")
    return failed == 0


if __name__ == "__main__":
    success = test_canonical_json_parity()
    sys.exit(0 if success else 1)
