import type { WidgetId, WidgetState, WorkspaceConfig, WorkspaceContextType } from '../types.js';
import type { LocalStorageWidgetStateAdapterOptions } from '../types.js';
import {
  parseWidgetState,
  parseWorkspaceConfig,
  parseWorkspaceList,
  stateKey,
  type WidgetStateAdapter,
} from './adapter-contract.js';

interface StoredData {
  states: Record<string, WidgetState>;
  workspaces: Record<string, WorkspaceConfig>;
}

/** Persists widget state to localStorage — for demos, static sites, and PWAs */
export class LocalStorageWidgetStateAdapter implements WidgetStateAdapter {
  private readonly prefix: string;
  private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

  constructor(options: LocalStorageWidgetStateAdapterOptions = {}) {
    this.prefix = options.storageKeyPrefix ?? 'widget-system';
    if (options.storage) {
      this.storage = options.storage;
    } else if (typeof globalThis.localStorage !== 'undefined') {
      this.storage = globalThis.localStorage;
    } else {
      throw new Error('localStorage is not available');
    }
  }

  private storageKey(): string {
    return `${this.prefix}:v1`;
  }

  private read(): StoredData {
    const raw = this.storage.getItem(this.storageKey());
    if (!raw) {
      return { states: {}, workspaces: {} };
    }
    try {
      return JSON.parse(raw) as StoredData;
    } catch {
      return { states: {}, workspaces: {} };
    }
  }

  private write(data: StoredData): void {
    this.storage.setItem(this.storageKey(), JSON.stringify(data));
  }

  async saveState<T>(
    widgetId: WidgetId,
    contextId: string | null,
    payload: T
  ): Promise<WidgetState<T>> {
    const data = this.read();
    const state: WidgetState<T> = {
      widgetId,
      contextId,
      payload,
      savedAt: new Date(),
    };
    data.states[stateKey(widgetId, contextId)] = state as WidgetState;
    this.write(data);
    return state;
  }

  async loadState<T>(
    widgetId: WidgetId,
    contextId: string | null
  ): Promise<WidgetState<T> | null> {
    const data = this.read();
    const stored = data.states[stateKey(widgetId, contextId)];
    return stored ? parseWidgetState<T>(stored) : null;
  }

  async clearState(widgetId: WidgetId, contextId: string | null): Promise<void> {
    const data = this.read();
    delete data.states[stateKey(widgetId, contextId)];
    this.write(data);
  }

  async saveWorkspace(workspace: WorkspaceConfig): Promise<WorkspaceConfig> {
    const data = this.read();
    const saved: WorkspaceConfig = {
      ...workspace,
      updatedAt: new Date(),
    };
    data.workspaces[saved.id] = saved;
    this.write(data);
    return saved;
  }

  async loadWorkspace(workspaceId: string): Promise<WorkspaceConfig | null> {
    const data = this.read();
    const stored = data.workspaces[workspaceId];
    return stored ? parseWorkspaceConfig(stored) : null;
  }

  async loadWorkspaceByContext(
    contextType: WorkspaceContextType,
    contextId: string
  ): Promise<WorkspaceConfig | null> {
    const data = this.read();
    for (const workspace of Object.values(data.workspaces)) {
      const parsed = parseWorkspaceConfig(workspace);
      if (parsed.contextType === contextType && parsed.contextId === contextId) {
        return parsed;
      }
    }
    return null;
  }

  async listWorkspaces(): Promise<WorkspaceConfig[]> {
    const data = this.read();
    return parseWorkspaceList(Object.values(data.workspaces));
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const data = this.read();
    delete data.workspaces[workspaceId];
    this.write(data);
  }
}
