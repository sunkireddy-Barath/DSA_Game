import type { SqlJsStatic } from 'sql.js';
import { runIsolated } from './engine';

export interface Challenge {
  id: string; level: 1 | 2 | 3 | 4 | 5; topic: string; title: string; prompt: string;
  hints: string[]; solution: string;
  /** hand-computed from the seed data (independent of `solution`) */
  expected: any[][]; ordered: boolean;
}

export const CHALLENGES: Challenge[] = [
  { id: 'q01', level: 1, topic: 'SELECT', title: 'All student names', prompt: 'List the name of every student, in id order.', hints: ['SELECT picks columns, FROM picks the table.', 'Add ORDER BY id for a stable order.'],
    solution: 'SELECT name FROM Students ORDER BY id', expected: [['Arun'], ['Bala'], ['Charan'], ['Divya'], ['Esha'], ['Farhan']], ordered: true },
  { id: 'q02', level: 1, topic: 'WHERE', title: 'High scorers', prompt: 'Names of students with marks greater than 80, in id order.', hints: ['Filter rows with WHERE marks > 80.'],
    solution: 'SELECT name FROM Students WHERE marks > 80 ORDER BY id', expected: [['Arun'], ['Charan'], ['Divya'], ['Farhan']], ordered: true },
  { id: 'q03', level: 1, topic: 'BETWEEN', title: 'Marks in a range', prompt: 'Names of students whose marks are between 80 and 90 inclusive, in id order.', hints: ['BETWEEN is inclusive on both ends.'],
    solution: 'SELECT name FROM Students WHERE marks BETWEEN 80 AND 90 ORDER BY id', expected: [['Arun'], ['Charan'], ['Farhan']], ordered: true },
  { id: 'q04', level: 1, topic: 'LIKE', title: 'Names ending in "a"', prompt: 'Names that end with the letter a (any case), in id order.', hints: ["LIKE '%a' matches names ending in a. % means any characters."],
    solution: "SELECT name FROM Students WHERE name LIKE '%a' ORDER BY id", expected: [['Bala'], ['Divya'], ['Esha']], ordered: true },
  { id: 'q05', level: 1, topic: 'IS NULL', title: 'Students without a department', prompt: 'Names of students whose department_id is missing.', hints: ['NULL is not equal to anything, not even NULL: use IS NULL.'],
    solution: 'SELECT name FROM Students WHERE department_id IS NULL', expected: [['Esha']], ordered: false },
  { id: 'q06', level: 2, topic: 'ORDER BY / LIMIT', title: 'Top 3 scorers', prompt: 'The top 3 students by marks as (name, marks). Break ties by name A-Z.', hints: ['ORDER BY marks DESC, name', 'LIMIT 3'],
    solution: 'SELECT name, marks FROM Students ORDER BY marks DESC, name LIMIT 3', expected: [['Divya', 92], ['Arun', 90], ['Charan', 85]], ordered: true },
  { id: 'q07', level: 2, topic: 'DISTINCT', title: 'Distinct departments', prompt: 'How many different (non-NULL) department_id values appear in Students? Return one number.', hints: ['COUNT(DISTINCT column) ignores NULLs.'],
    solution: 'SELECT COUNT(DISTINCT department_id) FROM Students', expected: [[2]], ordered: false },
  { id: 'q08', level: 2, topic: 'GROUP BY', title: 'Students per department id', prompt: 'For each department_id (including NULL) return (department_id, student count), ordered by department_id.', hints: ['GROUP BY department_id', 'COUNT(*) counts rows in each group.'],
    solution: 'SELECT department_id, COUNT(*) FROM Students GROUP BY department_id ORDER BY department_id', expected: [[null, 1], [10, 3], [20, 2]], ordered: true },
  { id: 'q09', level: 2, topic: 'CASE', title: 'Grade bands', prompt: 'Return (name, grade) where grade is A for marks >= 90, B for marks >= 80, otherwise C. Order by id.', hints: ['CASE WHEN ... THEN ... WHEN ... ELSE ... END'],
    solution: "SELECT name, CASE WHEN marks >= 90 THEN 'A' WHEN marks >= 80 THEN 'B' ELSE 'C' END AS grade FROM Students ORDER BY id",
    expected: [['Arun', 'A'], ['Bala', 'C'], ['Charan', 'B'], ['Divya', 'A'], ['Esha', 'C'], ['Farhan', 'B']], ordered: true },
  { id: 'q10', level: 3, topic: 'INNER JOIN', title: 'Names with department (the classic)', prompt: 'Return (name, department_name) for students with marks > 80, ordered by student id.', hints: ['JOIN Departments ON Students.department_id = Departments.id', 'Then filter with WHERE marks > 80.'],
    solution: 'SELECT name, department_name FROM Students INNER JOIN Departments ON Students.department_id = Departments.id WHERE marks > 80 ORDER BY Students.id',
    expected: [['Arun', 'CSE'], ['Charan', 'CSE'], ['Divya', 'ECE'], ['Farhan', 'CSE']], ordered: true },
  { id: 'q11', level: 3, topic: 'LEFT JOIN', title: 'Keep students without a department', prompt: 'Return (name, department_name) for EVERY student; department_name is NULL when there is none. Order by student id.', hints: ['INNER JOIN drops unmatched rows; LEFT JOIN keeps the left table\'s rows.'],
    solution: 'SELECT s.name, d.department_name FROM Students s LEFT JOIN Departments d ON s.department_id = d.id ORDER BY s.id',
    expected: [['Arun', 'CSE'], ['Bala', 'ECE'], ['Charan', 'CSE'], ['Divya', 'ECE'], ['Esha', null], ['Farhan', 'CSE']], ordered: true },
  { id: 'q12', level: 3, topic: 'LEFT JOIN anti-join', title: 'Empty departments', prompt: 'Names of departments that have no students.', hints: ['LEFT JOIN students, then keep rows where the student side IS NULL.', 'Or use NOT EXISTS.'],
    solution: 'SELECT d.department_name FROM Departments d LEFT JOIN Students s ON s.department_id = d.id WHERE s.id IS NULL', expected: [['MECH']], ordered: false },
  { id: 'q13', level: 3, topic: 'HAVING', title: 'Strong departments', prompt: 'Return (department_name, average marks rounded to 1 decimal) for departments whose average marks are above 85.', hints: ['Average per department needs GROUP BY.', 'Filter groups with HAVING, not WHERE.'],
    solution: 'SELECT d.department_name, ROUND(AVG(s.marks), 1) AS avg_marks FROM Students s JOIN Departments d ON s.department_id = d.id GROUP BY d.department_name HAVING AVG(s.marks) > 85',
    expected: [['CSE', 86.7]], ordered: false },
  { id: 'q14', level: 3, topic: 'EXISTS', title: 'Departments with a 90+ scorer', prompt: 'Department names that have at least one student with marks above 90.', hints: ['EXISTS (SELECT 1 FROM Students ...) correlated with the department.'],
    solution: 'SELECT department_name FROM Departments d WHERE EXISTS (SELECT 1 FROM Students s WHERE s.department_id = d.id AND s.marks > 90)', expected: [['ECE']], ordered: false },
  { id: 'q15', level: 3, topic: 'Self join', title: 'Earning more than the manager', prompt: 'Names of employees who earn strictly more than their manager.', hints: ['Join Employees to itself: e.manager_id = m.id.'],
    solution: 'SELECT e.name FROM Employees e JOIN Employees m ON e.manager_id = m.id WHERE e.salary > m.salary', expected: [['Elan']], ordered: false },
  { id: 'q16', level: 4, topic: 'Subquery', title: 'Second highest mark', prompt: 'Return the second highest distinct marks value (one number).', hints: ['The maximum of the values smaller than the maximum.'],
    solution: 'SELECT MAX(marks) FROM Students WHERE marks < (SELECT MAX(marks) FROM Students)', expected: [[90]], ordered: false },
  { id: 'q17', level: 4, topic: 'Interview: Second Highest Salary', title: 'Second highest salary', prompt: 'Return the second highest distinct salary in Employees.', hints: ['DISTINCT salaries sorted DESC, skip one with OFFSET.', 'Or DENSE_RANK().'],
    solution: 'SELECT DISTINCT salary FROM Employees ORDER BY salary DESC LIMIT 1 OFFSET 1', expected: [[80000]], ordered: false },
  { id: 'q18', level: 4, topic: 'Window: DENSE_RANK', title: 'Nth highest salary (N = 3)', prompt: 'Return the 3rd highest distinct salary.', hints: ['DENSE_RANK() OVER (ORDER BY salary DESC) gives ties the same rank without gaps.'],
    solution: 'SELECT salary FROM (SELECT DISTINCT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS r FROM Employees) WHERE r = 3', expected: [[70000]], ordered: false },
  { id: 'q19', level: 4, topic: 'Interview: Duplicates', title: 'Duplicate salaries', prompt: 'Return (salary, how many employees have it) for salaries shared by more than one employee.', hints: ['GROUP BY salary HAVING COUNT(*) > 1'],
    solution: 'SELECT salary, COUNT(*) FROM Employees GROUP BY salary HAVING COUNT(*) > 1', expected: [[70000, 3]], ordered: false },
  { id: 'q20', level: 4, topic: 'Window: PARTITION BY', title: 'Top earner per department', prompt: 'Return (name, department_id, salary) of the highest-paid employee in each department, ordered by department_id.', hints: ['ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC)', 'Keep row number 1.'],
    solution: 'SELECT name, department_id, salary FROM (SELECT name, department_id, salary, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn FROM Employees) WHERE rn = 1 ORDER BY department_id',
    expected: [['Asha', 10, 90000], ['Elan', 20, 80000], ['Fiona', 30, 60000]], ordered: true },
  { id: 'q21', level: 5, topic: 'Window: running total', title: 'Running total of orders', prompt: 'Return (order_date, running total of amount) ordered by date.', hints: ['SUM(amount) OVER (ORDER BY order_date)'],
    solution: 'SELECT order_date, SUM(amount) OVER (ORDER BY order_date) AS running FROM Orders ORDER BY order_date',
    expected: [['2024-01-01', 100], ['2024-01-02', 150], ['2024-01-03', 220], ['2024-01-04', 250]], ordered: true },
  { id: 'q22', level: 5, topic: 'Interview: Consecutive Numbers', title: 'Three in a row', prompt: 'Return every num in Logs that appears at least 3 times consecutively (by id).', hints: ['Compare a row with the next two using LEAD, or self-join on id+1 and id+2.'],
    solution: 'SELECT DISTINCT a.num FROM Logs a JOIN Logs b ON b.id = a.id + 1 AND b.num = a.num JOIN Logs c ON c.id = a.id + 2 AND c.num = a.num', expected: [[1]], ordered: false },
  { id: 'q23', level: 5, topic: 'Gaps and islands', title: 'Islands of consecutive days', prompt: 'Visits has the days a user visited. Return (first_day, last_day) for each run of consecutive days, ordered by first_day.', hints: ['day - ROW_NUMBER() is constant inside a run of consecutive days.', 'GROUP BY that difference.'],
    solution: 'SELECT MIN(day), MAX(day) FROM (SELECT day, day - ROW_NUMBER() OVER (ORDER BY day) AS grp FROM Visits) GROUP BY grp ORDER BY 1', expected: [[1, 3], [5, 6], [8, 8]], ordered: true },
  { id: 'q24', level: 5, topic: 'Recursive CTE', title: 'Count to five', prompt: 'Use a recursive CTE to return the numbers 1 to 5 (one column).', hints: ['WITH RECURSIVE t(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM t WHERE n < 5) SELECT n FROM t'],
    solution: 'WITH RECURSIVE t(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM t WHERE n < 5) SELECT n FROM t', expected: [[1], [2], [3], [4], [5]], ordered: true },
];

