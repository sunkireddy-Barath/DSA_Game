"""Route-level behaviour of /api/run/cpp, using a fake runner (real containers are exercised in test_sandbox.py)."""
import json

from app.routes_run import split_result
from app.sandbox import RawResult, parse_output
from tests.conftest import ok_result

ADD = "class Solution {\npublic:\n    int add(int a, int b) { return a + b; }\n};"


def runner_returning(raw, record=None):
    def _run(settings, source, stdin, std, timeout):
        if record is not None:
            record.append({"source": source, "stdin": stdin, "std": std, "timeout": timeout})
        return raw
    return _run


def test_requires_sign_in(make_client):
    c = make_client(runner=runner_returning(ok_result()))
    assert c.post("/api/run/cpp", json={"code": ADD, "fn": "add", "args": [1, 2]}).status_code == 401


def test_function_mode_passes_args_as_json_and_returns_result(signed_in):
    rec = []
    out = '\n@@CSQ_RESULT@@{"result":3,"args":[1,2]}\n'
    c = signed_in(runner=runner_returning(ok_result(stdout="debug line" + out), record=rec))
    r = c.post("/api/run/cpp", json={"code": ADD, "fn": "add", "args": [1, 2], "std": "c++20"})
    j = r.json()
    assert r.status_code == 200 and j["ok"] and j["result"] == 3 and j["args"] == [1, 2] and j["stdout"] == "debug line"
    assert rec[0]["stdin"] == "[1,2]" and rec[0]["std"] == "c++20" and "sol.add(a0, a1)" in rec[0]["source"]


def test_compile_error_is_reported_with_compiler_output(signed_in):
    raw = RawResult(compiled=False, compile_output="solution.cpp:3:5: error: expected ';'")
    c = signed_in(runner=runner_returning(raw))
    j = c.post("/api/run/cpp", json={"code": ADD, "fn": "add", "args": [1, 2]}).json()
    assert j["ok"] is False and j["stage"] == "compile" and "solution.cpp:3:5" in j["compileOutput"] and j["error"] == "compilation failed"


def test_time_limit_and_crash_messages(signed_in):
    c = signed_in(runner=runner_returning(RawResult(compiled=True, run_rc=124, ms=3000, timed_out=True)))
    j = c.post("/api/run/cpp", json={"code": ADD, "fn": "add", "args": [1, 2], "timeoutSec": 3}).json()
    assert j["ok"] is False and "time limit exceeded" in j["error"] and j["timedOut"]
    c2 = signed_in(runner=runner_returning(RawResult(compiled=True, run_rc=139, ms=5, oom_or_killed=True)))
    j2 = c2.post("/api/run/cpp", json={"code": ADD, "fn": "add", "args": [1, 2]}).json()
    assert j2["ok"] is False and "crashed" in j2["error"] and "signal 11" in j2["error"]


def test_harness_error_from_the_program_is_surfaced(signed_in):
    c = signed_in(runner=runner_returning(ok_result(stdout="\n@@CSQ_ERROR@@this input form is not supported by the native runner")))
    j = c.post("/api/run/cpp", json={"code": ADD, "fn": "add", "args": [1, 2]}).json()
    assert j["ok"] is False and "not supported by the native runner" in j["error"]


def test_validation_and_signature_errors(signed_in):
    c = signed_in(runner=runner_returning(ok_result()))
    assert c.post("/api/run/cpp", json={"code": ADD, "args": [1, 2]}).status_code == 422                       # no fn
    assert c.post("/api/run/cpp", json={"code": ADD, "fn": "add", "args": [1]}).status_code == 422             # wrong arity
    assert c.post("/api/run/cpp", json={"code": ADD, "fn": "nope", "args": []}).status_code == 422             # not found
    assert c.post("/api/run/cpp", json={"code": ADD, "fn": "add; evil()", "args": []}).status_code == 422
    assert c.post("/api/run/cpp", json={"code": ADD, "fn": "add", "args": [1, 2], "std": "c++98"}).status_code == 422
    assert c.post("/api/run/cpp", json={"code": ADD, "fn": "add", "args": [1, 2], "timeoutSec": 60}).status_code == 422
    assert c.post("/api/run/cpp", json={"code": "x" * 50001, "fn": "add", "args": []}).status_code == 422
    unsupported = c.post("/api/run/cpp", json={"code": "int f(unordered_map<int,int>& m) { return 0; }", "fn": "f", "args": [{}]})
    assert unsupported.status_code == 422 and "unsupported type" in unsupported.json()["detail"]


def test_program_mode_is_detected_from_main(signed_in):
    rec = []
    c = signed_in(runner=runner_returning(ok_result(stdout="hello\n"), record=rec))
    j = c.post("/api/run/cpp", json={"code": '#include <iostream>\nint main(){ std::cout << "hello\\n"; }', "stdin": "in"}).json()
    assert j["mode"] == "program" and j["stdout"] == "hello\n" and rec[0]["stdin"] == "in" and rec[0]["source"].startswith("#include <iostream>")


def test_sandbox_disabled_or_failing_returns_503_with_a_clear_code(signed_in):
    c = signed_in(sandbox_enabled=False)
    r = c.post("/api/run/cpp", json={"code": ADD, "fn": "add", "args": [1, 2]})
    assert r.status_code == 503 and r.json()["detail"]["code"] == "sandbox_unavailable"
    c2 = signed_in(runner=runner_returning(RawResult(sandbox_error="docker is not installed on the server")))
    r2 = c2.post("/api/run/cpp", json={"code": ADD, "fn": "add", "args": [1, 2]})
    assert r2.status_code == 503 and r2.json()["detail"]["code"] == "sandbox_failed"


