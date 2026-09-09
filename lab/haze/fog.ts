/**
 * The fog itself: a texture, and the rules for wearing it away.
 *
 * Nothing here simulates smoke. A fluid solver would be the obvious reach and the wrong
 * one — what the gesture needs is a surface that thins where it has been touched and
 * closes again when it has not, which is two operations on an alpha channel and no
 * physics at all.
 *
 * The texture is built once. Wiping and healing are the only things that happen per
 * frame, and both are compositing operations the browser already does well.
 */

export interface HazeSettings {
  /** Radius of the wipe, in pixels. */
  brush: number;
  /** Softness of the brush edge, 0 hard to 1 fully feathered. */
  feather: number;
  /**
   * How quickly the fog closes back over, as the alpha added per second. Zero leaves a
   * permanent hole, which is a different component.
   */
  healRate: number;
  /** Opacity of untouched fog. Above roughly 0.8 the content beneath stops being legible. */
  density: number;
  /** Scale of the largest blobs in the texture, in pixels. */
  grain: number;
}

export const DEFAULT_HAZE: HazeSettings = {
  brush: 78,
  feather: 0.75,
  healRate: 0.22,
  density: 0.72,
  grain: 130,
};

/**
 * Builds a fog texture on its own canvas.
 *
 * Layered radial blobs at three scales rather than value noise: it is a handful of
 * gradient fills, the browser rasterises them, and the result has the soft unevenness of
 * smoke without a per-pixel loop in JavaScript.
 */
export function paintFog(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: HazeSettings,
  random: () => number
): void {
  context.clearRect(0, 0, width, height);
  context.globalCompositeOperation = 'source-over';

  // A base wash, so the thin places between blobs are still fog and not holes.
  context.fillStyle = `rgba(255, 255, 255, ${(settings.density * 0.55).toFixed(3)})`;
  context.fillRect(0, 0, width, height);

  const area = width * height;
  for (const [scale, alpha] of [
    [1, 0.22],
    [0.5, 0.16],
    [0.22, 0.12],
  ] as const) {
    const radius = settings.grain * scale;
    const count = Math.ceil(area / (radius * radius * 2.2));

    for (let n = 0; n < count; n += 1) {
      const x = random() * width;
      const y = random() * height;
      const r = radius * (0.6 + random() * 0.8);
      const blob = context.createRadialGradient(x, y, 0, x, y, r);
      const strength = alpha * settings.density * (0.6 + random() * 0.8);
      blob.addColorStop(0, `rgba(255, 255, 255, ${strength.toFixed(3)})`);
      blob.addColorStop(1, 'rgba(255, 255, 255, 0)');
      context.fillStyle = blob;
      context.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
}

/** Wipes a hole in the fog under the pointer. */
export function wipe(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  settings: HazeSettings,
  strength = 1
): void {
  const brush = context.createRadialGradient(x, y, 0, x, y, settings.brush);
  const hard = 1 - Math.max(0, Math.min(1, settings.feather));
  brush.addColorStop(0, `rgba(0, 0, 0, ${strength.toFixed(3)})`);
  brush.addColorStop(hard, `rgba(0, 0, 0, ${(strength * 0.85).toFixed(3)})`);
  brush.addColorStop(1, 'rgba(0, 0, 0, 0)');

  // Removing alpha rather than painting over it: the fog thins, it does not gain a
  // black smear.
  context.globalCompositeOperation = 'destination-out';
  context.fillStyle = brush;
  context.fillRect(x - settings.brush, y - settings.brush, settings.brush * 2, settings.brush * 2);
  context.globalCompositeOperation = 'source-over';
}

/** The smallest alpha that can survive being written to a canvas. */
export const MIN_VISIBLE_ALPHA = 1 / 255;

export interface Healer {
  /**
   * Adds a frame's worth of healing and returns the alpha to draw now — zero when there
   * is not yet enough to change a pixel.
   */
  add(elapsedSeconds: number): number;
  /** Discards anything owed, for when the fog is wiped or rebuilt. */
  reset(): void;
}

/**
 * Accumulates healing until it is worth drawing.
 *
 * The first version simply discarded any frame worth less than one step of alpha, which
 * looked careful and meant the fog never healed at all: at sixty frames a second the
 * default rate owes 0.0037 per frame and a pixel needs 0.0039. Rounding a rate down to
 * nothing, every frame, is a way of turning a slow effect into no effect.
 *
 * So the debt is kept. Most frames draw nothing and cost nothing; every few frames one
 * composite pays off what has built up.
 */
export function createHealer(settings: HazeSettings): Healer {
  let owed = 0;

  return {
    add(elapsedSeconds) {
      // A ten second gap is not a long frame, it is an absent one. Healing all of it at
      // once would erase a wipe the viewer made before switching tabs.
      owed += settings.healRate * Math.max(0, Math.min(0.1, elapsedSeconds));
      if (owed < MIN_VISIBLE_ALPHA) return 0;
      const amount = owed;
      owed = 0;
      return amount;
    },
    reset() {
      owed = 0;
    },
  };
}
