// SQL engine: REAL SQLite (compiled to WASM by sql.js). Nothing here is mocked.
// The "logical flow" stages are produced by executing progressively larger real queries.
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

export const SEED = `
CREATE TABLE Departments (id INTEGER PRIMARY KEY, department_name TEXT NOT NULL);
CREATE TABLE Students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, department_id INTEGER REFERENCES Departments(id), marks INTEGER);
CREATE TABLE Employees (id INTEGER PRIMARY KEY, name TEXT NOT NULL, department_id INTEGER, salary INTEGER, manager_id INTEGER);
CREATE TABLE Orders (id INTEGER PRIMARY KEY, customer TEXT, amount INTEGER, order_date TEXT);
CREATE TABLE Logs (id INTEGER PRIMARY KEY, num INTEGER);
CREATE TABLE Visits (user_id INTEGER, day INTEGER);
INSERT INTO Departments VALUES (10,'CSE'),(20,'ECE'),(30,'MECH');
INSERT INTO Students VALUES (1,'Arun',10,90),(2,'Bala',20,75),(3,'Charan',10,85),(4,'Divya',20,92),(5,'Esha',NULL,60),(6,'Farhan',10,85);
INSERT INTO Employees VALUES (1,'Asha',10,90000,NULL),(2,'Ben',10,70000,1),(3,'Chitra',20,70000,1),(4,'Dev',20,55000,3),(5,'Elan',20,80000,3),(6,'Fiona',30,60000,1),(7,'Gopi',10,70000,2);
INSERT INTO Orders VALUES (1,'A',100,'2024-01-01'),(2,'B',50,'2024-01-02'),(3,'A',70,'2024-01-03'),(4,'C',30,'2024-01-04');
INSERT INTO Logs VALUES (1,1),(2,1),(3,1),(4,2),(5,1),(6,2),(7,2);
INSERT INTO Visits VALUES (1,1),(1,2),(1,3),(1,5),(1,6),(1,8);
`;

export interface QResult { columns: string[]; rows: any[][] }
export interface Stage { id: string; title: string; explain: string; sql: string; columns: string[]; rows: any[][]; keep?: boolean[] }
export interface RunOutcome {
  ok: boolean; error?: string; hint?: string; results: QResult[]; changes?: number; ms: number;
  plan?: string[]; stages?: Stage[]; stageNote?: string; statements: number;
}

let sqlPromise: Promise<SqlJsStatic> | null = null;
export function loadSql(locate?: (file: string) => string): Promise<SqlJsStatic> {
  return (sqlPromise ??= initSqlJs(locate ? { locateFile: locate } : undefined));
}

export function newDb(SQL: SqlJsStatic): Database {
  const db = new SQL.Database();
  db.run(SEED);
  return db;
}

const KEYWORDS = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT'] as const;
type Clause = (typeof KEYWORDS)[number];
export interface Parts { distinct: boolean; select: string; from: string; where?: string; group?: string; having?: string; order?: string; limit?: string }

