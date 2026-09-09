import { useMemo, useRef, useState } from 'react';
import { Threads, DEFAULT_THREADS, type Link } from './Threads';
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
  const samples = useRef<number[]>([]);
  const handleSample = useMemo(
    () =>
      ({ threads, frameMs, resting }: { threads: number; frameMs: number; resting: boolean }) => {
        const window = samples.current;
        window.push(frameMs);
        // Flushed when the threads settle as well as every thirty frames, or the last
        // thing the readout ever says is "swinging" — from the frame before it stopped.
        if (window.length < 30 && !resting) return;
        const sorted = [...window].sort((a, b) => a - b);
        window.length = 0;
        if (readoutRef.current !== null) {
          readoutRef.current.textContent =
            `${threads} threads · ${(sorted[15] ?? 0).toFixed(2)} ms median · ` +
            `${(sorted[29] ?? 0).toFixed(2)} worst · ${resting ? 'at rest' : 'swinging'}`;
        }
      },
    []
  );

  return (
    <>
      <div className="controls">
        <Slider label="slack" value={slack} min={1} max={1.6} step={0.01} onChange={setSlack} />
        <Slider label="taut" value={taut} min={1} max={1.3} step={0.01} onChange={setTaut} />
        <Slider label="points" value={points} min={4} max={40} step={1} onChange={setPoints} />
        <p className="readout readout--frames">
          <span ref={readoutRef}>point at a stage</span>
        </p>
      </div>

      <p className="note">
        The rope solver here is <b>Tether</b>, brought back from the archive — it was put away
        because nothing answered the question its Spark asked, and this is the answer. Point at a
        stage and every thread touching it pulls taut. The threads are decoration over a
        relationship that has to exist without them.
      </p>

      <Threads links={LINKS} settings={settings} className="threads-demo" onSample={handleSample}>
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
