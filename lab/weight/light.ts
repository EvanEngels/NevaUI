/**
 * Weight — how heavy a word becomes when the reading light passes over it.
 *
 * The interesting problem is not the curve, it is that changing a font's weight changes
 * how wide the text is. Animating weight naively reflows the paragraph on every frame:
 * the words shove each other sideways, the line breaks jump, and the effect reads as a
 * bug. See `Weight.tsx` for how the boxes are frozen before anything moves.
 */

export interface WeightSettings {
  /** Reach of the light, in pixels. */
  radius: number;
  /** Weight of a word the light does not touch. */
  restWeight: number;
  /** Weight of a word directly under the light. */
  peakWeight: number;
  /**
   * Shape of the falloff. 1 is linear; higher values keep the light tight and let it
   * fade sooner, which reads more like a light and less like a bubble.
   */
  focus: number;
}

export const DEFAULT_WEIGHT: WeightSettings = {
  radius: 190,
  restWeight: 250,
  peakWeight: 800,
  focus: 2.4,
};

/**
 * Weight for a word whose centre is `distance` pixels from the light.
 *
 * Outside the radius the answer is exactly `restWeight`, not merely close to it: a word
 * the light has left must land back on its resting weight, or the paragraph keeps a
 * faint uneven texture forever.
 */
export function weightAt(distance: number, settings: WeightSettings): number {
  const { radius, restWeight, peakWeight, focus } = settings;
  if (!(radius > 0) || distance >= radius) return restWeight;

  const nearness = (1 - Math.max(0, distance) / radius) ** focus;
  return restWeight + (peakWeight - restWeight) * nearness;
}

/**
 * Splits text into words, keeping the spaces attached, so the rendered paragraph is
 * character-for-character the original text. Splitting on whitespace and re-joining with
 * a single space quietly rewrites the author's copy.
 */
export function splitWords(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}
