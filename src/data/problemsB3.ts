// Batch 3: Step 9 stacks/queues, Step 10 sliding window, Step 11 heaps, Step 12 greedy.
import { Playable, ap, mk } from './kit';

const sortNum = (a: number[]) => [...a].sort((x, y) => x - y);

// ---------- reference helpers: expression trees for the notation conversions ----------
type Ex = { op: string; l: Ex; r: Ex } | { v: string };
const parseInfix = (s: string): Ex => {
  let i = 0;
  const base = (): Ex => { const c = s[i++]; if (c === '(') { const e = expr(); i++; return e; } return { v: c }; };
  const pow = (): Ex => { const b = base(); if (s[i] === '^') { i++; return { op: '^', l: b, r: pow() }; } return b; };
  const term = (): Ex => { let l = pow(); while (s[i] === '*' || s[i] === '/') { const op = s[i++]; l = { op, l, r: pow() }; } return l; };
  const expr = (): Ex => { let l = term(); while (s[i] === '+' || s[i] === '-') { const op = s[i++]; l = { op, l, r: term() }; } return l; };
  return expr();
};
const parsePrefix = (s: string): Ex => { let i = 0; const go = (): Ex => { const c = s[i++]; if ('+-*/^'.includes(c)) { const l = go(); const r = go(); return { op: c, l, r }; } return { v: c }; }; return go(); };
const parsePostfix = (s: string): Ex => { const st: Ex[] = []; for (const c of s) { if ('+-*/^'.includes(c)) { const r = st.pop()!, l = st.pop()!; st.push({ op: c, l, r }); } else st.push({ v: c }); } return st[0]; };
const toPost = (e: Ex): string => ('v' in e ? e.v : toPost(e.l) + toPost(e.r) + e.op);
const toPre = (e: Ex): string => ('v' in e ? e.v : e.op + toPre(e.l) + toPre(e.r));
const toIn = (e: Ex): string => ('v' in e ? e.v : `(${toIn(e.l)}${e.op}${toIn(e.r)})`);

const PREC = `int prec(char c) {
    if (c == '^') {
        return 3;
    }
    if (c == '*' || c == '/') {
        return 2;
    }
    if (c == '+' || c == '-') {
        return 1;
    }
    return 0;
}`;
const INFIX = ['A+B*C', '(A+B)*C', 'A-B-C', 'A^B^C', 'A*(B+C)/D', 'A+B', 'X'];

// ---------- reference queue/stack machines (ops: 1 add, 2 remove, 3 peek, 4 size, 5 min) ----------
const refStack = (ops: number[][]) => { const s: number[] = [], out: number[] = []; for (const o of ops) { if (o[0] === 1) s.push(o[1]); else if (o[0] === 2) out.push(s.length ? s.pop()! : -1); else if (o[0] === 3) out.push(s.length ? s[s.length - 1] : -1); else if (o[0] === 4) out.push(s.length); else if (o[0] === 5) out.push(s.length ? Math.min(...s) : -1); } return out; };
const refQueue = (ops: number[][]) => { const q: number[] = [], out: number[] = []; for (const o of ops) { if (o[0] === 1) q.push(o[1]); else if (o[0] === 2) out.push(q.length ? q.shift()! : -1); else if (o[0] === 3) out.push(q.length ? q[0] : -1); else if (o[0] === 4) out.push(q.length); } return out; };
const STACK_OPS: number[][][] = [[[1, 5], [1, 7], [3], [2], [4], [2], [2], [3]], [[1, 1], [2], [2]], [[4]], [[1, 9], [1, 8], [1, 7], [2], [3], [4]]];
const QUEUE_OPS: number[][][] = [[[1, 5], [1, 7], [3], [2], [4], [2], [2], [3]], [[1, 1], [2], [2]], [[4]], [[1, 1], [1, 2], [1, 3], [2], [1, 4], [1, 5], [3], [4]]];
const MIN_OPS: number[][][] = [[[1, 5], [1, 3], [5], [1, 7], [5], [2], [2], [5], [3]], [[1, 2], [1, 2], [5], [2], [5]], [[5]], [[1, 4], [1, 1], [1, 6], [5], [2], [2], [5]]];

const dllLRU = `class_placeholder`; void dllLRU;

