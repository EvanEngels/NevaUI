/**
 * Value noise, and the curl of it.
 *
 * Smoke needs a velocity field that swirls without pumping material into or out of
 * existence. A field built by hand does the second: give every cell a direction and
 * density piles up wherever directions happen to converge, which reads as a leak rather
 * than as a current.
 *
 * The standard answer is to solve for pressure and project the divergence out, once per
 * frame, which is most of the cost of a fluid solver. The cheaper answer is to never
 * create divergence in the first place: take a scalar field and use its **curl** as the
 * velocity. The curl of any scalar potential is divergence-free by construction — there
 * is nothing to correct, because there is nothing wrong.
 *
 * So this is a small value noise, and `curl` reads two derivatives of it.
 */

const TABLE_SIZE = 256;
const TABLE_MASK = TABLE_SIZE - 1;

export interface Noise {
  /** Value at a point, in -1 to 1. */
  at(x: number, y: number): number;
  /**
   * Velocity at a point: the curl of the noise, which swirls and never accumulates.
   * `time` slides the field so the current itself drifts.
   */
  curl(x: number, y: number, time: number, out: { x: number; y: number }): void;
}

export function createNoise(seed: number): Noise {
  // A permutation and a value per lattice point, built once. Hashing per sample would
  // cost more than the interpolation it feeds.
  const values = new Float32Array(TABLE_SIZE * TABLE_SIZE);
  let state = (seed || 1) >>> 0;
  for (let index = 0; index < values.length; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    values[index] = (state / 0xffffffff) * 2 - 1;
  }

  const lattice = (x: number, y: number): number =>
    values[(y & TABLE_MASK) * TABLE_SIZE + (x & TABLE_MASK)] ?? 0;

  /**
   * Perlin's quintic fade rather than a smoothstep.
   *
   * Smoothstep is continuous in its first derivative and not its second, and the curl is
   * built from derivatives: at every lattice line the second derivative jumped, the mixed
   * partials stopped cancelling, and a field that is divergence-free on paper measured a
   * divergence of six. This one is smooth to the second derivative, which is exactly the
   * order the identity needs.
   */
  const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

  const at = (x: number, y: number): number => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = fade(x - x0);
    const fy = fade(y - y0);

    const topLeft = lattice(x0, y0);
    const topRight = lattice(x0 + 1, y0);
    const bottomLeft = lattice(x0, y0 + 1);
    const bottomRight = lattice(x0 + 1, y0 + 1);

    const top = topLeft + (topRight - topLeft) * fx;
    const bottom = bottomLeft + (bottomRight - bottomLeft) * fx;
    return top + (bottom - top) * fy;
  };

  /** Two octaves. One is too smooth to read as turbulence, four costs twice for little. */
  const potential = (x: number, y: number): number => at(x, y) + at(x * 2.3, y * 2.3) * 0.5;

  /*
   * The step for the numerical derivative, and it has to be small.
   *
   * The curl of a scalar is divergence-free analytically; a central difference is only as
   * divergence-free as it is accurate. The first version used 0.35 — a third of a lattice
   * cell — and the field it produced had a divergence of six, which is to say it pumped.
   * Small enough here that what is computed is the identity rather than a sketch of it.
   */
  const STEP = 0.002;

  return {
    at,
    curl(x, y, time, out) {
      // The potential is sampled offset by time in one axis and against it in the other,
      // so the whole current slides rather than sitting still and stirring in place.
      const sx = x + time * 0.09;
      const sy = y - time * 0.16;

      const dy = potential(sx, sy + STEP) - potential(sx, sy - STEP);
      const dx = potential(sx + STEP, sy) - potential(sx - STEP, sy);

      // curl of a scalar field: (d/dy, -d/dx). Divergence-free by construction.
      out.x = dy / (2 * STEP);
      out.y = -dx / (2 * STEP);
    },
  };
}
