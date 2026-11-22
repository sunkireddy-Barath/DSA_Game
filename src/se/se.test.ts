import { describe, expect, it } from 'vitest';
import { Editor, Kanban, Registry, STAGES, SWITCH_SITES, Subject, burndown, decorate, factory, fee, orderStateMachine, pipeline, planSprints, strategyDemo, strategyDesign, supportChain, switchDesign } from './engine';

describe('strategy vs switch', () => {
  it('switch design: forgetting a site fails only at run time', () => {
    const r = switchDesign('upi', [SWITCH_SITES[0], SWITCH_SITES[1]]); expect(r.filesToTouch.length).toBe(3); expect(r.works.map(w => w.ok)).toEqual([true, true, false]); expect(r.compilerHelp).toMatch(/run time/);
  });
  it('strategy design: one new file; a missing function is a compile-time error', () => {
    const ok = strategyDesign('upi', ['charge()', 'refund()', 'describe()']); expect(ok.filesToTouch).toEqual(['UpiPayment.cpp (new file)']); expect(ok.works.every(w => w.ok)).toBe(true);
    const bad = strategyDesign('upi', ['charge()']); expect(bad.works.filter(w => !w.ok).length).toBe(2); expect(bad.works[1].why).toMatch(/compile error/);
  });
  it('fees and the strategy demo', () => { expect(fee('card', 100)).toBe(2); expect(fee('paypal', 100)).toBe(3.3); expect(fee('upi', 100)).toBe(0); expect(() => fee('cash', 1)).toThrow(/unsupported/); expect(strategyDemo(100, 'card').value).toBe(102); expect(() => strategyDemo(1, 'x')).toThrow(); });
});

describe('behavioural and creational demos', () => {
  it('observer: only current subscribers are notified', () => {
    const s = new Subject(); s.subscribe('A', e => `got ${e}`); s.subscribe('B', e => `saw ${e}`); s.notify('x'); s.unsubscribe('A'); s.notify('y');
    expect(s.log.filter(l => l.includes('→ A')).length).toBe(1); expect(s.log.filter(l => l.includes('→ B')).length).toBe(2);
  });
  it('command: undo/redo restores exact text and redo is cleared by new commands', () => {
    const e = new Editor(); e.insert('Hello'); e.insert(' World'); e.del(3); expect(e.text).toBe('Hello Wo'); e.doUndo(); expect(e.text).toBe('Hello World'); e.doUndo(); expect(e.text).toBe('Hello'); e.doRedo(); expect(e.text).toBe('Hello World');
    e.insert('!'); e.doRedo(); expect(e.log[e.log.length - 1]).toBe('nothing to redo'); expect(e.text).toBe('Hello World!');
  });
  it('state: legal transitions only', () => {
    expect(orderStateMachine(['Paid', 'Shipped', 'Delivered']).state).toBe('Delivered'); const r = orderStateMachine(['Shipped', 'Paid', 'Cancelled', 'Paid']); expect(r.state).toBe('Cancelled'); expect(r.log.filter(l => l.startsWith('✗')).length).toBe(2);
  });
  it('decorator: costs compose', () => { const d = decorate('espresso', ['milk', 'sugar', 'whip']); expect(d.cost).toBe(3.4); expect(d.description).toBe('Espresso + Milk + Sugar + Whip'); expect(() => decorate('tea', ['salt'])).toThrow(); });
  it('chain of responsibility', () => { expect(supportChain(1).handledBy).toBe('Level-1 support'); expect(supportChain(3).handledBy).toBe('Level-2 engineer'); expect(supportChain(5).handledBy).toBe('Team manager'); expect(supportChain(9).handledBy).toBeNull(); expect(supportChain(3).trail.length).toBe(2); });
  it('singleton constructs once', () => { Registry.reset(); const a = Registry.get(), b = Registry.get(); expect(a).toBe(b); expect(Registry.created).toBe(1); });
  it('factory', () => { expect(factory('square', 3).area).toBe(9); expect(factory('circle', 1).area).toBeCloseTo(3.14, 2); expect(() => factory('hexagon', 1)).toThrow(/cannot create/); });
});

