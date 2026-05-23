import type {
  GridPlacement,
  WidgetLayoutItem,
  WorkspaceLayoutConfig,
  CssGridTemplate,
  ToCssGridTemplateOptions,
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

export function gridRowStride(layoutConfig?: Partial<WorkspaceLayoutConfig>): number {
  const layout = resolveLayoutConfig(layoutConfig);
  return layout.rowHeightPx + layout.gapPx;
}

export function rowsForContainerHeight(
  heightPx: number,
  layoutConfig?: Partial<WorkspaceLayoutConfig>
): number {
  if (heightPx <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(heightPx / gridRowStride(layoutConfig)));
}

export function toCssGridTemplate(
  items: readonly WidgetLayoutItem[],
  layoutConfig?: Partial<WorkspaceLayoutConfig>,
  options?: ToCssGridTemplateOptions
): CssGridTemplate {
  const layout = resolveLayoutConfig(layoutConfig);
  const visible = gridItems(items);
  const rowCount = Math.max(1, maxGridRow(visible), options?.minRows ?? 0);
  const rowSizing = options?.rowSizing ?? 'content';
  const rowTrack =
    rowSizing === 'fixed'
      ? `${layout.rowHeightPx}px`
      : `minmax(${layout.rowHeightPx}px, auto)`;

  return {
    gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rowCount}, ${rowTrack})`,
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
  layout: WorkspaceLayoutConfig
): { x: number; y: number } {
  const gap = layout.gapPx;
  const columns = layout.columns;
  const stride = gridRowStride(layout);
  const trackWidth = (containerWidth - gap * (columns - 1)) / columns;
  const colStride = trackWidth + gap;
  const x = (placement.colStart - 1) * colStride;
  const y = (placement.rowStart - 1) * stride;
  return { x, y };
}

function colStartFromRelativeX(
  relX: number,
  trackWidth: number,
  gap: number
): number {
  const stride = trackWidth + gap;
  return Math.floor(relX / stride) + 1;
}

function rowStartFromRelativeY(relY: number, layout: WorkspaceLayoutConfig): number {
  const stride = gridRowStride(layout);
  return Math.floor(relY / stride) + 1;
}

export function placementPixelRect(
  placement: GridPlacement,
  containerWidth: number,
  layoutConfig?: Partial<WorkspaceLayoutConfig>
): { left: number; top: number; width: number; height: number } {
  const layout = resolveLayoutConfig(layoutConfig);
  const gap = layout.gapPx;
  const columns = layout.columns;
  const rowHeight = layout.rowHeightPx;
  const trackWidth = (containerWidth - gap * (columns - 1)) / columns;
  const colStride = trackWidth + gap;
  const rowStride = gridRowStride(layout);
  const colSpan = placement.colEnd - placement.colStart;
  const rowSpan = placement.rowEnd - placement.rowStart;

  const left = (placement.colStart - 1) * colStride;
  const top = (placement.rowStart - 1) * rowStride;
  const width = colSpan * trackWidth + Math.max(0, colSpan - 1) * gap;
  const height = rowSpan * rowHeight + Math.max(0, rowSpan - 1) * gap;

  return { left, top, width, height };
}

/** True when the full widget footprint fits inside the workspace container */
export function isGridPlacementWithinContainer(
  placement: GridPlacement,
  containerWidth: number,
  containerHeight: number,
  layoutConfig?: Partial<WorkspaceLayoutConfig>
): boolean {
  const layout = resolveLayoutConfig(layoutConfig);
  if (placement.colStart < 1 || placement.colEnd > layout.columns + 1 || placement.rowStart < 1) {
    return false;
  }

  const { left, top, width, height } = placementPixelRect(placement, containerWidth, layoutConfig);
  const epsilon = 0.5;
  return (
    left >= -epsilon &&
    top >= -epsilon &&
    left + width <= containerWidth + epsilon &&
    top + height <= containerHeight + epsilon
  );
}

export type GridMoveRejection = 'out_of_bounds' | 'overlap';

export interface PixelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function pixelRectsOverlap(a: PixelRect, b: PixelRect): boolean {
  return (
    a.left < b.left + b.width &&
    b.left < a.left + a.width &&
    a.top < b.top + b.height &&
    b.top < a.top + a.height
  );
}

export function isPixelRectWithinContainer(
  rect: PixelRect,
  containerWidth: number,
  containerHeight: number
): boolean {
  const epsilon = 0.5;
  return (
    rect.left >= -epsilon &&
    rect.top >= -epsilon &&
    rect.left + rect.width <= containerWidth + epsilon &&
    rect.top + rect.height <= containerHeight + epsilon
  );
}

export function proposedFootprintRect(
  placement: GridPlacement,
  containerWidth: number,
  heightPx: number,
  layoutConfig?: Partial<WorkspaceLayoutConfig>
): PixelRect {
  const { left, top, width } = placementPixelRect(placement, containerWidth, layoutConfig);
  return { left, top, width, height: heightPx };
}

/** Returns null when the move is allowed; otherwise why it must revert to the original spot */
export function evaluateGridMove(
  items: readonly WidgetLayoutItem[],
  instanceId: string,
  placement: GridPlacement,
  containerWidth: number,
  containerHeight: number,
  layoutConfig?: Partial<WorkspaceLayoutConfig>,
  /** Measured cell rects (container-relative) for visual overlap detection */
  measuredRects?: ReadonlyMap<string, PixelRect>
): GridMoveRejection | null {
  if (measuredRects) {
    const dragged = measuredRects.get(instanceId);
    if (dragged) {
      const proposed = proposedFootprintRect(
        placement,
        containerWidth,
        dragged.height,
        layoutConfig
      );
      if (!isPixelRectWithinContainer(proposed, containerWidth, containerHeight)) {
        return 'out_of_bounds';
      }
      for (const [otherId, otherRect] of measuredRects) {
        if (otherId === instanceId) {
          continue;
        }
        if (pixelRectsOverlap(proposed, otherRect)) {
          return 'overlap';
        }
      }
      return null;
    }
  }

  if (!isGridPlacementWithinContainer(placement, containerWidth, containerHeight, layoutConfig)) {
    return 'out_of_bounds';
  }
  if (gridPlacementOverlapsOthers(items, instanceId, placement)) {
    return 'overlap';
  }
  return null;
}

/** Map drag delta to a grid placement without clamping or edge correction */
export function placementFromDragDelta(
  original: GridPlacement,
  deltaX: number,
  deltaY: number,
  container: GridContainerMetrics,
  layoutConfig?: Partial<WorkspaceLayoutConfig>,
  /** @deprecated ignored — uniform row stride is used for stable snap */
  _rowMetrics?: GridRowMetrics
): GridPlacement {
  const layout = resolveLayoutConfig(layoutConfig);
  const origin = pixelOffsetForPlacement(original, container.width, layout);

  return placementFromTopLeft(
    container.left + origin.x + deltaX,
    container.top + origin.y + deltaY,
    container,
    original,
    layoutConfig
  );
}

/** Map a top-left pixel position to grid coordinates (preserves span, no clamping) */
export function placementFromTopLeft(
  topLeftX: number,
  topLeftY: number,
  container: GridContainerMetrics,
  current: GridPlacement,
  layoutConfig?: Partial<WorkspaceLayoutConfig>,
  /** @deprecated ignored — uniform row stride is used for stable snap */
  _rowMetrics?: GridRowMetrics
): GridPlacement {
  const layout = resolveLayoutConfig(layoutConfig);
  const columns = layout.columns;
  const gap = layout.gapPx;
  const colSpan = current.colEnd - current.colStart;
  const rowSpan = current.rowEnd - current.rowStart;

  const relX = topLeftX - container.left;
  const relY = topLeftY - container.top;

  const trackWidth = (container.width - gap * (columns - 1)) / columns;
  const colStart = colStartFromRelativeX(relX, trackWidth, gap);
  const rowStart = rowStartFromRelativeY(relY, layout);

  return {
    colStart,
    colEnd: colStart + colSpan,
    rowStart,
    rowEnd: rowStart + rowSpan,
  };
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
  _layoutConfig?: Partial<WorkspaceLayoutConfig>
): WidgetLayoutItem[] {
  const source = items.find(i => i.instanceId === instanceId);
  if (!source || source.mode !== 'grid') {
    return [...items];
  }

  return items.map(i => (i.instanceId === instanceId ? { ...i, grid: target } : i));
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
