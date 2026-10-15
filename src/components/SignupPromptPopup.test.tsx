import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { SignupPromptPopup } from './SignupPromptPopup';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/',
}));

describe('SignupPromptPopup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    push.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows the floating signup button for guests on the homepage', () => {
    render(<SignupPromptPopup user={null} pathname="/" />);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByRole('button', { name: /sign up to start taking part/i })).toBeInTheDocument();
  });

  it('does not show the floating signup button for signed-in users', () => {
    render(<SignupPromptPopup user={{ id: 'abc' }} pathname="/" />);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.queryByRole('button', { name: /sign up to start taking part/i })).not.toBeInTheDocument();
  });

  it('does not show the floating signup button on non-home pages', () => {
    render(<SignupPromptPopup user={null} pathname="/quiz" />);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.queryByRole('button', { name: /sign up to start taking part/i })).not.toBeInTheDocument();
  });
});
