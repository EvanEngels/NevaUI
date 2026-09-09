# 💡 Lens

|             |            |
| ----------- | ---------- |
| **Stage**   | 💡 Spark   |
| **Created** | 2026-09-09 |

## The idea

A disc you move over dense content that magnifies **the real DOM** beneath it — not a
screenshot of it. Text under the lens is text, rendered at that size.

## Why this one

Magnifiers in interfaces are usually images: a zoomed bitmap, soft at the edges, that
cannot be selected and does not reflow. A lens over live DOM keeps the type sharp because
the browser renders it larger rather than scaling pixels.

For tables, maps, code — anything where the information is dense on purpose and a reader
needs a closer look without leaving where they are.

## Open questions

- What does a lens do to what is under it that you want to click?
- How much does duplicating the content cost, given what Fracture found about copies?
- Does it need to follow the pointer, or be dragged and left somewhere?

## How this could fail

- The copy is expensive enough that only trivial content fits under the lens.
- It shows you something you then cannot interact with, which is worse than not showing it.
