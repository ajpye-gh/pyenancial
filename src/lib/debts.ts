/** A single high-interest, non-mortgage debt (credit card, personal/auto/student loan, etc.) - the
 *  Debt tab's own array-stored entity, same id/validation conventions as `Goal` (goals.ts) and
 *  `SalaryRaiseBreakpoint` (salaryRaises.ts). Dollar amounts are plain dollars, not thousands -
 *  consistent with `Goal.monthlyAmount`/`targetAmount`, not the K-suffixed `baseInputs` convention. */
export interface Debt {
  id: string;
  name: string;
  balance: number;
  aprPct: number;
  minPayment: number;
}

let fallbackIdCounter = 0;

/** crypto.randomUUID() isn't guaranteed available in every runtime (older browsers, some test environments). */
export function generateDebtId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackIdCounter += 1;
  return `debt-${Date.now().toString(36)}-${fallbackIdCounter}`;
}

/** Default shape for a newly-added debt, used by the Debt tab's "Add debt" card - no catalog of
 *  types is needed (unlike GOAL_CATALOG), every debt has the same shape. */
export function createDebt(id: string): Debt {
  return { id, name: 'New debt', balance: 5000, aprPct: 20, minPayment: 100 };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidDebt(value: unknown): value is Debt {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const debt = value as Record<string, unknown>;
  if (typeof debt.id !== 'string' || debt.id.length === 0) {
    return false;
  }
  if (typeof debt.name !== 'string' || debt.name.length === 0) {
    return false;
  }
  if (!isFiniteNumber(debt.balance) || debt.balance < 0) {
    return false;
  }
  if (!isFiniteNumber(debt.aprPct) || debt.aprPct < 0) {
    return false;
  }
  if (!isFiniteNumber(debt.minPayment) || debt.minPayment < 0) {
    return false;
  }
  return true;
}
