import { createDebt, generateDebtId, type Debt } from '../../lib/debts';

interface AddDebtCardProps {
  onAdd: (debt: Debt) => void;
}

/** Sits as the last item in the same `.goals-panel` flex grid as the debt cards (reuses the
 *  `.goal-card` sizing rules, same as AddGoalCard) - but unlike AddGoalCard, there's no catalog
 *  picker step: every debt has the same shape, so clicking this just adds one directly. */
export function AddDebtCard({ onAdd }: Readonly<AddDebtCardProps>) {
  return (
    <button type="button" className="goal-card add-goal-card" onClick={() => onAdd(createDebt(generateDebtId()))}>
      <span className="add-goal-card__icon">+</span>
      Add debt
    </button>
  );
}
