// Lexer + parser for the C++ subset that DSA Quest can execute and trace.
// Anything outside the subset raises a CppError that names the unsupported construct;
// we never silently skip code.

export type Tok = { t: 'num' | 'id' | 'str' | 'chr' | 'op'; v: string; line: number; pos: number };
export class CppError extends Error {
  constructor(msg: string, public line: number, public unsupported = false) {
    super(msg);
  }
}
export interface Type { base: string; args: Type[]; ref: boolean; ptr?: boolean; size?: number }
export type Node = { k: string; line: number; [key: string]: any };
export interface FnDef {
  name: string; ret: Type; params: { name: string; type: Type }[];
  body: Node; line: number; endLine: number; idxVars: Set<string>;
}
export interface Program { fns: Record<string, FnDef>; globals: Node[] }

const OPS = ['<<=', '>>=', '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '::', '->'];

export function lex(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0, line = 1;
  const esc = (c: string) => ({ n: '\n', t: '\t', '0': '\0', '\\': '\\', "'": "'", '"': '"' } as any)[c] ?? c;
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
      i += 2; continue;
    }
    if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9a-zA-Z.]/.test(src[j])) j++;
      toks.push({ t: 'num', v: src.slice(i, j).replace(/[uUlL]+$/, ''), line, pos: i });
      i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      toks.push({ t: 'id', v: src.slice(i, j), line, pos: i });
      i = j; continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') { s += esc(src[j + 1]); j += 2; } else s += src[j++];
      }
      toks.push({ t: c === "'" ? 'chr' : 'str', v: s, line, pos: i });
      i = j + 1; continue;
    }
    const op = OPS.find(o => src.startsWith(o, i));
    if (op) { toks.push({ t: 'op', v: op, line, pos: i }); i += op.length; continue; }
    toks.push({ t: 'op', v: c, line, pos: i }); i++;
  }
  toks.push({ t: 'op', v: '<eof>', line, pos: i });
  return toks;
}

const MODS = new Set(['const', 'static', 'unsigned', 'signed', 'constexpr']);
const BASE_TYPES = new Set(['ListNode', 'TreeNode', 'stack', 'queue', 'deque', 'priority_queue', 'greater', 'less', 'pair', 'array', 'double', 'float', 'int64_t', 'uint64_t', 'int32_t', 'uint32_t', 'int', 'long', 'short', 'bool', 'char', 'string', 'auto', 'void', 'vector', 'unordered_map', 'map', 'unordered_set', 'set', 'size_t']);
const CONTAINERS = new Set(['stack', 'queue', 'deque', 'priority_queue', 'greater', 'less', 'pair', 'array', 'vector', 'unordered_map', 'map', 'unordered_set', 'set']);
const KEYWORDS = new Set(['return', 'else', 'if', 'for', 'while', 'do', 'break', 'continue', 'new', 'delete', 'throw', 'case', 'goto']);
const ASSIGN = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']);
const PREC: Record<string, number> = {
  '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7,
  '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10,
};

function collectIds(e: any, out: Set<string>) {
  if (!e || typeof e !== 'object') return;
  if (e.k === 'id') out.add(e.name);
  for (const key of Object.keys(e)) {
    const v = e[key];
    if (Array.isArray(v)) v.forEach(x => collectIds(x, out)); else if (v && typeof v === 'object') collectIds(v, out);
  }
}

class P {
  toks: Tok[]; i = 0; idx = new Set<string>();
  constructor(src: string) { this.toks = lex(src); }
  get cur() { return this.toks[this.i]; }
  peek(n = 1) { return this.toks[Math.min(this.i + n, this.toks.length - 1)]; }
  isOp(v: string) { return this.cur.t === 'op' && this.cur.v === v; }
  isId(v: string) { return this.cur.t === 'id' && this.cur.v === v; }
  eat(v: string) { if (this.cur.v === v && (this.cur.t === 'op' || this.cur.t === 'id')) { this.i++; return true; } return false; }
  err(m: string, unsupported = false): never {
    throw new CppError(`error: ${m} (near '${this.cur.v}')`, this.cur.line, unsupported);
  }
  expect(v: string) { if (!this.eat(v)) this.err(`expected '${v}'`); }
  ident() { if (this.cur.t !== 'id') this.err('expected identifier'); return this.toks[this.i++].v; }

