// Batch 4: Step 11 heaps, Step 12 greedy.
import { Playable, ap, mk } from './kit';

const sortNum = (a: number[]) => [...a].sort((x, y) => x - y);
const isMaxHeap = (a: number[]) => a.every((x, i) => (2 * i + 1 >= a.length || x >= a[2 * i + 1]) && (2 * i + 2 >= a.length || x >= a[2 * i + 2]));
const isMinHeap = (a: number[]) => a.every((x, i) => (2 * i + 1 >= a.length || x <= a[2 * i + 1]) && (2 * i + 2 >= a.length || x <= a[2 * i + 2]));

export const B4_PROBLEMS: Playable[] = [
  // ---------- Step 11: heaps ----------
  mk('Introduction to Priority Queues using Binary Heaps', 'pqTour', 'Push all numbers into a max-heap priority_queue and return {size, top, the three largest values popped in order}; then the smallest via a min-heap.', 'vector<int> pqTour(vector<int>& nums)', 'return {};', [
    ap('priority_queue (binary heap)', 'O(n log n)', 'O(n)', 'nlogn', 'Each push and pop costs O(log n) because a binary heap has height log n; n pushes and 4 pops.', `vector<int> pqTour(vector<int>& nums) {
    priority_queue<int> maxHeap;
    priority_queue<int, vector<int>, greater<int>> minHeap;
    for (int i = 0; i < nums.size(); i++) {
        maxHeap.push(nums[i]);
        minHeap.push(nums[i]);
    }
    vector<int> result = {(int)maxHeap.size(), maxHeap.top()};
    for (int i = 0; i < 3 && !maxHeap.empty(); i++) {
        result.push_back(maxHeap.top());
        maxHeap.pop();
    }
    result.push_back(minHeap.top());
    return result;
}`)], [[[5, 1, 9, 3, 7]], [[4, 4, 4, 4]], [[2, 8, 6]], [[10]]], (a: number[]) => { const d = [...a].sort((x, y) => y - x); return [a.length, d[0], ...d.slice(0, 3), Math.min(...a)]; }, ['priority_queue is a max-heap by default; greater<int> makes it a min-heap.'], 'A heap gives the extreme element in O(1) and restores order in O(log n).'),
  mk('Min Heap and Max Heap Implementation', 'heapOperations', 'Implement an array-based binary heap. ops: [1,x] insert, [2] extract (min or max; -1 if empty), [3] peek (-1 if empty). Return the outputs of ops 2 and 3. maxHeap selects the kind.', 'vector<int> heapOperations(vector<vector<int>>& ops, bool maxHeap)', 'return {};', [
    ap('Array heap with sift up / sift down', 'O(log n) per insert/extract', 'O(n)', 'logn', 'The tree is stored in an array (children of i at 2i+1 and 2i+2). Insert sifts up and extract sifts down along one root-to-leaf path of height log n.', `bool before(int a, int b, bool maxHeap) {
    return maxHeap ? a > b : a < b;
}

vector<int> heapOperations(vector<vector<int>>& ops, bool maxHeap) {
    vector<int> heap;
    vector<int> out;
    for (int i = 0; i < ops.size(); i++) {
        int type = ops[i][0];
        if (type == 1) {
            heap.push_back(ops[i][1]);
            int child = heap.size() - 1;
            while (child > 0) {
                int parent = (child - 1) / 2;
                if (before(heap[child], heap[parent], maxHeap)) {
                    swap(heap[child], heap[parent]);
                    child = parent;
                } else {
                    break;
                }
            }
        } else if (type == 2) {
            if (heap.empty()) {
                out.push_back(-1);
            } else {
                out.push_back(heap[0]);
                heap[0] = heap.back();
                heap.pop_back();
                int parent = 0;
                while (true) {
                    int left = 2 * parent + 1;
                    int right = left + 1;
                    int best = parent;
                    if (left < heap.size() && before(heap[left], heap[best], maxHeap)) {
                        best = left;
                    }
                    if (right < heap.size() && before(heap[right], heap[best], maxHeap)) {
                        best = right;
                    }
                    if (best == parent) {
                        break;
                    }
                    swap(heap[parent], heap[best]);
                    parent = best;
                }
            }
        } else if (type == 3) {
            out.push_back(heap.empty() ? -1 : heap[0]);
        }
    }
    return out;
}`)], [[[[1, 5], [1, 2], [1, 8], [3], [2], [2], [1, 1], [2], [2], [2]], false], [[[1, 5], [1, 2], [1, 8], [3], [2], [2], [1, 11], [2], [2], [2]], true], [[[2]], false], [[[1, 3], [1, 3], [2], [2]], true]], (ops: number[][], mx: boolean) => { const h: number[] = [], out: number[] = []; for (const o of ops) { if (o[0] === 1) h.push(o[1]); else { h.sort((a, b) => (mx ? b - a : a - b)); if (o[0] === 2) out.push(h.length ? h.shift()! : -1); else out.push(h.length ? h[0] : -1); } } return out; },
    ['Insert at the end and swap upwards while the parent is "worse".', 'Extract: move the last element to the root and sift down.'], 'The heap property only constrains parent vs children, which keeps both operations logarithmic.'),
  mk('Check if an array represents a min-heap', 'isMinHeapArray', 'Return true if the array (level order) satisfies the min-heap property.', 'bool isMinHeapArray(vector<int>& a)', 'return false;', [
    ap('Check every internal node', 'O(n)', 'O(1)', 'n', 'Only the first n/2 nodes have children; each is compared with at most two children.', `bool isMinHeapArray(vector<int>& a) {
    int n = a.size();
    for (int i = 0; 2 * i + 1 < n; i++) {
        int left = 2 * i + 1;
        int right = 2 * i + 2;
        if (a[i] > a[left]) {
            return false;
        }
        if (right < n && a[i] > a[right]) {
            return false;
        }
    }
    return true;
}`)], [[[1, 3, 2, 7, 4]], [[3, 1, 2]], [[5]], [[1, 2, 3, 4, 5, 6, 7]], [[1, 3, 2, 0]]], (a: number[]) => isMinHeap(a), ['Children of i are 2i+1 and 2i+2.'], 'Local parent ≤ child checks imply the global property.'),
  { ...mk('Convert Min Heap to Max Heap', 'minToMaxHeap', 'Given a min-heap array, rearrange it in place into a valid max-heap (any valid max-heap is accepted).', 'void minToMaxHeap(vector<int>& a)', '', [
    ap('Bottom-up heapify (Floyd)', 'O(n)', 'O(log n)', 'n', 'Nodes near the leaves need little work, so the total sift-down cost sums to O(n) (not n log n). The recursion depth is the heap height.', `void siftDown(vector<int>& a, int n, int i) {
    int largest = i;
    int left = 2 * i + 1;
    int right = 2 * i + 2;
    if (left < n && a[left] > a[largest]) {
        largest = left;
    }
    if (right < n && a[right] > a[largest]) {
        largest = right;
    }
    if (largest != i) {
        swap(a[i], a[largest]);
        siftDown(a, n, largest);
    }
}

void minToMaxHeap(vector<int>& a) {
    int n = a.size();
    for (int i = n / 2 - 1; i >= 0; i--) {
        siftDown(a, n, i);
    }
}`)], [[[1, 3, 2, 7, 4]], [[1]], [[1, 2, 3, 4, 5, 6, 7]], [[2, 5, 3]], [[1, 2]]], (a: number[]) => sortNum(a).reverse(), ['Start from the last internal node and sift down.'], 'Heapify works from the leaves upwards.'), checkArg: 0, check: (args: any[], got: number[]) => { const a: number[] = args[0]; return isMaxHeap(got) && JSON.stringify(sortNum(got)) === JSON.stringify(sortNum(a)); } },
  mk('Merge K Sorted Arrays', 'mergeKSorted', 'Merge k sorted arrays into one sorted array.', 'vector<int> mergeKSorted(vector<vector<int>>& arrays)', 'return {};', [
    ap('Concatenate and sort', 'O(N log N)', 'O(N)', 'nlogn', 'N = total elements; ignores that the inputs are already sorted.', `vector<int> mergeKSorted(vector<vector<int>>& arrays) {
    vector<int> all;
    for (int i = 0; i < arrays.size(); i++) {
        for (int j = 0; j < arrays[i].size(); j++) {
            all.push_back(arrays[i][j]);
        }
    }
    sort(all.begin(), all.end());
    return all;
}`), ap('Min-heap of the current heads', 'O(N log k)', 'O(k)', 'nlogn', 'The heap holds one element per array (size k); each of the N extractions and insertions costs O(log k).', `vector<int> mergeKSorted(vector<vector<int>>& arrays) {
    priority_queue<vector<int>, vector<vector<int>>, greater<vector<int>>> pq;
    for (int i = 0; i < arrays.size(); i++) {
        if (!arrays[i].empty()) {
            pq.push({arrays[i][0], i, 0});
        }
    }
    vector<int> result;
    while (!pq.empty()) {
        vector<int> top = pq.top();
        pq.pop();
        result.push_back(top[0]);
        int row = top[1];
        int next = top[2] + 1;
        if (next < arrays[row].size()) {
            pq.push({arrays[row][next], row, next});
        }
    }
    return result;
}`)], [[[[1, 4, 7], [2, 5, 8], [3, 6, 9]]], [[[1, 2], [], [0, 5]]], [[[5]]], [[[1, 1], [1, 1]]], [[[10, 20], [5, 6, 7], [1]]]], (arrs: number[][]) => sortNum(arrs.flat()), ['Keep only the smallest unused element of each array in a heap.'], 'The next output is always the minimum of the k current heads.'),
  mk('Replace each array element by its rank', 'arrayRankTransform', 'Replace every element by its rank (smallest value has rank 1; equal values share a rank).', 'vector<int> arrayRankTransform(vector<int>& arr)', 'return {};', [
    ap('Sort a copy, unique, binary search', 'O(n log n)', 'O(n)', 'nlogn', 'Sorting and unique cost O(n log n); each element\'s rank is found by lower_bound in O(log n).', `vector<int> arrayRankTransform(vector<int>& arr) {
    vector<int> sorted = arr;
    sort(sorted.begin(), sorted.end());
    sorted.erase(unique(sorted.begin(), sorted.end()), sorted.end());
    vector<int> ranks;
    for (int i = 0; i < arr.size(); i++) {
        ranks.push_back(lower_bound(sorted.begin(), sorted.end(), arr[i]) - sorted.begin() + 1);
    }
    return ranks;
}`)], [[[40, 10, 20, 30]], [[100, 100, 100]], [[37, 12, 28, 9, 100, 56, 80, 5, 12]], [[]], [[7]]], (a: number[]) => { const u = sortNum([...new Set(a)]); return a.map(x => u.indexOf(x) + 1); }, ['Rank = position among the distinct sorted values + 1.'], 'Sorting turns "how many smaller?" into an index lookup.'),
  mk('Task Scheduler', 'leastInterval', 'Tasks (letters) need n idle intervals between two equal tasks. Return the minimum number of intervals to finish all tasks.', 'int leastInterval(vector<char>& tasks, int n)', 'return 0;', [
    ap('Max-heap simulation', 'O(T log 26)', 'O(1)', 'n', 'Each unit of time picks the most frequent available task; the heap holds at most 26 types.', `int leastInterval(vector<char>& tasks, int n) {
    vector<int> count(26, 0);
    for (int i = 0; i < tasks.size(); i++) {
        count[tasks[i] - 'A']++;
    }
    priority_queue<int> pq;
    for (int i = 0; i < 26; i++) {
        if (count[i] > 0) {
            pq.push(count[i]);
        }
    }
    int time = 0;
    while (!pq.empty()) {
        vector<int> used;
        int cycle = n + 1;
        while (cycle > 0 && !pq.empty()) {
            int c = pq.top();
            pq.pop();
            if (c > 1) {
                used.push_back(c - 1);
            }
            time++;
            cycle--;
        }
        for (int i = 0; i < used.size(); i++) {
            pq.push(used[i]);
        }
        if (!pq.empty()) {
            time += cycle;
        }
    }
    return time;
}`), ap('Formula from the most frequent task', 'O(T)', 'O(1)', 'n', 'The most frequent task forces (maxFreq−1) full cycles of length n+1 plus the tasks sharing that frequency; the answer is at least the number of tasks.', `int leastInterval(vector<char>& tasks, int n) {
    vector<int> count(26, 0);
    for (int i = 0; i < tasks.size(); i++) {
        count[tasks[i] - 'A']++;
    }
    int maxFreq = *max_element(count.begin(), count.end());
    int numMax = 0;
    for (int i = 0; i < 26; i++) {
        if (count[i] == maxFreq) {
            numMax++;
        }
    }
    return max((int)tasks.size(), (maxFreq - 1) * (n + 1) + numMax);
}`)], [[['A', 'A', 'A', 'B', 'B', 'B'], 2], [['A', 'A', 'A', 'B', 'B', 'B'], 0], [['A', 'A', 'A', 'A', 'A', 'A', 'B', 'C', 'D', 'E', 'F', 'G'], 2], [['A'], 5], [['A', 'B', 'C'], 1]], (t: string[], n: number) => { const c: Record<string, number> = {}; t.forEach(x => (c[x] = (c[x] ?? 0) + 1)); const m = Math.max(...Object.values(c)); const nm = Object.values(c).filter(v => v === m).length; return Math.max(t.length, (m - 1) * (n + 1) + nm); }, ['The most frequent task decides the skeleton of the schedule.'], 'Idle time appears only because of the busiest task.'),
  mk('Hands of Straights', 'isNStraightHand', 'Can the cards be rearranged into groups of groupSize consecutive values?', 'bool isNStraightHand(vector<int>& hand, int groupSize)', 'return false;', [
    ap('Ordered map, build groups from the smallest', 'O(n log n)', 'O(n)', 'nlogn', 'The smallest remaining card must start a group; each card is consumed once.', `bool isNStraightHand(vector<int>& hand, int groupSize) {
    if (hand.size() % groupSize != 0) {
        return false;
    }
    map<int, int> count;
    for (int i = 0; i < hand.size(); i++) {
        count[hand[i]]++;
    }
    for (auto& [card, c] : count) {
        if (count[card] > 0) {
            int need = count[card];
            for (int k = 0; k < groupSize; k++) {
                if (count[card + k] < need) {
                    return false;
                }
                count[card + k] -= need;
            }
        }
    }
    return true;
}`)], [[[1, 2, 3, 6, 2, 3, 4, 7, 8], 3], [[1, 2, 3, 4, 5], 4], [[1, 1, 2, 2, 3, 3], 3], [[5], 1], [[1, 3], 2]], (h: number[], g: number) => { if (h.length % g) return false; const c = new Map<number, number>(); h.forEach(x => c.set(x, (c.get(x) ?? 0) + 1)); for (const k of [...c.keys()].sort((a, b) => a - b)) { const need = c.get(k)!; if (need > 0) for (let i = 0; i < g; i++) { if ((c.get(k + i) ?? 0) < need) return false; c.set(k + i, c.get(k + i)! - need); } } return true; }, ['The smallest card has no smaller neighbour: it must start a group.'], 'Greedily start groups from the smallest remaining value.'),
  mk('Design Twitter', 'twitter', 'ops: [1,user,tweet] post, [2,user] news feed (the up-to-10 most recent tweet ids from the user and the people they follow, newest first, then -1), [3,a,b] a follows b, [4,a,b] a unfollows b. Return the concatenated outputs.', 'vector<int> twitter(vector<vector<int>>& ops)', 'return {};', [
    ap('Per-user tweet lists + merge by time', 'O(T log T) per feed', 'O(total tweets)', 'nlogn', 'A feed gathers the timestamped tweets of the user and followees, sorts them by time and keeps 10. (Production code merges per-user lists with a heap in O(F log F + 10 log F).)', `vector<int> twitter(vector<vector<int>>& ops) {
    map<int, vector<pair<int, int>>> tweets;
    map<int, set<int>> follows;
    int clock = 0;
    vector<int> out;
    for (int i = 0; i < ops.size(); i++) {
        int type = ops[i][0];
        if (type == 1) {
            clock++;
            tweets[ops[i][1]].push_back({clock, ops[i][2]});
        } else if (type == 2) {
            int user = ops[i][1];
            vector<pair<int, int>> all;
            for (int k = 0; k < tweets[user].size(); k++) {
                all.push_back(tweets[user][k]);
            }
            for (int other : follows[user]) {
                for (int k = 0; k < tweets[other].size(); k++) {
                    all.push_back(tweets[other][k]);
                }
            }
            sort(all.begin(), all.end());
            reverse(all.begin(), all.end());
            for (int k = 0; k < all.size() && k < 10; k++) {
                out.push_back(all[k].second);
            }
            out.push_back(-1);
        } else if (type == 3) {
            if (ops[i][1] != ops[i][2]) {
                follows[ops[i][1]].insert(ops[i][2]);
            }
        } else if (type == 4) {
            follows[ops[i][1]].erase(ops[i][2]);
        }
    }
    return out;
}`)], [[[[1, 1, 5], [2, 1], [3, 1, 2], [1, 2, 6], [2, 1], [4, 1, 2], [2, 1]]], [[[1, 1, 1], [1, 1, 2], [1, 1, 3], [2, 2]]], [[[3, 1, 2], [1, 2, 10], [1, 1, 20], [2, 1], [2, 2]]], [[[1, 1, 1], [1, 1, 2], [1, 1, 3], [1, 1, 4], [1, 1, 5], [1, 1, 6], [1, 1, 7], [1, 1, 8], [1, 1, 9], [1, 1, 10], [1, 1, 11], [2, 1]]]], (ops: number[][]) => { const tw = new Map<number, [number, number][]>(), fo = new Map<number, Set<number>>(); let t = 0; const out: number[] = []; for (const o of ops) { if (o[0] === 1) { t++; (tw.get(o[1]) ?? tw.set(o[1], []).get(o[1])!).push([t, o[2]]); } else if (o[0] === 2) { const users = [o[1], ...(fo.get(o[1]) ?? [])]; const all = users.flatMap(u => tw.get(u) ?? []); all.sort((a, b) => b[0] - a[0]); out.push(...all.slice(0, 10).map(x => x[1]), -1); } else if (o[0] === 3) { if (o[1] !== o[2]) (fo.get(o[1]) ?? fo.set(o[1], new Set()).get(o[1])!).add(o[2]); } else fo.get(o[1])?.delete(o[2]); } return out; },
    ['Tweets carry a global timestamp.', 'The feed is the 10 newest among the user and everyone they follow.'], 'A news feed is a k-way merge of timestamped lists.'),
  mk('Kth Largest Element in a Stream of Running Integers', 'kthLargestStream', 'Start with the numbers in initial, then add each value of stream. After every addition, report the k-th largest element so far (-1 if fewer than k elements).', 'vector<int> kthLargestStream(int k, vector<int>& initial, vector<int>& stream)', 'return {};', [
    ap('Min-heap of size k', 'O(log k) per element', 'O(k)', 'logn', 'The heap keeps only the k largest values; its root is the k-th largest. Each add is one push and at most one pop.', `vector<int> kthLargestStream(int k, vector<int>& initial, vector<int>& stream) {
    priority_queue<int, vector<int>, greater<int>> pq;
    for (int i = 0; i < initial.size(); i++) {
        pq.push(initial[i]);
        if (pq.size() > k) {
            pq.pop();
        }
    }
    vector<int> result;
    for (int i = 0; i < stream.size(); i++) {
        pq.push(stream[i]);
        if (pq.size() > k) {
            pq.pop();
        }
        result.push_back(pq.size() < k ? -1 : pq.top());
    }
    return result;
}`)], [[3, [4, 5, 8, 2], [3, 5, 10, 9, 4]], [1, [], [5, 3, 9]], [2, [1], [2, 0, 7]], [4, [1, 2], [3, 4, 5]]], (k: number, init: number[], st: number[]) => { const a = [...init]; return st.map(x => { a.push(x); const s = sortNum(a).reverse(); return s.length < k ? -1 : s[k - 1]; }); }, ['You only ever need the k largest values.'], 'A small heap tracks a moving order statistic.'),
  mk('Maximum Sum Combination', 'maxSumCombination', 'Choose one element from each array; return the k largest possible sums in decreasing order.', 'vector<int> maxSumCombination(vector<int>& a, vector<int>& b, int k)', 'return {};', [
    ap('Brute force: all sums', 'O(n² log n²)', 'O(n²)', 'n2', 'Generate every pair sum and sort.', `vector<int> maxSumCombination(vector<int>& a, vector<int>& b, int k) {
    vector<int> sums;
    for (int i = 0; i < a.size(); i++) {
        for (int j = 0; j < b.size(); j++) {
            sums.push_back(a[i] + b[j]);
        }
    }
    sort(sums.begin(), sums.end());
    reverse(sums.begin(), sums.end());
    vector<int> result;
    for (int i = 0; i < k && i < sums.size(); i++) {
        result.push_back(sums[i]);
    }
    return result;
}`), ap('Sort + max-heap of index pairs', 'O(n log n + k log k)', 'O(k)', 'nlogn', 'After sorting both arrays descending, the best pair is (0,0); each popped pair (i,j) offers (i+1,j) and (i,j+1). Only k pairs are ever expanded.', `vector<int> maxSumCombination(vector<int>& a, vector<int>& b, int k) {
    sort(a.begin(), a.end(), greater<int>());
    sort(b.begin(), b.end(), greater<int>());
    priority_queue<vector<int>> pq;
    set<pair<int, int>> seen;
    pq.push({a[0] + b[0], 0, 0});
    seen.insert({0, 0});
    vector<int> result;
    while (result.size() < k && !pq.empty()) {
        vector<int> top = pq.top();
        pq.pop();
        result.push_back(top[0]);
        int i = top[1];
        int j = top[2];
        if (i + 1 < a.size() && !seen.count({i + 1, j})) {
            seen.insert({i + 1, j});
            pq.push({a[i + 1] + b[j], i + 1, j});
        }
        if (j + 1 < b.size() && !seen.count({i, j + 1})) {
            seen.insert({i, j + 1});
            pq.push({a[i] + b[j + 1], i, j + 1});
        }
    }
    return result;
}`)], [[[1, 4, 2, 3], [2, 5, 1, 6], 4], [[3, 2], [1, 4], 2], [[5], [5], 1], [[1, 1, 1], [1, 1, 1], 4], [[10, 9, 8], [1, 2, 3], 5]], (a: number[], b: number[], k: number) => { const s: number[] = []; a.forEach(x => b.forEach(y => s.push(x + y))); return s.sort((x, y) => y - x).slice(0, k); }, ['Sort both arrays descending: the best sum is the pair of first elements.', 'A popped pair can only be followed by its two neighbours.'], 'Explore the grid of sums best-first with a heap.'),
  mk('Find Median from Data Stream', 'medianStream', 'Numbers arrive one by one. After each arrival return the median of all numbers so far.', 'vector<double> medianStream(vector<int>& nums)', 'return {};', [
    ap('Insert into a sorted vector', 'O(n²)', 'O(n)', 'n2', 'Each insertion shifts O(n) elements.', `vector<double> medianStream(vector<int>& nums) {
    vector<int> sorted;
    vector<double> result;
    for (int i = 0; i < nums.size(); i++) {
        int pos = upper_bound(sorted.begin(), sorted.end(), nums[i]) - sorted.begin();
        sorted.insert(sorted.begin() + pos, nums[i]);
        int n = sorted.size();
        if (n % 2 == 1) {
            result.push_back(sorted[n / 2]);
        } else {
            result.push_back((sorted[n / 2 - 1] + sorted[n / 2]) / 2.0);
        }
    }
    return result;
}`), ap('Two heaps (max-heap low, min-heap high)', 'O(log n) per number', 'O(n)', 'logn', 'The lower half lives in a max-heap and the upper half in a min-heap, kept within one element of each other; the median is at the top(s). Each insert is O(log n), the median query O(1).', `vector<double> medianStream(vector<int>& nums) {
    priority_queue<int> low;
    priority_queue<int, vector<int>, greater<int>> high;
    vector<double> result;
    for (int i = 0; i < nums.size(); i++) {
        low.push(nums[i]);
        high.push(low.top());
        low.pop();
        if (high.size() > low.size()) {
            low.push(high.top());
            high.pop();
        }
        if (low.size() > high.size()) {
            result.push_back(low.top());
        } else {
            result.push_back((low.top() + high.top()) / 2.0);
        }
    }
    return result;
}`)], [[[5, 15, 1, 3]], [[2]], [[1, 2]], [[7, 7, 7, 7]], [[9, 8, 7, 6, 5]]], (a: number[]) => a.map((_, i) => { const s = sortNum(a.slice(0, i + 1)); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }), ['Keep the smaller half and the larger half in two heaps.'], 'Balanced halves expose the median at the heap tops.', { tol: 1e-9 }),
  mk('K Most Frequent Elements', 'topKFrequent', 'Return the k most frequent elements, ordered by decreasing frequency (ties by value ascending).', 'vector<int> topKFrequent(vector<int>& nums, int k)', 'return {};', [
    ap('Count, then sort all distinct values', 'O(n + d log d)', 'O(d)', 'nlogn', 'Sorting all d distinct values by frequency.', `vector<int> topKFrequent(vector<int>& nums, int k) {
    map<int, int> count;
    for (int i = 0; i < nums.size(); i++) {
        count[nums[i]]++;
    }
    vector<vector<int>> items;
    for (auto& [value, c] : count) {
        items.push_back({-c, value});
    }
    sort(items.begin(), items.end());
    vector<int> result;
    for (int i = 0; i < k && i < items.size(); i++) {
        result.push_back(items[i][1]);
    }
    return result;
}`), ap('Min-heap of size k', 'O(n + d log k)', 'O(d)', 'nlogn', 'The heap never holds more than k (count, value) pairs, so each of the d distinct values costs O(log k).', `vector<int> topKFrequent(vector<int>& nums, int k) {
    map<int, int> count;
    for (int i = 0; i < nums.size(); i++) {
        count[nums[i]]++;
    }
    priority_queue<vector<int>, vector<vector<int>>, greater<vector<int>>> pq;
    for (auto& [value, c] : count) {
        pq.push({c, -value});
        if (pq.size() > k) {
            pq.pop();
        }
    }
    vector<int> result;
    while (!pq.empty()) {
        vector<int> top = pq.top();
        pq.pop();
        result.push_back(-top[1]);
    }
    reverse(result.begin(), result.end());
    return result;
}`)], [[[1, 1, 1, 2, 2, 3], 2], [[1], 1], [[4, 4, 5, 5, 5, 6, 6, 6, 6], 2], [[7, 8, 9], 3], [[2, 2, 3, 3, 1], 1]], (a: number[], k: number) => { const c = new Map<number, number>(); a.forEach(x => c.set(x, (c.get(x) ?? 0) + 1)); return [...c.entries()].sort((x, y) => y[1] - x[1] || x[0] - y[0]).slice(0, k).map(e => e[0]); }, ['Count first.', 'Keep only k (count, value) pairs in a min-heap.'], 'A bounded heap finds the top k without sorting everything.'),

  // ---------- Step 12: greedy ----------
  mk('Fractional Knapsack', 'fractionalKnapsack', 'Items have (value, weight); you may take fractions. Return the maximum value for capacity W.', 'double fractionalKnapsack(vector<vector<int>>& items, int W)', 'return 0;', [
    ap('Sort by value/weight ratio', 'O(n log n)', 'O(1)', 'nlogn', 'Sorting by ratio dominates; the fill pass is O(n).', `double fractionalKnapsack(vector<vector<int>>& items, int W) {
    sort(items.begin(), items.end(), [](vector<int>& a, vector<int>& b) {
        return (double)a[0] / a[1] > (double)b[0] / b[1];
    });
    double total = 0;
    int remaining = W;
    for (int i = 0; i < items.size() && remaining > 0; i++) {
        if (items[i][1] <= remaining) {
            total += items[i][0];
            remaining -= items[i][1];
        } else {
            total += (double)items[i][0] * remaining / items[i][1];
            remaining = 0;
        }
    }
    return total;
}`)], [[[[60, 10], [100, 20], [120, 30]], 50], [[[500, 30]], 10], [[[10, 5], [20, 10]], 0], [[[10, 5], [20, 10]], 100], [[[3, 2], [4, 3], [5, 4]], 5]], (it: number[][], W: number) => { const s = [...it].sort((a, b) => b[0] / b[1] - a[0] / a[1]); let t = 0, r = W; for (const [v, w] of s) { if (r <= 0) break; if (w <= r) { t += v; r -= w; } else { t += (v * r) / w; r = 0; } } return t; }, ['Take the item with the best value per kilogram first.'], 'Fractions make the locally best choice globally optimal.', { tol: 1e-6 }),
  mk('Find minimum number of coins', 'minCoins', 'Using Indian denominations {1, 2, 5, 10, 20, 50, 100, 500, 1000}, return the fewest coins/notes that sum to V and list them (largest first).', 'vector<int> minCoins(int V)', 'return {};', [
    ap('Greedy: largest denomination first', 'O(V / 1000 + d)', 'O(count)', 'n', 'For this canonical coin system taking the largest coin that fits is optimal (it is NOT optimal for arbitrary denominations; use DP there).', `vector<int> minCoins(int V) {
    vector<int> coins = {1000, 500, 100, 50, 20, 10, 5, 2, 1};
    vector<int> result;
    for (int i = 0; i < coins.size(); i++) {
        while (V >= coins[i]) {
            V -= coins[i];
            result.push_back(coins[i]);
        }
    }
    return result;
}`)], [[49], [121], [1], [2999], [0]], (V: number) => { const out: number[] = []; for (const c of [1000, 500, 100, 50, 20, 10, 5, 2, 1]) while (V >= c) { V -= c; out.push(c); } return out; }, ['Always take the largest denomination that still fits.'], 'Greedy works when each coin is a multiple-friendly step of the next.'),
  mk('Valid Parenthesis String', 'checkValidString', '"*" can be "(", ")" or empty. Return true if the string can be balanced.', 'bool checkValidString(string s)', 'return false;', [
    ap('Track the range of possible open counts', 'O(n)', 'O(1)', 'n', 'low/high bound the number of unmatched "(" over all interpretations; one pass, two integers.', `bool checkValidString(string s) {
    int low = 0;
    int high = 0;
    for (int i = 0; i < s.size(); i++) {
        if (s[i] == '(') {
            low++;
            high++;
        } else if (s[i] == ')') {
            low--;
            high--;
        } else {
            low--;
            high++;
        }
        if (high < 0) {
            return false;
        }
        if (low < 0) {
            low = 0;
        }
    }
    return low == 0;
}`)], [['()'], ['(*)'], ['(*))'], [')('], ['*'], ['(((**)'], ['(()']], (s: string) => { const go = (i: number, o: number): boolean => { if (o < 0) return false; if (i === s.length) return o === 0; const c = s[i]; if (c === '(') return go(i + 1, o + 1); if (c === ')') return go(i + 1, o - 1); return go(i + 1, o + 1) || go(i + 1, o - 1) || go(i + 1, o); }; return go(0, 0); }, ['"*" gives a range of possibilities.'], 'Keep the smallest and largest possible number of open brackets.'),
  mk('N meetings in one room', 'maxMeetings', 'Meetings are [start, end]. Return the maximum number of non-overlapping meetings in one room (a meeting may start exactly when another ends only if start > previous end).', 'int maxMeetings(vector<vector<int>>& meetings)', 'return 0;', [
    ap('Sort by end time, greedy', 'O(n log n)', 'O(1)', 'nlogn', 'Choosing the meeting that ends earliest leaves the most room; sorting dominates.', `int maxMeetings(vector<vector<int>>& meetings) {
    sort(meetings.begin(), meetings.end(), [](vector<int>& a, vector<int>& b) {
        return a[1] < b[1];
    });
    int count = 0;
    int lastEnd = -1;
    for (int i = 0; i < meetings.size(); i++) {
        if (meetings[i][0] > lastEnd) {
            count++;
            lastEnd = meetings[i][1];
        }
    }
    return count;
}`)], [[[[1, 2], [3, 4], [0, 6], [5, 7], [8, 9], [5, 9]]], [[[10, 20], [12, 25]]], [[[1, 3], [3, 5]]], [[[1, 1]]], [[[1, 5], [2, 3], [4, 6], [7, 8]]]], (m: number[][]) => { const s = [...m].sort((a, b) => a[1] - b[1]); let c = 0, e = -1; for (const [a, b] of s) if (a > e) { c++; e = b; } return c; }, ['Sort by finishing time.'], 'The earliest-finishing meeting never hurts the rest of the schedule (exchange argument).'),
  mk('Minimum number of platforms required for a railway', 'minPlatforms', 'Given arrival and departure times (a train leaving at time t frees its platform at t+1, i.e. arrival == departure counts as overlap), return the minimum number of platforms.', 'int minPlatforms(vector<int>& arrivals, vector<int>& departures)', 'return 0;', [
    ap('Brute force', 'O(n²)', 'O(1)', 'n2', 'For every arrival count how many trains are present.', `int minPlatforms(vector<int>& arrivals, vector<int>& departures) {
    int best = 0;
    for (int i = 0; i < arrivals.size(); i++) {
        int present = 0;
        for (int j = 0; j < arrivals.size(); j++) {
            if (arrivals[j] <= arrivals[i] && arrivals[i] <= departures[j]) {
                present++;
            }
        }
        best = max(best, present);
    }
    return best;
}`), ap('Sort both and sweep', 'O(n log n)', 'O(1)', 'nlogn', 'After sorting arrivals and departures independently, a two-pointer sweep tracks how many trains are in the station at each event.', `int minPlatforms(vector<int>& arrivals, vector<int>& departures) {
    sort(arrivals.begin(), arrivals.end());
    sort(departures.begin(), departures.end());
    int platforms = 0;
    int best = 0;
    int i = 0;
    int j = 0;
    while (i < arrivals.size()) {
        if (arrivals[i] <= departures[j]) {
            platforms++;
            i++;
        } else {
            platforms--;
            j++;
        }
        best = max(best, platforms);
    }
    return best;
}`)], [[[900, 940, 950, 1100, 1500, 1800], [910, 1200, 1120, 1130, 1900, 2000]], [[900, 1100, 1235], [1000, 1200, 1240]], [[100], [200]], [[100, 100, 100], [150, 150, 150]], [[1, 2, 3], [10, 10, 10]]], (a: number[], d: number[]) => { let b = 0; for (const t of a) b = Math.max(b, a.filter((x, j) => x <= t && t <= d[j]).length); return b; }, ['Only the order of arrivals and departures matters, not which train is which.'], 'The number of overlapping intervals is the maximum depth over time.'),
  mk('Job Sequencing Problem', 'jobSequencing', 'Jobs are [deadline, profit], each takes 1 unit of time. Return {number of jobs done, maximum profit}.', 'vector<int> jobSequencing(vector<vector<int>>& jobs)', 'return {};', [
    ap('Sort by profit, latest free slot', 'O(n²)', 'O(maxDeadline)', 'n2', 'Jobs are tried in decreasing profit; each searches backwards for a free slot before its deadline (O(n) each). A disjoint-set over slots would make it near O(n log n).', `vector<int> jobSequencing(vector<vector<int>>& jobs) {
    sort(jobs.begin(), jobs.end(), [](vector<int>& a, vector<int>& b) {
        return a[1] > b[1];
    });
    int maxDeadline = 0;
    for (int i = 0; i < jobs.size(); i++) {
        maxDeadline = max(maxDeadline, jobs[i][0]);
    }
    vector<int> slot(maxDeadline + 1, 0);
    int count = 0;
    int profit = 0;
    for (int i = 0; i < jobs.size(); i++) {
        for (int t = jobs[i][0]; t >= 1; t--) {
            if (slot[t] == 0) {
                slot[t] = 1;
                count++;
                profit += jobs[i][1];
                break;
            }
        }
    }
    return {count, profit};
}`)], [[[[4, 20], [1, 10], [1, 40], [1, 30]]], [[[2, 100], [1, 19], [2, 27], [1, 25], [3, 15]]], [[[1, 5]]], [[[3, 10], [3, 20], [3, 30], [3, 40]]], [[[2, 1], [2, 1], [2, 1]]]], (jobs: number[][]) => { const s = [...jobs].sort((a, b) => b[1] - a[1]); const slot: boolean[] = []; let c = 0, p = 0; for (const [d, pr] of s) for (let t = d; t >= 1; t--) if (!slot[t]) { slot[t] = true; c++; p += pr; break; } return [c, p]; }, ['Most profitable jobs first.', 'Place each job as late as possible.'], 'Placing a job in the latest free slot keeps earlier slots open for others.'),
  mk('Candy', 'candy', 'Each child has a rating; every child gets at least 1 candy and a child with a higher rating than a neighbour gets more than that neighbour. Return the minimum total candies.', 'int candy(vector<int>& ratings)', 'return 0;', [
    ap('Two passes (left→right, right→left)', 'O(n)', 'O(n)', 'n', 'One pass enforces the left-neighbour rule, one the right-neighbour rule; taking the max satisfies both.', `int candy(vector<int>& ratings) {
    int n = ratings.size();
    vector<int> candies(n, 1);
    for (int i = 1; i < n; i++) {
        if (ratings[i] > ratings[i - 1]) {
            candies[i] = candies[i - 1] + 1;
        }
    }
    for (int i = n - 2; i >= 0; i--) {
        if (ratings[i] > ratings[i + 1]) {
            candies[i] = max(candies[i], candies[i + 1] + 1);
        }
    }
    int total = 0;
    for (int i = 0; i < n; i++) {
        total += candies[i];
    }
    return total;
}`)], [[[1, 0, 2]], [[1, 2, 2]], [[1, 3, 2, 2, 1]], [[5]], [[1, 2, 3, 4, 5]], [[5, 4, 3, 2, 1]]], (r: number[]) => { const c = r.map(() => 1); for (let ch = true; ch;) { ch = false; for (let i = 0; i < r.length; i++) { if (i > 0 && r[i] > r[i - 1] && c[i] <= c[i - 1]) { c[i] = c[i - 1] + 1; ch = true; } if (i < r.length - 1 && r[i] > r[i + 1] && c[i] <= c[i + 1]) { c[i] = c[i + 1] + 1; ch = true; } } } return c.reduce((a, b) => a + b, 0); }, ['Handle the left neighbour in one pass and the right neighbour in another.'], 'Two independent one-sided constraints combine by taking the maximum.'),
  mk('Shortest Job First', 'shortestJobFirst', 'Jobs all arrive at time 0 with the given burst times. Run them shortest-first and return the floor of the average waiting time.', 'int shortestJobFirst(vector<int>& jobs)', 'return 0;', [
    ap('Sort and accumulate waiting times', 'O(n log n)', 'O(1)', 'nlogn', 'Sorting dominates; each job waits for the sum of the shorter ones, accumulated in one pass.', `int shortestJobFirst(vector<int>& jobs) {
    sort(jobs.begin(), jobs.end());
    long long totalWait = 0;
    long long elapsed = 0;
    for (int i = 0; i < jobs.size(); i++) {
        totalWait += elapsed;
        elapsed += jobs[i];
    }
    return totalWait / jobs.size();
}`)], [[[4, 3, 7, 1, 2]], [[1, 2, 3]], [[5]], [[10, 10]], [[6, 8, 7, 3]]], (j: number[]) => { const s = sortNum(j); let w = 0, e = 0; for (const x of s) { w += e; e += x; } return Math.floor(w / j.length); }, ['Short jobs first minimise the time everyone else waits.'], 'Running the shortest job first minimises the total waiting time.'),
  mk('Page Replacement Algorithms (FIFO)', 'fifoPageFaults', 'Simulate FIFO page replacement with the given number of frames and return the number of page faults.', 'int fifoPageFaults(vector<int>& pages, int frames)', 'return 0;', [
    ap('Queue + set of resident pages', 'O(n)', 'O(frames)', 'n', 'Each page request costs O(1) with a set for membership and a queue for eviction order.', `int fifoPageFaults(vector<int>& pages, int frames) {
    unordered_set<int> inMemory;
    queue<int> order;
    int faults = 0;
    for (int i = 0; i < pages.size(); i++) {
        if (inMemory.count(pages[i])) {
            continue;
        }
        faults++;
        if (inMemory.size() == frames) {
            int victim = order.front();
            order.pop();
            inMemory.erase(victim);
        }
        inMemory.insert(pages[i]);
        order.push(pages[i]);
    }
    return faults;
}`)], [[[7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2], 3], [[1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5], 3], [[1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5], 4], [[1, 1, 1], 1], [[5, 6], 2]], (p: number[], f: number) => { const mem: number[] = []; let c = 0; for (const x of p) if (!mem.includes(x)) { c++; if (mem.length === f) mem.shift(); mem.push(x); } return c; }, ['Evict the page that has been resident the longest.'], 'FIFO ignores how recently a page was used.'),
  mk('Insert Interval', 'insertInterval', 'Insert newInterval into the sorted, non-overlapping list (merging if needed) and return the result.', 'vector<vector<int>> insertInterval(vector<vector<int>>& intervals, vector<int>& newInterval)', 'return {};', [
    ap('Three phases in one pass', 'O(n)', 'O(n)', 'n', 'Copy intervals ending before the new one, merge all overlapping ones, then copy the rest.', `vector<vector<int>> insertInterval(vector<vector<int>>& intervals, vector<int>& newInterval) {
    vector<vector<int>> result;
    int i = 0;
    int n = intervals.size();
    while (i < n && intervals[i][1] < newInterval[0]) {
        result.push_back(intervals[i]);
        i++;
    }
    while (i < n && intervals[i][0] <= newInterval[1]) {
        newInterval[0] = min(newInterval[0], intervals[i][0]);
        newInterval[1] = max(newInterval[1], intervals[i][1]);
        i++;
    }
    result.push_back(newInterval);
    while (i < n) {
        result.push_back(intervals[i]);
        i++;
    }
    return result;
}`)], [[[[1, 3], [6, 9]], [2, 5]], [[[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]], [[], [5, 7]], [[[1, 5]], [2, 3]], [[[1, 5]], [6, 8]]], (iv: number[][], nw: number[]) => { const all = [...iv, nw].sort((a, b) => a[0] - b[0]); const m: number[][] = []; for (const x of all) { if (!m.length || m[m.length - 1][1] < x[0]) m.push([...x]); else m[m.length - 1][1] = Math.max(m[m.length - 1][1], x[1]); } return m; }, ['Intervals entirely before the new one are untouched.'], 'Because the list is sorted, overlapping intervals form one contiguous block.'),
  mk('Merge Intervals', 'mergeAll', 'Merge all overlapping intervals.', 'vector<vector<int>> mergeAll(vector<vector<int>>& intervals)', 'return {};', [
    ap('Sort by start + sweep', 'O(n log n)', 'O(n)', 'nlogn', 'Sorting dominates the single sweep.', `vector<vector<int>> mergeAll(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());
    vector<vector<int>> merged;
    for (int i = 0; i < intervals.size(); i++) {
        if (merged.empty() || merged.back()[1] < intervals[i][0]) {
            merged.push_back(intervals[i]);
        } else {
            merged.back()[1] = max(merged.back()[1], intervals[i][1]);
        }
    }
    return merged;
}`)], [[[[1, 3], [2, 6], [8, 10], [15, 18]]], [[[1, 4], [4, 5]]], [[[1, 4], [0, 2], [3, 5]]], [[[7, 8]]], [[[2, 3], [4, 5], [6, 7]]]], (iv: number[][]) => { const s = [...iv].sort((a, b) => a[0] - b[0] || a[1] - b[1]); const m: number[][] = []; for (const x of s) { if (!m.length || m[m.length - 1][1] < x[0]) m.push([...x]); else m[m.length - 1][1] = Math.max(m[m.length - 1][1], x[1]); } return m; }, ['After sorting by start, compare with the last merged interval.'], 'Sorting makes overlap a local, neighbour-to-neighbour test.'),
  mk('Non-overlapping Intervals', 'eraseOverlapIntervals', 'Return the minimum number of intervals to remove so that the rest do not overlap (touching endpoints are fine).', 'int eraseOverlapIntervals(vector<vector<int>>& intervals)', 'return 0;', [
    ap('Sort by end, keep earliest finishers', 'O(n log n)', 'O(1)', 'nlogn', 'Keeping the interval that ends first maximises the number kept; removed = n − kept.', `int eraseOverlapIntervals(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end(), [](vector<int>& a, vector<int>& b) {
        return a[1] < b[1];
    });
    int kept = 0;
    int lastEnd = INT_MIN;
    for (int i = 0; i < intervals.size(); i++) {
        if (intervals[i][0] >= lastEnd) {
            kept++;
            lastEnd = intervals[i][1];
        }
    }
    return intervals.size() - kept;
}`)], [[[[1, 2], [2, 3], [3, 4], [1, 3]]], [[[1, 2], [1, 2], [1, 2]]], [[[1, 2], [2, 3]]], [[[1, 100], [11, 22], [1, 11], [2, 12]]], [[[5, 6]]]], (iv: number[][]) => { const s = [...iv].sort((a, b) => a[1] - b[1]); let k = 0, e = -Infinity; for (const [a, b] of s) if (a >= e) { k++; e = b; } return iv.length - k; }, ['It is the "N meetings" problem in disguise.'], 'Minimising removals = maximising the intervals you keep.'),
];
