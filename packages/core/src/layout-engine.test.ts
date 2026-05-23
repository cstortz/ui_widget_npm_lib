import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  collapseToTab,
  findNextGridSlot,
  moveItemOnGrid,
  placementFromTopLeft,
  placementFromDragDelta,
  restoreFromTab,
  gridPlacementOverlapsOthers,
  clampPlacement,
  snapResize,
  snapResizeRows,
  toCssGridTemplate,
  validateLayout,
  evaluateGridMove,
  isGridPlacementWithinContainer,
  columnsForContainerWidth,
  rowsForContainerHeight,
  layoutConfigForContainer,
} from './layout-engine.js';
import { migrateWorkspaceV1ToV2 } from './migrate-workspace.js';
import { WidgetRegistry } from './widget-registry.js';
import type { WidgetLayoutItem, WorkspaceConfig } from './types.js';
import { createLayoutItem } from './layout-engine.js';

function makeV1Workspace(): WorkspaceConfig {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'ws-1',
    userId: 'user-1',
    name: 'Test',
    contextType: 'general',
    contextId: null,
    panelOrder: 'primary-left',
    widgets: [
      {
        widgetId: 'demo-notes',
        position: 'primary',
        contextId: 'ws-1',
        collapsed: false,
      },
      {
        widgetId: 'demo-checklist',
        position: 'secondary',
        contextId: 'ws-1',
        collapsed: true,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

describe('migrateWorkspaceV1ToV2', () => {
  it('maps two panels to 6-column grid cells', () => {
    const v2 = migrateWorkspaceV1ToV2(makeV1Workspace());
    assert.equal(v2.layoutVersion, 2);
    assert.equal(v2.items?.length, 2);

    const notes = v2.items!.find(i => i.widgetId === 'demo-notes');
    assert.equal(notes?.mode, 'grid');
    assert.equal(notes?.grid.colStart, 1);
    assert.equal(notes?.grid.colEnd, 7);

    const checklist = v2.items!.find(i => i.widgetId === 'demo-checklist');
    assert.equal(checklist?.mode, 'tabbed');
    assert.equal(checklist?.tabOrder, 0);
  });
});

describe('LayoutEngine', () => {
  it('builds CSS grid template from items', () => {
    const items: WidgetLayoutItem[] = [
      createLayoutItem('demo-notes', 'ctx', {
        colStart: 1,
        colEnd: 7,
        rowStart: 1,
        rowEnd: 2,
      }),
      createLayoutItem('demo-checklist', 'ctx', {
        colStart: 7,
        colEnd: 13,
        rowStart: 1,
        rowEnd: 2,
      }),
    ];

    const css = toCssGridTemplate(items);
    assert.equal(css.items.length, 2);
    assert.match(css.gridTemplateColumns, /repeat\(12/);
    assert.equal(css.items[0].gridColumn, '1 / 7');
  });

  it('snaps resize to column boundaries', () => {
    const placement = { colStart: 1, colEnd: 7, rowStart: 1, rowEnd: 2 };
    const resized = snapResize(placement, 2, 12, 'east');
    assert.equal(resized.colStart, 1);
    assert.equal(resized.colEnd, 9);
  });

  it('keeps colStart fixed when resizing from the east edge', () => {
    const placement = { colStart: 3, colEnd: 8, rowStart: 2, rowEnd: 3 };
    const resized = snapResize(placement, 4, 38, 'east', 24);
    assert.equal(resized.colStart, 3);
    assert.equal(resized.colEnd, 12);
  });

  it('snaps row resize and keeps rowStart fixed from the south edge', () => {
    const placement = { colStart: 1, colEnd: 8, rowStart: 2, rowEnd: 3 };
    const resized = snapResizeRows(placement, 2, 12, 'south', 38);
    assert.equal(resized.rowStart, 2);
    assert.equal(resized.rowEnd, 5);
  });

  it('collapse and restore tab preserves lastGrid', () => {
    const item = createLayoutItem('demo-notes', null, {
      colStart: 1,
      colEnd: 7,
      rowStart: 1,
      rowEnd: 2,
    });
    const tabbed = collapseToTab(item, 0);
    assert.equal(tabbed.mode, 'tabbed');
    assert.deepEqual(tabbed.lastGrid, item.grid);

    const restored = restoreFromTab(tabbed);
    assert.equal(restored.mode, 'grid');
    assert.equal(restored.grid.colStart, 1);
  });

  it('finds next open grid slot', () => {
    const items: WidgetLayoutItem[] = [
      createLayoutItem('a', null, { colStart: 1, colEnd: 13, rowStart: 1, rowEnd: 2 }),
    ];
    const slot = findNextGridSlot(items, 12, 6);
    assert.equal(slot.rowStart, 2);
  });

  it('reports validation issues for overlaps', () => {
    const registry = new WidgetRegistry();
    registry.register({
      widgetId: 'demo-notes',
      displayName: 'Notes',
      description: 'x',
      minWidthPx: 320,
      canCollapse: true,
    });

    const items: WidgetLayoutItem[] = [
      createLayoutItem('demo-notes', null, { colStart: 1, colEnd: 7, rowStart: 1, rowEnd: 2 }),
      createLayoutItem('demo-checklist', null, { colStart: 4, colEnd: 10, rowStart: 1, rowEnd: 2 }),
    ];

    const issues = validateLayout(items, registry);
    assert.ok(issues.some(i => i.message.includes('Overlaps')));
  });

  it('does not move other widgets when one item is repositioned', () => {
    const a = createLayoutItem('a', null, { colStart: 1, colEnd: 5, rowStart: 1, rowEnd: 2 });
    const b = createLayoutItem('b', null, { colStart: 5, colEnd: 9, rowStart: 1, rowEnd: 2 });
    const moved = moveItemOnGrid([a, b], a.instanceId, {
      colStart: 5,
      colEnd: 9,
      rowStart: 2,
      rowEnd: 3,
    });
    const movedA = moved.find(i => i.instanceId === a.instanceId)!;
    const movedB = moved.find(i => i.instanceId === b.instanceId)!;
    assert.equal(movedA.grid.colStart, 5);
    assert.equal(movedA.grid.rowStart, 2);
    assert.equal(movedB.grid.colStart, 5);
    assert.equal(movedB.grid.rowStart, 1);
  });

  it('applies drag delta in column/row steps from original placement', () => {
    const original = { colStart: 8, colEnd: 11, rowStart: 2, rowEnd: 3 };
    const container = { left: 0, top: 0, width: 1200, height: 600 };
    const placement = placementFromDragDelta(original, 200, 0, container);
    assert.ok(placement.colStart > original.colStart);
    assert.equal(placement.colEnd - placement.colStart, 3);
    assert.equal(placement.rowStart, original.rowStart);
  });

  it('maps vertical drag below tall rows to lower grid rows', () => {
    const original = { colStart: 1, colEnd: 8, rowStart: 1, rowEnd: 2 };
    const container = { left: 0, top: 0, width: 1200, height: 2000 };
    const placement = placementFromDragDelta(original, 0, 900, container);
    assert.ok(placement.rowStart >= 10);
  });

  it('fills viewport with fixed row tracks in edit mode', () => {
    const items: WidgetLayoutItem[] = [
      createLayoutItem('demo-notes', 'ctx', {
        colStart: 1,
        colEnd: 7,
        rowStart: 1,
        rowEnd: 2,
      }),
    ];
    const css = toCssGridTemplate(items, layoutConfigForContainer(1200, 1600), {
      columnCount: 12,
      rowCount: rowsForContainerHeight(1600),
      rowSizing: 'fixed',
    });
    assert.match(css.gridTemplateRows, /repeat\(18, 80px\)/);
    assert.match(css.gridTemplateColumns, /repeat\(12, 92\.66666666666667px\)/);
  });

  it('preserves column span when clamping against the grid edge', () => {
    const clamped = clampPlacement(
      { colStart: 10, colEnd: 17, rowStart: 1, rowEnd: 2 },
      12
    );
    assert.equal(clamped.colStart, 6);
    assert.equal(clamped.colEnd, 13);
  });

  it('preserves row span when clamping against the grid edge', () => {
    const clamped = clampPlacement(
      { colStart: 1, colEnd: 4, rowStart: 8, rowEnd: 10 },
      12,
      6
    );
    assert.equal(clamped.rowStart, 5);
    assert.equal(clamped.rowEnd, 7);
  });

  it('expands column tracks to fit saved mosaic layout on narrow viewports', () => {
    const items: WidgetLayoutItem[] = [
      createLayoutItem('demo-notes', 'ctx', { colStart: 1, colEnd: 8, rowStart: 1, rowEnd: 2 }),
      createLayoutItem('demo-checklist', 'ctx', { colStart: 8, colEnd: 13, rowStart: 1, rowEnd: 2 }),
      createLayoutItem('demo-timer', 'ctx', { colStart: 8, colEnd: 11, rowStart: 2, rowEnd: 3 }),
      createLayoutItem('demo-links', 'ctx', { colStart: 11, colEnd: 13, rowStart: 2, rowEnd: 3 }),
    ];
    const layout = layoutConfigForContainer(800, 600);
    assert.equal(layout.columns, 8);
    const css = toCssGridTemplate(items, layout, {
      columnCount: layout.columns,
      rowCount: layout.rows,
    });
    assert.equal(css.columnCount, 12);
    const display = new Map(css.items.map(i => [i.instanceId, i.displayGrid]));
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = display.get(items[i].instanceId)!;
        const b = display.get(items[j].instanceId)!;
        const overlaps =
          a.colStart < b.colEnd &&
          b.colStart < a.colEnd &&
          a.rowStart < b.rowEnd &&
          b.rowStart < a.rowEnd;
        assert.equal(overlaps, false, `${items[i].widgetId} vs ${items[j].widgetId}`);
      }
    }
    assert.deepEqual(display.get(items[1].instanceId), items[1].grid);
    assert.deepEqual(display.get(items[2].instanceId), items[2].grid);
    assert.deepEqual(display.get(items[3].instanceId), items[3].grid);
  });

  it('rejects moves that extend past the workspace container', () => {
    const a = createLayoutItem('a', null, { colStart: 1, colEnd: 5, rowStart: 1, rowEnd: 2 });
    const b = createLayoutItem('b', null, { colStart: 5, colEnd: 9, rowStart: 1, rowEnd: 2 });
    const offScreen = { colStart: 10, colEnd: 14, rowStart: 1, rowEnd: 2 };
    assert.equal(evaluateGridMove([a, b], a.instanceId, offScreen, 1200, 600), 'out_of_bounds');
    assert.equal(
      evaluateGridMove([a, b], a.instanceId, { colStart: 5, colEnd: 9, rowStart: 2, rowEnd: 3 }, 1200, 600),
      null
    );
  });

  it('detects visual overlap using measured pixel footprints', () => {
    const a = createLayoutItem('a', null, { colStart: 1, colEnd: 8, rowStart: 1, rowEnd: 2 });
    const b = createLayoutItem('b', null, { colStart: 8, colEnd: 13, rowStart: 1, rowEnd: 2 });
    const measuredRects = new Map([
      [a.instanceId, { left: 0, top: 0, width: 650, height: 320 }],
      [b.instanceId, { left: 700, top: 0, width: 480, height: 120 }],
    ]);
    const overlapPlacement = { colStart: 4, colEnd: 9, rowStart: 1, rowEnd: 2 };
    assert.equal(
      evaluateGridMove([a, b], b.instanceId, overlapPlacement, 1200, 600, undefined, measuredRects),
      'overlap'
    );
    const clearPlacement = { colStart: 8, colEnd: 13, rowStart: 4, rowEnd: 5 };
    assert.equal(
      evaluateGridMove([a, b], b.instanceId, clearPlacement, 1200, 800, undefined, measuredRects),
      null
    );
  });

  it('detects overlap against other grid items', () => {
    const a = createLayoutItem('a', null, { colStart: 1, colEnd: 5, rowStart: 1, rowEnd: 2 });
    const b = createLayoutItem('b', null, { colStart: 5, colEnd: 9, rowStart: 1, rowEnd: 2 });
    assert.equal(
      gridPlacementOverlapsOthers([a, b], a.instanceId, {
        colStart: 4,
        colEnd: 8,
        rowStart: 1,
        rowEnd: 2,
      }),
      true
    );
    assert.equal(
      gridPlacementOverlapsOthers([a, b], a.instanceId, {
        colStart: 1,
        colEnd: 5,
        rowStart: 2,
        rowEnd: 3,
      }),
      false
    );
  });

  it('derives column count from container width', () => {
    assert.equal(columnsForContainerWidth(1200), 12);
    assert.equal(columnsForContainerWidth(800), 8);
    assert.equal(columnsForContainerWidth(3840), 38);
  });

  it('derives row count from container height', () => {
    assert.equal(rowsForContainerHeight(600), 6);
    assert.equal(rowsForContainerHeight(800), 9);
    assert.equal(rowsForContainerHeight(2160), 24);
  });
});
