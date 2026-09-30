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
}

function displayValue(question: Question, answers: Answers, baseInputs: BaseInputs): string {
  if (question.kind === 'slider') {
    return formatSliderValue(baseInputs[question.field.id], question.field.format);
  }
  const current = answers[question.id];
  if (question.type === 'boolean') {
    return current === true ? 'Yes' : 'No';
  }
  const option = question.options?.find((candidate) => candidate.value === current);
  return option?.label ?? '—';
}

function questionLabel(question: Question): string {
  return question.kind === 'slider' ? question.field.label : question.prompt;
}

/** Shown at the end of every section - lets the user see what they just entered and jump back to
 *  fix any single answer without re-walking the whole section. See Story 3 in features.md. */
export function SectionSummary({ section, answers, baseInputs, onEdit, onContinue }: Readonly<SectionSummaryProps>) {
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
      </ul>
      <div className="onboarding-question__actions">
        <button type="button" className="primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
