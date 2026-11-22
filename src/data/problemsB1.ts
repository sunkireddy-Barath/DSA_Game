// Batch 1: Step 1 basics and patterns, recursive sorts, remaining array and binary-search problems.
import { Playable, ap, mk } from './kit';

const sortNum = (a: number[]) => [...a].sort((x, y) => x - y);
const rep = (c: string, n: number) => c.repeat(Math.max(0, n));
const range1 = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const L = (i: number) => String.fromCharCode(64 + i); // 1 -> 'A'

// ---------- patterns: [number, name, C++ body (inside vector<string> pattern(int n)), JS reference] ----------
const PATTERNS: [number, string, string, (n: number) => string[]][] = [
  [1, 'Solid Square', `for (int i = 0; i < n; i++) {
        string row = "";
        for (int j = 0; j < n; j++) row += '*';
        rows.push_back(row);
    }`, n => range1(n).map(() => rep('*', n))],
  [2, 'Right Triangle', `for (int i = 1; i <= n; i++) {
        string row = "";
        for (int j = 0; j < i; j++) row += '*';
        rows.push_back(row);
    }`, n => range1(n).map(i => rep('*', i))],
  [3, 'Number Triangle', `for (int i = 1; i <= n; i++) {
        string row = "";
        for (int j = 1; j <= i; j++) row += to_string(j);
        rows.push_back(row);
    }`, n => range1(n).map(i => range1(i).join(''))],
  [4, 'Repeated Number Triangle', `for (int i = 1; i <= n; i++) {
        string row = "";
        for (int j = 0; j < i; j++) row += to_string(i);
        rows.push_back(row);
    }`, n => range1(n).map(i => rep(String(i), i))],
  [5, 'Inverted Star Triangle', `for (int i = 0; i < n; i++) {
        string row = "";
        for (int j = 0; j < n - i; j++) row += '*';
        rows.push_back(row);
    }`, n => range1(n).map(i => rep('*', n - i + 1))],
  [6, 'Inverted Number Triangle', `for (int i = 0; i < n; i++) {
        string row = "";
        for (int j = 1; j <= n - i; j++) row += to_string(j);
        rows.push_back(row);
    }`, n => range1(n).map(i => range1(n - i + 1).join(''))],
  [7, 'Star Pyramid', `for (int i = 1; i <= n; i++) {
        string row = "";
        for (int j = 0; j < n - i; j++) row += ' ';
        for (int j = 0; j < 2 * i - 1; j++) row += '*';
        for (int j = 0; j < n - i; j++) row += ' ';
        rows.push_back(row);
    }`, n => range1(n).map(i => rep(' ', n - i) + rep('*', 2 * i - 1) + rep(' ', n - i))],
  [8, 'Inverted Star Pyramid', `for (int i = n; i >= 1; i--) {
        string row = "";
        for (int j = 0; j < n - i; j++) row += ' ';
        for (int j = 0; j < 2 * i - 1; j++) row += '*';
        for (int j = 0; j < n - i; j++) row += ' ';
        rows.push_back(row);
    }`, n => range1(n).reverse().map(i => rep(' ', n - i) + rep('*', 2 * i - 1) + rep(' ', n - i))],
  [9, 'Diamond Star', `for (int i = 1; i <= 2 * n; i++) {
        int k = i <= n ? i : 2 * n - i + 1;
        string row = "";
        for (int j = 0; j < n - k; j++) row += ' ';
        for (int j = 0; j < 2 * k - 1; j++) row += '*';
        for (int j = 0; j < n - k; j++) row += ' ';
        rows.push_back(row);
    }`, n => Array.from({ length: 2 * n }, (_, x) => { const i = x + 1, k = i <= n ? i : 2 * n - i + 1; return rep(' ', n - k) + rep('*', 2 * k - 1) + rep(' ', n - k); })],
  [10, 'Half Diamond Star', `for (int i = 1; i <= 2 * n - 1; i++) {
        int stars = i <= n ? i : 2 * n - i;
        string row = "";
        for (int j = 0; j < stars; j++) row += '*';
        rows.push_back(row);
    }`, n => Array.from({ length: 2 * n - 1 }, (_, x) => { const i = x + 1; return rep('*', i <= n ? i : 2 * n - i); })],
  [11, 'Binary Number Triangle', `for (int i = 1; i <= n; i++) {
        int bit = i % 2;
        string row = "";
        for (int j = 0; j < i; j++) {
            row += to_string(bit);
            bit = 1 - bit;
        }
        rows.push_back(row);
    }`, n => range1(n).map(i => { let b = i % 2, r = ''; for (let j = 0; j < i; j++) { r += b; b = 1 - b; } return r; })],
  [12, 'Number Crown', `for (int i = 1; i <= n; i++) {
        string row = "";
        for (int j = 1; j <= i; j++) row += to_string(j);
        for (int j = 0; j < 2 * (n - i); j++) row += ' ';
        for (int j = i; j >= 1; j--) row += to_string(j);
        rows.push_back(row);
    }`, n => range1(n).map(i => range1(i).join('') + rep(' ', 2 * (n - i)) + range1(i).reverse().join(''))],
  [13, 'Increasing Number Triangle', `int counter = 1;
    for (int i = 1; i <= n; i++) {
        string row = "";
        for (int j = 0; j < i; j++) {
            if (j > 0) row += ' ';
            row += to_string(counter);
            counter++;
        }
        rows.push_back(row);
    }`, n => { let c = 1; return range1(n).map(i => Array.from({ length: i }, () => c++).join(' ')); }],
  [14, 'Increasing Letter Triangle', `for (int i = 1; i <= n; i++) {
        string row = "";
        for (int j = 0; j < i; j++) row += (char)('A' + j);
        rows.push_back(row);
    }`, n => range1(n).map(i => range1(i).map(L).join(''))],
  [15, 'Reverse Letter Triangle', `for (int i = 1; i <= n; i++) {
        string row = "";
        for (int j = 0; j < n - i + 1; j++) row += (char)('A' + j);
        rows.push_back(row);
    }`, n => range1(n).map(i => range1(n - i + 1).map(L).join(''))],
  [16, 'Alpha-Ramp', `for (int i = 1; i <= n; i++) {
        string row = "";
        for (int j = 0; j < i; j++) row += (char)('A' + i - 1);
        rows.push_back(row);
    }`, n => range1(n).map(i => rep(L(i), i))],
  [17, 'Alpha-Hill', `for (int i = 1; i <= n; i++) {
        string row = "";
        for (int j = 0; j < n - i; j++) row += ' ';
        for (int j = 0; j < i; j++) row += (char)('A' + j);
        for (int j = i - 2; j >= 0; j--) row += (char)('A' + j);
        for (int j = 0; j < n - i; j++) row += ' ';
        rows.push_back(row);
    }`, n => range1(n).map(i => rep(' ', n - i) + range1(i).map(L).join('') + range1(i - 1).reverse().map(L).join('') + rep(' ', n - i))],
  [18, 'Alpha-Triangle', `for (int i = 1; i <= n; i++) {
        string row = "";
        for (int j = n - i; j < n; j++) row += (char)('A' + j);
        rows.push_back(row);
    }`, n => range1(n).map(i => Array.from({ length: i }, (_, k) => L(n - i + k + 1)).join(''))],
  [19, 'Symmetric-Void', `for (int i = 1; i <= n; i++) {
        string row = "";
        for (int j = 0; j < n - i + 1; j++) row += '*';
        for (int j = 0; j < 2 * (i - 1); j++) row += ' ';
        for (int j = 0; j < n - i + 1; j++) row += '*';
        rows.push_back(row);
    }
    for (int i = 1; i <= n; i++) {
        string row = "";
        for (int j = 0; j < i; j++) row += '*';
        for (int j = 0; j < 2 * (n - i); j++) row += ' ';
        for (int j = 0; j < i; j++) row += '*';
        rows.push_back(row);
    }`, n => [...range1(n).map(i => rep('*', n - i + 1) + rep(' ', 2 * (i - 1)) + rep('*', n - i + 1)), ...range1(n).map(i => rep('*', i) + rep(' ', 2 * (n - i)) + rep('*', i))]],
  [20, 'Symmetric-Butterfly', `for (int i = 1; i <= 2 * n - 1; i++) {
        int k = i <= n ? i : 2 * n - i;
        string row = "";
        for (int j = 0; j < k; j++) row += '*';
        for (int j = 0; j < 2 * (n - k); j++) row += ' ';
        for (int j = 0; j < k; j++) row += '*';
        rows.push_back(row);
    }`, n => Array.from({ length: 2 * n - 1 }, (_, x) => { const i = x + 1, k = i <= n ? i : 2 * n - i; return rep('*', k) + rep(' ', 2 * (n - k)) + rep('*', k); })],
  [21, 'Hollow Rectangle', `for (int i = 0; i < n; i++) {
        string row = "";
        for (int j = 0; j < n; j++) {
            if (i == 0 || i == n - 1 || j == 0 || j == n - 1) row += '*';
            else row += ' ';
        }
        rows.push_back(row);
    }`, n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === 0 || i === n - 1 || j === 0 || j === n - 1 ? '*' : ' ')).join(''))],
  [22, 'The Number Pattern', `for (int i = 0; i < 2 * n - 1; i++) {
        string row = "";
        for (int j = 0; j < 2 * n - 1; j++) {
            int distance = min(min(i, j), min(2 * n - 2 - i, 2 * n - 2 - j));
            row += to_string(n - distance);
        }
        rows.push_back(row);
    }`, n => Array.from({ length: 2 * n - 1 }, (_, i) => Array.from({ length: 2 * n - 1 }, (_, j) => n - Math.min(i, j, 2 * n - 2 - i, 2 * n - 2 - j)).join(''))],
];
const patternProblems: Playable[] = PATTERNS.map(([k, name, body, ref]) => mk(`Pattern ${k}: ${name}`, 'pattern', `Return the rows of the pattern for n = ${'n'} as a vector of strings (spaces are part of the rows).`, 'vector<string> pattern(int n)', 'return {};', [
  ap('Nested loops', 'O(n²)', 'O(n²)', 'n2', 'The outer loop produces one row per iteration and the inner loops print at most O(n) characters per row, so about n² characters in total. The output itself needs that much space.', `vector<string> pattern(int n) {
    vector<string> rows;
    ${body}
    return rows;
}`)], [[1], [2], [3], [4], [5]], ref,
  ['Work out, for row i, how many spaces and how many symbols you need.', 'Use one inner loop per kind of symbol.'], 'Every pattern is rows × columns: describe each row with a formula in the row number.', { defaultArgs: [4] }));

