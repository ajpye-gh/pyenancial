import { useState } from 'react';
import type { ChildBreakpointsProps } from '../controls/ChildBreakpoints';
import type { SalaryRaiseBreakpointsProps } from '../controls/SalaryRaiseBreakpoints';
import type { BaseFieldId } from '../../lib/baseFields';
import type { BaseInputs, BaseRanges } from '../../lib/baseData';
import { formatSliderValue } from '../../lib/format';
import type { Answers } from '../../lib/questions';
import { QUESTIONNAIRE_SECTIONS, visibleSections, type QuestionnaireSection, type RepeatableStep } from '../../lib/questionnaire';
import { QuestionScreen } from './QuestionScreen';
import { RepeatableStepScreen } from './RepeatableStepScreen';
import { SectionSummary } from './SectionSummary';
import { WelcomePage } from './WelcomePage';

type Screen = 'welcome' | 'question' | 'repeatable' | 'summary';

interface OnboardingFlowProps {
  answers: Answers;
  onAnswer: (id: string, value: boolean | string) => void;
  baseInputs: BaseInputs;
  ranges: BaseRanges;
  onChange: (id: BaseFieldId, value: number) => void;
  salaryRaiseControls: SalaryRaiseBreakpointsProps;
  partnerSalaryRaiseControls: SalaryRaiseBreakpointsProps;
  childrenControls: ChildBreakpointsProps;
  /** Called once - on finishing the last section's summary, or on Skip at any point. The caller
   *  (App.tsx) owns marking the plan onboarded and switching to the Plan tab; this component only
   *  knows about walking questions, not what "done" means for the rest of the app. */
  onFinish: () => void;
  /** 'question' skips the welcome screen and drops straight into the first section - used when
   *  reopening for a review (Story 8), where the marketing-copy intro doesn't apply and every field
   *  is already prefilled from the existing draft. Defaults to 'welcome' for first-time onboarding. */
  initialScreen?: Screen;
}

function repeatableVisibleFor(section: QuestionnaireSection | undefined, answers: Answers): RepeatableStep | undefined {
  if (!section?.repeatable) {
    return undefined;
  }
  return !section.repeatable.visibleIf || section.repeatable.visibleIf(answers) ? section.repeatable : undefined;
}

function repeatableSummaryRows(
  step: RepeatableStep | undefined,
  salaryRaiseControls: SalaryRaiseBreakpointsProps,
  partnerSalaryRaiseControls: SalaryRaiseBreakpointsProps,
  childrenControls: ChildBreakpointsProps,
): { label: string; value: string }[] | undefined {
  if (!step) {
    return undefined;
  }
  if (step.target === 'salaryRaises') {
    return salaryRaiseControls.breakpoints.map((b) => ({ label: `Income milestone, yr ${b.year}`, value: formatSliderValue(b.incomeK, 'k') }));
  }
  if (step.target === 'partnerSalaryRaises') {
    return partnerSalaryRaiseControls.breakpoints.map((b) => ({ label: `Income milestone, yr ${b.year}`, value: formatSliderValue(b.incomeK, 'k') }));
  }
  return childrenControls.kids.map((child) => ({ label: 'Child', value: child.year === 0 ? 'Already here' : `Arrives yr ${child.year}` }));
}

/** Orchestrates the welcome screen -> one-question-at-a-time sections (with an optional
 *  repeatable "add another" step) -> per-section summary flow (Stories 1-4 in features.md).
 *  Sections/questions are recomputed live from `visibleSections` on every render, so answering a
 *  gating question immediately changes what's ahead - same rule the sidebar already applies via
 *  visibleBaseFieldGroups. */
