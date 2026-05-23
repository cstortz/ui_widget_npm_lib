import type { Locator, Page } from '@playwright/test';

export interface GridPlacementStyle {
  colStart: string;
  colEnd: string;
  rowStart: string;
  rowEnd: string;
}

export async function cellForWidget(page: Page, title: string): Promise<Locator> {
  return page
    .locator('.wdg-grid-workspace-layout__cell')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
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

export async function enterEditMode(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Edit layout' }).click();
  await page.getByRole('button', { name: 'Done editing' }).waitFor();
}
