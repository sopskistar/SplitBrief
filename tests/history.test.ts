import { describe, expect, it } from 'vitest';
import { HISTORY_KEY, readHistory, rememberSubmission } from '../lib/history';
import { PLAN, TEST_SIGNATURE } from './fixtures';
function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
describe('untrusted browser history', () => {
  it('stores only a submitted signature and plan snapshot, never a local settled flag', () => {
    const s = storage();
    rememberSubmission(s, TEST_SIGNATURE, PLAN);
    const entry = readHistory(s)[0];
    expect(entry.signature).toBe(TEST_SIGNATURE);
    expect(entry.plan.totalLamports).toBe(PLAN.totalLamports);
    expect(entry).not.toHaveProperty('confirmed');
  });
  it('deduplicates the original submitted signature', () => {
    const s = storage();
    rememberSubmission(s, TEST_SIGNATURE, PLAN);
    rememberSubmission(s, TEST_SIGNATURE, PLAN);
    expect(readHistory(s)).toHaveLength(1);
  });
  it('discards malformed history', () => {
    const s = storage();
    s.setItem(HISTORY_KEY, 'not JSON');
    expect(readHistory(s)).toEqual([]);
  });
  it('rejects tampered saved plans', () => {
    const s = storage();
    s.setItem(
      HISTORY_KEY,
      JSON.stringify([
        {
          signature: TEST_SIGNATURE,
          plan: { ...PLAN, totalLamports: '1' },
          submittedAt: new Date().toISOString(),
        },
      ]),
    );
    expect(readHistory(s)).toEqual([]);
  });
});
