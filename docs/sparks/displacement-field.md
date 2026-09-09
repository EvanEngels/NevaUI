# 💡 Displacement Field

|             |                                             |
| ----------- | ------------------------------------------- |
| **Stage**   | 💡 Spark                                    |
| **Created** | 2026-09-09                                  |
| **Status**  | Idea only — nothing built, nothing measured |

## The idea

A layout whose elements are pushed aside by the pointer, the way a finger pushes
through sand. The space is conserved: an element does not simply move away, it
displaces its neighbours, and the deformation travels outward through the field.

## The interaction

The pointer enters the field. Elements near it move away from it. Elements behind
those compress rather than staying still, so the disturbance spreads and fades with
distance. When the pointer leaves, the field settles back — probably not instantly,
and probably not all at the same speed.

## Why this one

The common version of this effect is per-element magnetic hover: every element reads
its own distance to the pointer and scales or translates independently. Nothing is
shared, so nothing propagates, and the result reads as a set of separate widgets
reacting at the same time.

Conservation is what changes the feeling. If pushing here means compressing there,
the elements stop behaving like independent items and start behaving like a material.
That is the part worth exploring.

## Rendering hypothesis

Cheapest first, to be challenged during the Concept stage:

1. One pointer position published as CSS custom properties on the container.
2. One `requestAnimationFrame` loop for the whole field, writing a per-element
   displacement as a custom property. Not one loop per element.
3. `transform` only. No layout-affecting properties.
4. No React state during movement. React owns structure and configuration.

Canvas and WebGL are not assumed. They would only enter if the DOM cannot express
the effect, and that has not been established.

## Open questions

- **How does displacement propagate?** Neighbour-to-neighbour relaxation, a distance
  falloff from the pointer, or a real spring lattice? These do not feel the same and
  do not cost the same.
- **What is conserved, exactly?** Position, spacing, or perceived density?
- **Does the field settle or spring back?** Return behaviour may matter more to the
  feeling than the push itself.
- **What is the semantic API?** Candidates: `intensity`, `radius`, `resistance`,
  `falloff`. To be named once the model is understood, not before.
- **Does it survive a real layout?** The effect may only read well on a uniform grid,
  which would make it a demo rather than a component.
- **What is the reduced-motion version?** Not a frozen grid necessarily — possibly a
  different, non-continuous response. Equivalent access, not identical interaction.

## How this could fail

- The propagation cost grows with the number of elements, and the field only works at
  sizes too small to be interesting.
- Continuous displacement makes text unreadable or targets unclickable, and the effect
  is decorative at the expense of usability.
- Neighbour coupling turns out to be visually indistinguishable from independent
  falloff, in which case the simple version wins and this Spark is archived with that
  finding.

No performance claim is made here. Nothing has been measured.

## Next stage

🧠 Concept: choose a displacement model, justify it, and describe the rendering
strategy precisely enough to prototype it in 🧪 Lab.
