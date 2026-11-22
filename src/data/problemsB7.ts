// Batch 7: Step 16 (dynamic programming) - every remaining problem.
import { Playable, ap, mk } from './kit';

const MOD = 1000000007;
const isSub = (s: ArrayLike<any>, t: ArrayLike<any>) => { let i = 0; for (let j = 0; j < t.length && i < s.length; j++) if (s[i] === t[j]) i++; return i === s.length; };
const lcsLen = (a: string, b: string) => { const d = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0)); for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]); return d[a.length][b.length]; };
const lisLen = (a: number[]) => { const d = a.map(() => 1); a.forEach((x, i) => { for (let j = 0; j < i; j++) if (a[j] < x) d[i] = Math.max(d[i], d[j] + 1); }); return d.length ? Math.max(...d) : 0; };
const subsetCount = (a: number[], t: number) => { let c = 0; for (let m = 0; m < 1 << a.length; m++) { let s = 0; for (let i = 0; i < a.length; i++) if (m >> i & 1) s += a[i]; if (s === t) c++; } return c; };
const subsetSums = (a: number[]) => { const out: number[] = []; for (let m = 0; m < 1 << a.length; m++) { let s = 0; for (let i = 0; i < a.length; i++) if (m >> i & 1) s += a[i]; out.push(s); } return out; };

const MEMO_HEAD = '';
void MEMO_HEAD;

