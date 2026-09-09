# ⚡ Displacement Field

|              |                                                            |
| ------------ | ---------------------------------------------------------- |
| **Stage**    | ⚡ Experimental — usable, honest, and not API-stable       |
| **Promoted** | 2026-09-09                                                 |
| **Spark**    | [💡 Displacement Field](../sparks/displacement-field.md)   |
| **Concept**  | [🧠 Displacement Field](../concepts/displacement-field.md) |
| **Lab**      | [🧪 Displacement Field](../lab/displacement-field.md)      |

A grid the pointer pushes aside, where displacing one cell compresses its neighbours and
the disturbance travels outward.

```tsx
import { DisplacementField } from 'nevaui';
import 'nevaui/styles.css';

<DisplacementField columns={3}>
  <article>…</article>
  <article>…</article>
  <article>…</article>
</DisplacementField>;
```

## What makes it different

The common version of this is per-element magnetic hover: every element reads its own
distance to the pointer and moves independently. Nothing is shared, so nothing propagates,
and it reads as a set of separate widgets reacting at the same time.

Here the cells are a mass-spring lattice. Pushing one compresses the ones behind it, and
the field behaves like a material rather than a collection. Turning that off — `coupling`
— is not a cheaper setting, it is a different and visibly incoherent effect: the cells run
to their own limits and collide.

Propagation and settling come out of the same integration, so there is no separate return
animation to keep in agreement with the push.

## Props

| Prop        | Type                     | Notes                                         |
| ----------- | ------------------------ | --------------------------------------------- |
| `children`  | `ReactNode`              | Each direct child becomes a cell              |
| `columns`   | `number`                 | Grid width. The neighbour graph depends on it |
| `coupling`  | `boolean`                | Default `true`. See above                     |
| `settings`  | `Partial<FieldSettings>` | The physics                                   |
| `className` | `string`                 | Extra class, for layout beyond the columns    |

### Settings

| Setting           | Default | Meaning                                                |
| ----------------- | ------- | ------------------------------------------------------ |
| `displacement`    | `28`    | **How far the most-displaced cell travels, in pixels** |
| `radius`          | `180`   | Reach of the pointer, in pixels                        |
| `resistance`      | `19.7`  | Damping. Higher kills motion faster                    |
| `linkStiffness`   | `600`   | Neighbour coupling                                     |
| `anchorStiffness` | `120`   | Pull back to rest                                      |
| `mass`            | `1`     | Mass of a cell                                         |
| `maxDisplacement` | `80`    | Hard limit, so a bad configuration stiffens            |

`displacement` is a distance, not a force, and it means the same thing on any grid: the
force required is measured on your actual layout when the field is built. The ratio
`anchorStiffness / linkStiffness` is the one that changes the feeling — lower reaches
further and settles slower, and there is no value that does both.

Layout is yours. Set `--neva-field-gap` for spacing.

## What it costs

Measured — 480-frame window, 6.0 ms display period:

| cells | script per frame | long frames |
| ----- | ---------------- | ----------- |
| 160   | 0.10 ms          | 0           |
| 320   | 0.30 ms          | 0           |
| 640   | 0.50 ms          | 5 (1%)      |

640 cells costs 8% of a frame. It scales because the only thing animated is `transform`,
which the compositor moves without redrawing anything — the neighbour coupling accounts
for 0.1 ms of that and the solver itself for 0.028 ms; the rest is DOM writes.

**That property is yours to lose.** Put something expensive to paint inside a cell — a
blurred shadow that changes, a gradient that moves — and the field will repaint every
visible cell every frame. See [Lumen's notes](../lab/lumen.md#what-it-costs-measured) for
what that looks like when it goes wrong.

Caveats: one machine, one display, and a pointer driven by a script rather than a hand.

## Limitations

- **Do not put controls in a field.** Cells move away from the pointer, and the hit area
  moves with them exactly: aim at a link, displace its cell by 120 px, and the point you
  aimed at is the empty field. Verified, not assumed. Buttons and links get harder to hit
  the closer you get, which is the effect working and the control failing. Presentation
  only.
- **Cells overlap when displaced.** Content with a background will slide over its
  neighbours. That reads fine for cards and badly for anything that must stay in a row.
- **Regular grids only.** `columns` defines the neighbour graph, so the field has no
  meaning for a masonry or free-form layout.
- Cells near an edge have fewer neighbours to fight and travel somewhat further than
  `displacement` asks for, because the force is calibrated at the centre.
- Resizing rebuilds the field from rest, which is visible if it was mid-motion.
- The API will change.

## Accessibility

Under `prefers-reduced-motion: reduce` the component **starts no loop, listens for nothing
and writes nothing**: every cell stays exactly where the layout put it, and the content is
as operable as it would be without the field. Enforced by a test.

Text inside a cell stays crisp while it moves — the cells are transformed, not re-rendered
— and content keeps whatever semantics you gave it.
