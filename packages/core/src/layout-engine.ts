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
    gridTemplateRows: `repeat(${rowCount}, min-content)`,
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
  const colSpan = Math.max(1, placement.colEnd - placement.colStart);
  const rowSpan = Math.max(1, placement.rowEnd - placement.rowStart);

  let colStart = placement.colStart;
  let colEnd = placement.colEnd;
  if (colEnd > columns + 1) {
    colEnd = columns + 1;
    colStart = colEnd - colSpan;
  }
  if (colStart < 1) {
    colStart = 1;
    colEnd = colStart + colSpan;
  }
  colStart = Math.max(1, Math.min(colStart, columns - colSpan + 1));
  colEnd = colStart + colSpan;

  const rowStart = Math.max(1, placement.rowStart);
  const rowEnd = rowStart + rowSpan;

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

/** True when placement intersects any other grid item in the workspace */
export function gridPlacementOverlapsOthers(
  items: readonly WidgetLayoutItem[],
  instanceId: string,
  placement: GridPlacement
): boolean {
  return gridItems(items).some(
    item => item.instanceId !== instanceId && placementsOverlap(item.grid, placement)
  );
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

/** Measured row positions within the grid container (1-based row indices) */
export interface GridRowMetrics {
  rowTops: ReadonlyMap<number, number>;
  rowHeights: ReadonlyMap<number, number>;
}

function pixelOffsetForPlacement(
  placement: GridPlacement,
  containerWidth: number,
  layout: WorkspaceLayoutConfig,
  rowMetrics?: GridRowMetrics
): { x: number; y: number } {
  const gap = layout.gapPx;
  const columns = layout.columns;
  const rowHeight = layout.rowHeightPx;
  const trackWidth = (containerWidth - gap * (columns - 1)) / columns;
  const colStride = trackWidth + gap;
  const x = (placement.colStart - 1) * colStride;

  const measuredTop = rowMetrics?.rowTops.get(placement.rowStart);
  const y =
    measuredTop ?? (placement.rowStart - 1) * (rowHeight + gap);

  return { x, y };
}

function averageRowStride(
  rowMetrics: GridRowMetrics | undefined,
  rowHeight: number,
  gap: number
): number {
  if (!rowMetrics || rowMetrics.rowTops.size === 0) {
    return rowHeight + gap;
  }
  const rows = [...rowMetrics.rowTops.keys()].sort((a, b) => a - b);
  if (rows.length >= 2) {
    const strides: number[] = [];
    for (let i = 1; i < rows.length; i++) {
      const prevTop = rowMetrics.rowTops.get(rows[i - 1]) ?? 0;
      const nextTop = rowMetrics.rowTops.get(rows[i]) ?? prevTop;
      strides.push(Math.max(rowHeight + gap, nextTop - prevTop));
    }
    return strides.reduce((sum, stride) => sum + stride, 0) / strides.length;
  }
  const height = rowMetrics.rowHeights.get(rows[0]) ?? rowHeight;
  return height + gap;
}

function colStartFromRelativeX(
  relX: number,
  columns: number,
  colSpan: number,
  trackWidth: number,
  gap: number
): number {
  const stride = trackWidth + gap;
  let colStart = 1;
  for (let c = 1; c <= columns - colSpan + 1; c++) {
    const colLeft = (c - 1) * stride;
    if (relX + 1 >= colLeft) {
      colStart = c;
    }
  }
  return Math.max(1, Math.min(colStart, columns - colSpan + 1));
}

function rowStartFromRelativeY(
  relY: number,
  rowSpan: number,
  rowHeight: number,
  gap: number,
  rowMetrics?: GridRowMetrics
): number {
  if (!rowMetrics || rowMetrics.rowTops.size === 0) {
    return Math.max(1, Math.floor(relY / (rowHeight + gap)) + 1);
  }

  const rows = [...rowMetrics.rowTops.keys()].sort((a, b) => a - b);
  for (const row of rows) {
    const top = rowMetrics.rowTops.get(row) ?? 0;
    const height = rowMetrics.rowHeights.get(row) ?? rowHeight;
    if (relY >= top && relY < top + height) {
      return row;
    }
  }

  const lastRow = rows[rows.length - 1] ?? 1;
  const lastTop = rowMetrics.rowTops.get(lastRow) ?? 0;
  const lastHeight = rowMetrics.rowHeights.get(lastRow) ?? rowHeight;
  const below = relY - (lastTop + lastHeight + gap);
  if (below >= 0) {
    const stride = averageRowStride(rowMetrics, rowHeight, gap);
    return lastRow + 1 + Math.floor(below / stride);
  }

  return 1;
}

/** Snap placement by applying pixel drag delta to the widget's original grid position */
export function placementFromDragDelta(
  original: GridPlacement,
  deltaX: number,
  deltaY: number,
  container: GridContainerMetrics,
  layoutConfig?: Partial<WorkspaceLayoutConfig>,
  rowMetrics?: GridRowMetrics
): GridPlacement {
  const layout = resolveLayoutConfig(layoutConfig);
  const origin = pixelOffsetForPlacement(original, container.width, layout, rowMetrics);

  return placementFromTopLeft(
    container.left + origin.x + deltaX,
    container.top + origin.y + deltaY,
    container,
    original,
    layoutConfig,
    rowMetrics
  );
}

/** Snap a widget's top-left corner to the nearest grid placement (preserves span) */
export function placementFromTopLeft(
  topLeftX: number,
  topLeftY: number,
  container: GridContainerMetrics,
  current: GridPlacement,
  layoutConfig?: Partial<WorkspaceLayoutConfig>,
  rowMetrics?: GridRowMetrics
): GridPlacement {
  const layout = resolveLayoutConfig(layoutConfig);
  const columns = layout.columns;
  const gap = layout.gapPx;
  const rowHeight = layout.rowHeightPx;
  const colSpan = current.colEnd - current.colStart;
  const rowSpan = current.rowEnd - current.rowStart;

  const relX = Math.max(0, Math.min(topLeftX - container.left, container.width));
  const relY = Math.max(0, topLeftY - container.top);

  const trackWidth = (container.width - gap * (columns - 1)) / columns;
  const colStart = colStartFromRelativeX(relX, columns, colSpan, trackWidth, gap);
  const rowStart = rowStartFromRelativeY(relY, rowSpan, rowHeight, gap, rowMetrics);

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

/** @deprecated Use placementFromTopLeft — argument order is the same (top-left, not pointer hotspot) */
export function placementFromPointer(
  clientX: number,
  clientY: number,
  container: GridContainerMetrics,
  current: GridPlacement,
  layoutConfig?: Partial<WorkspaceLayoutConfig>
): GridPlacement {
  return placementFromTopLeft(clientX, clientY, container, current, layoutConfig);
}

/** Move a grid item without changing any other widget's placement */
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
