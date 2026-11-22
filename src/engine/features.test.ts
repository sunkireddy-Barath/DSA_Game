import { describe, expect, it } from 'vitest';
import { runCpp } from './interp';

const run = (body: string, args: any[] = [], fn = 'f', dll = false) => runCpp(`class Solution {\npublic:\n${body}\n};`, fn, args, { trace: false, dll });
const val = (body: string, args: any[] = [], dll = false) => { const r = run(body, args, 'f', dll); expect(r.error, r.error).toBeUndefined(); return r.result; };

describe('switch', () => {
  it('matches, falls through and breaks', () => {
    const src = `int f(int n) { int r = 0; switch (n) { case 1: r += 1; case 2: r += 10; break; case 3: r = 99; break; default: r = -1; } return r; }`;
    expect([1, 2, 3, 9].map(n => val(src, [n]))).toEqual([11, 10, 99, -1]);
  });
  it('works on chars and inside loops with continue', () => {
    expect(val(`int f(string s) { int c = 0; for (int i = 0; i < s.size(); i++) { switch (s[i]) { case 'a': case 'e': c++; break; case 'x': continue; default: break; } c += 100; } return c; }`, ['axe'])).toBe(202);
  });
});

describe('pairs, structured bindings, maps', () => {
  it('pair members, comparison and sorting by default order', () => {
    expect(val(`vector<int> f(vector<vector<int>>& v) { vector<pair<int,int>> p; for (int i = 0; i < v.size(); i++) p.push_back({v[i][0], v[i][1]}); sort(p.begin(), p.end()); vector<int> out; for (int i = 0; i < p.size(); i++) { out.push_back(p[i].first); out.push_back(p[i].second); } return out; }`, [[[3, 1], [1, 9], [1, 2]]])).toEqual([1, 2, 1, 9, 3, 1]);
  });
  it('structured bindings in decls and range-for (map is sorted, unordered_map keeps insertion order)', () => {
    expect(val(`int f(vector<int>& a) { map<int,int> m; for (int x : a) m[x]++; int best = 0; for (auto& [k, c] : m) best = max(best, k * c); auto [lo, hi] = make_pair(m.begin()->first, m.rbegin()->first); return best * 1000 + lo * 10 + hi; }`, [[3, 1, 3, 2]])).toBe(6000 + 10 + 3);
  });
  it('find / end / iterator members / erase by iterator', () => {
    expect(val(`int f(vector<int>& a) { unordered_map<int,int> m; for (int x : a) m[x] = x * x; auto it = m.find(4); if (it == m.end()) return -1; int v = it->second; m.erase(it); return m.count(4) == 0 ? v : -2; }`, [[2, 4, 6]])).toBe(16);
    expect(val(`int f() { unordered_map<int,int> m; return m.find(1) == m.end() ? 1 : 0; }`)).toBe(1);
  });
  it('value-keyed maps and sets (pairs and vectors as keys)', () => {
    expect(val(`int f(vector<vector<int>>& v) { set<pair<int,int>> s; for (auto& p : v) s.insert({p[0], p[1]}); map<vector<int>, int> m; m[{1, 2}]++; m[{1, 2}]++; return s.size() * 10 + m[{1, 2}]; }`, [[[1, 2], [1, 2], [2, 1]]])).toBe(22);
  });
  it('set lower_bound / upper_bound', () => {
    expect(val(`int f() { set<int> s = {1, 5, 9}; auto a = s.lower_bound(5); auto b = s.upper_bound(5); auto c = s.lower_bound(10); return *a * 100 + *b * 10 + (c == s.end() ? 1 : 0); }`)).toBe(500 + 90 + 1);
  });
  it('priority_queue of pairs (min-heap by distance)', () => {
    expect(val(`vector<int> f() { priority_queue<pair<int,int>, vector<pair<int,int>>, greater<pair<int,int>>> pq; pq.push({5, 1}); pq.push({2, 7}); pq.push({2, 3}); vector<int> out; while (!pq.empty()) { auto [d, v] = pq.top(); pq.pop(); out.push_back(d * 10 + v); } return out; }`)).toEqual([23, 27, 51]);
  });
});

