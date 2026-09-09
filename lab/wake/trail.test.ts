import { describe, expect, it } from 'vitest';
import { createTrail, DEFAULT_TRAIL, type TrailSettings } from './trail';

/**
 * The claim is that a wake means speed rather than movement. If a slow drag leaves a
 * trail, the component is smearing the page for no reason and nothing on screen says so
 * — it just looks like a style.
 */

const settings = (overrides: Partial<TrailSettings> = {}): TrailSettings => ({
  ...DEFAULT_TRAIL,
  ...overrides,
});

const sweep = (trail: ReturnType<typeof createTrail>, pixelsPerFrame: number, frames = 30) => {
  for (let frame = 0; frame < frames; frame += 1) {
    trail.push({ x: frame * pixelsPerFrame, y: 0 }, 1 / 60);
  }
};

describe('trail', () => {
  it('leaves nothing behind a slow movement', () => {
    const trail = createTrail(DEFAULT_TRAIL.length);
    // 2px a frame is 120px a second: a considered drag, not a flick.
    sweep(trail, 2);

    expect(trail.ghosts(settings())).toHaveLength(0);
  });

  it('leaves a trail behind a fast one', () => {
    const trail = createTrail(DEFAULT_TRAIL.length);
    sweep(trail, 50);

    const ghosts = trail.ghosts(settings());
    expect(ghosts.length).toBeGreaterThan(5);
    expect(ghosts[0]?.opacity ?? 0).toBeGreaterThan(0);
  });

  it('fades with age', () => {
    const trail = createTrail(DEFAULT_TRAIL.length);
    sweep(trail, 50);

    const ghosts = trail.ghosts(settings());
    for (let index = 1; index < ghosts.length; index += 1) {
      expect(ghosts[index]?.opacity ?? 1).toBeLessThan(ghosts[index - 1]?.opacity ?? 0);
    }
  });

  it('does not blink out on a single slow frame in a fast sweep', () => {
    const trail = createTrail(DEFAULT_TRAIL.length);
    sweep(trail, 50);
    const before = trail.ghosts(settings()).length;

    // One stalled frame in the middle of a flick. Speed is a property of the movement.
    trail.push({ x: 1500, y: 0 }, 1 / 60);
    trail.push({ x: 1500.2, y: 0 }, 1 / 60);

    expect(trail.ghosts(settings()).length).toBeGreaterThanOrEqual(before - 1);
  });

  it('never reports a ghost it has not recorded', () => {
    const trail = createTrail(20);
    trail.push({ x: 0, y: 0 }, 1 / 60);
    trail.push({ x: 90, y: 0 }, 1 / 60);

    // Two points, so at most one ghost — not nineteen at the origin.
    expect(trail.ghosts(settings()).length).toBeLessThanOrEqual(1);
  });
});
