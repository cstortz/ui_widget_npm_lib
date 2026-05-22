/** @cstortz/widget-system — core types and adapters (stub) */

export type WidgetId = string;

export type PanelPosition = 'primary' | 'secondary';
export type PanelOrder = 'primary-left' | 'primary-right';

export interface WidgetMeta {
  widgetId: WidgetId;
  displayName: string;
  description: string;
  minWidthPx: number;
  canCollapse: boolean;
}

export interface WidgetConfig {
  widgetId: WidgetId;
  position: PanelPosition;
  contextId: string | null;
  collapsed: boolean;
}

export interface WidgetState<T = Record<string, unknown>> {
  widgetId: WidgetId;
  contextId: string | null;
  payload: T;
  savedAt: Date;
}

export type WorkspaceContextType = 'job-application' | 'general';

export interface WorkspaceConfig {
  id: string;
  userId: string;
  name: string;
  contextType: WorkspaceContextType;
  contextId: string | null;
  panelOrder: PanelOrder;
  widgets: WidgetConfig[];
  createdAt: Date;
  updatedAt: Date;
}

/** Pluggable persistence adapter contract */
export interface WidgetStateAdapter {
  saveState<T>(widgetId: WidgetId, contextId: string | null, payload: T): Promise<WidgetState<T>>;
  loadState<T>(widgetId: WidgetId, contextId: string | null): Promise<WidgetState<T> | null>;
  clearState(widgetId: WidgetId, contextId: string | null): Promise<void>;
  saveWorkspace(workspace: WorkspaceConfig): Promise<WorkspaceConfig>;
  loadWorkspace(workspaceId: string): Promise<WorkspaceConfig | null>;
}

export { MemoryWidgetStateAdapter } from './adapters/memory-adapter.js';
