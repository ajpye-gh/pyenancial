import type { DebtPayoffStrategy } from '../../lib/debtPayoff';

interface DebtStrategyToggleProps {
  strategy: DebtPayoffStrategy;
  onChange: (strategy: DebtPayoffStrategy) => void;
}

/** Same reasoning as FilingStatusToggle.tsx: which payoff strategy is chosen isn't just display
 *  filtering, it changes the debt order the payoff schedule targets extra payments at (see
 *  orderDebtsForStrategy in debtPayoff.ts), so it needs to be a real, always-visible control. */
export function DebtStrategyToggle({ strategy, onChange }: Readonly<DebtStrategyToggleProps>) {
  return (
    <div className="housing-toggle">
      <span className="housing-toggle__label">Payoff strategy</span>
      <div className="chart-toggle">
        <button
          type="button"
          className={strategy === 'avalanche' ? 'chart-toggle__tab chart-toggle__tab--active' : 'chart-toggle__tab'}
          onClick={() => onChange('avalanche')}
        >
          Avalanche
        </button>
        <button
          type="button"
          className={strategy === 'snowball' ? 'chart-toggle__tab chart-toggle__tab--active' : 'chart-toggle__tab'}
          onClick={() => onChange('snowball')}
        >
          Snowball
        </button>
      </div>
    </div>
  );
}
