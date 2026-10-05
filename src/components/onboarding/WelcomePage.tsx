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
        See if your money plan actually holds up - income, savings, goals, retirement, all in one place.
      </p>
      <p className="onboarding-welcome__body">
        A few quick questions to get your numbers in. Go back and change anything, or jump straight to the plan with defaults.
      </p>
      <div className="onboarding-welcome__actions">
        <button type="button" className="primary" onClick={onStart}>
          Start
        </button>
        <button type="button" onClick={onSkip}>
          Finish later
        </button>
      </div>
    </div>
  );
}
