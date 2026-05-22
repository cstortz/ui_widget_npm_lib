import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { WidgetConfig, WidgetId, WorkspaceConfig } from '@ncs_software/widget-system';
import {
  useWidgetStateService,
  WidgetPanel,
  WorkspaceShell,
} from '@ncs_software/widget-system-react';
import { DemoChecklistWidget } from '../widgets/DemoChecklistWidget';
import { DemoNotesWidget } from '../widgets/DemoNotesWidget';

function primaryConfig(workspaceId: string, collapsed: boolean): WidgetConfig {
  return {
    widgetId: 'demo-notes',
    position: 'primary',
    contextId: workspaceId,
    collapsed,
  };
}

function secondaryConfig(workspaceId: string, collapsed: boolean): WidgetConfig {
  return {
    widgetId: 'demo-checklist',
    position: 'secondary',
    contextId: workspaceId,
    collapsed,
  };
}

export function WorkspacePage() {
  const { workspaceId = 'demo' } = useParams<{ workspaceId: string }>();
  const widgetStateService = useWidgetStateService();
  const [ready, setReady] = useState(false);
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const [checklistCollapsed, setChecklistCollapsed] = useState(false);

  const buildDefaultWorkspace = useCallback((): WorkspaceConfig => {
    const now = new Date();
    return {
      id: workspaceId,
      userId: 'demo-user',
      name: `Demo Workspace (${workspaceId})`,
      contextType: 'general',
      contextId: null,
      panelOrder: 'primary-left',
      widgets: [
        primaryConfig(workspaceId, false),
        secondaryConfig(workspaceId, false),
      ],
      createdAt: now,
      updatedAt: now,
    };
  }, [workspaceId]);

  const defaultWorkspace = useMemo(
    () => ({
      userId: 'demo-user',
      name: `Demo Workspace (${workspaceId})`,
      contextType: 'general' as const,
      contextId: null,
      panelOrder: 'primary-left' as const,
      widgets: [
        primaryConfig(workspaceId, notesCollapsed),
        secondaryConfig(workspaceId, checklistCollapsed),
      ],
    }),
    [workspaceId, notesCollapsed, checklistCollapsed]
  );

  useEffect(() => {
    let cancelled = false;

    widgetStateService.loadOrCreateDefault(workspaceId, buildDefaultWorkspace).then(ws => {
      if (cancelled) {
        return;
      }
      setNotesCollapsed(ws.widgets.find(w => w.widgetId === 'demo-notes')?.collapsed ?? false);
      setChecklistCollapsed(
        ws.widgets.find(w => w.widgetId === 'demo-checklist')?.collapsed ?? false
      );
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, buildDefaultWorkspace, widgetStateService]);

  const persistCollapsed = useCallback(
    async (widgetId: WidgetId, collapsed: boolean) => {
      const ws = await widgetStateService.loadWorkspace(workspaceId);
      if (!ws) {
        return;
      }
      const widgets = ws.widgets.map(w =>
        w.widgetId === widgetId ? { ...w, collapsed } : w
      );
      await widgetStateService.saveWorkspace({ ...ws, widgets });
    },
    [workspaceId, widgetStateService]
  );

  const primary = primaryConfig(workspaceId, notesCollapsed);
  const secondary = secondaryConfig(workspaceId, checklistCollapsed);

  if (!ready) {
    return (
      <div className="workspace-page">
        <p>Loading workspace…</p>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <WorkspaceShell
        workspaceId={workspaceId}
        defaultWorkspace={defaultWorkspace}
        primaryPanel={
          <WidgetPanel
            title="Notes"
            collapsed={notesCollapsed}
            onCollapseChange={collapsed => {
              setNotesCollapsed(collapsed);
              void persistCollapsed('demo-notes', collapsed);
            }}
          >
            <DemoNotesWidget config={primary} />
          </WidgetPanel>
        }
        secondaryPanel={
          <WidgetPanel
            title="Checklist"
            collapsed={checklistCollapsed}
            onCollapseChange={collapsed => {
              setChecklistCollapsed(collapsed);
              void persistCollapsed('demo-checklist', collapsed);
            }}
          >
            <DemoChecklistWidget config={secondary} />
          </WidgetPanel>
        }
      />
    </div>
  );
}
