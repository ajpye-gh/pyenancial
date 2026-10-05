import { useMemo, useState } from 'react';
import { ControlGroup } from '../controls/ControlGroup';
import { SliderField } from '../controls/SliderField';
import { MobileSubTabs } from '../MobileSubTabs';
import { CollapsibleChart } from '../results/CollapsibleChart';
import { MetricCards, type Metric } from '../results/MetricCards';
import { DebtToggle } from './DebtToggle';
import { DebtStrategyToggle } from './DebtStrategyToggle';
import { DebtCard } from './DebtCard';
import { AddDebtCard } from './AddDebtCard';
import { DebtPayoffChart } from './DebtPayoffChart';
import { DebtPayoffTable } from './DebtPayoffTable';
import type { BaseInputs, BaseRanges } from '../../lib/baseData';
import { DEBT_INSPECT_YEAR_FIELD, DEBT_PAYOFF_GROUP, type BaseFieldId } from '../../lib/baseFields';
import { formatCurrency, formatCurrencyCompact } from '../../lib/format';
import { debtPayoffStrategy, hasDebt as getHasDebt, type Answers } from '../../lib/questions';
import { buildDebtPayoffSchedule, formatPayoffDate, orderDebtsForStrategy } from '../../lib/debtPayoff';
import { padToLength } from '../../lib/chartUtil';
import type { Debt } from '../../lib/debts';

interface DebtPageProps {
  debts: Debt[];
  onAddDebt: (debt: Debt) => void;
  onRemoveDebt: (id: string) => void;
  onUpdateDebt: (id: string, patch: Partial<Omit<Debt, 'id'>>) => void;
  baseInputs: BaseInputs;
  ranges: BaseRanges;
  onChange: (id: BaseFieldId, value: number) => void;
  answers: Answers;
  onAnswer: (id: string, value: boolean | string) => void;
}

type MobileTab = 'inputs' | 'results';

/** Same shape as the Mortgage/Retirement pages: sidebar on the left for global payoff settings
 *  (strategy, extra budget), chart + debt cards + results on the right - except debts themselves
 *  are cards in the main area (like Goals), not sidebar sliders. */
