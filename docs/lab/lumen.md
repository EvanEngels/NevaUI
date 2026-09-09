# 🧠🧪 Lumen

|             |                                          |
| ----------- | ---------------------------------------- |
| **Stage**   | 🧠 Concept, validated directly in 🧪 Lab |
| **Created** | 2026-09-09                               |
| **Spark**   | [💡 Lumen](../sparks/lumen.md)           |
| **Run it**  | `pnpm dev` → Lumen                       |

## The bet

Every tile is told its own centre once, at mount, as `--x` and `--y`. The pointer loop
then writes exactly two custom properties, on the container: `--light-x` and `--light-y`.

From there each tile computes `--light-x - --x` in CSS. The highlight offset, the shadow
direction and the falloff all come out of that vector, evaluated by the browser during
style resolution — work it was going to do anyway.

**JavaScript is O(1) in the number of tiles.** Painting stays O(n).

## Findings

### The bet holds

Verified in the browser rather than argued: with 84 tiles, moving the light rewrote
**0 tile elements**. The only inline styles on a tile are the two coordinates it was given
at mount. A regression here would be invisible to the eye and obvious to that check, which
is why the check is a test.

### It moves the cost, it does not remove it

This is worth being precise about, because the tempting claim is that the effect became
free. It did not. The saving is on the side we control badly — script, on the main thread,
growing with element count. The remaining cost is paint, which the compositor handles and
which we have not measured here.

## Promoted to ⚡ Experimental

On 2026-09-09, with one change that mattered: the prototype lit a grid of identical empty
tiles, which is a demo. The component lights whatever children it is given, imposes no
layout of its own, and adds no wrapper — because a surface that can only light its own
tiles is not a component.

Paint remains unmeasured and is documented as a limitation rather than resolved.

## The cost is paint, and it is real

Reported from real use, on a real screen, which is the one place none of this could be
measured from: **raise the columns and rows far enough and it lags badly.**

That is not a surprise so much as the arrival of the bill. The notes above say paint is
unmeasured and that the design moves cost rather than removing it. What the report adds is
that the remaining cost is large enough to matter at sizes a person would plausibly ask
for — which makes the headline property, two writes per frame, true and much less
important than it sounded.

Where it goes, precisely. When the light moves, each face redraws twice:

1. **The highlight** — a `radial-gradient` whose position depends on the light, so the
   face's whole background is repainted.
2. **The shadow** — a `box-shadow` with a 16px blur whose offset depends on the light. A
   blurred shadow repaints a region _larger_ than the face, and blur is the expensive part.

Neither is touched by writing two properties instead of n. The write count was never the
bottleneck; it was just the part that was easy to measure and easy to be proud of.

The panel now carries a delivery monitor and one slider per repaint, so setting either to
zero freezes that value and removes exactly one of the two. That answers the next question
— which of the two is expensive — by measurement rather than by argument, and it needs a
person with the tab in front of them.

**If the shadow turns out to be the cost**, the interesting version of this component
becomes one where the highlight rides a single composited overlay and moves by transform,
costing no repaint at all, and the per-face depth becomes an opt-in for surfaces small
enough to afford it.

## Still open

- Paint cost is unmeasured. That is the real ceiling and no number is claimed.
- Every tile is identical. Whether the illusion survives tiles of different sizes, or
  content inside them, is untested.
- Reduced motion parks the light and hides the source. That is the trivial answer; a
  better one might place the light meaningfully rather than centrally.
