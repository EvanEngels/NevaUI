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

## Still open

- Weight is driven through `font-weight`, so a variable font interpolates smoothly and a
  static family steps through the weights it actually ships. On a font with no weight
  range, the effect silently does nothing. Untested across families.
- Only tried at display sizes. Body text may make the movement of ink illegible.
- Pinned words are still one text node each, but the paragraph is now absolutely
  positioned. Selection and copy behaviour has not been checked, and it matters.
