// Object-model simulator: classes, inheritance, virtual dispatch, constructors/destructors, copy/move,
// stack/heap lifetime and smart pointers. It EXECUTES a program model and generates the equivalent C++ source,
// so toggling a keyword (e.g. `virtual`) changes both the shown code and the simulated behaviour.
// Vtable layout and object addresses are implementation-specific; this models the language semantics only.

export type Eff = { k: 'print'; text: string } | { k: 'add'; field: string; n: number } | { k: 'set'; field: string; v: number | string };
export interface MethodDef { name: string; virtual?: boolean; pure?: boolean; override?: boolean; body: Eff[]; returns?: string }
export interface FieldDef { name: string; type: string; init?: number | string; access?: 'private' | 'public' | 'protected' }
export interface ClassDef { name: string; base?: string; fields: FieldDef[]; methods: MethodDef[]; ctor: Eff[]; dtor: Eff[]; virtualDtor?: boolean; hasCopy?: boolean; hasMove?: boolean }

export type Op =
  | { k: 'stack'; v: string; cls: string }
  | { k: 'heap'; v: string; cls: string; as?: string }
  | { k: 'call'; v: string; m: string }
  | { k: 'delete'; v: string }
  | { k: 'copy'; v: string; from: string }
  | { k: 'move'; v: string; from: string }
  | { k: 'slice'; v: string; as: string; from: string }
  | { k: 'shared'; v: string; cls: string }
  | { k: 'shareCopy'; v: string; from: string }
  | { k: 'reset'; v: string }
  | { k: 'unique'; v: string; cls: string }
  | { k: 'uniqueMove'; v: string; from: string }
  | { k: 'scopeEnd' };

export interface Obj { id: number; cls: string; fields: Record<string, number | string>; where: 'stack' | 'heap' | 'member'; alive: boolean; owner?: number; partial?: string }
export interface VarInfo { kind: 'obj' | 'ptr' | 'shared' | 'unique'; obj: number | null; staticType: string }
export interface Snapshot { objects: Obj[]; vars: Record<string, VarInfo>; refCounts: Record<number, number> }
export interface SimEvent { opIndex: number; title: string; detail: string[]; output: string[]; warnings: string[]; snap: Snapshot; dispatch?: { method: string; staticClass: string; resolvedClass: string; dynamic: boolean } }
export interface Program { classes: ClassDef[]; ops: Op[] }

export function chain(classes: ClassDef[], name: string): ClassDef[] {
  const out: ClassDef[] = []; let c = classes.find(x => x.name === name);
  while (c) { out.push(c); c = c.base ? classes.find(x => x.name === c!.base) : undefined; }
  return out; // most derived first
}
export const isVirtualMethod = (classes: ClassDef[], cls: string, m: string) => chain(classes, cls).some(c => c.methods.some(x => x.name === m && (x.virtual || x.override)));
export function vtable(classes: ClassDef[], cls: string) {
  const names = new Set<string>(); chain(classes, cls).forEach(c => c.methods.forEach(m => { if (m.virtual || m.override) names.add(m.name); }));
  const t = [...names].map(n => ({ method: n, impl: chain(classes, cls).find(c => c.methods.some(m => m.name === n))!.name }));
  if (chain(classes, cls).some(c => c.virtualDtor)) t.push({ method: '~destructor', impl: cls });
  return t;
}
export const isAbstract = (classes: ClassDef[], cls: string) => chain(classes, cls).some(c => c.methods.some(m => m.pure && !chain(classes, cls).some(d => d.methods.some(x => x.name === m.name && !x.pure))));
const allFields = (classes: ClassDef[], cls: string) => [...chain(classes, cls)].reverse().flatMap(c => c.fields.map(f => ({ ...f, owner: c.name })));

