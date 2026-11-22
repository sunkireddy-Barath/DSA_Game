import type { ReactNode } from 'react';
import type { Narration } from '../engine/narrate';

/** Colour key shown under a diagram: every colour or tag used must be listed here. */
export function Legend({ items }: { items: [swatch: string, meaning: string][] }) {
  return (
    <ul className="legend-row" aria-label="Legend">
      {items.map(([cls, text]) => <li key={cls + text}><span className={`sw ${cls}`} aria-hidden="true" />{text}</li>)}
    </ul>
  );
}

/** One-sentence plain-language "how to read this diagram" note. */
export function HowTo({ children }: { children: ReactNode }) {
  return <p className="howto"><span aria-hidden="true">ⓘ</span> {children}</p>;
}

/** What the current step does, in words: shown above the diagrams. */
export function NarrationCard({ n, step, total }: { n: Narration; step: number; total: number }) {
  const icon = { call: '↘', return: '↗', test: '?', work: '▸' }[n.tone];
  return (
    <section className={`narr narr-${n.tone}`} aria-live="polite" data-testid="narration">
      <div className="narr-head"><span className="narr-ico" aria-hidden="true">{icon}</span><b>{n.headline}</b><span className="dim small narr-step">step {step}/{total}</span></div>
      <ul>{n.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
      {n.next && <div className="narr-next dim small">Next: <code>{n.next}</code></div>}
    </section>
  );
}
