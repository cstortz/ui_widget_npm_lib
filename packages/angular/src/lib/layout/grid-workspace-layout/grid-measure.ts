import type { GridRowMetrics } from '@ncs_software/widget-system';

const CELL_SELECTOR = '.wdg-grid-cell, wdg-grid-cell';

/** Measure rendered row tops/heights from grid cells for accurate drag snap */
export function measureGridRowMetrics(
  container: HTMLElement,
  excludeInstanceId?: string
): GridRowMetrics {
  const containerTop = container.getBoundingClientRect().top;
  const rowTops = new Map<number, number>();
  const rowHeights = new Map<number, number>();

  container.querySelectorAll(CELL_SELECTOR).forEach(node => {
    const el = node as HTMLElement;
    if (
      el.classList.contains('cdk-drag-dragging') ||
      (excludeInstanceId && el.dataset['wdgInstanceId'] === excludeInstanceId)
    ) {
      return;
    }
    const style = getComputedStyle(el);
    const rowStart = parseInt(style.gridRowStart, 10);
    if (Number.isNaN(rowStart)) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const top = rect.top - containerTop;
    const height = rect.height;
    const existingTop = rowTops.get(rowStart);
    if (existingTop === undefined || top < existingTop) {
      rowTops.set(rowStart, top);
    }
    rowHeights.set(rowStart, Math.max(rowHeights.get(rowStart) ?? 0, height));
  });

  return { rowTops, rowHeights };
}
