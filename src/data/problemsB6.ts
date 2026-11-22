// Batch 6: Step 15 (graphs) - every remaining problem.
import { Playable, ap, mk } from './kit';

const INF = 1e9;
type E = number[];
const adjU = (n: number, e: E[]) => { const g: number[][] = Array.from({ length: n }, () => []); e.forEach(([u, v]) => { g[u].push(v); g[v].push(u); }); return g; };
const adjD = (n: number, e: E[]) => { const g: number[][] = Array.from({ length: n }, () => []); e.forEach(([u, v]) => g[u].push(v)); return g; };
const wU = (n: number, e: E[]) => { const g: number[][][] = Array.from({ length: n }, () => []); e.forEach(([u, v, w]) => { g[u].push([v, w]); g[v].push([u, w]); }); return g; };
const wD = (n: number, e: E[]) => { const g: number[][][] = Array.from({ length: n }, () => []); e.forEach(([u, v, w]) => g[u].push([v, w])); return g; };
const dijk = (n: number, g: number[][][], s: number) => { const d = Array(n).fill(INF); d[s] = 0; const done = Array(n).fill(false); for (let i = 0; i < n; i++) { let u = -1; for (let j = 0; j < n; j++) if (!done[j] && (u < 0 || d[j] < d[u])) u = j; if (u < 0 || d[u] >= INF) break; done[u] = true; for (const [v, w] of g[u]) if (d[u] + w < d[v]) d[v] = d[u] + w; } return d; };
const comps = (n: number, g: number[][]) => { const seen = Array(n).fill(false); let c = 0; for (let i = 0; i < n; i++) if (!seen[i]) { c++; const st = [i]; seen[i] = true; while (st.length) { const u = st.pop()!; for (const v of g[u]) if (!seen[v]) { seen[v] = true; st.push(v); } } } return c; };
const topoValid = (n: number, e: E[], o: number[]) => o.length === n && new Set(o).size === n && e.every(([u, v]) => o.indexOf(u) < o.indexOf(v));
const hasCycleD = (n: number, e: E[]) => { const indeg = Array(n).fill(0); const g = adjD(n, e); e.forEach(([, v]) => indeg[v]++); const q = indeg.map((d, i) => (d === 0 ? i : -1)).filter(i => i >= 0); let c = 0; while (q.length) { const u = q.pop()!; c++; for (const v of g[u]) if (--indeg[v] === 0) q.push(v); } return c < n; };
const G1: [number, E[]] = [6, [[0, 1], [1, 2], [3, 4]]];
const gridBFS = (g: number[][], starts: [number, number][]) => { const R = g.length, C = g[0].length; const d = g.map(r => r.map(() => -1)); const q = starts.slice(); starts.forEach(([r, c]) => (d[r][c] = 0)); for (let i = 0; i < q.length; i++) { const [r, c] = q[i]; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = r + dr, b = c + dc; if (a >= 0 && b >= 0 && a < R && b < C && d[a][b] < 0) { d[a][b] = d[r][c] + 1; q.push([a, b]); } } } return d; };

const UF = `int findParent(vector<int>& parent, int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
    }
    return x;
}
`;

