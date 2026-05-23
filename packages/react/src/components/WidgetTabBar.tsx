import { useMemo } from 'react';
import { tabbedItems } from '@ncs_software/widget-system';
import { useWorkspace, useWorkspaceLayoutService } from '../widget-state-context.js';
import './WidgetTabBar.css';

export function WidgetTabBar() {
  const workspace = useWorkspace();
  const layoutService = useWorkspaceLayoutService();

  const tabItems = useMemo(
    () => (workspace?.items ? tabbedItems(workspace.items) : []),
    [workspace]
  );

  if (tabItems.length === 0) {
    return null;
  }

  return (
    <nav className="wdg-widget-tab-bar" aria-label="Collapsed widgets">
      {tabItems.map(item => (
        <button
          key={item.instanceId}
          type="button"
          className="wdg-widget-tab-bar__tab"
          onClick={() => void layoutService.restoreFromTab(item.instanceId)}
        >
          {layoutService.displayName(item.widgetId)}
        </button>
      ))}
    </nav>
  );
}
