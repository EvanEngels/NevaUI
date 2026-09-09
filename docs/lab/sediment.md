# 🧠🧪 Sediment

|             |                                                                          |
| ----------- | ------------------------------------------------------------------------ |
| **Stage**   | 🧪 Lab → ⚡ **promoted**, see [the component](../components/sediment.md) |
| **Created** | 2026-09-09                                                               |
| **Spark**   | [💡 Sediment](../sparks/sediment.md)                                     |
| **Run it**  | `pnpm dev` → Sediment                                                    |

## Decision: FLIP, and one spring per item

The browser lays the list out as it always would. The component records where each item
ended up, offsets each one back to where it was, and lets a spring carry it home. Nothing
fights the layout — it only borrows the difference.

A spring rather than a transition because
[Displacement Field](./displacement-field.md) already established the shape: a spring
gives the travel and the arrival from one mechanism, so there is no separate settling
animation to keep in agreement with the first.

The stagger is what makes it a settle rather than a slide. A waiting item **holds** its
offset rather than easing from it, so the pile visibly absorbs one item after another.

## Findings

### A spring has to be told to stop

A spring approaches zero and never arrives. Resting at three hundredths of a pixel looks
identical to resting at zero and is a list permanently off its own layout — so the residue
is snapped away when everything is below the threshold, and a test checks for exactly zero
rather than nearly zero.

### The same first-frame trap as Threads

The frame that starts a loop has no previous frame, so its elapsed time is zero and
nothing has moved. Judging rest on that frame stops the loop before it begins. This is the
third experiment in a row to meet it, which is enough to call it a pattern rather than a
mistake.

### Only transform moves

Measured in the browser: five items, **0.10 ms median**, and nothing at rest. The list
itself is laid out once by the browser per change, not per frame.

## Still open

- **Does it help?** The settle looks right. Whether it actually makes a change easier to
  follow than a slide is untested, and it is the question the Spark asked.
- Five things arriving at once is untested.
- A list that is still moving is a list whose buttons are moving. Nothing yet stops
  someone clicking mid-settle and hitting the wrong row — the same problem
  [Displacement Field](./displacement-field.md) documents, and it needs the same honesty.
