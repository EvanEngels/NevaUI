import { describe, expect, it } from 'vitest';
import { seeded } from './random';
import { createTerrain } from './terrain';
import { createLava, DEFAULT_LAVA, lavaColour, MOLTEN } from './lava';

/**
 * Lava's whole claim is that heat governs it. These check that the claim is true of the
 * simulation and not only of the comments: that it cools, that it stops, that it crusts
 * from the outside, and that what it leaves behind is ground.
 */

const build = (columns: number, rows: number) =>
  createLava(createTerrain(columns, rows, [{ x: 0, y: rows - 1, width: columns, height: 1 }], 1));

/**
 * A narrow shaft. Lava poured into it stacks deep, so there are cells with lava on every
 * side to compare against the ones at the surface — a wide basin crusts over before it
 * ever has an inside.
 */
const shaft = (columns: number, rows: number) =>
  createLava(
    createTerrain(
      columns,
      rows,
      [
        { x: 0, y: rows - 1, width: columns, height: 1 },
        { x: 0, y: 0, width: 1, height: rows },
        { x: columns - 1, y: 0, width: 1, height: rows },
      ],
      1
    )
  );

const run = (lava: ReturnType<typeof build>, passes: number, pourFor = 0): void => {
  for (let pass = 0; pass < passes; pass += 1) {
    if (pass < pourFor) lava.pour(1 / 60, 900, random);
    lava.step(DEFAULT_LAVA, random);
  }
};

const random = seeded(7);

describe('lava', () => {
  it('cools, stops, and turns to ground', () => {
    const lava = build(30, 40);
    run(lava, 4000, 200);

    // Nothing molten left, and what was molten is now terrain rather than gone.
    expect(lava.moltenCount()).toBe(0);
    expect(lava.frozenCount()).toBeGreaterThan(100);
  });

  it('crusts at the edges while the middle stays hot', () => {
    // Poured into a shaft, so there is an inside to compare the outside against.
    const lava = shaft(8, 40);
    run(lava, 700, 700);

    const heats: { edge: number[]; middle: number[] } = { edge: [], middle: [] };
    for (let row = 1; row < 39; row += 1) {
      for (let column = 1; column < 7; column += 1) {
        const index = row * 8 + column;
        if (lava.cells[index] !== MOLTEN) continue;
        const neighbours = [index - 1, index + 1, index - 8, index + 8];
        const open = neighbours.filter((n) => lava.cells[n] === 0).length;
        (open > 0 ? heats.edge : heats.middle).push(lava.heat[index] ?? 0);
      }
    }

    const mean = (values: number[]): number =>
      values.reduce((total, value) => total + value, 0) / (values.length || 1);

    expect(heats.edge.length).toBeGreaterThan(5);
    expect(heats.middle.length).toBeGreaterThan(5);
    // Exposure is what makes a crust: the outside of a flow is colder than its inside.
    expect(mean(heats.middle)).toBeGreaterThan(mean(heats.edge));
  });

  it('flows over the ground it has already left behind', () => {
    const lava = build(60, 60);
    run(lava, 3000, 60);
    const firstFlow = lava.frozenCount();
    expect(firstFlow).toBeLessThan(60 * 59);

    run(lava, 3000, 60);

    // The second pour cannot occupy the first one's cells, so it has to build on them.
    expect(lava.frozenCount()).toBeGreaterThan(firstFlow);
  });

  it('reads its colour from the same heat the physics uses', () => {
    const cold = lavaColour(0);
    const hot = lavaColour(1);

    expect(hot[0]).toBeGreaterThan(cold[0]);
    expect(hot[1]).toBeGreaterThan(cold[1]);
    // A frozen cell is rock, not a dark version of orange.
    expect(cold[0]).toBeLessThan(60);
  });

  it('leaves nothing molten forever', () => {
    const lava = build(24, 30);
    run(lava, 60, 60);

    let stoppedAt = -1;
    for (let pass = 0; pass < 8000; pass += 1) {
      lava.step(DEFAULT_LAVA, random);
      if (lava.moltenCount() === 0) {
        stoppedAt = pass;
        break;
      }
    }
    expect(stoppedAt).toBeGreaterThan(0);
  });
});
