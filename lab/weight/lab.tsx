import { useMemo, useState } from 'react';
// Imported through the package entry, exactly as a consumer would.
import { Weight, WEIGHT_DEFAULTS as DEFAULT_WEIGHT } from '../../src';
import { Slider, Toggle } from '../playground/Slider';
import { DeliveryMonitor } from '../playground/DeliveryMonitor';

const PASSAGE =
  'A light moves across the page and the letters lean into it. Nothing else shifts: the words were measured at their heaviest before any of this began.';

export function WeightLab() {
  const [radius, setRadius] = useState(DEFAULT_WEIGHT.radius);
  const [peakWeight, setPeakWeight] = useState(DEFAULT_WEIGHT.peakWeight);
  const [focus, setFocus] = useState(DEFAULT_WEIGHT.focus);
  const [showBoxes, setShowBoxes] = useState(false);
  const [repeats, setRepeats] = useState(1);

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
        <Slider label="passage" value={repeats} min={1} max={12} step={1} onChange={setRepeats}>
          {`${repeats}x`}
        </Slider>
        <DeliveryMonitor subject={`${PASSAGE.split(/\s+/).length * repeats} words`} />
      </div>

      <Weight settings={settings} showBoxes={showBoxes} className="weight-demo">
        {Array.from({ length: repeats }, () => PASSAGE).join(' ')}
      </Weight>
    </>
  );
}
