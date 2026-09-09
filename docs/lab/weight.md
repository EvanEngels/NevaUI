# 🧠🧪 Weight

|             |                                          |
| ----------- | ---------------------------------------- |
| **Stage**   | 🧠 Concept, validated directly in 🧪 Lab |
| **Created** | 2026-09-09                               |
| **Spark**   | [💡 Weight](../sparks/weight.md)         |
| **Run it**  | `pnpm dev` → Weight                      |

## The problem, restated

Heavier letters are wider letters. Animate weight and the paragraph reflows every frame.
Everything in this experiment is about that one sentence.

## Two attempts

**Freeze each word at its widest.** Measure every word at the heaviest weight it will ever
reach, then give it that width permanently. It works — nothing reflows — and it looks
wrong. Every light word carries the air its bold form would have needed, and the paragraph
reads as badly tracked before the reader has touched anything. Rejected after seeing it.

**Lay out once, then leave the flow.** Let the browser set the line breaks at the resting
weight, record where each word landed, then pin the words to those positions. Now nothing
can reflow because nothing is in flow. Each word is anchored by its centre and pulled back
by half its own width, so gaining weight grows it in both directions instead of shoving its
right edge into the next word.

Measured in the browser: **27 words, 0 moved**, weights ranging from 250 to 654 as the
light passes. The paragraph holds still while the letters change.

## Findings

### An observer that reacts to its own writes never stops

Pinning the words changes the paragraph's height, which fires the ResizeObserver, which
re-measures, which pins again. The first version sat in that loop and reset every word to
its resting weight on every pass — the light appeared to do nothing at all, and the cause
was nowhere near the light. The observer now reacts only to a change in available width,
which is the only thing that can change line breaks.

### Rounding is what lets the loop stop

Weights are eased toward their target and rounded to whole numbers. That is not a
shortcut: it is what gives the animation a definite arrival, so the loop can end instead
of chasing an ever-smaller fraction forever.

## Promoted to ⚡ Experimental

On 2026-09-09, once the risk this document kept naming had been tested rather than
worried about.

**Selection survives.** Absolutely positioned words are exactly the kind of thing that
quietly breaks text selection, and it does not: selecting the paragraph returns the
original string character for character, and a drag across eleven words in the middle
returns those eleven words. DOM order matches visual order, and each word carries its own
trailing space, so the copy is the passage.

**The cost is per word, and it is layout.** Changing `font-weight` changes a word's
metrics, so the browser lays that word out again and repaints the type — measured at
roughly 7.5 microseconds per word: 0.3 ms for 27 words, 2.4 ms for 324. That makes Weight
the most expensive element-for-element component in the library, and for the reason the
project keeps rediscovering: a transform is composited, and anything touching text metrics
is not. A paragraph is comfortable; an article is not, and the component says so.

**And a visible artefact, traded down rather than solved.** A word grows around its own
centre, so half the width it gains goes into the gap on each side. At the original peak of
800 the heavy words touch their neighbours and the paragraph reads as broken. Growing to
the right instead would shove the next word; reserving the heaviest width up front is the
badly-tracked version this document already rejected. So the default peak came down to
620, which keeps the gap, and the limitation is written down rather than hidden — it is
the least bad of three, not a solved problem.

**A failure mode found while promoting it.** Fonts arrive after the first layout. A
paragraph measured in the fallback face and then pinned would keep the fallback's
positions for good, under type that no longer has those metrics — every word a few pixels
off, permanently, with nothing on screen to explain it. It re-measures on
`document.fonts.ready` now. Nobody would have found that by reading the code.

## Still open

- Weight is driven through `font-weight`, so a variable font interpolates smoothly and a
  static family steps through the weights it actually ships. On a font with no weight
  range, the effect silently does nothing. Untested across families.
- Only tried at display sizes. Body text may make the movement of ink illegible.