/** Splits a single plain SELECT into clauses (top-level only). Returns null for anything else (CTE, set operations, ...). */
export function splitSelect(sqlIn: string): Parts | null {
  const sql = sqlIn.trim().replace(/;+\s*$/, '');
  if (/;/.test(stripLiterals(sql))) return null;
  if (!/^select\b/i.test(sql)) return null;
  const clean = stripLiterals(sql);
  const hits: { k: Clause; at: number; len: number }[] = [];
  let depth = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '(') depth++; else if (ch === ')') depth--;
    if (depth !== 0) continue;
    if (i > 0 && /[A-Za-z0-9_]/.test(clean[i - 1])) continue;
    for (const k of KEYWORDS) {
      const re = new RegExp('^' + k.replace(' ', '\\s+') + '\\b', 'i');
      const m = clean.slice(i).match(re);
      if (m && !hits.some(h => h.k === k)) { hits.push({ k, at: i, len: m[0].length }); break; }
    }
    if (depth === 0 && /^(union|intersect|except)\b/i.test(clean.slice(i)) && (i === 0 || !/[A-Za-z0-9_]/.test(clean[i - 1]))) return null;
  }
  hits.sort((a, b) => a.at - b.at);
  if (!hits.length || hits[0].k !== 'SELECT' || !hits.some(h => h.k === 'FROM')) return null;
  const out: any = {};
  hits.forEach((h, i) => { out[h.k] = sql.slice(h.at + h.len, i + 1 < hits.length ? hits[i + 1].at : undefined).trim(); });
  let select: string = out['SELECT'], distinct = false;
  const dm = select.match(/^distinct\b\s*/i);
  if (dm) { distinct = true; select = select.slice(dm[0].length); }
  return { distinct, select, from: out['FROM'], where: out['WHERE'], group: out['GROUP BY'], having: out['HAVING'], order: out['ORDER BY'], limit: out['LIMIT'] };
}
function stripLiterals(s: string) { return s.replace(/'([^']|'')*'/g, m => "'" + ' '.repeat(m.length - 2) + "'").replace(/"[^"]*"/g, m => '"' + ' '.repeat(m.length - 2) + '"'); }

function exec(db: Database, sql: string): QResult {
  const r = db.exec(sql);
  return r.length ? { columns: r[0].columns, rows: r[0].values as any[][] } : { columns: [], rows: [] };
}

