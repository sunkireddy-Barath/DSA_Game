import json

import httpx

from tests.conftest import CSRF  # noqa: F401

BODY = {
    "question": "Why does my loop skip the last element?", "level": "hint",
    "problem": {"title": "Two Sum", "statement": "Find two numbers that add to target.", "constraints": ["n <= 1e4"],
                "hints": ["Use a hash map"], "approaches": ["Hash map: O(n) time, O(n) space"]},
    "code": "for (int i = 0; i < n - 1; i++) {}", "lastRun": "wrong answer on [1,2]",
    "trace": {"step": 4, "total": 20, "line": 3, "lineText": "for (int i = 0; i < n - 1; i++)", "event": "line", "variables": "i = 1, n = 2", "callStack": "twoSum"},
}


def fake_anthropic(captured, status=200, body=None):
    def handler(request: httpx.Request):
        captured.append(request)
        return httpx.Response(status, json=body if body is not None else {"model": "test-model", "content": [{"type": "text", "text": "Check the loop bound."}], "usage": {"input_tokens": 10, "output_tokens": 5}})
    return lambda: httpx.Client(transport=httpx.MockTransport(handler))


def test_requires_sign_in(client):
    assert client.post("/api/tutor/ask", json=BODY).status_code == 401


def test_reports_not_configured_instead_of_inventing_an_answer(signed_in):
    c = signed_in()
    assert c.get("/api/tutor/status").json() == {"configured": False}
    r = c.post("/api/tutor/ask", json=BODY)
    assert r.status_code == 503 and r.json()["detail"]["code"] == "tutor_not_configured"


def test_sends_problem_code_run_and_trace_context_to_the_llm(signed_in):
    seen = []
    c = signed_in(anthropic_api_key="sk-test-secret", http_client=fake_anthropic(seen))
    r = c.post("/api/tutor/ask", json=BODY)
    assert r.status_code == 200 and r.json()["answer"] == "Check the loop bound."
    req = seen[0]
    assert req.headers["x-api-key"] == "sk-test-secret" and req.headers["anthropic-version"] == "2023-06-01"
    payload = json.loads(req.content)
    assert payload["model"] == "test-model" and payload["max_tokens"] <= 1000 and "Never invent program state" in payload["system"]
    user_msg = payload["messages"][-1]["content"]
    for needle in ["Two Sum", "i < n - 1", "wrong answer on [1,2]", "step 4 of 20", "i = 1, n = 2", "Help level requested: hint", "Why does my loop skip"]:
        assert needle in user_msg
    assert "sk-test-secret" not in r.text                      # the key never reaches the browser


def test_missing_trace_is_stated_not_fabricated(signed_in):
    seen = []
    c = signed_in(anthropic_api_key="k", http_client=fake_anthropic(seen))
    c.post("/api/tutor/ask", json={**BODY, "trace": None})
    assert "<trace>not available</trace>" in json.loads(seen[0].content)["messages"][-1]["content"]


def test_history_is_cleaned_to_alternating_roles(signed_in):
    seen = []
    c = signed_in(anthropic_api_key="k", http_client=fake_anthropic(seen))
    hist = [{"role": "assistant", "content": "orphan"}, {"role": "user", "content": "q1"}, {"role": "assistant", "content": "a1"}, {"role": "user", "content": "dangling"}]
    assert c.post("/api/tutor/ask", json={**BODY, "history": hist}).status_code == 200
    roles = [m["role"] for m in json.loads(seen[0].content)["messages"]]
    assert roles == ["user", "assistant", "user"]


def test_upstream_failures_are_translated_without_leaking_details(signed_in):
    for status, expected in [(401, 502), (429, 503), (500, 502)]:
        c = signed_in(anthropic_api_key="sk-secret", http_client=fake_anthropic([], status=status, body={"error": {"message": "internal detail sk-secret"}}))
        r = c.post("/api/tutor/ask", json=BODY)
        assert r.status_code == expected and "sk-secret" not in r.text and "internal detail" not in r.text


def test_empty_upstream_answer_is_an_error(signed_in):
    c = signed_in(anthropic_api_key="k", http_client=fake_anthropic([], body={"content": []}))
    assert c.post("/api/tutor/ask", json=BODY).status_code == 502


def test_rate_limit_per_user(signed_in):
    c = signed_in(anthropic_api_key="k", http_client=fake_anthropic([]))
    codes = [c.post("/api/tutor/ask", json=BODY).status_code for _ in range(10)]
    assert codes[:8] == [200] * 8 and codes[8:] == [429, 429]


def test_input_limits(signed_in):
    c = signed_in(anthropic_api_key="k", http_client=fake_anthropic([]))
    assert c.post("/api/tutor/ask", json={**BODY, "question": ""}).status_code == 422
    assert c.post("/api/tutor/ask", json={**BODY, "code": "x" * 20001}).status_code == 422
    assert c.post("/api/tutor/ask", json={**BODY, "level": "give-me-everything"}).status_code == 422
