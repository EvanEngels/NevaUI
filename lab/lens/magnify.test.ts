import { describe, expect, it } from 'vitest';
import { clampFocus, copyTransform, lensOffset } from './magnify';

/**
 * A lens whose offset is wrong does not look slightly off — the magnified content slides
 * out from under the pointer, which reads as the whole idea being broken. It is four
 * lines of arithmetic, so it is four lines of arithmetic that get tested.
 */

const magnify = (
  point: { x: number; y: number },
  focus: { x: number; y: number },
  zoom: number
) => {
  const offset = lensOffset(focus, zoom);
  return { x: point.x * zoom + offset.x, y: point.y * zoom + offset.y };
};

describe('lens', () => {
  it('leaves the point under the pointer exactly where it was', () => {
    for (const zoom of [1, 1.5, 2.5, 4]) {
      const focus = { x: 220, y: 90 };
      const seen = magnify(focus, focus, zoom);

      // The one thing a magnifier must do: what you are pointing at does not move.
      expect(seen.x).toBeCloseTo(focus.x, 6);
      expect(seen.y).toBeCloseTo(focus.y, 6);
    }
  });

  it('pushes everything else away from that point, in proportion', () => {
    const focus = { x: 100, y: 100 };
    const near = magnify({ x: 110, y: 100 }, focus, 2);
    const far = magnify({ x: 130, y: 100 }, focus, 2);

    expect(near.x - focus.x).toBeCloseTo(20, 6);
    expect(far.x - focus.x).toBeCloseTo(60, 6);
  });

  it('does nothing at all at a zoom of one', () => {
    const offset = lensOffset({ x: 40, y: 70 }, 1);
    expect(offset).toEqual({ x: 0, y: 0 });
  });

  it('puts the focused point at the centre of the disc', () => {
    const focus = { x: 300, y: 180 };
    const radius = 90;
    const zoom = 2.5;
    const shift = copyTransform(focus, zoom, radius);

    // Inside the disc's own coordinates, which start at its corner rather than the
    // surface's. Getting this wrong magnifies correctly and shows the wrong content.
    const seen = { x: focus.x * zoom + shift.x, y: focus.y * zoom + shift.y };

    expect(seen.x).toBeCloseTo(radius, 6);
    expect(seen.y).toBeCloseTo(radius, 6);
  });

  it('keeps the lens inside the surface', () => {
    // A lens allowed past the edge magnifies the void, which is empty and looks like a bug.
    expect(clampFocus({ x: -50, y: 500 }, 400, 300, 60)).toEqual({ x: 60, y: 240 });
    expect(clampFocus({ x: 200, y: 150 }, 400, 300, 60)).toEqual({ x: 200, y: 150 });
  });
});
