import type {
  GridPlacement,
  WidgetLayoutItem,
  WorkspaceLayoutConfig,
} from './layout-types.js';
import type {
  PanelOrder,
  WidgetConfig,
  WidgetId,
  WorkspaceConfig,
} from './types.js';
import type { WidgetStateAdapter } from './adapters/adapter-contract.js';
import { ensureWorkspaceV2 } from './migrate-workspace.js';
import { isWorkspaceV2 } from './layout-utils.js';
import {
  collapseToTab,
  createLayoutItem,
  findNextGridSlot,
  nextTabOrder,
  resolveLayoutConfig,
  restoreFromTab,
  snapResize,
  clampPlacement,
  moveItemOnGrid,
  gridPlacementOverlapsOthers,
} from './layout-engine.js';

export interface WorkspaceStateOptions {
  adapter: WidgetStateAdapter;
  workspace?: WorkspaceConfig;
}

export interface CreateDefaultWorkspaceInput {
  id: string;
  userId: string;
  name: string;
  contextType: WorkspaceConfig['contextType'];
  contextId: string | null;
  widgets?: WidgetConfig[];
  items?: WidgetLayoutItem[];
  layout?: Partial<WorkspaceLayoutConfig>;
}

/** Layout state machine for grid workspaces and legacy two-panel configs */
export class WorkspaceState {
  private readonly adapter: WidgetStateAdapter;
  private workspace: WorkspaceConfig;

  constructor(options: WorkspaceStateOptions) {
    this.adapter = options.adapter;
    if (!options.workspace) {
      throw new Error('WorkspaceState requires an initial workspace config');
    }
    this.workspace = ensureWorkspaceV2(options.workspace);
  }

