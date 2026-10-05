interface DebtToggleProps {
  hasDebt: boolean;
  onChange: (hasDebt: boolean) => void;
  /** False when this sits directly under a "Debt" group title that already says as much (the
   *  Plan tab sidebar's DebtControl) - true (default) for the Debt tab's own standalone usage,
   *  which has no such title above it. */
  showLabel?: boolean;
}

/** Same reasoning as HousingToggle.tsx: whether there's debt to track isn't a one-time answer -
 *  someone can pay everything off (or take on new debt) well after onboarding, so this needs to be
 *  a real, always-visible control on the Debt tab itself, not just the questionnaire's gating
 *  question that seeds it. */
export function DebtToggle({ hasDebt, onChange, showLabel = true }: Readonly<DebtToggleProps>) {
  return (
    <div className="housing-toggle">
      {showLabel && <span className="housing-toggle__label">Debt</span>}
      <div className="chart-toggle">
        <button
          type="button"
          className={hasDebt ? 'chart-toggle__tab chart-toggle__tab--active' : 'chart-toggle__tab'}
          onClick={() => onChange(true)}
        >
          Tracking debt
        </button>
        <button
          type="button"
          className={!hasDebt ? 'chart-toggle__tab chart-toggle__tab--active' : 'chart-toggle__tab'}
          onClick={() => onChange(false)}
        >
          No other debt
        </button>
      </div>
    </div>
  );
}