describe('Kanban', () => {
  it('enforces WIP limits and one-column-at-a-time moves', () => {
    const k = new Kanban(5); expect(k.move(1, 1).ok).toBe(true); expect(k.move(2, 1).ok).toBe(true); const r = k.move(3, 1); expect(r.ok).toBe(false); expect(r.reason).toMatch(/WIP limit/); expect(k.move(4, 3).reason).toMatch(/one column/);
    expect(k.move(1, 2).ok).toBe(true); expect(k.move(3, 1).ok).toBe(true);
  });
  it('lead time and throughput', () => {
    const k = new Kanban(2); k.move(1, 1); k.nextDay(); k.nextDay(); k.move(1, 2); k.nextDay(); k.move(1, 3); const m = k.metrics(); expect(m.done).toBe(1); expect(m.avgLeadTime).toBe(3); expect(m.throughput).toBeCloseTo(1 / 3); expect(m.inProgress).toBe(0);
  });
});

describe('Scrum', () => {
  const backlog = [{ title: 'a', points: 5, priority: 1 }, { title: 'b', points: 3, priority: 2 }, { title: 'c', points: 8, priority: 3 }, { title: 'd', points: 2, priority: 4 }, { title: 'e', points: 13, priority: 5 }];
  it('plans sprints by priority within velocity and flags oversized stories', () => {
    const p = planSprints(backlog, 10); expect(p.tooBig.map(s => s.title)).toEqual(['e']); expect(p.sprints.map(s => s.items.map(i => i.title))).toEqual([['a', 'b'], ['c', 'd']]); expect(p.sprints.every(s => s.points <= 10)).toBe(true); expect(p.total).toBe(31);
    expect(() => planSprints(backlog, 0)).toThrow();
  });
  it('burndown', () => { const b = burndown(20, 5, [4, 4, 4, 4, 4]); expect(b.ideal).toEqual([20, 16, 12, 8, 4, 0]); expect(b.actual).toEqual([20, 16, 12, 8, 4, 0]); expect(b.onTrack).toBe(true); expect(burndown(20, 5, [2, 2, 2, 2, 2]).onTrack).toBe(false); });
});

describe('CI/CD', () => {
  it('a failing stage stops everything after it and nothing is deployed', () => { const r = pipeline({ failAt: 1, strategy: 'rolling' }); expect(r.stages.map(s => s.status)).toEqual(['passed', 'failed', 'skipped', 'skipped', 'skipped', 'skipped']); expect(r.deployed).toBe(false); expect(r.prod).toBe('v1'); });
  it('healthy release reaches production with every strategy', () => { for (const s of ['rolling', 'blue-green', 'canary'] as const) { const r = pipeline({ failAt: null, strategy: s, canaryErrorRate: 0.001 }); expect(r.deployed, s).toBe(true); expect(r.stages.every(x => x.status === 'passed')).toBe(true); } });
  it('canary catches a bad release at 5% and rolls back; blue-green rolls back instantly', () => {
    const c = pipeline({ failAt: null, strategy: 'canary', canaryErrorRate: 0.2 }); expect(c.traffic).toEqual([5]); expect(c.prod).toBe('v1');
    const b = pipeline({ failAt: null, strategy: 'blue-green', canaryErrorRate: 0.2 }); expect(b.prod).toBe('v1'); expect(b.log.join(' ')).toMatch(/instant rollback/);
    const r = pipeline({ failAt: null, strategy: 'rolling', canaryErrorRate: 0.2 }); expect(r.traffic).toEqual([25, 50]); expect(r.prod).toBe('v1');
  });
  it('has the standard stages', () => { expect(STAGES.length).toBe(6); });
});
