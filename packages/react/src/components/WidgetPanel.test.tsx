import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WidgetPanel } from './WidgetPanel.js';

describe('WidgetPanel', () => {
  it('hides content when collapsed', async () => {
    const user = userEvent.setup();

    render(
      <WidgetPanel title="Notes">
        <p>Panel body</p>
      </WidgetPanel>
    );

    expect(screen.getByText('Panel body')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Collapse panel' }));

    expect(screen.queryByText('Panel body')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand panel' })).toBeInTheDocument();
  });

  it('emits onCollapseChange when toggled', async () => {
    const user = userEvent.setup();
    const onCollapseChange = vi.fn();

    render(
      <WidgetPanel title="Notes" onCollapseChange={onCollapseChange}>
        <p>Panel body</p>
      </WidgetPanel>
    );

    await user.click(screen.getByRole('button', { name: 'Collapse panel' }));
    expect(onCollapseChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole('button', { name: 'Expand panel' }));
    expect(onCollapseChange).toHaveBeenCalledWith(false);
  });

  it('respects controlled collapsed prop', () => {
    const { rerender } = render(
      <WidgetPanel title="Notes" collapsed={false}>
        <p>Panel body</p>
      </WidgetPanel>
    );

    expect(screen.getByText('Panel body')).toBeInTheDocument();

    rerender(
      <WidgetPanel title="Notes" collapsed={true}>
        <p>Panel body</p>
      </WidgetPanel>
    );

    expect(screen.queryByText('Panel body')).not.toBeInTheDocument();
  });

  it('starts collapsed when initialCollapsed is true', () => {
    render(
      <WidgetPanel title="Notes" initialCollapsed={true}>
        <p>Panel body</p>
      </WidgetPanel>
    );

    expect(screen.queryByText('Panel body')).not.toBeInTheDocument();
  });
});
