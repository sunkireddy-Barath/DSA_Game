import { describe, expect, it } from 'vitest';
import { generateCpp, simulate, vtable, isAbstract } from './engine';
import { SCENARIOS } from './scenarios';

const sc = (id: string) => SCENARIOS.find(s => s.id === id)!;
const def = (s: ReturnType<typeof sc>, over: Record<string, boolean> = {}) => s.build({ ...Object.fromEntries(s.toggles.map(t => [t.id, t.default])), ...over });

describe('constructors and destructors', () => {
  it('order: members/base first, derived last; destruction is the exact reverse; stack objects die in reverse order', () => {
    const r = simulate(def(sc('order')));
    const ev = r.events.slice(0, 2).flatMap(e => e.output);
    expect(ev).toEqual(['engine ready', 'Engine constructed', 'Vehicle constructed', 'Car constructed', 'engine ready', 'Engine constructed', 'Vehicle constructed', 'Car constructed']);
    const end = r.events.filter(e => e.title.includes('goes out of scope')).map(e => ({ t: e.title, o: e.output }));
    expect(end[0].t).toContain('b'); expect(end[1].t).toContain('a');
    expect(end[0].o).toEqual(['Car destroyed', 'Vehicle destroyed', 'engine off', 'Engine destroyed']);
  });
  it('every constructed object is destroyed exactly once (multiset equality) when no copies/moves are involved', () => {
    const count = (xs: string[]) => xs.reduce((m: Record<string, number>, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});
    for (const id of ['car', 'inherit', 'order', 'poly']) {
      const r = simulate(def(sc(id)));
      const made = r.output.filter(l => l.endsWith(' constructed')).map(l => l.replace(' constructed', ''));
      const killed = r.output.filter(l => l.endsWith(' destroyed')).map(l => l.replace(' destroyed', ''));
      expect(count(killed), id).toEqual(count(made)); expect(r.leaks, id).toEqual([]);
    }
  });
  it('virtual destructor: deleting via base pointer destroys the whole object', () => {
    const r = simulate(def(sc('poly'), { virtualDtor: true })); const d = r.events.find(e => e.title === 'delete p1;')!;
    expect(d.output).toEqual(['releasing circle resources', 'Circle destroyed', 'Shape destroyed']); expect(d.warnings).toEqual([]); expect(r.leaks).toEqual([]);
  });
  it('non-virtual destructor: derived part is skipped (leak + UB warning)', () => {
    const r = simulate(def(sc('poly'), { virtualDtor: false })); const d = r.events.find(e => e.title === 'delete p1;')!;
    expect(d.output).toEqual(['Shape destroyed']); expect(d.warnings[0]).toMatch(/Undefined behaviour/); expect(r.leaks.length).toBe(2);
  });
});

describe('dispatch', () => {
  it('virtual → dynamic dispatch picks the derived override', () => {
    const r = simulate(def(sc('poly'), { virtualArea: true })); const e = r.events.find(x => x.title === 'p1->area();')!;
    expect(e.dispatch).toEqual({ method: 'area', staticClass: 'Shape', resolvedClass: 'Circle', dynamic: true }); expect(e.output).toEqual(['Circle::area = pi*r*r']);
  });
  it('non-virtual → static dispatch runs the base version', () => {
    const r = simulate(def(sc('poly'), { virtualArea: false })); const e = r.events.find(x => x.title === 'p1->area();')!;
    expect(e.dispatch).toMatchObject({ resolvedClass: 'Shape', dynamic: false }); expect(e.output).toEqual(['Shape::area (generic)']);
  });
  it('vtable lists the most-derived implementation', () => {
    const p = def(sc('poly')); expect(vtable(p.classes, 'Circle')).toEqual([{ method: 'area', impl: 'Circle' }, { method: '~destructor', impl: 'Circle' }]); expect(vtable(p.classes, 'Square').find(v => v.method === 'area')!.impl).toBe('Square');
  });
  it('inherited member functions resolve up the chain', () => { const r = simulate(def(sc('inherit'))); expect(r.events.find(e => e.title === 'c.start();')!.dispatch!.resolvedClass).toBe('Vehicle'); });
  it('abstract classes cannot be instantiated but derived ones work', () => {
    const p = def(sc('abstract')); expect(isAbstract(p.classes, 'Shape')).toBe(true); expect(isAbstract(p.classes, 'Square')).toBe(false);
    const r = simulate(p); expect(r.errors[0]).toMatch(/abstract/); expect(r.events.find(e => e.title === 'p->area();')!.output).toEqual(['Square::area = s*s']);
  });
});

describe('object state, copy, move, smart pointers', () => {
  it('each object has its own member variables', () => {
    const r = simulate(def(sc('car'))); const last = r.events[r.events.length - 3].snap; const cars = last.objects.filter(o => o.cls === 'Car');
    expect(cars.map(o => o.fields.speed)).toEqual([20, 10]);
  });
  it('copy is independent; move empties the source', () => {
    const r = simulate(def(sc('copy'))); const s = r.events.find(e => e.title.startsWith('Resource c'))!.snap;
    const a = s.objects.find(o => o.id === s.vars.a.obj)!, b = s.objects.find(o => o.id === s.vars.b.obj)!, c = s.objects.find(o => o.id === s.vars.c.obj)!;
    expect(b.fields.handle).toBe(42); expect(c.fields.handle).toBe(42); expect(a.fields.handle).toBe(0); expect(new Set([a.id, b.id, c.id]).size).toBe(3);
  });
  it('shared_ptr use_count and destruction at zero', () => {
    const r = simulate(def(sc('copy'))); const t = (x: string) => r.events.find(e => e.title.includes(x))!;
    expect(t('auto s2 = s1;').detail[0]).toContain('use_count = 2'); expect(t('s1.reset()') ?? t('s1 released')).toBeTruthy();
    const destroyed = r.events.find(e => e.title.includes('use_count drops to 0'))!; expect(destroyed.output).toEqual(['resource released', 'Resource destroyed'].filter(x => destroyed.output.includes(x)));
    expect(destroyed.output).toContain('Resource destroyed');
  });
  it('unique_ptr move transfers ownership', () => { const r = simulate(def(sc('copy'))); const s = r.events.find(e => e.title.includes('auto u2 = std::move(u1)'))!.snap; expect(s.vars.u1.obj).toBeNull(); expect(s.vars.u2.obj).not.toBeNull(); });
  it('slicing is reported', () => { const r = simulate(def(sc('copy'))); expect(r.events.find(e => e.title.includes('sliced'))!.warnings[0]).toMatch(/slicing/); });
  it('nothing leaks in the RAII scenario', () => { expect(simulate(def(sc('copy'))).leaks).toEqual([]); });
});

describe('generated C++', () => {
  it("shows 'virtual' only when toggled on, and maps every op to a line", () => {
    const on = generateCpp(def(sc('poly'), { virtualArea: true })), off = generateCpp(def(sc('poly'), { virtualArea: false }));
    expect(on.lines.join('\n')).toContain('virtual void area()'); expect(on.lines.join('\n')).toContain('override');
    expect(off.lines.join('\n')).not.toContain('virtual void area()');
    on.opLine.forEach((ln, i) => expect(on.lines[ln - 1].length).toBeGreaterThan(0)); expect(on.lines[on.opLine[2] - 1]).toContain('p1->area();');
    expect(generateCpp(def(sc('poly'), { virtualDtor: true })).lines.join('\n')).toContain('virtual ~Shape()');
  });
});
