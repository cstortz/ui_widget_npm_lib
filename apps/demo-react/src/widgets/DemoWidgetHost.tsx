import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import { WidgetPanel, useWorkspaceLayoutService } from '@ncs_software/widget-system-react';
import { DemoChecklistWidget } from './DemoChecklistWidget';
import { DemoNotesWidget } from './DemoNotesWidget';
import { DemoTimerWidget } from './DemoTimerWidget';
import { DemoLinksWidget } from './DemoLinksWidget';
import { DemoWebsiteWidget } from './DemoWebsiteWidget';

export function DemoWidgetHost({ item }: { item: WidgetLayoutItem }) {
  const layoutService = useWorkspaceLayoutService();

  const widgetConfig = {
    widgetId: item.widgetId,
    position: 'primary' as const,
    contextId: item.contextId,
    collapsed: !item.expanded,
  };

  return (
    <WidgetPanel
      title={layoutService.displayName(item.widgetId)}
      expanded={item.expanded}
      canCollapseToTab
      onExpandedChange={expanded =>
        void layoutService.setExpanded(item.instanceId, expanded)
      }
      onCollapseToTab={() => void layoutService.collapseToTab(item.instanceId)}
    >
      {item.widgetId === 'demo-notes' && <DemoNotesWidget config={widgetConfig} />}
      {item.widgetId === 'demo-checklist' && (
        <DemoChecklistWidget config={widgetConfig} />
      )}
      {item.widgetId === 'demo-timer' && <DemoTimerWidget item={item} />}
      {item.widgetId === 'demo-links' && <DemoLinksWidget item={item} />}
      {item.widgetId === 'demo-website' && <DemoWebsiteWidget config={widgetConfig} />}
    </WidgetPanel>
  );
}
