import type { ReactNode } from 'react';
import { BASE_FIELD_GROUPS, type BaseFieldMeta } from './baseFields';
import { hasPartnerIncome, type Answers } from './questions';

/** A gating yes/no or own/rent-style question, written straight into `Answers` - the questionnaire
 *  generalization of SPEC.md's original 3-question `Question` interface (§4.2), now used for
 *  section-skipping within the questionnaire rather than sidebar section visibility (see
 *  hasPartnerIncome/hasKids in lib/questions.ts). */
export interface GatingQuestion {
  kind: 'answer';
  id: string;
  prompt: string;
  explanation?: ReactNode;
  type: 'boolean' | 'choice';
  options?: { label: string; value: string }[];
}

/** A single numeric base-input field, reusing its existing sidebar metadata (label, format,
 *  tooltip) as-is - the questionnaire's explanatory copy is the same tooltip the sidebar already
 *  shows, never separately authored. */
export interface SliderQuestion {
  kind: 'slider';
  field: BaseFieldMeta;
}

export type Question = GatingQuestion | SliderQuestion;

export interface QuestionSection {
  id: string;
  kind: 'questions';
  title: string;
  questions: Question[];
  /** Section is skipped entirely (and excluded from the progress count) unless this returns true.
   *  Always shown if omitted. */
  visibleIf?: (answers: Answers) => boolean;
}

export type QuestionnaireSection = QuestionSection;

function fieldGroup(title: string): BaseFieldMeta[] {
  const group = BASE_FIELD_GROUPS.find((candidate) => candidate.title === title);
  if (!group) {
    throw new Error(`No base field group titled "${title}".`);
  }
  return group.fields;
}

function sliderQuestions(fields: BaseFieldMeta[]): SliderQuestion[] {
  return fields.map((field) => ({ kind: 'slider', field }));
}

const GETTING_STARTED_QUESTIONS: GatingQuestion[] = [
  {
    kind: 'answer',
    id: 'housing',
    prompt: 'Do you own or rent your home?',
    explanation: 'Determines whether we ask about your mortgage later, and how your housing payment is modeled.',
    type: 'choice',
    options: [
      { label: 'Own', value: 'own' },
      { label: 'Rent', value: 'rent' },
    ],
  },
  {
    kind: 'answer',
    id: 'hasPartnerIncome',
    prompt: 'Do you have a spouse or partner who earns income?',
    explanation: "If yes, we'll ask about their salary too. If not, we'll skip that section - you can always add it later.",
    type: 'boolean',
  },
  {
    kind: 'answer',
    id: 'hasKids',
    prompt: 'Do you have kids, or plan to?',
    explanation: "If yes, we'll ask when each child arrives (or already has). If not, we'll skip that step.",
    type: 'boolean',
  },
];

// "Other assets" deliberately excludes the Assets group's home/mortgage fields (HOME_VALUE_FIELD,
// MORTGAGE_BALANCE_FIELD) - those live in the Housing & mortgage details section instead, gated on
// ownsHome rather than always shown like Brokerage/Cash today.
const OTHER_ASSET_FIELD_IDS = new Set(['brokerageTodayK', 'cashTodayK']);

export const QUESTIONNAIRE_SECTIONS: QuestionnaireSection[] = [
  {
    id: 'getting-started',
    kind: 'questions',
    title: 'Getting started',
    questions: GETTING_STARTED_QUESTIONS,
  },
  {
    id: 'income',
    kind: 'questions',
    title: 'Income',
    questions: sliderQuestions(fieldGroup('Income')),
  },
  {
    id: 'partner-income',
    kind: 'questions',
    title: 'Partner income',
    questions: sliderQuestions(fieldGroup('Partner income')),
    visibleIf: hasPartnerIncome,
  },
  {
    id: 'expenses',
    kind: 'questions',
    title: 'Expenses',
    questions: sliderQuestions(fieldGroup('Expenses')),
  },
  {
    id: 'other-assets',
    kind: 'questions',
    title: 'Other assets',
    questions: sliderQuestions(fieldGroup('Assets').filter((field) => OTHER_ASSET_FIELD_IDS.has(field.id))),
  },
  {
    id: 'assumptions',
    kind: 'questions',
    title: 'Assumptions',
    questions: sliderQuestions(fieldGroup('Assumptions')),
  },
];

/** Sections filtered to their currently-applicable ones, each in turn filtered down to its
 *  currently-applicable questions - same two-level "drop what doesn't apply, then drop anything
 *  left empty" shape as baseFields.tsx's visibleBaseFieldGroups, just extended to gate whole
 *  sections (not just individual fields) on the questionnaire's own gating answers. */
export function visibleSections(sections: QuestionnaireSection[], answers: Answers): QuestionnaireSection[] {
  return sections
    .filter((section) => !section.visibleIf || section.visibleIf(answers))
    .map((section) => ({
      ...section,
      questions: section.questions.filter((question) => question.kind !== 'slider' || !question.field.visibleIf || question.field.visibleIf(answers)),
    }))
    .filter((section) => section.questions.length > 0);
}
