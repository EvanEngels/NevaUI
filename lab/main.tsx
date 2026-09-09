import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DisplacementFieldLab } from './displacement-field/lab';
import { PourLab } from './pour/lab';
import { HazeLab } from './haze/lab';
import { ThreadsLab } from './threads/lab';
import { SedimentLab } from './sediment/lab';
import { LensLab } from './lens/lab';
import { WakeLab } from './wake/lab';
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
    id: 'wake',
    title: 'Wake',
    summary:
      'Fast movement leaves a trail of where it has been, which fades. Move slowly and nothing trails — a wake is a function of speed, not of movement.',
    render: () => <WakeLab />,
  },
  {
    id: 'lens',
    title: 'Lens',
    summary:
      'A disc you move over dense content that magnifies the real DOM beneath it, not a picture of it. The text under it is text, rendered at that size.',
    render: () => <LensLab />,
  },
  {
    id: 'sediment',
    title: 'Sediment',
    summary:
      'A list that settles when it changes: an arriving item falls into place and the ones below absorb the shift, one after another, instead of the whole list sliding.',
    render: () => <SedimentLab />,
  },
  {
    id: 'threads',
    title: 'Threads',
    summary:
      'Relationships drawn as physical threads that hang between the elements they join and pull taut when you point at one end. The rope solver is Tether, brought back from the archive.',
    render: () => <ThreadsLab />,
  },
  {
    id: 'haze',
    title: 'Haze',
    summary:
      'Smoke over a card, which the pointer wipes away and which closes back over. It never hides anything: the text stays readable through it and the button stays pressable.',
    render: () => <HazeLab />,
  },
  {
    id: 'pour',
    title: 'Pour',
    summary:
      'Sand, water or lava falling onto the page — and piling on the page itself. Every block below is terrain the material lands on. Turn it over and it drains back out.',
    render: () => <PourLab />,
  },
  {
    id: 'displacement-field',
    title: 'Displacement Field',
    summary:
      'A grid pushed aside by the pointer, where displacing one element compresses its neighbours. Turn coupling off to compare against independent falloff.',
    render: () => <DisplacementFieldLab />,
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
