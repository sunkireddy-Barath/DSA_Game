import { useState } from 'react';
import type { Growth, Playable } from '../data/problems';
import type { RunResult } from '../engine/interp';

const log10ops = (g: Growth, n: number) => {
  switch (g) {
    case '1': return 0;
    case 'logn': return Math.log10(Math.max(1, Math.log2(n)));
    case 'n': return Math.log10(n);
    case 'nlogn': return Math.log10(n * Math.log2(n));
    case 'n2': return 2 * Math.log10(n);
    case '2n': return n * Math.log10(2);
  }
};
const human = (l: number) => (l < 15 ? Math.round(10 ** l).toLocaleString() : `≈10^${Math.round(l).toLocaleString()}`);
const COLORS = ['#f87171', '#fbbf24', '#34d399', '#60a5fa'];

export function Complexity({ problem, run, apIdx }: { problem: Playable; run: RunResult | null; apIdx: number }) {
  const [n, setN] = useState(1000);
  const W = 300, H = 150, xs = (v: number) => ((Math.log10(v) - 1) / 4) * (W - 30) + 25;
  const maxY = 12;
  const ys = (l: number) => H - 20 - (Math.min(l, maxY) / maxY) * (H - 30);
  const pts = (g: Growth) => [10, 30, 100, 300, 1000, 3000, 10000, 30000, 100000].map(v => `${xs(v)},${ys(log10ops(g, v))}`).join(' ');
  return (
    <div className="cx">
      <h4>Measured on this run (instrumented counts)</h4>
      {run ? <div className="stat-grid">
        <div><b>{run.stats.comparisons}</b><span>comparisons</span></div>
        <div><b>{run.stats.loopIterations}</b><span>loop iterations</span></div>
        <div><b>{run.stats.calls}</b><span>function calls</span></div>
        <div><b>{run.stats.maxDepth}</b><span>max recursion depth</span></div>
        <div><b>{run.stats.mapOps}</b><span>map operations</span></div>
        <div><b>{run.stats.steps}</b><span>statements</span></div>
      </div> : <div className="dim">Run the code first.</div>}
      <p className="dim small">These are operation counts for <i>this</i> input from the tracer, not wall-clock time. Real running time also depends on hardware, compiler optimization and cache behaviour.</p>

      <h4>Approaches compared</h4>
      {problem.approaches.map((a, i) => (
        <div key={i} className={`ap ${i === apIdx ? 'cur' : ''}`}>
          <div><span className="dot" style={{ background: COLORS[i % 4] }} /><b>{a.label}</b></div>
          <div className="kv2"><span>Time</span><b>{a.time}</b></div>
          <div className="kv2"><span>Auxiliary space</span><b>{a.space}</b></div>
          <div className="dim small">{a.why}</div>
        </div>
      ))}
      <p className="dim small">Auxiliary space excludes the input itself. Total space = input + auxiliary. Recursion stack frames count as auxiliary space.</p>

      <h4>Input-size simulator (theoretical)</h4>
      <label className="speed">n = <b>{n.toLocaleString()}</b>
        <input type="range" min={100} max={500} value={Math.round(Math.log10(Math.max(10, n)) * 100)} onChange={e => setN(Math.round(10 ** (+e.target.value / 100)))} /></label>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart">
        {[0, 3, 6, 9, 12].map(l => <g key={l}><line x1={25} x2={W - 5} y1={ys(l)} y2={ys(l)} className="grid-l" /><text x={2} y={ys(l) + 3} className="axis">10^{l}</text></g>)}
        {[10, 100, 1000, 10000, 100000].map(v => <text key={v} x={xs(v)} y={H - 4} className="axis" textAnchor="middle">{v >= 1000 ? `${v / 1000}k` : v}</text>)}
        {problem.approaches.map((a, i) => <polyline key={i} points={pts(a.growth)} fill="none" stroke={COLORS[i % 4]} strokeWidth={i === apIdx ? 2.5 : 1.5} />)}
        <line x1={xs(n)} x2={xs(n)} y1={5} y2={H - 20} stroke="#888" strokeDasharray="3 3" />
      </svg>
      {problem.approaches.map((a, i) => <div key={i} className="kv2"><span><span className="dot" style={{ background: COLORS[i % 4] }} />{a.label}</span><b>{human(log10ops(a.growth, n))} ops</b></div>)}
      <p className="dim small">Curves are the dominant-term growth (constants ignored), plotted on a log scale up to 10^12. Exponential growth leaves the chart almost immediately.</p>
    </div>
  );
}
