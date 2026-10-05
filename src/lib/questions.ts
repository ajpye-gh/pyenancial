import type { FilingStatus } from './tax';

export type Answers = Record<string, boolean | string>;

export function ownsHome(answers: Answers): boolean {
  return answers.housing === 'own';
}

/** Defaults to false (no partner income) when unset - these two only exist to let the
 *  questionnaire (lib/questionnaire.ts) skip whole sections that don't apply; they don't gate
 *  anything on the sidebar itself (Partner income/Expenses stay always-visible there, same as
 *  before this field existed - a $0 default already covers "doesn't apply" for the sidebar). */
export function hasPartnerIncome(answers: Answers): boolean {
  return answers.hasPartnerIncome === true;
}

/** Defaults to false (no kids) when unset - see hasPartnerIncome above for why this doesn't touch
 *  sidebar visibility, only the questionnaire's section skipping. */
export function hasKids(answers: Answers): boolean {
  return answers.hasKids === true;
}

/** Defaults to 'single' when unset - consistent with partner fields already defaulting to "no
 *  partner" (partnerSalaryY0K: 0) rather than assuming a partner exists. */
export function filingStatus(answers: Answers): FilingStatus {
  return answers.filingStatus === 'marriedJoint' ? 'marriedJoint' : 'single';
}

/** Defaults to true (Social Security participates in the plan) when unset - matching the benefit
 *  slider's own nonzero default. The toggle exists so someone who genuinely expects none (already
 *  ineligible, a foreign retiree, a deliberately conservative plan, etc.) can remove it from the
 *  model entirely, rather than only being able to drag the benefit slider to $0 while it's still
 *  nominally "on" (see SocialSecurityToggle.tsx and RetirementPage.tsx). */
export function socialSecurityEnabled(answers: Answers): boolean {
  return answers.socialSecurityEnabled !== false;
}

/** Defaults to false (off) when unset - this is an opt-in strategy (the "Social Security bridge":
 *  draw down Traditional/IRA to cover the gap before Social Security starts, then cut that
 *  withdrawal back once it does, since Social Security now covers the difference), not a default
 *  assumption about how every early retiree behaves. Only meaningful - and only shown - when
 *  retiring before Social Security starts; see RetirementPage.tsx's own gating. */
export function ssWithdrawalBridgeEnabled(answers: Answers): boolean {
  return answers.ssWithdrawalBridgeEnabled === true;
}
