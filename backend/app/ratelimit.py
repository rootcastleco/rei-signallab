"""
Per-instance fixed-window rate limiting.

Deliberately dependency-free and in-process: each Cloud Run instance enforces
its own budget. That is not a distributed quota, but it is what stops a single
client from saturating one instance's CPU with FFT or sandbox work. A shared
Redis-backed limiter is the next step if traffic is spread across many
instances.
"""

import threading
import time
from typing import Dict, Tuple

from fastapi import HTTPException, Request, status

from app.config import settings


class FixedWindowRateLimiter:
    """Thread-safe fixed-window counter keyed on ``(bucket, client)``."""

    def __init__(self, window_seconds: int):
        self.window_seconds = max(1, window_seconds)
        self._counters: Dict[Tuple[str, str], Tuple[int, int]] = {}
        self._lock = threading.Lock()

    def check(self, bucket: str, client: str, limit: int, now: float = None) -> Tuple[bool, int]:
        """
        Register a hit. Returns ``(allowed, retry_after_seconds)``.

        ``retry_after_seconds`` is only meaningful when ``allowed`` is False.
        """
        if limit <= 0:
            return True, 0

        timestamp = time.monotonic() if now is None else now
        window_id = int(timestamp // self.window_seconds)
        key = (bucket, client)

        with self._lock:
            stored_window, count = self._counters.get(key, (window_id, 0))

            if stored_window != window_id:
                stored_window, count = window_id, 0

            if count >= limit:
                window_end = (window_id + 1) * self.window_seconds
                return False, max(1, int(window_end - timestamp) + 1)

            self._counters[key] = (stored_window, count + 1)

            # Opportunistic eviction of stale windows keeps the map bounded
            # without a background sweeper.
            if len(self._counters) > 10000:
                self._counters = {
                    entry_key: entry
                    for entry_key, entry in self._counters.items()
                    if entry[0] == window_id
                }

            return True, 0

    def reset(self) -> None:
        with self._lock:
            self._counters.clear()


limiter = FixedWindowRateLimiter(settings.RATE_LIMIT_WINDOW_SECONDS)


def client_identity(request: Request) -> str:
    """
    Resolve the caller's address.

    Uvicorn runs with ``--proxy-headers``, so ``request.client.host`` is
    already the real peer behind Cloud Run; ``X-Forwarded-For`` is consulted
    first for deployments that terminate elsewhere.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        first_hop = forwarded.split(",")[0].strip()
        if first_hop:
            return first_hop
    return request.client.host if request.client else "unknown"


def enforce(request: Request, bucket: str, limit: int) -> None:
    """Raise HTTP 429 when ``bucket`` is exhausted for this caller."""
    if not settings.RATE_LIMIT_ENABLED:
        return

    allowed, retry_after = limiter.check(bucket, client_identity(request), limit)
    if allowed:
        return

    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "code": "RATE_LIMIT_EXCEEDED",
            "message": (
                f"Rate limit exceeded for '{bucket}': "
                f"{limit} requests per {settings.RATE_LIMIT_WINDOW_SECONDS}s."
            ),
            "details": {
                "bucket": bucket,
                "limit": limit,
                "windowSeconds": settings.RATE_LIMIT_WINDOW_SECONDS,
                "retryAfterSeconds": retry_after,
            },
        },
        headers={"Retry-After": str(retry_after)},
    )


def rate_limit(bucket: str, limit_attr: str):
    """
    Build a FastAPI dependency guarding a named bucket.

    ``limit_attr`` is read from settings on every call so that the limit stays
    configurable without re-importing the module.
    """

    def dependency(request: Request) -> None:
        enforce(request, bucket, getattr(settings, limit_attr))

    return dependency


#: Signal generation, FFT, graph execution — CPU-bound but bounded work.
compute_rate_limit = rate_limit("compute", "RATE_LIMIT_COMPUTE_PER_WINDOW")

#: Arbitrary user code. Deliberately the tightest bucket.
sandbox_rate_limit = rate_limit("sandbox", "RATE_LIMIT_SANDBOX_PER_WINDOW")
