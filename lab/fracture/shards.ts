/**
 * Fracture geometry.
 *
 * A radial break: rays out from the impact point, rings around it, and a shard for every
 * cell of that polar mesh. The mesh is then clipped to the panel, because rays and rings
 * do not stop at corners and a shard that leaks outside the panel is a visible seam.
 *
 * All of it is pure: no DOM, no time, no randomness that is not passed in. That matters
 * because geometry is where this experiment can be silently wrong — a shard with three
 * identical vertices, or a gap between two shards, looks like a rendering bug and gets
 * chased in the wrong file.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Shard {
  /** Polygon in panel coordinates, clockwise, already clipped to the panel. */
  polygon: Point[];
  centroid: Point;
  /** Distance from the impact point to the centroid, in pixels. */
  distance: number;
  /** Direction from the impact point to the centroid, as a unit vector. */
  direction: Point;
}

export interface FractureSettings {
  /** Number of rays leaving the impact point. */
  rays: number;
  /** Number of rings around it. The outermost is pushed past the far corner. */
  rings: number;
  /** How irregular the break is, from 0 (a perfect fan) to 1 (very jagged). */
  irregularity: number;
}

export const DEFAULT_FRACTURE: FractureSettings = {
  rays: 13,
  rings: 4,
  irregularity: 0.55,
};

/** Deterministic noise, so a fracture can be reproduced and tested. */
export function seededRandom(seed: number): () => number {
  let state = (seed || 1) >>> 0;
  return () => {
    // xorshift32: small, fast, and good enough for jitter.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

export function fracture(
  width: number,
  height: number,
  impact: Point,
  settings: FractureSettings,
  random: () => number
): Shard[] {
  const rays = Math.max(3, Math.round(settings.rays));
  const rings = Math.max(1, Math.round(settings.rings));

  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  const reach = Math.max(
    ...corners.map((corner) => Math.hypot(corner.x - impact.x, corner.y - impact.y))
  );

  const jitter = (amount: number): number =>
    1 + (random() - 0.5) * 2 * settings.irregularity * amount;

  const angles = Array.from({ length: rays }, (_, index) => {
    const base = (index / rays) * Math.PI * 2;
    return base + ((random() - 0.5) * Math.PI * 2 * settings.irregularity) / rays;
  });

  // The last ring is pushed past the furthest corner so the mesh always covers the panel.
  const radii = Array.from({ length: rings + 1 }, (_, index) => {
    if (index === 0) return 0;
    if (index === rings) return reach * 1.35;
    return (reach * (index / rings)) ** 1.15 * jitter(0.35);
  });

  const panel = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];

  const shards: Shard[] = [];

  for (let ring = 0; ring < rings; ring += 1) {
    for (let ray = 0; ray < rays; ray += 1) {
      const inner = radii[ring] ?? 0;
      const outer = radii[ring + 1] ?? 0;
      const angleA = angles[ray] ?? 0;
      const angleB = angles[(ray + 1) % rays] ?? 0;
      // The wrapped-around angle must keep increasing or the quad folds on itself.
      const sweepB = angleB > angleA ? angleB : angleB + Math.PI * 2;

      const at = (radius: number, angle: number): Point => ({
        x: impact.x + Math.cos(angle) * radius,
        y: impact.y + Math.sin(angle) * radius,
      });

      const raw =
        inner === 0
          ? [impact, at(outer, angleA), at(outer, sweepB)]
          : [at(inner, angleA), at(outer, angleA), at(outer, sweepB), at(inner, sweepB)];

      const polygon = clipToConvex(raw, panel);
      if (polygon.length < 3) continue;

      const centroid = centroidOf(polygon);
      const toCentroidX = centroid.x - impact.x;
      const toCentroidY = centroid.y - impact.y;
      const distance = Math.hypot(toCentroidX, toCentroidY);

      shards.push({
        polygon,
        centroid,
        distance,
        direction:
          distance === 0
            ? { x: 0, y: 0 }
            : { x: toCentroidX / distance, y: toCentroidY / distance },
      });
    }
  }

  return shards;
}

/**
 * Sutherland–Hodgman: clips a polygon against every edge of a convex boundary in turn.
 * Chosen over a general polygon-clipping library because the boundary here is always a
 * rectangle, and forty lines of arithmetic beat a dependency for that.
 */
export function clipToConvex(polygon: readonly Point[], boundary: readonly Point[]): Point[] {
  let output = [...polygon];

  for (let index = 0; index < boundary.length; index += 1) {
    const edgeStart = boundary[index];
    const edgeEnd = boundary[(index + 1) % boundary.length];
    if (edgeStart === undefined || edgeEnd === undefined) continue;

    const input = output;
    output = [];
    if (input.length === 0) break;

    const inside = (point: Point): boolean =>
      (edgeEnd.x - edgeStart.x) * (point.y - edgeStart.y) -
        (edgeEnd.y - edgeStart.y) * (point.x - edgeStart.x) >=
      -1e-9;

    let previous = input[input.length - 1];
    for (const current of input) {
      if (previous === undefined) break;
      const currentInside = inside(current);
      const previousInside = inside(previous);

      if (currentInside) {
        if (!previousInside) output.push(intersect(previous, current, edgeStart, edgeEnd));
        output.push(current);
      } else if (previousInside) {
        output.push(intersect(previous, current, edgeStart, edgeEnd));
      }
      previous = current;
    }
  }

  return output;
}

function intersect(a: Point, b: Point, edgeStart: Point, edgeEnd: Point): Point {
  const segmentX = b.x - a.x;
  const segmentY = b.y - a.y;
  const edgeX = edgeEnd.x - edgeStart.x;
  const edgeY = edgeEnd.y - edgeStart.y;

  const denominator = edgeX * segmentY - edgeY * segmentX;
  if (denominator === 0) return { x: b.x, y: b.y };

  const t = (edgeX * (a.y - edgeStart.y) - edgeY * (a.x - edgeStart.x)) / denominator;
  return { x: a.x - segmentX * t, y: a.y - segmentY * t };
}

export function polygonArea(polygon: readonly Point[]): number {
  let twice = 0;
  let previous = polygon[polygon.length - 1];
  for (const current of polygon) {
    if (previous === undefined) break;
    twice += previous.x * current.y - current.x * previous.y;
    previous = current;
  }
  return Math.abs(twice) / 2;
}

function centroidOf(polygon: readonly Point[]): Point {
  let x = 0;
  let y = 0;
  for (const point of polygon) {
    x += point.x;
    y += point.y;
  }
  const count = polygon.length || 1;
  return { x: x / count, y: y / count };
}

/** `clip-path: polygon(...)` for one shard, in percentages of the panel. */
export function clipPathOf(shard: Shard, width: number, height: number): string {
  const points = shard.polygon
    .map(
      (point) =>
        `${((point.x / width) * 100).toFixed(3)}% ${((point.y / height) * 100).toFixed(3)}%`
    )
    .join(', ');
  return `polygon(${points})`;
}
