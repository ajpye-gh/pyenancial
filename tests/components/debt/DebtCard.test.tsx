import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DebtCard } from '@src/components/debt/DebtCard';
import type { Debt } from '@src/lib/debts';

const baseDebt: Debt = {
  id: 'debt-1',
  name: 'Visa card',
  balance: 5000,
  aprPct: 20,
  minPayment: 100,
};

function renderCard(overrides: Partial<Parameters<typeof DebtCard>[0]> = {}) {
  return render(<DebtCard debt={baseDebt} onUpdate={jest.fn()} onRemove={jest.fn()} {...overrides} />);
}

describe('DebtCard name editing', () => {
  it('renders the name as static text until the edit icon is clicked', () => {
    renderCard({ defaultExpanded: true });

    expect(screen.getByText('Visa card')).toBeInTheDocument();
    expect(screen.queryByLabelText('Debt name')).not.toBeInTheDocument();
  });

  it('switches to an input on rename click and back to static text on save', async () => {
    const user = userEvent.setup();
    const onUpdate = jest.fn();
    renderCard({ defaultExpanded: true, onUpdate });

    await user.click(screen.getByRole('button', { name: 'Rename Visa card' }));
    const input = screen.getByLabelText('Debt name');
    await user.clear(input);
    await user.type(input, 'Chase card');
    await user.click(screen.getByRole('button', { name: 'Save Visa card' }));

    expect(onUpdate).toHaveBeenCalledWith('debt-1', { name: 'Chase card' });
    expect(screen.queryByLabelText('Debt name')).not.toBeInTheDocument();
  });

  it('ignores a blank rename and keeps the original name', async () => {
    const user = userEvent.setup();
    const onUpdate = jest.fn();
    renderCard({ defaultExpanded: true, onUpdate });

    await user.click(screen.getByRole('button', { name: 'Rename Visa card' }));
    const input = screen.getByLabelText('Debt name');
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Save Visa card' }));

    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByText('Visa card')).toBeInTheDocument();
  });
});

describe('DebtCard collapse/expand', () => {
  it('is collapsed by default, showing only balance and APR', () => {
    renderCard();

    expect(screen.getByText('$5,000 @ 20.0%')).toBeInTheDocument();
    expect(screen.queryByText('Minimum payment')).not.toBeInTheDocument();
  });

  it('toggles between collapsed and expanded on click', async () => {
    const user = userEvent.setup();
    renderCard();

    expect(screen.queryByText('Minimum payment')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand Visa card' }));
    expect(screen.getByText('Minimum payment')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Collapse Visa card' }));
    expect(screen.queryByText('Minimum payment')).not.toBeInTheDocument();
  });

  it('starts expanded when defaultExpanded is set (e.g. a just-added debt)', () => {
    renderCard({ defaultExpanded: true });
    expect(screen.getByText('Minimum payment')).toBeInTheDocument();
  });
});

describe('DebtCard sliders', () => {
  it('calls onUpdate with the new balance when the balance slider changes', () => {
    const onUpdate = jest.fn();
    renderCard({ defaultExpanded: true, onUpdate });

    const slider = screen.getByText('Balance').parentElement?.querySelector('input[type="range"]') as HTMLInputElement;
    fireSliderChange(slider, '8000');

    expect(onUpdate).toHaveBeenCalledWith('debt-1', { balance: 8000 });
  });

  it('calls onUpdate with the new APR when the rate slider changes', () => {
    const onUpdate = jest.fn();
    renderCard({ defaultExpanded: true, onUpdate });

    const slider = screen.getByText('Interest rate (APR)').parentElement?.querySelector('input[type="range"]') as HTMLInputElement;
    fireSliderChange(slider, '15');

    expect(onUpdate).toHaveBeenCalledWith('debt-1', { aprPct: 15 });
  });

  it('calls onUpdate with the new minimum payment when that slider changes', () => {
    const onUpdate = jest.fn();
    renderCard({ defaultExpanded: true, onUpdate });

    const slider = screen.getByText('Minimum payment').parentElement?.querySelector('input[type="range"]') as HTMLInputElement;
    fireSliderChange(slider, '150');

    expect(onUpdate).toHaveBeenCalledWith('debt-1', { minPayment: 150 });
  });

  it('only shows the Delete button while expanded, and it calls onRemove', async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    renderCard({ onRemove });

    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand Visa card' }));
    const deleteButton = screen.getByRole('button', { name: 'Delete' });

    await user.click(deleteButton);
    expect(onRemove).toHaveBeenCalledWith('debt-1');
  });
});

describe('DebtCard payoff badge', () => {
  it('shows nothing when payoffOrder is not provided', () => {
    renderCard();
    expect(screen.queryByText(/#\d/)).not.toBeInTheDocument();
  });

  it('shows the order and payoff date when provided', () => {
    renderCard({ payoffOrder: 1, payoffDate: 'Mar 2027' });
    expect(screen.getByText('#1 · paid off Mar 2027')).toBeInTheDocument();
  });

  it('shows just the order when no payoff date is available (e.g. a stalled debt)', () => {
    renderCard({ payoffOrder: 2 });
    expect(screen.getByText('#2')).toBeInTheDocument();
  });
});

function fireSliderChange(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('change', { bubbles: true }));
}
