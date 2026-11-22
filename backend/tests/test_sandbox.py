"""Real container tests: these compile and run C++ with g++ 13 in the Docker sandbox. Skipped when Docker is unavailable."""
import time

import pytest

from app.harness import build_function_program
from app.sandbox import run_blocking
from tests.conftest import make_settings, needs_docker

pytestmark = [needs_docker, pytest.mark.sandbox]
S = make_settings()


def program(src, stdin="", std="c++17", timeout=3.0):
    return run_blocking(S, src, stdin, std, run_timeout=timeout)


def func(code, fn, args, std="c++17", **kw):
    from app.routes_run import split_result
    import json
    src, sig = build_function_program(code, fn)
    raw = run_blocking(S, src, json.dumps(args), std, **kw)
    assert raw.sandbox_error is None, raw.sandbox_error
    assert raw.compiled, raw.compile_output
    out, result, after, err = split_result(raw.stdout)
    return raw, out, result, after, err


def test_hello_world_and_stdin():
    r = program('#include <bits/stdc++.h>\nint main(){ std::string s; std::cin >> s; std::cout << "hi " << s; }', stdin="bob")
    assert r.compiled and r.run_rc == 0 and r.stdout.strip() == "hi bob"


def test_function_style_solution_without_main():
    code = "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int,int> seen;\n        for (int i = 0; i < (int)nums.size(); i++) {\n            if (seen.count(target - nums[i])) return {seen[target - nums[i]], i};\n            seen[nums[i]] = i;\n        }\n        return {};\n    }\n};"
    raw, out, result, after, err = func(code, "twoSum", [[2, 7, 11, 15], 9])
    assert err is None and result == [0, 1] and after == [[2, 7, 11, 15], 9]
    assert "warning" not in raw.compile_output          # the harness itself must not produce warnings


def test_free_function_and_all_scalar_types():
    raw, _, result, _, err = func("string f(int a, long long b, bool c, double d, string s, char ch) { return s + to_string(a) + to_string(b) + (c ? \"T\" : \"F\") + ch; }", "f", [1, 2, True, 1.5, "x", "z"])
    assert err is None and result == "x12Tz"


def test_c_plus_plus_20_features_need_c_plus_plus_20():
    code = "int f(vector<int>& v) { ranges::sort(v); return v.front(); }"
    raw, _, result, _, err = func(code, "f", [[3, 1, 2]], std="c++20")
    assert err is None and result == 1
    src, _ = build_function_program(code, "f")
    old = program(src, stdin="[[3,1,2]]", std="c++17")
    assert not old.compiled and "ranges" in old.compile_output


def test_void_function_returns_modified_arguments():
    raw, _, result, after, err = func("class Solution {\npublic:\n    void rotate(vector<int>& a, int k) { std::rotate(a.begin(), a.begin() + k, a.end()); }\n};", "rotate", [[1, 2, 3, 4, 5], 2])
    assert err is None and result is None and after == [[3, 4, 5, 1, 2], 2]


def test_tree_and_list_round_trip():
    _, _, tree, _, err = func("TreeNode* invert(TreeNode* r) { if (!r) return r; swap(r->left, r->right); invert(r->left); invert(r->right); return r; }", "invert", [[4, 2, 7, 1, 3, 6, 9]])
    assert err is None and tree == [4, 7, 2, 9, 6, 3, 1]
    _, _, lst, _, err2 = func("ListNode* rev(ListNode* h) { ListNode* p = nullptr; while (h) { ListNode* n = h->next; h->next = p; p = h; h = n; } return p; }", "rev", [[1, 2, 3, 4]])
    assert err2 is None and lst == [4, 3, 2, 1]
    _, _, null_tree, _, _ = func("TreeNode* f(TreeNode* r) { return r; }", "f", [[1, None, 2, None, 3]])
    assert null_tree == [1, None, 2, None, 3]


def test_large_long_long_is_exact():
    _, _, result, _, err = func("long long f(long long a) { return a * 3; }", "f", [4000000000000000])
    assert err is None and result == "12000000000000000"       # beyond 2^53 is returned as a string (same convention as the tracer)


def test_nested_containers_and_pairs():
    _, _, result, _, err = func("vector<vector<string>> g(vector<pair<int,int>>& p) { vector<vector<string>> o; for (auto& x : p) o.push_back({to_string(x.first), to_string(x.second)}); return o; }", "g", [[[1, 2], [3, 4]]])
    assert err is None and result == [["1", "2"], ["3", "4"]]


def test_unsupported_input_form_gives_a_clear_error():
    _, _, result, _, err = func("ListNode* f(ListNode* h) { return h; }", "f", [{"list": [1, 2], "pos": 0}])
    assert result is None and "not supported by the native runner" in err


def test_compile_error_uses_the_users_line_numbers():
    src, _ = build_function_program("int f(int a) {\n    return a +;\n}", "f")
    r = program(src, stdin="[1]")
    assert not r.compiled and "solution.cpp:2" in r.compile_output


def test_runtime_error_and_exit_code():
    raw, *_ = func("int f(int a) { int* p = nullptr; return *p; }", "f", [1])
    assert raw.run_rc == 139 and raw.oom_or_killed


