// SQL theory cards. Examples are real, runnable queries against the seed database.
export interface Lesson {
  id: string; module: string; title: string; simple: string; technical: string; analogy: string;
  keywords: { term: string; meaning: string }[]; example: string; realWorld: string;
  mistakes: string[]; interview: string[]; challenges: string[];
  quiz: { q: string; options: string[]; answer: number; why: string };
}

export const SQL_LESSONS: Lesson[] = [
  { id: 'l-select', module: 'SQL Fundamentals', title: 'SELECT and FROM', simple: 'SELECT chooses which columns you want; FROM says which table to read them from.',
    technical: 'SELECT is a projection (π) over the relation named in FROM. The result of a query is itself a relation (a table).',
    analogy: 'Like asking a librarian for only the "title" and "author" columns of the catalogue cards.',
    keywords: [{ term: 'Projection', meaning: 'Keeping only some columns.' }, { term: 'Relation', meaning: 'A table: a set of rows with the same columns.' }, { term: 'Alias', meaning: 'A temporary name given with AS.' }],
    example: 'SELECT name, marks AS score FROM Students;', realWorld: 'Every report, API list endpoint and dashboard tile starts with a SELECT.',
    mistakes: ['SELECT * in production queries returns more data than needed and breaks when columns change.', 'Forgetting the comma between column names.'], interview: ['What is the difference between SELECT and SELECT DISTINCT?', 'Is the row order of a SELECT guaranteed without ORDER BY?'], challenges: ['q01'],
    quiz: { q: 'Without ORDER BY, is the order of rows guaranteed?', options: ['Yes, by primary key', 'No', 'Yes, by insertion time'], answer: 1, why: 'SQL tables are unordered sets; databases may return rows in any order unless ORDER BY is used.' } },
  { id: 'l-where', module: 'Filtering', title: 'WHERE, AND/OR, BETWEEN, IN, LIKE, IS NULL', simple: 'WHERE keeps only the rows that satisfy a condition.',
    technical: 'WHERE is a selection (σ). A row is kept only if the predicate evaluates to TRUE; FALSE and UNKNOWN (NULL) rows are discarded (three-valued logic).',
    analogy: 'A bouncer checking every person in a queue against a list of rules.',
    keywords: [{ term: 'Predicate', meaning: 'A condition that is TRUE, FALSE or UNKNOWN.' }, { term: 'NULL', meaning: 'A missing/unknown value; NULL = NULL is UNKNOWN, not TRUE.' }, { term: 'LIKE', meaning: 'Pattern match: % any characters, _ one character.' }],
    example: "SELECT name FROM Students WHERE marks BETWEEN 80 AND 90 AND name LIKE '%a';", realWorld: 'Filtering orders by date, users by country, logs by severity.',
    mistakes: ['Writing = NULL instead of IS NULL.', 'Mixing AND/OR without parentheses (AND binds tighter than OR).'], interview: ['Why does WHERE x = NULL return nothing?', 'What does NOT IN do when the list contains NULL?'], challenges: ['q02', 'q03', 'q04', 'q05'],
    quiz: { q: 'SELECT * FROM Students WHERE department_id = NULL returns…', options: ['Esha only', 'No rows', 'All rows'], answer: 1, why: 'Comparing anything with NULL using = gives UNKNOWN, which WHERE discards. Use IS NULL.' } },
  { id: 'l-order', module: 'Sorting and Aggregation', title: 'ORDER BY, LIMIT, DISTINCT', simple: 'Sort the result, keep only the first few rows, or remove duplicates.',
    technical: 'ORDER BY sorts the final rows by one or more keys (ASC/DESC). LIMIT/OFFSET truncate the sorted result. DISTINCT removes duplicate result rows.',
    analogy: 'Ranking contestants, then reading out only the top three.', keywords: [{ term: 'OFFSET', meaning: 'Rows to skip before LIMIT applies.' }, { term: 'Tie-breaker', meaning: 'A second sort key that makes the order deterministic.' }],
    example: 'SELECT name, marks FROM Students ORDER BY marks DESC, name LIMIT 3;', realWorld: 'Leaderboards, "latest 10 posts", pagination.',
    mistakes: ['LIMIT without ORDER BY gives arbitrary rows.', 'No tie-breaker makes pagination unstable.'], interview: ['How do you paginate efficiently?', 'Difference between DISTINCT and GROUP BY?'], challenges: ['q06', 'q07'],
    quiz: { q: 'Which clause runs last logically?', options: ['WHERE', 'GROUP BY', 'LIMIT'], answer: 2, why: 'LIMIT trims the already sorted final result.' } },
  { id: 'l-group', module: 'Sorting and Aggregation', title: 'GROUP BY, HAVING and aggregates', simple: 'Collapse many rows into one row per group and compute totals, counts and averages.',
    technical: 'GROUP BY partitions rows by key values; aggregates (COUNT, SUM, AVG, MIN, MAX) are computed per partition. WHERE filters rows before grouping; HAVING filters groups after.',
    analogy: 'Sorting receipts into piles by shop, then totalling each pile.', keywords: [{ term: 'Aggregate', meaning: 'A function turning many values into one.' }, { term: 'HAVING', meaning: 'A filter applied to groups.' }, { term: 'COUNT(*) vs COUNT(col)', meaning: 'COUNT(col) ignores NULLs.' }],
    example: 'SELECT department_id, COUNT(*) AS n, AVG(marks) FROM Students GROUP BY department_id HAVING COUNT(*) > 1;', realWorld: 'Revenue per month, active users per day, error counts per service.',
    mistakes: ['Using an aggregate in WHERE (use HAVING).', 'Selecting a non-grouped column.'], interview: ['WHERE vs HAVING?', 'Why does COUNT(col) differ from COUNT(*)?'], challenges: ['q08', 'q13', 'q19'],
    quiz: { q: 'Where can you filter on AVG(marks)?', options: ['WHERE', 'HAVING', 'ORDER BY only'], answer: 1, why: 'Aggregates exist only after grouping, so the filter belongs in HAVING.' } },
  { id: 'l-case', module: 'Advanced SQL', title: 'CASE expressions', simple: 'IF/ELSE inside a query.', technical: 'CASE evaluates WHEN conditions in order and returns the result of the first TRUE one, else the ELSE value (or NULL).',
    analogy: 'A grading rubric: ≥90 is A, ≥80 is B, otherwise C.', keywords: [{ term: 'Searched CASE', meaning: 'CASE WHEN condition THEN value …' }],
    example: "SELECT name, CASE WHEN marks >= 90 THEN 'A' WHEN marks >= 80 THEN 'B' ELSE 'C' END AS grade FROM Students;", realWorld: 'Bucketing ages, mapping status codes to labels, conditional aggregation.',
    mistakes: ['Wrong WHEN order (first match wins).', 'Forgetting END.'], interview: ['How do you pivot rows to columns in SQL?'], challenges: ['q09'],
    quiz: { q: 'If no WHEN matches and there is no ELSE, CASE returns…', options: ['0', 'NULL', 'An error'], answer: 1, why: 'The default result of CASE is NULL.' } },
  { id: 'l-join', module: 'Joins', title: 'INNER and LEFT JOIN', simple: 'Combine rows from two tables that are related.',
    technical: 'A join pairs rows from two relations satisfying the ON predicate. INNER JOIN keeps matched pairs only; LEFT JOIN also keeps unmatched left rows, padding the right side with NULLs.',
    analogy: 'Matching every student card with the department card that has the same department number.', keywords: [{ term: 'Foreign key', meaning: 'A column referencing another table\'s key.' }, { term: 'Anti-join', meaning: 'LEFT JOIN + IS NULL to find rows with no match.' }, { term: 'Nested loop / hash join', meaning: 'Physical strategies the engine may use (see EXPLAIN).' }],
    example: 'SELECT s.name, d.department_name FROM Students s LEFT JOIN Departments d ON s.department_id = d.id;', realWorld: 'Orders with customers, posts with authors, anything normalised into several tables.',
    mistakes: ['Forgetting the ON clause (cartesian product).', 'Filtering the right table in WHERE after a LEFT JOIN, silently turning it into an INNER JOIN.'], interview: ['INNER vs LEFT vs FULL join?', 'How would you find rows with no match?'], challenges: ['q10', 'q11', 'q12', 'q15'],
    quiz: { q: 'Esha has no department. Does an INNER JOIN with Departments return her?', options: ['Yes, with NULL', 'No'], answer: 1, why: 'INNER JOIN keeps only rows with a match; use LEFT JOIN to keep her.' } },
  { id: 'l-sub', module: 'Advanced SQL', title: 'Subqueries and EXISTS', simple: 'A query inside another query.', technical: 'A scalar subquery yields one value, an IN subquery a set, and a correlated subquery is re-evaluated per outer row. EXISTS tests whether a subquery returns any row.',
    analogy: 'To find the second tallest, first ask "who is the tallest?", then ask again excluding them.', keywords: [{ term: 'Correlated', meaning: 'The inner query refers to the outer row.' }, { term: 'EXISTS', meaning: 'TRUE if the subquery returns at least one row.' }],
    example: 'SELECT MAX(marks) FROM Students WHERE marks < (SELECT MAX(marks) FROM Students);', realWorld: 'Existence checks, "greater than the average", anti-joins.',
    mistakes: ['NOT IN with NULLs in the list returns no rows; prefer NOT EXISTS.'], interview: ['Correlated vs uncorrelated subquery?', 'EXISTS vs IN?'], challenges: ['q14', 'q16', 'q17'],
    quiz: { q: 'A correlated subquery is evaluated…', options: ['Once', 'Conceptually once per outer row'], answer: 1, why: 'It depends on the outer row. Optimisers may rewrite it, but the semantics are per row.' } },
  { id: 'l-window', module: 'Advanced SQL', title: 'Window functions', simple: 'Calculations across related rows without collapsing them.',
    technical: 'A window function computes over a frame of rows defined by OVER (PARTITION BY … ORDER BY …). Unlike GROUP BY, every input row is kept. ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD and running SUM are common.',
    analogy: 'Each runner keeps their own row but also sees their rank within their age group.', keywords: [{ term: 'PARTITION BY', meaning: 'Splits rows into independent windows.' }, { term: 'RANK vs DENSE_RANK', meaning: 'RANK leaves gaps after ties; DENSE_RANK does not.' }, { term: 'Frame', meaning: 'The rows around the current row used by the function.' }],
    example: 'SELECT name, department_id, salary, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn FROM Employees;', realWorld: 'Top-N per group, running totals, month-over-month change.',
    mistakes: ['Using a window function in WHERE (wrap in a subquery/CTE).'], interview: ['Difference between RANK, DENSE_RANK and ROW_NUMBER?', 'Nth highest salary per department?'], challenges: ['q18', 'q20', 'q21', 'q22'],
    quiz: { q: 'Salaries 90, 80, 80, 70: DENSE_RANK of 70 is…', options: ['3', '4', '2'], answer: 0, why: 'DENSE_RANK has no gaps: 90→1, 80→2, 70→3 (RANK would give 4).' } },
  { id: 'l-cte', module: 'Advanced SQL', title: 'CTEs and recursive CTEs', simple: 'Name a subquery so you can read it top to bottom; recursion lets a query call itself.',
    technical: 'WITH defines a named temporary result. A recursive CTE has an anchor member and a recursive member combined with UNION [ALL] and repeats until no new rows appear.',
    analogy: 'Writing intermediate results on a whiteboard, then using them.', keywords: [{ term: 'Anchor', meaning: 'The starting rows of a recursion.' }, { term: 'Recursive member', meaning: 'Joins the CTE to itself to produce the next level.' }],
    example: 'WITH RECURSIVE t(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM t WHERE n < 5) SELECT n FROM t;', realWorld: 'Org charts, category trees, date series.', mistakes: ['Missing termination condition → infinite recursion.'], interview: ['When use a CTE vs a subquery vs a temp table?'], challenges: ['q23', 'q24'],
    quiz: { q: 'What stops a recursive CTE?', options: ['LIMIT only', 'The recursive member producing no new rows', 'Nothing'], answer: 1, why: 'Recursion ends when an iteration yields no rows, so include a termination condition.' } },
];

import { MORE_LESSONS } from "./lessons2";
SQL_LESSONS.push(...MORE_LESSONS);
