import { describe, expect, it } from 'vitest';
import { seeded } from './random';
import { createTerrain } from './terrain';
import { createSand, DEFAULT_SAND, GRAIN, type SandSettings } from './sand';

/**
 * The two things this model adds over the first one are speed and a repose angle. Both
 * are easy to write and easy to have not actually working, because a pile of sand looks
 * like a pile of sand either way.
 */

const build = (columns: number, rows: number) =>
  createSand(createTerrain(columns, rows, [{ x: 0, y: rows - 1, width: columns, height: 1 }], 1));

const settings = (overrides: Partial<SandSettings> = {}): SandSettings => ({
  ...DEFAULT_SAND,
  ...overrides,
});

const settle = (sand: ReturnType<typeof build>, passes = 2000): number => {
  for (let pass = 0; pass < passes; pass += 1) {
    if (sand.step(settings(), random) === 0) return pass;
  }
  return -1;
};

const random = seeded(11);

describe('sand', () => {
  it('loses no grains, and passes through nothing', () => {
    const sand = build(30, 60);
    // A thin shelf: a grain travelling seven cells a pass must not step over a one-cell
    // floor, which is exactly what an unchecked jump would do.
    const withShelf = createSand(
      createTerrain(
        30,
        60,
        [
          { x: 0, y: 59, width: 30, height: 1 },
          { x: 8, y: 30, width: 14, height: 1 },
        ],
        1
      )
    );

    for (let column = 8; column < 22; column += 1) withShelf.cells[column] = GRAIN;
    const before = withShelf.count();

    for (let pass = 0; pass < 400; pass += 1) withShelf.step(settings(), random);

    expect(withShelf.count()).toBe(before);
    // Everything should be resting on the shelf, not underneath it.
    let belowShelf = 0;
    for (let row = 32; row < 59; row += 1) {
      for (let column = 8; column < 22; column += 1) {
        if (withShelf.cells[row * 30 + column] === GRAIN) belowShelf += 1;
      }
    }
    expect(belowShelf).toBe(0);
    void sand;
  });

  it('accelerates as it falls', () => {
    const sand = build(10, 60);
    sand.cells[5] = GRAIN;

    const rowOf = (): number => {
      for (let row = 0; row < 60; row += 1) if (sand.cells[row * 10 + 5] === GRAIN) return row;
      return -1;
    };

    sand.step(settings(), random);
    const afterOne = rowOf();
    sand.step(settings(), random);
    sand.step(settings(), random);
    sand.step(settings(), random);
    const afterFour = rowOf();

    // A grain that moved one cell in its first pass and only four in four passes has no
    // inertia at all — which is what the previous model did.
    expect(afterFour - afterOne).toBeGreaterThan(3);
  });

  it('holds a slope steeper than one in one', () => {
    const sand = build(81, 60);
    for (let pass = 0; pass < 4000; pass += 1) {
      if (sand.cells[40] === 0) sand.cells[40] = GRAIN;
      sand.step(settings(), random);
    }

    const heights: number[] = [];
    for (let column = 0; column < 81; column += 1) {
      let height = 0;
      for (let row = 0; row < 60; row += 1) {
        if (sand.cells[row * 81 + column] === GRAIN) height += 1;
      }
      heights.push(height);
    }

    const peak = Math.max(...heights);
    const width = heights.filter((height) => height > 0).length;
    // A 45 degree pile is exactly as wide as it is tall on each side. A repose angle
    // above that gives a narrower, taller heap.
    expect(peak).toBeGreaterThan(width / 2 / 1.6);
  });

  it('comes to rest', () => {
    const sand = build(24, 40);
    for (let column = 0; column < 24; column += 1) sand.cells[column] = GRAIN;

    expect(settle(sand)).toBeGreaterThan(0);
  });
});
