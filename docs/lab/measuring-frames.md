# 🧪 Measuring frames

|             |                            |
| ----------- | -------------------------- |
| **Stage**   | 🧪 Lab infrastructure      |
| **Created** | 2026-09-09                 |
| **Code**    | `lab/playground/frames.ts` |

Three experiments — Displacement Field, Lumen and Fracture — each ended with the same
sentence in their notes: _no limit is claimed, the measurements contradicted each other_.
That is one missing tool, not three separate gaps, so it was built once.

## What it measures, and what it refuses to

**Script cost** is the time spent inside the animation callback: physics plus DOM writes.
It is measured with `performance.now()` around the work itself, so it is true wherever the
callback runs — throttled, forced, or live. Median, p95 and max, over a rolling window of
about four seconds.

**Frame delivery** — how long each frame took to arrive, and how many took longer than one
and a half display periods — is reported **separately, and only when frames arrived on
their own**.

That separation is the whole design. The two numbers fail in different ways, and reporting
them together is how the earlier measurements ended up meaningless.

## Why the earlier numbers contradicted each other

The first Lab session reported 640 elements running _faster_ than 320, and medians
alternating between about 7 ms and about 14 ms for the same workload. Both were treated as
noise. They were not.

Measured directly in the browser used for those sessions:

```text
document.visibilityState  →  "hidden"
frames delivered in 1s    →  0
```

The tab was never rendering. Every frame observed was one forced by a screenshot, seconds
apart. The 14 ms medians were exactly twice 6.9 ms because the numbers had nothing to do
with the workload, and the "faster at 640 elements" result was an artefact of when the
screenshots happened to land.

**No amount of care in the analysis would have saved those numbers.** The instrument had to
know the difference, which is why the recorder now returns `delivery: null` instead of
timing figures when frames were not delivered on their own — and the readout says so in
words rather than printing a number nobody should trust.

## The protocol

Frame delivery cannot be measured from a tool driving the page from outside. It has to be
a person, at the machine, with the tab in front of them.

1. `pnpm dev`, and put the tab **in the foreground** — not merely open. A tab in a
   background window reports `hidden` and delivers no frames at all.
2. Choose the experiment and set the element count.
3. Move the pointer continuously across the surface for about five seconds. The window is
   four seconds long, so the readout describes what just happened.
4. Read the line under the controls. If it says _frames were not delivered on their own_,
   the tab is not rendering and nothing else on that line means anything.
5. Repeat at each element count, three times. A count is only worth writing down when the
   three runs agree.

## What is still not measured

**Paint.** None of this sees it. Lumen's whole claim is that it moves cost from script to
paint, and that half remains unmeasured here — it needs the browser's own profiler, and it
should be recorded as a limitation of any component that relies on the trade, not guessed
at.

## Measuring a component that owns no loop

Script cost is the wrong instrument for a component whose cost is somewhere else. Lumen
writes two properties per frame and would report near zero forever while the page visibly
stutters, because its expense is paint.

`DeliveryMonitor` runs its own frame loop and records nothing but arrival times. It
measures the page rather than the component, which is what a person means when they say
something lags.

## Results

None recorded yet from the protocol. One result has arrived from ordinary use, which is
worth more than nothing and less than a measurement: **Lumen lags badly at large face
counts**. That is written up in [its lab notes](./lumen.md#the-cost-is-paint-and-it-is-real)
and is the first thing the protocol should be pointed at.
