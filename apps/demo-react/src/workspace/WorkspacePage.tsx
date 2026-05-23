import { useParams } from 'react-router-dom';
import { WorkspaceShell } from '@ncs_software/widget-system-react';
import { createDemoLayoutItems } from '../demo-widget-registry';
import { DemoWidgetHost } from '../widgets/DemoWidgetHost';
import { TestDebugBridge } from './TestDebugBridge';

export function WorkspacePage() {
  const { workspaceId = 'demo' } = useParams<{ workspaceId: string }>();

  return (
    <div className="workspace-page" data-testid="workspace-page">
      <TestDebugBridge />
      <WorkspaceShell
        workspaceId={workspaceId}
        defaultWorkspace={{
          userId: 'demo-user',
          name: `Demo Workspace (${workspaceId})`,
          contextType: 'general',
          contextId: null,
          layoutVersion: 2,
          items: createDemoLayoutItems(workspaceId),
        }}
        renderWidget={item => <DemoWidgetHost item={item} />}
      />
    </div>
  );
}
