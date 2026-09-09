import type { Terrain } from './terrain';

/**
 * Sand, with inertia and avalanches.
 *
 * The first version moved one cell per pass and slid one cell sideways when blocked. It
 * heaped, which was enough to be recognisable and not enough to be convincing: a grain
 * dropped from the top of the page arrived at the same speed as one dropped from an inch
 * away, and a pile grew to exactly 45 degrees and stayed there. Real sand accelerates,
 * lands hard, and collapses when it is piled too steeply.
 *
 * Two additions, both of which the previous model had no room for:
 *
 * **Speed.** A falling grain accelerates and moves that many cells per pass, checking
 * every cell on the way so it cannot pass through anything. Height becomes visible: sand
 * poured from high up arrives fast and scatters, sand released just above the pile
 * settles.
 *
 * **Repose.** A resting grain looks at the height difference to its neighbours, and
 * slides only when the slope is steeper than the material holds. That angle is not a
 * constant — it is drawn per grain, so a pile has an uneven face and collapses in
 * runs rather than one grain at a time.
 */

export interface SandSettings {
  /** Cells per pass added to a falling grain's speed. */
  gravity: number;
  /** Fastest a grain may travel, in cells per pass. */
  maxSpeed: number;
  /**
   * Height difference, in cells, at which a resting grain gives way. Higher holds a
   * steeper pile.
   */
  repose: number;
  /** How much of the repose angle is random, per grain. */
  reposeVariation: number;
  /** Fraction of speed kept when a grain lands and slides instead of stopping. */
  restitution: number;
}

export const DEFAULT_SAND: SandSettings = {
  gravity: 0.55,
  maxSpeed: 7,
  repose: 2,
  reposeVariation: 1,
  restitution: 0.45,
};

export const EMPTY = 0;
export const GRAIN = 1;

export interface Sand {
  readonly cells: Uint8Array;
  /** Falling speed in cells per pass, kept per grain so height is visible. */
  readonly speed: Float32Array;
  readonly shade: Uint8Array;
  gravityDirection: 1 | -1;
  step(settings: SandSettings, random: () => number): number;
  pour(elapsedSeconds: number, rate: number, random: () => number): void;
  clear(): void;
  count(): number;
}

export function createSand(terrain: Terrain): Sand {
  const { columns, rows, solid } = terrain;
  const cells = new Uint8Array(columns * rows);
  const speed = new Float32Array(columns * rows);
  const shade = new Uint8Array(columns * rows);
  let direction: 1 | -1 = 1;
  let pending = 0;

  const free = (column: number, row: number): boolean => {
    if (column < 0 || column >= columns || row < 0 || row >= rows) return false;
    const index = row * columns + column;
    return solid[index] !== 1 && cells[index] === EMPTY;
  };

  const move = (from: number, to: number, carried: number): void => {
    cells[to] = GRAIN;
    speed[to] = carried;
    shade[to] = shade[from] ?? 0;
    cells[from] = EMPTY;
    speed[from] = 0;
  };

  /**
   * Cells of material stacked below a column, which is what a slope is measured from.
   *
   * Bounded on purpose. The only question asked of it is whether one column stands more
   * than a few cells above another, so counting further is work thrown away — and it was:
   * scanning to the floor made a half-full page cost four times what it should.
   */
  const depthBelow = (column: number, row: number, limit: number): number => {
    let depth = 0;
    for (let scan = row; depth < limit && scan >= 0 && scan < rows; scan += direction) {
      const index = scan * columns + column;
      if (solid[index] === 1) break;
      if (cells[index] === EMPTY) break;
      depth += 1;
    }
    return depth;
  };

  return {
    cells,
    speed,
    shade,

    get gravityDirection() {
      return direction;
    },
    set gravityDirection(value: 1 | -1) {
      direction = value;
    },

    pour(elapsedSeconds, rate, random) {
      pending += rate * Math.max(0, Math.min(0.05, elapsedSeconds));
      const sourceRow = direction === 1 ? 0 : rows - 1;
      while (pending >= 1) {
        pending -= 1;
        const column = Math.floor(random() * columns);
        const index = sourceRow * columns + column;
        if (solid[index] === 1 || cells[index] !== EMPTY) continue;
        cells[index] = GRAIN;
        speed[index] = 0;
        shade[index] = Math.floor(random() * 255);
      }
    },

    step(settings, random) {
      let moved = 0;
      const firstRow = direction === 1 ? rows - 2 : 1;
      const lastRow = direction === 1 ? -1 : rows;
      const rowStep = -direction;

      for (let row = firstRow; row !== lastRow; row += rowStep) {
        const leftToRight = (row & 1) === 0;
        for (let n = 0; n < columns; n += 1) {
          const column = leftToRight ? n : columns - 1 - n;
          const index = row * columns + column;
          if (cells[index] !== GRAIN) continue;

          const current = Math.min(settings.maxSpeed, (speed[index] ?? 0) + settings.gravity);

          // Travel as far as the speed allows, stopping at the first thing in the way, so
          // a fast grain cannot pass through a thin floor.
          let travelled = 0;
          let landedRow = row;
          const steps = Math.max(1, Math.floor(current));
          for (let s = 1; s <= steps; s += 1) {
            if (!free(column, row + direction * s)) break;
            landedRow = row + direction * s;
            travelled = s;
          }

          if (travelled > 0) {
            move(index, landedRow * columns + column, current);
            moved += 1;
            continue;
          }

          // Blocked. A grain that arrived fast keeps some of that speed as it slides,
          // which is what makes a poured stream spread instead of stacking in a tower.
          const carried = current * settings.restitution;

          // Repose: give way only where the slope is steeper than this grain holds.
          const limit = settings.repose + random() * settings.reposeVariation;
          const scan = Math.ceil(limit) + 1;
          const here = depthBelow(column, row, scan);
          const bias = random() < 0.5 ? -1 : 1;

          for (const side of [bias, -bias]) {
            const sideColumn = column + side;
            if (!free(sideColumn, row + direction)) continue;
            const there = depthBelow(sideColumn, row + direction, scan);
            if (here - there < limit) continue;
            move(index, (row + direction) * columns + sideColumn, carried);
            moved += 1;
            break;
          }

          if (cells[index] === GRAIN) speed[index] = 0;
        }
      }

      return moved;
    },

    clear() {
      cells.fill(EMPTY);
      speed.fill(0);
      pending = 0;
    },

    count() {
      let total = 0;
      for (const cell of cells) if (cell === GRAIN) total += 1;
      return total;
    },
  };
}
