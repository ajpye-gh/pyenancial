import { createDebt, generateDebtId, isValidDebt, type Debt } from '@src/lib/debts';

describe('generateDebtId', () => {
  it('produces unique ids across repeated calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateDebtId()));
    expect(ids.size).toBe(20);
  });
});

describe('createDebt', () => {
  it('produces a valid debt with the given id', () => {
    const debt = createDebt('debt-1');
    expect(isValidDebt(debt)).toBe(true);
    expect(debt.id).toBe('debt-1');
  });
});

describe('isValidDebt', () => {
  const valid: Debt = { id: 'debt-1', name: 'Visa card', balance: 5000, aprPct: 22, minPayment: 100 };

  it('accepts a well-formed debt', () => {
    expect(isValidDebt(valid)).toBe(true);
  });

  it.each([
    ['non-object', 'nope'],
    ['null', null],
    ['missing id', { ...valid, id: '' }],
    ['missing name', { ...valid, name: '' }],
    ['negative balance', { ...valid, balance: -1 }],
    ['non-finite balance', { ...valid, balance: 'lots' }],
    ['negative aprPct', { ...valid, aprPct: -1 }],
    ['non-finite aprPct', { ...valid, aprPct: 'lots' }],
    ['negative minPayment', { ...valid, minPayment: -1 }],
    ['non-finite minPayment', { ...valid, minPayment: 'lots' }],
  ])('rejects %s', (_label, candidate) => {
    expect(isValidDebt(candidate)).toBe(false);
  });
});
