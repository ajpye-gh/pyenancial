import { buildDebtPayoffSchedule, orderDebtsForStrategy } from '@src/lib/debtPayoff';
import type { Debt } from '@src/lib/debts';

describe('orderDebtsForStrategy', () => {
  const smallLowRate: Debt = { id: 'x', name: 'Small, low rate', balance: 500, aprPct: 10, minPayment: 30 };
  const bigHighRate: Debt = { id: 'y', name: 'Big, high rate', balance: 2000, aprPct: 25, minPayment: 50 };

  it('snowball orders smallest-balance-first', () => {
    const order = orderDebtsForStrategy([bigHighRate, smallLowRate], 'snowball');
    expect(order.map((debt) => debt.id)).toEqual(['x', 'y']);
  });

  it('avalanche orders highest-rate-first', () => {
    const order = orderDebtsForStrategy([smallLowRate, bigHighRate], 'avalanche');
    expect(order.map((debt) => debt.id)).toEqual(['y', 'x']);
  });

  it('avalanche tie-breaks equal rates by smaller balance first', () => {
    const p: Debt = { id: 'p', name: 'P', balance: 800, aprPct: 15, minPayment: 40 };
    const q: Debt = { id: 'q', name: 'Q', balance: 400, aprPct: 15, minPayment: 40 };
    const order = orderDebtsForStrategy([p, q], 'avalanche');
    expect(order.map((debt) => debt.id)).toEqual(['q', 'p']);
  });
});

describe('buildDebtPayoffSchedule', () => {
  it('returns a trivial zeroed schedule for an empty debt list', () => {
    const schedule = buildDebtPayoffSchedule([], 'avalanche', 0);
    expect(schedule.points).toEqual([{ year: 0, totalBalance: 0, interestPaid: 0, monthlyPaymentNominal: 0 }]);
    expect(schedule.totalPayoffMonths).toBe(0);
    expect(schedule.totalInterestPaid).toBe(0);
    expect(schedule.stalled).toBe(false);
  });

  describe('rollover mechanic (zero-interest debts isolate the payment mechanics)', () => {
    const debtA: Debt = { id: 'a', name: 'A', balance: 1000, aprPct: 0, minPayment: 100 };
    const debtB: Debt = { id: 'b', name: 'B', balance: 2000, aprPct: 0, minPayment: 50 };

    it('pays A off in exactly 10 months at its own minimum', () => {
      const schedule = buildDebtPayoffSchedule([debtA, debtB], 'snowball', 0, true);
      expect(schedule.payoffMonthByDebtId.a).toBe(10);
    });

    it("rolls A's freed minimum onto B starting the month after A pays off, finishing B in 20 months", () => {
      const schedule = buildDebtPayoffSchedule([debtA, debtB], 'snowball', 0, true);
      expect(schedule.payoffMonthByDebtId.b).toBe(20);
      expect(schedule.totalPayoffMonths).toBe(20);
    });

    it('without rollover, B only ever gets its own minimum and finishes in 40 months', () => {
      const schedule = buildDebtPayoffSchedule([debtA, debtB], 'snowball', 0, false);
      expect(schedule.payoffMonthByDebtId.b).toBe(40);
      expect(schedule.totalPayoffMonths).toBe(40);
    });

    it('rollover finishes strictly faster than no rollover for the same debts/budget', () => {
      const withRollover = buildDebtPayoffSchedule([debtA, debtB], 'snowball', 0, true);
      const withoutRollover = buildDebtPayoffSchedule([debtA, debtB], 'snowball', 0, false);
      expect(withRollover.totalPayoffMonths).toBeLessThan(withoutRollover.totalPayoffMonths);
    });

    it('monthlyPaymentNominal is 0 once every debt is paid off', () => {
      const schedule = buildDebtPayoffSchedule([debtA], 'snowball', 0, true);
      const lastPoint = schedule.points[schedule.points.length - 1];
      expect(lastPoint.totalBalance).toBe(0);
      expect(lastPoint.monthlyPaymentNominal).toBe(0);
    });
  });

  it('a minPayment that cannot cover its own interest stalls within the simulation cap', () => {
    const debt: Debt = { id: 'stuck', name: 'Stuck', balance: 1000, aprPct: 24, minPayment: 15 };
    const schedule = buildDebtPayoffSchedule([debt], 'avalanche', 0);
    expect(schedule.stalled).toBe(true);
    expect(schedule.totalPayoffMonths).toBe(600);
  });

  it('extra budget + rollover reduces total interest paid vs. minimums-only, no-rollover, for the same nonzero-rate debts', () => {
    const debtA: Debt = { id: 'a', name: 'A', balance: 1000, aprPct: 20, minPayment: 50 };
    const debtB: Debt = { id: 'b', name: 'B', balance: 3000, aprPct: 15, minPayment: 80 };

    const withStrategy = buildDebtPayoffSchedule([debtA, debtB], 'avalanche', 200, true);
    const minimumOnly = buildDebtPayoffSchedule([debtA, debtB], 'avalanche', 0, false);

    expect(withStrategy.totalInterestPaid).toBeLessThan(minimumOnly.totalInterestPaid);
    expect(withStrategy.totalPayoffMonths).toBeLessThan(minimumOnly.totalPayoffMonths);
  });

  it('each year the total balance is no greater than the previous year (never grows while payments are being made and things aren\'t stalled)', () => {
    const debtA: Debt = { id: 'a', name: 'A', balance: 5000, aprPct: 18, minPayment: 120 };
    const schedule = buildDebtPayoffSchedule([debtA], 'avalanche', 0);
    for (let i = 1; i < schedule.points.length; i++) {
      expect(schedule.points[i].totalBalance).toBeLessThanOrEqual(schedule.points[i - 1].totalBalance);
    }
  });
});
