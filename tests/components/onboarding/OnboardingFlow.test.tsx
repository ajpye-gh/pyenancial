import { render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { OnboardingFlow } from '@src/components/onboarding/OnboardingFlow';
import { DEFAULT_BASE_RANGES, baseDefaults } from '@src/lib/baseData';
import type { Child } from '@src/lib/children';
import type { Answers } from '@src/lib/questions';
import type { SalaryRaiseBreakpoint } from '@src/lib/salaryRaises';

function useSalaryRaiseControls(salaryY0K: number) {
  const [breakpoints, setBreakpoints] = useState<SalaryRaiseBreakpoint[]>([]);
  return {
    breakpoints,
    salaryY0K,
    onAdd: () => setBreakpoints((prev) => [...prev, { id: `b${prev.length}`, year: 1, incomeK: salaryY0K }]),
    onRemove: (id: string) => setBreakpoints((prev) => prev.filter((b) => b.id !== id)),
    onUpdate: (id: string, patch: Partial<Omit<SalaryRaiseBreakpoint, 'id'>>) =>
      setBreakpoints((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b))),
    jobLossYear: undefined,
    onSetJobLoss: () => undefined,
    onClearJobLoss: () => undefined,
  };
}

function useChildrenControls() {
  const [kids, setKids] = useState<Child[]>([]);
  return {
    kids,
    onAdd: () => setKids((prev) => [...prev, { id: `c${prev.length}`, year: 0 }]),
    onRemove: (id: string) => setKids((prev) => prev.filter((c) => c.id !== id)),
    onUpdate: (id: string, year: number) => setKids((prev) => prev.map((c) => (c.id === id ? { ...c, year } : c))),
  };
}