export function simulate(p: Program): { events: SimEvent[]; leaks: number[]; output: string[]; errors: string[] } {
  const objects: Obj[] = []; const vars: Record<string, VarInfo> = {}; const refCounts: Record<number, number> = {}; const stackOrder: string[] = [];
  let nextId = 1; const outAll: string[] = []; const events: SimEvent[] = []; const errors: string[] = [];
  const snap = (): Snapshot => structuredClone({ objects, vars, refCounts });
  const cd = (n: string) => { const c = p.classes.find(x => x.name === n); if (!c) throw new Error(`Unknown class ${n}`); return c; };

  const runEffs = (o: Obj, effs: Eff[], out: string[]) => effs.forEach(e => { if (e.k === 'print') out.push(e.text); else if (e.k === 'add') o.fields[e.field] = (Number(o.fields[e.field]) || 0) + e.n; else o.fields[e.field] = e.v; });
  const newObj = (cls: string, where: Obj['where'], owner?: number): Obj => { const o: Obj = { id: nextId++, cls, fields: {}, where, alive: true, owner }; allFields(p.classes, cls).forEach(f => { o.fields[f.name] = f.init ?? (f.type === 'int' ? 0 : f.type === 'string' ? '' : '—'); }); objects.push(o); return o; };

  const construct = (o: Obj, cls: string, out: string[], detail: string[]) => {
    const c = cd(cls); if (c.base) construct(o, c.base, out, detail);
    c.fields.filter(f => p.classes.some(k => k.name === f.type)).forEach(f => { const m = newObj(f.type, 'member', o.id); o.fields[f.name] = `#${m.id}`; detail.push(`member ${f.name} (${f.type}) is constructed before ${cls}'s constructor body runs`); construct(m, f.type, out, detail); });
    runEffs(o, c.ctor, out); out.push(`${cls} constructed`); detail.push(`${cls}::${cls}() ran`);
  };
  const destructFrom = (o: Obj, cls: string, out: string[], detail: string[]) => {
    const c = cd(cls); runEffs(o, c.dtor, out); out.push(`${cls} destroyed`); detail.push(`${cls}::~${cls}() ran`);
    [...c.fields].reverse().filter(f => p.classes.some(k => k.name === f.type)).forEach(f => { const m = objects.find(x => x.id === o.owner || (x.owner === o.id && x.cls === f.type)); const mem = objects.find(x => x.owner === o.id && x.cls === f.type && x.alive); void m; if (mem) { detail.push(`member ${f.name} is destroyed after ${cls}'s destructor body`); destructFrom(mem, f.type, out, detail); mem.alive = false; } });
    if (c.base) destructFrom(o, c.base, out, detail);
  };
  const destroy = (o: Obj, staticType: string, viaPointer: boolean, warnings: string[], out: string[], detail: string[]) => {
    const virt = viaPointer && staticType !== o.cls && chain(p.classes, staticType).some(c => c.virtualDtor);
    const start = viaPointer && staticType !== o.cls && !virt ? staticType : o.cls;
    if (start !== o.cls) { warnings.push(`Undefined behaviour: deleting a ${o.cls} object through a ${staticType}* whose destructor is not virtual. Typically only ~${staticType} runs, so ${o.cls}'s resources leak.`); o.partial = start; }
    else if (staticType !== o.cls) detail.push(`~${staticType} is virtual, so the call is dispatched to the most-derived destructor first`);
    destructFrom(o, start, out, detail); o.alive = false; objects.filter(m => m.owner === o.id).forEach(m => { if (start === o.cls) m.alive = false; });
  };

  const push = (i: number, title: string, detail: string[], output: string[], warnings: string[], dispatch?: SimEvent['dispatch']) => { outAll.push(...output); events.push({ opIndex: i, title, detail, output, warnings, snap: snap(), dispatch }); };
  const release = (name: string, i: number, why: string) => {
    const v = vars[name]; if (!v || v.obj === null) return; const id = v.obj; v.obj = null;
    if (v.kind === 'shared') { refCounts[id] = (refCounts[id] ?? 1) - 1; if (refCounts[id] === 0) { const o = objects.find(x => x.id === id)!; const out: string[] = [], d: string[] = [], w: string[] = []; destroy(o, o.cls, false, w, out, d); push(i, `${name}.reset(): use_count drops to 0`, [why, ...d], out, w); return true; } push(i, `${name} released`, [`use_count is now ${refCounts[id]}; the object lives on`], [], []); return false; }
    if (v.kind === 'unique') { const o = objects.find(x => x.id === id)!; const out: string[] = [], d: string[] = [], w: string[] = []; destroy(o, o.cls, false, w, out, d); push(i, `${name} destroyed its object (unique ownership)`, [why, ...d], out, w); }
    return false;
  };

  p.ops.forEach((op, i) => {
    try {
      const out: string[] = [], detail: string[] = [], warn: string[] = [];
      if (op.k === 'stack') { if (isAbstract(p.classes, op.cls)) throw new Error(`${op.cls} is abstract (it has a pure virtual function) and cannot be instantiated.`); const o = newObj(op.cls, 'stack'); vars[op.v] = { kind: 'obj', obj: o.id, staticType: op.cls }; stackOrder.push(op.v); detail.push(`Memory for ${op.cls} is reserved on the stack (automatic storage)`); construct(o, op.cls, out, detail); push(i, `${op.cls} ${op.v};`, detail, out, warn); }
      else if (op.k === 'heap') { if (isAbstract(p.classes, op.cls)) throw new Error(`${op.cls} is abstract and cannot be instantiated.`); const o = newObj(op.cls, 'heap'); vars[op.v] = { kind: 'ptr', obj: o.id, staticType: op.as ?? op.cls }; detail.push(`operator new allocates a ${op.cls} on the heap; the pointer ${op.v} has static type ${op.as ?? op.cls}*`); construct(o, op.cls, out, detail); push(i, `${op.as ?? op.cls}* ${op.v} = new ${op.cls}();`, detail, out, warn); }
      else if (op.k === 'call') {
        const v = vars[op.v]; if (!v || v.obj === null) throw new Error(`${op.v} does not refer to an object (null/moved-from).`); const o = objects.find(x => x.id === v.obj)!;
        const viaPtr = v.kind !== 'obj'; const virt = isVirtualMethod(p.classes, v.staticType, op.m);
        const stat = chain(p.classes, v.staticType).find(c => c.methods.some(m => m.name === op.m)); if (!stat) throw new Error(`${v.staticType} has no member function ${op.m}() (compile error).`);
        const dynamic = viaPtr && virt; const res = chain(p.classes, dynamic ? o.cls : v.staticType).find(c => c.methods.some(m => m.name === op.m))!; const m = res.methods.find(x => x.name === op.m)!;
        if (m.pure) throw new Error(`Pure virtual function ${op.m}() called.`);
        detail.push(dynamic ? `${op.m} is virtual and ${op.v} is a pointer: the vptr of the ${o.cls} object selects ${res.name}::${op.m} at run time (dynamic dispatch)` : viaPtr ? `${op.m} is NOT virtual: the compiler binds the call using the static type ${v.staticType}, so ${res.name}::${op.m} runs even though the object is a ${o.cls} (static dispatch)` : `Called on an object (not through a pointer): ${res.name}::${op.m} is chosen at compile time`);
        runEffs(o, m.body, out); push(i, `${op.v}${viaPtr ? '->' : '.'}${op.m}();`, detail, out, warn, { method: op.m, staticClass: v.staticType, resolvedClass: res.name, dynamic });
      } else if (op.k === 'delete') {
        const v = vars[op.v]; if (!v || v.obj === null) throw new Error(`${op.v} is null: delete nullptr is a no-op.`); const o = objects.find(x => x.id === v.obj)!; destroy(o, v.staticType, true, warn, out, detail); v.obj = null; push(i, `delete ${op.v};`, detail, out, warn);
      } else if (op.k === 'copy') {
        const s = vars[op.from]; const so = objects.find(x => x.id === s.obj)!; const o = newObj(so.cls, 'stack'); Object.assign(o.fields, so.fields); vars[op.v] = { kind: 'obj', obj: o.id, staticType: s.staticType }; stackOrder.push(op.v);
        out.push(`${so.cls} copy-constructed`); detail.push(`The copy constructor creates a separate object with copied members; changing one no longer affects the other`); push(i, `${so.cls} ${op.v} = ${op.from};`, detail, out, warn);
      } else if (op.k === 'move') {
        const s = vars[op.from]; const so = objects.find(x => x.id === s.obj)!; const o = newObj(so.cls, 'stack'); Object.assign(o.fields, so.fields); Object.keys(so.fields).forEach(k => { so.fields[k] = typeof so.fields[k] === 'number' ? 0 : ''; });
        vars[op.v] = { kind: 'obj', obj: o.id, staticType: s.staticType }; stackOrder.push(op.v); out.push(`${so.cls} move-constructed`); detail.push(`The move constructor steals the resources of ${op.from}, leaving it valid but empty (moved-from)`); push(i, `${so.cls} ${op.v} = std::move(${op.from});`, detail, out, warn);
      } else if (op.k === 'slice') {
        const s = vars[op.from]; const so = objects.find(x => x.id === s.obj)!; const o = newObj(op.as, 'stack'); allFields(p.classes, op.as).forEach(f => { o.fields[f.name] = so.fields[f.name]; });
        vars[op.v] = { kind: 'obj', obj: o.id, staticType: op.as }; stackOrder.push(op.v); out.push(`${op.as} copy-constructed`); warn.push(`Object slicing: only the ${op.as} part of the ${so.cls} was copied; the derived members and overrides are lost. Use a pointer or reference to keep polymorphism.`); push(i, `${op.as} ${op.v} = ${op.from};`, ['A derived object is copied into a base-class OBJECT'], out, warn);
      } else if (op.k === 'shared') { const o = newObj(op.cls, 'heap'); vars[op.v] = { kind: 'shared', obj: o.id, staticType: op.cls }; refCounts[o.id] = 1; construct(o, op.cls, out, detail); detail.push('use_count = 1'); push(i, `auto ${op.v} = std::make_shared<${op.cls}>();`, detail, out, warn); }
      else if (op.k === 'shareCopy') { const s = vars[op.from]; vars[op.v] = { kind: 'shared', obj: s.obj, staticType: s.staticType }; refCounts[s.obj!]++; push(i, `auto ${op.v} = ${op.from};`, [`Both shared_ptrs now own the same object: use_count = ${refCounts[s.obj!]}`], [], warn); }
      else if (op.k === 'reset') { release(op.v, i, `${op.v}.reset()`); }
      else if (op.k === 'unique') { const o = newObj(op.cls, 'heap'); vars[op.v] = { kind: 'unique', obj: o.id, staticType: op.cls }; construct(o, op.cls, out, detail); push(i, `auto ${op.v} = std::make_unique<${op.cls}>();`, detail, out, warn); }
      else if (op.k === 'uniqueMove') { const s = vars[op.from]; vars[op.v] = { kind: 'unique', obj: s.obj, staticType: s.staticType }; s.obj = null; push(i, `auto ${op.v} = std::move(${op.from});`, [`Ownership transfers: ${op.from} becomes null, ${op.v} now owns the object (unique_ptr cannot be copied)`], [], warn); }
      else if (op.k === 'scopeEnd') {
        const names = [...stackOrder].reverse(); push(i, '}  // end of scope', ['Automatic objects are destroyed in REVERSE order of construction (RAII)'], [], []);
        names.forEach(n => { const v = vars[n]; if (v?.obj != null) { const o = objects.find(x => x.id === v.obj)!; if (o.alive) { const out2: string[] = [], d2: string[] = [], w2: string[] = []; destroy(o, o.cls, false, w2, out2, d2); push(i, `${n} goes out of scope`, d2, out2, w2); } } });
        Object.keys(vars).filter(n => vars[n].kind === 'shared' || vars[n].kind === 'unique').reverse().forEach(n => { if (vars[n].obj !== null) release(n, i, `${n} goes out of scope`); });
      }
    } catch (e: any) { errors.push(`Step ${i + 1}: ${e.message}`); push(i, 'Error', [e.message], [], [e.message]); }
  });
  const leaks = objects.filter(o => (o.where === 'heap' && o.alive) || (o.partial && o.where === 'heap')).map(o => o.id);
  return { events, leaks, output: outAll, errors };
}

