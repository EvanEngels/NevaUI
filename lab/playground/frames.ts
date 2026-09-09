/**
 * Frame measurement for the Lab.
 *
 * Three experiments were blocked on the same missing thing: a trustworthy way to say what
 * a frame costs. Every earlier attempt reported frame intervals, and frame intervals lie —
 * they alternate between one and two display periods, they stop entirely in a background
 * tab, and they say nothing about which part of the frame was expensive.
 *
 * So this measures the one number that is actually ours: the time spent inside the
 * animation callback. That is script work — physics plus DOM writes — and it is unaffected
 * by throttling, by refresh rate, or by whether anyone is looking at the tab.
 *
 * Intervals are still recorded, because a long frame is what a person actually perceives,
 * but they are reported separately and only mean something in a focused tab.
 *
 * Paint is not measured here, and no attempt is made to guess it. It needs the browser's
 * own profiler.
 */

export interface FrameSample {
  /** Time since the previous frame, in milliseconds. */
  intervalMs: number;
  /** Time spent inside the animation callback, in milliseconds. */
  scriptMs: number;
}

export interface FrameStats {
  samples: number;
  scriptMedianMs: number;
  scriptP95Ms: number;
  scriptMaxMs: number;
  /**
   * Null when the frames did not arrive on their own — a hidden tab, or frames forced
   * one at a time by a tool. Script cost is still true in that case; timing is not.
   */
  delivery: FrameDelivery | null;
}

export interface FrameDelivery {
  intervalMedianMs: number;
  /** Shortest interval seen, which approximates one display period. */
  displayMs: number;
  /** Frames that took more than 1.5 display periods to arrive. */
  longFrames: number;
}

/** Keeps roughly four seconds of frames at 120Hz. */
const WINDOW = 480;

/**
 * The methods are declared `this: void` because they are closures over the recorder's
 * own arrays and use no receiver. That is what makes `recorder.record` safe to hand
 * straight to a component as a callback.
 */
export interface FrameRecorder {
  record(this: void, sample: FrameSample): void;
  stats(this: void): FrameStats | null;
  reset(this: void): void;
}

export function createFrameRecorder(): FrameRecorder {
  const scripts: number[] = [];
  const intervals: number[] = [];

  const push = (values: number[], value: number): void => {
    values.push(value);
    if (values.length > WINDOW) values.shift();
  };

  return {
    record(sample) {
      // The first frame of a loop has no previous frame, and a frame that arrives after
      // the tab was hidden is not a slow frame — it is an absent one.
      if (sample.intervalMs > 0 && sample.intervalMs < 250) push(intervals, sample.intervalMs);
      push(scripts, sample.scriptMs);
    },

    stats() {
      if (scripts.length < 30) return null;

      const sortedScripts = [...scripts].sort((a, b) => a - b);

      // Script cost and frame delivery are reported separately because they fail
      // separately. Work done inside the callback is measurable wherever the callback
      // runs; how long a frame took to arrive means nothing unless frames were arriving
      // on their own. Reporting one without the other is the point of this split.
      let delivery: FrameDelivery | null = null;
      if (intervals.length >= 30) {
        const sortedIntervals = [...intervals].sort((a, b) => a - b);
        const displayMs = sortedIntervals[0] ?? 0;
        const longThreshold = displayMs * 1.5;
        delivery = {
          intervalMedianMs: quantile(sortedIntervals, 0.5),
          displayMs,
          longFrames: intervals.filter((interval) => interval > longThreshold).length,
        };
      }

      return {
        samples: scripts.length,
        scriptMedianMs: quantile(sortedScripts, 0.5),
        scriptP95Ms: quantile(sortedScripts, 0.95),
        scriptMaxMs: sortedScripts[sortedScripts.length - 1] ?? 0,
        delivery,
      };
    },

    reset() {
      scripts.length = 0;
      intervals.length = 0;
    },
  };
}

/** Nearest-rank quantile on an already sorted array. */
export function quantile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil(fraction * sorted.length) - 1;
  const index = Math.min(sorted.length - 1, Math.max(0, rank));
  return sorted[index] ?? 0;
}

/**
 * Wraps a frame callback so it reports what it cost.
 *
 * The measurement lives here rather than in each experiment, so no experiment can
 * accidentally measure something slightly different from the others.
 */
export function measureFrame(
  time: number,
  previousTime: number,
  work: (elapsedSeconds: number) => void
): FrameSample {
  const intervalMs = previousTime === 0 ? 0 : time - previousTime;
  const started = performance.now();
  work(intervalMs / 1000);
  return { intervalMs, scriptMs: performance.now() - started };
}
