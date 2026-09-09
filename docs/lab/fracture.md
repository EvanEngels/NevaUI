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

## Still open

- The pieces are empty gradient faces. Whether real content survives being cut into shards
  — text especially — is the whole question for anything beyond decoration, and it is
  untested.
- Shard count is `rays × rings` with no measured ceiling.
- Reduced motion currently only drops `will-change`. The break still throws pieces around,
  which is not good enough and needs a real answer.
- Striking is a pointer event. No keyboard equivalent exists.
