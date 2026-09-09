# 🧪 Pour

|             |                                |
| ----------- | ------------------------------ |
| **Stage**   | 🧪 Lab                         |
| **Created** | 2026-09-09                     |
| **Spark**   | [💡 Pour](../sparks/pour.md)   |
| **Concept** | [🧠 Pour](../concepts/pour.md) |
| **Run it**  | `pnpm dev` → Pour              |

## The first version was rejected, and rightly

One automaton, three sets of numbers, three colours. It heaped, it levelled, it dribbled,
and it read as one material painted three ways — which is exactly what it was.

Everything below is the second version: three separate models. The finding is the rejection
itself. **A shared model is a claim that the things are the same**, and sand, water and lava
are not: one has friction, one has pressure, one has temperature. No amount of parameter
gives a material a property the model does not have.

## What each one gained

### Sand: inertia, and a slope that collapses

Grains accelerate and travel several cells a pass, so a stream poured from the top of the
page arrives fast and scatters instead of stacking. The repose angle is drawn per grain, so
the face of a pile is uneven and gives way in runs.

Visible in a render: the pile is now steeper than the 45° the old rule forced, the surface
has dune-like ridges, and a falling stream is a visible line of grains rather than a solid
column.

### Water: pressure, which is the whole difference

Water became a mass per cell instead of a bit, with three rules: give down into whatever
room pressure allows, equalise sideways, and give **up** anything above what a cell can
hold.

That last rule is the one the shared model could not express, and it changes the result
completely. Left to settle, water now forms **one flat surface across the entire page,
passing underneath every block** — the caves that sand leaves are filled, because water
climbs into them from below. Sand and water no longer resemble each other at all.

Exact conservation is a test, not a hope: the total is unchanged to three decimals after
hundreds of passes.

### Lava: heat, and the crust it produces

A temperature per cell governs how readily it moves, cools faster where the cell is
exposed, and freezes the cell into ground below a threshold.

The result is a flow with a **dark crust at its edges and a bright interior**, which is not
painted on — the colour is read from the same field the movement is. It builds its own
landscape: frozen lava becomes terrain, so a second flow runs over the first.

**The first tuning was five times too fast** and produced rock falling through the air: it
froze before it had gone anywhere, which looks like a bug and is really a number. Cooling
is now set against the clock — about four seconds from full heat to frozen when exposed on
every side, closer to fifteen when buried inside a flow.

## What it costs

Measured in the browser at last, on a visible tab delivering 146 frames a second, at 5px
cells. Simulation and drawing separately, which is what the earlier notes could not do:

| material | material on screen | simulate | draw    | frame budget used |
| -------- | ------------------ | -------- | ------- | ----------------- |
| sand     | 14,401 cells       | 1.30 ms  | 0.70 ms | 29%               |
| water    | 18,059 cells       | 1.80 ms  | 0.40 ms | 32%               |
| lava     | 11,143 cells       | 0.70 ms  | 1.10 ms | 26%               |

**Drawing is now measured**, and it is not free: one `putImageData` of a grid-sized buffer
costs between 0.4 and 1.1 ms, in the same range as the physics. Lava draws the most because
every cell it owns is opaque and stays owned once frozen; water draws the least because
most of its cells are below the threshold and are skipped.

A third of a frame for a full page of material, on this machine. Headless measurement of
the same simulations was two to three times faster, which is the usual gap between a tight
loop in a warm process and the same loop competing with a browser's own work — worth
remembering the next time a Node number looks reassuring.

Water is stepped four times a frame; the other two once. It needs it — a single pass moves
a level towards equilibrium by a fraction of the difference, so a pool settles over
thousands of passes. Sand and lava reach their resting shape in one pass each, because a
grain either moves or does not.

Sand was 1.37 ms until the slope check stopped scanning to the floor. It only ever needed
to know whether one column stands a few cells above another; counting the rest was work
thrown away, and removing it made a half-full page 2.6× cheaper.

## Watched at full speed

The earlier notes said the physics was right and how it _feels_ was unverified, because
every image had been produced headlessly. It has now been watched.

**Sand** is convincing. The pile has dune ridges rather than a smooth cone, the face gives
way in runs, and a stream falling through a gap between two cards reads as separate grains
falling, not as a column sliding.

**Water** reads as a liquid and not as sand: it arrives in sheets, spreads flat across the
top of a block, runs off the edges and pools. Nothing about it resembles the sand any more,
which was the whole point of separating them.

**Lava** is the best of the three. Two molten streams dribble through the gaps between the
cards, the flow glows brightest where it is thickest and darkens to crust at its edges, and
turning the page over sends a bright plume draining upward through cooled rock. The heat
field doing double duty as physics and palette is what sells it.

## Deferred on purpose: the look

The behaviour is accepted; the **appearance is not**, and that is a deliberate stop rather
than an oversight. What is on screen is a grid of coloured cells, and it looks like one.
Sand is flat ochre with per-grain jitter, water is flat blue with depth as opacity, and
only lava escapes it because its heat field happens to double as a gradient.

Nothing about the simulation forces that. The grid produces a field of values per frame,
and everything above draws it as one pixel per cell — the cheapest possible reading of it.
The paths not taken, for whoever picks this up:

- **Surfaces instead of cells.** The boundary between material and air is a contour, and
  drawing it as a smooth edge rather than a staircase would remove most of the pixel look
  on its own.
- **Light.** Sand has no shading, water has no specular and no refraction of what is
  behind it, and both are flat because nothing computes a normal from the height field.
- **Grain size.** One cell is one grain. Fine sand and gravel in the same pour would need
  more than one size, and the model has no concept of one.

None of that changes the physics, which is why it can wait. It is the next piece of work
on this experiment, not a polish pass.

## Still open

- **Water is slow across a barrier.** Once a basin fills to the crest of a wall, the only
  thing carrying water over is a thin surface film, and a film carries very little. Real
  water has momentum and would slosh across; this has none, so it seeps. Correct as an
  equilibrium, wrong as a motion.
- **Nothing has been watched at full speed in a browser.** Every image and every number
  above was produced headlessly, because the tab available for testing reported
  `visibilityState: hidden` and delivered no frames at all. The physics is right; how it
  _feels_ is still unverified.
- An element's box is its shape. A round card is a rectangle to the material.
- The pile buries content on purpose, and nothing yet stops it burying something that has
  to be read. That is the question that decides whether this can be published.
- `prefers-reduced-motion` removes the material entirely, which deserves a second thought
  before this leaves the Lab.
