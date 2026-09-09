import { useMemo, useState } from 'react';
import { Fracture } from './Fracture';
import { DEFAULT_FRACTURE } from './shards';
import { Slider } from '../playground/Slider';

export function FractureLab() {
  const [rays, setRays] = useState(DEFAULT_FRACTURE.rays);
  const [rings, setRings] = useState(DEFAULT_FRACTURE.rings);
  const [irregularity, setIrregularity] = useState(DEFAULT_FRACTURE.irregularity);
  const [force, setForce] = useState(900);

  const settings = useMemo(() => ({ rays, rings, irregularity }), [rays, rings, irregularity]);

  return (
    <>
      <div className="controls">
        <Slider label="rays" value={rays} min={3} max={40} step={1} onChange={setRays} />
        <Slider label="rings" value={rings} min={1} max={9} step={1} onChange={setRings} />
        <Slider
          label="irregularity"
          value={irregularity}
          min={0}
          max={1}
          step={0.05}
          onChange={setIrregularity}
        />
        <Slider label="force" value={force} min={100} max={2600} step={50} onChange={setForce} />
        <p className="readout">
          shards <span>{rays * rings}</span>
        </p>
      </div>

      <Fracture settings={settings} force={force} />
    </>
  );
}
