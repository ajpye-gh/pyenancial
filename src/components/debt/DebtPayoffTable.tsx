import { Row } from '../results/BreakdownTable';
import { formatCurrency } from '../../lib/format';
import { formatPayoffDate, orderDebtsForStrategy, type DebtPayoffSchedule, type DebtPayoffStrategy } from '../../lib/debtPayoff';
import type { Debt } from '../../lib/debts';

interface DebtPayoffTableProps {
  debts: Debt[];
  strategy: DebtPayoffStrategy;
  schedule: DebtPayoffSchedule;
  minimumOnlySchedule: DebtPayoffSchedule;
}

/** Per-debt payoff detail (order, date, terms) plus the minimums-only-vs-with-strategy totals -
 *  reuses BreakdownTable's exported `Row` (same styling MortgagePage's own payment-detail table
 *  already reuses it with). */
export function DebtPayoffTable({ debts, strategy, schedule, minimumOnlySchedule }: Readonly<DebtPayoffTableProps>) {
  const orderedDebts = orderDebtsForStrategy(debts, strategy);
  const interestSaved = Math.max(0, minimumOnlySchedule.totalInterestPaid - schedule.totalInterestPaid);
  const monthsSaved = Math.max(0, minimumOnlySchedule.totalPayoffMonths - schedule.totalPayoffMonths);

  return (
    <div className="breakdown-table-wrap">
      <div className="breakdown-table__title">Debt payoff detail</div>
      <table className="breakdown-table">
        <tbody>
          {orderedDebts.map((debt, index) => {
            const hasPayoffMonth = debt.id in schedule.payoffMonthByDebtId;
            return (
              <Row
                key={debt.id}
                label={`#${index + 1} ${debt.name} — ${formatCurrency(debt.balance)} @ ${debt.aprPct.toFixed(1)}%, ${formatCurrency(debt.minPayment)}/mo min`}
                value={hasPayoffMonth ? formatPayoffDate(schedule.payoffMonthByDebtId[debt.id]) : 'Never (see warning)'}
                muted
              />
            );
          })}
          <tr className="breakdown-table__divider">
            <td colSpan={2} />
          </tr>
          <Row label="Total interest, minimums only" value={formatCurrency(minimumOnlySchedule.totalInterestPaid)} muted />
          <Row label="Total interest, with strategy" value={formatCurrency(schedule.totalInterestPaid)} muted />
          <Row label="Interest saved" value={formatCurrency(interestSaved)} />
          <Row label="Months saved" value={String(monthsSaved)} muted />
          {schedule.stalled && (
            <tr className="breakdown-table__total">
              <td>Warning</td>
              <td className="breakdown-table__value breakdown-table__value--danger">
                At least one debt's minimum payment doesn't cover its own interest - it will never pay off at this rate.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
