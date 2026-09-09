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

## Still open

- Paint cost is unmeasured. That is the real ceiling and no number is claimed.
- Every tile is identical. Whether the illusion survives tiles of different sizes, or
  content inside them, is untested.
- Reduced motion parks the light and hides the source. That is the trivial answer; a
  better one might place the light meaningfully rather than centrally.
