import type {
  GridPlacement,
  WidgetLayoutItem,
  WorkspaceLayoutConfig,
  CssGridTemplate,
} from './layout-types.js';
import { DEFAULT_WORKSPACE_LAYOUT } from './layout-types.js';
import type { WidgetId } from './types.js';
import type { WidgetRegistry } from './widget-registry.js';
import { createWidgetInstanceId } from './layout-utils.js';

export function resolveLayoutConfig(
  partial?: Partial<WorkspaceLayoutConfig>
): WorkspaceLayoutConfig {
  return {
    ...DEFAULT_WORKSPACE_LAYOUT,
    ...partial,
    tabBar: {
      ...DEFAULT_WORKSPACE_LAYOUT.tabBar,
      ...partial?.tabBar,
    },
  };
}

export function gridItems(
  items: readonly WidgetLayoutItem[]
): WidgetLayoutItem[] {
  return items.filter(item => item.mode === 'grid');
}

export function tabbedItems(
  items: readonly WidgetLayoutItem[]
): WidgetLayoutItem[] {
  return items
    .filter(item => item.mode === 'tabbed')
    .sort((a, b) => (a.tabOrder ?? 0) - (b.tabOrder ?? 0));
}

export function maxGridRow(items: readonly WidgetLayoutItem[]): number {
  return gridItems(items).reduce((max, item) => Math.max(max, item.grid.rowEnd - 1), 1);
}

