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
  it('toggles dark mode when clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsMenu />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const darkModeToggle = screen.getByRole('menuitemcheckbox', { name: /dark mode/i });
    expect(darkModeToggle).toHaveAttribute('aria-checked', 'false');

    await user.click(darkModeToggle);

    expect(darkModeToggle).toHaveAttribute('aria-checked', 'true');
  });
});
