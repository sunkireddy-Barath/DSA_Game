"""Password hashing (scrypt), opaque session tokens and a small in-memory rate limiter."""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import threading
import time
from collections import defaultdict, deque

SCRYPT_N, SCRYPT_R, SCRYPT_P = 2 ** 14, 8, 1


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=32)
    return "scrypt${}${}${}${}${}".format(SCRYPT_N, SCRYPT_R, SCRYPT_P, base64.b64encode(salt).decode(), base64.b64encode(dk).decode())


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt_b64, dk_b64 = stored.split("$")
        if scheme != "scrypt":
            return False
        salt, expected = base64.b64decode(salt_b64), base64.b64decode(dk_b64)
        dk = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=int(n), r=int(r), p=int(p), dklen=len(expected))
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


# A valid hash of a random password, verified against when the e-mail is unknown so that response time does not reveal which e-mails exist.
DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


def new_token() -> str:
    return secrets.token_urlsafe(32)


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class RateLimiter:
    """Sliding-window limiter keyed by string. Process-local (use a shared store such as Redis when running several workers)."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window_s: float, now: float | None = None) -> bool:
        t = time.monotonic() if now is None else now
        with self._lock:
            q = self._hits[key]
            while q and q[0] <= t - window_s:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(t)
            return True

    def count(self, key: str, window_s: float, now: float | None = None) -> int:
        """Hits recorded in the window, without recording a new one."""
        t = time.monotonic() if now is None else now
        with self._lock:
            q = self._hits.get(key)
            if not q:
                return 0
            while q and q[0] <= t - window_s:
                q.popleft()
            return len(q)

    def record(self, key: str, now: float | None = None) -> None:
        with self._lock:
            self._hits[key].append(time.monotonic() if now is None else now)

    def retry_after(self, key: str, window_s: float, now: float | None = None) -> int:
        t = time.monotonic() if now is None else now
        with self._lock:
            q = self._hits.get(key)
            if not q:
                return 0
            return max(1, int(q[0] + window_s - t) + 1)

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)
