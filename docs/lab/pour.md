# 🧪 Pour

|             |                                |
| ----------- | ------------------------------ |
| **Stage**   | 🧪 Lab                         |
| **Created** | 2026-09-09                     |
| **Spark**   | [💡 Pour](../sparks/pour.md)   |
| **Concept** | [🧠 Pour](../concepts/pour.md) |
| **Run it**  | `pnpm dev` → Pour              |

## Findings

### The layout carves the material, and that is the whole effect

Rendered from the simulation directly, the elements do not just hold material on top of
them — they **cut caves out of it**. Sand cannot flow under an overhang, so every block
leaves a void beneath it with a slope running down to its edges. Nothing in the code aims
for that; it falls out of a granular material meeting a rectangle.

It is also the answer to whether box-shaped terrain is convincing: at this grain size the
material's own slopes are what the eye reads, not the outline of the box.

### Three materials, and they are visibly different things

From the same three rules and two numbers each:

- **Sand** heaps at an angle, holds a peak, and leaves the caves described above.
- **Water** finds a flat level across the whole width and stays flat.
- **Lava** is the surprise. Moving on only a third of passes, it piles thickly on top of
  the blocks instead of shedding, and **dribbles through the gaps between cards in thin
  streams**. Nobody wrote a dripping rule.

A test holds the difference between the first two — sand keeps a peak above its own mean,
water flattens towards it — so a change that quietly turned one into the other would fail
rather than merely look wrong.

### The cost follows the material, not the page

One simulation pass, median of 240 frames, on a 1080×660 viewport:

| cell size | grid    | cells  | empty   | half full |
| --------- | ------- | ------ | ------- | --------- |
| 3px       | 360×220 | 79,200 | 0.12 ms | 1.30 ms   |
| 5px       | 216×132 | 28,512 | 0.16 ms | 0.67 ms   |
| 8px       | 135×82  | 11,070 | 0.16 ms | 0.26 ms   |
| 12px      | 90×55   | 4,950  | 0.11 ms | 0.11 ms   |

**79,000 empty cells cost 0.12 ms.** Scanning the grid is nearly free; what costs is
material actually moving. So the page can be as large as it likes — the bill arrives with
the pile, and it arrives gently: half a page of sand at 5px cells is 0.67 ms, about a
tenth of a frame.

Measured in Node, without the browser. **The drawing half is not measured** — one
`putImageData` of a grid-sized buffer, scaled by CSS with smoothing off, which is why it
is drawn that way rather than as thousands of rectangles. It still needs a number.

## Still open

- **Water has no pressure.** It levels, but it cannot climb into a cavity or flow under an
  overhang the way real water would. That is correct for sand and wrong for water, and it
  shows: the caves under the blocks stay dry.
- **Nothing has been looked at in a browser at full speed yet.** Everything above was
  measured or rendered headlessly, because the tab available for testing was not
  delivering frames. The physics is right; how it _feels_ is unverified.
- An element's box is its shape. A round card is a rectangle to the material.
- The pile buries content, on purpose. Nothing yet stops it burying something that still
  has to be read, and that is the question that decides whether this can be published.
- `prefers-reduced-motion` removes the material entirely. There is no reduced version of
  falling and burying that still means what it means — but "nothing" deserves a second
  thought before this leaves the Lab.
