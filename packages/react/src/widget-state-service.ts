import type {
  WidgetId,
  WidgetState,
  WidgetStateAdapter,
  WorkspaceConfig,
  WorkspaceContextType,
} from '@ncs_software/widget-system';
import { stateKey } from '@ncs_software/widget-system';

export class WidgetStateService {
  private readonly cache = new Map<string, WidgetState<unknown>>();

  constructor(private readonly adapter: WidgetStateAdapter) {}

  private cacheKey(widgetId: WidgetId, contextId: string | null): string {
    return stateKey(widgetId, contextId);
  }

  async saveState<T>(
    widgetId: WidgetId,
    contextId: string | null,
    payload: T
  ): Promise<WidgetState<T>> {
    const saved = await this.adapter.saveState<T>(widgetId, contextId, payload);
    this.cache.set(this.cacheKey(widgetId, contextId), saved);
    return saved;
  }

  async loadState<T>(
    widgetId: WidgetId,
    contextId: string | null
  ): Promise<WidgetState<T> | null> {
    const key = this.cacheKey(widgetId, contextId);
    if (this.cache.has(key)) {
      return this.cache.get(key) as WidgetState<T>;
    }

    try {
      const state = await this.adapter.loadState<T>(widgetId, contextId);
      if (state) {
        this.cache.set(key, state);
      }
      return state;
    } catch {
      return null;
    }
  }

  async clearState(widgetId: WidgetId, contextId: string | null): Promise<void> {
    this.cache.delete(this.cacheKey(widgetId, contextId));
    await this.adapter.clearState(widgetId, contextId);
  }

  async saveWorkspace(workspace: WorkspaceConfig): Promise<WorkspaceConfig> {
    return this.adapter.saveWorkspace(workspace);
  }

  async loadWorkspace(workspaceId: string): Promise<WorkspaceConfig | null> {
    try {
      return await this.adapter.loadWorkspace(workspaceId);
    } catch {
      return null;
    }
  }

  async loadWorkspaceByContext(
    contextType: WorkspaceContextType,
    contextId: string
  ): Promise<WorkspaceConfig | null> {
    try {
      return await this.adapter.loadWorkspaceByContext(contextType, contextId);
    } catch {
      return null;
    }
  }

  async listWorkspaces(): Promise<WorkspaceConfig[]> {
    return this.adapter.listWorkspaces();
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.adapter.deleteWorkspace(workspaceId);
  }

  async loadOrCreateDefault(
    workspaceId: string,
    factory: () => WorkspaceConfig
  ): Promise<WorkspaceConfig> {
    const existing = await this.loadWorkspace(workspaceId);
    if (existing) {
      return existing;
    }
    return this.saveWorkspace(factory());
  }
}
