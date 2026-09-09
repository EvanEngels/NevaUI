# 💡 Lumen

|             |            |
| ----------- | ---------- |
| **Stage**   | 💡 Spark   |
| **Created** | 2026-09-09 |

## The idea

One light, moving over a surface made of many pieces. Every piece works out for itself
where the light is, which way to throw its shadow, and how much of the highlight it
catches.

## Why this one

Effects like this are normally written as a loop: for each element, compute the vector to
the light, write a style. The cost grows with the surface, so the effect gets capped at a
size that has nothing to do with how it should look.

The suspicion worth testing: if each element is told its own position once, the vector to
the light is a subtraction CSS can do during style resolution — which it performs anyway.
The light would then cost the same whether the surface has twenty pieces or two thousand.

## Open questions

- Does it actually hold, or does the browser recompute enough per element to cancel the
  saving?
- Painting still scales with the surface. Where does that become the limit?
- Is a light convincing without any real geometry behind it?

## How this could fail

- The paint cost dominates so completely that the write count never mattered.
- It reads as a gradient sliding around rather than as a lit surface.
