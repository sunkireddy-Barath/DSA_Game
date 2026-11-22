from fastapi.testclient import TestClient

from tests.conftest import CSRF

A = {"xp": 100, "solved": {"two-sum": {"at": 1000, "attempts": 2, "hints": 1}}, "attempts": {"two-sum": 2}, "qaDone": {"dsa-1": True},
     "predictions": {"correct": 3, "total": 5}, "streak": {"last": "2025-01-02", "count": 2}, "seconds": 60, "log": [{"t": 10, "text": "a"}], "drafts": {"p1": "int x;"}}
B = {"xp": 80, "solved": {"two-sum": {"at": 500, "attempts": 4, "hints": 0}, "lru": {"at": 2000, "attempts": 1, "hints": 0}}, "attempts": {"two-sum": 4, "lru": 1},
     "qaDone": {"os-2": True}, "predictions": {"correct": 1, "total": 9}, "streak": {"last": "2025-01-05", "count": 1}, "seconds": 10, "log": [{"t": 20, "text": "b"}]}


def test_requires_authentication(client):
    assert client.get("/api/progress").status_code == 401
    assert client.put("/api/progress", json={"data": A}).status_code == 401


def test_empty_progress_then_round_trip(signed_in):
    c = signed_in()
    got = c.get("/api/progress").json()
    assert got["data"]["xp"] == 0 and got["updatedAt"] == 0
    saved = c.put("/api/progress", json={"data": A}).json()
    assert saved["data"]["xp"] == 100 and saved["data"]["drafts"] == {"p1": "int x;"}
    again = c.get("/api/progress").json()["data"]
    assert again["solved"]["two-sum"]["attempts"] == 2 and again["qaDone"] == {"dsa-1": True}


def test_two_devices_merge_without_losing_anything(signed_in):
    c = signed_in()
    c.put("/api/progress", json={"data": A})
    merged = c.put("/api/progress", json={"data": B}).json()["data"]
    assert merged["xp"] == 100                                           # max
    assert set(merged["solved"]) == {"two-sum", "lru"}                    # union
    assert merged["solved"]["two-sum"]["at"] == 500                       # earliest solve time wins
    assert merged["attempts"]["two-sum"] == 4                             # max attempts
    assert merged["qaDone"] == {"dsa-1": True, "os-2": True}              # union
    assert merged["predictions"] == {"correct": 3, "total": 9}
    assert merged["streak"] == {"last": "2025-01-05", "count": 1}         # most recent day
    assert [a["t"] for a in merged["log"]] == [20, 10]
    assert merged["seconds"] == 60


def test_progress_is_isolated_per_user(signed_in, make_client):
    c = signed_in()
    c.put("/api/progress", json={"data": A})
    other = TestClient(c.app, headers=CSRF)
    other.post("/api/auth/register", json={"email": "bob@example.com", "password": "another long password"})
    assert other.get("/api/progress").json()["data"]["xp"] == 0


def test_invalid_payloads_are_rejected(signed_in):
    c = signed_in()
    assert c.put("/api/progress", json={"data": {"xp": -5}}).status_code == 422
    assert c.put("/api/progress", json={"data": {"xp": "many"}}).status_code == 422
    assert c.put("/api/progress", json={"data": {"drafts": {"p": "x" * 20001}}}).status_code == 422
    assert c.put("/api/progress", json={"data": {"streak": {"last": "yesterday", "count": 1}}}).status_code == 422
    assert c.put("/api/progress", json={"data": {"solved": {"k" * 200: {"at": 1, "attempts": 1, "hints": 0}}}}).status_code == 422
    assert c.put("/api/progress", json={"nope": 1}).status_code == 422
    assert c.get("/api/progress").json()["data"]["xp"] == 0


def test_unknown_fields_are_not_persisted(signed_in):
    c = signed_in()
    out = c.put("/api/progress", json={"data": {"xp": 5, "isAdmin": True}}).json()["data"]
    assert "isAdmin" not in out


def test_delete_resets_only_the_callers_progress(signed_in):
    c = signed_in()
    c.put("/api/progress", json={"data": A})
    other = TestClient(c.app, headers=CSRF)
    other.post("/api/auth/register", json={"email": "bob@example.com", "password": "another long password"})
    other.put("/api/progress", json={"data": B})
    assert c.delete("/api/progress").json() == {"ok": True}
    assert c.get("/api/progress").json()["data"]["xp"] == 0
    assert other.get("/api/progress").json()["data"]["xp"] == 80


def test_delete_requires_auth_and_csrf_header(client):
    assert client.delete("/api/progress").status_code == 401
    assert TestClient(client.app).delete("/api/progress").status_code == 403
