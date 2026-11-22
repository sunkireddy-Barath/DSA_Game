// Playable problems: real C++ solutions executed by the tracer.
// `ref` is an independent JS reference implementation used to generate expected outputs.
import { Playable, cls, stub } from './kit';
export * from './kit';
import { PTR_PROBLEMS } from './problemsPtr';
import { CORE_PROBLEMS } from './problemsCore';
import { ADV_PROBLEMS } from './problemsAdv';
import { B1_PROBLEMS } from './problemsB1';
import { B2_PROBLEMS } from './problemsB2';
import { B3_PROBLEMS } from './problemsB3';
import { B4_PROBLEMS } from './problemsB4';
import { B5_PROBLEMS } from './problemsB5';
import { B6_PROBLEMS } from './problemsB6';
import { B7_PROBLEMS } from './problemsB7';
import { B8_PROBLEMS } from './problemsB8';

const BASE: Playable[] = [
  {
    title: 'Largest Element in an Array', fn: 'largestElement',
    statement: 'Given an array nums, return its largest element.', constraints: ['1 <= n <= 10^5'],
    starter: stub('int largestElement(vector<int>& nums)'),
    approaches: [{
      label: 'Single pass', time: 'O(n)', space: 'O(1)', growth: 'n',
      why: 'Every element is compared with the running maximum exactly once, so n-1 comparisons. Only one extra variable is kept.',
      code: cls(`int largestElement(vector<int>& nums) {
    int maximum = nums[0];
    for (int i = 1; i < nums.size(); i++) {
        if (nums[i] > maximum) {
            maximum = nums[i];
        }
    }
    return maximum;
}`) }],
    tests: [[[3, 7, 2, 9, 4]], [[5]], [[-3, -1, -7]], [[1, 2, 3, 4, 5]], [[9, 1]], [[2, 2, 2]]], defaultArgs: [[3, 7, 2, 9, 4]],
    ref: (a: number[]) => Math.max(...a),
    hints: ['Keep one variable that remembers the best value seen so far.', 'Start it with the first element, then scan the rest.', 'Update it only when the current element is strictly larger.'],
    intuition: 'The maximum of the first i+1 elements is either the maximum of the first i elements or the new element.',
  },
  {
    title: 'Check if the array is sorted', fn: 'isSorted',
    statement: 'Return true if nums is sorted in non-decreasing order.', constraints: ['1 <= n <= 10^5'],
    starter: stub('bool isSorted(vector<int>& nums)', 'return false;'),
    approaches: [{
      label: 'Adjacent comparison', time: 'O(n)', space: 'O(1)', growth: 'n',
      why: 'An array is sorted iff every adjacent pair is ordered, so at most n-1 comparisons; we stop at the first violation.',
      code: cls(`bool isSorted(vector<int>& nums) {
    for (int i = 1; i < nums.size(); i++) {
        if (nums[i] < nums[i - 1]) {
            return false;
        }
    }
    return true;
}`) }],
    tests: [[[1, 2, 3, 4]], [[1, 3, 2]], [[5]], [[2, 2, 2]], [[3, 1]], [[1, 2, 2, 5, 9]]], defaultArgs: [[1, 2, 5, 4, 6]],
    ref: (a: number[]) => a.every((x, i) => i === 0 || a[i - 1] <= x),
    hints: ['Compare each element with its left neighbour.', 'One out-of-order pair is enough to answer false.'],
    intuition: 'Sortedness is a local property: it holds globally exactly when it holds for every adjacent pair.',
  },
  {
    title: 'Linear Search', fn: 'linearSearch',
    statement: 'Return the index of target in nums, or -1 if absent.', constraints: ['1 <= n <= 10^5'],
    starter: stub('int linearSearch(vector<int>& nums, int target)', 'return -1;'),
    approaches: [{
      label: 'Scan left to right', time: 'O(n)', space: 'O(1)', growth: 'n',
      why: 'Worst case (absent or last) inspects all n elements; best case (first element) inspects 1. No extra memory.',
      code: cls(`int linearSearch(vector<int>& nums, int target) {
    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] == target) {
            return i;
        }
    }
    return -1;
}`) }],
    tests: [[[4, 8, 15, 16], 15], [[4, 8, 15, 16], 4], [[4, 8, 15, 16], 99], [[7], 7], [[1, 2, 3, 2], 2]], defaultArgs: [[4, 8, 15, 16, 23], 16],
    ref: (a: number[], t: number) => a.indexOf(t),
    hints: ['Check each index in order.', 'Return as soon as you find a match.'],
    intuition: 'With no structure to exploit, every element may be the answer.',
  },
  {
    title: 'Bubble Sort', fn: 'bubbleSort', checkArg: 0,
    statement: 'Sort nums in place in ascending order using bubble sort.', constraints: ['1 <= n <= 1000'],
    starter: stub('void bubbleSort(vector<int>& nums)', ''),
    approaches: [{
      label: 'Bubble sort with early exit', time: 'O(n²)', space: 'O(1)', growth: 'n2',
      why: 'Pass k bubbles the k-th largest to its final place; there are up to n-1 passes of up to n-1 comparisons. The swapped flag makes the best case (already sorted) O(n).',
      code: cls(`void bubbleSort(vector<int>& nums) {
    int n = nums.size();
    for (int pass = 0; pass < n - 1; pass++) {
        bool swapped = false;
        for (int j = 0; j < n - 1 - pass; j++) {
            if (nums[j] > nums[j + 1]) {
                swap(nums[j], nums[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) {
            break;
        }
    }
}`) }],
    tests: [[[5, 1, 4, 2, 8]], [[1, 2, 3]], [[3, 2, 1]], [[1]], [[2, 2, 1, 1]], [[9, -1, 0, 5, 3, 3]]], defaultArgs: [[5, 1, 4, 2, 8]],
    ref: (a: number[]) => [...a].sort((x, y) => x - y),
    hints: ['Compare neighbours and swap them if they are out of order.', 'After one full pass the largest element sits at the end.', 'Each next pass can ignore the already-placed tail.'],
    intuition: 'Large values "bubble" to the right, one final position per pass.',
  },
  {
    title: 'Selection Sort', fn: 'selectionSort', checkArg: 0,
    statement: 'Sort nums in place using selection sort.', constraints: ['1 <= n <= 1000'],
    starter: stub('void selectionSort(vector<int>& nums)', ''),
    approaches: [{
      label: 'Selection sort', time: 'O(n²)', space: 'O(1)', growth: 'n2',
      why: 'Finding the minimum of the unsorted part costs n-i-1 comparisons for each i, which sums to n(n-1)/2 regardless of input order. Only n-1 swaps occur.',
      code: cls(`void selectionSort(vector<int>& nums) {
    int n = nums.size();
    for (int i = 0; i < n - 1; i++) {
        int minIndex = i;
        for (int j = i + 1; j < n; j++) {
            if (nums[j] < nums[minIndex]) {
                minIndex = j;
            }
        }
        swap(nums[i], nums[minIndex]);
    }
}`) }],
    tests: [[[64, 25, 12, 22, 11]], [[1, 2, 3]], [[3, 2, 1]], [[1]], [[4, 4, 1]], [[0, -5, 3, 9, -2]]], defaultArgs: [[64, 25, 12, 22, 11]],
    ref: (a: number[]) => [...a].sort((x, y) => x - y),
    hints: ['Find the smallest element of the unsorted part.', 'Swap it into the first unsorted position.'],
    intuition: 'The sorted prefix grows by one element each round: the minimum of the rest.',
  },
  {
    title: 'Insertion Sort', fn: 'insertionSort', checkArg: 0,
    statement: 'Sort nums in place using insertion sort.', constraints: ['1 <= n <= 1000'],
    starter: stub('void insertionSort(vector<int>& nums)', ''),
    approaches: [{
      label: 'Insertion sort', time: 'O(n²)', space: 'O(1)', growth: 'n2',
      why: 'Each element may shift past all earlier ones (reverse-sorted: n(n-1)/2 shifts). On already sorted input the while loop never runs, giving O(n).',
      code: cls(`void insertionSort(vector<int>& nums) {
    for (int i = 1; i < nums.size(); i++) {
        int key = nums[i];
        int j = i - 1;
        while (j >= 0 && nums[j] > key) {
            nums[j + 1] = nums[j];
            j--;
        }
        nums[j + 1] = key;
    }
}`) }],
    tests: [[[12, 11, 13, 5, 6]], [[1, 2, 3]], [[3, 2, 1]], [[1]], [[2, 2, 2, 1]], [[7, -3, 0]]], defaultArgs: [[12, 11, 13, 5, 6]],
    ref: (a: number[]) => [...a].sort((x, y) => x - y),
    hints: ['Treat the prefix as already sorted.', 'Take the next element and slide larger ones right.', 'Drop the element into the gap.'],
    intuition: 'Like sorting a hand of cards: insert each new card into its place among the ones you hold.',
  },
  {
    title: 'Binary Search to find X in sorted array', fn: 'search',
    statement: 'Given a sorted array and target, return the index of target or -1.', constraints: ['1 <= n <= 10^5', 'nums sorted ascending, distinct'],
    starter: stub('int search(vector<int>& nums, int target)', 'return -1;'),
    approaches: [
      { label: 'Linear scan', time: 'O(n)', space: 'O(1)', growth: 'n', why: 'Ignores the sorted order, so up to n elements are checked.',
        code: cls(`int search(vector<int>& nums, int target) {
    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] == target) {
            return i;
        }
    }
    return -1;
}`) },
      { label: 'Binary search', time: 'O(log n)', space: 'O(1)', growth: 'logn', why: 'Each comparison discards half of the remaining range: n, n/2, n/4 ... 1 takes about log2(n) steps. Only low/high/mid are stored.',
        code: cls(`int search(vector<int>& nums, int target) {
    int low = 0;
    int high = nums.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] == target) {
            return mid;
        } else if (nums[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}`) }],
    tests: [[[1, 3, 5, 7, 9, 11], 7], [[1, 3, 5, 7, 9, 11], 1], [[1, 3, 5, 7, 9, 11], 11], [[1, 3, 5, 7, 9, 11], 4], [[5], 5], [[5], 2], [[2, 4, 6, 8], 8]], defaultArgs: [[1, 3, 5, 7, 9, 11, 13], 9],
    ref: (a: number[], t: number) => a.indexOf(t),
    hints: ['The array is sorted: one comparison can rule out half of it.', 'Keep low and high; test the middle.', 'If nums[mid] < target the answer must be to the right.'],
    intuition: 'Sortedness lets a single comparison eliminate half the candidates.',
  },
  {
    title: 'Implement Lower Bound', fn: 'lowerBound',
    statement: 'Return the first index i with nums[i] >= x, or n if there is none. nums is sorted.', constraints: ['1 <= n <= 10^5'],
    starter: stub('int lowerBound(vector<int>& nums, int x)', 'return 0;'),
    approaches: [{ label: 'Binary search on the boundary', time: 'O(log n)', space: 'O(1)', growth: 'logn',
      why: 'The predicate nums[i] >= x is false...false true...true, so halving finds the boundary in log2(n) steps.',
      code: cls(`int lowerBound(vector<int>& nums, int x) {
    int low = 0;
    int high = nums.size();
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] >= x) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}`) }],
    tests: [[[1, 2, 4, 4, 7], 4], [[1, 2, 4, 4, 7], 0], [[1, 2, 4, 4, 7], 8], [[1, 2, 4, 4, 7], 5], [[3], 3]], defaultArgs: [[1, 2, 4, 4, 7], 4],
    ref: (a: number[], x: number) => { let i = 0; while (i < a.length && a[i] < x) i++; return i; },
    hints: ['You are looking for the first position where nums[i] >= x.', 'When nums[mid] >= x, mid might be the answer; keep it in range.'],
    intuition: 'A sorted array turns the question into a boundary between "too small" and "big enough".',
  },
  {
    title: 'Fibonacci Number', fn: 'fib',
    statement: 'Return the n-th Fibonacci number (fib(0)=0, fib(1)=1).', constraints: ['0 <= n <= 20'],
    starter: stub('int fib(int n)'),
    approaches: [
      { label: 'Plain recursion', time: 'O(2ⁿ)', space: 'O(n)', growth: '2n',
        why: 'fib(n) calls fib(n-1) and fib(n-2), and the same subproblems are recomputed; the call tree grows by about φⁿ. The recursion stack is at most n deep, so space is O(n).',
        code: cls(`int fib(int n) {
    if (n <= 1) {
        return n;
    }
    return fib(n - 1) + fib(n - 2);
}`) },
      { label: 'Memoization', time: 'O(n)', space: 'O(n)', growth: 'n',
        why: 'Each fib(k) is computed once and cached, so only n distinct subproblems exist. The memo table and recursion stack are both O(n).',
        code: cls(`int go(int n, vector<int>& memo) {
    if (n <= 1) {
        return n;
    }
    if (memo[n] != -1) {
        return memo[n];
    }
    memo[n] = go(n - 1, memo) + go(n - 2, memo);
    return memo[n];
}

int fib(int n) {
    vector<int> memo(n + 1, -1);
    return go(n, memo);
}`) },
      { label: 'Tabulation (space-optimized)', time: 'O(n)', space: 'O(1)', growth: 'n',
        why: 'Bottom-up loop does n-1 additions. Only the last two values are needed, so two variables replace the table.',
        code: cls(`int fib(int n) {
    if (n <= 1) {
        return n;
    }
    int prev = 0;
    int curr = 1;
    for (int i = 2; i <= n; i++) {
        int next = prev + curr;
        prev = curr;
        curr = next;
    }
    return curr;
}`) }],
    tests: [[0], [1], [2], [5], [8], [10], [15]], defaultArgs: [4],
    ref: (n: number): number => (n <= 1 ? n : (() => { let a = 0, b = 1; for (let i = 2; i <= n; i++) [a, b] = [b, a + b]; return b; })()),
    hints: ['Base cases: n = 0 and n = 1.', 'Every other value is the sum of the previous two.', 'Notice repeated calls in the tree: cache them.'],
    intuition: 'The call tree reveals overlapping subproblems; that is exactly what DP removes.',
  },
  {
    title: 'Factorial of N Numbers', fn: 'factorial',
    statement: 'Return n! for 0 <= n <= 12.', constraints: ['0 <= n <= 12'],
    starter: stub('int factorial(int n)', 'return 1;'),
    approaches: [{ label: 'Recursion', time: 'O(n)', space: 'O(n)', growth: 'n',
      why: 'One call per value n..0 (a single chain, n+1 calls). The call stack holds all of them at the deepest point: O(n) space.',
      code: cls(`int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}`) }],
    tests: [[0], [1], [3], [5], [10], [12]], defaultArgs: [5],
    ref: (n: number): number => (n <= 1 ? 1 : n * (n - 1 <= 1 ? 1 : (() => { let r = 1; for (let i = 2; i < n; i++) r *= i; return r; })())),
    hints: ['n! = n * (n-1)!', 'What is the smallest case you can answer directly?'],
    intuition: 'Each call waits for the smaller problem, then multiplies on the way back up.',
  },
  {
    title: 'GCD or HCF', fn: 'findGcd',
    statement: 'Return gcd(a, b) for a, b >= 1.', constraints: ['1 <= a, b <= 10^9'],
    starter: stub('int findGcd(int a, int b)', 'return 1;'),
    approaches: [{ label: "Euclid's algorithm", time: 'O(log(min(a,b)))', space: 'O(log(min(a,b)))', growth: 'logn',
      why: 'gcd(a,b)=gcd(b, a mod b) and a mod b < a/2 after two steps, so the arguments shrink geometrically. The recursion depth is the same logarithm.',
      code: cls(`int findGcd(int a, int b) {
    if (b == 0) {
        return a;
    }
    return findGcd(b, a % b);
}`) }],
    tests: [[48, 18], [7, 13], [100, 25], [1, 1], [270, 192], [17, 17]], defaultArgs: [48, 18],
    ref: (a: number, b: number): number => { while (b) [a, b] = [b, a % b]; return a; },
    hints: ['gcd(a, b) = gcd(b, a % b).', 'When b becomes 0, a is the answer.'],
    intuition: 'Any common divisor of a and b also divides a mod b, so the problem keeps shrinking.',
  },
  {
    title: 'Two Sum', fn: 'twoSum',
    statement: 'Return indices of the two numbers that add up to target (exactly one solution exists; return the pair [earlier, later]).', constraints: ['2 <= n <= 10^4'],
    starter: stub('vector<int> twoSum(vector<int>& nums, int target)', 'return {};'),
    approaches: [
      { label: 'Brute force pairs', time: 'O(n²)', space: 'O(1)', growth: 'n2', why: 'Every pair (i, j) is tested: n(n-1)/2 sums. No extra memory.',
        code: cls(`vector<int> twoSum(vector<int>& nums, int target) {
    for (int i = 0; i < nums.size(); i++) {
        for (int j = i + 1; j < nums.size(); j++) {
            if (nums[i] + nums[j] == target) {
                return {i, j};
            }
        }
    }
    return {};
}`) },
      { label: 'Hash map', time: 'O(n)', space: 'O(n)', growth: 'n', why: 'One pass; each hash lookup/insert is O(1) on average. The map may store up to n elements.',
        code: cls(`vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> mp;
    for (int i = 0; i < nums.size(); i++) {
        int need = target - nums[i];
        if (mp.count(need)) {
            return {mp[need], i};
        }
        mp[nums[i]] = i;
    }
    return {};
}`) }],
    tests: [[[2, 7, 11, 15], 9], [[3, 2, 4], 6], [[3, 3], 6], [[1, 5, 3, 8], 11], [[-1, -2, -3, -4, -5], -8]], defaultArgs: [[2, 7, 11, 15], 9],
    ref: (a: number[], t: number) => { for (let j = 0; j < a.length; j++) for (let i = 0; i < j; i++) if (a[i] + a[j] === t) return [i, j]; return []; },
    hints: ['For each number, which partner would complete the sum?', 'How could you check whether that partner was already seen in O(1)?', 'Store value -> index as you scan.'],
    intuition: 'Trade memory for time: remember what you have seen so the partner lookup is constant time.',
  },
  {
    title: "Kadane's Algorithm, maximum subarray sum", fn: 'maxSubArray',
    statement: 'Return the largest sum of a non-empty contiguous subarray.', constraints: ['1 <= n <= 10^5'],
    starter: stub('int maxSubArray(vector<int>& nums)'),
    approaches: [
      { label: 'Brute force', time: 'O(n²)', space: 'O(1)', growth: 'n2', why: 'For each start i, extend j and keep a running sum: n(n+1)/2 additions.',
        code: cls(`int maxSubArray(vector<int>& nums) {
    int best = nums[0];
    for (int i = 0; i < nums.size(); i++) {
        int sum = 0;
        for (int j = i; j < nums.size(); j++) {
            sum += nums[j];
            best = max(best, sum);
        }
    }
    return best;
}`) },
      { label: "Kadane's", time: 'O(n)', space: 'O(1)', growth: 'n', why: 'A single pass: the best subarray ending at i is max(nums[i], previous best + nums[i]). Two variables only.',
        code: cls(`int maxSubArray(vector<int>& nums) {
    int current = nums[0];
    int best = nums[0];
    for (int i = 1; i < nums.size(); i++) {
        current = max(nums[i], current + nums[i]);
        best = max(best, current);
    }
    return best;
}`) }],
    tests: [[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], [[1]], [[5, 4, -1, 7, 8]], [[-3, -1, -2]], [[2, -1, 2]], [[0, 0, 0]]], defaultArgs: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]],
    ref: (a: number[]) => { let b = -Infinity; for (let i = 0; i < a.length; i++) { let s = 0; for (let j = i; j < a.length; j++) { s += a[j]; b = Math.max(b, s); } } return b; },
    hints: ['At each index, decide: extend the previous subarray or start fresh here.', 'A negative running sum only hurts: drop it.'],
    intuition: 'A prefix with a negative sum can never help a later subarray, so restart.',
  },
  {
    title: 'Stock Buy and Sell', fn: 'maxProfit',
    statement: 'prices[i] is the price on day i. Buy once then sell once later; return the maximum profit (0 if none).', constraints: ['1 <= n <= 10^5'],
    starter: stub('int maxProfit(vector<int>& prices)'),
    approaches: [{ label: 'Track minimum so far', time: 'O(n)', space: 'O(1)', growth: 'n',
      why: 'The best sale on day i uses the cheapest earlier day; maintaining that minimum makes each day O(1).',
      code: cls(`int maxProfit(vector<int>& prices) {
    int minPrice = prices[0];
    int profit = 0;
    for (int i = 1; i < prices.size(); i++) {
        profit = max(profit, prices[i] - minPrice);
        minPrice = min(minPrice, prices[i]);
    }
    return profit;
}`) }],
    tests: [[[7, 1, 5, 3, 6, 4]], [[7, 6, 4, 3, 1]], [[1, 2]], [[2, 4, 1]], [[3, 3, 3]]], defaultArgs: [[7, 1, 5, 3, 6, 4]],
    ref: (p: number[]) => { let b = 0; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) b = Math.max(b, p[j] - p[i]); return b; },
    hints: ['If you sell today, what is the best day to have bought?', 'Remember the cheapest price seen so far.'],
    intuition: 'Selling on day i is only about the minimum price before i.',
  },
  {
    title: 'Move Zeros to end', fn: 'moveZeroes', checkArg: 0,
    statement: 'Move all zeros to the end in place, keeping the order of non-zero elements.', constraints: ['1 <= n <= 10^4'],
    starter: stub('void moveZeroes(vector<int>& nums)', ''),
    approaches: [{ label: 'Two pointers', time: 'O(n)', space: 'O(1)', growth: 'n',
      why: 'The read pointer i visits each element once; the write pointer only advances for non-zeros. In-place so no extra memory.',
      code: cls(`void moveZeroes(vector<int>& nums) {
    int write = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] != 0) {
            swap(nums[write], nums[i]);
            write++;
        }
    }
}`) }],
    tests: [[[0, 1, 0, 3, 12]], [[0]], [[1, 2, 3]], [[0, 0, 1]], [[4, 0, 0, 5, 0, 6]]], defaultArgs: [[0, 1, 0, 3, 12]],
    ref: (a: number[]) => [...a.filter(x => x !== 0), ...a.filter(x => x === 0)],
    hints: ['Keep a "write" index for where the next non-zero belongs.', 'Swap instead of overwrite so zeros drift right.'],
    intuition: 'Everything left of write is final: the non-zeros seen so far, in order.',
  },
  {
    title: 'Remove duplicates from Sorted array', fn: 'removeDuplicates',
    statement: 'Remove duplicates from sorted nums in place; return the count k of unique elements (first k slots hold them).', constraints: ['1 <= n <= 10^4'],
    starter: stub('int removeDuplicates(vector<int>& nums)'),
    approaches: [{ label: 'Two pointers', time: 'O(n)', space: 'O(1)', growth: 'n',
      why: 'One pass with a read index and a write index; duplicates are skipped because the array is sorted.',
      code: cls(`int removeDuplicates(vector<int>& nums) {
    int k = 1;
    for (int i = 1; i < nums.size(); i++) {
        if (nums[i] != nums[k - 1]) {
            nums[k] = nums[i];
            k++;
        }
    }
    return k;
}`) }],
    tests: [[[1, 1, 2]], [[0, 0, 1, 1, 1, 2, 2, 3, 3, 4]], [[1]], [[1, 2, 3]], [[5, 5, 5, 5]]], defaultArgs: [[0, 0, 1, 1, 1, 2, 2, 3, 3, 4]],
    ref: (a: number[]) => new Set(a).size,
    hints: ['Equal values are adjacent because it is sorted.', 'Write a value only when it differs from the last kept value.'],
    intuition: 'The kept prefix is always a sorted list of distinct values.',
  },
  {
    title: 'Find missing number', fn: 'missingNumber',
    statement: 'nums contains n distinct numbers from 0..n. Return the missing one.', constraints: ['1 <= n <= 10^4'],
    starter: stub('int missingNumber(vector<int>& nums)'),
    approaches: [
      { label: 'Sum formula', time: 'O(n)', space: 'O(1)', growth: 'n', why: 'Expected sum n(n+1)/2 minus the actual sum; one pass to add.',
        code: cls(`int missingNumber(vector<int>& nums) {
    int n = nums.size();
    int expected = n * (n + 1) / 2;
    int actual = 0;
    for (int i = 0; i < n; i++) {
        actual += nums[i];
    }
    return expected - actual;
}`) },
      { label: 'XOR', time: 'O(n)', space: 'O(1)', growth: 'n', why: 'x ^ x = 0, so XORing all indices and values leaves only the missing number; avoids overflow.',
        code: cls(`int missingNumber(vector<int>& nums) {
    int result = nums.size();
    for (int i = 0; i < nums.size(); i++) {
        result ^= i ^ nums[i];
    }
    return result;
}`) }],
    tests: [[[3, 0, 1]], [[0, 1]], [[9, 6, 4, 2, 3, 5, 7, 0, 1]], [[0]], [[1]]], defaultArgs: [[3, 0, 1]],
    ref: (a: number[]) => { const s = new Set(a); for (let i = 0; i <= a.length; i++) if (!s.has(i)) return i; return -1; },
    hints: ['What would the sum of 0..n be?', 'Or: XOR cancels equal numbers.'],
    intuition: 'Compare what should be there with what is there; the difference is the answer.',
  },
  {
    title: 'Find the number that appears once, and other numbers twice', fn: 'singleNumber',
    statement: 'Every element appears twice except one. Return that one.', constraints: ['1 <= n <= 10^5, n odd'],
    starter: stub('int singleNumber(vector<int>& nums)'),
    approaches: [{ label: 'XOR', time: 'O(n)', space: 'O(1)', growth: 'n',
      why: 'XOR is commutative and a ^ a = 0, so pairs cancel and the single value remains. One pass, one variable.',
      code: cls(`int singleNumber(vector<int>& nums) {
    int result = 0;
    for (int i = 0; i < nums.size(); i++) {
        result ^= nums[i];
    }
    return result;
}`) }],
    tests: [[[2, 2, 1]], [[4, 1, 2, 1, 2]], [[1]], [[7, 3, 7]], [[5, 6, 5, 9, 6]]], defaultArgs: [[4, 1, 2, 1, 2]],
    ref: (a: number[]) => a.find(x => a.filter(y => y === x).length === 1),
    hints: ['A hash map of counts works. Can you do it with no memory?', 'What is x ^ x? What is x ^ 0?'],
    intuition: 'XOR cancels identical bits; matching pairs vanish.',
  },
  {
    title: 'Maximum Consecutive Ones', fn: 'findMaxConsecutiveOnes',
    statement: 'Return the maximum number of consecutive 1s in a binary array.', constraints: ['1 <= n <= 10^5'],
    starter: stub('int findMaxConsecutiveOnes(vector<int>& nums)'),
    approaches: [{ label: 'Running count', time: 'O(n)', space: 'O(1)', growth: 'n',
      why: 'One pass; a 0 resets the current streak, a 1 extends it.',
      code: cls(`int findMaxConsecutiveOnes(vector<int>& nums) {
    int best = 0;
    int streak = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] == 1) {
            streak++;
            best = max(best, streak);
        } else {
            streak = 0;
        }
    }
    return best;
}`) }],
    tests: [[[1, 1, 0, 1, 1, 1]], [[1, 0, 1, 1, 0, 1]], [[0, 0]], [[1]], [[1, 1, 1]]], defaultArgs: [[1, 1, 0, 1, 1, 1]],
    ref: (a: number[]) => Math.max(0, ...a.join('').split('0').map(s => s.length)),
    hints: ['Count the current run of ones.', 'Reset when you meet a zero; track the best run.'],
    intuition: 'A zero breaks the streak; the answer is the longest streak seen.',
  },
  {
    title: 'Majority Element (>n/2 times)', fn: 'majorityElement',
    statement: 'Return the element that appears more than n/2 times (guaranteed to exist).', constraints: ['1 <= n <= 5*10^4'],
    starter: stub('int majorityElement(vector<int>& nums)'),
    approaches: [
      { label: 'Hash map counts', time: 'O(n)', space: 'O(n)', growth: 'n', why: 'One pass of O(1) map updates; the map may hold up to n/2+1 distinct keys.',
        code: cls(`int majorityElement(vector<int>& nums) {
    unordered_map<int, int> freq;
    for (int i = 0; i < nums.size(); i++) {
        freq[nums[i]]++;
        if (freq[nums[i]] > nums.size() / 2) {
            return nums[i];
        }
    }
    return -1;
}`) },
      { label: 'Boyer-Moore voting', time: 'O(n)', space: 'O(1)', growth: 'n', why: 'Each non-majority element can cancel at most one majority vote; since the majority has more than half the votes it survives. Two variables only.',
        code: cls(`int majorityElement(vector<int>& nums) {
    int candidate = 0;
    int votes = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (votes == 0) {
            candidate = nums[i];
        }
        if (nums[i] == candidate) {
            votes++;
        } else {
            votes--;
        }
    }
    return candidate;
}`) }],
    tests: [[[3, 2, 3]], [[2, 2, 1, 1, 1, 2, 2]], [[1]], [[5, 5, 5, 1, 2]], [[6, 6, 7, 7, 7]]], defaultArgs: [[2, 2, 1, 1, 1, 2, 2]],
    ref: (a: number[]) => a.find(x => a.filter(y => y === x).length > a.length / 2),
    hints: ['Counting works. Can the majority "survive" cancellation by other elements?', 'Pair each different element off against the candidate.'],
    intuition: 'A true majority outnumbers everything else combined, so pairwise cancellation cannot eliminate it.',
  },
  {
    title: 'Count subarrays with given sum', fn: 'subarraySum',
    statement: 'Return the number of contiguous subarrays whose sum equals k (negatives allowed).', constraints: ['1 <= n <= 2*10^4'],
    starter: stub('int subarraySum(vector<int>& nums, int k)'),
    approaches: [
      { label: 'Brute force', time: 'O(n²)', space: 'O(1)', growth: 'n2', why: 'All n(n+1)/2 subarrays with a running sum.',
        code: cls(`int subarraySum(vector<int>& nums, int k) {
    int count = 0;
    for (int i = 0; i < nums.size(); i++) {
        int sum = 0;
        for (int j = i; j < nums.size(); j++) {
            sum += nums[j];
            if (sum == k) {
                count++;
            }
        }
    }
    return count;
}`) },
      { label: 'Prefix sum + hash map', time: 'O(n)', space: 'O(n)', growth: 'n', why: 'A subarray ending at i sums to k iff an earlier prefix equals prefix - k; the map answers that in O(1). It stores up to n+1 prefixes.',
        code: cls(`int subarraySum(vector<int>& nums, int k) {
    unordered_map<int, int> seen;
    seen[0] = 1;
    int prefix = 0;
    int count = 0;
    for (int i = 0; i < nums.size(); i++) {
        prefix += nums[i];
        if (seen.count(prefix - k)) {
            count += seen[prefix - k];
        }
        seen[prefix]++;
    }
    return count;
}`) }],
    tests: [[[1, 1, 1], 2], [[1, 2, 3], 3], [[1, -1, 0], 0], [[3, 4, 7, 2, -3, 1, 4, 2], 7], [[1], 1], [[1], 2]], defaultArgs: [[1, 2, 3], 3],
    ref: (a: number[], k: number) => { let c = 0; for (let i = 0; i < a.length; i++) { let s = 0; for (let j = i; j < a.length; j++) { s += a[j]; if (s === k) c++; } } return c; },
    hints: ['Let prefix[i] be the sum of the first i elements.', 'A subarray (j, i] sums to k when prefix[i] - prefix[j] = k.', 'Count how many earlier prefixes equal prefix[i] - k.'],
    intuition: 'Turn "subarray sum" into a difference of two prefix sums, then look the other prefix up.',
  },
  {
    title: 'Check if a string is palindrome', fn: 'isPalindrome',
    statement: 'Return true if s reads the same forwards and backwards.', constraints: ['1 <= |s| <= 10^5'],
    starter: stub('bool isPalindrome(string s)', 'return false;'),
    approaches: [{ label: 'Two pointers', time: 'O(n)', space: 'O(1)', growth: 'n',
      why: 'The pointers meet in the middle after n/2 comparisons. s is passed by value here, which copies the input; the algorithm itself needs O(1) extra.',
      code: cls(`bool isPalindrome(string s) {
    int left = 0;
    int right = s.size() - 1;
    while (left < right) {
        if (s[left] != s[right]) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}`) }],
    tests: [['racecar'], ['abca'], ['a'], ['abba'], ['ab'], ['level']], defaultArgs: ['racecar'],
    ref: (s: string) => s === [...s].reverse().join(''),
    hints: ['Compare the outermost characters, then move inwards.', 'One mismatch means false.'],
    intuition: 'A palindrome is symmetric about its centre, so mirrored positions must match.',
  },
  {
    title: 'Valid Anagram', fn: 'isAnagram',
    statement: 'Return true if t is an anagram of s (lowercase letters).', constraints: ['1 <= |s|, |t| <= 5*10^4'],
    starter: stub('bool isAnagram(string s, string t)', 'return false;'),
    approaches: [{ label: 'Frequency array', time: 'O(n)', space: 'O(1)', growth: 'n',
      why: 'Two linear passes over the strings; the count array has a fixed 26 slots regardless of n.',
      code: cls(`bool isAnagram(string s, string t) {
    if (s.size() != t.size()) {
        return false;
    }
    vector<int> count(26, 0);
    for (int i = 0; i < s.size(); i++) {
        count[s[i] - 'a']++;
        count[t[i] - 'a']--;
    }
    for (int i = 0; i < 26; i++) {
        if (count[i] != 0) {
            return false;
        }
    }
    return true;
}`) }],
    tests: [['anagram', 'nagaram'], ['rat', 'car'], ['a', 'a'], ['ab', 'a'], ['listen', 'silent']], defaultArgs: ['listen', 'silent'],
    ref: (s: string, t: string) => [...s].sort().join('') === [...t].sort().join(''),
    hints: ['Anagrams have identical letter counts.', 'Count up for s, down for t; everything should return to zero.'],
    intuition: 'Compare the multiset of letters, not their order.',
  },
  {
    title: 'Climbing Stairs', fn: 'climbStairs',
    statement: 'You can climb 1 or 2 steps. In how many distinct ways can you reach step n?', constraints: ['1 <= n <= 30'],
    starter: stub('int climbStairs(int n)'),
    approaches: [
      { label: 'Recursion', time: 'O(2ⁿ)', space: 'O(n)', growth: '2n', why: 'ways(n)=ways(n-1)+ways(n-2) with no caching recomputes subproblems exponentially; stack depth n.',
        code: cls(`int climbStairs(int n) {
    if (n <= 2) {
        return n;
    }
    return climbStairs(n - 1) + climbStairs(n - 2);
}`) },
      { label: 'Tabulation', time: 'O(n)', space: 'O(n)', growth: 'n', why: 'Each dp[i] is filled once from dp[i-1] and dp[i-2]; the table has n+1 cells.',
        code: cls(`int climbStairs(int n) {
    if (n <= 2) {
        return n;
    }
    vector<int> dp(n + 1, 0);
    dp[1] = 1;
    dp[2] = 2;
    for (int i = 3; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }
    return dp[n];
}`) }],
    tests: [[1], [2], [3], [4], [5], [8], [10]], defaultArgs: [6],
    ref: (n: number): number => { let a = 1, b = 1; for (let i = 2; i <= n; i++) [a, b] = [b, a + b]; return b; },
    hints: ['To reach step i, your last move came from i-1 or i-2.', 'Add the ways to reach those two steps.'],
    intuition: 'The number of ways to reach a step depends only on the two steps below it.',
  },
  {
    title: 'Longest Common Subsequence', fn: 'longestCommonSubsequence',
    statement: 'Return the length of the longest common subsequence of strings a and b.', constraints: ['1 <= |a|, |b| <= 1000'],
    starter: stub('int longestCommonSubsequence(string a, string b)'),
    approaches: [{ label: '2D DP table', time: 'O(n·m)', space: 'O(n·m)', growth: 'n2',
      why: 'Each of the (n+1)(m+1) cells is computed once in O(1) from three neighbours, so the time and the table are both n·m.',
      code: cls(`int longestCommonSubsequence(string a, string b) {
    int n = a.size();
    int m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[n][m];
}`) }],
    tests: [['abcde', 'ace'], ['abc', 'abc'], ['abc', 'def'], ['AGGTAB', 'GXTXAYB'], ['a', 'a'], ['bl', 'yby']], defaultArgs: [['abcde', 'ace'][0], 'ace'],
    ref: (a: string, b: string) => { const d = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0)); for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]); return d[a.length][b.length]; },
    hints: ['Let dp[i][j] be the LCS of the first i letters of a and first j letters of b.', 'If the last letters match, extend the diagonal.', 'Otherwise take the better of dropping one letter from either string.'],
    intuition: 'Matching letters extend the best answer for the shorter prefixes; otherwise inherit the best neighbour.',
  },
  {
    title: '0/1 Knapsack', fn: 'knapsack',
    statement: 'Given weights, values and capacity W, return the maximum value (each item used at most once).', constraints: ['1 <= n <= 100', '1 <= W <= 1000'],
    starter: stub('int knapsack(vector<int>& wt, vector<int>& val, int W)'),
    approaches: [{ label: '2D DP table', time: 'O(n·W)', space: 'O(n·W)', growth: 'n2',
      why: 'dp[i][w] (best value using the first i items with capacity w) is computed once per cell in O(1): n·W cells.',
      code: cls(`int knapsack(vector<int>& wt, vector<int>& val, int W) {
    int n = wt.size();
    vector<vector<int>> dp(n + 1, vector<int>(W + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= W; w++) {
            dp[i][w] = dp[i - 1][w];
            if (wt[i - 1] <= w) {
                dp[i][w] = max(dp[i][w], dp[i - 1][w - wt[i - 1]] + val[i - 1]);
            }
        }
    }
    return dp[n][W];
}`) }],
    tests: [[[1, 3, 4, 5], [1, 4, 5, 7], 7], [[2, 3, 4], [3, 4, 5], 5], [[5], [10], 4], [[1, 1, 1], [10, 20, 30], 2], [[4, 5, 1], [1, 2, 3], 4]], defaultArgs: [[1, 3, 4, 5], [1, 4, 5, 7], 7],
    ref: (wt: number[], val: number[], W: number): number => { let best = 0; for (let m = 0; m < 1 << wt.length; m++) { let w = 0, v = 0; for (let i = 0; i < wt.length; i++) if (m >> i & 1) { w += wt[i]; v += val[i]; } if (w <= W) best = Math.max(best, v); } return best; },
    hints: ['For each item you either take it or leave it.', 'dp[i][w] = max(leave, take) where take needs wt <= w.'],
    intuition: 'Each cell compares the best without the item against the best with it, using the smaller-capacity row.',
  },
  {
    title: 'Print all subsequences/Power set', fn: 'subsets', unordered: true,
    statement: 'Return all subsets of nums (distinct elements). Order does not matter.', constraints: ['1 <= n <= 10'],
    starter: stub('vector<vector<int>> subsets(vector<int>& nums)', 'return {};'),
    approaches: [{ label: 'Backtracking (include / exclude)', time: 'O(n·2ⁿ)', space: 'O(n)', growth: '2n',
      why: 'There are 2ⁿ leaves in the include/exclude decision tree and copying each subset into the answer costs up to n. Recursion depth and the working list are O(n) auxiliary space (output excluded).',
      code: cls(`void dfs(int i, vector<int>& nums, vector<int>& current, vector<vector<int>>& answer) {
    if (i == nums.size()) {
        answer.push_back(current);
        return;
    }
    current.push_back(nums[i]);
    dfs(i + 1, nums, current, answer);
    current.pop_back();
    dfs(i + 1, nums, current, answer);
}

vector<vector<int>> subsets(vector<int>& nums) {
    vector<vector<int>> answer;
    vector<int> current;
    dfs(0, nums, current, answer);
    return answer;
}`) }],
    tests: [[[1, 2, 3]], [[0]], [[1, 2]], [[4, 5, 6, 7]]], defaultArgs: [[1, 2, 3]],
    ref: (a: number[]) => { const out: number[][] = []; for (let m = 0; m < 1 << a.length; m++) out.push(a.filter((_, i) => m >> i & 1)); return out; },
    hints: ['For each element make a choice: include it or not.', 'After exploring "include", undo it before exploring "exclude".', 'When every element has been decided, record the current list.'],
    intuition: 'Backtracking = choose, explore, un-choose. The decision tree has 2ⁿ leaves.',
  },
  {
    title: 'Count the number of set bits', fn: 'countSetBits',
    statement: 'Return the number of 1 bits in the binary representation of n (n >= 0).', constraints: ['0 <= n <= 2^30'],
    starter: stub('int countSetBits(int n)'),
    approaches: [
      { label: 'Check every bit', time: 'O(log n)', space: 'O(1)', growth: 'logn', why: 'A number n has about log2(n) bits and each is inspected once.',
        code: cls(`int countSetBits(int n) {
    int count = 0;
    while (n > 0) {
        count += n & 1;
        n = n >> 1;
    }
    return count;
}`) },
      { label: 'Brian Kernighan', time: 'O(k)', space: 'O(1)', growth: 'logn', why: 'n & (n-1) clears the lowest set bit, so the loop runs once per set bit (k <= log n).',
        code: cls(`int countSetBits(int n) {
    int count = 0;
    while (n != 0) {
        n = n & (n - 1);
        count++;
    }
    return count;
}`) }],
    tests: [[0], [1], [7], [8], [13], [255], [1023]], defaultArgs: [13],
    ref: (n: number) => n.toString(2).split('').filter(c => c === '1').length,
    hints: ['n & 1 tells you the lowest bit.', 'What does n & (n - 1) do to the lowest set bit?'],
    intuition: 'Subtracting 1 flips the lowest set bit and everything below it; AND-ing removes exactly that bit.',
  },
  {
    title: 'Check if a number is power of 2 or not', fn: 'isPowerOfTwo',
    statement: 'Return true if n is a power of two.', constraints: ['-2^31 <= n <= 2^31-1'],
    starter: stub('bool isPowerOfTwo(int n)', 'return false;'),
    approaches: [{ label: 'Bit trick', time: 'O(1)', space: 'O(1)', growth: '1', why: 'A power of two has exactly one set bit, so n & (n-1) == 0. Constant number of operations.',
      code: cls(`bool isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0;
}`) }],
    tests: [[1], [2], [3], [16], [18], [0], [-4], [1024]], defaultArgs: [16],
    ref: (n: number) => n > 0 && Number.isInteger(Math.log2(n)),
    hints: ['Powers of two look like 1000..0 in binary.', 'n-1 looks like 0111..1.'],
    intuition: 'One set bit means clearing it yields zero.',
  },
  {
    title: 'N Queen', fn: 'solveNQueens', viz: 'queens',
    statement: 'Return the number of ways to place n queens on an n x n board so that none attack each other.', constraints: ['1 <= n <= 6 (for tracing)'],
    starter: stub('int solveNQueens(int n)'),
    approaches: [{ label: 'Backtracking row by row', time: 'O(n!)', space: 'O(n)', growth: '2n',
      why: 'Row r has at most n - (queens already blocking columns) choices, giving roughly n! placements before pruning. We store one column per row plus the recursion stack: O(n).',
      code: cls(`bool isSafe(int row, int col, vector<int>& pos) {
    for (int r = 0; r < row; r++) {
        if (pos[r] == col || abs(pos[r] - col) == row - r) {
            return false;
        }
    }
    return true;
}

int place(int row, int n, vector<int>& pos) {
    if (row == n) {
        return 1;
    }
    int ways = 0;
    for (int col = 0; col < n; col++) {
        if (isSafe(row, col, pos)) {
            pos[row] = col;
            ways += place(row + 1, n, pos);
            pos[row] = -1;
        }
    }
    return ways;
}

int solveNQueens(int n) {
    vector<int> pos(n, -1);
    return place(0, n, pos);
}`) }],
    tests: [[1], [2], [3], [4], [5], [6]], defaultArgs: [4],
    ref: (n: number): number => { const pos: number[] = []; const go = (r: number): number => { if (r === n) return 1; let w = 0; for (let c = 0; c < n; c++) { if (pos.every((p, i) => p !== c && Math.abs(p - c) !== r - i)) { pos.push(c); w += go(r + 1); pos.pop(); } } return w; }; return go(0); },
    hints: ['Place one queen per row.', 'A square is unsafe if a queen shares its column or diagonal.', 'If no column works in a row, return and move the previous queen.'],
    intuition: 'Choose a column, recurse, and undo the choice: pruning unsafe squares cuts the search tree dramatically.',
  },
];

export const PLAYABLE: Playable[] = [...BASE, ...PTR_PROBLEMS, ...CORE_PROBLEMS, ...ADV_PROBLEMS, ...B1_PROBLEMS, ...B2_PROBLEMS, ...B3_PROBLEMS, ...B4_PROBLEMS, ...B5_PROBLEMS, ...B6_PROBLEMS, ...B7_PROBLEMS, ...B8_PROBLEMS];
export const PLAYABLE_BY_TITLE = new Map(PLAYABLE.map(p => [p.title, p]));






