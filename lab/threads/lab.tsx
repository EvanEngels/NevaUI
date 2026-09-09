import { useMemo, useRef, useState } from 'react';
// Imported through the package entry, exactly as a consumer would.
import { Threads, THREADS_DEFAULTS as DEFAULT_THREADS, type Link } from '../../src';
import { Slider } from '../playground/Slider';

const NODES = [
  { id: 'spark', label: 'Spark', note: 'A raw idea' },
  { id: 'concept', label: 'Concept', note: 'The model, argued' },
  { id: 'lab', label: 'Lab', note: 'Built and measured' },
  { id: 'experimental', label: 'Experimental', note: 'Published, honestly' },
  { id: 'archive', label: 'Archive', note: 'What it taught' },
  { id: 'measure', label: 'Frames', note: 'What it costs' },
];

const LINKS: Link[] = [
  { from: 'spark', to: 'concept' },
  { from: 'concept', to: 'lab' },
  { from: 'lab', to: 'experimental' },
  { from: 'lab', to: 'archive' },
  { from: 'lab', to: 'measure' },
  { from: 'measure', to: 'experimental' },
  { from: 'spark', to: 'archive' },
];

export function ThreadsLab() {
  const [slack, setSlack] = useState(DEFAULT_THREADS.slack);
  const [taut, setTaut] = useState(DEFAULT_THREADS.taut);
  const [points, setPoints] = useState(DEFAULT_THREADS.points);

  const settings = useMemo(() => ({ slack, taut, points }), [slack, taut, points]);

  const readoutRef = useRef<HTMLSpanElement>(null);

  return (
    <>
      <div className="controls">
        <Slider label="slack" value={slack} min={1} max={1.6} step={0.01} onChange={setSlack} />
        <Slider label="taut" value={taut} min={1} max={1.3} step={0.01} onChange={setTaut} />
        <Slider label="points" value={points} min={4} max={40} step={1} onChange={setPoints} />
        <p className="readout readout--frames">
          <span ref={readoutRef}>one path attribute per thread, and nothing at rest</span>
        </p>
      </div>

      <p className="note">
        The rope solver here is <b>Tether</b>, brought back from the archive — it was put away
        because nothing answered the question its Spark asked, and this is the answer. Point at a
        stage and every thread touching it pulls taut. The threads are decoration over a
        relationship that has to exist without them.
      </p>

      <Threads links={LINKS} settings={settings} className="threads-demo">
        {NODES.map((node) => (
          <article key={node.id} data-thread={node.id} className="threads-demo__node">
            <h3>{node.label}</h3>
            <p>{node.note}</p>
          </article>
        ))}
      </Threads>
    </>
  );
}
