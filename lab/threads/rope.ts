/**
 * Rope physics — an inextensible line with mass.
 *
 * Restored from the archived Tether experiment, which was put away because nothing
 * answered the question its Spark asked: what is it for. Threads is the answer, so the
 * code comes back with it. The archive note said this is where to look; this is that.
 *
 * Changed for its new purpose: both ends are held, at the two elements a link joins,
 * rather than one end being dragged. Rest length is adjustable, because tightening a
 * thread is shortening it.
 *
 * The Displacement Field uses springs because it wants a material that gives. A rope
 * wants the opposite: it must not stretch. Length is a *constraint*, not a force, and
 * solving it with a stiff spring is exactly the case where explicit integration blows
 * up. So this uses Verlet integration with position constraints, which is stable at any
 * stiffness because it never integrates a force at all — it moves points and lets the
 * velocity fall out of the difference between frames.
 *
 * Different problem, different tool. That is the whole reason both files exist.
 */

export interface Point {
  x: number;
  y: number;
}

export interface RopeSettings {
  /** Number of points. More points means a smoother curve and a slower solve. */
  points: number;
  /**
   * Distance between two consecutive points, in pixels — the rope's own length divided
   * up. Shortening it is what pulls a thread taut, and it is the only thing that changes
   * when a link is highlighted.
   */
  segmentLength: number;
  /** Downward acceleration, in pixels per second squared. */
  gravity: number;
  /** Velocity kept from one step to the next. Below 1 the rope loses energy. */
  retention: number;
  /**
   * Constraint passes per step. One pass leaves the rope rubbery; more passes make it
   * rigid. This is the honest knob of a position-based solver.
   */
  passes: number;
  /** Kept from Tether, where the free end carried a weight. A thread has no free end. */
  bobMass: number;
}

export const DEFAULT_ROPE: RopeSettings = {
  points: 18,
  segmentLength: 13,
  gravity: 1400,
  retention: 0.972,
  passes: 12,
  bobMass: 1,
};

interface Node {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  pinned: boolean;
  /** Inverse mass: 0 means immovable, and a heavier node moves less per constraint. */
  inverseMass: number;
}

const TIMESTEP = 1 / 120;
const MAX_SUBSTEPS = 4;
const REST_SPEED = 0.4;

export interface Rope {
  step(elapsedSeconds: number): void;
  /** Moves both held ends. Both are pinned at all times. */
  span(from: Point, to: Point): void;
  points(): readonly Point[];
  isAtRest(): boolean;
  settings: RopeSettings;
}

export function createRope(from: Point, to: Point, settings: RopeSettings): Rope {
  const count = Math.max(2, settings.points);
  const nodes: Node[] = Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1);
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    return {
      x,
      y,
      previousX: x,
      previousY: y,
      pinned: index === 0 || index === count - 1,
      inverseMass: index === 0 || index === count - 1 ? 0 : 1,
    };
  });

  let accumulator = 0;

  const integrate = (): void => {
    for (const node of nodes) {
      if (node.pinned) continue;

      // Verlet: the previous position carries the velocity, so there is nothing to
      // diverge. `retention` below 1 bleeds energy the way air does.
      const velocityX = (node.x - node.previousX) * settings.retention;
      const velocityY = (node.y - node.previousY) * settings.retention;

      node.previousX = node.x;
      node.previousY = node.y;
      node.x += velocityX;
      node.y += velocityY + settings.gravity * TIMESTEP * TIMESTEP;
    }

    for (let pass = 0; pass < settings.passes; pass += 1) {
      for (let index = 0; index < nodes.length - 1; index += 1) {
        const a = nodes[index];
        const b = nodes[index + 1];
        if (a === undefined || b === undefined) continue;

        const deltaX = b.x - a.x;
        const deltaY = b.y - a.y;
        const distance = Math.hypot(deltaX, deltaY);
        if (distance === 0) continue;

        const share = a.inverseMass + b.inverseMass;
        if (share === 0) continue;

        // Move both ends towards the rest length, each by its share of the mobility.
        const correction = (distance - settings.segmentLength) / distance;
        const offsetX = deltaX * correction;
        const offsetY = deltaY * correction;

        a.x += (offsetX * a.inverseMass) / share;
        a.y += (offsetY * a.inverseMass) / share;
        b.x -= (offsetX * b.inverseMass) / share;
        b.y -= (offsetY * b.inverseMass) / share;
      }
    }
  };

  return {
    settings,

    step(elapsedSeconds) {
      accumulator += Math.max(0, elapsedSeconds);
      let substeps = 0;
      while (accumulator >= TIMESTEP && substeps < MAX_SUBSTEPS) {
        integrate();
        accumulator -= TIMESTEP;
        substeps += 1;
      }
      if (substeps === MAX_SUBSTEPS) accumulator = 0;
    },

    span(nextFrom, nextTo) {
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (first === undefined || last === undefined) return;
      first.x = nextFrom.x;
      first.y = nextFrom.y;
      first.previousX = nextFrom.x;
      first.previousY = nextFrom.y;
      last.x = nextTo.x;
      last.y = nextTo.y;
      last.previousX = nextTo.x;
      last.previousY = nextTo.y;
    },

    points() {
      return nodes.map((node) => ({ x: node.x, y: node.y }));
    },

    isAtRest() {
      return nodes.every(
        (node) =>
          Math.hypot(node.x - node.previousX, node.y - node.previousY) < REST_SPEED * TIMESTEP
      );
    },
  };
}

/**
 * The segment length a thread should use to span a gap with a given amount of slack.
 *
 * A tether had one end held and one end in your hand, so when you pulled past its length
 * the hand could give. A thread has both ends held by elements, and neither can give: ask
 * for a rope shorter than the gap and the constraint is unsolvable, the solver does its
 * best, and the thread stretches like elastic.
 *
 * So a thread's length is not a constant it defends — it is derived from the gap it has
 * to cross. What it keeps is the **slack**: 1 is a straight line, 1.2 hangs noticeably.
 * Tightening a thread is lowering that number, not shortening a fixed rope.
 */
export function segmentFor(from: Point, to: Point, slack: number, points: number): number {
  const span = Math.hypot(to.x - from.x, to.y - from.y);
  return (span * Math.max(1, slack)) / Math.max(1, points - 1);
}

/** Total length of the polyline, used to check the rope has not stretched. */
export function ropeLength(points: readonly Point[]): number {
  let total = 0;
  let previous: Point | null = null;
  for (const point of points) {
    if (previous !== null) total += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return total;
}

/**
 * A smooth path through the points, as one SVG `d` string.
 *
 * The whole rope is a single attribute write per frame, whatever the point count: the
 * browser interpolates the curve, not JavaScript.
 */
export function ropePath(points: readonly Point[]): string {
  const [first, ...rest] = points;
  if (first === undefined) return '';

  let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  let previous = first;

  for (const point of rest) {
    const midX = (previous.x + point.x) / 2;
    const midY = (previous.y + point.y) / 2;
    path += ` Q ${previous.x.toFixed(2)} ${previous.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;
    previous = point;
  }

  path += ` L ${previous.x.toFixed(2)} ${previous.y.toFixed(2)}`;
  return path;
}
