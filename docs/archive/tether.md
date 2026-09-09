# 📦 Tether — archived

|              |                                  |
| ------------ | -------------------------------- |
| **Stage**    | 🧪 Lab → 📦 **archived**         |
| **Archived** | 2026-09-09                       |
| **Spark**    | [💡 Tether](../sparks/tether.md) |
| **Code**     | `git show e6cb659^:lab/tether`   |

A failed experiment is not a failure. This one was built, it worked, and it is being put
away because nothing ever answered the question its own Spark asked: _what is it for?_

## What was explored

An inextensible line with mass. Pull one end and the rope transmits the motion along
itself, the weight at the other end arrives late, and the whole thing swings back to rest
without being told to.

Twenty-six points, Verlet integration, position constraints, and one SVG `d` attribute
written per frame.

## Why it was explored

Interfaces are full of connections drawn as static lines and of animations that ease. A
rope does neither, and it has a property no easing curve has: **it cannot stretch**. Pull
it past its length and it stops you. That refusal is feedback that costs nothing to render
and exists nowhere in a component library.

## What was learned

**Position constraints, not springs.** Length is a constraint, not a force, and a stiff
spring is exactly the case where explicit integration diverges — the stiffer the rope, the
smaller the timestep it demands, without ever being inextensible. Verlet with constraint
passes is stable at any stiffness because it never integrates a force at all: it moves
points and lets velocity fall out of the difference between frames.

That sits directly beside the mass-spring lattice in Displacement Field, which wants a
material that _gives_. Two solvers, two problems, and the reason to keep both is the
distinction rather than the code.

**The refusal is the interaction.** The first version pinned the grabbed end to the
pointer. Pull past the rope's length and both ends are pinned further apart than the rope
can reach: the constraint is unsolvable, the solver does its best, and the rope stretches
like elastic. Wrong material.

A test caught it before the browser did. The fix is that **the hand gives, not the rope** —
past full extension the end stops following the pointer and goes taut. That single change
is what made it feel like a rope, and it was not in the Spark. It is the most transferable
thing this experiment produced: when a constraint cannot be satisfied, decide _which_ side
yields, and do not leave it to the solver.

**Cost is not where the points are.** However many points, a frame writes one path string
and one transform. Point count changes the physics cost, not the DOM cost — the same shape
of result the other experiments kept reaching.

## Why it stopped

It never acquired a purpose. Every other experiment here answered "what is this for?" by
the time it left the Lab: a field of content that reacts, a lit surface, a paragraph that
leans into a light, a panel that breaks. Tether stayed a behaviour looking for a use.

It also has no keyboard and no touch story, and a drag is not available to everyone. That
alone would have blocked publication — but it is the second reason, not the first. A
component with a purpose earns the work of solving its interaction. This one had no
purpose to earn it with.

Inventing one to save the code would have been optimising for the number of components,
which is the thing this project says not to do.

## Known limitations, if it is ever revived

- No keyboard or touch equivalent for the drag.
- Resizing rebuilds the rope from rest, visible if it was mid-swing.
- Only ever tried as a single rope with one fixed anchor.

## The most promising direction

If someone brings it back, the idea worth trying is **pull-to-commit**: a handle you drag
against the rope's tension, where the refusal at full extension is the confirmation. The
rope's one unique property would be doing the work rather than decorating it, and a plain
button is the obvious keyboard equivalent.

That is a hypothesis, not a plan. It is written down so the next person does not start
from the same blank page.