export const B1_PROBLEMS: Playable[] = [
  // ---------- Things to know in C++ ----------
  mk('User Input / Output', 'greet', 'Build the sentence "Hello, NAME! You are AGE years old." (this is what cout would print).', 'string greet(string name, int age)', 'return "";', [
    ap('String concatenation', 'O(L)', 'O(L)', 'n', 'Building the answer copies each piece once (L = total length).', `string greet(string name, int age) {
    string message = "Hello, " + name + "! You are " + to_string(age) + " years old.";
    return message;
}`)], [['Arun', 21], ['Bala', 7], ['X', 100]], (n: string, a: number) => `Hello, ${n}! You are ${a} years old.`, ['Convert the number with to_string.', 'Join the pieces with +.'], 'Output formatting is string building: cout simply writes the finished string.'),
  mk('Data Types', 'multiply', 'Return {a*b computed as int, a*b computed as long long}. Observe 32-bit overflow.', 'vector<long long> multiply(int a, int b)', 'return {};', [
    ap('int vs long long', 'O(1)', 'O(1)', '1', 'Two multiplications: narrowing to int wraps modulo 2³² when the product does not fit (a plain int * int that overflows is undefined behaviour in C++, so the product is computed in 64 bits and then narrowed), the long long one holds up to about 9.2×10¹⁸.', `vector<long long> multiply(int a, int b) {
    int small = (int)((long long)a * b);
    long long big = (long long)a * b;
    return {small, big};
}`)], [[6, 7], [100000, 100000], [-50000, 50000], [65536, 65536]], (a: number, b: number) => [Number(BigInt.asIntN(32, BigInt(a) * BigInt(b))), a * b], ['int is 32 bits. What happens to 10^10?', 'Cast one operand to long long before multiplying.'], 'The width of the type decides when arithmetic overflows; cast before the operation, not after.'),
  mk('If Else statements', 'classify', 'Return "Distinction" for marks >= 75, "First Class" for >= 60, "Pass" for >= 40, otherwise "Fail".', 'string classify(int marks)', 'return "";', [
    ap('if / else-if ladder', 'O(1)', 'O(1)', '1', 'At most three comparisons are evaluated, whatever the input.', `string classify(int marks) {
    if (marks >= 75) {
        return "Distinction";
    } else if (marks >= 60) {
        return "First Class";
    } else if (marks >= 40) {
        return "Pass";
    } else {
        return "Fail";
    }
}`)], [[90], [75], [74], [60], [40], [39], [0]], (m: number) => (m >= 75 ? 'Distinction' : m >= 60 ? 'First Class' : m >= 40 ? 'Pass' : 'Fail'), ['Check the highest threshold first.'], 'Conditions are tested top to bottom; the first true branch wins.'),
  mk('Switch Statement', 'calculate', 'Apply the operator (+ - * /) to a and b; return 0 for division by zero and -1 for an unknown operator.', 'int calculate(int a, char op, int b)', 'return 0;', [
    ap('switch on the operator', 'O(1)', 'O(1)', '1', 'A switch jumps directly to the matching case (a jump table or a few comparisons).', `int calculate(int a, char op, int b) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/':
            if (b == 0) {
                return 0;
            }
            return a / b;
        default:
            return -1;
    }
}`)], [[6, '+', 3], [6, '-', 9], [6, '*', 7], [7, '/', 2], [5, '/', 0], [1, '%', 1]], (a: number, op: string, b: number) => (op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : op === '/' ? (b === 0 ? 0 : Math.trunc(a / b)) : -1), ['Each operator is one case.', 'Do not forget break/return, or execution falls through.'], 'A switch selects one of many branches by comparing one value with constants.'),
  mk('What are arrays, strings?', 'basics', 'Return {a.size(), a[0], last element of a, sum of a, s.size(), number of vowels in s}.', 'vector<int> basics(vector<int>& a, string s)', 'return {};', [
    ap('One pass over each', 'O(n + m)', 'O(1)', 'n', 'Arrays and strings are contiguous: size and indexing are O(1); the sum and vowel count each need one pass.', `vector<int> basics(vector<int>& a, string s) {
    int sum = 0;
    for (int i = 0; i < a.size(); i++) {
        sum += a[i];
    }
    int vowels = 0;
    for (int i = 0; i < s.size(); i++) {
        char c = tolower(s[i]);
        if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') {
            vowels++;
        }
    }
    return {(int)a.size(), a[0], a[a.size() - 1], sum, (int)s.size(), vowels};
}`)], [[[4, 8, 15], 'Education'], [[7], 'rhythm'], [[1, 2, 3, 4], 'AEIOU']], (a: number[], s: string) => [a.length, a[0], a[a.length - 1], a.reduce((x, y) => x + y, 0), s.length, [...s.toLowerCase()].filter(c => 'aeiou'.includes(c)).length], ['Index 0 is the first element, size()-1 the last.', 'A string is an array of chars.'], 'Both are contiguous sequences indexed from 0.'),
  mk('For loops', 'sumOfOdds', 'Return the sum of all odd numbers from 1 to n.', 'int sumOfOdds(int n)', 'return 0;', [
    ap('Loop with step 2', 'O(n)', 'O(1)', 'n', 'About n/2 iterations, each adding one term.', `int sumOfOdds(int n) {
    int sum = 0;
    for (int i = 1; i <= n; i += 2) {
        sum += i;
    }
    return sum;
}`), ap('Closed form', 'O(1)', 'O(1)', '1', 'The sum of the first k odd numbers is k², with k = (n+1)/2.', `int sumOfOdds(int n) {
    int k = (n + 1) / 2;
    return k * k;
}`)], [[1], [5], [10], [11], [0]], (n: number) => { let s = 0; for (let i = 1; i <= n; i += 2) s += i; return s; }, ['Start at 1 and step by 2.'], 'A for loop = initialisation, condition, update.'),
  mk('While loops', 'collatzSteps', 'Count the steps for n to reach 1: if n is even halve it, otherwise n = 3n + 1.', 'int collatzSteps(int n)', 'return 0;', [
    ap('While loop', 'O(steps)', 'O(1)', 'n', 'The loop runs once per step; no one has proved a bound for all n, but it is short in practice.', `int collatzSteps(int n) {
    int steps = 0;
    while (n != 1) {
        if (n % 2 == 0) {
            n = n / 2;
        } else {
            n = 3 * n + 1;
        }
        steps++;
    }
    return steps;
}`)], [[1], [2], [3], [6], [7], [27]], (n: number) => { let s = 0; while (n !== 1) { n = n % 2 === 0 ? n / 2 : 3 * n + 1; s++; } return s; }, ['Loop while n != 1.'], 'Use a while loop when the number of iterations is not known in advance.'),
  mk('Functions (Pass by Reference and Value)', 'demo', 'Swap two values with a by-value function and a by-reference function; return {a, b, c, d} after both attempts.', 'vector<int> demo(int x, int y)', 'return {};', [
    ap('Value vs reference', 'O(1)', 'O(1)', '1', 'A by-value parameter is a copy, so swapping it changes nothing outside; a reference parameter aliases the caller\'s variable.', `void byValue(int a, int b) {
    int t = a;
    a = b;
    b = t;
}

void byReference(int& a, int& b) {
    int t = a;
    a = b;
    b = t;
}

vector<int> demo(int x, int y) {
    int a = x;
    int b = y;
    byValue(a, b);
    int c = x;
    int d = y;
    byReference(c, d);
    return {a, b, c, d};
}`)], [[1, 2], [10, -5], [7, 7]], (x: number, y: number) => [x, y, y, x], ['Watch the call stack frames: which variables does each function change?'], 'References let a function modify the caller\'s variable; copies do not.'),
  mk('Time and Space Complexity', 'countPairs', 'Count pairs (i, j) with 0 <= i < j < n.', 'int countPairs(int n)', 'return 0;', [
    ap('Brute force: nested loops', 'O(n²)', 'O(1)', 'n2', 'The inner loop runs n-1, n-2, … 0 times: n(n-1)/2 iterations in total.', `int countPairs(int n) {
    int count = 0;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            count++;
        }
    }
    return count;
}`), ap('Formula', 'O(1)', 'O(1)', '1', 'Counting pairs is n choose 2 = n(n-1)/2: a constant number of operations.', `int countPairs(int n) {
    return n * (n - 1) / 2;
}`)], [[0], [1], [2], [5], [10], [50]], (n: number) => (n * (n - 1)) / 2 || 0, ['Watch the "operations" counter in the Complexity Lab as n grows.'], 'Counting by loops costs time proportional to the count; a formula costs constant time.'),
  mk('Learn C++ STL', 'stlTour', 'Return {sum, max, min, index of the first element >= 5 in the sorted array, number of distinct values}.', 'vector<int> stlTour(vector<int>& v)', 'return {};', [
    ap('accumulate, max/min_element, sort, lower_bound, unique', 'O(n log n)', 'O(1)', 'nlogn', 'The linear algorithms cost O(n); sorting dominates at O(n log n); lower_bound is O(log n).', `vector<int> stlTour(vector<int>& v) {
    int total = accumulate(v.begin(), v.end(), 0);
    int biggest = *max_element(v.begin(), v.end());
    int smallest = *min_element(v.begin(), v.end());
    sort(v.begin(), v.end());
    int firstFive = lower_bound(v.begin(), v.end(), 5) - v.begin();
    v.erase(unique(v.begin(), v.end()), v.end());
    return {total, biggest, smallest, firstFive, (int)v.size()};
}`)], [[[3, 9, 5, 3, 1]], [[5, 5, 5]], [[10, 2]], [[1]]], (v: number[]) => { const s = sortNum(v); let f = 0; while (f < s.length && s[f] < 5) f++; return [v.reduce((a, b) => a + b, 0), Math.max(...v), Math.min(...v), f, new Set(v).size]; }, ['STL algorithms take a pair of iterators: begin() and end().'], 'The standard library already implements most of the loops you would otherwise write.'),

  ...patternProblems,

  // ---------- basic recursion / hashing ----------
  mk('Print name N times using recursion', 'printName', 'Return a vector containing the name n times (what a recursive print would output).', 'vector<string> printName(string name, int n)', 'return {};', [
    ap('Recursion', 'O(n)', 'O(n)', 'n', 'n calls plus one for the base case; each call is on the stack until the base case returns.', `void go(int i, int n, string& name, vector<string>& out) {
    if (i > n) {
        return;
    }
    out.push_back(name);
    go(i + 1, n, name, out);
}

vector<string> printName(string name, int n) {
    vector<string> out;
    go(1, n, name, out);
    return out;
}`)], [['Arun', 3], ['Z', 1], ['Bala', 0], ['Q', 5]], (s: string, n: number) => Array(n).fill(s), ['Base case: i > n.', 'Do the work, then call with i + 1.'], 'Replace a loop by a function that calls itself with the next index.'),
  mk('Print 1 to N using recursion', 'printOneToN', 'Return 1, 2, ..., n using recursion.', 'vector<int> printOneToN(int n)', 'return {};', [
    ap('Recursion (backtrack to print in order)', 'O(n)', 'O(n)', 'n', 'One call per number; the stack holds n frames.', `void go(int i, int n, vector<int>& out) {
    if (i > n) {
        return;
    }
    out.push_back(i);
    go(i + 1, n, out);
}

vector<int> printOneToN(int n) {
    vector<int> out;
    go(1, n, out);
    return out;
}`)], [[5], [1], [0], [8]], (n: number) => range1(n), ['Count up from 1.'], 'Recursion walks forward with an index parameter.'),
  mk('Print N to 1 using recursion', 'printNToOne', 'Return n, n-1, ..., 1 using recursion.', 'vector<int> printNToOne(int n)', 'return {};', [
    ap('Recursion', 'O(n)', 'O(n)', 'n', 'One call per number; stack depth n.', `void go(int n, vector<int>& out) {
    if (n < 1) {
        return;
    }
    out.push_back(n);
    go(n - 1, out);
}

vector<int> printNToOne(int n) {
    vector<int> out;
    go(n, out);
    return out;
}`)], [[5], [1], [0], [8]], (n: number) => range1(n).reverse(), ['Record the current number before recursing.'], 'Recording before the recursive call gives descending order; after it gives ascending.'),
  mk('Find the highest/lowest frequency element', 'extremeFrequency', 'Return {most frequent value, least frequent value}; ties are broken by the smaller value.', 'vector<int> extremeFrequency(vector<int>& nums)', 'return {};', [
    ap('Frequency map', 'O(n log d)', 'O(d)', 'nlogn', 'Counting costs O(log d) per element in an ordered map (d = distinct values); scanning the map is O(d).', `vector<int> extremeFrequency(vector<int>& nums) {
    map<int, int> freq;
    for (int i = 0; i < nums.size(); i++) {
        freq[nums[i]]++;
    }
    int mostValue = 0;
    int mostCount = 0;
    int leastValue = 0;
    int leastCount = INT_MAX;
    for (auto& [value, count] : freq) {
        if (count > mostCount) {
            mostCount = count;
            mostValue = value;
        }
        if (count < leastCount) {
            leastCount = count;
            leastValue = value;
        }
    }
    return {mostValue, leastValue};
}`)], [[[10, 5, 10, 15, 10, 5]], [[1, 2, 3]], [[4, 4, 4, 9]], [[2, 2, 1, 1, 3]]], (a: number[]) => { const m = new Map<number, number>(); a.forEach(x => m.set(x, (m.get(x) ?? 0) + 1)); const keys = [...m.keys()].sort((x, y) => x - y); let most = keys[0], least = keys[0]; for (const k of keys) { if (m.get(k)! > m.get(most)!) most = k; if (m.get(k)! < m.get(least)!) least = k; } return [most, least]; }, ['Count with a map; then scan the map.', 'A sorted map visits smaller keys first, so strict comparisons keep the smaller value on ties.'], 'Hashing turns "how often?" into a lookup.'),

  // ---------- Sorting II ----------
  { ...mk('Recursive Bubble Sort', 'recursiveBubbleSort', 'Sort nums in place using a recursive bubble sort.', 'void recursiveBubbleSort(vector<int>& nums)', '', [
    ap('Recursive passes', 'O(n²)', 'O(n)', 'n2', 'Each call does one pass of up to n-1 comparisons and recurses on n-1 elements: n(n-1)/2 comparisons; the recursion is n deep.', `void pass(vector<int>& a, int n) {
    if (n == 1) {
        return;
    }
    for (int j = 0; j < n - 1; j++) {
        if (a[j] > a[j + 1]) {
            swap(a[j], a[j + 1]);
        }
    }
    pass(a, n - 1);
}

void recursiveBubbleSort(vector<int>& nums) {
    pass(nums, nums.size());
}`)], [[[5, 2, 4, 1]], [[1]], [[3, 2, 1]], [[1, 2, 3]], [[2, 2, 1]]], (a: number[]) => sortNum(a), ['After one pass the largest element is in place.', 'Recurse on the first n-1 elements.'], 'The loop over passes becomes recursion on a shorter array.'), checkArg: 0 },
  { ...mk('Recursive Insertion Sort', 'recursiveInsertionSort', 'Sort nums in place using a recursive insertion sort.', 'void recursiveInsertionSort(vector<int>& nums)', '', [
    ap('Sort prefix, insert last', 'O(n²)', 'O(n)', 'n2', 'Sorting the first n-1 elements recursively, then inserting the n-th costs up to n shifts: n(n-1)/2 in total; recursion depth n.', `void insertLast(vector<int>& a, int n) {
    int key = a[n - 1];
    int j = n - 2;
    while (j >= 0 && a[j] > key) {
        a[j + 1] = a[j];
        j--;
    }
    a[j + 1] = key;
}

void go(vector<int>& a, int n) {
    if (n <= 1) {
        return;
    }
    go(a, n - 1);
    insertLast(a, n);
}

void recursiveInsertionSort(vector<int>& nums) {
    go(nums, nums.size());
}`)], [[[5, 2, 4, 1]], [[1]], [[3, 2, 1]], [[1, 2, 3]], [[2, 2, 1]]], (a: number[]) => sortNum(a), ['Assume the first n-1 elements are already sorted.'], 'Insertion sort is naturally recursive: sorted prefix + insert one element.'), checkArg: 0 },

  // ---------- arrays ----------
  mk('Print subarray with maximum subarray sum', 'maxSubarrayRange', 'Return {start, end} (inclusive) of the first subarray with the maximum sum.', 'vector<int> maxSubarrayRange(vector<int>& nums)', 'return {};', [
    ap('Brute force', 'O(n²)', 'O(1)', 'n2', 'Every (start, end) pair is tried with a running sum: n(n+1)/2 additions.', `vector<int> maxSubarrayRange(vector<int>& nums) {
    int best = nums[0];
    int bestStart = 0;
    int bestEnd = 0;
    for (int i = 0; i < nums.size(); i++) {
        int sum = 0;
        for (int j = i; j < nums.size(); j++) {
            sum += nums[j];
            if (sum > best) {
                best = sum;
                bestStart = i;
                bestEnd = j;
            }
        }
    }
    return {bestStart, bestEnd};
}`), ap("Kadane's with start tracking", 'O(n)', 'O(1)', 'n', 'One pass; the start index is reset whenever the running sum becomes negative.', `vector<int> maxSubarrayRange(vector<int>& nums) {
    int best = nums[0];
    int current = nums[0];
    int start = 0;
    int bestStart = 0;
    int bestEnd = 0;
    for (int i = 1; i < nums.size(); i++) {
        if (current < 0) {
            current = nums[i];
            start = i;
        } else {
            current += nums[i];
        }
        if (current > best) {
            best = current;
            bestStart = start;
            bestEnd = i;
        }
    }
    return {bestStart, bestEnd};
}`)], [[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], [[5, 4, -1, 7, 8]], [[-3, -1, -2]], [[1]], [[-1, 2, -2, 2]], [[2, -1, 2]]], (a: number[]) => { let b = a[0], s = 0, e = 0; for (let i = 0; i < a.length; i++) { let t = 0; for (let j = i; j < a.length; j++) { t += a[j]; if (t > b) { b = t; s = i; e = j; } } } return [s, e]; },
    ['Kadane also needs to remember where the current run began.', 'Reset the start when the running sum is negative.'], 'The best subarray ending at i either starts fresh at i or extends the previous one.'),
  mk('4 Sum', 'fourSum', 'Return all unique quadruplets that sum to target.', 'vector<vector<int>> fourSum(vector<int>& nums, int target)', 'return {};', [
    ap('Sort + two pointers', 'O(n³)', 'O(1)', 'n2', 'Two nested loops fix the first two numbers (n²) and a two-pointer sweep finds the rest in O(n): O(n³). Duplicate skipping keeps results unique.', `vector<vector<int>> fourSum(vector<int>& nums, int target) {
    vector<vector<int>> result;
    sort(nums.begin(), nums.end());
    int n = nums.size();
    for (int i = 0; i < n; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) {
            continue;
        }
        for (int j = i + 1; j < n; j++) {
            if (j > i + 1 && nums[j] == nums[j - 1]) {
                continue;
            }
            int left = j + 1;
            int right = n - 1;
            while (left < right) {
                long long sum = (long long)nums[i] + nums[j] + nums[left] + nums[right];
                if (sum < target) {
                    left++;
                } else if (sum > target) {
                    right--;
                } else {
                    result.push_back({nums[i], nums[j], nums[left], nums[right]});
                    left++;
                    right--;
                    while (left < right && nums[left] == nums[left - 1]) {
                        left++;
                    }
                }
            }
        }
    }
    return result;
}`)], [[[1, 0, -1, 0, -2, 2], 0], [[2, 2, 2, 2, 2], 8], [[1, 2, 3, 4], 100], [[-3, -1, 0, 2, 4, 5], 2]], (a: number[], t: number) => { const b = sortNum(a), out: number[][] = [], seen = new Set<string>(); for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) for (let k = j + 1; k < b.length; k++) for (let l = k + 1; l < b.length; l++) if (b[i] + b[j] + b[k] + b[l] === t) { const key = [b[i], b[j], b[k], b[l]].join(','); if (!seen.has(key)) { seen.add(key); out.push([b[i], b[j], b[k], b[l]]); } } return out; },
    ['Extend 3-Sum: fix two numbers, then use two pointers.', 'Use long long for the sum to avoid overflow.'], 'Sorting makes the last two choices a converging-pointer problem.', { unordered: true }),
  mk('Merge Overlapping Sub-intervals', 'mergeIntervals', 'Merge all overlapping intervals and return the merged list sorted by start.', 'vector<vector<int>> mergeIntervals(vector<vector<int>>& intervals)', 'return {};', [
    ap('Sort + sweep', 'O(n log n)', 'O(n)', 'nlogn', 'Sorting dominates; the sweep looks at each interval once and either extends the last merged interval or starts a new one.', `vector<vector<int>> mergeIntervals(vector<vector<int>>& intervals) {
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
}`)], [[[[1, 3], [2, 6], [8, 10], [15, 18]]], [[[1, 4], [4, 5]]], [[[1, 4], [0, 4]]], [[[5, 7]]], [[[1, 10], [2, 3], [4, 5]]]], (iv: number[][]) => { const s = [...iv].sort((a, b) => a[0] - b[0] || a[1] - b[1]); const m: number[][] = []; for (const x of s) { if (!m.length || m[m.length - 1][1] < x[0]) m.push([...x]); else m[m.length - 1][1] = Math.max(m[m.length - 1][1], x[1]); } return m; },
    ['Sort by start first.', 'Overlap means the next start <= the current merged end.'], 'After sorting, overlapping intervals are adjacent.'),
  mk('Merge two sorted arrays without extra space', 'mergeInPlace', 'Merge sorted a and b in place so that a holds the smallest m values and b the largest n values (both sorted). Return a followed by b.', 'vector<int> mergeInPlace(vector<int>& a, vector<int>& b)', 'return {};', [
    ap('Gap method (Shell sort idea)', 'O((m+n) log(m+n))', 'O(1)', 'nlogn', 'The gap halves each round (log(m+n) rounds) and each round compares O(m+n) pairs across the two arrays; no extra array is used.', `void swapIfGreater(vector<int>& a, vector<int>& b, int i, int j) {
    int m = a.size();
    int x = i < m ? a[i] : b[i - m];
    int y = j < m ? a[j] : b[j - m];
    if (x > y) {
        if (i < m) {
            a[i] = y;
        } else {
            b[i - m] = y;
        }
        if (j < m) {
            a[j] = x;
        } else {
            b[j - m] = x;
        }
    }
}

vector<int> mergeInPlace(vector<int>& a, vector<int>& b) {
    int total = a.size() + b.size();
    int gap = (total + 1) / 2;
    while (gap > 0) {
        for (int i = 0; i + gap < total; i++) {
            swapIfGreater(a, b, i, i + gap);
        }
        if (gap == 1) {
            break;
        }
        gap = (gap + 1) / 2;
    }
    vector<int> all = a;
    for (int i = 0; i < b.size(); i++) {
        all.push_back(b[i]);
    }
    return all;
}`)], [[[1, 4, 8, 10], [2, 3, 9]], [[1, 3, 5], [2, 4, 6]], [[5], [1]], [[1, 2], [3, 4]], [[2, 2], [2, 2]]], (a: number[], b: number[]) => sortNum([...a, ...b]),
    ['Treat both arrays as one array of length m+n.', 'Compare elements a "gap" apart and shrink the gap.'], 'Gap sorting compares far-apart pairs first, then gradually closer ones.'),
  mk('Count Inversions', 'countInversions', 'Count pairs (i < j) with nums[i] > nums[j].', 'long long countInversions(vector<int>& nums)', 'return 0;', [
    ap('Brute force', 'O(n²)', 'O(1)', 'n2', 'All n(n-1)/2 pairs are compared.', `long long countInversions(vector<int>& nums) {
    long long count = 0;
    for (int i = 0; i < nums.size(); i++) {
        for (int j = i + 1; j < nums.size(); j++) {
            if (nums[i] > nums[j]) {
                count++;
            }
        }
    }
    return count;
}`), ap('Merge sort counting', 'O(n log n)', 'O(n)', 'nlogn', 'During each merge, whenever a right-half element jumps ahead of the remaining left elements, it forms (mid - i + 1) inversions at once. log n levels of O(n) work; the temp buffer is O(n).', `long long mergeCount(vector<int>& a, int low, int mid, int high) {
    vector<int> temp;
    int i = low;
    int j = mid + 1;
    long long count = 0;
    while (i <= mid && j <= high) {
        if (a[i] <= a[j]) {
            temp.push_back(a[i]);
            i++;
        } else {
            temp.push_back(a[j]);
            count += mid - i + 1;
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
    return count;
}

long long sortCount(vector<int>& a, int low, int high) {
    if (low >= high) {
        return 0;
    }
    int mid = low + (high - low) / 2;
    long long count = sortCount(a, low, mid) + sortCount(a, mid + 1, high);
    count += mergeCount(a, low, mid, high);
    return count;
}

long long countInversions(vector<int>& nums) {
    return sortCount(nums, 0, nums.size() - 1);
}`)], [[[5, 3, 2, 4, 1]], [[1, 2, 3]], [[3, 2, 1]], [[2, 4, 1, 3, 5]], [[1]], [[2, 2, 1]]], (a: number[]) => { let c = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) c++; return c; },
    ['Merge sort already compares elements across halves.', 'Count how many left elements are larger when a right element is taken.'], 'Both halves are sorted, so one comparison counts a whole block of inversions.'),
  mk('Reverse Pairs', 'reversePairs', 'Count pairs (i < j) with nums[i] > 2 * nums[j].', 'long long reversePairs(vector<int>& nums)', 'return 0;', [
    ap('Brute force', 'O(n²)', 'O(1)', 'n2', 'All pairs are checked (with long long arithmetic).', `long long reversePairs(vector<int>& nums) {
    long long count = 0;
    for (int i = 0; i < nums.size(); i++) {
        for (int j = i + 1; j < nums.size(); j++) {
            if ((long long)nums[i] > 2LL * nums[j]) {
                count++;
            }
        }
    }
    return count;
}`), ap('Merge sort counting', 'O(n log n)', 'O(n)', 'nlogn', 'Before merging two sorted halves, a two-pointer sweep counts the qualifying pairs in O(n); then they are merged. log n levels.', `long long countPairs(vector<int>& a, int low, int mid, int high) {
    long long count = 0;
    int j = mid + 1;
    for (int i = low; i <= mid; i++) {
        while (j <= high && (long long)a[i] > 2LL * a[j]) {
            j++;
        }
        count += j - (mid + 1);
    }
    return count;
}

void mergeHalves(vector<int>& a, int low, int mid, int high) {
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

long long sortCount(vector<int>& a, int low, int high) {
    if (low >= high) {
        return 0;
    }
    int mid = low + (high - low) / 2;
    long long count = sortCount(a, low, mid) + sortCount(a, mid + 1, high);
    count += countPairs(a, low, mid, high);
    mergeHalves(a, low, mid, high);
    return count;
}

long long reversePairs(vector<int>& nums) {
    return sortCount(nums, 0, nums.size() - 1);
}`)], [[[1, 3, 2, 3, 1]], [[2, 4, 3, 5, 1]], [[1]], [[5, 4, 3, 2, 1]], [[2147483647, 2147483647, 2147483647]]], (a: number[]) => { let c = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > 2 * a[j]) c++; return c; },
    ['Count first, then merge: both halves are sorted when you count.', 'Use long long for 2 * nums[j].'], 'Sorted halves let a moving pointer count all qualifying pairs for each left element.'),

  // ---------- binary search ----------
  mk('Floor/Ceil in Sorted Array', 'floorCeil', 'Return {floor, ceil} of x in a sorted array (-1 if it does not exist). floor = largest <= x, ceil = smallest >= x.', 'vector<int> floorCeil(vector<int>& a, int x)', 'return {-1, -1};', [
    ap('Two binary searches', 'O(log n)', 'O(1)', 'logn', 'Each search halves the range; floor and ceil are independent.', `vector<int> floorCeil(vector<int>& a, int x) {
    int floorValue = -1;
    int ceilValue = -1;
    int low = 0;
    int high = a.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (a[mid] <= x) {
            floorValue = a[mid];
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    low = 0;
    high = a.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (a[mid] >= x) {
            ceilValue = a[mid];
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return {floorValue, ceilValue};
}`)], [[[3, 4, 4, 7, 8, 10], 5], [[3, 4, 4, 7, 8, 10], 4], [[3, 4, 7], 1], [[3, 4, 7], 9], [[5], 5]], (a: number[], x: number) => { const f = a.filter(v => v <= x), c = a.filter(v => v >= x); return [f.length ? Math.max(...f) : -1, c.length ? Math.min(...c) : -1]; }, ['Remember a candidate every time you move.'], 'Binary search for the boundary and keep the last valid value seen.'),
  mk('Search in Rotated Sorted Array II', 'searchRotatedDup', 'Search target in a rotated sorted array that may contain duplicates; return true/false.', 'bool searchRotatedDup(vector<int>& nums, int target)', 'return false;', [
    ap('Binary search with duplicate shrinking', 'O(log n) average, O(n) worst', 'O(1)', 'logn', 'When nums[low] == nums[mid] == nums[high] we cannot tell which half is sorted and shrink both ends by one; in the worst case (all equal) that is linear.', `bool searchRotatedDup(vector<int>& nums, int target) {
    int low = 0;
    int high = nums.size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (nums[mid] == target) {
            return true;
        }
        if (nums[low] == nums[mid] && nums[mid] == nums[high]) {
            low++;
            high--;
        } else if (nums[low] <= nums[mid]) {
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
    return false;
}`)], [[[2, 5, 6, 0, 0, 1, 2], 0], [[2, 5, 6, 0, 0, 1, 2], 3], [[1, 0, 1, 1, 1], 0], [[1, 1, 1, 1], 2], [[3, 1], 1], [[1], 1]], (a: number[], t: number) => a.includes(t),
    ['Duplicates can hide which half is sorted.', 'If low, mid and high are all equal, shrink both ends.'], 'Duplicates remove the guarantee that one half is sorted, so we may have to peel them off.'),
  mk('Find the Nth root of an integer', 'nthRoot', 'Return the integer x with x^n == m, or -1 if it does not exist.', 'int nthRoot(int n, int m)', 'return -1;', [
    ap('Binary search on the root', 'O(log m · log n)', 'O(1)', 'logn', 'The candidate range [1, m] is halved log m times; each check computes a power in O(log n) by repeated squaring (capped to avoid overflow).', `long long power(long long base, int exp, long long limit) {
    long long result = 1;
    for (int i = 0; i < exp; i++) {
        result = result * base;
        if (result > limit) {
            return limit + 1;
        }
    }
    return result;
}

int nthRoot(int n, int m) {
    int low = 1;
    int high = m;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        long long p = power(mid, n, m);
        if (p == m) {
            return mid;
        } else if (p < m) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1;
}`)], [[3, 27], [4, 69], [2, 16], [1, 7], [5, 1], [3, 28], [2, 1000000]], (n: number, m: number) => { for (let x = 1; x <= m; x++) { const p = x ** n; if (p === m) return x; if (p > m) break; } return -1; },
    ['x^n grows monotonically with x.', 'Cap the power at m + 1 to avoid overflow.'], 'A monotone function can be inverted by binary search.'),
  mk('Minimum days to make M bouquets', 'minDays', 'bloomDay[i] is the day flower i blooms. Make m bouquets of k adjacent flowers; return the minimum day or -1.', 'int minDays(vector<int>& bloomDay, int m, int k)', 'return -1;', [
    ap('Binary search on the day', 'O(n log D)', 'O(1)', 'nlogn', 'The day range [min, max bloom day] is halved log D times; each feasibility check scans the n flowers once.', `bool canMake(vector<int>& bloomDay, int m, int k, int day) {
    int bouquets = 0;
    int run = 0;
    for (int i = 0; i < bloomDay.size(); i++) {
        if (bloomDay[i] <= day) {
            run++;
            if (run == k) {
                bouquets++;
                run = 0;
            }
        } else {
            run = 0;
        }
    }
    return bouquets >= m;
}

int minDays(vector<int>& bloomDay, int m, int k) {
    if ((long long)m * k > bloomDay.size()) {
        return -1;
    }
    int low = *min_element(bloomDay.begin(), bloomDay.end());
    int high = *max_element(bloomDay.begin(), bloomDay.end());
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (canMake(bloomDay, m, k, mid)) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}`)], [[[1, 10, 3, 10, 2], 3, 1], [[1, 10, 3, 10, 2], 3, 2], [[7, 7, 7, 7, 12, 7, 7], 2, 3], [[5], 1, 1], [[1, 2, 3], 2, 2]], (b: number[], m: number, k: number) => { if (m * k > b.length) return -1; for (const d of sortNum([...new Set(b)])) { let bq = 0, run = 0; for (const x of b) { if (x <= d) { if (++run === k) { bq++; run = 0; } } else run = 0; } if (bq >= m) return d; } return -1; },
    ['If day d works, any later day works.'], 'Binary search the answer; check feasibility with a greedy scan.'),
  mk('Find the smallest Divisor', 'smallestDivisor', 'Return the smallest divisor d such that the sum of ceil(nums[i]/d) is <= threshold.', 'int smallestDivisor(vector<int>& nums, int threshold)', 'return 1;', [
    ap('Binary search on the divisor', 'O(n log M)', 'O(1)', 'nlogn', 'The divisor range [1, max] is halved log M times; each check is one pass.', `int sumOfCeil(vector<int>& nums, int d) {
    int total = 0;
    for (int i = 0; i < nums.size(); i++) {
        total += (nums[i] + d - 1) / d;
    }
    return total;
}

int smallestDivisor(vector<int>& nums, int threshold) {
    int low = 1;
    int high = *max_element(nums.begin(), nums.end());
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (sumOfCeil(nums, mid) <= threshold) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}`)], [[[1, 2, 5, 9], 6], [[44, 22, 33, 11, 1], 5], [[19], 5], [[2, 3, 5, 7, 11], 11]], (a: number[], t: number) => { for (let d = 1; ; d++) if (a.reduce((s, x) => s + Math.ceil(x / d), 0) <= t) return d; },
    ['A bigger divisor gives a smaller sum.'], 'The sum is monotone decreasing in the divisor, so binary search it.'),
  mk('Split Array - Largest Sum', 'splitArray', 'Split nums into k non-empty contiguous parts to minimise the largest part sum.', 'int splitArray(vector<int>& nums, int k)', 'return 0;', [
    ap('Binary search on the largest sum', 'O(n log S)', 'O(1)', 'nlogn', 'The answer lies in [max element, total sum]; each feasibility check greedily counts parts in one pass.', `int partsNeeded(vector<int>& nums, int limit) {
    int parts = 1;
    int sum = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (sum + nums[i] > limit) {
            parts++;
            sum = 0;
        }
        sum += nums[i];
    }
    return parts;
}

int splitArray(vector<int>& nums, int k) {
    int low = *max_element(nums.begin(), nums.end());
    int high = accumulate(nums.begin(), nums.end(), 0);
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (partsNeeded(nums, mid) <= k) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}`)], [[[7, 2, 5, 10, 8], 2], [[1, 2, 3, 4, 5], 2], [[1, 4, 4], 3], [[5], 1], [[2, 3, 1, 2, 4, 3], 3]], (a: number[], k: number) => { for (let c = Math.max(...a); ; c++) { let u = 1, s = 0; for (const x of a) { if (s + x > c) { u++; s = 0; } s += x; } if (u <= k) return c; } },
    ['Same shape as Allocate Books.'], 'Minimise the maximum: binary search it and greedily test.'),
  mk("Painter's Partition", 'minTimePainters', 'k painters paint contiguous boards (board i takes boards[i] time). Return the minimum time to paint all boards.', 'int minTimePainters(vector<int>& boards, int k)', 'return 0;', [
    ap('Binary search on the time', 'O(n log S)', 'O(1)', 'nlogn', 'Identical to splitting an array: halve the time range, count painters needed greedily.', `int paintersNeeded(vector<int>& boards, int time) {
    int painters = 1;
    int load = 0;
    for (int i = 0; i < boards.size(); i++) {
        if (load + boards[i] > time) {
            painters++;
            load = 0;
        }
        load += boards[i];
    }
    return painters;
}

int minTimePainters(vector<int>& boards, int k) {
    int low = *max_element(boards.begin(), boards.end());
    int high = accumulate(boards.begin(), boards.end(), 0);
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (paintersNeeded(boards, mid) <= k) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}`)], [[[10, 20, 30, 40], 2], [[5, 5, 5, 5], 2], [[10, 20, 30], 1], [[1, 2, 3, 4, 5, 6], 3], [[7], 4]], (a: number[], k: number) => { for (let c = Math.max(...a); ; c++) { let u = 1, s = 0; for (const x of a) { if (s + x > c) { u++; s = 0; } s += x; } if (u <= k) return c; } },
    ['It is the book allocation problem again.'], 'Recognise the pattern: minimise the maximum partition.'),
  mk('Minimize Max Distance to Gas Station', 'minmaxGasDist', 'Stations are at the given sorted positions; add k more stations anywhere to minimise the largest gap between neighbours. Return that gap (to 1e-4).', 'double minmaxGasDist(vector<int>& stations, int k)', 'return 0;', [
    ap('Binary search on a real answer', 'O(n log(range/ε))', 'O(1)', 'nlogn', 'The gap length is a real number: 60 halvings reach well below 1e-6; each check counts how many stations each gap needs in one O(n) pass.', `int stationsNeeded(vector<int>& s, double gap) {
    int count = 0;
    for (int i = 1; i < s.size(); i++) {
        double section = s[i] - s[i - 1];
        int need = (int)(section / gap);
        if (need * gap >= section) {
            need--;
        }
        count += need;
    }
    return count;
}

double minmaxGasDist(vector<int>& stations, int k) {
    double low = 0;
    double high = 0;
    for (int i = 1; i < stations.size(); i++) {
        high = max(high, (double)(stations[i] - stations[i - 1]));
    }
    for (int iter = 0; iter < 60; iter++) {
        double mid = (low + high) / 2.0;
        if (stationsNeeded(stations, mid) <= k) {
            high = mid;
        } else {
            low = mid;
        }
    }
    return high;
}`)], [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 9], [[3, 6, 12, 19, 33, 44, 67, 72, 89, 95], 2], [[1, 13], 2], [[0, 10], 0]], (s: number[], k: number) => { const gaps = s.slice(1).map((v, i) => v - s[i]); const cnt = gaps.map(() => 0); for (let t = 0; t < k; t++) { let b = 0; for (let i = 1; i < gaps.length; i++) if (gaps[i] / (cnt[i] + 1) > gaps[b] / (cnt[b] + 1)) b = i; cnt[b]++; } return Math.max(...gaps.map((g, i) => g / (cnt[i] + 1))); }, ['The answer is a real number: binary search it with doubles.', 'For a candidate gap d, a section of length L needs ceil(L/d) - 1 new stations.'], 'Feasibility is monotone in d, so a real-valued binary search converges to the answer.', { tol: 1e-4 }),
  mk('Median of 2 sorted arrays', 'findMedianSortedArrays', 'Return the median of two sorted arrays in O(log(min(m, n))).', 'double findMedianSortedArrays(vector<int>& a, vector<int>& b)', 'return 0;', [
    ap('Merge and pick', 'O(m+n)', 'O(m+n)', 'n', 'Merging both arrays costs a pass over all elements and extra space for the merged array.', `double findMedianSortedArrays(vector<int>& a, vector<int>& b) {
    vector<int> all;
    int i = 0;
    int j = 0;
    while (i < a.size() || j < b.size()) {
        if (j == b.size() || (i < a.size() && a[i] <= b[j])) {
            all.push_back(a[i]);
            i++;
        } else {
            all.push_back(b[j]);
            j++;
        }
    }
    int n = all.size();
    if (n % 2 == 1) {
        return all[n / 2];
    }
    return (all[n / 2 - 1] + all[n / 2]) / 2.0;
}`), ap('Binary search on the partition', 'O(log(min(m,n)))', 'O(1)', 'logn', 'Binary search how many elements of the smaller array go to the left half; the right count follows. Each step halves the smaller array.', `double findMedianSortedArrays(vector<int>& a, vector<int>& b) {
    if (a.size() > b.size()) {
        return findMedianSortedArrays(b, a);
    }
    int n1 = a.size();
    int n2 = b.size();
    int low = 0;
    int high = n1;
    int leftSize = (n1 + n2 + 1) / 2;
    while (low <= high) {
        int mid1 = (low + high) / 2;
        int mid2 = leftSize - mid1;
        int l1 = INT_MIN;
        int l2 = INT_MIN;
        int r1 = INT_MAX;
        int r2 = INT_MAX;
        if (mid1 < n1) r1 = a[mid1];
        if (mid2 < n2) r2 = b[mid2];
        if (mid1 - 1 >= 0) l1 = a[mid1 - 1];
        if (mid2 - 1 >= 0) l2 = b[mid2 - 1];
        if (l1 <= r2 && l2 <= r1) {
            if ((n1 + n2) % 2 == 1) {
                return max(l1, l2);
            }
            return (max(l1, l2) + min(r1, r2)) / 2.0;
        } else if (l1 > r2) {
            high = mid1 - 1;
        } else {
            low = mid1 + 1;
        }
    }
    return 0;
}`)], [[[1, 3], [2]], [[1, 2], [3, 4]], [[0, 0], [0, 0]], [[], [1]], [[2], []], [[1, 3, 8, 9, 15], [7, 11, 18, 19, 21, 25]]], (a: number[], b: number[]) => { const s = sortNum([...a, ...b]); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; },
    ['The median splits all elements into equal halves.', 'Choose a cut in the smaller array; the other cut is determined.'], 'A correct cut has every left element <= every right element.', { tol: 1e-6 }),
  mk('K-th element of 2 sorted arrays', 'kthElement', 'Return the k-th (1-indexed) smallest element of the union of two sorted arrays.', 'int kthElement(vector<int>& a, vector<int>& b, int k)', 'return 0;', [
    ap('Binary search on the partition', 'O(log(min(m,n)))', 'O(1)', 'logn', 'Choose how many of the k left elements come from the smaller array; halve that range each step.', `int kthElement(vector<int>& a, vector<int>& b, int k) {
    if (a.size() > b.size()) {
        return kthElement(b, a, k);
    }
    int n1 = a.size();
    int n2 = b.size();
    int low = max(0, k - n2);
    int high = min(k, n1);
    while (low <= high) {
        int mid1 = (low + high) / 2;
        int mid2 = k - mid1;
        int l1 = INT_MIN;
        int l2 = INT_MIN;
        int r1 = INT_MAX;
        int r2 = INT_MAX;
        if (mid1 < n1) r1 = a[mid1];
        if (mid2 < n2) r2 = b[mid2];
        if (mid1 - 1 >= 0) l1 = a[mid1 - 1];
        if (mid2 - 1 >= 0) l2 = b[mid2 - 1];
        if (l1 <= r2 && l2 <= r1) {
            return max(l1, l2);
        } else if (l1 > r2) {
            high = mid1 - 1;
        } else {
            low = mid1 + 1;
        }
    }
    return 0;
}`)], [[[2, 3, 6, 7, 9], [1, 4, 8, 10], 5], [[100, 112, 256, 349, 770], [72, 86, 113, 119, 265, 445, 892], 7], [[1], [2], 2], [[], [5, 6], 1], [[1, 2, 3], [], 3]], (a: number[], b: number[], k: number) => sortNum([...a, ...b])[k - 1], ['Same idea as the median, with k left elements instead of half.'], 'The k smallest elements are some prefix of each array.'),
  mk('Search in a row and column wise sorted matrix', 'searchMatrixII', 'Rows and columns are sorted ascending. Return true if target exists.', 'bool searchMatrixII(vector<vector<int>>& matrix, int target)', 'return false;', [
    ap('Staircase from the top-right', 'O(m + n)', 'O(1)', 'n', 'Each comparison eliminates a whole row or column, so at most m + n steps.', `bool searchMatrixII(vector<vector<int>>& matrix, int target) {
    int row = 0;
    int col = matrix[0].size() - 1;
    while (row < matrix.size() && col >= 0) {
        if (matrix[row][col] == target) {
            return true;
        } else if (matrix[row][col] > target) {
            col--;
        } else {
            row++;
        }
    }
    return false;
}`)], [[[[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16], [10, 13, 14, 17]], 5], [[[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16], [10, 13, 14, 17]], 20], [[[1]], 1], [[[1, 2], [3, 4]], 0]], (m: number[][], t: number) => m.flat().includes(t), ['Start at a corner where one direction increases and the other decreases.'], 'The top-right element is the largest in its row and the smallest in its column.'),
  mk('Find Peak Element II', 'findPeakGrid', 'No two adjacent cells are equal. Return {row, col} of any cell strictly greater than its 4 neighbours (outside cells count as -1).', 'vector<int> findPeakGrid(vector<vector<int>>& mat)', 'return {-1, -1};', [
    ap('Binary search on columns', 'O(m log n)', 'O(1)', 'nlogn', 'Pick the middle column, find its maximum (O(m)), and move towards the larger horizontal neighbour; the column range halves each time.', `vector<int> findPeakGrid(vector<vector<int>>& mat) {
    int low = 0;
    int high = mat[0].size() - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
        int row = 0;
        for (int i = 0; i < mat.size(); i++) {
            if (mat[i][mid] > mat[row][mid]) {
                row = i;
            }
        }
        int left = mid - 1 >= 0 ? mat[row][mid - 1] : -1;
        int right = mid + 1 < mat[0].size() ? mat[row][mid + 1] : -1;
        if (mat[row][mid] > left && mat[row][mid] > right) {
            return {row, mid};
        } else if (left > mat[row][mid]) {
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return {-1, -1};
}`)], [[[[1, 4], [3, 2]]], [[[10, 20, 15], [21, 30, 14], [7, 16, 32]]], [[[5]]], [[[1, 2, 3, 4], [8, 7, 6, 5], [9, 10, 11, 12]]]], () => 'any valid peak', ['A column maximum has the best chance of being a peak.', 'Move towards the bigger horizontal neighbour.'], 'Following the uphill direction must reach a peak.', {
      check: (args: any[], got: number[]) => { const m: number[][] = args[0]; const [r, c] = got; if (!Array.isArray(got) || r < 0 || c < 0 || r >= m.length || c >= m[0].length) return false; const g = (i: number, j: number) => (i < 0 || j < 0 || i >= m.length || j >= m[0].length ? -1 : m[i][j]); return [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => m[r][c] > g(r + a, c + b)); } }),
  mk('Median of Row Wise Sorted Matrix', 'matrixMedian', 'Each row is sorted; the number of elements is odd. Return the median of the whole matrix.', 'int matrixMedian(vector<vector<int>>& matrix)', 'return 0;', [
    ap('Binary search on the value', 'O(m log n log(max-min))', 'O(1)', 'nlogn', 'Binary search the value range; for each candidate, upper_bound in every row counts elements <= it in O(m log n).', `int countSmallerOrEqual(vector<vector<int>>& m, int value) {
    int count = 0;
    for (int i = 0; i < m.size(); i++) {
        count += upper_bound(m[i].begin(), m[i].end(), value) - m[i].begin();
    }
    return count;
}

int matrixMedian(vector<vector<int>>& matrix) {
    int low = INT_MAX;
    int high = INT_MIN;
    for (int i = 0; i < matrix.size(); i++) {
        low = min(low, matrix[i][0]);
        high = max(high, matrix[i][matrix[i].size() - 1]);
    }
    int need = (matrix.size() * matrix[0].size()) / 2 + 1;
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (countSmallerOrEqual(matrix, mid) < need) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low;
}`)], [[[[1, 3, 5], [2, 6, 9], [3, 6, 9]]], [[[1, 3, 8], [2, 3, 4], [1, 2, 5]]], [[[1]]], [[[5, 7, 9]]]], (m: number[][]) => { const s = sortNum(m.flat()); return s[(s.length - 1) / 2]; }, ['The median is the smallest value with more than half the elements <= it.'], 'Counting elements <= x is monotone in x, so binary search the value.'),
];
