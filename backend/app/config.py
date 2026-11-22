"""Runtime configuration, read from environment variables only (no secrets in code)."""
from __future__ import annotations

import os
import shlex
from dataclasses import dataclass


def _bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    env: str                      # "dev" or "prod"
    db_path: str
    cookie_secure: bool           # must be true when served over HTTPS
    allowed_origins: tuple[str, ...]
    anthropic_api_key: str | None
    anthropic_model: str
    anthropic_url: str
    sandbox_enabled: bool
    sandbox_image: str
    docker_cmd: tuple[str, ...]   # e.g. ("docker",) or ("wsl", "-d", "Ubuntu-22.04", "-e", "docker")
    max_concurrent_runs: int
    session_days: int
    register_limit: int = 10      # new accounts per client address per hour


def load_settings() -> Settings:
    env = os.environ.get("APP_ENV", "dev").strip().lower()
    prod = env == "prod"
    origins = tuple(o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip())
    return Settings(
        env=env,
        db_path=os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "..", "data", "csquest.db")),
        cookie_secure=_bool("COOKIE_SECURE", prod),
        allowed_origins=origins,
        anthropic_api_key=(os.environ.get("ANTHROPIC_API_KEY") or None),
        anthropic_model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5-5"),
        anthropic_url=os.environ.get("ANTHROPIC_URL", "https://api.anthropic.com/v1/messages"),
        sandbox_enabled=_bool("SANDBOX_ENABLED", True),
        sandbox_image=os.environ.get("SANDBOX_IMAGE", "gcc:13-bookworm"),
        docker_cmd=tuple(shlex.split(os.environ.get("DOCKER_CMD", "docker"), posix=os.name != "nt")),
        max_concurrent_runs=int(os.environ.get("MAX_CONCURRENT_RUNS", "2")),
        session_days=int(os.environ.get("SESSION_DAYS", "14")),
        register_limit=int(os.environ.get("REGISTER_LIMIT_PER_HOUR", "10")),
    )
