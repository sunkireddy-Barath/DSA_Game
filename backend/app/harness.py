"""Turns a LeetCode-style C++ solution (no main()) into a runnable program.

Only validated type descriptions (never raw text from the request) are used to generate the harness code, so
the request cannot inject extra C++ through the signature. The user's own code is, of course, compiled and run,
which is why everything executes inside the sandbox.
"""
from __future__ import annotations

import re
from dataclasses import dataclass


class HarnessError(ValueError):
    """The submitted code or signature cannot be turned into a runnable program (reported to the user as HTTP 422)."""


# ----------------------------------------------------------------------------------------- type grammar
_SIMPLE = {"int", "long long", "bool", "double", "float", "char", "string", "void"}
_ALIASES = {"long": "long long", "long int": "long long", "long long int": "long long", "int64_t": "long long", "std::string": "string"}


def _tokenize(t: str) -> list[str]:
    return re.findall(r"[A-Za-z_][A-Za-z_0-9:]*|<|>|,|\*", t)


def parse_type(raw: str) -> str:
    """Parse a C++ type into a canonical string, or raise HarnessError if it is not supported."""
    s = re.sub(r"\b(const|volatile|static|inline)\b", " ", raw)
    s = s.replace("&&", " ").replace("&", " ").replace("std::", "")
    toks = _tokenize(s)
    pos = 0

    def base() -> str:
        nonlocal pos
        words: list[str] = []
        while pos < len(toks) and re.fullmatch(r"[A-Za-z_][A-Za-z_0-9]*", toks[pos]) and toks[pos] not in ("vector", "pair"):
            words.append(toks[pos])
            pos += 1
        if not words:
            raise HarnessError(f"unsupported type: {raw.strip()!r}")
        name = " ".join(words)
        name = _ALIASES.get(name, name)
        if name in ("TreeNode", "ListNode"):
            if pos < len(toks) and toks[pos] == "*":
                pos += 1
                return name + "*"
            raise HarnessError(f"{name} must be passed as a pointer ({name}*)")
        if name not in _SIMPLE:
            raise HarnessError(f"unsupported type: {raw.strip()!r} (supported: int, long long, bool, double, float, char, string, vector<...>, pair<...>, TreeNode*, ListNode*)")
        return name

    def parse() -> str:
        nonlocal pos
        if pos < len(toks) and toks[pos] == "vector":
            pos += 1
            expect("<")
            inner = parse()
            expect(">")
            return f"vector<{inner}>"
        if pos < len(toks) and toks[pos] == "pair":
            pos += 1
            expect("<")
            a = parse()
            expect(",")
            b = parse()
            expect(">")
            return f"pair<{a},{b}>"
        return base()

    def expect(tok: str) -> None:
        nonlocal pos
        if pos < len(toks) and toks[pos] == tok:
            pos += 1
            return
        raise HarnessError(f"unsupported type: {raw.strip()!r}")

    out = parse()
    if pos != len(toks):
        raise HarnessError(f"unsupported type: {raw.strip()!r}")
    return out


# ----------------------------------------------------------------------------------------- signature extraction
_IDENT = re.compile(r"^[A-Za-z_]\w*$")
_LABELS = re.compile(r"^\s*(public|private|protected)\s*:\s*", re.M)


def _split_params(params: str) -> list[str]:
    out, depth, cur = [], 0, ""
    for ch in params:
        if ch == "<":
            depth += 1
        elif ch == ">":
            depth -= 1
        if ch == "," and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        out.append(cur)
    return [p.strip() for p in out if p.strip()]


@dataclass
class Signature:
    ret: str
    params: list[str]
    in_class: bool