  static createDefault(input: CreateDefaultWorkspaceInput): WorkspaceConfig {
    const now = new Date();
    if (input.items && input.items.length > 0) {
      return ensureWorkspaceV2({
        id: input.id,
        userId: input.userId,
        name: input.name,
        contextType: input.contextType,
        contextId: input.contextId,
        layoutVersion: 2,
        layout: resolveLayoutConfig(input.layout),
        items: input.items,
        createdAt: now,
        updatedAt: now,
      });
    }

    return ensureWorkspaceV2({
      id: input.id,
      userId: input.userId,
      name: input.name,
      contextType: input.contextType,
      contextId: input.contextId,
      panelOrder: 'primary-left',
      widgets: input.widgets ?? [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static async loadOrCreate(
    adapter: WidgetStateAdapter,
    input: CreateDefaultWorkspaceInput,
    lookup?: { contextType: WorkspaceConfig['contextType']; contextId: string }
  ): Promise<WorkspaceState> {
    let workspace: WorkspaceConfig | null = null;

    if (lookup) {
      workspace = await adapter.loadWorkspaceByContext(
        lookup.contextType,
        lookup.contextId
      );
    }

    if (!workspace) {
      workspace = await adapter.loadWorkspace(input.id);
    }

    if (workspace) {
      workspace = ensureWorkspaceV2(workspace);
    } else {
      workspace = WorkspaceState.createDefault(input);
      workspace = await adapter.saveWorkspace(workspace);
    }

    return new WorkspaceState({ adapter, workspace });
  }

  get config(): Readonly<WorkspaceConfig> {
    return this.workspace;
  }

  get layoutConfig(): WorkspaceLayoutConfig {
    return resolveLayoutConfig(this.workspace.layout);
  }

  get items(): readonly WidgetLayoutItem[] {
    return this.workspace.items ?? [];
  }

  /** @deprecated v1 — use items */
  get panelOrder(): PanelOrder {
    return this.workspace.panelOrder ?? 'primary-left';
  }

  /** @deprecated v1 */
  get widgets(): readonly WidgetConfig[] {
    return this.workspace.widgets ?? [];
  }

  /** @deprecated v1 */
  getWidget(position: 'primary' | 'secondary'): WidgetConfig | undefined {
    return this.workspace.widgets?.find(w => w.position === position);
  }

  /** @deprecated v1 */
  isSwapped(): boolean {
    return this.panelOrder === 'primary-right';
  }

  getItem(instanceId: string): WidgetLayoutItem | undefined {
    return this.items.find(i => i.instanceId === instanceId);
  }

  gridItems(): WidgetLayoutItem[] {
    return this.items.filter(i => i.mode === 'grid');
  }

  tabbedItems(): WidgetLayoutItem[] {
    return this.items
      .filter(i => i.mode === 'tabbed')
      .sort((a, b) => (a.tabOrder ?? 0) - (b.tabOrder ?? 0));
  }

  private touch(items: WidgetLayoutItem[]): WorkspaceConfig {
    return {
      ...this.workspace,
      layoutVersion: 2,
      items,
      updatedAt: new Date(),
    };
  }

  private replaceItem(updated: WidgetLayoutItem): WidgetLayoutItem[] {
    return this.items.map(item =>
      item.instanceId === updated.instanceId ? updated : item
    );
  }

  async persist(): Promise<WorkspaceConfig> {
    this.workspace = await this.adapter.saveWorkspace(this.workspace);
    return this.workspace;
  }

  applyWorkspace(workspace: WorkspaceConfig): void {
    this.workspace = ensureWorkspaceV2(workspace);
  }

  /** @deprecated v1 swap — swaps grid positions of first two items in v2 */
  async swapPanels(): Promise<WorkspaceConfig> {
    if (isWorkspaceV2(this.workspace)) {
      const visible = this.gridItems();
      if (visible.length >= 2) {
        const [first, second] = visible;
        const firstGrid = { ...second.grid };
        const secondGrid = { ...first.grid };
        let items = this.replaceItem({ ...first, grid: firstGrid });
        items = items.map(i =>
          i.instanceId === second.instanceId ? { ...second, grid: secondGrid } : i
        );
        this.workspace = this.touch(items);
        return this.persist();
      }
      return this.workspace;
    }

    const next: PanelOrder =
      this.panelOrder === 'primary-left' ? 'primary-right' : 'primary-left';
    this.workspace = {
      ...this.workspace,
      panelOrder: next,
      updatedAt: new Date(),
    };
    return this.adapter.saveWorkspace(this.workspace);
  }

  /** @deprecated v1 */
  async setPanelOrder(order: PanelOrder): Promise<WorkspaceConfig> {
    this.workspace = {
      ...this.workspace,
      panelOrder: order,
      updatedAt: new Date(),
    };
    return this.adapter.saveWorkspace(this.workspace);
  }

  /** @deprecated v1 — use collapseItemToTab or setItemExpanded */
  async setWidgetCollapsed(
    widgetId: string,
    collapsed: boolean
  ): Promise<WorkspaceConfig> {
    if (isWorkspaceV2(this.workspace)) {
      const item = this.items.find(i => i.widgetId === widgetId);
      if (item && collapsed) {
        return this.collapseItemToTab(item.instanceId);
      }
      if (item && !collapsed) {
        return this.restoreItemFromTab(item.instanceId);
      }
      return this.workspace;
    }

    this.workspace = {
      ...this.workspace,
      widgets: (this.workspace.widgets ?? []).map(widget =>
        widget.widgetId === widgetId ? { ...widget, collapsed } : widget
      ),
      updatedAt: new Date(),
    };
    return this.adapter.saveWorkspace(this.workspace);
  }

  /** @deprecated v1 */
  async updateWidgets(widgets: WidgetConfig[]): Promise<WorkspaceConfig> {
    this.workspace = {
      ...this.workspace,
      widgets,
      updatedAt: new Date(),
    };
    return this.adapter.saveWorkspace(this.workspace);
  }

  async addWidget(
    widgetId: WidgetId,
    contextId: string | null,
    grid?: GridPlacement
  ): Promise<WorkspaceConfig> {
    const columns = this.layoutConfig.columns;
    const placement =
      grid ?? findNextGridSlot(this.items, columns);
    const item = createLayoutItem(widgetId, contextId, placement);
    this.workspace = this.touch([...this.items, item]);
    return this.persist();
  }

  async removeWidget(instanceId: string): Promise<WorkspaceConfig> {
    this.workspace = this.touch(this.items.filter(i => i.instanceId !== instanceId));
    return this.persist();
  }

  async moveWidget(instanceId: string, grid: GridPlacement): Promise<WorkspaceConfig> {
    const item = this.getItem(instanceId);
    if (!item) {
      return this.workspace;
    }
    const moved = moveItemOnGrid(this.items, instanceId, grid, this.layoutConfig);
    const next = moved.find(i => i.instanceId === instanceId);
    if (!next || gridPlacementOverlapsOthers(moved, instanceId, next.grid)) {
      return this.workspace;
    }
    this.workspace = this.touch(moved);
    return this.persist();
  }

  async resizeWidget(
    instanceId: string,
    columnDelta: number,
    edge: 'east' | 'west' = 'east'
  ): Promise<WorkspaceConfig> {
    const item = this.getItem(instanceId);
    if (!item || item.mode !== 'grid') {
      return this.workspace;
    }
    const grid = snapResize(item.grid, columnDelta, this.layoutConfig.columns, edge);
    if (gridPlacementOverlapsOthers(this.items, instanceId, grid)) {
      return this.workspace;
    }
    this.workspace = this.touch(this.replaceItem({ ...item, grid }));
    return this.persist();
  }

  async setItemExpanded(instanceId: string, expanded: boolean): Promise<WorkspaceConfig> {
    const item = this.getItem(instanceId);
    if (!item) {
      return this.workspace;
    }
    this.workspace = this.touch(this.replaceItem({ ...item, expanded }));
    return this.persist();
  }

  async collapseItemToTab(instanceId: string): Promise<WorkspaceConfig> {
    const item = this.getItem(instanceId);
    if (!item) {
      return this.workspace;
    }
    const order = nextTabOrder(this.items);
    this.workspace = this.touch(this.replaceItem(collapseToTab(item, order)));
    return this.persist();
  }

  async restoreItemFromTab(instanceId: string): Promise<WorkspaceConfig> {
    const item = this.getItem(instanceId);
    if (!item || item.mode !== 'tabbed') {
      return this.workspace;
    }
    const restored = restoreFromTab(item);
    restored.grid = findNextGridSlot(
      this.items.filter(i => i.instanceId !== instanceId),
      this.layoutConfig.columns,
      (restored.lastGrid ?? restored.grid).colEnd - (restored.lastGrid ?? restored.grid).colStart
    );
    this.workspace = this.touch(this.replaceItem(restored));
    return this.persist();
  }

  async updateItems(items: WidgetLayoutItem[]): Promise<WorkspaceConfig> {
    this.workspace = this.touch(items);
    return this.persist();
  }
}
