import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import './GridResizeHandle.css';
import { useWorkspaceLayoutService } from '../widget-state-context.js';

export interface GridResizeHandleProps {
  instanceId: string;
  edge?: 'east' | 'west';
  onResizeComplete?: () => void;
}

export function GridResizeHandle({
  instanceId,
  edge = 'east',
  onResizeComplete,
}: GridResizeHandleProps) {
  const layoutService = useWorkspaceLayoutService();
  const dragging = useRef(false);
  const startX = useRef(0);
  const accumulatedColumns = useRef(0);
  const columnWidthPx = 80;

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragging.current = true;
    startX.current = event.clientX;
    accumulatedColumns.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging.current) {
        return;
      }
      const deltaPx = event.clientX - startX.current;
      const columnDelta =
        Math.round(deltaPx / columnWidthPx) - accumulatedColumns.current;
      if (columnDelta !== 0) {
        accumulatedColumns.current += columnDelta;
        void layoutService.resizeWidget(instanceId, columnDelta, edge);
      }
    },
    [layoutService, instanceId, edge]
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