// ------------------------------------------------------------------ C++ source generation (line numbers feed the highlighter)
export function generateCpp(p: Program): { lines: string[]; opLine: number[] } {
  const L: string[] = ['#include <iostream>', '#include <memory>', 'using namespace std;', ''];
  const eff = (e: Eff) => (e.k === 'print' ? `cout << "${e.text}" << endl;` : e.k === 'add' ? `${e.field} += ${e.n};` : `${e.field} = ${typeof e.v === 'string' ? `"${e.v}"` : e.v};`);
  p.classes.forEach(c => {
    L.push(`class ${c.name}${c.base ? ` : public ${c.base}` : ''} {`);
    const priv = c.fields.filter(f => f.access === 'private'), pub = c.fields.filter(f => f.access !== 'private');
    if (priv.length) { L.push('private:'); priv.forEach(f => L.push(`    ${f.type} ${f.name}${f.init !== undefined ? ` = ${typeof f.init === 'string' ? `"${f.init}"` : f.init}` : ''};`)); }
    L.push('public:'); pub.forEach(f => L.push(`    ${f.type} ${f.name}${f.init !== undefined ? ` = ${typeof f.init === 'string' ? `"${f.init}"` : f.init}` : ''};`));
    L.push(`    ${c.name}() {`); c.ctor.forEach(e => L.push(`        ${eff(e)}`)); L.push(`        cout << "${c.name} constructed" << endl;`); L.push('    }');
    L.push(`    ${c.virtualDtor ? 'virtual ' : ''}~${c.name}() {`); c.dtor.forEach(e => L.push(`        ${eff(e)}`)); L.push(`        cout << "${c.name} destroyed" << endl;`); L.push('    }');
    c.methods.forEach(m => { L.push(`    ${m.virtual ? 'virtual ' : ''}${m.returns ?? 'void'} ${m.name}()${m.override ? ' override' : ''}${m.pure ? ' = 0;' : ' {'}`); if (!m.pure) { m.body.forEach(e => L.push(`        ${eff(e)}`)); L.push('    }'); } });
    L.push('};', '');
  });
  L.push('int main() {'); const opLine: number[] = [];
  const ptrVars = new Set<string>(); p.ops.forEach(o => { if (o.k === 'heap' || o.k === 'shared' || o.k === 'unique' || o.k === 'shareCopy' || o.k === 'uniqueMove') ptrVars.add(o.v); });
  const text = (op: Op): string => { switch (op.k) {
    case 'stack': return `${op.cls} ${op.v};`; case 'heap': return `${op.as ?? op.cls}* ${op.v} = new ${op.cls}();`;
    case 'call': return `${op.v}${ptrVars.has(op.v) ? '->' : '.'}${op.m}();`; case 'delete': return `delete ${op.v};`;
    case 'copy': return `auto ${op.v} = ${op.from};`; case 'move': return `auto ${op.v} = std::move(${op.from});`; case 'slice': return `${op.as} ${op.v} = ${op.from};`;
    case 'shared': return `auto ${op.v} = make_shared<${op.cls}>();`; case 'shareCopy': return `auto ${op.v} = ${op.from};`; case 'reset': return `${op.v}.reset();`;
    case 'unique': return `auto ${op.v} = make_unique<${op.cls}>();`; case 'uniqueMove': return `auto ${op.v} = std::move(${op.from});`; case 'scopeEnd': return '// end of scope: automatic objects are destroyed here'; } };
  p.ops.forEach(op => { L.push(`    ${text(op)}`); opLine.push(L.length); });
  L.push('}');
  return { lines: L, opLine };
}
