# 💡 Haze

|             |            |
| ----------- | ---------- |
| **Stage**   | 💡 Spark   |
| **Created** | 2026-09-09 |

## The idea

An element is full of smoke. Move the pointer across it and the smoke clears where you
passed, revealing what is underneath. Stop, and it slowly closes back over.

It belongs on things that are already there — a card, a button, a panel — rather than
being a thing of its own.

## Why this one

The gesture is one everybody already knows: wiping condensation off glass. Nothing in a
component library does it, and the reason is probably that people assume it needs a fluid
simulation. It does not. A texture and a mask that the pointer erodes gets most of the way,
and the part that matters — the smoke closing back — is a slow blur, not physics.

Unlike [Pour](./pour.md), the material here does not fall or pile. It only thins and
returns, which is a much smaller problem.

## Open questions

- Does the smoke drift on its own, or only respond? Drifting is prettier and never stops
  costing. **Answered in the Lab: it drifts, and it never stops costing.**
- How does it close back — evenly, or from the edges inward?
- On a button, what is underneath: the label, or something else? A control you cannot read
  is not a control.
- Is it one canvas per element? On twenty cards that is twenty canvases.

## How this could fail

- It hides the content of the very thing it decorates, which is worse on a button than
  anywhere else.
- It reads as a smudge rather than as smoke.
- Twenty of them on a page cost twenty times as much, and nothing about the design stops
  that.
