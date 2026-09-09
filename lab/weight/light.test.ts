import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHT, splitWords, weightAt } from './light';

/**
 * The visual risk here is checked by looking at it. What is worth testing is the
 * boundary — a light that never fully lets go leaves the paragraph permanently uneven —
 * and the text splitting, which must not silently rewrite the copy it is given.
 */

describe('weight', () => {
  it('lands exactly on the resting weight outside the radius', () => {
    expect(weightAt(DEFAULT_WEIGHT.radius, DEFAULT_WEIGHT)).toBe(DEFAULT_WEIGHT.restWeight);
    expect(weightAt(10_000, DEFAULT_WEIGHT)).toBe(DEFAULT_WEIGHT.restWeight);
  });

  it('peaks under the light and decreases with distance', () => {
    expect(weightAt(0, DEFAULT_WEIGHT)).toBe(DEFAULT_WEIGHT.peakWeight);

    let previous = Infinity;
    for (let distance = 0; distance < DEFAULT_WEIGHT.radius; distance += 10) {
      const weight = weightAt(distance, DEFAULT_WEIGHT);
      expect(weight).toBeLessThanOrEqual(previous);
      previous = weight;
    }
  });

  it('never returns a weight outside the configured range', () => {
    for (const distance of [-50, 0, 42, 189, 1000]) {
      const weight = weightAt(distance, DEFAULT_WEIGHT);
      expect(weight).toBeGreaterThanOrEqual(DEFAULT_WEIGHT.restWeight);
      expect(weight).toBeLessThanOrEqual(DEFAULT_WEIGHT.peakWeight);
    }
  });

  it('reproduces the original text exactly when the words are joined back', () => {
    const text = 'Two  spaces, a\nnewline — and an em dash.';
    expect(splitWords(text).join('')).toBe(text);
  });
});