export const B7_PROBLEMS: Playable[] = [
  mk('Introduction to DP', 'tribonacci', 'T(0)=0, T(1)=T(2)=1 and T(n)=T(n-1)+T(n-2)+T(n-3). Return T(n).', 'int tribonacci(int n)', 'return 0;', [
    ap('Plain recursion', 'O(3^n)', 'O(n)', '2n', 'Each call spawns three more; subproblems are recomputed again and again (overlapping subproblems).', `int tribonacci(int n) {
    if (n == 0) {
        return 0;
    }
    if (n <= 2) {
        return 1;
    }
    return tribonacci(n - 1) + tribonacci(n - 2) + tribonacci(n - 3);
}`), ap('Memoization', 'O(n)', 'O(n)', 'n', 'Store each T(i) the first time it is computed: n distinct subproblems, O(1) work each.', `int solve(int n, vector<int>& memo) {
    if (n == 0) {
        return 0;
    }
    if (n <= 2) {
        return 1;
    }
    if (memo[n] != -1) {
        return memo[n];
    }
    memo[n] = solve(n - 1, memo) + solve(n - 2, memo) + solve(n - 3, memo);
    return memo[n];
}

int tribonacci(int n) {
    vector<int> memo(n + 1, -1);
    return solve(n, memo);
}`), ap('Tabulation with 3 variables', 'O(n)', 'O(1)', 'n', 'Only the last three values are ever needed.', `int tribonacci(int n) {
    if (n == 0) {
        return 0;
    }
    int a = 0;
    int b = 1;
    int c = 1;
    for (int i = 3; i <= n; i++) {
        int next = a + b + c;
        a = b;
        b = c;
        c = next;
    }
    return c;
}`)], [[0], [1], [2], [3], [4], [10], [20]], (n: number) => { const t = [0, 1, 1]; for (let i = 3; i <= n; i++) t[i] = t[i - 1] + t[i - 2] + t[i - 3]; return t[n]; }, ['Spot the repeated subproblems.', 'Cache results (memoisation) or build bottom-up.'], 'DP = recursion + remembering answers to overlapping subproblems.'),
  mk('Frog Jump with K Distances', 'frogJumpK', 'Stone heights h; from i the frog may jump to any of the next k stones at cost |h[i]-h[j]|. Return the minimum total cost from stone 0 to the last stone.', 'int frogJumpK(vector<int>& height, int k)', 'return 0;', [
    ap('Tabulation over previous k stones', 'O(n·k)', 'O(n)', 'n', 'dp[i] = min over the k stones before i of dp[j] + |h[i]-h[j]|.', `int frogJumpK(vector<int>& height, int k) {
    int n = height.size();
    vector<int> dp(n, INT_MAX);
    dp[0] = 0;
    for (int i = 1; i < n; i++) {
        for (int j = 1; j <= k && i - j >= 0; j++) {
            dp[i] = min(dp[i], dp[i - j] + abs(height[i] - height[i - j]));
        }
    }
    return dp[n - 1];
}`)], [[[10, 40, 30, 10], 2], [[10, 20, 30, 10], 1], [[30], 3], [[10, 50, 10], 1], [[10, 50, 10], 2], [[40, 10, 20, 70, 80, 10, 20, 70, 80, 60], 4]], (h: number[], k: number) => { const f = (i: number): number => (i === 0 ? 0 : Math.min(...Array.from({ length: Math.min(k, i) }, (_, j) => f(i - j - 1) + Math.abs(h[i] - h[i - j - 1])))); return f(h.length - 1); }, ['dp[i] = cheapest way to reach stone i.'], 'Extends the 2-step frog problem to k steps.'),
  mk('Maximum Sum of Non-Adjacent Elements', 'maxNonAdjacent', 'Return the maximum sum of elements with no two adjacent.', 'int maxNonAdjacent(vector<int>& nums)', 'return 0;', [
    ap('Recursion (pick / skip)', 'O(2^n)', 'O(n)', '2n', 'Every element is either taken (skipping its neighbour) or skipped.', `int solve(int i, vector<int>& nums) {
    if (i < 0) {
        return 0;
    }
    return max(nums[i] + solve(i - 2, nums), solve(i - 1, nums));
}

int maxNonAdjacent(vector<int>& nums) {
    return solve((int)nums.size() - 1, nums);
}`), ap('Tabulation, O(1) space', 'O(n)', 'O(1)', 'n', 'Only the best sums ending two and one positions earlier matter.', `int maxNonAdjacent(vector<int>& nums) {
    int prev2 = 0;
    int prev = 0;
    for (int i = 0; i < nums.size(); i++) {
        int take = nums[i] + prev2;
        int skip = prev;
        int current = max(take, skip);
        prev2 = prev;
        prev = current;
    }
    return prev;
}`)], [[[2, 1, 4, 9]], [[1, 2, 3, 1, 3, 5, 8, 1, 9]], [[5]], [[3, 2]], [[2, 7, 9, 3, 1]], [[]]], (a: number[]) => { let best = 0; for (let m = 0; m < 1 << a.length; m++) { if (m & (m >> 1)) continue; let s = 0; a.forEach((x, i) => { if (m >> i & 1) s += x; }); best = Math.max(best, s); } return best; }, ['For each element choose: take (skip the previous) or skip.'], 'Classic pick / not pick DP with two rolling values.'),
  mk("Ninja's Training", 'ninjaTraining', 'points[i][t] is the merit of task t (0..2) on day i; the same task cannot be done on two consecutive days. Return the maximum total merit.', 'int ninjaTraining(vector<vector<int>>& points)', 'return 0;', [
    ap('Tabulation by last task', 'O(n · 3 · 3)', 'O(n · 3)', 'n', 'dp[i][t] = points[i][t] + best dp[i−1][u] for u ≠ t.', `int ninjaTraining(vector<vector<int>>& points) {
    int n = points.size();
    vector<vector<int>> dp(n, vector<int>(3, 0));
    for (int t = 0; t < 3; t++) {
        dp[0][t] = points[0][t];
    }
    for (int i = 1; i < n; i++) {
        for (int t = 0; t < 3; t++) {
            for (int u = 0; u < 3; u++) {
                if (u != t) {
                    dp[i][t] = max(dp[i][t], points[i][t] + dp[i - 1][u]);
                }
            }
        }
    }
    return max(dp[n - 1][0], max(dp[n - 1][1], dp[n - 1][2]));
}`)], [[[[10, 40, 70], [20, 50, 80], [30, 60, 90]]], [[[1, 2, 5], [3, 1, 1], [3, 3, 3]]], [[[18, 11, 19], [4, 13, 7], [1, 8, 13]]], [[[5, 6, 7]]]], (p: number[][]) => { const f = (i: number, last: number): number => (i < 0 ? 0 : Math.max(...[0, 1, 2].filter(t => t !== last).map(t => p[i][t] + f(i - 1, t)))); return f(p.length - 1, -1); }, ['State = (day, last task).'], 'The state must remember the forbidden choice.'),
  mk('Unique Paths II', 'uniquePathsWithObstacles', 'Grid with obstacles (1). Count the paths from top-left to bottom-right moving only right or down.', 'int uniquePathsWithObstacles(vector<vector<int>>& grid)', 'return 0;', [
    ap('2D tabulation', 'O(R·C)', 'O(R·C)', 'n', 'ways[r][c] = ways[r−1][c] + ways[r][c−1], zero at obstacles.', `int uniquePathsWithObstacles(vector<vector<int>>& grid) {
    int rows = grid.size();
    int cols = grid[0].size();
    vector<vector<int>> ways(rows, vector<int>(cols, 0));
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 1) {
                ways[r][c] = 0;
            } else if (r == 0 && c == 0) {
                ways[r][c] = 1;
            } else {
                int up = r > 0 ? ways[r - 1][c] : 0;
                int left = c > 0 ? ways[r][c - 1] : 0;
                ways[r][c] = up + left;
            }
        }
    }
    return ways[rows - 1][cols - 1];
}`), ap('1D rolling row', 'O(R·C)', 'O(C)', 'n', 'Each row only needs the previous one, kept in the same array.', `int uniquePathsWithObstacles(vector<vector<int>>& grid) {
    int rows = grid.size();
    int cols = grid[0].size();
    vector<int> ways(cols, 0);
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 1) {
                ways[c] = 0;
            } else if (r == 0 && c == 0) {
                ways[c] = 1;
            } else if (c > 0) {
                ways[c] = ways[c] + ways[c - 1];
            }
        }
    }
    return ways[cols - 1];
}`)], [[[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], [[[0, 1], [0, 0]]], [[[1, 0]]], [[[0]]], [[[0, 0], [1, 1], [0, 0]]], [[[0, 0, 0], [0, 0, 0]]]], (g: number[][]) => { const R = g.length, C = g[0].length; const f = (r: number, c: number): number => (r >= R || c >= C || g[r][c] ? 0 : r === R - 1 && c === C - 1 ? 1 : f(r + 1, c) + f(r, c + 1)); return f(0, 0); }, ['An obstacle cell contributes 0 ways.'], 'Path counting is a sum over the two predecessors.'),
  mk('Triangle', 'minimumTotal', 'Minimum path sum from the top of a triangle to the bottom, moving to adjacent numbers on the row below.', 'int minimumTotal(vector<vector<int>>& triangle)', 'return 0;', [
    ap('Bottom-up in place', 'O(n²)', 'O(n)', 'n2', 'Start from the last row; each cell becomes its value plus the smaller of the two cells below it.', `int minimumTotal(vector<vector<int>>& triangle) {
    int n = triangle.size();
    vector<int> best = triangle[n - 1];
    for (int r = n - 2; r >= 0; r--) {
        for (int c = 0; c <= r; c++) {
            best[c] = triangle[r][c] + min(best[c], best[c + 1]);
        }
    }
    return best[0];
}`)], [[[[2], [3, 4], [6, 5, 7], [4, 1, 8, 3]]], [[[-10]]], [[[1], [2, 3]]], [[[5], [9, 6], [4, 6, 8], [0, 7, 1, 5]]]], (t: number[][]) => { const f = (r: number, c: number): number => (r === t.length ? 0 : t[r][c] + Math.min(f(r + 1, c), f(r + 1, c + 1))); return f(0, 0); }, ['Going bottom-up the answer ends at the top cell.'], 'Rows shrink towards the top, so a single array is enough.'),
  mk('Minimum/Maximum Falling Path Sum', 'minFallingPathSum', 'Square matrix: choose one element per row, each next one in the same or an adjacent column. Return the minimum possible sum.', 'int minFallingPathSum(vector<vector<int>>& matrix)', 'return 0;', [
    ap('Row-by-row DP', 'O(n²)', 'O(n)', 'n2', 'dp[c] = matrix[r][c] + min of the three cells above.', `int minFallingPathSum(vector<vector<int>>& matrix) {
    int n = matrix.size();
    vector<int> prev = matrix[0];
    for (int r = 1; r < n; r++) {
        vector<int> current(n, 0);
        for (int c = 0; c < n; c++) {
            int best = prev[c];
            if (c > 0) {
                best = min(best, prev[c - 1]);
            }
            if (c + 1 < n) {
                best = min(best, prev[c + 1]);
            }
            current[c] = matrix[r][c] + best;
        }
        prev = current;
    }
    int answer = prev[0];
    for (int c = 1; c < n; c++) {
        answer = min(answer, prev[c]);
    }
    return answer;
}`)], [[[[2, 1, 3], [6, 5, 4], [7, 8, 9]]], [[[-19, 57], [-40, -5]]], [[[7]]], [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]]], (m: number[][]) => { const n = m.length; const f = (r: number, c: number): number => (r === n ? 0 : c < 0 || c >= n ? Infinity : m[r][c] + Math.min(f(r + 1, c - 1), f(r + 1, c), f(r + 1, c + 1))); return Math.min(...m[0].map((_, c) => f(0, c))); }, ['A cell has up to three predecessors.'], 'Variable start and end points: take the best over the last row.'),
  mk('Cherry Pickup II', 'cherryPickup', 'Two robots start at the top row (columns 0 and last) and move down one row each step to column c−1, c or c+1, collecting cherries (a shared cell counts once). Return the maximum cherries.', 'int cherryPickup(vector<vector<int>>& grid)', 'return 0;', [
    ap('3D DP (row, col1, col2)', 'O(R·C²·9)', 'O(R·C²)', 'n2', 'Both robots move in lockstep so a state is (row, column of robot 1, column of robot 2); 9 transitions each.', `int cherryPickup(vector<vector<int>>& grid) {
    int rows = grid.size();
    int cols = grid[0].size();
    vector<vector<vector<int>>> dp(rows, vector<vector<int>>(cols, vector<int>(cols, -1)));
    dp[0][0][cols - 1] = grid[0][0];
    if (cols - 1 != 0) {
        dp[0][0][cols - 1] += grid[0][cols - 1];
    }
    for (int r = 1; r < rows; r++) {
        for (int a = 0; a < cols; a++) {
            for (int b = 0; b < cols; b++) {
                int best = -1;
                for (int da = -1; da <= 1; da++) {
                    for (int db = -1; db <= 1; db++) {
                        int pa = a + da;
                        int pb = b + db;
                        if (pa >= 0 && pa < cols && pb >= 0 && pb < cols && dp[r - 1][pa][pb] >= 0) {
                            best = max(best, dp[r - 1][pa][pb]);
                        }
                    }
                }
                if (best >= 0) {
                    int gain = grid[r][a];
                    if (a != b) {
                        gain += grid[r][b];
                    }
                    dp[r][a][b] = best + gain;
                }
            }
        }
    }
    int answer = 0;
    for (int a = 0; a < cols; a++) {
        for (int b = 0; b < cols; b++) {
            answer = max(answer, dp[rows - 1][a][b]);
        }
    }
    return answer;
}`)], [[[[3, 1, 1], [2, 5, 1], [1, 5, 5], [2, 1, 1]]], [[[1, 0, 0, 0, 0, 0, 1], [2, 0, 0, 0, 0, 3, 0], [2, 0, 9, 0, 0, 0, 0], [0, 3, 0, 5, 4, 0, 0], [1, 0, 2, 3, 0, 0, 6]]], [[[1, 1], [1, 1]]], [[[5, 5, 5]]]], (g: number[][]) => { const R = g.length, C = g[0].length; const f = (r: number, a: number, b: number): number => { if (a < 0 || b < 0 || a >= C || b >= C) return -Infinity; const gain = a === b ? g[r][a] : g[r][a] + g[r][b]; if (r === R - 1) return gain; let best = -Infinity; for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) best = Math.max(best, f(r + 1, a + x, b + y)); return gain + best; }; return f(0, 0, C - 1); }, ['Move both robots together row by row.'], 'Two walkers become one state with two column coordinates.'),
  mk('Partition Equal Subset Sum', 'canPartition', 'Can the array be split into two subsets with equal sum?', 'bool canPartition(vector<int>& nums)', 'return false;', [
    ap('Subset-sum DP (1D boolean)', 'O(n · S)', 'O(S)', 'n', 'Reduce to "is there a subset with sum total/2". Iterate sums downwards so each element is used once.', `bool canPartition(vector<int>& nums) {
    int total = 0;
    for (int i = 0; i < nums.size(); i++) {
        total += nums[i];
    }
    if (total % 2 != 0) {
        return false;
    }
    int target = total / 2;
    vector<bool> reachable(target + 1, false);
    reachable[0] = true;
    for (int i = 0; i < nums.size(); i++) {
        for (int s = target; s >= nums[i]; s--) {
            if (reachable[s - nums[i]]) {
                reachable[s] = true;
            }
        }
    }
    return reachable[target];
}`)], [[[1, 5, 11, 5]], [[1, 2, 3, 5]], [[2, 2]], [[1]], [[3, 3, 3, 4, 5]], [[1, 1]]], (a: number[]) => { const t = a.reduce((x, y) => x + y, 0); return t % 2 === 0 && subsetSums(a).includes(t / 2); }, ['If the total is odd, the answer is no.', 'Find a subset with half the total.'], 'Two equal halves means one subset hits exactly half.'),
  mk('Partition Set Into 2 Subsets With Min Absolute Sum Diff', 'minSubsetSumDiff', 'Split the array into two subsets so that |sum1 − sum2| is minimal. Return that difference.', 'int minSubsetSumDiff(vector<int>& nums)', 'return 0;', [
    ap('Reachable-sums table', 'O(n · S)', 'O(S)', 'n', 'Compute every subset sum up to the total; the best split uses the reachable sum s closest to total/2: difference = total − 2s.', `int minSubsetSumDiff(vector<int>& nums) {
    int total = 0;
    for (int i = 0; i < nums.size(); i++) {
        total += nums[i];
    }
    vector<bool> reachable(total + 1, false);
    reachable[0] = true;
    for (int i = 0; i < nums.size(); i++) {
        for (int s = total; s >= nums[i]; s--) {
            if (reachable[s - nums[i]]) {
                reachable[s] = true;
            }
        }
    }
    int best = total;
    for (int s = 0; s <= total / 2; s++) {
        if (reachable[s]) {
            best = min(best, total - 2 * s);
        }
    }
    return best;
}`)], [[[1, 6, 11, 5]], [[1, 2, 3, 4]], [[5]], [[3, 9, 7, 3]], [[1, 1]], [[2, 4, 6, 8]]], (a: number[]) => { const t = a.reduce((x, y) => x + y, 0); return Math.min(...subsetSums(a).map(s => Math.abs(t - 2 * s))); }, ['One subset sum s implies the other is total − s.'], 'Only the sums up to total/2 need to be inspected.'),
  mk('Count Subsets with Sum K', 'countSubsets', 'Count the subsets of nums (positive and zero values) whose sum is exactly k.', 'int countSubsets(vector<int>& nums, int k)', 'return 0;', [
    ap('Counting knapsack (1D)', 'O(n·k)', 'O(k)', 'n', 'ways[s] counts subsets with sum s; each element updates sums downwards so it is used at most once. Zeros double the counts naturally.', `int countSubsets(vector<int>& nums, int k) {
    vector<int> ways(k + 1, 0);
    ways[0] = 1;
    for (int i = 0; i < nums.size(); i++) {
        for (int s = k; s >= nums[i]; s--) {
            ways[s] += ways[s - nums[i]];
        }
    }
    return ways[k];
}`)], [[[1, 2, 2, 3], 3], [[1, 1, 1, 1], 2], [[0, 0, 1], 1], [[5], 5], [[5], 4], [[2, 3, 5, 6, 8, 10], 10]], (a: number[], k: number) => subsetCount(a, k), ['Do the inner loop downwards for 0/1 items.'], 'Counting instead of booleans turns subset-sum into a counting DP.'),
  mk('Count Partitions with Given Difference', 'countPartitions', 'Count the ways to split nums into two subsets S1, S2 with S1 − S2 = d (S1 ≥ S2).', 'int countPartitions(vector<int>& nums, int d)', 'return 0;', [
    ap('Reduce to subset count', 'O(n · S)', 'O(S)', 'n', 'S1 + S2 = total and S1 − S2 = d ⇒ S1 = (total + d)/2. Count subsets with that sum.', `int countPartitions(vector<int>& nums, int d) {
    int total = 0;
    for (int i = 0; i < nums.size(); i++) {
        total += nums[i];
    }
    if (total - d < 0 || (total - d) % 2 != 0) {
        return 0;
    }
    int target = (total - d) / 2;
    vector<int> ways(target + 1, 0);
    ways[0] = 1;
    for (int i = 0; i < nums.size(); i++) {
        for (int s = target; s >= nums[i]; s--) {
            ways[s] += ways[s - nums[i]];
        }
    }
    return ways[target];
}`)], [[[5, 2, 6, 4], 3], [[1, 1, 1, 1], 0], [[3, 3], 6], [[1, 2, 3], 7], [[0, 0, 1], 1], [[1, 2, 3, 4], 2]], (a: number[], d: number) => { const t = a.reduce((x, y) => x + y, 0); return subsetSums(a).filter(s => s - (t - s) === d).length; }, ['Write S1 in terms of total and d.'], 'A difference constraint becomes a subset-sum count.'),
  mk('Target Sum', 'findTargetSumWays', 'Assign + or − to every number; count the assignments whose total is target.', 'int findTargetSumWays(vector<int>& nums, int target)', 'return 0;', [
    ap('Subset-sum counting', 'O(n · S)', 'O(S)', 'n', 'The numbers with + form a subset P with 2·sum(P) = total + target.', `int findTargetSumWays(vector<int>& nums, int target) {
    int total = 0;
    for (int i = 0; i < nums.size(); i++) {
        total += nums[i];
    }
    if (abs(target) > total || (total + target) % 2 != 0) {
        return 0;
    }
    int need = (total + target) / 2;
    vector<int> ways(need + 1, 0);
    ways[0] = 1;
    for (int i = 0; i < nums.size(); i++) {
        for (int s = need; s >= nums[i]; s--) {
            ways[s] += ways[s - nums[i]];
        }
    }
    return ways[need];
}`)], [[[1, 1, 1, 1, 1], 3], [[1], 1], [[1], 2], [[0, 0, 0], 0], [[2, 3, 5], 0], [[1, 2, 3, 4], -2]], (a: number[], t: number) => { let c = 0; for (let m = 0; m < 1 << a.length; m++) { let s = 0; a.forEach((x, i) => { s += m >> i & 1 ? x : -x; }); if (s === t) c++; } return c; }, ['Split numbers into a "plus" group and a "minus" group.'], 'It is the "count partitions with difference" problem in disguise.'),
  // ---------- strings ----------
  mk('Print Longest Common Subsequence', 'printLCS', 'Return one longest common subsequence of two strings.', 'string printLCS(string a, string b)', 'return "";', [
    ap('DP table + backtracking', 'O(n·m)', 'O(n·m)', 'n2', 'Fill the LCS length table, then walk back from the corner: equal characters belong to the answer, otherwise move towards the larger neighbour.', `string printLCS(string a, string b) {
    int n = a.size();
    int m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = 1 + dp[i - 1][j - 1];
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    string result = "";
    int i = n;
    int j = m;
    while (i > 0 && j > 0) {
        if (a[i - 1] == b[j - 1]) {
            result += a[i - 1];
            i--;
            j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            i--;
        } else {
            j--;
        }
    }
    reverse(result.begin(), result.end());
    return result;
}`)], [['abcde', 'ace'], ['abc', 'def'], ['abcba', 'abcbcba'], ['a', 'a'], ['AGGTAB', 'GXTXAYB'], ['', 'abc']], (a: string) => a, ['Reconstruct from the table: it records the decisions.'], 'Backtracking through the DP table recovers the sequence itself.', { check: (args: any[], got: string) => { const [a, b] = args; return got.length === lcsLen(a, b) && isSub(got, a) && isSub(got, b); } }),
  mk('Minimum Insertions to Make String Palindrome', 'minInsertionsPalindrome', 'Return the fewest characters to insert (anywhere) to make s a palindrome.', 'int minInsertionsPalindrome(string s)', 'return 0;', [
    ap('n − LPS (via LCS with the reverse)', 'O(n²)', 'O(n²)', 'n2', 'The longest palindromic subsequence is the LCS of s and reverse(s); every other character needs a mirror partner inserted.', `int minInsertionsPalindrome(string s) {
    int n = s.size();
    string r = s;
    reverse(r.begin(), r.end());
    vector<vector<int>> dp(n + 1, vector<int>(n + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= n; j++) {
            if (s[i - 1] == r[j - 1]) {
                dp[i][j] = 1 + dp[i - 1][j - 1];
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return n - dp[n][n];
}`)], [['abcaa'], ['abcd'], ['a'], ['aa'], ['mbadm'], ['leetcode'], ['zzazz']], (s: string) => s.length - lcsLen(s, [...s].reverse().join('')), ['Which characters can stay where they are?'], 'Keep the longest palindromic subsequence; mirror the rest.'),
  mk('Minimum Insertions/Deletions to Convert String A to B', 'minOperations', 'Return the minimum number of insertions plus deletions to turn A into B.', 'int minOperations(string a, string b)', 'return 0;', [
    ap('Via LCS', 'O(n·m)', 'O(n·m)', 'n2', 'Characters of the LCS stay; delete the rest of A, insert the rest of B: (n − lcs) + (m − lcs).', `int minOperations(string a, string b) {
    int n = a.size();
    int m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = 1 + dp[i - 1][j - 1];
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return n + m - 2 * dp[n][m];
}`)], [['heap', 'pea'], ['abc', 'abc'], ['abc', ''], ['sea', 'eat'], ['abcd', 'xyz']], (a: string, b: string) => a.length + b.length - 2 * lcsLen(a, b), ['What part of A can be kept?'], 'Edit distance without substitutions is governed by the LCS.'),
  mk('Shortest Common Supersequence', 'shortestSupersequence', 'Return a shortest string that has both a and b as subsequences.', 'string shortestSupersequence(string a, string b)', 'return "";', [
    ap('LCS table + merge walk', 'O(n·m)', 'O(n·m)', 'n2', 'Length = n + m − lcs. Walk the LCS table backwards, emitting the shared character once and otherwise the character from the side that keeps the larger LCS.', `string shortestSupersequence(string a, string b) {
    int n = a.size();
    int m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (a[i - 1] == b[j - 1]) {
                dp[i][j] = 1 + dp[i - 1][j - 1];
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    string result = "";
    int i = n;
    int j = m;
    while (i > 0 && j > 0) {
        if (a[i - 1] == b[j - 1]) {
            result += a[i - 1];
            i--;
            j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
            result += a[i - 1];
            i--;
        } else {
            result += b[j - 1];
            j--;
        }
    }
    while (i > 0) {
        result += a[i - 1];
        i--;
    }
    while (j > 0) {
        result += b[j - 1];
        j--;
    }
    reverse(result.begin(), result.end());
    return result;
}`)], [['brute', 'groot'], ['abac', 'cab'], ['a', 'a'], ['abc', 'def'], ['geek', 'eke'], ['', 'xy']], (a: string) => a, ['The shared characters (LCS) only need to appear once.'], 'Overlap the LCS, keep everything else.', { check: (args: any[], got: string) => { const [a, b] = args; return got.length === a.length + b.length - lcsLen(a, b) && isSub(a, got) && isSub(b, got); } }),
  mk('Distinct Subsequences', 'numDistinct', 'Count the distinct subsequences of s that equal t.', 'int numDistinct(string s, string t)', 'return 0;', [
    ap('2D DP', 'O(n·m)', 'O(n·m)', 'n2', 'dp[i][j] = ways s[0..i) contains t[0..j): if the last chars match we can either use s[i−1] or skip it.', `int numDistinct(string s, string t) {
    int n = s.size();
    int m = t.size();
    vector<vector<long long>> dp(n + 1, vector<long long>(m + 1, 0));
    for (int i = 0; i <= n; i++) {
        dp[i][0] = 1;
    }
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            dp[i][j] = dp[i - 1][j];
            if (s[i - 1] == t[j - 1]) {
                dp[i][j] += dp[i - 1][j - 1];
            }
        }
    }
    return (int)dp[n][m];
}`)], [['rabbbit', 'rabbit'], ['babgbag', 'bag'], ['abc', 'abcd'], ['aaa', 'aa'], ['a', 'a'], ['abc', '']], (s: string, t: string) => { const f = (i: number, j: number): number => (j === t.length ? 1 : i === s.length ? 0 : f(i + 1, j) + (s[i] === t[j] ? f(i + 1, j + 1) : 0)); return f(0, 0); }, ['Matching characters give two options: use or skip.'], 'Counting subsequences: every match contributes both choices.'),
  mk('Wildcard Matching', 'isMatch', 'Pattern p may contain ? (any one char) and * (any sequence, including empty). Does p match the whole of s?', 'bool isMatch(string s, string p)', 'return false;', [
    ap('2D DP', 'O(n·m)', 'O(n·m)', 'n2', 'dp[i][j] = s[0..i) matches p[0..j). A * either matches nothing (dp[i][j−1]) or one more character (dp[i−1][j]).', `bool isMatch(string s, string p) {
    int n = s.size();
    int m = p.size();
    vector<vector<bool>> dp(n + 1, vector<bool>(m + 1, false));
    dp[0][0] = true;
    for (int j = 1; j <= m; j++) {
        if (p[j - 1] == '*') {
            dp[0][j] = dp[0][j - 1];
        }
    }
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            if (p[j - 1] == '*') {
                dp[i][j] = dp[i][j - 1] || dp[i - 1][j];
            } else if (p[j - 1] == '?' || p[j - 1] == s[i - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            }
        }
    }
    return dp[n][m];
}`)], [['aa', 'a'], ['aa', '*'], ['cb', '?a'], ['adceb', '*a*b'], ['acdcb', 'a*c?b'], ['', '*'], ['', '?'], ['abc', 'a*c']], (s: string, p: string) => new RegExp('^' + p.replace(/\*/g, '.*').replace(/\?/g, '.') + '$').test(s), ['Handle * as "empty" or "one more character".'], 'The two ways a star can behave give the recurrence.'),
  // ---------- stocks ----------
  mk('Best Time to Buy and Sell Stock', 'maxProfitOne', 'One buy and one sell: return the maximum profit (0 if none).', 'int maxProfitOne(vector<int>& prices)', 'return 0;', [
    ap('Track the minimum so far', 'O(n)', 'O(1)', 'n', 'Selling today is best after buying at the lowest earlier price.', `int maxProfitOne(vector<int>& prices) {
    int lowest = INT_MAX;
    int best = 0;
    for (int i = 0; i < prices.size(); i++) {
        lowest = min(lowest, prices[i]);
        best = max(best, prices[i] - lowest);
    }
    return best;
}`)], [[[7, 1, 5, 3, 6, 4]], [[7, 6, 4, 3, 1]], [[1]], [[2, 4, 1]], [[3, 2, 6, 5, 0, 3]]], (p: number[]) => { let b = 0; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) b = Math.max(b, p[j] - p[i]); return b; }, ['For each day, what is the best earlier buy?'], 'One pass with a running minimum.'),
  mk('Buy and Sell Stocks III', 'maxProfitTwo', 'At most two transactions (sell before buying again). Return the maximum profit.', 'int maxProfitTwo(vector<int>& prices)', 'return 0;', [
    ap('State machine with 4 values', 'O(n)', 'O(1)', 'n', 'Track the best balance after 1st buy, 1st sell, 2nd buy, 2nd sell; each day updates them in order.', `int maxProfitTwo(vector<int>& prices) {
    int buy1 = INT_MIN;
    int sell1 = 0;
    int buy2 = INT_MIN;
    int sell2 = 0;
    for (int i = 0; i < prices.size(); i++) {
        buy1 = max(buy1, -prices[i]);
        sell1 = max(sell1, buy1 + prices[i]);
        buy2 = max(buy2, sell1 - prices[i]);
        sell2 = max(sell2, buy2 + prices[i]);
    }
    return sell2;
}`)], [[[3, 3, 5, 0, 0, 3, 1, 4]], [[1, 2, 3, 4, 5]], [[7, 6, 4, 3, 1]], [[1]], [[2, 1, 4, 5, 2, 9, 7]]], (p: number[]) => { const n = p.length; const f = (i: number, held: boolean, k: number): number => (i === n || k === 0 ? 0 : held ? Math.max(f(i + 1, true, k), p[i] + f(i + 1, false, k - 1)) : Math.max(f(i + 1, false, k), -p[i] + f(i + 1, true, k))); return f(0, false, 2); }, ['The state is (holding?, transactions left).'], 'A tiny finite-state machine drives all the stock problems.'),
  mk('Buy and Sell Stocks IV', 'maxProfitK', 'At most k transactions. Return the maximum profit.', 'int maxProfitK(int k, vector<int>& prices)', 'return 0;', [
    ap('DP over (transaction, day)', 'O(n·k)', 'O(k)', 'n', 'For each transaction count keep best balance after its buy and after its sell.', `int maxProfitK(int k, vector<int>& prices) {
    vector<int> buy(k + 1, INT_MIN);
    vector<int> sell(k + 1, 0);
    for (int i = 0; i < prices.size(); i++) {
        for (int t = 1; t <= k; t++) {
            buy[t] = max(buy[t], sell[t - 1] - prices[i]);
            sell[t] = max(sell[t], buy[t] + prices[i]);
        }
    }
    return sell[k];
}`)], [[2, [2, 4, 1]], [2, [3, 2, 6, 5, 0, 3]], [1, [1, 2]], [3, [1, 5, 2, 8, 3, 9]], [0, [1, 5]], [5, [7, 6, 4]]], (k: number, p: number[]) => { const n = p.length; const f = (i: number, held: boolean, t: number): number => (i === n || t === 0 ? 0 : held ? Math.max(f(i + 1, true, t), p[i] + f(i + 1, false, t - 1)) : Math.max(f(i + 1, false, t), -p[i] + f(i + 1, true, t))); return f(0, false, k); }, ['Generalise the two-transaction state machine.'], 'k transactions = k copies of the buy/sell state.'),
  mk('Buy and Sell Stocks With Cooldown', 'maxProfitCooldown', 'Unlimited transactions, but after selling you must wait one day before buying. Return the maximum profit.', 'int maxProfitCooldown(vector<int>& prices)', 'return 0;', [
    ap('Three-state machine', 'O(n)', 'O(1)', 'n', 'held, sold (just sold today) and rest (free to buy); transitions use the previous day.', `int maxProfitCooldown(vector<int>& prices) {
    int held = INT_MIN;
    int sold = 0;
    int rest = 0;
    for (int i = 0; i < prices.size(); i++) {
        int previousSold = sold;
        sold = held + prices[i];
        held = max(held, rest - prices[i]);
        rest = max(rest, previousSold);
    }
    return max(sold, rest);
}`)], [[[1, 2, 3, 0, 2]], [[1]], [[2, 1]], [[1, 2, 4]], [[6, 1, 6, 4, 3, 0, 2]]], (p: number[]) => { const n = p.length; const f = (i: number, held: boolean): number => (i >= n ? 0 : held ? Math.max(f(i + 1, true), p[i] + f(i + 2, false)) : Math.max(f(i + 1, false), -p[i] + f(i + 1, true))); return f(0, false); }, ['Selling forces a skipped day.'], 'The cooldown becomes an extra "just sold" state.'),
  mk('Buy and Sell Stocks With Transaction Fee', 'maxProfitFee', 'Unlimited transactions; each costs fee (paid when selling). Return the maximum profit.', 'int maxProfitFee(vector<int>& prices, int fee)', 'return 0;', [
    ap('Two-state machine', 'O(n)', 'O(1)', 'n', 'cash (not holding) and hold; selling subtracts the fee.', `int maxProfitFee(vector<int>& prices, int fee) {
    int cash = 0;
    int hold = INT_MIN;
    for (int i = 0; i < prices.size(); i++) {
        cash = max(cash, hold + prices[i] - fee);
        hold = max(hold, cash - prices[i]);
    }
    return cash;
}`)], [[[1, 3, 2, 8, 4, 9], 2], [[1, 3, 7, 5, 10, 3], 3], [[1], 1], [[5, 4, 3], 0], [[1, 4, 6, 2, 8, 3, 10, 14], 3]], (p: number[], fee: number) => { const n = p.length; const f = (i: number, held: boolean): number => (i === n ? 0 : held ? Math.max(f(i + 1, true), p[i] - fee + f(i + 1, false)) : Math.max(f(i + 1, false), -p[i] + f(i + 1, true))); return f(0, false); }, ['Charge the fee when selling.'], 'Same two-state machine as unlimited transactions plus a constant.'),
  // ---------- LIS ----------
  mk('Printing Longest Increasing Subsequence', 'printLIS', 'Return one longest strictly increasing subsequence.', 'vector<int> printLIS(vector<int>& nums)', 'return {};', [
    ap('O(n²) DP with predecessor links', 'O(n²)', 'O(n)', 'n2', 'dp[i] = best length ending at i; store the previous index so the sequence can be rebuilt.', `vector<int> printLIS(vector<int>& nums) {
    int n = nums.size();
    if (n == 0) {
        return {};
    }
    vector<int> dp(n, 1);
    vector<int> previous(n, -1);
    int bestEnd = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) {
                dp[i] = dp[j] + 1;
                previous[i] = j;
            }
        }
        if (dp[i] > dp[bestEnd]) {
            bestEnd = i;
        }
    }
    vector<int> result;
    for (int i = bestEnd; i != -1; i = previous[i]) {
        result.push_back(nums[i]);
    }
    reverse(result.begin(), result.end());
    return result;
}`)], [[[10, 9, 2, 5, 3, 7, 101, 18]], [[0, 1, 0, 3, 2, 3]], [[7, 7, 7]], [[5]], [[1, 2, 3, 4]], [[]]], (a: number[]) => a, ['Remember where each best sequence came from.'], 'A parent array reconstructs the sequence.', { check: (args: any[], got: number[]) => { const a: number[] = args[0]; if (got.length !== lisLen(a)) return false; if (!isSub(got, a)) return false; return got.every((x, i) => i === 0 || got[i - 1] < x); } }),
  mk('Longest Increasing Subsequence (Binary Search)', 'lengthOfLIS', 'Length of the longest strictly increasing subsequence in O(n log n).', 'int lengthOfLIS(vector<int>& nums)', 'return 0;', [
    ap('O(n²) DP', 'O(n²)', 'O(n)', 'n2', 'dp[i] = 1 + max dp[j] for smaller earlier values.', `int lengthOfLIS(vector<int>& nums) {
    int n = nums.size();
    int best = 0;
    vector<int> dp(n, 1);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) {
                dp[i] = max(dp[i], dp[j] + 1);
            }
        }
        best = max(best, dp[i]);
    }
    return best;
}`), ap('Patience sorting with lower_bound', 'O(n log n)', 'O(n)', 'nlogn', 'tails[k] = smallest possible tail of an increasing subsequence of length k+1. Each number replaces the first tail ≥ it (binary search) or extends the list.', `int lengthOfLIS(vector<int>& nums) {
    vector<int> tails;
    for (int i = 0; i < nums.size(); i++) {
        int pos = lower_bound(tails.begin(), tails.end(), nums[i]) - tails.begin();
        if (pos == tails.size()) {
            tails.push_back(nums[i]);
        } else {
            tails[pos] = nums[i];
        }
    }
    return tails.size();
}`)], [[[10, 9, 2, 5, 3, 7, 101, 18]], [[0, 1, 0, 3, 2, 3]], [[7, 7, 7, 7]], [[1]], [[]], [[4, 10, 4, 3, 8, 9]]], (a: number[]) => lisLen(a), ['Keep the smallest tail for each length.'], 'The tails array is always sorted, so binary search works.'),
  mk('Largest Divisible Subset', 'largestDivisibleSubset', 'Return the largest subset (distinct positive integers) where every pair satisfies a % b == 0 or b % a == 0.', 'vector<int> largestDivisibleSubset(vector<int>& nums)', 'return {};', [
    ap('Sort + LIS-style DP', 'O(n²)', 'O(n)', 'n2', 'After sorting, divisibility is transitive along a chain, so a subset is valid iff each element divides the next: LIS with "divides" as the order.', `vector<int> largestDivisibleSubset(vector<int>& nums) {
    int n = nums.size();
    if (n == 0) {
        return {};
    }
    vector<int> sorted = nums;
    sort(sorted.begin(), sorted.end());
    vector<int> dp(n, 1);
    vector<int> previous(n, -1);
    int bestEnd = 0;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (sorted[i] % sorted[j] == 0 && dp[j] + 1 > dp[i]) {
                dp[i] = dp[j] + 1;
                previous[i] = j;
            }
        }
        if (dp[i] > dp[bestEnd]) {
            bestEnd = i;
        }
    }
    vector<int> result;
    for (int i = bestEnd; i != -1; i = previous[i]) {
        result.push_back(sorted[i]);
    }
    reverse(result.begin(), result.end());
    return result;
}`)], [[[1, 2, 3]], [[1, 2, 4, 8]], [[3, 5, 7]], [[4, 8, 10, 240]], [[5]], [[2, 3, 4, 9, 8]]], (a: number[]) => a, ['Sort first.'], 'Transitivity of divisibility turns the set problem into a chain problem.', { check: (args: any[], got: number[]) => { const a: number[] = args[0]; const ok = (s: number[]) => s.every((x, i) => s.every((y, j) => i === j || x % y === 0 || y % x === 0)); let best = 0; for (let m = 0; m < 1 << a.length; m++) { const s = a.filter((_, i) => m >> i & 1); if (ok(s)) best = Math.max(best, s.length); } return got.length === best && got.every(x => a.includes(x)) && new Set(got).size === got.length && ok(got); } }),
  mk('Longest String Chain', 'longestStrChain', 'A chain: each word is obtained by inserting one letter into the previous. Return the length of the longest chain from the words.', 'int longestStrChain(vector<string>& words)', 'return 0;', [
    ap('Sort by length + hash map DP', 'O(n · L²)', 'O(n · L)', 'n', 'For every word try deleting each character; the best chain ending at the word is 1 + the best of its predecessors.', `int longestStrChain(vector<string>& words) {
    vector<string> sorted = words;
    sort(sorted.begin(), sorted.end(), [](string& a, string& b) {
        return a.size() < b.size();
    });
    unordered_map<string, int> best;
    int answer = 0;
    for (int i = 0; i < sorted.size(); i++) {
        string word = sorted[i];
        int length = 1;
        for (int j = 0; j < word.size(); j++) {
            string predecessor = word.substr(0, j) + word.substr(j + 1);
            if (best.count(predecessor)) {
                length = max(length, best[predecessor] + 1);
            }
        }
        best[word] = length;
        answer = max(answer, length);
    }
    return answer;
}`)], [[['a', 'b', 'ba', 'bca', 'bda', 'bdca']], [['xbc', 'pcxbcf', 'xb', 'cxbc', 'pcxbc']], [['abcd', 'dbqca']], [['a']], [['ab', 'abc', 'abcd', 'b']]], (w: string[]) => { const set = new Set(w); const f = (x: string): number => { let b = 1; for (let i = 0; i < x.length; i++) { const p = x.slice(0, i) + x.slice(i + 1); if (set.has(p)) b = Math.max(b, 1 + f(p)); } return b; }; return Math.max(...w.map(f)); }, ['Process shorter words first.'], 'Deleting one letter finds the predecessor in O(L).'),
  mk('Longest Bitonic Subsequence', 'longestBitonic', 'Return the length of the longest subsequence that strictly increases then strictly decreases (either part may be a single element).', 'int longestBitonic(vector<int>& nums)', 'return 0;', [
    ap('LIS from the left + LIS from the right', 'O(n²)', 'O(n)', 'n2', 'inc[i] = LIS ending at i, dec[i] = longest decreasing sequence starting at i; the peak at i gives inc + dec − 1.', `int longestBitonic(vector<int>& nums) {
    int n = nums.size();
    vector<int> inc(n, 1);
    vector<int> dec(n, 1);
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) {
                inc[i] = max(inc[i], inc[j] + 1);
            }
        }
    }
    for (int i = n - 1; i >= 0; i--) {
        for (int j = n - 1; j > i; j--) {
            if (nums[j] < nums[i]) {
                dec[i] = max(dec[i], dec[j] + 1);
            }
        }
    }
    int best = 0;
    for (int i = 0; i < n; i++) {
        best = max(best, inc[i] + dec[i] - 1);
    }
    return best;
}`)], [[[1, 11, 2, 10, 4, 5, 2, 1]], [[1, 2, 5, 3, 2]], [[5, 4, 3]], [[1, 2, 3]], [[7]], [[12, 11, 40, 5, 3, 1]]], (a: number[]) => { let best = 0; for (let m = 1; m < 1 << a.length; m++) { const s = a.filter((_, i) => m >> i & 1); let p = 0; while (p + 1 < s.length && s[p] < s[p + 1]) p++; let q = p; while (q + 1 < s.length && s[q] > s[q + 1]) q++; if (q === s.length - 1) best = Math.max(best, s.length); } return best; }, ['Run LIS from both directions.'], 'A bitonic subsequence has a peak: add the two halves.'),
  mk('Number of Longest Increasing Subsequences', 'findNumberOfLIS', 'Return how many strictly increasing subsequences have maximum length.', 'int findNumberOfLIS(vector<int>& nums)', 'return 0;', [
    ap('DP with (length, count)', 'O(n²)', 'O(n)', 'n2', 'For each i keep the best length ending at i and how many sequences achieve it; extending longer predecessors replaces the count, equal ones add.', `int findNumberOfLIS(vector<int>& nums) {
    int n = nums.size();
    if (n == 0) {
        return 0;
    }
    vector<int> length(n, 1);
    vector<int> count(n, 1);
    int best = 1;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) {
                if (length[j] + 1 > length[i]) {
                    length[i] = length[j] + 1;
                    count[i] = count[j];
                } else if (length[j] + 1 == length[i]) {
                    count[i] += count[j];
                }
            }
        }
        best = max(best, length[i]);
    }
    int total = 0;
    for (int i = 0; i < n; i++) {
        if (length[i] == best) {
            total += count[i];
        }
    }
    return total;
}`)], [[[1, 3, 5, 4, 7]], [[2, 2, 2, 2, 2]], [[1, 2, 4, 3, 5, 4, 7, 2]], [[1]], [[]], [[5, 4, 3]]], (a: number[]) => { if (!a.length) return 0; const L = lisLen(a); let c = 0; for (let m = 1; m < 1 << a.length; m++) { const s = a.filter((_, i) => m >> i & 1); if (s.length === L && s.every((x, i) => i === 0 || s[i - 1] < x)) c++; } return c; }, ['Track two numbers per index.'], 'Counting variant of LIS: counts propagate along optimal predecessors.'),
  // ---------- MCM ----------
  mk('Matrix Chain Multiplication', 'matrixMultiplication', 'dims[i-1] × dims[i] is matrix i. Return the minimum number of scalar multiplications to multiply the whole chain.', 'int matrixMultiplication(vector<int>& dims)', 'return 0;', [
    ap('Memoised partitioning', 'O(n³)', 'O(n²)', 'n2', 'f(i,j) = min over split k of f(i,k) + f(k+1,j) + dims[i−1]·dims[k]·dims[j].', `int solve(int i, int j, vector<int>& dims, vector<vector<int>>& memo) {
    if (i == j) {
        return 0;
    }
    if (memo[i][j] != -1) {
        return memo[i][j];
    }
    int best = INT_MAX;
    for (int k = i; k < j; k++) {
        int cost = solve(i, k, dims, memo) + solve(k + 1, j, dims, memo) + dims[i - 1] * dims[k] * dims[j];
        best = min(best, cost);
    }
    memo[i][j] = best;
    return best;
}

int matrixMultiplication(vector<int>& dims) {
    int n = dims.size();
    vector<vector<int>> memo(n, vector<int>(n, -1));
    return solve(1, n - 1, dims, memo);
}`)], [[[10, 30, 5, 60]], [[40, 20, 30, 10, 30]], [[10, 20]], [[10, 20, 30]], [[1, 2, 3, 4, 3]], [[5, 4, 6, 2, 7]]], (d: number[]) => { const f = (i: number, j: number): number => { if (i === j) return 0; let b = Infinity; for (let k = i; k < j; k++) b = Math.min(b, f(i, k) + f(k + 1, j) + d[i - 1] * d[k] * d[j]); return b; }; return d.length < 3 ? 0 : f(1, d.length - 1); }, ['Try every place for the last multiplication.'], 'Partition DP: the answer for a range combines two smaller ranges plus the cost of the final product.'),
  mk('Matrix Chain Multiplication (Bottom-Up)', 'matrixChainBottomUp', 'Same problem, iterative: minimum multiplications for the chain described by dims.', 'int matrixChainBottomUp(vector<int>& dims)', 'return 0;', [
    ap('Tabulation by chain length', 'O(n³)', 'O(n²)', 'n2', 'Fill dp[i][j] for increasing j − i so every smaller range is ready.', `int matrixChainBottomUp(vector<int>& dims) {
    int n = dims.size();
    vector<vector<int>> dp(n, vector<int>(n, 0));
    for (int length = 2; length < n; length++) {
        for (int i = 1; i + length - 1 < n; i++) {
            int j = i + length - 1;
            dp[i][j] = INT_MAX;
            for (int k = i; k < j; k++) {
                int cost = dp[i][k] + dp[k + 1][j] + dims[i - 1] * dims[k] * dims[j];
                dp[i][j] = min(dp[i][j], cost);
            }
        }
    }
    return n < 3 ? 0 : dp[1][n - 1];
}`)], [[[10, 30, 5, 60]], [[40, 20, 30, 10, 30]], [[10, 20]], [[10, 20, 30]], [[1, 2, 3, 4, 3]], [[5, 4, 6, 2, 7]]], (d: number[]) => { const f = (i: number, j: number): number => { if (i === j) return 0; let b = Infinity; for (let k = i; k < j; k++) b = Math.min(b, f(i, k) + f(k + 1, j) + d[i - 1] * d[k] * d[j]); return b; }; return d.length < 3 ? 0 : f(1, d.length - 1); }, ['Loop over chain length first, then the start.'], 'Interval DP is filled diagonally.'),
  mk('Minimum Cost to Cut the Stick', 'minCostCuts', 'A stick of length n must be cut at the given positions (any order); a cut costs the current stick length. Return the minimum total cost.', 'int minCostCuts(int n, vector<int>& cuts)', 'return 0;', [
    ap('Interval DP over sorted cuts', 'O(c³)', 'O(c²)', 'n2', 'Add 0 and n as borders; dp[i][j] = min over cut k in (i, j) of (cuts[j] − cuts[i]) + dp[i][k] + dp[k][j].', `int minCostCuts(int n, vector<int>& cuts) {
    vector<int> points = cuts;
    points.push_back(0);
    points.push_back(n);
    sort(points.begin(), points.end());
    int m = points.size();
    vector<vector<int>> dp(m, vector<int>(m, 0));
    for (int length = 2; length < m; length++) {
        for (int i = 0; i + length < m; i++) {
            int j = i + length;
            dp[i][j] = INT_MAX;
            for (int k = i + 1; k < j; k++) {
                int cost = points[j] - points[i] + dp[i][k] + dp[k][j];
                dp[i][j] = min(dp[i][j], cost);
            }
        }
    }
    return dp[0][m - 1];
}`)], [[7, [1, 3, 4, 5]], [9, [5, 6, 1, 4, 2]], [5, [2]], [10, [2, 4, 7]], [4, [1, 2, 3]]], (n: number, c: number[]) => { const p = [0, ...[...c].sort((a, b) => a - b), n]; const f = (i: number, j: number): number => { if (j - i < 2) return 0; let b = Infinity; for (let k = i + 1; k < j; k++) b = Math.min(b, p[j] - p[i] + f(i, k) + f(k, j)); return b; }; return f(0, p.length - 1); }, ['Think of the LAST cut instead of the first.'], 'Same shape as matrix chain: split the interval at the last operation.'),
  mk('Burst Balloons', 'maxCoins', 'Bursting balloon i gives nums[i−1]·nums[i]·nums[i+1] coins (out-of-range neighbours count as 1). Return the maximum coins for bursting all.', 'int maxCoins(vector<int>& nums)', 'return 0;', [
    ap('Interval DP choosing the LAST balloon', 'O(n³)', 'O(n²)', 'n2', 'dp[i][j] = best for balloons strictly between i and j when k is burst last: its neighbours are then exactly i and j.', `int maxCoins(vector<int>& nums) {
    vector<int> values;
    values.push_back(1);
    for (int i = 0; i < nums.size(); i++) {
        values.push_back(nums[i]);
    }
    values.push_back(1);
    int m = values.size();
    vector<vector<int>> dp(m, vector<int>(m, 0));
    for (int length = 2; length < m; length++) {
        for (int i = 0; i + length < m; i++) {
            int j = i + length;
            for (int k = i + 1; k < j; k++) {
                int coins = values[i] * values[k] * values[j] + dp[i][k] + dp[k][j];
                dp[i][j] = max(dp[i][j], coins);
            }
        }
    }
    return dp[0][m - 1];
}`)], [[[3, 1, 5, 8]], [[1, 5]], [[7]], [[]], [[9, 76, 64, 21]], [[2, 3, 4]]], (a: number[]) => { const v = [1, ...a, 1]; const f = (i: number, j: number): number => { let b = 0; for (let k = i + 1; k < j; k++) b = Math.max(b, v[i] * v[k] * v[j] + f(i, k) + f(k, j)); return b; }; return f(0, v.length - 1); }, ['If k is the last balloon, its neighbours are the interval ends.'], 'Choosing the last operation makes the two sides independent.'),
  mk('Evaluate Boolean Expression to True', 'countWaysTrue', 'Expression of T/F with operators & | ^ (alternating, no parentheses). Count the parenthesisations that evaluate to true, modulo 1e9+7.', 'int countWaysTrue(string exp)', 'return 0;', [
    ap('Interval DP with (true, false) counts', 'O(n³)', 'O(n²)', 'n2', 'For each operator as the LAST one evaluated, combine the true/false counts of the left and right sub-expressions.', `int countWaysTrue(string exp) {
    int MOD = 1000000007;
    int n = exp.size();
    vector<vector<long long>> t(n, vector<long long>(n, 0));
    vector<vector<long long>> f(n, vector<long long>(n, 0));
    for (int i = 0; i < n; i += 2) {
        t[i][i] = exp[i] == 'T' ? 1 : 0;
        f[i][i] = exp[i] == 'F' ? 1 : 0;
    }
    for (int length = 3; length <= n; length += 2) {
        for (int i = 0; i + length - 1 < n; i += 2) {
            int j = i + length - 1;
            for (int k = i + 1; k < j; k += 2) {
                long long lt = t[i][k - 1];
                long long lf = f[i][k - 1];
                long long rt = t[k + 1][j];
                long long rf = f[k + 1][j];
                long long total = (lt + lf) % MOD * ((rt + rf) % MOD) % MOD;
                long long ways = 0;
                if (exp[k] == '&') {
                    ways = lt * rt % MOD;
                } else if (exp[k] == '|') {
                    ways = (total - lf * rf % MOD + MOD) % MOD;
                } else {
                    ways = (lt * rf + lf * rt) % MOD;
                }
                t[i][j] = (t[i][j] + ways) % MOD;
                f[i][j] = (f[i][j] + total - ways + MOD) % MOD;
            }
        }
    }
    return (int)t[0][n - 1];
}`)], [['T|F&T^F'], ['T'], ['F'], ['T^T^F'], ['F|T&F'], ['T&F^T|F']], (e: string) => { const f = (i: number, j: number): [number, number] => { if (i === j) return e[i] === 'T' ? [1, 0] : [0, 1]; let t = 0, ff = 0; for (let k = i + 1; k < j; k += 2) { const [lt, lf] = f(i, k - 1), [rt, rf] = f(k + 1, j); const tot = (lt + lf) * (rt + rf); const w = e[k] === '&' ? lt * rt : e[k] === '|' ? tot - lf * rf : lt * rf + lf * rt; t += w; ff += tot - w; } return [t, ff]; }; return f(0, e.length - 1)[0] % MOD; }, ['Count both true and false results for every sub-range.'], 'Each operator tells how left and right truth counts combine.'),
  mk('Palindrome Partitioning - II', 'minCut', 'Return the minimum number of cuts to split s into palindromic substrings.', 'int minCut(string s)', 'return 0;', [
    ap('Palindrome table + 1D DP', 'O(n²)', 'O(n²)', 'n2', 'isPal[i][j] is precomputed in O(n²); cuts[i] = 0 if s[0..i] is a palindrome, else the best over j of cuts[j−1] + 1.', `int minCut(string s) {
    int n = s.size();
    vector<vector<bool>> isPal(n, vector<bool>(n, false));
    for (int i = n - 1; i >= 0; i--) {
        for (int j = i; j < n; j++) {
            if (s[i] == s[j] && (j - i < 2 || isPal[i + 1][j - 1])) {
                isPal[i][j] = true;
            }
        }
    }
    vector<int> cuts(n, 0);
    for (int i = 0; i < n; i++) {
        if (isPal[0][i]) {
            cuts[i] = 0;
        } else {
            cuts[i] = i;
            for (int j = 1; j <= i; j++) {
                if (isPal[j][i]) {
                    cuts[i] = min(cuts[i], cuts[j - 1] + 1);
                }
            }
        }
    }
    return cuts[n - 1];
}`)], [['aab'], ['a'], ['ab'], ['aaaa'], ['abcba'], ['abacdc'], ['noonabbad']], (s: string) => { const pal = (x: string) => x === [...x].reverse().join(''); const f = (i: number): number => { if (i === s.length) return -1; let b = Infinity; for (let j = i; j < s.length; j++) if (pal(s.slice(i, j + 1))) b = Math.min(b, 1 + f(j + 1)); return b; }; return f(0); }, ['Precompute which substrings are palindromes.'], 'A cut-minimising partition DP with an O(1) palindrome test.'),
  mk('Partition Array for Maximum Sum', 'maxSumAfterPartitioning', 'Split the array into contiguous parts of length ≤ k; each part is replaced by its maximum repeated for every element. Return the largest possible total sum.', 'int maxSumAfterPartitioning(vector<int>& arr, int k)', 'return 0;', [
    ap('Front partition DP', 'O(n·k)', 'O(n)', 'n', 'dp[i] = best for the first i elements: try the last block length 1..k, keeping the running block maximum.', `int maxSumAfterPartitioning(vector<int>& arr, int k) {
    int n = arr.size();
    vector<int> dp(n + 1, 0);
    for (int i = 1; i <= n; i++) {
        int blockMax = 0;
        for (int len = 1; len <= k && len <= i; len++) {
            blockMax = max(blockMax, arr[i - len]);
            dp[i] = max(dp[i], dp[i - len] + blockMax * len);
        }
    }
    return dp[n];
}`)], [[[1, 15, 7, 9, 2, 5, 10], 3], [[1, 4, 1, 5, 7, 3, 6, 1, 9, 9, 3], 4], [[1], 1], [[3, 1, 2], 2], [[5, 5, 5], 3]], (a: number[], k: number) => { const f = (i: number): number => { if (i === a.length) return 0; let b = 0, m = 0; for (let l = 1; l <= k && i + l <= a.length; l++) { m = Math.max(m, a[i + l - 1]); b = Math.max(b, m * l + f(i + l)); } return b; }; return f(0); }, ['Choose the length of the last block.'], 'Front partitioning DP with a running maximum.'),
  mk('Maximum Rectangle Area with all 1\'s', 'maximalRectangle', 'Binary matrix: return the area of the largest rectangle containing only 1s.', 'int maximalRectangle(vector<vector<int>>& matrix)', 'return 0;', [
    ap('Histogram of heights + monotonic stack', 'O(R·C)', 'O(C)', 'n', 'Treat each row as the base of a histogram of consecutive 1s above; the largest rectangle in a histogram is found with a stack in O(C).', `int largestInHistogram(vector<int>& heights) {
    int n = heights.size();
    stack<int> st;
    int best = 0;
    for (int i = 0; i <= n; i++) {
        int current = i == n ? 0 : heights[i];
        while (!st.empty() && heights[st.top()] >= current) {
            int height = heights[st.top()];
            st.pop();
            int left = st.empty() ? -1 : st.top();
            best = max(best, height * (i - left - 1));
        }
        st.push(i);
    }
    return best;
}

int maximalRectangle(vector<vector<int>>& matrix) {
    if (matrix.empty()) {
        return 0;
    }
    int cols = matrix[0].size();
    vector<int> heights(cols, 0);
    int best = 0;
    for (int r = 0; r < matrix.size(); r++) {
        for (int c = 0; c < cols; c++) {
            heights[c] = matrix[r][c] == 1 ? heights[c] + 1 : 0;
        }
        best = max(best, largestInHistogram(heights));
    }
    return best;
}`)], [[[[1, 0, 1, 0, 0], [1, 0, 1, 1, 1], [1, 1, 1, 1, 1], [1, 0, 0, 1, 0]]], [[[0]]], [[[1]]], [[[1, 1], [1, 1]]], [[[1, 0], [1, 1], [1, 1]]], [[[0, 1, 1, 0], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 0, 0]]]], (m: number[][]) => { const R = m.length, C = m[0].length; let b = 0; for (let r1 = 0; r1 < R; r1++) for (let r2 = r1; r2 < R; r2++) for (let c1 = 0; c1 < C; c1++) for (let c2 = c1; c2 < C; c2++) { let ok = true; for (let i = r1; i <= r2 && ok; i++) for (let j = c1; j <= c2; j++) if (!m[i][j]) { ok = false; break; } if (ok) b = Math.max(b, (r2 - r1 + 1) * (c2 - c1 + 1)); } return b; }, ['Build a histogram row by row.'], 'Reduce the 2D question to many 1D largest-rectangle problems.'),
  mk('Count Square Submatrices with All Ones', 'countSquares', 'Count all square submatrices (any size) consisting only of 1s.', 'int countSquares(vector<vector<int>>& matrix)', 'return 0;', [
    ap('DP: side of the largest square ending at a cell', 'O(R·C)', 'O(R·C)', 'n', 'dp[r][c] = 1 + min(up, left, diagonal) for a 1-cell. That value is also the number of squares with that bottom-right corner.', `int countSquares(vector<vector<int>>& matrix) {
    int rows = matrix.size();
    int cols = matrix[0].size();
    vector<vector<int>> dp(rows, vector<int>(cols, 0));
    int total = 0;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (matrix[r][c] == 1) {
                if (r == 0 || c == 0) {
                    dp[r][c] = 1;
                } else {
                    dp[r][c] = 1 + min(dp[r - 1][c], min(dp[r][c - 1], dp[r - 1][c - 1]));
                }
                total += dp[r][c];
            }
        }
    }
    return total;
}`)], [[[[0, 1, 1, 1], [1, 1, 1, 1], [0, 1, 1, 1]]], [[[1, 0, 1], [1, 1, 0], [1, 1, 0]]], [[[0]]], [[[1]]], [[[1, 1], [1, 1]]]], (m: number[][]) => { const R = m.length, C = m[0].length; let c = 0; for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) for (let s = 1; i + s <= R && j + s <= C; s++) { let ok = true; for (let a = i; a < i + s && ok; a++) for (let b = j; b < j + s; b++) if (!m[a][b]) { ok = false; break; } if (ok) c++; } return c; }, ['Bottom-right corner of the square.'], 'A square of side s contains squares of every smaller side ending in the same corner.'),
];
