import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import {
  WidgetRegistry,
  createLayoutItem,
  findNextGridSlot,
} from '@ncs_software/widget-system';

export const demoWidgetRegistry = new WidgetRegistry();

demoWidgetRegistry.registerMany([
  {
    widgetId: 'demo-notes',
    displayName: 'Notes',
    description: 'Simple notes widget',
    minWidthPx: 320,
    canCollapse: true,
  },
  {
    widgetId: 'demo-checklist',
    displayName: 'Checklist',
    description: 'Checklist widget',
    minWidthPx: 320,
    canCollapse: true,
  },
  {
    widgetId: 'demo-timer',
    displayName: 'Timer',
    description: 'Count-up timer demo widget',
    minWidthPx: 240,
    canCollapse: true,
  },
  {
    widgetId: 'demo-links',
    displayName: 'Quick Links',
    description: 'Bookmark links demo widget',
    minWidthPx: 240,
    canCollapse: true,
  },
]);

export function createDemoLayoutItems(contextId: string): WidgetLayoutItem[] {
  const columns = 12;
  const items: WidgetLayoutItem[] = [];

  const add = (widgetId: string) => {
    const grid = findNextGridSlot(items, columns, 6);
    items.push(createLayoutItem(widgetId, contextId, grid));
  };

  add('demo-notes');
  add('demo-checklist');
  add('demo-timer');
  add('demo-links');

  return items;
}
