import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddDebtCard } from '@src/components/debt/AddDebtCard';

describe('AddDebtCard', () => {
  it('shows an "Add debt" prompt with no catalog/picker step', () => {
    render(<AddDebtCard onAdd={jest.fn()} />);
    expect(screen.getByRole('button', { name: /Add debt/ })).toBeInTheDocument();
  });

  it('calls onAdd with a freshly created default debt on click', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    render(<AddDebtCard onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: /Add debt/ }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toMatchObject({ name: 'New debt', balance: 5000, aprPct: 20, minPayment: 100 });
    expect(typeof onAdd.mock.calls[0][0].id).toBe('string');
  });
});
