"""POST /api/run/cpp: compile and run C++17/20 in the Docker sandbox (function-style or full program)."""
from __future__ import annotations

import json
import re
import time
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from .context import csrf_guard, ctx_of, current_user
from .harness import HarnessError, build_function_program
from .sandbox import BatchResult, RawResult, run_batch_blocking, run_blocking, sandbox_available

router = APIRouter(prefix="/api/run", tags=["run"], dependencies=[Depends(csrf_guard)])

MARK_RESULT, MARK_ERROR = "@@CSQ_RESULT@@", "@@CSQ_ERROR@@"


class RunIn(BaseModel):
    code: str = Field(min_length=1, max_length=50000)
    std: Literal["c++17", "c++20"] = "c++17"
    mode: Literal["auto", "function", "program"] = "auto"
    fn: str | None = Field(default=None, max_length=64, pattern=r"^[A-Za-z_]\w*$")
    signature: str | None = Field(default=None, max_length=400)
    args: list[Any] = Field(default=[], max_length=16)
    stdin: str = Field(default="", max_length=20000)
    timeoutSec: float = Field(default=3.0, gt=0, le=5.0)


def split_result(raw_stdout: str) -> tuple[str, Any, Any, str | None]:
    """(user stdout, result, args after the call, harness error). The LAST marker wins; user code may print anything."""
    i = raw_stdout.rfind("\n" + MARK_ERROR)
    if i >= 0:
        return raw_stdout[:i], None, None, raw_stdout[i + 1 + len(MARK_ERROR):].strip()
    i = raw_stdout.rfind("\n" + MARK_RESULT)
    if i < 0:
        return raw_stdout, None, None, None
    tail = raw_stdout[i + 1 + len(MARK_RESULT):].strip()
    try:
        obj = json.loads(tail)
        return raw_stdout[:i], obj.get("result"), obj.get("args"), None
    except json.JSONDecodeError:
        return raw_stdout, None, None, "the program printed a malformed result"


def _available(ctx) -> tuple[bool, str]:
    if not ctx.settings.sandbox_enabled:
        return False, "the code sandbox is disabled on this server"
    if ctx.runner is not None:
        return True, "ok"
    ts, ok, detail = ctx.sandbox_cache
    if time.monotonic() - ts < 30 and ts:
        return ok, detail
    ok, detail = sandbox_available(ctx.settings)
    ctx.sandbox_cache = (time.monotonic(), ok, detail)
    return ok, detail


@router.get("/status")
def status(request: Request):
    ok, detail = _available(ctx_of(request))
    return {"available": ok, "detail": detail, "standards": ["c++17", "c++20"]}


@router.post("/cpp")
def run_cpp(body: RunIn, request: Request, user: dict = Depends(current_user)):
    ctx = ctx_of(request)
    ok, detail = _available(ctx)
    if not ok:
        raise HTTPException(503, detail={"code": "sandbox_unavailable", "message": detail})
    if not ctx.limiter.allow(f"run:{user['id']}", 20, 60):
        raise HTTPException(429, "too many runs, wait a few seconds")

    is_program = body.mode == "program" or (body.mode == "auto" and re.search(r"\bint\s+main\s*\(", body.code) is not None)
    if is_program:
        source, stdin, sig = body.code, body.stdin, None
    else:
        if not body.fn:
            raise HTTPException(422, "function mode needs the function name (fn)")
        try:
            source, sig = build_function_program(body.code, body.fn, body.signature)
        except HarnessError as e:
            raise HTTPException(422, str(e))
        if len(body.args) != len(sig.params):
            raise HTTPException(422, f"{body.fn} takes {len(sig.params)} argument(s) but {len(body.args)} were given")
        stdin = json.dumps(body.args, separators=(",", ":"))

    if not ctx.run_slots.acquire(timeout=10):
        raise HTTPException(503, "the sandbox is busy, try again in a moment")
    try:
        runner = ctx.runner or run_blocking
        raw: RawResult = runner(ctx.settings, source, stdin, body.std, body.timeoutSec)
    finally:
        ctx.run_slots.release()

    if raw.sandbox_error:
        raise HTTPException(503, detail={"code": "sandbox_failed", "message": raw.sandbox_error})
    out: dict[str, Any] = {"mode": "program" if is_program else "function", "std": body.std, "compiled": raw.compiled,
                           "compileOutput": raw.compile_output, "stage": "compile" if not raw.compiled else "run"}
    if not raw.compiled:
        out.update(ok=False, stdout="", stderr="", exitCode=None, timeMs=0, timedOut=False, killed=False, result=None, args=None, error="compilation failed")
        return out
    stdout, result, args_after, herr = (raw.stdout, None, None, None) if is_program else split_result(raw.stdout)
    error = herr
    if raw.timed_out:
        error = f"time limit exceeded ({body.timeoutSec:g}s)"
    elif raw.oom_or_killed:
        error = "the program crashed or ran out of memory (signal %d)" % ((raw.run_rc or 128) - 128)
    elif raw.run_rc not in (0, None) and not herr:
        error = f"the program exited with code {raw.run_rc}"
    elif not is_program and result is None and args_after is None and not herr:
        error = "the function did not return a result"
    out.update(ok=error is None, stage="done", stdout=stdout, stderr=raw.stderr, exitCode=raw.run_rc, timeMs=raw.ms,
               timedOut=raw.timed_out, killed=raw.oom_or_killed, result=result, args=args_after, error=error)
    return out


