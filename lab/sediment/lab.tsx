import { useCallback, useMemo, useRef, useState } from 'react';
// Imported through the package entry, exactly as a consumer would.
import { Sediment, SEDIMENT_DEFAULTS as DEFAULT_SETTLE } from '../../src';
import { Slider } from '../playground/Slider';

interface Entry {
  id: number;
  label: string;
  detail: string;
}

const SOURCES = [
  ['deploy', 'main → production, 42s'],
  ['build', '128 modules, no warnings'],
  ['alert', 'p95 latency over budget'],
  ['merge', 'pull request #41 landed'],
  ['test', '57 passed, 0 failed'],
  ['scale', 'two instances added'],
];

export function SedimentLab() {
  const [stiffness, setStiffness] = useState(DEFAULT_SETTLE.stiffness);
  const [damping, setDamping] = useState(DEFAULT_SETTLE.damping);
  const [stagger, setStagger] = useState(DEFAULT_SETTLE.stagger);
  const [entries, setEntries] = useState<Entry[]>(() =>
    SOURCES.slice(0, 4).map((source, index) => ({
      id: index,
      label: source[0] ?? '',
      detail: source[1] ?? '',
    }))
  );
  const nextId = useRef(SOURCES.length);

  const settings = useMemo(() => ({ stiffness, damping, stagger }), [stiffness, damping, stagger]);

  const add = useCallback(() => {
    const source = SOURCES[nextId.current % SOURCES.length] ?? ['event', ''];
    const entry: Entry = {
      id: nextId.current++,
      label: source[0] ?? '',
      detail: source[1] ?? '',
    };
    setEntries((current) => [entry, ...current].slice(0, 8));
  }, []);

  const remove = useCallback((id: number) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const readoutRef = useRef<HTMLSpanElement>(null);

  return (
    <>
      <div className="controls">
        <Slider
          label="stiffness"
          value={stiffness}
          min={40}
          max={600}
          step={10}
          onChange={setStiffness}
        />
        <Slider label="damping" value={damping} min={4} max={60} step={1} onChange={setDamping} />
        <Slider
          label="stagger"
          value={stagger}
          min={0}
          max={0.12}
          step={0.004}
          onChange={setStagger}
        >
          {stagger === 0 ? 'none' : `${Math.round(stagger * 1000)}ms`}
        </Slider>
        <button type="button" className="sediment-demo__add" onClick={add}>
          Add an event
        </button>
        <p className="readout readout--frames">
          <span ref={readoutRef}>transform only, and the loop stops when the list arrives</span>
        </p>
      </div>

      <p className="note">
        Add an event and the ones below absorb the shift one after another, rather than the whole
        list sliding to a new arrangement. Dismiss one and the pile collapses into the gap. Critical
        damping is around <b>2·√stiffness</b> — below it the list bounces, which is a decision
        rather than a bug.
      </p>

      <Sediment settings={settings} className="sediment-demo">
        {entries.map((entry) => (
          <article key={entry.id} className="sediment-demo__row">
            <span className="sediment-demo__label">{entry.label}</span>
            <span className="sediment-demo__detail">{entry.detail}</span>
            <button
              type="button"
              onClick={() => remove(entry.id)}
              aria-label={`Dismiss ${entry.label}`}
            >
              Dismiss
            </button>
          </article>
        ))}
      </Sediment>
    </>
  );
}
