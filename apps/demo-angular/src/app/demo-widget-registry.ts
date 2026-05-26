import type { WidgetLayoutItem } from '@ncs_software/widget-system';
import {
  WidgetRegistry,
  createLayoutItem,
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
  {
    widgetId: 'demo-website',
    displayName: 'Website',
    description: 'Embed a web page in an iframe',
    minWidthPx: 480,
    canCollapse: true,
  },
]);

export const DEMO_LAYOUT_VERSION = 2;

/** Mosaic default layout — not a fixed 50/50 two-column split */
export function createDemoLayoutItems(contextId: string): WidgetLayoutItem[] {
  return [
    createLayoutItem('demo-notes', contextId, {
      colStart: 1,
      colEnd: 8,
      rowStart: 1,
      rowEnd: 2,
    }),
    createLayoutItem('demo-checklist', contextId, {
      colStart: 8,
      colEnd: 13,
      rowStart: 1,
      rowEnd: 2,
    }),
    createLayoutItem('demo-timer', contextId, {
      colStart: 8,
      colEnd: 11,
      rowStart: 2,
      rowEnd: 3,
    }),
    createLayoutItem('demo-links', contextId, {
      colStart: 11,
      colEnd: 13,
      rowStart: 2,
      rowEnd: 3,
    }),
    createLayoutItem('demo-website', contextId, {
      colStart: 1,
      colEnd: 8,
      rowStart: 3,
      rowEnd: 5,
    }),
  ];
}
