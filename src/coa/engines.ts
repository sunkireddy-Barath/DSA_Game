// Computer organization & architecture engines. Simplified educational models.

// ------------------------------------------------------------------ number representation
export const toBase = (n: number, base: number) => n.toString(base).toUpperCase();
export function parseBase(s: string, base: number): number {
  const t = s.trim().toUpperCase(); const digits = '0123456789ABCDEF'.slice(0, base);
  if (!t || [...t.replace(/^-/, '')].some(c => !digits.includes(c))) throw new Error(`"${s}" is not a valid base-${base} number.`);
  return parseInt(t, base);
}
export const range = (bits: number) => ({ min: -(2 ** (bits - 1)), max: 2 ** (bits - 1) - 1, umax: 2 ** bits - 1 });
export function twosComplement(n: number, bits: number) {
  const r = range(bits); if (!Number.isInteger(n) || n < r.min || n > r.max) throw new Error(`${n} does not fit in ${bits}-bit two's complement (range ${r.min} to ${r.max}).`);
  const u = n < 0 ? 2 ** bits + n : n; return u.toString(2).padStart(bits, '0');
}
export const fromTwos = (bin: string) => { const b = bin.length; const u = parseInt(bin, 2); return bin[0] === '1' ? u - 2 ** b : u; };
export const onesComplement = (n: number, bits: number) => { if (n >= 0) return twosComplement(n, bits); return [...twosComplement(-n, bits)].map(c => (c === '1' ? '0' : '1')).join(''); };
export function signMagnitude(n: number, bits: number) { const m = 2 ** (bits - 1) - 1; if (Math.abs(n) > m) throw new Error(`${n} does not fit in ${bits}-bit sign-magnitude.`); return (n < 0 ? '1' : '0') + Math.abs(n).toString(2).padStart(bits - 1, '0'); }
/** Adds two n-bit two's complement numbers and reports flags. */
export function addTwos(a: number, b: number, bits: number) {
  const A = twosComplement(a, bits), B = twosComplement(b, bits); const sum = (parseInt(A, 2) + parseInt(B, 2)); const carry = sum >= 2 ** bits ? 1 : 0;
  const res = (sum % 2 ** bits).toString(2).padStart(bits, '0'); const overflow = A[0] === B[0] && res[0] !== A[0];
  return { a: A, b: B, result: res, value: fromTwos(res), carry, overflow, zero: !res.includes('1'), negative: res[0] === '1' };
}
export function float32(x: number) {
  const dv = new DataView(new ArrayBuffer(4)); dv.setFloat32(0, x); const u = dv.getUint32(0); const bits = u.toString(2).padStart(32, '0');
  const sign = bits[0], exp = bits.slice(1, 9), man = bits.slice(9); const e = parseInt(exp, 2);
  const kind = e === 255 ? (/^0+$/.test(man) ? 'infinity' : 'NaN') : e === 0 ? (/^0+$/.test(man) ? 'zero' : 'subnormal') : 'normal';
  return { bits, sign, exp, man, hex: '0x' + u.toString(16).toUpperCase().padStart(8, '0'), biased: e, unbiased: e - 127, kind, stored: dv.getFloat32(0) };
}

