import { useState, type CSSProperties } from 'react';
// Imported through the package entry, exactly as a consumer would: that is what pulls in
// the stylesheet, and importing the module directly leaves the surface unstyled.
import { Lumen } from '../../src';
import { Slider, Toggle } from '../playground/Slider';
import { DeliveryMonitor } from '../playground/DeliveryMonitor';
import './lumen-lab.css';

/**
 * Lumen has left the Lab — it is exported from `src` now. This panel stays because the
 * cost that was never measured is paint, and paint is only visible on a real surface.
 *
 * The toggle switches between the two ways the light can reach a face, which is the whole
 * performance question in one control: one composited layer that repaints nothing, or a
 * highlight and a shadow per face that repaint everything on screen.
 */
export function LumenLab() {
  const [columns, setColumns] = useState(12);
  const [rows, setRows] = useState(7);
  const [perFace, setPerFace] = useState(false);

  const style = { '--lumen-demo-columns': columns } as CSSProperties;

  return (
    <>
      <div className="controls">
        <Slider label="columns" value={columns} min={3} max={60} step={1} onChange={setColumns} />
        <Slider label="rows" value={rows} min={2} max={40} step={1} onChange={setRows} />
        <Toggle
          label={perFace ? 'depth: faces (repaints)' : 'depth: flat (composited)'}
          checked={perFace}
          onChange={setPerFace}
        />
        <DeliveryMonitor subject={`${columns * rows} faces`} />
      </div>

      <p className="note">
        <b>flat</b> moves one composited layer, so nothing under it repaints. <b>faces</b> gives
        every face its own highlight and shadow, and repaints every visible face on every frame.
        Raise the columns until it stutters, then switch. Rows that scroll out of view are free —
        the browser never paints them — so what costs is faces on screen.
      </p>

      <Lumen className="lumen-demo" style={style} depth={perFace ? 'faces' : 'flat'}>
        {Array.from({ length: columns * rows }, (_, index) => (
          <div className="lumen-demo__face" key={index} />
        ))}
      </Lumen>
    </>
  );
}
