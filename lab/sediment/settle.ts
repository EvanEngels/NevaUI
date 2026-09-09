/**
 * The spring each item rides back to where it belongs.
 *
 * A list that changes normally animates by transitioning between two layouts. That reads
 * as a slide, and a slide says only that something changed — not what, and not from
 * where. A settle says both: an item that arrives falls into place and the pile takes a
 * moment to absorb it.
 *
 * The mechanics are FLIP. The browser lays the list out, we record where everything
 * ended up, and each item is offset back to where it was and released. Nothing here
 * fights the layout or replaces it; it only borrows the difference.
 *
 * One spring per item, integrated with a fixed timestep. Displacement Field's lattice
 * proved the shape of this: a spring gives both the travel and the arrival from one
 * mechanism, so there is no separate settling animation to keep in agreement.
 */

export interface SettleSettings {
  /** Pull back to the item's place. Higher arrives sooner and overshoots harder. */
  stiffness: number;
  /** Damping. Around 2·sqrt(stiffness) is critical — below it, the item bounces. */
  damping: number;
  /** How much later each item down the list starts moving, in seconds. */
  stagger: number;
  /** Below this displacement and speed, an item counts as arrived. */
  restThreshold: number;
}

export const DEFAULT_SETTLE: SettleSettings = {
  stiffness: 210,
  damping: 22,
  stagger: 0.028,
  restThreshold: 0.05,
};

const TIMESTEP = 1 / 120;
const MAX_SUBSTEPS = 4;

export interface Item {
  /** Current offset from where the layout put it, in pixels. */
  y: number;
  velocity: number;
  /** Seconds still to wait before this item starts moving. */
  delay: number;
}

export interface Settle {
  readonly items: Item[];
  /** Offsets an item and gives it a delay, which is what starts a settle. */
  displace(index: number, offset: number, delay: number): void;
  /** Advances every item. Returns true while any is still moving. */
  step(elapsedSeconds: number, settings: SettleSettings): boolean;
  resize(count: number): void;
  atRest(): boolean;
}

export function createSettle(count: number): Settle {
  let items: Item[] = Array.from({ length: count }, () => ({ y: 0, velocity: 0, delay: 0 }));
  let accumulator = 0;

  const integrate = (settings: SettleSettings): void => {
    for (const item of items) {
      if (item.delay > 0) {
        // Waiting, not moving. A staggered item holds its offset rather than easing from
        // it, so the pile visibly absorbs one item after another.
        item.delay -= TIMESTEP;
        continue;
      }
      const acceleration = -settings.stiffness * item.y - settings.damping * item.velocity;
      item.velocity += acceleration * TIMESTEP;
      item.y += item.velocity * TIMESTEP;
    }
  };

  return {
    get items() {
      return items;
    },

    displace(index, offset, delay) {
      const item = items[index];
      if (item === undefined) return;
      item.y = offset;
      item.velocity = 0;
      item.delay = delay;
    },

    step(elapsedSeconds, settings) {
      accumulator += Math.max(0, elapsedSeconds);
      let substeps = 0;
      while (accumulator >= TIMESTEP && substeps < MAX_SUBSTEPS) {
        integrate(settings);
        accumulator -= TIMESTEP;
        substeps += 1;
      }
      // Dropping the backlog is deliberate: catching up on a minute of springs after a
      // hidden tab is expensive and visually meaningless.
      if (substeps === MAX_SUBSTEPS) accumulator = 0;

      for (const item of items) {
        if (item.delay > 0) return true;
        if (
          Math.abs(item.y) > settings.restThreshold ||
          Math.abs(item.velocity) > settings.restThreshold
        ) {
          return true;
        }
      }

      // Snap the residue away, or the list rests a fraction of a pixel out of place.
      for (const item of items) {
        item.y = 0;
        item.velocity = 0;
      }
      return false;
    },

    resize(next) {
      if (next === items.length) return;
      const grown = Array.from({ length: next }, (_, index) => items[index]);
      items = grown.map((item) => item ?? { y: 0, velocity: 0, delay: 0 });
    },

    atRest() {
      return items.every((item) => item.y === 0 && item.velocity === 0 && item.delay <= 0);
    },
  };
}
