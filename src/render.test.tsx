import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { InterviewGlossary } from './components/InterviewGlossary';
import { InterviewQA } from './components/InterviewQA';
import { MockInterview } from './components/MockInterview';
import { PlaybookPanel } from './components/PlaybookPanel';
import { ConceptCards } from './components/ConceptCards';
import { DBMS_CONCEPTS } from './dbms/concepts';
import { CN_CONCEPTS } from './cn/concepts';
import { SD_CONCEPTS } from './sysdesign/concepts';

describe('pages render without crashing', () => {
  it('interview page and its tabs', () => {
    expect(renderToString(<InterviewGlossary />)).toContain('Interview Prep');
    expect(renderToString(<InterviewQA />)).toContain('Quick check');
    const mock = renderToString(<MockInterview />);
    expect(mock).toContain('I am ready');
    expect(mock).toContain('rule-based');
  });
  it('playbook panel renders for every step and shows the real-world section', () => {
    for (let n = 1; n <= 18; n++) expect(renderToString(<PlaybookPanel step={n} />)).toContain('Real-world application');
  });
  it('concept browsers render the extended cards', () => {
    for (const list of [DBMS_CONCEPTS, CN_CONCEPTS, SD_CONCEPTS]) expect(renderToString(<ConceptCards concepts={list} />).length).toBeGreaterThan(500);
  });
});
