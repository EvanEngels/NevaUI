import { useCallback, useRef, useState } from 'react';
import { Pour } from './Pour';
import { MATERIALS } from './grains';
import { Slider, Toggle } from '../playground/Slider';

const MATERIAL_NAMES = Object.keys(MATERIALS) as (keyof typeof MATERIALS)[];

export function PourLab() {
  const [material, setMaterial] = useState<keyof typeof MATERIALS>('sand');
  const [cellSize, setCellSize] = useState(5);
  const [upside, setUpside] = useState(false);
  const [pouring, setPouring] = useState(true);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const window30 = useRef<{ step: number[]; draw: number[] }>({ step: [], draw: [] });

  // Read straight into the DOM: routing a per-frame sample through React state would
  // re-render the page the material is falling onto.
  const handleSample = useCallback((sample: { filled: number; stepMs: number; drawMs: number }) => {
    const window = window30.current;
    window.step.push(sample.stepMs);
    window.draw.push(sample.drawMs);
    if (window.step.length < 30) return;

    const median = (values: number[]): number =>
      [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

    const output = readoutRef.current;
    if (output !== null) {
      output.textContent =
        `${sample.filled.toLocaleString()} cells · ` +
        `simulate ${median(window.step).toFixed(2)} ms · draw ${median(window.draw).toFixed(2)} ms`;
    }
    window.step.length = 0;
    window.draw.length = 0;
  }, []);

  return (
    <>
      <div className="controls">
        {MATERIAL_NAMES.map((name) => (
          <Toggle
            key={name}
            label={name}
            checked={material === name}
            onChange={() => setMaterial(name)}
          />
        ))}
        <Slider label="cell size" value={cellSize} min={2} max={14} step={1} onChange={setCellSize}>
          {`${cellSize}px`}
        </Slider>
        <Toggle label={pouring ? 'pouring' : 'stopped'} checked={pouring} onChange={setPouring} />
        <Toggle label={upside ? 'turned over' : 'upright'} checked={upside} onChange={setUpside} />
        <p className="readout readout--frames">
          <span ref={readoutRef}>measuring…</span>
        </p>
      </div>

      <p className="note">
        The boxes below are terrain, not decoration: the material lands on them, slides off their
        edges and fills the gaps. Turn it over and the pile drains back out — the page stays the
        right way up, because upside-down text is a poor trade for an effect.
      </p>

      <Pour
        material={material}
        cellSize={cellSize}
        gravity={upside ? -1 : 1}
        pouring={pouring}
        onSample={handleSample}
      >
        <div className="pour-demo">
          <h3 data-pour-terrain>A page to bury</h3>
          <p data-pour-terrain>
            Every block here is written into the simulation as solid ground. Nothing about the
            material knows what this text says — only where it sits.
          </p>
          <div className="pour-demo__row">
            <div className="pour-demo__card" data-pour-terrain />
            <div className="pour-demo__card" data-pour-terrain />
            <div className="pour-demo__card" data-pour-terrain />
          </div>
          <div className="pour-demo__bar" data-pour-terrain />
        </div>
      </Pour>
    </>
  );
}
