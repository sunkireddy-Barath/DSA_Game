// Software-engineering engines: executable pattern demos and process simulators (Kanban, Scrum, CI/CD).

// ------------------------------------------------------------------ Strategy vs switch (change-impact game)
export type Method = string;
export const BASE_METHODS = ['card', 'paypal'];
export const SWITCH_SITES = ['Checkout.cpp (charge)', 'Refund.cpp (refund)', 'Receipt.cpp (describe)'] as const;
const FEES: Record<string, (a: number) => number> = { card: a => +(a * 0.02).toFixed(2), paypal: a => +(a * 0.03 + 0.3).toFixed(2), upi: () => 0, crypto: a => +(a * 0.01).toFixed(2) };
export interface ImpactResult { filesToTouch: string[]; works: { op: string; ok: boolean; why: string }[]; compilerHelp: string }
/** Bad design: every operation switches on the method. `edited` = the sites the student remembered to update. */
export function switchDesign(newMethod: string, edited: string[]): ImpactResult {
  const works = SWITCH_SITES.map(site => { const ok = edited.includes(site); return { op: site, ok, why: ok ? `handles "${newMethod}"` : `falls into the default branch: "unsupported payment method" at runtime` }; });
  return { filesToTouch: [...SWITCH_SITES], works, compilerHelp: 'None: a forgotten `case` compiles fine and fails only at run time (the switch has a default branch).' };
}
/** Good design: one class implements the whole PaymentStrategy interface; the abstract class forces every operation. */
export function strategyDesign(newMethod: string, implemented: string[]): ImpactResult {
  const ops = ['charge()', 'refund()', 'describe()'];
  const works = ops.map(op => { const ok = implemented.includes(op); return { op: `${cap(newMethod)}Payment::${op}`, ok, why: ok ? 'implemented' : 'compile error: the class is still abstract (pure virtual function not overridden), so it cannot be instantiated' }; });
  return { filesToTouch: [`${cap(newMethod)}Payment.cpp (new file)`], works, compilerHelp: 'The compiler refuses to instantiate a class that misses an interface function, and Checkout/Refund/Receipt are not modified (Open/Closed Principle).' };
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const fee = (method: string, amount: number) => { const f = FEES[method]; if (!f) throw new Error(`unsupported payment method "${method}"`); return f(amount); };

// ------------------------------------------------------------------ executable pattern demos (each returns a step log)
export interface Demo { log: string[]; value?: unknown }
export function strategyDemo(amount: number, method: string): Demo {
  const strategies: Record<string, { name: string; charge: (a: number) => number }> = Object.fromEntries(Object.keys(FEES).map(k => [k, { name: `${cap(k)}Payment`, charge: (a: number) => +(a + FEES[k](a)).toFixed(2) }]));
  const s = strategies[method]; if (!s) throw new Error(`unknown strategy "${method}"`);
  return { log: [`Context (Checkout) holds a PaymentStrategy; the chosen one is ${s.name}`, `checkout.pay(${amount}) → delegates to ${s.name}::charge(${amount})`, `Result: customer pays ${s.charge(amount)}`], value: s.charge(amount) };
}
export class Subject {
  private obs = new Map<string, (e: string) => string>(); log: string[] = [];
  subscribe(name: string, fn: (e: string) => string) { this.obs.set(name, fn); this.log.push(`${name} subscribed (${this.obs.size} observer(s))`); }
  unsubscribe(name: string) { this.obs.delete(name); this.log.push(`${name} unsubscribed (${this.obs.size} observer(s))`); }
  notify(event: string) { this.log.push(`Subject publishes "${event}"`); this.obs.forEach((fn, n) => this.log.push(`  → ${n}: ${fn(event)}`)); }
}
export class Editor {
  text = ''; undo: { name: string; undo: () => void; redo: () => void }[] = []; redoStack: typeof this.undo = []; log: string[] = [];
  insert(s: string) { const before = this.text; const c = { name: `insert "${s}"`, redo: () => { this.text = before + s; }, undo: () => { this.text = before; } }; c.redo(); this.undo.push(c); this.redoStack = []; this.log.push(`execute ${c.name} → "${this.text}"`); }
  del(n: number) { const before = this.text; const c = { name: `delete ${n}`, redo: () => { this.text = before.slice(0, Math.max(0, before.length - n)); }, undo: () => { this.text = before; } }; c.redo(); this.undo.push(c); this.redoStack = []; this.log.push(`execute ${c.name} → "${this.text}"`); }
  doUndo() { const c = this.undo.pop(); if (!c) { this.log.push('nothing to undo'); return; } c.undo(); this.redoStack.push(c); this.log.push(`undo ${c.name} → "${this.text}"`); }
  doRedo() { const c = this.redoStack.pop(); if (!c) { this.log.push('nothing to redo'); return; } c.redo(); this.undo.push(c); this.log.push(`redo ${c.name} → "${this.text}"`); }
}
const ORDER_FLOW: Record<string, string[]> = { New: ['Paid', 'Cancelled'], Paid: ['Shipped', 'Cancelled'], Shipped: ['Delivered'], Delivered: [], Cancelled: [] };
export function orderStateMachine(events: string[]) {
  let s = 'New'; const log = [`state = New`];
  for (const e of events) { if (ORDER_FLOW[s].includes(e)) { log.push(`${s} --${e}--> ${e}`); s = e; } else log.push(`✗ "${e}" is not allowed in state ${s} (allowed: ${ORDER_FLOW[s].join(', ') || 'none: terminal state'})`); }
  return { state: s, log };
}
const TOPPINGS: Record<string, [string, number]> = { milk: ['Milk', 0.5], sugar: ['Sugar', 0.2], whip: ['Whip', 0.7], caramel: ['Caramel', 0.6] };
export function decorate(base: 'espresso' | 'tea', toppings: string[]) {
  let cost = base === 'espresso' ? 2.0 : 1.5; let desc = cap(base); const log = [`${cap(base)}: ${cost.toFixed(2)}`];
  for (const t of toppings) { const d = TOPPINGS[t]; if (!d) throw new Error(`unknown topping "${t}"`); cost += d[1]; desc += ` + ${d[0]}`; log.push(`wrap with ${d[0]}Decorator: cost() = inner.cost() + ${d[1].toFixed(2)} = ${cost.toFixed(2)}`); }
  return { description: desc, cost: +cost.toFixed(2), log };
}
export function supportChain(severity: number) {
  const handlers = [{ n: 'Level-1 support', max: 1 }, { n: 'Level-2 engineer', max: 3 }, { n: 'Team manager', max: 5 }]; const trail: string[] = [];
  for (const h of handlers) { if (severity <= h.max) { trail.push(`${h.n} handles severity ${severity}`); return { handledBy: h.n, trail }; } trail.push(`${h.n} cannot handle severity ${severity}: passes it on`); }
  trail.push('End of chain: unhandled'); return { handledBy: null as string | null, trail };
}
export class Registry { static created = 0; private static inst: Registry | null = null; private constructor() { Registry.created++; } static get() { return (Registry.inst ??= new Registry()); } static reset() { Registry.inst = null; Registry.created = 0; } }
export function factory(kind: string, size: number) {
  const make: Record<string, () => { name: string; area: number }> = { circle: () => ({ name: 'Circle', area: +(Math.PI * size * size).toFixed(2) }), square: () => ({ name: 'Square', area: size * size }), triangle: () => ({ name: 'Triangle', area: +(0.5 * size * size).toFixed(2) }) };
  if (!make[kind]) throw new Error(`factory cannot create "${kind}" (known: ${Object.keys(make).join(', ')})`); return make[kind]();
}

// ------------------------------------------------------------------ Kanban
export interface Card { id: number; title: string; col: number; startDay?: number; doneDay?: number }
export class Kanban {
  cols = ['Backlog', 'In Progress', 'Review', 'Done']; wip: (number | null)[] = [null, 2, 2, null]; cards: Card[] = []; day = 0; log: string[] = [];
  constructor(n = 8) { for (let i = 1; i <= n; i++) this.cards.push({ id: i, title: `Story ${i}`, col: 0 }); }
  count(col: number) { return this.cards.filter(c => c.col === col).length; }
  move(id: number, to: number): { ok: boolean; reason?: string } {
    const c = this.cards.find(x => x.id === id); if (!c) return { ok: false, reason: 'no such card' };
    if (to !== c.col + 1) return { ok: false, reason: `cards move one column at a time (${this.cols[c.col]} → ${this.cols[c.col + 1] ?? 'nothing'})` };
    const lim = this.wip[to]; if (lim !== null && this.count(to) >= lim) { const r = `WIP limit reached in "${this.cols[to]}" (${lim}): finish something first`; this.log.push(`day ${this.day}: ✗ ${c.title} blocked — ${r}`); return { ok: false, reason: r }; }
    c.col = to; if (to === 1 && c.startDay === undefined) c.startDay = this.day; if (to === 3) c.doneDay = this.day; this.log.push(`day ${this.day}: ${c.title} → ${this.cols[to]}`); return { ok: true };
  }
  nextDay() { this.day++; }
  metrics() { const done = this.cards.filter(c => c.doneDay !== undefined); const lead = done.map(c => c.doneDay! - (c.startDay ?? 0)); return { done: done.length, throughput: this.day ? done.length / this.day : 0, avgLeadTime: lead.length ? lead.reduce((a, b) => a + b, 0) / lead.length : 0, inProgress: this.count(1) + this.count(2) }; }
}

// ------------------------------------------------------------------ Scrum
export interface Story { title: string; points: number; priority: number }
export function planSprints(backlog: Story[], velocity: number) {
  if (velocity <= 0) throw new Error('Velocity must be positive.'); const items = [...backlog].sort((a, b) => a.priority - b.priority); const sprints: { items: Story[]; points: number }[] = []; const tooBig = items.filter(s => s.points > velocity);
  let cur: Story[] = [], pts = 0; const rest = items.filter(s => s.points <= velocity);
  for (const s of rest) { if (pts + s.points > velocity) { sprints.push({ items: cur, points: pts }); cur = []; pts = 0; } cur.push(s); pts += s.points; } if (cur.length) sprints.push({ items: cur, points: pts });
  return { sprints, tooBig, total: items.reduce((a, s) => a + s.points, 0) };
}
export function burndown(sprintPoints: number, days: number, completedPerDay: number[]) {
  const ideal = Array.from({ length: days + 1 }, (_, d) => +(sprintPoints * (1 - d / days)).toFixed(2)); let left = sprintPoints; const actual = [left];
  for (let d = 0; d < days; d++) { left = Math.max(0, left - (completedPerDay[d] ?? 0)); actual.push(left); }
  return { ideal, actual, onTrack: actual[actual.length - 1] <= ideal[ideal.length - 1] + 1e-9 };
}

// ------------------------------------------------------------------ CI/CD
export const STAGES = ['Build', 'Unit tests', 'Integration tests', 'Security scan', 'Deploy to staging', 'Deploy to production'] as const;
export type Strategy = 'rolling' | 'blue-green' | 'canary';
export function pipeline(opts: { failAt: number | null; strategy: Strategy; canaryErrorRate?: number; threshold?: number }) {
  const log: string[] = []; const stages: { name: string; status: 'passed' | 'failed' | 'skipped' }[] = []; let stop = false;
  STAGES.forEach((s, i) => { if (stop) { stages.push({ name: s, status: 'skipped' }); return; } if (opts.failAt === i) { stages.push({ name: s, status: 'failed' }); log.push(`✗ ${s} failed: the pipeline stops; nothing broken reaches users`); stop = true; return; } stages.push({ name: s, status: 'passed' }); log.push(`✓ ${s}`); });
  let prod = 'v1', traffic: number[] = []; const reachedProd = !stop;
  if (reachedProd) {
    const th = opts.threshold ?? 0.02, err = opts.canaryErrorRate ?? 0;
    if (opts.strategy === 'blue-green') { log.push('Blue-green: v2 started beside v1 (green); switching the router to v2 in one step'); if (err > th) { log.push(`✗ error rate ${(err * 100).toFixed(1)}% > ${(th * 100).toFixed(0)}% after switch: switch back to v1 (instant rollback)`); prod = 'v1'; } else prod = 'v2'; traffic = [100]; }
    else if (opts.strategy === 'canary') { prod = 'v2'; for (const p of [5, 25, 50, 100]) { traffic.push(p); log.push(`Canary: ${p}% of traffic on v2`); if (err > th) { log.push(`✗ error rate ${(err * 100).toFixed(1)}% > ${(th * 100).toFixed(0)}% at ${p}%: automatic rollback, v1 serves 100%`); prod = 'v1'; break; } } }
    else { let rolledBack = false; for (const p of [25, 50, 75, 100]) { traffic.push(p); log.push(`Rolling: ${p}% of instances updated`); if (err > th && p === 50) { log.push('✗ errors detected: roll back the updated instances'); rolledBack = true; break; } } prod = rolledBack ? 'v1' : 'v2'; }
  }
  return { stages, log, prod, traffic, deployed: prod === 'v2' };
}
