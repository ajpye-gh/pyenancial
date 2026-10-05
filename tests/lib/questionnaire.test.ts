import { QUESTIONNAIRE_SECTIONS, RETIREMENT_QUESTIONNAIRE_SECTIONS, visibleSections } from '@src/lib/questionnaire';

describe('visibleSections', () => {
  it('excludes the Partner income section when hasPartnerIncome is unanswered/false', () => {
    const sections = visibleSections(QUESTIONNAIRE_SECTIONS, {});
    expect(sections.some((section) => section.id === 'partner-income')).toBe(false);
  });

  it('includes the Partner income section once hasPartnerIncome is true', () => {
    const sections = visibleSections(QUESTIONNAIRE_SECTIONS, { hasPartnerIncome: true });
    expect(sections.some((section) => section.id === 'partner-income')).toBe(true);
  });

  it('excludes the Housing & mortgage details section when renting/unanswered, includes it when owning', () => {
    expect(visibleSections(QUESTIONNAIRE_SECTIONS, {}).some((section) => section.id === 'housing-mortgage')).toBe(false);
    expect(visibleSections(QUESTIONNAIRE_SECTIONS, { housing: 'rent' }).some((section) => section.id === 'housing-mortgage')).toBe(false);
    expect(visibleSections(QUESTIONNAIRE_SECTIONS, { housing: 'own' }).some((section) => section.id === 'housing-mortgage')).toBe(true);
  });

  it('always includes the Getting started, Income, Expenses, Other assets, and Assumptions sections, and never a retirement section', () => {
    const sections = visibleSections(QUESTIONNAIRE_SECTIONS, {});
    const ids = sections.map((section) => section.id);
    expect(ids).toEqual(['getting-started', 'income', 'expenses', 'other-assets', 'assumptions']);
    expect(ids.some((id) => id.startsWith('retirement-'))).toBe(false);
  });

  it('RETIREMENT_QUESTIONNAIRE_SECTIONS always includes all five retirement sections, in order, ungated', () => {
    const sections = visibleSections(RETIREMENT_QUESTIONNAIRE_SECTIONS, {});
    const ids = sections.map((section) => section.id);
    expect(ids).toEqual(['retirement-age', 'retirement-roth', 'retirement-traditional', 'retirement-after-tax', 'retirement-income']);
  });

  it('drops a section entirely if every one of its questions gets filtered out', () => {
    const sections = visibleSections(
      [
        {
          id: 'empty',
          kind: 'questions',
          title: 'Empty',
          questions: [{ kind: 'slider', field: { id: 'homeValueK', label: 'x', format: 'k', tooltip: '', visibleIf: () => false } }],
        },
      ],
      {},
    );
    expect(sections).toEqual([]);
  });
});
