"""Shared application context and request dependencies (authentication, CSRF guard, client IP)."""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Any, Callable

from fastapi import HTTPException, Request

from .config import Settings
from .db import Database
from .security import RateLimiter, token_digest

COOKIE = "cq_session"
CSRF_HEADER = "x-requested-with"
CSRF_VALUE = "csquest"


@dataclass
class Ctx:
    settings: Settings
    db: Database
    limiter: RateLimiter = field(default_factory=RateLimiter)
    run_slots: threading.BoundedSemaphore = field(default=None)  # type: ignore[assignment]
    # injectable for tests: runner(settings, source, stdin, std, run_timeout) -> RawResult
    runner: Callable[..., Any] | None = None
    batch_runner: Callable[..., Any] | None = None
    # injectable for tests: factory returning an httpx.Client used for the LLM call
    http_client: Callable[[], Any] | None = None
    sandbox_cache: tuple[float, bool, str] = (0.0, False, "")
    trust_proxy: bool = False

    def __post_init__(self) -> None:
        if self.run_slots is None:
            self.run_slots = threading.BoundedSemaphore(self.settings.max_concurrent_runs)


def ctx_of(request: Request) -> Ctx:
    return request.app.state.ctx


def client_ip(request: Request) -> str:
    ctx = ctx_of(request)
    if ctx.trust_proxy:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def csrf_guard(request: Request) -> None:
    """State-changing requests must carry a custom header. Browsers cannot add it on cross-site requests without a
    CORS pre-flight, which this API only answers for the configured origins."""
    if request.method not in ("GET", "HEAD", "OPTIONS") and request.headers.get(CSRF_HEADER) != CSRF_VALUE:
        raise HTTPException(status_code=403, detail="missing CSRF header")


def current_user(request: Request) -> dict:
    ctx = ctx_of(request)
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="not signed in")
    now = int(time.time())
    with ctx.db.conn() as c:
        row = c.execute(
            "SELECT u.id, u.email, u.display_name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
            (token_digest(token), now),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="session expired")
    return {"id": row["id"], "email": row["email"], "displayName": row["display_name"]}
