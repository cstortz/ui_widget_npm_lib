import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatGridMoveRejection,
  formatGridPlacementSummary,
  formatPixelFootprint,
  placementsDiffer,
} from './grid-placement-debug.js';

describe('grid-placement-debug', () => {
  it('formats grid placement with corners and span', () => {
    const summary = formatGridPlacementSummary({
      colStart: 1,
      colEnd: 8,
      rowStart: 2,
      rowEnd: 4,
    });
    assert.match(summary, /cols 1→8 rows 2→4 \(7×2\)/);
    assert.match(summary, /TL\(1,2\) BR\(7,3\)/);
  });

  it('formats pixel footprint with corners', () => {
    const summary = formatPixelFootprint({ left: 12.4, top: 8.2, width: 640.6, height: 120.1 });
    assert.match(summary, /641×120px/);
    assert.match(summary, /TL\(12,8\)/);
    assert.match(summary, /BR\(653,128\)/);
  });

  it('reports when saved and display placements differ', () => {
    const saved = { colStart: 1, colEnd: 8, rowStart: 1, rowEnd: 2 };
    const display = { colStart: 1, colEnd: 6, rowStart: 1, rowEnd: 2 };
    assert.equal(placementsDiffer(saved, display), true);
    assert.equal(placementsDiffer(saved, saved), false);
  });

  it('formats overlap rejection with attempted placement and overlap ids', () => {
    const message = formatGridMoveRejection('overlap', {
      attempted: { colStart: 3, colEnd: 8, rowStart: 1, rowEnd: 2 },
      saved: { colStart: 1, colEnd: 8, rowStart: 1, rowEnd: 2 },
      overlappingIds: ['wi-notes', 'wi-timer'],
      attemptedPixel: { left: 100, top: 20, width: 500, height: 80 },
    });
    assert.match(message, /^Overlap — attempted/);
    assert.match(message, /Overlaps: wi-notes, wi-timer/);
    assert.match(message, /Saved: cols 1→8/);
  });
});
