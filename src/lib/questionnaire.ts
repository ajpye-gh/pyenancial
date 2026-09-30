import type { ReactNode } from 'react';
import {
  BASE_FIELD_GROUPS,
  EXTRA_PAYMENTS_GROUP,
  MORTGAGE_DETAILS_GROUP,
  RETIREMENT_AFTER_TAX_GROUP,
  RETIREMENT_AGE_GROUP,
  RETIREMENT_INCOME_GROUP,
  RETIREMENT_ROTH_GROUP,
  RETIREMENT_TRADITIONAL_GROUP,
  TAXES_INSURANCE_GROUP,
  type BaseFieldMeta,
} from './baseFields';
import { hasKids, hasPartnerIncome, ownsHome, wantsRetirementPlanning, type Answers } from './questions';

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
  /** Custom [true-label, false-label] for a boolean question - e.g. ['Yes', 'Later'] instead of
   *  the default ['Yes', 'No']. Only meaningful when type is 'boolean'. */
  booleanLabels?: [string, string];
}

/** A single numeric base-input field, reusing its existing sidebar metadata (label, format,
 *  tooltip) as-is - the questionnaire's explanatory copy is the same tooltip the sidebar already
 *  shows, never separately authored. */
export interface SliderQuestion {
  kind: 'slider';
  field: BaseFieldMeta;
}

export type Question = GatingQuestion | SliderQuestion;

/** A repeatable "add another" step inserted after one particular question in a section (and
 *  before its summary) - salary-raise breakpoints and children are dynamic lists, not scalar
 *  fields, so they don't fit the one-Question-per-screen shape above (see Story 4 in
 *  features.md). The engine (OnboardingFlow) renders the matching editor for `target`; this type
 *  only says which one, where it goes, and whether it applies right now. */
export interface RepeatableStep {
  target: 'salaryRaises' | 'partnerSalaryRaises' | 'children';
  /** 0-indexed question position the step follows - e.g. 0 means right after the section's first
   *  question. Defaults to the section's last question (i.e. the step trails all of them) when
   *  omitted. Salary milestones sit right after the starting-salary question specifically so
   *  "Growth after last raise"/"Net keep rate" (asked next) aren't referencing milestones that
   *  don't exist yet. */
  afterQuestionIndex?: number;
  /** Step is skipped unless this returns true (e.g. children only when hasKids). Always shown if
   *  omitted. */
  visibleIf?: (answers: Answers) => boolean;
}

export interface QuestionSection {
  id: string;
  kind: 'questions';
  title: string;
  questions: Question[];
  /** Section is skipped entirely (and excluded from the progress count) unless this returns true.
   *  Always shown if omitted. */
  visibleIf?: (answers: Answers) => boolean;
  repeatable?: RepeatableStep;
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
    repeatable: { target: 'salaryRaises', afterQuestionIndex: 0 },
  },
  {
    id: 'partner-income',
    kind: 'questions',
    title: 'Partner income',
    questions: sliderQuestions(fieldGroup('Partner income')),
    visibleIf: hasPartnerIncome,
    repeatable: { target: 'partnerSalaryRaises', afterQuestionIndex: 0 },
  },
  {
    id: 'expenses',
    kind: 'questions',
    title: 'Expenses',
    questions: sliderQuestions(fieldGroup('Expenses')),
    repeatable: { target: 'children', visibleIf: hasKids },
  },
  {
    id: 'housing-mortgage',
    kind: 'questions',
    title: 'Housing & mortgage details',
    questions: sliderQuestions([...MORTGAGE_DETAILS_GROUP.fields, ...TAXES_INSURANCE_GROUP.fields, ...EXTRA_PAYMENTS_GROUP.fields]),
    visibleIf: ownsHome,
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
  {
    id: 'retirement-branch',
    kind: 'questions',
    title: 'Retirement',
    questions: [
      {
        kind: 'answer',
        id: 'retirementNow',
        prompt: 'Do you want to plan for retirement now?',
        explanation:
          "We'll ask about your Roth/Traditional/after-tax savings, Social Security, and pension - the same fields the Retirement tab already has. Choosing Later skips all of it for now (every retirement field keeps its default); you can fill it in anytime on the Retirement tab itself, or come back through this questionnaire later.",
        type: 'boolean',
        booleanLabels: ['Yes', 'Later'],
      },
    ],
  },
  // Story 6: only reached when the branch question above is answered "Yes" - reuses the exact
  // field groups the Retirement tab's own sidebar renders (RetirementPage.tsx), promoted to shared
  // exports in baseFields.tsx so there's one definition, not two.
  {
    id: 'retirement-age',
    kind: 'questions',
    title: 'Retirement age',
    questions: sliderQuestions(RETIREMENT_AGE_GROUP.fields),
    visibleIf: wantsRetirementPlanning,
  },
  {
    id: 'retirement-roth',
    kind: 'questions',
    title: 'Roth',
    questions: sliderQuestions(RETIREMENT_ROTH_GROUP.fields),
    visibleIf: wantsRetirementPlanning,
  },
  {
    id: 'retirement-traditional',
    kind: 'questions',
    title: 'Traditional',
    questions: sliderQuestions(RETIREMENT_TRADITIONAL_GROUP.fields),
    visibleIf: wantsRetirementPlanning,
  },
  {
    id: 'retirement-after-tax',
    kind: 'questions',
    title: 'After-tax',
    questions: sliderQuestions(RETIREMENT_AFTER_TAX_GROUP.fields),
    visibleIf: wantsRetirementPlanning,
  },
  {
    id: 'retirement-income',
    kind: 'questions',
    title: 'Income in retirement',
    questions: sliderQuestions(RETIREMENT_INCOME_GROUP.fields),
    visibleIf: wantsRetirementPlanning,
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
