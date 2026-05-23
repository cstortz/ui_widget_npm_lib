import { useEffect, useState, type ReactNode } from 'react';
import type { WidgetLayoutItem, WorkspaceConfig } from '@ncs_software/widget-system';
import {
  createV2WorkspaceDefaults,
  defaultLayoutItemsFromWidgets,
} from '@ncs_software/widget-system';
import {
  useLayoutConfig,
  useWorkspace,
  useWorkspaceLayoutService,
} from '../widget-state-context.js';
import { GridWorkspaceLayout } from './GridWorkspaceLayout.js';
import { WidgetTabBar } from './WidgetTabBar.js';
import { LayoutEditToolbar } from './LayoutEditToolbar.js';
import { WidgetPanel } from './WidgetPanel.js';
import './WorkspaceShell.css';

export interface WorkspaceShellProps {
  workspaceId: string;
  defaultWorkspace?: Omit<WorkspaceConfig, 'id' | 'createdAt' | 'updatedAt'>;
  renderWidget?: (item: WidgetLayoutItem) => ReactNode;
}

export function WorkspaceShell({
  workspaceId,
  defaultWorkspace,
  renderWidget,
}: WorkspaceShellProps) {
  const layoutService = useWorkspaceLayoutService();
  const { defaultItems } = useLayoutConfig();
  const workspace = useWorkspace();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const buildDefault = (): WorkspaceConfig => {
      const defaults = defaultWorkspace;
      const now = new Date();

      if (defaultItems.length > 0) {
        return createV2WorkspaceDefaults({
          id: workspaceId,
          userId: defaults?.userId ?? 'demo-user',
          name: defaults?.name ?? 'Demo Workspace',
          contextType: defaults?.contextType ?? 'general',
          contextId: defaults?.contextId ?? null,
          items: defaultItems,
          layout: defaults?.layout,
          createdAt: now,
          updatedAt: now,
        });
      }

      const widgets = defaults?.widgets ?? [];
      const items =
        widgets.length > 0
          ? defaultLayoutItemsFromWidgets(widgets, defaults?.panelOrder ?? 'primary-left')
          : [];

      return createV2WorkspaceDefaults({
        id: workspaceId,
        userId: defaults?.userId ?? 'demo-user',
        name: defaults?.name ?? 'Demo Workspace',
        contextType: defaults?.contextType ?? 'general',
        contextId: defaults?.contextId ?? null,
        items,
        layout: defaults?.layout,
        createdAt: now,
        updatedAt: now,
      });
    };

    layoutService.loadOrCreate(workspaceId, buildDefault).then(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, defaultWorkspace, defaultItems, layoutService]);

  const defaultRenderWidget = (item: WidgetLayoutItem) => (
    <WidgetPanel
      title={layoutService.displayName(item.widgetId)}
      initialExpanded={item.expanded}
      canCollapseToTab
      onExpandedChange={expanded =>
        void layoutService.setExpanded(item.instanceId, expanded)
      }
      onCollapseToTab={() => void layoutService.collapseToTab(item.instanceId)}
    >
      <div className="wdg-grid-workspace-layout__placeholder">{item.widgetId}</div>
    </WidgetPanel>
  );

  if (loading || !workspace) {
    return <p className="wdg-workspace-shell__loading">Loading workspace…</p>;
  }

  return (
    <div className="wdg-workspace-shell">
      <LayoutEditToolbar workspaceId={workspaceId} onEditModeChange={setEditMode} />
      <WidgetTabBar />
      <GridWorkspaceLayout
        editMode={editMode}
        renderWidget={renderWidget ?? defaultRenderWidget}
      />
    </div>
  );
}