def extract_signature(code: str, fn: str) -> Signature:
    if not _IDENT.match(fn):
        raise HarnessError("invalid function name")
    in_class = bool(re.search(r"\b(class|struct)\s+Solution\b", code))
    for m in re.finditer(r"\b" + re.escape(fn) + r"\s*\(([^()]*)\)\s*(?:const\s*)?(?:noexcept\s*)?\{", code):
        before = code[: m.start()]
        cut = max(before.rfind(";"), before.rfind("{"), before.rfind("}"))
        head = _LABELS.sub("", before[cut + 1:]).strip()
        head = re.sub(r"\b(static|inline|virtual|constexpr|friend)\b", " ", head).strip()
        if not head or head.startswith("template") or re.search(r"\b(return|new|else|delete|case)\b", head):
            continue
        try:
            ret = parse_type(head)
        except HarnessError:
            if not re.search(r"[A-Za-z_>\*]$", head):
                continue
            raise
        params = []
        for p in _split_params(m.group(1)):
            p = p.split("=")[0].strip()
            nm = re.match(r"^(?P<type>.+?[\s&*>])\s*(?P<name>[A-Za-z_]\w*)$", p)
            params.append(parse_type(nm.group("type") if nm else p))
        return Signature(ret=ret, params=params, in_class=in_class)
    raise HarnessError(f"could not find a definition of {fn}(...) in your code")


