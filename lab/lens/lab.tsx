import { useRef, useState } from 'react';
// Imported through the package entry, exactly as a consumer would.
import { Lens } from '../../src';
import { Slider } from '../playground/Slider';

const ROWS = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  region: ['eu-west-1', 'us-east-1', 'ap-south-1'][index % 3] ?? '',
  p50: (12 + ((index * 7) % 40)) / 10,
  p95: (48 + ((index * 13) % 90)) / 10,
  errors: (index * 37) % 19,
  requests: 12_000 + ((index * 4211) % 90_000),
}));

export function LensLab() {
  const [zoom, setZoom] = useState(2.2);
  const [radius, setRadius] = useState(96);
  const readoutRef = useRef<HTMLSpanElement>(null);

  return (
    <>
      <div className="controls">
        <Slider label="zoom" value={zoom} min={1.2} max={5} step={0.1} onChange={setZoom} />
        <Slider label="radius" value={radius} min={40} max={200} step={4} onChange={setRadius} />
        <p className="readout readout--frames">
          <span ref={readoutRef}>one clone, one transform per move</span>
        </p>
      </div>

      <p className="note">
        The disc magnifies the real DOM, not a picture of it: the numbers under it are text rendered
        at that size, not resampled pixels. What it cannot do is be clicked — the real row is
        underneath at its real size, so the lens shows you something you have to stop looking
        through in order to hit.
      </p>

      <Lens zoom={zoom} radius={radius} className="lens-demo">
        <table>
          <thead>
            <tr>
              <th>Region</th>
              <th>p50</th>
              <th>p95</th>
              <th>Errors</th>
              <th>Requests</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.id}>
                <td>{row.region}</td>
                <td>{row.p50.toFixed(1)} ms</td>
                <td>{row.p95.toFixed(1)} ms</td>
                <td>{row.errors}</td>
                <td>{row.requests.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Lens>
    </>
  );
}
