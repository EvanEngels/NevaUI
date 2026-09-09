# ⚡ Threads

|              |                                              |
| ------------ | -------------------------------------------- |
| **Stage**    | ⚡ Experimental — usable, honest, not stable |
| **Promoted** | 2026-09-09                                   |
| **Spark**    | [💡 Threads](../sparks/threads.md)           |
| **Lab**      | [🧠🧪 Threads](../lab/threads.md)            |
| **Revives**  | [📦 Tether](../archive/tether.md)            |

Relationships drawn as physical threads: they hang between the elements they join, and
tighten when you point at one end.

```tsx
import { Threads } from 'nevaui';
import 'nevaui/styles.css';

<Threads
  links={[
    { from: 'spark', to: 'concept' },
    { from: 'concept', to: 'lab' },
  ]}
  className="map"
>
  <article data-thread="spark">…</article>
  <article data-thread="concept">…</article>
  <article data-thread="lab">…</article>
</Threads>;
```

Both ends of a link name a `data-thread` on a child. Anything without one is simply not
connected.

## A thread has no fixed length

A rope with one end in your hand can defend its length, because the hand gives. A thread's
ends belong to two elements and neither can — so its length **follows the layout**, and
what it keeps is slack. Tightening is lowering slack towards 1, which is the whole of what
pointing at a node does.

## Props

| Prop        | Type                       | Notes                                 |
| ----------- | -------------------------- | ------------------------------------- |
| `children`  | `ReactNode`                | The elements. Mark with `data-thread` |
| `links`     | `readonly Link[]`          | `{ from, to }` by `data-thread`       |
| `settings`  | `Partial<ThreadsSettings>` | —                                     |
| `className` | `string`                   | Layout lives here                     |
| `style`     | `CSSProperties`            | —                                     |

| Setting  | Default | Meaning                                                       |
| -------- | ------- | ------------------------------------------------------------- |
| `slack`  | `1.14`  | Resting length as a multiple of the gap. 1 is a straight line |
| `taut`   | `1.01`  | Slack of a thread whose end is being pointed at               |
| `points` | `18`    | Points per thread: smoother, and slower                       |

Colour and weight are CSS: style `.neva-threads__line`.

## What it costs

Seven threads at eighteen points: **0.30 ms median while swinging, nothing at rest** —
which is most of the time. One SVG path attribute per thread per frame, so point count
changes the physics cost and not the DOM cost.

## Limitations

- **Whether it informs is unproven.** The threads look like relationships. Whether a
  reader learns anything the layout did not already say is untested, and it is the
  question that decides whether this is a component or a toy.
- Seven threads is comfortable; there is no measurement above that.
- Threads cross other content freely, and nothing avoids it.
- The API will change.

## Accessibility

**The threads are decoration over a relationship that has to exist without them.** A line
between two boxes says nothing to a screen reader and nothing to anyone who cannot see it,
so whatever they illustrate must also be in the content or the markup. The component
cannot enforce that on its caller, which is why it is the first thing said here.

Under `prefers-reduced-motion: reduce` no loop is started: the threads are drawn once,
still.
