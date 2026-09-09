import { useState, type CSSProperties } from 'react';
// Imported through the package entry, exactly as a consumer would: that is what pulls in
// the stylesheet, and importing the module directly leaves the surface unstyled.
import { Lumen } from '../../src';
import { Slider } from '../playground/Slider';
import './lumen-lab.css';

/**
 * Lumen has left the Lab — it is exported from `src` now. This panel stays because the
 * surface still needs somewhere to be looked at, and because the one cost that is still
 * unmeasured, paint, can only be examined with a profiler on a real page.
 *
 * There is no frame readout here on purpose. Lumen's script cost is two property writes,
 * and that is verified by a test rather than by a number that would only ever read zero.
 */
export function LumenLab() {
  const [columns, setColumns] = useState(12);
  const [rows, setRows] = useState(7);

  return (
    <>
      <div className="controls">
        <Slider label="columns" value={columns} min={3} max={30} step={1} onChange={setColumns} />
        <Slider label="rows" value={rows} min={2} max={20} step={1} onChange={setRows} />
        <p className="readout">
          faces <span>{columns * rows}</span> · DOM writes per frame <span>2</span>
        </p>
      </div>

      <Lumen className="lumen-demo" style={{ '--lumen-demo-columns': columns } as CSSProperties}>
        {Array.from({ length: columns * rows }, (_, index) => (
          <div className="lumen-demo__face" key={index} />
        ))}
      </Lumen>
    </>
  );
}