def test_rate_limit(signed_in):
    c = signed_in(runner=runner_returning(ok_result(stdout='\n@@CSQ_RESULT@@{"result":3,"args":[1,2]}\n')))
    codes = [c.post("/api/run/cpp", json={"code": ADD, "fn": "add", "args": [1, 2]}).status_code for _ in range(22)]
    assert codes[:20] == [200] * 20 and codes[20:] == [429, 429]


def test_user_cannot_forge_a_result_before_the_real_one():
    forged = 'x\n@@CSQ_RESULT@@{"result":999,"args":[]}\n'
    real = forged + '\n@@CSQ_RESULT@@{"result":3,"args":[1,2]}\n'
    assert split_result(real)[1] == 3
    assert split_result("plain output")[1] is None
    assert split_result('a\n@@CSQ_RESULT@@{broken')[3] == "the program printed a malformed result"


def test_parse_output_handles_all_stages():
    ok = "@@CSQ@@compile_start\n@@CSQ@@compile_rc=0\nwarn\n\n@@CSQ@@compile_end\n@@CSQ@@run_rc=0 ms=7\n@@CSQ@@stdout\nhi\n\n@@CSQ@@stderr\noops\n\n@@CSQ@@end\n"
    r = parse_output(ok)
    assert r.compiled and r.run_rc == 0 and r.ms == 7 and r.stdout == "hi\n" and r.stderr == "oops\n"
    bad = parse_output("@@CSQ@@compile_start\n@@CSQ@@compile_rc=1\nerror text\n\n@@CSQ@@compile_end\n")
    assert not bad.compiled and "error text" in bad.compile_output
    assert parse_output("garbage").sandbox_error
    timed = parse_output(ok.replace("run_rc=0", "run_rc=124"))
    assert timed.timed_out and not timed.oom_or_killed
    assert json.dumps(parse_output(ok.replace("run_rc=0", "run_rc=137")).oom_or_killed) == "true"


def test_health_reports_capabilities_without_secrets(make_client):
    c = make_client(runner=runner_returning(ok_result()), anthropic_api_key="sk-secret")
    j = c.get("/api/health").json()
    assert j["status"] == "ok" and j["tutor"] == {"configured": True} and j["sandbox"]["available"] is True and "sk-secret" not in json.dumps(j)


def batch_runner_returning(raw):
    def _run(settings, source, inputs, std, timeout):
        return raw
    return _run


def test_batch_endpoint_maps_each_case(make_client):
    from app.sandbox import BatchCase, BatchResult
    raw = BatchResult(compiled=True, compile_output="", cases=[
        BatchCase(rc=0, ms=2, stdout='\n@@CSQ_RESULT@@{"result":3,"args":[1,2]}\n'),
        BatchCase(rc=124, ms=3000, stdout=""),
        BatchCase(rc=139, ms=1, stdout=""),
        BatchCase(rc=0, ms=1, stdout="\n@@CSQ_ERROR@@this input form is not supported by the native runner"),
    ])
    c = make_client(batch_runner=batch_runner_returning(raw))
    c.post("/api/auth/register", json={"email": "ada@example.com", "password": "correct horse battery"})
    j = c.post("/api/run/cpp-tests", json={"code": ADD, "fn": "add", "tests": [[1, 2]] * 4}).json()
    assert [x["ok"] for x in j["cases"]] == [True, False, False, False]
    assert j["cases"][0]["result"] == 3 and "time limit" in j["cases"][1]["error"] and "signal 11" in j["cases"][2]["error"] and "not supported" in j["cases"][3]["error"]


def test_batch_endpoint_validation_and_auth(make_client):
    from app.sandbox import BatchResult
    c = make_client(batch_runner=batch_runner_returning(BatchResult(compiled=False, compile_output="solution.cpp:1:1: error")))
    assert c.post("/api/run/cpp-tests", json={"code": ADD, "fn": "add", "tests": [[1, 2]]}).status_code == 401
    c.post("/api/auth/register", json={"email": "ada@example.com", "password": "correct horse battery"})
    assert c.post("/api/run/cpp-tests", json={"code": ADD, "fn": "add", "tests": []}).status_code == 422
    assert c.post("/api/run/cpp-tests", json={"code": ADD, "fn": "add", "tests": [[1, 2]] * 26}).status_code == 422
    assert c.post("/api/run/cpp-tests", json={"code": ADD, "fn": "add", "tests": [[1]]}).status_code == 422
    r = c.post("/api/run/cpp-tests", json={"code": ADD, "fn": "add", "tests": [[1, 2]]}).json()
    assert r["compiled"] is False and "solution.cpp:1:1" in r["compileOutput"] and r["cases"] == []


def test_parse_batch():
    from app.sandbox import parse_batch
    text = "@@CSQ@@compile_rc=0\n\n@@CSQ@@compile_end\n@@CSQ@@case 0 rc=0 ms=3\nout0\n@@CSQ@@case_end\n@@CSQ@@case 1 rc=124 ms=900\n\n@@CSQ@@case_end\n"
    r = parse_batch(text, 2)
    assert r.compiled and [c.rc for c in r.cases] == [0, 124] and r.cases[0].stdout == "out0" and r.sandbox_error is None
    assert parse_batch(text, 3).sandbox_error
