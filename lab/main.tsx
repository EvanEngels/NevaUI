import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DisplacementFieldLab } from './displacement-field/lab';
import { TetherLab } from './tether/lab';
import { WeightLab } from './weight/lab';
import { LumenLab } from './lumen/lab';
import { FractureLab } from './fracture/lab';
import './playground.css';

interface Experiment {
  id: string;
  title: string;
  summary: string;
  render: () => React.ReactElement;
}

const EXPERIMENTS: Experiment[] = [
  {
    id: 'displacement-field',
    title: 'Displacement Field',
    summary:
      'A grid pushed aside by the pointer, where displacing one element compresses its neighbours. Turn coupling off to compare against independent falloff.',
    render: () => <DisplacementFieldLab />,
  },
  {
    id: 'tether',
    title: 'Tether',
    summary:
      'An inextensible line with mass. Drag the handle: the rope transmits the motion, the weight lags, and the whole thing swings itself back to rest.',
    render: () => <TetherLab />,
  },
  {
    id: 'weight',
    title: 'Weight',
    summary:
      'Typographic light. Words gain weight as the pointer sweeps them — with the line boxes frozen first, so nothing reflows.',
    render: () => <WeightLab />,
  },
  {
    id: 'lumen',
    title: 'Lumen',
    summary:
      'One light over a whole surface. Flat moves a single composited layer and repaints nothing; faces gives every face its own highlight and shadow, and repaints all of them every frame.',
    render: () => <LumenLab />,
  },
  {
    id: 'fracture',
    title: 'Fracture',
    summary:
      'Click the panel. It breaks along a radial fracture computed from the impact point, the shards scatter, then they find their way back.',
    render: () => <FractureLab />,
  },
];

const experimentFromHash = (): Experiment => {
  const id = window.location.hash.replace('#', '');
  return EXPERIMENTS.find((experiment) => experiment.id === id) ?? (EXPERIMENTS[0] as Experiment);
};

function Playground() {
  const [current, setCurrent] = useState(experimentFromHash);

  useEffect(() => {
    const onHashChange = (): void => {
      setCurrent(experimentFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  return (
    <main>
      <nav>
        <span className="brand">NevaUI 🧪 Lab</span>
        {EXPERIMENTS.map((experiment) => (
          <a
            key={experiment.id}
            href={`#${experiment.id}`}
            className={experiment.id === current.id ? 'active' : undefined}
          >
            {experiment.title}
          </a>
        ))}
      </nav>

      <header>
        <h1>{current.title}</h1>
        <p>{current.summary}</p>
      </header>

      {/* Remounting on change is what stops a prototype's loop when you navigate away. */}
      <section key={current.id}>{current.render()}</section>
    </main>
  );
}

const container = document.getElementById('root');
if (container === null) throw new Error('missing #root');

createRoot(container).render(
  <StrictMode>
    <Playground />
  </StrictMode>
);
