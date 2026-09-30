import { useState } from 'react';
import type { BaseFieldId } from '../../lib/baseFields';
import type { BaseInputs, BaseRanges } from '../../lib/baseData';
import type { Answers } from '../../lib/questions';
import { QUESTIONNAIRE_SECTIONS, visibleSections } from '../../lib/questionnaire';
import { QuestionScreen } from './QuestionScreen';
import { SectionSummary } from './SectionSummary';
import { WelcomePage } from './WelcomePage';

type Screen = 'welcome' | 'question' | 'summary';

interface OnboardingFlowProps {
  answers: Answers;
  onAnswer: (id: string, value: boolean | string) => void;
  baseInputs: BaseInputs;
  ranges: BaseRanges;
  onChange: (id: BaseFieldId, value: number) => void;
  /** Called once - on finishing the last section's summary, or on Skip at any point. The caller
   *  (App.tsx) owns marking the plan onboarded and switching to the Plan tab; this component only
   *  knows about walking questions, not what "done" means for the rest of the app. */
  onFinish: () => void;
}

/** Orchestrates the welcome screen -> one-question-at-a-time sections -> per-section summary flow
 *  (Stories 1-3 in features.md). Sections/questions are recomputed live from `visibleSections` on
 *  every render, so answering a gating question immediately changes what's ahead - same rule the
 *  sidebar already applies via visibleBaseFieldGroups. */
export function OnboardingFlow({ answers, onAnswer, baseInputs, ranges, onChange, onFinish }: Readonly<OnboardingFlowProps>) {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  // Set when a question was reached via a summary screen's Edit link - Next then returns straight
  // to that summary instead of continuing the normal forward walk through the rest of the section.
  const [returnToSummary, setReturnToSummary] = useState(false);

  const sections = visibleSections(QUESTIONNAIRE_SECTIONS, answers);
  const currentSection = sections[Math.min(sectionIndex, sections.length - 1)];
  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const questionsBefore = sections.slice(0, sectionIndex).reduce((sum, section) => sum + section.questions.length, 0);
  const progressPercent =
    screen === 'welcome' || totalQuestions === 0 ? 0 : Math.round(((questionsBefore + questionIndex) / totalQuestions) * 100);

  const handleStart = () => setScreen('question');

  const handleNext = () => {
    if (returnToSummary) {
      setReturnToSummary(false);
      setScreen('summary');
      return;
    }
    if (questionIndex + 1 < currentSection.questions.length) {
      setQuestionIndex(questionIndex + 1);
    } else {
      setScreen('summary');
    }
  };

  const handleBack = () => {
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

      {screen === 'summary' && currentSection && (
        <SectionSummary section={currentSection} answers={answers} baseInputs={baseInputs} onEdit={handleSummaryEdit} onContinue={handleSummaryContinue} />
      )}
    </div>
  );
}
