import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockMatchMedia } from '../test/helpers.js';
import { SwapButton } from './SwapButton.js';

describe('SwapButton', () => {
  it('calls onSwap when clicked', async () => {
    const user = userEvent.setup();
    const onSwap = vi.fn();

    render(<SwapButton onSwap={onSwap} />);
    await user.click(screen.getByRole('button', { name: 'Swap panel positions' }));

    expect(onSwap).toHaveBeenCalledOnce();
  });

  it('shows vertical icon below 768px', () => {
    mockMatchMedia(true);

    render(<SwapButton onSwap={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Swap panel positions' })).toHaveTextContent('⇅');
  });

  it('shows horizontal icon above 768px', () => {
    render(<SwapButton onSwap={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Swap panel positions' })).toHaveTextContent('⇄');
  });
});
