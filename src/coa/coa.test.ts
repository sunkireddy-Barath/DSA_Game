import { describe, expect, it } from 'vitest';
import { addTwos, amat, assemble, cacheGeometry, equivalent, float32, fromTwos, onesComplement, parseBase, parsePipeline, pipeline, runProgram, signMagnitude, simulateCache, toBase, truthTable, twosComplement } from './engines';

describe('number systems', () => {
  it('bases', () => { expect(toBase(255, 2)).toBe('11111111'); expect(toBase(255, 16)).toBe('FF'); expect(parseBase('ff', 16)).toBe(255); expect(() => parseBase('12', 2)).toThrow(); });
  it("two's complement", () => {
    expect(twosComplement(-5, 8)).toBe('11111011'); expect(twosComplement(5, 8)).toBe('00000101'); expect(twosComplement(-128, 8)).toBe('10000000');
    expect(fromTwos('11111011')).toBe(-5); expect(() => twosComplement(128, 8)).toThrow();
    for (let n = -128; n <= 127; n++) expect(fromTwos(twosComplement(n, 8))).toBe(n);
  });
  it("1's complement and sign-magnitude", () => { expect(onesComplement(-5, 8)).toBe('11111010'); expect(signMagnitude(-5, 8)).toBe('10000101'); });
  it('addition flags: carry vs signed overflow', () => {
    expect(addTwos(127, 1, 8)).toMatchObject({ result: '10000000', value: -128, overflow: true, carry: 0 });
    expect(addTwos(-1, 1, 8)).toMatchObject({ result: '00000000', carry: 1, overflow: false, zero: true });
    expect(addTwos(-128, -1, 8).overflow).toBe(true); expect(addTwos(50, 20, 8)).toMatchObject({ value: 70, overflow: false });
    for (let a = -8; a <= 7; a++) for (let b = -8; b <= 7; b++) { const r = addTwos(a, b, 4); expect(r.overflow).toBe(a + b < -8 || a + b > 7); }
  });
  it('IEEE-754 single precision', () => {
    const f = float32(0.1); expect(f.hex).toBe('0x3DCCCCCD'); expect(f.biased).toBe(123); expect(f.kind).toBe('normal');
    expect(float32(-1).bits).toBe('10111111100000000000000000000000'); expect(float32(1).unbiased).toBe(0);
    expect(float32(0).kind).toBe('zero'); expect(float32(Infinity).kind).toBe('infinity'); expect(float32(NaN).kind).toBe('NaN'); expect(float32(1e-40).kind).toBe('subnormal');
  });
});

describe('boolean algebra', () => {
  it('truth tables', () => { const t = truthTable('A & B'); expect(t.vars).toEqual(['A', 'B']); expect(t.minterms).toEqual([3]); expect(truthTable('A ^ B').minterms).toEqual([1, 2]); expect(truthTable('!A | B').minterms).toEqual([0, 1, 3]); });
  it("De Morgan's laws and precedence", () => { expect(equivalent('!(A&B)', '!A|!B')).toBe(true); expect(equivalent('!(A|B)', '!A&!B')).toBe(true); expect(equivalent('A|B&C', '(A|B)&C')).toBe(false); expect(equivalent('A|B&C', 'A|(B&C)')).toBe(true); });
  it('errors', () => { expect(() => truthTable('A &')).toThrow(); expect(() => truthTable('A $ B')).toThrow(); expect(() => truthTable('(A')).toThrow(); });
});

describe('mini CPU', () => {
  const sum = `ADDI R1, R0, 5
ADDI R2, R0, 0
loop: BEQ R1, R0, end
ADD R2, R2, R1
ADDI R1, R1, -1
J loop
end: HALT`;
  it('sums 1..5 = 15', () => { const r = runProgram(assemble(sum)); expect(r.final.regs[2]).toBe(15); expect(r.final.regs[1]).toBe(0); expect(r.final.halted).toBe(true); expect(r.error).toBeUndefined(); });
  it('every instruction has the six phases in order', () => { const r = runProgram(assemble(sum)); r.executed.forEach(e => expect(e.phases.map(p => p.stage)).toEqual(['Fetch', 'Decode', 'Read registers', 'Execute (ALU)', 'Memory access', 'Write back'])); });
  it('memory and R0', () => {
    const r = runProgram(assemble('ADDI R1, R0, 42\nSW R1, 3(R0)\nLW R2, 3(R0)\nADDI R0, R0, 9\nHALT')); expect(r.final.mem[3]).toBe(42); expect(r.final.regs[2]).toBe(42); expect(r.final.regs[0]).toBe(0);
  });
  it('errors are explained', () => { expect(() => assemble('FOO R1')).toThrow(/unknown instruction/); expect(() => assemble('ADD R1, R2')).toThrow(/takes 3/); expect(() => assemble('J nowhere')).toThrow(/unknown label/); expect(runProgram(assemble('LW R1, 99(R0)')).error).toMatch(/outside/); expect(runProgram(assemble('l: J l'), { maxInstr: 50 }).error).toMatch(/infinite/); });
  it('state before/after is recorded', () => { const e = runProgram(assemble('ADDI R1, R0, 7\nHALT')).executed[0]; expect(e.phases[0].state.regs[1]).toBe(0); expect(e.phases[5].state.regs[1]).toBe(7); });
});

