# ⚡ Fracture

|              |                                                      |
| ------------ | ---------------------------------------------------- |
| **Stage**    | ⚡ Experimental — usable, honest, and not API-stable |
| **Promoted** | 2026-09-09                                           |
| **Spark**    | [💡 Fracture](../sparks/fracture.md)                 |
| **Lab**      | [🧠🧪 Fracture](../lab/fracture.md)                  |

A panel that breaks where you strike it.

```tsx
import { Fracture } from 'nevaui';
import 'nevaui/styles.css';

<Fracture className="panel">
  <div className="art">
    <h3>Break the sentence</h3>
    <p>Real text, cut along the fracture lines rather than painted onto them.</p>
  </div>
</Fracture>;
```

**What breaks is `children`, not the panel.** The panel is the frame that holds the pieces
and keeps them from flying across the page; a background painted on it stays whole while
its contents shatter. Put the surface you want broken inside.

## What makes it different

The break is computed from the point of impact, so hitting a corner and hitting the middle
give different geometry — it is not a canned animation played back the same way twice.
Rays and rings form a polar mesh, clipped to the panel with Sutherland–Hodgman.

Every shard holds a copy of the children, so the break cuts through the real content
rather than a picture of it. Text is sliced in half and the halves travel apart with the
type sharp on both sides, because a shard is transformed rather than re-rendered.

Reassembly is one critically damped spring pulling every piece home — not the break played
backwards — and the shard elements leave the DOM once they arrive, so an intact panel
costs nothing.

## Props

| Prop        | Type                        | Notes                                       |
| ----------- | --------------------------- | ------------------------------------------- |
| `children`  | `ReactNode`                 | What breaks                                 |
| `settings`  | `Partial<FractureSettings>` | The geometry                                |
| `force`     | `number`                    | How hard pieces leave, px/s at the impact   |
| `holdMs`    | `number`                    | How long they stay scattered. Default `900` |
| `className` | `string`                    | Size, colour and corners live here          |

| Setting        | Default | Meaning                              |
| -------------- | ------- | ------------------------------------ |
| `rays`         | `13`    | Rays leaving the impact point        |
| `rings`        | `4`     | Rings around it                      |
| `irregularity` | `0.55`  | How jagged the break is, from 0 to 1 |

**`rays × rings` is an upper bound, not a count.** Cells that fall outside the panel are
clipped away and roughly a third survive: asking for 52 gives about 21 shards, asking for
360 gives about 125.

## What it costs

The per-frame cost is trivial and flat — 0.10 ms at 125 shards, unchanged across a
sevenfold increase. Shards animate `transform`, which the compositor moves without
redrawing anything.

**What grows is the DOM**, because every shard is a copy of your content:

| shards | DOM nodes | break  |
| ------ | --------- | ------ |
| 21     | 110       | 0.5 ms |
| 53     | 270       | 1.4 ms |
| 125    | 630       | 1.6 ms |

Measured with a heading and a paragraph inside. A card with an image and six children
would give several thousand nodes, and the break would not stay at 1.6 ms.

**The limit is the complexity of what you put inside, not the shard count** — which is not
where anyone was looking.

## Limitations

- **Decoration. It must never be the only way to do anything.** See below.
- Content complexity multiplies with shard count, as above.
- Pieces are clipped at the panel's edge rather than flying over the page.
- A break that starts and is then backgrounded stays broken: the hold counts simulated
  time, frames stop arriving, and reassembly waits for the viewer to come back. Arguably
  right, but nobody decided it.
- The API will change.

## Accessibility

**Striking a panel is a pointer gesture with no keyboard equivalent, and this component
deliberately does not invent one.** A decorative shatter is not a control; giving it a tab
stop and a button role would announce an action that does nothing for the person who takes
it. So the rule is the one above: never put anything behind a break that is not reachable
without it.

The content stays reachable throughout. Shards are `aria-hidden` copies and the intact
face stays in the accessibility tree at `opacity: 0` — `visibility: hidden` would have
removed it and left the passage readable only as hidden copies. Verified: 22 copies of a
heading in the DOM, one exposed.

Under `prefers-reduced-motion: reduce` the panel still breaks — the crack is the content of
the interaction — but the pieces part by a few pixels and come straight back instead of
being thrown.
