import type {
  PanelOrder,
  WidgetConfig,
  WorkspaceConfig,
  WorkspaceContextType,
} from './types.js';
import type { WidgetStateAdapter } from './adapters/adapter-contract.js';

export interface WorkspaceStateOptions {
  adapter: WidgetStateAdapter;
  workspace?: WorkspaceConfig;
}

export interface CreateDefaultWorkspaceInput {
  id: string;
  userId: string;
  name: string;
  contextType: WorkspaceContextType;
  contextId: string | null;
  widgets: WidgetConfig[];
}

/** Layout state machine for panel order, collapse state, and widget config */
export class WorkspaceState {
  private readonly adapter: WidgetStateAdapter;
  private workspace: WorkspaceConfig;

  constructor(options: WorkspaceStateOptions) {
    this.adapter = options.adapter;
    if (!options.workspace) {
      throw new Error('WorkspaceState requires an initial workspace config');
    }
    this.workspace = options.workspace;
  }

  static createDefault(input: CreateDefaultWorkspaceInput): WorkspaceConfig {
    const now = new Date();
    return {
      id: input.id,
      userId: input.userId,
      name: input.name,
      contextType: input.contextType,
      contextId: input.contextId,
      panelOrder: 'primary-left',
      widgets: input.widgets,
      createdAt: now,
      updatedAt: now,
    };
  }

  static async loadOrCreate(
    adapter: WidgetStateAdapter,
    input: CreateDefaultWorkspaceInput,
    lookup?: { contextType: WorkspaceContextType; contextId: string }
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

    if (!workspace) {
      workspace = WorkspaceState.createDefault(input);
      workspace = await adapter.saveWorkspace(workspace);
    }

    return new WorkspaceState({ adapter, workspace });
  }

  get config(): Readonly<WorkspaceConfig> {
    return this.workspace;
  }

  get panelOrder(): PanelOrder {
    return this.workspace.panelOrder;
  }

  get widgets(): readonly WidgetConfig[] {
    return this.workspace.widgets;
  }

  getWidget(position: 'primary' | 'secondary'): WidgetConfig | undefined {
    return this.workspace.widgets.find(w => w.position === position);
  }

  isSwapped(): boolean {
    return this.workspace.panelOrder === 'primary-right';
  }

  async swapPanels(): Promise<WorkspaceConfig> {
    const next: PanelOrder =
      this.workspace.panelOrder === 'primary-left' ? 'primary-right' : 'primary-left';
    this.workspace = {
      ...this.workspace,
      panelOrder: next,
      updatedAt: new Date(),
    };
    return this.adapter.saveWorkspace(this.workspace);
  }

  async setPanelOrder(order: PanelOrder): Promise<WorkspaceConfig> {
    this.workspace = {
      ...this.workspace,
      panelOrder: order,
      updatedAt: new Date(),
    };
    return this.adapter.saveWorkspace(this.workspace);
  }

  async setWidgetCollapsed(
    widgetId: string,
    collapsed: boolean
  ): Promise<WorkspaceConfig> {
    this.workspace = {
      ...this.workspace,
      widgets: this.workspace.widgets.map(widget =>
        widget.widgetId === widgetId ? { ...widget, collapsed } : widget
      ),
      updatedAt: new Date(),
    };
    return this.adapter.saveWorkspace(this.workspace);
  }

  async updateWidgets(widgets: WidgetConfig[]): Promise<WorkspaceConfig> {
    this.workspace = {
      ...this.workspace,
      widgets,
      updatedAt: new Date(),
    };
    return this.adapter.saveWorkspace(this.workspace);
  }

  applyWorkspace(workspace: WorkspaceConfig): void {
    this.workspace = workspace;
  }
}
