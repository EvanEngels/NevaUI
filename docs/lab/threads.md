# 🧠🧪 Threads

|             |                                          |
| ----------- | ---------------------------------------- |
| **Stage**   | 🧠 Concept, validated directly in 🧪 Lab |
| **Created** | 2026-09-09                               |
| **Spark**   | [💡 Threads](../sparks/threads.md)       |
| **Revives** | [📦 Tether](../archive/tether.md)        |
| **Run it**  | `pnpm dev` → Threads                     |

## It unarchives something

Tether was put away because nothing answered the question its Spark asked: what is it for.
Threads is that answer, so the rope solver came back with it — Verlet integration with
position constraints, unchanged in its physics.

This is the first time the lifecycle has run backwards, and it works because the archive
note recorded enough to make it possible: what the solver was, why constraints rather than
springs, and the direction worth trying if anyone revived it.

## What changed when it came back

A tether had one end held and one end in your hand. A thread has **both ends held by
elements, and neither can give**.

That is not a detail. Ask for a rope shorter than the gap between two elements and the
constraint is unsolvable; the solver does its best and the thread stretches like elastic —
the same failure Tether found, arriving from the other side. There is no hand to yield
this time, so the rope cannot defend a length.

**A thread's length follows the layout, and what it keeps is slack.** Tightening is
lowering slack towards 1, not shortening a fixed rope. That is the whole of what pointing
at a node does.

## Three bugs, all of them the loop stopping too early

Every one of these looked correct and left the effect visibly dead.

**A new rope reports itself at rest.** It is created with every point on the straight line
between its ends and every velocity at zero, which is the definition of at rest — so a
loop that stops at rest stopped on the first frame and the threads were straight lines
for good. Each rope is now settled at creation, which also means they are already hanging
when the page appears rather than visibly falling into place.

**The frame that starts a loop has no previous frame.** Its elapsed time is zero, nothing
is integrated, every rope truthfully reports itself at rest, and the loop exits before
doing anything — so pointing at a node did nothing at all. The first frame of a loop is
not evidence about whether the loop is needed.

**The readout's last word was always a lie.** It flushed every thirty frames, and the loop
stopped mid-window, so the final thing it ever said was "swinging" — from the frame before
everything stopped. It flushes on settling too now.

## And one leak

The effect removed the paths it knew about, and React runs effects twice in development.
The second run's array was empty, so the first run's seven paths stayed: **fourteen paths
for seven links**, drawn every frame, invisible on screen. The SVG is emptied rather than
the array.

## What it costs

Seven threads, eighteen points each, measured in the browser: **0.30 ms median, 0.6 ms
worst** while swinging, and nothing at rest — which is most of the time.

One SVG path attribute per thread per frame. Point count changes the physics cost, not the
DOM cost.

## Still open

- **Does it inform, or decorate?** The threads look like relationships. Whether a reader
  learns anything from them that the layout did not already say is untested, and it is the
  question that decides whether this is a component or a toy.
- How many threads before it is spaghetti. Seven is comfortable; there is no measurement
  above that.
- Threads cross other content freely, and nothing avoids it.
- The relationship exists only in the drawing. Anything a thread illustrates has to be in
  the content or the markup as well, and the component cannot enforce that on its caller.
