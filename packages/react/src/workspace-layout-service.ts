import type {
  GridLayoutBounds,
  GridPlacement,
  WidgetId,
  WidgetLayoutItem,
  WorkspaceConfig,
} from '@ncs_software/widget-system';
import {
  WorkspaceState,
  ensureWorkspaceV2,
  type WidgetStateAdapter,
  type WidgetRegistry,
} from '@ncs_software/widget-system';

type Listener = (workspace: WorkspaceConfig) => void;

export class WorkspaceLayoutService {
  private state: WorkspaceState | null = null;
  private readonly listeners = new Set<Listener>();
  private mutationQueue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly adapter: WidgetStateAdapter,
    private readonly registry: WidgetRegistry
  ) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const ws = this.workspace;
    if (ws) {
      for (const listener of this.listeners) {
        listener(ws);
      }
    }
  }

  get workspace(): WorkspaceConfig | null {
    return this.state?.config ?? null;
  }

  get gridItems(): WidgetLayoutItem[] {
    return this.state?.gridItems() ?? [];
  }

  get tabItems(): WidgetLayoutItem[] {
    return this.state?.tabbedItems() ?? [];
  }

  initState(workspace: WorkspaceConfig): void {
    const v2 = ensureWorkspaceV2(workspace);
    this.state = new WorkspaceState({ adapter: this.adapter, workspace: v2 });
    this.notify();
  }

  async loadOrCreate(
    workspaceId: string,
    factory: () => WorkspaceConfig
  ): Promise<WorkspaceConfig> {
    let existing = await this.adapter.loadWorkspace(workspaceId);
    if (existing) {
      existing = ensureWorkspaceV2(existing);
      this.initState(existing);
      return existing;
    }
    const created = ensureWorkspaceV2(factory());
    const saved = await this.adapter.saveWorkspace(created);
    this.initState(saved);
    return saved;
  }

  displayName(widgetId: WidgetId): string {
    return this.registry.get(widgetId)?.displayName ?? widgetId;
  }

  registeredWidgetIds(): WidgetId[] {
    return this.registry.list().map(w => w.widgetId);
  }

  async collapseToTab(instanceId: string): Promise<WorkspaceConfig> {
    const ws = await this.requireState().collapseItemToTab(instanceId);
    this.syncState(ws);
    return ws;
  }

  async restoreFromTab(instanceId: string): Promise<WorkspaceConfig> {
    const ws = await this.requireState().restoreItemFromTab(instanceId);
    this.syncState(ws);
    return ws;
  }

  async setExpanded(instanceId: string, expanded: boolean): Promise<WorkspaceConfig> {
    const ws = await this.requireState().setItemExpanded(instanceId, expanded);
    this.syncState(ws);
    return ws;
  }

  async resizeWidget(
    instanceId: string,
    columnDelta: number,
    edge: 'east' | 'west' = 'east',
    bounds?: Partial<GridLayoutBounds>
  ): Promise<WorkspaceConfig> {
    return this.enqueueMutation(async () => {
      const state = this.requireState();
      const changed = state.applyResizeWidget(instanceId, columnDelta, edge, bounds);
      if (changed) {
        this.syncState(state.config);
        return state.persist();
      }
      return state.config;
    });
  }

  async resizeWidgetRows(
    instanceId: string,
    rowDelta: number,
    edge: 'south' | 'north' = 'south',
    bounds?: Partial<GridLayoutBounds>
  ): Promise<WorkspaceConfig> {
    return this.enqueueMutation(async () => {
      const state = this.requireState();
      const changed = state.applyResizeWidgetRows(instanceId, rowDelta, edge, bounds);
      if (changed) {
        this.syncState(state.config);
        return state.persist();
      }
      return state.config;
    });
  }

  async moveWidget(instanceId: string, grid: GridPlacement): Promise<WorkspaceConfig> {
    const ws = await this.requireState().moveWidget(instanceId, grid);
    this.syncState(ws);
    return ws;
  }

  async addWidget(widgetId: WidgetId, contextId: string | null): Promise<WorkspaceConfig> {
    const ws = await this.requireState().addWidget(widgetId, contextId);
    this.syncState(ws);
    return ws;
  }

  async removeWidget(instanceId: string): Promise<WorkspaceConfig> {
    const ws = await this.requireState().removeWidget(instanceId);
    this.syncState(ws);
    return ws;
  }

  async updateItems(items: WidgetLayoutItem[]): Promise<WorkspaceConfig> {
    const ws = await this.requireState().updateItems(items);
    this.syncState(ws);
    return ws;
  }

  private requireState(): WorkspaceState {
    if (!this.state) {
      throw new Error('WorkspaceLayoutService not initialized');
    }
    return this.state;
  }

  private syncState(workspace: WorkspaceConfig): void {
    this.state!.applyWorkspace(workspace);
    this.notify();
  }

  private enqueueMutation<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(fn, fn);
    this.mutationQueue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }
}
