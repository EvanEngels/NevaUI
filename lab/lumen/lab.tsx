import { useState } from 'react';
import { Lumen } from './Lumen';
import { Slider } from '../playground/Slider';

export function LumenLab() {
  const [columns, setColumns] = useState(12);
  const [rows, setRows] = useState(7);

  return (
    <>
      <div className="controls">
        <Slider label="columns" value={columns} min={3} max={30} step={1} onChange={setColumns} />
        <Slider label="rows" value={rows} min={2} max={20} step={1} onChange={setRows} />
        <p className="readout">
          tiles <span>{columns * rows}</span> · DOM writes per frame <span>2</span>
        </p>
      </div>

      <Lumen columns={columns} rows={rows} />
    </>
  );
}
