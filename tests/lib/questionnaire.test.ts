import { QUESTIONNAIRE_SECTIONS, visibleSections } from '@src/lib/questionnaire';

describe('visibleSections', () => {
  it('excludes the Partner income section when hasPartnerIncome is unanswered/false', () => {
    const sections = visibleSections(QUESTIONNAIRE_SECTIONS, {});
    expect(sections.some((section) => section.id === 'partner-income')).toBe(false);
  });

  it('includes the Partner income section once hasPartnerIncome is true', () => {
    const sections = visibleSections(QUESTIONNAIRE_SECTIONS, { hasPartnerIncome: true });
    expect(sections.some((section) => section.id === 'partner-income')).toBe(true);
  });

  it('always includes the Getting started, Income, Expenses, Other assets, and Assumptions sections', () => {
    const sections = visibleSections(QUESTIONNAIRE_SECTIONS, {});
    const ids = sections.map((section) => section.id);
    expect(ids).toEqual(['getting-started', 'income', 'expenses', 'other-assets', 'assumptions']);
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