describe('cache', () => {
  it('geometry', () => { expect(cacheGeometry({ sizeBytes: 64, blockBytes: 16, ways: 1, addrBits: 16, policy: 'LRU' })).toEqual({ blocks: 4, sets: 4, offsetBits: 4, indexBits: 2, tagBits: 10 }); expect(() => cacheGeometry({ sizeBytes: 60, blockBytes: 16, ways: 1, addrBits: 16, policy: 'LRU' })).toThrow(); });
  it('direct-mapped conflict: addresses 0 and 64 map to the same set', () => {
    const r = simulateCache({ sizeBytes: 64, blockBytes: 16, ways: 1, addrBits: 16, policy: 'LRU' }, [0, 64, 0, 64]);
    expect(r.accesses.map(a => a.kind)).toEqual(['compulsory miss', 'compulsory miss', 'conflict/capacity miss', 'conflict/capacity miss']); expect(r.hits).toBe(0);
  });
  it('2-way associativity removes that conflict', () => {
    const r = simulateCache({ sizeBytes: 64, blockBytes: 16, ways: 2, addrBits: 16, policy: 'LRU' }, [0, 64, 0, 64]); expect(r.hits).toBe(2);
  });
  it('spatial locality: sequential bytes in one block hit', () => { const r = simulateCache({ sizeBytes: 64, blockBytes: 16, ways: 1, addrBits: 16, policy: 'LRU' }, [0, 1, 2, 3, 16, 17]); expect(r.hits).toBe(4); });
  it('LRU vs FIFO', () => {
    const cfg = { sizeBytes: 32, blockBytes: 16, ways: 2, addrBits: 16, policy: 'LRU' as const }; // 1 set, 2 ways
    const seq = [0, 16, 0, 32, 0]; // blocks A B A C A
    expect(simulateCache(cfg, seq).hits).toBe(2); expect(simulateCache({ ...cfg, policy: 'FIFO' }, seq).hits).toBe(1);
  });
  it('AMAT', () => { expect(amat(1, 0.05, 100)).toBeCloseTo(6); });
  it('hits + misses equals accesses; tag/index/offset reassemble the address', () => {
    const addrs = Array.from({ length: 200 }, (_, i) => (i * 37 + (i % 7) * 1024) % 4096); const c = { sizeBytes: 256, blockBytes: 16, ways: 2, addrBits: 12, policy: 'LRU' as const };
    const r = simulateCache(c, addrs); expect(r.hits + r.misses).toBe(addrs.length);
    r.accesses.forEach(a => expect(((a.tag * r.sets + a.index) * 16) + a.offset).toBe(a.addr));
  });
});

describe('pipeline hazards (textbook cycle counts)', () => {
  const raw = 'ADD R1, R2, R3\nSUB R4, R1, R5';
  it('no hazards: n + 4 cycles', () => { expect(pipeline(parsePipeline('ADD R1, R2, R3\nADD R4, R5, R6\nADD R7, R8, R9'), { forwarding: false }).cycles).toBe(7); });
  it('RAW without forwarding stalls 2 cycles', () => { const r = pipeline(parsePipeline(raw), { forwarding: false }); expect(r.stallCycles).toBe(2); expect(r.cycles).toBe(8); });
  it('forwarding removes the ALU-to-ALU stall', () => { const r = pipeline(parsePipeline(raw), { forwarding: true }); expect(r.stallCycles).toBe(0); expect(r.cycles).toBe(6); });
  it('load-use hazard still stalls 1 cycle even with forwarding', () => { const p = parsePipeline('LW R1, 0(R2)\nADD R3, R1, R4'); expect(pipeline(p, { forwarding: true })).toMatchObject({ stallCycles: 1, cycles: 7 }); expect(pipeline(p, { forwarding: false })).toMatchObject({ stallCycles: 2, cycles: 8 }); });
  it('taken branch costs 2 bubbles (resolved in EX)', () => { const r = pipeline(parsePipeline('BEQ R1, R2, L taken\nADD R3, R4, R5'), { forwarding: true }); expect(r.cycles).toBe(5 + 1 + 2); expect(r.flushCycles).toBe(2); });
  it('pipeline diagram rows have stages in order', () => { pipeline(parsePipeline('LW R1, 0(R2)\nADD R3, R1, R4\nSW R3, 0(R5)'), { forwarding: true }).rows.forEach(row => { const st = row.cells.filter(c => c && c !== 'stall'); expect(st.slice(-3)).toEqual(['EX', 'MEM', 'WB']); }); });
});
