"""Utilities for fetching, validating, and querying OSP manifests.

These helpers are used by :class:`osp.client.OSPClient` and can also be used
directly when you need lower-level manifest operations.
"""

from __future__ import annotations

import httpx

from osp.types import ServiceManifest, ServiceOffering, ServiceTier

WELL_KNOWN_PATH = "/.well-known/osp.json"


async def fetch_manifest(
    provider_url: str,
    *,
    client: httpx.AsyncClient | None = None,
    timeout: float = 10.0,
) -> ServiceManifest:
    """Fetch a provider's manifest from its ``/.well-known/osp.json`` endpoint.

    Parameters
    ----------
    provider_url:
        Base URL of the provider (e.g. ``https://db.example.com``).
    client:
        Optional pre-existing *httpx* async client.  When *None* a temporary
        client is created (and closed) for the request.
    timeout:
        HTTP request timeout in seconds.

    Returns
    -------
    ServiceManifest
        Parsed and validated manifest.

    Raises
    ------
    httpx.HTTPStatusError
        If the provider returns a non-2xx status.
    pydantic.ValidationError
        If the response body does not conform to the manifest schema.
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
    """Verify the detached signature on a manifest (stub).

    Real implementations would verify against a public key registry or a
    well-known JWK set.  This reference implementation always returns *True*
    when a signature is present and *False* when it is absent.

    Parameters
    ----------
    manifest:
        The manifest whose ``signature`` field should be checked.

    Returns
    -------
    bool
        *True* if the signature is present (verification is stubbed),
        *False* if no signature is set.
    """
    if manifest.signature is None:
        return False
    # TODO: implement real JWS / JWK verification
    return True


def find_offering(manifest: ServiceManifest, service_id: str) -> ServiceOffering | None:
    """Look up a :class:`ServiceOffering` by its ``id``.

    Parameters
    ----------
    manifest:
        Manifest to search.
    service_id:
        The offering identifier to match.

    Returns
    -------
    ServiceOffering | None
        The matching offering, or *None* if not found.
    """
    for offering in manifest.services:
        if offering.id == service_id:
            return offering
    return None


def find_tier(offering: ServiceOffering, tier_id: str) -> ServiceTier | None:
    """Look up a :class:`ServiceTier` within an offering by its ``id``.

    Parameters
    ----------
    offering:
        The offering to search.
    tier_id:
        The tier identifier to match.

    Returns
    -------
    ServiceTier | None
        The matching tier, or *None* if not found.
    """
    for tier in offering.tiers:
        if tier.id == tier_id:
            return tier
    return None


def find_offering_and_tier(
    manifest: ServiceManifest,
    service_id: str,
    tier_id: str,
) -> tuple[ServiceOffering | None, ServiceTier | None]:
    """Convenience helper to look up both an offering and a tier in one call.

    Parameters
    ----------
    manifest:
        Manifest to search.
    service_id:
        The offering identifier.
    tier_id:
        The tier identifier within that offering.

    Returns
    -------
    tuple[ServiceOffering | None, ServiceTier | None]
        A two-tuple.  Either element may be *None* if not found.
    """
    offering = find_offering(manifest, service_id)
    if offering is None:
        return None, None
    tier = find_tier(offering, tier_id)
    return offering, tier
