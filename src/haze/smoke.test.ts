import { describe, expect, it } from 'vitest';
import { createNoise } from './noise';
import { createSmoke, DEFAULT_SMOKE, type SmokeSettings } from './smoke';

/**
 * Smoke is judged by looking at it, so what is tested here is the handful of properties
 * that make looking at it worthwhile: that the current does not invent or swallow
 * material, that advection cannot run away, that a wipe actually thins and then closes,
 * and that the whole thing eventually stops asking for frames.
 */

const settings = (overrides: Partial<SmokeSettings> = {}): SmokeSettings => ({
  ...DEFAULT_SMOKE,
  ...overrides,
});

describe('curl noise', () => {
  it('has orders of magnitude less divergence than a field built by hand', () => {
    const noise = createNoise(9);
    const step = 0.01;

    const divergenceOf = (
      field: (x: number, y: number, out: { x: number; y: number }) => void
    ): number => {
      let worst = 0;
      const right = { x: 0, y: 0 };
      const left = { x: 0, y: 0 };
      const below = { x: 0, y: 0 };
      const above = { x: 0, y: 0 };

      for (let n = 0; n < 200; n += 1) {
        const x = n * 0.37;
        const y = n * 0.71;
        field(x + step, y, right);
        field(x - step, y, left);
        field(x, y + step, below);
        field(x, y - step, above);
        worst = Math.max(
          worst,
          Math.abs((right.x - left.x) / (2 * step) + (below.y - above.y) / (2 * step))
        );
      }
      return worst;
    };

    const curl = divergenceOf((x, y, out) => {
      noise.curl(x, y, 0, out);
    });

    // The control: two independent noise samples as a velocity, which is the obvious way
    // to make a swirling field and the reason fluid solvers spend half their time
    // projecting divergence out of one.
    const byHand = divergenceOf((x, y, out) => {
      out.x = noise.at(x, y);
      out.y = noise.at(x + 37.7, y + 11.3);
    });

    // Measured at roughly eighty times smaller. What is left in the curl is the residue
    // of a central difference on an interpolated lattice, not a leak — the identity
    // holds, the arithmetic is approximate. The margin is set well below the measurement
    // so the test survives a different seed rather than pinning today's number.
    expect(curl).toBeLessThan(byHand / 20);
  });

  it('repeats exactly for a seed', () => {
    const a = createNoise(4);
    const b = createNoise(4);
    expect(a.at(3.2, 1.7)).toBe(b.at(3.2, 1.7));
    expect(a.at(3.2, 1.7)).not.toBe(createNoise(5).at(3.2, 1.7));
  });
});

describe('smoke', () => {
  it('keeps density in range however long it runs', () => {
    const smoke = createSmoke(40, 26, 3);
    smoke.fill(DEFAULT_SMOKE.density);

    for (let frame = 0; frame < 600; frame += 1) smoke.step(1 / 60, settings());

    // Advection that samples where it should not, or a current that pumps, shows up here
    // long before it shows up on screen.
    for (const value of smoke.density) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(-0.001);
      expect(value).toBeLessThanOrEqual(1.001);
    }
  });

  it('holds its resting level rather than draining or filling', () => {
    const smoke = createSmoke(40, 26, 3);
    smoke.fill(DEFAULT_SMOKE.density);

    for (let frame = 0; frame < 600; frame += 1) smoke.step(1 / 60, settings());

    // The target is uneven, so the average is what holds, not each cell.
    expect(smoke.average()).toBeCloseTo(DEFAULT_SMOKE.density, 1);
  });

  it('thins where it is wiped, and closes over again', () => {
    const smoke = createSmoke(40, 26, 3);
    smoke.fill(DEFAULT_SMOKE.density);
    smoke.step(1 / 60, settings());

    smoke.wipe(20, 13, 6, 1);
    const wiped = smoke.density[13 * 40 + 20] ?? 1;
    expect(wiped).toBeLessThan(0.1);

    for (let frame = 0; frame < 240; frame += 1) smoke.step(1 / 60, settings());

    expect(smoke.density[13 * 40 + 20] ?? 0).toBeGreaterThan(DEFAULT_SMOKE.density * 0.7);
  });

  it('keeps moving, and says so', () => {
    const smoke = createSmoke(40, 26, 3);
    smoke.fill(DEFAULT_SMOKE.density);

    // Smoke that drifts has no rest, and the component has to know that rather than
    // discover it: this is the one experiment here whose loop cannot stop on its own.
    let stillMoving = true;
    for (let frame = 0; frame < 600; frame += 1) stillMoving = smoke.step(1 / 60, settings());

    expect(stillMoving).toBe(true);
  });

  it('does come to rest when the current is turned off', () => {
    const smoke = createSmoke(40, 26, 3);
    smoke.fill(DEFAULT_SMOKE.density);

    // A caller who wants still smoke gets a loop that ends, which is what makes the
    // restless flag worth returning at all.
    let moving = true;
    for (let frame = 0; frame < 3000 && moving; frame += 1) {
      moving = smoke.step(1 / 60, settings({ flow: 0, variation: 0 }));
    }

    expect(moving).toBe(false);
  });

  it('ignores a gap that means the tab was hidden', () => {
    const jumped = createSmoke(30, 20, 3);
    const stepped = createSmoke(30, 20, 3);
    jumped.fill(0.5);
    stepped.fill(0.5);

    jumped.step(10, settings());
    stepped.step(1 / 20, settings());

    expect(jumped.average()).toBeCloseTo(stepped.average(), 6);
  });
});
