# 🧠🧪 Tether

|             |                                          |
| ----------- | ---------------------------------------- |
| **Stage**   | 🧠 Concept, validated directly in 🧪 Lab |
| **Created** | 2026-09-09                               |
| **Spark**   | [💡 Tether](../sparks/tether.md)         |
| **Run it**  | `pnpm dev` → Tether                      |

The model was small enough to build in an afternoon, so the Concept was settled in the
Lab rather than on paper. What follows is the decision and what building it showed.

## Decision: position constraints, not springs

The Displacement Field uses springs, because it wants a material that gives. A rope wants
the opposite: it must not stretch. Length is a **constraint**, not a force, and a stiff
spring is exactly the case where explicit integration diverges — the stiffer the rope, the
smaller the timestep it demands, without ever quite being inextensible.

So Tether uses Verlet integration with position constraints. It is stable at any
stiffness because it never integrates a force: it moves points and lets velocity fall out
of the difference between frames. The honest knob is the number of constraint passes —
one pass leaves the rope rubbery, more passes make it rigid — and it is exposed in the
playground so the trade is visible rather than hidden.

Two solvers in one repository is not duplication. It is two different problems.

## Findings

### The refusal is the interaction

The first version pinned the grabbed end to the pointer. Pull past the rope's length and
both ends are pinned further apart than the rope can reach: the constraint is unsolvable,
the solver does its best, and the rope stretches like elastic. Wrong material.

A test caught it before the browser did. The fix is that **the hand gives, not the rope**:
past full extension the end stops following the pointer and goes taut. That single change
is what makes it feel like a rope instead of a rubber band, and it was not in the Spark.

### The whole rope is one attribute

Twenty-six points, and a frame writes a single SVG `d` string plus one transform for the
weight. The browser interpolates the curve. Point count changes the physics cost, not the
DOM cost.

## Still open

- No keyboard or touch story. The interaction is a drag, and a drag is not available to
  everyone. This blocks ⚡ Experimental on its own.
- Resizing rebuilds the rope from rest, which is visible if it was mid-swing.
- It is still a behaviour looking for a purpose. Nothing here says what a tether is _for_.
