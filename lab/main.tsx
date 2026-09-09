import { StrictMode, useCallback, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DisplacementField } from './displacement-field/DisplacementField';
import { DEFAULT_SETTINGS } from './displacement-field/field';
import './playground.css';

const COLUMNS = 16;

function Playground() {
  const [coupling, setCoupling] = useState(true);
  const [rows, setRows] = useState(10);
  const [displacement, setDisplacement] = useState(DEFAULT_SETTINGS.displacement);
  const [radius, setRadius] = useState(DEFAULT_SETTINGS.radius);
  const [resistance, setResistance] = useState(DEFAULT_SETTINGS.resistance);
  const [ratio, setRatio] = useState(
    DEFAULT_SETTINGS.anchorStiffness / DEFAULT_SETTINGS.linkStiffness
  );

  const settings = useMemo(
    () => ({
      displacement,
      radius,
      resistance,
      anchorStiffness: DEFAULT_SETTINGS.linkStiffness * ratio,
    }),
    [displacement, radius, resistance, ratio]
  );

  const count = COLUMNS * rows;
  const cells = useMemo(() => Array.from({ length: count }, (_, index) => index), [count]);

  // Frame timing is read from the DOM directly: routing it through React state would
  // re-render the whole field every frame, which is the failure this project exists to avoid.
  const readoutRef = useRef<HTMLSpanElement>(null);
  const samples = useRef<number[]>([]);

  const handleFrame = useCallback((frameMs: number) => {
    if (frameMs <= 0) return;
    const window = samples.current;
    window.push(frameMs);
    if (window.length < 30) return;

    const sorted = [...window].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const worst = sorted[sorted.length - 1] ?? 0;
    window.length = 0;

    if (readoutRef.current !== null) {
      readoutRef.current.textContent = `${median.toFixed(1)} ms median · ${worst.toFixed(1)} ms worst`;
    }
  }, []);

  return (
    <main>
      <header>
        <h1>Displacement Field</h1>
        <p>
          🧪 Lab prototype. Move the pointer across the field. Turn coupling off to compare against
          independent falloff — the cheap model this experiment has to beat.
        </p>
      </header>

      <div className="controls">
        <label className="toggle">
          <input
            type="checkbox"
            checked={coupling}
            onChange={(event) => setCoupling(event.target.checked)}
          />
          <span>Neighbour coupling {coupling ? 'on' : 'off (control)'}</span>
        </label>

        <Slider label="elements" value={rows} min={2} max={40} step={1} onChange={setRows}>
          {count}
        </Slider>
        <Slider
          label="displacement"
          value={displacement}
          min={0}
          max={80}
          step={1}
          onChange={setDisplacement}
        />
        <Slider label="radius" value={radius} min={40} max={500} step={10} onChange={setRadius} />
        <Slider
          label="resistance"
          value={resistance}
          min={2}
          max={60}
          step={0.5}
          onChange={setResistance}
        />
        <Slider
          label="anchor / link"
          value={ratio}
          min={0.03}
          max={1.5}
          step={0.01}
          onChange={setRatio}
        />

        <p className="readout">
          frame <span ref={readoutRef}>measuring…</span>
        </p>
      </div>

      <DisplacementField
        columns={COLUMNS}
        coupling={coupling}
        settings={settings}
        onFrame={handleFrame}
      >
        {cells.map((index) => (
          <span className="dot" key={index} />
        ))}
      </DisplacementField>
    </main>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  children?: React.ReactNode;
}

function Slider({ label, value, min, max, step, onChange, children }: SliderProps) {
  return (
    <label className="slider">
      <span>
        {label} <b>{children ?? value}</b>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

const container = document.getElementById('root');
if (container === null) throw new Error('missing #root');

createRoot(container).render(
  <StrictMode>
    <Playground />
  </StrictMode>
);
