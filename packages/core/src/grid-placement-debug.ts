import type { GridPlacement, WorkspaceLayoutConfig } from './layout-types.js';
import {
  pixelRectsOverlap,
  proposedFootprintRect,
  type GridMoveRejection,
  type PixelRect,
} from './layout-engine.js';

export function gridPlacementSpan(placement: GridPlacement): { colSpan: number; rowSpan: number } {
  return {
    colSpan: Math.max(1, placement.colEnd - placement.colStart),
    rowSpan: Math.max(1, placement.rowEnd - placement.rowStart),
  };
}

export function placementsDiffer(a: GridPlacement, b: GridPlacement): boolean {
  return (
    a.colStart !== b.colStart ||
    a.colEnd !== b.colEnd ||
    a.rowStart !== b.rowStart ||
    a.rowEnd !== b.rowEnd
  );
}

/** Grid line ranges and corner cells (1-based, end exclusive on high edge) */
export function formatGridPlacementSummary(placement: GridPlacement): string {
  const { colSpan, rowSpan } = gridPlacementSpan(placement);
  const tlCol = placement.colStart;
  const tlRow = placement.rowStart;
  const brCol = placement.colEnd - 1;
  const brRow = placement.rowEnd - 1;
  return (
    `cols ${placement.colStart}→${placement.colEnd} rows ${placement.rowStart}→${placement.rowEnd} ` +
    `(${colSpan}×${rowSpan}) · TL(${tlCol},${tlRow}) BR(${brCol},${brRow})`
  );
}

/** Measured footprint relative to the grid container */
export function formatPixelFootprint(rect: PixelRect): string {
  const brX = rect.left + rect.width;
  const brY = rect.top + rect.height;
  return (
    `${Math.round(rect.width)}×${Math.round(rect.height)}px · ` +
    `TL(${Math.round(rect.left)},${Math.round(rect.top)}) ` +
    `BR(${Math.round(brX)},${Math.round(brY)})`
  );
}

export function findOverlappingInstanceIds(
  instanceId: string,
  placement: GridPlacement,
  draggedHeightPx: number,
  measuredRects: ReadonlyMap<string, PixelRect>,
  layoutConfig?: Partial<WorkspaceLayoutConfig>
): string[] {
  const proposed = proposedFootprintRect(placement, draggedHeightPx, layoutConfig);
  const overlapping: string[] = [];
  for (const [otherId, otherRect] of measuredRects) {
    if (otherId === instanceId) {
      continue;
    }
    if (pixelRectsOverlap(proposed, otherRect)) {
      overlapping.push(otherId);
    }
  }
  return overlapping;
}

export function formatGridMoveRejection(
  rejection: GridMoveRejection,
  options: {
    attempted: GridPlacement;
    saved?: GridPlacement;
    overlappingIds?: readonly string[];
    attemptedPixel?: PixelRect;
  }
): string {
  const attemptGrid = formatGridPlacementSummary(options.attempted);
  const attemptPx = options.attemptedPixel
    ? ` · ${formatPixelFootprint(options.attemptedPixel)}`
    : '';
  const savedLine =
    options.saved && placementsDiffer(options.saved, options.attempted)
      ? ` Saved: ${formatGridPlacementSummary(options.saved)}.`
      : '';

  if (rejection === 'out_of_bounds') {
    return `Out of bounds — attempted ${attemptGrid}${attemptPx}.${savedLine}`;
  }

  const overlapLine =
    options.overlappingIds && options.overlappingIds.length > 0
      ? ` Overlaps: ${options.overlappingIds.join(', ')}.`
      : '';
  return `Overlap — attempted ${attemptGrid}${attemptPx}.${overlapLine}${savedLine}`;
}