describe('lambdas, function comparators and STL algorithms', () => {
  it('sort with a lambda comparator (descending, then by second)', () => {
    expect(val(`vector<vector<int>> f(vector<vector<int>>& v) { sort(v.begin(), v.end(), [](vector<int>& a, vector<int>& b) { if (a[0] != b[0]) return a[0] > b[0]; return a[1] < b[1]; }); return v; }`, [[[1, 5], [3, 2], [3, 1], [2, 9]]])).toEqual([[3, 1], [3, 2], [2, 9], [1, 5]]);
  });
  it('named comparator function and greater<int>()', () => {
    expect(val(`bool byLen(string& a, string& b) { return a.size() < b.size(); }\nvector<string> f(vector<string>& v) { sort(v.begin(), v.end(), byLen); return v; }`, [['ccc', 'a', 'bb']])).toEqual(['a', 'bb', 'ccc']);
    expect(val(`vector<int> f(vector<int>& v) { sort(v.begin(), v.end(), greater<int>()); return v; }`, [[1, 3, 2]])).toEqual([3, 2, 1]);
  });
  it('lambdas capture and mutate enclosing variables', () => { expect(val(`int f() { int total = 0; auto add = [&](int x) { total += x; return total; }; add(3); add(4); return total; }`)).toBe(7); });
  it('iterator algorithms', () => {
    expect(val(`int f(vector<int>& v) { int m = *max_element(v.begin(), v.end()); int idx = min_element(v.begin(), v.end()) - v.begin(); int s = accumulate(v.begin(), v.end(), 0); return m * 10000 + idx * 100 + s; }`, [[4, 9, 1, 6]])).toBe(90000 + 200 + 20);
    expect(val(`vector<int> f(vector<int>& v) { sort(v.begin(), v.end()); auto it = lower_bound(v.begin(), v.end(), 5); v.insert(it, 5); v.erase(v.begin()); reverse(v.begin() + 1, v.end()); return v; }`, [[1, 3, 7, 9]])).toEqual([3, 9, 7, 5]);
    expect(val(`int f(vector<int>& v) { sort(v.begin(), v.end()); v.erase(unique(v.begin(), v.end()), v.end()); return v.size(); }`, [[3, 1, 3, 2, 1]])).toBe(3);
    expect(val(`vector<int> f(vector<int>& v) { next_permutation(v.begin(), v.end()); return v; }`, [[1, 2, 3]])).toEqual([1, 3, 2]);
  });
  it('strings: find, substr, to_string, stoi, char helpers, reverse on a string', () => {
    expect(val(`string f(string s) { reverse(s.begin(), s.end()); return s; }`, ['abc'])).toBe('cba');
    expect(val(`int f(string s) { int p = s.find("lo"); return p * 100 + (s.find('z') == string::npos ? 1 : 0); }`, ['hello'])).toBe(301);
    expect(val(`string f(int n) { return to_string(n) + "!" + to_string(stoi("42") + 1); }`, [7])).toBe('7!43');
    expect(val(`string f(string s) { string o = ""; for (char c : s) { if (isalpha(c)) o += toupper(c); else if (isdigit(c)) o += '#'; } return o; }`, ['a1b2'])).toBe('A#B#');
  });
});

