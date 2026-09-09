import { useMemo, useState } from 'react';
import { Tether } from './Tether';
import { DEFAULT_ROPE } from './rope';
import { Slider } from '../playground/Slider';

export function TetherLab() {
  const [points, setPoints] = useState(DEFAULT_ROPE.points);
  const [gravity, setGravity] = useState(DEFAULT_ROPE.gravity);
  const [passes, setPasses] = useState(DEFAULT_ROPE.passes);
  const [bobMass, setBobMass] = useState(DEFAULT_ROPE.bobMass);

  const settings = useMemo(
    () => ({ points, gravity, passes, bobMass }),
    [points, gravity, passes, bobMass]
  );

  return (
    <>
      <div className="controls">
        <Slider label="points" value={points} min={4} max={80} step={1} onChange={setPoints} />
        <Slider
          label="gravity"
          value={gravity}
          min={0}
          max={6000}
          step={100}
          onChange={setGravity}
        />
        <Slider label="passes" value={passes} min={1} max={40} step={1} onChange={setPasses}>
          {passes}
        </Slider>
        <Slider
          label="bob mass"
          value={bobMass}
          min={1}
          max={12}
          step={0.5}
          onChange={setBobMass}
        />
        <p className="readout">
          drop <span>passes</span> to 1 to see the constraint solver give up
        </p>
      </div>

      <Tether settings={settings} />
    </>
  );
}
