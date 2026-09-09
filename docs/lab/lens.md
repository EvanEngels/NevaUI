# 🧠🧪 Lens

|             |                                          |
| ----------- | ---------------------------------------- |
| **Stage**   | 🧠 Concept, validated directly in 🧪 Lab |
| **Created** | 2026-09-09                               |
| **Spark**   | [💡 Lens](../sparks/lens.md)             |
| **Run it**  | `pnpm dev` → Lens                        |

## Decision: clone once, transform per frame

The content is duplicated once, the copy is scaled, and a circular element clips it.
Moving the lens is a single transform write per frame, whatever is inside it.

The alternative — redrawing a magnified bitmap — gives soft type and loses selection. Here
the numbers under the lens are text rendered at that size.

## Findings

### The whole component is four lines of arithmetic, and getting them wrong is not subtle

Scaling by `zoom` about the origin sends a point to `p × zoom`, so the copy has to be
pushed back by `p − p × zoom` for the focused point to stay under the pointer. Then —
and this is the part that was missed — the copy lives inside a disc whose own corner has
been moved to `focus − radius`, so it has to be shifted back by that too.

Without the second step the lens magnifies perfectly and shows **the wrong part of the
page**, which reads as the whole idea being broken rather than as a frame of reference
being wrong. It is now a pure function with a test that says the focused point lands at
the centre of the disc.

### The copy is the cost, and it is the same lesson as Fracture

94 nodes cloned for a fourteen-row table, and **0.10 ms per move** — the per-frame work
does not care what is inside. What cares is the clone: nodes are one full copy of the
content, built once.

[Fracture](./fracture.md) found the same shape with a hundred copies. One copy is cheap;
the limit is still the complexity of what you put inside rather than anything the
component does per frame.

## Still open

- **The lens shows you something you cannot click.** The disc takes no pointer events, so
  the real row is underneath at its real size and position. That is deliberate — an
  effect that moves what you are aiming at has no business carrying controls, which
  [Displacement Field](./displacement-field.md) reached from the other direction — but it
  means a reader has to stop looking through the lens in order to act on what they saw.
- The clone is a static snapshot. Content that changes while the lens is open shows the
  old version underneath the disc, and nothing yet rebuilds it.
- Only tried on a table.
