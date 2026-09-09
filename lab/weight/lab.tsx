import { useMemo, useState } from 'react';
import { Weight } from './Weight';
import { DEFAULT_WEIGHT } from './light';
import { Slider, Toggle } from '../playground/Slider';

const PASSAGE =
  'A light moves across the page and the letters lean into it. Nothing else shifts: the words were measured at their heaviest before any of this began.';

export function WeightLab() {
  const [radius, setRadius] = useState(DEFAULT_WEIGHT.radius);
  const [peakWeight, setPeakWeight] = useState(DEFAULT_WEIGHT.peakWeight);
  const [focus, setFocus] = useState(DEFAULT_WEIGHT.focus);
  const [showBoxes, setShowBoxes] = useState(false);

  const settings = useMemo(() => ({ radius, peakWeight, focus }), [radius, peakWeight, focus]);

  return (
    <>
      <div className="controls">
        <Slider label="radius" value={radius} min={60} max={480} step={10} onChange={setRadius} />
        <Slider
          label="peak weight"
          value={peakWeight}
          min={300}
          max={900}
          step={10}
          onChange={setPeakWeight}
        />
        <Slider label="focus" value={focus} min={1} max={6} step={0.1} onChange={setFocus} />
        <Toggle label="show frozen boxes" checked={showBoxes} onChange={setShowBoxes} />
      </div>

      <Weight settings={settings} showBoxes={showBoxes}>
        {PASSAGE}
      </Weight>
    </>
  );
}