export function DebtPage({
  debts,
  onAddDebt,
  onRemoveDebt,
  onUpdateDebt,
  baseInputs,
  ranges,
  onChange,
  answers,
  onAnswer,
}: Readonly<DebtPageProps>) {
  const [mobileTab, setMobileTab] = useState<MobileTab>('results');
  const [newestDebtId, setNewestDebtId] = useState<string | null>(null);
  const hasDebt = getHasDebt(answers);
  const strategy = debtPayoffStrategy(answers);
  const extraMonthlyBudget = baseInputs.debtExtraPaymentMo;

  const withStrategySchedule = useMemo(
    () => buildDebtPayoffSchedule(debts, strategy, extraMonthlyBudget),
    [debts, strategy, extraMonthlyBudget],
  );
  const minimumOnlySchedule = useMemo(() => buildDebtPayoffSchedule(debts, strategy, 0, false), [debts, strategy]);

  const chartLength = Math.max(withStrategySchedule.points.length, minimumOnlySchedule.points.length);
  const withStrategyBalances = padToLength(withStrategySchedule.points.map((point) => point.totalBalance), chartLength);
  const minimumOnlyBalances = padToLength(minimumOnlySchedule.points.map((point) => point.totalBalance), chartLength);
  const withStrategyPayoffYear = withStrategySchedule.points.length - 1;
  const minimumOnlyPayoffYear = minimumOnlySchedule.points.length - 1;
  // Rollover (freed-up minimums cascading to the next debt) can speed up payoff even with no extra
  // budget set, once there's more than one debt - so the second line is worth showing whenever
  // either of those is true, not just when extraMonthlyBudget > 0 (unlike MortgagePage's single-loan
  // hasExtraPayment check, where only an explicit extra payment can make the schedules differ).
  const hasExtraBudget = extraMonthlyBudget > 0 || debts.length > 1;

  const totalBalance = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const interestSaved = Math.max(0, minimumOnlySchedule.totalInterestPaid - withStrategySchedule.totalInterestPaid);

  const inspectRange = { ...ranges.debtInspectYear, max: Math.max(0, chartLength - 1) };
  const inspectYear = Math.min(Math.max(baseInputs.debtInspectYear, 0), inspectRange.max);

  const orderedDebts = orderDebtsForStrategy(debts, strategy);
  const payoffOrderById = new Map(orderedDebts.map((debt, index) => [debt.id, index + 1]));

  const handleAddDebt = (debt: Debt) => {
    setNewestDebtId(debt.id);
    onAddDebt(debt);
  };

  const metrics: Metric[] = [
    { id: 'debt-payment', label: 'Current monthly debt payment', value: `${formatCurrency(withStrategySchedule.points[0]?.monthlyPaymentNominal ?? 0)}/mo` },
    { id: 'debt-balance', label: 'Total balance', value: formatCurrencyCompact(totalBalance) },
    { id: 'debt-payoff-minimums', label: 'Payoff date, minimums only', value: formatPayoffDate(minimumOnlySchedule.totalPayoffMonths) },
    ...(hasExtraBudget
      ? [{ id: 'debt-payoff-strategy', label: 'Payoff date, with strategy', value: formatPayoffDate(withStrategySchedule.totalPayoffMonths) }]
      : []),
    { id: 'debt-interest-saved', label: 'Interest saved', value: formatCurrency(interestSaved) },
  ];

  if (!hasDebt) {
    return (
      <div className="app-shell">
        <div className="app-shell__main">
          <DebtToggle hasDebt={hasDebt} onChange={(next) => onAnswer('hasDebt', next)} />
          <p className="mortgage-page__empty">
            You've told us there's no other debt to track. Any debts you've already entered stay saved - flip the
            toggle above to see them and plan their payoff again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" data-mobile-tab={mobileTab}>
      <aside className="app-shell__sidebar">
        <div className="controls-panel">
          <DebtToggle hasDebt={hasDebt} onChange={(next) => onAnswer('hasDebt', next)} />
          <DebtStrategyToggle strategy={strategy} onChange={(next) => onAnswer('debtPayoffStrategy', next)} />
          <ControlGroup group={DEBT_PAYOFF_GROUP} ranges={ranges} values={baseInputs} onChange={onChange} />
        </div>
      </aside>

      <div className="app-shell__main">
        <div className="app-shell__chart">
          <CollapsibleChart>
            <DebtPayoffChart
              minimumOnlyBalances={minimumOnlyBalances}
              withStrategyBalances={withStrategyBalances}
              hasExtraBudget={hasExtraBudget}
              minimumOnlyPayoffYear={minimumOnlyPayoffYear}
              withStrategyPayoffYear={withStrategyPayoffYear}
            />
          </CollapsibleChart>
        </div>

        <MobileSubTabs
          options={[
            { id: 'inputs', label: 'Inputs' },
            { id: 'results', label: 'Results' },
          ]}
          active={mobileTab}
          onSelect={setMobileTab}
        />

        <div className="page__section-title">Debts</div>
        <div className="goals-panel">
          {debts.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              payoffOrder={payoffOrderById.get(debt.id)}
              payoffDate={
                debt.id in withStrategySchedule.payoffMonthByDebtId
                  ? formatPayoffDate(withStrategySchedule.payoffMonthByDebtId[debt.id])
                  : undefined
              }
              defaultExpanded={debt.id === newestDebtId}
              onUpdate={onUpdateDebt}
              onRemove={onRemoveDebt}
            />
          ))}
          <AddDebtCard onAdd={handleAddDebt} />
        </div>

        <div className="app-shell__results">
          <div className="inspect-year-control">
            <SliderField meta={DEBT_INSPECT_YEAR_FIELD} range={inspectRange} value={inspectYear} onChange={onChange} />
          </div>
          <MetricCards metrics={metrics} />
          <DebtPayoffTable debts={debts} strategy={strategy} schedule={withStrategySchedule} minimumOnlySchedule={minimumOnlySchedule} />
        </div>
      </div>
    </div>
  );
}
