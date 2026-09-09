import { useMemo, useRef, useState } from 'react';
// Imported through the package entry, exactly as a consumer would.
import { Haze, HAZE_DEFAULTS as DEFAULT_SMOKE } from '../../src';
import { Slider } from '../playground/Slider';

export function HazeLab() {
  const [brush, setBrush] = useState(DEFAULT_SMOKE.brush);
  const [density, setDensity] = useState(DEFAULT_SMOKE.density);
  const [flow, setFlow] = useState(DEFAULT_SMOKE.flow);
  const [swirl, setSwirl] = useState(DEFAULT_SMOKE.swirl);

  const settings = useMemo(() => ({ brush, density, flow, swirl }), [brush, density, flow, swirl]);

  const readoutRef = useRef<HTMLSpanElement>(null);

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
        <Slider label="flow" value={flow} min={0} max={16} step={0.5} onChange={setFlow}>
          {flow === 0 ? 'still' : flow.toFixed(1)}
        </Slider>
        <Slider label="swirl" value={swirl} min={0.02} max={0.3} step={0.01} onChange={setSwirl} />
        <p className="readout readout--frames">
          <span ref={readoutRef}>a coarse grid, drawn once per frame and stretched by CSS</span>
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
          <Haze key={title} settings={settings} className="haze-demo__card">
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
