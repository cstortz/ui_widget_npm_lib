import { expect, test } from '@playwright/test';
import {
  cellForWidget,
  dragCellBy,
  enterEditMode,
  readGridDragStrides,
  readGridPlacement,
  readWidgetGridFromState,
  resizeCellBy,
  waitForWorkspaceReady,
} from './grid';

export function registerGridLayoutTests(demoPath: string): void {
  test.describe('Grid workspace layout', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(demoPath);
      await waitForWorkspaceReady(page);
    });

    test('mosaic default layout uses varied column spans', async ({ page }) => {
      const notes = await readGridPlacement(await cellForWidget(page, 'Notes'));
      const timer = await readGridPlacement(await cellForWidget(page, 'Timer'));

      expect(Number(notes.colStart)).toBe(1);
      expect(Number(notes.colEnd)).toBe(8);
      expect(Number(timer.colStart)).toBe(8);
      expect(Number(timer.colEnd)).toBe(11);
    });

    test('website widget renders an iframe with persisted URL controls', async ({ page }) => {
      await enterEditMode(page);
      await page.getByRole('button', { name: 'Add widget' }).click();
      await page.getByRole('button', { name: 'Website', exact: true }).click();

      const websiteCell = await cellForWidget(page, 'Website');
      await expect(websiteCell.locator('iframe.demo-website__frame')).toHaveAttribute(
        'src',
        /example\.com/
      );
      await expect(websiteCell.getByRole('button', { name: 'Load' })).toBeVisible();
    });

    test('dragging one widget does not change another widget grid placement', async ({
      page,
    }) => {
      await enterEditMode(page);

      const checklistBefore = await readGridPlacement(await cellForWidget(page, 'Checklist'));
      const timerCell = await cellForWidget(page, 'Timer');

      await dragCellBy(page, timerCell, 0, 220);

      const checklistAfter = await readGridPlacement(await cellForWidget(page, 'Checklist'));
      const timerAfter = await readGridPlacement(await cellForWidget(page, 'Timer'));

      expect(checklistAfter).toEqual(checklistBefore);
      expect(Number(timerAfter.rowStart)).toBeGreaterThan(Number(checklistBefore.rowStart));
    });

    test('dragging widget updates its own grid position', async ({ page }) => {
      await enterEditMode(page);

      const linksBefore = await readGridPlacement(await cellForWidget(page, 'Quick Links'));
      const linksCell = await cellForWidget(page, 'Quick Links');

      await dragCellBy(page, linksCell, 0, 220);

      const linksAfter = await readGridPlacement(await cellForWidget(page, 'Quick Links'));
      expect(Number(linksAfter.rowStart)).toBeGreaterThan(Number(linksBefore.rowStart));
    });

    test('rejects drop when widget would leave the workspace', async ({ page }) => {
      await enterEditMode(page);

      const notesBefore = await readGridPlacement(await cellForWidget(page, 'Notes'));
      const notesCell = await cellForWidget(page, 'Notes');

      await dragCellBy(page, notesCell, 0, -400);

      const notesAfter = await readGridPlacement(await cellForWidget(page, 'Notes'));
      expect(notesAfter).toEqual(notesBefore);
      await page
        .getByRole('status')
        .filter({ hasText: 'Out of bounds' })
        .waitFor();
    });

    test('rejects drop when placement overlaps another widget', async ({ page }) => {
      await enterEditMode(page);

      const notesBefore = await readGridPlacement(await cellForWidget(page, 'Notes'));
      const checklistCell = await cellForWidget(page, 'Checklist');
      const checklistBefore = await readGridPlacement(checklistCell);

      await dragCellBy(page, checklistCell, -400, 0);

      const notesAfter = await readGridPlacement(await cellForWidget(page, 'Notes'));
      const checklistAfter = await readGridPlacement(await cellForWidget(page, 'Checklist'));

      expect(notesAfter).toEqual(notesBefore);
      expect(checklistAfter).toEqual(checklistBefore);
      await page.getByRole('status').filter({ hasText: 'Overlap' }).waitFor();
    });

    test('east resize shrinks widget width without moving colStart', async ({ page }) => {
      await enterEditMode(page);

      const notesCell = await cellForWidget(page, 'Notes');
      const before = await readGridPlacement(notesCell);
      const { colStride } = await readGridDragStrides(page);

      await resizeCellBy(page, notesCell, 'east', -colStride, 0);

      const after = await readGridPlacement(await cellForWidget(page, 'Notes'));
      const state = await readWidgetGridFromState(page, 'demo-notes');

      expect(Number(before.colStart)).toBe(1);
      expect(Number(after.colStart)).toBe(1);
      expect(Number(after.colEnd)).toBe(Number(before.colEnd) - 1);
      expect(state?.colStart).toBe(1);
      expect(state?.colEnd).toBe(Number(before.colEnd) - 1);
    });

    test('south resize grows cell height without moving rowStart', async ({ page }) => {
      await enterEditMode(page);

      const notesCell = await cellForWidget(page, 'Notes');
      const before = await readGridPlacement(notesCell);
      const beforeCellBox = await notesCell.boundingBox();
      const beforePanelBox = await notesCell.locator('.wdg-widget-panel').boundingBox();
      const { rowStride } = await readGridDragStrides(page);

      await resizeCellBy(page, notesCell, 'south', 0, rowStride);

      const after = await readGridPlacement(await cellForWidget(page, 'Notes'));
      const afterCellBox = await notesCell.boundingBox();
      const afterPanelBox = await notesCell.locator('.wdg-widget-panel').boundingBox();
      const state = await readWidgetGridFromState(page, 'demo-notes');

      expect(Number(before.rowStart)).toBe(1);
      expect(Number(after.rowStart)).toBe(1);
      expect(Number(after.rowEnd)).toBe(Number(before.rowEnd) + 1);
      expect(state?.rowStart).toBe(1);
      expect(state?.rowEnd).toBe(Number(before.rowEnd) + 1);
      expect(afterCellBox?.height ?? 0).toBeGreaterThan((beforeCellBox?.height ?? 0) + rowStride * 0.5);
      expect(afterPanelBox?.height ?? 0).toBeGreaterThan((beforePanelBox?.height ?? 0) + rowStride * 0.5);
    });

    test('supports horizontal then vertical resize on the same widget', async ({ page }) => {
      await enterEditMode(page);

      const notesCell = await cellForWidget(page, 'Notes');
      const before = await readGridPlacement(notesCell);
      const { colStride, rowStride } = await readGridDragStrides(page);

      await resizeCellBy(page, notesCell, 'east', -colStride, 0);
      const afterWidth = await readGridPlacement(await cellForWidget(page, 'Notes'));
      expect(Number(afterWidth.colEnd)).toBe(Number(before.colEnd) - 1);

      await resizeCellBy(page, notesCell, 'south', 0, rowStride);
      const afterHeight = await readGridPlacement(await cellForWidget(page, 'Notes'));
      const state = await readWidgetGridFromState(page, 'demo-notes');

      expect(Number(afterHeight.colStart)).toBe(1);
      expect(Number(afterHeight.colEnd)).toBe(Number(before.colEnd) - 1);
      expect(Number(afterHeight.rowEnd)).toBe(Number(before.rowEnd) + 1);
      expect(state?.colEnd).toBe(Number(before.colEnd) - 1);
      expect(state?.rowEnd).toBe(Number(before.rowEnd) + 1);
    });
  });
}
