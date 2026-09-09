# ⚡ Lumen

|              |                                                      |
| ------------ | ---------------------------------------------------- |
| **Stage**    | ⚡ Experimental — usable, honest, and not API-stable |
| **Promoted** | 2026-09-09                                           |
| **Spark**    | [💡 Lumen](../sparks/lumen.md)                       |
| **Lab**      | [🧠🧪 Lumen](../lab/lumen.md)                        |

A surface lit by a single moving light. Every face works out for itself where the light
is, which way to throw its shadow, and how much of the highlight it catches.

```tsx
import { Lumen } from 'nevaui';
import 'nevaui/styles.css';

<Lumen className="my-grid">
  <article>…</article>
  <article>…</article>
</Lumen>;
```

Each direct child becomes a lit face. Pass your real content — cards, tiles, images.
Lumen wraps nothing and replaces nothing.

## What makes it different

The usual way to light a grid is a loop: for each element, compute the vector to the
light, write a style. The cost grows with the surface, so the effect ends up capped at a
size that has nothing to do with how it should look.

Lumen writes **two custom properties, on the container, whatever the face count**. Each
face is told its own centre once, when the surface is measured; from then on the vector to
the light is a `calc()` the browser evaluates during style resolution — work it was going
to do anyway.

Verified by test rather than asserted: with twelve faces, moving the light rewrites zero
face elements.

## Props

| Prop        | Type            | Notes                                               |
| ----------- | --------------- | --------------------------------------------------- |
| `children`  | `ReactNode`     | Each direct child becomes a lit face                |
| `className` | `string`        | Lumen imposes no layout; put your grid here         |
| `style`     | `CSSProperties` | For layout, or for a custom property that drives it |

## Customisation

Visual values are custom properties, not props. Set them on the surface or anywhere above
it:

| Property                       | Default                 | Effect                           |
| ------------------------------ | ----------------------- | -------------------------------- |
| `--neva-lumen-highlight`       | `rgba(255,250,235,0.5)` | Colour of the lit face           |
| `--neva-lumen-shadow`          | `rgba(0,0,0,0.65)`      | Colour of the cast shadow        |
| `--neva-lumen-shadow-length`   | `0.05`                  | How far shadows reach            |
| `--neva-lumen-highlight-shift` | `0.14`                  | How far the highlight slides     |
| `--neva-lumen-dim`             | `0.45`                  | How dark it goes with no pointer |

## Limitations

Read these before using it. Experimental means honest, not finished.

- **Paint cost is not measured.** Script is O(1) in the number of faces; painting stays
  proportional to the lit area. The trade moves work from the main thread to the
  compositor — it does not remove it. **No face count is recommended, because none has
  been validated.** See [measuring frames](../lab/measuring-frames.md).
- **Pointer only.** There is no keyboard or touch equivalent, and there is nothing to
  operate: the light is decoration over content that must already stand on its own.
- **The API will change.** Experimental carries no stability guarantee.
- Faces are measured with `offsetLeft` and `offsetTop`, so the surface must be a
  positioned ancestor of them. It is, unless a face is taken out of flow into some other
  container.
- Only tried on uniform grids of similar faces. Faces of very different sizes are
  untested.

## Accessibility

Under `prefers-reduced-motion: reduce` the component **writes nothing at all** and the
light rests at the top of the surface: the depth stays, the movement goes. That is
enforced by a test, because a version that attached the listeners and ignored them would
leave inline values overriding the stylesheet and look identical in review.

Every face keeps whatever semantics you gave it. Lumen adds no roles, no ARIA and no
focusable elements.
