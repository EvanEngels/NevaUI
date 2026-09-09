# NevaUI

Experimental React component library exploring motion, interaction, spatial interfaces,
physics, visual effects and layout.

> **Status: foundation.** The repository is set up; no components have been published yet.

NevaUI is the first open-source project under the **Neva** brand.

## What is NevaUI?

A library of original React components built around movement and interaction rather than
around the usual catalogue of buttons, cards and modals. Components are independent: you
should be able to use one without adopting a runtime, a provider tree or the rest of the library.

## Why does it exist?

Most component libraries solve the same solved problems. NevaUI exists to explore the parts
of the web platform that are still underused in product UI — pointer physics, spatial layout,
frame-accurate motion, cheap visual effects — and to turn the experiments that prove valuable
into components that are honest about what they cost.

## Core philosophy

- **Experiment freely. Publish responsibly.** Anything can be tried; anything published states
  its maturity, limitations and requirements.
- **Performance by design.** Performance is a design input, not a final optimisation pass.
- **React is not the animation engine.** React handles structure, composition and state.
  Continuous motion belongs to CSS, the Web Animations API, `requestAnimationFrame` and refs.
- **Use the cheapest technology capable of producing the experience.**
  CSS → native browser APIs → `requestAnimationFrame` → Canvas → WebGL.
- **Test the risk, not the file.** Tests follow the risk a component introduces — logic,
  interaction, visual, performance, accessibility — not a coverage target.
- **Readable before clever.** Complexity has to justify itself.
- **AI-generated code must remain explainable.** If the architecture, algorithm or rendering
  strategy cannot be explained, it does not ship.
- **Complexity must justify itself.** Dependencies, abstractions and infrastructure need a
  demonstrated reason, not a hypothetical one.
- **Modern web first.** Current Chrome, Edge, Firefox and Safari.
- **Progressive enhancement over compatibility hacks.** A modern experience with a graceful
  fallback beats a polyfill stack.

## Component lifecycle

Every component moves through five stages. The stage tells you what to expect from it.

| Stage               | Meaning                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| 💡 **Spark**        | A raw idea. No implementation, no quality requirements.                                  |
| 🧠 **Concept**      | The idea developed: interaction model, design reasoning, rendering strategy.             |
| 🧪 **Lab**          | A prototype. Anything goes — heavy dependencies, poor performance, broken APIs.          |
| ⚡ **Experimental** | Public but honest. Usable, documented limitations, no API stability guarantee.           |
| ✅ **Stable**       | Production-ready. Risks tested, accessibility addressed, performance and API documented. |

```text
Spark → Concept → Lab → Experimental → Stable
```

Experiments that do not work out are archived with what was explored, what was learned and
why it stopped. A documented dead end is a result.

## Components

### ⚡ Experimental

Usable and honest about what they cost. No API stability guarantee.

```bash
pnpm add nevaui
```

```tsx
import { DisplacementField, Fracture, Haze, Lens, Lumen, Sediment, Threads, Weight } from 'nevaui';
import 'nevaui/styles.css';
```

|                                                                   |                                                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **[Displacement Field](./docs/components/displacement-field.md)** | A grid the pointer pushes aside, where displacing one cell compresses its neighbours. 640 cells cost 8% of a frame. |
| **[Lumen](./docs/components/lumen.md)**                           | A surface lit by one moving light, at two DOM writes per frame however many faces it has.                           |
| **[Weight](./docs/components/weight.md)**                         | A light that falls on text and makes the letters heavier, without moving a single word.                             |
| **[Fracture](./docs/components/fracture.md)**                     | A panel that breaks along geometry computed from where you struck it, cutting through the real content.             |

### 🧪 In the Lab

Prototypes. Not exported, not published, APIs will change.

|                                |                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **[Pour](./docs/lab/pour.md)** | Sand, water or lava falling onto the page and piling on the layout itself. Held back: the look is deferred by decision. |
| **[Wake](./docs/lab/wake.md)** | Fast movement leaves a trail that fades. Held back: it has not shown that it informs rather than decorates.             |

### 📦 Archived

Experiments that taught something and stopped. A documented dead end is a result.

|                                        |                                                                      |
| -------------------------------------- | -------------------------------------------------------------------- |
| **[Tether](./docs/archive/tether.md)** | An inextensible line with mass. It worked. It never found a purpose. |

Each carries its own notes — the [sparks](./docs/sparks), the [concepts](./docs/concepts),
and what the [lab](./docs/lab) actually showed, including what failed and how frames are
[measured](./docs/lab/measuring-frames.md). `pnpm dev` runs the playground for all of it.

## Development

Requires Node 22.22.2 or newer (`.nvmrc` pins the local version) and pnpm.

```bash
pnpm install
```

| Command                             | Purpose                                 |
| ----------------------------------- | --------------------------------------- |
| `pnpm typecheck`                    | Strict TypeScript check                 |
| `pnpm lint`                         | ESLint (type-aware)                     |
| `pnpm format` / `pnpm format:check` | Prettier                                |
| `pnpm test` / `pnpm test:watch`     | Vitest + React Testing Library          |
| `pnpm build`                        | Library build (ESM + type declarations) |
| `pnpm validate`                     | All of the above, in order              |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) © Neva
