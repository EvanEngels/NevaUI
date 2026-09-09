import type { Terrain } from './terrain';

/**
 * Water, with pressure.
 *
 * The first version of Pour treated water as sand that slides further. It levels, and it
 * is wrong: real water fills a cavity from below, climbs, and finds one surface across
 * every connected passage. The caves under the page's elements stayed dry, which is
 * correct for sand and plainly false for water.
 *
 * So water stops being a byte and becomes a **mass**. A cell holds an amount, not a
 * yes-or-no, and the rules move amounts rather than grains:
 *
 * 1. Give downward, up to what the cell below can take — and a cell below can take more
 *    than a full unit, because water under water is compressed. That compression is the
 *    whole trick: it is what stores pressure.
 * 2. Equalise sideways with the neighbours.
 * 3. Give **upward** anything above the compressed maximum. This is what makes water
 *    climb into a cavity and what gives a connected body one surface.
 *
 * Rule 3 is the one the previous model could not express at any setting, and it is why
 * this is a different simulation rather than different numbers.
 *
 * ## What it does not do
 *
 * Transport across a barrier is slow. Once a basin has filled to the crest of a wall, the
 * only thing pushing water over is a thin film at the surface, and a film carries very
 * little. Real water has momentum and would slosh across; this has none, so it seeps.
 * Correct as an equilibrium, wrong as a motion, and visible if you pour into a divided
 * page and wait.
 */

/** A cell is "full" at 1. Anything above that is water under pressure. */
const MAX_MASS = 1;
/** How much more than full a cell may hold per row of water above it. */
const COMPRESSION = 0.02;
/** Below this, water is treated as gone — otherwise a film never stops flowing. */
const MIN_MASS = 0.0001;
/** Cap on what may move in one step, so a column does not empty in a single pass. */
const MAX_FLOW = 4;
/** Fraction of the difference that levels each step. Below 1 the surface stays alive. */
const LEVELLING = 0.55;

export interface Water {
  readonly mass: Float32Array;
  gravity: 1 | -1;
  step(): void;
  pour(elapsedSeconds: number, rate: number, random: () => number): void;
  clear(): void;
  total(): number;
}

export function createWater(terrain: Terrain): Water {
  const { columns, rows, solid } = terrain;
  const mass = new Float32Array(columns * rows);
  const next = new Float32Array(columns * rows);
  let gravity: 1 | -1 = 1;
  let pending = 0;

  /** How much a cell may hold given how much is trying to sit in it. */
  const capacity = (total: number): number => {
    if (total <= MAX_MASS) return MAX_MASS;
    if (total < 2 * MAX_MASS + COMPRESSION) {
      return (MAX_MASS * MAX_MASS + total * COMPRESSION) / (MAX_MASS + COMPRESSION);
    }
    return (total + COMPRESSION) / 2;
  };

  return {
    mass,

    get gravity() {
      return gravity;
    },
    set gravity(value: 1 | -1) {
      gravity = value;
    },

    pour(elapsedSeconds, rate, random) {
      pending += rate * Math.max(0, Math.min(0.05, elapsedSeconds));
      const sourceRow = gravity === 1 ? 0 : rows - 1;
      while (pending >= 1) {
        pending -= 1;
        const column = Math.floor(random() * columns);
        const index = sourceRow * columns + column;
        if (solid[index] === 1) continue;
        mass[index] = (mass[index] ?? 0) + 1;
      }
    },

    step() {
      next.set(mass);
      const down = gravity;

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const index = row * columns + column;
          if (solid[index] === 1) continue;

          const remainingStart = mass[index] ?? 0;
          // Skipping, never zeroing. This cell may already have received water from a
          // neighbour earlier in the same pass, and writing a zero here would delete it:
          // the buffer holds what has been given, the source array holds what was there.
          if (remainingStart < MIN_MASS) continue;
          let remaining = remainingStart;

          const give = (targetIndex: number, amount: number): void => {
            const moved = Math.min(amount, remaining, MAX_FLOW);
            if (moved <= 0) return;
            next[index] = (next[index] ?? 0) - moved;
            next[targetIndex] = (next[targetIndex] ?? 0) + moved;
            remaining -= moved;
          };

          // 1. Down, into whatever room pressure allows.
          const belowRow = row + down;
          if (belowRow >= 0 && belowRow < rows) {
            const below = belowRow * columns + column;
            if (solid[below] !== 1) {
              const room = capacity(remaining + (mass[below] ?? 0)) - (mass[below] ?? 0);
              if (room > 0) give(below, room);
            }
          }
          if (remaining < MIN_MASS) continue;

          // 2. Sideways, towards the lower of the two.
          for (const direction of [-1, 1]) {
            const sideColumn = column + direction;
            if (sideColumn < 0 || sideColumn >= columns) continue;
            const side = row * columns + sideColumn;
            if (solid[side] === 1) continue;
            const difference = remaining - (mass[side] ?? 0);
            if (difference > 0) give(side, difference * LEVELLING);
            if (remaining < MIN_MASS) break;
          }
          if (remaining < MIN_MASS) continue;

          // 3. Up — the rule the previous model had no way to express. Water pushed past
          // what a cell can hold rises, which is what fills a cavity from below and what
          // gives a connected body a single surface.
          const aboveRow = row - down;
          if (aboveRow >= 0 && aboveRow < rows) {
            const above = aboveRow * columns + column;
            if (solid[above] !== 1) {
              const room = remaining - capacity(remaining + (mass[above] ?? 0));
              if (room > 0) give(above, room);
            }
          }
        }
      }

      mass.set(next);
    },

    clear() {
      mass.fill(0);
      pending = 0;
    },

    total() {
      let sum = 0;
      for (const value of mass) sum += value;
      return sum;
    },
  };
}
