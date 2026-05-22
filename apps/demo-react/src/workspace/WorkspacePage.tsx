import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { WidgetConfig } from '@ncs_software/widget-system';
import {
  WidgetPanel,
  WorkspaceShell,
} from '@ncs_software/widget-system-react';
import { DemoChecklistWidget } from '../widgets/DemoChecklistWidget';
import { DemoNotesWidget } from '../widgets/DemoNotesWidget';

function primaryConfig(workspaceId: string): WidgetConfig {
  return {
    widgetId: 'demo-notes',
    position: 'primary',
    contextId: workspaceId,
    collapsed: false,
  };
}

function secondaryConfig(workspaceId: string): WidgetConfig {
  return {
    widgetId: 'demo-checklist',
    position: 'secondary',
    contextId: workspaceId,
    collapsed: false,
  };
}

export function WorkspacePage() {
  const { workspaceId = 'demo' } = useParams<{ workspaceId: string }>();

  const defaultWorkspace = useMemo(
    () => ({
      userId: 'demo-user',
      name: `Demo Workspace (${workspaceId})`,
      contextType: 'general' as const,
      contextId: null,
      panelOrder: 'primary-left' as const,
      widgets: [primaryConfig(workspaceId), secondaryConfig(workspaceId)],
    }),
    [workspaceId]
  );

  const primary = primaryConfig(workspaceId);
  const secondary = secondaryConfig(workspaceId);

  return (
    <div className="workspace-page">
      <WorkspaceShell
        workspaceId={workspaceId}
        defaultWorkspace={defaultWorkspace}
        primaryPanel={
          <WidgetPanel title="Notes" initialCollapsed={false}>
            <DemoNotesWidget config={primary} />
          </WidgetPanel>
        }
        secondaryPanel={
          <WidgetPanel title="Checklist" initialCollapsed={false}>
            <DemoChecklistWidget config={secondary} />
          </WidgetPanel>
        }
      />
    </div>
  );
}
