// Batch 5: Step 13 (remaining binary-tree problems) and Step 14 (remaining BST problems).
import { Playable, ap, mk, mkTree, treeArr, RT } from './kit';

const sortNum = (a: number[]) => [...a].sort((x, y) => x - y);
const pre = (r: RT | null, o: number[] = []) => { if (r) { o.push(r.val); pre(r.left, o); pre(r.right, o); } return o; };
const ino = (r: RT | null, o: number[] = []) => { if (r) { ino(r.left, o); o.push(r.val); ino(r.right, o); } return o; };
const post = (r: RT | null, o: number[] = []) => { if (r) { post(r.left, o); post(r.right, o); o.push(r.val); } return o; };
const levels = (r: RT | null) => { const out: number[][] = []; let cur = r ? [r] : []; while (cur.length) { out.push(cur.map(n => n.val)); cur = cur.flatMap(n => [n.left, n.right].filter(Boolean) as RT[]); } return out; };
const height = (r: RT | null): number => (r ? 1 + Math.max(height(r.left), height(r.right)) : 0);
const find = (r: RT | null, v: number): RT | null => (!r ? null : r.val === v ? r : find(r.left, v) ?? find(r.right, v));
const bstInsert = (r: RT | null, v: number): RT => { if (!r) return { val: v, left: null, right: null }; if (v < r.val) r.left = bstInsert(r.left, v); else r.right = bstInsert(r.right, v); return r; };
const parents = (r: RT | null) => { const m = new Map<RT, RT>(); const go = (n: RT | null) => { if (!n) return; for (const c of [n.left, n.right]) if (c) { m.set(c, n); go(c); } }; go(r); return m; };
const T1 = [1, 2, 3, 4, 5, 6, 7], T2 = [1, 2, 3, null, 4, null, 5], T3 = [3, 9, 20, null, null, 15, 7], T4 = [1], T5: any[] = [], T6 = [1, 2, null, 3, null, 4], T7 = [10, 5, 15, 3, 7, null, 18];

