import { useEffect, useRef } from 'react';
import { createFrameRecorder } from './frames';

/**
 * Measures how well the page delivers frames, from the outside.
 *
 * The frame harness measures work done inside an animation callback. That is the right
 * instrument for an experiment that owns a loop, and the wrong one for a component whose
 * whole cost is somewhere else: Lumen writes two properties per frame and would report
 * zero forever while the page visibly stutters.
 *
 * So this runs its own loop and records nothing but arrival times. It measures the page,
 * not the component — which is exactly what a person means when they say it lags.
 */
export function DeliveryMonitor({ subject }: { subject: string }) {
  const outputRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const recorder = createFrameRecorder();
    let frameHandle = 0;
    let lastTime = 0;

    const tick = (time: number): void => {
      recorder.record({ intervalMs: lastTime === 0 ? 0 : time - lastTime, scriptMs: 0 });
      lastTime = time;
      frameHandle = requestAnimationFrame(tick);
    };
    frameHandle = requestAnimationFrame(tick);

    const update = (): void => {
      const output = outputRef.current;
      const stats = recorder.stats();
      if (output === null) return;

      if (stats === null || stats.delivery === null) {
        output.textContent = 'frames are not being delivered — is this tab in the foreground?';
        return;
      }
      const { delivery } = stats;

      const dropped = ((delivery.longFrames / stats.samples) * 100).toFixed(0);
      output.textContent =
        `${delivery.intervalMedianMs.toFixed(1)} ms median · ` +
        `${delivery.longFrames} long of ${stats.samples} frames (${dropped}%) · ` +
        `display ${delivery.displayMs.toFixed(1)} ms`;
    };

    const timer = setInterval(update, 400);

    return () => {
      cancelAnimationFrame(frameHandle);
      clearInterval(timer);
    };
  }, []);

  return (
    <p className="readout readout--frames">
      {subject} <span ref={outputRef}>measuring…</span>
    </p>
  );
}
