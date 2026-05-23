import { expect, test } from '@playwright/test';
import {
  VIEWPORT_4K,
  cellForWidget,
  dragCellBy,
  dragCellToGridBottom,
  dragCellToGridCorner,
  enterEditMode,
  exitEditMode,
  expectedNotesCornerPlacement,
  isolateNotesWidget,
  readGridColumnCount,
  readGridPlacement,
  readWidgetGridFromState,
  resetLayout,
  toPlacementNumbers,
  waitForNotesPlacement,
  waitForWorkspaceReady,
  type GridCorner,
} from './grid';

export function registerNotesCornerDropTests(demoPath: string): void {
  test.describe('Notes corner drops at 4K', () => {
    test.use({ viewport: VIEWPORT_4K });

    test.beforeEach(async ({ page }) => {
      await page.goto(demoPath);
      await waitForWorkspaceReady(page);
      await enterEditMode(page);
      await resetLayout(page);
      await isolateNotesWidget(page);
    });

    for (const corner of [
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ] as GridCorner[]) {
      test(`Notes sticks when dropped in ${corner}`, async ({ page }) => {
        await dragCellToGridCorner(page, 'Notes', 'demo-notes', corner);

        const columnCount = await readGridColumnCount(page);
        const expected = expectedNotesCornerPlacement(corner, columnCount);
        const dropped = await waitForNotesPlacement(page, expected);

        await exitEditMode(page);

        const cssAfter = toPlacementNumbers(await readGridPlacement(await cellForWidget(page, 'Notes')));
        const stateAfter = await readWidgetGridFromState(page, 'demo-notes');

        expect(cssAfter).toEqual(dropped);
        expect(stateAfter).toEqual(expected);
      });
    }

    test('Notes moves down when dragged toward bottom of grid', async ({ page }) => {
      const before = await readWidgetGridFromState(page, 'demo-notes');
      expect(before?.rowStart).toBe(1);

      await dragCellToGridBottom(page, 'Notes');

      const afterDrop = await readWidgetGridFromState(page, 'demo-notes');
      expect(afterDrop?.rowStart ?? 0).toBeGreaterThan(before?.rowStart ?? 0);

      await exitEditMode(page);
      const afterEdit = await readWidgetGridFromState(page, 'demo-notes');
      expect(afterEdit).toEqual(afterDrop);
    });

    test('Notes reverts when dragged past the bottom edge', async ({ page }) => {
      const before = await readWidgetGridFromState(page, 'demo-notes');
      const cell = await cellForWidget(page, 'Notes');
      await dragCellBy(page, cell, 0, 4000);

      const after = await readWidgetGridFromState(page, 'demo-notes');
      expect(after).toEqual(before);
      await page
        .getByRole('status')
        .filter({ hasText: 'Out of bounds' })
        .waitFor();
    });
  });
}
