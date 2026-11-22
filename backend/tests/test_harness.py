import pytest

from app.harness import HarnessError, build_function_program, extract_signature, parse_type


@pytest.mark.parametrize("raw,canon", [
    ("int", "int"), ("long long", "long long"), ("long", "long long"), ("const int&", "int"), ("string", "string"), ("std::string", "string"),
    ("vector<int>&", "vector<int>"), ("vector<vector<int> >", "vector<vector<int>>"), ("const vector<string>&", "vector<string>"),
    ("TreeNode*", "TreeNode*"), ("ListNode *", "ListNode*"), ("pair<int, int>", "pair<int,int>"), ("vector<pair<int,int>>&", "vector<pair<int,int>>"),
    ("bool", "bool"), ("double", "double"), ("vector<char>&", "vector<char>"), ("void", "void"),
])
def test_parse_type_accepts(raw, canon):
    assert parse_type(raw) == canon


@pytest.mark.parametrize("raw", ["unordered_map<int,int>", "Node*", "TreeNode", "int*", "vector<", "map<int,int>", "int; system(\"x\")", "vector<int>> a", "auto"])
def test_parse_type_rejects(raw):
    with pytest.raises(HarnessError):
        parse_type(raw)


def test_extract_class_method_and_free_function():
    s = extract_signature("class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        return {};\n    }\n};", "twoSum")
    assert (s.ret, s.params, s.in_class) == ("vector<int>", ["vector<int>", "int"], True)
    f = extract_signature("long long fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }", "fact")
    assert (f.ret, f.params, f.in_class) == ("long long", ["int"], False)


def test_extract_skips_calls_and_finds_the_definition():
    code = "class Solution {\npublic:\n    int helper(int x) { return x; }\n    int solve(int n) {\n        if (helper(n)) {\n            return helper(n);\n        }\n        return 0;\n    }\n};"
    assert extract_signature(code, "helper").params == ["int"]
    assert extract_signature(code, "solve").ret == "int"


def test_extract_void_and_tree_and_const_method():
    assert extract_signature("class Solution { public: void rotate(vector<vector<int>>& m) {} };", "rotate").ret == "void"
    assert extract_signature("class Solution { public: TreeNode* invert(TreeNode* root) { return root; } };", "invert").params == ["TreeNode*"]
    assert extract_signature("class Solution { public: bool ok(const string& s) const { return true; } };", "ok").params == ["string"]


def test_extract_unnamed_and_defaulted_params():
    assert extract_signature("int f(int, vector<int>&) { return 0; }", "f").params == ["int", "vector<int>"]
    assert extract_signature("int f(int a, int b = 3) { return 0; }", "f").params == ["int", "int"]


def test_missing_function_and_bad_name():
    with pytest.raises(HarnessError):
        extract_signature("int g() { return 1; }", "f")
    with pytest.raises(HarnessError):
        extract_signature("int g() { return 1; }", "g; system(1)")


def test_unsupported_signature_type_is_reported():
    with pytest.raises(HarnessError, match="unsupported type"):
        build_function_program("int f(unordered_map<int,int>& m) { return 0; }", "f")


def test_program_with_main_is_rejected_in_function_mode():
    with pytest.raises(HarnessError, match="main"):
        build_function_program("int f(int x){return x;} int main(){}", "f")


def test_generated_source_maps_lines_and_calls_the_function():
    src, sig = build_function_program("class Solution {\npublic:\n  int add(int a, int b) { return a + b; }\n};", "add")
    assert '#line 1 "solution.cpp"' in src and "Solution sol;" in src and "sol.add(a0, a1)" in src
    assert "csq::JR<int>::rd(in, a1)" in src
    free, _ = build_function_program("int add(int a, int b) { return a + b; }", "add")
    assert "Solution sol;" not in free and "int r = add(a0, a1);" in free


def test_explicit_signature_supplies_types():
    src, sig = build_function_program("class Solution {\npublic:\n  auto f(auto a) { return a; }\n};", "f", "vector<int> f(vector<int>& a)")
    assert sig.params == ["vector<int>"] and sig.in_class


def test_signature_cannot_inject_code():
    # only parsed, whitelisted types are used to generate code; any other text in the signature is discarded
    src, sig = build_function_program("int f(int a) { return a; }", "f", "int f(int a) { system(\"rm -rf /\"); } int g(int b)")
    assert sig.params == ["int"] and "rm -rf" not in src and "system(" not in src
    with pytest.raises(HarnessError):
        build_function_program("int f(int a) { return a; }", "f", "int f(Evil<int> a)")