export const B3_PROBLEMS: Playable[] = [
  // ---------- Step 9: learning ----------
  mk('Implement Stack using Arrays', 'stackOperations', 'Run the operations on an array-based stack: [1,x] push, [2] pop (-1 if empty), [3] top (-1 if empty), [4] size. Return the outputs of ops 2, 3 and 4.', 'vector<int> stackOperations(vector<vector<int>>& ops)', 'return {};', [
    ap('Array + top index', 'O(1) per operation', 'O(capacity)', '1', 'push, pop, top and size each touch one array cell and one integer.', `vector<int> stackOperations(vector<vector<int>>& ops) {
    vector<int> data(100, 0);
    int top = -1;
    vector<int> out;
    for (int i = 0; i < ops.size(); i++) {
        int type = ops[i][0];
        if (type == 1) {
            top++;
            data[top] = ops[i][1];
        } else if (type == 2) {
            if (top < 0) {
                out.push_back(-1);
            } else {
                out.push_back(data[top]);
                top--;
            }
        } else if (type == 3) {
            if (top < 0) {
                out.push_back(-1);
            } else {
                out.push_back(data[top]);
            }
        } else if (type == 4) {
            out.push_back(top + 1);
        }
    }
    return out;
}`)], STACK_OPS.map(o => [o]), refStack, ['top is the index of the last element; -1 means empty.'], 'A stack is an array plus an index that moves up and down.'),
  mk('Implement Queue using Arrays', 'queueOperations', 'Run the operations on a circular array queue of capacity 4: [1,x] enqueue, [2] dequeue (-1 if empty), [3] front (-1 if empty), [4] size. (The tests never exceed the capacity.) Return outputs of ops 2, 3, 4.', 'vector<int> queueOperations(vector<vector<int>>& ops)', 'return {};', [
    ap('Circular buffer', 'O(1) per operation', 'O(capacity)', '1', 'front and rear indices wrap around with % capacity, so no elements are ever shifted.', `vector<int> queueOperations(vector<vector<int>>& ops) {
    int capacity = 4;
    vector<int> data(capacity, 0);
    int front = 0;
    int count = 0;
    vector<int> out;
    for (int i = 0; i < ops.size(); i++) {
        int type = ops[i][0];
        if (type == 1) {
            int rear = (front + count) % capacity;
            data[rear] = ops[i][1];
            count++;
        } else if (type == 2) {
            if (count == 0) {
                out.push_back(-1);
            } else {
                out.push_back(data[front]);
                front = (front + 1) % capacity;
                count--;
            }
        } else if (type == 3) {
            if (count == 0) {
                out.push_back(-1);
            } else {
                out.push_back(data[front]);
            }
        } else if (type == 4) {
            out.push_back(count);
        }
    }
    return out;
}`)], QUEUE_OPS.map(o => [o]), refQueue, ['Use (front + count) % capacity as the rear slot.'], 'A circular buffer reuses freed slots, so enqueue and dequeue are both O(1).'),
  mk('Implement Stack using Queue', 'stackViaQueue', 'Implement a stack with one queue: ops [1,x] push, [2] pop (-1 if empty), [3] top, [4] size. Return outputs of ops 2, 3, 4.', 'vector<int> stackViaQueue(vector<vector<int>>& ops)', 'return {};', [
    ap('One queue, rotate on push', 'push O(n), others O(1)', 'O(n)', 'n', 'After pushing x, the older n-1 elements are rotated behind it so the newest element is always at the front: push costs n-1 moves; pop/top are O(1).', `vector<int> stackViaQueue(vector<vector<int>>& ops) {
    queue<int> q;
    vector<int> out;
    for (int i = 0; i < ops.size(); i++) {
        int type = ops[i][0];
        if (type == 1) {
            q.push(ops[i][1]);
            for (int k = 0; k < (int)q.size() - 1; k++) {
                q.push(q.front());
                q.pop();
            }
        } else if (type == 2) {
            if (q.empty()) {
                out.push_back(-1);
            } else {
                out.push_back(q.front());
                q.pop();
            }
        } else if (type == 3) {
            out.push_back(q.empty() ? -1 : q.front());
        } else if (type == 4) {
            out.push_back(q.size());
        }
    }
    return out;
}`)], STACK_OPS.map(o => [o]), refStack, ['After a push, make the new element the front.'], 'Rotating the queue after each push reverses its order into stack order.'),
  mk('Implement Queue using Stack', 'queueViaStacks', 'Implement a queue with two stacks: ops [1,x] enqueue, [2] dequeue (-1 if empty), [3] front, [4] size. Return outputs of ops 2, 3, 4.', 'vector<int> queueViaStacks(vector<vector<int>>& ops)', 'return {};', [
    ap('Two stacks (amortised O(1))', 'O(1) amortised', 'O(n)', '1', 'Each element is moved from the input stack to the output stack at most once, so n operations cost O(n) in total.', `vector<int> queueViaStacks(vector<vector<int>>& ops) {
    stack<int> in;
    stack<int> outStack;
    vector<int> out;
    for (int i = 0; i < ops.size(); i++) {
        int type = ops[i][0];
        if (type == 1) {
            in.push(ops[i][1]);
        } else if (type == 2 || type == 3) {
            if (outStack.empty()) {
                while (!in.empty()) {
                    outStack.push(in.top());
                    in.pop();
                }
            }
            if (outStack.empty()) {
                out.push_back(-1);
            } else {
                out.push_back(outStack.top());
                if (type == 2) {
                    outStack.pop();
                }
            }
        } else if (type == 4) {
            out.push_back(in.size() + outStack.size());
        }
    }
    return out;
}`)], QUEUE_OPS.map(o => [o]), refQueue, ['Pour the input stack into the output stack only when the output stack is empty.'], 'Reversing a stack twice restores FIFO order.'),
  mk('Implement Stack using Linked List', 'stackLinkedList', 'Linked-list stack: ops [1,x] push, [2] pop (-1 if empty), [3] top, [4] size. Return outputs of ops 2, 3, 4.', 'vector<int> stackLinkedList(vector<vector<int>>& ops)', 'return {};', [
    ap('Push/pop at the head', 'O(1) per operation', 'O(n)', '1', 'The head is the top: pushing and popping only change the head pointer.', `vector<int> stackLinkedList(vector<vector<int>>& ops) {
    ListNode* top = nullptr;
    int size = 0;
    vector<int> out;
    for (int i = 0; i < ops.size(); i++) {
        int type = ops[i][0];
        if (type == 1) {
            ListNode* node = new ListNode(ops[i][1]);
            node->next = top;
            top = node;
            size++;
        } else if (type == 2) {
            if (top == nullptr) {
                out.push_back(-1);
            } else {
                out.push_back(top->val);
                top = top->next;
                size--;
            }
        } else if (type == 3) {
            out.push_back(top == nullptr ? -1 : top->val);
        } else if (type == 4) {
            out.push_back(size);
        }
    }
    return out;
}`)], STACK_OPS.map(o => [o]), refStack, ['The top of the stack is the head of the list.'], 'A linked list at its head is already a stack.'),
  mk('Implement Queue using Linked List', 'queueLinkedList', 'Linked-list queue: ops [1,x] enqueue, [2] dequeue (-1 if empty), [3] front, [4] size. Return outputs of ops 2, 3, 4.', 'vector<int> queueLinkedList(vector<vector<int>>& ops)', 'return {};', [
    ap('Head and tail pointers', 'O(1) per operation', 'O(n)', '1', 'Enqueue appends at the tail, dequeue removes at the head: both O(1) because both ends are tracked.', `vector<int> queueLinkedList(vector<vector<int>>& ops) {
    ListNode* head = nullptr;
    ListNode* tail = nullptr;
    int size = 0;
    vector<int> out;
    for (int i = 0; i < ops.size(); i++) {
        int type = ops[i][0];
        if (type == 1) {
            ListNode* node = new ListNode(ops[i][1]);
            if (tail == nullptr) {
                head = node;
            } else {
                tail->next = node;
            }
            tail = node;
            size++;
        } else if (type == 2) {
            if (head == nullptr) {
                out.push_back(-1);
            } else {
                out.push_back(head->val);
                head = head->next;
                if (head == nullptr) {
                    tail = nullptr;
                }
                size--;
            }
        } else if (type == 3) {
            out.push_back(head == nullptr ? -1 : head->val);
        } else if (type == 4) {
            out.push_back(size);
        }
    }
    return out;
}`)], QUEUE_OPS.map(o => [o]), refQueue, ['Do not forget to reset tail when the queue becomes empty.'], 'Keeping a tail pointer makes enqueue O(1).'),
  mk('Implement Min Stack', 'minStackOperations', 'Min stack: ops [1,x] push, [2] pop (-1 if empty), [3] top (-1 if empty), [5] getMin (-1 if empty). Return outputs of ops 2, 3, 5 in O(1) each.', 'vector<int> minStackOperations(vector<vector<int>>& ops)', 'return {};', [
    ap('Brute force: scan for the minimum', 'getMin O(n)', 'O(n)', 'n', 'A plain stack answers getMin by scanning every element.', `vector<int> minStackOperations(vector<vector<int>>& ops) {
    vector<int> data;
    vector<int> out;
    for (int i = 0; i < ops.size(); i++) {
        int type = ops[i][0];
        if (type == 1) {
            data.push_back(ops[i][1]);
        } else if (type == 2) {
            if (data.empty()) {
                out.push_back(-1);
            } else {
                out.push_back(data.back());
                data.pop_back();
            }
        } else if (type == 3) {
            out.push_back(data.empty() ? -1 : data.back());
        } else if (type == 5) {
            if (data.empty()) {
                out.push_back(-1);
            } else {
                int best = data[0];
                for (int k = 1; k < data.size(); k++) {
                    best = min(best, data[k]);
                }
                out.push_back(best);
            }
        }
    }
    return out;
}`), ap('Stack of (value, minimum so far)', 'O(1) per operation', 'O(n)', 'n', 'Each element remembers the minimum of everything beneath it, so getMin is just reading the top pair. The extra space is one integer per element.', `vector<int> minStackOperations(vector<vector<int>>& ops) {
    stack<pair<int, int>> st;
    vector<int> out;
    for (int i = 0; i < ops.size(); i++) {
        int type = ops[i][0];
        if (type == 1) {
            int x = ops[i][1];
            int smallest = x;
            if (!st.empty()) {
                smallest = min(x, st.top().second);
            }
            st.push({x, smallest});
        } else if (type == 2) {
            if (st.empty()) {
                out.push_back(-1);
            } else {
                out.push_back(st.top().first);
                st.pop();
            }
        } else if (type == 3) {
            out.push_back(st.empty() ? -1 : st.top().first);
        } else if (type == 5) {
            out.push_back(st.empty() ? -1 : st.top().second);
        }
    }
    return out;
}`)], MIN_OPS.map(o => [o]), refStack, ['What extra information would let you answer "minimum" instantly after a pop?'], 'The minimum below an element never changes while the element is on the stack.'),

  // ---------- notation conversions ----------
  mk('Infix to Postfix', 'infixToPostfix', 'Convert an infix expression (single-letter operands, + - * / ^, parentheses) to postfix.', 'string infixToPostfix(string s)', 'return "";', [
    ap('Shunting-yard with an operator stack', 'O(n)', 'O(n)', 'n', 'Each token is pushed and popped at most once.', `${PREC}

string infixToPostfix(string s) {
    stack<char> st;
    string out = "";
    for (int i = 0; i < s.size(); i++) {
        char c = s[i];
        if (isalnum(c)) {
            out += c;
        } else if (c == '(') {
            st.push(c);
        } else if (c == ')') {
            while (!st.empty() && st.top() != '(') {
                out += st.top();
                st.pop();
            }
            st.pop();
        } else {
            while (!st.empty() && st.top() != '(' && (prec(st.top()) > prec(c) || (prec(st.top()) == prec(c) && c != '^'))) {
                out += st.top();
                st.pop();
            }
            st.push(c);
        }
    }
    while (!st.empty()) {
        out += st.top();
        st.pop();
    }
    return out;
}`)], INFIX.map(s => [s]), (s: string) => toPost(parseInfix(s)), ['Operands go straight to the output.', 'An operator waits on the stack until an operator of lower precedence arrives.'], 'The stack holds operators still waiting for their right operand.'),
  mk('Prefix to Infix', 'prefixToInfix', 'Convert a prefix expression to a fully parenthesised infix expression.', 'string prefixToInfix(string s)', 'return "";', [
    ap('Scan right to left with a stack', 'O(n²) worst case (string copies)', 'O(n)', 'n2', 'Each operator pops two strings and builds a new one; copying strings can cost O(n) per step.', `string prefixToInfix(string s) {
    stack<string> st;
    for (int i = s.size() - 1; i >= 0; i--) {
        char c = s[i];
        if (isalnum(c)) {
            st.push(string(1, c));
        } else {
            string a = st.top();
            st.pop();
            string b = st.top();
            st.pop();
            st.push("(" + a + string(1, c) + b + ")");
        }
    }
    return st.top();
}`)], ['+AB', '*+ABC', '-A*BC', '/*AB+CD', 'X'].map(s => [s]), (s: string) => toIn(parsePrefix(s)), ['Read from the right: the first operand popped is the LEFT operand.'], 'In prefix notation an operator is followed by its two operands.'),
  mk('Prefix to Postfix', 'prefixToPostfix', 'Convert a prefix expression to postfix.', 'string prefixToPostfix(string s)', 'return "";', [
    ap('Scan right to left with a stack', 'O(n²) worst case (string copies)', 'O(n)', 'n2', 'One stack operation per symbol plus string concatenation.', `string prefixToPostfix(string s) {
    stack<string> st;
    for (int i = s.size() - 1; i >= 0; i--) {
        char c = s[i];
        if (isalnum(c)) {
            st.push(string(1, c));
        } else {
            string a = st.top();
            st.pop();
            string b = st.top();
            st.pop();
            st.push(a + b + string(1, c));
        }
    }
    return st.top();
}`)], ['+AB', '*+ABC', '-A*BC', '/*AB+CD', 'X'].map(s => [s]), (s: string) => toPost(parsePrefix(s)), ['Same scan as prefix → infix; only the concatenation differs.'], 'Operator moves from the front of its operands to the back.'),
  mk('Postfix to Prefix', 'postfixToPrefix', 'Convert a postfix expression to prefix.', 'string postfixToPrefix(string s)', 'return "";', [
    ap('Scan left to right with a stack', 'O(n²) worst case (string copies)', 'O(n)', 'n2', 'One stack operation per symbol plus string concatenation.', `string postfixToPrefix(string s) {
    stack<string> st;
    for (int i = 0; i < s.size(); i++) {
        char c = s[i];
        if (isalnum(c)) {
            st.push(string(1, c));
        } else {
            string b = st.top();
            st.pop();
            string a = st.top();
            st.pop();
            st.push(string(1, c) + a + b);
        }
    }
    return st.top();
}`)], ['AB+', 'AB+C*', 'ABC*-', 'AB*CD+/', 'X'].map(s => [s]), (s: string) => toPre(parsePostfix(s)), ['In postfix the SECOND popped string is the left operand.'], 'Postfix evaluates with a stack: operands first, operator last.'),
  mk('Postfix to Infix', 'postfixToInfix', 'Convert a postfix expression to a fully parenthesised infix expression.', 'string postfixToInfix(string s)', 'return "";', [
    ap('Scan left to right with a stack', 'O(n²) worst case (string copies)', 'O(n)', 'n2', 'One stack operation per symbol plus string concatenation.', `string postfixToInfix(string s) {
    stack<string> st;
    for (int i = 0; i < s.size(); i++) {
        char c = s[i];
        if (isalnum(c)) {
            st.push(string(1, c));
        } else {
            string b = st.top();
            st.pop();
            string a = st.top();
            st.pop();
            st.push("(" + a + string(1, c) + b + ")");
        }
    }
    return st.top();
}`)], ['AB+', 'AB+C*', 'ABC*-', 'AB*CD+/', 'X'].map(s => [s]), (s: string) => toIn(parsePostfix(s)), ['Pop the right operand first, then the left.'], 'Postfix → infix rebuilds the parenthesised tree.'),
  mk('Convert Infix to Prefix', 'infixToPrefix', 'Convert an infix expression to prefix.', 'string infixToPrefix(string s)', 'return "";', [
    ap('Reverse, swap brackets, shunting-yard, reverse', 'O(n)', 'O(n)', 'n', 'A constant number of linear passes; the associativity rule is mirrored (^ becomes left-associative in the reversed pass).', `${PREC}

string infixToPrefix(string s) {
    reverse(s.begin(), s.end());
    for (int i = 0; i < s.size(); i++) {
        if (s[i] == '(') {
            s[i] = ')';
        } else if (s[i] == ')') {
            s[i] = '(';
        }
    }
    stack<char> st;
    string out = "";
    for (int i = 0; i < s.size(); i++) {
        char c = s[i];
        if (isalnum(c)) {
            out += c;
        } else if (c == '(') {
            st.push(c);
        } else if (c == ')') {
            while (!st.empty() && st.top() != '(') {
                out += st.top();
                st.pop();
            }
            st.pop();
        } else {
            while (!st.empty() && st.top() != '(' && (prec(st.top()) > prec(c) || (prec(st.top()) == prec(c) && c == '^'))) {
                out += st.top();
                st.pop();
            }
            st.push(c);
        }
    }
    while (!st.empty()) {
        out += st.top();
        st.pop();
    }
    reverse(out.begin(), out.end());
    return out;
}`)], INFIX.map(s => [s]), (s: string) => toPre(parseInfix(s)), ['Reverse the expression and swap the brackets.', 'Run infix → postfix with the mirrored associativity, then reverse.'], 'Prefix of an expression is the reverse of the postfix of the mirrored expression.'),

  // ---------- monotonic stack / queue ----------
  mk('Next Greater Element II', 'nextGreaterCircular', 'The array is circular. For each element return the next greater element (searching around the circle), or -1.', 'vector<int> nextGreaterCircular(vector<int>& nums)', 'return {};', [
    ap('Brute force', 'O(n²)', 'O(1)', 'n2', 'For each element scan up to n-1 following positions (circularly).', `vector<int> nextGreaterCircular(vector<int>& nums) {
    int n = nums.size();
    vector<int> result(n, -1);
    for (int i = 0; i < n; i++) {
        for (int step = 1; step < n; step++) {
            int j = (i + step) % n;
            if (nums[j] > nums[i]) {
                result[i] = nums[j];
                break;
            }
        }
    }
    return result;
}`), ap('Monotonic stack, two laps', 'O(n)', 'O(n)', 'n', 'Walking 2n-1 positions from the right visits each element twice but each element is pushed and popped at most twice.', `vector<int> nextGreaterCircular(vector<int>& nums) {
    int n = nums.size();
    vector<int> result(n, -1);
    stack<int> st;
    for (int i = 2 * n - 1; i >= 0; i--) {
        int value = nums[i % n];
        while (!st.empty() && st.top() <= value) {
            st.pop();
        }
        if (i < n && !st.empty()) {
            result[i] = st.top();
        }
        st.push(value);
    }
    return result;
}`)], [[[1, 2, 1]], [[1, 2, 3, 4, 3]], [[5, 4, 3]], [[1]], [[2, 2, 2]]], (a: number[]) => a.map((x, i) => { for (let s = 1; s < a.length; s++) { const v = a[(i + s) % a.length]; if (v > x) return v; } return -1; }), ['Pretend the array is written twice.'], 'A circular array is two copies of the array side by side.'),
  mk('Number of NGEs to the Right', 'countNGEs', 'For each query index q, count the elements to the right of q that are greater than nums[q].', 'vector<int> countNGEs(vector<int>& nums, vector<int>& queries)', 'return {};', [
    ap('Brute force per query', 'O(n·q)', 'O(1)', 'n2', 'Each query scans the suffix to its right. (An offline merge-sort/Fenwick method reaches O((n+q) log n), which is beyond this tracer\'s teaching scope.)', `vector<int> countNGEs(vector<int>& nums, vector<int>& queries) {
    vector<int> result;
    for (int i = 0; i < queries.size(); i++) {
        int index = queries[i];
        int count = 0;
        for (int j = index + 1; j < nums.size(); j++) {
            if (nums[j] > nums[index]) {
                count++;
            }
        }
        result.push_back(count);
    }
    return result;
}`)], [[[3, 4, 2, 7, 5, 8, 10, 6], [0, 5]], [[1, 2, 3], [0, 1, 2]], [[5, 4, 3], [0]], [[1], [0]]], (a: number[], q: number[]) => q.map(i => a.slice(i + 1).filter(x => x > a[i]).length), ['Count the larger values in the suffix for each query.'], 'Counting (not finding the first) greater elements needs the whole suffix.'),
  mk('Sum of Subarray Minimum', 'sumSubarrayMins', 'Return the sum of the minimum of every contiguous subarray.', 'long long sumSubarrayMins(vector<int>& arr)', 'return 0;', [
    ap('Brute force', 'O(n²)', 'O(1)', 'n2', 'Extend every start index tracking the running minimum.', `long long sumSubarrayMins(vector<int>& arr) {
    long long total = 0;
    for (int i = 0; i < arr.size(); i++) {
        int smallest = arr[i];
        for (int j = i; j < arr.size(); j++) {
            smallest = min(smallest, arr[j]);
            total += smallest;
        }
    }
    return total;
}`), ap('Monotonic stack: contribution of each element', 'O(n)', 'O(n)', 'n', 'Each element is the minimum of (left span × right span) subarrays; the spans come from the previous strictly-smaller and next smaller-or-equal elements found with a monotonic stack.', `long long sumSubarrayMins(vector<int>& arr) {
    int n = arr.size();
    vector<int> left(n, 0);
    vector<int> right(n, 0);
    stack<int> st;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && arr[st.top()] > arr[i]) {
            st.pop();
        }
        left[i] = st.empty() ? i + 1 : i - st.top();
        st.push(i);
    }
    while (!st.empty()) {
        st.pop();
    }
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && arr[st.top()] >= arr[i]) {
            st.pop();
        }
        right[i] = st.empty() ? n - i : st.top() - i;
        st.push(i);
    }
    long long total = 0;
    for (int i = 0; i < n; i++) {
        total += (long long)arr[i] * left[i] * right[i];
    }
    return total;
}`)], [[[3, 1, 2, 4]], [[11, 81, 94, 43, 3]], [[1]], [[2, 2, 2]], [[5, 4, 3, 2, 1]]], (a: number[]) => { let t = 0; for (let i = 0; i < a.length; i++) { let m = a[i]; for (let j = i; j < a.length; j++) { m = Math.min(m, a[j]); t += m; } } return t; }, ['Ask: in how many subarrays is arr[i] the minimum?', 'Break ties asymmetrically (strict on one side) to avoid double counting.'], 'Each subarray has exactly one designated minimum element.'),
  mk('Sum of Subarray Ranges', 'subArrayRanges', 'The range of a subarray is (max − min). Return the sum of ranges of all subarrays.', 'long long subArrayRanges(vector<int>& nums)', 'return 0;', [
    ap('Brute force', 'O(n²)', 'O(1)', 'n2', 'Extend each start while tracking min and max.', `long long subArrayRanges(vector<int>& nums) {
    long long total = 0;
    for (int i = 0; i < nums.size(); i++) {
        int low = nums[i];
        int high = nums[i];
        for (int j = i; j < nums.size(); j++) {
            low = min(low, nums[j]);
            high = max(high, nums[j]);
            total += high - low;
        }
    }
    return total;
}`), ap('Sum of maxima − sum of minima (monotonic stacks)', 'O(n)', 'O(n)', 'n', 'Sum of ranges = Σ subarray maxima − Σ subarray minima; each is computed with a monotonic stack in O(n) (maxima via negated values).', `long long sumOfMins(vector<int>& a) {
    int n = a.size();
    vector<int> left(n, 0);
    vector<int> right(n, 0);
    stack<int> st;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && a[st.top()] > a[i]) {
            st.pop();
        }
        left[i] = st.empty() ? i + 1 : i - st.top();
        st.push(i);
    }
    while (!st.empty()) {
        st.pop();
    }
    for (int i = n - 1; i >= 0; i--) {
        while (!st.empty() && a[st.top()] >= a[i]) {
            st.pop();
        }
        right[i] = st.empty() ? n - i : st.top() - i;
        st.push(i);
    }
    long long total = 0;
    for (int i = 0; i < n; i++) {
        total += (long long)a[i] * left[i] * right[i];
    }
    return total;
}

long long subArrayRanges(vector<int>& nums) {
    vector<int> negated;
    for (int i = 0; i < nums.size(); i++) {
        negated.push_back(-nums[i]);
    }
    long long sumMax = -sumOfMins(negated);
    long long sumMin = sumOfMins(nums);
    return sumMax - sumMin;
}`)], [[[1, 2, 3]], [[1, 3, 3]], [[4, -2, -3, 4, 1]], [[5]], [[2, 1]]], (a: number[]) => { let t = 0; for (let i = 0; i < a.length; i++) for (let j = i; j < a.length; j++) { const s = a.slice(i, j + 1); t += Math.max(...s) - Math.min(...s); } return t; }, ['max − min summed over all subarrays = (sum of maxima) − (sum of minima).'], 'Splitting the range into two independent sums reuses the minimum-sum technique.'),
  mk('Remove K Digits', 'removeKdigits', 'Remove exactly k digits from the number string to make the smallest possible number (no leading zeros; empty result is "0").', 'string removeKdigits(string num, int k)', 'return "";', [
    ap('Monotonic (increasing) stack', 'O(n)', 'O(n)', 'n', 'Each digit is pushed once and popped at most once; popping a larger digit before a smaller one always shrinks the number.', `string removeKdigits(string num, int k) {
    string st = "";
    for (int i = 0; i < num.size(); i++) {
        while (k > 0 && !st.empty() && st.back() > num[i]) {
            st.pop_back();
            k--;
        }
        st.push_back(num[i]);
    }
    while (k > 0 && !st.empty()) {
        st.pop_back();
        k--;
    }
    int start = 0;
    while (start < st.size() && st[start] == '0') {
        start++;
    }
    string result = st.substr(start);
    return result.empty() ? "0" : result;
}`)], [['1432219', 3], ['10200', 1], ['10', 2], ['9', 1], ['112', 1], ['1234567890', 9]], (s: string, k: number) => { const st: string[] = []; for (const c of s) { while (k > 0 && st.length && st[st.length - 1] > c) { st.pop(); k--; } st.push(c); } while (k-- > 0) st.pop(); const r = st.join('').replace(/^0+/, ''); return r || '0'; }, ['A bigger digit before a smaller one should be removed.'], 'Keep the digits in non-decreasing order for the smallest number.'),
  mk('Maximal Rectangles', 'maximalRectangle', 'Binary matrix (1/0): return the area of the largest rectangle containing only 1s.', 'int maximalRectangle(vector<vector<int>>& matrix)', 'return 0;', [
    ap('Histogram per row + monotonic stack', 'O(m·n)', 'O(n)', 'n2', 'Heights of consecutive 1s are updated per row in O(n) and the largest rectangle in each histogram is found in O(n) with a stack.', `int largestInHistogram(vector<int>& heights) {
    stack<int> st;
    int best = 0;
    int n = heights.size();
    for (int i = 0; i <= n; i++) {
        int current = i < n ? heights[i] : 0;
        while (!st.empty() && heights[st.top()] > current) {
            int h = heights[st.top()];
            st.pop();
            int left = st.empty() ? -1 : st.top();
            best = max(best, h * (i - left - 1));
        }
        st.push(i);
    }
    return best;
}

int maximalRectangle(vector<vector<int>>& matrix) {
    int cols = matrix[0].size();
    vector<int> heights(cols, 0);
    int best = 0;
    for (int r = 0; r < matrix.size(); r++) {
        for (int c = 0; c < cols; c++) {
            if (matrix[r][c] == 1) {
                heights[c]++;
            } else {
                heights[c] = 0;
            }
        }
        best = max(best, largestInHistogram(heights));
    }
    return best;
}`)], [[[[1, 0, 1, 0, 0], [1, 0, 1, 1, 1], [1, 1, 1, 1, 1], [1, 0, 0, 1, 0]]], [[[0]]], [[[1]]], [[[1, 1], [1, 1]]], [[[0, 1], [1, 0]]]], (m: number[][]) => { let b = 0; for (let r1 = 0; r1 < m.length; r1++) for (let c1 = 0; c1 < m[0].length; c1++) for (let r2 = r1; r2 < m.length; r2++) for (let c2 = c1; c2 < m[0].length; c2++) { let ok = true; for (let r = r1; r <= r2 && ok; r++) for (let c = c1; c <= c2; c++) if (!m[r][c]) { ok = false; break; } if (ok) b = Math.max(b, (r2 - r1 + 1) * (c2 - c1 + 1)); } return b; }, ['Treat each row as the base of a histogram.'], 'Maximal rectangle = largest histogram rectangle, row by row.'),
  mk('The Celebrity Problem', 'findCelebrity', 'knows[i][j] = 1 if i knows j. A celebrity is known by everyone and knows nobody. Return the celebrity or -1.', 'int findCelebrity(vector<vector<int>>& knows)', 'return -1;', [
    ap('Check every person', 'O(n²)', 'O(1)', 'n2', 'For each candidate verify the whole row and column.', `int findCelebrity(vector<vector<int>>& knows) {
    int n = knows.size();
    for (int i = 0; i < n; i++) {
        bool celebrity = true;
        for (int j = 0; j < n; j++) {
            if (i != j && (knows[i][j] == 1 || knows[j][i] == 0)) {
                celebrity = false;
                break;
            }
        }
        if (celebrity) {
            return i;
        }
    }
    return -1;
}`), ap('Two pointers elimination', 'O(n)', 'O(1)', 'n', 'Each question "does a know b?" eliminates one of them as a candidate (n-1 questions), then one O(n) verification of the survivor.', `int findCelebrity(vector<vector<int>>& knows) {
    int n = knows.size();
    int a = 0;
    int b = n - 1;
    while (a < b) {
        if (knows[a][b] == 1) {
            a++;
        } else {
            b--;
        }
    }
    for (int i = 0; i < n; i++) {
        if (i != a && (knows[a][i] == 1 || knows[i][a] == 0)) {
            return -1;
        }
    }
    return a;
}`)], [[[[0, 1, 0], [0, 0, 0], [0, 1, 0]]], [[[0, 1], [1, 0]]], [[[0]]], [[[0, 1, 1], [0, 0, 1], [0, 0, 0]]], [[[0, 0], [0, 0]]]], (k: number[][]) => { const n = k.length; for (let i = 0; i < n; i++) if (k.every((row, j) => j === i || (!k[i][j] && k[j][i]))) return i; return -1; }, ['If a knows b, a cannot be the celebrity; otherwise b cannot be.'], 'One question always removes one candidate.'),
  mk('LRU Cache', 'lruCache', 'Capacity-limited cache evicting the least recently used key. ops: [1,key,value] put, [2,key] get (-1 if absent). Return the results of the get operations.', 'vector<int> lruCache(int capacity, vector<vector<int>>& ops)', 'return {};', [
    ap('Doubly linked list + hash map', 'O(1) per operation', 'O(capacity)', '1', 'The map finds a node in O(1); the doubly linked list moves it to the front and evicts from the back in O(1).', `ListNode* head = nullptr;
ListNode* tail = nullptr;

void detach(ListNode* node) {
    if (node->prev != nullptr) {
        node->prev->next = node->next;
    } else {
        head = node->next;
    }
    if (node->next != nullptr) {
        node->next->prev = node->prev;
    } else {
        tail = node->prev;
    }
    node->prev = nullptr;
    node->next = nullptr;
}

void pushFront(ListNode* node) {
    node->next = head;
    if (head != nullptr) {
        head->prev = node;
    }
    head = node;
    if (tail == nullptr) {
        tail = node;
    }
}

vector<int> lruCache(int capacity, vector<vector<int>>& ops) {
    unordered_map<int, ListNode*> where;
    unordered_map<int, int> values;
    vector<int> out;
    for (int i = 0; i < ops.size(); i++) {
        int key = ops[i][1];
        if (ops[i][0] == 1) {
            if (where.count(key)) {
                ListNode* node = where[key];
                detach(node);
                pushFront(node);
                values[key] = ops[i][2];
            } else {
                if (where.size() == capacity) {
                    ListNode* victim = tail;
                    detach(victim);
                    where.erase(victim->val);
                    values.erase(victim->val);
                }
                ListNode* node = new ListNode(key);
                pushFront(node);
                where[key] = node;
                values[key] = ops[i][2];
            }
        } else {
            if (where.count(key)) {
                ListNode* node = where[key];
                detach(node);
                pushFront(node);
                out.push_back(values[key]);
            } else {
                out.push_back(-1);
            }
        }
    }
    return out;
}`)], [[2, [[1, 1, 1], [1, 2, 2], [2, 1], [1, 3, 3], [2, 2], [1, 4, 4], [2, 1], [2, 3], [2, 4]]], [1, [[1, 1, 1], [1, 2, 2], [2, 1], [2, 2]]], [3, [[1, 1, 10], [1, 2, 20], [1, 3, 30], [2, 1], [1, 4, 40], [2, 2], [2, 3], [2, 4], [2, 1]]], [2, [[2, 5]]]], (cap: number, ops: number[][]) => { const m = new Map<number, number>(); const out: number[] = []; for (const o of ops) { if (o[0] === 1) { if (m.has(o[1])) m.delete(o[1]); else if (m.size === cap) m.delete(m.keys().next().value!); m.set(o[1], o[2]); } else if (m.has(o[1])) { const v = m.get(o[1])!; m.delete(o[1]); m.set(o[1], v); out.push(v); } else out.push(-1); } return out; },
    ['Most recent at the head, least recent at the tail.', 'A hash map from key to node makes lookups O(1).'], 'Pointer surgery in a doubly linked list moves a node to the front in constant time.', { dll: true }),
  mk('LFU Cache', 'lfuCache', 'Evict the least frequently used key (ties: least recently used). ops: [1,key,value] put, [2,key] get (-1 if absent). Return the get results.', 'vector<int> lfuCache(int capacity, vector<vector<int>>& ops)', 'return {};', [
    ap('Ordered set of (frequency, time, key)', 'O(log capacity) per operation', 'O(capacity)', 'logn', 'An ordered set keeps keys sorted by (frequency, last-use time); its first element is always the eviction victim, and each update erases and re-inserts one entry in O(log n). (The classic O(1) variant uses frequency buckets of linked lists.)', `vector<int> lfuCache(int capacity, vector<vector<int>>& ops) {
    map<int, vector<int>> info;
    set<vector<int>> order;
    int clock = 0;
    vector<int> out;
    if (capacity == 0) {
        for (int i = 0; i < ops.size(); i++) {
            if (ops[i][0] == 2) {
                out.push_back(-1);
            }
        }
        return out;
    }
    for (int i = 0; i < ops.size(); i++) {
        int key = ops[i][1];
        clock++;
        if (ops[i][0] == 1) {
            if (info.count(key)) {
                vector<int> entry = info[key];
                order.erase({entry[1], entry[2], key});
                info[key] = {ops[i][2], entry[1] + 1, clock};
                order.insert({entry[1] + 1, clock, key});
            } else {
                if (info.size() == capacity) {
                    vector<int> victim = *order.begin();
                    order.erase(victim);
                    info.erase(victim[2]);
                }
                info[key] = {ops[i][2], 1, clock};
                order.insert({1, clock, key});
            }
        } else {
            if (info.count(key)) {
                vector<int> entry = info[key];
                order.erase({entry[1], entry[2], key});
                info[key] = {entry[0], entry[1] + 1, clock};
                order.insert({entry[1] + 1, clock, key});
                out.push_back(entry[0]);
            } else {
                out.push_back(-1);
            }
        }
    }
    return out;
}`)], [[2, [[1, 1, 1], [1, 2, 2], [2, 1], [1, 3, 3], [2, 2], [2, 3], [1, 4, 4], [2, 1], [2, 3], [2, 4]]], [1, [[1, 1, 1], [2, 1], [1, 2, 2], [2, 1], [2, 2]]], [0, [[1, 1, 1], [2, 1]]], [2, [[1, 1, 1], [1, 2, 2], [1, 1, 5], [1, 3, 3], [2, 1], [2, 2], [2, 3]]]], (cap: number, ops: number[][]) => { const m = new Map<number, { v: number; f: number; t: number }>(); const out: number[] = []; let clock = 0; for (const o of ops) { clock++; if (cap === 0) { if (o[0] === 2) out.push(-1); continue; } if (o[0] === 1) { const e = m.get(o[1]); if (e) { e.v = o[2]; e.f++; e.t = clock; } else { if (m.size === cap) { let vk = -1, best: { f: number; t: number } | null = null; for (const [k, x] of m) if (!best || x.f < best.f || (x.f === best.f && x.t < best.t)) { best = x; vk = k; } m.delete(vk); } m.set(o[1], { v: o[2], f: 1, t: clock }); } } else { const e = m.get(o[1]); if (e) { e.f++; e.t = clock; out.push(e.v); } else out.push(-1); } } return out; },
    ['Frequency decides first, recency breaks ties.', 'Re-insert a key with its new (frequency, time) whenever it is used.'], 'Sorting keys by (frequency, last use) puts the right victim first.'),

  // ---------- Step 10: sliding window / two pointers ----------
  mk('Longest Substring Without Repeating Characters', 'lengthOfLongestSubstring', 'Return the length of the longest substring without repeating characters.', 'int lengthOfLongestSubstring(string s)', 'return 0;', [
    ap('Brute force', 'O(n²)', 'O(1)', 'n2', 'Extend from every start until a repeat appears, tracking seen letters in a 256-slot array.', `int lengthOfLongestSubstring(string s) {
    int best = 0;
    for (int i = 0; i < s.size(); i++) {
        vector<int> seen(256, 0);
        for (int j = i; j < s.size(); j++) {
            if (seen[s[j]] == 1) {
                break;
            }
            seen[s[j]] = 1;
            best = max(best, j - i + 1);
        }
    }
    return best;
}`), ap('Sliding window with last-seen index', 'O(n)', 'O(1)', 'n', 'The right pointer scans once; the left pointer jumps past the previous occurrence of a repeated character, never moving backwards.', `int lengthOfLongestSubstring(string s) {
    vector<int> last(256, -1);
    int left = 0;
    int best = 0;
    for (int right = 0; right < s.size(); right++) {
        if (last[s[right]] >= left) {
            left = last[s[right]] + 1;
        }
        last[s[right]] = right;
        best = max(best, right - left + 1);
    }
    return best;
}`)], [['abcabcbb'], ['bbbbb'], ['pwwkew'], [''], ['dvdf'], ['abba']], (s: string) => { let b = 0; for (let i = 0; i < s.length; i++) { const seen = new Set<string>(); for (let j = i; j < s.length && !seen.has(s[j]); j++) { seen.add(s[j]); b = Math.max(b, j - i + 1); } } return b; }, ['Remember where each character was last seen.'], 'When a repeat appears, move the left edge just past the previous copy.'),
  mk('Max Consecutive Ones III', 'longestOnes', 'You may flip at most k zeros. Return the longest run of 1s.', 'int longestOnes(vector<int>& nums, int k)', 'return 0;', [
    ap('Sliding window counting zeros', 'O(n)', 'O(1)', 'n', 'The window never contains more than k zeros; each pointer moves right only.', `int longestOnes(vector<int>& nums, int k) {
    int left = 0;
    int zeros = 0;
    int best = 0;
    for (int right = 0; right < nums.size(); right++) {
        if (nums[right] == 0) {
            zeros++;
        }
        while (zeros > k) {
            if (nums[left] == 0) {
                zeros--;
            }
            left++;
        }
        best = max(best, right - left + 1);
    }
    return best;
}`)], [[[1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2], [[0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1], 3], [[0, 0, 0], 0], [[1, 1], 0], [[0], 1]], (a: number[], k: number) => { let b = 0; for (let i = 0; i < a.length; i++) { let z = 0; for (let j = i; j < a.length; j++) { if (!a[j]) z++; if (z > k) break; b = Math.max(b, j - i + 1); } } return b; }, ['Keep a window with at most k zeros.'], 'Shrink from the left only when the zero budget is exceeded.'),
  mk('Fruit Into Baskets', 'totalFruit', 'Pick fruits from consecutive trees using two baskets (each holds one type). Return the maximum number of fruits.', 'int totalFruit(vector<int>& fruits)', 'return 0;', [
    ap('Window with at most 2 distinct types', 'O(n)', 'O(1)', 'n', 'Each pointer moves right only; the map holds at most three entries at any time.', `int totalFruit(vector<int>& fruits) {
    unordered_map<int, int> basket;
    int left = 0;
    int best = 0;
    for (int right = 0; right < fruits.size(); right++) {
        basket[fruits[right]]++;
        while (basket.size() > 2) {
            basket[fruits[left]]--;
            if (basket[fruits[left]] == 0) {
                basket.erase(fruits[left]);
            }
            left++;
        }
        best = max(best, right - left + 1);
    }
    return best;
}`)], [[[1, 2, 1]], [[0, 1, 2, 2]], [[1, 2, 3, 2, 2]], [[3, 3, 3, 1, 2, 1, 1, 2, 3, 3, 4]], [[5]]], (a: number[]) => { let b = 0; for (let i = 0; i < a.length; i++) { const s = new Set<number>(); for (let j = i; j < a.length; j++) { s.add(a[j]); if (s.size > 2) break; b = Math.max(b, j - i + 1); } } return b; }, ['It is "longest subarray with at most 2 distinct values".'], 'A map of counts tells you when a type disappears from the window.'),
  mk('Longest Repeating Character Replacement', 'characterReplacement', 'You may replace at most k characters. Return the length of the longest substring of one repeated letter (uppercase letters).', 'int characterReplacement(string s, int k)', 'return 0;', [
    ap('Window with the max frequency', 'O(n)', 'O(1)', 'n', 'A window is valid if (length − most frequent letter count) ≤ k. The max frequency never needs to decrease, so the window only grows or slides.', `int characterReplacement(string s, int k) {
    vector<int> count(26, 0);
    int left = 0;
    int maxFreq = 0;
    int best = 0;
    for (int right = 0; right < s.size(); right++) {
        count[s[right] - 'A']++;
        maxFreq = max(maxFreq, count[s[right] - 'A']);
        while ((right - left + 1) - maxFreq > k) {
            count[s[left] - 'A']--;
            left++;
        }
        best = max(best, right - left + 1);
    }
    return best;
}`)], [['ABAB', 2], ['AABABBA', 1], ['AAAA', 2], ['ABC', 0], ['A', 5]], (s: string, k: number) => { let b = 0; for (let i = 0; i < s.length; i++) { const c = new Array(26).fill(0); let mf = 0; for (let j = i; j < s.length; j++) { mf = Math.max(mf, ++c[s.charCodeAt(j) - 65]); if (j - i + 1 - mf <= k) b = Math.max(b, j - i + 1); } } return b; }, ['Characters to replace = window length − count of the most frequent letter.'], 'The cheapest target letter is the one already most common in the window.'),
  mk('Binary Subarray With Sum', 'numSubarraysWithSum', 'Count subarrays of a 0/1 array whose sum equals goal.', 'int numSubarraysWithSum(vector<int>& nums, int goal)', 'return 0;', [
    ap('Prefix sums in a hash map', 'O(n)', 'O(n)', 'n', 'Count earlier prefixes equal to (current prefix − goal).', `int numSubarraysWithSum(vector<int>& nums, int goal) {
    unordered_map<int, int> seen;
    seen[0] = 1;
    int prefix = 0;
    int count = 0;
    for (int i = 0; i < nums.size(); i++) {
        prefix += nums[i];
        if (seen.count(prefix - goal)) {
            count += seen[prefix - goal];
        }
        seen[prefix]++;
    }
    return count;
}`), ap('Sliding window: atMost(goal) − atMost(goal−1)', 'O(n)', 'O(1)', 'n', 'Non-negative numbers make the window sum monotone, so "at most" counts are two-pointer passes.', `int atMost(vector<int>& nums, int goal) {
    if (goal < 0) {
        return 0;
    }
    int left = 0;
    int sum = 0;
    int count = 0;
    for (int right = 0; right < nums.size(); right++) {
        sum += nums[right];
        while (sum > goal) {
            sum -= nums[left];
            left++;
        }
        count += right - left + 1;
    }
    return count;
}

int numSubarraysWithSum(vector<int>& nums, int goal) {
    return atMost(nums, goal) - atMost(nums, goal - 1);
}`)], [[[1, 0, 1, 0, 1], 2], [[0, 0, 0, 0, 0], 0], [[1, 1, 1], 3], [[0, 1, 1, 0, 1], 1], [[1], 1]], (a: number[], g: number) => { let c = 0; for (let i = 0; i < a.length; i++) { let s = 0; for (let j = i; j < a.length; j++) { s += a[j]; if (s === g) c++; } } return c; }, ['Non-negative numbers allow a sliding window.'], 'exactly(g) = atMost(g) − atMost(g−1).'),
  mk('Count Number of Nice Subarrays', 'numberOfSubarrays', 'A subarray is nice if it contains exactly k odd numbers. Count nice subarrays.', 'int numberOfSubarrays(vector<int>& nums, int k)', 'return 0;', [
    ap('atMost(k) − atMost(k−1) windows', 'O(n)', 'O(1)', 'n', 'Treat odd numbers as 1 and even as 0, then it is a binary subarray sum.', `int atMost(vector<int>& nums, int k) {
    if (k < 0) {
        return 0;
    }
    int left = 0;
    int odds = 0;
    int count = 0;
    for (int right = 0; right < nums.size(); right++) {
        odds += nums[right] % 2;
        while (odds > k) {
            odds -= nums[left] % 2;
            left++;
        }
        count += right - left + 1;
    }
    return count;
}

int numberOfSubarrays(vector<int>& nums, int k) {
    return atMost(nums, k) - atMost(nums, k - 1);
}`)], [[[1, 1, 2, 1, 1], 3], [[2, 4, 6], 1], [[2, 2, 2, 1, 2, 2, 1, 2, 2, 2], 2], [[1], 1]], (a: number[], k: number) => { let c = 0; for (let i = 0; i < a.length; i++) { let o = 0; for (let j = i; j < a.length; j++) { o += a[j] % 2; if (o === k) c++; } } return c; }, ['Map odd → 1, even → 0.'], 'The problem is Binary Subarray With Sum in disguise.'),
  mk('Number of Substrings Containing All Three Characters', 'numberOfSubstrings', 'Count substrings of s (only a, b, c) that contain at least one a, one b and one c.', 'int numberOfSubstrings(string s)', 'return 0;', [
    ap('Last seen positions', 'O(n)', 'O(1)', 'n', 'For each right end, the valid starts are all indices ≤ min(last a, last b, last c): add min + 1.', `int numberOfSubstrings(string s) {
    int last[3] = {-1, -1, -1};
    int count = 0;
    for (int i = 0; i < s.size(); i++) {
        last[s[i] - 'a'] = i;
        if (last[0] != -1 && last[1] != -1 && last[2] != -1) {
            count += min(last[0], min(last[1], last[2])) + 1;
        }
    }
    return count;
}`)], [['abcabc'], ['aaacb'], ['abc'], ['aaaa'], ['cabcab']], (s: string) => { let c = 0; for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) if (['a', 'b', 'c'].every(x => s.slice(i, j + 1).includes(x))) c++; return c; }, ['The latest start that still contains all three letters is the minimum of their last positions.'], 'Count valid starts for each end position.'),
  mk('Maximum Points You Can Obtain from Cards', 'maxScore', 'Take exactly k cards from either end of the row. Return the maximum total points.', 'int maxScore(vector<int>& cardPoints, int k)', 'return 0;', [
    ap('Slide the split point', 'O(k)', 'O(1)', 'n', 'Start with the k leftmost cards and replace them one at a time by cards from the right end: k steps.', `int maxScore(vector<int>& cardPoints, int k) {
    int n = cardPoints.size();
    int sum = 0;
    for (int i = 0; i < k; i++) {
        sum += cardPoints[i];
    }
    int best = sum;
    for (int i = 0; i < k; i++) {
        sum -= cardPoints[k - 1 - i];
        sum += cardPoints[n - 1 - i];
        best = max(best, sum);
    }
    return best;
}`)], [[[1, 2, 3, 4, 5, 6, 1], 3], [[2, 2, 2], 2], [[9, 7, 7, 9, 7, 7, 9], 7], [[1, 100, 1], 1], [[5, 1, 2], 3]], (a: number[], k: number) => { let b = 0; for (let l = 0; l <= k; l++) b = Math.max(b, a.slice(0, l).reduce((x, y) => x + y, 0) + a.slice(a.length - (k - l)).reduce((x, y) => x + y, 0)); return b; }, ['Taking k cards from the ends means l from the left and k−l from the right.'], 'The cards you leave form one contiguous middle window.'),
  mk('Longest Substring With At Most K Distinct Characters', 'lengthOfLongestSubstringKDistinct', 'Return the length of the longest substring with at most k distinct characters.', 'int lengthOfLongestSubstringKDistinct(string s, int k)', 'return 0;', [
    ap('Sliding window with counts', 'O(n)', 'O(k)', 'n', 'Each pointer moves right only; the map holds at most k+1 entries.', `int lengthOfLongestSubstringKDistinct(string s, int k) {
    unordered_map<char, int> count;
    int left = 0;
    int best = 0;
    for (int right = 0; right < s.size(); right++) {
        count[s[right]]++;
        while (count.size() > k) {
            count[s[left]]--;
            if (count[s[left]] == 0) {
                count.erase(s[left]);
            }
            left++;
        }
        best = max(best, right - left + 1);
    }
    return best;
}`)], [['eceba', 2], ['aa', 1], ['abcadcacacaca', 3], ['abc', 0], ['abaccc', 2]], (s: string, k: number) => { let b = 0; for (let i = 0; i < s.length; i++) { const st = new Set<string>(); for (let j = i; j < s.length; j++) { st.add(s[j]); if (st.size > k) break; b = Math.max(b, j - i + 1); } } return b; }, ['Shrink the window while it has more than k distinct letters.'], 'Generalises Fruit Into Baskets (k = 2).'),
  mk('Subarrays with K Different Integers', 'subarraysWithKDistinct', 'Count subarrays with exactly k distinct integers.', 'int subarraysWithKDistinct(vector<int>& nums, int k)', 'return 0;', [
    ap('atMost(k) − atMost(k−1)', 'O(n)', 'O(n)', 'n', 'Two linear sliding-window passes, each with a hash map of counts.', `int atMost(vector<int>& nums, int k) {
    unordered_map<int, int> count;
    int left = 0;
    int total = 0;
    for (int right = 0; right < nums.size(); right++) {
        count[nums[right]]++;
        while (count.size() > k) {
            count[nums[left]]--;
            if (count[nums[left]] == 0) {
                count.erase(nums[left]);
            }
            left++;
        }
        total += right - left + 1;
    }
    return total;
}

int subarraysWithKDistinct(vector<int>& nums, int k) {
    return atMost(nums, k) - atMost(nums, k - 1);
}`)], [[[1, 2, 1, 2, 3], 2], [[1, 2, 1, 3, 4], 3], [[1, 1, 1], 1], [[1, 2, 3], 4], [[2, 1, 1, 1, 2], 1]], (a: number[], k: number) => { let c = 0; for (let i = 0; i < a.length; i++) { const s = new Set<number>(); for (let j = i; j < a.length; j++) { s.add(a[j]); if (s.size === k) c++; } } return c; }, ['"Exactly k" = "at most k" − "at most k−1".'], 'Counting windows ending at each right edge is easy for "at most".'),
  mk('Minimum Window Substring', 'minWindow', 'Return the smallest substring of s containing every character of t (with multiplicity), or "".', 'string minWindow(string s, string t)', 'return "";', [
    ap('Sliding window with need counts', 'O(n + m)', 'O(1)', 'n', 'The right pointer expands until the window covers t; the left pointer then shrinks it as far as possible. Each pointer moves right only.', `string minWindow(string s, string t) {
    vector<int> need(128, 0);
    for (int i = 0; i < t.size(); i++) {
        need[t[i]]++;
    }
    int missing = t.size();
    int left = 0;
    int bestStart = 0;
    int bestLen = INT_MAX;
    for (int right = 0; right < s.size(); right++) {
        if (need[s[right]] > 0) {
            missing--;
        }
        need[s[right]]--;
        while (missing == 0) {
            if (right - left + 1 < bestLen) {
                bestLen = right - left + 1;
                bestStart = left;
            }
            need[s[left]]++;
            if (need[s[left]] > 0) {
                missing++;
            }
            left++;
        }
    }
    if (bestLen == INT_MAX) {
        return "";
    }
    return s.substr(bestStart, bestLen);
}`)], [['ADOBECODEBANC', 'ABC'], ['a', 'a'], ['a', 'aa'], ['aa', 'aa'], ['bba', 'ab']], (s: string, t: string) => { let best = ''; for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) { const w = s.slice(i, j + 1); const c: Record<string, number> = {}; for (const x of w) c[x] = (c[x] ?? 0) + 1; if ([...t].every(x => { c[x] = (c[x] ?? 0) - 1; return true; }) && Object.values(c).every(() => true) && [...new Set(t)].every(x => (w.split(x).length - 1) >= t.split(x).length - 1)) if (!best || w.length < best.length) best = w; } return best; }, ['Track how many required characters are still missing.', 'When nothing is missing, shrink from the left.'], 'Expand to become valid, shrink while still valid.'),
  mk('Minimum Window Subsequence', 'minWindowSubsequence', 'Return the shortest contiguous substring of s that contains t as a subsequence ("" if none; leftmost on ties).', 'string minWindowSubsequence(string s, string t)', 'return "";', [
    ap('Forward match then backward shrink', 'O(n·m) worst case', 'O(1)', 'n2', 'For every end of a forward subsequence match, walk backwards to the tightest start; the restart point after each window avoids rescanning from scratch.', `string minWindowSubsequence(string s, string t) {
    int n = s.size();
    int m = t.size();
    int bestStart = -1;
    int bestLen = INT_MAX;
    int i = 0;
    while (i < n) {
        int j = 0;
        while (i < n) {
            if (s[i] == t[j]) {
                j++;
            }
            if (j == m) {
                break;
            }
            i++;
        }
        if (i == n) {
            break;
        }
        int end = i;
        j = m - 1;
        while (j >= 0) {
            if (s[i] == t[j]) {
                j--;
            }
            i--;
        }
        i++;
        if (end - i + 1 < bestLen) {
            bestLen = end - i + 1;
            bestStart = i;
        }
        i++;
    }
    if (bestStart == -1) {
        return "";
    }
    return s.substr(bestStart, bestLen);
}`)], [['abcdebdde', 'bde'], ['jmeqksfrsdcmsiwvaovztaqenprpvnbstl', 'u'], ['fgrqsqsnodwmxzkzxwqegkndaa', 'fnok'], ['abc', 'abc'], ['ab', 'ba']], (s: string, t: string) => { let best = ''; for (let i = 0; i < s.length; i++) { let j = 0, k = i; for (; k < s.length && j < t.length; k++) if (s[k] === t[j]) j++; if (j === t.length) { const w = s.slice(i, k); if (!best || w.length < best.length) best = w; } } return best; },
    ['Match t greedily forward, then shrink the start backwards.'], 'Forward match finds a valid end; a backward match finds the tightest start for it.'),
];