export function toCssGridTemplate(
  items: readonly WidgetLayoutItem[],
  layoutConfig?: Partial<WorkspaceLayoutConfig>
): CssGridTemplate {
  const layout = resolveLayoutConfig(layoutConfig);
  const visible = gridItems(items);
  const rowCount = Math.max(1, maxGridRow(visible));

  return {
    gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rowCount}, minmax(${layout.rowHeightPx}px, auto))`,
    gap: `${layout.gapPx}px`,
    rowCount,
    items: visible.map(item => ({
      instanceId: item.instanceId,
      gridColumn: `${item.grid.colStart} / ${item.grid.colEnd}`,
      gridRow: `${item.grid.rowStart} / ${item.grid.rowEnd}`,
    })),
  };
}

export function clampPlacement(
  placement: GridPlacement,
  columns: number
): GridPlacement {
  const colStart = Math.max(1, Math.min(placement.colStart, columns));
  const colEnd = Math.max(colStart + 1, Math.min(placement.colEnd, columns + 1));
  const rowStart = Math.max(1, placement.rowStart);
  const rowEnd = Math.max(rowStart + 1, placement.rowEnd);
  return { colStart, colEnd, rowStart, rowEnd };
}

/** Snap a column span change from horizontal drag delta (px) */
export function snapResize(
  placement: GridPlacement,
  columnDelta: number,
  columns: number,
  edge: 'east' | 'west' = 'east'
): GridPlacement {
  if (edge === 'east') {
    return clampPlacement(
      {
        ...placement,
        colEnd: placement.colEnd + columnDelta,
      },
      columns
    );
  }
  return clampPlacement(
    {
      ...placement,
      colStart: placement.colStart + columnDelta,
    },
    columns
  );
}

export function placementsOverlap(a: GridPlacement, b: GridPlacement): boolean {
  const colsOverlap = a.colStart < b.colEnd && b.colStart < a.colEnd;
  const rowsOverlap = a.rowStart < b.rowEnd && b.rowStart < a.rowEnd;
  return colsOverlap && rowsOverlap;
}

export interface LayoutValidationIssue {
  instanceId: string;
  message: string;
}

export function validateLayout(
  items: readonly WidgetLayoutItem[],
  registry?: WidgetRegistry,
  layoutConfig?: Partial<WorkspaceLayoutConfig>
): LayoutValidationIssue[] {
  const layout = resolveLayoutConfig(layoutConfig);
  const issues: LayoutValidationIssue[] = [];
  const grid = gridItems(items);

  for (const item of grid) {
    const meta = registry?.get(item.widgetId);
    const span = item.grid.colEnd - item.grid.colStart;
    const minCols = meta
      ? Math.max(1, Math.ceil((meta.minWidthPx / 1200) * layout.columns))
      : 1;

    if (span < minCols) {
      issues.push({
        instanceId: item.instanceId,
        message: `Widget "${item.widgetId}" span ${span} is below minimum ${minCols} columns`,
      });
    }

    if (item.grid.colEnd > layout.columns + 1) {
      issues.push({
        instanceId: item.instanceId,
        message: `Widget "${item.widgetId}" extends past grid columns`,
      });
    }
  }

  for (let i = 0; i < grid.length; i++) {
    for (let j = i + 1; j < grid.length; j++) {
      if (placementsOverlap(grid[i].grid, grid[j].grid)) {
        issues.push({
          instanceId: grid[i].instanceId,
          message: `Overlaps with ${grid[j].instanceId}`,
        });
      }
    }
  }

  return issues;
}

export function collapseToTab(
  item: WidgetLayoutItem,
  tabOrder: number
): WidgetLayoutItem {
  return {
    ...item,
    mode: 'tabbed',
    lastGrid: item.lastGrid ?? item.grid,
    tabOrder,
    expanded: true,
  };
}

export function restoreFromTab(item: WidgetLayoutItem): WidgetLayoutItem {
  return {
    ...item,
    mode: 'grid',
    grid: item.lastGrid ?? item.grid,
    lastGrid: undefined,
    tabOrder: undefined,
  };
}

export function nextTabOrder(items: readonly WidgetLayoutItem[]): number {
  const tabbed = tabbedItems(items);
  if (tabbed.length === 0) {
    return 0;
  }
  return Math.max(...tabbed.map(i => i.tabOrder ?? 0)) + 1;
}

export interface GridContainerMetrics {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Map a pointer position within the grid container to a snapped placement (preserves span) */
export function placementFromPointer(
  clientX: number,
  clientY: number,
  container: GridContainerMetrics,
  current: GridPlacement,
  layoutConfig?: Partial<WorkspaceLayoutConfig>
): GridPlacement {
  const layout = resolveLayoutConfig(layoutConfig);
  const columns = layout.columns;
  const gap = layout.gapPx;
  const rowHeight = layout.rowHeightPx;
  const colSpan = current.colEnd - current.colStart;
  const rowSpan = current.rowEnd - current.rowStart;

  const relX = Math.max(0, Math.min(clientX - container.left, container.width));
  const relY = Math.max(0, clientY - container.top);

  const trackWidth = (container.width - gap * (columns - 1)) / columns;

  let colIndex = 1;
  let x = 0;
  for (let c = 1; c <= columns; c++) {
    const trackEnd = x + trackWidth;
    if (relX <= trackEnd || c === columns) {
      colIndex = c;
      break;
    }
    x = trackEnd + gap;
  }

  const colStart = Math.max(1, Math.min(colIndex, columns - colSpan + 1));
  const rowStride = rowHeight + gap;
  const rowStart = Math.max(1, Math.floor(relY / rowStride) + 1);

  return clampPlacement(
    {
      colStart,
      colEnd: colStart + colSpan,
      rowStart,
      rowEnd: rowStart + rowSpan,
    },
    columns
  );
}

/** Move a grid item; swaps placement with any overlapping widget */
export function moveItemOnGrid(
  items: readonly WidgetLayoutItem[],
  instanceId: string,
  target: GridPlacement,
  layoutConfig?: Partial<WorkspaceLayoutConfig>
): WidgetLayoutItem[] {
  const layout = resolveLayoutConfig(layoutConfig);
  const source = items.find(i => i.instanceId === instanceId);
  if (!source || source.mode !== 'grid') {
    return [...items];
  }

  const clamped = clampPlacement(target, layout.columns);
  const others = gridItems(items).filter(i => i.instanceId !== instanceId);
  const overlapping = others.find(o => placementsOverlap(o.grid, clamped));

  if (overlapping) {
    const sourceGrid = { ...source.grid };
    return items.map(i => {
      if (i.instanceId === instanceId) {
        return { ...i, grid: clamped };
      }
      if (i.instanceId === overlapping.instanceId) {
        return { ...i, grid: sourceGrid };
      }
      return i;
    });
  }

  return items.map(i => (i.instanceId === instanceId ? { ...i, grid: clamped } : i));
}

export function findNextGridSlot(
  items: readonly WidgetLayoutItem[],
  columns: number,
  span = 4
): GridPlacement {
  const grid = gridItems(items);
  let row = 1;

  while (row < 100) {
    for (let col = 1; col <= columns - span + 1; col++) {
      const candidate: GridPlacement = {
        colStart: col,
        colEnd: col + span,
        rowStart: row,
        rowEnd: row + 1,
      };
      const overlaps = grid.some(item => placementsOverlap(item.grid, candidate));
      if (!overlaps) {
        return candidate;
      }
    }
    row++;
  }

  return { colStart: 1, colEnd: span + 1, rowStart: row, rowEnd: row + 1 };
}

export function createLayoutItem(
  widgetId: WidgetId,
  contextId: string | null,
  grid: GridPlacement,
  instanceId?: string
): WidgetLayoutItem {
  return {
    instanceId: instanceId ?? createWidgetInstanceId(widgetId),
    widgetId,
    contextId,
    mode: 'grid',
    grid,
    expanded: true,
  };
}
