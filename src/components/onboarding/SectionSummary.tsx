import { formatSliderValue } from '../../lib/format';
import type { BaseInputs } from '../../lib/baseData';
import type { Answers } from '../../lib/questions';
import type { Question, QuestionnaireSection } from '../../lib/questionnaire';

interface SectionSummaryProps {
  section: QuestionnaireSection;
  answers: Answers;
  baseInputs: BaseInputs;
  /** Jumps back to that question's screen; returning from it (Next) comes straight back here
   *  rather than re-walking every question after it - see OnboardingFlow's `returnToSummary`. */
  onEdit: (questionIndex: number) => void;
  onContinue: () => void;
  /** One row per entry in the section's repeatable step (salary-raise breakpoints / children), if
   *  it applies and has anything to show - see OnboardingFlow's repeatableSummaryRows. */
  repeatableRows?: { label: string; value: string }[];
  /** Jumps to the repeatable step's own screen - a single edit affordance for the whole list
   *  rather than per-row, since it's all one screen. Only relevant when repeatableRows is set. */
  onEditRepeatable?: () => void;
}

function displayValue(question: Question, answers: Answers, baseInputs: BaseInputs): string {
  if (question.kind === 'slider') {
    return formatSliderValue(baseInputs[question.field.id], question.field.format);
  }
  const current = answers[question.id];
  if (question.type === 'boolean') {
    const [trueLabel, falseLabel] = question.booleanLabels ?? ['Yes', 'No'];
    return current === true ? trueLabel : falseLabel;
  }
  const option = question.options?.find((candidate) => candidate.value === current);
  return option?.label ?? '—';
}

function questionLabel(question: Question): string {
  return question.kind === 'slider' ? question.field.label : question.prompt;
}

/** Shown at the end of every section - lets the user see what they just entered and jump back to
 *  fix any single answer without re-walking the whole section. See Story 3 in features.md. */
export function SectionSummary({
  section,
  answers,
  baseInputs,
  onEdit,
  onContinue,
  repeatableRows,
  onEditRepeatable,
}: Readonly<SectionSummaryProps>) {
  return (
    <div className="onboarding-card">
      <h2 className="onboarding-question__prompt">{section.title} - your answers</h2>
      <ul className="onboarding-summary__list">
        {section.questions.map((question, index) => (
          <li key={question.kind === 'slider' ? question.field.id : question.id} className="onboarding-summary__row">
            <span className="onboarding-summary__label">{questionLabel(question)}</span>
            <span className="onboarding-summary__value">{displayValue(question, answers, baseInputs)}</span>
            <button type="button" className="onboarding-summary__edit" onClick={() => onEdit(index)}>
              Edit
            </button>
          </li>
        ))}
        {repeatableRows?.map((row, index) => (
          <li key={`repeatable-${index}`} className="onboarding-summary__row">
            <span className="onboarding-summary__label">{row.label}</span>
            <span className="onboarding-summary__value">{row.value}</span>
            {index === 0 && onEditRepeatable && (
              <button type="button" className="onboarding-summary__edit" onClick={onEditRepeatable}>
                Edit
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="onboarding-question__actions">
        <button type="button" className="primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