def test_infinite_loop_is_killed_at_the_time_limit():
    t = time.time()
    r = program("int main(){ while(true){} }", timeout=2.0)
    assert r.timed_out and r.run_rc == 124 and time.time() - t < 30


def test_memory_bomb_is_contained():
    r = program("#include <vector>\nint main(){ std::vector<char*> v; while(true){ char* p = new char[1<<24]; for (int i=0;i<(1<<24);i+=4096) p[i]=1; v.push_back(p);} }", timeout=5.0)
    assert r.compiled and r.run_rc not in (0, None)


def test_no_network_inside_the_sandbox():
    code = r'''#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <cstdio>
int main(){ int s = socket(AF_INET, SOCK_STREAM, 0); sockaddr_in a{}; a.sin_family = AF_INET; a.sin_port = htons(80); inet_pton(AF_INET, "1.1.1.1", &a.sin_addr);
  int r = connect(s, (sockaddr*)&a, sizeof a); printf("connect=%d\n", r); return r == 0 ? 0 : 7; }'''
    r = program(code)
    assert r.compiled and r.run_rc == 7 and "connect=-1" in r.stdout


def test_filesystem_is_read_only_except_the_scratch_tmpfs():
    code = r'''#include <cstdio>
int main(){ FILE* a = fopen("/etc/csq_probe", "w"); FILE* b = fopen("/usr/csq_probe", "w"); FILE* c = fopen("/work/ok.txt", "w");
  printf("etc=%d usr=%d work=%d\n", a != nullptr, b != nullptr, c != nullptr); return 0; }'''
    r = program(code)
    assert "etc=0 usr=0 work=1" in r.stdout


def test_runs_as_an_unprivileged_user_without_capabilities():
    code = r'''#include <unistd.h>
#include <cstdio>
#include <fstream>
#include <string>
int main(){ printf("uid=%d\n", (int)getuid()); std::ifstream f("/proc/self/status"); std::string l; while (std::getline(f, l)) if (l.rfind("CapEff", 0) == 0) printf("%s\n", l.c_str()); }'''
    r = program(code)
    assert "uid=65534" in r.stdout and "CapEff:\t0000000000000000" in r.stdout


def test_fork_bomb_is_limited_by_pids_limit():
    code = r'''#include <unistd.h>
#include <sys/wait.h>
#include <cstdio>
int main(){ int made = 0; for (int i = 0; i < 2000; i++) { pid_t p = fork(); if (p == 0) { sleep(2); _exit(0); } if (p < 0) break; made++; } printf("made=%d\n", made); return 0; }'''
    t = time.time()
    r = program(code, timeout=4.0)
    assert r.compiled
    made = int(r.stdout.split("made=")[1].split()[0]) if "made=" in r.stdout else 0
    assert made < 400 and time.time() - t < 40


def test_huge_output_is_truncated():
    r = program('#include <cstdio>\nint main(){ for (int i = 0; i < 2000000; i++) printf("xxxxxxxxxx\\n"); }', timeout=5.0)
    assert r.compiled and len(r.stdout) <= 70000


def test_containers_do_not_leak_between_runs():
    program('#include <cstdio>\nint main(){ FILE* f = fopen("/work/secret.txt", "w"); fputs("leak", f); fclose(f); }')
    r = program('#include <cstdio>\nint main(){ FILE* f = fopen("/work/secret.txt", "r"); printf("found=%d\\n", f != nullptr); }')
    assert "found=0" in r.stdout


def test_route_end_to_end_with_real_sandbox(make_client):
    c = make_client()
    c.post("/api/auth/register", json={"email": "ada@example.com", "password": "correct horse battery"})
    r = c.post("/api/run/cpp", json={"code": "class Solution {\npublic:\n    int add(int a, int b) { return a + b; }\n};", "fn": "add", "args": [40, 2]})
    j = r.json()
    assert r.status_code == 200 and j["ok"] and j["result"] == 42 and j["timeMs"] >= 0
    assert c.get("/api/run/status").json()["available"] is True


def test_batch_compiles_once_and_runs_every_test(make_client):
    c = make_client()
    c.post("/api/auth/register", json={"email": "ada@example.com", "password": "correct horse battery"})
    code = "class Solution {\npublic:\n    int fib(int n) { return n < 2 ? n : fib(n - 1) + fib(n - 2); }\n};"
    t = time.time()
    r = c.post("/api/run/cpp-tests", json={"code": code, "fn": "fib", "tests": [[0], [1], [10], [20], [25]]})
    j = r.json()
    assert r.status_code == 200 and j["compiled"] and [x["result"] for x in j["cases"]] == [0, 1, 55, 6765, 75025]
    assert all(x["ok"] for x in j["cases"]) and time.time() - t < 30


def test_batch_one_bad_test_does_not_stop_the_others(make_client):
    c = make_client()
    c.post("/api/auth/register", json={"email": "ada@example.com", "password": "correct horse battery"})
    code = "int f(int n) { if (n == 1) { while (true) {} } return n * 2; }"
    j = c.post("/api/run/cpp-tests", json={"code": code, "fn": "f", "tests": [[0], [1], [2]], "timeoutSec": 1}).json()
    assert [x["ok"] for x in j["cases"]] == [True, False, True] and "time limit" in j["cases"][1]["error"] and j["cases"][2]["result"] == 4