// ------------------------------------------------------------------ boolean expressions
type Tok = string;
const tokenize = (s: string): Tok[] => { const out: Tok[] = []; for (const c of s.replace(/\s+/g, '')) { if (/[A-Za-z01!~&*|+^()]/.test(c)) out.push(c); else throw new Error(`Unexpected character "${c}". Use letters, 0/1, ! & | ^ and parentheses.`); } return out; };
export function parseBool(src: string) {
  const t = tokenize(src); let i = 0; const vars = new Set<string>();
  type N = { k: 'v'; n: string } | { k: 'c'; v: boolean } | { k: 'not'; e: N } | { k: 'b'; op: string; l: N; r: N };
  const prim = (): N => {
    const c = t[i++]; if (c === undefined) throw new Error('Expression ended unexpectedly.');
    if (c === '(') { const e = or(); if (t[i++] !== ')') throw new Error('Missing closing parenthesis.'); return e; }
    if (c === '!' || c === '~') return { k: 'not', e: prim() };
    if (c === '0' || c === '1') return { k: 'c', v: c === '1' };
    if (/[A-Za-z]/.test(c)) { const n = c.toUpperCase(); vars.add(n); let node: N = { k: 'v', n }; while (t[i] === "'") i++; return node; }
    throw new Error(`Unexpected "${c}".`);
  };
  const and = (): N => { let l = prim(); while (t[i] === '&' || t[i] === '*') { i++; l = { k: 'b', op: '&', l, r: prim() }; } return l; };
  const xor = (): N => { let l = and(); while (t[i] === '^') { i++; l = { k: 'b', op: '^', l, r: and() }; } return l; };
  const or = (): N => { let l = xor(); while (t[i] === '|' || t[i] === '+') { i++; l = { k: 'b', op: '|', l, r: xor() }; } return l; };
  const ast = or(); if (i < t.length) throw new Error(`Unexpected "${t[i]}".`);
  const ev = (n: N, env: Record<string, boolean>): boolean => n.k === 'v' ? env[n.n] : n.k === 'c' ? n.v : n.k === 'not' ? !ev(n.e, env) : n.op === '&' ? ev(n.l, env) && ev(n.r, env) : n.op === '^' ? ev(n.l, env) !== ev(n.r, env) : ev(n.l, env) || ev(n.r, env);
  return { vars: [...vars].sort(), eval: (env: Record<string, boolean>) => ev(ast, env) };
}
export function truthTable(src: string, extraVars: string[] = []) {
  const p = parseBool(src); const vars = [...new Set([...p.vars, ...extraVars])].sort(); if (vars.length > 5) throw new Error('At most 5 variables are supported.');
  const rows = Array.from({ length: 2 ** vars.length }, (_, m) => { const env = Object.fromEntries(vars.map((v, k) => [v, !!((m >> (vars.length - 1 - k)) & 1)])); return { env, out: p.eval(env) }; });
  return { vars, rows, minterms: rows.map((r, m) => (r.out ? m : -1)).filter(m => m >= 0) };
}
export const equivalent = (a: string, b: string) => { const v = [...new Set([...parseBool(a).vars, ...parseBool(b).vars])]; const ta = truthTable(a, v), tb = truthTable(b, v); return ta.rows.every((r, k) => r.out === tb.rows[k].out); };

