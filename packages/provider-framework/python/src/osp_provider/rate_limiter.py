"""
osp-provider in-memory rate limiter.

Implements the IETF draft rate limit headers as required by OSP spec Section 8.6:
    - RateLimit-Limit: Maximum requests per window
    - RateLimit-Remaining: Remaining requests in current window
    - RateLimit-Reset: Seconds until window resets

Uses a sliding window counter per client IP.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse


@dataclass
class RateLimiterConfig:
    """Configuration for the rate limiter."""

    window_seconds: float = 60.0
    """Window duration in seconds. Default: 60 (1 minute)."""

    max_requests: int = 60
    """Maximum requests within the window. Default: 60."""


@dataclass
class _RateLimitEntry:
    count: int = 0
    window_start: float = 0.0


class RateLimiter(BaseHTTPMiddleware):
    """
    Starlette/FastAPI middleware that enforces per-IP rate limits and
    adds OSP-compliant rate limit headers to all responses.

    Usage:
        from osp_provider import RateLimiter, RateLimiterConfig

        app.add_middleware(
            RateLimiter,
            config=RateLimiterConfig(window_seconds=60, max_requests=100),
        )
    """

    def __init__(self, app, config: RateLimiterConfig | None = None):
        super().__init__(app)
        self.config = config or RateLimiterConfig()
        self._store: dict[str, _RateLimitEntry] = {}
        self._last_cleanup: float = time.monotonic()

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        self._cleanup_expired()

        client_key = self._get_client_key(request)
        now = time.monotonic()

        entry = self._store.get(client_key)
        if entry is None or (now - entry.window_start) >= self.config.window_seconds:
            entry = _RateLimitEntry(count=0, window_start=now)
            self._store[client_key] = entry

        entry.count += 1

        remaining = max(0, self.config.max_requests - entry.count)
        reset_seconds = math.ceil(
            entry.window_start + self.config.window_seconds - now
        )

        # Check rate limit before processing
        if entry.count > self.config.max_requests:
            response = JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded. Please retry after the specified delay.",
                    "code": "rate_limited",
                    "details": {
                        "retry_after_seconds": reset_seconds,
                        "limit": self.config.max_requests,
                        "window_seconds": self.config.window_seconds,
                    },
                },
            )
            response.headers["RateLimit-Limit"] = str(self.config.max_requests)
            response.headers["RateLimit-Remaining"] = "0"
            response.headers["RateLimit-Reset"] = str(reset_seconds)
            response.headers["Retry-After"] = str(reset_seconds)
            return response

        # Process request normally
        response = await call_next(request)

        # Add IETF standard rate limit headers (OSP spec Section 8.6)
        response.headers["RateLimit-Limit"] = str(self.config.max_requests)
        response.headers["RateLimit-Remaining"] = str(remaining)
        response.headers["RateLimit-Reset"] = str(reset_seconds)

        return response

    def _get_client_key(self, request: Request) -> str:
        """Extract client identifier from the request."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"

    def _cleanup_expired(self) -> None:
        """Remove expired entries to prevent memory leaks."""
        now = time.monotonic()
        if now - self._last_cleanup < self.config.window_seconds * 2:
            return

        self._last_cleanup = now
        expired_keys = [
            key
            for key, entry in self._store.items()
            if now - entry.window_start >= self.config.window_seconds
        ]
        for key in expired_keys:
            del self._store[key]
