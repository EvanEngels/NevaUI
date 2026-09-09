# ⚡ Sediment

|              |                                              |
| ------------ | -------------------------------------------- |
| **Stage**    | ⚡ Experimental — usable, honest, not stable |
| **Promoted** | 2026-09-09                                   |
| **Spark**    | [💡 Sediment](../sparks/sediment.md)         |
| **Lab**      | [🧠🧪 Sediment](../lab/sediment.md)          |

A list that settles when it changes. An item that arrives falls into place and the ones
below absorb the shift, one after another, instead of the whole list sliding.

```tsx
import { Sediment } from 'nevaui';
import 'nevaui/styles.css';

<Sediment className="my-list">
  {events.map((event) => (
    <article key={event.id}>…</article>
  ))}
</Sediment>;
```

**Every child needs a stable key.** That is how the component knows which item is which
between renders, and therefore which ones moved and which arrived.

## Why not a transition

A slide says _something changed_. A settle says _what changed, and from where_, because
the movement starts at the item that arrived and travels outward. That is what the stagger
buys: a waiting item **holds** its offset rather than easing from it.

## Props

| Prop        | Type                        | Notes                          |
| ----------- | --------------------------- | ------------------------------ |
| `children`  | `ReactNode`                 | The list. Stable keys required |
| `settings`  | `Partial<SedimentSettings>` | The spring                     |
| `className` | `string`                    | Layout lives here              |
| `style`     | `CSSProperties`             | —                              |

| Setting         | Default | Meaning                                               |
| --------------- | ------- | ----------------------------------------------------- |
| `stiffness`     | `210`   | Higher arrives sooner and overshoots harder           |
| `damping`       | `22`    | Around 2·√stiffness is critical; below it, it bounces |
| `stagger`       | `0.028` | Seconds between one item starting and the next        |
| `restThreshold` | `0.05`  | Below this it has arrived                             |

## What it costs

FLIP: the browser lays the list out as it always would, once per change. Per frame the
component writes one `transform` per item, composited.

Measured: five items, **0.10 ms median**, and nothing at rest — which is most of the time.

## Limitations

- **A list that is still moving is a list whose buttons are moving.** Nothing stops
  someone clicking mid-settle and hitting the row above. Keep the settle short, or keep
  destructive actions out of it.
- Five things arriving at once is untested.
- Whether the settle actually makes a change easier to follow than a slide is **not
  established** — it is the question the Spark asked and the Lab did not answer.
- The API will change.

## Accessibility

Under `prefers-reduced-motion: reduce` **nothing is offset and no loop is started**: items
appear where the layout put them, immediately. Enforced by a test, because a version that
displaced and then snapped back would look identical in review.

The list is the content; the settle is a way of noticing it changed, and noticing must not
depend on it.
