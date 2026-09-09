# 💡 Tether

|             |            |
| ----------- | ---------- |
| **Stage**   | 💡 Spark   |
| **Created** | 2026-09-09 |

## The idea

A line with mass. Not a decorative curve that eases between two points, but something
with length, weight and inertia: you pull one end, the rope transmits the motion along
itself, the weight at the other end arrives late, and the whole thing swings itself back
to rest without being told to.

## Why this one

Interfaces are full of connections drawn as static lines, and of animations that ease. A
rope does neither. It has a property no easing curve has: **it cannot stretch**. Pull it
past its length and it stops you. That refusal is a form of feedback that costs nothing
to render and does not exist anywhere in a component library.

## Open questions

- Does a rope belong in an interface at all, or only in a toy?
- Should the far end be a target the rope reaches, or a weight it drags?
- What does the rope do when the layout resizes underneath it?
- What is it for? Right now it is a behaviour, not yet a component.

## How this could fail

- It is charming for five seconds and useless afterwards.
- The interaction demands a drag, which is expensive on touch and impossible on keyboard.
