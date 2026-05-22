import type {
  WidgetId,
  WidgetState,
  WidgetStateAdapter,
  WorkspaceConfig,
} from '../index.js';

/** In-memory adapter for tests, Storybook, and sandboxed demos */
export class MemoryWidgetStateAdapter implements WidgetStateAdapter {
  private states = new Map<string, WidgetState>();
  private workspaces = new Map<string, WorkspaceConfig>();

  private stateKey(widgetId: WidgetId, contextId: string | null): string {
    return `${widgetId}:${contextId ?? 'global'}`;
  }

  async saveState<T>(
    widgetId: WidgetId,
    contextId: string | null,
    payload: T
  ): Promise<WidgetState<T>> {
    const state: WidgetState<T> = {
      widgetId,
      contextId,
      payload,
      savedAt: new Date(),
    };
    this.states.set(this.stateKey(widgetId, contextId), state as WidgetState);
    return state;
  }

  async loadState<T>(
    widgetId: WidgetId,
    contextId: string | null
  ): Promise<WidgetState<T> | null> {
    return (this.states.get(this.stateKey(widgetId, contextId)) as WidgetState<T>) ?? null;
  }

  async clearState(widgetId: WidgetId, contextId: string | null): Promise<void> {
    this.states.delete(this.stateKey(widgetId, contextId));
  }

  async saveWorkspace(workspace: WorkspaceConfig): Promise<WorkspaceConfig> {
    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  async loadWorkspace(workspaceId: string): Promise<WorkspaceConfig | null> {
    return this.workspaces.get(workspaceId) ?? null;
  }
}
