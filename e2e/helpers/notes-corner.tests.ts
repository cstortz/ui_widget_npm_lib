import { expect, test } from '@playwright/test';
import {
  VIEWPORT_4K,
  cellForWidget,
  dragCellToGridCorner,
  enterEditMode,
  exitEditMode,
  expectedNotesCornerPlacement,
  isolateNotesWidget,
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

        const expected = expectedNotesCornerPlacement(corner);
        const dropped = await waitForNotesPlacement(page, expected);

        await exitEditMode(page);

        const cssAfter = toPlacementNumbers(await readGridPlacement(await cellForWidget(page, 'Notes')));
        const stateAfter = await readWidgetGridFromState(page, 'demo-notes');

        expect(cssAfter).toEqual(dropped);
        expect(stateAfter).toEqual(expected);
      });
    }
  });
}