const key = (r: any[]) => JSON.stringify(r);
export interface Verdict { pass: boolean; message: string; got?: any[][]; columns?: string[] }

/** Runs the student's query on a fresh private database and compares it with the hand-computed expected rows. */
export function judge(SQL: SqlJsStatic, c: Challenge, sql: string): Verdict {
  const r = runIsolated(SQL, sql);
  if (!r.ok) return { pass: false, message: r.error ?? 'error' };
  const got = r.result!.rows;
  if (got.length !== c.expected.length) return { pass: false, message: `Expected ${c.expected.length} row(s) but got ${got.length}.`, got, columns: r.result!.columns };
  if (got.length && got[0].length !== c.expected[0].length) return { pass: false, message: `Expected ${c.expected[0].length} column(s) but got ${got[0].length}.`, got, columns: r.result!.columns };
  const a = c.ordered ? got.map(key) : got.map(key).sort();
  const b = c.ordered ? c.expected.map(key) : c.expected.map(key).sort();
  const same = a.every((x, i) => x === b[i]);
  return same ? { pass: true, message: 'Correct!', got, columns: r.result!.columns }
    : { pass: false, message: c.ordered ? 'The rows (or their order) do not match the expected result.' : 'The rows do not match the expected result.', got, columns: r.result!.columns };
}

import { MORE_CHALLENGES } from "./challenges2";
CHALLENGES.push(...MORE_CHALLENGES);
