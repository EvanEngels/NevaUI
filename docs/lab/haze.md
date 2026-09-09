# 🧠🧪 Haze

|             |                                          |
| ----------- | ---------------------------------------- |
| **Stage**   | 🧠 Concept, validated directly in 🧪 Lab |
| **Created** | 2026-09-09                               |
| **Spark**   | [💡 Haze](../sparks/haze.md)             |
| **Run it**  | `pnpm dev` → Haze                        |

## Decision: no simulation at all

The obvious reach for smoke is a fluid solver, and it is the wrong one. What the gesture
needs is a surface that thins where it has been touched and closes again where it has not.
That is two compositing operations on an alpha channel, and the browser already does both
well.

- The fog is a texture, built once: a wash plus layered radial blobs at three scales. A
  handful of gradient fills rather than a per-pixel noise loop.
- Wiping removes alpha under the pointer, `destination-out`, so the fog thins instead of
  gaining a dark smear.
- Healing lays the same texture back down at a very low alpha.

Nothing here is per-pixel JavaScript, which is the difference between this and
[Pour](./pour.md) — and the reason it costs a tenth as much.

## The rule the component is built around

**The fog never hides anything.** It sits at an opacity where the text underneath stays
legible and the button underneath stays pressable; wiping makes it clearer, it does not
make it available.

Anything else turns a decoration into a gate that only a pointer can open, and there is no
keyboard equivalent for wiping a window. This is the same conclusion
[Fracture](./fracture.md) reached from the other direction, and it is becoming the house
rule: an effect that gates content has to justify itself to everyone who cannot perform it.

## Findings

### Rounding a rate down to nothing is a way of switching it off

Healing owes a fraction of alpha per frame. The first version discarded any frame worth
less than one step of alpha — `1/255` — on the reasonable grounds that it would change no
pixel.

At sixty frames a second the default rate owes 0.0037 per frame, and a pixel needs 0.0039.
Every frame was discarded. The fog never healed at all, and every line of the code looked
correct.

The debt is kept now: most frames draw nothing and cost nothing, and every few frames one
composite pays off what has built up. A test holds it — sixty frames must heal a full
second's worth, however the frames are chopped up.

### A loop that stops when a frame drew nothing stops immediately

Which is worse, because it is the same mistake one level up and the helper's tests could
not see it.

The loop's stop condition was _nothing was drawn this frame_. With an accumulating debt,
most frames draw nothing — so it stopped on the first frame after a wipe and the hole
stayed open for good. Correct-looking code, green tests, and the fog visibly never closed.

It now runs while fog is **owed**, not while frames happen to draw, and stops when the fog
is whole. Only moving the pointer found this.

### It reads as condensation rather than smoke

Which the Spark listed as a way to fail — _"it reads as a smudge rather than as smoke"_ —
and is half true. Wiping a milky, even fog off glass is exactly what it looks like, and
that is a good effect. It is not smoke: smoke has structure and drifts, and this has
neither.

Worth deciding rather than drifting into: **condensation is the better version of this
gesture** and the component should probably be named for what it does. Smoke would need
motion in the texture itself, which is a different and much more expensive component.

## What it costs

Measured in the browser, three cards on screen at once: **0.00 ms median, 0.5 ms worst**
per frame. A card nobody is pointing at costs nothing at all, because the loop stops when
the fog is whole.

One canvas per element, and the Spark's worry — _"on twenty cards that is twenty
canvases"_ — is real but not heavy: twenty idle canvases are twenty allocations and no
frames. Twenty being wiped at once is a different question and has not been tried.

## Still open

- The texture never moves. Real smoke drifts, and adding that means animating the texture
  rather than compositing a fixed one.
- Density is a number, and above roughly 0.8 the content underneath stops being legible.
  Nothing in the component stops a caller setting it there.
- Under `prefers-reduced-motion` the fog stays and thins slightly. Nothing moves, which is
  right, but a viewer who cannot use a pointer sees a permanently hazed card — acceptable
  only because it is never hiding anything.
- Twenty cards being wiped simultaneously is unmeasured.
