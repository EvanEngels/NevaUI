# 💡 Pour

|             |            |
| ----------- | ---------- |
| **Stage**   | 💡 Spark   |
| **Created** | 2026-09-09 |

## The idea

Sand falls from the top of the screen. It lands on the page, piles up on the things that
are there, slides off their edges, fills the gaps between them, and slowly buries
everything. Turn it over and it drains back out.

Water and lava are the same idea with different rules — one seeks its level, one barely
moves.

## Why this one

Every other experiment here treats the layout as something to move. This one treats it as
**terrain**. The sand does not fall in front of the page or behind it: the page's own boxes
are what the material lands on, so a heading holds a ridge and a card sheds a slope. The
effect is different on every layout because it is made of that layout.

It is also the first idea in this project the DOM plainly cannot carry. Thousands of
independent grains are thousands of elements, and this session measured what that costs.
A single canvas and a particle grid is the cheapest technology that can produce it — the
first time the ladder in the project's philosophy reaches that rung honestly.

## The turn

An hourglass is turned over. The literal version rotates the page, which puts the text
upside down — unreadable, and a poor trade for a decorative effect.

The version worth trying inverts **gravity** instead: the pile drains upward and off, the
content comes back, and the gesture survives without the page going with it.

## Open questions

- What is a grain, on screen? Fine enough to read as a fluid, or coarse enough to see
  individual pieces move?
- Does the material rest on an element's box, or on its visible shape? A box is cheap and
  probably wrong for round things.
- Does it obscure content it lands on, or does it stop being opaque before that matters?
- Water and lava from the same rules, or does each need its own?
- What happens on `prefers-reduced-motion`? Falling material is nothing but motion.

## How this could fail

- The pile buries something the reader still needed, and the effect is hostile rather than
  pleasing.
- Sand, water and lava turn out to need three different simulations, and the shared
  version is convincing at none of them.
- It costs the whole frame budget and nothing else on the page can move.
