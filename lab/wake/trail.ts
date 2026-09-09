/**
 * A trail of where something has been.
 *
 * The rule the whole component hangs on: a wake is a function of **speed**, not of
 * movement. Something that drifts slowly should leave nothing at all, or every mouse
 * movement on the page smears — which is decoration pretending to be information.
 *
 * A ring buffer of past positions, and an opacity per ghost that comes from how fast the
 * thing was going and how long ago it was there.
 */

export interface Point {
  x: number;
  y: number;
}

export interface TrailSettings {
  /** Number of ghosts. More is a longer trail and more elements to write to. */
  length: number;
  /** Speed, in pixels per second, at which the trail is fully visible. */
  fullSpeed: number;
  /** Speed below which nothing trails at all. */
  quietSpeed: number;
  /** Opacity of the freshest ghost at full speed. */
  strength: number;
}

export const DEFAULT_TRAIL: TrailSettings = {
  length: 12,
  fullSpeed: 2400,
  quietSpeed: 260,
  strength: 0.5,
};

export interface Ghost {
  x: number;
  y: number;
  opacity: number;
}

export interface Trail {
  /** Records where the thing is now, and how fast it got there. */
  push(point: Point, elapsedSeconds: number): void;
  /** The ghosts, freshest first. */
  ghosts(settings: TrailSettings): Ghost[];
  /** Current speed in pixels per second, smoothed. */
  speed(): number;
  resize(length: number): void;
  clear(): void;
}

export function createTrail(length: number): Trail {
  let points: Point[] = Array.from({ length }, () => ({ x: 0, y: 0 }));
  let head = 0;
  let filled = 0;
  let smoothedSpeed = 0;
  let last: Point | null = null;

  return {
    push(point, elapsedSeconds) {
      if (last !== null && elapsedSeconds > 0) {
        const distance = Math.hypot(point.x - last.x, point.y - last.y);
        const instant = distance / elapsedSeconds;
        // Smoothed, because a single slow frame in a fast sweep should not blink the
        // trail out — speed is a property of the movement, not of one frame of it.
        smoothedSpeed += (instant - smoothedSpeed) * 0.25;
      }
      last = { x: point.x, y: point.y };

      const slot = points[head];
      if (slot !== undefined) {
        slot.x = point.x;
        slot.y = point.y;
      }
      head = (head + 1) % points.length;
      filled = Math.min(filled + 1, points.length);
    },

    ghosts(settings) {
      const span = Math.max(1, settings.fullSpeed - settings.quietSpeed);
      const heat = Math.max(0, Math.min(1, (smoothedSpeed - settings.quietSpeed) / span));
      if (heat === 0) return [];

      const out: Ghost[] = [];
      for (let age = 1; age <= filled - 1; age += 1) {
        const index = (head - 1 - age + points.length * 2) % points.length;
        const point = points[index];
        if (point === undefined) continue;
        // Older is fainter, and the whole trail fades together with speed.
        const fade = 1 - age / points.length;
        out.push({ x: point.x, y: point.y, opacity: heat * settings.strength * fade * fade });
      }
      return out;
    },

    speed() {
      return smoothedSpeed;
    },

    resize(next) {
      if (next === points.length) return;
      points = Array.from({ length: Math.max(1, next) }, () => ({ x: 0, y: 0 }));
      head = 0;
      filled = 0;
    },

    clear() {
      head = 0;
      filled = 0;
      smoothedSpeed = 0;
      last = null;
    },
  };
}
