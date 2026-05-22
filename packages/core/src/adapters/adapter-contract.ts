import type {
  WidgetId,
  WidgetState,
  WorkspaceConfig,
  WorkspaceContextType,
} from '../types.js';

/** Pluggable persistence adapter contract */
export interface WidgetStateAdapter {
  saveState<T>(
    widgetId: WidgetId,
    contextId: string | null,
    payload: T
  ): Promise<WidgetState<T>>;

  loadState<T>(
    widgetId: WidgetId,
    contextId: string | null
  ): Promise<WidgetState<T> | null>;

  clearState(widgetId: WidgetId, contextId: string | null): Promise<void>;

  saveWorkspace(workspace: WorkspaceConfig): Promise<WorkspaceConfig>;

  loadWorkspace(workspaceId: string): Promise<WorkspaceConfig | null>;

  loadWorkspaceByContext(
    contextType: WorkspaceContextType,
    contextId: string
  ): Promise<WorkspaceConfig | null>;

  listWorkspaces(): Promise<WorkspaceConfig[]>;

  deleteWorkspace(workspaceId: string): Promise<void>;
}

export function stateKey(widgetId: WidgetId, contextId: string | null): string {
  return `${widgetId}:${contextId ?? 'global'}`;
}

export function parseWidgetState<T>(raw: unknown): WidgetState<T> {
  const value = raw as WidgetState<T>;
  return {
    ...value,
    savedAt: new Date(value.savedAt),
  };
}

export function parseWorkspaceConfig(raw: unknown): WorkspaceConfig {
  const value = raw as WorkspaceConfig;
  return {
    ...value,
    createdAt: new Date(value.createdAt),
    updatedAt: new Date(value.updatedAt),
  };
}

export function parseWorkspaceList(raw: unknown): WorkspaceConfig[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseWorkspaceConfig);
}
