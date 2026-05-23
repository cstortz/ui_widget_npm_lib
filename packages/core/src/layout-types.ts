import type { WidgetId } from './types.js';

/** Unique id for a widget instance within a workspace */
export type WidgetInstanceId = string;

export type WidgetPlacementMode = 'grid' | 'tabbed';

/** Placement on a column/row grid (1-based, end exclusive) */
export interface GridPlacement {
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
}

export interface WidgetLayoutItem {
  instanceId: WidgetInstanceId;
  widgetId: WidgetId;
  contextId: string | null;
  mode: WidgetPlacementMode;
  grid: GridPlacement;
  /** false = header-only strip within grid cell */
  expanded: boolean;
  /** Saved grid position when collapsed to tab bar */
  lastGrid?: GridPlacement;
  tabOrder?: number;
}

export interface WorkspaceTabBarConfig {
  enabled: boolean;
  maxVisible: number;
}

export interface WorkspaceLayoutConfig {
  columns: number;
  rowHeightPx: number;
  gapPx: number;
  /** Total grid width in px (columns × track width + gaps). Widgets do not shrink/grow with viewport. */
  gridWidthPx?: number;
  tabBar: WorkspaceTabBarConfig;
}

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayoutConfig = {
  columns: 12,
  rowHeightPx: 80,
  gapPx: 8,
  gridWidthPx: 1200,
  tabBar: { enabled: true, maxVisible: 10 },
};

export interface LayoutPermissions {
  editLayout?: boolean;
  addWidgets?: boolean;
  removeWidgets?: boolean;
  resize?: boolean;
  reorder?: boolean;
}

export interface WidgetSystemOptions {
  layout?: Partial<WorkspaceLayoutConfig>;
  permissions?: LayoutPermissions;
  defaultItems?: WidgetLayoutItem[];
}

export interface CssGridItemStyle {
  instanceId: WidgetInstanceId;
  gridColumn: string;
  gridRow: string;
}

export interface CssGridTemplate {
  gridTemplateColumns: string;
  gridTemplateRows: string;
  gap: string;
  items: CssGridItemStyle[];
  rowCount: number;
}

/** How grid row tracks are sized in the CSS template */
export type GridRowSizing = 'content' | 'fixed';

export interface ToCssGridTemplateOptions {
  /** Minimum number of row tracks (e.g. fill edit-mode viewport) */
  minRows?: number;
  /** fixed = uniform rowHeightPx tracks; content = min-content rows */
  rowSizing?: GridRowSizing;
}