class RunTestsIn(BaseModel):
    code: str = Field(min_length=1, max_length=50000)
    std: Literal["c++17", "c++20"] = "c++17"
    fn: str = Field(max_length=64, pattern=r"^[A-Za-z_]\w*$")
    signature: str | None = Field(default=None, max_length=400)
    tests: list[list[Any]] = Field(min_length=1, max_length=25)
    timeoutSec: float = Field(default=3.0, gt=0, le=5.0)


@router.post("/cpp-tests")
def run_cpp_tests(body: RunTestsIn, request: Request, user: dict = Depends(current_user)):
    """Compile once and run the function on many argument lists (the 'run all tests on real g++' button)."""
    ctx = ctx_of(request)
    ok, detail = _available(ctx)
    if not ok:
        raise HTTPException(503, detail={"code": "sandbox_unavailable", "message": detail})
    if not ctx.limiter.allow(f"runtests:{user['id']}", 10, 60):
        raise HTTPException(429, "too many test runs, wait a few seconds")
    try:
        source, sig = build_function_program(body.code, body.fn, body.signature)
    except HarnessError as e:
        raise HTTPException(422, str(e))
    for i, args in enumerate(body.tests):
        if len(args) != len(sig.params):
            raise HTTPException(422, f"test {i + 1}: {body.fn} takes {len(sig.params)} argument(s) but {len(args)} were given")
    inputs = [json.dumps(a, separators=(",", ":")) for a in body.tests]
    if not ctx.run_slots.acquire(timeout=10):
        raise HTTPException(503, "the sandbox is busy, try again in a moment")
    try:
        runner = ctx.batch_runner or run_batch_blocking
        raw: BatchResult = runner(ctx.settings, source, inputs, body.std, body.timeoutSec)
    finally:
        ctx.run_slots.release()
    if raw.sandbox_error:
        raise HTTPException(503, detail={"code": "sandbox_failed", "message": raw.sandbox_error})
    cases = []
    for c in raw.cases:
        out, result, args_after, herr = split_result(c.stdout)
        err = herr
        if c.rc == 124:
            err = f"time limit exceeded ({body.timeoutSec:g}s)"
        elif c.rc in (137, 139, 134):
            err = "the program crashed or ran out of memory (signal %d)" % (c.rc - 128)
        elif c.rc != 0 and not herr:
            err = f"the program exited with code {c.rc}"
        elif result is None and args_after is None and not herr:
            err = "the function did not return a result"
        cases.append({"ok": err is None, "result": result, "args": args_after, "stdout": out, "timeMs": c.ms, "error": err})
    return {"std": body.std, "compiled": raw.compiled, "compileOutput": raw.compile_output, "cases": cases}
