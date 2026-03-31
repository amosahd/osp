"""Shared fixtures for OSP conformance tests."""

import sys
import pytest
import json
from pathlib import Path

SCHEMAS_DIR = Path(__file__).parent.parent.parent / "schemas"
EXAMPLES_DIR = SCHEMAS_DIR / "examples"

# Make badges package importable
sys.path.insert(0, str(Path(__file__).parent))


def pytest_addoption(parser):
    parser.addoption(
        "--provider-url",
        action="store",
        default=None,
        help="Live provider URL to test against",
    )
    parser.addoption(
        "--api-key",
        action="store",
        default=None,
        help="API key for live provider testing",
    )
    parser.addoption(
        "--badge-output",
        action="store",
        default=None,
        help="Directory to write conformance badge SVGs after test run",
    )
    parser.addoption(
        "--badge-provider",
        action="store",
        default=None,
        help="Provider name to include in generated badges",
    )


@pytest.fixture
def provider_url(request):
    return request.config.getoption("--provider-url")


@pytest.fixture
def api_key(request):
    return request.config.getoption("--api-key")


@pytest.fixture
def schemas():
    """Load all JSON schemas."""
    result = {}
    for schema_file in SCHEMAS_DIR.glob("*.schema.json"):
        with open(schema_file) as f:
            result[schema_file.stem] = json.load(f)
    return result


@pytest.fixture
def example_manifests():
    """Load all example manifest files."""
    result = {}
    for example_file in EXAMPLES_DIR.glob("*-manifest.json"):
        with open(example_file) as f:
            result[example_file.stem] = json.load(f)
    return result


@pytest.fixture
def example_provisions():
    """Load all example provision request/response files."""
    result = {}
    for example_file in EXAMPLES_DIR.glob("provision-*.json"):
        with open(example_file) as f:
            result[example_file.stem] = json.load(f)
    return result


# ---------------------------------------------------------------------------
# Badge generation plugin -- auto-generates SVG badges after test runs
# ---------------------------------------------------------------------------

# Map test class prefixes to conformance levels
_LEVEL_MARKERS = {
    "core": [
        "TestManifestSchema",
        "TestProvisionRequestSchema",
        "TestEndpointPaths",
        "TestPaymentMethods",
        "TestCanonicalJSON",
        "TestNonceGeneration",
        "TestManifestSignatureVerification",
        "TestCredentialBundleFormat",
        "TestErrorHandling",
    ],
    "paid-core": [
        "TestManifestSchema",
        "TestProvisionRequestSchema",
        "TestEndpointPaths",
        "TestPaymentMethods",
        "TestCanonicalJSON",
        "TestNonceGeneration",
        "TestManifestSignatureVerification",
        "TestCredentialBundleFormat",
        "TestErrorHandling",
        "TestIdempotencyKeyFormat",
        "TestIdempotentProvisionRetry",
    ],
    "webhooks": ["TestLiveProviderDiscovery"],
    "events": [],
    "escrow": [],
    "full": ["TestLiveProviderProvisioning"],
}


def pytest_sessionfinish(session, exitstatus):
    """Generate conformance badges after the test session completes."""
    badge_output = session.config.getoption("--badge-output", default=None)
    if not badge_output:
        return

    from badges.generate_badges import generate_badge

    output_dir = Path(badge_output)
    output_dir.mkdir(parents=True, exist_ok=True)

    provider = session.config.getoption("--badge-provider", default=None)

    # Collect per-class pass/fail from the test reports
    class_results: dict[str, bool] = {}
    for item in session.items:
        cls_name = item.cls.__name__ if item.cls else None
        if cls_name is None:
            continue
        # A class passes only if all its tests passed
        reports = getattr(item, "_report_sections_by_key", {})
        passed = not any(
            report.failed
            for report in (getattr(item, "_reports", None) or [])
        )
        # Use the simpler approach: check exit status per nodeid
        if cls_name not in class_results:
            class_results[cls_name] = True

    # Walk through the terminal reporter to get accurate results
    reporter = session.config.pluginmanager.get_plugin("terminalreporter")
    if reporter:
        for report in reporter.getreports("failed"):
            cls_name = _extract_class(report.nodeid)
            if cls_name:
                class_results[cls_name] = False

    # Determine pass/fail for each conformance level
    for level, required_classes in _LEVEL_MARKERS.items():
        if not required_classes:
            # Levels with no mapped test classes: derive from overall exit
            status = "pass" if exitstatus == 0 else "fail"
        else:
            status = "pass"
            for cls in required_classes:
                if class_results.get(cls) is False:
                    status = "fail"
                    break

        svg = generate_badge(level, status=status, provider=provider)
        suffix = "pass" if status == "pass" else "fail"
        if provider:
            filename = f"osp-{level}-{provider}-{suffix}.svg"
        else:
            filename = f"osp-{level}-{suffix}.svg"
        (output_dir / filename).write_text(svg, encoding="utf-8")

    # Always generate a summary badge (core level = overall)
    overall_status = "pass" if exitstatus == 0 else "fail"
    svg = generate_badge("core", status=overall_status, provider=provider)
    suffix = "pass" if overall_status == "pass" else "fail"
    summary_name = f"osp-conformance-{suffix}.svg"
    (output_dir / summary_name).write_text(svg, encoding="utf-8")


def _extract_class(nodeid: str) -> str | None:
    """Extract test class name from a pytest node ID like 'file.py::Class::method'."""
    parts = nodeid.split("::")
    if len(parts) >= 2:
        return parts[1]
    return None
