import { useState } from 'react';
import { SliderField } from './SliderField';
import { DebtToggle } from '../debt/DebtToggle';
import type { BaseInputs, BaseRanges } from '../../lib/baseData';
import { DEBT_EXTRA_PAYMENT_FIELD, type BaseFieldId } from '../../lib/baseFields';
import type { Debt } from '../../lib/debts';
import { formatCurrency } from '../../lib/format';
import { hasDebt as getHasDebt, type Answers } from '../../lib/questions';

interface DebtControlProps {
  answers: Answers;
  onAnswer: (id: string, value: boolean | string) => void;
  debts: Debt[];
  ranges: BaseRanges;
  values: BaseInputs;
  onChange: (id: BaseFieldId, value: number) => void;
}

/** Plan tab sidebar's own compact Debt section - same collapsible `.control-group` shell as
 *  Income/Expenses/Assets, but not sourced from `BASE_FIELD_GROUPS`/`ControlGroup` directly (see
 *  `DEBT_PAYOFF_GROUP`'s own comment in baseFields.tsx) since it mixes the always-visible toggle,
 *  a derived read-only minimum-payments total, and the one editable slider that also drives the
 *  Debt tab's own sidebar - not a plain field list. Individual debts stay edited as cards on the
 *  Debt tab itself; this is the summary + the one lever that feeds the Plan tab's own cash flow
 *  (see model.ts's debtCost), so it shouldn't require a tab switch to notice or adjust. */
export function DebtControl({ answers, onAnswer, debts, ranges, values, onChange }: Readonly<DebtControlProps>) {
  const [collapsed, setCollapsed] = useState(false);
  const tracking = getHasDebt(answers);
  const totalMinPayments = debts.reduce((sum, debt) => sum + debt.minPayment, 0);

  return (
    <div className="control-group">
      <button
        type="button"
        className="control-group__title"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-expanded={!collapsed}
      >
        Debt
        <span className="control-group__chevron" aria-hidden="true">
          {collapsed ? '▸' : '▾'}
        </span>
      </button>
      {!collapsed && (
        <>
          <DebtToggle hasDebt={tracking} onChange={(next) => onAnswer('hasDebt', next)} showLabel={false} />
          {tracking && (
            <>
              <div className="debt-control__readout">
                <span>Minimum payments</span>
                <span className="debt-control__readout-value">{formatCurrency(totalMinPayments)}/mo</span>
              </div>
              <SliderField
                meta={DEBT_EXTRA_PAYMENT_FIELD}
                range={ranges.debtExtraPaymentMo}
                value={values.debtExtraPaymentMo}
                onChange={onChange}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
