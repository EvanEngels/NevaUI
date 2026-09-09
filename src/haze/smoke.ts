import { createNoise, type Noise } from './noise';

/**
 * Smoke: a density field carried along a curling current.
 *
 * The previous version of Haze was a fixed texture that thinned where it was touched. It
 * was cheap and it read as condensation on glass, because nothing in it ever moved.
 *
 * This moves. Density is a coarse grid, and every frame each cell asks where its material
 * *came from* — one step back along the velocity field — and takes what was there. That
 * is semi-Lagrangian advection, and it is unconditionally stable: nothing can overshoot,
 * because nothing is pushed anywhere. It is only ever pulled.
 *
 * The velocity is the curl of a noise field, which swirls and cannot pump material into
 * or out of existence. See `noise.ts` for why that removes the expensive half of a fluid
 * solver rather than approximating it.
 *
 * The grid is coarse on purpose — smoke has no detail worth resolving at pixel scale, and
 * the canvas is drawn back up with smoothing on, so the interpolation the browser does for
 * free is the last step of the simulation.
 */

export interface SmokeSettings {
  /** How fast the current carries, in cells per second. */
  flow: number;
  /** Scale of the swirls: larger is broader, calmer motion. */
  swirl: number;
  /**
   * How fast the field returns to its resting level, per second. It fills a wipe and
   * damps whatever the current stirs up, and it is one number rather than two because a
   * separate dissipation term fought it: the two settled at an equilibrium below the
   * resting level, so the smoke quietly thinned to two thirds of what was asked for.
   */
  healRate: number;
  /** Resting density, 0 to 1. Above roughly 0.8 the content beneath stops being legible. */
  density: number;
  /**
   * How uneven the smoke is, 0 to 1.
   *
   * Not decoration: a uniform field advects to itself, so smoke with no variation is
   * perfectly still however fast the current runs underneath it. The structure is what
   * the motion is visible *in*.
   */
  variation: number;
  /** Radius of the wipe, in pixels. */
  brush: number;
}

export const DEFAULT_SMOKE: SmokeSettings = {
  flow: 5.5,
  swirl: 0.09,
  healRate: 0.55,
  density: 0.72,
  variation: 0.62,
  brush: 80,
};

export interface Smoke {
  readonly columns: number;
  readonly rows: number;
  readonly density: Float32Array;
  /** Advance the field. Returns true while anything is still changing. */
  step(elapsedSeconds: number, settings: SmokeSettings): boolean;
  /** Thin the smoke around a point given in cells. */
  wipe(x: number, y: number, radiusCells: number, strength: number): void;
  fill(level: number): void;
  average(): number;
}

export function createSmoke(columns: number, rows: number, seed = 1): Smoke {
  const density = new Float32Array(columns * rows);
  const next = new Float32Array(columns * rows);
  const noise: Noise = createNoise(seed);
  const velocity = { x: 0, y: 0 };
  let time = 0;
  /** True while the field is far enough from rest to be worth another frame. */
  let restless = true;

  /** Bilinear sample, clamped at the edges so smoke does not wrap around the card. */
  const sample = (x: number, y: number): number => {
    const cx = Math.max(0, Math.min(columns - 1.001, x));
    const cy = Math.max(0, Math.min(rows - 1.001, y));
    const x0 = Math.floor(cx);
    const y0 = Math.floor(cy);
    const fx = cx - x0;
    const fy = cy - y0;
    const index = y0 * columns + x0;
    const right = x0 + 1 < columns ? 1 : 0;
    const below = y0 + 1 < rows ? columns : 0;

    const topLeft = density[index] ?? 0;
    const topRight = density[index + right] ?? 0;
    const bottomLeft = density[index + below] ?? 0;
    const bottomRight = density[index + below + right] ?? 0;

    const top = topLeft + (topRight - topLeft) * fx;
    const bottom = bottomLeft + (bottomRight - bottomLeft) * fx;
    return top + (bottom - top) * fy;
  };

  return {
    columns,
    rows,
    density,

    step(elapsedSeconds, settings) {
      const dt = Math.max(0, Math.min(1 / 20, elapsedSeconds));
      if (dt === 0) return restless;
      time += dt;

      const carry = settings.flow * dt;
      const heal = Math.min(1, settings.healRate * dt);
      const structureScale = settings.swirl * 0.55;

      let drift = 0;

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          noise.curl(column * settings.swirl, row * settings.swirl, time, velocity);

          // Where did this cell's smoke come from? One step back along the current.
          const carried = sample(column - velocity.x * carry, row - velocity.y * carry);

          /*
           * Relax towards a resting level that is itself uneven and drifting.
           *
           * A flat target would be the obvious choice and would produce perfectly still
           * smoke: advecting a uniform field gives back the same uniform field, however
           * fast the current runs underneath it. The structure is what makes the motion
           * visible, so the target carries it and the relaxation keeps renewing it.
           */
          const structure =
            1 +
            settings.variation *
              noise.at(column * structureScale + time * 0.07, row * structureScale - time * 0.05);
          const target = Math.max(0, Math.min(1, settings.density * structure));

          const value = carried + (target - carried) * heal;

          next[row * columns + column] = value;
          drift += Math.abs(value - (density[row * columns + column] ?? 0));
        }
      }

      density.set(next);

      /*
       * Unlike every other experiment here, this one has no rest. The current keeps
       * turning and the target keeps drifting, so the picture is always changing and the
       * loop can never stop on its own.
       *
       * That is what "smoke that moves" costs, and it is the caller's job to stop it when
       * the element is not on screen. The value is still returned, because a caller that
       * wants still smoke can set the flow to zero and get a loop that ends.
       */
      restless = drift / (columns * rows) > 1 / 2048;
      return restless;
    },

    wipe(x, y, radiusCells, strength) {
      const left = Math.max(0, Math.floor(x - radiusCells));
      const right = Math.min(columns - 1, Math.ceil(x + radiusCells));
      const top = Math.max(0, Math.floor(y - radiusCells));
      const bottom = Math.min(rows - 1, Math.ceil(y + radiusCells));

      for (let row = top; row <= bottom; row += 1) {
        for (let column = left; column <= right; column += 1) {
          const distance = Math.hypot(column - x, row - y);
          if (distance > radiusCells) continue;
          // Soft edge, so a stroke does not leave a stencilled circle.
          const falloff = 1 - (distance / radiusCells) ** 2;
          const index = row * columns + column;
          density[index] = (density[index] ?? 0) * (1 - falloff * strength);
        }
      }
      restless = true;
    },

    fill(level) {
      density.fill(level);
      restless = true;
    },

    average() {
      let total = 0;
      for (const value of density) total += value;
      return total / density.length;
    },
  };
}