export const B5_PROBLEMS: Playable[] = [
  // ---------- Step 13: traversals ----------
  mk('Introduction to Trees', 'treeStats', 'Return {number of nodes, number of leaves, height (nodes on the longest root-to-leaf path), sum of all values}.', 'vector<int> treeStats(TreeNode* root)', 'return {};', [
    ap('One recursive pass', 'O(n)', 'O(h)', 'n', 'Every node is visited once; the stack depth is the tree height h.', `vector<int> treeStats(TreeNode* root) {
    if (root == nullptr) {
        return {0, 0, 0, 0};
    }
    vector<int> left = treeStats(root->left);
    vector<int> right = treeStats(root->right);
    int nodes = 1 + left[0] + right[0];
    int leaves = left[1] + right[1];
    if (root->left == nullptr && root->right == nullptr) {
        leaves = 1;
    }
    int h = 1 + max(left[2], right[2]);
    int sum = root->val + left[3] + right[3];
    return {nodes, leaves, h, sum};
}`)], [T1, T2, T3, T4, T5, T6].map(t => [t]), (a: any) => { const r = mkTree(a); const leaves = (n: RT | null): number => (!n ? 0 : !n.left && !n.right ? 1 : leaves(n.left) + leaves(n.right)); return [pre(r).length, leaves(r), height(r), pre(r).reduce((x, y) => x + y, 0)]; }, ['A tree is a root plus two smaller trees.'], 'Many tree questions combine the answers of the two subtrees.'),
  mk('Binary Tree Representation in C++', 'buildTree', 'Build a binary tree from its level-order array where -1 means "no node" (children of absent nodes are not listed). Return the root.', 'TreeNode* buildTree(vector<int>& nodes)', 'return nullptr;', [
    ap('Level-order construction with a queue', 'O(n)', 'O(n)', 'n', 'Each value creates (or skips) one node; the queue holds the nodes whose children are still to be attached.', `TreeNode* buildTree(vector<int>& nodes) {
    if (nodes.empty() || nodes[0] == -1) {
        return nullptr;
    }
    TreeNode* root = new TreeNode(nodes[0]);
    queue<TreeNode*> q;
    q.push(root);
    int i = 1;
    while (!q.empty() && i < nodes.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (i < nodes.size() && nodes[i] != -1) {
            node->left = new TreeNode(nodes[i]);
            q.push(node->left);
        }
        i++;
        if (i < nodes.size() && nodes[i] != -1) {
            node->right = new TreeNode(nodes[i]);
            q.push(node->right);
        }
        i++;
    }
    return root;
}`)], [[[1, 2, 3, 4, 5]], [[1, -1, 2, -1, 3]], [[7]], [[]], [[1, 2, 3, -1, 4, -1, 5]]], (a: number[]) => treeArr(mkTree(a.map(x => (x === -1 ? null : x)))), ['Use a queue of nodes waiting for children.'], 'Level order lists every node\'s two children (or gaps) in queue order.'),
  mk('Binary Tree Traversals', 'allTraversals', 'Return {preorder, inorder, postorder, level order} of the tree.', 'vector<vector<int>> allTraversals(TreeNode* root)', 'return {};', [
    ap('Recursive DFS ×3 + BFS', 'O(n)', 'O(n)', 'n', 'Each traversal visits every node once; recursion depth h and a queue of up to one level.', `void preorder(TreeNode* n, vector<int>& out) {
    if (n == nullptr) {
        return;
    }
    out.push_back(n->val);
    preorder(n->left, out);
    preorder(n->right, out);
}

void inorder(TreeNode* n, vector<int>& out) {
    if (n == nullptr) {
        return;
    }
    inorder(n->left, out);
    out.push_back(n->val);
    inorder(n->right, out);
}

void postorder(TreeNode* n, vector<int>& out) {
    if (n == nullptr) {
        return;
    }
    postorder(n->left, out);
    postorder(n->right, out);
    out.push_back(n->val);
}

vector<vector<int>> allTraversals(TreeNode* root) {
    vector<int> a;
    vector<int> b;
    vector<int> c;
    vector<int> d;
    preorder(root, a);
    inorder(root, b);
    postorder(root, c);
    if (root != nullptr) {
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            TreeNode* node = q.front();
            q.pop();
            d.push_back(node->val);
            if (node->left != nullptr) {
                q.push(node->left);
            }
            if (node->right != nullptr) {
                q.push(node->right);
            }
        }
    }
    return {a, b, c, d};
}`)], [T1, T2, T3, T4, T5].map(t => [t]), (a: any) => { const r = mkTree(a); return [pre(r), ino(r), post(r), levels(r).flat()]; }, ['Preorder: node first. Inorder: node between. Postorder: node last.'], 'The three DFS orders differ only in where the node is visited.'),
  mk('Iterative Preorder Traversal', 'preorderIterative', 'Preorder traversal without recursion.', 'vector<int> preorderIterative(TreeNode* root)', 'return {};', [
    ap('Explicit stack', 'O(n)', 'O(h)', 'n', 'Each node is pushed and popped once; push right before left so left is processed first.', `vector<int> preorderIterative(TreeNode* root) {
    vector<int> result;
    if (root == nullptr) {
        return result;
    }
    stack<TreeNode*> st;
    st.push(root);
    while (!st.empty()) {
        TreeNode* node = st.top();
        st.pop();
        result.push_back(node->val);
        if (node->right != nullptr) {
            st.push(node->right);
        }
        if (node->left != nullptr) {
            st.push(node->left);
        }
    }
    return result;
}`)], [T1, T2, T3, T4, T5].map(t => [t]), (a: any) => pre(mkTree(a)), ['A stack pops the most recently pushed node first.'], 'Pushing right then left makes the left subtree come out first.'),
  mk('Post-order Traversal using 2 Stacks', 'postorderTwoStacks', 'Postorder traversal using two stacks.', 'vector<int> postorderTwoStacks(TreeNode* root)', 'return {};', [
    ap('Reverse of (node, right, left)', 'O(n)', 'O(n)', 'n', 'The first stack produces node-right-left order; the second stack reverses it into left-right-node. Both hold up to n nodes.', `vector<int> postorderTwoStacks(TreeNode* root) {
    vector<int> result;
    if (root == nullptr) {
        return result;
    }
    stack<TreeNode*> first;
    stack<TreeNode*> second;
    first.push(root);
    while (!first.empty()) {
        TreeNode* node = first.top();
        first.pop();
        second.push(node);
        if (node->left != nullptr) {
            first.push(node->left);
        }
        if (node->right != nullptr) {
            first.push(node->right);
        }
    }
    while (!second.empty()) {
        result.push_back(second.top()->val);
        second.pop();
    }
    return result;
}`)], [T1, T2, T3, T4, T5].map(t => [t]), (a: any) => post(mkTree(a)), ['Reverse postorder is node, right, left.'], 'A stack reverses order, so reversing "node-right-left" gives postorder.'),
  mk('Post-order Traversal using 1 Stack', 'postorderOneStack', 'Postorder traversal using a single stack.', 'vector<int> postorderOneStack(TreeNode* root)', 'return {};', [
    ap('Stack with a last-visited pointer', 'O(n)', 'O(h)', 'n', 'Each node is examined at most three times; the stack holds one root-to-node path (h).', `vector<int> postorderOneStack(TreeNode* root) {
    vector<int> result;
    stack<TreeNode*> st;
    TreeNode* current = root;
    TreeNode* lastVisited = nullptr;
    while (current != nullptr || !st.empty()) {
        if (current != nullptr) {
            st.push(current);
            current = current->left;
        } else {
            TreeNode* top = st.top();
            if (top->right != nullptr && lastVisited != top->right) {
                current = top->right;
            } else {
                result.push_back(top->val);
                lastVisited = top;
                st.pop();
            }
        }
    }
    return result;
}`)], [T1, T2, T3, T4, T5].map(t => [t]), (a: any) => post(mkTree(a)), ['A node may be visited only after its right subtree is done.'], 'The last visited node tells you whether you are returning from the right subtree.'),
  mk('Preorder, Inorder, and Postorder in One Traversal', 'oneTraversal', 'Compute all three DFS orders with a single traversal using a stack of (node, state) pairs. Return {preorder, inorder, postorder}.', 'vector<vector<int>> oneTraversal(TreeNode* root)', 'return {};', [
    ap('Stack of (node, state)', 'O(n)', 'O(n)', 'n', 'Each node is pushed three times (state 1, 2, 3) and the single loop handles all orders: 3n iterations.', `vector<vector<int>> oneTraversal(TreeNode* root) {
    vector<int> pre;
    vector<int> in;
    vector<int> post;
    if (root == nullptr) {
        return {pre, in, post};
    }
    stack<pair<TreeNode*, int>> st;
    st.push({root, 1});
    while (!st.empty()) {
        auto [node, state] = st.top();
        st.pop();
        if (state == 1) {
            pre.push_back(node->val);
            st.push({node, 2});
            if (node->left != nullptr) {
                st.push({node->left, 1});
            }
        } else if (state == 2) {
            in.push_back(node->val);
            st.push({node, 3});
            if (node->right != nullptr) {
                st.push({node->right, 1});
            }
        } else {
            post.push_back(node->val);
        }
    }
    return {pre, in, post};
}`)], [T1, T2, T3, T4, T5].map(t => [t]), (a: any) => { const r = mkTree(a); return [pre(r), ino(r), post(r)]; }, ['State 1 = first visit (preorder), 2 = after the left subtree (inorder), 3 = after the right subtree (postorder).'], 'The state records how many times the node has been seen.'),

  // ---------- medium ----------
  mk('Boundary Traversal', 'boundaryTraversal', 'Return the boundary values anticlockwise: root, left boundary (without leaves), all leaves left to right, right boundary (without leaves) bottom-up.', 'vector<int> boundaryTraversal(TreeNode* root)', 'return {};', [
    ap('Three walks', 'O(n)', 'O(h)', 'n', 'The left edge, the leaves and the right edge are each visited once.', `bool isLeaf(TreeNode* n) {
    return n->left == nullptr && n->right == nullptr;
}

void collectLeaves(TreeNode* n, vector<int>& out) {
    if (n == nullptr) {
        return;
    }
    if (isLeaf(n)) {
        out.push_back(n->val);
        return;
    }
    collectLeaves(n->left, out);
    collectLeaves(n->right, out);
}

vector<int> boundaryTraversal(TreeNode* root) {
    vector<int> result;
    if (root == nullptr) {
        return result;
    }
    if (!isLeaf(root)) {
        result.push_back(root->val);
    }
    TreeNode* node = root->left;
    while (node != nullptr) {
        if (!isLeaf(node)) {
            result.push_back(node->val);
        }
        if (node->left != nullptr) {
            node = node->left;
        } else {
            node = node->right;
        }
    }
    collectLeaves(root, result);
    vector<int> right;
    node = root->right;
    while (node != nullptr) {
        if (!isLeaf(node)) {
            right.push_back(node->val);
        }
        if (node->right != nullptr) {
            node = node->right;
        } else {
            node = node->left;
        }
    }
    for (int i = right.size() - 1; i >= 0; i--) {
        result.push_back(right[i]);
    }
    return result;
}`)], [T1, T2, T3, T4, [1, 2, null, 3, null, 4], [1, null, 2, null, 3], [20, 8, 22, 5, 3, 4, 25, null, null, 10, 14]].map(t => [t]), (a: any) => { const r = mkTree(a); if (!r) return []; const leaf = (n: RT) => !n.left && !n.right; const out: number[] = leaf(r) ? [] : [r.val]; for (let n = r.left; n; n = n.left ?? n.right) if (!leaf(n)) out.push(n.val); const lv = (n: RT | null) => { if (!n) return; if (leaf(n)) out.push(n.val); else { lv(n.left); lv(n.right); } }; lv(r); const rt: number[] = []; for (let n = r.right; n; n = n.right ?? n.left) if (!leaf(n)) rt.push(n.val); return [...out, ...rt.reverse()]; }, ['Split the boundary into left edge, leaves and right edge.'], 'Take care not to count leaves in the edges.'),
  mk('Vertical Order Traversal', 'verticalTraversal', 'Group nodes by column (left to right); within a column list them top to bottom, ties on the same row sorted by value.', 'vector<vector<int>> verticalTraversal(TreeNode* root)', 'return {};', [
    ap('BFS with (row, column) + sorted cells', 'O(n log n)', 'O(n)', 'nlogn', 'Every node is recorded once; sorting values that share a (column, row) cell costs O(n log n) overall.', `vector<vector<int>> verticalTraversal(TreeNode* root) {
    map<int, map<int, vector<int>>> cells;
    queue<pair<TreeNode*, pair<int, int>>> q;
    if (root != nullptr) {
        q.push({root, {0, 0}});
    }
    while (!q.empty()) {
        auto [node, pos] = q.front();
        q.pop();
        cells[pos.second][pos.first].push_back(node->val);
        if (node->left != nullptr) {
            q.push({node->left, {pos.first + 1, pos.second - 1}});
        }
        if (node->right != nullptr) {
            q.push({node->right, {pos.first + 1, pos.second + 1}});
        }
    }
    vector<vector<int>> result;
    for (auto& [col, rows] : cells) {
        vector<int> column;
        for (auto& [row, values] : rows) {
            sort(values.begin(), values.end());
            for (int i = 0; i < values.size(); i++) {
                column.push_back(values[i]);
            }
        }
        result.push_back(column);
    }
    return result;
}`)], [T1, T3, T4, T5, [1, 2, 3, 4, 6, 5, 7], [0, 2, 1, 3, null, null, null, 4, 5]].map(t => [t]), (a: any) => { const cells: [number, number, number][] = []; const go = (n: RT | null, r: number, c: number) => { if (!n) return; cells.push([c, r, n.val]); go(n.left, r + 1, c - 1); go(n.right, r + 1, c + 1); }; go(mkTree(a), 0, 0); cells.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]); const cols = new Map<number, number[]>(); cells.forEach(([c, , v]) => (cols.get(c) ?? cols.set(c, []).get(c)!).push(v)); return [...cols.entries()].sort((x, y) => x[0] - y[0]).map(e => e[1]); }, ['Left child = column − 1, right child = column + 1; both are one row deeper.'], 'Coordinates turn tree shape into a 2D layout.'),
  mk('Top View of Binary Tree', 'topView', 'Return the values visible from above, left to right.', 'vector<int> topView(TreeNode* root)', 'return {};', [
    ap('BFS with horizontal distance', 'O(n log n)', 'O(n)', 'nlogn', 'BFS reaches a column first at its topmost node, so only the first node per column is kept; an ordered map keeps columns sorted.', `vector<int> topView(TreeNode* root) {
    map<int, int> firstAtColumn;
    queue<pair<TreeNode*, int>> q;
    if (root != nullptr) {
        q.push({root, 0});
    }
    while (!q.empty()) {
        auto [node, column] = q.front();
        q.pop();
        if (!firstAtColumn.count(column)) {
            firstAtColumn[column] = node->val;
        }
        if (node->left != nullptr) {
            q.push({node->left, column - 1});
        }
        if (node->right != nullptr) {
            q.push({node->right, column + 1});
        }
    }
    vector<int> result;
    for (auto& [column, value] : firstAtColumn) {
        result.push_back(value);
    }
    return result;
}`)], [T1, T2, T3, T4, T5, [1, 2, 3, null, 4, null, null, null, 5, null, 6]].map(t => [t]), (a: any) => { const m = new Map<number, [number, number]>(); const go = (n: RT | null, r: number, c: number) => { if (!n) return; const e = m.get(c); if (!e || r < e[0]) m.set(c, [r, n.val]); go(n.left, r + 1, c - 1); go(n.right, r + 1, c + 1); }; go(mkTree(a), 0, 0); return [...m.entries()].sort((x, y) => x[0] - y[0]).map(e => e[1][1]); }, ['BFS visits shallower nodes first.'], 'The first node BFS meets in a column is the one you can see from above.'),
  mk('Bottom View of Binary Tree', 'bottomView', 'Return the values visible from below, left to right (for equal depth the later node in level order wins).', 'vector<int> bottomView(TreeNode* root)', 'return {};', [
    ap('BFS, overwrite each column', 'O(n log n)', 'O(n)', 'nlogn', 'Deeper nodes are reached later, so overwriting the column\'s value keeps the lowest one.', `vector<int> bottomView(TreeNode* root) {
    map<int, int> lastAtColumn;
    queue<pair<TreeNode*, int>> q;
    if (root != nullptr) {
        q.push({root, 0});
    }
    while (!q.empty()) {
        auto [node, column] = q.front();
        q.pop();
        lastAtColumn[column] = node->val;
        if (node->left != nullptr) {
            q.push({node->left, column - 1});
        }
        if (node->right != nullptr) {
            q.push({node->right, column + 1});
        }
    }
    vector<int> result;
    for (auto& [column, value] : lastAtColumn) {
        result.push_back(value);
    }
    return result;
}`)], [T1, T2, T3, T4, T5, [20, 8, 22, 5, 3, 4, 25, null, null, 10, 14]].map(t => [t]), (a: any) => { const m = new Map<number, number>(); const r = mkTree(a); if (r) { const q: [RT, number][] = [[r, 0]]; for (let i = 0; i < q.length; i++) { const [n, c] = q[i]; m.set(c, n.val); if (n.left) q.push([n.left, c - 1]); if (n.right) q.push([n.right, c + 1]); } } return [...m.entries()].sort((x, y) => x[0] - y[0]).map(e => e[1]); }, ['Same as the top view, but keep overwriting.'], 'The last node in level order for a column is the lowest one.'),

  // ---------- hard ----------
  mk('Root to Node Path in Binary Tree', 'rootToNode', 'Return the values on the path from the root to the node with value target (empty if absent).', 'vector<int> rootToNode(TreeNode* root, int target)', 'return {};', [
    ap('DFS with backtracking', 'O(n)', 'O(h)', 'n', 'Each node is visited once; the path vector holds at most h values.', `bool findPath(TreeNode* node, int target, vector<int>& path) {
    if (node == nullptr) {
        return false;
    }
    path.push_back(node->val);
    if (node->val == target) {
        return true;
    }
    if (findPath(node->left, target, path) || findPath(node->right, target, path)) {
        return true;
    }
    path.pop_back();
    return false;
}

vector<int> rootToNode(TreeNode* root, int target) {
    vector<int> path;
    if (findPath(root, target, path)) {
        return path;
    }
    return {};
}`)], [[T1, 6], [T1, 1], [T3, 15], [T3, 99], [T4, 1], [T5, 1]], (a: any, t: number) => { const out: number[] = []; const go = (n: RT | null): boolean => { if (!n) return false; out.push(n.val); if (n.val === t) return true; if (go(n.left) || go(n.right)) return true; out.pop(); return false; }; return go(mkTree(a)) ? out : []; }, ['Add the node to the path; remove it if neither subtree contains the target.'], 'Backtracking keeps the current root-to-node path.'),
  mk('Lowest Common Ancestor of a Binary Tree', 'lowestCommonAncestor', 'Return the lowest common ancestor of the nodes with values p and q (the result shows that node\'s subtree).', 'TreeNode* lowestCommonAncestor(TreeNode* root, int p, int q)', 'return nullptr;', [
    ap('Recursion returning the found node', 'O(n)', 'O(h)', 'n', 'A single post-order pass: the node where p and q are found in different subtrees (or the node itself equals one of them) is the LCA.', `TreeNode* lowestCommonAncestor(TreeNode* root, int p, int q) {
    if (root == nullptr || root->val == p || root->val == q) {
        return root;
    }
    TreeNode* left = lowestCommonAncestor(root->left, p, q);
    TreeNode* right = lowestCommonAncestor(root->right, p, q);
    if (left != nullptr && right != nullptr) {
        return root;
    }
    if (left != nullptr) {
        return left;
    }
    return right;
}`)], [[T1, 4, 5], [T1, 4, 6], [T1, 2, 4], [T3, 9, 15], [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 1]], (a: any, p: number, q: number) => { const r = mkTree(a); const par = parents(r); const anc = (x: RT | null) => { const s = new Set<RT>(); for (; x; x = par.get(x) ?? null) s.add(x); return s; }; const A = anc(find(r, p)); let n = find(r, q); while (n && !A.has(n)) n = par.get(n) ?? null; return treeArr(n); }, ['If both sides report a hit, the current node is the LCA.'], 'The LCA is the first node that has p and q in different subtrees.'),
  mk('Maximum Width of a Binary Tree', 'widthOfBinaryTree', 'The width of a level is the distance between its leftmost and rightmost non-null nodes (counting the nulls between them). Return the maximum width.', 'long long widthOfBinaryTree(TreeNode* root)', 'return 0;', [
    ap('Level order with heap-style indices', 'O(n)', 'O(w)', 'n', 'Index a node 2i / 2i+1 for its children; width = last − first + 1 per level. Indices are re-based per level to avoid overflow (long long).', `long long widthOfBinaryTree(TreeNode* root) {
    if (root == nullptr) {
        return 0;
    }
    long long best = 0;
    queue<pair<TreeNode*, long long>> q;
    q.push({root, 0});
    while (!q.empty()) {
        int size = q.size();
        long long first = q.front().second;
        long long last = first;
        for (int i = 0; i < size; i++) {
            auto [node, index] = q.front();
            q.pop();
            long long local = index - first;
            last = local;
            if (node->left != nullptr) {
                q.push({node->left, 2 * local});
            }
            if (node->right != nullptr) {
                q.push({node->right, 2 * local + 1});
            }
        }
        best = max(best, last + 1);
    }
    return best;
}`)], [[1, 3, 2, 5, 3, null, 9], [1, 3, 2, 5, null, null, 9, 6, null, 7], [1, 3, 2, 5], T4, T5, T6].map(t => [t]), (a: any) => { const r = mkTree(a); if (!r) return 0; let b = 0; let cur: [RT, number][] = [[r, 0]]; while (cur.length) { b = Math.max(b, cur[cur.length - 1][1] - cur[0][1] + 1); const nx: [RT, number][] = []; cur.forEach(([n, i]) => { if (n.left) nx.push([n.left, 2 * i]); if (n.right) nx.push([n.right, 2 * i + 1]); }); cur = nx; } return b; }, ['Number nodes as in a heap array.', 'Subtract the first index of the level to keep numbers small.'], 'Positions in a complete binary tree make gaps measurable.'),
  mk('Children Sum Property', 'changeTree', 'Modify the tree (only by INCREASING values) so every node equals the sum of its children (leaves are free). Return the tree.', 'TreeNode* changeTree(TreeNode* root)', 'return root;', [
    ap('Push down, then recompute on the way back', 'O(n)', 'O(h)', 'n', 'Going down, children are raised to the parent value if their sum is too small; on the way back each node becomes the sum of its children. One visit per node.', `void fix(TreeNode* node) {
    if (node == nullptr) {
        return;
    }
    int childSum = 0;
    if (node->left != nullptr) {
        childSum += node->left->val;
    }
    if (node->right != nullptr) {
        childSum += node->right->val;
    }
    if (childSum >= node->val) {
        node->val = childSum;
    } else {
        if (node->left != nullptr) {
            node->left->val = node->val;
        }
        if (node->right != nullptr) {
            node->right->val = node->val;
        }
    }
    fix(node->left);
    fix(node->right);
    int total = 0;
    if (node->left != nullptr) {
        total += node->left->val;
    }
    if (node->right != nullptr) {
        total += node->right->val;
    }
    if (node->left != nullptr || node->right != nullptr) {
        node->val = total;
    }
}

TreeNode* changeTree(TreeNode* root) {
    fix(root);
    return root;
}`)], [[2, 35, 10, 2, 3, 5, 2], [50, 7, 2, 3, 5, 1, 30], [10], [5, 3, 4], [1, 2, 3]].map(t => [t]), (a: any) => { const r = mkTree(a); const fix = (n: RT | null) => { if (!n) return; const cs = (n.left?.val ?? 0) + (n.right?.val ?? 0); if (cs >= n.val) n.val = cs; else { if (n.left) n.left.val = n.val; if (n.right) n.right.val = n.val; } fix(n.left); fix(n.right); if (n.left || n.right) n.val = (n.left?.val ?? 0) + (n.right?.val ?? 0); }; fix(r); return treeArr(r); }, ['Make children at least as large as the parent, then sum up.'], 'Values may only increase, so push the larger value downwards first.'),
  mk('Print all Nodes at distance K', 'distanceK', 'Return (sorted ascending) all node values at distance k from the node with value target.', 'vector<int> distanceK(TreeNode* root, int target, int k)', 'return {};', [
    ap('Parent map + BFS', 'O(n)', 'O(n)', 'n', 'A first pass records each node\'s parent (so the tree behaves like an undirected graph); BFS then expands k levels from the target.', `vector<int> distanceK(TreeNode* root, int target, int k) {
    unordered_map<TreeNode*, TreeNode*> parent;
    TreeNode* start = nullptr;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front();
        q.pop();
        if (node->val == target) {
            start = node;
        }
        if (node->left != nullptr) {
            parent[node->left] = node;
            q.push(node->left);
        }
        if (node->right != nullptr) {
            parent[node->right] = node;
            q.push(node->right);
        }
    }
    unordered_set<TreeNode*> seen;
    queue<TreeNode*> frontier;
    frontier.push(start);
    seen.insert(start);
    int distance = 0;
    while (!frontier.empty() && distance < k) {
        int size = frontier.size();
        for (int i = 0; i < size; i++) {
            TreeNode* node = frontier.front();
            frontier.pop();
            TreeNode* next[3] = {node->left, node->right, parent.count(node) ? parent[node] : nullptr};
            for (int j = 0; j < 3; j++) {
                if (next[j] != nullptr && !seen.count(next[j])) {
                    seen.insert(next[j]);
                    frontier.push(next[j]);
                }
            }
        }
        distance++;
    }
    vector<int> result;
    while (!frontier.empty()) {
        result.push_back(frontier.front()->val);
        frontier.pop();
    }
    sort(result.begin(), result.end());
    return result;
}`)], [[[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 2], [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 0], [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 1, 3], [T4, 1, 1], [T1, 4, 3]], (a: any, t: number, k: number) => { const r = mkTree(a); const par = parents(r); const start = find(r, t)!; const seen = new Set<RT>([start]); let cur = [start]; for (let d = 0; d < k; d++) { const nx: RT[] = []; for (const n of cur) for (const c of [n.left, n.right, par.get(n)]) if (c && !seen.has(c)) { seen.add(c); nx.push(c); } cur = nx; } return sortNum(cur.map(n => n.val)); }, ['A parent pointer lets BFS move upwards.'], 'Treating the tree as an undirected graph makes "distance" a BFS question.'),
  mk('Minimum time taken to burn the Binary Tree', 'minTimeToBurn', 'Fire starts at the node with value start and spreads to its parent and children every minute. Return the minutes needed to burn the whole tree.', 'int minTimeToBurn(TreeNode* root, int start)', 'return 0;', [
    ap('Parent map + BFS levels', 'O(n)', 'O(n)', 'n', 'Each node burns once; BFS layers count minutes.', `int minTimeToBurn(TreeNode* root, int start) {
    unordered_map<TreeNode*, TreeNode*> parent;
    TreeNode* source = nullptr;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front();
        q.pop();
        if (node->val == start) {
            source = node;
        }
        if (node->left != nullptr) {
            parent[node->left] = node;
            q.push(node->left);
        }
        if (node->right != nullptr) {
            parent[node->right] = node;
            q.push(node->right);
        }
    }
    unordered_set<TreeNode*> burnt;
    queue<TreeNode*> fire;
    fire.push(source);
    burnt.insert(source);
    int minutes = 0;
    while (!fire.empty()) {
        int size = fire.size();
        bool spread = false;
        for (int i = 0; i < size; i++) {
            TreeNode* node = fire.front();
            fire.pop();
            TreeNode* next[3] = {node->left, node->right, parent.count(node) ? parent[node] : nullptr};
            for (int j = 0; j < 3; j++) {
                if (next[j] != nullptr && !burnt.count(next[j])) {
                    burnt.insert(next[j]);
                    fire.push(next[j]);
                    spread = true;
                }
            }
        }
        if (spread) {
            minutes++;
        }
    }
    return minutes;
}`)], [[[1, 2, 3, 4, 5, null, 6], 3], [[1, 2, 3, 4, 5, null, 6], 1], [[1], 1], [[1, 2, null, 3, null, 4], 4], [T1, 7]], (a: any, s: number) => { const r = mkTree(a); const par = parents(r); const src = find(r, s)!; const seen = new Set<RT>([src]); let cur = [src], t = -1; while (cur.length) { t++; const nx: RT[] = []; for (const n of cur) for (const c of [n.left, n.right, par.get(n)]) if (c && !seen.has(c)) { seen.add(c); nx.push(c); } cur = nx; } return t; }, ['It is the same graph BFS as "nodes at distance K".'], 'The burn time is the eccentricity of the start node.'),
  mk('Count total nodes in a Complete Binary Tree', 'countNodes', 'Count the nodes of a complete binary tree (all levels full except possibly the last, which is filled from the left).', 'int countNodes(TreeNode* root)', 'return 0;', [
    ap('Visit every node', 'O(n)', 'O(h)', 'n', 'Ignores the completeness property.', `int countNodes(TreeNode* root) {
    if (root == nullptr) {
        return 0;
    }
    return 1 + countNodes(root->left) + countNodes(root->right);
}`), ap('Compare left and right heights', 'O(log² n)', 'O(log n)', 'logn', 'If the leftmost and rightmost heights are equal the subtree is perfect (2^h − 1 nodes); otherwise recurse. At most one of the two children needs a real recursion, so there are log n steps each costing O(log n) for the height walk.', `int leftHeight(TreeNode* node) {
    int h = 0;
    while (node != nullptr) {
        h++;
        node = node->left;
    }
    return h;
}

int rightHeight(TreeNode* node) {
    int h = 0;
    while (node != nullptr) {
        h++;
        node = node->right;
    }
    return h;
}

int countNodes(TreeNode* root) {
    if (root == nullptr) {
        return 0;
    }
    int lh = leftHeight(root);
    int rh = rightHeight(root);
    if (lh == rh) {
        return (1 << lh) - 1;
    }
    return 1 + countNodes(root->left) + countNodes(root->right);
}`)], [[1, 2, 3, 4, 5, 6], [1], [], [1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4], [1, 2]].map(t => [t]), (a: any) => pre(mkTree(a)).length, ['A perfect subtree has 2^h − 1 nodes: no need to visit it.'], 'Completeness lets you skip entire perfect subtrees.'),
  mk('Requirements needed to construct a Unique Binary Tree', 'uniqueTree', 'Given the names of two traversals ("preorder", "inorder", "postorder"), return true if the pair always determines a unique binary tree.', 'bool uniqueTree(string first, string second)', 'return false;', [
    ap('Rule: inorder + (preorder or postorder)', 'O(1)', 'O(1)', '1', 'Preorder and postorder alone cannot tell a lone left child from a lone right child; inorder splits the tree around the root, which fixes the shape.', `bool uniqueTree(string first, string second) {
    if (first == second) {
        return false;
    }
    return first == "inorder" || second == "inorder";
}`)], [['preorder', 'inorder'], ['inorder', 'postorder'], ['preorder', 'postorder'], ['inorder', 'inorder'], ['postorder', 'inorder']], (a: string, b: string) => a !== b && (a === 'inorder' || b === 'inorder'), ['Consider the trees with one node and a single child.', 'Which traversal separates the left subtree from the right one?'], 'Inorder tells you how many nodes are on each side of the root.'),
  mk('Construct Binary Tree from Inorder and Preorder', 'buildFromPreIn', 'Rebuild the tree (distinct values) from its preorder and inorder traversals.', 'TreeNode* buildFromPreIn(vector<int>& preorder, vector<int>& inorder)', 'return nullptr;', [
    ap('Recursion + value→index map', 'O(n)', 'O(n)', 'n', 'The root is the next preorder value; a hash map locates it in inorder in O(1), splitting left/right sizes. Each node is created once.', `TreeNode* build(vector<int>& preorder, int& preIndex, int low, int high, unordered_map<int, int>& position) {
    if (low > high) {
        return nullptr;
    }
    int rootValue = preorder[preIndex];
    preIndex++;
    TreeNode* root = new TreeNode(rootValue);
    int mid = position[rootValue];
    root->left = build(preorder, preIndex, low, mid - 1, position);
    root->right = build(preorder, preIndex, mid + 1, high, position);
    return root;
}

TreeNode* buildFromPreIn(vector<int>& preorder, vector<int>& inorder) {
    unordered_map<int, int> position;
    for (int i = 0; i < inorder.size(); i++) {
        position[inorder[i]] = i;
    }
    int preIndex = 0;
    return build(preorder, preIndex, 0, (int)inorder.size() - 1, position);
}`)], [T1, T3, T4, T6, T7, [1, null, 2, 3]].map(t => { const r = mkTree(t); return [pre(r), ino(r)]; }), (p: number[], i: number[]) => { const go = (pl: number, il: number, ir: number): RT | null => { if (il > ir) return null; const v = p[pl]; const m = i.indexOf(v); const n: RT = { val: v, left: null, right: null }; n.left = go(pl + 1, il, m - 1); n.right = go(pl + 1 + (m - il), m + 1, ir); return n; }; return treeArr(go(0, 0, i.length - 1)); }, ['The first preorder value is the root; find it in inorder.', 'Elements left of it are the left subtree.'], 'Preorder gives roots, inorder gives subtree sizes.'),
  mk('Construct Binary Tree from Inorder and Postorder', 'buildFromInPost', 'Rebuild the tree (distinct values) from its inorder and postorder traversals.', 'TreeNode* buildFromInPost(vector<int>& inorder, vector<int>& postorder)', 'return nullptr;', [
    ap('Recursion from the end of postorder', 'O(n)', 'O(n)', 'n', 'The last unused postorder value is the root; build the RIGHT subtree first because postorder ends with it. Hash-map lookups are O(1).', `TreeNode* build(vector<int>& postorder, int& postIndex, int low, int high, unordered_map<int, int>& position) {
    if (low > high) {
        return nullptr;
    }
    int rootValue = postorder[postIndex];
    postIndex--;
    TreeNode* root = new TreeNode(rootValue);
    int mid = position[rootValue];
    root->right = build(postorder, postIndex, mid + 1, high, position);
    root->left = build(postorder, postIndex, low, mid - 1, position);
    return root;
}

TreeNode* buildFromInPost(vector<int>& inorder, vector<int>& postorder) {
    unordered_map<int, int> position;
    for (int i = 0; i < inorder.size(); i++) {
        position[inorder[i]] = i;
    }
    int postIndex = (int)postorder.size() - 1;
    return build(postorder, postIndex, 0, (int)inorder.size() - 1, position);
}`)], [T1, T3, T4, T6, T7].map(t => { const r = mkTree(t); return [ino(r), post(r)]; }), (i: number[], p: number[]) => { let k = p.length - 1; const go = (l: number, r: number): RT | null => { if (l > r) return null; const v = p[k--]; const m = i.indexOf(v); const n: RT = { val: v, left: null, right: null }; n.right = go(m + 1, r); n.left = go(l, m - 1); return n; }; return treeArr(go(0, i.length - 1)); }, ['The LAST postorder value is the root.', 'Build the right subtree before the left.'], 'Reading postorder backwards visits root, right, left.'),
  mk('Serialize and De-serialize Binary Tree', 'serializeDeserialize', 'Serialise the tree to a string (level order with "#" for null) and de-serialise it back; return the rebuilt tree.', 'TreeNode* serializeDeserialize(TreeNode* root)', 'return nullptr;', [
    ap('Level-order encoding', 'O(n)', 'O(n)', 'n', 'Both directions visit each node once using a queue; the string has O(n) characters.', `string serialize(TreeNode* root) {
    string data = "";
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front();
        q.pop();
        if (node == nullptr) {
            data += "#,";
        } else {
            data += to_string(node->val) + ",";
            q.push(node->left);
            q.push(node->right);
        }
    }
    return data;
}

TreeNode* deserialize(string data) {
    vector<string> tokens;
    string current = "";
    for (int i = 0; i < data.size(); i++) {
        if (data[i] == ',') {
            tokens.push_back(current);
            current = "";
        } else {
            current += data[i];
        }
    }
    if (tokens.empty() || tokens[0] == "#") {
        return nullptr;
    }
    TreeNode* root = new TreeNode(stoi(tokens[0]));
    queue<TreeNode*> q;
    q.push(root);
    int i = 1;
    while (!q.empty() && i < tokens.size()) {
        TreeNode* node = q.front();
        q.pop();
        if (tokens[i] != "#") {
            node->left = new TreeNode(stoi(tokens[i]));
            q.push(node->left);
        }
        i++;
        if (i < tokens.size() && tokens[i] != "#") {
            node->right = new TreeNode(stoi(tokens[i]));
            q.push(node->right);
        }
        i++;
    }
    return root;
}

TreeNode* serializeDeserialize(TreeNode* root) {
    return deserialize(serialize(root));
}`)], [T1, T2, T3, T4, T5, T6].map(t => [t]), (a: any) => treeArr(mkTree(a)), ['Write null children explicitly so the shape is recoverable.'], 'A level-order list with null markers is a complete description of the tree.'),
  mk('Morris Inorder Traversal', 'morrisInorder', 'Inorder traversal in O(1) extra space (temporary threads, tree restored afterwards).', 'vector<int> morrisInorder(TreeNode* root)', 'return {};', [
    ap('Morris traversal with threaded links', 'O(n)', 'O(1)', 'n', 'Each edge is walked at most about twice (once to create a thread, once to remove it), so the total is linear while no stack or recursion is used.', `vector<int> morrisInorder(TreeNode* root) {
    vector<int> result;
    TreeNode* current = root;
    while (current != nullptr) {
        if (current->left == nullptr) {
            result.push_back(current->val);
            current = current->right;
        } else {
            TreeNode* predecessor = current->left;
            while (predecessor->right != nullptr && predecessor->right != current) {
                predecessor = predecessor->right;
            }
            if (predecessor->right == nullptr) {
                predecessor->right = current;
                current = current->left;
            } else {
                predecessor->right = nullptr;
                result.push_back(current->val);
                current = current->right;
            }
        }
    }
    return result;
}`)], [T1, T2, T3, T4, T5, T6].map(t => [t]), (a: any) => ino(mkTree(a)), ['The inorder predecessor of a node is the rightmost node of its left subtree.', 'Temporarily point it back to the node.'], 'The tree itself stores the "stack": a thread returns you to the ancestor.'),
  mk('Morris Preorder Traversal', 'morrisPreorder', 'Preorder traversal in O(1) extra space.', 'vector<int> morrisPreorder(TreeNode* root)', 'return {};', [
    ap('Morris traversal (visit on thread creation)', 'O(n)', 'O(1)', 'n', 'Same linear threading idea; the node is recorded when the thread is first created instead of when it is removed.', `vector<int> morrisPreorder(TreeNode* root) {
    vector<int> result;
    TreeNode* current = root;
    while (current != nullptr) {
        if (current->left == nullptr) {
            result.push_back(current->val);
            current = current->right;
        } else {
            TreeNode* predecessor = current->left;
            while (predecessor->right != nullptr && predecessor->right != current) {
                predecessor = predecessor->right;
            }
            if (predecessor->right == nullptr) {
                result.push_back(current->val);
                predecessor->right = current;
                current = current->left;
            } else {
                predecessor->right = nullptr;
                current = current->right;
            }
        }
    }
    return result;
}`)], [T1, T2, T3, T4, T5, T6].map(t => [t]), (a: any) => pre(mkTree(a)), ['Record the node the first time you reach it.'], 'Preorder visits a node before its left subtree, i.e. when the thread is made.'),
  { ...mk('Flatten Binary Tree to Linked List', 'flatten', 'Flatten the tree in place into a "linked list" using right pointers in preorder order (all left pointers become null).', 'void flatten(TreeNode* root)', '', [
    ap('Recursion with a previous pointer (reverse postorder)', 'O(n)', 'O(h)', 'n', 'Visiting right, left, node and linking each node to the previously processed one rebuilds the preorder chain; each node is touched once.', `TreeNode* previous = nullptr;

void build(TreeNode* node) {
    if (node == nullptr) {
        return;
    }
    build(node->right);
    build(node->left);
    node->right = previous;
    node->left = nullptr;
    previous = node;
}

void flatten(TreeNode* root) {
    previous = nullptr;
    build(root);
}`), ap('Morris-style (O(1) space)', 'O(n)', 'O(1)', 'n', 'For each node with a left child, attach the right subtree to the rightmost node of the left subtree, then move the left subtree to the right: every edge is walked a constant number of times and no stack is used.', `void flatten(TreeNode* root) {
    TreeNode* current = root;
    while (current != nullptr) {
        if (current->left != nullptr) {
            TreeNode* rightmost = current->left;
            while (rightmost->right != nullptr) {
                rightmost = rightmost->right;
            }
            rightmost->right = current->right;
            current->right = current->left;
            current->left = nullptr;
        }
        current = current->right;
    }
}`)], [T1, T2, T3, T4, T6].map(t => [t]), (a: any) => treeArr((() => { const r = mkTree(a); let head: RT | null = null; const order = pre(r); void order; const nodes: RT[] = []; const go = (n: RT | null) => { if (n) { nodes.push(n); go(n.left); go(n.right); } }; go(r); nodes.forEach((n, i) => { n.left = null; n.right = nodes[i + 1] ?? null; }); head = nodes[0] ?? null; return head; })()), ['After flattening, node i points to node i+1 of the preorder.'], 'Flatten = rewire each node\'s right pointer to the next preorder node.'), checkArg: 0 },

  // ---------- Step 14: BST ----------
  mk('Introduction to Binary Search Trees', 'bstFacts', 'The tree is a valid BST. Return {minimum, maximum, height, number of nodes, number of nodes greater than the root}.', 'vector<int> bstFacts(TreeNode* root)', 'return {};', [
    ap('Use the BST ordering', 'O(h)', 'O(1)', 'logn', 'The minimum is the leftmost node, the maximum the rightmost: h steps each. Height and counts need a full traversal, here a single recursion O(n).', `int countNodes(TreeNode* node) {
    if (node == nullptr) {
        return 0;
    }
    return 1 + countNodes(node->left) + countNodes(node->right);
}

int heightOf(TreeNode* node) {
    if (node == nullptr) {
        return 0;
    }
    return 1 + max(heightOf(node->left), heightOf(node->right));
}

vector<int> bstFacts(TreeNode* root) {
    TreeNode* node = root;
    while (node->left != nullptr) {
        node = node->left;
    }
    int smallest = node->val;
    node = root;
    while (node->right != nullptr) {
        node = node->right;
    }
    int largest = node->val;
    return {smallest, largest, heightOf(root), countNodes(root), countNodes(root->right)};
}`)], [[T7], [[4, 2, 7, 1, 3]], [[1]], [[2, 1, 3]], [[5, 3, 8, 2, 4, 7, 9]]].map(([t]) => [t]), (a: any) => { const r = mkTree(a)!; const v = ino(r); return [v[0], v[v.length - 1], height(r), v.length, ino(r.right).length]; }, ['In a BST everything left is smaller and everything right is larger.'], 'The ordering turns search into a walk down one path.'),
  mk('Find Min/Max in BST', 'minMaxBST', 'Return {minimum, maximum} of a non-empty BST.', 'vector<int> minMaxBST(TreeNode* root)', 'return {};', [
    ap('Leftmost / rightmost node', 'O(h)', 'O(1)', 'logn', 'Follow left pointers to the minimum and right pointers to the maximum.', `vector<int> minMaxBST(TreeNode* root) {
    TreeNode* low = root;
    while (low->left != nullptr) {
        low = low->left;
    }
    TreeNode* high = root;
    while (high->right != nullptr) {
        high = high->right;
    }
    return {low->val, high->val};
}`)], [[T7], [[4, 2, 7, 1, 3]], [[1]], [[2, 1, 3]], [[5, null, 6, null, 7]]].map(([t]) => [t]), (a: any) => { const v = ino(mkTree(a)); return [v[0], v[v.length - 1]]; }, ['Keep going left for the minimum.'], 'Extremes of a BST are at the ends of its left and right spines.'),
  mk('Delete a Node in BST', 'deleteNode', 'Delete the node with the given key (if present) from the BST and return the root.', 'TreeNode* deleteNode(TreeNode* root, int key)', 'return root;', [
    ap('Recursive delete with inorder successor', 'O(h)', 'O(h)', 'logn', 'One search path; a node with two children is replaced by the minimum of its right subtree, which is then deleted from that subtree (another O(h)).', `TreeNode* deleteNode(TreeNode* root, int key) {
    if (root == nullptr) {
        return nullptr;
    }
    if (key < root->val) {
        root->left = deleteNode(root->left, key);
    } else if (key > root->val) {
        root->right = deleteNode(root->right, key);
    } else {
        if (root->left == nullptr) {
            return root->right;
        }
        if (root->right == nullptr) {
            return root->left;
        }
        TreeNode* successor = root->right;
        while (successor->left != nullptr) {
            successor = successor->left;
        }
        root->val = successor->val;
        root->right = deleteNode(root->right, successor->val);
    }
    return root;
}`)], [[[5, 3, 6, 2, 4, null, 7], 3], [[5, 3, 6, 2, 4, null, 7], 5], [[5, 3, 6, 2, 4, null, 7], 7], [[5, 3, 6, 2, 4, null, 7], 99], [[1], 1], [[2, 1, 3], 2]], (a: any, key: number) => { const del = (n: RT | null, k: number): RT | null => { if (!n) return null; if (k < n.val) n.left = del(n.left, k); else if (k > n.val) n.right = del(n.right, k); else { if (!n.left) return n.right; if (!n.right) return n.left; let s = n.right; while (s.left) s = s.left; n.val = s.val; n.right = del(n.right, s.val); } return n; }; return treeArr(del(mkTree(a), key)); }, ['Three cases: leaf, one child, two children.', 'For two children use the smallest value of the right subtree.'], 'The inorder successor keeps the BST property after removal.'),
  mk('Inorder Successor/Predecessor in BST', 'successorPredecessor', 'Return {predecessor, successor} of key in a BST (-1 if missing). key may or may not be in the tree.', 'vector<int> successorPredecessor(TreeNode* root, int key)', 'return {-1, -1};', [
    ap('Single walk remembering candidates', 'O(h)', 'O(1)', 'logn', 'While searching for key, every time we go left the current node is a successor candidate and every time we go right a predecessor candidate.', `vector<int> successorPredecessor(TreeNode* root, int key) {
    int pred = -1;
    int succ = -1;
    TreeNode* node = root;
    while (node != nullptr) {
        if (node->val < key) {
            pred = node->val;
            node = node->right;
        } else if (node->val > key) {
            succ = node->val;
            node = node->left;
        } else {
            if (node->left != nullptr) {
                TreeNode* t = node->left;
                while (t->right != nullptr) {
                    t = t->right;
                }
                pred = t->val;
            }
            if (node->right != nullptr) {
                TreeNode* t = node->right;
                while (t->left != nullptr) {
                    t = t->left;
                }
                succ = t->val;
            }
            break;
        }
    }
    return {pred, succ};
}`)], [[[8, 4, 12, 2, 6, 10, 14], 8], [[8, 4, 12, 2, 6, 10, 14], 5], [[8, 4, 12, 2, 6, 10, 14], 2], [[8, 4, 12, 2, 6, 10, 14], 14], [[8, 4, 12, 2, 6, 10, 14], 20], [[1], 1]], (a: any, k: number) => { const v = ino(mkTree(a)); const p = v.filter(x => x < k), s = v.filter(x => x > k); return [p.length ? p[p.length - 1] : -1, s.length ? s[0] : -1]; }, ['The predecessor is the largest value smaller than key.'], 'Every left turn leaves a successor candidate, every right turn a predecessor candidate.'),
  mk('BST Iterator', 'bstIterator', 'Simulate a BST iterator: ops [1] next() (smallest unreturned value), [2] hasNext() (1 or 0). Return the outputs of every op.', 'vector<int> bstIterator(TreeNode* root, vector<int>& ops)', 'return {};', [
    ap('Controlled inorder with a stack', 'O(1) amortised per op', 'O(h)', 'logn', 'The stack only holds the left spine of unvisited nodes (h); each node is pushed and popped once over the whole iteration, so next() is O(1) amortised.', `vector<int> bstIterator(TreeNode* root, vector<int>& ops) {
    stack<TreeNode*> st;
    TreeNode* node = root;
    while (node != nullptr) {
        st.push(node);
        node = node->left;
    }
    vector<int> out;
    for (int i = 0; i < ops.size(); i++) {
        if (ops[i] == 1) {
            TreeNode* top = st.top();
            st.pop();
            out.push_back(top->val);
            node = top->right;
            while (node != nullptr) {
                st.push(node);
                node = node->left;
            }
        } else {
            out.push_back(st.empty() ? 0 : 1);
        }
    }
    return out;
}`)], [[[7, 3, 15, null, null, 9, 20], [1, 1, 2, 1, 2, 1, 1, 2]], [[2, 1, 3], [2, 1, 1, 1, 2]], [[5], [1, 2]], [[4, 2, 6, 1, 3, 5, 7], [1, 1, 1, 1, 1, 1, 1, 2]]], (a: any, ops: number[]) => { const v = ino(mkTree(a)); let p = 0; return ops.map(o => (o === 1 ? v[p++] : p < v.length ? 1 : 0)); }, ['Push the whole left spine; pop to get the next smallest.'], 'A stack of ancestors lets inorder traversal pause and resume.'),
  mk('Two Sum IV - Input is a BST', 'findTarget', 'Return true if two different nodes of the BST sum to k.', 'bool findTarget(TreeNode* root, int k)', 'return false;', [
    ap('Hash set while traversing', 'O(n)', 'O(n)', 'n', 'Each node is visited once with an O(1) set lookup for k − value.', `bool search(TreeNode* node, int k, unordered_set<int>& seen) {
    if (node == nullptr) {
        return false;
    }
    if (seen.count(k - node->val)) {
        return true;
    }
    seen.insert(node->val);
    return search(node->left, k, seen) || search(node->right, k, seen);
}

bool findTarget(TreeNode* root, int k) {
    unordered_set<int> seen;
    return search(root, k, seen);
}`), ap('Two-pointer walk on the inorder sequence', 'O(n)', 'O(h)', 'n', 'Two iterators (a forward and a backward stack) move towards each other; the stacks hold only O(h) nodes.', `bool findTarget(TreeNode* root, int k) {
    stack<TreeNode*> forward;
    stack<TreeNode*> backward;
    TreeNode* node = root;
    while (node != nullptr) {
        forward.push(node);
        node = node->left;
    }
    node = root;
    while (node != nullptr) {
        backward.push(node);
        node = node->right;
    }
    while (!forward.empty() && !backward.empty() && forward.top() != backward.top() && forward.top()->val < backward.top()->val) {
        int sum = forward.top()->val + backward.top()->val;
        if (sum == k) {
            return true;
        } else if (sum < k) {
            TreeNode* top = forward.top();
            forward.pop();
            node = top->right;
            while (node != nullptr) {
                forward.push(node);
                node = node->left;
            }
        } else {
            TreeNode* top = backward.top();
            backward.pop();
            node = top->left;
            while (node != nullptr) {
                backward.push(node);
                node = node->right;
            }
        }
    }
    return false;
}`)], [[[5, 3, 6, 2, 4, null, 7], 9], [[5, 3, 6, 2, 4, null, 7], 28], [[2, 1, 3], 4], [[1], 2], [[2, 1, 3], 6]], (a: any, k: number) => { const v = ino(mkTree(a)); for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (v[i] + v[j] === k) return true; return false; }, ['Inorder of a BST is sorted: use two pointers.'], 'Two-sum on a sorted sequence, but without materialising the sequence.'),
  mk('Recover BST', 'recoverTree', 'Exactly two nodes of a BST were swapped by mistake. Recover the tree without changing its structure.', 'TreeNode* recoverTree(TreeNode* root)', 'return root;', [
    ap('Inorder scan finding the two anomalies', 'O(n)', 'O(h)', 'n', 'In a sorted inorder sequence a swap creates one or two descents; the first wrong node is the left side of the first descent and the second wrong node the right side of the last descent. Swap their values.', `TreeNode* first = nullptr;
TreeNode* second = nullptr;
TreeNode* previous = nullptr;

void inorder(TreeNode* node) {
    if (node == nullptr) {
        return;
    }
    inorder(node->left);
    if (previous != nullptr && previous->val > node->val) {
        if (first == nullptr) {
            first = previous;
        }
        second = node;
    }
    previous = node;
    inorder(node->right);
}

TreeNode* recoverTree(TreeNode* root) {
    first = nullptr;
    second = nullptr;
    previous = nullptr;
    inorder(root);
    if (first != nullptr && second != nullptr) {
        int temp = first->val;
        first->val = second->val;
        second->val = temp;
    }
    return root;
}`)], [[[1, 3, null, null, 2]], [[3, 1, 4, null, null, 2]], [[2, 3, 1]], [[5, 3, 6, 2, 4, 7, 8]], [[1, 2]]], (a: any) => { const r = mkTree(a); const nodes: RT[] = []; const go = (n: RT | null) => { if (n) { go(n.left); nodes.push(n); go(n.right); } }; go(r); const vals = sortNum(nodes.map(n => n.val)); nodes.forEach((n, i) => (n.val = vals[i])); return treeArr(r); }, ['Inorder should be increasing: look for the places where it decreases.'], 'The swapped values are exactly the nodes involved in the descents.'),
  mk('Largest BST in Binary Tree', 'largestBST', 'Return the size (number of nodes) of the largest subtree that is a valid BST.', 'int largestBST(TreeNode* root)', 'return 0;', [
    ap('Check every subtree', 'O(n²)', 'O(h)', 'n2', 'Testing each node as a BST root costs O(n) per test.', `bool isBST(TreeNode* node, long long low, long long high) {
    if (node == nullptr) {
        return true;
    }
    if (node->val <= low || node->val >= high) {
        return false;
    }
    return isBST(node->left, low, node->val) && isBST(node->right, node->val, high);
}

int sizeOf(TreeNode* node) {
    if (node == nullptr) {
        return 0;
    }
    return 1 + sizeOf(node->left) + sizeOf(node->right);
}

int largestBST(TreeNode* root) {
    if (root == nullptr) {
        return 0;
    }
    if (isBST(root, -4000000000, 4000000000)) {
        return sizeOf(root);
    }
    return max(largestBST(root->left), largestBST(root->right));
}`), ap('Post-order returning (size, min, max)', 'O(n)', 'O(h)', 'n', 'Each node combines its children\'s summaries once: it is a BST if left.max < value < right.min.', `int best = 0;

vector<int> check(TreeNode* node) {
    if (node == nullptr) {
        return {0, INT_MAX, INT_MIN};
    }
    vector<int> left = check(node->left);
    vector<int> right = check(node->right);
    if (left[0] >= 0 && right[0] >= 0 && left[2] < node->val && node->val < right[1]) {
        int size = left[0] + right[0] + 1;
        best = max(best, size);
        return {size, min(left[1], node->val), max(right[2], node->val)};
    }
    return {-1, 0, 0};
}

int largestBST(TreeNode* root) {
    best = 0;
    check(root);
    return best;
}`)], [[10, 5, 15, 1, 8, null, 7], [5, 4, 6, null, 3, 7, 8], [1], [], [2, 1, 3], [1, 2, 3], [20, 8, 22, 5, 3, 4, 25, null, null, 10, 14]].map(t => [t]), (a: any) => { const r = mkTree(a); const isB = (n: RT | null, lo: number, hi: number): boolean => !n || (n.val > lo && n.val < hi && isB(n.left, lo, n.val) && isB(n.right, n.val, hi)); const sz = (n: RT | null): number => (n ? 1 + sz(n.left) + sz(n.right) : 0); const go = (n: RT | null): number => (!n ? 0 : isB(n, -Infinity, Infinity) ? sz(n) : Math.max(go(n.left), go(n.right))); return go(r); }, ['Each subtree should report whether it is a BST and its min/max.'], 'Combine child summaries instead of re-validating subtrees.'),
];
void bstInsert;
