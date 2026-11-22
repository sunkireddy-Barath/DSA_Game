// Batch 8: Step 17 (tries) and Step 18 (hard strings) - the last unplayable sheet problems.
import { Playable, ap, mk } from './kit';

const TRIE_NODES = `// node i stores its 26 children (0 = none; node 0 is the root) and two counters
vector<vector<int>> children;
vector<int> endCount;
vector<int> prefixCount;

int newNode() {
    children.push_back(vector<int>(26, 0));
    endCount.push_back(0);
    prefixCount.push_back(0);
    return children.size() - 1;
}
`;

const kmpRef = (s: string, p: string) => { const out: number[] = []; if (!p.length) return out; for (let i = 0; i + p.length <= s.length; i++) if (s.startsWith(p, i)) out.push(i); return out; };
const lpsRef = (s: string) => { for (let k = s.length - 1; k > 0; k--) if (s.slice(0, k) === s.slice(s.length - k)) return k; return 0; };

export const B8_PROBLEMS: Playable[] = [
  mk('Implement Trie (Prefix Tree)', 'trieOperations', 'Operations: [1, word] insert, [2, word] search (whole word), [3, word] startsWith. types[i] and words[i] describe operation i. Return the 1/0 results of types 2 and 3 in order.', 'vector<int> trieOperations(vector<int>& types, vector<string>& words)', 'return {};', [
    ap('Array-based trie', 'O(L) per operation', 'O(total characters · 26)', 'n', 'Every operation walks one node per character: independent of how many words are stored.', TRIE_NODES + `
vector<int> trieOperations(vector<int>& types, vector<string>& words) {
    children.clear();
    endCount.clear();
    prefixCount.clear();
    newNode();
    vector<int> answers;
    for (int i = 0; i < types.size(); i++) {
        string word = words[i];
        int node = 0;
        bool found = true;
        for (int j = 0; j < word.size(); j++) {
            int c = word[j] - 'a';
            if (children[node][c] == 0) {
                if (types[i] == 1) {
                    int created = newNode();
                    children[node][c] = created;
                } else {
                    found = false;
                    break;
                }
            }
            node = children[node][c];
        }
        if (types[i] == 1) {
            endCount[node]++;
        } else if (types[i] == 2) {
            answers.push_back(found && endCount[node] > 0 ? 1 : 0);
        } else {
            answers.push_back(found ? 1 : 0);
        }
    }
    return answers;
}`)], [[[1, 1, 2, 3, 2, 3, 1, 2], ['apple', 'app', 'apple', 'app', 'apps', 'ap', 'apps', 'apps']], [[2, 3], ['a', 'a']], [[1, 2, 2, 3, 3], ['hello', 'hello', 'hell', 'hell', 'help']], [[1, 1, 3, 3, 3], ['cat', 'car', 'ca', 'cb', 'c']]], (t: number[], w: string[]) => { const set: string[] = []; const out: number[] = []; t.forEach((x, i) => { if (x === 1) set.push(w[i]); else if (x === 2) out.push(set.includes(w[i]) ? 1 : 0); else out.push(set.some(s => s.startsWith(w[i])) ? 1 : 0); }); return out; }, ['Each node has up to 26 children, one per letter.', 'Mark where a word ends.'], 'A trie shares common prefixes, so prefix queries cost O(length).'),
  mk('Implement Trie - II', 'trieCounts', 'Operations: [1, w] insert, [2, w] count words equal to w, [3, w] count words starting with w, [4, w] erase one copy of w (it exists). Return the results of types 2 and 3 in order.', 'vector<int> trieCounts(vector<int>& types, vector<string>& words)', 'return {};', [
    ap('Trie with end / prefix counters', 'O(L) per operation', 'O(total characters · 26)', 'n', 'prefixCount at each node says how many stored words pass through it; endCount how many end exactly there. Erase decrements along the same path.', TRIE_NODES + `
vector<int> trieCounts(vector<int>& types, vector<string>& words) {
    children.clear();
    endCount.clear();
    prefixCount.clear();
    newNode();
    vector<int> answers;
    for (int i = 0; i < types.size(); i++) {
        string word = words[i];
        int node = 0;
        bool found = true;
        if (types[i] == 1) {
            for (int j = 0; j < word.size(); j++) {
                int c = word[j] - 'a';
                if (children[node][c] == 0) {
                    int created = newNode();
                    children[node][c] = created;
                }
                node = children[node][c];
                prefixCount[node]++;
            }
            endCount[node]++;
        } else if (types[i] == 4) {
            for (int j = 0; j < word.size(); j++) {
                node = children[node][word[j] - 'a'];
                prefixCount[node]--;
            }
            endCount[node]--;
        } else {
            for (int j = 0; j < word.size(); j++) {
                int c = word[j] - 'a';
                if (children[node][c] == 0) {
                    found = false;
                    break;
                }
                node = children[node][c];
            }
            if (!found) {
                answers.push_back(0);
            } else if (types[i] == 2) {
                answers.push_back(endCount[node]);
            } else {
                answers.push_back(prefixCount[node]);
            }
        }
    }
    return answers;
}`)], [[[1, 1, 2, 3, 4, 2, 3], ['apple', 'apple', 'apple', 'app', 'apple', 'apple', 'app']], [[2, 3], ['x', 'x']], [[1, 1, 1, 3, 4, 3, 2], ['ab', 'abc', 'abd', 'ab', 'abc', 'ab', 'ab']], [[1, 4, 2, 3], ['a', 'a', 'a', 'a']]], (t: number[], w: string[]) => { const bag: string[] = []; const out: number[] = []; t.forEach((x, i) => { if (x === 1) bag.push(w[i]); else if (x === 4) bag.splice(bag.indexOf(w[i]), 1); else if (x === 2) out.push(bag.filter(s => s === w[i]).length); else out.push(bag.filter(s => s.startsWith(w[i])).length); }); return out; }, ['Keep two counters per node.'], 'Counters turn a trie into a multiset with prefix counting.'),
  mk('Longest String with All Prefixes', 'longestCompleteString', 'Return the longest word in the list such that every prefix of it is also in the list (shortest lexicographically among ties). Return "None" if there is none.', 'string longestCompleteString(vector<string>& words)', 'return "None";', [
    ap('Insert into a trie and check prefixes', 'O(total chars)', 'O(total chars · 26)', 'n', 'After inserting every word, a word qualifies iff every node on its path is marked as a word end.', TRIE_NODES + `
string longestCompleteString(vector<string>& words) {
    children.clear();
    endCount.clear();
    prefixCount.clear();
    newNode();
    for (int i = 0; i < words.size(); i++) {
        int node = 0;
        for (int j = 0; j < words[i].size(); j++) {
            int c = words[i][j] - 'a';
            if (children[node][c] == 0) {
                int created = newNode();
                children[node][c] = created;
            }
            node = children[node][c];
        }
        endCount[node] = 1;
    }
    string best = "";
    for (int i = 0; i < words.size(); i++) {
        int node = 0;
        bool ok = true;
        for (int j = 0; j < words[i].size(); j++) {
            node = children[node][words[i][j] - 'a'];
            if (endCount[node] == 0) {
                ok = false;
                break;
            }
        }
        if (ok && (words[i].size() > best.size() || (words[i].size() == best.size() && words[i] < best))) {
            best = words[i];
        }
    }
    if (best == "") {
        return "None";
    }
    return best;
}`)], [[['n', 'ni', 'nin', 'ninj', 'ninja', 'ninga']], [['ab', 'bc', 'abc']], [['a', 'banana', 'app', 'appl', 'ap', 'apply', 'apple']], [['x']], [['b', 'a', 'ab', 'ba']]], (w: string[]) => { const set = new Set(w); let best = ''; for (const x of w) { let ok = true; for (let k = 1; k <= x.length; k++) if (!set.has(x.slice(0, k))) ok = false; if (ok && (x.length > best.length || (x.length === best.length && x < best))) best = x; } return best || 'None'; }, ['All prefixes must themselves be words.'], 'In the trie, every node on the path must be an end-of-word node.'),
  mk('Number of Distinct Substrings in a String', 'countDistinctSubstrings', 'Return the number of distinct non-empty substrings of s.', 'int countDistinctSubstrings(string s)', 'return 0;', [
    ap('Insert every suffix into a trie', 'O(n²)', 'O(n²)', 'n2', 'Each new trie node corresponds to exactly one new distinct substring.', `int countDistinctSubstrings(string s) {
    vector<vector<int>> children;
    children.push_back(vector<int>(26, 0));
    int count = 0;
    for (int i = 0; i < s.size(); i++) {
        int node = 0;
        for (int j = i; j < s.size(); j++) {
            int c = s[j] - 'a';
            if (children[node][c] == 0) {
                children.push_back(vector<int>(26, 0));
                children[node][c] = children.size() - 1;
                count++;
            }
            node = children[node][c];
        }
    }
    return count;
}`)], [['abab'], ['aaa'], ['a'], ['abc'], ['abcabc'], ['']], (s: string) => { const set = new Set<string>(); for (let i = 0; i < s.length; i++) for (let j = i + 1; j <= s.length; j++) set.add(s.slice(i, j)); return set.size; }, ['A substring is a prefix of some suffix.'], 'Every node of the suffix trie is a distinct substring.'),
  mk('Bit Prerequisites for Trie Problems', 'bitFacts', 'For a non-negative n return {number of set bits, index of the highest set bit (-1 if n = 0), bit 3 of n, n with bit 3 set, n with bit 3 cleared, n with bit 3 toggled}.', 'vector<int> bitFacts(int n)', 'return {};', [
    ap('Shifts and masks', 'O(log n)', 'O(1)', 'logn', 'Test bit i with (n >> i) & 1, set with |= 1 << i, clear with &= ~(1 << i), toggle with ^= 1 << i. Binary tries use exactly these operations to walk a number bit by bit.', `vector<int> bitFacts(int n) {
    int setBits = 0;
    int highest = -1;
    for (int i = 0; i < 31; i++) {
        if ((n >> i) & 1) {
            setBits++;
            highest = i;
        }
    }
    int bit = (n >> 3) & 1;
    return {setBits, highest, bit, n | (1 << 3), n & ~(1 << 3), n ^ (1 << 3)};
}`)], [[0], [1], [8], [13], [255], [1000], [2147483647]], (n: number) => { let c = 0, h = -1; for (let i = 0; i < 31; i++) if ((n >> i) & 1) { c++; h = i; } return [c, h, (n >> 3) & 1, n | 8, n & ~8, n ^ 8]; }, ['Bit i has value 1 << i.'], 'A binary trie stores each integer as a path of 0/1 edges, most significant bit first.'),
  mk('Maximum XOR of Two Numbers in an Array', 'findMaximumXOR', 'Return the maximum a[i] XOR a[j] over all pairs (i may equal j).', 'int findMaximumXOR(vector<int>& nums)', 'return 0;', [
    ap('Brute force', 'O(n²)', 'O(1)', 'n2', 'Try every pair.', `int findMaximumXOR(vector<int>& nums) {
    int best = 0;
    for (int i = 0; i < nums.size(); i++) {
        for (int j = i; j < nums.size(); j++) {
            best = max(best, nums[i] ^ nums[j]);
        }
    }
    return best;
}`), ap('Binary trie', 'O(32·n)', 'O(32·n)', 'n', 'Insert numbers bit by bit; for each number walk the trie preferring the opposite bit at each level, which maximises the XOR greedily.', `int findMaximumXOR(vector<int>& nums) {
    vector<vector<int>> child;
    child.push_back(vector<int>(2, 0));
    for (int i = 0; i < nums.size(); i++) {
        int node = 0;
        for (int b = 30; b >= 0; b--) {
            int bit = (nums[i] >> b) & 1;
            if (child[node][bit] == 0) {
                child.push_back(vector<int>(2, 0));
                child[node][bit] = child.size() - 1;
            }
            node = child[node][bit];
        }
    }
    int best = 0;
    for (int i = 0; i < nums.size(); i++) {
        int node = 0;
        int value = 0;
        for (int b = 30; b >= 0; b--) {
            int bit = (nums[i] >> b) & 1;
            int want = 1 - bit;
            if (child[node][want] != 0) {
                value |= (1 << b);
                node = child[node][want];
            } else {
                node = child[node][bit];
            }
        }
        best = max(best, value);
    }
    return best;
}`)], [[[3, 10, 5, 25, 2, 8]], [[14, 70, 53, 83, 49, 91, 36, 80, 92, 51, 66, 70]], [[0]], [[8, 8]], [[1, 2, 3]], [[2, 4]]], (a: number[]) => { let b = 0; for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) b = Math.max(b, a[i] ^ a[j]); return b; }, ['To maximise XOR you want opposite bits from the top.'], 'Greedy on the most significant differing bit — a trie finds it in 31 steps.'),
  mk('Maximum XOR With an Element From Array', 'maximizeXor', 'For each query [x, m] return the max of x XOR a over array elements a ≤ m (-1 if none).', 'vector<int> maximizeXor(vector<int>& nums, vector<vector<int>>& queries)', 'return {};', [
    ap('Offline queries + binary trie', 'O((n + q) · 32 + sort)', 'O(32·n)', 'nlogn', 'Sort numbers and queries by m; insert numbers ≤ m into the trie as m grows and answer each query greedily.', `vector<int> maximizeXor(vector<int>& nums, vector<vector<int>>& queries) {
    vector<int> sorted = nums;
    sort(sorted.begin(), sorted.end());
    vector<int> order;
    for (int i = 0; i < queries.size(); i++) {
        order.push_back(i);
    }
    sort(order.begin(), order.end(), [&](int a, int b) {
        return queries[a][1] < queries[b][1];
    });
    vector<vector<int>> child;
    child.push_back(vector<int>(2, 0));
    vector<int> answers(queries.size(), -1);
    int next = 0;
    for (int q = 0; q < order.size(); q++) {
        int index = order[q];
        int x = queries[index][0];
        int limit = queries[index][1];
        while (next < sorted.size() && sorted[next] <= limit) {
            int node = 0;
            for (int b = 30; b >= 0; b--) {
                int bit = (sorted[next] >> b) & 1;
                if (child[node][bit] == 0) {
                    child.push_back(vector<int>(2, 0));
                    child[node][bit] = child.size() - 1;
                }
                node = child[node][bit];
            }
            next++;
        }
        if (next == 0) {
            continue;
        }
        int node = 0;
        int value = 0;
        for (int b = 30; b >= 0; b--) {
            int bit = (x >> b) & 1;
            int want = 1 - bit;
            if (child[node][want] != 0) {
                value |= (1 << b);
                node = child[node][want];
            } else {
                node = child[node][bit];
            }
        }
        answers[index] = value;
    }
    return answers;
}`)], [[[0, 1, 2, 3, 4], [[3, 1], [1, 3], [5, 6]]], [[5, 2, 4, 6, 6, 3], [[12, 4], [8, 1], [6, 3]]], [[7], [[1, 3], [1, 7]]], [[1, 2], [[5, 0]]]], (a: number[], q: number[][]) => q.map(([x, m]) => { const c = a.filter(v => v <= m); return c.length ? Math.max(...c.map(v => v ^ x)) : -1; }), ['Process queries in order of their limit m.'], 'Sorting queries offline lets one trie serve every limit.'),
  // ---------- hard strings ----------
  mk('Minimum Insertions to Make String Palindrome (Advanced)', 'minInsertionsFront', 'Return the minimum number of characters to insert ONLY at the beginning of s to make it a palindrome (solve in O(n) using the KMP failure function).', 'int minInsertionsFront(string s)', 'return 0;', [
    ap('Longest palindromic prefix via KMP on s + "#" + reverse(s)', 'O(n)', 'O(n)', 'n', 'The last value of the failure function is the length of the longest prefix of s that is a palindrome; the other n − that characters must be mirrored in front.', `int minInsertionsFront(string s) {
    int n = s.size();
    if (n == 0) {
        return 0;
    }
    string r = s;
    reverse(r.begin(), r.end());
    string t = s + "#" + r;
    vector<int> lps(t.size(), 0);
    for (int i = 1; i < t.size(); i++) {
        int k = lps[i - 1];
        while (k > 0 && t[i] != t[k]) {
            k = lps[k - 1];
        }
        if (t[i] == t[k]) {
            k++;
        }
        lps[i] = k;
    }
    return n - lps[t.size() - 1];
}`)], [['abcd'], ['aacecaaa'], ['a'], ['aa'], ['abb'], ['racecar'], ['']], (s: string) => { for (let k = s.length; k >= 0; k--) { const p = s.slice(0, k); if (p === [...p].reverse().join('')) return s.length - k; } return 0; }, ['Find the longest palindromic prefix.'], 'Matching s against its reverse reveals the longest prefix that is also a suffix of the reverse.'),
  mk('Shortest Palindrome', 'shortestPalindrome', 'Add characters only in front of s to make the shortest possible palindrome; return it.', 'string shortestPalindrome(string s)', 'return s;', [
    ap('KMP on s + "#" + reverse(s)', 'O(n)', 'O(n)', 'n', 'Longest palindromic prefix length from the failure function; prepend the reverse of the remaining suffix.', `string shortestPalindrome(string s) {
    int n = s.size();
    if (n == 0) {
        return s;
    }
    string r = s;
    reverse(r.begin(), r.end());
    string t = s + "#" + r;
    vector<int> lps(t.size(), 0);
    for (int i = 1; i < t.size(); i++) {
        int k = lps[i - 1];
        while (k > 0 && t[i] != t[k]) {
            k = lps[k - 1];
        }
        if (t[i] == t[k]) {
            k++;
        }
        lps[i] = k;
    }
    int keep = lps[t.size() - 1];
    string prefix = s.substr(keep);
    reverse(prefix.begin(), prefix.end());
    return prefix + s;
}`)], [['aacecaaa'], ['abcd'], ['a'], [''], ['aba'], ['abb']], (s: string) => { for (let k = s.length; k >= 0; k--) { const p = s.slice(0, k); if (p === [...p].reverse().join('')) return [...s.slice(k)].reverse().join('') + s; } return s; }, ['What is the longest prefix that is already a palindrome?'], 'Only the non-palindromic tail needs a mirror in front.'),
  mk('Longest Happy Prefix', 'longestPrefix', 'Return the longest non-empty proper prefix of s that is also a suffix ("" if none).', 'string longestPrefix(string s)', 'return "";', [
    ap('KMP failure function', 'O(n)', 'O(n)', 'n', 'lps[i] = length of the longest proper prefix of s[0..i] that is also its suffix; the answer is lps[n−1].', `string longestPrefix(string s) {
    int n = s.size();
    if (n == 0) {
        return "";
    }
    vector<int> lps(n, 0);
    for (int i = 1; i < n; i++) {
        int k = lps[i - 1];
        while (k > 0 && s[i] != s[k]) {
            k = lps[k - 1];
        }
        if (s[i] == s[k]) {
            k++;
        }
        lps[i] = k;
    }
    return s.substr(0, lps[n - 1]);
}`)], [['level'], ['ababab'], ['abc'], ['a'], ['aaaa'], ['abcabcabc']], (s: string) => s.slice(0, lpsRef(s)), ['Compare prefixes and suffixes of the same length.'], 'The failure function is exactly the "border" length.'),
  mk('Count and Say', 'countAndSay', 'countAndSay(1) = "1"; countAndSay(n) describes countAndSay(n−1) by run lengths ("21" → "1211"). Return countAndSay(n).', 'string countAndSay(int n)', 'return "1";', [
    ap('Iterative run-length description', 'O(total length)', 'O(length)', 'n', 'Each term is built by one pass over the previous one (lengths grow ~1.3× per step).', `string countAndSay(int n) {
    string current = "1";
    for (int step = 2; step <= n; step++) {
        string next = "";
        int i = 0;
        while (i < current.size()) {
            int j = i;
            while (j < current.size() && current[j] == current[i]) {
                j++;
            }
            next += to_string(j - i) + current[i];
            i = j;
        }
        current = next;
    }
    return current;
}`)], [[1], [2], [3], [4], [5], [6], [8]], (n: number) => { let s = '1'; for (let i = 2; i <= n; i++) s = s.replace(/(.)\1*/g, m => m.length + m[0]); return s; }, ['Group equal neighbouring digits.'], 'Read the previous term aloud: "two 1s" = "21".'),
  mk('Z-Function', 'zFunction', 'Return the Z-array: z[i] = length of the longest substring starting at i that is also a prefix of s (z[0] = n).', 'vector<int> zFunction(string s)', 'return {};', [
    ap('Naive comparison', 'O(n²)', 'O(n)', 'n2', 'Compare every suffix with the string from the start.', `vector<int> zFunction(string s) {
    int n = s.size();
    vector<int> z(n, 0);
    for (int i = 0; i < n; i++) {
        int k = 0;
        while (i + k < n && s[k] == s[i + k]) {
            k++;
        }
        z[i] = k;
    }
    return z;
}`), ap('Z-box (linear)', 'O(n)', 'O(n)', 'n', 'Keep the rightmost matching window [l, r); inside it z[i] can start from min(r − i, z[i − l]) so characters are never compared twice.', `vector<int> zFunction(string s) {
    int n = s.size();
    vector<int> z(n, 0);
    if (n == 0) {
        return z;
    }
    z[0] = n;
    int l = 0;
    int r = 0;
    for (int i = 1; i < n; i++) {
        if (i < r) {
            z[i] = min(r - i, z[i - l]);
        }
        while (i + z[i] < n && s[z[i]] == s[i + z[i]]) {
            z[i]++;
        }
        if (i + z[i] > r) {
            l = i;
            r = i + z[i];
        }
    }
    return z;
}`)], [['aabxaabxcaabxaabxay'], ['aaaaa'], ['abc'], ['a'], ['abababab'], ['']], (s: string) => Array.from(s, (_, i) => { let k = 0; while (i + k < s.length && s[k] === s[i + k]) k++; return k; }), ['A window that already matches the prefix lets you reuse earlier answers.'], 'The Z-box turns repeated comparisons into amortised O(n).'),
  mk('Rabin-Karp Algorithm', 'rabinKarp', 'Return the start indices of every occurrence of pattern p in text s (ascending), using a rolling hash.', 'vector<int> rabinKarp(string s, string p)', 'return {};', [
    ap('Rolling polynomial hash', 'O(n + m) average', 'O(1)', 'n', 'The hash of each window is derived from the previous one in O(1); only on a hash match are the characters compared, so false positives are rare.', `vector<int> rabinKarp(string s, string p) {
    vector<int> result;
    int n = s.size();
    int m = p.size();
    if (m == 0 || m > n) {
        return result;
    }
    long long MOD = 1000000007;
    long long BASE = 31;
    long long highPower = 1;
    for (int i = 1; i < m; i++) {
        highPower = highPower * BASE % MOD;
    }
    long long patternHash = 0;
    long long windowHash = 0;
    for (int i = 0; i < m; i++) {
        patternHash = (patternHash * BASE + (p[i] - 'a' + 1)) % MOD;
        windowHash = (windowHash * BASE + (s[i] - 'a' + 1)) % MOD;
    }
    for (int i = 0; i + m <= n; i++) {
        if (patternHash == windowHash && s.substr(i, m) == p) {
            result.push_back(i);
        }
        if (i + m < n) {
            windowHash = (windowHash - (s[i] - 'a' + 1) * highPower % MOD + MOD) % MOD;
            windowHash = (windowHash * BASE + (s[i + m] - 'a' + 1)) % MOD;
        }
    }
    return result;
}`)], [['abracadabra', 'abra'], ['aaaaa', 'aa'], ['abc', 'd'], ['abc', 'abc'], ['hello', 'lo'], ['abc', '']], (s: string, p: string) => kmpRef(s, p), ['Remove the leading character and add the trailing one.'], 'Hashing windows replaces O(m) comparisons by O(1) updates.'),
  mk('KMP Algorithm', 'kmpSearch', 'Return the start indices of every occurrence of pattern p in text s (ascending).', 'vector<int> kmpSearch(string s, string p)', 'return {};', [
    ap('Naive matching', 'O(n·m)', 'O(1)', 'n2', 'Restart the comparison at every position.', `vector<int> kmpSearch(string s, string p) {
    vector<int> result;
    int n = s.size();
    int m = p.size();
    if (m == 0) {
        return result;
    }
    for (int i = 0; i + m <= n; i++) {
        int j = 0;
        while (j < m && s[i + j] == p[j]) {
            j++;
        }
        if (j == m) {
            result.push_back(i);
        }
    }
    return result;
}`), ap('KMP with the failure function', 'O(n + m)', 'O(m)', 'n', 'The failure function tells how far the pattern can fall back after a mismatch, so the text pointer never moves backwards.', `vector<int> kmpSearch(string s, string p) {
    vector<int> result;
    int n = s.size();
    int m = p.size();
    if (m == 0) {
        return result;
    }
    vector<int> lps(m, 0);
    for (int i = 1; i < m; i++) {
        int k = lps[i - 1];
        while (k > 0 && p[i] != p[k]) {
            k = lps[k - 1];
        }
        if (p[i] == p[k]) {
            k++;
        }
        lps[i] = k;
    }
    int matched = 0;
    for (int i = 0; i < n; i++) {
        while (matched > 0 && s[i] != p[matched]) {
            matched = lps[matched - 1];
        }
        if (s[i] == p[matched]) {
            matched++;
        }
        if (matched == m) {
            result.push_back(i - m + 1);
            matched = lps[matched - 1];
        }
    }
    return result;
}`)], [['abracadabra', 'abra'], ['aaaaa', 'aa'], ['abc', 'd'], ['abc', 'abc'], ['ababcabababc', 'abab'], ['abc', '']], (s: string, p: string) => kmpRef(s, p), ['A mismatch should not discard what already matched.'], 'The failure function encodes the pattern\'s self-overlap.'),
];
