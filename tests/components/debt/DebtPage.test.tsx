import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebtPage } from '@src/components/debt/DebtPage';
import { DEFAULT_BASE_RANGES, baseDefaults, type BaseInputs } from '@src/lib/baseData';
import type { Answers } from '@src/lib/questions';
import type { Debt } from '@src/lib/debts';

const BASE_INPUTS: BaseInputs = baseDefaults(DEFAULT_BASE_RANGES);
const NO_DEBT: Answers = { hasDebt: false };
const HAS_DEBT: Answers = { hasDebt: true };

const sampleDebt: Debt = { id: 'debt-1', name: 'Visa card', balance: 5000, aprPct: 20, minPayment: 100 };

function renderPage(overrides: Partial<Parameters<typeof DebtPage>[0]> = {}) {
  return render(
    <DebtPage
      debts={[]}
      onAddDebt={jest.fn()}
      onRemoveDebt={jest.fn()}
      onUpdateDebt={jest.fn()}
      baseInputs={BASE_INPUTS}
      ranges={DEFAULT_BASE_RANGES}
      onChange={jest.fn()}
      answers={NO_DEBT}
      onAnswer={jest.fn()}
      {...overrides}
    />,
  );
}

describe('DebtPage empty state', () => {
  it('shows the empty-state message and no chart/cards when hasDebt is false', () => {
    renderPage();

    expect(screen.getByText(/no other debt to track/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add debt/ })).not.toBeInTheDocument();
  });

  it('flips hasDebt on via the toggle', async () => {
    const user = userEvent.setup();
    const onAnswer = jest.fn();
    renderPage({ onAnswer });

    await user.click(screen.getByRole('button', { name: 'Tracking debt' }));
    expect(onAnswer).toHaveBeenCalledWith('hasDebt', true);
  });

  it('preserves already-entered debts in the draft even while hidden (not rendered, not discarded)', () => {
    renderPage({ debts: [sampleDebt] });
    expect(screen.queryByText('Visa card')).not.toBeInTheDocument();
  });
});

describe('DebtPage with debt tracking on', () => {
  it('renders the chart, strategy toggle, and an Add debt card with no debts yet', () => {
    renderPage({ answers: HAS_DEBT });

    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('Payoff strategy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add debt/ })).toBeInTheDocument();
  });

  it('renders a DebtCard for each debt', () => {
    renderPage({ answers: HAS_DEBT, debts: [sampleDebt, { ...sampleDebt, id: 'debt-2', name: 'Auto loan' }] });

    expect(screen.getAllByText(/Visa card/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Auto loan/).length).toBeGreaterThan(0);
  });

  it('calls onAddDebt when the Add debt card is clicked', async () => {
    const user = userEvent.setup();
    const onAddDebt = jest.fn();
    renderPage({ answers: HAS_DEBT, onAddDebt });

    await user.click(screen.getByRole('button', { name: /Add debt/ }));
    expect(onAddDebt).toHaveBeenCalledTimes(1);
  });

  it('flips hasDebt off via the toggle without touching the debts array', async () => {
    const user = userEvent.setup();
    const onAnswer = jest.fn();
    renderPage({ answers: HAS_DEBT, debts: [sampleDebt], onAnswer });

    await user.click(screen.getByRole('button', { name: 'No other debt' }));
    expect(onAnswer).toHaveBeenCalledWith('hasDebt', false);
  });

  it('renders the payoff detail table with a row per debt', () => {
    renderPage({ answers: HAS_DEBT, debts: [sampleDebt] });
    expect(screen.getByText('Debt payoff detail')).toBeInTheDocument();
    expect(screen.getAllByText(/Visa card/).length).toBeGreaterThan(0);
  });
});
