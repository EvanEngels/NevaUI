# 🧠 Pour

|             |                                         |
| ----------- | --------------------------------------- |
| **Stage**   | 🧠 Concept, revised after the first Lab |
| **Created** | 2026-09-09                              |
| **Spark**   | [💡 Pour](../sparks/pour.md)            |

## Decision: a grid on a canvas

The material is a grid of cells, not a set of particles. One pass per frame, and every
cell is an index into a typed array.

That choice is forced by what this project has already measured. Thousands of grains as
DOM elements is thousands of writes a frame, and 640 elements already cost 0.5 ms.
Thousands of objects with positions is thousands of allocations. A `Uint8Array` and an
index is neither.

It is also the first time the philosophy's ladder — CSS, native APIs,
`requestAnimationFrame`, Canvas, WebGL — honestly reaches the Canvas rung. The DOM cannot
express this, and saying so is different from reaching for a canvas because it is familiar.

## Decision, revised: three materials means three models

The first version made sand, water and lava out of one automaton with different numbers.
It was rejected on sight — _"on utilise la même chose pour le sable, la lave et l'eau et on
change juste la couleur"_ — and the reaction was correct. Read as one material recoloured,
because that is what it was.

The sharing was a premature economy, which is the same mistake as a premature abstraction
wearing different clothes. Each material now has its own file and its own physics, and
what they share is one thing: the page, rasterised into solid cells.

### Sand — inertia and a repose angle

A grain accelerates as it falls and travels that many cells per pass, checking every cell
on the way. Height becomes visible: sand poured from the top of the page arrives fast and
scatters; sand released just above the pile settles.

A resting grain gives way only where the slope is steeper than it holds, and that angle is
drawn per grain rather than fixed — so a face is uneven and collapses in runs.

### Water — mass and pressure

A cell holds an amount, not a yes-or-no. Water gives downward into whatever room pressure
allows, equalises sideways, and **gives upward** anything above what a cell can hold.

That third rule is the one the shared model could not express at any setting. It is what
makes water climb into a cavity and what gives a connected body one surface, and it is why
this is a different simulation rather than different numbers.

### Lava — heat

A cell carries a temperature. Heat decides how likely it is to move, leaves faster where
the cell is exposed, and below a threshold the cell freezes into ground — which later flow
then has to run over. The colour is read from the same field, so the glow and the black
crust are the physics rather than a palette.

## The page is the terrain

Elements are read once and written into the grid as solid cells. **An element's box is its
shape**: a round card is a rectangle to the material. That is cheap and occasionally wrong,
and the alternative — a per-pixel mask of what is actually painted — costs a readback of
the whole page.

## The turn

Gravity is a sign. Flipping it drains the pile upward and off, and the content comes back.
The page does not rotate: upside-down text is a poor trade for a decorative effect.
