# 🧠 Pour

|             |                              |
| ----------- | ---------------------------- |
| **Stage**   | 🧠 Concept                   |
| **Created** | 2026-09-09                   |
| **Spark**   | [💡 Pour](../sparks/pour.md) |

## Decision: a cellular automaton, on a canvas

The material is a grid of bytes, not a set of particles with positions and velocities.
One pass per frame, bottom-up, each cell either falling, sliding or at rest.

That choice is forced by two things this project has already measured. Thousands of grains
as DOM elements is thousands of writes a frame, and 640 elements already cost 0.5 ms.
Thousands of objects with positions is thousands of allocations and a lot of pointer
chasing. A `Uint8Array` and an index is neither.

It is also the first time the philosophy's ladder — CSS, native APIs, `requestAnimationFrame`,
Canvas, WebGL — honestly reaches the Canvas rung. The DOM cannot express this, and saying
so is different from reaching for a canvas because it is familiar.

## The rules

Three, applied to every filled cell, in order:

1. If the cell below is empty, fall into it.
2. Otherwise look sideways, out to `spread` cells, for a lower cell that is empty, and
   slide there. The path has to be clear, or material tunnels through walls.
3. Otherwise stay.

Rows are scanned **against** gravity, so a cell moves once per pass rather than being
carried all the way down by the loop — the material falls at the speed of the frame, not
the speed of the iteration. Scan direction alternates per row, or the whole pile drifts
sideways over time.

## One automaton, three materials

They differ in two numbers.

| Material | `spread` | `mobility` | What it does                                     |
| -------- | -------- | ---------- | ------------------------------------------------ |
| Sand     | 1        | 1          | Slides one cell, so it heaps at an angle         |
| Water    | 6        | 1          | Looks far for a lower place, so it finds a level |
| Lava     | 2        | 0.35       | Moves rarely, so it thickens and dribbles        |

This is a shared parameter set, not an engine. If a fourth material needs a fourth rule,
it gets its own code rather than another flag.

## The page is the terrain

Elements are read once and written into the grid as solid cells. Material lands on them,
sheds off their edges and fills the gaps between them.

The consequence worth stating: **an element's box is its shape**. A round card is a
rectangle to the material. That is cheap and occasionally wrong, and the alternative — a
per-pixel mask of what is actually painted — costs a readback of the whole page.

## The turn

Gravity is a sign. Flipping it makes the pile drain upward and off the top, and the
content comes back. The page itself does not rotate: upside-down text is a poor trade for
a decorative effect.

## What the Lab has to answer

1. Do the three materials actually read as different things, or as one thing recoloured?
2. What does it cost, and does the cost follow the page or the material?
3. Does the pile bury content that still has to be read?
4. Is a box-shaped terrain convincing enough?
