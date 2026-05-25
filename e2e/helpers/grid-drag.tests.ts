import { expect, test } from '@playwright/test';
import {
  cellForWidget,
  dragCellBy,
  enterEditMode,
  readGridDragStrides,
  readGridPlacement,
  readWidgetGridFromState,
  resetLayout,
  waitForWorkspaceReady,
} from './grid';

interface PlacementNums {
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
}

type DragCase = {
  title: string;
  deltaX: number;
  deltaY: number;
  assert: (before: PlacementNums, after: PlacementNums) => void;
};

function toNums(placement: Awaited<ReturnType<typeof readGridPlacement>>): PlacementNums {
  return {
    colStart: Number(placement.colStart),
    colEnd: Number(placement.colEnd),
    rowStart: Number(placement.rowStart),
    rowEnd: Number(placement.rowEnd),
  };
}

export function registerGridDragTests(demoPath: string): void {
  test.describe('Grid widget drag movements', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(demoPath);
      await waitForWorkspaceReady(page);
      await enterEditMode(page);
    });

    test('each demo widget moves independently on drag', async ({ page }) => {
      const { rowStride } = await readGridDragStrides(page);
      const cases: DragCase[] = [
        {
          title: 'Notes',
          deltaX: 0,
          deltaY: rowStride * 2,
          assert: (before, after) => {
            expect(after.rowStart).toBeGreaterThan(before.rowStart);
          },
        },
        {
          title: 'Checklist',
          deltaX: 0,
          deltaY: rowStride * 2,
          assert: (before, after) => {
            expect(after.rowStart).toBeGreaterThan(before.rowStart);
          },
        },
        {
          title: 'Timer',
          deltaX: 0,
          deltaY: rowStride * 2,
          assert: (before, after) => {
            expect(after.rowStart).toBeGreaterThan(before.rowStart);
          },
        },
        {
          title: 'Quick Links',
          deltaX: 0,
          deltaY: rowStride * 2,
          assert: (before, after) => {
            expect(after.rowStart).toBeGreaterThan(before.rowStart);
          },
        },
      ];

      for (const dragCase of cases) {
        await resetLayout(page);
        const cell = await cellForWidget(page, dragCase.title);
        const before = toNums(await readGridPlacement(cell));
        await dragCellBy(page, cell, dragCase.deltaX, dragCase.deltaY);
        const after = toNums(await readGridPlacement(await cellForWidget(page, dragCase.title)));
        dragCase.assert(before, after);
      }
    });

    test('drag persists grid placement in workspace state', async ({ page }) => {
      const { rowStride } = await readGridDragStrides(page);
      const timerCell = await cellForWidget(page, 'Timer');
      const before = toNums(await readGridPlacement(timerCell));

      await dragCellBy(page, timerCell, 0, rowStride * 2);

      const cssAfter = toNums(await readGridPlacement(await cellForWidget(page, 'Timer')));
      const item = (await page.evaluate(() => window.__WDG_TEST__?.getItems() ?? [])).find(
        entry => entry.widgetId === 'demo-timer' && entry.mode === 'grid'
      );

      expect(cssAfter.rowStart).toBeGreaterThan(before.rowStart);
      expect(item?.grid.rowStart).toBe(cssAfter.rowStart);
      expect(item?.grid.colStart).toBe(cssAfter.colStart);
    });

    test('dragging Checklist down does not move Notes', async ({ page }) => {
      const { rowStride } = await readGridDragStrides(page);
      const notesBefore = toNums(await readGridPlacement(await cellForWidget(page, 'Notes')));
      const checklistCell = await cellForWidget(page, 'Checklist');

      await dragCellBy(page, checklistCell, 0, rowStride * 2);

      const notesAfter = toNums(await readGridPlacement(await cellForWidget(page, 'Notes')));
      const checklistAfter = toNums(await readGridPlacement(await cellForWidget(page, 'Checklist')));

      expect(notesAfter).toEqual(notesBefore);
      expect(checklistAfter.rowStart).toBeGreaterThan(notesBefore.rowStart);
    });

    test('state matches CSS placement after drag', async ({ page }) => {
      const linksCell = await cellForWidget(page, 'Quick Links');
      const { rowStride } = await readGridDragStrides(page);

      await dragCellBy(page, linksCell, 0, rowStride * 2);

      const css = toNums(await readGridPlacement(await cellForWidget(page, 'Quick Links')));
      const state = await readWidgetGridFromState(page, 'demo-links');
      expect(state).toEqual(css);
    });
  });
}
