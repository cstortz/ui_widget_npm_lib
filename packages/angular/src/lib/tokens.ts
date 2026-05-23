import { InjectionToken } from '@angular/core';
import type {
  LayoutPermissions,
  WidgetLayoutItem,
  WidgetStateAdapter,
  WidgetRegistry,
  WorkspaceLayoutConfig,
} from '@ncs_software/widget-system';

export const WIDGET_STATE_ADAPTER = new InjectionToken<WidgetStateAdapter>(
  'WIDGET_STATE_ADAPTER'
);

export const WIDGET_REGISTRY = new InjectionToken<WidgetRegistry>('WIDGET_REGISTRY');

export const WORKSPACE_LAYOUT_CONFIG = new InjectionToken<Partial<WorkspaceLayoutConfig>>(
  'WORKSPACE_LAYOUT_CONFIG'
);

export const LAYOUT_PERMISSIONS = new InjectionToken<LayoutPermissions>(
  'LAYOUT_PERMISSIONS',
  { factory: () => ({ editLayout: true, addWidgets: true, removeWidgets: true, resize: true, reorder: true }) }
);

export const DEFAULT_LAYOUT_ITEMS = new InjectionToken<WidgetLayoutItem[]>(
  'DEFAULT_LAYOUT_ITEMS',
  { factory: () => [] }
);

export interface WidgetSystemConfig {
  adapter: WidgetStateAdapter;
  registry?: WidgetRegistry;
  layout?: Partial<WorkspaceLayoutConfig>;
  permissions?: LayoutPermissions;
  defaultItems?: WidgetLayoutItem[];
}

export const EDIT_LAYOUT_MODE = new InjectionToken<{ value: boolean }>('EDIT_LAYOUT_MODE');
