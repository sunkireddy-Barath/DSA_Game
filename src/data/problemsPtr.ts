// Linked list, binary tree and BST problems (pointer-based C++ executed by the tracer).
import { Playable, ap, mk, mkTree, treeArr, RT } from './kit';

const LL = (title: string, fn: string, statement: string, sig: string, aps: ReturnType<typeof ap>[], tests: any[][], ref: (...a: any[]) => any, hints: string[], intuition: string) =>
  mk(title, fn, statement, sig, 'return nullptr;', aps, tests, ref, hints, intuition);

const cyc = (list: number[], pos: number) => ({ list, pos });
const MERGE = `ListNode* mergeLists(ListNode* a, ListNode* b) {
    ListNode* dummy = new ListNode(0);
    ListNode* tail = dummy;
    while (a != nullptr && b != nullptr) {
        if (a->val <= b->val) {
            tail->next = a;
            a = a->next;
        } else {
            tail->next = b;
            b = b->next;
        }
        tail = tail->next;
    }
    if (a != nullptr) {
        tail->next = a;
    } else {
        tail->next = b;
    }
    return dummy->next;
}`;

const bstInsert = (r: RT | null, v: number): RT => { if (!r) return { val: v, left: null, right: null }; if (v < r.val) r.left = bstInsert(r.left, v); else r.right = bstInsert(r.right, v); return r; };
const height = (r: RT | null): number => (r ? 1 + Math.max(height(r.left), height(r.right)) : 0);
const inorder = (r: RT | null, out: number[] = []) => { if (r) { inorder(r.left, out); out.push(r.val); inorder(r.right, out); } return out; };
const levels = (r: RT | null) => { const out: number[][] = []; let cur = r ? [r] : []; while (cur.length) { out.push(cur.map(n => n.val)); cur = cur.flatMap(n => [n.left, n.right].filter(Boolean) as RT[]); } return out; };

