# 💡 Fracture

|             |            |
| ----------- | ---------- |
| **Stage**   | 💡 Spark   |
| **Created** | 2026-09-09 |

## The idea

A surface that breaks where you hit it. Not a canned animation played back the same way
every time: the break is computed from the point of impact, so striking a corner and
striking the middle produce different geometry.

## Why this one

Breaking is one of the few interactions that is genuinely destructive-looking while being
completely reversible, and it gives an interface a way to say _no_ — or _look here_ — with
real force. Nothing in a component library does it, largely because it looks like it needs
WebGL, and it does not.

## Open questions

- Can the pieces be real DOM elements, so the content inside them survives the break?
- Do the pieces come back, or is a break final?
- How many pieces before it stops being smooth?
- Is the geometry convincing, or does it read as a pie chart exploding?

## How this could fail

- It is a party trick with no use in an interface.
- Reassembly looks like the break played backwards, which kills the illusion.
