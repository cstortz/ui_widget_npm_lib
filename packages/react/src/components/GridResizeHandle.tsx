import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { GridLayoutBounds } from '@ncs_software/widget-system';
import { columnStridePx, gridRowStride, resolveLayoutConfig } from '@ncs_software/widget-system';
import { useLayoutConfig, useWorkspaceLayoutService } from '../widget-state-context.js';
import './GridResizeHandle.css';

export type GridResizeEdge = 'east' | 'west' | 'south' | 'north';

export interface GridResizeHandleProps {
  instanceId: string;
  edge?: GridResizeEdge;
  layoutBounds?: GridLayoutBounds;
  onResizeComplete?: () => void;
}

function resizeIcon(edge: GridResizeEdge): string {
  if (edge === 'south' || edge === 'north') {
    return '↕';
  }
  return '↔';
}

export function GridResizeHandle({
  instanceId,
  edge = 'east',
  layoutBounds,
  onResizeComplete,
}: GridResizeHandleProps) {
  const layoutService = useWorkspaceLayoutService();
  const { layout } = useLayoutConfig();
  const resolvedLayout = resolveLayoutConfig(layout);
  const columnStride = columnStridePx(resolvedLayout);
  const rowStride = gridRowStride(resolvedLayout);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pointerId = useRef<number | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const accumulatedColumns = useRef(0);
  const accumulatedRows = useRef(0);
  const isVertical = edge === 'south' || edge === 'north';

  const applyResize = useCallback(
    async (columnDelta: number, rowDelta: number) => {
      if (columnDelta !== 0) {
        await layoutService.resizeWidget(
          instanceId,
          columnDelta,
          edge as 'east' | 'west',
          layoutBounds
        );
      }
      if (rowDelta !== 0 && layoutBounds?.rows !== undefined) {
        await layoutService.resizeWidgetRows(
          instanceId,
          rowDelta,
          edge as 'south' | 'north',
          layoutBounds
        );
      }
    },
    [layoutService, instanceId, edge, layoutBounds]
  );

  const endDrag = useCallback(() => {
    if (!dragging.current) {
      return;
    }
    dragging.current = false;
    const handle = handleRef.current;
    if (handle && pointerId.current !== null && handle.hasPointerCapture(pointerId.current)) {
      handle.releasePointerCapture(pointerId.current);
    }
    pointerId.current = null;
    onResizeComplete?.();
  }, [onResizeComplete]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragging.current = true;
      pointerId.current = event.pointerId;
      startX.current = event.clientX;
      startY.current = event.clientY;
      accumulatedColumns.current = 0;
      accumulatedRows.current = 0;
      event.currentTarget.setPointerCapture(event.pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        if (!dragging.current || moveEvent.pointerId !== pointerId.current) {
          return;
        }
        if (isVertical) {
          if (layoutBounds?.rows === undefined) {
            return;
          }
          const deltaPx = moveEvent.clientY - startY.current;
          const rowDelta = Math.round(deltaPx / rowStride) - accumulatedRows.current;
          if (rowDelta !== 0) {
            accumulatedRows.current += rowDelta;
            void applyResize(0, rowDelta);
          }
          return;
        }
        const deltaPx = moveEvent.clientX - startX.current;
        const columnDelta = Math.round(deltaPx / columnStride) - accumulatedColumns.current;
        if (columnDelta !== 0) {
          accumulatedColumns.current += columnDelta;
          void applyResize(columnDelta, 0);
        }
      };

      const onUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId.current) {
          return;
        }
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        endDrag();
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    },
    [applyResize, columnStride, endDrag, isVertical, layoutBounds?.rows, rowStride]
  );

  return (
    <div
      ref={handleRef}
      className="wdg-grid-resize-handle"
      data-edge={edge}
      aria-label={isVertical ? 'Resize height' : 'Resize width'}
      onPointerDown={onPointerDown}
    >
      <span className="wdg-grid-resize-handle__icon" aria-hidden="true">
        {resizeIcon(edge)}
      </span>
    </div>
  );
}
