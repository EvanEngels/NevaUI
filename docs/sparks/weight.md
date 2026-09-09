# 💡 Weight

|             |            |
| ----------- | ---------- |
| **Stage**   | 💡 Spark   |
| **Created** | 2026-09-09 |

## The idea

A light that falls on text. Where it lands, the letters get heavier — not brighter, not
larger, not coloured. Weight is the only thing that changes.

## Why this one

Highlighting text is done with colour, background or scale, all of which sit on top of
the typography. Weight is inside it. It is also the one axis a reader already reads as
emphasis, so the effect says something rather than just moving.

## The obstacle, which is the point

Making a letter heavier makes it wider. Animating weight naively reflows the paragraph on
every frame: words shove each other sideways, line breaks jump, and the reader loses their
place. Solving that without freezing the text into a rigid grid is the whole experiment.

## Open questions

- Is the effect readable, or is it just text that will not sit still?
- What happens on a font with no weight axis?
- Does it survive at body-text sizes, or only at display sizes?

## How this could fail

- Any solution to the reflow makes the paragraph's spacing visibly wrong at rest.
- It is unusable for anyone actually trying to read the words.
