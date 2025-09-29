import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GradeButtons } from './GradeButtons';

describe('GradeButtons', () => {
  it('triggers callback with selected grade', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<GradeButtons onSelect={spy} />);

    await user.click(screen.getByRole('button', { name: /good/i }));

    expect(spy).toHaveBeenCalledWith(2);
  });

  it('disables buttons when disabled flag is set', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<GradeButtons onSelect={spy} disabled />);

    await user.click(screen.getByRole('button', { name: /again/i }));

    expect(spy).not.toHaveBeenCalled();
  });
});
