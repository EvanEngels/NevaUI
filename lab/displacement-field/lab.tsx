import { useMemo, useState } from 'react';
// Imported through the package entry, exactly as a consumer would.
import { DisplacementField, DISPLACEMENT_DEFAULTS as DEFAULT_SETTINGS } from '../../src';
import { Slider, Toggle } from '../playground/Slider';
import { DeliveryMonitor } from '../playground/DeliveryMonitor';

const COLUMNS = 16;
const CARD_COLUMNS = 3;

export function DisplacementFieldLab() {
  const [coupling, setCoupling] = useState(true);
  const [rows, setRows] = useState(10);
  const [displacement, setDisplacement] = useState(DEFAULT_SETTINGS.displacement);
  const [radius, setRadius] = useState(DEFAULT_SETTINGS.radius);
  const [resistance, setResistance] = useState(DEFAULT_SETTINGS.resistance);
  const [content, setContent] = useState<'dots' | 'cards'>('dots');
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

        <Toggle
          label={content === 'cards' ? 'content: cards' : 'content: dots'}
          checked={content === 'cards'}
          onChange={(checked) => setContent(checked ? 'cards' : 'dots')}
        />
        <DeliveryMonitor subject={`${count} elements`} />
      </div>

      <DisplacementField
        columns={content === 'cards' ? CARD_COLUMNS : COLUMNS}
        coupling={coupling}
        settings={settings}
        className={content === 'cards' ? 'field-cards' : undefined}
      >
        {content === 'dots'
          ? cells.map((index) => <span className="dot" key={index} />)
          : cells.slice(0, CARD_COLUMNS * 4).map((index) => (
              <article className="card" key={index}>
                <h3>Fragment {index + 1}</h3>
                <p>
                  Type that has to stay readable while the grid moves around it, and a link the
                  pointer is supposed to be able to reach.
                </p>
                <a href="#displacement-field">a link to try to hit</a>
              </article>
            ))}
      </DisplacementField>
    </>
  );
}
