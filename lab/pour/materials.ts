import type { Terrain } from './terrain';
import { createSand, DEFAULT_SAND, GRAIN } from './sand';
import { createWater } from './water';
import { createLava, DEFAULT_LAVA, FROZEN, lavaColour, MOLTEN } from './lava';

/**
 * The three materials behind one small surface, so the component does not have to know
 * which one it is drawing.
 *
 * This is not a shared model — the first version of Pour was exactly that, and one
 * automaton with three settings read as one material recoloured. Sand, water and lava
 * each have their own file and their own physics. What is shared is only the two things
 * a renderer needs: advance, and tell me the colour of a cell.
 */

export type MaterialName = 'sand' | 'water' | 'lava';

export interface Simulation {
  /** Advance one frame. */
  step(elapsedSeconds: number, pouring: boolean): void;
  /** Colour and alpha of a cell, or null where there is nothing to draw. */
  colourAt(index: number): [number, number, number, number] | null;
  /** How much material there is, for the readout. */
  population(): number;
  setGravity(direction: 1 | -1): void;
}

const RATES: Record<MaterialName, number> = { sand: 4200, water: 2600, lava: 2600 };

export function createSimulation(
  name: MaterialName,
  terrain: Terrain,
  random: () => number = Math.random
): Simulation {
  if (name === 'water') {
    const water = createWater(terrain);
    /*
     * Water is stepped several times a frame, and it is the only material that needs it.
     * A single pass moves a level towards equilibrium by a fraction of the difference, so
     * a pool settles in thousands of passes — correct, and far too slow to look like
     * water. Sand and lava reach their resting shape in one pass each because a grain
     * either moves or does not.
     *
     * Four is what a step's measured cost affords: 0.33 ms each on a half-full page.
     */
    const SUBSTEPS = 4;
    return {
      step(elapsed, pouring) {
        if (pouring) water.pour(elapsed, RATES.water, random);
        for (let pass = 0; pass < SUBSTEPS; pass += 1) water.step();
      },
      colourAt(index) {
        const mass = water.mass[index] ?? 0;
        if (mass < 0.02) return null;
        // Depth reads as opacity and as a darker blue, the way water does.
        const depth = Math.min(1, mass);
        return [
          Math.round(96 - depth * 40),
          Math.round(168 - depth * 46),
          Math.round(226 - depth * 26),
          Math.round(90 + depth * 140),
        ];
      },
      population: () => Math.round(water.total()),
      setGravity: (direction) => {
        water.gravity = direction;
      },
    };
  }

  if (name === 'lava') {
    const lava = createLava(terrain);
    return {
      step(elapsed, pouring) {
        if (pouring) lava.pour(elapsed, RATES.lava, random);
        lava.step(DEFAULT_LAVA, random);
      },
      colourAt(index) {
        const cell = lava.cells[index];
        if (cell !== MOLTEN && cell !== FROZEN) return null;
        const [red, green, blue] = lavaColour(lava.heat[index] ?? 0);
        return [red, green, blue, 255];
      },
      population: () => lava.moltenCount() + lava.frozenCount(),
      setGravity: (direction) => {
        lava.gravity = direction;
      },
    };
  }

  const sand = createSand(terrain);
  return {
    step(elapsed, pouring) {
      if (pouring) sand.pour(elapsed, RATES.sand, random);
      sand.step(DEFAULT_SAND, random);
    },
    colourAt(index) {
      if (sand.cells[index] !== GRAIN) return null;
      const jitter = (((sand.shade[index] ?? 0) / 255) * 2 - 1) * 0.16;
      return [
        clampByte(214 * (1 + jitter)),
        clampByte(176 * (1 + jitter)),
        clampByte(118 * (1 + jitter)),
        255,
      ];
    },
    population: () => sand.count(),
    setGravity: (direction) => {
      sand.gravityDirection = direction;
    },
  };
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
