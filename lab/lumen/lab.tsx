import { useState, type CSSProperties } from 'react';
// Imported through the package entry, exactly as a consumer would: that is what pulls in
// the stylesheet, and importing the module directly leaves the surface unstyled.
import { Lumen } from '../../src';
import { Slider } from '../playground/Slider';
import { DeliveryMonitor } from '../playground/DeliveryMonitor';
import './lumen-lab.css';

/**
 * Lumen has left the Lab — it is exported from `src` now. This panel stays because the
 * cost that was never measured is paint, and paint is only visible on a real surface.
 *
 * The two sliders below are not decoration. Each one switches off exactly one per-frame
 * repaint, so they answer the question the component could not: of the two things a face
 * redraws when the light moves, which one is actually expensive?
 */
export function LumenLab() {
  const [columns, setColumns] = useState(12);
  const [rows, setRows] = useState(7);
  const [shadowLength, setShadowLength] = useState(0.05);
  const [highlightShift, setHighlightShift] = useState(0.14);

  const style = {
    '--lumen-demo-columns': columns,
    '--neva-lumen-shadow-length': shadowLength,
    '--neva-lumen-highlight-shift': highlightShift,
  } as CSSProperties;

  return (
    <>
      <div className="controls">
        <Slider label="columns" value={columns} min={3} max={60} step={1} onChange={setColumns} />
        <Slider label="rows" value={rows} min={2} max={40} step={1} onChange={setRows} />
        <Slider
          label="shadow length"
          value={shadowLength}
          min={0}
          max={0.12}
          step={0.005}
          onChange={setShadowLength}
        >
          {shadowLength === 0 ? 'off' : shadowLength.toFixed(3)}
        </Slider>
        <Slider
          label="highlight shift"
          value={highlightShift}
          min={0}
          max={0.3}
          step={0.01}
          onChange={setHighlightShift}
        >
          {highlightShift === 0 ? 'off' : highlightShift.toFixed(2)}
        </Slider>
        <DeliveryMonitor subject={`${columns * rows} faces`} />
      </div>

      <p className="note">
        Set a slider to <b>off</b> and its value stops changing with the light, so that face stops
        repainting it. Move the pointer continuously and watch the long-frame count: whichever
        switch recovers the frames is the one that was costing them.
      </p>

      <Lumen className="lumen-demo" style={style}>
        {Array.from({ length: columns * rows }, (_, index) => (
          <div className="lumen-demo__face" key={index} />
        ))}
      </Lumen>
    </>
  );
}
