import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsMenu } from '@src/components/SettingsMenu';

// jsdom doesn't implement matchMedia - useTheme (used internally for the dark-mode row) needs it.
beforeAll(() => {
  window.matchMedia = jest.fn().mockReturnValue({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  });
});

describe('SettingsMenu', () => {
  it('calls onReviewAnswers and closes the panel when "Review my answers" is clicked', async () => {
    const user = userEvent.setup();
    const onReviewAnswers = jest.fn();
    render(<SettingsMenu onReviewAnswers={onReviewAnswers} />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('menuitem', { name: /review my answers/i }));

    expect(onReviewAnswers).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menuitem', { name: /review my answers/i })).not.toBeInTheDocument();
  });
});
