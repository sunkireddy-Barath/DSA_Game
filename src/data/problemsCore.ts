// Arrays, sorting, binary search, strings, recursion/backtracking, maths and bit tricks.
import { Playable, ap, mk } from './kit';

const sortNum = (a: number[]) => [...a].sort((x, y) => x - y);
const S = 'small inputs (the tracer records every step)';

export const CORE_PROBLEMS: Playable[] = [
  // ---------- arrays ----------
  mk('Second Largest Element in an Array', 'secondLargest', 'Return the second largest distinct value, or -1 if none (values are >= 0).', 'int secondLargest(vector<int>& nums)', 'return -1;', [
    ap('Single pass, two variables', 'O(n)', 'O(1)', 'n', 'One scan updates the best and second best; sorting would cost O(n log n).', `int secondLargest(vector<int>& nums) {
    int largest = nums[0];
    int second = -1;
    for (int i = 1; i < nums.size(); i++) {
        if (nums[i] > largest) {
            second = largest;
            largest = nums[i];
        } else if (nums[i] < largest && nums[i] > second) {
            second = nums[i];
        }
    }
    return second;
}`)], [[[1, 2, 4, 7, 7, 5]], [[5]], [[3, 3, 3]], [[10, 5]], [[2, 9, 4]]], (a: number[]) => { const u = [...new Set(a)].sort((x, y) => y - x); return u.length > 1 ? u[1] : -1; },
    ['Track both the largest and the runner-up.', 'When a new largest appears, the old largest becomes second.'], 'Every element either beats the champion, the runner-up, or neither.'),
  mk('Left Rotate an array by one place', 'rotateLeftOne', 'Rotate nums left by one position in place.', 'void rotateLeftOne(vector<int>& nums)', '', [
    ap('Shift left', 'O(n)', 'O(1)', 'n', 'Every element moves one slot once; only the first value is saved.', `void rotateLeftOne(vector<int>& nums) {
    int first = nums[0];
    for (int i = 1; i < nums.size(); i++) {
        nums[i - 1] = nums[i];
    }
    nums[nums.size() - 1] = first;
}`)], [[[1, 2, 3, 4, 5]], [[7]], [[1, 2]], [[9, 8, 7]]], (a: number[]) => [...a.slice(1), a[0]],
    ['Save the first element before shifting.'], 'Shift everything left and place the saved first element at the end.'),
  { ...mk('Left Rotate an array by D places', 'rotateLeft', 'Rotate nums left by d places in place.', 'void rotateLeft(vector<int>& nums, int d)', '', [
    ap('Reversal algorithm', 'O(n)', 'O(1)', 'n', 'Three reversals touch each element a constant number of times; no extra array.', `void reverseRange(vector<int>& a, int l, int r) {
    while (l < r) {
        swap(a[l], a[r]);
        l++;
        r--;
    }
}

void rotateLeft(vector<int>& nums, int d) {
    int n = nums.size();
    d = d % n;
    reverseRange(nums, 0, d - 1);
    reverseRange(nums, d, n - 1);
    reverseRange(nums, 0, n - 1);
}`)], [[[1, 2, 3, 4, 5, 6, 7], 3], [[1, 2, 3], 4], [[1, 2], 0], [[5], 9]], (a: number[], d: number) => { const k = d % a.length; return [...a.slice(k), ...a.slice(0, k)]; },
    ['Reverse the first d, then the rest, then everything.'], 'Reversing parts then the whole rearranges blocks without extra memory.'), checkArg: 0 },
  mk('Union of two sorted arrays', 'unionArray', 'Return the sorted union (no duplicates) of two sorted arrays.', 'vector<int> unionArray(vector<int>& a, vector<int>& b)', 'return {};', [
    ap('Two pointers', 'O(m+n)', 'O(m+n)', 'n', 'Each pointer only moves forward, so m+n steps; the output holds up to m+n values.', `vector<int> unionArray(vector<int>& a, vector<int>& b) {
    vector<int> result;
    int i = 0;
    int j = 0;
    while (i < a.size() || j < b.size()) {
        int value;
        if (j == b.size() || (i < a.size() && a[i] <= b[j])) {
            value = a[i];
            i++;
        } else {
            value = b[j];
            j++;
        }
        if (result.size() == 0 || result.back() != value) {
            result.push_back(value);
        }
    }
    return result;
}`)], [[[1, 2, 3, 4, 5], [1, 2, 7]], [[1, 1, 2], [2, 3, 3]], [[], [1]], [[2, 4], [1, 3]]], (a: number[], b: number[]) => sortNum([...new Set([...a, ...b])]),
    ['Merge like merge sort but skip repeats.'], 'Take the smaller head; only append if it differs from the last appended value.'),
  mk("Sort an array of 0's, 1's and 2's", 'sortColors', 'Sort an array of 0s, 1s and 2s in place.', 'void sortColors(vector<int>& nums)', '', [
    ap('Dutch national flag', 'O(n)', 'O(1)', 'n', 'Each element is placed with at most one swap; low/mid/high only move inwards, so a single pass.', `void sortColors(vector<int>& nums) {
    int low = 0;
    int mid = 0;
    int high = nums.size() - 1;
    while (mid <= high) {
        if (nums[mid] == 0) {
            swap(nums[low], nums[mid]);
            low++;
            mid++;
        } else if (nums[mid] == 1) {
            mid++;
        } else {
            swap(nums[mid], nums[high]);
            high--;
        }
    }
}`)], [[[2, 0, 2, 1, 1, 0]], [[2, 0, 1]], [[0]], [[1, 1, 0, 2]], [[2, 2, 2]]], (a: number[]) => sortNum(a),
    ['Keep three regions: zeros, ones, unknown, twos.'], 'Maintain the invariant [0..low) zeros, [low..mid) ones, (high..n) twos.', { checkArg: 0 }),
  mk('Rearrange array elements by sign', 'rearrangeBySign', 'Equal counts of positives and negatives: return them alternating, positive first, keeping order.', 'vector<int> rearrangeBySign(vector<int>& nums)', 'return {};', [
    ap('Two write indices', 'O(n)', 'O(n)', 'n', 'One pass places each value directly into its final slot of the result.', `vector<int> rearrangeBySign(vector<int>& nums) {
    vector<int> result(nums.size(), 0);
    int pos = 0;
    int neg = 1;
    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] > 0) {
            result[pos] = nums[i];
            pos += 2;
        } else {
            result[neg] = nums[i];
            neg += 2;
        }
    }
    return result;
}`)], [[[3, 1, -2, -5, 2, -4]], [[1, -1]], [[-1, 2]], [[2, 4, -1, -3]]], (a: number[]) => { const p = a.filter(x => x > 0), n = a.filter(x => x < 0); return p.flatMap((x, i) => [x, n[i]]); },
    ['Positives go to even slots, negatives to odd slots.'], 'Precompute where each sign belongs: even/odd indices.'),
  mk('Leaders in an Array', 'leaders', 'Return all elements greater than everything to their right (in original order).', 'vector<int> leaders(vector<int>& nums)', 'return {};', [
    ap('Scan from the right', 'O(n)', 'O(1)', 'n', 'Tracking the running maximum from the right avoids comparing against all later elements (which would be O(n²)).', `vector<int> leaders(vector<int>& nums) {
    vector<int> result;
    int maxRight = INT_MIN;
    for (int i = nums.size() - 1; i >= 0; i--) {
        if (nums[i] > maxRight) {
            result.push_back(nums[i]);
            maxRight = nums[i];
        }
    }
    reverse(result.begin(), result.end());
    return result;
}`)], [[[10, 22, 12, 3, 0, 6]], [[1, 2, 3, 4]], [[4, 3, 2, 1]], [[5]]], (a: number[]) => a.filter((x, i) => a.slice(i + 1).every(y => x > y)),
    ['What must be true about everything on its right?', 'Walk from the right keeping the maximum.'], 'A leader beats the maximum of the suffix after it.'),
  { ...mk('Next Permutation', 'nextPermutation', 'Rearrange nums into the next lexicographically greater permutation (or the lowest if none).', 'void nextPermutation(vector<int>& nums)', '', [
    ap('Pivot, swap, reverse', 'O(n)', 'O(1)', 'n', 'Finding the pivot, the swap target and the reversal are each one linear scan.', `void nextPermutation(vector<int>& nums) {
    int n = nums.size();
    int pivot = n - 2;
    while (pivot >= 0 && nums[pivot] >= nums[pivot + 1]) {
        pivot--;
    }
    if (pivot >= 0) {
        int j = n - 1;
        while (nums[j] <= nums[pivot]) {
            j--;
        }
        swap(nums[pivot], nums[j]);
    }
    reverse(nums.begin() + 0, nums.end());
}`.replace('reverse(nums.begin() + 0, nums.end());', 'int l = pivot + 1;\n    int r = n - 1;\n    while (l < r) {\n        swap(nums[l], nums[r]);\n        l++;\n        r--;\n    }'))],
    [[[1, 2, 3]], [[3, 2, 1]], [[1, 1, 5]], [[1, 3, 2]], [[2, 3, 1]]], (a: number[]) => { const b = [...a]; let i = b.length - 2; while (i >= 0 && b[i] >= b[i + 1]) i--; if (i >= 0) { let j = b.length - 1; while (b[j] <= b[i]) j--; [b[i], b[j]] = [b[j], b[i]]; } const t = b.splice(i + 1).reverse(); return [...b, ...t]; },
    ['Find the rightmost position where the suffix stops being decreasing.', 'Swap with the next larger value in the suffix, then reverse the suffix.'], 'The suffix is the largest arrangement; the next permutation bumps the pivot and resets the suffix to its smallest.'), checkArg: 0 },
  mk('Longest Consecutive Sequence', 'longestConsecutive', 'Return the length of the longest run of consecutive integers (order in the array does not matter).', 'int longestConsecutive(vector<int>& nums)', 'return 0;', [
    ap('Hash set, start only at run beginnings', 'O(n)', 'O(n)', 'n', 'Each number extends a run only if it has no predecessor, so every element is visited at most twice overall.', `int longestConsecutive(vector<int>& nums) {
    unordered_set<int> seen;
    for (int i = 0; i < nums.size(); i++) {
        seen.insert(nums[i]);
    }
    int best = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (!seen.count(nums[i] - 1)) {
            int length = 1;
            int x = nums[i];
            while (seen.count(x + 1)) {
                x++;
                length++;
            }
            best = max(best, length);
        }
    }
    return best;
}`)], [[[100, 4, 200, 1, 3, 2]], [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]], [[1]], [[1, 2, 0, 1]]], (a: number[]) => { const s = new Set(a); let b = 0; for (const x of s) if (!s.has(x - 1)) { let l = 1; while (s.has(x + l)) l++; b = Math.max(b, l); } return b; },
    ['Sorting works in O(n log n). Can a hash set do better?', 'Only start counting at numbers with no x-1.'], 'A run is counted once, from its smallest element.'),
  { ...mk('Set Matrix Zeros', 'setZeroes', 'If an element is 0, set its entire row and column to 0 (in place).', 'void setZeroes(vector<vector<int>>& matrix)', '', [
    ap('Row and column markers', 'O(m·n)', 'O(m+n)', 'n2', 'One pass records zero rows/columns, a second pass clears them; marker arrays cost m+n.', `void setZeroes(vector<vector<int>>& matrix) {
    int m = matrix.size();
    int n = matrix[0].size();
    vector<int> rowZero(m, 0);
    vector<int> colZero(n, 0);
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (matrix[i][j] == 0) {
                rowZero[i] = 1;
                colZero[j] = 1;
            }
        }
    }
    for (int i = 0; i < m; i++) {
        for (int j = 0; j < n; j++) {
            if (rowZero[i] == 1 || colZero[j] == 1) {
                matrix[i][j] = 0;
            }
        }
    }
}`)], [[[[1, 1, 1], [1, 0, 1], [1, 1, 1]]], [[[0, 1, 2, 0], [3, 4, 5, 2], [1, 3, 1, 5]]], [[[1]]]], (m: number[][]) => { const r = new Set<number>(), c = new Set<number>(); m.forEach((row, i) => row.forEach((x, j) => { if (x === 0) { r.add(i); c.add(j); } })); return m.map((row, i) => row.map((x, j) => (r.has(i) || c.has(j) ? 0 : x))); },
    ['Do not zero as you scan; you will destroy information.', 'Remember which rows and columns contain a zero.'], 'Separate "find zeros" from "apply zeros".'), checkArg: 0 },
  { ...mk('Rotate Matrix by 90 degrees', 'rotate', 'Rotate an n x n matrix 90 degrees clockwise in place.', 'void rotate(vector<vector<int>>& matrix)', '', [
    ap('Transpose then reverse rows', 'O(n²)', 'O(1)', 'n2', 'Both steps touch each cell a constant number of times; swaps are in place.', `void rotate(vector<vector<int>>& matrix) {
    int n = matrix.size();
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            swap(matrix[i][j], matrix[j][i]);
        }
    }
    for (int i = 0; i < n; i++) {
        reverse(matrix[i].begin(), matrix[i].end());
    }
}`)], [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], [[[1, 2], [3, 4]]], [[[1]]]], (m: number[][]) => m[0].map((_, j) => m.map(row => row[j]).reverse()),
    ['A clockwise rotation = transpose + mirror each row.'], 'Two simple in-place reflections compose into a rotation.'), checkArg: 0 },
  mk('Print the matrix in spiral manner', 'spiralOrder', 'Return the elements in spiral order.', 'vector<int> spiralOrder(vector<vector<int>>& matrix)', 'return {};', [
    ap('Shrinking boundaries', 'O(m·n)', 'O(1)', 'n2', 'Each cell is appended exactly once; only four boundary variables are kept (output excluded).', `vector<int> spiralOrder(vector<vector<int>>& matrix) {
    vector<int> result;
    int top = 0;
    int bottom = matrix.size() - 1;
    int left = 0;
    int right = matrix[0].size() - 1;
    while (top <= bottom && left <= right) {
        for (int j = left; j <= right; j++) {
            result.push_back(matrix[top][j]);
        }
        top++;
        for (int i = top; i <= bottom; i++) {
            result.push_back(matrix[i][right]);
        }
        right--;
        if (top <= bottom) {
            for (int j = right; j >= left; j--) {
                result.push_back(matrix[bottom][j]);
            }
            bottom--;
        }
        if (left <= right) {
            for (int i = bottom; i >= top; i--) {
                result.push_back(matrix[i][left]);
            }
            left++;
        }
    }
    return result;
}`)], [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]], [[[1]]], [[[1, 2], [3, 4], [5, 6]]]], (m: number[][]) => { const o: number[] = []; let t = 0, b = m.length - 1, l = 0, r = m[0].length - 1; while (t <= b && l <= r) { for (let j = l; j <= r; j++) o.push(m[t][j]); t++; for (let i = t; i <= b; i++) o.push(m[i][r]); r--; if (t <= b) { for (let j = r; j >= l; j--) o.push(m[b][j]); b--; } if (l <= r) { for (let i = b; i >= t; i--) o.push(m[i][l]); l++; } } return o; },
    ['Walk the outer ring, then shrink the four boundaries.'], 'Peel the matrix like an onion, one ring at a time.'),
  mk("Pascal's Triangle", 'generate', 'Return the first numRows rows of Pascal\'s triangle.', 'vector<vector<int>> generate(int numRows)', 'return {};', [
    ap('Build from the previous row', 'O(n²)', 'O(n²)', 'n2', 'Row i has i+1 values each computed in O(1); the output itself has n(n+1)/2 cells.', `vector<vector<int>> generate(int numRows) {
    vector<vector<int>> triangle;
    for (int i = 0; i < numRows; i++) {
        vector<int> row(i + 1, 1);
        for (int j = 1; j < i; j++) {
            row[j] = triangle[i - 1][j - 1] + triangle[i - 1][j];
        }
        triangle.push_back(row);
    }
    return triangle;
}`)], [[1], [5], [3], [6]], (n: number) => { const t: number[][] = []; for (let i = 0; i < n; i++) { const r = Array(i + 1).fill(1); for (let j = 1; j < i; j++) r[j] = t[i - 1][j - 1] + t[i - 1][j]; t.push(r); } return t; },
    ['Each inner value is the sum of the two values above it.'], 'Edges are 1; every other cell adds its two parents.'),
  mk('Majority Element (>n/3 times)', 'majorityElementII', 'Return all elements (sorted) that appear more than n/3 times.', 'vector<int> majorityElementII(vector<int>& nums)', 'return {};', [
    ap('Extended Boyer-Moore', 'O(n)', 'O(1)', 'n', 'Two candidate/counter pairs in one pass, then a verification pass; at most two values can exceed n/3.', `vector<int> majorityElementII(vector<int>& nums) {
    int c1 = 0;
    int c2 = 1;
    int n1 = 0;
    int n2 = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] == c1) {
            n1++;
        } else if (nums[i] == c2) {
            n2++;
        } else if (n1 == 0) {
            c1 = nums[i];
            n1 = 1;
        } else if (n2 == 0) {
            c2 = nums[i];
            n2 = 1;
        } else {
            n1--;
            n2--;
        }
    }
    int count1 = 0;
    int count2 = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] == c1) {
            count1++;
        } else if (nums[i] == c2) {
            count2++;
        }
    }
    vector<int> result;
    if (count1 > nums.size() / 3) {
        result.push_back(c1);
    }
    if (count2 > nums.size() / 3) {
        result.push_back(c2);
    }
    sort(result.begin(), result.end());
    return result;
}`)], [[[3, 2, 3]], [[1]], [[1, 2]], [[1, 1, 1, 3, 3, 2, 2, 2]], [[4, 4, 4, 5, 6, 7, 8]]], (a: number[]) => sortNum([...new Set(a)].filter(x => a.filter(y => y === x).length > Math.floor(a.length / 3))),
    ['At most two elements can appear more than n/3 times.', 'Keep two candidates and verify.'], 'Voting with two slots cancels triples of distinct values.'),
  { ...mk('3 Sum', 'threeSum', 'Return all unique triplets that sum to 0.', 'vector<vector<int>> threeSum(vector<int>& nums)', 'return {};', [
    ap('Sort + two pointers', 'O(n²)', 'O(1)', 'n2', 'For each fixed i the two-pointer sweep is O(n), giving n² (sorting adds n log n). Duplicates are skipped to keep triplets unique.', `vector<vector<int>> threeSum(vector<int>& nums) {
    vector<vector<int>> result;
    sort(nums.begin(), nums.end());
    int n = nums.size();
    for (int i = 0; i < n; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) {
            continue;
        }
        int left = i + 1;
        int right = n - 1;
        while (left < right) {
            int sum = nums[i] + nums[left] + nums[right];
            if (sum < 0) {
                left++;
            } else if (sum > 0) {
                right--;
            } else {
                result.push_back({nums[i], nums[left], nums[right]});
                left++;
                right--;
                while (left < right && nums[left] == nums[left - 1]) {
                    left++;
                }
            }
        }
    }
    return result;
}`)], [[[-1, 0, 1, 2, -1, -4]], [[0, 1, 1]], [[0, 0, 0]], [[-2, 0, 1, 1, 2]]], (a: number[]) => { const b = sortNum(a), out: number[][] = [], seen = new Set<string>(); for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) for (let k = j + 1; k < b.length; k++) if (b[i] + b[j] + b[k] === 0) { const key = [b[i], b[j], b[k]].join(','); if (!seen.has(key)) { seen.add(key); out.push([b[i], b[j], b[k]]); } } return out; },
    ['Sort first so you can use two pointers.', 'Skip equal values to avoid duplicate triplets.'], 'Fix one number and solve the remaining two-sum with converging pointers.'), unordered: true },
  mk('Largest Subarray with 0 sum', 'maxLenZeroSum', 'Return the length of the longest subarray with sum 0.', 'int maxLenZeroSum(vector<int>& nums)', 'return 0;', [
    ap('Prefix sums in a map', 'O(n)', 'O(n)', 'n', 'Two equal prefix sums mean the elements between them sum to zero; the map remembers the first index of every prefix.', `int maxLenZeroSum(vector<int>& nums) {
    unordered_map<int, int> firstIndex;
    int prefix = 0;
    int best = 0;
    for (int i = 0; i < nums.size(); i++) {
        prefix += nums[i];
        if (prefix == 0) {
            best = i + 1;
        } else if (firstIndex.count(prefix)) {
            best = max(best, i - firstIndex[prefix]);
        } else {
            firstIndex[prefix] = i;
        }
    }
    return best;
}`)], [[[9, -3, 3, -1, 6, -5]], [[1, 2, 3]], [[0]], [[1, -1, 3, -3, 5]]], (a: number[]) => { let b = 0; for (let i = 0; i < a.length; i++) { let s = 0; for (let j = i; j < a.length; j++) { s += a[j]; if (s === 0) b = Math.max(b, j - i + 1); } } return b; },
    ['Equal prefix sums bracket a zero-sum block.', 'Store only the first index of each prefix.'], 'If prefix[i] == prefix[j], the elements in (i, j] cancel out.'),
  mk('Longest subarray with sum K (Positives + Negatives)', 'longestSubarrayK', 'Return the length of the longest subarray with sum k (negatives allowed).', 'int longestSubarrayK(vector<int>& nums, int k)', 'return 0;', [
    ap('Prefix sum + hash map', 'O(n)', 'O(n)', 'n', 'Look up prefix - k in O(1) per element; keep only the earliest index for longest length.', `int longestSubarrayK(vector<int>& nums, int k) {
    unordered_map<int, int> firstIndex;
    int prefix = 0;
    int best = 0;
    for (int i = 0; i < nums.size(); i++) {
        prefix += nums[i];
        if (prefix == k) {
            best = i + 1;
        }
        if (firstIndex.count(prefix - k)) {
            best = max(best, i - firstIndex[prefix - k]);
        }
        if (!firstIndex.count(prefix)) {
            firstIndex[prefix] = i;
        }
    }
    return best;
}`)], [[[10, 5, 2, 7, 1, 9], 15], [[-1, 1, 1], 1], [[1, 2, 3], 6], [[1, 2, 3], 10], [[-2, -1, 2, 1], 1]], (a: number[], k: number) => { let b = 0; for (let i = 0; i < a.length; i++) { let s = 0; for (let j = i; j < a.length; j++) { s += a[j]; if (s === k) b = Math.max(b, j - i + 1); } } return b; },
    ['Sliding window fails with negatives.', 'Use prefix sums.'], 'A subarray sums to k when two prefix sums differ by k.'),
  mk('Longest subarray with given sum K (Positives)', 'longestSubarrayPositive', 'All numbers are positive; return the length of the longest subarray with sum k.', 'int longestSubarrayPositive(vector<int>& nums, int k)', 'return 0;', [
    ap('Sliding window', 'O(n)', 'O(1)', 'n', 'Both ends only move right, so together they make at most 2n moves.', `int longestSubarrayPositive(vector<int>& nums, int k) {
    int left = 0;
    int sum = 0;
    int best = 0;
    for (int right = 0; right < nums.size(); right++) {
        sum += nums[right];
        while (sum > k && left <= right) {
            sum -= nums[left];
            left++;
        }
        if (sum == k) {
            best = max(best, right - left + 1);
        }
    }
    return best;
}`)], [[[1, 2, 3, 1, 1, 1, 1, 3, 3, 3], 6], [[2, 3, 5], 5], [[1, 2, 3], 7], [[4], 4]], (a: number[], k: number) => { let b = 0; for (let i = 0; i < a.length; i++) { let s = 0; for (let j = i; j < a.length; j++) { s += a[j]; if (s === k) b = Math.max(b, j - i + 1); } } return b; },
    ['With positives, growing the window increases the sum.', 'Shrink from the left when the sum is too big.'], 'Positivity makes the window sum monotonic, enabling two pointers.'),
  mk('Count subarrays with given xor K', 'subarraysWithXorK', 'Count subarrays whose XOR equals k.', 'int subarraysWithXorK(vector<int>& nums, int k)', 'return 0;', [
    ap('Prefix XOR + hash map', 'O(n)', 'O(n)', 'n', 'Same idea as prefix sums: prefix ^ k is the needed earlier prefix.', `int subarraysWithXorK(vector<int>& nums, int k) {
    unordered_map<int, int> seen;
    seen[0] = 1;
    int prefix = 0;
    int count = 0;
    for (int i = 0; i < nums.size(); i++) {
        prefix = prefix ^ nums[i];
        int need = prefix ^ k;
        if (seen.count(need)) {
            count += seen[need];
        }
        seen[prefix]++;
    }
    return count;
}`)], [[[4, 2, 2, 6, 4], 6], [[5, 6, 7, 8, 9], 5], [[1, 1, 1], 1], [[3], 3]], (a: number[], k: number) => { let c = 0; for (let i = 0; i < a.length; i++) { let x = 0; for (let j = i; j < a.length; j++) { x ^= a[j]; if (x === k) c++; } } return c; },
    ['XOR is its own inverse: a ^ a = 0.'], 'prefix[j] ^ prefix[i] is the XOR of the block between them.'),
  mk('Find the repeating and missing number', 'findTwoElements', 'Array of 1..n has one value repeated and one missing; return {repeating, missing}.', 'vector<int> findTwoElements(vector<int>& nums)', 'return {};', [
    ap('Frequency array', 'O(n)', 'O(n)', 'n', 'One pass to count, one to scan counts.', `vector<int> findTwoElements(vector<int>& nums) {
    int n = nums.size();
    vector<int> count(n + 1, 0);
    for (int i = 0; i < n; i++) {
        count[nums[i]]++;
    }
    int repeating = -1;
    int missing = -1;
    for (int v = 1; v <= n; v++) {
        if (count[v] == 2) {
            repeating = v;
        }
        if (count[v] == 0) {
            missing = v;
        }
    }
    return {repeating, missing};
}`)], [[[3, 1, 2, 5, 3]], [[1, 1]], [[2, 2, 3]], [[4, 3, 6, 2, 1, 1]]], (a: number[]) => { const n = a.length; let r = -1, m = -1; for (let v = 1; v <= n; v++) { const c = a.filter(x => x === v).length; if (c === 2) r = v; if (c === 0) m = v; } return [r, m]; },
    ['Count how many times each value appears.'], 'A count array exposes the value with 2 and the value with 0.'),
  { ...mk('Merge Sort', 'mergeSort', 'Sort nums in place using merge sort.', 'void mergeSort(vector<int>& nums)', '', [
    ap('Top-down merge sort', 'O(n log n)', 'O(n)', 'nlogn', 'The array is halved log n times and each level merges n elements; the temporary merge buffer costs O(n) space (plus O(log n) stack).', `void mergeRange(vector<int>& a, int low, int mid, int high) {
    vector<int> temp;
    int i = low;
    int j = mid + 1;
    while (i <= mid && j <= high) {
        if (a[i] <= a[j]) {
            temp.push_back(a[i]);
            i++;
        } else {
            temp.push_back(a[j]);
            j++;
        }
    }
    while (i <= mid) {
        temp.push_back(a[i]);
        i++;
    }
    while (j <= high) {
        temp.push_back(a[j]);
        j++;
    }
    for (int k = 0; k < temp.size(); k++) {
        a[low + k] = temp[k];
    }
}

void sortRange(vector<int>& a, int low, int high) {
    if (low >= high) {
        return;
    }
    int mid = low + (high - low) / 2;
    sortRange(a, low, mid);
    sortRange(a, mid + 1, high);
    mergeRange(a, low, mid, high);
}

void mergeSort(vector<int>& nums) {
    sortRange(nums, 0, nums.size() - 1);
}`)], [[[5, 2, 4, 7, 1, 3]], [[1]], [[3, 2, 1]], [[2, 2, 1, 1]], [[9, -4, 0, 8]]], (a: number[]) => sortNum(a),
    ['Split in half, sort each half, merge.', 'Merging two sorted lists is a two-pointer sweep.'], 'Divide and conquer: sorted halves merge in linear time.'), checkArg: 0 },
  { ...mk('Quick Sort', 'quickSort', 'Sort nums in place using quick sort.', 'void quickSort(vector<int>& nums)', '', [
    ap('Lomuto partition', 'O(n log n) avg, O(n²) worst', 'O(log n) avg', 'nlogn', 'A good pivot splits the range roughly in half (log n levels of n work). A sorted input with a last-element pivot degrades to n levels: O(n²) time and O(n) stack.', `int partitionRange(vector<int>& a, int low, int high) {
    int pivot = a[high];
    int i = low - 1;
    for (int j = low; j < high; j++) {
        if (a[j] < pivot) {
            i++;
            swap(a[i], a[j]);
        }
    }
    swap(a[i + 1], a[high]);
    return i + 1;
}

void sortRange(vector<int>& a, int low, int high) {
    if (low < high) {
        int p = partitionRange(a, low, high);
        sortRange(a, low, p - 1);
        sortRange(a, p + 1, high);
    }
}

void quickSort(vector<int>& nums) {
    sortRange(nums, 0, nums.size() - 1);
}`)], [[[10, 7, 8, 9, 1, 5]], [[1]], [[3, 2, 1]], [[2, 2, 1, 1]], [[4, 1, 3, 9, 7]]], (a: number[]) => sortNum(a),
    ['Pick a pivot and put smaller values on its left.', 'Recurse on both sides.'], 'After partitioning, the pivot is already in its final position.'), checkArg: 0 },
  mk('Maximum Product Subarray', 'maxProduct', 'Return the largest product of a contiguous subarray.', 'int maxProduct(vector<int>& nums)', 'return 0;', [
    ap('Track max and min ending here', 'O(n)', 'O(1)', 'n', 'A negative number can turn the smallest product into the largest, so both are kept; one pass.', `int maxProduct(vector<int>& nums) {
    int maxEnd = nums[0];
    int minEnd = nums[0];
    int best = nums[0];
    for (int i = 1; i < nums.size(); i++) {
        int a = maxEnd * nums[i];
        int b = minEnd * nums[i];
        maxEnd = max(nums[i], max(a, b));
        minEnd = min(nums[i], min(a, b));
        best = max(best, maxEnd);
    }
    return best;
}`)], [[[2, 3, -2, 4]], [[-2, 0, -1]], [[-2, 3, -4]], [[0, 2]], [[-3]]], (a: number[]) => { let b = -Infinity; for (let i = 0; i < a.length; i++) { let p = 1; for (let j = i; j < a.length; j++) { p *= a[j]; b = Math.max(b, p); } } return b; },
    ['Negatives flip the sign.', 'Keep both the biggest and smallest product ending at i.'], 'The minimum today can become the maximum tomorrow after multiplying by a negative.'),
  mk('Counting frequencies of array elements', 'countFrequencies', 'Values are in 1..n; return a vector f where f[v-1] is how many times v occurs.', 'vector<int> countFrequencies(vector<int>& nums)', 'return {};', [
    ap('Counting array', 'O(n)', 'O(n)', 'n', 'One pass, one array slot per possible value; direct indexing is O(1) per update.', `vector<int> countFrequencies(vector<int>& nums) {
    vector<int> freq(nums.size(), 0);
    for (int i = 0; i < nums.size(); i++) {
        freq[nums[i] - 1]++;
    }
    return freq;
}`)], [[[2, 3, 2, 3, 5]], [[1, 1, 1]], [[1]], [[3, 1, 2]]], (a: number[]) => { const f = Array(a.length).fill(0); a.forEach(x => f[x - 1]++); return f; },
    ['Use the value itself as an index.'], 'When the key space is small, an array beats a hash map.'),

  // ---------- binary search ----------
  mk('Implement Upper Bound', 'upperBound', 'Return the first index i with nums[i] > x, or n.', 'int upperBound(vector<int>& nums, int x)', 'return 0;', [
    ap('Binary search on boundary', 'O(log n)', 'O(1)', 'logn', 'The predicate nums[i] > x is monotone, so halving finds the boundary.', `int upperBound(vector<int>& nums, int x) {
    int low = 0;
    int high = nums.size();
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] > x) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}`)], [[[1, 2, 4, 4, 7], 4], [[1, 2, 4, 4, 7], 0], [[1, 2, 4, 4, 7], 7], [[3], 3]], (a: number[], x: number) => { let i = 0; while (i < a.length && a[i] <= x) i++; return i; },
    ['Like lower bound but strictly greater.'], 'Move low past everything <= x.'),
  mk('Search Insert Position', 'searchInsert', 'Return the index of target, or where it would be inserted to keep order.', 'int searchInsert(vector<int>& nums, int target)', 'return 0;', [
    ap('Lower bound', 'O(log n)', 'O(1)', 'logn', 'Binary search for the first element >= target.', `int searchInsert(vector<int>& nums, int target) {
    int low = 0;
    int high = nums.size();
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] >= target) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}`)], [[[1, 3, 5, 6], 5], [[1, 3, 5, 6], 2], [[1, 3, 5, 6], 7], [[1, 3, 5, 6], 0]], (a: number[], t: number) => { let i = 0; while (i < a.length && a[i] < t) i++; return i; },
    ['This is exactly lower bound.'], 'The insertion point is the first element not smaller than target.'),
  mk('Find the first or last occurrence of a given number', 'searchRange', 'Return {first, last} index of target in a sorted array, or {-1, -1}.', 'vector<int> searchRange(vector<int>& nums, int target)', 'return {-1, -1};', [
    ap('Two binary searches', 'O(log n)', 'O(1)', 'logn', 'Two independent halving searches (lower and upper bound).', `int bound(vector<int>& nums, int target, bool findFirst) {
    int low = 0;
    int high = nums.size() - 1;
    int answer = -1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] == target) {
            answer = mid;
            if (findFirst) {
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        } else if (nums[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return answer;
}

vector<int> searchRange(vector<int>& nums, int target) {
    return {bound(nums, target, true), bound(nums, target, false)};
}`)], [[[5, 7, 7, 8, 8, 10], 8], [[5, 7, 7, 8, 8, 10], 6], [[], 0], [[2, 2], 2], [[1], 1]], (a: number[], t: number) => [a.indexOf(t), a.lastIndexOf(t)],
    ['After finding the target keep searching for an earlier (or later) one.'], 'A match is a candidate, not the end of the search.'),
  mk('Count occurrences of a number in a sorted array', 'countOccurrences', 'Return how many times target appears in a sorted array.', 'int countOccurrences(vector<int>& nums, int target)', 'return 0;', [
    ap('Lower bound / upper bound', 'O(log n)', 'O(1)', 'logn', 'Count = upperBound - lowerBound, each found by halving.', `int firstGE(vector<int>& nums, int x, bool strict) {
    int low = 0;
    int high = nums.size();
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] > x || (!strict && nums[mid] == x)) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}

int countOccurrences(vector<int>& nums, int target) {
    return firstGE(nums, target, true) - firstGE(nums, target, false);
}`)], [[[1, 1, 2, 2, 2, 3], 2], [[1, 2, 3], 4], [[5, 5, 5], 5], [[1], 1]], (a: number[], t: number) => a.filter(x => x === t).length,
    ['Occurrences = (first index > x) - (first index >= x).'], 'Two boundaries bracket the block of equal values.'),
  mk('Search in Rotated Sorted Array I', 'searchRotated', 'Search target in a rotated sorted array of distinct values; return its index or -1.', 'int searchRotated(vector<int>& nums, int target)', 'return -1;', [
    ap('Binary search on the sorted half', 'O(log n)', 'O(1)', 'logn', 'At every step one half is sorted; testing whether target lies in it discards the other half.', `int searchRotated(vector<int>& nums, int target) {
    int low = 0;
    int high = nums.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] == target) {
            return mid;
        }
        if (nums[low] <= nums[mid]) {
            if (nums[low] <= target && target < nums[mid]) {
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        } else {
            if (nums[mid] < target && target <= nums[high]) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
    }
    return -1;
}`)], [[[4, 5, 6, 7, 0, 1, 2], 0], [[4, 5, 6, 7, 0, 1, 2], 3], [[1], 0], [[3, 1], 1], [[5, 1, 3], 5]], (a: number[], t: number) => a.indexOf(t),
    ['One half is always sorted.', 'Decide which half, then whether target is inside it.'], 'Rotation breaks sortedness only on one side of mid.'),
  mk('Minimum in Rotated Sorted Array', 'findMin', 'Return the minimum of a rotated sorted array of distinct values.', 'int findMin(vector<int>& nums)', 'return 0;', [
    ap('Binary search for the pivot', 'O(log n)', 'O(1)', 'logn', 'Comparing mid with the rightmost element tells which side holds the minimum.', `int findMin(vector<int>& nums) {
    int low = 0;
    int high = nums.size() - 1;
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] > nums[high]) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return nums[low];
}`)], [[[3, 4, 5, 1, 2]], [[4, 5, 6, 7, 0, 1, 2]], [[11, 13, 15, 17]], [[2, 1]], [[1]]], (a: number[]) => Math.min(...a),
    ['If nums[mid] > nums[high] the minimum is to the right.'], 'The minimum is the rotation point.'),
  mk('Find out how many times the array has been rotated', 'countRotations', 'Return the number of rotations (index of the minimum) of a rotated sorted array of distinct values.', 'int countRotations(vector<int>& nums)', 'return 0;', [
    ap('Binary search for the minimum', 'O(log n)', 'O(1)', 'logn', 'Same as finding the minimum; the answer is its index.', `int countRotations(vector<int>& nums) {
    int low = 0;
    int high = nums.size() - 1;
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] > nums[high]) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low;
}`)], [[[4, 5, 6, 7, 0, 1, 2]], [[1, 2, 3]], [[3, 1, 2]], [[2, 1]]], (a: number[]) => a.indexOf(Math.min(...a)),
    ['Rotations = position of the smallest element.'], 'A rotated array of k rotations has its minimum at index k.'),
  mk('Single element in a Sorted Array', 'singleNonDuplicate', 'Every element appears twice except one; the array is sorted. Return the single one.', 'int singleNonDuplicate(vector<int>& nums)', 'return 0;', [
    ap('Binary search on pair parity', 'O(log n)', 'O(1)', 'logn', 'Before the single element pairs start at even indices; after it they start at odd indices, which is monotone.', `int singleNonDuplicate(vector<int>& nums) {
    int low = 0;
    int high = nums.size() - 1;
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (mid % 2 == 1) {
            mid--;
        }
        if (nums[mid] == nums[mid + 1]) {
            low = mid + 2;
        } else {
            high = mid;
        }
    }
    return nums[low];
}`)], [[[1, 1, 2, 3, 3, 4, 4, 8, 8]], [[3, 3, 7, 7, 10, 11, 11]], [[5]], [[1, 2, 2]]], (a: number[]) => a.find(x => a.filter(y => y === x).length === 1),
    ['Look at whether pairs start on even or odd indices.'], 'The single element shifts the pairing parity of everything after it.'),
  mk('Find Peak Element', 'findPeakElement', 'Return the index of any peak (greater than neighbours; ends count as -infinity beyond).', 'int findPeakElement(vector<int>& nums)', 'return 0;', [
    ap('Binary search on slope', 'O(log n)', 'O(1)', 'logn', 'If nums[mid] < nums[mid+1] a peak lies to the right, otherwise at or left of mid: half discarded each step.', `int findPeakElement(vector<int>& nums) {
    int low = 0;
    int high = nums.size() - 1;
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] < nums[mid + 1]) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low;
}`)], [[[1, 2, 3, 1]], [[1, 2, 1, 3, 5, 6, 4]], [[1]], [[2, 1]], [[1, 2]]],
    () => 'any valid peak', ['Follow the uphill direction.'], 'Walking uphill must end at a peak.', { constraints: ['Any valid peak index is accepted'], check: (args: any[], got: any) => { const a: number[] = args[0]; return Number.isInteger(got) && got >= 0 && got < a.length && (got === 0 || a[got] > a[got - 1]) && (got === a.length - 1 || a[got] > a[got + 1]); } }),
  mk('Find square root of a number using BS', 'mySqrt', 'Return floor(sqrt(x)).', 'int mySqrt(int x)', 'return 0;', [
    ap('Binary search on the answer', 'O(log x)', 'O(1)', 'logn', 'Squaring is monotone, so halving the candidate range finds the largest r with r*r <= x.', `int mySqrt(int x) {
    int low = 0;
    int high = x;
    int answer = 0;
    while (low <= high) {
        long long mid = low + (high - low) / 2;
        if (mid * mid <= x) {
            answer = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return answer;
}`)], [[0], [1], [8], [16], [26], [100], [2147395599]], (x: number) => Math.floor(Math.sqrt(x)),
    ['Guess an answer and check if its square is too big.'], 'Binary search works on any monotone yes/no question, not just arrays.'),
  mk('Koko Eating Bananas', 'minEatingSpeed', 'Return the minimum integer speed k so that all piles are eaten within h hours.', 'int minEatingSpeed(vector<int>& piles, int h)', 'return 0;', [
    ap('Binary search on speed', 'O(n log M)', 'O(1)', 'nlogn', 'Each feasibility check scans n piles; the speed range [1, max pile] is halved log M times.', `int hoursNeeded(vector<int>& piles, int speed) {
    int total = 0;
    for (int i = 0; i < piles.size(); i++) {
        total += (piles[i] + speed - 1) / speed;
    }
    return total;
}

int minEatingSpeed(vector<int>& piles, int h) {
    int low = 1;
    int high = 1;
    for (int i = 0; i < piles.size(); i++) {
        high = max(high, piles[i]);
    }
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (hoursNeeded(piles, mid) <= h) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}`)], [[[3, 6, 7, 11], 8], [[30, 11, 23, 4, 20], 5], [[30, 11, 23, 4, 20], 6], [[5], 5]], (p: number[], h: number) => { for (let k = 1; ; k++) if (p.reduce((s, x) => s + Math.ceil(x / k), 0) <= h) return k; },
    ['If speed k works, any faster speed works too.', 'Binary search the speed.'], 'Feasibility is monotone in the speed.'),
  mk('Capacity to Ship Packages within D Days', 'shipWithinDays', 'Return the least ship capacity that delivers all packages (in order) within d days.', 'int shipWithinDays(vector<int>& weights, int days)', 'return 0;', [
    ap('Binary search on capacity', 'O(n log S)', 'O(1)', 'nlogn', 'The capacity range [max weight, total] is halved; each check is one pass.', `bool canShip(vector<int>& weights, int days, int capacity) {
    int used = 1;
    int load = 0;
    for (int i = 0; i < weights.size(); i++) {
        if (load + weights[i] > capacity) {
            used++;
            load = 0;
        }
        load += weights[i];
    }
    return used <= days;
}

int shipWithinDays(vector<int>& weights, int days) {
    int low = 0;
    int high = 0;
    for (int i = 0; i < weights.size(); i++) {
        low = max(low, weights[i]);
        high += weights[i];
    }
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (canShip(weights, days, mid)) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}`)], [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5], [[3, 2, 2, 4, 1, 4], 3], [[1, 2, 3, 1, 1], 4], [[5], 1]], (w: number[], d: number) => { for (let c = Math.max(...w); ; c++) { let u = 1, l = 0; for (const x of w) { if (l + x > c) { u++; l = 0; } l += x; } if (u <= d) return c; } },
    ['A larger ship never hurts.', 'Search between the heaviest package and the total weight.'], 'Binary search on the answer with a greedy feasibility check.'),
  mk('Aggressive Cows', 'aggressiveCows', 'Place k cows in stalls (positions given) to maximise the minimum distance between any two cows.', 'int aggressiveCows(vector<int>& stalls, int k)', 'return 0;', [
    ap('Sort + binary search on distance', 'O(n log n + n log D)', 'O(1)', 'nlogn', 'Sorting costs n log n; the distance range is halved log D times with an O(n) greedy check each.', `bool canPlace(vector<int>& stalls, int k, int distance) {
    int placed = 1;
    int last = stalls[0];
    for (int i = 1; i < stalls.size(); i++) {
        if (stalls[i] - last >= distance) {
            placed++;
            last = stalls[i];
        }
    }
    return placed >= k;
}

int aggressiveCows(vector<int>& stalls, int k) {
    sort(stalls.begin(), stalls.end());
    int low = 1;
    int high = stalls[stalls.size() - 1] - stalls[0];
    int answer = 0;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (canPlace(stalls, k, mid)) {
            answer = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return answer;
}`)], [[[0, 3, 4, 7, 10, 9], 4], [[1, 2, 4, 8, 9], 3], [[1, 2], 2], [[5, 1, 9], 2]], (s: number[], k: number) => { const a = sortNum(s); let best = 0; for (let d = 1; d <= a[a.length - 1] - a[0]; d++) { let c = 1, l = a[0]; for (const x of a.slice(1)) if (x - l >= d) { c++; l = x; } if (c >= k) best = d; } return best; },
    ['If distance d works then any smaller distance works.', 'Greedy: place a cow as early as possible.'], 'Binary search the distance; greedily check feasibility.'),
  mk('Allocate Books', 'allocateBooks', 'Split book pages (in order) among m students so the maximum pages any student reads is minimised.', 'int allocateBooks(vector<int>& pages, int m)', 'return 0;', [
    ap('Binary search on the maximum load', 'O(n log S)', 'O(1)', 'nlogn', 'Each check is one greedy pass; the range [max, sum] is halved.', `int studentsNeeded(vector<int>& pages, int limit) {
    int students = 1;
    int load = 0;
    for (int i = 0; i < pages.size(); i++) {
        if (load + pages[i] > limit) {
            students++;
            load = 0;
        }
        load += pages[i];
    }
    return students;
}

int allocateBooks(vector<int>& pages, int m) {
    if (m > pages.size()) {
        return -1;
    }
    int low = 0;
    int high = 0;
    for (int i = 0; i < pages.size(); i++) {
        low = max(low, pages[i]);
        high += pages[i];
    }
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (studentsNeeded(pages, mid) <= m) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}`)], [[[12, 34, 67, 90], 2], [[25, 46, 28, 49, 24], 4], [[10, 20, 30], 5], [[7, 2, 5, 10, 8], 2]], (p: number[], m: number) => { if (m > p.length) return -1; for (let c = Math.max(...p); ; c++) { let u = 1, l = 0; for (const x of p) { if (l + x > c) { u++; l = 0; } l += x; } if (u <= m) return c; } },
    ['Same shape as shipping packages.'], 'Minimise the maximum: binary search it and greedily test.'),
  mk('Kth Missing Positive Number', 'findKthPositive', 'Given a sorted array of positive integers, return the k-th positive integer that is missing.', 'int findKthPositive(vector<int>& arr, int k)', 'return 0;', [
    ap('Binary search on missing count', 'O(log n)', 'O(1)', 'logn', 'arr[i] - (i+1) counts the missing values before arr[i] and is monotone.', `int findKthPositive(vector<int>& arr, int k) {
    int low = 0;
    int high = arr.size();
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] - (mid + 1) < k) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low + k;
}`)], [[[2, 3, 4, 7, 11], 5], [[1, 2, 3, 4], 2], [[5], 1], [[1, 3], 1]], (a: number[], k: number) => { let c = 0; for (let v = 1; ; v++) if (!a.includes(v) && ++c === k) return v; },
    ['arr[i] - (i+1) is how many numbers are missing before arr[i].'], 'The answer is k plus the number of present values below it.'),
  mk('Search in a 2D matrix', 'searchMatrix', 'Rows are sorted and each row starts above the previous row\'s last value; return true if target exists.', 'bool searchMatrix(vector<vector<int>>& matrix, int target)', 'return false;', [
    ap('Binary search over the flattened matrix', 'O(log(m·n))', 'O(1)', 'logn', 'Index k maps to (k / cols, k % cols), so the whole matrix is one sorted array.', `bool searchMatrix(vector<vector<int>>& matrix, int target) {
    int rows = matrix.size();
    int cols = matrix[0].size();
    int low = 0;
    int high = rows * cols - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        int value = matrix[mid / cols][mid % cols];
        if (value == target) {
            return true;
        } else if (value < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return false;
}`)], [[[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 3], [[[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], 13], [[[1]], 1], [[[1], [3]], 3]], (m: number[][], t: number) => m.flat().includes(t),
    ['Treat the matrix as one long sorted array.'], 'Index arithmetic hides the 2D shape.'),
  mk('Row with maximum number of 1\'s', 'rowWithMaxOnes', 'Each row of a binary matrix is sorted; return the index of the row with the most 1s (smallest index on ties), -1 if no ones.', 'int rowWithMaxOnes(vector<vector<int>>& matrix)', 'return -1;', [
    ap('Binary search per row', 'O(m log n)', 'O(1)', 'nlogn', 'Each row is sorted so the first 1 is found by halving; m rows.', `int firstOne(vector<int>& row) {
    int low = 0;
    int high = row.size();
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (row[mid] == 1) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}

int rowWithMaxOnes(vector<vector<int>>& matrix) {
    int best = -1;
    int bestCount = 0;
    for (int i = 0; i < matrix.size(); i++) {
        int ones = matrix[i].size() - firstOne(matrix[i]);
        if (ones > bestCount) {
            bestCount = ones;
            best = i;
        }
    }
    return best;
}`)], [[[[0, 1, 1, 1], [0, 0, 1, 1], [1, 1, 1, 1], [0, 0, 0, 0]]], [[[0, 0], [0, 0]]], [[[0, 1], [1, 1]]], [[[1]]]], (m: number[][]) => { let b = -1, bc = 0; m.forEach((r, i) => { const c = r.filter(x => x === 1).length; if (c > bc) { bc = c; b = i; } }); return b; },
    ['Sorted rows mean the ones form a suffix.'], 'Binary search finds where each row switches to ones.'),

  // ---------- strings ----------
  mk('Remove Outermost Parentheses', 'removeOuterParentheses', 'Remove the outermost parentheses of every primitive component.', 'string removeOuterParentheses(string s)', 'return "";', [
    ap('Depth counter', 'O(n)', 'O(n)', 'n', 'One pass with a depth counter; the result string holds up to n characters.', `string removeOuterParentheses(string s) {
    string result = "";
    int depth = 0;
    for (int i = 0; i < s.size(); i++) {
        if (s[i] == '(') {
            if (depth > 0) {
                result += s[i];
            }
            depth++;
        } else {
            depth--;
            if (depth > 0) {
                result += s[i];
            }
        }
    }
    return result;
}`)], [['(()())(())'], ['(()())(())(()(()))'], ['()()'], ['(())']], (s: string) => { let d = 0, r = ''; for (const c of s) { if (c === '(') { if (d > 0) r += c; d++; } else { d--; if (d > 0) r += c; } } return r; },
    ['Outer parentheses are at depth 0 (opening) and depth 1 (closing).'], 'Depth tells you whether a bracket is outermost.'),
  mk('Largest Odd Number in a String', 'largestOddNumber', 'Return the largest odd-valued prefix of the number string (empty if none).', 'string largestOddNumber(string num)', 'return "";', [
    ap('Trim even tail', 'O(n)', 'O(n)', 'n', 'Scan from the right for the first odd digit; the answer is the prefix up to it.', `string largestOddNumber(string num) {
    for (int i = num.size() - 1; i >= 0; i--) {
        if ((num[i] - '0') % 2 == 1) {
            return num.substr(0, i + 1);
        }
    }
    return "";
}`)], [['52'], ['4206'], ['35427'], ['2468']], (s: string) => { for (let i = s.length - 1; i >= 0; i--) if (+s[i] % 2) return s.slice(0, i + 1); return ''; },
    ['A number is odd iff its last digit is odd.'], 'The longest prefix ending in an odd digit is the largest odd value.'),
  mk('Longest Common Prefix', 'longestCommonPrefix', 'Return the longest common prefix of the strings.', 'string longestCommonPrefix(vector<string>& strs)', 'return "";', [
    ap('Compare column by column', 'O(S)', 'O(1)', 'n', 'S is the total characters examined; we stop at the first mismatch.', `string longestCommonPrefix(vector<string>& strs) {
    string prefix = "";
    for (int i = 0; i < strs[0].size(); i++) {
        char c = strs[0][i];
        for (int j = 1; j < strs.size(); j++) {
            if (i >= strs[j].size() || strs[j][i] != c) {
                return prefix;
            }
        }
        prefix += c;
    }
    return prefix;
}`)], [[['flower', 'flow', 'flight']], [['dog', 'racecar', 'car']], [['a']], [['ab', 'ab']]], (a: string[]) => { let p = a[0]; for (const s of a) while (!s.startsWith(p)) p = p.slice(0, -1); return p; },
    ['Compare the same index across all strings.'], 'Stop at the first column where any string disagrees.'),
  mk('Isomorphic Strings', 'isIsomorphic', 'Return true if characters of s can be consistently replaced to get t (one-to-one).', 'bool isIsomorphic(string s, string t)', 'return false;', [
    ap('Two mapping arrays', 'O(n)', 'O(1)', 'n', 'Two arrays of 256 slots store the last seen position of each character: constant space.', `bool isIsomorphic(string s, string t) {
    vector<int> mapS(256, 0);
    vector<int> mapT(256, 0);
    for (int i = 0; i < s.size(); i++) {
        if (mapS[s[i]] != mapT[t[i]]) {
            return false;
        }
        mapS[s[i]] = i + 1;
        mapT[t[i]] = i + 1;
    }
    return true;
}`)], [['egg', 'add'], ['foo', 'bar'], ['paper', 'title'], ['ab', 'aa']], (s: string, t: string) => { const a = new Map<string, string>(), b = new Map<string, string>(); for (let i = 0; i < s.length; i++) { if ((a.get(s[i]) ?? t[i]) !== t[i] || (b.get(t[i]) ?? s[i]) !== s[i]) return false; a.set(s[i], t[i]); b.set(t[i], s[i]); } return true; },
    ['The mapping must be one-to-one in both directions.'], 'Two characters are "the same" iff they were last seen at the same position.'),
  mk('Maximum Nesting Depth of Parentheses', 'maxDepth', 'Return the maximum nesting depth of parentheses in s.', 'int maxDepth(string s)', 'return 0;', [
    ap('Counter', 'O(n)', 'O(1)', 'n', 'One pass, one counter and one maximum.', `int maxDepth(string s) {
    int depth = 0;
    int best = 0;
    for (int i = 0; i < s.size(); i++) {
        if (s[i] == '(') {
            depth++;
            best = max(best, depth);
        } else if (s[i] == ')') {
            depth--;
        }
    }
    return best;
}`)], [['(1+(2*3)+((8)/4))+1'], ['(1)+((2))+(((3)))'], ['1+(2*3)/(2-1)'], ['1']], (s: string) => { let d = 0, b = 0; for (const c of s) { if (c === '(') b = Math.max(b, ++d); else if (c === ')') d--; } return b; },
    ['Count opens minus closes as you scan.'], 'The depth is a running balance; the answer is its peak.'),
  mk('Implement Atoi', 'myAtoi', 'Parse an integer: skip leading spaces, optional sign, then digits (stop at the first non-digit).', 'int myAtoi(string s)', 'return 0;', [
    ap('Single pass', 'O(n)', 'O(1)', 'n', 'Each character is examined at most once.', `int myAtoi(string s) {
    int i = 0;
    while (i < s.size() && s[i] == ' ') {
        i++;
    }
    int sign = 1;
    if (i < s.size() && (s[i] == '-' || s[i] == '+')) {
        if (s[i] == '-') {
            sign = -1;
        }
        i++;
    }
    long long value = 0;
    while (i < s.size() && s[i] >= '0' && s[i] <= '9') {
        value = value * 10 + (s[i] - '0');
        if (value * sign > 2147483647) {
            return 2147483647;
        }
        if (value * sign < -2147483648) {
            return -2147483648;
        }
        i++;
    }
    return sign * value;
}`)], [['42'], ['   -42'], ['4193 with words'], ['words 987'], ['-91283472332'], ['+7']], (s: string) => { const m = s.match(/^ *([+-]?\d+)/); if (!m) return 0; const v = parseInt(m[1], 10); return Math.max(-2147483648, Math.min(2147483647, v)); },
    ['Handle spaces, sign, digits in that order.', 'Clamp on overflow.'], 'A tiny state machine: whitespace → sign → digits.'),
  mk('Roman Numerals to Integer and vice versa', 'romanToInt', 'Convert a Roman numeral to an integer.', 'int romanToInt(string s)', 'return 0;', [
    ap('Subtractive rule', 'O(n)', 'O(1)', 'n', 'One pass; a smaller symbol before a larger one is subtracted.', `int value(char c) {
    if (c == 'I') {
        return 1;
    }
    if (c == 'V') {
        return 5;
    }
    if (c == 'X') {
        return 10;
    }
    if (c == 'L') {
        return 50;
    }
    if (c == 'C') {
        return 100;
    }
    if (c == 'D') {
        return 500;
    }
    return 1000;
}

int romanToInt(string s) {
    int total = 0;
    for (int i = 0; i < s.size(); i++) {
        if (i + 1 < s.size() && value(s[i]) < value(s[i + 1])) {
            total -= value(s[i]);
        } else {
            total += value(s[i]);
        }
    }
    return total;
}`)], [['III'], ['LVIII'], ['MCMXCIV'], ['IV'], ['IX']], (s: string) => { const v: any = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }; let t = 0; for (let i = 0; i < s.length; i++) t += v[s[i]] < (v[s[i + 1]] ?? 0) ? -v[s[i]] : v[s[i]]; return t; },
    ['If a symbol is smaller than the next one, subtract it.'], 'IV = 5 - 1: look one symbol ahead.'),
  mk('Longest Palindromic Substring', 'longestPalindrome', 'Return the longest palindromic substring (the leftmost one on ties).', 'string longestPalindrome(string s)', 'return "";', [
    ap('Expand around centres', 'O(n²)', 'O(1)', 'n2', '2n-1 centres, each expansion up to n/2 steps. Better than the O(n³) brute force; Manacher achieves O(n).', `string longestPalindrome(string s) {
    int start = 0;
    int bestLen = 1;
    for (int centre = 0; centre < s.size(); centre++) {
        for (int pass = 0; pass < 2; pass++) {
            int left = centre;
            int right = centre + pass;
            while (left >= 0 && right < s.size() && s[left] == s[right]) {
                left--;
                right++;
            }
            int len = right - left - 1;
            if (len > bestLen) {
                bestLen = len;
                start = left + 1;
            }
        }
    }
    return s.substr(start, bestLen);
}`)], [['babad'], ['cbbd'], ['a'], ['forgeeksskeegfor'], ['abc']], (s: string) => { let best = s.slice(0, 1); for (let c = 0; c < s.length; c++) for (const p of [0, 1]) { let l = c, r = c + p; while (l >= 0 && r < s.length && s[l] === s[r]) { l--; r++; } if (r - l - 1 > best.length) best = s.slice(l + 1, r); } return best; },
    ['Every palindrome has a centre (a character or a gap).', 'Expand outwards while the ends match.'], 'Grow from the middle instead of testing every substring.'),
  mk('Reverse Words in a String', 'reverseWords', 'Reverse the order of words; trim extra spaces and use single spaces between words.', 'string reverseWords(string s)', 'return "";', [
    ap('Scan from the right', 'O(n)', 'O(n)', 'n', 'Each character is visited once and copied once into the result.', `string reverseWords(string s) {
    string result = "";
    int i = s.size() - 1;
    while (i >= 0) {
        while (i >= 0 && s[i] == ' ') {
            i--;
        }
        if (i < 0) {
            break;
        }
        int j = i;
        while (i >= 0 && s[i] != ' ') {
            i--;
        }
        if (result.size() > 0) {
            result += ' ';
        }
        result += s.substr(i + 1, j - i);
    }
    return result;
}`)], [['the sky is blue'], ['  hello world  '], ['a good   example'], ['one']], (s: string) => s.trim().split(/\s+/).reverse().join(' '),
    ['Find words from the end of the string.', 'Join with exactly one space.'], 'Walking backwards yields words already in reverse order.'),

  // ---------- recursion / backtracking ----------
  mk('Sum of first N Numbers', 'sumToN', 'Return 1 + 2 + ... + n using recursion.', 'int sumToN(int n)', 'return 0;', [
    ap('Recursion', 'O(n)', 'O(n)', 'n', 'n calls each doing O(1) work; the stack reaches depth n.', `int sumToN(int n) {
    if (n == 0) {
        return 0;
    }
    return n + sumToN(n - 1);
}`)], [[0], [1], [5], [10], [20]], (n: number) => (n * (n + 1)) / 2,
    ['Base case: the sum of the first 0 numbers.'], 'sum(n) = n + sum(n-1).'),
  { ...mk('Reverse an array using recursion', 'reverseArray', 'Reverse nums in place using recursion.', 'void reverseArray(vector<int>& nums)', '', [
    ap('Swap ends, recurse inwards', 'O(n)', 'O(n)', 'n', 'n/2 calls each doing one swap; stack depth n/2.', `void helper(vector<int>& nums, int left, int right) {
    if (left >= right) {
        return;
    }
    swap(nums[left], nums[right]);
    helper(nums, left + 1, right - 1);
}

void reverseArray(vector<int>& nums) {
    helper(nums, 0, nums.size() - 1);
}`)], [[[1, 2, 3, 4, 5]], [[1]], [[1, 2]], [[4, 3, 2, 1]]], (a: number[]) => [...a].reverse(),
    ['Swap the two ends, then solve the smaller problem.'], 'Peel one pair per call.'), checkArg: 0 },
  mk('Generate Parentheses', 'generateParenthesis', 'Return all well-formed strings of n pairs of parentheses.', 'vector<string> generateParenthesis(int n)', 'return {};', [
    ap('Backtracking with counts', 'O(4ⁿ/√n)', 'O(n)', '2n', 'Only valid prefixes are extended (open < n, close < open), so the tree size is the Catalan bound ≈ 4ⁿ/√n times the string length; depth is 2n.', `void build(int open, int close, int n, string& current, vector<string>& result) {
    if (current.size() == 2 * n) {
        result.push_back(current);
        return;
    }
    if (open < n) {
        current.push_back('(');
        build(open + 1, close, n, current, result);
        current.pop_back();
    }
    if (close < open) {
        current.push_back(')');
        build(open, close + 1, n, current, result);
        current.pop_back();
    }
}

vector<string> generateParenthesis(int n) {
    vector<string> result;
    string current = "";
    build(0, 0, n, current, result);
    return result;
}`)], [[1], [2], [3], [4]], (n: number) => { const r: string[] = []; const g = (s: string, o: number, c: number) => { if (s.length === 2 * n) { r.push(s); return; } if (o < n) g(s + '(', o + 1, c); if (c < o) g(s + ')', o, c + 1); }; g('', 0, 0); return r; },
    ['You can add ( while fewer than n are used.', 'You can add ) only if it would not exceed the opens.'], 'Prune invalid prefixes instead of generating then filtering.'),
  { ...mk('Permutations', 'permute', 'Return all permutations of distinct integers.', 'vector<vector<int>> permute(vector<int>& nums)', 'return {};', [
    ap('Backtracking with used[]', 'O(n·n!)', 'O(n)', '2n', 'n! leaves, each copied in O(n); recursion depth n and a used[] array.', `void build(vector<int>& nums, vector<int>& used, vector<int>& current, vector<vector<int>>& result) {
    if (current.size() == nums.size()) {
        result.push_back(current);
        return;
    }
    for (int i = 0; i < nums.size(); i++) {
        if (used[i] == 0) {
            used[i] = 1;
            current.push_back(nums[i]);
            build(nums, used, current, result);
            current.pop_back();
            used[i] = 0;
        }
    }
}

vector<vector<int>> permute(vector<int>& nums) {
    vector<vector<int>> result;
    vector<int> used(nums.size(), 0);
    vector<int> current;
    build(nums, used, current, result);
    return result;
}`)], [[[1, 2, 3]], [[0, 1]], [[1]], [[1, 2, 3, 4]]], (a: number[]) => { const r: number[][] = []; const g = (cur: number[], rest: number[]) => { if (!rest.length) { r.push(cur); return; } rest.forEach((x, i) => g([...cur, x], rest.filter((_, j) => j !== i))); }; g([], a); return r; },
    ['Choose an unused element, recurse, then un-choose.'], 'Mark, explore, unmark.'), unordered: true },
  { ...mk('Combination Sum I', 'combinationSum', 'Return all unique combinations of candidates (reusable) that sum to target.', 'vector<vector<int>> combinationSum(vector<int>& candidates, int target)', 'return {};', [
    ap('Backtracking, reuse allowed', 'O(2^t) roughly', 'O(t)', '2n', 'At each index choose to take the value again or move on; depth is at most target / min(candidates).', `void build(int index, int remaining, vector<int>& candidates, vector<int>& current, vector<vector<int>>& result) {
    if (remaining == 0) {
        result.push_back(current);
        return;
    }
    if (index == candidates.size() || remaining < 0) {
        return;
    }
    current.push_back(candidates[index]);
    build(index, remaining - candidates[index], candidates, current, result);
    current.pop_back();
    build(index + 1, remaining, candidates, current, result);
}

vector<vector<int>> combinationSum(vector<int>& candidates, int target) {
    vector<vector<int>> result;
    vector<int> current;
    build(0, target, candidates, current, result);
    return result;
}`)], [[[2, 3, 6, 7], 7], [[2, 3, 5], 8], [[2], 1], [[1], 3]], (c: number[], t: number) => { const r: number[][] = []; const g = (i: number, rem: number, cur: number[]) => { if (rem === 0) { r.push([...cur]); return; } if (i === c.length || rem < 0) return; cur.push(c[i]); g(i, rem - c[i], cur); cur.pop(); g(i + 1, rem, cur); }; g(0, t, []); return r; },
    ['Either take the current candidate again, or skip to the next.'], 'Index only moves forward, so combinations are never repeated in a different order.'), unordered: true },
  mk('Letter Combinations of a Phone Number', 'letterCombinations', 'Return all letter combinations for a digit string (2-9).', 'vector<string> letterCombinations(string digits)', 'return {};', [
    ap('Backtracking', 'O(4ⁿ·n)', 'O(n)', '2n', 'Each digit has up to 4 letters so up to 4ⁿ strings of length n; recursion depth n.', `void build(int index, string& digits, vector<string>& keys, string& current, vector<string>& result) {
    if (index == digits.size()) {
        result.push_back(current);
        return;
    }
    string letters = keys[digits[index] - '0'];
    for (int i = 0; i < letters.size(); i++) {
        current.push_back(letters[i]);
        build(index + 1, digits, keys, current, result);
        current.pop_back();
    }
}

vector<string> letterCombinations(string digits) {
    vector<string> result;
    if (digits.size() == 0) {
        return result;
    }
    vector<string> keys = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};
    string current = "";
    build(0, digits, keys, current, result);
    return result;
}`)], [['23'], [''], ['2'], ['79']], (d: string) => { if (!d) return []; const k = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz']; let r = ['']; for (const c of d) r = r.flatMap(p => [...k[+c]].map(l => p + l)); return r; },
    ['One letter per digit.', 'Backtrack after each choice.'], 'A decision tree with one level per digit.'),
  { ...mk('Palindrome Partitioning', 'partition', 'Partition s so every part is a palindrome; return all partitions.', 'vector<vector<string>> partition(string s)', 'return {};', [
    ap('Backtracking with palindrome check', 'O(n·2ⁿ)', 'O(n)', '2n', 'There are up to 2^(n-1) cut patterns and each palindrome check / copy costs O(n).', `bool isPal(string& s, int l, int r) {
    while (l < r) {
        if (s[l] != s[r]) {
            return false;
        }
        l++;
        r--;
    }
    return true;
}

void build(int start, string& s, vector<string>& current, vector<vector<string>>& result) {
    if (start == s.size()) {
        result.push_back(current);
        return;
    }
    for (int end = start; end < s.size(); end++) {
        if (isPal(s, start, end)) {
            current.push_back(s.substr(start, end - start + 1));
            build(end + 1, s, current, result);
            current.pop_back();
        }
    }
}

vector<vector<string>> partition(string s) {
    vector<vector<string>> result;
    vector<string> current;
    build(0, s, current, result);
    return result;
}`)], [['aab'], ['a'], ['aaa'], ['abba']], (s: string) => { const r: string[][] = []; const pal = (x: string) => x === [...x].reverse().join(''); const g = (i: number, cur: string[]) => { if (i === s.length) { r.push([...cur]); return; } for (let e = i + 1; e <= s.length; e++) { const p = s.slice(i, e); if (pal(p)) { cur.push(p); g(e, cur); cur.pop(); } } }; g(0, []); return r; },
    ['Try every prefix that is a palindrome.'], 'Cut after each palindromic prefix, then partition the rest.'), unordered: true },
  mk('Count all subsequences with sum K', 'countSubsequences', 'Return how many subsequences of nums sum to k.', 'int countSubsequences(vector<int>& nums, int k)', 'return 0;', [
    ap('Take / skip recursion', 'O(2ⁿ)', 'O(n)', '2n', 'Each element is either taken or skipped: 2ⁿ leaves; recursion depth n.', `int count(int index, int remaining, vector<int>& nums) {
    if (index == nums.size()) {
        if (remaining == 0) {
            return 1;
        }
        return 0;
    }
    int take = count(index + 1, remaining - nums[index], nums);
    int skip = count(index + 1, remaining, nums);
    return take + skip;
}

int countSubsequences(vector<int>& nums, int k) {
    return count(0, k, nums);
}`)], [[[1, 2, 3], 3], [[4, 9, 2, 5, 1], 10], [[1, 1, 1], 2], [[5], 4]], (a: number[], k: number) => { let c = 0; for (let m = 0; m < 1 << a.length; m++) { let s = 0; for (let i = 0; i < a.length; i++) if (m >> i & 1) s += a[i]; if (s === k) c++; } return c; },
    ['At each element, pick it or not.'], 'Sum the counts of the two branches.'),
  mk('Check if there exists a subsequence with sum K', 'hasSubsequenceWithSum', 'Return true if some subsequence of nums sums to k.', 'bool hasSubsequenceWithSum(vector<int>& nums, int k)', 'return false;', [
    ap('Recursion with early exit', 'O(2ⁿ)', 'O(n)', '2n', 'Worst case explores all 2ⁿ choices, but returns as soon as one succeeds.', `bool search(int index, int remaining, vector<int>& nums) {
    if (remaining == 0) {
        return true;
    }
    if (index == nums.size() || remaining < 0) {
        return false;
    }
    if (search(index + 1, remaining - nums[index], nums)) {
        return true;
    }
    return search(index + 1, remaining, nums);
}

bool hasSubsequenceWithSum(vector<int>& nums, int k) {
    return search(0, k, nums);
}`)], [[[1, 2, 3], 5], [[4, 9, 2], 20], [[1], 1], [[3, 4], 0]], (a: number[], k: number) => { for (let m = 0; m < 1 << a.length; m++) { let s = 0; for (let i = 0; i < a.length; i++) if (m >> i & 1) s += a[i]; if (s === k) return true; } return false; },
    ['Return true as soon as one branch succeeds.'], 'Stop exploring once an answer exists.'),

  // ---------- maths & bits ----------
  mk('Count Digits', 'countDigits', 'Return the number of digits of n (n >= 0).', 'int countDigits(int n)', 'return 0;', [
    ap('Repeated division', 'O(log n)', 'O(1)', 'logn', 'Dividing by 10 removes one digit per step; a number n has about log10(n) digits.', `int countDigits(int n) {
    if (n == 0) {
        return 1;
    }
    int count = 0;
    while (n > 0) {
        count++;
        n = n / 10;
    }
    return count;
}`)], [[0], [7], [1234], [100000], [99]], (n: number) => String(n).length, ['Divide by 10 until zero.'], 'Each division drops the last digit.'),
  mk('Reverse a Number', 'reverseNumber', 'Reverse the digits of n (n >= 0).', 'int reverseNumber(int n)', 'return 0;', [
    ap('Digit extraction', 'O(log n)', 'O(1)', 'logn', 'One loop iteration per digit.', `int reverseNumber(int n) {
    int reversed = 0;
    while (n > 0) {
        int digit = n % 10;
        reversed = reversed * 10 + digit;
        n = n / 10;
    }
    return reversed;
}`)], [[1234], [100], [7], [0], [9876]], (n: number) => Number([...String(n)].reverse().join('')), ['n % 10 gives the last digit.'], 'Pop digits from n and push them onto the result.'),
  mk('Check Palindrome', 'isNumberPalindrome', 'Return true if the non-negative integer reads the same reversed.', 'bool isNumberPalindrome(int n)', 'return false;', [
    ap('Reverse and compare', 'O(log n)', 'O(1)', 'logn', 'One pass over the digits.', `bool isNumberPalindrome(int n) {
    int original = n;
    int reversed = 0;
    while (n > 0) {
        reversed = reversed * 10 + n % 10;
        n = n / 10;
    }
    return original == reversed;
}`)], [[121], [123], [0], [1221], [10]], (n: number) => String(n) === [...String(n)].reverse().join(''), ['Reverse the number then compare with the original.'], 'A palindromic number equals its reversal.'),
  mk('Armstrong Numbers', 'isArmstrong', 'Return true if n equals the sum of its digits each raised to the number of digits.', 'bool isArmstrong(int n)', 'return false;', [
    ap('Digit powers', 'O(d²)', 'O(1)', 'logn', 'd digits, each raised to the power d by repeated multiplication.', `bool isArmstrong(int n) {
    int digits = 0;
    int temp = n;
    while (temp > 0) {
        digits++;
        temp = temp / 10;
    }
    int sum = 0;
    temp = n;
    while (temp > 0) {
        int d = temp % 10;
        int power = 1;
        for (int i = 0; i < digits; i++) {
            power = power * d;
        }
        sum += power;
        temp = temp / 10;
    }
    return sum == n;
}`)], [[153], [370], [123], [9474], [10]], (n: number) => { const s = String(n); return [...s].reduce((t, c) => t + (+c) ** s.length, 0) === n; }, ['Count the digits first.'], 'Sum digit^count and compare.'),
  mk('Print all Divisors', 'divisors', 'Return all divisors of n in increasing order.', 'vector<int> divisors(int n)', 'return {};', [
    ap('Check up to √n', 'O(√n)', 'O(√n)', 'logn', 'Divisors come in pairs (i, n/i), so only i ≤ √n needs testing.', `vector<int> divisors(int n) {
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
}`)], [[36], [1], [13], [100], [12]], (n: number) => { const d: number[] = []; for (let i = 1; i <= n; i++) if (n % i === 0) d.push(i); return d; }, ['If i divides n then so does n / i.'], 'Pair up divisors around √n.'),
  mk('Check for Prime', 'isPrime', 'Return true if n is prime.', 'bool isPrime(int n)', 'return false;', [
    ap('Trial division up to √n', 'O(√n)', 'O(1)', 'logn', 'A composite number has a factor at most √n.', `bool isPrime(int n) {
    if (n < 2) {
        return false;
    }
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) {
            return false;
        }
    }
    return true;
}`)], [[1], [2], [3], [4], [17], [25], [97], [100]], (n: number) => { if (n < 2) return false; for (let i = 2; i < n; i++) if (n % i === 0) return false; return true; }, ['You only need to test factors up to √n.'], 'If n = a·b then one of them is at most √n.'),
  mk('Sieve of Eratosthenes', 'countPrimes', 'Return how many primes are <= n.', 'int countPrimes(int n)', 'return 0;', [
    ap('Sieve', 'O(n log log n)', 'O(n)', 'nlogn', 'Crossing out multiples of each prime p starts at p² and costs n/p; the harmonic sum over primes gives n log log n. The boolean table is O(n).', `int countPrimes(int n) {
    if (n < 2) {
        return 0;
    }
    vector<bool> isPrime(n + 1, true);
    isPrime[0] = false;
    isPrime[1] = false;
    for (int p = 2; p * p <= n; p++) {
        if (isPrime[p]) {
            for (int multiple = p * p; multiple <= n; multiple += p) {
                isPrime[multiple] = false;
            }
        }
    }
    int count = 0;
    for (int i = 2; i <= n; i++) {
        if (isPrime[i]) {
            count++;
        }
    }
    return count;
}`)], [[0], [10], [2], [30], [50]], (n: number) => { let c = 0; for (let i = 2; i <= n; i++) { let p = true; for (let j = 2; j * j <= i; j++) if (i % j === 0) p = false; if (p) c++; } return c; }, ['Cross out multiples of each prime, starting at p².'], 'Primes are what is left after removing every multiple of smaller primes.'),
  mk('Power(x, n)', 'power', 'Return x^n for integers (x small, n >= 0).', 'int power(int x, int n)', 'return 1;', [
    ap('Fast exponentiation', 'O(log n)', 'O(log n)', 'logn', 'Squaring halves the exponent each call: log2(n) recursive calls versus n multiplications for the naive loop.', `int power(int x, int n) {
    if (n == 0) {
        return 1;
    }
    int half = power(x, n / 2);
    if (n % 2 == 0) {
        return half * half;
    }
    return half * half * x;
}`)], [[2, 10], [3, 5], [5, 0], [1, 100], [7, 3]], (x: number, n: number) => x ** n, ['x^n = (x^(n/2))² (times x if n is odd).'], 'Halving the exponent beats multiplying n times.'),
  mk('Find XOR of numbers from L to R', 'xorRange', 'Return l ^ (l+1) ^ ... ^ r.', 'int xorRange(int l, int r)', 'return 0;', [
    ap('Prefix XOR pattern', 'O(1)', 'O(1)', '1', 'XOR of 1..n repeats with period 4 (n, 1, n+1, 0), so a prefix XOR is O(1); the range is prefix(r) ^ prefix(l-1).', `int prefixXor(int n) {
    if (n % 4 == 0) {
        return n;
    }
    if (n % 4 == 1) {
        return 1;
    }
    if (n % 4 == 2) {
        return n + 1;
    }
    return 0;
}

int xorRange(int l, int r) {
    return prefixXor(r) ^ prefixXor(l - 1);
}`)], [[3, 5], [1, 4], [5, 5], [10, 20], [1, 1]], (l: number, r: number) => { let x = 0; for (let i = l; i <= r; i++) x ^= i; return x; }, ['XOR of 1..n follows a pattern of period 4.'], 'Range XOR = prefix XOR(r) ^ prefix XOR(l-1).'),
  mk('Minimum bit flips to convert number', 'minBitFlips', 'Return the number of bit flips to turn a into b.', 'int minBitFlips(int a, int b)', 'return 0;', [
    ap('XOR then count set bits', 'O(log n)', 'O(1)', 'logn', 'a ^ b has a 1 exactly where the bits differ; Kernighan counts them in (number of set bits) steps.', `int minBitFlips(int a, int b) {
    int diff = a ^ b;
    int count = 0;
    while (diff != 0) {
        diff = diff & (diff - 1);
        count++;
    }
    return count;
}`)], [[10, 7], [3, 4], [5, 5], [0, 255], [8, 1]], (a: number, b: number) => (a ^ b).toString(2).replace(/0/g, '').length, ['Where do the two numbers differ?'], 'XOR marks the differing bits; count them.'),
  mk('Find the number that appears odd number of times', 'oddOccurring', 'Exactly one value appears an odd number of times; return it.', 'int oddOccurring(vector<int>& nums)', 'return 0;', [
    ap('XOR everything', 'O(n)', 'O(1)', 'n', 'Even counts cancel to 0 under XOR.', `int oddOccurring(vector<int>& nums) {
    int result = 0;
    for (int i = 0; i < nums.size(); i++) {
        result = result ^ nums[i];
    }
    return result;
}`)], [[[1, 2, 3, 2, 3, 1, 3]], [[5]], [[4, 4, 4]], [[2, 2, 7, 7, 9]]], (a: number[]) => a.find(x => a.filter(y => y === x).length % 2 === 1), ['XOR cancels pairs.'], 'Pairs vanish; the odd one remains.'),
];

