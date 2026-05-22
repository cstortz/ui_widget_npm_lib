import type { WidgetId, WidgetState, WorkspaceConfig, WorkspaceContextType } from '../types.js';
import { stateKey, type WidgetStateAdapter } from './adapter-contract.js';

/** In-memory adapter for tests, Storybook, and sandboxed demos */
export class MemoryWidgetStateAdapter implements WidgetStateAdapter {
  private states = new Map<string, WidgetState>();
  private workspaces = new Map<string, WorkspaceConfig>();

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
    this.states.set(stateKey(widgetId, contextId), state as WidgetState);
    return state;
  }

  async loadState<T>(
    widgetId: WidgetId,
    contextId: string | null
  ): Promise<WidgetState<T> | null> {
    return (this.states.get(stateKey(widgetId, contextId)) as WidgetState<T>) ?? null;
  }

  async clearState(widgetId: WidgetId, contextId: string | null): Promise<void> {
    this.states.delete(stateKey(widgetId, contextId));
  }

  async saveWorkspace(workspace: WorkspaceConfig): Promise<WorkspaceConfig> {
    const saved: WorkspaceConfig = {
      ...workspace,
      updatedAt: new Date(),
    };
    this.workspaces.set(saved.id, saved);
    return saved;
  }

  async loadWorkspace(workspaceId: string): Promise<WorkspaceConfig | null> {
    return this.workspaces.get(workspaceId) ?? null;
  }

  async loadWorkspaceByContext(
    contextType: WorkspaceContextType,
    contextId: string
  ): Promise<WorkspaceConfig | null> {
    for (const workspace of this.workspaces.values()) {
      if (workspace.contextType === contextType && workspace.contextId === contextId) {
        return workspace;
      }
    }
    return null;
  }

  async listWorkspaces(): Promise<WorkspaceConfig[]> {
    return [...this.workspaces.values()].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    this.workspaces.delete(workspaceId);
  }
}
