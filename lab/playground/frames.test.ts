import { describe, expect, it } from 'vitest';
import { createFrameRecorder, quantile } from './frames';

/**
 * A measuring instrument that is wrong is worse than none, because its numbers get
 * written into documents and believed. These tests check the two ways this one could
 * quietly lie: the quantiles, and its treatment of frames that never arrived.
 */

describe('frame recorder', () => {
  it('reports nothing until it has enough frames to mean anything', () => {
    const recorder = createFrameRecorder();
    for (let index = 0; index < 20; index += 1) {
      recorder.record({ intervalMs: 8, scriptMs: 1 });
    }
    expect(recorder.stats()).toBeNull();
  });

  it('separates a slow frame from an absent one', () => {
    const recorder = createFrameRecorder();

    for (let index = 0; index < 60; index += 1) {
      recorder.record({ intervalMs: 8, scriptMs: 1 });
    }
    // A frame that took twice as long as it should: that is slow, and it counts.
    recorder.record({ intervalMs: 20, scriptMs: 1 });
    // A gap of two seconds is a hidden tab, not a slow frame, and must not count.
    recorder.record({ intervalMs: 2000, scriptMs: 1 });

    const stats = recorder.stats();
    if (stats === null) throw new Error('expected stats');

    expect(stats.delivery?.longFrames).toBe(1);
    expect(stats.delivery?.intervalMedianMs).toBe(8);
  });

  it('still reports script cost when the frames never arrived on their own', () => {
    const recorder = createFrameRecorder();

    // Every frame forced individually, seconds apart: the work is real, the timing is
    // meaningless, and the recorder has to say so rather than refuse or invent.
    for (let index = 0; index < 40; index += 1) {
      recorder.record({ intervalMs: 1800, scriptMs: 3 });
    }

    const stats = recorder.stats();
    if (stats === null) throw new Error('expected stats');

    expect(stats.scriptMedianMs).toBe(3);
    expect(stats.delivery).toBeNull();
  });

  it('reports the tail, not just the middle', () => {
    const recorder = createFrameRecorder();

    // Ten frames in a hundred are expensive. Exactly five would sit on the boundary of
    // a nearest-rank p95, which is a fact about the statistic and not about the workload.
    for (let index = 0; index < 90; index += 1) {
      recorder.record({ intervalMs: 8, scriptMs: 1 });
    }
    for (let index = 0; index < 10; index += 1) {
      recorder.record({ intervalMs: 8, scriptMs: 40 });
    }

    const stats = recorder.stats();
    if (stats === null) throw new Error('expected stats');

    // A median alone would call this a one millisecond workload.
    expect(stats.scriptMedianMs).toBe(1);
    expect(stats.scriptP95Ms).toBe(40);
    expect(stats.scriptMaxMs).toBe(40);
  });

  it('takes the nearest rank rather than interpolating', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2);
    expect(quantile([1, 2, 3, 4], 0.95)).toBe(4);
    expect(quantile([], 0.5)).toBe(0);
  });
});
