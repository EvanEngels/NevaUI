# ⚡ Lens

|              |                                              |
| ------------ | -------------------------------------------- |
| **Stage**    | ⚡ Experimental — usable, honest, not stable |
| **Promoted** | 2026-09-09                                   |
| **Spark**    | [💡 Lens](../sparks/lens.md)                 |
| **Lab**      | [🧠🧪 Lens](../lab/lens.md)                  |

A disc you move over dense content that magnifies **the real DOM** beneath it, not a
picture of it. Text under the lens is text, rendered at that size.

```tsx
import { Lens } from 'nevaui';
import 'nevaui/styles.css';

<Lens zoom={2.5} radius={110} className="report">
  <table>…</table>
</Lens>;
```

## Props

| Prop        | Type            | Notes                         |
| ----------- | --------------- | ----------------------------- |
| `children`  | `ReactNode`     | The content it magnifies      |
| `zoom`      | `number`        | Default `2.2`                 |
| `radius`    | `number`        | Disc radius in px, default 96 |
| `className` | `string`        | —                             |
| `style`     | `CSSProperties` | —                             |

## What it costs

The content is cloned **once**; moving the lens is a single transform write per frame,
whatever is inside. Measured: 94 cloned nodes for a fourteen-row table, **0.10 ms per
move**.

The cost is the clone. Nodes are one full copy of the content — the same shape
[Fracture](./fracture.md) found with a hundred copies. One is cheap; the limit is still
the complexity of what you put inside.

## Limitations

- **The lens shows you something you cannot click.** The disc takes no pointer events, so
  the real row is underneath at its real size and position: a reader has to stop looking
  through the lens in order to act on what they saw. That is deliberate — an effect that
  moves what you are aiming at has no business carrying controls, which
  [Displacement Field](./displacement-field.md) reached from the other direction.
- **The clone is a snapshot.** Content that changes while the lens is open shows the old
  version under the disc; nothing rebuilds it.
- Only tried on a table.
- The API will change.

## Accessibility

The clone is `aria-hidden` and `inert`: it is never read out twice and never reachable by
tab. The original underneath is the real thing.

Under `prefers-reduced-motion: reduce` the lens never appears — it exists only while
moving, so there is no still version of it to offer.
