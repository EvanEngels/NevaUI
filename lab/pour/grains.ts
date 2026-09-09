/**
 * Pour — a falling-material simulation on a coarse grid.
 *
 * The page's own boxes are the terrain. Elements are written into the grid as solid
 * cells, so the material lands on a heading, slides off a card and fills the gaps
 * between them: the effect is made of the layout rather than played over it.
 *
 * This is a cellular automaton, not a particle system with positions and velocities.
 * Every cell is one byte in a typed array, one pass per frame, bottom-up. That keeps the
 * whole thing linear in the number of cells and free of allocation, which matters when
 * the alternative is tens of thousands of objects.
 *
 * Sand, water and lava are the same rules with different numbers — see `MATERIALS`. They
 * differ in how far a resting grain will slide sideways to find a lower place, and in how
 * often it is allowed to move at all.
 */

export const EMPTY = 0;
export const SOLID = 1;
export const FILLED = 2;

export interface MaterialSettings {
  /**
   * How far a blocked cell will look sideways for somewhere lower to go. Sand piles at an
   * angle because it looks one cell; water finds its level because it looks many.
   */
  spread: number;
  /** Chance a cell moves at all on a given pass. Below 1 the material feels heavy. */
  mobility: number;
  /** Cells poured per second, spread across the source width. */
  rate: number;
  colour: [number, number, number];
  /** How much the colour varies grain to grain, 0 to 1. */
  variation: number;
}

export const MATERIALS: Record<'sand' | 'water' | 'lava', MaterialSettings> = {
  sand: { spread: 1, mobility: 1, rate: 5200, colour: [214, 176, 118], variation: 0.16 },
  water: { spread: 6, mobility: 1, rate: 6000, colour: [86, 150, 214], variation: 0.06 },
  lava: { spread: 2, mobility: 0.35, rate: 3200, colour: [226, 88, 34], variation: 0.22 },
};

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Grid {
  readonly columns: number;
  readonly rows: number;
  /** One byte per cell: EMPTY, SOLID or FILLED. */
  readonly cells: Uint8Array;
  /** Per-cell colour jitter, so a pile is not a flat wash. */
  readonly shade: Uint8Array;
  /** Direction the material falls: 1 for down, -1 for up. */
  gravity: 1 | -1;
  /** Writes the page's boxes into the grid as terrain. Clears any previous terrain. */
  setTerrain(boxes: readonly Box[], cellSize: number): void;
  /** Pours material in for one frame's worth of time. */
  pour(elapsedSeconds: number, settings: MaterialSettings, random: () => number): void;
  /** Advances the material one step. Returns the number of cells that moved. */
  step(settings: MaterialSettings, random: () => number): number;
  /** Removes all material, leaving the terrain. */
  clear(): void;
  filledCount(): number;
}

export function createGrid(columns: number, rows: number): Grid {
  const cells = new Uint8Array(columns * rows);
  const shade = new Uint8Array(columns * rows);
  let gravity: 1 | -1 = 1;
  let pending = 0;

  const at = (column: number, row: number): number => row * columns + column;
  const inside = (column: number, row: number): boolean =>
    column >= 0 && column < columns && row >= 0 && row < rows;

  const isOpen = (column: number, row: number): boolean =>
    inside(column, row) && cells[at(column, row)] === EMPTY;

  return {
    columns,
    rows,
    cells,
    shade,

    get gravity() {
      return gravity;
    },
    set gravity(next: 1 | -1) {
      gravity = next;
    },

    setTerrain(boxes, cellSize) {
      for (let index = 0; index < cells.length; index += 1) {
        if (cells[index] === SOLID) cells[index] = EMPTY;
      }

      for (const box of boxes) {
        const left = Math.max(0, Math.floor(box.x / cellSize));
        const right = Math.min(columns - 1, Math.floor((box.x + box.width) / cellSize));
        const top = Math.max(0, Math.floor(box.y / cellSize));
        const bottom = Math.min(rows - 1, Math.floor((box.y + box.height) / cellSize));

        for (let row = top; row <= bottom; row += 1) {
          for (let column = left; column <= right; column += 1) {
            // Material already resting there is not overwritten: the terrain appearing
            // under a pile would swallow it.
            if (cells[at(column, row)] === EMPTY) cells[at(column, row)] = SOLID;
          }
        }
      }
    },

    pour(elapsedSeconds, settings, random) {
      pending += settings.rate * Math.max(0, Math.min(0.05, elapsedSeconds));
      const sourceRow = gravity === 1 ? 0 : rows - 1;

      while (pending >= 1) {
        pending -= 1;
        const column = Math.floor(random() * columns);
        const index = at(column, sourceRow);
        if (cells[index] !== EMPTY) continue;
        cells[index] = FILLED;
        shade[index] = Math.floor(random() * 255);
      }
    },

    step(settings, random) {
      let moved = 0;
      const down = gravity;
      // Scanned against gravity so a cell is not carried several rows in one pass, which
      // would make the material fall at the speed of the loop rather than of the frame.
      const firstRow = down === 1 ? rows - 2 : 1;
      const lastRow = down === 1 ? -1 : rows;
      const rowStep = down === 1 ? -1 : 1;

      for (let row = firstRow; row !== lastRow; row += rowStep) {
        // Alternating direction each row stops the material drifting one way over time.
        const leftToRight = (row & 1) === 0;
        for (let n = 0; n < columns; n += 1) {
          const column = leftToRight ? n : columns - 1 - n;
          const index = at(column, row);
          if (cells[index] !== FILLED) continue;
          if (settings.mobility < 1 && random() > settings.mobility) continue;

          const nextRow = row + down;
          if (isOpen(column, nextRow)) {
            move(index, at(column, nextRow));
            moved += 1;
            continue;
          }

          // Blocked below: look sideways for somewhere lower, out to `spread`. Sand looks
          // one cell and forms a slope; water looks further and finds its level.
          const bias = random() < 0.5 ? -1 : 1;
          let slid = false;
          for (let distance = 1; distance <= settings.spread && !slid; distance += 1) {
            for (const direction of [bias, -bias]) {
              const sideColumn = column + direction * distance;
              if (!isOpen(sideColumn, nextRow)) continue;
              // The path has to be clear, or material tunnels through a wall.
              if (!isOpen(column + direction * distance, row) && distance > 1) continue;
              move(index, at(sideColumn, nextRow));
              moved += 1;
              slid = true;
              break;
            }
          }
        }
      }

      return moved;
    },

    clear() {
      for (let index = 0; index < cells.length; index += 1) {
        if (cells[index] === FILLED) cells[index] = EMPTY;
      }
      pending = 0;
    },

    filledCount() {
      let total = 0;
      for (let index = 0; index < cells.length; index += 1) {
        if (cells[index] === FILLED) total += 1;
      }
      return total;
    },
  };

  function move(from: number, to: number): void {
    cells[to] = FILLED;
    shade[to] = shade[from] ?? 0;
    cells[from] = EMPTY;
  }
}
