"""Runs every solution in tools/native/cases.json through real g++ in the hardened Docker sandbox.

One container per approach: the program is compiled once, then run once per test input.
Usage (from the repository root):  python backend/tools/verify_problems.py [--workers 4] [--std c++17]
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import subprocess
import sys
import tarfile
import time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.config import load_settings  # noqa: E402
from app.harness import HarnessError, build_function_program  # noqa: E402
from app.sandbox import docker_args  # noqa: E402

BATCH_SH = r"""#!/bin/sh
cd /work || exit 90
timeout -k 1 "$COMPILE_T" g++ -std="$STD" -O2 -pipe $EXTRA -o prog main.cpp > compile.txt 2>&1
crc=$?
printf '@@B@@compile_rc=%s\n' "$crc"
if [ "$crc" -ne 0 ]; then head -c 4000 compile.txt; exit 0; fi
n=$(ls in | wc -l)
i=0
while [ "$i" -lt "$n" ]; do
  timeout -k 1 "$RUN_T" ./prog < "in/$i.json" > out.txt 2> err.txt
  rc=$?
  printf '@@B@@case %s rc=%s\n' "$i" "$rc"
  head -c 200000 out.txt
  printf '\n@@B@@end\n'
  i=$((i + 1))
done
"""


def make_tar(source: str, inputs: list[str]) -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w") as tf:
        def add(name: str, text: str, mode: int = 0o644) -> None:
            raw = text.encode()
            ti = tarfile.TarInfo(name)
            ti.size, ti.mode = len(raw), mode
            tf.addfile(ti, io.BytesIO(raw))
        add("main.cpp", source)
        add("batch.sh", BATCH_SH, 0o755)
        for i, text in enumerate(inputs):
            add(f"in/{i}.json", text)
    return buf.getvalue()


def run_case(settings, case: dict, std: str, ubsan: bool = False) -> dict:
    try:
        source, _sig = build_function_program(case["code"], case["fn"])
    except HarnessError as e:
        return {"status": "harness_error", "message": f"signature: {e}"}
    inputs = [json.dumps(t["args"], separators=(",", ":")) for t in case["tests"]]
    name = "csqv-" + re.sub(r"\W", "", str(abs(hash(case["key"]))))[:10]
    args = docker_args(settings, name, std, 40, 10.0)
    args[-1] = "mkdir -p /work/tmp /work/in && tar -x -C /work && sh /work/batch.sh"
    if ubsan:
        i = args.index(settings.sandbox_image)
        args[i:i] = ["-e", "EXTRA=-fsanitize=undefined -fno-sanitize-recover=all"]
    try:
        cp = subprocess.run(args, input=make_tar(source, inputs), capture_output=True, timeout=600)
    except subprocess.TimeoutExpired:
        subprocess.run([*settings.docker_cmd, "rm", "-f", name], capture_output=True)
        return {"status": "run_error", "message": "batch timed out"}
    finally:
        subprocess.run([*settings.docker_cmd, "rm", "-f", name], capture_output=True)
    out = cp.stdout.decode("utf-8", "replace")
    m = re.search(r"@@B@@compile_rc=(\d+)\n", out)
    if not m:
        return {"status": "run_error", "message": (cp.stderr.decode("utf-8", "replace") or out)[-300:]}
    if m.group(1) != "0":
        return {"status": "compile_error", "message": out[m.end():]}
    outputs: list[dict] = []
    for cm in re.finditer(r"@@B@@case (\d+) rc=(-?\d+)\n(.*?)\n@@B@@end\n", out, re.S):
        rc, body = int(cm.group(2)), cm.group(3)
        j = body.rfind("\n@@CSQ_RESULT@@")
        e = body.rfind("\n@@CSQ_ERROR@@")
        if e >= 0:
            msg = body[e + len("\n@@CSQ_ERROR@@"):].strip()
            outputs.append({"error": msg})
        elif j >= 0 and rc == 0:
            try:
                outputs.append(json.loads(body[j + len("\n@@CSQ_RESULT@@"):].strip()))
            except json.JSONDecodeError:
                outputs.append({"error": "malformed result"})
        else:
            outputs.append({"error": f"exit code {rc}" + (" (time limit)" if rc == 124 else "")})
    if outputs and all("error" in o and "not supported by the native runner" in o["error"] for o in outputs):
        return {"status": "harness_error", "message": outputs[0]["error"]}
    return {"status": "ok", "outputs": outputs}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--std", default="c++17")
    ap.add_argument("--ubsan", action="store_true", help="compile with -fsanitize=undefined (aborts on signed overflow, bad shifts, ...)")
    ap.add_argument("--only", default="", help="substring filter on the case key")
    a = ap.parse_args()
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    cases = json.load(open(os.path.join(root, "tools", "native", "cases.json"), encoding="utf-8"))
    if a.only:
        cases = [c for c in cases if a.only.lower() in c["key"].lower()]
    settings = load_settings()
    results: dict[str, dict] = {}
    done, t0 = 0, time.time()

    def work(c: dict) -> tuple[str, dict]:
        return c["key"], run_case(settings, c, a.std, a.ubsan)

    with ThreadPoolExecutor(max_workers=a.workers) as pool:
        for key, res in pool.map(work, cases):
            results[key] = res
            done += 1
            if done % 25 == 0 or res["status"] != "ok":
                print(f"[{done}/{len(cases)}] {time.time() - t0:.0f}s {key}: {res['status']}", flush=True)
    path = os.path.join(root, "tools", "native", "results.json")
    if a.only and os.path.exists(path):
        merged = json.load(open(path, encoding="utf-8"))
        merged.update(results)
        results = merged
    json.dump(results, open(path, "w", encoding="utf-8"))
    bad = {s: sum(1 for r in results.values() if r["status"] == s) for s in ("ok", "compile_error", "harness_error", "run_error")}
    print("done", bad)


if __name__ == "__main__":
    main()