function Harness({ onFinish }: Readonly<{ onFinish: () => void }>) {
  const [answers, setAnswers] = useState<Answers>({});
  const [baseInputs, setBaseInputs] = useState(baseDefaults(DEFAULT_BASE_RANGES));
  const salaryRaiseControls = useSalaryRaiseControls(baseInputs.salaryY0K);
  const partnerSalaryRaiseControls = useSalaryRaiseControls(baseInputs.partnerSalaryY0K);
  const childrenControls = useChildrenControls();

  return (
    <OnboardingFlow
      answers={answers}
      onAnswer={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
      baseInputs={baseInputs}
      ranges={DEFAULT_BASE_RANGES}
      onChange={(id, value) => setBaseInputs((prev) => ({ ...prev, [id]: value }))}
      salaryRaiseControls={salaryRaiseControls}
      partnerSalaryRaiseControls={partnerSalaryRaiseControls}
      childrenControls={childrenControls}
      onFinish={onFinish}
    />
  );
}

/** Walks Start -> Getting started (Rent/No/No) -> Income -> Expenses -> Other assets ->
 *  Assumptions, skipping every repeatable "add another" step, landing on the retirement branch
 *  question ("Do you want to plan for retirement now?"). Renting (rather than owning) skips the
 *  8-field Housing & mortgage details section so the walk stays short. */
async function walkToRetirementBranch(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Start' }));
  await user.click(screen.getByRole('button', { name: 'Rent' }));
  await user.click(screen.getByRole('button', { name: 'No' })); // hasPartnerIncome
  await user.click(screen.getByRole('button', { name: 'No' })); // hasKids
  await user.click(screen.getByRole('button', { name: 'Continue' })); // Getting started -> Income

  await user.click(screen.getByRole('button', { name: 'Next' })); // salaryY0K -> salary milestones
  await user.click(screen.getByRole('button', { name: 'Done - continue' }));
  for (let i = 0; i < 3; i += 1) {
    await user.click(screen.getByRole('button', { name: 'Next' }));
  }
  await user.click(screen.getByRole('button', { name: 'Continue' })); // Income -> Expenses

  for (let i = 0; i < 3; i += 1) {
    await user.click(screen.getByRole('button', { name: 'Next' }));
  }
  await user.click(screen.getByRole('button', { name: 'Continue' })); // Expenses -> Other assets

  for (let i = 0; i < 2; i += 1) {
    await user.click(screen.getByRole('button', { name: 'Next' }));
  }
  await user.click(screen.getByRole('button', { name: 'Continue' })); // Other assets -> Assumptions

  for (let i = 0; i < 3; i += 1) {
    await user.click(screen.getByRole('button', { name: 'Next' }));
  }
  await user.click(screen.getByRole('button', { name: 'Continue' })); // Assumptions -> retirement branch
}

describe('OnboardingFlow', () => {
  it('shows the welcome screen first, with Start and Skip', () => {
    render(<Harness onFinish={jest.fn()} />);
    expect(screen.getByRole('heading', { name: /welcome to pyenancial/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish later' })).toBeInTheDocument();
  });

  it('Skip on the welcome screen calls onFinish immediately', async () => {
    const user = userEvent.setup();
    const onFinish = jest.fn();
    render(<Harness onFinish={onFinish} />);
    await user.click(screen.getByRole('button', { name: 'Finish later' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('walks Start -> first gating question -> selecting an answer auto-advances', async () => {
    const user = userEvent.setup();
    render(<Harness onFinish={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Start' }));

    expect(screen.getByRole('heading', { name: /own or rent/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Own' }));

    // Auto-advanced to the next gating question.
    expect(screen.getByRole('heading', { name: /spouse or partner/i })).toBeInTheDocument();
  });

  it('reaches a section summary after the last question in a section, and Edit jumps back to it', async () => {
    const user = userEvent.setup();
    render(<Harness onFinish={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Start' }));

    await user.click(screen.getByRole('button', { name: 'Own' }));
    await user.click(screen.getByRole('button', { name: 'No' })); // hasPartnerIncome
    await user.click(screen.getByRole('button', { name: 'No' })); // hasKids

    expect(screen.getByRole('heading', { name: /getting started - your answers/i })).toBeInTheDocument();
    expect(screen.getByText('Own')).toBeInTheDocument();

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]); // edit "own or rent"
    expect(screen.getByRole('heading', { name: /own or rent/i })).toBeInTheDocument();

    // Changing it and hitting Next returns straight to the summary, not the next question.
    await user.click(screen.getByRole('button', { name: 'Rent' }));
    expect(screen.getByRole('heading', { name: /getting started - your answers/i })).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
  });

  it('offers a repeatable "add income milestone" step right after starting salary, reflected in the Income summary', async () => {
    const user = userEvent.setup();
    render(<Harness onFinish={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Start' }));
    await user.click(screen.getByRole('button', { name: 'Own' }));
    await user.click(screen.getByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Continue' })); // Getting started -> Income

    // Salary, yr 0 (today) is the Income section's first question.
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('heading', { name: /any income milestones to add/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Add income milestone' }));
    await user.click(screen.getByRole('button', { name: 'Done - continue' }));

    // Back into the remaining scalar questions (Growth after last raise, Net keep rate, Annual bonus).
    expect(screen.getByRole('heading', { name: /growth after last raise/i })).toBeInTheDocument();
    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }

    expect(screen.getByRole('heading', { name: /income - your answers/i })).toBeInTheDocument();
    expect(screen.getByText(/income milestone, yr/i)).toBeInTheDocument();
  });

  it('skips the children repeatable step in Expenses when hasKids is answered No', async () => {
    const user = userEvent.setup();
    render(<Harness onFinish={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Start' }));
    await user.click(screen.getByRole('button', { name: 'Own' }));
    await user.click(screen.getByRole('button', { name: 'No' })); // hasPartnerIncome
    await user.click(screen.getByRole('button', { name: 'No' })); // hasKids
    await user.click(screen.getByRole('button', { name: 'Continue' })); // -> Income
    await user.click(screen.getByRole('button', { name: 'Next' })); // salaryY0K -> salary milestones
    await user.click(screen.getByRole('button', { name: 'Done - continue' }));
    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }
    await user.click(screen.getByRole('button', { name: 'Continue' })); // -> Expenses (Partner income skipped, hasPartnerIncome=No)

    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }

    // No child-adding step - straight to the Expenses summary.
    expect(screen.getByRole('heading', { name: /expenses - your answers/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /add each child/i })).not.toBeInTheDocument();
  });

  it('reaches the retirement branch question with Yes/Later buttons after Assumptions', async () => {
    const user = userEvent.setup();
    render(<Harness onFinish={jest.fn()} />);
    await walkToRetirementBranch(user);

    expect(screen.getByRole('heading', { name: /plan for retirement now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Later' })).toBeInTheDocument();
  });

  it('"Later" finishes the questionnaire without entering the retirement sections', async () => {
    const user = userEvent.setup();
    const onFinish = jest.fn();
    render(<Harness onFinish={onFinish} />);
    await walkToRetirementBranch(user);

    await user.click(screen.getByRole('button', { name: 'Later' }));
    // Auto-advances to the branch section's own summary first (same as any other gating question).
    expect(screen.getByText('Later')).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('shows derived monthly take-home pay next to the Net keep rate slider', async () => {
    const user = userEvent.setup();
    render(<Harness onFinish={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Start' }));
    await user.click(screen.getByRole('button', { name: 'Own' }));
    await user.click(screen.getByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'No' }));
    await user.click(screen.getByRole('button', { name: 'Continue' })); // -> Income
    await user.click(screen.getByRole('button', { name: 'Next' })); // salaryY0K -> salary milestones
    await user.click(screen.getByRole('button', { name: 'Done - continue' }));
    await user.click(screen.getByRole('button', { name: 'Next' })); // Growth after last raise -> Net keep rate

    expect(screen.getByRole('heading', { name: /net keep rate/i })).toBeInTheDocument();
    // Default salaryY0K ($70k) * default netKeepRatePct (75%) / 12 = $4,375/mo.
    expect(screen.getByText(/\$4,375\/mo/)).toBeInTheDocument();
  });

  it('"Yes" continues into the retirement questionnaire (Age, then Roth, ...)', async () => {
    const user = userEvent.setup();
    const onFinish = jest.fn();
    render(<Harness onFinish={onFinish} />);
    await walkToRetirementBranch(user);

    await user.click(screen.getByRole('button', { name: 'Yes' }));
    await user.click(screen.getByRole('button', { name: 'Continue' })); // branch summary -> Retirement age

    expect(screen.getByRole('heading', { name: /current age/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: /target retirement age/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('heading', { name: /retirement age - your answers/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: /current roth savings/i })).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });
});
