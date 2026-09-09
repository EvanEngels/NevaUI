/**
 * Displacement field physics — see docs/concepts/displacement-field.md
 *
 * No DOM, no React: this is the part that carries the logic risk, so it is testable
 * on its own. Positions are stored as displacements from rest, which makes the
 * neighbour term collapse to a difference of displacements (the rest separation
 * cancels out).
 */

export interface FieldSettings {
  /** Reach of the pointer, in pixels. */
  radius: number;
  /** Strength of the pointer force. */
  intensity: number;
  /** Damping. Higher values kill motion faster. */
  resistance: number;
  /** Mass of a single element. */
  mass: number;
  /** Neighbour coupling. Zero disables propagation — this is the control mode. */
  linkStiffness: number;
  /** Pull back to rest. This is what guarantees the field returns home. */
  anchorStiffness: number;
  /** Hard limit on displacement, so a bad configuration stiffens instead of exploding. */
  maxDisplacement: number;
}

/**
 * Measured in the Lab, not guessed — see docs/lab/displacement-field.md.
 *
 * anchorStiffness / linkStiffness = 0.2 is the compromise: on a 16x27 grid the cell two
 * steps from the pointer still carries ~76% of the peak displacement, the one four steps
 * away ~21%, and the field comes home in ~0.95 s. Lowering the ratio reaches further and
 * settles visibly slower; no setting does both.
 *
 * `intensity` is the one value that does NOT transfer between layouts: it was calibrated
 * for a grid spaced ~56px, and the same number produced a third of the displacement on a
 * chain spaced 50px. A density-independent formulation is an open question.
 */
export const DEFAULT_SETTINGS: FieldSettings = {
  radius: 180,
  intensity: 74000,
  resistance: 19.7,
  mass: 1,
  linkStiffness: 600,
  anchorStiffness: 120,
  maxDisplacement: 80,
};

export interface Point {
  x: number;
  y: number;
}

interface Node {
  readonly restX: number;
  readonly restY: number;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
  /** Direct references, not indices: no index access means no unchecked lookups. */
  neighbours: Node[];
  /** Force accumulated during the current substep. */
  fx: number;
  fy: number;
}

/**
 * Fixed timestep. Explicit spring integration is only stable while
 * h < ~2*sqrt(m/k), so it must not follow the display refresh rate.
 */
const TIMESTEP = 1 / 120;

/** Caps catch-up work after a backgrounded tab, which would otherwise spiral. */
const MAX_SUBSTEPS = 4;

/** Below this displacement (px) and velocity (px/s), the field counts as settled. */
const REST_DISPLACEMENT = 0.01;
const REST_VELOCITY = 0.01;

export interface Field {
  /** Advance the simulation by real elapsed seconds. */
  step(elapsedSeconds: number): void;
  /** Pointer position in the same space as the rest positions, or null when absent. */
  setPointer(pointer: Point | null): void;
  /** Current displacement of each element, in source order. Allocates: tests only. */
  displacements(): readonly Point[];
  /** Allocation-free read, for the render loop. */
  each(visit: (index: number, dx: number, dy: number) => void): void;
  /** True when nothing is moving and nothing is displaced: the loop can stop. */
  isAtRest(): boolean;
  settings: FieldSettings;
}

/**
 * Builds a field over a regular grid. Neighbours are the four orthogonal cells:
 * whether diagonals change the feeling is an open question for this Lab.
 */
export function createField(
  restPositions: readonly Point[],
  columns: number,
  settings: FieldSettings
): Field {
  const nodes: Node[] = restPositions.map((position) => ({
    restX: position.x,
    restY: position.y,
    dx: 0,
    dy: 0,
    vx: 0,
    vy: 0,
    neighbours: [],
    fx: 0,
    fy: 0,
  }));

  linkOrthogonalNeighbours(nodes, columns);

  let pointer: Point | null = null;
  let accumulator = 0;

  const integrate = (): void => {
    const { radius, intensity, resistance, mass, linkStiffness, anchorStiffness } = settings;

    for (const node of nodes) {
      let fx = 0;
      let fy = 0;

      if (pointer !== null && radius > 0) {
        // Distance is measured from the rest position on purpose. Using the current
        // position feeds displacement back into the force and makes elements oscillate
        // into the pointer instead of away from it.
        const awayX = node.restX - pointer.x;
        const awayY = node.restY - pointer.y;
        const distance = Math.hypot(awayX, awayY);

        if (distance > 0 && distance < radius) {
          const falloff = (1 - distance / radius) ** 2;
          const push = (intensity * falloff) / distance;
          fx += awayX * push;
          fy += awayY * push;
        }
      }

      // Deviation spring, not a distance constraint: zero at rest, linear, and free of
      // square roots and division by zero.
      for (const neighbour of node.neighbours) {
        fx += linkStiffness * (neighbour.dx - node.dx);
        fy += linkStiffness * (neighbour.dy - node.dy);
      }

      fx += -anchorStiffness * node.dx - resistance * node.vx;
      fy += -anchorStiffness * node.dy - resistance * node.vy;

      node.fx = fx;
      node.fy = fy;
    }

    // Forces are applied only after every node has read its neighbours, so the result
    // does not depend on iteration order.
    for (const node of nodes) {
      node.vx += (node.fx / mass) * TIMESTEP;
      node.vy += (node.fy / mass) * TIMESTEP;
      node.dx = clamp(node.dx + node.vx * TIMESTEP, settings.maxDisplacement);
      node.dy = clamp(node.dy + node.vy * TIMESTEP, settings.maxDisplacement);
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

      // Dropping the backlog is deliberate: catching up on minutes of simulation after
      // a hidden tab is both expensive and visually meaningless.
      if (substeps === MAX_SUBSTEPS) {
        accumulator = 0;
      }
    },

    setPointer(next) {
      pointer = next;
    },

    displacements() {
      return nodes.map((node) => ({ x: node.dx, y: node.dy }));
    },

    each(visit) {
      // Called every frame for every element, so it must not allocate.
      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        if (node !== undefined) visit(index, node.dx, node.dy);
      }
    },

    isAtRest() {
      if (pointer !== null) return false;

      return nodes.every(
        (node) =>
          Math.abs(node.dx) < REST_DISPLACEMENT &&
          Math.abs(node.dy) < REST_DISPLACEMENT &&
          Math.abs(node.vx) < REST_VELOCITY &&
          Math.abs(node.vy) < REST_VELOCITY
      );
    },
  };
}

function linkOrthogonalNeighbours(nodes: readonly Node[], columns: number): void {
  if (columns <= 0) return;

  nodes.forEach((node, index) => {
    const column = index % columns;

    const left = column > 0 ? nodes[index - 1] : undefined;
    const right = column < columns - 1 ? nodes[index + 1] : undefined;
    const above = nodes[index - columns];
    const below = nodes[index + columns];

    node.neighbours = [left, right, above, below].filter(
      (neighbour): neighbour is Node => neighbour !== undefined
    );
  });
}

function clamp(value: number, limit: number): number {
  return Math.min(limit, Math.max(-limit, value));
}
