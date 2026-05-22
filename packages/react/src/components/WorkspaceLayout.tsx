import { useEffect, useState, type ReactNode } from 'react';
import type { PanelOrder } from '@ncs_software/widget-system';
import { useWidgetStateService } from '../widget-state-context.js';
import { SwapButton } from './SwapButton.js';
import './WorkspaceLayout.css';

export interface WorkspaceLayoutProps {
  workspaceId: string;
  primaryPanel: ReactNode;
  secondaryPanel: ReactNode;
}

export function WorkspaceLayout({
  workspaceId,
  primaryPanel,
  secondaryPanel,
}: WorkspaceLayoutProps) {
  const widgetStateService = useWidgetStateService();
  const [panelOrder, setPanelOrder] = useState<PanelOrder>('primary-left');

  useEffect(() => {
    let cancelled = false;
    widgetStateService.loadWorkspace(workspaceId).then(ws => {
      if (!cancelled && ws) {
        setPanelOrder(ws.panelOrder);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, widgetStateService]);

  const onSwap = async () => {
    const next: PanelOrder =
      panelOrder === 'primary-left' ? 'primary-right' : 'primary-left';
    setPanelOrder(next);

    const ws = await widgetStateService.loadWorkspace(workspaceId);
    if (ws) {
      await widgetStateService.saveWorkspace({ ...ws, panelOrder: next });
    }
  };

  const swapped = panelOrder === 'primary-right';

  return (
    <div
      className={`wdg-workspace-layout${swapped ? ' wdg-workspace-layout--swapped' : ''}`}
    >
      <div className="wdg-workspace-panel wdg-workspace-panel--primary">{primaryPanel}</div>
      <div className="wdg-workspace-swap-column">
        <SwapButton onSwap={onSwap} />
      </div>
      <div className="wdg-workspace-panel wdg-workspace-panel--secondary">
        {secondaryPanel}
      </div>
    </div>
  );
}
