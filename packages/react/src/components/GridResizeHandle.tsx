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
  const dragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const accumulatedColumns = useRef(0);
  const accumulatedRows = useRef(0);
  const isVertical = edge === 'south' || edge === 'north';

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragging.current = true;
    startX.current = event.clientX;
    startY.current = event.clientY;
    accumulatedColumns.current = 0;
    accumulatedRows.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging.current) {
        return;
      }
      if (isVertical) {
        const deltaPx = event.clientY - startY.current;
        const rowDelta = Math.round(deltaPx / rowStride) - accumulatedRows.current;
        if (rowDelta !== 0 && layoutBounds?.rows !== undefined) {
          accumulatedRows.current += rowDelta;
          void layoutService.resizeWidgetRows(instanceId, rowDelta, edge as 'south' | 'north', layoutBounds);
        }
        return;
      }
      const deltaPx = event.clientX - startX.current;
      const columnDelta = Math.round(deltaPx / columnStride) - accumulatedColumns.current;
      if (columnDelta !== 0) {
        accumulatedColumns.current += columnDelta;
        void layoutService.resizeWidget(
          instanceId,
          columnDelta,
          edge as 'east' | 'west',
          layoutBounds
        );
      }
    },
    [layoutService, instanceId, edge, columnStride, rowStride, isVertical, layoutBounds]
  );

  const onPointerUp = useCallback(() => {
    if (dragging.current) {
      dragging.current = false;
      onResizeComplete?.();
    }
  }, [onResizeComplete]);

  return (
    <div
      className="wdg-grid-resize-handle"
      data-edge={edge}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
