# ⚡ Haze

|              |                                              |
| ------------ | -------------------------------------------- |
| **Stage**    | ⚡ Experimental — usable, honest, not stable |
| **Promoted** | 2026-09-09                                   |
| **Spark**    | [💡 Haze](../sparks/haze.md)                 |
| **Lab**      | [🧠🧪 Haze](../lab/haze.md)                  |

Drifting smoke over an element, which the pointer wipes away and which closes back over.

```tsx
import { Haze } from 'nevaui';
import 'nevaui/styles.css';

<Haze className="card">
  <article>…</article>
</Haze>;
```

## The rule it is built around

**The smoke never hides anything.** It sits at a density where the content underneath
stays legible and stays clickable; wiping makes it clearer, it does not make it available.

Anything else turns a decoration into a gate that only a pointer can open, and there is no
keyboard equivalent for waving smoke away.

## Props

| Prop        | Type                    | Notes                               |
| ----------- | ----------------------- | ----------------------------------- |
| `children`  | `ReactNode`             | What the smoke drifts over          |
| `settings`  | `Partial<HazeSettings>` | The current and the smoke           |
| `cellSize`  | `number`                | Simulation cell in px, default `10` |
| `className` | `string`                | —                                   |
| `style`     | `CSSProperties`         | —                                   |

| Setting     | Default | Meaning                                                     |
| ----------- | ------- | ----------------------------------------------------------- |
| `flow`      | `5.5`   | Cells per second the current carries. `0` makes it still    |
| `swirl`     | `0.09`  | Scale of the swirls; larger is broader, calmer motion       |
| `healRate`  | `0.55`  | How fast it returns to its resting level                    |
| `density`   | `0.72`  | Resting density. Above ~0.8 the content stops being legible |
| `variation` | `0.62`  | How uneven the smoke is — with none, it is perfectly still  |
| `brush`     | `80`    | Radius of the wipe, in pixels                               |

## This one never stops

Every other component here stops its loop when nothing is moving. Drifting smoke has no
such state — the current keeps turning — so it runs for as long as the element is on
screen. An `IntersectionObserver` stops it when the element leaves; `prefers-reduced-motion`
draws once and never again; and setting `flow: 0` gives back a loop that ends.

That last one is tested, because the honest version of "it never stops" is being able to
say exactly when it does.

## What it costs

Three cards at 700 cells each: **0.30 ms median, 0.5 ms worst** per frame, for simulation
and drawing together.

The grid is coarse on purpose and the canvas is one pixel per cell, stretched by CSS with
smoothing on — the browser's interpolation is the last step of the model.

## Limitations

- **Density is a number, and nothing stops you setting it too high.** Above roughly 0.8
  the content underneath stops being legible, which breaks the rule the component is built
  on.
- Twenty cards on a page is twenty grids and twenty loops that never stop. Off-screen ones
  pause; twenty visible at once is unmeasured.
- The smoke has no source and no sink: it drifts in place. Right for smoke held against a
  card, wrong for smoke leaving one.
- A viewer who cannot use a pointer sees a permanently hazed element — acceptable only
  because it never hides anything.
- The API will change.
