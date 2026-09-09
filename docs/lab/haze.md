# 🧠🧪 Haze

|             |                                          |
| ----------- | ---------------------------------------- |
| **Stage**   | 🧠 Concept, validated directly in 🧪 Lab |
| **Created** | 2026-09-09                               |
| **Spark**   | [💡 Haze](../sparks/haze.md)             |
| **Run it**  | `pnpm dev` → Haze                        |

## The first version was condensation, not smoke

It was a fixed texture that thinned where the pointer touched it and closed back over. It
was cheap, it worked, and nothing in it ever moved — so it read as wiping a misted window,
which the Spark had listed as a way to fail.

Asked for smoke that actually moves, and this is the second version: a density field
carried along a current.

## Decision: advection along a curl field, not a fluid solver

Two choices, and the second is the one that matters.

**Density is advected, not pushed.** Every frame each cell asks where its material came
from — one step back along the velocity — and takes what was there. Semi-Lagrangian
advection is unconditionally stable: nothing can overshoot, because nothing is ever pushed
anywhere. It is only ever pulled.

**The current is the curl of a noise field.** A velocity field built by hand pumps: give
every cell a direction and density piles up wherever directions converge, which reads as a
leak. The usual fix is to solve for pressure and project the divergence out once per frame,
which is most of the cost of a fluid solver. The curl of a scalar potential is
divergence-free _by construction_ — there is nothing to correct, because nothing is wrong.

Measured against a control: a velocity made of two independent noise samples has about
**eighty times** the divergence of the curl field. What is left in the curl is the residue
of a central difference, not a leak.

## Three things that were wrong and looked right

### A smoothed interpolant is not smooth enough for a derivative

The noise used a smoothstep, which is continuous in its first derivative and not its
second. The curl is built from derivatives, so at every lattice line the second derivative
jumped, the mixed partials stopped cancelling, and the field measured a divergence of
**6.39** — the identity said zero.

Perlin's quintic fade is smooth to the second derivative, which is exactly the order the
identity needs. That one line took the divergence from 6.39 to 0.05.

### A uniform field advects to itself

The first working version filled the grid to a flat resting level and relaxed towards it.
The current ran underneath at full speed and the smoke was **perfectly still**, because
carrying a uniform field one step along any velocity gives back the same uniform field.

Structure is not decoration here — it is what the motion is visible _in_. The resting
level is now itself uneven and slowly drifting, so the relaxation keeps renewing the
structure the current keeps stirring.

### Two rates fighting have a fixed point neither asked for

Dissipation thinned the smoke and healing refilled it. Together they settled at 0.43 when
the requested density was 0.72 — the field quietly held two thirds of what it was told to,
and the arithmetic for why is three lines long once you look.

One relaxation rate, with the resting level as its fixed point, holds exactly what was
asked for. A test pins it.

## This is the one experiment with no rest

Every other component here stops its loop when nothing is moving. Drifting smoke has no
such state: the current keeps turning and the picture keeps changing, so the loop cannot
stop on its own.

What stops it is an `IntersectionObserver` — the element leaving the screen — and
`prefers-reduced-motion`, under which the field is drawn once and never again. Setting
`flow` to zero also gives back a loop that ends, and that is tested, because the honest
version of "it never stops" is being able to say exactly when it does.

## What it costs

Three cards, 700 cells each, measured in the browser: **0.30 ms median, 0.5 ms worst** per
frame for simulation and drawing together.

The grid is coarse on purpose — smoke has no detail worth resolving at pixel scale — and
the canvas is one pixel per cell, stretched by CSS with smoothing left on. The browser's
interpolation is the last step of the model rather than a compromise in it.

## Still open

- Density is a number, and above roughly 0.8 the content underneath stops being legible.
  Nothing in the component stops a caller setting it there.
- Twenty cards on a page is twenty grids and twenty loops that never stop. Off-screen ones
  pause; twenty visible at once is unmeasured.
- The smoke has no source and no sink — it does not rise, and nothing blows it. It drifts
  in place, which is right for smoke held against a card and wrong for smoke leaving one.
- A viewer who cannot use a pointer sees a permanently hazed card. Acceptable only because
  it never hides anything, which is a rule the component cannot enforce on its caller.
