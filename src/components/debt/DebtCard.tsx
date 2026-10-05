import { useState } from 'react';
import { formatCurrency } from '../../lib/format';
import type { Debt } from '../../lib/debts';
import { EditIcon, SaveIcon } from '../icons';
import { Slider } from '../controls/Slider';

interface DebtCardProps {
  debt: Debt;
  /** 1-indexed position in the chosen strategy's payoff order - undefined until a schedule exists
   *  (e.g. no debts at all yet, handled by the caller never rendering a card in that case). */
  payoffOrder?: number;
  /** Pre-formatted payoff date (via formatPayoffDate) - undefined if the debt never pays off within
   *  the simulation cap (see DebtPayoffSchedule.stalled). */
  payoffDate?: string;
  /** Initial expanded/collapsed state only - true for a just-added debt (so the user can configure
   *  it right away), false (collapsed) otherwise. The card's own chevron toggles it freely after
   *  that, uncontrolled. */
  defaultExpanded?: boolean;
  onUpdate: (id: string, patch: Partial<Omit<Debt, 'id'>>) => void;
  onRemove: (id: string) => void;
}

const BALANCE_RANGE = { min: 0, max: 50000, step: 100 };
const APR_RANGE = { min: 0, max: 30, step: 0.1 };
const MIN_PAYMENT_RANGE = { min: 0, max: 2000, step: 10 };

/** Collapsed cards are height-capped (see .goal-card--collapsed, reused here) so a long debt list
 *  stays scannable - same treatment as GoalCard. */
function cardClassName(isExpanded: boolean): string {
  return isExpanded ? 'goal-card' : 'goal-card goal-card--collapsed';
}

/** Same collapse/expand + inline-rename shell as GoalCard.tsx, without any of its category/
 *  purchase/equity branching - a debt is always the same shape (balance, APR, minimum payment). */
export function DebtCard({ debt, payoffOrder, payoffDate, defaultExpanded = false, onUpdate, onRemove }: Readonly<DebtCardProps>) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(debt.name);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const startEditingName = () => {
    setDraftName(debt.name);
    setIsEditingName(true);
  };

  const commitName = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== debt.name) {
      onUpdate(debt.id, { name: trimmed });
    }
    setIsEditingName(false);
  };

  return (
    <div className={cardClassName(isExpanded)}>
      <div className="goal-card__header">
        <div className="goal-card__title">
          {isEditingName ? (
            <input
              type="text"
              className="goal-card__name-input"
              value={draftName}
              autoFocus
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitName();
                }
              }}
              aria-label="Debt name"
            />
          ) : (
            <span className="goal-card__name">{debt.name}</span>
          )}
          {isExpanded && (
            <button
              type="button"
              className="goal-card__edit-name"
              onClick={isEditingName ? commitName : startEditingName}
              aria-label={isEditingName ? `Save ${debt.name}` : `Rename ${debt.name}`}
              title={isEditingName ? 'Save' : 'Rename'}
            >
              {isEditingName ? <SaveIcon /> : <EditIcon />}
            </button>
          )}
        </div>
        <button
          type="button"
          className="goal-card__expand"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse ${debt.name}` : `Expand ${debt.name}`}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '▾' : '▸'}
        </button>
      </div>

      {payoffOrder !== undefined && (
        <span className="debt-card__payoff-badge">
          #{payoffOrder}
          {payoffDate ? ` · paid off ${payoffDate}` : ''}
        </span>
      )}

      {!isExpanded ? (
        <div className="goal-card__summary">
          <span className="goal-card__summary-amount">
            {formatCurrency(debt.balance)} @ {debt.aprPct.toFixed(1)}%
          </span>
        </div>
      ) : (
        <>
          <Slider
            id={`${debt.id}-balance`}
            label="Balance"
            range={BALANCE_RANGE}
            value={debt.balance}
            onChange={(value) => onUpdate(debt.id, { balance: value })}
            valueLabel={formatCurrency(debt.balance)}
          />

          <Slider
            id={`${debt.id}-apr`}
            label="Interest rate (APR)"
            range={APR_RANGE}
            value={debt.aprPct}
            onChange={(value) => onUpdate(debt.id, { aprPct: value })}
            valueLabel={`${debt.aprPct.toFixed(1)}%`}
          />

          <Slider
            id={`${debt.id}-min-payment`}
            label="Minimum payment"
            range={MIN_PAYMENT_RANGE}
            value={debt.minPayment}
            onChange={(value) => onUpdate(debt.id, { minPayment: value })}
            valueLabel={`${formatCurrency(debt.minPayment)}/mo`}
          />

          <div className="goal-card__footer">
            <button type="button" className="goal-card__delete" onClick={() => onRemove(debt.id)}>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
