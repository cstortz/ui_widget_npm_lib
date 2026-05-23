import { useEffect, useState, type RefObject } from 'react';
import type { GridPlacement, PixelRect } from '@ncs_software/widget-system';
import {
  formatGridPlacementSummary,
  formatPixelFootprint,
  placementsDiffer,
} from '@ncs_software/widget-system';
import './GridCellDebugOverlay.css';

function useContainerRelativeRect(
  elementRef: RefObject<HTMLElement | null>,
  containerRef: RefObject<HTMLElement | null>
): PixelRect | null {
  const [rect, setRect] = useState<PixelRect | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    const container = containerRef.current;
    if (!element || !container) {
      return;
    }

    const measure = () => {
      const elementBox = element.getBoundingClientRect();
      const containerBox = container.getBoundingClientRect();
      setRect({
        left: elementBox.left - containerBox.left,
        top: elementBox.top - containerBox.top,
        width: elementBox.width,
        height: elementBox.height,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(container);
    return () => observer.disconnect();
  }, [elementRef, containerRef]);

  return rect;
}

export interface GridCellDebugOverlayProps {
  instanceId: string;
  widgetId: string;
  savedGrid: GridPlacement;
  displayGrid: GridPlacement;
  elementRef: RefObject<HTMLElement | null>;
  containerRef: RefObject<HTMLElement | null>;
}

export function GridCellDebugOverlay({
  instanceId,
  widgetId,
  savedGrid,
  displayGrid,
  elementRef,
  containerRef,
}: GridCellDebugOverlayProps) {
  const pixelRect = useContainerRelativeRect(elementRef, containerRef);
  const displayDiffers = placementsDiffer(savedGrid, displayGrid);

  return (
    <div
      className="wdg-grid-cell-debug"
      data-testid="grid-cell-debug"
      aria-hidden="true"
    >
      <div className="wdg-grid-cell-debug__title">{widgetId}</div>
      <div className="wdg-grid-cell-debug__line">
        <span className="wdg-grid-cell-debug__label">Saved</span>
        {formatGridPlacementSummary(savedGrid)}
      </div>
      <div
        className={`wdg-grid-cell-debug__line${displayDiffers ? ' wdg-grid-cell-debug__line--warn' : ''}`}
      >
        <span className="wdg-grid-cell-debug__label">Display</span>
        {formatGridPlacementSummary(displayGrid)}
      </div>
      {pixelRect && (
        <div className="wdg-grid-cell-debug__line">
          <span className="wdg-grid-cell-debug__label">Px</span>
          {formatPixelFootprint(pixelRect)}
        </div>
      )}
      <div className="wdg-grid-cell-debug__meta">{instanceId}</div>
    </div>
  );
}
