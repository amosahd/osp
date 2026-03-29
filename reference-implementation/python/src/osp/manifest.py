"""Utilities for fetching, validating, and querying OSP manifests.

These helpers are used by :class:`osp.client.OSPClient` and can also be used
directly when you need lower-level manifest operations.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field

import httpx

from osp.types import ServiceManifest, ServiceOffering, ServiceTier

WELL_KNOWN_PATH = "/.well-known/osp.json"
DEFAULT_CACHE_TTL = 3600.0  # 1 hour in seconds


# ---------------------------------------------------------------------------
# Manifest Cache with TTL
# ---------------------------------------------------------------------------

@dataclass
class _CacheEntry:
    """Internal cache entry storing a manifest and its fetch timestamp."""
    manifest: ServiceManifest
    fetched_at: float


class ManifestCache:
    """In-memory manifest cache with a configurable TTL (default 1 hour).

    Usage::

        cache = ManifestCache()
        cache.set("https://provider.com", manifest)
        hit = cache.get("https://provider.com")  # returns manifest or None
        cache.clear()
    """

    def __init__(self, ttl: float = DEFAULT_CACHE_TTL) -> None:
        self._ttl = ttl
        self._entries: dict[str, _CacheEntry] = {}

    def get(self, key: str) -> ServiceManifest | None:
        """Return a cached manifest if present and not expired."""
        entry = self._entries.get(key)
        if entry is None:
            return None
        if (time.monotonic() - entry.fetched_at) > self._ttl:
            del self._entries[key]
            return None
        return entry.manifest

    def set(self, key: str, manifest: ServiceManifest) -> None:
        """Store a manifest in the cache with the current timestamp."""
        self._entries[key] = _CacheEntry(
            manifest=manifest,
            fetched_at=time.monotonic(),
        )

    def clear(self) -> None:
        """Remove all cached manifests."""
        self._entries.clear()

    def clear_cache(self) -> None:
        """Alias for :meth:`clear` — removes all cached manifests."""
        self.clear()


async def fetch_manifest(
    provider_url: str,
    *,
    client: httpx.AsyncClient | None = None,
    timeout: float = 10.0,
) -> ServiceManifest:
    """Fetch a provider's manifest from its /.well-known/osp.json endpoint.

    Parameters
    ----------
    provider_url:
        Base URL of the provider (e.g. ``https://supabase.com``).
    client:
        Optional pre-existing httpx async client.
    timeout:
        HTTP request timeout in seconds.

    Returns
    -------
    ServiceManifest
        Parsed and validated manifest.
    """
    url = provider_url.rstrip("/") + WELL_KNOWN_PATH
    owns_client = client is None
    if owns_client:
        client = httpx.AsyncClient(timeout=timeout)
    try:
        response = await client.get(url)
        response.raise_for_status()
        return ServiceManifest.model_validate(response.json())
    finally:
        if owns_client:
            await client.aclose()


def verify_manifest_signature(manifest: ServiceManifest) -> bool:
    """Verify the Ed25519 signature on a manifest.

    The provider signs the canonical JSON of the manifest excluding the
    ``provider_signature`` field. Returns False when key or signature is
    missing.

    This reference implementation uses a stub — real implementations
    should verify against the provider's public key.
    """
    if not manifest.provider_public_key or not manifest.provider_signature:
        return False
    # TODO: implement real Ed25519 verification
    return True


def canonical_json(obj: object) -> str:
    """Produce canonical JSON by sorting keys recursively.

    This is the payload format that providers sign.
    """
    return json.dumps(_sort_keys(obj), separators=(",", ":"))


def _sort_keys(value: object) -> object:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, list):
        return [_sort_keys(item) for item in value]
    if isinstance(value, dict):
        return {k: _sort_keys(v) for k, v in sorted(value.items())}
    return value


def find_offering(
    manifest: ServiceManifest,
    offering_id: str,
) -> ServiceOffering | None:
    """Look up a ServiceOffering by its offering_id."""
    for offering in manifest.offerings:
        if offering.offering_id == offering_id:
            return offering
    return None


def find_tier(offering: ServiceOffering, tier_id: str) -> ServiceTier | None:
    """Look up a ServiceTier within an offering by its tier_id."""
    for tier in offering.tiers:
        if tier.tier_id == tier_id:
            return tier
    return None


def find_offering_and_tier(
    manifest: ServiceManifest,
    offering_id: str,
    tier_id: str,
) -> tuple[ServiceOffering | None, ServiceTier | None]:
    """Convenience helper to look up both an offering and a tier."""
    offering = find_offering(manifest, offering_id)
    if offering is None:
        return None, None
    tier = find_tier(offering, tier_id)
    return offering, tier
