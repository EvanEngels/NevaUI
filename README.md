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
