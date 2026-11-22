// Value types and numeric semantics shared by the interpreter.
import type { Type } from './parser';

const kstr = (k: any): string => k === null ? 'z' : typeof k === 'object' && 'kind' in k && 'id' in k && !Array.isArray(k) ? 'p' + k.id : typeof k === 'number' || typeof k === 'bigint' ? 'n' + k : typeof k === 'string' ? 's' + k : typeof k === 'boolean' ? 'n' + +k : k instanceof Dbl ? 'n' + k.v
  : 'a' + JSON.stringify(k, (_, x) => (typeof x === 'bigint' ? x.toString() : x instanceof Dbl ? x.v : x));
/** std::map / std::set / unordered variants with VALUE-based keys (pairs and vectors work as keys). Maps keep insertion order; sorted ones iterate by key. */
export class CMap {
  private store = new Map<string, [any, any]>();
  constructor(public kind: 'map' | 'set', public sorted: boolean, public valType?: Type) {}
  get size() { return this.store.size; }
  has(k: any) { return this.store.has(kstr(k)); }
  get(k: any) { return this.store.get(kstr(k))?.[1]; }
  set(k: any, v: any) { const s = kstr(k); const e = this.store.get(s); if (e) e[1] = v; else this.store.set(s, [k, v]); }
  del(k: any) { return this.store.delete(kstr(k)); }
  clear() { this.store.clear(); }
  keys(): any[] { const k = [...this.store.values()].map(e => e[0]); return this.sorted ? k.sort(cmpVals) : k; }
}
/** double / float (kept distinct from int so that 7/2 is 3 but 7.0/2 is 3.5) */
export class Dbl { constructor(public v: number) {} }
export const isD = (x: any): x is Dbl => x instanceof Dbl;
/** random-access iterator over a vector or string */
export class IterV { constructor(public arr: any[] | string, public i: number, public ref?: { get(): any; set(v: any): void }) {} }
export class MapIter { constructor(public m: CMap, public k: any) {} }
export const END: { end: true } = { end: true };
export class Lambda { constructor(public def: any, public captured: Map<string, any>[]) {} }
export class FnRef { constructor(public name: string) {} }

export const SAFE = 9007199254740991n;
export const norm = (b: bigint): number | bigint => (b >= -SAFE && b <= SAFE ? Number(b) : b);
export const toN = (x: any): number => (x instanceof Dbl ? x.v : typeof x === 'bigint' ? Number(x) : typeof x === 'boolean' ? +x : x);
export const truthy = (v: any): boolean => (v instanceof Dbl ? v.v !== 0 : typeof v === 'bigint' ? v !== 0n : !!v);

/** total order used by sort, set/map keys and heaps: numbers, strings and (pair/vector) arrays lexicographically */
export function cmpVals(a: any, b: any): number {
  if (Array.isArray(a) && Array.isArray(b)) { const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) { const c = cmpVals(a[i], b[i]); if (c) return c; } return a.length - b.length; }
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  const x = a instanceof Dbl ? a.v : typeof a === 'boolean' ? +a : a, y = b instanceof Dbl ? b.v : typeof b === 'boolean' ? +b : b;
  return x < y ? -1 : x > y ? 1 : 0;
}
export const valEq = (a: any, b: any): boolean => cmpVals(a, b) === 0;

const fits32 = (x: number) => x >= -2147483648 && x <= 2147483647;
/** Arithmetic / comparison on numeric operands: int (JS number), 64-bit (BigInt beyond 2^53) and double. */
export function arith(op: string, a: any, b: any): any {
  if (a instanceof Dbl || b instanceof Dbl) {
    const x = toN(a), y = toN(b);
    switch (op) {
      case '+': return new Dbl(x + y); case '-': return new Dbl(x - y); case '*': return new Dbl(x * y); case '/': return new Dbl(x / y);
      case '<': return x < y; case '>': return x > y; case '<=': return x <= y; case '>=': return x >= y; case '==': return x === y; case '!=': return x !== y;
    }
    throw new Error(`operator ${op} is not valid for floating-point operands`);
  }
  if (typeof a === 'boolean') a = +a; if (typeof b === 'boolean') b = +b;
  const big = typeof a === 'bigint' || typeof b === 'bigint';
  switch (op) {
    case '<': return a < b; case '>': return a > b; case '<=': return a <= b; case '>=': return a >= b;
    case '==': return a == b; case '!=': return a != b; // eslint-disable-line eqeqeq
  }
  const B = (x: any) => BigInt(typeof x === 'bigint' ? x : Math.trunc(x));
  switch (op) {
    case '+': case '-': case '*': {
      if (!big) { const r = op === '+' ? a + b : op === '-' ? a - b : a * b; if (Number.isSafeInteger(r)) return r; }
      return norm(op === '+' ? B(a) + B(b) : op === '-' ? B(a) - B(b) : B(a) * B(b));
    }
    case '/': return big || !fits32(a) || !fits32(b) ? norm(B(a) / B(b)) : Math.trunc(a / b);
    case '%': return big || !fits32(a) || !fits32(b) ? norm(B(a) % B(b)) : a % b;
    case '&': case '|': case '^': {
      if (!big && fits32(a) && fits32(b)) return op === '&' ? a & b : op === '|' ? a | b : a ^ b;
      return norm(op === '&' ? B(a) & B(b) : op === '|' ? B(a) | B(b) : B(a) ^ B(b));
    }
    case '<<': return norm(B(a) << B(b));
    case '>>': return !big && fits32(a) && b >= 0 && b < 32 ? a >> b : norm(B(a) >> B(b));
  }
  throw new Error(`unsupported operator ${op}`);
}
