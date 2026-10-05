import type { Debt } from './debts';

export type { Debt } from './debts';
export { formatPayoffDate } from './mortgage';

export type DebtPayoffStrategy = 'snowball' | 'avalanche';

export interface DebtPayoffYearPoint {
  /** 0 = today, same Y0-baseline convention as mortgage.ts's AmortizationYearPoint. */
  year: number;
  totalBalance: number;
  /** This year, summed across every debt. */
  interestPaid: number;
  /** Total $/mo actually going toward debt as of this year-end (minimums on still-active debts +
   *  extra budget/rollover) - same "point-in-time nominal payment" convention as
   *  AmortizationYearPoint.monthlyPaymentNominal. 0 once every debt is paid off. */
  monthlyPaymentNominal: number;
}

export interface DebtPayoffSchedule {
  /** One point per year, 0 through however many years it takes to pay off everything (capped at
   *  MAX_MONTHS/12 - see buildDebtPayoffSchedule). */
  points: DebtPayoffYearPoint[];
  /** The month (1-indexed) each debt's balance reached $0 - absent for a debt that never pays off
   *  within the MAX_MONTHS cap (see `stalled`). */
  payoffMonthByDebtId: Record<string, number>;
  /** Total months from today until every debt reaches $0 (or MAX_MONTHS, if `stalled`). */
  totalPayoffMonths: number;
  totalInterestPaid: number;
  /** True if some debt's minimum payment doesn't cover its own monthly interest and it's never
   *  rescued by the extra budget/rollover in time, so the simulation cap (MAX_MONTHS) was hit with
   *  balance still remaining. */
  stalled: boolean;
}

const EPSILON = 0.005;
const MAX_MONTHS = 600;

/** Fixes the payoff order once, from starting balances/rates - debts are never re-ranked as
 *  balances change during the simulation. Snowball targets the smallest balance first; avalanche
 *  targets the highest rate first (tie-broken by smaller balance first, same as snowball's primary
 *  key), both further tie-broken by id for determinism. */
export function orderDebtsForStrategy(debts: Debt[], strategy: DebtPayoffStrategy): Debt[] {
  const sorted = [...debts];
  if (strategy === 'snowball') {
    sorted.sort((a, b) => a.balance - b.balance || a.id.localeCompare(b.id));
  } else {
    sorted.sort((a, b) => b.aprPct - a.aprPct || a.balance - b.balance || a.id.localeCompare(b.id));
  }
  return sorted;
}

/** Today's nominal monthly outlay, independent of the month-by-month simulation below - same role
 *  as mortgage.ts's currentMonthlyPayment for its own year-0 snapshot. Sum of every debt's minimum
 *  (capped at that debt's own balance) plus the extra budget, capped overall at the total balance
 *  owed - never shows a bigger "payment" than there's actually debt to apply it to. */
function currentMonthlyDebtPayment(debts: Debt[], extraMonthlyBudget: number): number {
  const totalMin = debts.reduce((sum, debt) => (debt.balance > EPSILON ? sum + Math.min(debt.minPayment, debt.balance) : sum), 0);
  const totalBalance = debts.reduce((sum, debt) => sum + Math.max(0, debt.balance), 0);
  return Math.min(totalMin + extraMonthlyBudget, totalBalance);
}

/** Runs a monthly debt-payoff simulation (mirrors buildAmortizationSchedule's month-then-bucket-
 *  into-years approach in mortgage.ts): accrues interest on every active debt, pays each its
 *  minimum, then applies `extraMonthlyBudget` plus every ALREADY-paid-off debt's former minimum
 *  payment (the "snowball"/"avalanche" rollover - only debts paid off as of the START of a given
 *  month free up their minimum for that month; a debt that finishes paying off DURING a month
 *  doesn't free up its own minimum until the following month) to the highest-priority debt still
 *  owing, cascading leftover to the next debt in the fixed order the same month.
 *
 *  `rolloverFreedMinimums: false` gives the strict "minimum payments only" baseline the Debt tab
 *  compares against: a freed-up minimum just stops being paid rather than being redirected. */
