"""osp:// URI resolver for Python.

Resolves ``osp://provider.com/offering/credential_key`` URIs to actual
credential values from the local vault or environment.

Usage::

    from osp.resolver import OSPResolver

    resolver = OSPResolver()
    resolver.add_credential("supabase.com", "postgres", {
        "connection_string": "postgres://...",
    })
    value = resolver.resolve("osp://supabase.com/postgres/connection_string")
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field

OSP_URI_REGEX = re.compile(r"^osp://([^/]+)/([^/]+)/(.+)$")


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

@dataclass
class ParsedOSPUri:
    provider: str
    offering: str
    key: str


# ---------------------------------------------------------------------------
# URI Parsing
# ---------------------------------------------------------------------------

def parse_osp_uri(uri: str) -> ParsedOSPUri | None:
    """Parse an osp:// URI into its components.

    Returns None if the URI is invalid.
    """
    match = OSP_URI_REGEX.match(uri)
    if not match:
        return None
    return ParsedOSPUri(
        provider=match.group(1),
        offering=match.group(2),
        key=match.group(3),
    )


def build_osp_uri(provider: str, offering: str, key: str) -> str:
    """Build an osp:// URI from components."""
    return f"osp://{provider}/{offering}/{key}"


def is_osp_uri(value: str) -> bool:
    """Check if a string is a valid osp:// URI."""
    return bool(OSP_URI_REGEX.match(value))


# ---------------------------------------------------------------------------
# Resolver
# ---------------------------------------------------------------------------

class OSPResolver:
    """Resolves osp:// URIs to credential values from an in-memory vault
    or environment variables.

    Parameters
    ----------
    env_fallback:
        If True, fall back to environment variables when a credential
        is not found in the vault.
    env_prefixes:
        Custom environment variable prefix mapping per provider.
    """

    def __init__(
        self,
        *,
        env_fallback: bool = True,
        env_prefixes: dict[str, str] | None = None,
    ) -> None:
        self._env_fallback = env_fallback
        self._env_prefixes = env_prefixes or {}
        # provider -> offering -> {key: value}
        self._credentials: dict[str, dict[str, dict[str, str]]] = {}

    def add_credential(
        self,
        provider: str,
        offering: str,
        credentials: dict[str, str],
    ) -> None:
        """Store credentials for a provider/offering pair."""
        self._credentials.setdefault(provider, {})[offering] = credentials

    def remove_credential(self, provider: str, offering: str) -> bool:
        """Remove credentials. Returns True if found and removed."""
        provider_map = self._credentials.get(provider)
        if provider_map is None:
            return False
        if offering not in provider_map:
            return False
        del provider_map[offering]
        return True

    def resolve(self, uri: str) -> str | None:
        """Resolve an osp:// URI to its credential value.

        Returns None if not found.
        """
        parsed = parse_osp_uri(uri)
        if parsed is None:
            return None

        # Try vault first
        creds = self._credentials.get(parsed.provider, {}).get(parsed.offering)
        if creds and parsed.key in creds:
            return creds[parsed.key]

        # Fallback to environment
        if self._env_fallback:
            return self._resolve_from_env(parsed)

        return None

    def resolve_all(self, env: dict[str, str]) -> dict[str, str]:
        """Resolve all osp:// URIs in a dict, returning resolved values."""
        result: dict[str, str] = {}
        for key, value in env.items():
            if is_osp_uri(value):
                resolved = self.resolve(value)
                result[key] = resolved if resolved is not None else value
            else:
                result[key] = value
        return result

    def list_uris(self) -> list[str]:
        """List all stored credentials as osp:// URIs."""
        uris: list[str] = []
        for provider, offerings in self._credentials.items():
            for offering, creds in offerings.items():
                for key in creds:
                    uris.append(build_osp_uri(provider, offering, key))
        return uris

    def generate_dotenv(
        self,
        *,
        framework: str = "plain",
    ) -> str:
        """Generate .env file content from stored credentials.

        Parameters
        ----------
        framework:
            Output format: "plain", "nextjs", or "vite".
        """
        lines: list[str] = []
        for provider, offerings in self._credentials.items():
            lines.append(f"# {provider}")
            for offering, creds in offerings.items():
                for key, value in creds.items():
                    env_key = key.upper()
                    if framework == "nextjs" and not env_key.startswith("NEXT_PUBLIC_"):
                        if any(kw in env_key for kw in ("ANON", "PUBLIC", "PUBLISHABLE")):
                            env_key = f"NEXT_PUBLIC_{env_key}"
                    elif framework == "vite" and not env_key.startswith("VITE_"):
                        if any(kw in env_key for kw in ("ANON", "PUBLIC", "PUBLISHABLE")):
                            env_key = f"VITE_{env_key}"
                    lines.append(
                        f"{env_key}={value} # osp://{provider}/{offering}/{key}"
                    )
            lines.append("")
        return "\n".join(lines)

    # -- internal ----------------------------------------------------------

    def _resolve_from_env(self, parsed: ParsedOSPUri) -> str | None:
        env_key = parsed.key.upper()
        prefix = self._env_prefixes.get(parsed.provider)
        if prefix:
            prefixed = os.environ.get(f"{prefix}{env_key}")
            if prefixed:
                return prefixed
        return os.environ.get(env_key)
