import { describe, expect, it } from 'vitest';
import { createGrid, EMPTY, FILLED, MATERIALS, SOLID, type Grid } from './grains';

/**
 * A material simulation is easy to get plausibly wrong: grains that vanish, grains that
 * tunnel through the terrain, a pile that never settles. None of it is visible in a
 * screenshot — a wrong simulation still looks like sand.
 */

/** Runs until nothing moves. Returns the pass it settled on, or -1 if it never did. */
const settle = (grid: Grid, material = MATERIALS.sand, passes = 400): number => {
  for (let pass = 0; pass < passes; pass += 1) {
    if (grid.step(material, Math.random) === 0) return pass;
  }
  return -1;
};

const drop = (grid: Grid, column: number, row: number): void => {
  grid.cells[row * grid.columns + column] = FILLED;
};

describe('pour', () => {
  it('conserves material: nothing appears and nothing is lost', () => {
    const grid = createGrid(30, 40);
    grid.setTerrain([{ x: 40, y: 200, width: 200, height: 40 }], 10);

    for (let column = 5; column < 25; column += 1) drop(grid, column, 0);
    const before = grid.filledCount();

    settle(grid);

    expect(grid.filledCount()).toBe(before);
  });

  it('never leaves material inside the terrain', () => {
    const grid = createGrid(40, 50);
    grid.setTerrain([{ x: 100, y: 150, width: 150, height: 60 }], 10);

    for (let pass = 0; pass < 200; pass += 1) {
      grid.pour(1 / 60, MATERIALS.sand, Math.random);
      grid.step(MATERIALS.sand, Math.random);
    }

    // SOLID and FILLED share the byte, so a grain that tunnelled shows up as terrain that
    // has gone missing rather than as an overlap. The expected count is derived from the
    // same rounding the grid uses, rather than worked out by hand and got wrong.
    const columnsCovered = Math.floor(250 / 10) - Math.floor(100 / 10) + 1;
    const rowsCovered = Math.floor(210 / 10) - Math.floor(150 / 10) + 1;

    let solid = 0;
    for (const cell of grid.cells) if (cell === SOLID) solid += 1;
    expect(solid).toBe(columnsCovered * rowsCovered);
  });

  it('comes to rest', () => {
    const grid = createGrid(24, 30);
    for (let column = 0; column < 24; column += 1) drop(grid, column, 0);

    // A pile that never stops moving means the loop can never stop either.
    expect(settle(grid)).toBeGreaterThan(0);
  });

  it('piles at an angle as sand and finds its level as water', () => {
    const COLUMNS = 81;
    const GRAINS = 500;

    const profile = (material: (typeof MATERIALS)['sand']): number[] => {
      const grid = createGrid(COLUMNS, 50);
      const middle = Math.floor(COLUMNS / 2);
      let poured = 0;

      for (let pass = 0; pass < 4000; pass += 1) {
        // Poured through one column, so the heap's shape is the material's own and not
        // the shape of the source.
        if (poured < GRAINS && grid.cells[middle] === EMPTY) {
          grid.cells[middle] = FILLED;
          poured += 1;
        }
        grid.step(material, Math.random);
      }

      const heights: number[] = [];
      for (let column = 0; column < COLUMNS; column += 1) {
        let height = 0;
        for (let row = 0; row < grid.rows; row += 1) {
          if (grid.cells[row * COLUMNS + column] === FILLED) height += 1;
        }
        heights.push(height);
      }
      return heights;
    };

    const peakiness = (heights: number[]): number => {
      const used = heights.filter((height) => height > 0);
      const mean = used.reduce((total, height) => total + height, 0) / (used.length || 1);
      return Math.max(...heights) / (mean || 1);
    };

    // Both hold the same material; the difference is the shape it takes. Sand keeps a
    // peak above its own mean, water flattens towards it.
    expect(peakiness(profile(MATERIALS.sand))).toBeGreaterThan(peakiness(profile(MATERIALS.water)));
  });

  it('falls upward when gravity is turned over', () => {
    const grid = createGrid(20, 30);
    for (let column = 0; column < 20; column += 1) drop(grid, column, 28);

    grid.gravity = -1;
    settle(grid, MATERIALS.sand, 200);

    let inTopHalf = 0;
    for (let row = 0; row < 15; row += 1) {
      for (let column = 0; column < 20; column += 1) {
        if (grid.cells[row * 20 + column] === FILLED) inTopHalf += 1;
      }
    }
    expect(inTopHalf).toBe(20);
  });
});
