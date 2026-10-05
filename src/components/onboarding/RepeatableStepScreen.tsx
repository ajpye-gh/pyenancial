import { ChildBreakpoints, type ChildBreakpointsProps } from '../controls/ChildBreakpoints';
import { SalaryRaiseBreakpoints, type SalaryRaiseBreakpointsProps } from '../controls/SalaryRaiseBreakpoints';
import type { RepeatableStep } from '../../lib/questionnaire';

interface RepeatableStepScreenProps {
  step: RepeatableStep;
  salaryRaiseControls: SalaryRaiseBreakpointsProps;
  partnerSalaryRaiseControls: SalaryRaiseBreakpointsProps;
  childrenControls: ChildBreakpointsProps;
  onContinue: () => void;
}

const COPY: Record<RepeatableStep['target'], { prompt: string; explanation: string }> = {
  salaryRaises: {
    prompt: 'Any income milestones to add?',
    explanation:
      "If you expect a raise or income change at a specific year, add it below - each one is an absolute income level, not a delta. Skip this if your income is expected to stay flat.",
  },
  partnerSalaryRaises: {
    prompt: "Any income milestones for your partner?",
    explanation: 'Same idea as your own - add a milestone for each year their income is expected to change.',
  },
  children: {
    prompt: 'Add each child, and the year they arrive',
    explanation: 'Use year 0 for a child already part of your household today. Add one row per child.',
  },
};

/** Renders the matching repeatable editor (reusing the exact same components/controls the Plan
 *  tab's sidebar uses - SalaryRaiseBreakpoints/ChildBreakpoints - rather than a separate
 *  questionnaire-only implementation) with a "Done - continue" action. See Story 4 in features.md. */
export function RepeatableStepScreen({ step, salaryRaiseControls, partnerSalaryRaiseControls, childrenControls, onContinue }: Readonly<RepeatableStepScreenProps>) {
  const copy = COPY[step.target];

  return (
    <div className="onboarding-card">
      <h2 className="onboarding-question__prompt">{copy.prompt}</h2>
      <p className="onboarding-question__explanation">{copy.explanation}</p>
      {step.target === 'salaryRaises' && <SalaryRaiseBreakpoints {...salaryRaiseControls} />}
      {step.target === 'partnerSalaryRaises' && <SalaryRaiseBreakpoints {...partnerSalaryRaiseControls} />}
      {step.target === 'children' && <ChildBreakpoints {...childrenControls} />}
      <div className="onboarding-question__actions">
        <button type="button" className="primary" onClick={onContinue}>
          Done - continue
        </button>
      </div>
    </div>
  );
}
