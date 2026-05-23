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
  toCssGridTemplate,
  validateLayout,
  evaluateGridMove,
  isGridPlacementWithinContainer,
  columnsForContainerWidth,
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
    assert.equal(resized.colEnd, 9);
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
    const css = toCssGridTemplate(items, undefined, { minRows: 20, rowSizing: 'fixed' });
    assert.match(css.gridTemplateRows, /repeat\(20, 80px\)/);
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
});
