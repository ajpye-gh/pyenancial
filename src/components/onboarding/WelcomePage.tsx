interface WelcomePageProps {
  onStart: () => void;
  onSkip: () => void;
}

/** First screen a brand-new (or freshly-named, see PlanToolbar's "+" action) plan lands on -
 *  explains what the app does before asking anything, so the questionnaire that follows has
 *  context. See OnboardingFlow for how this fits into the overall flow. */
export function WelcomePage({ onStart, onSkip }: Readonly<WelcomePageProps>) {
  return (
    <div className="onboarding-card">
      <h1 className="onboarding-welcome__title">Welcome to Pyenancial</h1>
      <p className="onboarding-welcome__body">
        Pyenancial projects your household's cash flow over the next several years - income, expenses, savings goals, and retirement
        drawdown - so you can see whether your plan actually works, and where the tradeoffs are.
      </p>
      <p className="onboarding-welcome__body">
        We'll walk you through a short guided setup, one question at a time, to fill in your numbers. Each question explains what it's
        for and why it matters. You can go back and change an earlier answer at any point, and skip the rest whenever you'd rather just
        see the plan with defaults filled in.
      </p>
      <div className="onboarding-welcome__actions">
        <button type="button" className="primary" onClick={onStart}>
          Start
        </button>
        <button type="button" onClick={onSkip}>
          Skip questionnaire
        </button>
      </div>
    </div>
  );
}
