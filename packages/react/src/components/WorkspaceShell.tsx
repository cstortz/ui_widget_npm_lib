import { useEffect, useState, type ReactNode } from 'react';
import type { WorkspaceConfig } from '@ncs_software/widget-system';
import { useWidgetStateService } from '../widget-state-context.js';
import { WorkspaceLayout } from './WorkspaceLayout.js';
import './WorkspaceShell.css';

export interface WorkspaceShellProps {
  workspaceId: string;
  defaultWorkspace?: Omit<WorkspaceConfig, 'id' | 'createdAt' | 'updatedAt'>;
  primaryPanel: ReactNode;
  secondaryPanel: ReactNode;
}

export function WorkspaceShell({
  workspaceId,
  defaultWorkspace,
  primaryPanel,
  secondaryPanel,
}: WorkspaceShellProps) {
  const widgetStateService = useWidgetStateService();
  const [workspace, setWorkspace] = useState<WorkspaceConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    const buildDefault = (): WorkspaceConfig => {
      const now = new Date();
      return {
        id: workspaceId,
        userId: defaultWorkspace?.userId ?? 'demo-user',
        name: defaultWorkspace?.name ?? 'Demo Workspace',
        contextType: defaultWorkspace?.contextType ?? 'general',
        contextId: defaultWorkspace?.contextId ?? null,
        panelOrder: defaultWorkspace?.panelOrder ?? 'primary-left',
        widgets: defaultWorkspace?.widgets ?? [],
        createdAt: now,
        updatedAt: now,
      };
    };

    widgetStateService
      .loadOrCreateDefault(workspaceId, buildDefault)
      .then(ws => {
        if (!cancelled) {
          setWorkspace(ws);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, defaultWorkspace, widgetStateService]);

  if (!workspace) {
    return <p className="wdg-workspace-shell__loading">Loading workspace…</p>;
  }

  return (
    <WorkspaceLayout
      workspaceId={workspace.id}
      primaryPanel={primaryPanel}
      secondaryPanel={secondaryPanel}
    />
  );
}
