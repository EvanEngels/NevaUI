import { useEffect, useRef } from 'react';
import type { FrameRecorder } from './frames';

export interface FrameReadoutProps {
  recorder: FrameRecorder;
  /** What is being measured, so a screenshot of the readout is self-describing. */
  subject: string;
}

/**
 * Reads the recorder on a timer, not on every frame. Routing measurements through React
 * state would make the measuring instrument part of the thing it measures.
 */
export function FrameReadout({ recorder, subject }: FrameReadoutProps) {
  const outputRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = (): void => {
      const stats = recorder.stats();
      const output = outputRef.current;
      if (output === null) return;

      if (stats === null) {
        output.textContent = 'waiting for frames…';
        return;
      }

      const script =
        `script ${stats.scriptMedianMs.toFixed(2)} ms median · ` +
        `${stats.scriptP95Ms.toFixed(2)} p95 · ${stats.scriptMaxMs.toFixed(2)} max ` +
        `over ${stats.samples} frames`;

      output.textContent =
        stats.delivery === null
          ? `${script} — frames were not delivered on their own, so timing is not reported`
          : `${script} — ${stats.delivery.longFrames} long frames ` +
            `(display ${stats.delivery.displayMs.toFixed(1)} ms)`;
    };

    const timer = setInterval(update, 400);
    update();
    return () => {
      clearInterval(timer);
    };
  }, [recorder]);

  return (
    <p className="readout readout--frames">
      {subject} <span ref={outputRef}>waiting for frames…</span>
    </p>
  );
}
