# ⚡ Weight

|              |                                                      |
| ------------ | ---------------------------------------------------- |
| **Stage**    | ⚡ Experimental — usable, honest, and not API-stable |
| **Promoted** | 2026-09-09                                           |
| **Spark**    | [💡 Weight](../sparks/weight.md)                     |
| **Lab**      | [🧠🧪 Weight](../lab/weight.md)                      |

A light that falls on text. Where it lands the letters get heavier — not brighter, not
larger, not coloured.

```tsx
import { Weight } from 'nevaui';
import 'nevaui/styles.css';

<Weight className="lead">A passage that leans into the light as you read it.</Weight>;
```

`children` is a string, not markup: the component splits the passage into words and places
each one, so it needs the text rather than nodes it would have to take apart.

## The problem it solves

Heavier letters are wider letters. Animating weight reflows the paragraph on every frame —
words shove each other sideways, line breaks jump, and the reader loses their place.

So the paragraph is laid out **once** at its resting weight, each word's natural box is
recorded, and the words are then pinned to those positions and taken out of flow. Nothing
can reflow because nothing is in flow. Each word is anchored by its centre and pulled back
by half its width, so gaining weight grows it in both directions rather than shoving its
neighbour.

Measured: 27 words, **none of them moved**, weights running from 250 to 654 as the light
passes.

## Props

| Prop        | Type                      | Notes                                   |
| ----------- | ------------------------- | --------------------------------------- |
| `children`  | `string`                  | The passage                             |
| `settings`  | `Partial<WeightSettings>` | The light                               |
| `showBoxes` | `boolean`                 | Outlines each word's box, for debugging |
| `className` | `string`                  | Typography lives here. Weight sets none |

| Setting      | Default | Meaning                                     |
| ------------ | ------- | ------------------------------------------- |
| `radius`     | `190`   | Reach of the light, in pixels               |
| `restWeight` | `250`   | Weight of a word the light does not touch   |
| `peakWeight` | `800`   | Weight of a word directly under it          |
| `focus`      | `2.4`   | Falloff shape. Higher keeps the light tight |

Outside the radius a word lands on exactly `restWeight` — not close to it — so the
paragraph does not keep a faint uneven texture after the light has left.

## What it costs

**More per element than anything else in this library, and knowing why is the point.**
Changing `font-weight` changes a word's metrics, so the browser lays that word out again
and repaints the type. A transform would have been composited; this cannot be.

| words | write and layout, per frame |
| ----- | --------------------------- |
| 27    | 0.3 ms                      |
| 108   | 1.0 ms                      |
| 216   | 2.0 ms                      |
| 324   | 2.4 ms                      |

Roughly 7.5 microseconds per word. **A paragraph is comfortable. An article is not.** Use
it on a lead, a pull quote, a title — not on a page of body copy.

Measured as a synchronous write-and-layout pass rather than as delivered frames, on one
machine.

## Limitations

- **The cost is per word, and it is layout.** See above. This is the one component here
  that will not scale by being left alone.
- **Heavy words crowd their neighbours.** A word grows around its own centre, so half of
  the width it gains goes into the gap on each side. The default `peakWeight` of 620 keeps
  that gap; push it towards 900 and the heaviest words will touch the ones beside them.
  Growing to the right instead would shove the next word, and reserving the heaviest
  width up front makes the paragraph read as badly tracked at rest — this is the least
  bad of the three, not a solved problem.
- **Fonts without a weight range do nothing.** The effect is driven through `font-weight`,
  so a variable font interpolates smoothly, a static family steps through the weights it
  ships, and a font with a single weight shows no effect at all — silently.
- **Text-only zoom** changes metrics without changing the container width, and the pinned
  positions do not re-measure for it. Page zoom is fine.
- The API will change.

## Accessibility

Under `prefers-reduced-motion: reduce` the words stay pinned — that is layout, and it
keeps the paragraph identical to the one everyone else sees — and **no weight ever
changes**: no listeners, no loop.

The passage stays selectable and copies back as the original string, double spaces
included. Verified in a browser, because absolutely positioned words are exactly the kind
of thing that quietly breaks selection.

The component re-measures once `document.fonts` is ready. Without that, a paragraph
measured in the fallback face keeps the fallback's positions for good under type that no
longer has those metrics.