export function OnboardingFlow({
  answers,
  onAnswer,
  baseInputs,
  ranges,
  onChange,
  salaryRaiseControls,
  partnerSalaryRaiseControls,
  childrenControls,
  onFinish,
  initialScreen = 'welcome',
}: Readonly<OnboardingFlowProps>) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  // Set when a question was reached via a summary screen's Edit link - Next then returns straight
  // to that summary instead of continuing the normal forward walk through the rest of the section.
  const [returnToSummary, setReturnToSummary] = useState(false);

  const sections = visibleSections(QUESTIONNAIRE_SECTIONS, answers);
  const currentSection = sections[Math.min(sectionIndex, sections.length - 1)];
  const activeRepeatable = repeatableVisibleFor(currentSection, answers);
  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const questionsBefore = sections.slice(0, sectionIndex).reduce((sum, section) => sum + section.questions.length, 0);
  const progressPercent =
    screen === 'welcome' || totalQuestions === 0 ? 0 : Math.round(((questionsBefore + questionIndex) / totalQuestions) * 100);

  const handleStart = () => setScreen('question');

  // Where a repeatable step (if any) sits in the question order - defaults to trailing the
  // section's last question, same as before afterQuestionIndex existed.
  const repeatableAfterIndex = activeRepeatable
    ? (activeRepeatable.afterQuestionIndex ?? currentSection.questions.length - 1)
    : undefined;

  const handleNext = () => {
    if (returnToSummary) {
      setReturnToSummary(false);
      setScreen('summary');
      return;
    }
    if (repeatableAfterIndex !== undefined && questionIndex === repeatableAfterIndex) {
      setScreen('repeatable');
      return;
    }
    if (questionIndex + 1 < currentSection.questions.length) {
      setQuestionIndex(questionIndex + 1);
    } else {
      setScreen('summary');
    }
  };

  const handleRepeatableContinue = () => {
    if (returnToSummary) {
      setReturnToSummary(false);
      setScreen('summary');
      return;
    }
    const afterIndex = repeatableAfterIndex ?? currentSection.questions.length - 1;
    if (afterIndex + 1 < currentSection.questions.length) {
      setQuestionIndex(afterIndex + 1);
      setScreen('question');
    } else {
      setScreen('summary');
    }
  };

  const handleBack = () => {
    if (screen === 'summary') {
      setScreen('question');
      setQuestionIndex(currentSection.questions.length - 1);
      return;
    }
    if (screen === 'repeatable') {
      setScreen('question');
      setQuestionIndex(repeatableAfterIndex ?? currentSection.questions.length - 1);
      return;
    }
    if (questionIndex > 0) {
      setQuestionIndex(questionIndex - 1);
    } else if (sectionIndex > 0) {
      setSectionIndex(sectionIndex - 1);
      setScreen('summary');
    } else {
      setScreen('welcome');
    }
  };

  const handleSummaryEdit = (index: number) => {
    setQuestionIndex(index);
    setReturnToSummary(true);
    setScreen('question');
  };

  const handleSummaryContinue = () => {
    if (sectionIndex + 1 < sections.length) {
      setSectionIndex(sectionIndex + 1);
      setQuestionIndex(0);
      setScreen('question');
    } else {
      onFinish();
    }
  };

  return (
    <div className="onboarding-overlay">
      {screen !== 'welcome' && (
        <div className="onboarding-topbar">
          <button type="button" className="onboarding-back" onClick={handleBack} aria-label="Back">
            ← Back
          </button>
          <div className="onboarding-progress" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div className="onboarding-progress__fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <button type="button" className="onboarding-skip" onClick={onFinish}>
            Skip questionnaire
          </button>
        </div>
      )}

      {screen === 'welcome' && <WelcomePage onStart={handleStart} onSkip={onFinish} />}

      {screen === 'question' && currentSection && (
        <>
          <p className="onboarding-question__meta">
            {currentSection.title} - question {questionIndex + 1} of {currentSection.questions.length}
          </p>
          <QuestionScreen
            question={currentSection.questions[questionIndex]}
            answers={answers}
            onAnswer={onAnswer}
            baseInputs={baseInputs}
            ranges={ranges}
            onChange={onChange}
            onNext={handleNext}
          />
        </>
      )}

      {screen === 'repeatable' && activeRepeatable && (
        <RepeatableStepScreen
          step={activeRepeatable}
          salaryRaiseControls={salaryRaiseControls}
          partnerSalaryRaiseControls={partnerSalaryRaiseControls}
          childrenControls={childrenControls}
          onContinue={handleRepeatableContinue}
        />
      )}

      {screen === 'summary' && currentSection && (
        <SectionSummary
          section={currentSection}
          answers={answers}
          baseInputs={baseInputs}
          onEdit={handleSummaryEdit}
          onContinue={handleSummaryContinue}
          repeatableRows={repeatableSummaryRows(activeRepeatable, salaryRaiseControls, partnerSalaryRaiseControls, childrenControls)}
          onEditRepeatable={
            activeRepeatable
              ? () => {
                  setReturnToSummary(true);
                  setScreen('repeatable');
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