export const PTR_PROBLEMS: Playable[] = [
  LL('Reverse a LL (Iterative)', 'reverseList', 'Reverse a singly linked list and return the new head.', 'ListNode* reverseList(ListNode* head)', [
    ap('Iterative pointer reversal', 'O(n)', 'O(1)', 'n', 'Each node is visited once and its next pointer flipped; only prev/current/nextNode are stored.', `ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* current = head;
    while (current != nullptr) {
        ListNode* nextNode = current->next;
        current->next = prev;
        prev = current;
        current = nextNode;
    }
    return prev;
}`)], [[[10, 20, 30, 40]], [[1]], [[]], [[1, 2]], [[5, 6, 7]]], (a: number[]) => [...a].reverse(),
    ['Walk the list once; for each node, make it point backwards.', 'Save current->next before overwriting it.', 'Three pointers: prev, current, nextNode.'], 'Flip each arrow as you walk; the old head becomes the tail pointing at null.'),
  LL('Reverse a LL (Recursive)', 'reverseList', 'Reverse a linked list recursively.', 'ListNode* reverseList(ListNode* head)', [
    ap('Recursive reversal', 'O(n)', 'O(n)', 'n', 'One call per node; the call stack holds n frames at its deepest.', `ListNode* reverseList(ListNode* head) {
    if (head == nullptr || head->next == nullptr) {
        return head;
    }
    ListNode* newHead = reverseList(head->next);
    head->next->next = head;
    head->next = nullptr;
    return newHead;
}`)], [[[1, 2, 3, 4]], [[1]], [[]], [[7, 8]]], (a: number[]) => [...a].reverse(),
    ['Trust the recursion to reverse everything after head.', 'Then make head->next point back to head.'], 'Reverse the rest, then hook the old head onto the end of the reversed rest.'),
  LL('Middle of a LL', 'middleNode', 'Return the middle node (the second middle if there are two).', 'ListNode* middleNode(ListNode* head)', [
    ap('Slow / fast pointers', 'O(n)', 'O(1)', 'n', 'fast moves two steps per slow step, so slow is halfway when fast ends: n/2 iterations.', `ListNode* middleNode(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}`)], [[[1, 2, 3, 4, 5]], [[1, 2, 3, 4]], [[1]], [[1, 2]]], (a: number[]) => a.slice(Math.floor(a.length / 2)),
    ['Two pointers at different speeds.', 'When the fast one reaches the end, where is the slow one?'], 'Moving at half speed puts slow at the midpoint when fast finishes.'),
  LL('Find the length of LL', 'lengthOfList', 'Return the number of nodes.', 'int lengthOfList(ListNode* head)', [
    ap('Traverse and count', 'O(n)', 'O(1)', 'n', 'Every node is visited exactly once.', `int lengthOfList(ListNode* head) {
    int count = 0;
    ListNode* current = head;
    while (current != nullptr) {
        count++;
        current = current->next;
    }
    return count;
}`)], [[[1, 2, 3]], [[]], [[9]], [[4, 4, 4, 4]]], (a: number[]) => a.length, ['Walk until you fall off the end (nullptr).'], 'Linked lists have no stored size; you must walk them.'),
  LL('Search an element in LL', 'searchList', 'Return true if key appears in the list.', 'bool searchList(ListNode* head, int key)', [
    ap('Linear traversal', 'O(n)', 'O(1)', 'n', 'Worst case visits all n nodes; there is no random access in a linked list.', `bool searchList(ListNode* head, int key) {
    ListNode* current = head;
    while (current != nullptr) {
        if (current->val == key) {
            return true;
        }
        current = current->next;
    }
    return false;
}`)], [[[1, 2, 3], 2], [[1, 2, 3], 9], [[], 1], [[5], 5]], (a: number[], k: number) => a.includes(k), ['Compare each node value with key.'], 'No shortcuts exist without order or an index.'),
  LL('Detect a loop in LL', 'hasCycle', 'Return true if the list contains a cycle. Input is {list, pos}: the tail links to index pos (-1 = no cycle).', 'bool hasCycle(ListNode* head)', [
    ap("Floyd's tortoise and hare", 'O(n)', 'O(1)', 'n', 'If a cycle exists the fast pointer gains one node per step on the slow one, so they meet within O(n) steps. No visited set is needed.', `bool hasCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            return true;
        }
    }
    return false;
}`)], [[cyc([3, 2, 0, -4], 1)], [cyc([1, 2], 0)], [cyc([1], -1)], [cyc([1, 2, 3, 4], -1)], [cyc([1, 2, 3, 4, 5], 3)]], (o: any) => o.pos >= 0 && o.list.length > 0,
    ['A set of visited nodes works, but costs memory.', 'Two pointers at different speeds must meet inside a loop.'], 'On a circular track a faster runner always laps a slower one.')
    , LL('Find the starting point of the loop in LL', 'detectCycle', 'Return the node where the cycle begins (the result shows the list from that node), or empty if none.', 'ListNode* detectCycle(ListNode* head)', [
    ap("Floyd phase 2", 'O(n)', 'O(1)', 'n', 'Phase 1 finds a meeting point; moving one pointer from head and one from the meeting point at equal speed makes them meet at the cycle start (distance arithmetic).', `ListNode* detectCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            ListNode* start = head;
            while (start != slow) {
                start = start->next;
                slow = slow->next;
            }
            return start;
        }
    }
    return nullptr;
}`)], [[cyc([3, 2, 0, -4], 1)], [cyc([1, 2], 0)], [cyc([1], -1)], [cyc([1, 2, 3, 4, 5], 3)]], (o: any) => (o.pos >= 0 && o.list.length ? o.list.slice(o.pos) : []),
    ['First detect that a loop exists.', 'Reset one pointer to head, then move both one step at a time.'], 'The distance from head to the entry equals the distance from the meeting point to the entry (mod the cycle length).'),
  LL('Length of Loop in LL', 'loopLength', 'Return the number of nodes in the cycle (0 if none).', 'int loopLength(ListNode* head)', [
    ap('Floyd + count', 'O(n)', 'O(1)', 'n', 'Finding the meeting point is O(n); walking once around the cycle is at most n more steps.', `int loopLength(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            int count = 1;
            ListNode* temp = slow->next;
            while (temp != slow) {
                temp = temp->next;
                count++;
            }
            return count;
        }
    }
    return 0;
}`)], [[cyc([3, 2, 0, -4], 1)], [cyc([1, 2], 0)], [cyc([1], -1)], [cyc([1, 2, 3, 4, 5], 3)]], (o: any) => (o.pos >= 0 && o.list.length ? o.list.length - o.pos : 0),
    ['Once the pointers meet, they are inside the cycle.', 'Walk around once and count.'], 'Any node inside the cycle returns to itself after exactly one lap.'),
  LL('Delete the middle node of LL', 'deleteMiddle', 'Delete the middle node (index floor(n/2)) and return the head.', 'ListNode* deleteMiddle(ListNode* head)', [
    ap('Slow / fast with a head start', 'O(n)', 'O(1)', 'n', 'One pass with two pointers; slow stops just before the middle so we can unlink it.', `ListNode* deleteMiddle(ListNode* head) {
    if (head == nullptr || head->next == nullptr) {
        return nullptr;
    }
    ListNode* slow = head;
    ListNode* fast = head->next->next;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
    }
    slow->next = slow->next->next;
    return head;
}`)], [[[1, 2, 3, 4, 5]], [[1, 2, 3, 4]], [[1]], [[1, 2]], [[1, 2, 3]]], (a: number[]) => (a.length <= 1 ? [] : a.filter((_, i) => i !== Math.floor(a.length / 2))),
    ['To delete a node you need the node before it.', 'Give fast a head start of two nodes.'], 'Start fast ahead so slow lands one before the middle.'),
  LL('Remove Nth node from the back of the LL', 'removeNthFromEnd', 'Remove the n-th node from the end and return the head.', 'ListNode* removeNthFromEnd(ListNode* head, int n)', [
    ap('Two pointers n apart', 'O(L)', 'O(1)', 'n', 'Advance fast n steps, then move both until fast reaches the last node: one pass of L nodes. A dummy node handles removing the head.', `ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode* dummy = new ListNode(0, head);
    ListNode* fast = dummy;
    ListNode* slow = dummy;
    for (int i = 0; i < n; i++) {
        fast = fast->next;
    }
    while (fast->next != nullptr) {
        fast = fast->next;
        slow = slow->next;
    }
    slow->next = slow->next->next;
    return dummy->next;
}`)], [[[1, 2, 3, 4, 5], 2], [[1], 1], [[1, 2], 1], [[1, 2], 2], [[1, 2, 3], 3]], (a: number[], n: number) => a.filter((_, i) => i !== a.length - n),
    ['Counting from the back needs the length, or two pointers.', 'Keep a gap of n nodes between them.'], 'A fixed gap between two pointers turns "n from the end" into "when the front ends".'),
  LL('Segregate even and odd nodes in LL', 'oddEvenList', 'Group nodes at odd positions first, then even positions, keeping relative order.', 'ListNode* oddEvenList(ListNode* head)', [
    ap('Two chains', 'O(n)', 'O(1)', 'n', 'Each node is relinked once into the odd or even chain; the chains are joined at the end.', `ListNode* oddEvenList(ListNode* head) {
    if (head == nullptr || head->next == nullptr) {
        return head;
    }
    ListNode* odd = head;
    ListNode* even = head->next;
    ListNode* evenHead = even;
    while (even != nullptr && even->next != nullptr) {
        odd->next = even->next;
        odd = odd->next;
        even->next = odd->next;
        even = even->next;
    }
    odd->next = evenHead;
    return head;
}`)], [[[1, 2, 3, 4, 5]], [[2, 1, 3, 5, 6, 4, 7]], [[1]], [[1, 2]], []].filter(t => t.length), (a: number[]) => [...a.filter((_, i) => i % 2 === 0), ...a.filter((_, i) => i % 2 === 1)],
    ['Build two chains while walking.', 'Remember where the even chain starts.'], 'Splice nodes onto two tails, then attach the even chain after the odd one.'),
  LL('Check if LL is palindrome or not', 'isPalindrome', 'Return true if the list reads the same forwards and backwards.', 'bool isPalindrome(ListNode* head)', [
    ap('Reverse the second half', 'O(n)', 'O(1)', 'n', 'Find the middle (n/2 steps), reverse the second half (n/2), compare halves (n/2): linear time, constant extra space (the list is modified in place).', `bool isPalindrome(ListNode* head) {
    if (head == nullptr || head->next == nullptr) {
        return true;
    }
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast->next != nullptr && fast->next->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
    }
    ListNode* prev = nullptr;
    ListNode* curr = slow->next;
    while (curr != nullptr) {
        ListNode* nxt = curr->next;
        curr->next = prev;
        prev = curr;
        curr = nxt;
    }
    ListNode* first = head;
    ListNode* second = prev;
    while (second != nullptr) {
        if (first->val != second->val) {
            return false;
        }
        first = first->next;
        second = second->next;
    }
    return true;
}`)], [[[1, 2, 2, 1]], [[1, 2, 3, 2, 1]], [[1, 2]], [[1]], [[1, 2, 3]]], (a: number[]) => a.join(',') === [...a].reverse().join(','),
    ['Copying into an array works but uses O(n) space.', 'Reverse only the second half, then compare.'], 'Compare the first half with the reversed second half.'),
  LL('Add 2 numbers in LL', 'addTwoNumbers', 'Digits are stored in reverse order; return the sum as a list.', 'ListNode* addTwoNumbers(ListNode* l1, ListNode* l2)', [
    ap('Digit-by-digit with carry', 'O(max(m,n))', 'O(max(m,n))', 'n', 'Each digit position is processed once; the result list has up to max(m,n)+1 new nodes.', `ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
    ListNode* dummy = new ListNode(0);
    ListNode* tail = dummy;
    int carry = 0;
    while (l1 != nullptr || l2 != nullptr || carry != 0) {
        int sum = carry;
        if (l1 != nullptr) {
            sum += l1->val;
            l1 = l1->next;
        }
        if (l2 != nullptr) {
            sum += l2->val;
            l2 = l2->next;
        }
        tail->next = new ListNode(sum % 10);
        tail = tail->next;
        carry = sum / 10;
    }
    return dummy->next;
}`)], [[[2, 4, 3], [5, 6, 4]], [[0], [0]], [[9, 9, 9], [1]], [[1, 8], [0]], [[5], [5]]], (x: number[], y: number[]) => {
      const out: number[] = []; let c = 0; for (let i = 0; i < Math.max(x.length, y.length) || c; i++) { const s = (x[i] ?? 0) + (y[i] ?? 0) + c; out.push(s % 10); c = Math.floor(s / 10); } return out;
    }, ['Add like on paper, least significant digit first.', 'Do not forget a final carry.'], 'Reverse-order digits make the head the ones place, so you can add as you walk.'),
  LL('Merge two sorted Linked Lists', 'mergeTwoLists', 'Merge two sorted lists into one sorted list.', 'ListNode* mergeTwoLists(ListNode* a, ListNode* b)', [
    ap('Dummy head + tail pointer', 'O(m+n)', 'O(1)', 'n', 'Each step splices one existing node, so m+n steps total; no new nodes except the dummy.', MERGE.replace('mergeLists', 'mergeTwoLists'))],
    [[[1, 2, 4], [1, 3, 4]], [[], []], [[], [0]], [[5], [1, 2, 3]], [[1, 1], [1]]], (a: number[], b: number[]) => [...a, ...b].sort((x, y) => x - y),
    ['Compare the two heads and take the smaller.', 'A dummy node avoids special-casing the first node.'], 'Like the merge step of merge sort, done by relinking.'),
  LL('Sort LL', 'sortList', 'Sort a linked list in O(n log n).', 'ListNode* sortList(ListNode* head)', [
    ap('Merge sort on a list', 'O(n log n)', 'O(log n)', 'nlogn', 'Splitting at the middle halves the list log n times; each level merges n nodes. Recursion depth is log n (no array copies needed).', `${MERGE}

ListNode* sortList(ListNode* head) {
    if (head == nullptr || head->next == nullptr) {
        return head;
    }
    ListNode* slow = head;
    ListNode* fast = head->next;
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
    }
    ListNode* second = slow->next;
    slow->next = nullptr;
    return mergeLists(sortList(head), sortList(second));
}`)], [[[4, 2, 1, 3]], [[5, 1, 4]], [[1]], [[]], [[3, 3, 1]]], (a: number[]) => [...a].sort((x, y) => x - y),
    ['Arrays can be sorted by index; lists cannot.', 'Split with slow/fast, sort halves, merge.'], 'Merge sort suits linked lists because merging only relinks pointers.'),

  // ---------------- Trees ----------------
  mk('Height of a Binary Tree', 'maxDepth', 'Return the height (number of nodes on the longest root-to-leaf path).', 'int maxDepth(TreeNode* root)', 'return 0;', [
    ap('Recursion', 'O(n)', 'O(h)', 'n', 'Every node is visited once. The recursion stack is as deep as the tree height h (n in a skewed tree, log n if balanced).', `int maxDepth(TreeNode* root) {
    if (root == nullptr) {
        return 0;
    }
    int left = maxDepth(root->left);
    int right = maxDepth(root->right);
    return 1 + max(left, right);
}`)], [[[3, 9, 20, null, null, 15, 7]], [[1, null, 2]], [[]], [[1]], [[1, 2, 3, 4, 5]]], (a: any) => height(mkTree(a)),
    ['The height of a node is 1 + the taller child.', 'An empty tree has height 0.'], 'Solve the same question for each subtree and combine.'),
  mk('Inorder Traversal', 'inorderTraversal', 'Return the inorder (left, node, right) traversal.', 'vector<int> inorderTraversal(TreeNode* root)', 'return {};', [
    ap('Recursive DFS', 'O(n)', 'O(h)', 'n', 'Each node is visited once; the stack holds h frames.', `void inorder(TreeNode* node, vector<int>& result) {
    if (node == nullptr) {
        return;
    }
    inorder(node->left, result);
    result.push_back(node->val);
    inorder(node->right, result);
}

vector<int> inorderTraversal(TreeNode* root) {
    vector<int> result;
    inorder(root, result);
    return result;
}`)], [[[1, null, 2, 3]], [[]], [[1]], [[4, 2, 6, 1, 3, 5, 7]]], (a: any) => inorder(mkTree(a)),
    ['Visit left subtree, then the node, then right subtree.'], 'For a BST this order is sorted.'),
  mk('Preorder Traversal', 'preorderTraversal', 'Return the preorder (node, left, right) traversal.', 'vector<int> preorderTraversal(TreeNode* root)', 'return {};', [
    ap('Recursive DFS', 'O(n)', 'O(h)', 'n', 'One visit per node; recursion depth h.', `void preorder(TreeNode* node, vector<int>& result) {
    if (node == nullptr) {
        return;
    }
    result.push_back(node->val);
    preorder(node->left, result);
    preorder(node->right, result);
}

vector<int> preorderTraversal(TreeNode* root) {
    vector<int> result;
    preorder(root, result);
    return result;
}`)], [[[1, null, 2, 3]], [[]], [[1]], [[4, 2, 6, 1, 3, 5, 7]]], (a: any) => { const o: number[] = []; const g = (r: RT | null) => { if (r) { o.push(r.val); g(r.left); g(r.right); } }; g(mkTree(a)); return o; },
    ['Record the node before exploring children.'], 'Preorder copies a tree: parents come before children.'),
  mk('Postorder Traversal', 'postorderTraversal', 'Return the postorder (left, right, node) traversal.', 'vector<int> postorderTraversal(TreeNode* root)', 'return {};', [
    ap('Recursive DFS', 'O(n)', 'O(h)', 'n', 'One visit per node; recursion depth h.', `void postorder(TreeNode* node, vector<int>& result) {
    if (node == nullptr) {
        return;
    }
    postorder(node->left, result);
    postorder(node->right, result);
    result.push_back(node->val);
}

vector<int> postorderTraversal(TreeNode* root) {
    vector<int> result;
    postorder(root, result);
    return result;
}`)], [[[1, null, 2, 3]], [[]], [[1]], [[4, 2, 6, 1, 3, 5, 7]]], (a: any) => { const o: number[] = []; const g = (r: RT | null) => { if (r) { g(r.left); g(r.right); o.push(r.val); } }; g(mkTree(a)); return o; },
    ['Children first, node last.'], 'Postorder deletes a tree safely: children go before parents.'),
  mk('Level Order Traversal', 'levelOrder', 'Return node values level by level.', 'vector<vector<int>> levelOrder(TreeNode* root)', 'return {};', [
    ap('BFS with a queue', 'O(n)', 'O(w)', 'n', 'Each node is enqueued and dequeued once; the queue holds at most one level (width w).', `vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> result;
    if (root == nullptr) {
        return result;
    }
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int size = q.size();
        vector<int> level;
        for (int i = 0; i < size; i++) {
            TreeNode* node = q.front();
            q.pop();
            level.push_back(node->val);
            if (node->left != nullptr) {
                q.push(node->left);
            }
            if (node->right != nullptr) {
                q.push(node->right);
            }
        }
        result.push_back(level);
    }
    return result;
}`)], [[[3, 9, 20, null, null, 15, 7]], [[1]], [[]], [[1, 2, 3, 4, 5]]], (a: any) => levels(mkTree(a)),
    ['Use a queue; process exactly the nodes that were in it at the start of the level.'], 'A queue visits nodes in order of distance from the root.'),
  mk('Iterative Inorder Traversal', 'inorderTraversal', 'Inorder traversal without recursion.', 'vector<int> inorderTraversal(TreeNode* root)', 'return {};', [
    ap('Explicit stack', 'O(n)', 'O(h)', 'n', 'Each node is pushed and popped once; the stack mimics the recursion stack (height h).', `vector<int> inorderTraversal(TreeNode* root) {
    vector<int> result;
    stack<TreeNode*> st;
    TreeNode* curr = root;
    while (curr != nullptr || !st.empty()) {
        while (curr != nullptr) {
            st.push(curr);
            curr = curr->left;
        }
        curr = st.top();
        st.pop();
        result.push_back(curr->val);
        curr = curr->right;
    }
    return result;
}`)], [[[1, null, 2, 3]], [[1]], [[]], [[4, 2, 6, 1, 3, 5, 7]]], (a: any) => inorder(mkTree(a)),
    ['Go as far left as possible, pushing nodes.', 'Pop, visit, then move to the right child.'], 'The stack remembers the ancestors still waiting for their turn.'),
  mk('Check if the Binary Tree is Height-Balanced', 'isBalanced', 'Return true if every node has subtrees whose heights differ by at most 1.', 'bool isBalanced(TreeNode* root)', 'return false;', [
    ap('Height with early exit', 'O(n)', 'O(h)', 'n', 'One post-order pass computes heights and aborts with -1 on the first imbalance; naive re-computation would be O(n²).', `int check(TreeNode* node) {
    if (node == nullptr) {
        return 0;
    }
    int l = check(node->left);
    if (l == -1) {
        return -1;
    }
    int r = check(node->right);
    if (r == -1) {
        return -1;
    }
    if (abs(l - r) > 1) {
        return -1;
    }
    return 1 + max(l, r);
}

bool isBalanced(TreeNode* root) {
    return check(root) != -1;
}`)], [[[3, 9, 20, null, null, 15, 7]], [[1, 2, 2, 3, 3, null, null, 4, 4]], [[]], [[1, 2, null, 3]]], (a: any) => { const ok = (r: RT | null): boolean => !r || (ok(r.left) && ok(r.right) && Math.abs(height(r.left) - height(r.right)) <= 1); return ok(mkTree(a)); },
    ['Compute heights bottom-up.', 'Return a sentinel (-1) as soon as a subtree is unbalanced.'], 'Combine the height computation with the balance check in one pass.'),
  mk('Diameter of Binary Tree', 'diameterOfBinaryTree', 'Return the length (in edges) of the longest path between any two nodes.', 'int diameterOfBinaryTree(TreeNode* root)', 'return 0;', [
    ap('Height + best path', 'O(n)', 'O(h)', 'n', 'At each node the longest path through it is leftHeight + rightHeight; we track the maximum while computing heights once.', `int depth(TreeNode* node, int& best) {
    if (node == nullptr) {
        return 0;
    }
    int l = depth(node->left, best);
    int r = depth(node->right, best);
    best = max(best, l + r);
    return 1 + max(l, r);
}

int diameterOfBinaryTree(TreeNode* root) {
    int best = 0;
    depth(root, best);
    return best;
}`)], [[[1, 2, 3, 4, 5]], [[1, 2]], [[1]], [[1, 2, 3, 4, null, null, 5, 6]]], (a: any) => { let b = 0; const d = (r: RT | null): number => { if (!r) return 0; const l = d(r.left), rr = d(r.right); b = Math.max(b, l + rr); return 1 + Math.max(l, rr); }; d(mkTree(a)); return b; },
    ['The longest path may not pass through the root.', 'At every node, try leftHeight + rightHeight.'], 'Every path has a highest node; check each node as that top.'),
  mk('Check if two trees are identical', 'isSameTree', 'Return true if the two trees have the same structure and values.', 'bool isSameTree(TreeNode* p, TreeNode* q)', 'return false;', [
    ap('Parallel recursion', 'O(n)', 'O(h)', 'n', 'Each pair of nodes is compared once; recursion depth is the smaller height.', `bool isSameTree(TreeNode* p, TreeNode* q) {
    if (p == nullptr && q == nullptr) {
        return true;
    }
    if (p == nullptr || q == nullptr) {
        return false;
    }
    if (p->val != q->val) {
        return false;
    }
    return isSameTree(p->left, q->left) && isSameTree(p->right, q->right);
}`)], [[[1, 2, 3], [1, 2, 3]], [[1, 2], [1, null, 2]], [[], []], [[1, 2, 1], [1, 1, 2]]], (a: any, b: any) => JSON.stringify(treeArr(mkTree(a))) === JSON.stringify(treeArr(mkTree(b))),
    ['Walk both trees at the same time.', 'Handle null/null and null/non-null first.'], 'Two trees are equal if roots match and both subtree pairs are equal.'),
  mk('Symmetric Binary Tree', 'isSymmetric', 'Return true if the tree is a mirror of itself.', 'bool isSymmetric(TreeNode* root)', 'return false;', [
    ap('Mirror recursion', 'O(n)', 'O(h)', 'n', 'Each node is compared once with its mirror twin.', `bool mirror(TreeNode* a, TreeNode* b) {
    if (a == nullptr && b == nullptr) {
        return true;
    }
    if (a == nullptr || b == nullptr) {
        return false;
    }
    return a->val == b->val && mirror(a->left, b->right) && mirror(a->right, b->left);
}

bool isSymmetric(TreeNode* root) {
    if (root == nullptr) {
        return true;
    }
    return mirror(root->left, root->right);
}`)], [[[1, 2, 2, 3, 4, 4, 3]], [[1, 2, 2, null, 3, null, 3]], [[1]], [[]]], (a: any) => { const m = (x: RT | null, y: RT | null): boolean => (!x && !y) || (!!x && !!y && x.val === y.val && m(x.left, y.right) && m(x.right, y.left)); const r = mkTree(a); return !r || m(r.left, r.right); },
    ['Compare left subtree with right subtree, crossing over.'], 'Left-of-left must match right-of-right.'),
  mk('Maximum Path Sum', 'maxPathSum', 'Return the maximum sum of any path in the tree (path = connected nodes, at least one).', 'int maxPathSum(TreeNode* root)', 'return 0;', [
    ap('Gain recursion', 'O(n)', 'O(h)', 'n', 'Each node computes its best downward gain once and updates a global best; negative gains are dropped with max(0, ·).', `int gain(TreeNode* node, int& best) {
    if (node == nullptr) {
        return 0;
    }
    int l = max(0, gain(node->left, best));
    int r = max(0, gain(node->right, best));
    best = max(best, node->val + l + r);
    return node->val + max(l, r);
}

int maxPathSum(TreeNode* root) {
    int best = INT_MIN;
    gain(root, best);
    return best;
}`)], [[[1, 2, 3]], [[-10, 9, 20, null, null, 15, 7]], [[-3]], [[2, -1]]], (a: any) => { let b = -Infinity; const g = (r: RT | null): number => { if (!r) return 0; const l = Math.max(0, g(r.left)), rr = Math.max(0, g(r.right)); b = Math.max(b, r.val + l + rr); return r.val + Math.max(l, rr); }; g(mkTree(a)); return b; },
    ['A path bends at most once (at its top node).', 'Ignore a subtree if its gain is negative.'], 'Return the best one-sided gain upward; use both sides only for the answer at that node.'),
  mk('Zig Zag Traversal', 'zigzagLevelOrder', 'Level order, alternating left-to-right and right-to-left.', 'vector<vector<int>> zigzagLevelOrder(TreeNode* root)', 'return {};', [
    ap('BFS + reverse alternate levels', 'O(n)', 'O(w)', 'n', 'BFS is linear; reversing a level costs its size, so the total stays O(n).', `vector<vector<int>> zigzagLevelOrder(TreeNode* root) {
    vector<vector<int>> result;
    if (root == nullptr) {
        return result;
    }
    queue<TreeNode*> q;
    q.push(root);
    bool leftToRight = true;
    while (!q.empty()) {
        int size = q.size();
        vector<int> level;
        for (int i = 0; i < size; i++) {
            TreeNode* node = q.front();
            q.pop();
            level.push_back(node->val);
            if (node->left != nullptr) {
                q.push(node->left);
            }
            if (node->right != nullptr) {
                q.push(node->right);
            }
        }
        if (!leftToRight) {
            reverse(level.begin(), level.end());
        }
        result.push_back(level);
        leftToRight = !leftToRight;
    }
    return result;
}`)], [[[3, 9, 20, null, null, 15, 7]], [[1, 2, 3, 4, 5, 6, 7]], [[1]], [[]]], (a: any) => levels(mkTree(a)).map((l, i) => (i % 2 ? [...l].reverse() : l)),
    ['Do a normal level order.', 'Reverse every second level.'], 'Zig-zag is just level order with alternate reversal.'),
  mk('Right/Left View of Binary Tree', 'rightSideView', 'Return the values visible from the right side.', 'vector<int> rightSideView(TreeNode* root)', 'return {};', [
    ap('Level order, keep last', 'O(n)', 'O(w)', 'n', 'BFS visits every node once; the last node of each level is the visible one.', `vector<int> rightSideView(TreeNode* root) {
    vector<int> view;
    if (root == nullptr) {
        return view;
    }
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            TreeNode* node = q.front();
            q.pop();
            if (i == size - 1) {
                view.push_back(node->val);
            }
            if (node->left != nullptr) {
                q.push(node->left);
            }
            if (node->right != nullptr) {
                q.push(node->right);
            }
        }
    }
    return view;
}`)], [[[1, 2, 3, null, 5, null, 4]], [[1, null, 3]], [[]], [[1, 2, 3, 4]]], (a: any) => levels(mkTree(a)).map(l => l[l.length - 1]),
    ['From the right you see the last node of every level.'], 'One node per level: the rightmost.'),

  // ---------------- BST ----------------
  mk('Search in a BST', 'searchBST', 'Return the subtree rooted at the node with value val (empty if absent).', 'TreeNode* searchBST(TreeNode* root, int val)', 'return nullptr;', [
    ap('Walk down comparing', 'O(h)', 'O(1)', 'logn', 'Each comparison discards one subtree, so at most h steps: log n if balanced, n if skewed.', `TreeNode* searchBST(TreeNode* root, int val) {
    TreeNode* curr = root;
    while (curr != nullptr && curr->val != val) {
        if (val < curr->val) {
            curr = curr->left;
        } else {
            curr = curr->right;
        }
    }
    return curr;
}`)], [[[4, 2, 7, 1, 3], 2], [[4, 2, 7, 1, 3], 5], [[4, 2, 7, 1, 3], 4], [[1], 1]], (a: any, v: number) => { let c = mkTree(a); while (c && c.val !== v) c = v < c.val ? c.left : c.right; return treeArr(c); },
    ['Smaller values are on the left, larger on the right.'], 'The BST property lets you throw away half the tree each step.'),
  mk('Insert a given Node in BST', 'insertIntoBST', 'Insert val into the BST and return the root.', 'TreeNode* insertIntoBST(TreeNode* root, int val)', 'return nullptr;', [
    ap('Recursive insert', 'O(h)', 'O(h)', 'logn', 'One root-to-leaf walk; the recursion stack is h deep.', `TreeNode* insertIntoBST(TreeNode* root, int val) {
    if (root == nullptr) {
        return new TreeNode(val);
    }
    if (val < root->val) {
        root->left = insertIntoBST(root->left, val);
    } else {
        root->right = insertIntoBST(root->right, val);
    }
    return root;
}`)], [[[4, 2, 7, 1, 3], 5], [[], 3], [[2, 1], 3], [[5, 3, 8], 1]], (a: any, v: number) => treeArr(bstInsert(mkTree(a), v)),
    ['Find the empty spot where val belongs.', 'Reattach the (possibly new) child after recursing.'], 'A new node always becomes a leaf.'),
  mk('Check if a tree is BST or BT', 'isValidBST', 'Return true if the tree is a valid binary search tree.', 'bool isValidBST(TreeNode* root)', 'return false;', [
    ap('Range narrowing', 'O(n)', 'O(h)', 'n', 'Each node is checked once against the (low, high) bounds inherited from its ancestors.', `bool valid(TreeNode* node, long long low, long long high) {
    if (node == nullptr) {
        return true;
    }
    if (node->val <= low || node->val >= high) {
        return false;
    }
    return valid(node->left, low, node->val) && valid(node->right, node->val, high);
}

bool isValidBST(TreeNode* root) {
    return valid(root, -4000000000, 4000000000);
}`)], [[[2, 1, 3]], [[5, 1, 4, null, null, 3, 6]], [[]], [[5, 4, 6, null, null, 3, 7]], [[1, 1]]], (a: any) => { const v = (r: RT | null, lo: number, hi: number): boolean => !r || (r.val > lo && r.val < hi && v(r.left, lo, r.val) && v(r.right, r.val, hi)); return v(mkTree(a), -Infinity, Infinity); },
    ['Checking only parent vs child is not enough.', 'Pass down the allowed range.'], 'Every node must lie strictly between the values of its ancestors on each side.'),
  mk('Find K-th smallest/largest element in BST', 'kthSmallest', 'Return the k-th smallest value in the BST (1-indexed).', 'int kthSmallest(TreeNode* root, int k)', 'return 0;', [
    ap('Iterative inorder, stop at k', 'O(h + k)', 'O(h)', 'n', 'Inorder visits values in sorted order, so we stop after k pops; the stack holds at most h nodes.', `int kthSmallest(TreeNode* root, int k) {
    stack<TreeNode*> st;
    TreeNode* curr = root;
    while (curr != nullptr || !st.empty()) {
        while (curr != nullptr) {
            st.push(curr);
            curr = curr->left;
        }
        curr = st.top();
        st.pop();
        k--;
        if (k == 0) {
            return curr->val;
        }
        curr = curr->right;
    }
    return -1;
}`)], [[[3, 1, 4, null, 2], 1], [[5, 3, 6, 2, 4, null, null, 1], 3], [[2, 1, 3], 3], [[1], 1]], (a: any, k: number) => inorder(mkTree(a))[k - 1],
    ['Inorder of a BST is sorted.', 'Count while popping.'], 'Stop the sorted traversal after k items.'),
  mk('Ceil in a BST', 'ceilInBST', 'Return the smallest value >= key in the BST, or -1.', 'int ceilInBST(TreeNode* root, int key)', 'return -1;', [
    ap('Walk down remembering candidates', 'O(h)', 'O(1)', 'logn', 'One root-to-leaf path; each node is either a candidate or sends us toward a closer one.', `int ceilInBST(TreeNode* root, int key) {
    int ceil = -1;
    TreeNode* curr = root;
    while (curr != nullptr) {
        if (curr->val == key) {
            return key;
        }
        if (key < curr->val) {
            ceil = curr->val;
            curr = curr->left;
        } else {
            curr = curr->right;
        }
    }
    return ceil;
}`)], [[[8, 4, 12, 2, 6, 10, 14], 5], [[8, 4, 12, 2, 6, 10, 14], 8], [[8, 4, 12, 2, 6, 10, 14], 15], [[8, 4, 12], 1]], (a: any, k: number) => { const v = inorder(mkTree(a)).filter(x => x >= k); return v.length ? v[0] : -1; },
    ['When curr->val > key it is a candidate; look for something smaller.'], 'Each time you go left you found a valid but maybe not tightest answer.'),
  mk('Floor in a BST', 'floorInBST', 'Return the largest value <= key in the BST, or -1.', 'int floorInBST(TreeNode* root, int key)', 'return -1;', [
    ap('Walk down remembering candidates', 'O(h)', 'O(1)', 'logn', 'One root-to-leaf path.', `int floorInBST(TreeNode* root, int key) {
    int floor = -1;
    TreeNode* curr = root;
    while (curr != nullptr) {
        if (curr->val == key) {
            return key;
        }
        if (key > curr->val) {
            floor = curr->val;
            curr = curr->right;
        } else {
            curr = curr->left;
        }
    }
    return floor;
}`)], [[[8, 4, 12, 2, 6, 10, 14], 5], [[8, 4, 12, 2, 6, 10, 14], 8], [[8, 4, 12, 2, 6, 10, 14], 1], [[8, 4, 12], 100]], (a: any, k: number) => { const v = inorder(mkTree(a)).filter(x => x <= k); return v.length ? v[v.length - 1] : -1; },
    ['Mirror image of ceil.'], 'Going right means the current node is a valid, possibly improvable, answer.'),
  mk('Lowest Common Ancestor in BST', 'lowestCommonAncestor', 'Return the lowest common ancestor of values p and q (the result shows that subtree).', 'TreeNode* lowestCommonAncestor(TreeNode* root, int p, int q)', 'return nullptr;', [
    ap('Split point', 'O(h)', 'O(1)', 'logn', 'Walk down until p and q fall on different sides: at most h steps.', `TreeNode* lowestCommonAncestor(TreeNode* root, int p, int q) {
    TreeNode* curr = root;
    while (curr != nullptr) {
        if (p < curr->val && q < curr->val) {
            curr = curr->left;
        } else if (p > curr->val && q > curr->val) {
            curr = curr->right;
        } else {
            return curr;
        }
    }
    return nullptr;
}`)], [[[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 8], [[6, 2, 8, 0, 4, 7, 9, null, null, 3, 5], 2, 4], [[2, 1], 2, 1]], (a: any, p: number, q: number) => { let c = mkTree(a); while (c) { if (p < c.val && q < c.val) c = c.left; else if (p > c.val && q > c.val) c = c.right; else break; } return treeArr(c); },
    ['If both values are smaller, go left; both larger, go right.'], 'The LCA is the first node that separates p and q.'),
  mk('Construct a BST from a preorder traversal', 'bstFromPreorder', 'Build the BST from its preorder traversal.', 'TreeNode* bstFromPreorder(vector<int>& preorder)', 'return nullptr;', [
    ap('Bounded recursion', 'O(n)', 'O(h)', 'n', 'Each value is consumed exactly once; the bound tells when a subtree ends.', `TreeNode* build(vector<int>& pre, int& i, int bound) {
    if (i == pre.size() || pre[i] > bound) {
        return nullptr;
    }
    TreeNode* root = new TreeNode(pre[i]);
    i++;
    root->left = build(pre, i, root->val);
    root->right = build(pre, i, bound);
    return root;
}

TreeNode* bstFromPreorder(vector<int>& preorder) {
    int i = 0;
    return build(preorder, i, 2147483647);
}`)], [[[8, 5, 1, 7, 10, 12]], [[1, 3]], [[5]], [[10, 5, 2, 7, 15]]], (pre: number[]) => { let r: RT | null = null; for (const v of pre) r = bstInsert(r, v); return treeArr(r); },
    ['The first value is the root.', 'Values smaller than the root form the left subtree.'], 'Preorder plus an upper bound lets one pass rebuild the tree.'),
];
