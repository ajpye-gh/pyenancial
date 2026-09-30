import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { OnboardingFlow } from '@src/components/onboarding/OnboardingFlow';
import { DEFAULT_BASE_RANGES, baseDefaults } from '@src/lib/baseData';
import type { Answers } from '@src/lib/questions';

function Harness({ onFinish }: Readonly<{ onFinish: () => void }>) {
  const [answers, setAnswers] = useState<Answers>({});
  const [baseInputs, setBaseInputs] = useState(baseDefaults(DEFAULT_BASE_RANGES));

  return (
    <OnboardingFlow
      answers={answers}
      onAnswer={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
      baseInputs={baseInputs}
      ranges={DEFAULT_BASE_RANGES}
      onChange={(id, value) => setBaseInputs((prev) => ({ ...prev, [id]: value }))}
      onFinish={onFinish}
    />
  );
}

describe('OnboardingFlow', () => {
  it('shows the welcome screen first, with Start and Skip', () => {
    render(<Harness onFinish={jest.fn()} />);
    expect(screen.getByRole('heading', { name: /welcome to pyenancial/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip questionnaire' })).toBeInTheDocument();
  });

  it('Skip on the welcome screen calls onFinish immediately', async () => {
    const user = userEvent.setup();
    const onFinish = jest.fn();
    render(<Harness onFinish={onFinish} />);
    await user.click(screen.getByRole('button', { name: 'Skip questionnaire' }));
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
});
