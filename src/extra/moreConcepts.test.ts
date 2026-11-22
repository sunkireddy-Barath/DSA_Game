import { describe, expect, it } from 'vitest';
import { DBMS_CONCEPTS } from '../dbms/concepts';
import { CN_CONCEPTS } from '../cn/concepts';
import { COA_CONCEPTS } from '../coa/concepts';
import { OOPS_CONCEPTS } from '../oops/concepts';
import { SD_CONCEPTS } from '../sysdesign/concepts';
import { SE_CONCEPTS } from '../se/concepts';
import { DEV_CONCEPTS } from '../dev/concepts';

describe('concept cards are complete and unique', () => {
  const sets = { DBMS_CONCEPTS, CN_CONCEPTS, COA_CONCEPTS, OOPS_CONCEPTS, SD_CONCEPTS, SE_CONCEPTS, DEV_CONCEPTS };
  for (const [name, list] of Object.entries(sets)) {
    it(name, () => {
      const ids = new Set<string>();
      for (const c of list) {
        expect(ids.has(c.id), `dup ${c.id}`).toBe(false); ids.add(c.id);
        expect(c.technical.length, c.id).toBeGreaterThan(80);
        expect(c.keywords.length, c.id).toBeGreaterThanOrEqual(2);
        expect(c.interview.length, c.id).toBeGreaterThanOrEqual(1);
        expect(c.pros.length && c.cons.length && c.mistakes.length, c.id).toBeTruthy();
      }
    });
  }
  it('worlds grew', () => { expect(CN_CONCEPTS.length).toBe(10); expect(SD_CONCEPTS.length).toBe(9); expect(DBMS_CONCEPTS.length).toBe(12); });
});
