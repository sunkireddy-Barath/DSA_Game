import { useEffect, useState } from 'react';
import { PlaybookPanel } from '../components/PlaybookPanel';
import { PROBLEM_BY_ID, SHEET } from '../data/sheet';
import type { Playable } from '../data/problems';
import { Workspace } from '../components/Workspace';

const PLAYGROUND: Playable = {
  title: 'Playground', fn: 'fib', statement: '', constraints: [], hints: [], intuition: '',
  starter: '', tests: [], defaultArgs: [5], ref: () => 0,
  approaches: [{ label: 'Your code', time: '—', space: '—', growth: 'n', why: 'Write any function in the supported subset and trace it.',
    code: `class Solution {
public:
    int fib(int n) {
        if (n <= 1) {
            return n;
        }
        return fib(n - 1) + fib(n - 2);
    }
};` }],
};


type Bank = typeof import('../data/problems');
/** The problem bank is the largest asset (hundreds of C++ solutions), so it is fetched only when a problem or the playground opens. */
function useBank(): { bank: Bank | null; failed: boolean } {
  const [bank, setBank] = useState<Bank | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { let live = true; import('../data/problems').then(b => live && setBank(b)).catch(() => live && setFailed(true)); return () => { live = false; }; }, []);
  return { bank, failed };
}

export function PlaygroundPage() { return <Workspace key="pg" problem={PLAYGROUND} id="playground" diff="E" playground />; }

export function ProblemPage({ id }: { id: string }) {
  const p = PROBLEM_BY_ID.get(id);
  const { bank, failed } = useBank();
  if (!p) return <div className="page">Problem not found. <a href="#/dsa">Back</a></div>;
  if (failed) return <div className="page" role="alert">Could not load the problem bank. Check your connection and <button onClick={() => location.reload()}>reload</button>.</div>;
  if (!bank) return <div className="page dim" role="status">Loading problem…</div>;
  const pl = bank.PLAYABLE_BY_TITLE.get(p.title);
  if (!pl) return (
    <div className="page"><a href="#/dsa">← A2Z sheet</a><h1>{p.title}</h1>
      <div className="note">This problem is in the A2Z list but has no playable solution in this build, so nothing is shown rather than a fake animation.</div>
      <p className="dim">Step {p.step} · {SHEET.find(x => x.n === p.step)?.topics[p.topic].name}</p></div>
  );
  return <><PlaybookPanel step={p.step} /><Workspace key={id} problem={pl} id={id} diff={p.diff} /></>;
}
