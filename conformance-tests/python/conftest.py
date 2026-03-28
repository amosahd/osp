"""Shared fixtures for OSP conformance tests."""

import pytest
import json
from pathlib import Path

SCHEMAS_DIR = Path(__file__).parent.parent.parent / "schemas"
EXAMPLES_DIR = SCHEMAS_DIR / "examples"


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
