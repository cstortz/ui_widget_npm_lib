import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryWidgetStateAdapter } from '@ncs_software/widget-system';
import { WidgetStateProvider } from '../widget-state-context.js';
import { makeWorkspace } from '../test/helpers.js';
import { WorkspaceLayout } from './WorkspaceLayout.js';

describe('WorkspaceLayout', () => {
  let adapter: MemoryWidgetStateAdapter;

  beforeEach(async () => {
    adapter = new MemoryWidgetStateAdapter();
    await adapter.saveWorkspace(makeWorkspace());
  });

  function renderLayout() {
    return render(
      <WidgetStateProvider adapter={adapter}>
        <WorkspaceLayout
          workspaceId="ws-1"
          primaryPanel={<div>Primary panel</div>}
          secondaryPanel={<div>Secondary panel</div>}
        />
      </WidgetStateProvider>
    );
  }

  it('applies swapped class when panelOrder is primary-right', async () => {
    await adapter.saveWorkspace(makeWorkspace({ panelOrder: 'primary-right' }));

    renderLayout();

    await waitFor(() => {
      expect(document.querySelector('.wdg-workspace-layout')).toHaveClass(
        'wdg-workspace-layout--swapped'
      );
    });
  });

  it('persists panelOrder after swap', async () => {
    const user = userEvent.setup();
    renderLayout();

    await waitFor(() => {
      expect(document.querySelector('.wdg-workspace-layout')).not.toHaveClass(
        'wdg-workspace-layout--swapped'
      );
    });

    await user.click(screen.getByRole('button', { name: 'Swap panel positions' }));

    await waitFor(() => {
      expect(document.querySelector('.wdg-workspace-layout')).toHaveClass(
        'wdg-workspace-layout--swapped'
      );
    });

    const saved = await adapter.loadWorkspace('ws-1');
    expect(saved?.panelOrder).toBe('primary-right');
  });
});
