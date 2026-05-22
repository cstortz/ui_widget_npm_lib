import type {
  HttpWidgetStateAdapterOptions,
  WidgetId,
  WidgetState,
  WorkspaceConfig,
  WorkspaceContextType,
} from '../types.js';
import {
  parseWidgetState,
  parseWorkspaceConfig,
  parseWorkspaceList,
  type WidgetStateAdapter,
} from './adapter-contract.js';

/** Fetch-based REST client for production widget state persistence */
export class HttpWidgetStateAdapter implements WidgetStateAdapter {
  private readonly baseUrl: string;
  private readonly getAuthToken?: () => string | null | Promise<string | null>;
  private readonly fetchFn: typeof fetch;

  constructor(options: HttpWidgetStateAdapterOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.getAuthToken = options.getAuthToken;
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
  }

  private async headers(): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.getAuthToken) {
      const token = await this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {}
  ): Promise<T | null> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...(await this.headers()),
        ...(init.headers ?? {}),
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (response.status === 204) {
      return null;
    }

    return (await response.json()) as T;
  }

  async saveState<T>(
    widgetId: WidgetId,
    contextId: string | null,
    payload: T
  ): Promise<WidgetState<T>> {
    const result = await this.request<WidgetState<T>>('/widgets/state', {
      method: 'PUT',
      body: JSON.stringify({ widgetId, contextId, payload }),
    });
    if (!result) {
      throw new Error('Failed to save widget state');
    }
    return parseWidgetState<T>(result);
  }

  async loadState<T>(
    widgetId: WidgetId,
    contextId: string | null
  ): Promise<WidgetState<T> | null> {
    const params = contextId ? `?contextId=${encodeURIComponent(contextId)}` : '';
    const result = await this.request<WidgetState<T>>(
      `/widgets/state/${encodeURIComponent(widgetId)}${params}`
    );
    return result ? parseWidgetState<T>(result) : null;
  }

  async clearState(widgetId: WidgetId, contextId: string | null): Promise<void> {
    const params = contextId ? `?contextId=${encodeURIComponent(contextId)}` : '';
    await this.request<void>(
      `/widgets/state/${encodeURIComponent(widgetId)}${params}`,
      { method: 'DELETE' }
    );
  }

  async saveWorkspace(workspace: WorkspaceConfig): Promise<WorkspaceConfig> {
    const result = await this.request<WorkspaceConfig>(
      `/widgets/workspaces/${encodeURIComponent(workspace.id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(workspace),
      }
    );
    if (!result) {
      throw new Error('Failed to save workspace');
    }
    return parseWorkspaceConfig(result);
  }

  async loadWorkspace(workspaceId: string): Promise<WorkspaceConfig | null> {
    const result = await this.request<WorkspaceConfig>(
      `/widgets/workspaces/${encodeURIComponent(workspaceId)}`
    );
    return result ? parseWorkspaceConfig(result) : null;
  }

  async loadWorkspaceByContext(
    contextType: WorkspaceContextType,
    contextId: string
  ): Promise<WorkspaceConfig | null> {
    const params = new URLSearchParams({ contextType, contextId });
    const result = await this.request<WorkspaceConfig>(
      `/widgets/workspaces/by-context?${params.toString()}`
    );
    return result ? parseWorkspaceConfig(result) : null;
  }

  async listWorkspaces(): Promise<WorkspaceConfig[]> {
    const result = await this.request<WorkspaceConfig[]>('/widgets/workspaces');
    return result ? parseWorkspaceList(result) : [];
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.request<void>(
      `/widgets/workspaces/${encodeURIComponent(workspaceId)}`,
      { method: 'DELETE' }
    );
  }
}