export function buildDebtPayoffSchedule(
  debts: Debt[],
  strategy: DebtPayoffStrategy,
  extraMonthlyBudget: number,
  rolloverFreedMinimums = true,
): DebtPayoffSchedule {
  const totalStart = debts.reduce((sum, debt) => sum + Math.max(0, debt.balance), 0);
  const payoffMonthByDebtId: Record<string, number> = {};

  if (totalStart <= EPSILON) {
    for (const debt of debts) {
      payoffMonthByDebtId[debt.id] = 0;
    }
    return {
      points: [{ year: 0, totalBalance: 0, interestPaid: 0, monthlyPaymentNominal: 0 }],
      payoffMonthByDebtId,
      totalPayoffMonths: 0,
      totalInterestPaid: 0,
      stalled: false,
    };
  }

  const order = orderDebtsForStrategy(debts, strategy);
  const orderIds = order.map((debt) => debt.id);
  const minPaymentById = new Map(debts.map((debt) => [debt.id, debt.minPayment]));
  const aprById = new Map(debts.map((debt) => [debt.id, debt.aprPct]));
  const balances = new Map(debts.map((debt) => [debt.id, Math.max(0, debt.balance)]));

  const points: DebtPayoffYearPoint[] = [
    { year: 0, totalBalance: totalStart, interestPaid: 0, monthlyPaymentNominal: currentMonthlyDebtPayment(debts, extraMonthlyBudget) },
  ];

  let month = 0;
  let totalBalance = totalStart;
  let yearInterest = 0;

  while (totalBalance > EPSILON && month < MAX_MONTHS) {
    month += 1;

    // Snapshot of who's already paid off BEFORE this month's processing - only these debts' minimums
    // are eligible to roll over this month (see the function doc comment above).
    const alreadyPaidOffIds = new Set(orderIds.filter((id) => (balances.get(id) ?? 0) <= EPSILON));

    let interestThisMonth = 0;
    for (const id of orderIds) {
      const balance = balances.get(id) ?? 0;
      if (balance > EPSILON) {
        const interest = balance * (aprById.get(id)! / 100 / 12);
        balances.set(id, balance + interest);
        interestThisMonth += interest;
      }
    }

    let paidThisMonth = 0;
    for (const id of orderIds) {
      const balance = balances.get(id) ?? 0;
      if (balance > EPSILON) {
        const pay = Math.min(minPaymentById.get(id)!, balance);
        balances.set(id, balance - pay);
        paidThisMonth += pay;
      }
    }

    let pool = extraMonthlyBudget;
    if (rolloverFreedMinimums) {
      for (const id of alreadyPaidOffIds) {
        pool += minPaymentById.get(id)!;
      }
    }
    for (const id of orderIds) {
      if (pool <= EPSILON) {
        break;
      }
      const balance = balances.get(id) ?? 0;
      if (balance > EPSILON) {
        const pay = Math.min(pool, balance);
        balances.set(id, balance - pay);
        pool -= pay;
        paidThisMonth += pay;
      }
    }

    for (const id of orderIds) {
      if (!(id in payoffMonthByDebtId) && (balances.get(id) ?? 0) <= EPSILON) {
        payoffMonthByDebtId[id] = month;
      }
    }

    totalBalance = Array.from(balances.values()).reduce((sum, balance) => sum + balance, 0);
    yearInterest += interestThisMonth;

    if (month % 12 === 0 || totalBalance <= EPSILON) {
      points.push({
        year: points.length,
        totalBalance: Math.max(0, totalBalance),
        interestPaid: yearInterest,
        monthlyPaymentNominal: totalBalance <= EPSILON ? 0 : paidThisMonth,
      });
      yearInterest = 0;
    }
  }

  const stalled = totalBalance > EPSILON;
  const totalInterestPaid = points.reduce((sum, point) => sum + point.interestPaid, 0);

  return { points, payoffMonthByDebtId, totalPayoffMonths: month, totalInterestPaid, stalled };
}
