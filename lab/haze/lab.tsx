import { useMemo, useRef, useState } from 'react';
import { Haze } from './Haze';
import { DEFAULT_HAZE } from './fog';
import { Slider } from '../playground/Slider';

export function HazeLab() {
  const [brush, setBrush] = useState(DEFAULT_HAZE.brush);
  const [density, setDensity] = useState(DEFAULT_HAZE.density);
  const [healRate, setHealRate] = useState(DEFAULT_HAZE.healRate);
  const [grain, setGrain] = useState(DEFAULT_HAZE.grain);

  const settings = useMemo(
    () => ({ brush, density, healRate, grain }),
    [brush, density, healRate, grain]
  );

  const readoutRef = useRef<HTMLSpanElement>(null);
  const samples = useRef<number[]>([]);
  const handleSample = useMemo(
    () =>
      ({ frameMs, healing }: { frameMs: number; healing: boolean }) => {
        const window = samples.current;
        window.push(frameMs);
        if (window.length < 30) return;
        const sorted = [...window].sort((a, b) => a - b);
        window.length = 0;
        if (readoutRef.current !== null) {
          readoutRef.current.textContent =
            `${(sorted[15] ?? 0).toFixed(2)} ms median · ${(sorted[29] ?? 0).toFixed(2)} worst · ` +
            (healing ? 'healing' : 'at rest');
        }
      },
    []
  );

  return (
    <>
      <div className="controls">
        <Slider label="brush" value={brush} min={20} max={200} step={2} onChange={setBrush} />
        <Slider
          label="density"
          value={density}
          min={0.2}
          max={0.95}
          step={0.01}
          onChange={setDensity}
        />
        <Slider
          label="heal rate"
          value={healRate}
          min={0}
          max={1.2}
          step={0.02}
          onChange={setHealRate}
        >
          {healRate === 0 ? 'never' : healRate.toFixed(2)}
        </Slider>
        <Slider label="grain" value={grain} min={40} max={300} step={10} onChange={setGrain} />
        <p className="readout readout--frames">
          <span ref={readoutRef}>move the pointer over a card</span>
        </p>
      </div>

      <p className="note">
        The fog never hides anything: the text stays legible through it and the button stays
        clickable. Wiping makes it clearer, it does not make it available — anything else turns a
        decoration into a gate that only a pointer can open, and there is no keyboard equivalent for
        wiping a window.
      </p>

      <div className="haze-demo">
        {['Condensation', 'Breath', 'Steam'].map((title) => (
          <Haze key={title} settings={settings} className="haze-demo__card" onSample={handleSample}>
            <article>
              <h3>{title}</h3>
              <p>
                Text under fog, still readable. Wipe across it and the card clears, then closes over
                again a moment later.
              </p>
              <button type="button">A button you can still press</button>
            </article>
          </Haze>
        ))}
      </div>
    </>
  );
}
