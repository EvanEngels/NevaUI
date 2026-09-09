import type { Terrain } from './terrain';

/**
 * Lava, which cools.
 *
 * The first version made lava out of sand by moving it less often. It thickened and
 * dribbled, which was lucky, but it was still sand: it never stopped being able to move,
 * and it never changed colour for a reason.
 *
 * Real lava has one property that governs everything else — **temperature**. It flows
 * because it is hot, it slows as it loses heat, and when it is cold enough it stops being
 * a fluid and becomes rock. That rock is then terrain, so later flow runs over it and
 * around it: the material builds its own landscape as it goes.
 *
 * So a cell here carries heat as well as presence, and the rules read it:
 *
 * - How likely a cell is to move at all is its heat.
 * - Heat leaves faster where a cell touches something that is not lava, which is why a
 *   flow crusts at its edges and stays molten inside.
 * - Below a threshold the cell freezes: it stops moving for good and becomes ground.
 *
 * Nothing in that list is a colour. The colour is read from the heat when drawing, so the
 * glow and the black crust are the same field the physics uses rather than a decoration
 * painted on top.
 */

export const EMPTY = 0;
export const MOLTEN = 1;
export const FROZEN = 2;

export interface LavaSettings {
  /** Heat lost per step by a cell surrounded by lava, as a fraction. */
  coolRate: number;
  /** Extra cooling per exposed side. Edges crust; the middle stays hot. */
  exposureCooling: number;
  /** Below this heat a cell freezes into ground. */
  freezeAt: number;
  /** How far a molten cell will look sideways for somewhere lower. */
  spread: number;
}

/**
 * Tuned against the clock rather than by eye. At 60 frames a second, lava exposed on
 * every side falls from full heat to frozen in about four seconds, and lava buried inside
 * a flow takes closer to fifteen. The first attempt was five times faster and the result
 * was rock falling through the air: it froze before it had gone anywhere, which looks
 * like a bug and is really a number.
 */
export const DEFAULT_LAVA: LavaSettings = {
  coolRate: 0.0008,
  exposureCooling: 0.0005,
  freezeAt: 0.22,
  spread: 2,
};

export interface Lava {
  readonly cells: Uint8Array;
  /** 0 to 1. Drives movement while molten and colour always. */
  readonly heat: Float32Array;
  gravity: 1 | -1;
  step(settings: LavaSettings, random: () => number): number;
  pour(elapsedSeconds: number, rate: number, random: () => number): void;
  clear(): void;
  moltenCount(): number;
  frozenCount(): number;
}

export function createLava(terrain: Terrain): Lava {
  const { columns, rows, solid } = terrain;
  const cells = new Uint8Array(columns * rows);
  const heat = new Float32Array(columns * rows);
  let gravity: 1 | -1 = 1;
  let pending = 0;

  const blocked = (column: number, row: number): boolean => {
    if (column < 0 || column >= columns || row < 0 || row >= rows) return true;
    const index = row * columns + column;
    return solid[index] === 1 || cells[index] !== EMPTY;
  };

  const move = (from: number, to: number): void => {
    cells[to] = MOLTEN;
    heat[to] = heat[from] ?? 0;
    cells[from] = EMPTY;
    heat[from] = 0;
  };

  return {
    cells,
    heat,

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
        if (solid[index] === 1 || cells[index] !== EMPTY) continue;
        cells[index] = MOLTEN;
        // Fresh lava arrives at full heat and a little unevenness, so a flow is not one
        // flat colour.
        heat[index] = 0.88 + random() * 0.12;
      }
    },

    step(settings, random) {
      let moved = 0;
      const down = gravity;
      const firstRow = down === 1 ? rows - 1 : 0;
      const lastRow = down === 1 ? -1 : rows;
      const rowStep = down === 1 ? -1 : 1;

      for (let row = firstRow; row !== lastRow; row += rowStep) {
        const leftToRight = (row & 1) === 0;
        for (let n = 0; n < columns; n += 1) {
          const column = leftToRight ? n : columns - 1 - n;
          const index = row * columns + column;
          if (cells[index] !== MOLTEN) continue;

          // Cooling, faster where the cell is exposed. A flow crusts from the outside in.
          let exposed = 0;
          if (!blocked(column - 1, row)) exposed += 1;
          if (!blocked(column + 1, row)) exposed += 1;
          if (!blocked(column, row - 1)) exposed += 1;
          if (!blocked(column, row + 1)) exposed += 1;

          const current = heat[index] ?? 0;
          const cooled = Math.max(
            0,
            current - settings.coolRate - exposed * settings.exposureCooling
          );
          heat[index] = cooled;

          if (cooled <= settings.freezeAt) {
            // Frozen lava is ground: later flow runs over it and around it, so the
            // material builds the landscape it then has to cross.
            cells[index] = FROZEN;
            continue;
          }

          // Hotter lava is runnier. This is the only place movement is decided, and it
          // reads the same field the colour does.
          if (random() > cooled) continue;

          const nextRow = row + down;
          if (!blocked(column, nextRow)) {
            move(index, nextRow * columns + column);
            moved += 1;
            continue;
          }

          const bias = random() < 0.5 ? -1 : 1;
          for (let distance = 1; distance <= settings.spread; distance += 1) {
            let slid = false;
            for (const direction of [bias, -bias]) {
              const sideColumn = column + direction * distance;
              if (blocked(sideColumn, nextRow)) continue;
              if (distance > 1 && blocked(column + direction * (distance - 1), row)) continue;
              move(index, nextRow * columns + sideColumn);
              moved += 1;
              slid = true;
              break;
            }
            if (slid) break;
          }
        }
      }

      return moved;
    },

    clear() {
      cells.fill(EMPTY);
      heat.fill(0);
      pending = 0;
    },

    moltenCount() {
      let total = 0;
      for (const cell of cells) if (cell === MOLTEN) total += 1;
      return total;
    },

    frozenCount() {
      let total = 0;
      for (const cell of cells) if (cell === FROZEN) total += 1;
      return total;
    },
  };
}

/** Colour from heat: black rock, deep red, orange, and white at the vent. */
export function lavaColour(heat: number): [number, number, number] {
  const stops: [number, [number, number, number]][] = [
    [0, [28, 24, 26]],
    [0.25, [78, 26, 22]],
    [0.5, [186, 54, 20]],
    [0.75, [240, 122, 26]],
    [1, [255, 226, 158]],
  ];

  for (let index = 1; index < stops.length; index += 1) {
    const [stopHeat, colour] = stops[index] as [number, [number, number, number]];
    const [previousHeat, previousColour] = stops[index - 1] as [number, [number, number, number]];
    if (heat > stopHeat && index < stops.length - 1) continue;

    const span = stopHeat - previousHeat || 1;
    const t = Math.max(0, Math.min(1, (heat - previousHeat) / span));
    return [
      Math.round(previousColour[0] + (colour[0] - previousColour[0]) * t),
      Math.round(previousColour[1] + (colour[1] - previousColour[1]) * t),
      Math.round(previousColour[2] + (colour[2] - previousColour[2]) * t),
    ];
  }
  return [28, 24, 26];
}
