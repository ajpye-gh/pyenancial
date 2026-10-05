import { useEffect, useRef } from 'react';
import type { BaseFieldId } from '../../lib/baseFields';
import type { BaseInputs, BaseRanges } from '../../lib/baseData';
import { formatSliderValue } from '../../lib/format';
import type { Answers } from '../../lib/questions';
import type { Question } from '../../lib/questionnaire';
import { Slider } from '../controls/Slider';
import { sliderValueLabelOverride } from './valueLabels';

interface QuestionScreenProps {
  question: Question;
  answers: Answers;
  onAnswer: (id: string, value: boolean | string) => void;
  baseInputs: BaseInputs;
  ranges: BaseRanges;
  onChange: (id: BaseFieldId, value: number) => void;
  /** Advances to the next screen - called immediately on selection for a gating question (Yes/No,
   *  Own/Rent), or via the explicit Next button for a slider question (dragging a slider shouldn't
   *  auto-advance on every tick). */
  onNext: () => void;
}

function GatingQuestionBody({ question, answers, onAnswer, onNext }: Readonly<Pick<QuestionScreenProps, 'answers' | 'onAnswer' | 'onNext'> & { question: Extract<Question, { kind: 'answer' }> }>) {
  // Guards against a second selection firing before the first has re-rendered this screen away -
  // e.g. a fast double-click or a bouncy trackpad/mouse. onAnswer triggers a useTravel setState,
  // which throws if called twice in the same render cycle (its "already called" flag only resets
  // in a useEffect, i.e. after the next commit) - an uncaught throw there freezes the whole app,
  // which looks exactly like the click "did nothing".
  const selectedRef = useRef(false);
  useEffect(() => {
    selectedRef.current = false;
  }, [question.id]);

  const select = (value: boolean | string) => {
    if (selectedRef.current) {
      return;
    }
    selectedRef.current = true;
    onAnswer(question.id, value);
    onNext();
  };
  const current = answers[question.id];

  const [trueLabel, falseLabel] = question.booleanLabels ?? ['Yes', 'No'];
  const options =
    question.type === 'boolean'
      ? [{ label: trueLabel, value: true as const }, { label: falseLabel, value: false as const }]
      : (question.options ?? []).map((option) => ({ label: option.label, value: option.value }));

  return (
    <div className="onboarding-question__choices">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className={current === option.value ? 'onboarding-choice onboarding-choice--selected' : 'onboarding-choice'}
          onClick={() => select(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** One field/gating-question per screen - the questionnaire engine's atomic unit. Explanatory copy
 *  is the field's own tooltip content (`BaseFieldMeta.tooltip`) rendered inline and visibly, not
 *  hidden behind hover - same source of truth the sidebar's Tooltip already uses, just surfaced
 *  differently here. */
export function QuestionScreen({ question, answers, onAnswer, baseInputs, ranges, onChange, onNext }: Readonly<QuestionScreenProps>) {
  if (question.kind === 'answer') {
    return (
      <div className="onboarding-card">
        <h2 className="onboarding-question__prompt">{question.prompt}</h2>
        {question.explanation && <p className="onboarding-question__explanation">{question.explanation}</p>}
        <GatingQuestionBody question={question} answers={answers} onAnswer={onAnswer} onNext={onNext} />
      </div>
    );
  }

  const { field } = question;
  const value = baseInputs[field.id];
  return (
    <div className="onboarding-card">
      <h2 className="onboarding-question__prompt">{field.label}</h2>
      <p className="onboarding-question__explanation">{field.tooltip}</p>
      <div className="onboarding-question__slider">
        <Slider
          id={field.id}
          ariaLabel={field.label}
          range={ranges[field.id]}
          value={value}
          onChange={(next) => onChange(field.id, next)}
          valueLabel={sliderValueLabelOverride(field.id, value, baseInputs) ?? formatSliderValue(value, field.format)}
          formatBound={(bound) => formatSliderValue(bound, field.format)}
        />
      </div>
      <div className="onboarding-question__actions">
        <button type="button" className="primary" onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
}