# ----------------------------------------------------------------------------------------- generated C++
PRELUDE = r"""#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val; ListNode *next, *prev, *random, *bottom;
    ListNode() : val(0), next(nullptr), prev(nullptr), random(nullptr), bottom(nullptr) {}
    ListNode(int x) : val(x), next(nullptr), prev(nullptr), random(nullptr), bottom(nullptr) {}
    ListNode(int x, ListNode* n) : val(x), next(n), prev(nullptr), random(nullptr), bottom(nullptr) {}
};
struct TreeNode {
    int val; TreeNode *left, *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode* l, TreeNode* r) : val(x), left(l), right(r) {}
};

namespace csq {
struct In {
    string s; size_t p = 0;
    [[noreturn]] void fail(const string& m) { cout << "\n@@CSQ_ERROR@@" << m << "\n"; cout.flush(); _Exit(3); }
    void ws() { while (p < s.size() && isspace((unsigned char)s[p])) p++; }
    bool eat(char c) { ws(); if (p < s.size() && s[p] == c) { p++; return true; } return false; }
    void expect(char c) {
        if (eat(c)) return;
        if (p < s.size() && s[p] == '{') fail("this input form is not supported by the native runner (use the in-browser tracer)");
        fail(string("malformed input: expected '") + c + "'");
    }
    bool peekNull() { ws(); return s.compare(p, 4, "null") == 0; }
    void skipNull() { p += 4; }
    string str() {
        expect('"'); string out;
        while (p < s.size() && s[p] != '"') {
            if (s[p] == '\\' && p + 1 < s.size()) {
                p++;
                char c = s[p];
                out += (c == 'n') ? '\n' : (c == 't') ? '\t' : (c == 'r') ? '\r' : c;
            } else out += s[p];
            p++;
        }
        if (p >= s.size()) fail("malformed input: unterminated string");
        p++; return out;
    }
    string numtok() {
        ws(); size_t b = p;
        while (p < s.size() && (isdigit((unsigned char)s[p]) || s[p] == '-' || s[p] == '+' || s[p] == '.' || s[p] == 'e' || s[p] == 'E')) p++;
        if (b == p) fail("this input form is not supported by the native runner (use the in-browser tracer)");
        return s.substr(b, p - b);
    }
    long long integer() {
        ws();
        string t = (p < s.size() && s[p] == '"') ? str() : numtok();
        try {
            if (t.find_first_of(".eE") != string::npos) return (long long)stod(t);
            return stoll(t);
        } catch (...) { fail("malformed number: " + t); }
    }
    double real() {
        ws();
        string t = (p < s.size() && s[p] == '"') ? str() : numtok();
        try { return stod(t); } catch (...) { fail("malformed number: " + t); }
    }
};

template <class T> struct JR;
template <> struct JR<int> { static void rd(In& i, int& v) { v = (int)i.integer(); } };
template <> struct JR<long long> { static void rd(In& i, long long& v) { v = i.integer(); } };
template <> struct JR<double> { static void rd(In& i, double& v) { v = i.real(); } };
template <> struct JR<float> { static void rd(In& i, float& v) { v = (float)i.real(); } };
template <> struct JR<bool> {
    static void rd(In& i, bool& v) {
        i.ws();
        if (i.s.compare(i.p, 4, "true") == 0) { v = true; i.p += 4; }
        else if (i.s.compare(i.p, 5, "false") == 0) { v = false; i.p += 5; }
        else i.fail("malformed input: expected a boolean");
    }
};
template <> struct JR<string> { static void rd(In& i, string& v) { v = i.str(); } };
template <> struct JR<char> {
    static void rd(In& i, char& v) {
        i.ws();
        if (i.p < i.s.size() && i.s[i.p] == '"') { string t = i.str(); if (t.size() != 1) i.fail("malformed input: expected a one-character string"); v = t[0]; }
        else v = (char)i.integer();
    }
};
template <class T> struct JR<vector<T>> {
    static void rd(In& i, vector<T>& v) {
        v.clear(); i.expect('[');
        if (i.eat(']')) return;
        do { T x{}; JR<T>::rd(i, x); v.push_back(std::move(x)); } while (i.eat(','));
        i.expect(']');
    }
};
template <class A, class B> struct JR<pair<A, B>> {
    static void rd(In& i, pair<A, B>& v) { i.expect('['); JR<A>::rd(i, v.first); i.expect(','); JR<B>::rd(i, v.second); i.expect(']'); }
};
template <> struct JR<TreeNode*> {
    static void rd(In& i, TreeNode*& root) {
        root = nullptr; i.expect('[');
        if (i.eat(']')) return;
        auto node = [&]() -> TreeNode* { if (i.peekNull()) { i.skipNull(); return nullptr; } return new TreeNode((int)i.integer()); };
        root = node();
        queue<TreeNode*> q;
        if (root) q.push(root);
        while (!q.empty() && i.eat(',')) {
            TreeNode* par = q.front(); q.pop();
            par->left = node(); if (par->left) q.push(par->left);
            if (i.eat(',')) { par->right = node(); if (par->right) q.push(par->right); }
        }
        while (i.eat(',')) node();
        i.expect(']');
    }
};
template <> struct JR<ListNode*> {
    static void rd(In& i, ListNode*& head) {
        head = nullptr; i.expect('[');
        if (i.eat(']')) return;
        ListNode* tail = nullptr;
        do {
            ListNode* n = new ListNode((int)i.integer());
            if (!head) head = n; else { tail->next = n; n->prev = tail; }
            tail = n;
        } while (i.eat(','));
        i.expect(']');
    }
};

template <class T> struct JW;
template <> struct JW<int> { static void wr(ostream& o, int v) { o << v; } };
template <> struct JW<long long> {
    static void wr(ostream& o, long long v) { if (v > 9007199254740991LL || v < -9007199254740991LL) o << '"' << v << '"'; else o << v; }
};
template <> struct JW<bool> { static void wr(ostream& o, bool v) { o << (v ? "true" : "false"); } };
template <> struct JW<double> {
    static void wr(ostream& o, double v) { if (!std::isfinite(v)) { o << "null"; return; } char b[48]; snprintf(b, sizeof b, "%.15g", v); o << b; }
};
template <> struct JW<float> { static void wr(ostream& o, float v) { JW<double>::wr(o, (double)v); } };
template <> struct JW<string> {
    static void wr(ostream& o, const string& v) {
        o << '"';
        for (unsigned char c : v) {
            if (c == '"') o << "\\\""; else if (c == '\\') o << "\\\\"; else if (c == '\n') o << "\\n"; else if (c == '\r') o << "\\r"; else if (c == '\t') o << "\\t";
            else if (c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\u%04x", c); o << b; } else o << (char)c;
        }
        o << '"';
    }
};
template <> struct JW<char> { static void wr(ostream& o, char v) { o << (int)(unsigned char)v; } };  // character code, same convention as the tracer
template <class T> struct JW<vector<T>> {
    static void wr(ostream& o, const vector<T>& v) { o << '['; for (size_t k = 0; k < v.size(); k++) { if (k) o << ','; JW<T>::wr(o, v[k]); } o << ']'; }
};
template <class A, class B> struct JW<pair<A, B>> {
    static void wr(ostream& o, const pair<A, B>& v) { o << '['; JW<A>::wr(o, v.first); o << ','; JW<B>::wr(o, v.second); o << ']'; }
};
template <> struct JW<TreeNode*> {
    static void wr(ostream& o, TreeNode* root) {
        vector<string> items; queue<TreeNode*> q; q.push(root); size_t guard = 0;
        while (!q.empty()) {
            TreeNode* n = q.front(); q.pop();
            if (!n) { items.push_back("null"); continue; }
            if (++guard > 200000) { o << "\"<tree too large or cyclic>\""; return; }
            items.push_back(to_string(n->val)); q.push(n->left); q.push(n->right);
        }
        while (!items.empty() && items.back() == "null") items.pop_back();
        o << '[';
        for (size_t k = 0; k < items.size(); k++) { if (k) o << ','; o << items[k]; }
        o << ']';
    }
};
template <> struct JW<ListNode*> {
    static void wr(ostream& o, ListNode* h) {
        o << '['; size_t guard = 0;
        for (ListNode* n = h; n; n = n->next) {
            if (++guard > 200000) { o << "\"<list too long or cyclic>\"]"; return; }
            if (guard > 1) { o << ','; }
            o << n->val;
        }
        o << ']';
    }
};
}  // namespace csq
"""


