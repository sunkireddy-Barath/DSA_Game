// Batch 2: strings, linked lists (singly, doubly, special), recursion/backtracking, bit manipulation.
import { Playable, ap, mk } from './kit';

const sortNum = (a: number[]) => [...a].sort((x, y) => x - y);

// ---------- helpers for references ----------
const insertList = (a: number[], pos: number, v: number) => [...a.slice(0, pos), v, ...a.slice(pos)];
const delList = (a: number[], pos: number) => a.filter((_, i) => i !== pos);
const combos = (cands: number[], target: number, reuse: boolean, dedupe: boolean): number[][] => {
  const c = sortNum(cands); const out: number[][] = [];
  const go = (i: number, rem: number, cur: number[]) => { if (rem === 0) { out.push([...cur]); return; } for (let k = i; k < c.length; k++) { if (c[k] > rem) break; if (dedupe && k > i && c[k] === c[k - 1]) continue; cur.push(c[k]); go(reuse ? k : k + 1, rem - c[k], cur); cur.pop(); } };
  go(0, target, []); return out;
};

export const B2_PROBLEMS: Playable[] = [
  // ---------- Step 5: strings ----------
  mk('Check if one string is a rotation of another', 'isRotation', 'Return true if b is a rotation of a (e.g. "cdeab" is a rotation of "abcde").', 'bool isRotation(string a, string b)', 'return false;', [
    ap('Try every rotation', 'O(n²)', 'O(n)', 'n2', 'n rotations, each compared in O(n).', `bool isRotation(string a, string b) {
    if (a.size() != b.size()) {
        return false;
    }
    int n = a.size();
    for (int shift = 0; shift < n; shift++) {
        bool same = true;
        for (int i = 0; i < n; i++) {
            if (a[(i + shift) % n] != b[i]) {
                same = false;
                break;
            }
        }
        if (same) {
            return true;
        }
    }
    return n == 0;
}`), ap('Doubled string + find', 'O(n) with a linear-time search', 'O(n)', 'n', 'Every rotation of a is a substring of a+a, so one substring search decides it (O(n) with KMP/two-way; a naive search is O(n²) worst case). The doubled string costs O(n) space.', `bool isRotation(string a, string b) {
    if (a.size() != b.size()) {
        return false;
    }
    string doubled = a + a;
    return doubled.find(b) != string::npos;
}`)], [['abcde', 'cdeab'], ['abcde', 'abced'], ['aa', 'aa'], ['ab', 'abc'], ['waterbottle', 'erbottlewat']], (a: string, b: string) => a.length === b.length && (a + a).includes(b), ['Which strings contain every rotation of a as a substring?'], 'Rotations of a are exactly the length-n windows of a + a.'),
  mk('Sort Characters by Frequency', 'frequencySort', 'Sort characters by decreasing frequency (ties by character A-Z).', 'string frequencySort(string s)', 'return "";', [
    ap('Count + sort by (frequency, char)', 'O(n + d log d)', 'O(d)', 'nlogn', 'Counting is O(n); sorting the d distinct characters costs O(d log d); building the answer is O(n).', `string frequencySort(string s) {
    unordered_map<char, int> freq;
    for (char c : s) {
        freq[c]++;
    }
    vector<pair<int, int>> items;
    for (auto& [c, n] : freq) {
        items.push_back({n, c});
    }
    sort(items.begin(), items.end(), [](pair<int, int>& a, pair<int, int>& b) {
        if (a.first != b.first) {
            return a.first > b.first;
        }
        return a.second < b.second;
    });
    string result = "";
    for (auto& [n, c] : items) {
        for (int i = 0; i < n; i++) {
            result += (char)c;
        }
    }
    return result;
}`)], [['tree'], ['cccaaa'], ['Aabb'], ['a'], ['zzyyxxw']], (s: string) => { const m = new Map<string, number>(); [...s].forEach(c => m.set(c, (m.get(c) ?? 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([c, n]) => c.repeat(n)).join(''); }, ['Count each character first.', 'Sort the (count, char) pairs.'], 'Group equal characters, then order the groups by size.'),
  mk('Count Number of Substrings', 'countSubstrings', 'Count substrings of s (lowercase letters) with exactly k distinct characters.', 'int countSubstrings(string s, int k)', 'return 0;', [
    ap('Brute force', 'O(n²)', 'O(1)', 'n2', 'Extend every start index while tracking the distinct count in a 26-slot array.', `int countSubstrings(string s, int k) {
    int total = 0;
    for (int i = 0; i < s.size(); i++) {
        vector<int> seen(26, 0);
        int distinct = 0;
        for (int j = i; j < s.size(); j++) {
            if (seen[s[j] - 'a'] == 0) {
                distinct++;
            }
            seen[s[j] - 'a']++;
            if (distinct == k) {
                total++;
            } else if (distinct > k) {
                break;
            }
        }
    }
    return total;
}`), ap('Sliding window: atMost(k) - atMost(k-1)', 'O(n)', 'O(1)', 'n', 'Each atMost call is a two-pointer pass (each pointer moves right only); "exactly k" = at most k minus at most k-1.', `int atMost(string& s, int k) {
    if (k < 0) {
        return 0;
    }
    vector<int> count(26, 0);
    int distinct = 0;
    int left = 0;
    int total = 0;
    for (int right = 0; right < s.size(); right++) {
        if (count[s[right] - 'a'] == 0) {
            distinct++;
        }
        count[s[right] - 'a']++;
        while (distinct > k) {
            count[s[left] - 'a']--;
            if (count[s[left] - 'a'] == 0) {
                distinct--;
            }
            left++;
        }
        total += right - left + 1;
    }
    return total;
}

int countSubstrings(string s, int k) {
    return atMost(s, k) - atMost(s, k - 1);
}`)], [['pqpqs', 2], ['aabab', 3], ['abc', 1], ['aaaa', 1], ['abcabc', 3]], (s: string, k: number) => { let c = 0; for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) if (new Set(s.slice(i, j + 1)).size === k) c++; return c; }, ['"Exactly k" is hard directly; count "at most k" instead.'], 'exactly(k) = atMost(k) − atMost(k−1).'),
  mk('Sum of Beauty of All Substrings', 'beautySum', 'The beauty of a string is (highest letter frequency − lowest non-zero frequency). Return the sum of beauties of all substrings.', 'int beautySum(string s)', 'return 0;', [
    ap('Extend each start, track frequencies', 'O(26·n²)', 'O(1)', 'n2', 'n(n+1)/2 substrings, each evaluated in at most 26 steps from a frequency array that is updated incrementally.', `int beautySum(string s) {
    int total = 0;
    for (int i = 0; i < s.size(); i++) {
        vector<int> freq(26, 0);
        for (int j = i; j < s.size(); j++) {
            freq[s[j] - 'a']++;
            int high = 0;
            int low = INT_MAX;
            for (int c = 0; c < 26; c++) {
                if (freq[c] > 0) {
                    high = max(high, freq[c]);
                    low = min(low, freq[c]);
                }
            }
            total += high - low;
        }
    }
    return total;
}`)], [['aabcb'], ['aabcbaa'], ['a'], ['abc'], ['aaab']], (s: string) => { let t = 0; for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) { const m = new Map<string, number>(); for (const c of s.slice(i, j + 1)) m.set(c, (m.get(c) ?? 0) + 1); const v = [...m.values()]; t += Math.max(...v) - Math.min(...v); } return t; }, ['Fix the start, extend the end and update one frequency.'], 'Incremental counts make each new substring cost O(26).'),
  mk('Reverse Every Word in a String', 'reverseEachWord', 'Reverse the characters of every word, keeping the word order and spaces.', 'string reverseEachWord(string s)', 'return "";', [
    ap('Reverse each word in place', 'O(n)', 'O(1)', 'n', 'Each character is visited by the word scanner once and swapped once by reverse.', `string reverseEachWord(string s) {
    int i = 0;
    while (i < s.size()) {
        while (i < s.size() && s[i] == ' ') {
            i++;
        }
        int j = i;
        while (j < s.size() && s[j] != ' ') {
            j++;
        }
        reverse(s.begin() + i, s.begin() + j);
        i = j;
    }
    return s;
}`)], [['the sky is blue'], ['  hello  world '], ['a'], ['ab cd ef']], (s: string) => s.replace(/\S+/g, w => [...w].reverse().join('')), ['Find each word with two indices, then reverse the range between them.'], 'Reversing the range [i, j) of the string reverses just that word.'),

  // ---------- Step 6: linked lists (basics) ----------
  mk('Introduction to Linked List', 'buildList', 'Build a singly linked list from the values (in order) and return its head.', 'ListNode* buildList(vector<int>& values)', 'return nullptr;', [
    ap('Append with a tail pointer', 'O(n)', 'O(n)', 'n', 'One new node per value; the tail pointer makes each append O(1).', `ListNode* buildList(vector<int>& values) {
    ListNode* head = nullptr;
    ListNode* tail = nullptr;
    for (int i = 0; i < values.size(); i++) {
        ListNode* node = new ListNode(values[i]);
        if (head == nullptr) {
            head = node;
        } else {
            tail->next = node;
        }
        tail = node;
    }
    return head;
}`)], [[[10, 20, 30]], [[1]], [[]], [[5, 4, 3, 2]]], (v: number[]) => v, ['Remember the first node (head) and the last node (tail).'], 'A linked list is just nodes whose next pointers form a chain.'),
  mk('Inserting a node in LL', 'insertAt', 'Insert val so that it ends up at index pos (0 = new head, pos = length = new tail).', 'ListNode* insertAt(ListNode* head, int pos, int val)', 'return head;', [
    ap('Walk to the predecessor', 'O(pos)', 'O(1)', 'n', 'Reaching the node before the insertion point takes pos steps; relinking is O(1).', `ListNode* insertAt(ListNode* head, int pos, int val) {
    ListNode* node = new ListNode(val);
    if (pos == 0) {
        node->next = head;
        return node;
    }
    ListNode* prev = head;
    for (int i = 0; i < pos - 1; i++) {
        prev = prev->next;
    }
    node->next = prev->next;
    prev->next = node;
    return head;
}`)], [[[1, 2, 3], 0, 9], [[1, 2, 3], 3, 9], [[1, 2, 3], 1, 9], [[], 0, 5], [[7], 1, 8]], insertList, ['Inserting at the head is special.', 'Link the new node to the rest first, then link the predecessor to it.'], 'To insert, you need the node just before the position.'),
  mk('Deleting a node in LL', 'deleteAt', 'Delete the node at index pos (0 <= pos < length) and return the head.', 'ListNode* deleteAt(ListNode* head, int pos)', 'return head;', [
    ap('Walk to the predecessor', 'O(pos)', 'O(1)', 'n', 'pos steps to find the predecessor, then one pointer update.', `ListNode* deleteAt(ListNode* head, int pos) {
    if (pos == 0) {
        return head->next;
    }
    ListNode* prev = head;
    for (int i = 0; i < pos - 1; i++) {
        prev = prev->next;
    }
    prev->next = prev->next->next;
    return head;
}`)], [[[1, 2, 3], 0], [[1, 2, 3], 2], [[1, 2, 3], 1], [[9], 0]], delList, ['Deleting the head returns head->next.'], 'Skip the node by linking its predecessor to its successor.'),
  { ...mk('Introduction to Doubly Linked List', 'backwardValues', 'The input is a doubly linked list (nodes have prev and next). Return its values in reverse order by walking from the tail using prev.', 'vector<int> backwardValues(ListNode* head)', 'return {};', [
    ap('Go to the tail, walk back with prev', 'O(n)', 'O(1)', 'n', 'One pass to the tail, one pass back; the only extra memory is the output.', `vector<int> backwardValues(ListNode* head) {
    vector<int> result;
    if (head == nullptr) {
        return result;
    }
    ListNode* node = head;
    while (node->next != nullptr) {
        node = node->next;
    }
    while (node != nullptr) {
        result.push_back(node->val);
        node = node->prev;
    }
    return result;
}`)], [[[1, 2, 3, 4]], [[5]], [[]], [[9, 8]]], (a: number[]) => [...a].reverse(), ['A DLL node has both prev and next.'], 'Two pointers per node let you walk in either direction.'), dll: true },
  { ...mk('Insert a node in DLL', 'insertDLL', 'Insert val at index pos in a doubly linked list, keeping prev/next consistent.', 'ListNode* insertDLL(ListNode* head, int pos, int val)', 'return head;', [
    ap('Relink four pointers', 'O(pos)', 'O(1)', 'n', 'Walk pos steps, then set prev/next of the new node and its two neighbours.', `ListNode* insertDLL(ListNode* head, int pos, int val) {
    ListNode* node = new ListNode(val);
    if (pos == 0) {
        node->next = head;
        if (head != nullptr) {
            head->prev = node;
        }
        return node;
    }
    ListNode* before = head;
    for (int i = 0; i < pos - 1; i++) {
        before = before->next;
    }
    ListNode* after = before->next;
    node->prev = before;
    node->next = after;
    before->next = node;
    if (after != nullptr) {
        after->prev = node;
    }
    return head;
}`)], [[[1, 2, 3], 0, 9], [[1, 2, 3], 3, 9], [[1, 2, 3], 1, 9], [[], 0, 5]], insertList, ['Four pointers change: node.prev, node.next, before.next, after.prev.'], 'Every link in a DLL has two ends; update both.'), dll: true },
  { ...mk('Delete a node in DLL', 'deleteDLL', 'Delete the node at index pos (valid) from a doubly linked list.', 'ListNode* deleteDLL(ListNode* head, int pos)', 'return head;', [
    ap('Unlink the node', 'O(pos)', 'O(1)', 'n', 'pos steps to reach the node; a DLL does not need its predecessor because the node knows prev.', `ListNode* deleteDLL(ListNode* head, int pos) {
    ListNode* node = head;
    for (int i = 0; i < pos; i++) {
        node = node->next;
    }
    if (node->prev != nullptr) {
        node->prev->next = node->next;
    } else {
        head = node->next;
    }
    if (node->next != nullptr) {
        node->next->prev = node->prev;
    }
    return head;
}`)], [[[1, 2, 3], 0], [[1, 2, 3], 2], [[1, 2, 3], 1], [[7], 0]], delList, ['If the node has no prev, the head moves.'], 'prev pointers let a node remove itself.'), dll: true },
  { ...mk('Reverse a DLL', 'reverseDLL', 'Reverse a doubly linked list in place and return the new head.', 'ListNode* reverseDLL(ListNode* head)', 'return head;', [
    ap('Swap prev and next in every node', 'O(n)', 'O(1)', 'n', 'One pass; each node\'s two pointers are exchanged.', `ListNode* reverseDLL(ListNode* head) {
    ListNode* current = head;
    ListNode* newHead = head;
    while (current != nullptr) {
        ListNode* temp = current->prev;
        current->prev = current->next;
        current->next = temp;
        newHead = current;
        current = current->prev;
    }
    return newHead;
}`)], [[[1, 2, 3, 4]], [[1]], [[]], [[5, 6]]], (a: number[]) => [...a].reverse(), ['Swapping prev and next in a node reverses the local direction.', 'After swapping, the old next is stored in prev.'], 'Reversing a DLL is swapping the two pointers of every node.'), dll: true },

  // ---------- linked list: medium ----------
  mk("Sort a LL of 0's, 1's and 2's", 'sortList012', 'Sort a list containing only 0, 1 and 2.', 'ListNode* sortList012(ListNode* head)', 'return head;', [
    ap('Count and overwrite', 'O(n)', 'O(1)', 'n', 'One pass to count, one pass to rewrite the values; no new nodes.', `ListNode* sortList012(ListNode* head) {
    int count[3] = {0, 0, 0};
    for (ListNode* node = head; node != nullptr; node = node->next) {
        count[node->val]++;
    }
    ListNode* node = head;
    for (int value = 0; value < 3; value++) {
        while (count[value] > 0) {
            node->val = value;
            node = node->next;
            count[value]--;
        }
    }
    return head;
}`), ap('Three sub-lists (relink)', 'O(n)', 'O(1)', 'n', 'One pass moves each node to one of three lists, then they are joined; data values are never touched.', `ListNode* sortList012(ListNode* head) {
    ListNode* zeroHead = new ListNode(-1);
    ListNode* oneHead = new ListNode(-1);
    ListNode* twoHead = new ListNode(-1);
    ListNode* zero = zeroHead;
    ListNode* one = oneHead;
    ListNode* two = twoHead;
    for (ListNode* node = head; node != nullptr; node = node->next) {
        if (node->val == 0) {
            zero->next = node;
            zero = node;
        } else if (node->val == 1) {
            one->next = node;
            one = node;
        } else {
            two->next = node;
            two = node;
        }
    }
    zero->next = oneHead->next != nullptr ? oneHead->next : twoHead->next;
    one->next = twoHead->next;
    two->next = nullptr;
    return zeroHead->next;
}`)], [[[1, 0, 2, 1, 0]], [[2, 2, 0]], [[1]], [[0, 0, 0]], [[2, 1, 0, 2, 1]]], (a: number[]) => sortNum(a), ['Only three possible values: count them, or split into three lists.'], 'A fixed small alphabet allows counting sort / three-way partitioning.'),
  mk('Find the intersection point of Y LL', 'getIntersectionNode', 'Two lists may share a common tail (same nodes). Return the first shared node (the output shows the list from it), or empty.', 'ListNode* getIntersectionNode(ListNode* a, ListNode* b)', 'return nullptr;', [
    ap('Hash set of visited nodes', 'O(m + n)', 'O(m)', 'n', 'Store every node address of a, then walk b until a stored node is found: linear time, but O(m) extra memory.', `ListNode* getIntersectionNode(ListNode* a, ListNode* b) {
    unordered_set<ListNode*> seen;
    for (ListNode* node = a; node != nullptr; node = node->next) {
        seen.insert(node);
    }
    for (ListNode* node = b; node != nullptr; node = node->next) {
        if (seen.count(node)) {
            return node;
        }
    }
    return nullptr;
}`), ap('Two pointers switching heads', 'O(m + n)', 'O(1)', 'n', 'Each pointer walks its list then the other one, so both travel m + n nodes and meet at the intersection (or both reach null together).', `ListNode* getIntersectionNode(ListNode* a, ListNode* b) {
    ListNode* x = a;
    ListNode* y = b;
    while (x != y) {
        x = x == nullptr ? b : x->next;
        y = y == nullptr ? a : y->next;
    }
    return x;
}`)], [[{ list: [4, 1], share: { id: 'a', list: [8, 4, 5] } }, { list: [5, 6, 1], share: { id: 'a', list: [8, 4, 5] } }], [{ list: [], share: { id: 'b', list: [2, 3] } }, { list: [1], share: { id: 'b', list: [2, 3] } }], [[1, 2, 3], [4, 5]], [[7], [7]]], (x: any) => (x && x.share ? x.share.list : []), ['Compare nodes by address, not by value.', 'Make both pointers walk the same total distance.'], 'If you swap lists after reaching the end, the length difference cancels out.'),
  mk('Add 1 to a number represented by LL', 'addOne', 'The list holds the digits of a non-negative number (most significant digit first). Return the list for the number plus one.', 'ListNode* addOne(ListNode* head)', 'return head;', [
    ap('Recursion with carry', 'O(n)', 'O(n)', 'n', 'The recursion reaches the last digit first, adds 1, and propagates the carry back up; stack depth n.', `int addWithCarry(ListNode* node) {
    if (node == nullptr) {
        return 1;
    }
    int carry = addWithCarry(node->next);
    int sum = node->val + carry;
    node->val = sum % 10;
    return sum / 10;
}

ListNode* addOne(ListNode* head) {
    int carry = addWithCarry(head);
    if (carry > 0) {
        ListNode* newHead = new ListNode(carry);
        newHead->next = head;
        return newHead;
    }
    return head;
}`), ap('Reverse, add, reverse back', 'O(n)', 'O(1)', 'n', 'Two reversals and one pass, all in place.', `ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    while (head != nullptr) {
        ListNode* next = head->next;
        head->next = prev;
        prev = head;
        head = next;
    }
    return prev;
}

ListNode* addOne(ListNode* head) {
    head = reverseList(head);
    ListNode* node = head;
    int carry = 1;
    ListNode* last = nullptr;
    while (node != nullptr && carry > 0) {
        int sum = node->val + carry;
        node->val = sum % 10;
        carry = sum / 10;
        last = node;
        node = node->next;
    }
    if (carry > 0) {
        last->next = new ListNode(carry);
    }
    return reverseList(head);
}`)], [[[1, 2, 3]], [[9, 9, 9]], [[0]], [[1, 9]], [[4, 5, 9, 9]]], (d: number[]) => { const out = [...d]; let i = out.length - 1; while (i >= 0 && out[i] === 9) { out[i] = 0; i--; } if (i < 0) out.unshift(1); else out[i]++; return out; }, ['Think of grade-school addition from the right.', 'A list only moves forward: use recursion or reverse it.'], 'The carry travels from the last digit back to the first.'),
  { ...mk('Delete all occurrences of a key in DLL', 'deleteAllOccurrences', 'Delete every node whose value equals key from a doubly linked list.', 'ListNode* deleteAllOccurrences(ListNode* head, int key)', 'return head;', [
    ap('Single pass unlinking', 'O(n)', 'O(1)', 'n', 'Each node is checked once and unlinked in O(1) using prev/next.', `ListNode* deleteAllOccurrences(ListNode* head, int key) {
    ListNode* node = head;
    while (node != nullptr) {
        ListNode* next = node->next;
        if (node->val == key) {
            if (node->prev != nullptr) {
                node->prev->next = node->next;
            } else {
                head = node->next;
            }
            if (node->next != nullptr) {
                node->next->prev = node->prev;
            }
        }
        node = next;
    }
    return head;
}`)], [[[1, 2, 3, 2, 4, 2], 2], [[2, 2, 2], 2], [[1, 3], 5], [[5, 1, 5], 5]], (a: number[], k: number) => a.filter(x => x !== k), ['Save node->next before unlinking.'], 'A DLL node can remove itself, so deletion needs no predecessor tracking.'), dll: true },
  { ...mk('Find pairs with given sum in DLL', 'findPairsDLL', 'The doubly linked list is sorted ascending with distinct values. Return all pairs (a, b), a < b, with a + b == target, in increasing order of a.', 'vector<vector<int>> findPairsDLL(ListNode* head, int target)', 'return {};', [
    ap('Two pointers from both ends', 'O(n)', 'O(1)', 'n', 'One pass to the tail, then the pointers converge: at most n steps in total, using prev to move the right pointer backwards.', `vector<vector<int>> findPairsDLL(ListNode* head, int target) {
    vector<vector<int>> pairs;
    if (head == nullptr) {
        return pairs;
    }
    ListNode* left = head;
    ListNode* right = head;
    while (right->next != nullptr) {
        right = right->next;
    }
    while (left != right && right->next != left) {
        int sum = left->val + right->val;
        if (sum == target) {
            pairs.push_back({left->val, right->val});
            left = left->next;
            right = right->prev;
        } else if (sum < target) {
            left = left->next;
        } else {
            right = right->prev;
        }
    }
    return pairs;
}`)], [[[1, 2, 4, 5, 6, 8, 9], 7], [[1, 5, 6], 7], [[1, 2, 3], 10], [[3], 6]], (a: number[], t: number) => { const out: number[][] = []; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] + a[j] === t) out.push([a[i], a[j]]); return out; }, ['Sorted data: a left pointer and a right pointer.', 'prev lets the right pointer move backwards.'], 'A sorted DLL supports the classic two-pointer technique.'), dll: true },
  { ...mk('Remove duplicates from sorted DLL', 'removeDuplicatesDLL', 'Remove duplicate values from a sorted doubly linked list, keeping the first of each.', 'ListNode* removeDuplicatesDLL(ListNode* head)', 'return head;', [
    ap('Skip equal neighbours', 'O(n)', 'O(1)', 'n', 'One pass; each duplicate is unlinked in O(1).', `ListNode* removeDuplicatesDLL(ListNode* head) {
    ListNode* node = head;
    while (node != nullptr && node->next != nullptr) {
        if (node->val == node->next->val) {
            ListNode* dup = node->next;
            node->next = dup->next;
            if (dup->next != nullptr) {
                dup->next->prev = node;
            }
        } else {
            node = node->next;
        }
    }
    return head;
}`)], [[[1, 1, 2, 3, 3, 3]], [[1, 2, 3]], [[4, 4, 4]], [[]], [[1, 1]]], (a: number[]) => a.filter((x, i) => i === 0 || a[i - 1] !== x), ['Equal values are adjacent in a sorted list.'], 'Compare with the next node; unlink it if equal, otherwise advance.'), dll: true },

  // ---------- linked list: hard ----------
  mk('Reverse Nodes in K Group Size', 'reverseKGroup', 'Reverse the nodes of the list k at a time; leftover nodes (fewer than k) stay as they are.', 'ListNode* reverseKGroup(ListNode* head, int k)', 'return head;', [
    ap('Reverse groups in place', 'O(n)', 'O(1)', 'n', 'Each node is touched a constant number of times: once to check that a full group exists and once while reversing.', `ListNode* reverseKGroup(ListNode* head, int k) {
    ListNode* dummy = new ListNode(0);
    dummy->next = head;
    ListNode* groupPrev = dummy;
    while (true) {
        ListNode* kth = groupPrev;
        for (int i = 0; i < k && kth != nullptr; i++) {
            kth = kth->next;
        }
        if (kth == nullptr) {
            break;
        }
        ListNode* groupNext = kth->next;
        ListNode* prev = groupNext;
        ListNode* curr = groupPrev->next;
        while (curr != groupNext) {
            ListNode* next = curr->next;
            curr->next = prev;
            prev = curr;
            curr = next;
        }
        ListNode* oldFirst = groupPrev->next;
        groupPrev->next = kth;
        groupPrev = oldFirst;
    }
    return dummy->next;
}`)], [[[1, 2, 3, 4, 5], 2], [[1, 2, 3, 4, 5], 3], [[1, 2, 3], 1], [[1, 2], 3], [[1, 2, 3, 4, 5, 6], 3]], (a: number[], k: number) => { const out: number[] = []; for (let i = 0; i < a.length; i += k) { const g = a.slice(i, i + k); out.push(...(g.length === k ? g.reverse() : g)); } return out; }, ['Find the k-th node first; if it does not exist, stop.', 'Reverse the group, then reconnect it to the previous and next groups.'], 'Group-wise reversal = reverse a sub-list and stitch it back.'),
  mk('Rotate a LL', 'rotateRight', 'Rotate the list to the right by k places.', 'ListNode* rotateRight(ListNode* head, int k)', 'return head;', [
    ap('Make a ring, cut at the new tail', 'O(n)', 'O(1)', 'n', 'One pass to find the length and tail, then n - k % n steps to the cut point.', `ListNode* rotateRight(ListNode* head, int k) {
    if (head == nullptr || head->next == nullptr || k == 0) {
        return head;
    }
    int length = 1;
    ListNode* tail = head;
    while (tail->next != nullptr) {
        tail = tail->next;
        length++;
    }
    k = k % length;
    if (k == 0) {
        return head;
    }
    tail->next = head;
    ListNode* newTail = head;
    for (int i = 0; i < length - k - 1; i++) {
        newTail = newTail->next;
    }
    ListNode* newHead = newTail->next;
    newTail->next = nullptr;
    return newHead;
}`)], [[[1, 2, 3, 4, 5], 2], [[0, 1, 2], 4], [[1], 3], [[1, 2], 0], [[1, 2, 3], 3]], (a: number[], k: number) => { if (!a.length) return []; const r = k % a.length; return [...a.slice(a.length - r), ...a.slice(0, a.length - r)]; }, ['Rotating by k = length is the identity: use k % length.'], 'Temporarily closing the list into a ring makes the cut easy.'),
  mk('Flattening of LL', 'flatten', 'Each node has next (to the next sorted column head) and bottom (down its own sorted column). Flatten into one sorted list linked via bottom (next = null).', 'ListNode* flatten(ListNode* head)', 'return head;', [
    ap('Recursively merge columns', 'O(N)', 'O(c)', 'n', 'Merging two sorted columns costs the sum of their lengths; merged lists grow as columns are folded in, so total work is bounded by N·c in the worst case but each element moves O(c) times; recursion depth is the number of columns c.', `ListNode* mergeBottom(ListNode* a, ListNode* b) {
    ListNode* dummy = new ListNode(0);
    ListNode* tail = dummy;
    while (a != nullptr && b != nullptr) {
        if (a->val <= b->val) {
            tail->bottom = a;
            a = a->bottom;
        } else {
            tail->bottom = b;
            b = b->bottom;
        }
        tail = tail->bottom;
        tail->next = nullptr;
    }
    if (a != nullptr) {
        tail->bottom = a;
    } else {
        tail->bottom = b;
    }
    return dummy->bottom;
}

ListNode* flatten(ListNode* head) {
    if (head == nullptr || head->next == nullptr) {
        return head;
    }
    ListNode* rest = flatten(head->next);
    head->next = nullptr;
    return mergeBottom(head, rest);
}`)], [[{ cols: [[5, 7, 8, 30], [10, 20], [19, 22, 50], [28, 35, 40, 45]] }], [{ cols: [[1, 2]] }], [{ cols: [[3], [1], [2]] }], [{ cols: [[1, 4], [2, 3]] }]], (o: any) => sortNum(o.cols.flat()), ['Merging two sorted lists is the building block.', 'Fold the columns together from the right.'], 'Flatten = merge sorted lists, one pair at a time.'),
  mk('Clone a Linked List with random and next pointer', 'copyRandomList', 'Each node has next and random pointers. Return a deep copy (the result shows values and random targets by index).', 'ListNode* copyRandomList(ListNode* head)', 'return nullptr;', [
    ap('Hash map old → new', 'O(n)', 'O(n)', 'n', 'Two passes: create all copies, then wire next/random through the map (O(1) average per lookup). The map stores n entries.', `ListNode* copyRandomList(ListNode* head) {
    unordered_map<ListNode*, ListNode*> copyOf;
    for (ListNode* node = head; node != nullptr; node = node->next) {
        copyOf[node] = new ListNode(node->val);
    }
    for (ListNode* node = head; node != nullptr; node = node->next) {
        copyOf[node]->next = copyOf[node->next];
        copyOf[node]->random = copyOf[node->random];
    }
    return copyOf[head];
}`), ap('Interleave copies (O(1) space)', 'O(n)', 'O(1)', 'n', 'Place each copy right after its original, set random pointers using that adjacency, then split the lists apart: three passes, no map.', `ListNode* copyRandomList(ListNode* head) {
    if (head == nullptr) {
        return nullptr;
    }
    for (ListNode* node = head; node != nullptr; node = node->next->next) {
        ListNode* copy = new ListNode(node->val);
        copy->next = node->next;
        node->next = copy;
    }
    for (ListNode* node = head; node != nullptr; node = node->next->next) {
        if (node->random != nullptr) {
            node->next->random = node->random->next;
        }
    }
    ListNode* newHead = head->next;
    for (ListNode* node = head; node != nullptr; node = node->next) {
        ListNode* copy = node->next;
        node->next = copy->next;
        if (copy->next != nullptr) {
            copy->next = copy->next->next;
        }
    }
    return newHead;
}`)], [[{ list: [7, 13, 11, 10, 1], random: [-1, 0, 4, 2, 0] }], [{ list: [1, 2], random: [1, 1] }], [{ list: [3, 3, 3], random: [-1, 0, 1] }], [{ list: [5], random: [0] }]], (o: any) => o, ['A copy needs pointers to other COPIES, not to the originals.', 'Map each original to its copy.'], 'Either remember old→new in a map or hide each copy beside its original.'),

  // ---------- Step 7: recursion ----------
  mk('Generate all binary strings', 'generateBinaryStrings', 'Return all binary strings of length n with no two consecutive 1s, in lexicographic order.', 'vector<string> generateBinaryStrings(int n)', 'return {};', [
    ap('Backtracking', 'O(2ⁿ)', 'O(n)', '2n', 'The decision tree has at most Fibonacci(n+2) valid leaves (< 2ⁿ); depth n.', `void build(int n, string& current, vector<string>& result) {
    if (current.size() == n) {
        result.push_back(current);
        return;
    }
    current.push_back('0');
    build(n, current, result);
    current.pop_back();
    if (current.empty() || current.back() == '0') {
        current.push_back('1');
        build(n, current, result);
        current.pop_back();
    }
}

vector<string> generateBinaryStrings(int n) {
    vector<string> result;
    string current = "";
    build(n, current, result);
    return result;
}`)], [[1], [2], [3], [4]], (n: number) => { const out: string[] = []; const g = (s: string) => { if (s.length === n) { out.push(s); return; } g(s + '0'); if (!s.endsWith('1')) g(s + '1'); }; g(''); return out; }, ['You may place a 1 only after a 0 (or at the start).'], 'Prune any branch that would create "11".'),
  mk('Learn all patterns of Subsequences', 'allSubsequences', 'Return all subsequences of s (including the empty string) using take / not-take recursion, taking the character first.', 'vector<string> allSubsequences(string s)', 'return {};', [
    ap('Take / not take', 'O(n·2ⁿ)', 'O(n)', '2n', '2ⁿ leaves of the decision tree; each is a string of up to n characters; recursion depth n.', `void go(int i, string& s, string& current, vector<string>& out) {
    if (i == s.size()) {
        out.push_back(current);
        return;
    }
    current.push_back(s[i]);
    go(i + 1, s, current, out);
    current.pop_back();
    go(i + 1, s, current, out);
}

vector<string> allSubsequences(string s) {
    vector<string> out;
    string current = "";
    go(0, s, current, out);
    return out;
}`)], [['abc'], ['ab'], ['a'], ['xyz1']], (s: string) => { const o: string[] = []; const g = (i: number, c: string) => { if (i === s.length) { o.push(c); return; } g(i + 1, c + s[i]); g(i + 1, c); }; g(0, ''); return o; }, ['Each character is either in the subsequence or not.'], 'Take/not-take is the template behind nearly every subset-style problem.'),
  mk('Combination Sum II', 'combinationSum2', 'Each candidate may be used once; return all unique combinations summing to target.', 'vector<vector<int>> combinationSum2(vector<int>& candidates, int target)', 'return {};', [
    ap('Sort + backtrack, skip duplicates', 'O(2ⁿ)', 'O(n)', '2n', 'Worst case explores subsets; sorting enables pruning (stop when a candidate exceeds the remainder) and skipping equal siblings avoids duplicate combinations.', `void build(int start, int remaining, vector<int>& c, vector<int>& current, vector<vector<int>>& result) {
    if (remaining == 0) {
        result.push_back(current);
        return;
    }
    for (int i = start; i < c.size(); i++) {
        if (c[i] > remaining) {
            break;
        }
        if (i > start && c[i] == c[i - 1]) {
            continue;
        }
        current.push_back(c[i]);
        build(i + 1, remaining - c[i], c, current, result);
        current.pop_back();
    }
}

vector<vector<int>> combinationSum2(vector<int>& candidates, int target) {
    sort(candidates.begin(), candidates.end());
    vector<vector<int>> result;
    vector<int> current;
    build(0, target, candidates, current, result);
    return result;
}`)], [[[10, 1, 2, 7, 6, 1, 5], 8], [[2, 5, 2, 1, 2], 5], [[1, 1, 1], 2], [[3], 3], [[4, 5], 3]], (c: number[], t: number) => combos(c, t, false, true), ['Sort first.', 'At one recursion level, never use the same value twice.'], 'Skipping equal values at the same depth removes duplicate combinations.', { unordered: true }),
  mk('Subset Sum I', 'subsetSums', 'Return the sums of all subsets of nums, sorted ascending.', 'vector<int> subsetSums(vector<int>& nums)', 'return {};', [
    ap('Take / not take, then sort', 'O(2ⁿ log 2ⁿ)', 'O(2ⁿ)', '2n', '2ⁿ sums are generated by recursion (depth n) and sorted: 2ⁿ·n.', `void go(int i, int sum, vector<int>& nums, vector<int>& sums) {
    if (i == nums.size()) {
        sums.push_back(sum);
        return;
    }
    go(i + 1, sum + nums[i], nums, sums);
    go(i + 1, sum, nums, sums);
}

vector<int> subsetSums(vector<int>& nums) {
    vector<int> sums;
    go(0, 0, nums, sums);
    sort(sums.begin(), sums.end());
    return sums;
}`)], [[[3, 1, 2]], [[5, 2, 1]], [[1]], [[2, 2]], [[1, 2, 3, 4]]], (a: number[]) => { const s: number[] = []; for (let m = 0; m < 1 << a.length; m++) s.push(a.reduce((t, x, i) => t + (m >> i & 1 ? x : 0), 0)); return sortNum(s); }, ['Pass the running sum down the recursion.'], 'Every subset corresponds to a leaf of the take/not-take tree.'),
  mk('Subset Sum II', 'subsetsWithDup', 'nums may contain duplicates; return all unique subsets.', 'vector<vector<int>> subsetsWithDup(vector<int>& nums)', 'return {};', [
    ap('Sort + skip duplicates at each level', 'O(n·2ⁿ)', 'O(n)', '2n', 'Each emitted subset costs O(n) to copy; skipping equal siblings prevents duplicates without a set.', `void build(int start, vector<int>& nums, vector<int>& current, vector<vector<int>>& result) {
    result.push_back(current);
    for (int i = start; i < nums.size(); i++) {
        if (i > start && nums[i] == nums[i - 1]) {
            continue;
        }
        current.push_back(nums[i]);
        build(i + 1, nums, current, result);
        current.pop_back();
    }
}

vector<vector<int>> subsetsWithDup(vector<int>& nums) {
    sort(nums.begin(), nums.end());
    vector<vector<int>> result;
    vector<int> current;
    build(0, nums, current, result);
    return result;
}`)], [[[1, 2, 2]], [[0]], [[4, 4, 4, 1, 4]], [[1, 1]]], (a: number[]) => { const s = sortNum(a); const seen = new Set<string>(); const out: number[][] = []; for (let m = 0; m < 1 << s.length; m++) { const sub = s.filter((_, i) => m >> i & 1); const k = sub.join(','); if (!seen.has(k)) { seen.add(k); out.push(sub); } } return out; }, ['Sorting puts duplicates next to each other.'], 'Choose each distinct value at most once per recursion level.', { unordered: true }),
  mk('Combination Sum III', 'combinationSum3', 'Use exactly k distinct numbers from 1..9 that sum to n; return all combinations.', 'vector<vector<int>> combinationSum3(int k, int n)', 'return {};', [
    ap('Backtracking with pruning', 'O(C(9,k))', 'O(k)', '2n', 'At most C(9,k) ≤ 126 combinations; each has length k; depth k.', `void build(int start, int k, int remaining, vector<int>& current, vector<vector<int>>& result) {
    if (current.size() == k) {
        if (remaining == 0) {
            result.push_back(current);
        }
        return;
    }
    for (int digit = start; digit <= 9; digit++) {
        if (digit > remaining) {
            break;
        }
        current.push_back(digit);
        build(digit + 1, k, remaining - digit, current, result);
        current.pop_back();
    }
}

vector<vector<int>> combinationSum3(int k, int n) {
    vector<vector<int>> result;
    vector<int> current;
    build(1, k, n, current, result);
    return result;
}`)], [[3, 7], [3, 9], [4, 1], [2, 18], [2, 17]], (k: number, n: number) => { const out: number[][] = []; for (let m = 0; m < 512; m++) { const s: number[] = []; for (let d = 0; d < 9; d++) if (m >> d & 1) s.push(d + 1); if (s.length === k && s.reduce((a, b) => a + b, 0) === n) out.push(s); } return out; }, ['Digits increase to avoid permutations of the same set.'], 'Choose k increasing digits whose sum is n.', { unordered: true }),
  mk('Word Search', 'exist', 'Return true if word can be formed by adjacent (up/down/left/right) cells of the board, using each cell at most once.', 'bool exist(vector<vector<char>>& board, string word)', 'return false;', [
    ap('DFS backtracking', 'O(m·n·4^L)', 'O(L)', '2n', 'From each of the m·n cells the DFS branches into at most 3 new directions per letter (≈ 4^L worst case); the recursion depth is the word length L.', `bool search(vector<vector<char>>& board, string& word, int r, int c, int k) {
    if (k == word.size()) {
        return true;
    }
    if (r < 0 || c < 0 || r >= board.size() || c >= board[0].size() || board[r][c] != word[k]) {
        return false;
    }
    char saved = board[r][c];
    board[r][c] = '#';
    bool found = search(board, word, r + 1, c, k + 1) || search(board, word, r - 1, c, k + 1) || search(board, word, r, c + 1, k + 1) || search(board, word, r, c - 1, k + 1);
    board[r][c] = saved;
    return found;
}

bool exist(vector<vector<char>>& board, string word) {
    for (int r = 0; r < board.size(); r++) {
        for (int c = 0; c < board[0].size(); c++) {
            if (search(board, word, r, c, 0)) {
                return true;
            }
        }
    }
    return false;
}`)], [[[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'ABCCED'], [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'SEE'], [[['A', 'B', 'C', 'E'], ['S', 'F', 'C', 'S'], ['A', 'D', 'E', 'E']], 'ABCB'], [[['A']], 'A'], [[['a', 'b']], 'ba']], (b: string[][], w: string) => { const R = b.length, C = b[0].length; const seen = b.map(r => r.map(() => false)); const go = (r: number, c: number, k: number): boolean => { if (k === w.length) return true; if (r < 0 || c < 0 || r >= R || c >= C || seen[r][c] || b[r][c] !== w[k]) return false; seen[r][c] = true; const ok = go(r + 1, c, k + 1) || go(r - 1, c, k + 1) || go(r, c + 1, k + 1) || go(r, c - 1, k + 1); seen[r][c] = false; return ok; }; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (go(r, c, 0)) return true; return false; },
    ['Mark a cell as used while exploring it and restore it afterwards.'], 'Backtracking = mark, explore the 4 neighbours, unmark.'),
  mk('Rat in a Maze', 'findPath', 'Maze cells: 1 = open, 0 = blocked. Return all paths from (0,0) to (n-1,n-1) as strings of D/L/R/U in lexicographic order, no cell repeated.', 'vector<string> findPath(vector<vector<int>>& maze)', 'return {};', [
    ap('DFS with visited marks', 'O(4^(n²))', 'O(n²)', '2n', 'Each cell has up to 4 moves; visited marks prevent cycles; recursion depth up to n².', `void walk(int r, int c, vector<vector<int>>& maze, vector<vector<int>>& visited, string& path, vector<string>& result) {
    int n = maze.size();
    if (r == n - 1 && c == n - 1) {
        result.push_back(path);
        return;
    }
    visited[r][c] = 1;
    string moves = "DLRU";
    int dr[4] = {1, 0, 0, -1};
    int dc[4] = {0, -1, 1, 0};
    for (int k = 0; k < 4; k++) {
        int nr = r + dr[k];
        int nc = c + dc[k];
        if (nr >= 0 && nc >= 0 && nr < n && nc < n && maze[nr][nc] == 1 && visited[nr][nc] == 0) {
            path.push_back(moves[k]);
            walk(nr, nc, maze, visited, path, result);
            path.pop_back();
        }
    }
    visited[r][c] = 0;
}

vector<string> findPath(vector<vector<int>>& maze) {
    vector<string> result;
    int n = maze.size();
    if (maze[0][0] == 0 || maze[n - 1][n - 1] == 0) {
        return result;
    }
    vector<vector<int>> visited(n, vector<int>(n, 0));
    string path = "";
    walk(0, 0, maze, visited, path, result);
    return result;
}`)], [[[[1, 0, 0, 0], [1, 1, 0, 1], [1, 1, 0, 0], [0, 1, 1, 1]]], [[[1, 1], [1, 1]]], [[[1, 0], [0, 1]]], [[[1]]], [[[1, 1, 1], [1, 0, 1], [1, 1, 1]]]], (m: number[][]) => { const n = m.length; const out: string[] = []; if (!m[0][0] || !m[n - 1][n - 1]) return out; const seen = m.map(r => r.map(() => false)); const D = [['D', 1, 0], ['L', 0, -1], ['R', 0, 1], ['U', -1, 0]] as const; const go = (r: number, c: number, p: string) => { if (r === n - 1 && c === n - 1) { out.push(p); return; } seen[r][c] = true; for (const [ch, dr, dc] of D) { const a = r + dr, b = c + dc; if (a >= 0 && b >= 0 && a < n && b < n && m[a][b] && !seen[a][b]) go(a, b, p + ch); } seen[r][c] = false; }; go(0, 0, ''); return out; },
    ['Try the moves in the order D, L, R, U to get sorted output.', 'Unmark the cell when you backtrack.'], 'Exploring directions in alphabetical order yields lexicographically sorted paths.'),
  mk('Word Break', 'wordBreak', 'Return all sentences obtained by inserting spaces in s so that every word is in the dictionary (shorter first words come first).', 'vector<string> wordBreak(string s, vector<string>& dict)', 'return {};', [
    ap('Backtracking over prefixes', 'O(2ⁿ) worst case', 'O(n)', '2n', 'At each position every prefix present in the dictionary starts a new branch; strings like "aaaa…" with dictionary {a, aa, …} make the tree exponential. Recursion depth ≤ n.', `void build(int start, string& s, unordered_set<string>& words, vector<string>& current, vector<string>& result) {
    if (start == s.size()) {
        string sentence = "";
        for (int i = 0; i < current.size(); i++) {
            if (i > 0) {
                sentence += ' ';
            }
            sentence += current[i];
        }
        result.push_back(sentence);
        return;
    }
    for (int end = start + 1; end <= s.size(); end++) {
        string word = s.substr(start, end - start);
        if (words.count(word)) {
            current.push_back(word);
            build(end, s, words, current, result);
            current.pop_back();
        }
    }
}

vector<string> wordBreak(string s, vector<string>& dict) {
    unordered_set<string> words;
    for (int i = 0; i < dict.size(); i++) {
        words.insert(dict[i]);
    }
    vector<string> result;
    vector<string> current;
    build(0, s, words, current, result);
    return result;
}`)], [['catsanddog', ['cat', 'cats', 'and', 'sand', 'dog']], ['pineapplepenapple', ['apple', 'pen', 'applepen', 'pine', 'pineapple']], ['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']], ['aaa', ['a', 'aa']], ['a', ['a']]], (s: string, d: string[]) => { const set = new Set(d); const out: string[] = []; const go = (i: number, cur: string[]) => { if (i === s.length) { out.push(cur.join(' ')); return; } for (let e = i + 1; e <= s.length; e++) { const w = s.slice(i, e); if (set.has(w)) go(e, [...cur, w]); } }; go(0, []); return out; },
    ['Try every prefix that is a dictionary word.'], 'Cut the string after each valid word and solve the rest.'),
  mk('M Coloring Problem', 'mColoring', 'Given the adjacency matrix of an undirected graph and m colours, return true if the vertices can be coloured so that adjacent vertices differ.', 'bool mColoring(vector<vector<int>>& adj, int m)', 'return false;', [
    ap('Backtracking vertex by vertex', 'O(mⁿ)', 'O(n)', '2n', 'Each of the n vertices tries up to m colours; a conflict check prunes branches. Recursion depth n.', `bool safe(int node, int color, vector<vector<int>>& adj, vector<int>& colors) {
    for (int other = 0; other < adj.size(); other++) {
        if (adj[node][other] == 1 && colors[other] == color) {
            return false;
        }
    }
    return true;
}

bool solve(int node, int m, vector<vector<int>>& adj, vector<int>& colors) {
    if (node == adj.size()) {
        return true;
    }
    for (int color = 1; color <= m; color++) {
        if (safe(node, color, adj, colors)) {
            colors[node] = color;
            if (solve(node + 1, m, adj, colors)) {
                return true;
            }
            colors[node] = 0;
        }
    }
    return false;
}

bool mColoring(vector<vector<int>>& adj, int m) {
    vector<int> colors(adj.size(), 0);
    return solve(0, m, adj, colors);
}`)], [[[[0, 1, 1, 1], [1, 0, 1, 0], [1, 1, 0, 1], [1, 0, 1, 0]], 3], [[[0, 1, 1, 1], [1, 0, 1, 1], [1, 1, 0, 1], [1, 1, 1, 0]], 3], [[[0, 1], [1, 0]], 1], [[[0]], 1], [[[0, 1, 0], [1, 0, 1], [0, 1, 0]], 2]], (a: number[][], m: number) => { const n = a.length; const col = Array(n).fill(0); const go = (v: number): boolean => { if (v === n) return true; for (let c = 1; c <= m; c++) { if (a[v].every((e, u) => !e || col[u] !== c)) { col[v] = c; if (go(v + 1)) return true; col[v] = 0; } } return false; }; return go(0); },
    ['Assign colours one vertex at a time and check the neighbours.'], 'Backtrack when no colour is legal for the current vertex.'),
  { ...mk('Sudoku Solver', 'solveSudoku', 'Fill the 9x9 board in place (empty cells are "."). A unique solution exists. (Output shows ASCII codes of the characters.)', 'void solveSudoku(vector<vector<char>>& board)', '', [
    ap('Backtracking with row/column/box checks', 'O(9^k)', 'O(k)', '2n', 'k = number of empty cells; each cell tries up to 9 digits with an O(9) validity check; constraint checks prune most branches. Recursion depth k.', `bool valid(vector<vector<char>>& board, int r, int c, char d) {
    for (int i = 0; i < 9; i++) {
        if (board[r][i] == d || board[i][c] == d) {
            return false;
        }
        if (board[3 * (r / 3) + i / 3][3 * (c / 3) + i % 3] == d) {
            return false;
        }
    }
    return true;
}

bool solve(vector<vector<char>>& board) {
    for (int r = 0; r < 9; r++) {
        for (int c = 0; c < 9; c++) {
            if (board[r][c] == '.') {
                for (char d = '1'; d <= '9'; d++) {
                    if (valid(board, r, c, d)) {
                        board[r][c] = d;
                        if (solve(board)) {
                            return true;
                        }
                        board[r][c] = '.';
                    }
                }
                return false;
            }
        }
    }
    return true;
}

void solveSudoku(vector<vector<char>>& board) {
    solve(board);
}`)], (() => {
      const solved = ['534678912', '672195348', '198342567', '859761423', '426853791', '713924856', '961537284', '287419635', '345286179'];
      const blank = (cells: [number, number][]) => solved.map((row, r) => [...row].map((ch, c) => (cells.some(([a, b]) => a === r && b === c) ? '.' : ch)));
      return [[blank([[0, 2], [0, 3], [1, 1], [4, 4], [8, 8]])], [blank([[0, 0], [1, 4], [2, 7], [3, 2], [5, 5], [6, 8], [7, 1], [8, 6]])]];
    })(), (b: string[][]) => { const g = b.map(r => r.map(c => (c === '.' ? 0 : +c))); const ok = (r: number, c: number, d: number) => { for (let i = 0; i < 9; i++) if (g[r][i] === d || g[i][c] === d || g[3 * Math.floor(r / 3) + Math.floor(i / 3)][3 * Math.floor(c / 3) + (i % 3)] === d) return false; return true; }; const go = (): boolean => { for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!g[r][c]) { for (let d = 1; d <= 9; d++) if (ok(r, c, d)) { g[r][c] = d; if (go()) return true; g[r][c] = 0; } return false; } return true; }; go(); return g.map(r => r.map(d => 48 + d)); },
    ['For an empty cell, try digits 1-9 that do not conflict.', 'If none works, undo the previous guess.'], 'Sudoku is constraint satisfaction solved by trying and undoing.'), checkArg: 0 },
  mk('Expression Add Operators', 'addOperators', 'Insert +, - or * between the digits of num (no leading zeros in operands) so that the expression equals target; return all such expressions.', 'vector<string> addOperators(string num, int target)', 'return {};', [
    ap('Backtracking tracking the last operand', 'O(4ⁿ)', 'O(n)', '2n', 'At each gap there are up to 3 operators and each prefix length is a choice: about 4ⁿ expressions, each built in O(n). Remembering the last term makes * O(1).', `void build(int pos, string& num, long long target, string expr, long long value, long long last, vector<string>& result) {
    if (pos == num.size()) {
        if (value == target) {
            result.push_back(expr);
        }
        return;
    }
    for (int end = pos; end < num.size(); end++) {
        if (end > pos && num[pos] == '0') {
            break;
        }
        long long operand = stoll(num.substr(pos, end - pos + 1));
        string part = num.substr(pos, end - pos + 1);
        if (pos == 0) {
            build(end + 1, num, target, part, operand, operand, result);
        } else {
            build(end + 1, num, target, expr + "+" + part, value + operand, operand, result);
            build(end + 1, num, target, expr + "-" + part, value - operand, -operand, result);
            build(end + 1, num, target, expr + "*" + part, value - last + last * operand, last * operand, result);
        }
    }
}

vector<string> addOperators(string num, int target) {
    vector<string> result;
    build(0, num, target, "", 0, 0, result);
    return result;
}`)], [['123', 6], ['232', 8], ['105', 5], ['00', 0], ['12345', 15], ['1234', 10]], (num: string, t: number) => {
      const out: string[] = []; const n = num.length;
      const evalExpr = (e: string): number => { const toks = e.match(/\d+|[+\-*]/g)!; let total = 0, term = +toks[0], sign = 1; for (let i = 1; i < toks.length; i += 2) { const op = toks[i], v = +toks[i + 1]; if (op === '*') term *= v; else { total += sign * term; sign = op === '+' ? 1 : -1; term = v; } } return total + sign * term; };
      const ops = ['', '+', '-', '*'];
      const gen = (i: number, cur: string) => { if (i === n) { const nums = cur.match(/\d+/g)!; if (nums.some(x => x.length > 1 && x[0] === '0')) return; if (evalExpr(cur) === t && /[+\-*]/.test(cur) || (n === 1 && +num === t)) out.push(cur); return; } for (const o of ops) gen(i + 1, cur + o + num[i]); };
      if (n === 1) return +num === t ? [num] : []; gen(1, num[0]); return out.filter(e => /[+\-*]/.test(e) || n === 1);
    }, ['Keep the value so far and the last multiplied term.', 'For *, undo the last term and re-apply it multiplied.'], 'Backtracking over cut points and operators, with the last operand remembered for precedence.', { unordered: true, constraints: ['2 <= digits <= 10 (the tracer is slow for longer inputs)'] }),

  // ---------- Step 8: bit manipulation ----------
  mk('Introduction to Bit Manipulation', 'bitTour', 'Return {a & b, a | b, a ^ b, ~a, a << 1, a >> 1}.', 'vector<int> bitTour(int a, int b)', 'return {};', [
    ap('Bitwise operators', 'O(1)', 'O(1)', '1', 'Each operator is a single CPU instruction acting on all 32 bits in parallel.', `vector<int> bitTour(int a, int b) {
    return {a & b, a | b, a ^ b, ~a, a << 1, a >> 1};
}`)], [[12, 10], [5, 3], [0, 7], [-8, 3], [1, 1]], (a: number, b: number) => [a & b, a | b, a ^ b, ~a, a << 1, a >> 1], ['Write both numbers in binary and combine bit by bit.'], 'AND keeps common bits, OR merges, XOR keeps differing bits, shifts move bits.'),
  mk('Check if the i-th bit is set or not', 'isBitSet', 'Return true if the i-th bit (0 = least significant) of n is 1.', 'bool isBitSet(int n, int i)', 'return false;', [
    ap('Shift and mask', 'O(1)', 'O(1)', '1', 'One shift and one AND.', `bool isBitSet(int n, int i) {
    return ((n >> i) & 1) == 1;
}`), ap('Mask with 1 << i', 'O(1)', 'O(1)', '1', 'Build a mask with a single 1 at position i and AND it with n.', `bool isBitSet(int n, int i) {
    return (n & (1 << i)) != 0;
}`)], [[5, 0], [5, 1], [5, 2], [8, 3], [0, 4], [255, 7]], (n: number, i: number) => ((n >> i) & 1) === 1, ['Shift the bit you want to position 0, then mask with 1.'], 'AND with a single-bit mask isolates one bit.'),
  mk('Check if a number is odd or not', 'isOdd', 'Return true if n is odd (without using %).', 'bool isOdd(int n)', 'return false;', [
    ap('Test the lowest bit', 'O(1)', 'O(1)', '1', 'The lowest bit is 1 exactly for odd numbers.', `bool isOdd(int n) {
    return (n & 1) == 1;
}`)], [[1], [2], [7], [100], [-3], [0]], (n: number) => Math.abs(n) % 2 === 1, ['Which bit decides parity?'], 'Even numbers end in binary 0, odd numbers in binary 1.'),
  mk('Set/Unset the rightmost unset bit', 'rightmostBits', 'Return {n with its rightmost 0 bit set, n with its rightmost 1 bit cleared} (n > 0).', 'vector<int> rightmostBits(int n)', 'return {};', [
    ap('n | (n + 1) and n & (n - 1)', 'O(1)', 'O(1)', '1', 'Adding 1 flips the trailing 1s and the first 0, so OR-ing with n sets that 0; subtracting 1 flips the lowest set bit and the zeros below it, so AND-ing clears it.', `vector<int> rightmostBits(int n) {
    int setRightmostZero = n | (n + 1);
    int clearRightmostOne = n & (n - 1);
    return {setRightmostZero, clearRightmostOne};
}`)], [[5], [7], [8], [10], [1], [12]], (n: number) => [n | (n + 1), n & (n - 1)], ['Think about what n + 1 does to the trailing bits.'], 'Arithmetic carries propagate through trailing ones, which makes these tricks work.'),
  mk('Swap two numbers', 'swapNumbers', 'Swap a and b without a temporary variable using XOR; return {a, b} afterwards.', 'vector<int> swapNumbers(int a, int b)', 'return {a, b};', [
    ap('XOR swap', 'O(1)', 'O(1)', '1', 'Three XOR operations; x ^ x = 0 lets each value be recovered from the combination.', `vector<int> swapNumbers(int a, int b) {
    a = a ^ b;
    b = a ^ b;
    a = a ^ b;
    return {a, b};
}`)], [[3, 9], [-4, 4], [7, 7], [0, 5]], (a: number, b: number) => [b, a], ['a ^ b stores both numbers; XOR with one of them recovers the other.'], 'XOR is its own inverse.'),
  mk('Divide two integers without using multiplication, division and mod operator', 'divide', 'Return dividend / divisor truncated towards zero using only shifts and subtraction (clamp to the int range).', 'int divide(int dividend, int divisor)', 'return 0;', [
    ap('Shift-subtract (binary long division)', 'O(log² n)', 'O(1)', 'logn', 'Each outer step doubles the divisor with shifts (≤ 31 steps) and subtracts; at most 31 outer steps.', `int divide(int dividend, int divisor) {
    if (dividend == INT_MIN && divisor == -1) {
        return INT_MAX;
    }
    long long a = dividend;
    long long b = divisor;
    bool negative = (a < 0) != (b < 0);
    if (a < 0) {
        a = -a;
    }
    if (b < 0) {
        b = -b;
    }
    long long quotient = 0;
    while (a >= b) {
        long long shifted = b;
        long long multiple = 1;
        while ((shifted << 1) <= a) {
            shifted = shifted << 1;
            multiple = multiple << 1;
        }
        a -= shifted;
        quotient += multiple;
    }
    if (negative) {
        quotient = -quotient;
    }
    return quotient;
}`)], [[10, 3], [7, -3], [-7, 2], [0, 5], [1, 1], [-2147483648, -1], [2147483647, 1], [100, 7]], (a: number, b: number) => { const q = Math.trunc(a / b); return q > 2147483647 ? 2147483647 : q < -2147483648 ? -2147483648 : q; }, ['Doubling the divisor with << finds the largest multiple that fits.', 'Work with long long to avoid overflow.'], 'Binary long division: subtract the biggest shifted divisor, repeat.'),
  mk('Power Set', 'powerSet', 'Return all subsets of nums using bitmasks.', 'vector<vector<int>> powerSet(vector<int>& nums)', 'return {};', [
    ap('Bitmask enumeration', 'O(n·2ⁿ)', 'O(n)', '2n', 'Each of the 2ⁿ masks selects a subset in O(n).', `vector<vector<int>> powerSet(vector<int>& nums) {
    vector<vector<int>> result;
    int n = nums.size();
    for (int mask = 0; mask < (1 << n); mask++) {
        vector<int> subset;
        for (int i = 0; i < n; i++) {
            if ((mask >> i) & 1) {
                subset.push_back(nums[i]);
            }
        }
        result.push_back(subset);
    }
    return result;
}`)], [[[1, 2, 3]], [[5]], [[]], [[4, 7]]], (a: number[]) => { const o: number[][] = []; for (let m = 0; m < 1 << a.length; m++) o.push(a.filter((_, i) => m >> i & 1)); return o; }, ['Counting from 0 to 2ⁿ−1 visits every subset exactly once.'], 'Bit i of the counter says whether element i is in the subset.', { unordered: true }),
  mk('Prime Factors of a Number', 'primeFactors', 'Return the distinct prime factors of n in increasing order.', 'vector<int> primeFactors(int n)', 'return {};', [
    ap('Trial division up to √n', 'O(√n)', 'O(1)', 'logn', 'Each divisor candidate up to √n is tested once; dividing out factors shrinks n.', `vector<int> primeFactors(int n) {
    vector<int> factors;
    for (int p = 2; p * p <= n; p++) {
        if (n % p == 0) {
            factors.push_back(p);
            while (n % p == 0) {
                n = n / p;
            }
        }
    }
    if (n > 1) {
        factors.push_back(n);
    }
    return factors;
}`)], [[12], [97], [100], [1], [360], [49]], (n: number) => { const f: number[] = []; for (let p = 2; p <= n; p++) if (n % p === 0) { f.push(p); while (n % p === 0) n /= p; } return f; }, ['After dividing out a prime, never meet it again.', 'A leftover n > 1 is itself prime.'], 'A composite number always has a factor ≤ √n.'),
  mk('All Divisors of a Number', 'allDivisors', 'Return all divisors of n in increasing order.', 'vector<int> allDivisors(int n)', 'return {};', [
    ap('Pairs (i, n/i) up to √n', 'O(√n)', 'O(d)', 'logn', 'Divisors come in pairs, so only i ≤ √n is tested; d = number of divisors.', `vector<int> allDivisors(int n) {
    vector<int> small;
    vector<int> large;
    for (int i = 1; i * i <= n; i++) {
        if (n % i == 0) {
            small.push_back(i);
            if (i != n / i) {
                large.push_back(n / i);
            }
        }
    }
    reverse(large.begin(), large.end());
    for (int i = 0; i < large.size(); i++) {
        small.push_back(large[i]);
    }
    return small;
}`)], [[36], [1], [13], [100], [60]], (n: number) => { const d: number[] = []; for (let i = 1; i <= n; i++) if (n % i === 0) d.push(i); return d; }, ['If i divides n, so does n / i.'], 'Divisors pair up around √n.'),
  mk('Find prime factorisation of a number using Sieve', 'factorize', 'Return the prime factorisation of n (with multiplicity, ascending) using a smallest-prime-factor sieve.', 'vector<int> factorize(int n)', 'return {};', [
    ap('Smallest prime factor sieve', 'O(n log log n) build, O(log n) per query', 'O(n)', 'nlogn', 'The sieve marks the smallest prime factor of every number up to n; after that each factorisation follows spf[] in at most log₂ n steps.', `vector<int> factorize(int n) {
    vector<int> spf(n + 1, 0);
    for (int i = 2; i <= n; i++) {
        if (spf[i] == 0) {
            for (int j = i; j <= n; j += i) {
                if (spf[j] == 0) {
                    spf[j] = i;
                }
            }
        }
    }
    vector<int> factors;
    while (n > 1) {
        factors.push_back(spf[n]);
        n = n / spf[n];
    }
    return factors;
}`)], [[12], [97], [100], [1], [360], [1024]], (n: number) => { const f: number[] = []; for (let p = 2; n > 1; p++) while (n % p === 0) { f.push(p); n /= p; } return f; }, ['Precompute the smallest prime factor of every number.'], 'The sieve turns factorisation into following a chain of precomputed divisors.'),
];
