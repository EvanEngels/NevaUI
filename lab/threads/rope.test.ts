import { describe, expect, it } from 'vitest';
import {
  createRope,
  DEFAULT_ROPE,
  ropeLength,
  ropePath,
  segmentFor,
  type RopeSettings,
} from './rope';

/**
 * The rope came back from the archive with one end changed into two, so what is tested is
 * what that changed: that it still cannot stretch, that it sags between its ends rather
 * than cutting straight across, and that shortening it is what pulls it taut.
 */

const settings = (overrides: Partial<RopeSettings> = {}): RopeSettings => ({
  ...DEFAULT_ROPE,
  ...overrides,
});

const advance = (rope: { step(seconds: number): void }, seconds: number): void => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) rope.step(1 / 60);
};

const sag = (points: readonly { x: number; y: number }[]): number => {
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return 0;
  let lowest = -Infinity;
  for (const point of points) lowest = Math.max(lowest, point.y);
  return lowest - Math.max(first.y, last.y);
};

describe('thread rope', () => {
  it('takes its length from the gap it has to cross', () => {
    // A tether defended a fixed length because one end was in your hand and could give. A
    // thread's ends both belong to elements, so a fixed length that is too short is an
    // unsolvable constraint and the solver stretches it like elastic. Length follows the
    // layout; slack is what the thread keeps.
    const from = { x: 0, y: 0 };
    const to = { x: 900, y: 0 };
    const points = DEFAULT_ROPE.points;
    const rope = createRope(
      from,
      to,
      settings({ segmentLength: segmentFor(from, to, 1.15, points) })
    );

    advance(rope, 3);

    const length = ropeLength(rope.points());
    expect(length).toBeGreaterThan(900);
    expect(length).toBeLessThan(900 * 1.2);
  });

  it('sags between two ends at the same height', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 120, y: 0 };
    const rope = createRope(
      from,
      to,
      settings({ segmentLength: segmentFor(from, to, 1.35, DEFAULT_ROPE.points) })
    );
    advance(rope, 3);

    // A thread that cut straight across would be a line, and a line needs no solver.
    expect(sag(rope.points())).toBeGreaterThan(10);
  });

  it('tightens when its slack is reduced', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 150, y: 0 };
    const points = DEFAULT_ROPE.points;

    const loose = createRope(
      from,
      to,
      settings({ segmentLength: segmentFor(from, to, 1.3, points) })
    );
    const taut = createRope(
      from,
      to,
      settings({ segmentLength: segmentFor(from, to, 1.01, points) })
    );
    advance(loose, 3);
    advance(taut, 3);

    // Reducing slack is the whole of what highlighting a link does.
    expect(sag(taut.points())).toBeLessThan(sag(loose.points()));
  });

  it('follows its ends when they move', () => {
    const rope = createRope({ x: 0, y: 0 }, { x: 100, y: 0 }, settings());
    advance(rope, 1);

    rope.span({ x: 40, y: 60 }, { x: 240, y: 60 });
    rope.step(1 / 60);

    const points = rope.points();
    expect(points[0]).toEqual({ x: 40, y: 60 });
    expect(points[points.length - 1]).toEqual({ x: 240, y: 60 });
  });

  it('comes to rest', () => {
    const rope = createRope({ x: 0, y: 0 }, { x: 200, y: 40 }, settings());

    let settled = -1;
    for (let frame = 0; frame < 1200; frame += 1) {
      rope.step(1 / 60);
      if (rope.isAtRest()) {
        settled = frame;
        break;
      }
    }

    expect(settled).toBeGreaterThan(0);
  });

  it('describes itself as a single path string', () => {
    const path = ropePath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);

    expect(path.startsWith('M 0.00 0.00')).toBe(true);
    expect(path.split('Q')).toHaveLength(3);
  });
});
