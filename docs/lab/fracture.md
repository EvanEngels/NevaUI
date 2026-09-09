# 🧠🧪 Fracture

|             |                                          |
| ----------- | ---------------------------------------- |
| **Stage**   | 🧠 Concept, validated directly in 🧪 Lab |
| **Created** | 2026-09-09                               |
| **Spark**   | [💡 Fracture](../sparks/fracture.md)     |
| **Run it**  | `pnpm dev` → Fracture                    |

## Decision: a polar mesh, clipped

Rays out from the impact point, rings around it, and a shard for every cell of that mesh.
Rays and rings do not stop at the panel's corners, so the mesh is clipped to the panel with
Sutherland–Hodgman — forty lines of arithmetic against a rectangle, which is cheaper than a
polygon-clipping dependency and easier to check.

Each shard is a DOM element with a `clip-path` and a transform. No canvas, no WebGL.

## Findings

### The geometry is the risk, so the geometry is what is tested

A missing sliver looks like a rendering glitch and gets chased in the CSS. A shard leaking
past the edge looks like a `clip-path` bug. Both are geometry, and both are now caught by a
test that asks the only question that matters: **do the shards add up to exactly the
panel?** Total shard area must land within 0.5% of the panel area — any shortfall is a
hole, any excess an overlap — with every vertex inside the bounds, from impact points at
the centre and hard against both corners.

The break is also seeded, so a suspicious fracture can be reproduced.

### Counting wall time in an animation is a bug

The shards scatter, hold, then spring back. The hold was originally counted in real
elapsed time — which keeps running in a background tab while frames do not. Look away
during the break and you come back to a panel already reassembling, having missed the
part worth watching. It now counts simulated time, so the scatter is always seen.

This surfaced by accident: frames only advance in a focused tab, and driving the page from
outside made the animation appear frozen. The environment was lying about the symptom and
telling the truth about the cause.

### Reassembly is the same spring, not a rewind

One critically damped spring pulls every piece back to where it belongs, and the shard
elements are removed from the DOM once they arrive. There is no second animation to keep
in agreement with the first, and an intact panel costs nothing.

## Measured

480-frame window during repeated breaks, display period 6.1 ms:

| shards | script median | p95     | max     | long frames |
| ------ | ------------- | ------- | ------- | ----------- |
| 52     | 0.00 ms       | 0.10 ms | 0.20 ms | 1           |
| 144    | 0.10 ms       | 0.10 ms | 0.20 ms | 0           |
| 360    | 0.10 ms       | 0.20 ms | 1.30 ms | 2           |

Effectively free, and flat across a sevenfold increase in shards. The geometry, measured
separately without a DOM, takes 0.074 ms for 360 shards — and it runs once per impact, not
once per frame.

The shard-count ceiling this document said was unmeasured is now measured, and there isn't
one within the range the component offers.

## It breaks real content

The open question — whether anything but a gradient survives being cut into shards — is
answered, and the answer is better than expected.

Each shard now holds a **copy of the children**, clipped to its own polygon. A heading and
a paragraph break along the fracture lines: letters are cut in half, the halves travel
apart, and the type stays sharp on both sides because a shard is transformed rather than
re-rendered. The break cuts through the thing itself rather than through a picture of it.

### The accessibility problem this creates, and its answer

A hundred shards means a hundred copies of the text. A screen reader offered the same
paragraph a hundred times is worse off than one offered nothing.

So the shards are `aria-hidden`, and the intact face stays in the tree at `opacity: 0`
rather than `visibility: hidden` — visibility would have removed it and left the content
readable only as hidden copies, which is to say not at all. Verified in the browser: 22
copies of the heading in the DOM, **one** exposed.

### `rays × rings` is an upper bound, not a count

Cells of the polar mesh that fall outside the panel are clipped away, and roughly a third
survive. Asking for 52 gives 21 shards; asking for 360 gives 125. The playground said
"52 shards" and was wrong every time; it says "up to" now.

### What the content costs

| asked | actual shards | DOM nodes | break handler | write pass per frame |
| ----- | ------------- | --------- | ------------- | -------------------- |
| 52    | 21            | 110       | 0.5 ms        | 0.03 ms              |
| 144   | 53            | 270       | 1.4 ms        | 0.10 ms              |
| 360   | 125           | 630       | 1.6 ms        | 0.15 ms              |

The per-frame cost stays trivial. What grows is the DOM: **nodes ≈ shards × the size of
your content**, built in one burst when the panel is struck. A heading and a paragraph
give 630 nodes at 125 shards. A card with an image and six children would give several
thousand, and the 1.6 ms break would not stay 1.6 ms.

That is the real limit of this design, and it is a limit on _content complexity_ rather
than on shard count.

### Reduced motion

The break survives, the flight does not: pieces part by a few pixels and come straight
back, so the crack still reads and nothing is thrown across the panel. Cancelling the
interaction outright would have removed the content of the interaction, not just its
motion.

### One rough edge found on the way

A break that starts and is then backgrounded stays broken. The hold counts simulated time,
frames stop arriving, so the reassembly waits for the viewer to come back. That is
arguably correct — they see the break they triggered — but it is not a decision anyone
made.

## Promoted to ⚡ Experimental

On 2026-09-09. The keyboard question was the last one open, and it was answered by
deciding rather than by coding: **striking a panel is a pointer gesture with no keyboard
equivalent, and the component does not invent one.** A decorative shatter is not a
control, and giving it a tab stop and a button role would announce an action that does
nothing for the person who takes it. What that buys is a rule instead of a widget: never
put anything behind a break that is not reachable without it.

Promoting it also surfaced an API fact that had been hidden by the prototype: **what
breaks is `children`, not the panel.** The prototype painted its art on the panel itself,
so moving the art to the caller made the panel stay whole while only the text shattered.
The panel is the frame that holds the pieces; the surface to be broken goes inside.

## Still open