  program(): Program {
    const fns: Record<string, FnDef> = {}, globals: Node[] = [];
    while (this.i < this.toks.length - 1) {
      if (this.isId('using')) { while (!this.isOp(';')) this.i++; this.i++; continue; }
      if ((this.isId('struct') || this.isId('class')) && (this.peek().v === 'ListNode' || this.peek().v === 'TreeNode')) {
        while (!this.isOp('{')) this.i++;
        let d = 0;
        do { if (this.isOp('{')) d++; else if (this.isOp('}')) d--; this.i++; } while (d > 0);
        this.eat(';'); continue;
      }
      if (this.isId('class') || this.isId('struct')) {
        this.i++; this.ident();
        if (this.isId('final')) this.i++;
        this.expect('{');
        while (!this.isOp('}')) {
          if ((this.isId('public') || this.isId('private') || this.isId('protected')) && this.peek().v === ':') { this.i += 2; continue; }
          this.member(fns, globals);
        }
        this.i++; this.eat(';'); continue;
      }
      this.member(fns, globals);
    }
    return { fns, globals };
  }
  member(fns: Record<string, FnDef>, globals: Node[]) {
    const line = this.cur.line;
    const type = this.type();
    const name = this.ident();
    if (this.isOp('(')) {
      this.i++;
      const params: { name: string; type: Type }[] = [];
      while (!this.isOp(')')) {
        const t = this.type();
        const pn = this.cur.t === 'id' ? this.ident() : '_';
        if (this.eat('[')) { this.expect(']'); t.base = 'vector'; t.args = [{ base: 'int', args: [], ref: false }]; }
        params.push({ name: pn, type: t });
        if (!this.eat(',')) break;
      }
      this.expect(')');
      this.idx = new Set();
      const body = this.blockNode();
      fns[name] = { name, ret: type, params, body, line, endLine: body.endLine, idxVars: this.idx };
    } else {
      this.i--;
      const ds = this.declarators();
      this.expect(';');
      globals.push({ k: 'decl', line, type, ds });
    }
  }
  type(): Type {
    while (this.cur.t === 'id' && MODS.has(this.cur.v)) this.i++;
    if (this.isId('std') && this.peek().v === '::') this.i += 2;
    const line = this.cur.line;
    let base = this.ident();
    if (base === 'int64_t' || base === 'uint64_t') base = 'long';
    if (base === 'int32_t' || base === 'uint32_t') base = 'int';
    if (!BASE_TYPES.has(base))
      throw new CppError(`unsupported: type '${base}' (general structs/classes are not traceable yet; use ListNode/TreeNode or standard containers)`, line, true);
    if (base === 'long' && this.isId('long')) this.i++;
    if (base === 'long' && this.isId('int')) this.i++;
    if (base === 'long' && this.isId('double')) { this.i++; base = 'double'; }
    const args: Type[] = []; let size: number | undefined;
    if (this.isOp('<') && CONTAINERS.has(base)) {
      this.i++;
      do { if (base === 'array' && args.length === 1) { size = +this.cur.v; this.i++; } else args.push(this.type()); } while (this.eat(','));
      this.expect('>');
      if (base === 'array') base = 'vector';
    }
    while (this.isId('const')) this.i++;
    let ref = false;
    if (this.eat('&')) ref = true;
    let ptr = false;
    if (this.isOp('*')) { if (base !== 'ListNode' && base !== 'TreeNode') this.err('pointers to this type are not supported by the tracer yet', true); this.i++; ptr = true; }
    if (this.eat('&')) ref = true;
    return { base, args, ref, ptr, size };
  }
  isDeclStart() {
    const t = this.cur;
    if (t.t !== 'id' || KEYWORDS.has(t.v)) return false;
    if (MODS.has(t.v) || BASE_TYPES.has(t.v)) {
      if (CONTAINERS.has(t.v) || t.v === 'string') return this.peek().v !== '(' ; // string(...) expr unlikely
      return this.peek().v !== '(';
    }
    if (t.v === 'std' && this.peek().v === '::') return true;
    if ((t.v === 'ListNode' || t.v === 'TreeNode') && (this.peek().v === '*' || this.peek().t === 'id')) return true;
    return (this.peek().t === 'id' && !KEYWORDS.has(this.peek().v)) || (this.peek().v === '*' && this.peek(2).t === 'id');
  }
  declarators() {
    const ds: any[] = [];
    do {
      const d: any = { name: this.ident(), line: this.cur.line };
      const sizes: Node[] = []; while (this.eat('[')) { sizes.push(this.assign()); this.expect(']'); } if (sizes.length) d.sizes = sizes;
      if (this.eat('=')) d.init = this.assign();
      else if (this.isOp('(')) { this.i++; d.ctor = this.args(')'); }
      else if (this.isOp('{')) { const line = this.cur.line; this.i++; d.init = { k: 'init', items: this.args('}'), line }; }
      ds.push(d);
    } while (this.eat(','));
    return ds;
  }
  args(close: string) {
    const out: Node[] = [];
    while (!this.isOp(close)) { out.push(this.assign()); if (!this.eat(',')) break; }
    this.expect(close);
    return out;
  }
  blockNode(): Node {
    const line = this.cur.line;
    this.expect('{');
    const body: Node[] = [];
    while (!this.isOp('}')) { if (this.i >= this.toks.length - 1) this.err("expected '}'"); body.push(this.stmt()); }
    const endLine = this.cur.line;
    this.i++;
    return { k: 'block', line, body, endLine };
  }
  stmt(): Node {
    const line = this.cur.line;
    if (this.isOp('{')) return this.blockNode();
    if (this.eat(';')) return { k: 'block', line, body: [], endLine: line };
    if (this.eat('if')) {
      this.expect('('); const cond = this.expr(); this.expect(')');
      const then = this.stmt(); const els = this.eat('else') ? this.stmt() : null;
      return { k: 'if', line, cond, then, els };
    }
    if (this.eat('while')) {
      this.expect('('); const cond = this.expr(); this.expect(')');
      return { k: 'while', line, cond, body: this.stmt() };
    }
    if (this.eat('do')) {
      const body = this.stmt(); this.expect('while'); this.expect('('); const cond = this.expr(); this.expect(')'); this.expect(';');
      return { k: 'dowhile', line, cond, body };
    }
    if (this.eat('for')) return this.forStmt(line);
    if (this.eat('return')) {
      const e = this.isOp(';') ? null : this.expr(); this.expect(';');
      return { k: 'return', line, e };
    }
    if (this.eat('break')) { this.expect(';'); return { k: 'break', line }; }
    if (this.eat('continue')) { this.expect(';'); return { k: 'continue', line }; }
    if (this.eat('switch')) return this.switchStmt(line);
    if (this.isId('auto') || (this.isId('const') && this.peek().v === 'auto')) { // structured binding: auto [a, b] = expr;
      const save = this.i; const type = this.type();
      if (this.isOp('[')) {
        this.i++; const names: string[] = []; while (!this.isOp(']')) { names.push(this.ident()); if (!this.eat(',')) break; } this.expect(']'); this.expect('=');
        const init = this.assign(); this.expect(';'); return { k: 'bind', line, type, names, init };
      }
      this.i = save;
    }
    if (this.isDeclStart()) {
      const type = this.type(); const ds = this.declarators(); this.expect(';');
      return { k: 'decl', line, type, ds };
    }
    const e = this.expr(); this.expect(';');
    return { k: 'expr', line, e };
  }
  switchStmt(line: number): Node {
    this.expect('('); const e = this.expr(); this.expect(')'); this.expect('{');
    const cases: { v: Node | null; body: Node[] }[] = [];
    while (!this.isOp('}')) {
      let v: Node | null = null;
      if (this.eat('case')) v = this.ternary(); else if (!this.eat('default')) this.err("expected 'case' or 'default'");
      this.expect(':'); const body: Node[] = [];
      while (!this.isOp('}') && !this.isId('case') && !this.isId('default')) body.push(this.stmt());
      cases.push({ v, body });
    }
    this.i++; return { k: 'switch', line, e, cases };
  }
  forStmt(line: number): Node {
    this.expect('(');
    let init: Node | null = null;
    if (this.isDeclStart()) {
      const type = this.type();
      if (this.isOp('[')) { // for (auto& [k, v] : container)
        this.i++; const names: string[] = []; while (!this.isOp(']')) { names.push(this.ident()); if (!this.eat(',')) break; } this.expect(']'); this.expect(':');
        const iter = this.expr(); this.expect(')'); return { k: 'foreach', line, type, name: '', bind: names, iter, body: this.stmt() };
      }
      if (this.cur.t === 'id' && this.peek().v === ':') {
        const name = this.ident(); this.i++;
        const iter = this.expr(); this.expect(')');
        return { k: 'foreach', line, type, name, iter, body: this.stmt() };
      }
      init = { k: 'decl', line, type, ds: this.declarators() };
    } else if (!this.isOp(';')) init = { k: 'expr', line, e: this.comma() };
    this.expect(';');
    const cond = this.isOp(';') ? null : this.expr(); this.expect(';');
    const inc = this.isOp(')') ? null : this.comma(); this.expect(')');
    return { k: 'for', line, init, cond, inc, body: this.stmt() };
  }
  comma(): Node {
    const items = [this.assign()];
    while (this.eat(',')) items.push(this.assign());
    return items.length === 1 ? items[0] : { k: 'seq', items, line: items[0].line };
  }
  expr(): Node { return this.assign(); }
  assign(): Node {
    const l = this.ternary();
    if (this.cur.t === 'op' && ASSIGN.has(this.cur.v)) {
      const op = this.cur.v, line = this.cur.line; this.i++;
      return { k: 'assign', op, l, r: this.assign(), line };
    }
    return l;
  }
  ternary(): Node {
    const c = this.bin(1);
    if (this.isOp('?')) {
      const line = this.cur.line; this.i++;
      const a = this.assign(); this.expect(':'); const b = this.assign();
      return { k: 'cond', c, a, b, line };
    }
    return c;
  }
  binop(): [string, number] | null {
    const t = this.cur;
    if (t.t !== 'op') return null;
    const n = this.peek();
    if (t.v === '>' && n.v === '>' && n.t === 'op' && n.pos === t.pos + 1) return ['>>', 2];
    return PREC[t.v] ? [t.v, 1] : null;
  }
  bin(min: number): Node {
    let l = this.unary();
    for (;;) {
      const o = this.binop();
      if (!o || PREC[o[0]] < min) break;
      const line = this.cur.line; this.i += o[1];
      const r = this.bin(PREC[o[0]] + 1);
      l = { k: 'bin', op: o[0], l, r, line };
    }
    return l;
  }
  unary(): Node {
    const line = this.cur.line;
    if (this.cur.t === 'op') {
      const v = this.cur.v;
      if (v === '++' || v === '--') { this.i++; return { k: 'pre', op: v, e: this.unary(), line }; }
      if (v === '!' || v === '-' || v === '+' || v === '~') { this.i++; return { k: 'un', op: v, e: this.unary(), line }; }
      if (v === '*') { this.i++; return { k: 'deref', e: this.unary(), line }; }
      if (v === '&') this.err('the address-of operator is not supported by the tracer yet', true);
      if (v === '(' && this.peek().t === 'id' && (BASE_TYPES.has(this.peek().v) || MODS.has(this.peek().v)) && this.peek().v !== 'vector') {
        const save = this.i; this.i++;
        try { const type = this.type(); if (this.eat(')')) return { k: 'cast', type, e: this.unary(), line }; } catch (e) { throw e; }
        this.i = save;
      }
    }
    return this.postfix();
  }
  postfix(): Node {
    let e = this.primary();
    for (;;) {
      const line = this.cur.line;
      if (this.isOp('[')) {
        this.i++; const i = this.expr(); this.expect(']');
        collectIds(i, this.idx);
        e = { k: 'idx', obj: e, i, line };
      } else if (this.isOp('->')) {
        this.i++; const name = this.ident();
        e = { k: 'mem', obj: e, name, arrow: true, line };
      } else if (this.isOp('.')) {
        this.i++; const name = this.ident();
        if (this.isOp('(')) { this.i++; e = { k: 'mcall', obj: e, name, args: this.args(')'), line }; }
        else e = { k: 'mem', obj: e, name, line };
      } else if (this.isOp('++') || this.isOp('--')) {
        const op = this.cur.v; this.i++; e = { k: 'post', op, e, line };
      } else break;
    }
    return e;
  }
  primary(): Node {
    const t = this.cur, line = t.line;
    if (t.t === 'num') {
      this.i++;
      if (/^0[xX]/.test(t.v)) return { k: 'num', v: parseInt(t.v, 16), line };
      if (/\./.test(t.v)) { const n = Number(t.v.replace(/[fF]$/, '')); if (Number.isNaN(n)) throw new CppError(`error: invalid number '${t.v}'`, line); return { k: 'num', v: n, line, dbl: true }; }
      if (/^\d+$/.test(t.v)) { const n = Number(t.v); return { k: 'num', v: Number.isSafeInteger(n) ? n : BigInt(t.v), line }; }
      const n = Number(t.v); if (Number.isNaN(n)) throw new CppError(`error: invalid number '${t.v}'`, line);
      return { k: 'num', v: n, line }; // 1e9 style literal: kept as an integer (C++ would make it a double)
    }
    if (t.t === 'op' && t.v === '[') { // lambda: [captures](params) -> ret { body }
      this.i++; while (!this.isOp(']')) { if (this.cur.t === 'op' && this.cur.v === '<eof>') this.err("expected ']'"); this.i++; } this.i++;
      this.expect('('); const params: { name: string; type: Type }[] = [];
      while (!this.isOp(')')) { const ty = this.type(); const pn = this.cur.t === 'id' ? this.ident() : '_'; params.push({ name: pn, type: ty }); if (!this.eat(',')) break; }
      this.expect(')'); let ret: Type = { base: 'auto', args: [], ref: false }; if (this.eat('->')) ret = this.type();
      const saved = this.idx; this.idx = new Set(); const body = this.blockNode(); const idxVars = this.idx; this.idx = saved;
      return { k: 'lambda', line, def: { name: 'lambda', ret, params, body, line, endLine: body.endLine, idxVars } };
    }
    if (t.t === 'chr') { this.i++; return { k: 'num', v: t.v.charCodeAt(0), line, ch: true }; }
    if (t.t === 'str') { this.i++; return { k: 'str', v: t.v, line }; }
    if (t.t === 'op' && t.v === '(') { this.i++; const e = this.comma(); this.expect(')'); return e; }
    if (t.t === 'op' && t.v === '{') { this.i++; return { k: 'init', items: this.args('}'), line }; }
    if (t.t === 'id') {
      if (t.v === 'nullptr' || t.v === 'NULL') { this.i++; return { k: 'null', line }; }
      if (t.v === 'new') { this.i++; const name = this.ident(); this.expect('('); return { k: 'new', name, args: this.args(')'), line }; }
      if (t.v === 'true' || t.v === 'false') { this.i++; return { k: 'bool', v: t.v === 'true', line }; }
      if (t.v === 'std' && this.peek().v === '::') { this.i += 2; return this.primary(); }
      if (t.v === 'static_cast') {
        this.i++; this.expect('<'); const type = this.type(); this.expect('>'); this.expect('(');
        const e = this.expr(); this.expect(')'); return { k: 'cast', type, e, line };
      }
      if (t.v === 'string' && this.peek().v === '::') { this.i += 2; const m = this.ident(); if (m === 'npos') return { k: 'num', v: -1, line }; this.err('unsupported string member', true); }
      if (CONTAINERS.has(t.v) || t.v === 'string') {
        const type = this.type();
        if (this.eat('(')) return { k: 'ctor', type, args: this.args(')'), line };
        if (this.eat('{')) return { k: 'ctor', type, args: this.args('}'), line, brace: true };
        this.err('expected constructor call');
      }
      this.i++;
      if (this.isOp('(')) { this.i++; return { k: 'call', name: t.v, args: this.args(')'), line }; }
      return { k: 'id', name: t.v, line };
    }
    this.err('unexpected token');
  }
}

export function parse(src: string): Program { return new P(src).program(); }
