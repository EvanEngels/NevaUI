/**
 * Tether physics — an inextensible line with mass.
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
  /** Distance between two consecutive points, in pixels. */
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
  /** Extra mass at the free end, expressed as a multiplier on its inertia. */
  bobMass: number;
}

export const DEFAULT_ROPE: RopeSettings = {
  points: 26,
  segmentLength: 13,
  gravity: 2600,
  retention: 0.985,
  passes: 14,
  bobMass: 3,
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
  /** Pins the free end to a point, or releases it when given null. */
  grab(point: Point | null): void;
  /** Moves the anchor, which is pinned at all times. */
  moveAnchor(point: Point): void;
  points(): readonly Point[];
  isAtRest(): boolean;
  settings: RopeSettings;
}

export function createRope(anchor: Point, settings: RopeSettings): Rope {
  const nodes: Node[] = Array.from({ length: Math.max(2, settings.points) }, (_, index) => ({
    x: anchor.x,
    y: anchor.y + index * settings.segmentLength,
    previousX: anchor.x,
    previousY: anchor.y + index * settings.segmentLength,
    pinned: index === 0,
    inverseMass: index === 0 ? 0 : 1,
  }));

  const last = nodes[nodes.length - 1];
  if (last !== undefined) last.inverseMass = 1 / settings.bobMass;

  let held: Point | null = null;
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

  /** How far the free end can possibly get from the anchor. */
  const reach = (nodes.length - 1) * settings.segmentLength;

  const applyPins = (): void => {
    const anchor = nodes[0];
    const end = nodes[nodes.length - 1];
    if (anchor === undefined || end === undefined) return;

    end.pinned = held !== null;
    if (held === null) return;

    // Pinning both ends further apart than the rope is long is not a solvable
    // constraint, and letting the solver fail there is what makes a rope look like
    // elastic. So the hand is what gives: past full extension the end stops following
    // the pointer and the rope goes taut. You feel the limit, which is the point.
    const towardX = held.x - anchor.x;
    const towardY = held.y - anchor.y;
    const distance = Math.hypot(towardX, towardY);
    const scale = distance > reach && distance > 0 ? reach / distance : 1;

    end.x = anchor.x + towardX * scale;
    end.y = anchor.y + towardY * scale;
    end.previousX = end.x;
    end.previousY = end.y;
  };

  return {
    settings,

    step(elapsedSeconds) {
      accumulator += Math.max(0, elapsedSeconds);
      let substeps = 0;
      while (accumulator >= TIMESTEP && substeps < MAX_SUBSTEPS) {
        applyPins();
        integrate();
        accumulator -= TIMESTEP;
        substeps += 1;
      }
      if (substeps === MAX_SUBSTEPS) accumulator = 0;
    },

    grab(point) {
      held = point;
      applyPins();
    },

    moveAnchor(point) {
      const first = nodes[0];
      if (first === undefined) return;
      first.x = point.x;
      first.y = point.y;
      first.previousX = point.x;
      first.previousY = point.y;
    },

    points() {
      return nodes.map((node) => ({ x: node.x, y: node.y }));
    },

    isAtRest() {
      if (held !== null) return false;
      return nodes.every(
        (node) =>
          Math.hypot(node.x - node.previousX, node.y - node.previousY) < REST_SPEED * TIMESTEP
      );
    },
  };
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
