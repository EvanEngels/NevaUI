import { describe, expect, it } from 'vitest';
import { createTerrain, type Box } from './terrain';
import { createWater } from './water';

/**
 * The point of this model is the three things the previous one could not do: hold a
 * level, fill a cavity from below, and not lose water while doing it. Each is a test,
 * because water that is subtly wrong still looks like water.
 */

const build = (columns: number, rows: number, boxes: Box[] = []) =>
  createWater(createTerrain(columns, rows, boxes, 1));

const surfaceRow = (water: ReturnType<typeof build>, columns: number, column: number): number => {
  for (let row = 0; row < water.mass.length / columns; row += 1) {
    if ((water.mass[row * columns + column] ?? 0) > 0.5) return row;
  }
  return -1;
};

describe('water', () => {
  it('conserves its mass while it moves', () => {
    const water = build(30, 30);
    for (let column = 10; column < 20; column += 1) water.mass[column] = 1;
    const before = water.total();

    for (let pass = 0; pass < 300; pass += 1) water.step();

    expect(water.total()).toBeCloseTo(before, 3);
  });

  it('finds one level across a basin, whatever end it was poured into', () => {
    // Poured into one corner of a flat basin. Water that only spreads where it lands is
    // not levelling; it has to arrive at the far wall at the same height.
    const boxes: Box[] = [
      { x: 0, y: 29, width: 40, height: 1 },
      { x: 0, y: 10, width: 1, height: 19 },
      { x: 39, y: 10, width: 1, height: 19 },
    ];
    const water = build(40, 30, boxes);

    for (let pass = 0; pass < 200; pass += 1) {
      water.mass[3] = (water.mass[3] ?? 0) + 1;
      water.step();
    }
    for (let pass = 0; pass < 2000; pass += 1) water.step();

    const near = surfaceRow(water, 40, 4);
    const far = surfaceRow(water, 40, 36);

    expect(near).toBeGreaterThan(0);
    expect(far).toBeGreaterThan(0);
    expect(Math.abs(near - far)).toBeLessThanOrEqual(1);
  });

  it('fills a cavity from below, which the previous model could not', () => {
    /*
     * A lid with a gap at one side, and open space beneath it. Sand can never get into
     * the space under the lid; water has to, by rising.
     *
     *   ....#########   <- lid, with a gap on the left
     *   ....         .
     *   #############   <- floor
     */
    const boxes: Box[] = [
      { x: 4, y: 10, width: 26, height: 1 },
      { x: 0, y: 20, width: 30, height: 1 },
    ];
    const water = build(30, 30, boxes);

    for (let pass = 0; pass < 200; pass += 1) {
      water.mass[1] = (water.mass[1] ?? 0) + 1;
      water.step();
    }
    for (let pass = 0; pass < 600; pass += 1) water.step();

    // The cell directly under the middle of the lid: reachable only by going down the
    // gap, along the floor, and back up under the lid.
    const underLid = 19 * 30 + 20;
    expect(water.mass[underLid] ?? 0).toBeGreaterThan(0.5);
  });

  it('drains upward when gravity is turned over', () => {
    const water = build(20, 30);
    for (let column = 0; column < 20; column += 1) water.mass[28 * 20 + column] = 1;

    water.gravity = -1;
    for (let pass = 0; pass < 300; pass += 1) water.step();

    let inTopThird = 0;
    for (let row = 0; row < 10; row += 1) {
      for (let column = 0; column < 20; column += 1) {
        inTopThird += water.mass[row * 20 + column] ?? 0;
      }
    }
    expect(inTopThird).toBeGreaterThan(15);
  });
});
