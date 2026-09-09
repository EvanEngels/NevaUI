/**
 * A seeded generator, so a material's behaviour can be reproduced.
 *
 * The first versions of these tests used `Math.random` and passed in isolation while
 * failing in a full run — a flaky test on a physics model is worse than none, because it
 * teaches everyone to re-run until it goes green. The randomness is real and wanted in
 * the simulation; it just has to be repeatable when something is being checked.
 */
export function seeded(seed: number): () => number {
  let state = (seed || 1) >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}
