import { useCallback, useMemo, useRef, useState } from 'react';
import { Wake } from './Wake';
import { DEFAULT_TRAIL } from './trail';
import { Slider } from '../playground/Slider';

export function WakeLab() {
  const [length, setLength] = useState(DEFAULT_TRAIL.length);
  const [quietSpeed, setQuietSpeed] = useState(DEFAULT_TRAIL.quietSpeed);
  const [strength, setStrength] = useState(DEFAULT_TRAIL.strength);

  const settings = useMemo(
    () => ({ length, quietSpeed, strength }),
    [length, quietSpeed, strength]
  );

  const readoutRef = useRef<HTMLSpanElement>(null);
  const samples = useRef<number[]>([]);
  const handleSample = useCallback(
    ({ ghosts, speed, frameMs }: { ghosts: number; speed: number; frameMs: number }) => {
      const window = samples.current;
      window.push(frameMs);
      if (window.length < 20) return;
      const sorted = [...window].sort((a, b) => a - b);
      window.length = 0;
      if (readoutRef.current !== null) {
        readoutRef.current.textContent =
          `${Math.round(speed)} px/s · ${ghosts} ghosts · ` +
          `${(sorted[10] ?? 0).toFixed(2)} ms median`;
      }
    },
    []
  );

  return (
    <>
      <div className="controls">
        <Slider label="length" value={length} min={2} max={30} step={1} onChange={setLength} />
        <Slider
          label="quiet below"
          value={quietSpeed}
          min={0}
          max={1200}
          step={20}
          onChange={setQuietSpeed}
        >
          {`${quietSpeed} px/s`}
        </Slider>
        <Slider
          label="strength"
          value={strength}
          min={0.1}
          max={1}
          step={0.05}
          onChange={setStrength}
        />
        <p className="readout readout--frames">
          <span ref={readoutRef}>move slowly, then flick</span>
        </p>
      </div>

      <p className="note">
        Move slowly across the panel and nothing trails. Flick and the wake appears. That is the
        whole rule: <b>a wake is a function of speed, not of movement</b> — without it, every
        pointer move smears and the effect is decoration wearing the clothes of information.
      </p>

      <Wake settings={settings} className="wake-demo" onSample={handleSample}>
        <span className="wake-demo__marker" />
      </Wake>
    </>
  );
}
