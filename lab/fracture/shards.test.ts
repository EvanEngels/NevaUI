import { describe, expect, it } from 'vitest';
import {
  clipToConvex,
  DEFAULT_FRACTURE,
  fracture,
  polygonArea,
  seededRandom,
  type Point,
} from './shards';

/**
 * Geometry is where this experiment can be wrong without looking wrong in the right
 * file. A missing sliver reads as a rendering glitch; a shard leaking past the edge
 * reads as a CSS bug. Both are caught here instead.
 */

const WIDTH = 640;
const HEIGHT = 360;

const insidePanel = (point: Point): boolean =>
  point.x >= -0.01 && point.x <= WIDTH + 0.01 && point.y >= -0.01 && point.y <= HEIGHT + 0.01;

describe('fracture geometry', () => {
  it('tiles the whole panel and nothing beyond it', () => {
    for (const impact of [
      { x: WIDTH / 2, y: HEIGHT / 2 },
      { x: 12, y: 8 },
      { x: WIDTH - 3, y: HEIGHT - 2 },
    ]) {
      const shards = fracture(WIDTH, HEIGHT, impact, DEFAULT_FRACTURE, seededRandom(7));
      const covered = shards.reduce((total, shard) => total + polygonArea(shard.polygon), 0);

      // Shards must add up to the panel: any shortfall is a hole, any excess an overlap.
      expect(covered).toBeGreaterThan(WIDTH * HEIGHT * 0.995);
      expect(covered).toBeLessThan(WIDTH * HEIGHT * 1.005);

      for (const shard of shards) {
        expect(shard.polygon.length).toBeGreaterThanOrEqual(3);
        for (const point of shard.polygon) expect(insidePanel(point)).toBe(true);
      }
    }
  });

  it('produces the same break twice from the same seed', () => {
    const impact = { x: 200, y: 140 };
    const first = fracture(WIDTH, HEIGHT, impact, DEFAULT_FRACTURE, seededRandom(42));
    const second = fracture(WIDTH, HEIGHT, impact, DEFAULT_FRACTURE, seededRandom(42));

    expect(first.map((shard) => shard.polygon)).toEqual(second.map((shard) => shard.polygon));
  });

  it('points every shard away from the impact', () => {
    const impact = { x: 100, y: 100 };
    const shards = fracture(WIDTH, HEIGHT, impact, DEFAULT_FRACTURE, seededRandom(3));

    for (const shard of shards) {
      if (shard.distance === 0) continue;
      expect(Math.hypot(shard.direction.x, shard.direction.y)).toBeCloseTo(1, 6);

      const towardX = shard.centroid.x - impact.x;
      const towardY = shard.centroid.y - impact.y;
      expect(shard.direction.x * towardX + shard.direction.y * towardY).toBeGreaterThan(0);
    }
  });

  it('produces far fewer shards than the mesh asks for', () => {
    // rays x rings is the polar mesh, not the result: the cells that fall outside the
    // panel are clipped away. The playground printed the mesh size as the shard count and
    // was wrong every time, so the relationship is pinned here.
    const asked = DEFAULT_FRACTURE.rays * DEFAULT_FRACTURE.rings;
    const shards = fracture(
      WIDTH,
      HEIGHT,
      { x: WIDTH / 2, y: HEIGHT / 2 },
      DEFAULT_FRACTURE,
      seededRandom(11)
    );

    expect(shards.length).toBeLessThan(asked);
    expect(shards.length).toBeGreaterThan(asked * 0.2);
  });

  it('leaves a polygon alone when it is already inside the boundary', () => {
    const square = [
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 20, y: 20 },
      { x: 10, y: 20 },
    ];
    const boundary = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];

    expect(polygonArea(clipToConvex(square, boundary))).toBeCloseTo(100, 6);
  });
});
