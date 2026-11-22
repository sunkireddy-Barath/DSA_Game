import os
import shlex
import shutil
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402
from app.sandbox import RawResult  # noqa: E402


def default_docker_cmd() -> tuple[str, ...]:
    if os.environ.get("DOCKER_CMD"):
        return tuple(shlex.split(os.environ["DOCKER_CMD"], posix=os.name != "nt"))
    if shutil.which("docker"):
        return ("docker",)
    if os.name == "nt":  # developer machines that keep Docker inside WSL
        return ("wsl", "-d", "Ubuntu-22.04", "-e", "docker")
    return ("docker",)


def make_settings(**kw) -> Settings:
    base = dict(env="dev", db_path=":memory:", cookie_secure=False, allowed_origins=("http://localhost:5173",),
                anthropic_api_key=None, anthropic_model="test-model", anthropic_url="https://api.anthropic.test/v1/messages",
                sandbox_enabled=True, sandbox_image="gcc:13-bookworm", docker_cmd=default_docker_cmd(), max_concurrent_runs=2, session_days=14)
    base.update(kw)
    return Settings(**base)


CSRF = {"X-Requested-With": "csquest"}


@pytest.fixture
def make_client():
    def _make(runner=None, http_client=None, batch_runner=None, **settings_kw):
        app = create_app(make_settings(**settings_kw), runner=runner, http_client=http_client, trust_proxy=False, batch_runner=batch_runner)
        return TestClient(app, headers=CSRF)
    return _make


@pytest.fixture
def client(make_client):
    return make_client()


@pytest.fixture
def signed_in(make_client):
    def _make(**kw):
        c = make_client(**kw)
        r = c.post("/api/auth/register", json={"email": "ada@example.com", "password": "correct horse battery", "displayName": "Ada"})
        assert r.status_code == 201, r.text
        return c
    return _make


def ok_result(stdout="", **kw) -> RawResult:
    return RawResult(compiled=True, run_rc=0, ms=3, stdout=stdout, **kw)


def docker_ready() -> bool:
    from app.sandbox import sandbox_available
    return sandbox_available(make_settings())[0]


needs_docker = pytest.mark.skipif(not docker_ready(), reason="Docker with the gcc image is not available")
