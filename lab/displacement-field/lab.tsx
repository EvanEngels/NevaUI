import { useMemo, useState } from 'react';
import { DisplacementField } from './DisplacementField';
import { DEFAULT_SETTINGS } from './field';
import { Slider, Toggle } from '../playground/Slider';
import { createFrameRecorder } from '../playground/frames';
import { FrameReadout } from '../playground/FrameReadout';

const COLUMNS = 16;

export function DisplacementFieldLab() {
  const [recorder] = useState(createFrameRecorder);
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

  return (
    <>
      <div className="controls">
        <Toggle
          label={`Neighbour coupling ${coupling ? 'on' : 'off (control)'}`}
          checked={coupling}
          onChange={setCoupling}
        />

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

        <FrameReadout recorder={recorder} subject={`${count} elements`} />
      </div>

      <DisplacementField
        columns={COLUMNS}
        coupling={coupling}
        settings={settings}
        onFrame={recorder.record}
      >
        {cells.map((index) => (
          <span className="dot" key={index} />
        ))}
      </DisplacementField>
    </>
  );
}