// ------------------------------------------------------------------ mini CPU (RISC-style) with an instruction cycle
export type Opcode = 'ADD' | 'SUB' | 'AND' | 'OR' | 'ADDI' | 'LW' | 'SW' | 'BEQ' | 'J' | 'HALT';
export interface Instr { op: Opcode; rd?: number; rs?: number; rt?: number; imm?: number; target?: number; text: string; line: number }
export function assemble(src: string): Instr[] {
  const labels = new Map<string, number>(); const raw: { text: string; line: number }[] = [];
  src.split('\n').forEach((l, ln) => { let t = l.replace(/[;#].*$/, '').trim(); if (!t) return; const m = t.match(/^([A-Za-z_]\w*):\s*(.*)$/); if (m) { labels.set(m[1], raw.length); t = m[2]; } if (t) raw.push({ text: t, line: ln + 1 }); });
  const reg = (s: string, line: number) => { const m = s.trim().match(/^R([0-7])$/i); if (!m) throw new Error(`Line ${line}: "${s}" is not a register (R0-R7).`); return +m[1]; };
  const num = (s: string, line: number) => { if (!/^-?\d+$/.test(s.trim())) throw new Error(`Line ${line}: "${s}" is not an integer.`); return +s; };
  return raw.map(({ text, line }) => {
    const [opRaw, ...rest] = text.split(/\s+/); const op = opRaw.toUpperCase() as Opcode; const args = rest.join(' ').split(',').map(s => s.trim()).filter(Boolean);
    const need = (n: number) => { if (args.length !== n) throw new Error(`Line ${line}: ${op} takes ${n} operand(s).`); };
    switch (op) {
      case 'ADD': case 'SUB': case 'AND': case 'OR': need(3); return { op, rd: reg(args[0], line), rs: reg(args[1], line), rt: reg(args[2], line), text, line };
      case 'ADDI': need(3); return { op, rd: reg(args[0], line), rs: reg(args[1], line), imm: num(args[2], line), text, line };
      case 'LW': case 'SW': { need(2); const m = args[1].match(/^(-?\d+)\((R[0-7])\)$/i); if (!m) throw new Error(`Line ${line}: use offset(Rn), e.g. 4(R1).`); return op === 'LW' ? { op, rd: reg(args[0], line), rs: reg(m[2], line), imm: +m[1], text, line } : { op, rt: reg(args[0], line), rs: reg(m[2], line), imm: +m[1], text, line }; }
      case 'BEQ': { need(3); const t = labels.get(args[2]); if (t === undefined) throw new Error(`Line ${line}: unknown label "${args[2]}".`); return { op, rs: reg(args[0], line), rt: reg(args[1], line), target: t, text, line }; }
      case 'J': { need(1); const t = labels.get(args[0]); if (t === undefined) throw new Error(`Line ${line}: unknown label "${args[0]}".`); return { op, target: t, text, line }; }
      case 'HALT': need(0); return { op, text, line };
      default: throw new Error(`Line ${line}: unknown instruction "${opRaw}". Supported: ADD SUB AND OR ADDI LW SW BEQ J HALT.`);
    }
  });
}
export interface CpuState { pc: number; ir: string; regs: number[]; mem: number[]; halted: boolean }
export interface Phase { stage: 'Fetch' | 'Decode' | 'Read registers' | 'Execute (ALU)' | 'Memory access' | 'Write back'; note: string; state: CpuState; active: string[] }
export interface Executed { pcBefore: number; instr: Instr; phases: Phase[] }
export const MEM_WORDS = 16;
export function runProgram(prog: Instr[], opts: { maxInstr?: number; mem?: number[] } = {}) {
  const st: CpuState = { pc: 0, ir: '', regs: Array(8).fill(0), mem: opts.mem ? [...opts.mem, ...Array(Math.max(0, MEM_WORDS - opts.mem.length)).fill(0)] : Array(MEM_WORDS).fill(0), halted: false };
  const out: Executed[] = []; const snap = (): CpuState => structuredClone(st); const w = (n: number) => n | 0;
  let count = 0; const max = opts.maxInstr ?? 500; let error: string | undefined;
  while (!st.halted && st.pc < prog.length && count++ < max) {
    const ins = prog[st.pc]; const pcBefore = st.pc; const ph: Phase[] = [];
    st.ir = ins.text; ph.push({ stage: 'Fetch', note: `PC = ${pcBefore}: the instruction "${ins.text}" is read from instruction memory into the Instruction Register; PC advances to ${pcBefore + 1}.`, state: { ...snap(), pc: pcBefore + 1 }, active: ['PC', 'IMEM', 'IR'] });
    st.pc = pcBefore + 1;
    ph.push({ stage: 'Decode', note: `The control unit decodes opcode ${ins.op} and selects what to read, compute and write.`, state: snap(), active: ['IR', 'CU'] });
    const a = ins.rs !== undefined ? st.regs[ins.rs] : 0, b = ins.rt !== undefined ? st.regs[ins.rt] : 0;
    ph.push({ stage: 'Read registers', note: ins.rs !== undefined || ins.rt !== undefined ? `Register file outputs ${ins.rs !== undefined ? `R${ins.rs} = ${a}` : ''}${ins.rt !== undefined ? `${ins.rs !== undefined ? ', ' : ''}R${ins.rt} = ${b}` : ''}.` : 'No registers are read.', state: snap(), active: ['REGS'] });
    let alu: number | null = null, dest: number | null = null, val: number | null = null, memNote = 'No data memory access.'; const act = ['ALU'];
    if (ins.op === 'ADD') { alu = w(a + b); dest = ins.rd!; val = alu; } else if (ins.op === 'SUB') { alu = w(a - b); dest = ins.rd!; val = alu; }
    else if (ins.op === 'AND') { alu = a & b; dest = ins.rd!; val = alu; } else if (ins.op === 'OR') { alu = a | b; dest = ins.rd!; val = alu; }
    else if (ins.op === 'ADDI') { alu = w(a + ins.imm!); dest = ins.rd!; val = alu; }
    else if (ins.op === 'LW' || ins.op === 'SW') { alu = a + ins.imm!; if (alu < 0 || alu >= MEM_WORDS) { error = `Memory address ${alu} is outside 0..${MEM_WORDS - 1} (a real CPU would fault).`; break; } }
    else if (ins.op === 'BEQ') alu = a - b;
    ph.push({ stage: 'Execute (ALU)', note: ins.op === 'BEQ' ? `ALU computes R${ins.rs} − R${ins.rt} = ${alu}; the branch is ${alu === 0 ? 'TAKEN (zero flag set)' : 'not taken'}.` : ins.op === 'J' ? `Jump: PC will become ${ins.target}.` : ins.op === 'HALT' ? 'HALT stops the processor.' : alu !== null ? `ALU computes ${ins.op === 'LW' || ins.op === 'SW' ? `the address ${a} + ${ins.imm} = ${alu}` : `${ins.op} → ${alu}`}.` : '', state: snap(), active: act });
    if (ins.op === 'LW') { val = st.mem[alu!]; dest = ins.rd!; memNote = `Data memory read: mem[${alu}] = ${val}.`; }
    if (ins.op === 'SW') { st.mem[alu!] = b; memNote = `Data memory write: mem[${alu}] = R${ins.rt} = ${b}.`; }
    ph.push({ stage: 'Memory access', note: memNote, state: snap(), active: ins.op === 'LW' || ins.op === 'SW' ? ['DMEM'] : [] });
    if (dest !== null && dest !== 0) { st.regs[dest] = val!; ph.push({ stage: 'Write back', note: `R${dest} ← ${val}.`, state: snap(), active: ['REGS'] }); }
    else ph.push({ stage: 'Write back', note: dest === 0 ? 'R0 is hard-wired to zero; the write is ignored.' : 'Nothing to write back.', state: snap(), active: [] });
    if (ins.op === 'BEQ' && alu === 0) st.pc = ins.target!; if (ins.op === 'J') st.pc = ins.target!; if (ins.op === 'HALT') st.halted = true;
    ph[ph.length - 1].state = snap();
    out.push({ pcBefore, instr: ins, phases: ph });
  }
  return { executed: out, final: st, error: error ?? (count > max ? `Stopped after ${max} instructions (possible infinite loop).` : undefined) };
}

// ------------------------------------------------------------------ cache
export type Replacement = 'LRU' | 'FIFO';
export interface CacheConfig { sizeBytes: number; blockBytes: number; ways: number; addrBits: number; policy: Replacement }
export interface CacheAccess { addr: number; tag: number; index: number; offset: number; hit: boolean; kind: 'hit' | 'compulsory miss' | 'conflict/capacity miss'; evicted: number | null; setBefore: (number | null)[]; setAfter: (number | null)[] }
export function cacheGeometry(c: CacheConfig) {
  const bad = [c.sizeBytes, c.blockBytes, c.ways].some(x => !Number.isInteger(x) || x < 1 || (x & (x - 1)) !== 0);
  if (bad) throw new Error('Cache size, block size and associativity must be powers of two.');
  const blocks = c.sizeBytes / c.blockBytes; if (blocks < c.ways) throw new Error('Not enough blocks for this associativity.');
  const sets = blocks / c.ways, offsetBits = Math.log2(c.blockBytes), indexBits = Math.log2(sets); const tagBits = c.addrBits - indexBits - offsetBits;
  if (tagBits < 0) throw new Error('Address too narrow for this cache.');
  return { blocks, sets, offsetBits, indexBits, tagBits };
}
export function simulateCache(c: CacheConfig, addrs: number[]) {
  const g = cacheGeometry(c); const sets: { tag: number; t: number; at: number }[][] = Array.from({ length: g.sets }, () => []); const seen = new Set<number>(); const out: CacheAccess[] = []; let hits = 0;
  addrs.forEach((addr, time) => {
    const offset = addr & (c.blockBytes - 1), block = Math.floor(addr / c.blockBytes), index = block % g.sets, tag = Math.floor(block / g.sets);
    const s = sets[index]; const view = () => Array.from({ length: c.ways }, (_, k) => (s[k] ? s[k].tag : null));
    const before = view(); const line = s.find(l => l.tag === tag);
    if (line) { line.t = time; hits++; out.push({ addr, tag, index, offset, hit: true, kind: 'hit', evicted: null, setBefore: before, setAfter: view() }); return; }
    const compulsory = !seen.has(block); seen.add(block); let evicted: number | null = null;
    if (s.length >= c.ways) { const key = c.policy === 'LRU' ? 't' : 'at'; const vi = s.reduce((b, l, k) => (l[key] < s[b][key] ? k : b), 0); evicted = s[vi].tag; s[vi] = { tag, t: time, at: time }; } else s.push({ tag, t: time, at: time });
    out.push({ addr, tag, index, offset, hit: false, kind: compulsory ? 'compulsory miss' : 'conflict/capacity miss', evicted, setBefore: before, setAfter: view() });
  });
  return { ...g, accesses: out, hits, misses: addrs.length - hits, hitRate: addrs.length ? hits / addrs.length : 0 };
}
export const amat = (hitTime: number, missRate: number, missPenalty: number) => hitTime + missRate * missPenalty;

// ------------------------------------------------------------------ pipeline (classic 5-stage, in-order)
export interface PInstr { text: string; dest?: number; srcs: number[]; isLoad?: boolean; isBranch?: boolean; taken?: boolean }
export function parsePipeline(src: string): PInstr[] {
  return src.split('\n').map(l => l.replace(/[;#].*$/, '').trim()).filter(Boolean).map(text => {
    const [opRaw, ...r] = text.split(/\s+/); const op = opRaw.toUpperCase(); const a = r.join(' ').split(',').map(x => x.trim());
    const reg = (s: string) => { const m = s?.match(/R(\d+)/i); if (!m) throw new Error(`Cannot read a register in "${text}".`); return +m[1]; };
    if (['ADD', 'SUB', 'AND', 'OR', 'MUL'].includes(op)) return { text, dest: reg(a[0]), srcs: [reg(a[1]), reg(a[2])] };
    if (op === 'ADDI') return { text, dest: reg(a[0]), srcs: [reg(a[1])] };
    if (op === 'LW') return { text, dest: reg(a[0]), srcs: [reg(a[1])], isLoad: true };
    if (op === 'SW') return { text, srcs: [reg(a[0]), reg(a[1])] };
    if (op === 'BEQ' || op === 'BNE') return { text, srcs: [reg(a[0]), reg(a[1])], isBranch: true, taken: !/\bnt\b/i.test(text) && /\btaken\b/i.test(text) };
    if (op === 'NOP') return { text, srcs: [] };
    throw new Error(`Unknown instruction "${opRaw}" (use ADD SUB AND OR MUL ADDI LW SW BEQ BNE NOP; mark a taken branch with the word "taken").`);
  });
}
export interface PipeRow { text: string; cells: string[]; stalls: number }
export function pipeline(prog: PInstr[], opts: { forwarding: boolean }) {
  const n = prog.length; const IDs: number[] = [], IDe: number[] = [], EX: number[] = [], MEM: number[] = [], WB: number[] = [], IF: number[] = [], stalls: number[] = [];
  let nextFetchAfter = 0; const flushes: number[] = [];
  prog.forEach((p, i) => {
    const prev = i - 1;
    const IFin = Math.max(i === 0 ? 1 : IDs[prev], nextFetchAfter + 1 > 1 ? nextFetchAfter + 1 : 1);
    const idIn = Math.max(IFin + 1, i === 0 ? 0 : IDe[prev] + 1);
    let idEnd = idIn;
    for (const s of p.srcs) { // nearest earlier writer
      let w = -1; for (let j = i - 1; j >= 0; j--) if (prog[j].dest === s) { w = j; break; }
      if (w < 0) continue;
      const need = opts.forwarding ? (prog[w].isLoad ? MEM[w] : 0) : WB[w];
      idEnd = Math.max(idEnd, need);
    }
    IF[i] = IFin; IDs[i] = idIn; IDe[i] = idEnd; stalls[i] = idEnd - idIn; EX[i] = idEnd + 1; MEM[i] = EX[i] + 1; WB[i] = MEM[i] + 1;
    if (p.isBranch && p.taken) { nextFetchAfter = EX[i]; flushes[i] = 2; }
  });
  const total = Math.max(0, ...WB); const rows: PipeRow[] = prog.map((p, i) => {
    const cells = Array(total).fill('');
    for (let c = IF[i]; c < IDs[i]; c++) cells[c - 1] = 'IF'; for (let c = IDs[i]; c <= IDe[i]; c++) cells[c - 1] = c === IDe[i] ? 'ID' : 'stall';
    cells[EX[i] - 1] = 'EX'; cells[MEM[i] - 1] = 'MEM'; cells[WB[i] - 1] = 'WB'; return { text: p.text, cells, stalls: stalls[i] };
  });
  const bubbles = prog.reduce((s, _, i) => s + stalls[i], 0) + flushes.reduce((s, f) => s + (f ?? 0), 0);
  return { rows, cycles: total, cpi: n ? total / n : 0, stallCycles: stalls.reduce((a, b) => a + b, 0), flushCycles: flushes.reduce((s, f) => s + (f ?? 0), 0), bubbles, ideal: n ? n + 4 : 0 };
}
