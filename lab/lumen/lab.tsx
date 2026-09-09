import { useState } from 'react';
import { Lumen } from './Lumen';
import { Slider } from '../playground/Slider';
import { createFrameRecorder } from '../playground/frames';
import { FrameReadout } from '../playground/FrameReadout';

export function LumenLab() {
  const [columns, setColumns] = useState(12);
  const [rows, setRows] = useState(7);
  const [recorder] = useState(createFrameRecorder);

  return (
    <>
      <div className="controls">
        <Slider label="columns" value={columns} min={3} max={30} step={1} onChange={setColumns} />
        <Slider label="rows" value={rows} min={2} max={20} step={1} onChange={setRows} />
        <FrameReadout
          recorder={recorder}
          subject={`${columns * rows} tiles · 2 DOM writes per frame`}
        />
      </div>

      <Lumen columns={columns} rows={rows} onFrame={recorder.record} />
    </>
  );
}
