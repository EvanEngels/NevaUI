import { describe, expect, it } from 'vitest';
import { createRope, DEFAULT_ROPE, ropeLength, ropePath, type RopeSettings } from './rope';

/**
 * The risk in a rope is that it stretches, that it never stops, or that a violent drag
 * turns it into NaN. None of those would be obvious from a screenshot.
 */

const settings = (overrides: Partial<RopeSettings> = {}): RopeSettings => ({
  ...DEFAULT_ROPE,
  ...overrides,
});

const advance = (rope: { step(seconds: number): void }, seconds: number): void => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) rope.step(1 / 60);
};

describe('tether rope', () => {
  it('does not stretch, however hard the end is pulled', () => {
    const config = settings();
    const rope = createRope({ x: 0, y: 0 }, config);
    const slack = config.segmentLength * (config.points - 1);

    // Yank the end far past the rope's own length and hold it there. The hand should
    // stop at full extension rather than the rope stretching to follow it.
    rope.grab({ x: 4000, y: 4000 });
    advance(rope, 2);

    // Position-based constraints are approximate, not exact: a few percent of residual
    // stretch is the price of a fixed pass count, and the guard is set accordingly.
    expect(ropeLength(rope.points())).toBeLessThan(slack * 1.06);
  });

  it('hangs from its anchor and comes to rest', () => {
    const rope = createRope({ x: 100, y: 0 }, settings());

    rope.grab({ x: 400, y: 0 });
    advance(rope, 0.5);
    rope.grab(null);
    advance(rope, 12);

    expect(rope.isAtRest()).toBe(true);

    const points = rope.points();
    const end = points[points.length - 1];
    const anchor = points[0];
    if (end === undefined || anchor === undefined) throw new Error('empty rope');

    // Gravity wins: the free end settles below the anchor, not beside it.
    expect(end.y).toBeGreaterThan(anchor.y);
  });

  it('survives teleporting the grabbed end every frame', () => {
    const rope = createRope({ x: 0, y: 0 }, settings());

    for (let frame = 0; frame < 400; frame += 1) {
      rope.grab({ x: Math.sin(frame) * 9000, y: Math.cos(frame) * 9000 });
      rope.step(0.4);
    }

    for (const point of rope.points()) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    }
  });

  it('describes the rope as a single path string', () => {
    const path = ropePath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);

    expect(path.startsWith('M 0.00 0.00')).toBe(true);
    expect(path).toContain('Q');
    expect(path.split('Q')).toHaveLength(3);
  });
});
