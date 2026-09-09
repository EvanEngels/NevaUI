# 🧪 Displacement Field

|             |                                                            |
| ----------- | ---------------------------------------------------------- |
| **Stage**   | 🧪 Lab                                                     |
| **Created** | 2026-09-09                                                 |
| **Spark**   | [💡 Displacement Field](../sparks/displacement-field.md)   |
| **Concept** | [🧠 Displacement Field](../concepts/displacement-field.md) |
| **Run it**  | `pnpm dev`                                                 |

A prototype, not a component. It is not exported from the library, it is not published,
and its API will change.

## What was built

- `lab/displacement-field/field.ts` — the physics, with no DOM and no React. This is
  where the logic risk lives, so it is testable on its own.
- `lab/displacement-field/DisplacementField.tsx` — one rAF loop, one custom-property
  write per element per frame, geometry measured outside the frame.
- `lab/main.tsx` — the playground, with the coupling switch and a measured frame readout.

## Findings

### 1. The coupling is perceptible — and it is what keeps the field coherent

This was the question the whole Concept hung on, and the answer is not subtle.

With coupling on, the field opens around the pointer and the elements bend with their
neighbours: it reads as a material. With coupling off, at identical settings, each
element runs to its own limit independently and they **collide and overlap**, leaving a
hard-edged hole surrounded by piled-up elements.

Independent falloff does not produce a weaker version of the same effect. It produces a
different, incoherent one. The lattice is what buys coherence, and the extra cost is
justified.

### 2. The stiffness ratio trades reach against settling, and nothing avoids that

Measured on a 16×27 grid, 56px spacing, pointer held on one cell until steady state.
`intensity` was calibrated for a 28px peak in each row so the columns are comparable.

| `anchor / link` | 2 cells away | 4 cells away | settle time |
| --------------- | ------------ | ------------ | ----------- |
| 0.30            | 72%          | 17%          | 0.78 s      |
| **0.20**        | **76%**      | **21%**      | **0.95 s**  |
| 0.12            | 79%          | 26%          | 1.25 s      |

Lower ratio reaches further and takes visibly longer to come home. There is no setting
that does both, so 0.20 is the default: clearly propagating, back at rest inside a second.

### 3. Tuning measured on a 1D chain did not transfer to a 2D grid

The first calibration was done on a single row and produced an `intensity` of 9300. In
the playground, that same value was nearly invisible: a 2D lattice resists roughly **8×
more**, because a displaced element is held by four neighbours instead of two and the
elements on opposite sides of the pointer pull against each other.

Re-measured on the real grid, the default is `74000`.

The propagation percentages, on the other hand, transferred almost unchanged — the
stiffness _ratio_ is geometry-independent in a way the absolute `intensity` is not.

**Consequence for the API — since resolved.** `intensity` was a raw force scale, so the
same prop produced different effects on differently spaced grids. It has been replaced by
`displacement`, a distance in pixels, and the force needed to produce it is now _measured
on the actual layout_ when the field is built: one relaxation pass to steady state at unit
force, then a scale, because everything in the model is linear in the force.

A test holds the line — the same `displacement` prop must produce the same travel on grids
spaced 30, 56 and 90 pixels apart, within 15%. The remaining honesty: the reference pointer
sits at the field's centre, so elements near an edge, having fewer neighbours to fight,
travel somewhat further than requested.

### 4. Measured, and it holds

The first numbers here were nonsense, taken in a tab that was never rendering — see
[measuring frames](./measuring-frames.md#why-the-earlier-numbers-contradicted-each-other).
Retaken with the harness, in a visible tab, 480-frame window, display period 6.0 ms:

| elements          | script median | p95     | max     | long frames |
| ----------------- | ------------- | ------- | ------- | ----------- |
| 80                | 0.10 ms       | 0.20 ms | 0.20 ms | 0           |
| 160               | 0.10 ms       | 0.20 ms | 0.40 ms | 0           |
| 320               | 0.30 ms       | 0.40 ms | 0.60 ms | 0           |
| 640               | 0.50 ms       | 0.70 ms | 2.60 ms | 5 (1%)      |
| 640, coupling off | 0.40 ms       | 0.60 ms | 0.90 ms | 0           |

At 640 elements the field uses **8% of a frame** and drops 1% of them. Nothing here is
close to a ceiling.

Two things fall out of the control row. The neighbour coupling — the expensive-sounding
part, the reason the Concept exists — costs **0.1 ms at 640 elements**. And measured
separately without any DOM, the solver itself takes 0.028 ms at that size, which means
**roughly 94% of the script time is the DOM writes, not the physics**.

The field animates `transform` and nothing else, which is why it scales where Lumen's
per-face mode did not: the compositor moves a transform without redrawing anything.

Caveats as ever: one machine, one display, and the pointer driven by a script on the same
main thread rather than by a hand.

## Promoted to ⚡ Experimental

On 2026-09-09, once the two things this document called untested had been tested.

**Real content survives it.** The prototype only ever moved dots. Cards with a heading, a
paragraph and a link behave: the text stays crisp while the cell moves, because a cell is
transformed rather than re-rendered, and the layout holds. Cells do slide over their
neighbours when displaced, which reads fine for cards and would read badly for anything
that must stay in a row.

**Hit targets move with the cell, exactly.** Aim at a link, displace its cell by 120 px,
and `elementFromPoint` at the place you aimed returns the empty field. That is not a bug
to fix — it is the effect working — and it settles the question the notes kept deferring:
controls do not belong in a field, and the component says so first rather than last.

## Still open

- 4 vs 8 neighbours. Only 4 were built. Whether diagonals change the feeling is untested.
- Non-grid layouts. `columns` is required, so the neighbour graph only exists for a
  regular grid. Arbitrary layouts have no answer yet.
- `prefers-reduced-motion` currently freezes the elements in place via CSS. It works, but
  it is the trivial answer, not necessarily the right one.
- The rest-position pointer distance means the force does not follow an element that has
  already moved. This is deliberate and it is stable, but it may be why fast pointer
  sweeps feel slightly detached.

## Verdict

The Concept survives. The coupling earns its cost, the model is stable, and the field
returns to rest without a separate animation.

It is **not** ready for ⚡ Experimental: the performance envelope is unmeasured, and it has
only ever been tried on a uniform grid of dots. The layout dependence that blocked it has
been fixed — see finding 3.
