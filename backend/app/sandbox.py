"""Runs untrusted C++ inside a throw-away Docker container.

Isolation applied to every run:
  --network none            no network access
  --read-only + tmpfs /work only a small in-memory scratch directory is writable
  --cap-drop ALL, no-new-privileges, non-root user (65534)
  --memory / --pids-limit / --cpus / ulimit   bounded memory, processes, CPU and file size
  hard wall-clock timeout on the whole container, which is force-removed afterwards
The source is streamed in as a tar archive on stdin, so no host directory is ever mounted.
"""
from __future__ import annotations

import io
import re
import subprocess
import tarfile
import time
import uuid
from dataclasses import dataclass, field

from .config import Settings

RUN_SH = r"""#!/bin/sh
cd /work || exit 90
printf '@@CSQ@@compile_start\n'
timeout -k 1 "$COMPILE_T" g++ -std="$STD" -O2 -pipe -Wall -o prog main.cpp > compile.txt 2>&1
crc=$?
printf '@@CSQ@@compile_rc=%s\n' "$crc"
head -c 8000 compile.txt
printf '\n@@CSQ@@compile_end\n'
[ "$crc" -ne 0 ] && exit 0
ulimit -t "$CPU_T"
ulimit -f 32768
ulimit -v 786432
start=$(date +%s%N)
timeout -k 1 "$RUN_T" ./prog < input.txt > out.txt 2> err.txt
rc=$?
end=$(date +%s%N)
printf '@@CSQ@@run_rc=%s ms=%s\n' "$rc" "$(( (end - start) / 1000000 ))"
printf '@@CSQ@@stdout\n'
head -c 65536 out.txt
printf '\n@@CSQ@@stderr\n'
head -c 8000 err.txt
printf '\n@@CSQ@@end\n'
"""

BATCH_SH = r"""#!/bin/sh
cd /work || exit 90
timeout -k 1 "$COMPILE_T" g++ -std="$STD" -O2 -pipe -Wall -o prog main.cpp > compile.txt 2>&1
crc=$?
printf '@@CSQ@@compile_rc=%s\n' "$crc"
head -c 8000 compile.txt
printf '\n@@CSQ@@compile_end\n'
[ "$crc" -ne 0 ] && exit 0
ulimit -t "$CPU_T"
ulimit -f 32768
ulimit -v 786432
n=$(ls in | wc -l)
i=0
while [ "$i" -lt "$n" ]; do
  start=$(date +%s%N)
  timeout -k 1 "$RUN_T" ./prog < "in/$i.json" > out.txt 2> err.txt
  rc=$?
  end=$(date +%s%N)
  printf '@@CSQ@@case %s rc=%s ms=%s\n' "$i" "$rc" "$(( (end - start) / 1000000 ))"
  head -c 65536 out.txt
  printf '\n@@CSQ@@case_end\n'
  i=$((i + 1))
done
"""

ALLOWED_STD = {"c++17", "c++20"}


@dataclass
class RawResult:
    sandbox_error: str | None = None   # infrastructure problem (docker missing, timeout of the whole container, ...)
    compiled: bool = False
    compile_output: str = ""
    run_rc: int | None = None
    ms: int = 0
    stdout: str = ""
    stderr: str = ""
    timed_out: bool = False
    oom_or_killed: bool = False
    extras: dict = field(default_factory=dict)


def _tar(source: str, stdin: str, inputs: list[str] | None = None) -> bytes:
    buf = io.BytesIO()
    files: list[tuple[str, str, int]] = [("main.cpp", source, 0o644)]
    if inputs is None:
        files += [("input.txt", stdin, 0o644), ("run.sh", RUN_SH, 0o755)]
    else:
        files += [("batch.sh", BATCH_SH, 0o755)] + [(f"in/{i}.json", text, 0o644) for i, text in enumerate(inputs)]
    with tarfile.open(fileobj=buf, mode="w") as tf:
        for name, data, mode in files:
            raw = data.encode("utf-8")
            ti = tarfile.TarInfo(name)
            ti.size, ti.mode, ti.mtime = len(raw), mode, int(time.time())
            tf.addfile(ti, io.BytesIO(raw))
    return buf.getvalue()


def docker_args(settings: Settings, name: str, std: str, compile_t: int, run_t: float) -> list[str]:
    cpu_t = int(run_t) + 1
    return [
        *settings.docker_cmd, "run", "--rm", "-i", "--name", name,
        "--network", "none", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
        "--pids-limit", "256", "--memory", "768m", "--memory-swap", "768m", "--cpus", "1",
        "--ulimit", "nofile=256:256", "--user", "65534:65534",
        "--tmpfs", "/work:rw,exec,nosuid,nodev,size=64m,mode=1777",
        "-e", f"STD={std}", "-e", f"COMPILE_T={compile_t}", "-e", f"RUN_T={run_t}", "-e", f"CPU_T={cpu_t}", "-e", "TMPDIR=/work/tmp",
        settings.sandbox_image, "sh", "-c", "mkdir -p /work/tmp && tar -x -C /work && sh /work/run.sh",
    ]


