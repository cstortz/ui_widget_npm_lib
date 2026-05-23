import type {
  GridPlacement,
  WidgetLayoutItem,
  WorkspaceLayoutConfig,
} from './layout-types.js';
import { DEFAULT_WORKSPACE_LAYOUT } from './layout-types.js';
import type { PanelOrder, WidgetConfig, WorkspaceConfig } from './types.js';
import { createWidgetInstanceId } from './layout-utils.js';
import { createLayoutItem, findNextGridSlot as engineFindNextGridSlot } from './layout-engine.js';

function v1GridForWidget(
  widget: WidgetConfig,
  panelOrder: PanelOrder
): GridPlacement {
  const isPrimary = widget.position === 'primary';
  const primaryLeft = panelOrder === 'primary-left';
  const onLeft = (isPrimary && primaryLeft) || (!isPrimary && !primaryLeft);

  return onLeft
    ? { colStart: 1, colEnd: 7, rowStart: 1, rowEnd: 2 }
    : { colStart: 7, colEnd: 13, rowStart: 1, rowEnd: 2 };
}

function migrateWidgetToItem(
  widget: WidgetConfig,
  panelOrder: PanelOrder,
  index: number,
  tabOrderStart: number
): { item: WidgetLayoutItem; nextTabOrder: number } {
  const grid = v1GridForWidget(widget, panelOrder);
  const instanceId = createWidgetInstanceId(widget.widgetId);

  if (widget.collapsed) {
    return {
      item: {
        instanceId,
        widgetId: widget.widgetId,
        contextId: widget.contextId,
        mode: 'tabbed',
        grid,
        lastGrid: grid,
        expanded: true,
        tabOrder: tabOrderStart,
      },
      nextTabOrder: tabOrderStart + 1,
    };
  }

  return {
    item: {
      instanceId,
      widgetId: widget.widgetId,
      contextId: widget.contextId,
      mode: 'grid',
      grid,
      expanded: true,
    },
    nextTabOrder: tabOrderStart,
  };
}

/** Migrate a v1 two-panel workspace to v2 grid layout */
export function migrateWorkspaceV1ToV2(workspace: WorkspaceConfig): WorkspaceConfig {
  if (workspace.layoutVersion === 2 && workspace.items) {
    return workspace;
  }

  const widgets = workspace.widgets ?? [];
  const panelOrder = workspace.panelOrder ?? 'primary-left';
  let tabOrder = 0;
  const items: WidgetLayoutItem[] = [];

  widgets.forEach((widget, index) => {
    const { item, nextTabOrder } = migrateWidgetToItem(widget, panelOrder, index, tabOrder);
    items.push(item);
    tabOrder = nextTabOrder;
  });

  const layout: WorkspaceLayoutConfig = {
    ...DEFAULT_WORKSPACE_LAYOUT,
    ...(workspace.layout ?? {}),
  };

  return {
    ...workspace,
    layoutVersion: 2,
    layout,
    items,
    updatedAt: new Date(),
  };
}

/** Ensure workspace is v2 (migrate if needed) */
export function ensureWorkspaceV2(workspace: WorkspaceConfig): WorkspaceConfig {
  return migrateWorkspaceV1ToV2(workspace);
}

/** Build default v2 items from widget metas / seed configs */
export function defaultLayoutItemsFromWidgets(
  widgets: WidgetConfig[],
  panelOrder: PanelOrder = 'primary-left'
): WidgetLayoutItem[] {
  return migrateWorkspaceV1ToV2({
    id: 'temp',
    userId: 'temp',
    name: 'temp',
    contextType: 'general',
    contextId: null,
    panelOrder,
    widgets,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).items!;
}

/** Create an empty v2 workspace shell */
export function createV2WorkspaceDefaults(
  input: Omit<WorkspaceConfig, 'layoutVersion' | 'layout' | 'items' | 'widgets' | 'panelOrder'> & {
    items?: WidgetLayoutItem[];
    layout?: Partial<WorkspaceLayoutConfig>;
  }
): WorkspaceConfig {
  const now = new Date();
  return {
    ...input,
    layoutVersion: 2,
    layout: { ...DEFAULT_WORKSPACE_LAYOUT, ...input.layout },
    items: input.items ?? [],
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

export function createDefaultLayoutItem(
  widgetId: Parameters<typeof createLayoutItem>[0],
  contextId: string | null,
  existingItems: readonly WidgetLayoutItem[],
  columns = DEFAULT_WORKSPACE_LAYOUT.columns
): WidgetLayoutItem {
  const grid = engineFindNextGridSlot(existingItems, columns);
  return createLayoutItem(widgetId, contextId, grid);
}