describe('doubles and 64-bit integers', () => {
  it('int division stays integral, double division does not', () => {
    expect(val(`double f() { int a = 7, b = 2; double x = a / b; double y = a / 2.0; return x * 10 + y; }`)).toBeCloseTo(30 + 3.5);
    expect(val(`double f(vector<int>& v) { double s = 0; for (int x : v) s += x; return s / v.size(); }`, [[1, 2, 4]])).toBeCloseTo(7 / 3);
  });
  it('math functions and casts', () => {
    expect(val(`int f() { return (int)sqrt(50) * 100 + (int)pow(2, 10) / 100 + (int)ceil(2.1); }`)).toBe(700 + 10 + 3);
    expect(val(`int f(int n) { return (int)floor(n / 2.0); }`, [7])).toBe(3);
  });
  it('doubles are truthy by value', () => { expect(val(`int f() { double d = 0.0; if (d) return 1; d = 0.5; if (d) return 2; return 3; }`)).toBe(2); });
  it('long long arithmetic is exact beyond 2^53 (modular exponentiation)', () => {
    expect(val(`long long f(long long b, long long e, long long m) { long long r = 1; b %= m; while (e > 0) { if (e & 1) r = r * b % m; b = b * b % m; e >>= 1; } return r; }`, [123456789, 1000000006, 1000000007])).toBe(1); // Fermat: a^(p-1) mod p = 1, needs exact 64-bit products
    expect(val(`long long f() { long long x = 1; x <<= 62; return x; }`)).toBe('4611686018427387904');
    expect(val(`long long f() { return LLONG_MAX; }`)).toBe('9223372036854775807');
  });
  it('int overflow wraps on assignment like C++', () => { expect(val(`int f() { int x = INT_MAX; x = x + 1; return x; }`)).toBe(-2147483648); expect(val(`int f() { int a = 100000; int b = a * a; return b; }`)).toBe(1410065408); });
  it('bit tricks beyond 32 bits', () => { expect(val(`long long f() { long long m = 0; for (int i = 0; i < 40; i += 13) m |= (1LL << i); return m; }`)).toBe(Number(1n + (1n << 13n) + (1n << 26n) + (1n << 39n))); expect(val(`int f() { return __builtin_popcount(255) + __builtin_popcountll(1LL << 40); }`)).toBe(9); });
});

describe('arrays, DLL pointers and other inputs', () => {
  it('C-style multi-dimensional arrays and array<T,N>', () => {
    expect(val(`int f() { int g[3][4]; for (int i = 0; i < 3; i++) for (int j = 0; j < 4; j++) g[i][j] = i * j; array<int, 3> a{}; a[2] = 5; return g[2][3] + a[2] + a.size(); }`)).toBe(6 + 5 + 3);
  });
  it('doubly linked list prev pointers are built from the input', () => {
    expect(val(`int f(ListNode* head) { ListNode* t = head; while (t->next != nullptr) t = t->next; int s = 0; while (t != nullptr) { s = s * 10 + t->val; t = t->prev; } return s; }`, [[1, 2, 3]], true)).toBe(321);
  });
  it('shared tail, random pointers and flatten columns', () => {
    const inter = `ListNode* f(ListNode* a, ListNode* b) { ListNode* x = a; ListNode* y = b; while (x != y) { x = x == nullptr ? b : x->next; y = y == nullptr ? a : y->next; } return x; }`;
    expect(val(inter, [{ list: [1, 2], share: { id: 'c', list: [8, 9] } }, { list: [5], share: { id: 'c', list: [8, 9] } }])).toEqual([8, 9]);
    expect(val(`ListNode* f(ListNode* h) { return h; }`, [{ list: [7, 8, 9], random: [2, 0, -1] }])).toEqual({ list: [7, 8, 9], random: [2, 0, -1] });
    expect(val(`ListNode* f(ListNode* h) { return h; }`, [{ cols: [[5, 7, 8], [10, 20]] }])).toEqual([5, 10, 20]); // follows next, then bottom when next is null
  });
  it('emplace_back with several arguments builds pairs', () => { expect(val(`int f() { vector<pair<int,int>> v; v.emplace_back(2, 3); v.push_back(make_pair(4, 5)); return v[0].second * 10 + v[1].first; }`)).toBe(34); });
});