export const B6_PROBLEMS: Playable[] = [
  mk('Introduction to Graphs', 'graphStats', 'Given n vertices (0..n-1) and an undirected edge list, return {number of edges, maximum degree, number of isolated vertices}.', 'vector<int> graphStats(int n, vector<vector<int>>& edges)', 'return {};', [
    ap('Degree array', 'O(n + m)', 'O(n)', 'n', 'One pass over the edges increments two degrees each; one pass over the vertices.', `vector<int> graphStats(int n, vector<vector<int>>& edges) {
    vector<int> degree(n, 0);
    for (int i = 0; i < edges.size(); i++) {
        degree[edges[i][0]]++;
        degree[edges[i][1]]++;
    }
    int best = 0;
    int isolated = 0;
    for (int v = 0; v < n; v++) {
        best = max(best, degree[v]);
        if (degree[v] == 0) {
            isolated++;
        }
    }
    return {(int)edges.size(), best, isolated};
}`)], [G1, [4, [[0, 1], [0, 2], [0, 3]]], [1, []], [3, [[0, 1], [1, 2], [2, 0]]]], (n: number, e: E[]) => { const g = adjU(n, e); return [e.length, Math.max(...g.map(x => x.length)), g.filter(x => !x.length).length]; }, ['The degree of a vertex is the number of edges touching it.'], 'A graph is vertices plus edges; most questions start from degrees and neighbours.'),
  mk('Graph Representation', 'buildAdjacency', 'Build the adjacency list of an undirected graph: for each vertex the neighbours in the order the edges were given.', 'vector<vector<int>> buildAdjacency(int n, vector<vector<int>>& edges)', 'return {};', [
    ap('Adjacency list', 'O(n + m)', 'O(n + m)', 'n', 'Each edge is stored twice. A matrix would need O(n²) space.', `vector<vector<int>> buildAdjacency(int n, vector<vector<int>>& edges) {
    vector<vector<int>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        int u = edges[i][0];
        int v = edges[i][1];
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    return adj;
}`)], [G1, [3, [[0, 1], [1, 2], [2, 0]]], [2, []], [4, [[3, 0], [0, 2]]]], (n: number, e: E[]) => adjU(n, e), ['For an undirected edge, add each endpoint to the other\'s list.'], 'Lists are compact for sparse graphs; matrices answer "is there an edge?" in O(1).'),
  mk('Connected Components', 'countComponents', 'Return the number of connected components of an undirected graph.', 'int countComponents(int n, vector<vector<int>>& edges)', 'return 0;', [
    ap('DFS from every unvisited vertex', 'O(n + m)', 'O(n + m)', 'n', 'Each vertex and edge is processed once; every fresh DFS start is a new component.', `void dfs(int u, vector<vector<int>>& adj, vector<bool>& seen) {
    seen[u] = true;
    for (int i = 0; i < adj[u].size(); i++) {
        int v = adj[u][i];
        if (!seen[v]) {
            dfs(v, adj, seen);
        }
    }
}

int countComponents(int n, vector<vector<int>>& edges) {
    vector<vector<int>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back(edges[i][1]);
        adj[edges[i][1]].push_back(edges[i][0]);
    }
    vector<bool> seen(n, false);
    int count = 0;
    for (int v = 0; v < n; v++) {
        if (!seen[v]) {
            count++;
            dfs(v, adj, seen);
        }
    }
    return count;
}`)], [G1, [3, [[0, 1], [1, 2], [2, 0]]], [4, []], [1, []], [5, [[0, 1], [2, 3]]]], (n: number, e: E[]) => comps(n, adjU(n, e)), ['A traversal reaches exactly one component.'], 'Count how many times you have to start a new traversal.'),
  mk('Rotten Oranges', 'orangesRotting', 'Grid: 0 empty, 1 fresh, 2 rotten. Each minute rotten oranges rot their 4-neighbours. Return the minutes until none is fresh, or -1.', 'int orangesRotting(vector<vector<int>>& grid)', 'return 0;', [
    ap('Multi-source BFS', 'O(R·C)', 'O(R·C)', 'n', 'All rotten oranges start in the queue at time 0; each cell is rotted at most once.', `int orangesRotting(vector<vector<int>>& grid) {
    int rows = grid.size();
    int cols = grid[0].size();
    queue<pair<int, int>> q;
    int fresh = 0;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 2) {
                q.push({r, c});
            } else if (grid[r][c] == 1) {
                fresh++;
            }
        }
    }
    int dr[4] = {1, -1, 0, 0};
    int dc[4] = {0, 0, 1, -1};
    int minutes = 0;
    while (!q.empty() && fresh > 0) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            auto [r, c] = q.front();
            q.pop();
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k];
                int nc = c + dc[k];
                if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && grid[nr][nc] == 1) {
                    grid[nr][nc] = 2;
                    fresh--;
                    q.push({nr, nc});
                }
            }
        }
        minutes++;
    }
    return fresh == 0 ? minutes : -1;
}`)], [[[[2, 1, 1], [1, 1, 0], [0, 1, 1]]], [[[2, 1, 1], [0, 1, 1], [1, 0, 1]]], [[[0, 2]]], [[[1]]], [[[2, 2], [2, 2]]]], (g: number[][]) => { const R = g.length, C = g[0].length; const gg = g.map(r => r.slice()); let minutes = 0; for (;;) { const nx = gg.map(r => r.slice()); let ch = false; for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (gg[i][j] === 1 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => gg[i + a]?.[j + b] === 2)) { nx[i][j] = 2; ch = true; } if (!ch) break; for (let i = 0; i < R; i++) gg[i] = nx[i]; minutes++; } return gg.flat().includes(1) ? -1 : minutes; }, ['Start the BFS from all rotten oranges together.'], 'Simultaneous spreading is a multi-source BFS; levels are minutes.'),
  mk('Cycle Detection in Undirected Graph (BFS)', 'hasCycleBFS', 'Return true if the undirected graph contains a cycle.', 'bool hasCycleBFS(int n, vector<vector<int>>& edges)', 'return false;', [
    ap('BFS tracking the parent', 'O(n + m)', 'O(n)', 'n', 'Meeting an already-visited neighbour that is not the BFS parent closes a cycle.', `bool hasCycleBFS(int n, vector<vector<int>>& edges) {
    vector<vector<int>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back(edges[i][1]);
        adj[edges[i][1]].push_back(edges[i][0]);
    }
    vector<bool> seen(n, false);
    for (int start = 0; start < n; start++) {
        if (seen[start]) {
            continue;
        }
        queue<pair<int, int>> q;
        q.push({start, -1});
        seen[start] = true;
        while (!q.empty()) {
            auto [u, parent] = q.front();
            q.pop();
            for (int i = 0; i < adj[u].size(); i++) {
                int v = adj[u][i];
                if (!seen[v]) {
                    seen[v] = true;
                    q.push({v, u});
                } else if (v != parent) {
                    return true;
                }
            }
        }
    }
    return false;
}`)], [[4, [[0, 1], [1, 2], [2, 3]]], [3, [[0, 1], [1, 2], [2, 0]]], [5, [[0, 1], [2, 3], [3, 4], [4, 2]]], [1, []], [4, [[0, 1], [0, 2], [0, 3]]]], (n: number, e: E[]) => e.length > n - comps(n, adjU(n, e)), ['Ignore the edge you came from.'], 'A forest on n nodes with c components has exactly n − c edges; more means a cycle.'),
  mk('01 Matrix', 'updateMatrix', 'For each cell return the distance to the nearest 0 (4-directional).', 'vector<vector<int>> updateMatrix(vector<vector<int>>& mat)', 'return {};', [
    ap('Multi-source BFS from all zeros', 'O(R·C)', 'O(R·C)', 'n', 'All zeros start at distance 0; each cell is finalised the first time it is reached.', `vector<vector<int>> updateMatrix(vector<vector<int>>& mat) {
    int rows = mat.size();
    int cols = mat[0].size();
    vector<vector<int>> dist(rows, vector<int>(cols, -1));
    queue<pair<int, int>> q;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (mat[r][c] == 0) {
                dist[r][c] = 0;
                q.push({r, c});
            }
        }
    }
    int dr[4] = {1, -1, 0, 0};
    int dc[4] = {0, 0, 1, -1};
    while (!q.empty()) {
        auto [r, c] = q.front();
        q.pop();
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && dist[nr][nc] == -1) {
                dist[nr][nc] = dist[r][c] + 1;
                q.push({nr, nc});
            }
        }
    }
    return dist;
}`)], [[[[0, 0, 0], [0, 1, 0], [1, 1, 1]]], [[[0, 1, 1, 1]]], [[[1, 1], [1, 0]]], [[[0]]]], (g: number[][]) => { const st: [number, number][] = []; g.forEach((r, i) => r.forEach((v, j) => v === 0 && st.push([i, j]))); return gridBFS(g, st); }, ['Go from the zeros outwards, not from each 1 to a zero.'], 'Reversing the search direction turns many BFS runs into one.'),
  mk('Surrounded Regions', 'solveRegions', 'Grid of 1 (the "O") and 0 (the "X"). Turn every group of 1s that is NOT connected to the border into 0s. Return the grid.', 'vector<vector<int>> solveRegions(vector<vector<int>>& board)', 'return board;', [
    ap('DFS from the border', 'O(R·C)', 'O(R·C)', 'n', 'Mark every 1 reachable from a border 1 as safe, then flip the unmarked ones.', `void mark(vector<vector<int>>& board, vector<vector<bool>>& safe, int r, int c) {
    if (r < 0 || c < 0 || r >= board.size() || c >= board[0].size() || board[r][c] != 1 || safe[r][c]) {
        return;
    }
    safe[r][c] = true;
    mark(board, safe, r + 1, c);
    mark(board, safe, r - 1, c);
    mark(board, safe, r, c + 1);
    mark(board, safe, r, c - 1);
}

vector<vector<int>> solveRegions(vector<vector<int>>& board) {
    int rows = board.size();
    int cols = board[0].size();
    vector<vector<bool>> safe(rows, vector<bool>(cols, false));
    for (int r = 0; r < rows; r++) {
        mark(board, safe, r, 0);
        mark(board, safe, r, cols - 1);
    }
    for (int c = 0; c < cols; c++) {
        mark(board, safe, 0, c);
        mark(board, safe, rows - 1, c);
    }
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (board[r][c] == 1 && !safe[r][c]) {
                board[r][c] = 0;
            }
        }
    }
    return board;
}`)], [[[[0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 1, 0], [0, 1, 0, 0]]], [[[1]]], [[[1, 1, 1], [1, 1, 1], [1, 1, 1]]], [[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], [[[1, 0, 1], [0, 1, 0], [1, 0, 1]]]], (g: number[][]) => { const R = g.length, C = g[0].length; const safe = g.map(r => r.map(() => false)); const go = (r: number, c: number) => { if (r < 0 || c < 0 || r >= R || c >= C || g[r][c] !== 1 || safe[r][c]) return; safe[r][c] = true; go(r + 1, c); go(r - 1, c); go(r, c + 1); go(r, c - 1); }; for (let i = 0; i < R; i++) { go(i, 0); go(i, C - 1); } for (let j = 0; j < C; j++) { go(0, j); go(R - 1, j); } return g.map((r, i) => r.map((v, j) => (v === 1 && safe[i][j] ? 1 : 0))); }, ['Regions touching the border can never be captured.'], 'Find what is safe, flip the rest.'),
  mk('Number of Enclaves', 'numEnclaves', 'Count land cells (1) that cannot walk off the grid boundary.', 'int numEnclaves(vector<vector<int>>& grid)', 'return 0;', [
    ap('Multi-source BFS from boundary land', 'O(R·C)', 'O(R·C)', 'n', 'Remove all land reachable from the boundary; what is left is enclosed.', `int numEnclaves(vector<vector<int>>& grid) {
    int rows = grid.size();
    int cols = grid[0].size();
    queue<pair<int, int>> q;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if ((r == 0 || c == 0 || r == rows - 1 || c == cols - 1) && grid[r][c] == 1) {
                grid[r][c] = 0;
                q.push({r, c});
            }
        }
    }
    int dr[4] = {1, -1, 0, 0};
    int dc[4] = {0, 0, 1, -1};
    while (!q.empty()) {
        auto [r, c] = q.front();
        q.pop();
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && grid[nr][nc] == 1) {
                grid[nr][nc] = 0;
                q.push({nr, nc});
            }
        }
    }
    int count = 0;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            count += grid[r][c];
        }
    }
    return count;
}`)], [[[[0, 0, 0, 0], [1, 0, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]]], [[[0, 1, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]]], [[[1]]], [[[0, 0, 0], [0, 1, 0], [0, 0, 0]]]], (g: number[][]) => { const R = g.length, C = g[0].length; const s = g.map(r => r.slice()); const go = (r: number, c: number) => { if (r < 0 || c < 0 || r >= R || c >= C || s[r][c] !== 1) return; s[r][c] = 0; go(r + 1, c); go(r - 1, c); go(r, c + 1); go(r, c - 1); }; for (let i = 0; i < R; i++) { go(i, 0); go(i, C - 1); } for (let j = 0; j < C; j++) { go(0, j); go(R - 1, j); } return s.flat().reduce((a, b) => a + b, 0); }, ['Same idea as surrounded regions.'], 'Boundary land is never an enclave, nor is anything connected to it.'),
  mk('Word Ladder I', 'ladderLength', 'Return the number of words in the shortest sequence from beginWord to endWord changing one letter at a time, every intermediate word in the list (0 if impossible).', 'int ladderLength(string beginWord, string endWord, vector<string>& wordList)', 'return 0;', [
    ap('BFS over one-letter changes', 'O(N · L · 26)', 'O(N · L)', 'n', 'Each word is dequeued once; for each of its L positions we try 26 letters with an O(1) hash lookup (the hashing cost is O(L) per probe).', `int ladderLength(string beginWord, string endWord, vector<string>& wordList) {
    unordered_set<string> words;
    for (int i = 0; i < wordList.size(); i++) {
        words.insert(wordList[i]);
    }
    if (!words.count(endWord)) {
        return 0;
    }
    queue<pair<string, int>> q;
    q.push({beginWord, 1});
    words.erase(beginWord);
    while (!q.empty()) {
        auto [word, steps] = q.front();
        q.pop();
        if (word == endWord) {
            return steps;
        }
        for (int i = 0; i < word.size(); i++) {
            char original = word[i];
            for (char ch = 'a'; ch <= 'z'; ch++) {
                word[i] = ch;
                if (words.count(word)) {
                    words.erase(word);
                    q.push({word, steps + 1});
                }
            }
            word[i] = original;
        }
    }
    return 0;
}`)], [['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog']], ['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log']], ['a', 'c', ['a', 'b', 'c']], ['abc', 'abd', ['abd']], ['hot', 'dog', ['hot', 'dog']]], (b: string, e: string, w: string[]) => { const set = new Set(w); if (!set.has(e)) return 0; const seen = new Set([b]); let cur = [b], d = 1; while (cur.length) { const nx: string[] = []; for (const x of cur) { if (x === e) return d; for (let i = 0; i < x.length; i++) for (let c = 97; c < 123; c++) { const y = x.slice(0, i) + String.fromCharCode(c) + x.slice(i + 1); if (set.has(y) && !seen.has(y)) { seen.add(y); nx.push(y); } } } cur = nx; d++; } return 0; }, ['Words are nodes; two words are adjacent if they differ by one letter.'], 'Shortest transformation = shortest path in an implicit graph.'),
  mk('Word Ladder II', 'findLadders', 'Return all shortest transformation sequences from beginWord to endWord (empty if none).', 'vector<vector<string>> findLadders(string beginWord, string endWord, vector<string>& wordList)', 'return {};', [
    ap('BFS for levels, then DFS back to the start', 'O(N · L · 26 + paths)', 'O(N · L)', 'n', 'BFS records each word\'s shortest distance; a DFS from the end only steps to words exactly one level closer, so it follows shortest paths only.', `vector<vector<string>> findLadders(string beginWord, string endWord, vector<string>& wordList) {
    unordered_set<string> words;
    for (int i = 0; i < wordList.size(); i++) {
        words.insert(wordList[i]);
    }
    vector<vector<string>> answer;
    if (!words.count(endWord)) {
        return answer;
    }
    unordered_map<string, int> level;
    queue<string> q;
    q.push(beginWord);
    level[beginWord] = 0;
    while (!q.empty()) {
        string word = q.front();
        q.pop();
        for (int i = 0; i < word.size(); i++) {
            string next = word;
            for (char ch = 'a'; ch <= 'z'; ch++) {
                next[i] = ch;
                if (words.count(next) && !level.count(next)) {
                    level[next] = level[word] + 1;
                    q.push(next);
                }
            }
        }
    }
    if (!level.count(endWord)) {
        return answer;
    }
    vector<string> path;
    path.push_back(endWord);
    vector<pair<string, vector<string>>> work;
    work.push_back({endWord, path});
    while (!work.empty()) {
        auto [word, current] = work.back();
        work.pop_back();
        if (word == beginWord) {
            vector<string> forward;
            for (int i = current.size() - 1; i >= 0; i--) {
                forward.push_back(current[i]);
            }
            answer.push_back(forward);
            continue;
        }
        for (int i = 0; i < word.size(); i++) {
            string prev = word;
            for (char ch = 'a'; ch <= 'z'; ch++) {
                prev[i] = ch;
                if (prev != word && level.count(prev) && level[prev] + 1 == level[word]) {
                    vector<string> extended = current;
                    extended.push_back(prev);
                    work.push_back({prev, extended});
                }
            }
        }
    }
    return answer;
}`)], [['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog']], ['hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log']], ['a', 'c', ['a', 'b', 'c']], ['red', 'tax', ['ted', 'tex', 'red', 'tax', 'tad', 'den', 'rex', 'pee']]], (b: string, e: string, w: string[]) => { const set = new Set(w); if (!set.has(e)) return []; const lvl = new Map([[b, 0]]); let cur = [b]; while (cur.length) { const nx: string[] = []; for (const x of cur) for (let i = 0; i < x.length; i++) for (let c = 97; c < 123; c++) { const y = x.slice(0, i) + String.fromCharCode(c) + x.slice(i + 1); if (set.has(y) && !lvl.has(y)) { lvl.set(y, lvl.get(x)! + 1); nx.push(y); } } cur = nx; } if (!lvl.has(e)) return []; const out: string[][] = []; const go = (x: string, path: string[]) => { if (x === b) { out.push([...path].reverse()); return; } for (let i = 0; i < x.length; i++) for (let c = 97; c < 123; c++) { const y = x.slice(0, i) + String.fromCharCode(c) + x.slice(i + 1); if (y !== x && lvl.get(y) === lvl.get(x)! - 1) go(y, [...path, y]); } }; go(e, [e]); return out; }, ['A word is on a shortest path only if its level is exactly one less than its successor\'s.'], 'Compute levels first, then walk back along level-decreasing edges.', { unordered: true }),
  mk('Number of Distinct Islands', 'countDistinctIslands', 'Count islands (4-connected 1s) with distinct shapes (translation only).', 'int countDistinctIslands(vector<vector<int>>& grid)', 'return 0;', [
    ap('DFS recording coordinates relative to the island\'s first cell', 'O(R·C)', 'O(R·C)', 'n', 'Every cell is visited once; the relative-offset signature (as a string) goes into a set.', `void explore(vector<vector<int>>& grid, int r, int c, int baseR, int baseC, string& shape) {
    if (r < 0 || c < 0 || r >= grid.size() || c >= grid[0].size() || grid[r][c] != 1) {
        return;
    }
    grid[r][c] = 0;
    shape += to_string(r - baseR) + "," + to_string(c - baseC) + ";";
    explore(grid, r + 1, c, baseR, baseC, shape);
    explore(grid, r - 1, c, baseR, baseC, shape);
    explore(grid, r, c + 1, baseR, baseC, shape);
    explore(grid, r, c - 1, baseR, baseC, shape);
}

int countDistinctIslands(vector<vector<int>>& grid) {
    set<string> shapes;
    for (int r = 0; r < grid.size(); r++) {
        for (int c = 0; c < grid[0].size(); c++) {
            if (grid[r][c] == 1) {
                string shape = "";
                explore(grid, r, c, r, c, shape);
                shapes.insert(shape);
            }
        }
    }
    return shapes.size();
}`)], [[[[1, 1, 0, 0, 0], [1, 1, 0, 0, 0], [0, 0, 0, 1, 1], [0, 0, 0, 1, 1]]], [[[1, 1, 0, 1, 1], [1, 0, 0, 0, 0], [0, 0, 0, 0, 1], [1, 1, 0, 1, 1]]], [[[1]]], [[[0]]], [[[1, 0, 1], [0, 0, 0], [1, 0, 1]]]], (g0: number[][]) => { const g = g0.map(r => r.slice()); const R = g.length, C = g[0].length; const set = new Set<string>(); for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (g[i][j] === 1) { const cells: string[] = []; const go = (r: number, c: number) => { if (r < 0 || c < 0 || r >= R || c >= C || g[r][c] !== 1) return; g[r][c] = 0; cells.push(`${r - i},${c - j}`); go(r + 1, c); go(r - 1, c); go(r, c + 1); go(r, c - 1); }; go(i, j); set.add(cells.sort().join(';')); } return set.size; }, ['Subtract the starting cell from each coordinate.'], 'Two islands have the same shape if their relative coordinates match.'),
  mk('Cycle Detection in Directed Graph (DFS)', 'hasCycleDirectedDFS', 'Return true if the directed graph has a cycle.', 'bool hasCycleDirectedDFS(int n, vector<vector<int>>& edges)', 'return false;', [
    ap('DFS with a recursion-stack array', 'O(n + m)', 'O(n)', 'n', 'Reaching a vertex that is still on the current DFS path means a back edge, i.e. a cycle.', `bool dfs(int u, vector<vector<int>>& adj, vector<int>& state) {
    state[u] = 1;
    for (int i = 0; i < adj[u].size(); i++) {
        int v = adj[u][i];
        if (state[v] == 1) {
            return true;
        }
        if (state[v] == 0 && dfs(v, adj, state)) {
            return true;
        }
    }
    state[u] = 2;
    return false;
}

bool hasCycleDirectedDFS(int n, vector<vector<int>>& edges) {
    vector<vector<int>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back(edges[i][1]);
    }
    vector<int> state(n, 0);
    for (int v = 0; v < n; v++) {
        if (state[v] == 0 && dfs(v, adj, state)) {
            return true;
        }
    }
    return false;
}`)], [[4, [[0, 1], [1, 2], [2, 3]]], [3, [[0, 1], [1, 2], [2, 0]]], [4, [[0, 1], [0, 2], [1, 3], [2, 3]]], [1, [[0, 0]]], [5, [[0, 1], [2, 3], [3, 4], [4, 2]]]], (n: number, e: E[]) => hasCycleD(n, e), ['0 = unvisited, 1 = on the current path, 2 = finished.'], 'A visited vertex is only a problem if it is still on the current path.'),
  mk('Topological Sort (DFS)', 'topoSortDFS', 'Return a topological order of a DAG (every edge u→v has u before v).', 'vector<int> topoSortDFS(int n, vector<vector<int>>& edges)', 'return {};', [
    ap('DFS finishing order, reversed', 'O(n + m)', 'O(n)', 'n', 'A vertex is pushed on the stack after all its descendants; popping the stack gives a valid order.', `void dfs(int u, vector<vector<int>>& adj, vector<bool>& seen, stack<int>& order) {
    seen[u] = true;
    for (int i = 0; i < adj[u].size(); i++) {
        int v = adj[u][i];
        if (!seen[v]) {
            dfs(v, adj, seen, order);
        }
    }
    order.push(u);
}

vector<int> topoSortDFS(int n, vector<vector<int>>& edges) {
    vector<vector<int>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back(edges[i][1]);
    }
    vector<bool> seen(n, false);
    stack<int> order;
    for (int v = 0; v < n; v++) {
        if (!seen[v]) {
            dfs(v, adj, seen, order);
        }
    }
    vector<int> result;
    while (!order.empty()) {
        result.push_back(order.top());
        order.pop();
    }
    return result;
}`)], [[6, [[5, 2], [5, 0], [4, 0], [4, 1], [2, 3], [3, 1]]], [4, [[0, 1], [1, 2], [2, 3]]], [3, []], [5, [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]]]], (n: number, e: E[]) => { const g = adjD(n, e); const seen: boolean[] = []; const out: number[] = []; const go = (u: number) => { seen[u] = true; g[u].forEach(v => !seen[v] && go(v)); out.push(u); }; for (let i = 0; i < n; i++) if (!seen[i]) go(i); return out.reverse(); }, ['Push a node after visiting everything reachable from it.'], 'Finishing times in DFS respect edge direction.', { check: (a: any[], got: number[]) => topoValid(a[0], a[1], got) }),
  mk('Cycle Detection in Directed Graph (BFS)', 'hasCycleKahn', 'Detect a cycle in a directed graph with Kahn\'s algorithm.', 'bool hasCycleKahn(int n, vector<vector<int>>& edges)', 'return false;', [
    ap('Kahn\'s algorithm (indegree BFS)', 'O(n + m)', 'O(n + m)', 'n', 'If fewer than n vertices can be removed with indegree 0, the rest lie on or behind a cycle.', `bool hasCycleKahn(int n, vector<vector<int>>& edges) {
    vector<vector<int>> adj(n);
    vector<int> indegree(n, 0);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back(edges[i][1]);
        indegree[edges[i][1]]++;
    }
    queue<int> q;
    for (int v = 0; v < n; v++) {
        if (indegree[v] == 0) {
            q.push(v);
        }
    }
    int removed = 0;
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        removed++;
        for (int i = 0; i < adj[u].size(); i++) {
            int v = adj[u][i];
            indegree[v]--;
            if (indegree[v] == 0) {
                q.push(v);
            }
        }
    }
    return removed != n;
}`)], [[4, [[0, 1], [1, 2], [2, 3]]], [3, [[0, 1], [1, 2], [2, 0]]], [4, [[0, 1], [0, 2], [1, 3], [2, 3]]], [1, [[0, 0]]], [5, [[0, 1], [2, 3], [3, 4], [4, 2]]]], (n: number, e: E[]) => hasCycleD(n, e), ['If a topological order cannot include every vertex, there is a cycle.'], 'Vertices on a cycle never reach indegree 0.'),
  mk('Course Schedule II', 'findOrder', 'Prerequisites [a, b] mean take b before a. Return an order to finish all n courses, or an empty list if impossible.', 'vector<int> findOrder(int n, vector<vector<int>>& prerequisites)', 'return {};', [
    ap('Kahn\'s algorithm', 'O(n + m)', 'O(n + m)', 'n', 'Courses with no remaining prerequisites are taken first; the result is complete iff there is no cycle.', `vector<int> findOrder(int n, vector<vector<int>>& prerequisites) {
    vector<vector<int>> adj(n);
    vector<int> indegree(n, 0);
    for (int i = 0; i < prerequisites.size(); i++) {
        adj[prerequisites[i][1]].push_back(prerequisites[i][0]);
        indegree[prerequisites[i][0]]++;
    }
    queue<int> q;
    for (int v = 0; v < n; v++) {
        if (indegree[v] == 0) {
            q.push(v);
        }
    }
    vector<int> order;
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        order.push_back(u);
        for (int i = 0; i < adj[u].size(); i++) {
            int v = adj[u][i];
            indegree[v]--;
            if (indegree[v] == 0) {
                q.push(v);
            }
        }
    }
    if (order.size() != n) {
        return {};
    }
    return order;
}`)], [[2, [[1, 0]]], [4, [[1, 0], [2, 0], [3, 1], [3, 2]]], [2, [[1, 0], [0, 1]]], [1, []], [3, [[0, 1], [1, 2]]]], (n: number, p: E[]) => { const e = p.map(([a, b]) => [b, a]); return hasCycleD(n, e) ? [] : [0]; }, ['Edge b → a: b must come first.'], 'A valid course order is a topological order.', { check: (a: any[], got: number[]) => { const [n, p] = a; if (hasCycleD(n, p.map(([x, y]: number[]) => [y, x]))) return got.length === 0; return topoValid(n, p.map(([x, y]: number[]) => [y, x]), got); } }),
  mk('Find Eventual Safe States', 'eventualSafeNodes', 'A node is safe if every path from it ends in a terminal node (no outgoing edges). Given the adjacency list of a directed graph, return all safe nodes in ascending order.', 'vector<int> eventualSafeNodes(vector<vector<int>>& graph)', 'return {};', [
    ap('Reverse graph + Kahn on outdegrees', 'O(n + m)', 'O(n + m)', 'n', 'Terminal nodes are safe; a node becomes safe when all its successors are safe. Reverse the edges and peel off nodes whose out-degree reaches 0.', `vector<int> eventualSafeNodes(vector<vector<int>>& graph) {
    int n = graph.size();
    vector<vector<int>> reverse(n);
    vector<int> outdegree(n, 0);
    for (int u = 0; u < n; u++) {
        for (int i = 0; i < graph[u].size(); i++) {
            reverse[graph[u][i]].push_back(u);
            outdegree[u]++;
        }
    }
    queue<int> q;
    for (int u = 0; u < n; u++) {
        if (outdegree[u] == 0) {
            q.push(u);
        }
    }
    vector<int> safe;
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        safe.push_back(u);
        for (int i = 0; i < reverse[u].size(); i++) {
            int p = reverse[u][i];
            outdegree[p]--;
            if (outdegree[p] == 0) {
                q.push(p);
            }
        }
    }
    sort(safe.begin(), safe.end());
    return safe;
}`)], [[[[1, 2], [2, 3], [5], [0], [5], [], []]], [[[1, 2, 3, 4], [1, 2], [3, 4], [0, 4], []]], [[[]]], [[[0]]], [[[1], [2], [0], []]]], (g: number[][]) => { const n = g.length; const safe = Array(n).fill(0); const state = Array(n).fill(0); const go = (u: number): boolean => { if (state[u]) return state[u] === 2; state[u] = 1; for (const v of g[u]) if (!go(v)) return false; state[u] = 2; return true; }; const out: number[] = []; for (let i = 0; i < n; i++) if (go(i)) out.push(i); void safe; return out; }, ['Nodes on a cycle (or leading into one) are unsafe.'], 'Safe nodes are exactly the ones a reversed Kahn run can remove.'),
  mk('Alien Dictionary', 'alienOrder', 'Words are sorted in an alien language. Return a string of the letters in a valid alphabet order, or "" if the ordering is inconsistent. (Only letters that appear are listed.)', 'string alienOrder(vector<string>& words)', 'return "";', [
    ap('Build letter graph from adjacent words + topological sort', 'O(total chars + 26²)', 'O(26)', '1', 'The first differing letter of each adjacent pair gives one edge; Kahn\'s algorithm orders the (at most 26) letters.', `string alienOrder(vector<string>& words) {
    vector<vector<int>> adj(26);
    vector<int> indegree(26, 0);
    vector<bool> present(26, false);
    for (int i = 0; i < words.size(); i++) {
        for (int j = 0; j < words[i].size(); j++) {
            present[words[i][j] - 'a'] = true;
        }
    }
    for (int i = 0; i + 1 < words.size(); i++) {
        string a = words[i];
        string b = words[i + 1];
        int len = min(a.size(), b.size());
        int j = 0;
        while (j < len && a[j] == b[j]) {
            j++;
        }
        if (j == len) {
            if (a.size() > b.size()) {
                return "";
            }
            continue;
        }
        adj[a[j] - 'a'].push_back(b[j] - 'a');
        indegree[b[j] - 'a']++;
    }
    queue<int> q;
    int letters = 0;
    for (int c = 0; c < 26; c++) {
        if (present[c]) {
            letters++;
            if (indegree[c] == 0) {
                q.push(c);
            }
        }
    }
    string order = "";
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        order += (char)('a' + u);
        for (int i = 0; i < adj[u].size(); i++) {
            int v = adj[u][i];
            indegree[v]--;
            if (indegree[v] == 0) {
                q.push(v);
            }
        }
    }
    if (order.size() != letters) {
        return "";
    }
    return order;
}`)], [[['wrt', 'wrf', 'er', 'ett', 'rftt']], [['z', 'x']], [['z', 'x', 'z']], [['abc', 'ab']], [['baa', 'abcd', 'abca', 'cab', 'cad']], [['a']]], (w: string[]) => { void w; return ''; }, ['Compare each pair of adjacent words.', 'The first differing letters give an ordering constraint.'], 'A dictionary order is a set of letter precedences: a topological sort problem.', { check: (a: any[], got: string) => { const w: string[] = a[0]; const letters = new Set(w.join('')); const edges: [string, string][] = []; for (let i = 0; i + 1 < w.length; i++) { const x = w[i], y = w[i + 1]; let j = 0; while (j < Math.min(x.length, y.length) && x[j] === y[j]) j++; if (j === Math.min(x.length, y.length)) { if (x.length > y.length) return got === ''; } else edges.push([x[j], y[j]]); } const adj = new Map<string, string[]>(); const ind = new Map<string, number>(); letters.forEach(c => { adj.set(c, []); ind.set(c, 0); }); edges.forEach(([u, v]) => { adj.get(u)!.push(v); ind.set(v, ind.get(v)! + 1); }); const q = [...letters].filter(c => ind.get(c) === 0); let cnt = 0; while (q.length) { const u = q.pop()!; cnt++; for (const v of adj.get(u)!) { ind.set(v, ind.get(v)! - 1); if (ind.get(v) === 0) q.push(v); } } if (cnt < letters.size) return got === ''; if (got.length !== letters.size || new Set(got).size !== letters.size) return false; return edges.every(([u, v]) => got.indexOf(u) < got.indexOf(v)); } }),
  // ---------- shortest paths ----------
  mk('Shortest Path in Undirected Graph with Unit Distance', 'shortestUnit', 'Undirected, unweighted graph. Return the shortest distance from src to every vertex (-1 if unreachable).', 'vector<int> shortestUnit(int n, vector<vector<int>>& edges, int src)', 'return {};', [
    ap('BFS', 'O(n + m)', 'O(n + m)', 'n', 'BFS reaches vertices in non-decreasing distance order, so the first time we see a vertex is its shortest distance.', `vector<int> shortestUnit(int n, vector<vector<int>>& edges, int src) {
    vector<vector<int>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back(edges[i][1]);
        adj[edges[i][1]].push_back(edges[i][0]);
    }
    vector<int> dist(n, -1);
    queue<int> q;
    dist[src] = 0;
    q.push(src);
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        for (int i = 0; i < adj[u].size(); i++) {
            int v = adj[u][i];
            if (dist[v] == -1) {
                dist[v] = dist[u] + 1;
                q.push(v);
            }
        }
    }
    return dist;
}`)], [[6, [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 5]], 0], [4, [[0, 1]], 2], [1, [], 0], [5, [[0, 1], [1, 2], [2, 3], [3, 4], [0, 4]], 0]], (n: number, e: E[], s: number) => { const d = Array(n).fill(-1); d[s] = 0; const g = adjU(n, e); const q = [s]; for (let i = 0; i < q.length; i++) for (const v of g[q[i]]) if (d[v] < 0) { d[v] = d[q[i]] + 1; q.push(v); } return d; }, ['All edges cost 1.'], 'A queue gives layers; the layer number is the distance.'),
  mk('Shortest Path in DAG', 'shortestPathDAG', 'Directed acyclic graph with weighted edges [u, v, w]. Return the shortest distance from vertex 0 to all vertices (-1 if unreachable).', 'vector<int> shortestPathDAG(int n, vector<vector<int>>& edges)', 'return {};', [
    ap('Topological order relaxation', 'O(n + m)', 'O(n + m)', 'n', 'Processing vertices in topological order guarantees every vertex\'s distance is final when its out-edges are relaxed.', `void dfs(int u, vector<vector<pair<int, int>>>& adj, vector<bool>& seen, stack<int>& order) {
    seen[u] = true;
    for (int i = 0; i < adj[u].size(); i++) {
        int v = adj[u][i].first;
        if (!seen[v]) {
            dfs(v, adj, seen, order);
        }
    }
    order.push(u);
}

vector<int> shortestPathDAG(int n, vector<vector<int>>& edges) {
    vector<vector<pair<int, int>>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back({edges[i][1], edges[i][2]});
    }
    vector<bool> seen(n, false);
    stack<int> order;
    for (int v = 0; v < n; v++) {
        if (!seen[v]) {
            dfs(v, adj, seen, order);
        }
    }
    vector<int> dist(n, INT_MAX);
    dist[0] = 0;
    while (!order.empty()) {
        int u = order.top();
        order.pop();
        if (dist[u] == INT_MAX) {
            continue;
        }
        for (int i = 0; i < adj[u].size(); i++) {
            int v = adj[u][i].first;
            int w = adj[u][i].second;
            dist[v] = min(dist[v], dist[u] + w);
        }
    }
    for (int v = 0; v < n; v++) {
        if (dist[v] == INT_MAX) {
            dist[v] = -1;
        }
    }
    return dist;
}`)], [[6, [[0, 1, 2], [0, 4, 1], [4, 5, 4], [4, 2, 2], [1, 2, 3], [2, 3, 6], [5, 3, 1]]], [3, [[0, 1, 5]]], [1, []], [4, [[0, 1, 1], [0, 2, 5], [1, 2, 1], [2, 3, 1]]]], (n: number, e: E[]) => { const d = dijk(n, wD(n, e), 0); return d.map(x => (x >= INF ? -1 : x)); }, ['Topologically sort first.'], 'In a DAG a single sweep in topological order replaces Dijkstra.'),
  mk("Dijkstra's Algorithm (Priority Queue)", 'dijkstraPQ', 'Undirected graph with positive weights [u, v, w]. Return the shortest distance from src to every vertex (-1 if unreachable).', 'vector<int> dijkstraPQ(int n, vector<vector<int>>& edges, int src)', 'return {};', [
    ap('Min-heap Dijkstra', 'O((n + m) log n)', 'O(n + m)', 'nlogn', 'Each edge relaxation may push one heap entry (log) ; stale entries are skipped.', `vector<int> dijkstraPQ(int n, vector<vector<int>>& edges, int src) {
    vector<vector<pair<int, int>>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back({edges[i][1], edges[i][2]});
        adj[edges[i][1]].push_back({edges[i][0], edges[i][2]});
    }
    vector<int> dist(n, INT_MAX);
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    dist[src] = 0;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > dist[u]) {
            continue;
        }
        for (int i = 0; i < adj[u].size(); i++) {
            int v = adj[u][i].first;
            int w = adj[u][i].second;
            if (d + w < dist[v]) {
                dist[v] = d + w;
                pq.push({dist[v], v});
            }
        }
    }
    for (int v = 0; v < n; v++) {
        if (dist[v] == INT_MAX) {
            dist[v] = -1;
        }
    }
    return dist;
}`)], [[5, [[0, 1, 2], [0, 2, 4], [1, 2, 1], [1, 3, 7], [2, 4, 3], [3, 4, 1]], 0], [4, [[0, 1, 5]], 0], [1, [], 0], [4, [[0, 1, 1], [1, 2, 1], [0, 2, 5], [2, 3, 2]], 3]], (n: number, e: E[], s: number) => dijk(n, wU(n, e), s).map(x => (x >= INF ? -1 : x)), ['Always expand the closest unfinished vertex.'], 'With non-negative weights, the closest frontier vertex can never be improved.'),
  mk("Dijkstra's Algorithm (Set)", 'dijkstraSet', 'Same task as Dijkstra with a priority queue, implemented with an ordered set so stale entries can be erased.', 'vector<int> dijkstraSet(int n, vector<vector<int>>& edges, int src)', 'return {};', [
    ap('Ordered-set Dijkstra', 'O((n + m) log n)', 'O(n + m)', 'nlogn', 'An improved vertex has its old (dist, v) pair erased and the new one inserted, so the set never holds stale entries.', `vector<int> dijkstraSet(int n, vector<vector<int>>& edges, int src) {
    vector<vector<pair<int, int>>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back({edges[i][1], edges[i][2]});
        adj[edges[i][1]].push_back({edges[i][0], edges[i][2]});
    }
    vector<int> dist(n, INT_MAX);
    set<pair<int, int>> frontier;
    dist[src] = 0;
    frontier.insert({0, src});
    while (!frontier.empty()) {
        pair<int, int> top = *frontier.begin();
        frontier.erase(frontier.begin());
        int d = top.first;
        int u = top.second;
        for (int i = 0; i < adj[u].size(); i++) {
            int v = adj[u][i].first;
            int w = adj[u][i].second;
            if (d + w < dist[v]) {
                if (dist[v] != INT_MAX) {
                    frontier.erase({dist[v], v});
                }
                dist[v] = d + w;
                frontier.insert({dist[v], v});
            }
        }
    }
    for (int v = 0; v < n; v++) {
        if (dist[v] == INT_MAX) {
            dist[v] = -1;
        }
    }
    return dist;
}`)], [[5, [[0, 1, 2], [0, 2, 4], [1, 2, 1], [1, 3, 7], [2, 4, 3], [3, 4, 1]], 0], [4, [[0, 1, 5]], 0], [1, [], 0], [4, [[0, 1, 1], [1, 2, 1], [0, 2, 5], [2, 3, 2]], 3]], (n: number, e: E[], s: number) => dijk(n, wU(n, e), s).map(x => (x >= INF ? -1 : x)), ['A set keeps its elements ordered and allows deletion.'], 'Erasing the stale pair keeps the set small.'),
  mk('Printing Shortest Path', 'shortestPathPrint', 'Undirected weighted graph with vertices 1..n. Return one shortest path from 1 to n as a list of vertices, or {-1} if unreachable.', 'vector<int> shortestPathPrint(int n, vector<vector<int>>& edges)', 'return {-1};', [
    ap('Dijkstra with a parent array', 'O((n + m) log n)', 'O(n + m)', 'nlogn', 'Store the vertex that last improved each distance, then walk parents from n back to 1.', `vector<int> shortestPathPrint(int n, vector<vector<int>>& edges) {
    vector<vector<pair<int, int>>> adj(n + 1);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back({edges[i][1], edges[i][2]});
        adj[edges[i][1]].push_back({edges[i][0], edges[i][2]});
    }
    vector<int> dist(n + 1, INT_MAX);
    vector<int> parent(n + 1, 0);
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    dist[1] = 0;
    parent[1] = 1;
    pq.push({0, 1});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > dist[u]) {
            continue;
        }
        for (int i = 0; i < adj[u].size(); i++) {
            int v = adj[u][i].first;
            int w = adj[u][i].second;
            if (d + w < dist[v]) {
                dist[v] = d + w;
                parent[v] = u;
                pq.push({dist[v], v});
            }
        }
    }
    if (dist[n] == INT_MAX) {
        return {-1};
    }
    vector<int> path;
    int node = n;
    while (node != 1) {
        path.push_back(node);
        node = parent[node];
    }
    path.push_back(1);
    reverse(path.begin(), path.end());
    return path;
}`)], [[5, [[1, 2, 2], [2, 5, 5], [2, 3, 4], [1, 4, 1], [4, 3, 3], [3, 5, 1]]], [3, [[1, 2, 1]]], [1, []], [4, [[1, 2, 1], [2, 3, 1], [3, 4, 1], [1, 4, 3]]]], (n: number, e: E[]) => { const g = wU(n + 1, e); const d = dijk(n + 1, g, 1); return d[n] >= INF ? [-1] : [d[n]]; }, ['Remember which vertex relaxed each vertex last.'], 'The parent pointers form the shortest-path tree.', { check: (a: any[], got: number[]) => { const [n, e] = a; const d = dijk(n + 1, wU(n + 1, e), 1); if (d[n] >= INF) return got.length === 1 && got[0] === -1; if (got[0] !== 1 || got[got.length - 1] !== n) return false; let tot = 0; for (let i = 0; i + 1 < got.length; i++) { const w = e.filter(([u, v]: number[]) => (u === got[i] && v === got[i + 1]) || (v === got[i] && u === got[i + 1])).map((x: number[]) => x[2]); if (!w.length) return false; tot += Math.min(...w); } return tot === d[n]; } }),
  mk('Shortest Distance in a Binary Maze', 'shortestPathBinaryMaze', 'Binary grid (1 = open). Return the fewest steps from src to dest moving in 4 directions through open cells (-1 if impossible).', 'int shortestPathBinaryMaze(vector<vector<int>>& grid, vector<int>& src, vector<int>& dest)', 'return -1;', [
    ap('BFS on the grid', 'O(R·C)', 'O(R·C)', 'n', 'Unit-cost moves: BFS finds the shortest path, each cell visited once.', `int shortestPathBinaryMaze(vector<vector<int>>& grid, vector<int>& src, vector<int>& dest) {
    int rows = grid.size();
    int cols = grid[0].size();
    if (grid[src[0]][src[1]] == 0 || grid[dest[0]][dest[1]] == 0) {
        return -1;
    }
    vector<vector<int>> dist(rows, vector<int>(cols, -1));
    queue<pair<int, int>> q;
    dist[src[0]][src[1]] = 0;
    q.push({src[0], src[1]});
    int dr[4] = {1, -1, 0, 0};
    int dc[4] = {0, 0, 1, -1};
    while (!q.empty()) {
        auto [r, c] = q.front();
        q.pop();
        if (r == dest[0] && c == dest[1]) {
            return dist[r][c];
        }
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && grid[nr][nc] == 1 && dist[nr][nc] == -1) {
                dist[nr][nc] = dist[r][c] + 1;
                q.push({nr, nc});
            }
        }
    }
    return -1;
}`)], [[[[1, 1, 1, 1], [1, 1, 0, 1], [1, 1, 1, 1], [1, 1, 0, 0], [1, 0, 0, 1]], [0, 1], [2, 2]], [[[1, 1, 1], [1, 0, 1], [1, 1, 1]], [0, 0], [2, 2]], [[[1, 0], [0, 1]], [0, 0], [1, 1]], [[[1]], [0, 0], [0, 0]]], (g: number[][], s: number[], d: number[]) => { if (!g[s[0]][s[1]] || !g[d[0]][d[1]]) return -1; return gridBFS(g.map(r => r.map(v => v)), [[s[0], s[1]]]).length ? (() => { const R = g.length, C = g[0].length; const dist = g.map(r => r.map(() => -1)); dist[s[0]][s[1]] = 0; const q = [[s[0], s[1]]]; for (let i = 0; i < q.length; i++) { const [r, c] = q[i]; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = r + a, y = c + b; if (x >= 0 && y >= 0 && x < R && y < C && g[x][y] === 1 && dist[x][y] < 0) { dist[x][y] = dist[r][c] + 1; q.push([x, y]); } } } return dist[d[0]][d[1]]; })() : -1; }, ['A plain BFS is enough: all steps cost 1.'], 'Dijkstra degenerates to BFS when all weights are equal.'),
  mk('Path With Minimum Effort', 'minimumEffortPath', 'Grid of heights. Path effort = the largest absolute height difference between consecutive cells. Return the minimum effort from top-left to bottom-right.', 'int minimumEffortPath(vector<vector<int>>& heights)', 'return 0;', [
    ap('Dijkstra on max-edge', 'O(R·C·log(R·C))', 'O(R·C)', 'nlogn', 'The "distance" of a path is the maximum step on it; a min-heap always expands the currently cheapest cell, which is final.', `int minimumEffortPath(vector<vector<int>>& heights) {
    int rows = heights.size();
    int cols = heights[0].size();
    vector<vector<int>> effort(rows, vector<int>(cols, INT_MAX));
    priority_queue<vector<int>, vector<vector<int>>, greater<vector<int>>> pq;
    effort[0][0] = 0;
    pq.push({0, 0, 0});
    int dr[4] = {1, -1, 0, 0};
    int dc[4] = {0, 0, 1, -1};
    while (!pq.empty()) {
        vector<int> top = pq.top();
        pq.pop();
        int d = top[0];
        int r = top[1];
        int c = top[2];
        if (r == rows - 1 && c == cols - 1) {
            return d;
        }
        if (d > effort[r][c]) {
            continue;
        }
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr >= 0 && nc >= 0 && nr < rows && nc < cols) {
                int next = max(d, abs(heights[nr][nc] - heights[r][c]));
                if (next < effort[nr][nc]) {
                    effort[nr][nc] = next;
                    pq.push({next, nr, nc});
                }
            }
        }
    }
    return 0;
}`)], [[[[1, 2, 2], [3, 8, 2], [5, 3, 5]]], [[[1, 2, 3], [3, 8, 4], [5, 3, 5]]], [[[1, 2, 1, 1, 1], [1, 2, 1, 2, 1], [1, 2, 1, 2, 1], [1, 2, 1, 2, 1], [1, 1, 1, 2, 1]]], [[[7]]], [[[1, 10], [10, 1]]]], (h: number[][]) => { const R = h.length, C = h[0].length; const ok = (lim: number) => { const seen = h.map(r => r.map(() => false)); const st = [[0, 0]]; seen[0][0] = true; while (st.length) { const [r, c] = st.pop()!; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = r + a, y = c + b; if (x >= 0 && y >= 0 && x < R && y < C && !seen[x][y] && Math.abs(h[x][y] - h[r][c]) <= lim) { seen[x][y] = true; st.push([x, y]); } } } return seen[R - 1][C - 1]; }; for (let l = 0; ; l++) if (ok(l)) return l; }, ['Instead of summing, combine edge costs with max().'], 'Dijkstra works for any monotone path cost, not only sums.'),
  mk('Cheapest Flights Within K Stops', 'findCheapestPrice', 'Flights [from, to, price]. Return the cheapest price from src to dst using at most k stops (k+1 flights), or -1.', 'int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k)', 'return -1;', [
    ap('BFS by number of stops (Bellman-Ford style)', 'O(k · m)', 'O(n)', 'n', 'Level i holds the best prices reachable with at most i+1 flights; a queue of (stops, node, cost) with a per-node best-cost prune.', `int findCheapestPrice(int n, vector<vector<int>>& flights, int src, int dst, int k) {
    vector<vector<pair<int, int>>> adj(n);
    for (int i = 0; i < flights.size(); i++) {
        adj[flights[i][0]].push_back({flights[i][1], flights[i][2]});
    }
    vector<int> best(n, INT_MAX);
    queue<vector<int>> q;
    q.push({0, src, 0});
    best[src] = 0;
    while (!q.empty()) {
        vector<int> cur = q.front();
        q.pop();
        int stops = cur[0];
        int u = cur[1];
        int cost = cur[2];
        if (stops > k) {
            continue;
        }
        for (int i = 0; i < adj[u].size(); i++) {
            int v = adj[u][i].first;
            int price = cost + adj[u][i].second;
            if (price < best[v]) {
                best[v] = price;
                q.push({stops + 1, v, price});
            }
        }
    }
    return best[dst] == INT_MAX ? -1 : best[dst];
}`)], [[4, [[0, 1, 100], [1, 2, 100], [2, 0, 100], [1, 3, 600], [2, 3, 200]], 0, 3, 1], [3, [[0, 1, 100], [1, 2, 100], [0, 2, 500]], 0, 2, 1], [3, [[0, 1, 100], [1, 2, 100], [0, 2, 500]], 0, 2, 0], [2, [], 0, 1, 1], [5, [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [0, 4, 10]], 0, 4, 2]], (n: number, f: E[], s: number, d: number, k: number) => { let dist = Array(n).fill(INF); dist[s] = 0; for (let i = 0; i <= k; i++) { const nx = dist.slice(); f.forEach(([u, v, w]) => { if (dist[u] < INF && dist[u] + w < nx[v]) nx[v] = dist[u] + w; }); dist = nx; } return dist[d] >= INF ? -1 : dist[d]; }, ['Dijkstra on cost alone fails because a cheaper path may use too many stops.'], 'The stop limit is part of the state: BFS levels count flights.'),
  mk('Network Delay Time', 'networkDelayTime', 'Directed edges [u, v, time]; a signal starts at node k (nodes 1..n). Return the time for all nodes to receive it, or -1.', 'int networkDelayTime(vector<vector<int>>& times, int n, int k)', 'return -1;', [
    ap('Dijkstra', 'O(m log n)', 'O(n + m)', 'nlogn', 'The answer is the largest shortest distance from k.', `int networkDelayTime(vector<vector<int>>& times, int n, int k) {
    vector<vector<pair<int, int>>> adj(n + 1);
    for (int i = 0; i < times.size(); i++) {
        adj[times[i][0]].push_back({times[i][1], times[i][2]});
    }
    vector<int> dist(n + 1, INT_MAX);
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    dist[k] = 0;
    pq.push({0, k});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > dist[u]) {
            continue;
        }
        for (int i = 0; i < adj[u].size(); i++) {
            int v = adj[u][i].first;
            int w = adj[u][i].second;
            if (d + w < dist[v]) {
                dist[v] = d + w;
                pq.push({dist[v], v});
            }
        }
    }
    int answer = 0;
    for (int v = 1; v <= n; v++) {
        if (dist[v] == INT_MAX) {
            return -1;
        }
        answer = max(answer, dist[v]);
    }
    return answer;
}`)], [[[[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2], [[[1, 2, 1]], 2, 1], [[[1, 2, 1]], 2, 2], [[], 1, 1], [[[1, 2, 5], [1, 3, 2], [3, 2, 1]], 3, 1]], (t: E[], n: number, k: number) => { const d = dijk(n + 1, wD(n + 1, t), k); let m = 0; for (let v = 1; v <= n; v++) { if (d[v] >= INF) return -1; m = Math.max(m, d[v]); } return m; }, ['The signal reaches a node at its shortest distance from k.'], 'Total delay = the farthest node\'s shortest distance.'),
  mk('Number of Ways to Arrive at Destination', 'countPaths', 'Undirected weighted graph [u, v, time]. Return the number of different shortest paths from 0 to n-1, modulo 1e9+7.', 'int countPaths(int n, vector<vector<int>>& roads)', 'return 0;', [
    ap('Dijkstra with a path counter', 'O((n + m) log n)', 'O(n + m)', 'nlogn', 'When a strictly shorter distance is found the count is replaced; when an equal one is found the counts are added.', `int countPaths(int n, vector<vector<int>>& roads) {
    int MOD = 1000000007;
    vector<vector<pair<int, int>>> adj(n);
    for (int i = 0; i < roads.size(); i++) {
        adj[roads[i][0]].push_back({roads[i][1], roads[i][2]});
        adj[roads[i][1]].push_back({roads[i][0], roads[i][2]});
    }
    vector<long long> dist(n, LLONG_MAX);
    vector<int> ways(n, 0);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;
    dist[0] = 0;
    ways[0] = 1;
    pq.push({0, 0});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > dist[u]) {
            continue;
        }
        for (int i = 0; i < adj[u].size(); i++) {
            int v = adj[u][i].first;
            int w = adj[u][i].second;
            if (d + w < dist[v]) {
                dist[v] = d + w;
                ways[v] = ways[u];
                pq.push({dist[v], v});
            } else if (d + w == dist[v]) {
                ways[v] = (ways[v] + ways[u]) % MOD;
            }
        }
    }
    return ways[n - 1];
}`)], [[7, [[0, 6, 7], [0, 1, 2], [1, 2, 3], [1, 3, 3], [6, 3, 3], [3, 5, 1], [6, 5, 1], [2, 5, 1], [0, 4, 5], [4, 6, 2]]], [2, [[1, 0, 10]]], [1, []], [4, [[0, 1, 1], [0, 2, 1], [1, 3, 1], [2, 3, 1]]], [3, [[0, 1, 1], [1, 2, 1], [0, 2, 2]]]], (n: number, r: E[]) => { const g = wU(n, r); const d = dijk(n, g, 0); const order = [...Array(n).keys()].sort((a, b) => d[a] - d[b]); const w = Array(n).fill(0); w[0] = 1; for (const u of order) for (const [v, c] of g[u]) if (d[u] + c === d[v] && d[v] > d[u]) w[v] = (w[v] + w[u]) % 1000000007; return w[n - 1]; }, ['Keep two arrays: best distance and number of ways to achieve it.'], 'Equal-distance relaxations add ways; better ones reset them.'),
  mk('Minimum Multiplications to Reach End', 'minimumMultiplications', 'Start with value start. In one step multiply it by any number from arr and take the result mod 100000. Return the minimum steps to reach end, or -1.', 'int minimumMultiplications(vector<int>& arr, int start, int end)', 'return -1;', [
    ap('BFS over residues', 'O(100000 · |arr|)', 'O(100000)', 'n', 'There are only 100000 distinct states, each expanded once with |arr| multiplications.', `int minimumMultiplications(vector<int>& arr, int start, int end) {
    if (start == end) {
        return 0;
    }
    vector<int> steps(100000, -1);
    queue<int> q;
    steps[start] = 0;
    q.push(start);
    while (!q.empty()) {
        int value = q.front();
        q.pop();
        for (int i = 0; i < arr.size(); i++) {
            int next = (int)((long long)value * arr[i] % 100000);
            if (steps[next] == -1) {
                steps[next] = steps[value] + 1;
                if (next == end) {
                    return steps[next];
                }
                q.push(next);
            }
        }
    }
    return -1;
}`)], [[[2, 5, 7], 3, 30], [[3, 4, 65], 7, 66175], [[2], 1, 1], [[2], 3, 3], [[10], 1, 5]], (arr: number[], s: number, e: number) => { if (s === e) return 0; const d = new Map([[s, 0]]); const q = [s]; for (let i = 0; i < q.length; i++) for (const a of arr) { const n = (q[i] * a) % 100000; if (!d.has(n)) { d.set(n, d.get(q[i])! + 1); if (n === e) return d.get(n)!; q.push(n); } } return -1; }, ['The state space is only the 100000 residues.'], 'A bounded state space makes BFS cheap.'),
  mk('Bellman-Ford Algorithm', 'bellmanFord', 'Directed weighted graph [u, v, w] (weights may be negative). Return the shortest distances from src (1e8 for unreachable), or {-1} if a negative cycle is reachable.', 'vector<int> bellmanFord(int n, vector<vector<int>>& edges, int src)', 'return {};', [
    ap('Relax all edges n−1 times', 'O(n · m)', 'O(n)', 'n2', 'A shortest path has at most n−1 edges so n−1 rounds suffice; an improvement in round n proves a negative cycle.', `vector<int> bellmanFord(int n, vector<vector<int>>& edges, int src) {
    int INF_VALUE = 100000000;
    vector<int> dist(n, INF_VALUE);
    dist[src] = 0;
    for (int round = 0; round < n - 1; round++) {
        for (int i = 0; i < edges.size(); i++) {
            int u = edges[i][0];
            int v = edges[i][1];
            int w = edges[i][2];
            if (dist[u] != INF_VALUE && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
            }
        }
    }
    for (int i = 0; i < edges.size(); i++) {
        int u = edges[i][0];
        int v = edges[i][1];
        int w = edges[i][2];
        if (dist[u] != INF_VALUE && dist[u] + w < dist[v]) {
            return {-1};
        }
    }
    return dist;
}`)], [[5, [[0, 1, 5], [1, 2, -2], [1, 5 - 1, 1], [2, 3, 3], [3, 4, 2]], 0], [3, [[0, 1, 4], [1, 2, -6], [2, 0, 3]], 0], [3, [[0, 1, 4]], 0], [1, [], 0], [4, [[0, 1, 1], [1, 2, -1], [2, 3, 1]], 0]], (n: number, e: E[], s: number) => { const d = Array(n).fill(1e8); d[s] = 0; for (let r = 0; r < n; r++) { let ch = false; for (const [u, v, w] of e) if (d[u] !== 1e8 && d[u] + w < d[v]) { d[v] = d[u] + w; ch = true; } if (!ch) return d; if (r === n - 1) return [-1]; } return d; }, ['Repeat relaxation n−1 times.', 'One extra round detects negative cycles.'], 'Edge relaxation grows correct paths by one edge per round.'),
  mk('Find the City With the Smallest Number of Neighbours', 'findTheCity', 'Undirected weighted edges [u, v, w]. For each city count cities within distanceThreshold; return the city with the fewest (ties: the largest index).', 'int findTheCity(int n, vector<vector<int>>& edges, int distanceThreshold)', 'return 0;', [
    ap('Floyd-Warshall', 'O(n³)', 'O(n²)', '2n', 'All-pairs shortest paths by allowing each vertex k as an intermediate in turn.', `int findTheCity(int n, vector<vector<int>>& edges, int distanceThreshold) {
    int BIG = 1000000000;
    vector<vector<int>> dist(n, vector<int>(n, BIG));
    for (int i = 0; i < n; i++) {
        dist[i][i] = 0;
    }
    for (int i = 0; i < edges.size(); i++) {
        dist[edges[i][0]][edges[i][1]] = edges[i][2];
        dist[edges[i][1]][edges[i][0]] = edges[i][2];
    }
    for (int k = 0; k < n; k++) {
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                }
            }
        }
    }
    int answer = -1;
    int fewest = n + 1;
    for (int i = 0; i < n; i++) {
        int count = 0;
        for (int j = 0; j < n; j++) {
            if (i != j && dist[i][j] <= distanceThreshold) {
                count++;
            }
        }
        if (count <= fewest) {
            fewest = count;
            answer = i;
        }
    }
    return answer;
}`)], [[4, [[0, 1, 3], [1, 2, 1], [1, 3, 4], [2, 3, 1]], 4], [5, [[0, 1, 2], [0, 4, 8], [1, 2, 3], [1, 4, 2], [2, 3, 1], [3, 4, 1]], 2], [1, [], 1], [3, [[0, 1, 1], [1, 2, 1]], 1]], (n: number, e: E[], t: number) => { const g = wU(n, e); let ans = -1, fewest = n + 1; for (let i = 0; i < n; i++) { const d = dijk(n, g, i); const c = d.filter((x, j) => j !== i && x <= t).length; if (c <= fewest) { fewest = c; ans = i; } } return ans; }, ['Compute all-pairs distances first.'], 'Floyd-Warshall grows the set of allowed intermediate vertices one at a time.'),
  // ---------- MST & DSU ----------
  mk('Minimum Spanning Tree', 'spanningTree', 'Connected undirected weighted graph [u, v, w]. Return the total weight of its minimum spanning tree.', 'int spanningTree(int n, vector<vector<int>>& edges)', 'return 0;', [
    ap("Kruskal's algorithm (sort + union-find)", 'O(m log m)', 'O(n)', 'nlogn', 'Take edges in increasing weight, keeping an edge if it joins two different components.', UF + `
int spanningTree(int n, vector<vector<int>>& edges) {
    vector<vector<int>> sorted = edges;
    sort(sorted.begin(), sorted.end(), [](vector<int>& a, vector<int>& b) {
        return a[2] < b[2];
    });
    vector<int> parent(n);
    for (int i = 0; i < n; i++) {
        parent[i] = i;
    }
    int total = 0;
    for (int i = 0; i < sorted.size(); i++) {
        int a = findParent(parent, sorted[i][0]);
        int b = findParent(parent, sorted[i][1]);
        if (a != b) {
            parent[a] = b;
            total += sorted[i][2];
        }
    }
    return total;
}`), ap("Prim's algorithm (min-heap)", 'O(m log n)', 'O(n + m)', 'nlogn', 'Grow one tree from vertex 0, always adding the cheapest edge leaving it.', `int spanningTree(int n, vector<vector<int>>& edges) {
    vector<vector<pair<int, int>>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back({edges[i][1], edges[i][2]});
        adj[edges[i][1]].push_back({edges[i][0], edges[i][2]});
    }
    vector<bool> inTree(n, false);
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    pq.push({0, 0});
    int total = 0;
    while (!pq.empty()) {
        auto [w, u] = pq.top();
        pq.pop();
        if (inTree[u]) {
            continue;
        }
        inTree[u] = true;
        total += w;
        for (int i = 0; i < adj[u].size(); i++) {
            if (!inTree[adj[u][i].first]) {
                pq.push({adj[u][i].second, adj[u][i].first});
            }
        }
    }
    return total;
}`)], [[5, [[0, 1, 2], [0, 3, 6], [1, 2, 3], [1, 3, 8], [1, 4, 5], [2, 4, 7], [3, 4, 9]]], [3, [[0, 1, 5], [1, 2, 3], [0, 2, 1]]], [1, []], [4, [[0, 1, 1], [1, 2, 2], [2, 3, 3], [0, 3, 10]]]], (n: number, e: E[]) => { const inT = Array(n).fill(false); inT[0] = true; let tot = 0; for (let k = 1; k < n; k++) { let best = INF; for (const [u, v, w] of e) if (inT[u] !== inT[v]) best = Math.min(best, w); tot += best; for (const [u, v, w] of e) if (inT[u] !== inT[v] && w === best) { inT[u] = inT[v] = true; break; } } return tot; }, ['A spanning tree connects n vertices with n−1 edges.'], 'The cheapest edge across any cut belongs to some MST.'),
  mk("Prim's Algorithm", 'primMST', 'Connected weighted undirected graph. Return the MST weight using Prim\'s algorithm.', 'int primMST(int n, vector<vector<int>>& edges)', 'return 0;', [
    ap('Prim with a min-heap', 'O(m log n)', 'O(n + m)', 'nlogn', 'Each edge enters the heap at most twice; each pop costs log.', `int primMST(int n, vector<vector<int>>& edges) {
    vector<vector<pair<int, int>>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back({edges[i][1], edges[i][2]});
        adj[edges[i][1]].push_back({edges[i][0], edges[i][2]});
    }
    vector<bool> inTree(n, false);
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    pq.push({0, 0});
    int total = 0;
    while (!pq.empty()) {
        auto [w, u] = pq.top();
        pq.pop();
        if (inTree[u]) {
            continue;
        }
        inTree[u] = true;
        total += w;
        for (int i = 0; i < adj[u].size(); i++) {
            if (!inTree[adj[u][i].first]) {
                pq.push({adj[u][i].second, adj[u][i].first});
            }
        }
    }
    return total;
}`)], [[5, [[0, 1, 2], [0, 3, 6], [1, 2, 3], [1, 3, 8], [1, 4, 5], [2, 4, 7], [3, 4, 9]]], [3, [[0, 1, 5], [1, 2, 3], [0, 2, 1]]], [1, []], [4, [[0, 1, 1], [1, 2, 2], [2, 3, 3], [0, 3, 10]]]], (n: number, e: E[]) => { const inT = Array(n).fill(false); inT[0] = true; let tot = 0; for (let k = 1; k < n; k++) { let best = INF; for (const [u, v, w] of e) if (inT[u] !== inT[v]) best = Math.min(best, w); tot += best; for (const [u, v, w] of e) if (inT[u] !== inT[v] && w === best) { inT[u] = inT[v] = true; break; } } return tot; }, ['Like Dijkstra, but the key is the single edge weight.'], 'Prim repeatedly adds the cheapest edge leaving the tree.'),
  mk('Disjoint Set (Union by Rank/Size)', 'disjointSetQueries', 'n elements start in separate sets. Each query is [1, u, v] = union(u, v) or [2, u, v] = are u and v connected? Return the answers (1/0) of the type-2 queries.', 'vector<int> disjointSetQueries(int n, vector<vector<int>>& queries)', 'return {};', [
    ap('Union by size + path compression', 'O(α(n)) per op', 'O(n)', '1', 'Attaching the smaller tree under the larger keeps depth O(log n); path compression flattens it further: amortised inverse-Ackermann.', `int findRoot(vector<int>& parent, int x) {
    if (parent[x] == x) {
        return x;
    }
    parent[x] = findRoot(parent, parent[x]);
    return parent[x];
}

vector<int> disjointSetQueries(int n, vector<vector<int>>& queries) {
    vector<int> parent(n);
    vector<int> size(n, 1);
    for (int i = 0; i < n; i++) {
        parent[i] = i;
    }
    vector<int> answers;
    for (int i = 0; i < queries.size(); i++) {
        int a = findRoot(parent, queries[i][1]);
        int b = findRoot(parent, queries[i][2]);
        if (queries[i][0] == 1) {
            if (a != b) {
                if (size[a] < size[b]) {
                    swap(a, b);
                }
                parent[b] = a;
                size[a] += size[b];
            }
        } else {
            answers.push_back(a == b ? 1 : 0);
        }
    }
    return answers;
}`)], [[5, [[1, 0, 1], [1, 1, 2], [2, 0, 2], [2, 0, 3], [1, 3, 4], [2, 3, 4], [1, 2, 3], [2, 0, 4]]], [3, [[2, 0, 1]]], [2, [[1, 0, 1], [2, 1, 0]]], [4, [[2, 2, 2], [1, 0, 3], [2, 3, 0]]]], (n: number, q: E[]) => { const comp = [...Array(n).keys()]; const out: number[] = []; for (const [t, u, v] of q) { if (t === 1) { const a = comp[u], b = comp[v]; for (let i = 0; i < n; i++) if (comp[i] === b) comp[i] = a; } else out.push(comp[u] === comp[v] ? 1 : 0); } return out; }, ['Keep a size array; attach the smaller root under the larger.'], 'Two cheap tricks make union-find nearly constant time.'),
  mk("Kruskal's Algorithm", 'kruskalMST', 'Connected weighted undirected graph. Return the MST weight using Kruskal\'s algorithm.', 'int kruskalMST(int n, vector<vector<int>>& edges)', 'return 0;', [
    ap('Sort edges + disjoint set', 'O(m log m)', 'O(n)', 'nlogn', 'Sorting dominates; each edge needs two near-O(1) finds.', UF + `
int kruskalMST(int n, vector<vector<int>>& edges) {
    vector<vector<int>> sorted = edges;
    sort(sorted.begin(), sorted.end(), [](vector<int>& a, vector<int>& b) {
        return a[2] < b[2];
    });
    vector<int> parent(n);
    for (int i = 0; i < n; i++) {
        parent[i] = i;
    }
    int total = 0;
    for (int i = 0; i < sorted.size(); i++) {
        int a = findParent(parent, sorted[i][0]);
        int b = findParent(parent, sorted[i][1]);
        if (a != b) {
            parent[a] = b;
            total += sorted[i][2];
        }
    }
    return total;
}`)], [[5, [[0, 1, 2], [0, 3, 6], [1, 2, 3], [1, 3, 8], [1, 4, 5], [2, 4, 7], [3, 4, 9]]], [3, [[0, 1, 5], [1, 2, 3], [0, 2, 1]]], [1, []], [4, [[0, 1, 1], [1, 2, 2], [2, 3, 3], [0, 3, 10]]]], (n: number, e: E[]) => { const inT = Array(n).fill(false); inT[0] = true; let tot = 0; for (let k = 1; k < n; k++) { let best = INF; for (const [u, v, w] of e) if (inT[u] !== inT[v]) best = Math.min(best, w); tot += best; for (const [u, v, w] of e) if (inT[u] !== inT[v] && w === best) { inT[u] = inT[v] = true; break; } } return tot; }, ['Skip edges whose endpoints are already connected.'], 'Greedy by weight + cycle check via union-find.'),
  mk('Number of Operations to Make Network Connected', 'makeConnected', 'n computers and cables [a, b]. One operation moves a cable to join two computers. Return the minimum operations to connect everything, or -1.', 'int makeConnected(int n, vector<vector<int>>& connections)', 'return 0;', [
    ap('Union-find on components', 'O(m α(n))', 'O(n)', 'n', 'Needs at least n−1 cables; the answer is (components − 1). Redundant cables are those whose endpoints were already joined.', UF + `
int makeConnected(int n, vector<vector<int>>& connections) {
    if (connections.size() < n - 1) {
        return -1;
    }
    vector<int> parent(n);
    for (int i = 0; i < n; i++) {
        parent[i] = i;
    }
    int components = n;
    for (int i = 0; i < connections.size(); i++) {
        int a = findParent(parent, connections[i][0]);
        int b = findParent(parent, connections[i][1]);
        if (a != b) {
            parent[a] = b;
            components--;
        }
    }
    return components - 1;
}`)], [[4, [[0, 1], [0, 2], [1, 2]]], [6, [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3]]], [6, [[0, 1], [0, 2], [0, 3], [1, 2]]], [1, []], [2, [[0, 1]]]], (n: number, c: E[]) => (c.length < n - 1 ? -1 : comps(n, adjU(n, c)) - 1), ['You need at least n − 1 cables.'], 'Joining k components needs k − 1 spare cables.'),
  mk('Accounts Merge', 'accountsMerge', 'Each account is [name, email1, email2, ...]. Accounts sharing an email belong to one person. Return the merged accounts (name followed by sorted unique emails). Order of accounts does not matter.', 'vector<vector<string>> accountsMerge(vector<vector<string>>& accounts)', 'return {};', [
    ap('Union-find over accounts via email owners', 'O(N α · log N)', 'O(N)', 'nlogn', 'Map each email to the first account that has it, unioning accounts that share it; then gather and sort emails per root.', UF + `
vector<vector<string>> accountsMerge(vector<vector<string>>& accounts) {
    int n = accounts.size();
    vector<int> parent(n);
    for (int i = 0; i < n; i++) {
        parent[i] = i;
    }
    unordered_map<string, int> owner;
    for (int i = 0; i < n; i++) {
        for (int j = 1; j < accounts[i].size(); j++) {
            string email = accounts[i][j];
            if (!owner.count(email)) {
                owner[email] = i;
            } else {
                int a = findParent(parent, i);
                int b = findParent(parent, owner[email]);
                if (a != b) {
                    parent[a] = b;
                }
            }
        }
    }
    map<int, set<string>> groups;
    for (int i = 0; i < n; i++) {
        int root = findParent(parent, i);
        for (int j = 1; j < accounts[i].size(); j++) {
            groups[root].insert(accounts[i][j]);
        }
    }
    vector<vector<string>> result;
    for (auto& [root, emails] : groups) {
        vector<string> row;
        row.push_back(accounts[root][0]);
        for (auto& e : emails) {
            row.push_back(e);
        }
        result.push_back(row);
    }
    return result;
}`)], [[[['John', 'a@m', 'b@m'], ['John', 'c@m'], ['John', 'a@m', 'd@m'], ['Mary', 'e@m']]], [[['A', 'x'], ['B', 'y']]], [[['A', 'x', 'y'], ['A', 'y', 'z'], ['A', 'z', 'w']]], [[['Q', 'q']]]], (acc: string[][]) => { const par = acc.map((_, i) => i); const f = (x: number): number => (par[x] === x ? x : (par[x] = f(par[x]))); const own = new Map<string, number>(); acc.forEach((a, i) => a.slice(1).forEach(e => { if (own.has(e)) par[f(i)] = f(own.get(e)!); else own.set(e, i); })); const g = new Map<number, Set<string>>(); acc.forEach((a, i) => { const r = f(i); if (!g.has(r)) g.set(r, new Set()); a.slice(1).forEach(e => g.get(r)!.add(e)); }); return [...g.entries()].map(([r, s]) => [acc[r][0], ...[...s].sort()]); }, ['Union two accounts when they share an email.'], 'Emails glue accounts together: classic union-find grouping.', { unordered: true }),
  mk('Number of Islands II', 'numIslands2', 'An n×m grid starts as water. Each position [r, c] turns into land. After each addition return the number of islands (4-connected).', 'vector<int> numIslands2(int n, int m, vector<vector<int>>& positions)', 'return {};', [
    ap('Online union-find', 'O(k α(n·m))', 'O(n·m)', 'n', 'Each new land cell starts as its own island and is unioned with its land neighbours; every successful union reduces the count by one.', `int findRoot(vector<int>& parent, int x) {
    if (parent[x] == x) {
        return x;
    }
    parent[x] = findRoot(parent, parent[x]);
    return parent[x];
}

vector<int> numIslands2(int n, int m, vector<vector<int>>& positions) {
    vector<int> parent(n * m);
    for (int i = 0; i < n * m; i++) {
        parent[i] = i;
    }
    vector<vector<int>> land(n, vector<int>(m, 0));
    vector<int> result;
    int count = 0;
    int dr[4] = {1, -1, 0, 0};
    int dc[4] = {0, 0, 1, -1};
    for (int i = 0; i < positions.size(); i++) {
        int r = positions[i][0];
        int c = positions[i][1];
        if (land[r][c] == 1) {
            result.push_back(count);
            continue;
        }
        land[r][c] = 1;
        count++;
        for (int k = 0; k < 4; k++) {
            int nr = r + dr[k];
            int nc = c + dc[k];
            if (nr >= 0 && nc >= 0 && nr < n && nc < m && land[nr][nc] == 1) {
                int a = findRoot(parent, r * m + c);
                int b = findRoot(parent, nr * m + nc);
                if (a != b) {
                    parent[a] = b;
                    count--;
                }
            }
        }
        result.push_back(count);
    }
    return result;
}`)], [[4, 5, [[0, 0], [0, 1], [1, 2], [2, 1], [1, 1], [0, 0]]], [3, 3, [[0, 0], [0, 1], [1, 2], [2, 1]]], [1, 1, [[0, 0], [0, 0]]], [2, 2, [[0, 0], [1, 1], [0, 1], [1, 0]]]], (n: number, m: number, p: E[]) => { const land = Array.from({ length: n }, () => Array(m).fill(0)); const out: number[] = []; for (const [r, c] of p) { land[r][c] = 1; const seen = land.map(x => x.map(() => false)); let cnt = 0; for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if (land[i][j] && !seen[i][j]) { cnt++; const st = [[i, j]]; seen[i][j] = true; while (st.length) { const [a, b] = st.pop()!; for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = a + x, v = b + y; if (u >= 0 && v >= 0 && u < n && v < m && land[u][v] && !seen[u][v]) { seen[u][v] = true; st.push([u, v]); } } } } out.push(cnt); } return out; }, ['Count + 1 for a new cell, − 1 for every merge.'], 'Union-find supports additions better than re-running DFS each time.'),
  mk('Making A Large Island', 'largestIsland', 'You may flip at most one 0 to 1. Return the size of the largest island (4-connected) possible.', 'int largestIsland(vector<vector<int>>& grid)', 'return 0;', [
    ap('Label islands, then try every 0', 'O(R·C)', 'O(R·C)', 'n', 'Flood-fill gives each island an id and size; for each 0 add the sizes of the distinct neighbouring islands + 1.', `int fill(vector<vector<int>>& grid, vector<vector<int>>& id, int r, int c, int label) {
    if (r < 0 || c < 0 || r >= grid.size() || c >= grid[0].size() || grid[r][c] != 1 || id[r][c] != 0) {
        return 0;
    }
    id[r][c] = label;
    return 1 + fill(grid, id, r + 1, c, label) + fill(grid, id, r - 1, c, label) + fill(grid, id, r, c + 1, label) + fill(grid, id, r, c - 1, label);
}

int largestIsland(vector<vector<int>>& grid) {
    int rows = grid.size();
    int cols = grid[0].size();
    vector<vector<int>> id(rows, vector<int>(cols, 0));
    vector<int> size(1, 0);
    int label = 0;
    int best = 0;
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 1 && id[r][c] == 0) {
                label++;
                int s = fill(grid, id, r, c, label);
                size.push_back(s);
                best = max(best, s);
            }
        }
    }
    int dr[4] = {1, -1, 0, 0};
    int dc[4] = {0, 0, 1, -1};
    for (int r = 0; r < rows; r++) {
        for (int c = 0; c < cols; c++) {
            if (grid[r][c] == 0) {
                set<int> seen;
                int total = 1;
                for (int k = 0; k < 4; k++) {
                    int nr = r + dr[k];
                    int nc = c + dc[k];
                    if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && id[nr][nc] != 0 && !seen.count(id[nr][nc])) {
                        seen.insert(id[nr][nc]);
                        total += size[id[nr][nc]];
                    }
                }
                best = max(best, total);
            }
        }
    }
    return best;
}`)], [[[[1, 0], [0, 1]]], [[[1, 1], [1, 0]]], [[[1, 1], [1, 1]]], [[[0]]], [[[1, 0, 1], [0, 0, 0], [1, 0, 1]]], [[[1, 1, 0, 1, 1], [1, 0, 0, 0, 1], [0, 0, 1, 0, 0]]]], (g: number[][]) => { const R = g.length, C = g[0].length; const area = (h: number[][]) => { const seen = h.map(r => r.map(() => false)); let b = 0; for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (h[i][j] && !seen[i][j]) { let s = 0; const st = [[i, j]]; seen[i][j] = true; while (st.length) { const [a, c] = st.pop()!; s++; for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const u = a + x, v = c + y; if (u >= 0 && v >= 0 && u < R && v < C && h[u][v] && !seen[u][v]) { seen[u][v] = true; st.push([u, v]); } } } b = Math.max(b, s); } return b; }; let best = area(g); for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (!g[i][j]) { const h = g.map(r => r.slice()); h[i][j] = 1; best = Math.max(best, area(h)); } return best; }, ['Compute each island\'s size once.', 'Be careful not to count the same island twice around a 0.'], 'Flipping a 0 joins at most four distinct neighbouring islands.'),
  mk('Most Stones Removed with Same Row or Column', 'removeStones', 'Stones at [row, col]. A stone can be removed if another stone shares its row or column. Return the maximum number of stones that can be removed.', 'int removeStones(vector<vector<int>>& stones)', 'return 0;', [
    ap('Union rows with columns', 'O(n α)', 'O(n)', 'n', 'Stones sharing a row/column form a component and all but one stone of each component can be removed: answer = stones − components.', `int findRoot(unordered_map<int, int>& parent, int x) {
    if (!parent.count(x)) {
        parent[x] = x;
    }
    if (parent[x] == x) {
        return x;
    }
    parent[x] = findRoot(parent, parent[x]);
    return parent[x];
}

int removeStones(vector<vector<int>>& stones) {
    unordered_map<int, int> parent;
    for (int i = 0; i < stones.size(); i++) {
        int a = findRoot(parent, stones[i][0]);
        int b = findRoot(parent, -stones[i][1] - 1);
        if (a != b) {
            parent[a] = b;
        }
    }
    set<int> roots;
    for (auto& [node, p] : parent) {
        roots.insert(findRoot(parent, node));
    }
    return stones.size() - roots.size();
}`)], [[[[0, 0], [0, 1], [1, 0], [1, 2], [2, 1], [2, 2]]], [[[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]]], [[[0, 0]]], [[[0, 0], [1, 1]]], [[[3, 3], [3, 4], [4, 3], [4, 4]]]], (s: E[]) => { const par = s.map((_, i) => i); const f = (x: number): number => (par[x] === x ? x : (par[x] = f(par[x]))); for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) if (s[i][0] === s[j][0] || s[i][1] === s[j][1]) par[f(i)] = f(j); return s.length - new Set(s.map((_, i) => f(i))).size; }, ['Treat each row and each column as a node; a stone is an edge.'], 'Each connected group can be reduced to a single stone.'),
  // ---------- other algorithms ----------
  mk("Strongly Connected Components (Kosaraju's Algorithm)", 'kosaraju', 'Return the number of strongly connected components of a directed graph.', 'int kosaraju(int n, vector<vector<int>>& edges)', 'return 0;', [
    ap("Kosaraju: finish order, transpose, DFS", 'O(n + m)', 'O(n + m)', 'n', 'Two DFS passes. The first records finishing order; the second walks the reversed graph in reverse finishing order, each tree being one SCC.', `void dfsOrder(int u, vector<vector<int>>& adj, vector<bool>& seen, stack<int>& order) {
    seen[u] = true;
    for (int i = 0; i < adj[u].size(); i++) {
        if (!seen[adj[u][i]]) {
            dfsOrder(adj[u][i], adj, seen, order);
        }
    }
    order.push(u);
}

void dfsCollect(int u, vector<vector<int>>& adj, vector<bool>& seen) {
    seen[u] = true;
    for (int i = 0; i < adj[u].size(); i++) {
        if (!seen[adj[u][i]]) {
            dfsCollect(adj[u][i], adj, seen);
        }
    }
}

int kosaraju(int n, vector<vector<int>>& edges) {
    vector<vector<int>> adj(n);
    vector<vector<int>> reversed(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back(edges[i][1]);
        reversed[edges[i][1]].push_back(edges[i][0]);
    }
    vector<bool> seen(n, false);
    stack<int> order;
    for (int v = 0; v < n; v++) {
        if (!seen[v]) {
            dfsOrder(v, adj, seen, order);
        }
    }
    vector<bool> seen2(n, false);
    int count = 0;
    while (!order.empty()) {
        int v = order.top();
        order.pop();
        if (!seen2[v]) {
            count++;
            dfsCollect(v, reversed, seen2);
        }
    }
    return count;
}`)], [[5, [[0, 1], [1, 2], [2, 0], [1, 3], [3, 4]]], [4, [[0, 1], [1, 2], [2, 3]]], [3, [[0, 1], [1, 2], [2, 0]]], [1, []], [8, [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 3], [6, 5], [6, 7], [7, 6]]]], (n: number, e: E[]) => { const reach = Array.from({ length: n }, (_, i) => { const s = new Set([i]); const st = [i]; const g = adjD(n, e); while (st.length) { const u = st.pop()!; for (const v of g[u]) if (!s.has(v)) { s.add(v); st.push(v); } } return s; }); const seen = Array(n).fill(false); let c = 0; for (let i = 0; i < n; i++) if (!seen[i]) { c++; for (let j = 0; j < n; j++) if (reach[i].has(j) && reach[j].has(i)) seen[j] = true; } return c; }, ['Within an SCC every vertex reaches every other.', 'Reversing all edges does not change the SCCs.'], 'The first DFS orders SCCs topologically; the second one cannot leak out of an SCC.'),
  mk('Bridges in Graph', 'criticalConnections', 'Return all bridges (edges whose removal disconnects the graph) of an undirected graph as [u, v] with u < v. Order does not matter.', 'vector<vector<int>> criticalConnections(int n, vector<vector<int>>& edges)', 'return {};', [
    ap("Tarjan's low-link DFS", 'O(n + m)', 'O(n + m)', 'n', 'tin = discovery time, low = earliest discovery reachable through the subtree plus one back edge. Tree edge (u, v) is a bridge iff low[v] > tin[u].', `int timer = 0;

void dfs(int u, int parent, vector<vector<int>>& adj, vector<int>& tin, vector<int>& low, vector<vector<int>>& bridges) {
    timer++;
    tin[u] = timer;
    low[u] = timer;
    for (int i = 0; i < adj[u].size(); i++) {
        int v = adj[u][i];
        if (v == parent) {
            continue;
        }
        if (tin[v] == 0) {
            dfs(v, u, adj, tin, low, bridges);
            low[u] = min(low[u], low[v]);
            if (low[v] > tin[u]) {
                bridges.push_back({min(u, v), max(u, v)});
            }
        } else {
            low[u] = min(low[u], tin[v]);
        }
    }
}

vector<vector<int>> criticalConnections(int n, vector<vector<int>>& edges) {
    vector<vector<int>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back(edges[i][1]);
        adj[edges[i][1]].push_back(edges[i][0]);
    }
    vector<int> tin(n, 0);
    vector<int> low(n, 0);
    vector<vector<int>> bridges;
    timer = 0;
    for (int v = 0; v < n; v++) {
        if (tin[v] == 0) {
            dfs(v, -1, adj, tin, low, bridges);
        }
    }
    return bridges;
}`)], [[4, [[0, 1], [1, 2], [2, 0], [1, 3]]], [5, [[0, 1], [1, 2], [2, 3], [3, 4]]], [3, [[0, 1], [1, 2], [2, 0]]], [2, []], [6, [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 3]]]], (n: number, e: E[]) => { const out: number[][] = []; for (let i = 0; i < e.length; i++) { const rest = e.filter((_, j) => j !== i); if (comps(n, adjU(n, rest)) > comps(n, adjU(n, e))) out.push([Math.min(...e[i]), Math.max(...e[i])]); } return out; }, ['Compare a vertex\'s discovery time with how far back its subtree can reach.'], 'An edge is a bridge if the subtree below it has no back edge to its ancestors.', { unordered: true }),
  mk('Articulation Point in Graph', 'articulationPoints', 'Return (ascending) all articulation points (vertices whose removal increases the number of components) of an undirected graph.', 'vector<int> articulationPoints(int n, vector<vector<int>>& edges)', 'return {};', [
    ap("Tarjan's low-link DFS", 'O(n + m)', 'O(n + m)', 'n', 'Non-root u is an articulation point if some child v has low[v] ≥ tin[u]; the root is one if it has at least two DFS children.', `int timer = 0;

void dfs(int u, int parent, vector<vector<int>>& adj, vector<int>& tin, vector<int>& low, vector<bool>& isCut) {
    timer++;
    tin[u] = timer;
    low[u] = timer;
    int children = 0;
    for (int i = 0; i < adj[u].size(); i++) {
        int v = adj[u][i];
        if (v == parent) {
            continue;
        }
        if (tin[v] == 0) {
            dfs(v, u, adj, tin, low, isCut);
            low[u] = min(low[u], low[v]);
            if (low[v] >= tin[u] && parent != -1) {
                isCut[u] = true;
            }
            children++;
        } else {
            low[u] = min(low[u], tin[v]);
        }
    }
    if (parent == -1 && children > 1) {
        isCut[u] = true;
    }
}

vector<int> articulationPoints(int n, vector<vector<int>>& edges) {
    vector<vector<int>> adj(n);
    for (int i = 0; i < edges.size(); i++) {
        adj[edges[i][0]].push_back(edges[i][1]);
        adj[edges[i][1]].push_back(edges[i][0]);
    }
    vector<int> tin(n, 0);
    vector<int> low(n, 0);
    vector<bool> isCut(n, false);
    timer = 0;
    for (int v = 0; v < n; v++) {
        if (tin[v] == 0) {
            dfs(v, -1, adj, tin, low, isCut);
        }
    }
    vector<int> result;
    for (int v = 0; v < n; v++) {
        if (isCut[v]) {
            result.push_back(v);
        }
    }
    return result;
}`)], [[5, [[0, 1], [1, 4], [2, 4], [2, 3], [3, 4]]], [4, [[0, 1], [1, 2], [2, 3]]], [3, [[0, 1], [1, 2], [2, 0]]], [4, [[0, 1], [0, 2], [0, 3]]], [1, []], [6, [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 3]]]], (n: number, e: E[]) => { const base = comps(n, adjU(n, e)); const out: number[] = []; for (let v = 0; v < n; v++) { const rest = e.filter(([a, b]) => a !== v && b !== v); const g = adjU(n, rest); const seen = Array(n).fill(false); seen[v] = true; let c = 0; for (let i = 0; i < n; i++) if (!seen[i]) { c++; const st = [i]; seen[i] = true; while (st.length) { const u = st.pop()!; for (const w of g[u]) if (!seen[w]) { seen[w] = true; st.push(w); } } } if (c > base - (adjU(n, e)[v].length === 0 ? 1 : 0)) out.push(v); } return out; }, ['Same low-link values as for bridges; the comparison is ≥ instead of >.', 'The DFS root needs separate handling.'], 'A vertex is critical if a child subtree can only reach the rest of the graph through it.'),
];
