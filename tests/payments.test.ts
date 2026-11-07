import { describe, expect, it } from 'vitest';
import {
  assertAffordable,
  createPlan,
  isAddress,
  lamportsToSolExact,
  solToLamportsExact,
  validateContacts,
  validatePlan,
} from '../lib/payments';
import { CONTACTS, DRAFT, PAYER, PLAN } from './fixtures';

describe('exact SOL arithmetic', () => {
  it.each([
    ['0.000000001', 1n],
    ['0.002', 2_000_000n],
    ['1', 1_000_000_000n],
    ['0.100000000', 100_000_000n],
  ])('converts %s exactly', (input, expected) => expect(solToLamportsExact(input)).toBe(expected));
  it.each([
    '0',
    '0.0',
    '-1',
    '+1',
    '1e-3',
    'NaN',
    'Infinity',
    '.001',
    '00.1',
    '1.',
    ' 1',
    '1 ',
    '0.0000000001',
    '',
    '1,000',
    '1_000',
  ])('rejects %j without rounding', (input) => expect(() => solToLamportsExact(input)).toThrow());
  it.each([
    [0n, '0'],
    [1n, '0.000000001'],
    [1_000_000_001n, '1.000000001'],
    [2_000_000n, '0.002'],
  ])('formats %s lamports exactly', (value, expected) =>
    expect(lamportsToSolExact(value)).toBe(expected),
  );
});
describe('deterministic payment plans', () => {
  it('resolves only known labels and freezes exact full addresses', () => {
    expect(PLAN.items[0].address).toBe(CONTACTS[0].address);
    expect(PLAN.totalLamports).toBe('6000000');
    expect(Object.isFrozen(PLAN)).toBe(true);
    expect(Object.isFrozen(PLAN.items[0])).toBe(true);
  });
  it('accepts exactly two recipients', () =>
    expect(createPlan(PAYER, DRAFT.slice(0, 2), CONTACTS).items).toHaveLength(2));
  it.each([0, 1, 4])('rejects instruction count %s', (count) =>
    expect(() =>
      createPlan(
        PAYER,
        Array.from({ length: count }, (_, i) => DRAFT[i % 3]),
        CONTACTS,
      ),
    ).toThrow('2 or 3'),
  );
  it('rejects unknown labels instead of guessing', () =>
    expect(() =>
      createPlan(PAYER, [{ ...DRAFT[0], recipientLabel: 'Unknown' }, DRAFT[1]], CONTACTS),
    ).toThrow('known contact'));
  it('requires an exact label match', () =>
    expect(() =>
      createPlan(PAYER, [{ ...DRAFT[0], recipientLabel: 'ada' }, DRAFT[1]], CONTACTS),
    ).toThrow());
  it('rejects an invalid payer', () =>
    expect(() => createPlan('invalid', DRAFT, CONTACTS)).toThrow());
  it('rejects duplicate destinations', () =>
    expect(() => createPlan(PAYER, [DRAFT[0], DRAFT[0]], CONTACTS)).toThrow('Duplicate'));
  it('rejects self payment', () =>
    expect(() => createPlan(CONTACTS[0].address, DRAFT, CONTACTS)).toThrow('Self-payments'));
  it('enforces the per-transfer cap independently of AI', () =>
    expect(() =>
      createPlan(PAYER, [{ ...DRAFT[0], amountSol: '0.100000001' }, DRAFT[1]], CONTACTS),
    ).toThrow('0.1'));
  it('enforces the total cap independently of AI', () =>
    expect(() =>
      createPlan(
        PAYER,
        DRAFT.map((row) => ({ ...row, amountSol: '0.1' })),
        CONTACTS,
      ),
    ).toThrow('0.2'));
  it('allows the exact 0.2 SOL total boundary', () =>
    expect(
      createPlan(
        PAYER,
        DRAFT.slice(0, 2).map((row) => ({ ...row, amountSol: '0.1' })),
        CONTACTS,
      ).totalLamports,
    ).toBe('200000000'));
  it('rejects local-storage tampering with lamports', () =>
    expect(() =>
      validatePlan({
        ...PLAN,
        items: PLAN.items.map((item, i) => (i ? item : { ...item, lamports: '1' })),
      }),
    ).toThrow());
  it('rejects local-storage tampering with total', () =>
    expect(() => validatePlan({ ...PLAN, totalLamports: '1' })).toThrow());
  it('includes the actual estimated fee in the affordability check', () => {
    expect(() => assertAffordable(PLAN, 6_004_999n, 5000n)).toThrow('Insufficient');
    expect(() => assertAffordable(PLAN, 6_005_000n, 5000n)).not.toThrow();
  });
  it('rejects a negative fee', () =>
    expect(() => assertAffordable(PLAN, 10_000_000n, -1n)).toThrow());
});
describe('address book', () => {
  it('accepts valid Solana addresses', () => expect(isAddress(CONTACTS[0].address)).toBe(true));
  it.each(['', '0'.repeat(44), 'abc', 'z'.repeat(44)])('rejects invalid address %j', (value) =>
    expect(isAddress(value)).toBe(false),
  );
  it('rejects duplicate names case-insensitively', () =>
    expect(() => validateContacts([CONTACTS[0], { ...CONTACTS[1], name: 'ada' }])).toThrow(
      'names',
    ));
  it('rejects duplicate public addresses', () =>
    expect(() =>
      validateContacts([CONTACTS[0], { ...CONTACTS[1], address: CONTACTS[0].address }]),
    ).toThrow('different address'));
  it('rejects duplicate local IDs', () =>
    expect(() => validateContacts([CONTACTS[0], { ...CONTACTS[1], id: CONTACTS[0].id }])).toThrow(
      'IDs',
    ));
  it('rejects a fourth contact', () =>
    expect(() => validateContacts([...CONTACTS, CONTACTS[0]])).toThrow());
});
