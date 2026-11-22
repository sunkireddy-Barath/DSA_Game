// Stack/queue, heaps, greedy, dynamic programming and graph problems.
import { Playable, ap, mk } from './kit';

const sortNum = (a: number[]) => [...a].sort((x, y) => x - y);

export const ADV_PROBLEMS: Playable[] = [
  // ---------- stack & queue ----------
  mk('Check for Balanced Parentheses', 'isValid', "Return true if every bracket in s ( ) [ ] { } is closed in the right order.", 'bool isValid(string s)', 'return false;', [
    ap('Stack', 'O(n)', 'O(n)', 'n', 'Each character is pushed or popped at most once; the stack can hold all n characters in the worst case.', `bool isValid(string s) {
    stack<char> st;
    for (int i = 0; i < s.size(); i++) {
        char c = s[i];
        if (c == '(' || c == '[' || c == '{') {
            st.push(c);
        } else {
            if (st.empty()) {
                return false;
            }
            char top = st.top();
            st.pop();
            if (c == ')' && top != '(') {
                return false;
            }
            if (c == ']' && top != '[') {
                return false;
            }
            if (c == '}' && top != '{') {
                return false;
            }
        }
    }
    return st.empty();
}`)], [['()'], ['()[]{}'], ['(]'], ['([)]'], ['{[]}'], [')('], ['(('], ['']], (s: string) => { const st: string[] = []; const m: any = { ')': '(', ']': '[', '}': '{' }; for (const c of s) { if ('([{'.includes(c)) st.push(c); else if (st.pop() !== m[c]) return false; } return st.length === 0; },
    ['The most recent opener must be closed first.', 'That is last-in-first-out: a stack.'], 'A closing bracket must match the latest unmatched opening bracket.'),
  mk('Next Greater Element', 'nextGreater', 'For each element return the next greater element to its right, or -1.', 'vector<int> nextGreater(vector<int>& nums)', 'return {};', [
    ap('Brute force', 'O(n²)', 'O(1)', 'n2', 'For every element scan to the right until a bigger value is found.', `vector<int> nextGreater(vector<int>& nums) {
    vector<int> result(nums.size(), -1);
    for (int i = 0; i < nums.size(); i++) {
        for (int j = i + 1; j < nums.size(); j++) {
            if (nums[j] > nums[i]) {
                result[i] = nums[j];
                break;
            }
        }
    }
    return result;
}`),
    ap('Monotonic stack', 'O(n)', 'O(n)', 'n', 'Each index is pushed once and popped once, so 2n stack operations in total.', `vector<int> nextGreater(vector<int>& nums) {
    int n = nums.size();
    vector<int> result(n, -1);
    stack<int> st;
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && st.top() <= nums[i]) {
            st.pop();
        }
        if (!st.empty()) {
            result[i] = st.top();
        }
        st.push(nums[i]);
    }
    return result;
}`)], [[[4, 5, 2, 25]], [[13, 7, 6, 12]], [[1]], [[5, 4, 3, 2, 1]], [[1, 2, 3, 4]]], (a: number[]) => a.map((x, i) => a.slice(i + 1).find(y => y > x) ?? -1),
    ['Scan from the right keeping a stack of candidates.', 'Pop candidates that are not bigger than the current value.'], 'Smaller values behind a bigger one can never be the answer for anything further left.'),
  mk('Next Smaller Element', 'nextSmaller', 'For each element return the next smaller element to its right, or -1.', 'vector<int> nextSmaller(vector<int>& nums)', 'return {};', [
    ap('Monotonic stack', 'O(n)', 'O(n)', 'n', 'Every value is pushed and popped at most once.', `vector<int> nextSmaller(vector<int>& nums) {
    int n = nums.size();
    vector<int> result(n, -1);
    stack<int> st;
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && st.top() >= nums[i]) {
            st.pop();
        }
        if (!st.empty()) {
            result[i] = st.top();
        }
        st.push(nums[i]);
    }
    return result;
}`)], [[[4, 8, 5, 2, 25]], [[1, 2, 3]], [[3, 2, 1]], [[5]]], (a: number[]) => a.map((x, i) => a.slice(i + 1).find(y => y < x) ?? -1),
    ['Mirror image of next greater.'], 'Keep an increasing stack from the right.'),
  mk('Stock Span Problem', 'stockSpan', 'For each day return the number of consecutive days up to and including it with price <= today.', 'vector<int> stockSpan(vector<int>& prices)', 'return {};', [
    ap('Monotonic stack of indices', 'O(n)', 'O(n)', 'n', 'Each index is pushed once and popped once.', `vector<int> stockSpan(vector<int>& prices) {
    int n = prices.size();
    vector<int> span(n, 1);
    stack<int> st;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && prices[st.top()] <= prices[i]) {
            st.pop();
        }
        if (st.empty()) {
            span[i] = i + 1;
        } else {
            span[i] = i - st.top();
        }
        st.push(i);
    }
    return span;
}`)], [[[100, 80, 60, 70, 60, 75, 85]], [[10, 20, 30]], [[30, 20, 10]], [[5]]], (p: number[]) => p.map((x, i) => { let c = 1; for (let j = i - 1; j >= 0 && p[j] <= x; j--) c++; return c; }),
    ['The span ends at the previous strictly greater price.'], 'A stack of indices finds the previous greater element.'),
  mk('Trapping Rainwater', 'trap', 'Given bar heights return how much water is trapped after raining.', 'int trap(vector<int>& height)', 'return 0;', [
    ap('Two pointers', 'O(n)', 'O(1)', 'n', 'The lower side determines the water level, so the pointers move inwards once each: n steps, constant space.', `int trap(vector<int>& height) {
    int left = 0;
    int right = height.size() - 1;
    int leftMax = 0;
    int rightMax = 0;
    int water = 0;
    while (left < right) {
        if (height[left] < height[right]) {
            if (height[left] >= leftMax) {
                leftMax = height[left];
            } else {
                water += leftMax - height[left];
            }
            left++;
        } else {
            if (height[right] >= rightMax) {
                rightMax = height[right];
            } else {
                water += rightMax - height[right];
            }
            right--;
        }
    }
    return water;
}`)], [[[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], [[4, 2, 0, 3, 2, 5]], [[1]], [[3, 0, 3]], [[1, 2, 3]]], (h: number[]) => h.reduce((s, x, i) => s + Math.max(0, Math.min(Math.max(...h.slice(0, i + 1)), Math.max(...h.slice(i))) - x), 0),
    ['Water above a bar = min(left max, right max) - height.', 'Process the side with the smaller wall.'], 'The shorter wall limits the water, so you can finish that side without knowing the other max exactly.'),
  mk('Largest Rectangle in Histogram', 'largestRectangleArea', 'Return the area of the largest rectangle in the histogram.', 'int largestRectangleArea(vector<int>& heights)', 'return 0;', [
    ap('Monotonic stack', 'O(n)', 'O(n)', 'n', 'Each bar is pushed once and popped once; a pop finalises the widest rectangle for that bar.', `int largestRectangleArea(vector<int>& heights) {
    stack<int> st;
    int best = 0;
    int n = heights.size();
    for (int i = 0; i <= n; i++) {
        int current = 0;
        if (i < n) {
            current = heights[i];
        }
        while (!st.empty() && heights[st.top()] > current) {
            int h = heights[st.top()];
            st.pop();
            int left = -1;
            if (!st.empty()) {
                left = st.top();
            }
            best = max(best, h * (i - left - 1));
        }
        st.push(i);
    }
    return best;
}`)], [[[2, 1, 5, 6, 2, 3]], [[2, 4]], [[1]], [[6, 2, 5, 4, 5, 1, 6]], [[3, 3, 3]]], (h: number[]) => { let b = 0; for (let i = 0; i < h.length; i++) { let m = Infinity; for (let j = i; j < h.length; j++) { m = Math.min(m, h[j]); b = Math.max(b, m * (j - i + 1)); } } return b; },
    ['For each bar find how far it can extend left and right.', 'A stack of increasing heights gives both boundaries.'], 'When a shorter bar arrives, taller bars on the stack have found their right edge.'),
  mk('Sliding Window Maximum', 'maxSlidingWindow', 'Return the maximum of every window of size k.', 'vector<int> maxSlidingWindow(vector<int>& nums, int k)', 'return {};', [
    ap('Monotonic deque', 'O(n)', 'O(k)', 'n', 'Every index enters and leaves the deque once; the deque holds at most k indices.', `vector<int> maxSlidingWindow(vector<int>& nums, int k) {
    deque<int> dq;
    vector<int> result;
    for (int i = 0; i < nums.size(); i++) {
        if (!dq.empty() && dq.front() <= i - k) {
            dq.pop_front();
        }
        while (!dq.empty() && nums[dq.back()] <= nums[i]) {
            dq.pop_back();
        }
        dq.push_back(i);
        if (i >= k - 1) {
            result.push_back(nums[dq.front()]);
        }
    }
    return result;
}`)], [[[1, 3, -1, -3, 5, 3, 6, 7], 3], [[1], 1], [[9, 11], 2], [[4, 3, 2, 1], 2], [[1, 2, 3, 4], 4]], (a: number[], k: number) => a.slice(0, a.length - k + 1).map((_, i) => Math.max(...a.slice(i, i + k))),
    ['Keep candidates in decreasing order of value.', 'Drop indices that left the window.'], 'A smaller older element can never be a window maximum again.'),
  mk('Asteroid Collision', 'asteroidCollision', 'Positive = moving right, negative = moving left; equal sizes both explode. Return the survivors.', 'vector<int> asteroidCollision(vector<int>& asteroids)', 'return {};', [
    ap('Stack simulation', 'O(n)', 'O(n)', 'n', 'Each asteroid is pushed once and popped at most once.', `vector<int> asteroidCollision(vector<int>& asteroids) {
    vector<int> st;
    for (int i = 0; i < asteroids.size(); i++) {
        int a = asteroids[i];
        bool alive = true;
        while (alive && a < 0 && st.size() > 0 && st.back() > 0) {
            if (st.back() < -a) {
                st.pop_back();
            } else if (st.back() == -a) {
                st.pop_back();
                alive = false;
            } else {
                alive = false;
            }
        }
        if (alive) {
            st.push_back(a);
        }
    }
    return st;
}`)], [[[5, 10, -5]], [[8, -8]], [[10, 2, -5]], [[-2, -1, 1, 2]], [[1, -2, -2, -2]]], (a: number[]) => { const st: number[] = []; for (let x of a) { let alive = true; while (alive && x < 0 && st.length && st[st.length - 1] > 0) { const t = st[st.length - 1]; if (t < -x) st.pop(); else if (t === -x) { st.pop(); alive = false; } else alive = false; } if (alive) st.push(x); } return st; },
    ['Only a right-mover followed by a left-mover collides.'], 'The stack holds survivors; a new left-mover fights the stack top repeatedly.'),

  // ---------- heaps ----------
  mk('Kth Largest Element in an Array', 'findKthLargest', 'Return the k-th largest element.', 'int findKthLargest(vector<int>& nums, int k)', 'return 0;', [
    ap('Sort', 'O(n log n)', 'O(1)', 'nlogn', 'Sorting dominates; take the element at index n-k.', `int findKthLargest(vector<int>& nums, int k) {
    sort(nums.begin(), nums.end());
    return nums[nums.size() - k];
}`),
    ap('Min-heap of size k', 'O(n log k)', 'O(k)', 'nlogn', 'Each of n elements causes at most one push and one pop on a heap of size k (log k each).', `int findKthLargest(vector<int>& nums, int k) {
    priority_queue<int, vector<int>, greater<int>> pq;
    for (int i = 0; i < nums.size(); i++) {
        pq.push(nums[i]);
        if (pq.size() > k) {
            pq.pop();
        }
    }
    return pq.top();
}`)], [[[3, 2, 1, 5, 6, 4], 2], [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], [[1], 1], [[7, 7, 7], 2]], (a: number[], k: number) => [...a].sort((x, y) => y - x)[k - 1],
    ['A heap of the k largest seen so far keeps its smallest at the top.'], 'The root of a size-k min-heap is the k-th largest.'),
  mk('Kth Smallest Element in an Array', 'findKthSmallest', 'Return the k-th smallest element.', 'int findKthSmallest(vector<int>& nums, int k)', 'return 0;', [
    ap('Max-heap of size k', 'O(n log k)', 'O(k)', 'nlogn', 'Heap operations cost log k, n times.', `int findKthSmallest(vector<int>& nums, int k) {
    priority_queue<int> pq;
    for (int i = 0; i < nums.size(); i++) {
        pq.push(nums[i]);
        if (pq.size() > k) {
            pq.pop();
        }
    }
    return pq.top();
}`)], [[[7, 10, 4, 3, 20, 15], 3], [[1], 1], [[5, 5, 1], 2], [[9, 8, 7, 6], 4]], (a: number[], k: number) => sortNum(a)[k - 1],
    ['Keep a max-heap of the k smallest seen so far.'], 'The root of a size-k max-heap is the k-th smallest.'),
  mk('Connect N Ropes', 'minCostToConnect', 'Cost to join two ropes is the sum of their lengths; return the minimum total cost to join all ropes.', 'int minCostToConnect(vector<int>& ropes)', 'return 0;', [
    ap('Greedy with a min-heap', 'O(n log n)', 'O(n)', 'nlogn', 'n-1 merges, each doing O(log n) heap work.', `int minCostToConnect(vector<int>& ropes) {
    priority_queue<int, vector<int>, greater<int>> pq;
    for (int i = 0; i < ropes.size(); i++) {
        pq.push(ropes[i]);
    }
    int cost = 0;
    while (pq.size() > 1) {
        int a = pq.top();
        pq.pop();
        int b = pq.top();
        pq.pop();
        cost += a + b;
        pq.push(a + b);
    }
    return cost;
}`)], [[[4, 3, 2, 6]], [[1, 2, 3, 4, 5]], [[5]], [[2, 2]]], (r: number[]) => { const a = sortNum(r); let c = 0; while (a.length > 1) { const x = a.shift()! + a.shift()!; c += x; a.push(x); a.sort((p, q) => p - q); } return c; },
    ['Always join the two shortest ropes.'], 'Early merges get re-counted in later merges, so keep them small.'),
  mk('Sort K Sorted Array', 'sortKSorted', 'Each element is at most k positions from its sorted place; sort the array.', 'vector<int> sortKSorted(vector<int>& nums, int k)', 'return {};', [
    ap('Min-heap window', 'O(n log k)', 'O(k)', 'nlogn', 'The smallest remaining element is always among the next k+1, so a heap of k+1 suffices.', `vector<int> sortKSorted(vector<int>& nums, int k) {
    priority_queue<int, vector<int>, greater<int>> pq;
    vector<int> result;
    for (int i = 0; i < nums.size(); i++) {
        pq.push(nums[i]);
        if (pq.size() > k) {
            result.push_back(pq.top());
            pq.pop();
        }
    }
    while (!pq.empty()) {
        result.push_back(pq.top());
        pq.pop();
    }
    return result;
}`)], [[[6, 5, 3, 2, 8, 10, 9], 3], [[1, 2, 3], 1], [[2, 1], 1], [[3, 1, 2], 2]], (a: number[]) => sortNum(a),
    ['The next smallest is within the next k+1 elements.'], 'A bounded heap acts as a sliding sorted window.'),

  // ---------- greedy ----------
  mk('Assign Cookies', 'findContentChildren', 'Children have greed factors g, cookies have sizes s; each child gets at most one cookie of size >= greed. Return the max content children.', 'int findContentChildren(vector<int>& g, vector<int>& s)', 'return 0;', [
    ap('Sort + two pointers', 'O(n log n + m log m)', 'O(1)', 'nlogn', 'Sorting dominates; the matching pass is linear.', `int findContentChildren(vector<int>& g, vector<int>& s) {
    sort(g.begin(), g.end());
    sort(s.begin(), s.end());
    int child = 0;
    for (int cookie = 0; cookie < s.size() && child < g.size(); cookie++) {
        if (s[cookie] >= g[child]) {
            child++;
        }
    }
    return child;
}`)], [[[1, 2, 3], [1, 1]], [[1, 2], [1, 2, 3]], [[5], [1]], [[1, 1, 1], [3]]], (g: number[], s: number[]) => { const a = sortNum(g), b = sortNum(s); let c = 0; for (const x of b) if (c < a.length && x >= a[c]) c++; return c; },
    ['Give the smallest sufficient cookie to the least greedy child.'], 'Greedy: never waste a big cookie on a small appetite.'),
  mk('Lemonade Change', 'lemonadeChange', 'Customers pay 5, 10 or 20 for a 5 lemonade; return true if you can give correct change to everyone.', 'bool lemonadeChange(vector<int>& bills)', 'return false;', [
    ap('Greedy counters', 'O(n)', 'O(1)', 'n', 'One pass with two counters.', `bool lemonadeChange(vector<int>& bills) {
    int fives = 0;
    int tens = 0;
    for (int i = 0; i < bills.size(); i++) {
        if (bills[i] == 5) {
            fives++;
        } else if (bills[i] == 10) {
            if (fives == 0) {
                return false;
            }
            fives--;
            tens++;
        } else {
            if (tens > 0 && fives > 0) {
                tens--;
                fives--;
            } else if (fives >= 3) {
                fives -= 3;
            } else {
                return false;
            }
        }
    }
    return true;
}`)], [[[5, 5, 5, 10, 20]], [[5, 5, 10, 10, 20]], [[10]], [[5, 5, 10, 20, 5, 5, 5, 5, 5, 5, 5, 5, 5, 10, 5, 5, 20, 5, 20, 5]]], (b: number[]) => { let f = 0, t = 0; for (const x of b) { if (x === 5) f++; else if (x === 10) { if (!f) return false; f--; t++; } else if (t && f) { t--; f--; } else if (f >= 3) f -= 3; else return false; } return true; },
    ['For a 20, prefer giving a 10 and a 5.'], 'Keep the more flexible 5s for last.'),
  mk('Jump Game', 'canJump', 'nums[i] is the max jump length from i; return true if you can reach the last index.', 'bool canJump(vector<int>& nums)', 'return false;', [
    ap('Greedy farthest reach', 'O(n)', 'O(1)', 'n', 'One pass tracking the farthest reachable index.', `bool canJump(vector<int>& nums) {
    int farthest = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (i > farthest) {
            return false;
        }
        farthest = max(farthest, i + nums[i]);
    }
    return true;
}`)], [[[2, 3, 1, 1, 4]], [[3, 2, 1, 0, 4]], [[0]], [[2, 0, 0]], [[1, 1, 0, 1]]], (a: number[]) => { let f = 0; for (let i = 0; i < a.length; i++) { if (i > f) return false; f = Math.max(f, i + a[i]); } return true; },
    ['You only need the farthest index you can reach.'], 'If you can stand at i, you can stand anywhere before the farthest reach.'),
  mk('Jump Game II', 'jump', 'Return the minimum number of jumps to reach the last index (reachable guaranteed).', 'int jump(vector<int>& nums)', 'return 0;', [
    ap('Greedy BFS levels', 'O(n)', 'O(1)', 'n', 'Each index is visited once as the current "level" boundary advances.', `int jump(vector<int>& nums) {
    int jumps = 0;
    int currentEnd = 0;
    int farthest = 0;
    for (int i = 0; i < nums.size() - 1; i++) {
        farthest = max(farthest, i + nums[i]);
        if (i == currentEnd) {
            jumps++;
            currentEnd = farthest;
        }
    }
    return jumps;
}`)], [[[2, 3, 1, 1, 4]], [[2, 3, 0, 1, 4]], [[1]], [[1, 1, 1, 1]], [[5, 1, 1, 1, 1]]], (a: number[]) => { let j = 0, e = 0, f = 0; for (let i = 0; i < a.length - 1; i++) { f = Math.max(f, i + a[i]); if (i === e) { j++; e = f; } } return j; },
    ['Think in levels: everything reachable with k jumps.'], 'Each jump extends the frontier to the farthest reachable index.'),

  // ---------- dynamic programming ----------
  mk('Frog Jump', 'frogJump', 'A frog on stone 0 jumps to i+1 or i+2 paying |h[i]-h[j]|. Return the minimum energy to reach the last stone.', 'int frogJump(vector<int>& heights)', 'return 0;', [
    ap('Tabulation', 'O(n)', 'O(n)', 'n', 'dp[i] is computed once from dp[i-1] and dp[i-2].', `int frogJump(vector<int>& heights) {
    int n = heights.size();
    vector<int> dp(n, 0);
    for (int i = 1; i < n; i++) {
        int one = dp[i - 1] + abs(heights[i] - heights[i - 1]);
        int two = INT_MAX;
        if (i > 1) {
            two = dp[i - 2] + abs(heights[i] - heights[i - 2]);
        }
        dp[i] = min(one, two);
    }
    return dp[n - 1];
}`)], [[[10, 20, 30, 10]], [[10, 50, 10]], [[7]], [[30, 10, 60, 10, 60, 50]]], (h: number[]) => { const dp = [0]; for (let i = 1; i < h.length; i++) dp[i] = Math.min(dp[i - 1] + Math.abs(h[i] - h[i - 1]), i > 1 ? dp[i - 2] + Math.abs(h[i] - h[i - 2]) : Infinity); return dp[h.length - 1]; },
    ['The best cost to stone i depends on stones i-1 and i-2.'], 'Same shape as climbing stairs with a cost.'),
  mk('House Robber', 'rob', 'You cannot rob two adjacent houses; return the maximum money.', 'int rob(vector<int>& nums)', 'return 0;', [
    ap('Tabulation', 'O(n)', 'O(n)', 'n', 'dp[i] = max(skip house i, rob house i) is O(1) per house.', `int rob(vector<int>& nums) {
    int n = nums.size();
    if (n == 1) {
        return nums[0];
    }
    vector<int> dp(n, 0);
    dp[0] = nums[0];
    dp[1] = max(nums[0], nums[1]);
    for (int i = 2; i < n; i++) {
        dp[i] = max(dp[i - 1], dp[i - 2] + nums[i]);
    }
    return dp[n - 1];
}`),
    ap('Space optimised', 'O(n)', 'O(1)', 'n', 'Only the last two dp values are needed.', `int rob(vector<int>& nums) {
    int prev2 = 0;
    int prev1 = 0;
    for (int i = 0; i < nums.size(); i++) {
        int take = prev2 + nums[i];
        int skip = prev1;
        int current = max(take, skip);
        prev2 = prev1;
        prev1 = current;
    }
    return prev1;
}`)], [[[1, 2, 3, 1]], [[2, 7, 9, 3, 1]], [[5]], [[2, 1, 1, 2]], [[4, 1]]], (a: number[]) => { const dp: number[] = []; a.forEach((x, i) => { dp[i] = Math.max(i > 0 ? dp[i - 1] : 0, (i > 1 ? dp[i - 2] : 0) + x); }); return dp[a.length - 1]; },
    ['At each house: rob it (plus best from two back) or skip it.'], 'Choose between taking house i and the best of i-2, or skipping it.'),
  mk('Grid Unique Paths', 'uniquePaths', 'A robot moves only right or down in an m x n grid; return the number of paths from top-left to bottom-right.', 'int uniquePaths(int m, int n)', 'return 0;', [
    ap('2D DP', 'O(m·n)', 'O(m·n)', 'n2', 'Every cell is filled once from its top and left neighbours.', `int uniquePaths(int m, int n) {
    vector<vector<int>> dp(m, vector<int>(n, 1));
    for (int i = 1; i < m; i++) {
        for (int j = 1; j < n; j++) {
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
        }
    }
    return dp[m - 1][n - 1];
}`)], [[3, 7], [3, 2], [1, 1], [3, 3], [4, 4]], (m: number, n: number) => { const d = Array.from({ length: m }, () => Array(n).fill(1)); for (let i = 1; i < m; i++) for (let j = 1; j < n; j++) d[i][j] = d[i - 1][j] + d[i][j - 1]; return d[m - 1][n - 1]; },
    ['You arrive from above or from the left.'], 'paths(i, j) = paths(i-1, j) + paths(i, j-1).'),
  mk('Minimum Path Sum', 'minPathSum', 'Grid of non-negative numbers; move right/down from top-left to bottom-right; return the minimum path sum.', 'int minPathSum(vector<vector<int>>& grid)', 'return 0;', [
    ap('2D DP', 'O(m·n)', 'O(m·n)', 'n2', 'Each cell takes the cheaper of two neighbours: O(1) per cell.', `int minPathSum(vector<vector<int>>& grid) {
    int m = grid.size();
    int n = grid[0].size();
    vector<vector<int>> dp(m, vector<int>(n, 0));
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (i == 0 && j == 0) {
                dp[i][j] = grid[i][j];
            } else if (i == 0) {
                dp[i][j] = dp[i][j - 1] + grid[i][j];
            } else if (j == 0) {
                dp[i][j] = dp[i - 1][j] + grid[i][j];
            } else {
                dp[i][j] = min(dp[i - 1][j], dp[i][j - 1]) + grid[i][j];
            }
        }
    }
    return dp[m - 1][n - 1];
}`)], [[[[1, 3, 1], [1, 5, 1], [4, 2, 1]]], [[[1, 2, 3], [4, 5, 6]]], [[[5]]], [[[1, 2], [1, 1]]]], (g: number[][]) => { const m = g.length, n = g[0].length; const d = g.map(r => r.map(() => 0)); for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) d[i][j] = g[i][j] + (i || j ? Math.min(i ? d[i - 1][j] : Infinity, j ? d[i][j - 1] : Infinity) : 0); return d[m - 1][n - 1]; },
    ['Arrive from above or left, whichever is cheaper.'], 'dp[i][j] = grid[i][j] + min(up, left).'),
  mk('Subset Sum Equals to Target', 'subsetSum', 'Return true if some subset of nums sums to target.', 'bool subsetSum(vector<int>& nums, int target)', 'return false;', [
    ap('2D DP', 'O(n·target)', 'O(n·target)', 'n2', 'dp[i][s] says whether sum s is reachable using the first i numbers; each cell is O(1).', `bool subsetSum(vector<int>& nums, int target) {
    int n = nums.size();
    vector<vector<int>> dp(n + 1, vector<int>(target + 1, 0));
    for (int i = 0; i <= n; i++) {
        dp[i][0] = 1;
    }
    for (int i = 1; i <= n; i++) {
        for (int s = 1; s <= target; s++) {
            dp[i][s] = dp[i - 1][s];
            if (nums[i - 1] <= s && dp[i - 1][s - nums[i - 1]] == 1) {
                dp[i][s] = 1;
            }
        }
    }
    return dp[n][target] == 1;
}`)], [[[3, 34, 4, 12, 5, 2], 9], [[3, 34, 4, 12, 5, 2], 30], [[1], 1], [[2, 4], 5], [[1, 2, 3], 0]], (a: number[], t: number) => { for (let m = 0; m < 1 << a.length; m++) { let s = 0; for (let i = 0; i < a.length; i++) if (m >> i & 1) s += a[i]; if (s === t) return true; } return false; },
    ['For each number: leave it, or take it and look at the smaller target.'], 'Reachability of a sum builds on reachability of smaller sums.'),
  mk('Minimum Coins', 'coinChange', 'Return the fewest coins needed to make amount (unlimited coins), or -1.', 'int coinChange(vector<int>& coins, int amount)', 'return -1;', [
    ap('1D DP', 'O(amount·n)', 'O(amount)', 'n2', 'Each of amount+1 states tries every coin.', `int coinChange(vector<int>& coins, int amount) {
    vector<int> dp(amount + 1, amount + 1);
    dp[0] = 0;
    for (int a = 1; a <= amount; a++) {
        for (int i = 0; i < coins.size(); i++) {
            if (coins[i] <= a) {
                dp[a] = min(dp[a], dp[a - coins[i]] + 1);
            }
        }
    }
    if (dp[amount] > amount) {
        return -1;
    }
    return dp[amount];
}`)], [[[1, 2, 5], 11], [[2], 3], [[1], 0], [[2, 5, 10, 1], 27], [[5, 7], 3]], (c: number[], a: number) => { const d = Array(a + 1).fill(Infinity); d[0] = 0; for (let x = 1; x <= a; x++) for (const k of c) if (k <= x) d[x] = Math.min(d[x], d[x - k] + 1); return d[a] === Infinity ? -1 : d[a]; },
    ['dp[a] = 1 + min over coins of dp[a - coin].'], 'The best way to make a is one coin plus the best way to make the remainder.'),
  mk('Coin Change II', 'change', 'Return the number of combinations that make up amount (unlimited coins).', 'int change(int amount, vector<int>& coins)', 'return 0;', [
    ap('1D DP over coins', 'O(amount·n)', 'O(amount)', 'n2', 'Looping coins in the outer loop counts combinations (not permutations).', `int change(int amount, vector<int>& coins) {
    vector<int> dp(amount + 1, 0);
    dp[0] = 1;
    for (int i = 0; i < coins.size(); i++) {
        for (int a = coins[i]; a <= amount; a++) {
            dp[a] += dp[a - coins[i]];
        }
    }
    return dp[amount];
}`)], [[5, [1, 2, 5]], [3, [2]], [10, [10]], [4, [1, 2, 3]], [0, [7]]], (a: number, c: number[]) => { const d = Array(a + 1).fill(0); d[0] = 1; for (const k of c) for (let x = k; x <= a; x++) d[x] += d[x - k]; return d[a]; },
    ['Process one coin type at a time so order does not matter.'], 'Outer loop over coins counts each multiset once.'),
  mk('Edit Distance', 'minDistance', 'Return the minimum insert/delete/replace operations to convert a into b.', 'int minDistance(string a, string b)', 'return 0;', [
    ap('2D DP', 'O(n·m)', 'O(n·m)', 'n2', 'Each of (n+1)(m+1) cells uses three neighbours.', `int minDistance(string a, string b) {
    int n = a.size();
    int m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 0; i <= n; i++) {
        dp[i][0] = i;
    }
    for (int j = 0; j <= m; j++) {
        dp[0][j] = j;
    }
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + min(dp[i - 1][j - 1], min(dp[i - 1][j], dp[i][j - 1]));
            }
        }
    }
    return dp[n][m];
}`)], [['horse', 'ros'], ['intention', 'execution'], ['', 'a'], ['abc', 'abc'], ['kitten', 'sitting']], (a: string, b: string) => { const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))); for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] : 1 + Math.min(d[i - 1][j - 1], d[i - 1][j], d[i][j - 1]); return d[a.length][b.length]; },
    ['Compare the last characters.', 'Replace, delete or insert: three neighbouring cells.'], 'Each cell is the cheapest of the three edit operations from a smaller subproblem.'),
  mk('Longest Increasing Subsequence', 'lengthOfLIS', 'Return the length of the longest strictly increasing subsequence.', 'int lengthOfLIS(vector<int>& nums)', 'return 0;', [
    ap('O(n²) DP', 'O(n²)', 'O(n)', 'n2', 'dp[i] looks at all j < i: n(n-1)/2 comparisons.', `int lengthOfLIS(vector<int>& nums) {
    int n = nums.size();
    vector<int> dp(n, 1);
    int best = 1;
    for (int i = 1; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) {
                dp[i] = max(dp[i], dp[j] + 1);
            }
        }
        best = max(best, dp[i]);
    }
    return best;
}`),
    ap('Binary search (patience)', 'O(n log n)', 'O(n)', 'nlogn', 'tails[] stays sorted; each element is placed with a binary search of log n steps.', `int lengthOfLIS(vector<int>& nums) {
    vector<int> tails;
    for (int i = 0; i < nums.size(); i++) {
        int low = 0;
        int high = tails.size();
        while (low < high) {
            int mid = low + (high - low) / 2;
            if (tails[mid] < nums[i]) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        if (low == tails.size()) {
            tails.push_back(nums[i]);
        } else {
            tails[low] = nums[i];
        }
    }
    return tails.size();
}`)], [[[10, 9, 2, 5, 3, 7, 101, 18]], [[0, 1, 0, 3, 2, 3]], [[7, 7, 7]], [[1]], [[1, 2, 3, 4]]], (a: number[]) => { const d = a.map(() => 1); for (let i = 0; i < a.length; i++) for (let j = 0; j < i; j++) if (a[j] < a[i]) d[i] = Math.max(d[i], d[j] + 1); return Math.max(...d); },
    ['dp[i] = best LIS ending exactly at i.'], 'Extend the best earlier subsequence whose last value is smaller.'),
  mk('Longest Palindromic Subsequence', 'longestPalindromeSubseq', 'Return the length of the longest palindromic subsequence of s.', 'int longestPalindromeSubseq(string s)', 'return 0;', [
    ap('Interval DP', 'O(n²)', 'O(n²)', 'n2', 'dp[i][j] depends on cells inside the interval: n² cells.', `int longestPalindromeSubseq(string s) {
    int n = s.size();
    vector<vector<int>> dp(n, vector<int>(n, 0));
    for (int i = n - 1; i >= 0; i--) {
        dp[i][i] = 1;
        for (int j = i + 1; j < n; j++) {
            if (s[i] == s[j]) {
                dp[i][j] = dp[i + 1][j - 1] + 2;
            } else {
                dp[i][j] = max(dp[i + 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[0][n - 1];
}`)], [['bbbab'], ['cbbd'], ['a'], ['abcba'], ['abcd']], (s: string) => { const n = s.length; const d = Array.from({ length: n }, () => Array(n).fill(0)); for (let i = n - 1; i >= 0; i--) { d[i][i] = 1; for (let j = i + 1; j < n; j++) d[i][j] = s[i] === s[j] ? (i + 1 <= j - 1 ? d[i + 1][j - 1] : 0) + 2 : Math.max(d[i + 1][j], d[i][j - 1]); } return d[0][n - 1]; },
    ['If the ends match, they wrap a smaller palindrome.'], 'Shrink the interval from both ends.'),
  mk('Unbounded Knapsack', 'unboundedKnapsack', 'Items can be used any number of times; maximise value within capacity W.', 'int unboundedKnapsack(vector<int>& wt, vector<int>& val, int W)', 'return 0;', [
    ap('1D DP', 'O(n·W)', 'O(W)', 'n2', 'Each capacity tries each item once.', `int unboundedKnapsack(vector<int>& wt, vector<int>& val, int W) {
    vector<int> dp(W + 1, 0);
    for (int w = 1; w <= W; w++) {
        for (int i = 0; i < wt.size(); i++) {
            if (wt[i] <= w) {
                dp[w] = max(dp[w], dp[w - wt[i]] + val[i]);
            }
        }
    }
    return dp[W];
}`)], [[[2, 4, 6], [5, 11, 13], 10], [[1, 50], [1, 30], 100], [[5], [10], 4], [[3, 4], [4, 5], 7]], (wt: number[], val: number[], W: number) => { const d = Array(W + 1).fill(0); for (let w = 1; w <= W; w++) wt.forEach((x, i) => { if (x <= w) d[w] = Math.max(d[w], d[w - x] + val[i]); }); return d[W]; },
    ['Because items repeat, dp[w] can use dp[w - weight] directly.'], 'The remaining capacity subproblem may use the same item again.'),
  mk('Rod Cutting Problem', 'cutRod', 'price[i] is the price of a rod of length i+1; return the max revenue for a rod of length n.', 'int cutRod(vector<int>& price, int n)', 'return 0;', [
    ap('1D DP', 'O(n²)', 'O(n)', 'n2', 'For each length try every first cut.', `int cutRod(vector<int>& price, int n) {
    vector<int> dp(n + 1, 0);
    for (int len = 1; len <= n; len++) {
        for (int cut = 1; cut <= len; cut++) {
            dp[len] = max(dp[len], price[cut - 1] + dp[len - cut]);
        }
    }
    return dp[n];
}`)], [[[1, 5, 8, 9, 10, 17, 17, 20], 8], [[3, 5, 8, 9, 10, 17, 17, 20], 8], [[2], 1], [[1, 5, 8, 9], 4]], (p: number[], n: number) => { const d = Array(n + 1).fill(0); for (let l = 1; l <= n; l++) for (let c = 1; c <= l; c++) d[l] = Math.max(d[l], p[c - 1] + d[l - c]); return d[n]; },
    ['Try every length for the first piece.'], 'Revenue(len) = best of price(cut) + revenue(len - cut).'),
  mk('Buy and Sell Stock II', 'maxProfitII', 'You may trade many times (one share at a time); return the maximum profit.', 'int maxProfitII(vector<int>& prices)', 'return 0;', [
    ap('Sum of upward moves', 'O(n)', 'O(1)', 'n', 'Every rising day-to-day step is profit you can capture; one pass.', `int maxProfitII(vector<int>& prices) {
    int profit = 0;
    for (int i = 1; i < prices.size(); i++) {
        if (prices[i] > prices[i - 1]) {
            profit += prices[i] - prices[i - 1];
        }
    }
    return profit;
}`)], [[[7, 1, 5, 3, 6, 4]], [[1, 2, 3, 4, 5]], [[7, 6, 4, 3, 1]], [[1]]], (p: number[]) => { let s = 0; for (let i = 1; i < p.length; i++) s += Math.max(0, p[i] - p[i - 1]); return s; },
    ['Every increase between consecutive days can be captured.'], 'A long rise equals the sum of its daily rises.'),
  mk('Longest Common Substring', 'longestCommonSubstring', 'Return the length of the longest common contiguous substring.', 'int longestCommonSubstring(string a, string b)', 'return 0;', [
    ap('2D DP', 'O(n·m)', 'O(n·m)', 'n2', 'dp[i][j] extends the diagonal only when characters match, else resets to 0.', `int longestCommonSubstring(string a, string b) {
    int n = a.size();
    int m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    int best = 0;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                best = max(best, dp[i][j]);
            }
        }
    }
    return best;
}`)], [['abcdxyz', 'xyzabcd'], ['abc', 'def'], ['zxabcdezy', 'yzabcdezx'], ['a', 'a']], (a: string, b: string) => { let best = 0; for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) { let k = 0; while (i + k < a.length && j + k < b.length && a[i + k] === b[j + k]) k++; best = Math.max(best, k); } return best; },
    ['Like LCS, but a mismatch resets the run to 0.'], 'The table cell is the length of the common suffix ending there.'),

  // ---------- graphs ----------
  mk('Breadth-First Search (BFS)', 'bfs', 'Given an adjacency list, return the BFS order starting at node 0.', 'vector<int> bfs(vector<vector<int>>& adj)', 'return {};', [
    ap('Queue + visited', 'O(V+E)', 'O(V)', 'n', 'Every vertex is enqueued once and every edge examined once (twice if undirected).', `vector<int> bfs(vector<vector<int>>& adj) {
    int n = adj.size();
    vector<int> visited(n, 0);
    vector<int> order;
    queue<int> q;
    q.push(0);
    visited[0] = 1;
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        order.push_back(node);
        for (int i = 0; i < adj[node].size(); i++) {
            int next = adj[node][i];
            if (visited[next] == 0) {
                visited[next] = 1;
                q.push(next);
            }
        }
    }
    return order;
}`)], [[[[1, 2], [0, 3], [0, 3], [1, 2]]], [[[1], [0, 2], [1]]], [[[]]], [[[1, 2, 3], [0], [0], [0]]]], (adj: number[][]) => { const v = new Set([0]), o: number[] = [], q = [0]; while (q.length) { const x = q.shift()!; o.push(x); for (const y of adj[x]) if (!v.has(y)) { v.add(y); q.push(y); } } return o; },
    ['Mark nodes when you enqueue them, not when you dequeue.'], 'A queue explores nodes in order of distance from the source.'),
  mk('Depth-First Search (DFS)', 'dfsOrder', 'Given an adjacency list, return the DFS preorder starting at node 0.', 'vector<int> dfsOrder(vector<vector<int>>& adj)', 'return {};', [
    ap('Recursive DFS', 'O(V+E)', 'O(V)', 'n', 'Each vertex is visited once and each edge examined once; the recursion stack can reach depth V.', `void dfs(int node, vector<vector<int>>& adj, vector<int>& visited, vector<int>& order) {
    visited[node] = 1;
    order.push_back(node);
    for (int i = 0; i < adj[node].size(); i++) {
        int next = adj[node][i];
        if (visited[next] == 0) {
            dfs(next, adj, visited, order);
        }
    }
}

vector<int> dfsOrder(vector<vector<int>>& adj) {
    vector<int> visited(adj.size(), 0);
    vector<int> order;
    dfs(0, adj, visited, order);
    return order;
}`)], [[[[1, 2], [0, 3], [0, 3], [1, 2]]], [[[1], [0, 2], [1]]], [[[]]], [[[1, 2, 3], [0], [0], [0]]]], (adj: number[][]) => { const v = new Set<number>(), o: number[] = []; const g = (x: number) => { v.add(x); o.push(x); for (const y of adj[x]) if (!v.has(y)) g(y); }; g(0); return o; },
    ['Go as deep as possible before backtracking.'], 'The call stack remembers where to resume exploring.'),
  mk('Number of Provinces', 'findCircleNum', 'isConnected[i][j] = 1 means cities i and j are directly connected; return the number of provinces (connected groups).', 'int findCircleNum(vector<vector<int>>& isConnected)', 'return 0;', [
    ap('DFS over components', 'O(V²)', 'O(V)', 'n2', 'The adjacency matrix is scanned once per visited vertex: V² cell reads.', `void explore(int city, vector<vector<int>>& g, vector<int>& visited) {
    visited[city] = 1;
    for (int next = 0; next < g.size(); next++) {
        if (g[city][next] == 1 && visited[next] == 0) {
            explore(next, g, visited);
        }
    }
}

int findCircleNum(vector<vector<int>>& isConnected) {
    int n = isConnected.size();
    vector<int> visited(n, 0);
    int provinces = 0;
    for (int city = 0; city < n; city++) {
        if (visited[city] == 0) {
            provinces++;
            explore(city, isConnected, visited);
        }
    }
    return provinces;
}`)], [[[[1, 1, 0], [1, 1, 0], [0, 0, 1]]], [[[1, 0, 0], [0, 1, 0], [0, 0, 1]]], [[[1]]], [[[1, 1, 1], [1, 1, 1], [1, 1, 1]]]], (g: number[][]) => { const v = new Set<number>(); let c = 0; const f = (x: number) => { v.add(x); g[x].forEach((e, y) => { if (e && !v.has(y)) f(y); }); }; for (let i = 0; i < g.length; i++) if (!v.has(i)) { c++; f(i); } return c; },
    ['Each time you start a fresh DFS from an unvisited city you found a new province.'], 'Count how many times the outer loop has to start a new traversal.'),
  mk('Number of Islands', 'numIslands', "Grid of '1' (land) and '0' (water) given as 1/0 numbers; return the number of islands (4-directional).", 'int numIslands(vector<vector<int>>& grid)', 'return 0;', [
    ap('DFS flood fill', 'O(m·n)', 'O(m·n)', 'n2', 'Every cell is visited once; the recursion can be m·n deep on a snake-shaped island.', `void sink(int r, int c, vector<vector<int>>& grid) {
    if (r < 0 || c < 0 || r >= grid.size() || c >= grid[0].size() || grid[r][c] == 0) {
        return;
    }
    grid[r][c] = 0;
    sink(r + 1, c, grid);
    sink(r - 1, c, grid);
    sink(r, c + 1, grid);
    sink(r, c - 1, grid);
}

int numIslands(vector<vector<int>>& grid) {
    int count = 0;
    for (int r = 0; r < grid.size(); r++) {
        for (int c = 0; c < grid[0].size(); c++) {
            if (grid[r][c] == 1) {
                count++;
                sink(r, c, grid);
            }
        }
    }
    return count;
}`)], [[[[1, 1, 0, 0], [1, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]], [[[1, 1, 1], [0, 1, 0], [1, 1, 1]]], [[[0]]], [[[1, 0, 1], [0, 1, 0], [1, 0, 1]]]], (g: number[][]) => { const m = g.map(r => [...r]); let c = 0; const f = (r: number, k: number) => { if (r < 0 || k < 0 || r >= m.length || k >= m[0].length || !m[r][k]) return; m[r][k] = 0; f(r + 1, k); f(r - 1, k); f(r, k + 1); f(r, k - 1); }; for (let i = 0; i < m.length; i++) for (let j = 0; j < m[0].length; j++) if (m[i][j]) { c++; f(i, j); } return c; },
    ['When you find land, sink the whole island so it is not counted again.'], 'Flood-fill each island once.'),
  mk('Flood Fill', 'floodFill', 'Replace the connected region (4-directional) of the start cell\'s colour with newColor and return the image.', 'vector<vector<int>> floodFill(vector<vector<int>>& image, int sr, int sc, int newColor)', 'return image;', [
    ap('DFS', 'O(m·n)', 'O(m·n)', 'n2', 'Each cell is changed at most once.', `void fill(vector<vector<int>>& image, int r, int c, int oldColor, int newColor) {
    if (r < 0 || c < 0 || r >= image.size() || c >= image[0].size() || image[r][c] != oldColor) {
        return;
    }
    image[r][c] = newColor;
    fill(image, r + 1, c, oldColor, newColor);
    fill(image, r - 1, c, oldColor, newColor);
    fill(image, r, c + 1, oldColor, newColor);
    fill(image, r, c - 1, oldColor, newColor);
}

vector<vector<int>> floodFill(vector<vector<int>>& image, int sr, int sc, int newColor) {
    int oldColor = image[sr][sc];
    if (oldColor != newColor) {
        fill(image, sr, sc, oldColor, newColor);
    }
    return image;
}`)], [[[[1, 1, 1], [1, 1, 0], [1, 0, 1]], 1, 1, 2], [[[0, 0, 0], [0, 0, 0]], 0, 0, 0], [[[1, 2], [2, 2]], 0, 1, 5]], (img: number[][], sr: number, sc: number, nc: number) => { const m = img.map(r => [...r]); const old = m[sr][sc]; const f = (r: number, c: number) => { if (r < 0 || c < 0 || r >= m.length || c >= m[0].length || m[r][c] !== old) return; m[r][c] = nc; f(r + 1, c); f(r - 1, c); f(r, c + 1); f(r, c - 1); }; if (old !== nc) f(sr, sc); return m; },
    ['Remember the starting colour.', 'If it already equals the new colour, do nothing.'], 'Recolouring marks cells as visited, so no extra visited array is needed.'),
  mk('Cycle Detection in Undirected Graph (DFS)', 'hasCycleUndirected', 'Return true if the undirected graph (adjacency list) contains a cycle.', 'bool hasCycleUndirected(vector<vector<int>>& adj)', 'return false;', [
    ap('DFS with parent', 'O(V+E)', 'O(V)', 'n', 'Each vertex and edge is processed once; a visited neighbour that is not the parent closes a cycle.', `bool dfs(int node, int parent, vector<vector<int>>& adj, vector<int>& visited) {
    visited[node] = 1;
    for (int i = 0; i < adj[node].size(); i++) {
        int next = adj[node][i];
        if (visited[next] == 0) {
            if (dfs(next, node, adj, visited)) {
                return true;
            }
        } else if (next != parent) {
            return true;
        }
    }
    return false;
}

bool hasCycleUndirected(vector<vector<int>>& adj) {
    vector<int> visited(adj.size(), 0);
    for (int i = 0; i < adj.size(); i++) {
        if (visited[i] == 0 && dfs(i, -1, adj, visited)) {
            return true;
        }
    }
    return false;
}`)], [[[[1, 2], [0, 2], [0, 1]]], [[[1], [0, 2], [1]]], [[[1], [0], [3], [2]]], [[[1, 3], [0, 2], [1, 3], [0, 2]]]], (adj: number[][]) => { const n = adj.length; const p = [...Array(n).keys()]; const f = (x: number): number => (p[x] === x ? x : (p[x] = f(p[x]))); for (let u = 0; u < n; u++) for (const v of adj[u]) if (u < v) { if (f(u) === f(v)) return true; p[f(u)] = f(v); } return false; },
    ['Seeing an already-visited neighbour that is not your parent means a cycle.'], 'In a tree-like traversal the only visited neighbour is the parent.'),
  mk('Bipartite Graph', 'isBipartite', 'Return true if the graph can be 2-coloured so no edge joins same-coloured nodes.', 'bool isBipartite(vector<vector<int>>& adj)', 'return false;', [
    ap('BFS colouring', 'O(V+E)', 'O(V)', 'n', 'Each vertex is coloured once and each edge checked once.', `bool isBipartite(vector<vector<int>>& adj) {
    int n = adj.size();
    vector<int> color(n, -1);
    for (int start = 0; start < n; start++) {
        if (color[start] != -1) {
            continue;
        }
        color[start] = 0;
        queue<int> q;
        q.push(start);
        while (!q.empty()) {
            int node = q.front();
            q.pop();
            for (int i = 0; i < adj[node].size(); i++) {
                int next = adj[node][i];
                if (color[next] == -1) {
                    color[next] = 1 - color[node];
                    q.push(next);
                } else if (color[next] == color[node]) {
                    return false;
                }
            }
        }
    }
    return true;
}`)], [[[[1, 3], [0, 2], [1, 3], [0, 2]]], [[[1, 2], [0, 2], [0, 1]]], [[[1], [0]]], [[[]]], [[[1, 2, 3], [0, 2], [0, 1, 3], [0, 2]]]], (adj: number[][]) => { const c = adj.map(() => -1); for (let s = 0; s < adj.length; s++) { if (c[s] !== -1) continue; c[s] = 0; const q = [s]; while (q.length) { const x = q.shift()!; for (const y of adj[x]) { if (c[y] === -1) { c[y] = 1 - c[x]; q.push(y); } else if (c[y] === c[x]) return false; } } } return true; },
    ['Alternate colours along every edge.', 'A same-coloured edge means an odd cycle.'], 'A graph is bipartite iff it has no odd cycle.'),
  mk("Kahn's Algorithm (BFS Topological Sort)", 'topoSort', 'Return a topological order of a DAG given as an adjacency list (use the smallest-index-first queue order produced by the algorithm).', 'vector<int> topoSort(vector<vector<int>>& adj)', 'return {};', [
    ap("Kahn's algorithm", 'O(V+E)', 'O(V)', 'n', 'In-degrees are computed in O(V+E); each vertex is dequeued once and each edge relaxed once.', `vector<int> topoSort(vector<vector<int>>& adj) {
    int n = adj.size();
    vector<int> indegree(n, 0);
    for (int u = 0; u < n; u++) {
        for (int i = 0; i < adj[u].size(); i++) {
            indegree[adj[u][i]]++;
        }
    }
    queue<int> q;
    for (int u = 0; u < n; u++) {
        if (indegree[u] == 0) {
            q.push(u);
        }
    }
    vector<int> order;
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        order.push_back(node);
        for (int i = 0; i < adj[node].size(); i++) {
            int next = adj[node][i];
            indegree[next]--;
            if (indegree[next] == 0) {
                q.push(next);
            }
        }
    }
    return order;
}`)], [[[[1, 2], [3], [3], []]], [[[], [0], [0]]], [[[1], [2], []]], [[[2], [2], [3], []]]], (adj: number[][]) => { const n = adj.length, d = Array(n).fill(0); adj.forEach(a => a.forEach(v => d[v]++)); const q: number[] = []; d.forEach((x, i) => { if (!x) q.push(i); }); const o: number[] = []; while (q.length) { const x = q.shift()!; o.push(x); for (const y of adj[x]) if (!--d[y]) q.push(y); } return o; },
    ['Nodes with no incoming edges can go first.', 'Removing a node lowers the in-degree of its neighbours.'], 'Repeatedly peel off nodes that have no remaining prerequisites.'),
  mk('Course Schedule I', 'canFinish', 'Return true if all courses can be finished given prerequisite pairs [course, prerequisite].', 'bool canFinish(int numCourses, vector<vector<int>>& prerequisites)', 'return false;', [
    ap("Kahn's algorithm", 'O(V+E)', 'O(V+E)', 'n', 'Build the graph and in-degrees, then process every course at most once; the graph needs V+E space.', `bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
    vector<vector<int>> adj(numCourses);
    vector<int> indegree(numCourses, 0);
    for (int i = 0; i < prerequisites.size(); i++) {
        adj[prerequisites[i][1]].push_back(prerequisites[i][0]);
        indegree[prerequisites[i][0]]++;
    }
    queue<int> q;
    for (int c = 0; c < numCourses; c++) {
        if (indegree[c] == 0) {
            q.push(c);
        }
    }
    int done = 0;
    while (!q.empty()) {
        int course = q.front();
        q.pop();
        done++;
        for (int i = 0; i < adj[course].size(); i++) {
            int next = adj[course][i];
            indegree[next]--;
            if (indegree[next] == 0) {
                q.push(next);
            }
        }
    }
    return done == numCourses;
}`)], [[2, [[1, 0]]], [2, [[1, 0], [0, 1]]], [4, [[1, 0], [2, 1], [3, 2]]], [3, []], [3, [[0, 1], [1, 2], [2, 0]]]], (n: number, pre: number[][]) => { const adj: number[][] = Array.from({ length: n }, () => []); const d = Array(n).fill(0); pre.forEach(([a, b]) => { adj[b].push(a); d[a]++; }); const q: number[] = []; d.forEach((x, i) => { if (!x) q.push(i); }); let c = 0; while (q.length) { const x = q.shift()!; c++; for (const y of adj[x]) if (!--d[y]) q.push(y); } return c === n; },
    ['A cycle of prerequisites makes finishing impossible.', 'If a topological order covers every course there is no cycle.'], 'Courses finish iff the prerequisite graph is a DAG.'),
  mk('Floyd Warshall Algorithm', 'floydWarshall', 'Given a distance matrix (use 1000000 for no edge), return all-pairs shortest distances.', 'vector<vector<int>> floydWarshall(vector<vector<int>>& dist)', 'return dist;', [
    ap('Triple loop DP', 'O(V³)', 'O(V²)', 'n2', 'Three nested loops over V vertices; the matrix is updated in place.', `vector<vector<int>> floydWarshall(vector<vector<int>>& dist) {
    int n = dist.size();
    for (int k = 0; k < n; k++) {
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                }
            }
        }
    }
    return dist;
}`)], [[[[0, 3, 1000000], [1000000, 0, 1], [2, 1000000, 0]]], [[[0, 5], [1000000, 0]]], [[[0]]]], (d: number[][]) => { const m = d.map(r => [...r]); const n = m.length; for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (m[i][k] + m[k][j] < m[i][j]) m[i][j] = m[i][k] + m[k][j]; return m; },
    ['Allow vertex k as an intermediate stop, for each k in turn.'], 'After round k, all shortest paths using only vertices 0..k as stops are known.'),
];