function buildStages(db: Database, sql: string, p: Parts): Stage[] {
  const stages: Stage[] = [];
  const whereSql = p.where ? ` WHERE ${p.where}` : '';
  const s1 = exec(db, `SELECT * FROM ${p.from}`);
  stages.push({ id: 'from', title: p.from.match(/\bjoin\b/i) ? 'FROM + JOIN' : 'FROM', explain: p.from.match(/\bjoin\b/i) ? 'Tables are read and joined: every pair of rows satisfying the ON condition becomes one combined row.' : 'All rows of the source table are read.', sql: `SELECT * FROM ${p.from}`, ...s1 });
  let before = s1;
  if (p.where) {
    const s2 = exec(db, `SELECT * FROM ${p.from}${whereSql}`);
    const counts = new Map<string, number>(); s2.rows.forEach(r => counts.set(JSON.stringify(r), (counts.get(JSON.stringify(r)) ?? 0) + 1));
    const keep = s1.rows.map(r => { const k = JSON.stringify(r), c = counts.get(k) ?? 0; if (c > 0) { counts.set(k, c - 1); return true; } return false; });
    stages[0].keep = keep;
    stages.push({ id: 'where', title: 'WHERE', explain: `Rows are filtered by: ${p.where}. Rows failing the condition (or evaluating to NULL) are discarded.`, sql: `SELECT * FROM ${p.from}${whereSql}`, ...s2 });
    before = s2;
  }
  void before;
  const grouped = !!p.group || /\b(count|sum|avg|min|max)\s*\(/i.test(p.select);
  const proj = `SELECT ${p.distinct ? 'DISTINCT ' : ''}${p.select} FROM ${p.from}${whereSql}${p.group ? ` GROUP BY ${p.group}` : ''}${p.having ? ` HAVING ${p.having}` : ''}`;
  const s3 = exec(db, proj);
  stages.push({ id: 'select', title: grouped ? `GROUP BY / ${p.having ? 'HAVING / ' : ''}SELECT` : p.distinct ? 'SELECT DISTINCT' : 'SELECT (projection)', sql: proj, ...s3,
    explain: grouped ? 'Rows are grouped, aggregate functions are computed per group' + (p.having ? `, groups failing HAVING (${p.having}) are dropped` : '') + ', then the select list is evaluated.' : 'The select list is evaluated for each remaining row; only the requested columns are kept.' });
  if (p.order || p.limit) {
    const s4 = exec(db, sql.trim().replace(/;+\s*$/, ''));
    stages.push({ id: 'final', title: [p.order && 'ORDER BY', p.limit && 'LIMIT'].filter(Boolean).join(' + '), sql, ...s4, explain: `${p.order ? `Rows are sorted by ${p.order}. ` : ''}${p.limit ? `Only the first rows are kept (${p.limit}).` : ''}` });
  }
  return stages;
}

export function explainError(msg: string, db: Database): string | undefined {
  const tables = () => exec(db, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").rows.map(r => r[0]).join(', ');
  let m: RegExpMatchArray | null;
  if ((m = msg.match(/no such table: (\S+)/))) return `There is no table called "${m[1]}". Tables in this database: ${tables()}. Names are not case-sensitive, but spelling must match.`;
  if ((m = msg.match(/no such column: (\S+)/))) return `The column "${m[1]}" does not exist in the tables used by this query. Check the spelling, or prefix it with the table/alias (for example s.name).`;
  if (/ambiguous column name/.test(msg)) return 'The column name exists in more than one joined table. Qualify it with a table or alias, e.g. Students.id.';
  if (/syntax error/.test(msg)) return 'SQLite could not parse the statement. Common causes: a missing comma between columns, an extra comma before FROM, or a misspelt keyword. The text after "near" shows where parsing failed.';
  if (/UNIQUE constraint failed/.test(msg)) return 'A row with the same value in a PRIMARY KEY / UNIQUE column already exists.';
  if (/NOT NULL constraint failed/.test(msg)) return 'A NOT NULL column was given no value (or NULL).';
  if (/FOREIGN KEY/.test(msg)) return 'The referenced parent row does not exist.';
  if (/misuse of aggregate|aggregate functions are not allowed/.test(msg)) return 'WHERE runs before grouping, so it cannot use aggregates like COUNT/AVG. Use HAVING to filter groups.';
  return undefined;
}

export class SqlSession {
  db: Database;
  constructor(public SQL: SqlJsStatic) { this.db = newDb(SQL); }
  reset() { this.db.close(); this.db = newDb(this.SQL); }
  tables() {
    return exec(this.db, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").rows.map(r => r[0] as string);
  }
  table(name: string): QResult { return exec(this.db, `SELECT * FROM "${name.replace(/"/g, '')}"`); }

  run(sql: string): RunOutcome {
    const t0 = performance.now();
    const base: RunOutcome = { ok: false, results: [], ms: 0, statements: 0 };
    try {
      const results = this.db.exec(sql).map(r => ({ columns: r.columns, rows: r.values as any[][] }));
      const out: RunOutcome = { ...base, ok: true, results, statements: sql.split(';').filter(s => s.trim()).length, ms: 0 };
      if (!results.length) out.changes = this.db.getRowsModified();
      const parts = splitSelect(sql);
      if (parts) {
        try { out.stages = buildStages(this.db, sql, parts); } catch { out.stageNote = 'The logical stages could not be derived for this query.'; }
        try { const p = this.db.exec(`EXPLAIN QUERY PLAN ${sql.trim().replace(/;+\s*$/, '')}`); out.plan = p.length ? p[0].values.map(v => ' '.repeat(Math.max(0, Number(v[1]) ? 2 : 0)) + String(v[3])) : []; } catch { /* plan unavailable */ }
      } else if (/^\s*(select|with)\b/i.test(sql)) out.stageNote = 'Step-by-step stages are shown for a single plain SELECT. This query (CTE, set operation or multiple statements) is executed for real, but its stages are not broken down.';
      out.ms = performance.now() - t0;
      return out;
    } catch (e: any) {
      return { ...base, error: String(e.message ?? e), hint: explainError(String(e.message ?? e), this.db), ms: performance.now() - t0 };
    }
  }
}

/** Runs a query on a fresh private copy of the seed database (used for judging; student DML cannot leak). */
export function runIsolated(SQL: SqlJsStatic, sql: string): { ok: boolean; result?: QResult; error?: string } {
  const db = newDb(SQL);
  try {
    if (!/^\s*(select|with)\b/i.test(sql)) return { ok: false, error: 'Challenges accept SELECT queries only.' };
    return { ok: true, result: exec(db, sql) };
  } catch (e: any) { return { ok: false, error: String(e.message ?? e) }; } finally { db.close(); }
}
