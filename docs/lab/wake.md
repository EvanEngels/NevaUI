# 🧠🧪 Wake

|             |                                          |
| ----------- | ---------------------------------------- |
| **Stage**   | 🧠 Concept, validated directly in 🧪 Lab |
| **Created** | 2026-09-09                               |
| **Spark**   | [💡 Wake](../sparks/wake.md)             |
| **Run it**  | `pnpm dev` → Wake                        |

## The rule it is built on

**A wake is a function of speed, not of movement.** Something that drifts leaves nothing
at all.

Without that line the effect smears behind every pointer movement on the page, and a smear
is decoration wearing the clothes of information. It is the first thing in the model rather
than a setting on top of it: the trail's opacity comes from a smoothed speed, and below a
threshold there are no ghosts at all — not faint ones, none.

Measured in the browser: at **173 px/s, zero ghosts. At 2204 px/s, eleven.**

## Findings

### Speed has to be smoothed, or the trail blinks

One slow frame inside a flick is not a stop. Reading speed from a single frame made the
wake flicker out and back during a sweep, which looks like a rendering fault. It is
smoothed towards the instantaneous value, and a test drives a fast sweep through a stalled
frame to check the trail survives it.

### A ring buffer must not report ghosts it has not recorded

The first version reported a full trail immediately, which put every ghost at the origin —
a dozen copies stacked in the corner on the first movement. It reports only what it has
actually seen.

### Cost

Twelve ghosts: **0.10 ms median**, one transform and one opacity each, both composited.
The loop stops after twenty idle frames.

The node count is the trail length times the size of the children, which is the third time
this project has met that shape — after [Fracture](./fracture.md) and [Lens](./lens.md) —
and the reason a wake belongs on a marker rather than on a card.

## Still open

- **Is it information or decoration?** It passes the test it set itself: slow leaves
  nothing. Whether the trail tells a reader anything they did not already know from having
  made the movement is unanswered, and this is the experiment most likely to be archived
  on that question.
- Only tried following a pointer. A wake on scrolling content, which is where the Spark
  thought it belonged, is untested.
- Ghosts are copies of the children with no way to substitute something cheaper — a
  silhouette, say — for content too heavy to repeat.
