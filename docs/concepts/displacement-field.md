# 🧠 Displacement Field

|             |                                                          |
| ----------- | -------------------------------------------------------- |
| **Stage**   | 🧠 Concept                                               |
| **Created** | 2026-09-09                                               |
| **Spark**   | [💡 Displacement Field](../sparks/displacement-field.md) |
| **Status**  | Model chosen, nothing built, nothing measured            |

## Decision

The field is a **mass–spring lattice**: every element is a point mass, coupled to its
neighbours and anchored to its own rest position. The pointer applies a repulsive
force; everything else — propagation, compression, settling — emerges from the
integration.

The two alternatives from the Spark were rejected:

- **Independent falloff** produces no propagation at all. It is the effect the Spark
  exists to move away from. It survives here as a control (see below), not as the model.
- **Position-based relaxation** propagates correctly and is unconditionally stable, but
  damping and return-to-rest are tuned through an iteration count rather than through a
  physical quantity. That makes the behaviour harder to explain and the API harder to name.

The lattice wins on one specific ground: **propagation and settling come from the same
mechanism**. A falloff model needs a separate return animation, which means two systems
to keep in agreement — the usual reason this class of effect feels wrong.

## The model

Each element `i` has a rest position `p0`, a current position `p`, a velocity `v` and a
mass `m`. Four forces act on it.

**1. Pointer repulsion** — compact support, so elements outside the radius contribute
nothing:

```text
d      = |p0_i - pointer|
falloff = d < radius ? (1 - d / radius)² : 0
F_pointer = intensity * falloff * normalize(p0_i - pointer)
```

Distance is measured from the **rest** position, not the current one. Using the current
position creates a feedback loop where an element pushed away feels less force and
oscillates back into the pointer.

**2. Neighbour coupling** — a linear spring on the _deviation_ from rest separation:

```text
F_neighbour = k_link * Σ ( (p_j - p_i) - (p0_j - p0_i) )
```

This is deliberately not a distance constraint. It is zero at rest, needs no square root
and no normalisation, cannot divide by zero, and is linear in displacement. It is the
cheapest formulation that still transmits a disturbance from neighbour to neighbour.

**3. Anchor** — what actually brings the field home:

```text
F_anchor = -k_anchor * (p_i - p0_i)
```

**4. Damping** — the `resistance` prop:

```text
F_damping = -c * v_i
```

### Integration

Semi-implicit (symplectic) Euler, **fixed timestep**, with substeps consuming the real
elapsed time:

```text
a = (F_pointer + F_neighbour + F_anchor + F_damping) / m
v += a * h
p += v * h        // note: v is updated before p — this is what makes it symplectic
```

Explicit spring integration is only stable while roughly `h < 2 * sqrt(m / k)`. A raw
`deltaTime` therefore diverges on a 30 Hz frame or after a backgrounded tab. So:

- `h` is fixed at `1/120 s`, independent of display refresh rate.
- Accumulated time is clamped to a maximum number of substeps per frame (4 is the
  starting point), which prevents the spiral of death after the tab returns.
- Displacement is clamped as a last resort, so a bad configuration degrades into a
  stiff field rather than an explosion.

### On conservation

The Spark says the space is conserved. This model does **not** conserve area exactly,
and claiming otherwise would be dishonest. What it reproduces is the _perception_ of
conservation: the neighbour term drags adjacent elements along and compresses the ones
behind them. The anchor term breaks strict conservation on purpose — without it the
field drifts and never returns.

The ratio `k_link / k_anchor` is the single most important number in the model. High
anchor keeps the disturbance local; low anchor lets it travel far and settle slowly.
Finding that ratio is the main tuning work of the Lab.

## Rendering strategy

Cheapest technology that can produce the result, in order:

1. **One rAF loop per field**, never one per element. The loop owns all elements.
2. **The loop stops when the field is at rest.** When the pointer is outside and every
   `|p - p0|` and `|v|` is below epsilon, the loop cancels itself and restarts on the
   next pointer entry. A field left running while nothing moves is exactly the hidden
   background work the contract forbids.
3. **One write per element per frame**, as custom properties:
   `el.style.setProperty('--dx', …)`. CSS then decides what to do with them —
   `translate3d` first, but the same values remain available for scale or opacity
   without changing the loop.
4. **`transform` only.** No layout-affecting property is animated.
5. **Geometry is read once**, at mount and on `ResizeObserver`. Never inside a frame —
   a `getBoundingClientRect` in the loop forces synchronous layout and defeats the
   whole design.
6. **The pointer listener does no work.** A single `pointermove` on the container
   stores coordinates in a ref; the loop reads them at frame time. Input events are not
   frames.
7. **React renders the children once.** No state update participates in the motion.

`will-change` is not applied blanket-wise: on a large field it trades layout cost for
compositor memory, and that trade has to be measured before it is made.

## The control

The Lab builds **one component with coupling switchable off** (`k_link = 0`), not two
components. Same render path, same integration, same tuning — the only difference is
whether neighbours talk to each other.

This exists because the Spark named a way to fail: _the coupling turns out to be
visually indistinguishable from independent falloff_. If that happens, the cheap model
wins and this Concept is archived with that finding. It cannot be judged without a fair
side-by-side.

## Provisional API

Names are indicative. They are decided after the Lab, once the behaviour is understood.

```tsx
<DisplacementField>{items}</DisplacementField>

<DisplacementField intensity="high" radius={300} resistance={0.4} />
```

- `intensity` — strength of the pointer force
- `radius` — reach of the pointer, in pixels
- `resistance` — damping; how quickly motion dies
- `spread` — candidate name for the `k_link / k_anchor` ratio, if it needs to be public
  at all

Purely visual values stay in CSS custom properties rather than becoming props.

## What the Lab has to answer

1. Is the coupling actually perceptible against the control?
2. At what element count does the field stop being smooth? **Measured, not asserted.**
3. Does it survive a non-uniform layout, or only a regular grid?
4. Does continuous displacement make text unreadable or targets hard to hit?
5. What is the `prefers-reduced-motion` response? Not necessarily a frozen grid —
   possibly a discrete, non-continuous reaction. Equivalent access, not identical
   interaction.

## Known unknowns

- **4 or 8 neighbours.** Eight transmits diagonally and looks more like a material;
  it also doubles the coupling cost. Undecided.
- **Non-grid layouts have no neighbour graph.** A Delaunay triangulation would give one
  and is almost certainly too heavy here. The Lab may restrict itself to a regular grid
  and treat arbitrary layouts as a separate question.
- **Compositing cost of many transformed layers** is not the same as the physics cost,
  and is the more likely limit. It has not been measured.

No performance claim is made in this document.

## Next stage

🧪 Lab: build the field and its control, tune `k_link / k_anchor`, and answer the five
questions above.
