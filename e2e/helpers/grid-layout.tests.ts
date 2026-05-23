import { expect, test } from '@playwright/test';
import { cellForWidget, dragCellBy, enterEditMode, readGridPlacement, waitForWorkspaceReady } from './grid';

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
      await page.getByRole('status').filter({ hasText: 'That spot is occupied' }).waitFor();
    });
  });
}