def parse_output(text: str) -> RawResult:
    res = RawResult()
    m = re.search(r"@@CSQ@@compile_rc=(\d+)\n", text)
    if not m:
        res.sandbox_error = "the sandbox produced no result"
        return res
    crc = int(m.group(1))
    c_end = text.find("\n@@CSQ@@compile_end\n", m.end())
    res.compile_output = text[m.end(): c_end if c_end >= 0 else len(text)]
    res.compiled = crc == 0
    if not res.compiled:
        return res
    r = re.search(r"@@CSQ@@run_rc=(-?\d+) ms=(\d+)\n@@CSQ@@stdout\n", text[c_end:] if c_end >= 0 else "")
    if not r:
        res.sandbox_error = "the program did not finish"
        return res
    base = c_end + r.end()
    end = text.rfind("\n@@CSQ@@end\n")
    err_at = text.rfind("\n@@CSQ@@stderr\n", base, end if end >= 0 else len(text))
    if err_at < 0:
        err_at = end if end >= 0 else len(text)
    res.stdout = text[base:err_at]
    res.stderr = text[err_at + len("\n@@CSQ@@stderr\n"): end] if end >= 0 and err_at < end else ""
    res.run_rc, res.ms = int(r.group(1)), int(r.group(2))
    res.timed_out = res.run_rc == 124
    res.oom_or_killed = res.run_rc in (137, 139, 134) and not res.timed_out
    return res


def run_blocking(settings: Settings, source: str, stdin: str, std: str, run_timeout: float = 3.0, compile_timeout: int = 25) -> RawResult:
    if std not in ALLOWED_STD:
        return RawResult(sandbox_error=f"unsupported standard {std!r}")
    name = "csq-" + uuid.uuid4().hex[:12]
    args = docker_args(settings, name, std, compile_timeout, run_timeout)
    hard = compile_timeout + run_timeout + 15
    try:
        cp = subprocess.run(args, input=_tar(source, stdin), capture_output=True, timeout=hard)
    except subprocess.TimeoutExpired:
        _kill(settings, name)
        return RawResult(sandbox_error="the sandbox timed out")
    except FileNotFoundError:
        return RawResult(sandbox_error="docker is not installed on the server")
    finally:
        _kill(settings, name)
    out = cp.stdout.decode("utf-8", "replace")
    if cp.returncode != 0 and "@@CSQ@@compile_rc" not in out:
        err = cp.stderr.decode("utf-8", "replace").strip().splitlines()
        return RawResult(sandbox_error="the sandbox could not start" + (f": {err[-1][:200]}" if err else ""))
    return parse_output(out)


@dataclass
class BatchCase:
    rc: int
    ms: int
    stdout: str


@dataclass
class BatchResult:
    sandbox_error: str | None = None
    compiled: bool = False
    compile_output: str = ""
    cases: list[BatchCase] = field(default_factory=list)


def parse_batch(text: str, expected: int) -> BatchResult:
    res = BatchResult()
    m = re.search(r"@@CSQ@@compile_rc=(\d+)\n", text)
    if not m:
        res.sandbox_error = "the sandbox produced no result"
        return res
    c_end = text.find("\n@@CSQ@@compile_end\n", m.end())
    res.compile_output = text[m.end(): c_end if c_end >= 0 else len(text)]
    res.compiled = m.group(1) == "0"
    if not res.compiled:
        return res
    tail = text[c_end:] if c_end >= 0 else ""
    for cm in re.finditer(r"@@CSQ@@case (\d+) rc=(-?\d+) ms=(\d+)\n(.*?)\n@@CSQ@@case_end\n", tail, re.S):
        res.cases.append(BatchCase(rc=int(cm.group(2)), ms=int(cm.group(3)), stdout=cm.group(4)))
    if len(res.cases) != expected:
        res.sandbox_error = "the sandbox stopped before all tests finished"
    return res


def run_batch_blocking(settings: Settings, source: str, inputs: list[str], std: str, run_timeout: float = 3.0, compile_timeout: int = 25) -> BatchResult:
    """Compile once, then run the program once per input (each with its own time limit) in a single container."""
    if std not in ALLOWED_STD:
        return BatchResult(sandbox_error=f"unsupported standard {std!r}")
    name = "csq-" + uuid.uuid4().hex[:12]
    args = docker_args(settings, name, std, compile_timeout, run_timeout)
    args[-1] = "mkdir -p /work/tmp /work/in && tar -x -C /work && sh /work/batch.sh"
    hard = compile_timeout + len(inputs) * (run_timeout + 1.5) + 15
    try:
        cp = subprocess.run(args, input=_tar(source, "", inputs), capture_output=True, timeout=hard)
    except subprocess.TimeoutExpired:
        return BatchResult(sandbox_error="the sandbox timed out")
    except FileNotFoundError:
        return BatchResult(sandbox_error="docker is not installed on the server")
    finally:
        _kill(settings, name)
    out = cp.stdout.decode("utf-8", "replace")
    if cp.returncode != 0 and "@@CSQ@@compile_rc" not in out:
        err = cp.stderr.decode("utf-8", "replace").strip().splitlines()
        return BatchResult(sandbox_error="the sandbox could not start" + (f": {err[-1][:200]}" if err else ""))
    return parse_batch(out, len(inputs))


def _kill(settings: Settings, name: str) -> None:
    try:
        subprocess.run([*settings.docker_cmd, "rm", "-f", name], capture_output=True, timeout=20)
    except Exception:
        pass


def sandbox_available(settings: Settings) -> tuple[bool, str]:
    """True when docker answers and the configured image is present locally."""
    try:
        cp = subprocess.run([*settings.docker_cmd, "image", "inspect", settings.sandbox_image], capture_output=True, timeout=30)
    except Exception as e:  # docker missing / not runnable
        return False, f"docker unavailable: {type(e).__name__}"
    if cp.returncode != 0:
        return False, f"image {settings.sandbox_image} is not present (run: docker pull {settings.sandbox_image})"
    return True, "ok"
