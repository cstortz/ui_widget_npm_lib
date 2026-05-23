import type { Locator, Page } from '@playwright/test';

export interface GridPlacementStyle {
  colStart: string;
  colEnd: string;
  rowStart: string;
  rowEnd: string;
}

export interface GridPlacementNumbers {
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
}

export const VIEWPORT_4K = { width: 3840, height: 2160 };

const widgetTitleSelector = 'mat-card-title, h2.wdg-widget-panel__title';

export type GridCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export async function cellForWidget(page: Page, title: string): Promise<Locator> {
  return page.locator('.wdg-grid-workspace-layout__cell').filter({
    has: page.locator(widgetTitleSelector).filter({ hasText: title, exact: true }),
  });
}

export async function waitForWorkspaceReady(page: Page, title = 'Notes'): Promise<void> {
  await page
    .locator(widgetTitleSelector)
    .filter({ hasText: title, exact: true })
    .first()
    .waitFor();
}

export async function readGridPlacement(cell: Locator): Promise<GridPlacementStyle> {
  return cell.evaluate(el => {
    const style = getComputedStyle(el);
    return {
      colStart: style.gridColumnStart,
      colEnd: style.gridColumnEnd,
      rowStart: style.gridRowStart,
      rowEnd: style.gridRowEnd,
    };
  });
}

export function toPlacementNumbers(placement: GridPlacementStyle): GridPlacementNumbers {
  return {
    colStart: Number(placement.colStart),
    colEnd: Number(placement.colEnd),
    rowStart: Number(placement.rowStart),
    rowEnd: Number(placement.rowEnd),
  };
}

export async function readWidgetGridFromState(
  page: Page,
  widgetId: string
): Promise<GridPlacementNumbers | null> {
  return page.evaluate(id => {
    const items = window.__WDG_TEST__?.getItems() ?? [];
    const item = items.find(entry => entry.widgetId === id && entry.mode === 'grid');
    return item ? { ...item.grid } : null;
  }, widgetId);
}

export async function dragCellBy(
  page: Page,
  cell: Locator,
  deltaX: number,
  deltaY: number
): Promise<void> {
  const box = await cell.boundingBox();
  if (!box) {
    throw new Error('Grid cell has no bounding box');
  }
  const startX = box.x + 24;
  const startY = box.y + 24;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 12 });
  await page.mouse.up();
}

export async function dragCellToGridCorner(
  page: Page,
  title: string,
  widgetId: string,
  corner: GridCorner
): Promise<void> {
  const target = expectedNotesCornerPlacement(corner);
  const current = await readWidgetGridFromState(page, widgetId);
  if (!current) {
    throw new Error(`Widget ${widgetId} is not on the grid`);
  }

  const { colStride, rowStride } = await readGridDragStrides(page);
  const deltaX = (target.colStart - current.colStart) * colStride;
  const deltaY = (target.rowStart - current.rowStart) * rowStride;

  await dragCellBy(page, await cellForWidget(page, title), deltaX, deltaY);
}

export async function readGridDragStrides(
  page: Page
): Promise<{ colStride: number; rowStride: number }> {
  return page.evaluate(() => {
    const grid = document.querySelector('[data-testid="grid-workspace"]') as HTMLElement | null;
    if (!grid) {
      throw new Error('Grid workspace not found');
    }
    const rect = grid.getBoundingClientRect();
    const gap = 8;
    const columns = 12;
    const trackWidth = (rect.width - gap * (columns - 1)) / columns;
    const colStride = trackWidth + gap;

    let rowStride = 88;
    const cells = [...grid.querySelectorAll('.wdg-grid-workspace-layout__cell, .wdg-grid-cell')];
    const rowTops = cells
      .map(cell => {
        const style = getComputedStyle(cell);
        const row = parseInt(style.gridRowStart, 10);
        if (Number.isNaN(row)) {
          return null;
        }
        return { row, top: cell.getBoundingClientRect().top };
      })
      .filter((entry): entry is { row: number; top: number } => entry !== null);

    const uniqueRows = [...new Set(rowTops.map(entry => entry.row))].sort((a, b) => a - b);
    if (uniqueRows.length >= 2) {
      const firstTop = rowTops.find(entry => entry.row === uniqueRows[0])!.top;
      const secondTop = rowTops.find(entry => entry.row === uniqueRows[1])!.top;
      rowStride = Math.max(rowStride, secondTop - firstTop);
    }

    return { colStride, rowStride };
  });
}

export async function enterEditMode(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Edit layout' }).click();
  await page.getByRole('button', { name: 'Done editing' }).waitFor();
}

export async function exitEditMode(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Done editing' }).click();
  await page.getByRole('button', { name: 'Edit layout' }).waitFor();
}

export async function resetLayout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Reset layout' }).click();
  await waitForWorkspaceReady(page);
}

/** Collapse all widgets except Notes so corner drops have open grid space */
export async function isolateNotesWidget(page: Page): Promise<void> {
  for (const title of ['Checklist', 'Timer', 'Quick Links']) {
    const cell = await cellForWidget(page, title);
    await cell.getByRole('button', { name: 'Collapse to tab bar' }).click();
    await cell.waitFor({ state: 'hidden' });
  }
}

export function expectedNotesCornerPlacement(corner: GridCorner): GridPlacementNumbers {
  const span = { colStart: 0, colEnd: 0, rowStart: 0, rowEnd: 0 };
  switch (corner) {
    case 'top-left':
      return { colStart: 1, colEnd: 8, rowStart: 1, rowEnd: 2 };
    case 'top-right':
      return { colStart: 6, colEnd: 13, rowStart: 1, rowEnd: 2 };
    case 'bottom-left':
      return { colStart: 1, colEnd: 8, rowStart: 2, rowEnd: 3 };
    case 'bottom-right':
      return { colStart: 6, colEnd: 13, rowStart: 2, rowEnd: 3 };
    default:
      return span;
  }
}

export async function waitForNotesPlacement(
  page: Page,
  expected: GridPlacementNumbers,
  timeout = 5000
): Promise<GridPlacementNumbers> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const css = toPlacementNumbers(await readGridPlacement(await cellForWidget(page, 'Notes')));
    const state = await readWidgetGridFromState(page, 'demo-notes');
    if (
      css.colStart === expected.colStart &&
      css.colEnd === expected.colEnd &&
      css.rowStart === expected.rowStart &&
      css.rowEnd === expected.rowEnd &&
      state &&
      state.colStart === expected.colStart &&
      state.colEnd === expected.colEnd &&
      state.rowStart === expected.rowStart &&
      state.rowEnd === expected.rowEnd
    ) {
      return css;
    }
    await page.waitForTimeout(100);
  }
  const css = toPlacementNumbers(await readGridPlacement(await cellForWidget(page, 'Notes')));
  const state = await readWidgetGridFromState(page, 'demo-notes');
  throw new Error(
    `Notes placement did not match ${JSON.stringify(expected)}. CSS=${JSON.stringify(css)} state=${JSON.stringify(state)}`
  );
}
