import { beforeAll, describe, expect, it } from 'vitest';
import type { SqlJsStatic } from 'sql.js';
import { loadSql, SqlSession, splitSelect } from './engine';
import { CHALLENGES, judge } from './challenges';
import { SQL_LESSONS } from './lessons';

let SQL: SqlJsStatic;
beforeAll(async () => { SQL = await loadSql(); });

describe('SQL challenges: reference solutions match hand-computed results on real SQLite', () => {
  for (const c of CHALLENGES) {
    it(`${c.id} ${c.title}`, () => {
      const v = judge(SQL, c, c.solution);
      expect(v.message).toBe('Correct!');
    });
  }
  it('a wrong query is rejected', () => {
    expect(judge(SQL, CHALLENGES[1], 'SELECT name FROM Students').pass).toBe(false);
  });
  it('DML is not accepted for challenges and cannot leak', () => {
    expect(judge(SQL, CHALLENGES[0], 'DELETE FROM Students').pass).toBe(false);
    const s = new SqlSession(SQL);
    expect(s.run('SELECT COUNT(*) FROM Students').results[0].rows[0][0]).toBe(6);
  });
});

describe('session', () => {
  it('runs the spec example and shows logical stages', () => {
    const s = new SqlSession(SQL);
    const r = s.run('SELECT name, department_name FROM Students INNER JOIN Departments ON Students.department_id = Departments.id WHERE marks > 80;');
    expect(r.ok).toBe(true);
    expect(r.results[0].rows).toEqual([['Arun', 'CSE'], ['Charan', 'CSE'], ['Divya', 'ECE'], ['Farhan', 'CSE']]);
    const ids = r.stages!.map(x => x.id);
    expect(ids).toEqual(['from', 'where', 'select']);
    expect(r.stages![0].rows.length).toBe(5);          // 5 students have a department
    expect(r.stages![0].keep!.filter(Boolean).length).toBe(4); // 4 survive WHERE
    expect(r.stages![2].rows).toEqual(r.results[0].rows);
    expect(r.plan!.length).toBeGreaterThan(0);          // real EXPLAIN QUERY PLAN
  });
  it('group/order stages end at the real result', () => {
    const s = new SqlSession(SQL);
    const r = s.run('SELECT department_id, COUNT(*) AS n FROM Students GROUP BY department_id HAVING COUNT(*) > 1 ORDER BY n DESC');
    expect(r.stages!.map(x => x.id)).toEqual(['from', 'select', 'final']);
    expect(r.stages![r.stages!.length - 1].rows).toEqual(r.results[0].rows);
  });
  it('DML changes state and reset restores it', () => {
    const s = new SqlSession(SQL);
    expect(s.run("INSERT INTO Students VALUES (7,'Gita',30,70)").changes).toBe(1);
    expect(s.run('SELECT COUNT(*) FROM Students').results[0].rows[0][0]).toBe(7);
    s.reset();
    expect(s.run('SELECT COUNT(*) FROM Students').results[0].rows[0][0]).toBe(6);
  });
  it('explains real errors', () => {
    const s = new SqlSession(SQL);
    expect(s.run('SELECT * FROM Student').hint).toMatch(/no table called/);
    expect(s.run('SELECT nme FROM Students').hint).toMatch(/does not exist/);
    expect(s.run('SELECT id FROM Students JOIN Departments ON 1=1').hint).toMatch(/more than one/);
    expect(s.run('SELECT FROM Students').hint).toMatch(/parse/);
    expect(s.run('SELECT name FROM Students WHERE COUNT(*) > 1').hint).toMatch(/HAVING/);
  });
  it('splitSelect ignores keywords inside strings and subqueries', () => {
    const p = splitSelect("SELECT name FROM Students WHERE name = 'FROM WHERE' AND marks > (SELECT MAX(marks) FROM Students) ORDER BY id")!;
    expect(p.from).toBe('Students');
    expect(p.where).toContain("'FROM WHERE'");
    expect(p.order).toBe('id');
    expect(splitSelect('SELECT 1 UNION SELECT 2')).toBeNull();
  });
});

describe('lessons', () => {
  for (const l of SQL_LESSONS) {
    it(`${l.id} example runs on real SQLite and its challenge ids exist`, () => {
      const r = new SqlSession(SQL).run(l.example);
      expect(r.error, r.error).toBeUndefined();
      l.challenges.forEach(id => expect(CHALLENGES.some(c => c.id === id), id).toBe(true));
    });
  }
  it('constraints really reject bad data', () => {
    const s = new SqlSession(SQL);
    s.run('CREATE TABLE T (id INTEGER PRIMARY KEY, c INTEGER CHECK (c > 0))');
    expect(s.run('INSERT INTO T VALUES (1, -5)').ok).toBe(false);
    expect(s.run('INSERT INTO T VALUES (1, 5)').ok).toBe(true);
    expect(s.run('INSERT INTO T VALUES (1, 6)').hint).toMatch(/PRIMARY KEY/);
  });
  it('ROLLBACK undoes changes and a trigger fires', () => {
    const s = new SqlSession(SQL);
    s.run('BEGIN; UPDATE Employees SET salary = 1; ROLLBACK;');
    expect(s.run('SELECT MIN(salary) FROM Employees').results[0].rows[0][0]).toBe(55000);
    s.run('CREATE TABLE Audit (n INTEGER); CREATE TRIGGER t AFTER INSERT ON Orders BEGIN INSERT INTO Audit VALUES (NEW.amount); END; INSERT INTO Orders VALUES (9, "Z", 5, "2024-02-01");');
    expect(s.run('SELECT n FROM Audit').results[0].rows).toEqual([[5]]);
  });
});