def _main(sig: Signature, fn: str) -> str:
    decls, reads, names = [], [], []
    for k, t in enumerate(sig.params):
        decls.append(f"    {t} a{k}{{}};")
        reads.append(("    in.expect(',');\n" if k else "") + f"    csq::JR<{t}>::rd(in, a{k});")
        names.append(f"a{k}")
    call = f"{fn}({', '.join(names)})"
    lines =["int main() {", "    ios::sync_with_stdio(false);", "    string all((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());", "    csq::In in{all};", "    in.expect('[');"]
    lines += decls + reads
    lines.append("    in.expect(']');")
    if sig.in_class:
        lines.append("    Solution sol;")
    callee = "sol." + call if sig.in_class else call
    if sig.ret == "void":
        lines.append(f"    {callee};")
        lines.append('    cout << "\\n@@CSQ_RESULT@@{\\"result\\":null,\\"args\\":[";')
    else:
        lines.append(f"    {sig.ret} r = {callee};")
        lines.append('    cout << "\\n@@CSQ_RESULT@@{\\"result\\":";')
        lines.append(f"    csq::JW<{sig.ret}>::wr(cout, r);")
        lines.append('    cout << ",\\"args\\":[";')
    for k, t in enumerate(sig.params):
        if k:
            lines.append("    cout << ',';")
        lines.append(f"    csq::JW<{t}>::wr(cout, a{k});")
    lines.append('    cout << "]}\\n";')
    lines.append("    return 0;")
    lines.append("}")
    return "\n".join(lines) + "\n"


def build_function_program(code: str, fn: str, signature: str | None = None) -> tuple[str, Signature]:
    """Return (full C++ source, signature). `signature` (e.g. "vector<int> twoSum(vector<int>& nums, int target)") is optional."""
    if re.search(r"\bint\s+main\s*\(", code):
        raise HarnessError("function mode: remove main() from your code, or run it in program mode")
    if signature:  # the signature only supplies the types; whether the function lives in a class is decided by the code
        sig = extract_signature(signature.rstrip().rstrip(";") + " {}", fn)
        sig.in_class = bool(re.search(r"\b(class|struct)\s+Solution\b", code))
    else:
        sig = extract_signature(code, fn)
    # #line makes compiler messages refer to the user's own line numbers (solution.cpp:LINE)
    return PRELUDE + '\n#line 1 "solution.cpp"\n' + code + '\n#line 1 "harness.cpp"\n' + _main(sig, fn), sig
