from fastapi.testclient import TestClient

GOOD = {"email": "ada@example.com", "password": "correct horse battery", "displayName": "Ada"}


def test_register_sets_httponly_cookie_and_me_works(client):
    r = client.post("/api/auth/register", json=GOOD)
    assert r.status_code == 201 and r.json()["email"] == "ada@example.com" and r.json()["displayName"] == "Ada"
    cookie = r.headers["set-cookie"].lower()
    assert "cq_session=" in cookie and "httponly" in cookie and "samesite=lax" in cookie
    me = client.get("/api/auth/me")
    assert me.status_code == 200 and me.json()["email"] == "ada@example.com"


def test_password_is_hashed_never_stored_in_plaintext(client):
    client.post("/api/auth/register", json=GOOD)
    with client.app.state.ctx.db.conn() as c:
        stored = c.execute("SELECT pw_hash FROM users").fetchone()[0]
    assert stored.startswith("scrypt$") and GOOD["password"] not in stored


def test_duplicate_email_is_case_insensitive(client):
    assert client.post("/api/auth/register", json=GOOD).status_code == 201
    assert client.post("/api/auth/register", json={**GOOD, "email": "ADA@Example.com"}).status_code == 409


def test_validation_errors(client):
    assert client.post("/api/auth/register", json={**GOOD, "password": "short"}).status_code == 422
    assert client.post("/api/auth/register", json={**GOOD, "email": "not-an-email"}).status_code == 422
    assert client.post("/api/auth/register", json={**GOOD, "password": "x" * 200}).status_code == 422


def test_login_success_and_failure_messages_do_not_reveal_which_part_was_wrong(client):
    client.post("/api/auth/register", json=GOOD)
    client.post("/api/auth/logout")
    wrong_pw = client.post("/api/auth/login", json={"email": GOOD["email"], "password": "wrong password!"})
    unknown = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "wrong password!"})
    assert wrong_pw.status_code == unknown.status_code == 401
    assert wrong_pw.json() == unknown.json()
    ok = client.post("/api/auth/login", json={"email": "ADA@example.com", "password": GOOD["password"]})
    assert ok.status_code == 200 and client.get("/api/auth/me").status_code == 200


def test_login_lockout_after_repeated_failures(client):
    client.post("/api/auth/register", json=GOOD)
    client.post("/api/auth/logout")
    for _ in range(5):
        assert client.post("/api/auth/login", json={"email": GOOD["email"], "password": "bad password!"}).status_code == 401
    locked = client.post("/api/auth/login", json={"email": GOOD["email"], "password": GOOD["password"]})
    assert locked.status_code == 429 and "Retry-After" in locked.headers


def test_logout_invalidates_the_session_server_side(client):
    client.post("/api/auth/register", json=GOOD)
    token = client.cookies.get("cq_session")
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401
    stale = TestClient(client.app, cookies={"cq_session": token})
    assert stale.get("/api/auth/me").status_code == 401


def test_me_requires_a_session(client):
    assert client.get("/api/auth/me").status_code == 401


def test_csrf_header_is_required_for_state_changing_requests(client):
    bare = TestClient(client.app)  # no X-Requested-With header
    assert bare.post("/api/auth/register", json=GOOD).status_code == 403
    assert bare.post("/api/auth/logout").status_code == 403


def test_sessions_expire(make_client):
    c = make_client(session_days=14)
    c.post("/api/auth/register", json=GOOD)
    with c.app.state.ctx.db.conn() as db:
        db.execute("UPDATE sessions SET expires_at = 1")
    assert c.get("/api/auth/me").status_code == 401


def test_security_headers_and_oversized_body(client):
    r = client.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff" and r.headers["x-frame-options"] == "DENY" and r.headers["cache-control"] == "no-store"
    big = client.post("/api/auth/register", content=b"x" * 1_100_000, headers={"Content-Type": "application/json"})
    assert big.status_code == 413


def test_cors_only_allows_configured_origins(client):
    ok = client.options("/api/auth/login", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"})
    bad = client.options("/api/auth/login", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-origin" not in bad.headers


def test_signup_rate_limit_is_enforced_and_configurable(make_client):
    c = make_client(register_limit=3)
    codes = [c.post("/api/auth/register", json={"email": f"u{i}@example.com", "password": "correct horse battery"}).status_code for i in range(5)]
    assert codes == [201, 201, 201, 429, 429]
