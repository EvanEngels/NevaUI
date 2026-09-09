/**
 * Where a magnifier has to put the copy underneath it.
 *
 * The whole of a lens is one equation. The content is duplicated and scaled by `zoom`
 * about the top-left corner; for the point under the pointer to stay under the pointer,
 * the copy has to be pushed back by however far that scaling moved it.
 *
 * Getting it wrong is not subtle — the magnified content slides away from the pointer as
 * you move, which reads as the lens being broken rather than as an offset being wrong. It
 * is four lines, and it is the only thing in this experiment worth testing.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Offset for the scaled copy, given the point the lens is over.
 *
 * Scaling by `zoom` about the origin sends a point `p` to `p * zoom`. To bring it back
 * under `p`, translate by `p - p * zoom`.
 */
export function lensOffset(focus: Point, zoom: number): Point {
  return {
    x: focus.x - focus.x * zoom,
    y: focus.y - focus.y * zoom,
  };
}

/**
 * Where to put the copy inside the disc.
 *
 * `lensOffset` works in the surface's coordinates, and the copy lives inside a disc whose
 * own corner has been moved to `focus - radius`. Forgetting that second step is not a
 * small error: the lens magnifies correctly and shows the wrong part of the page, which
 * looks like the magnification being broken rather than a frame of reference being wrong.
 *
 * The focused point lands at the centre of the disc, which is the whole requirement.
 */
export function copyTransform(focus: Point, zoom: number, radius: number): Point {
  const offset = lensOffset(focus, zoom);
  return {
    x: offset.x - (focus.x - radius),
    y: offset.y - (focus.y - radius),
  };
}

/** Keeps the lens inside the surface, so it never magnifies the void beyond an edge. */
export function clampFocus(focus: Point, width: number, height: number, radius: number): Point {
  return {
    x: Math.max(radius, Math.min(width - radius, focus.x)),
    y: Math.max(radius, Math.min(height - radius, focus.y)),
  };
}
