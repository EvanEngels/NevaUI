/**
 * The page, as ground.
 *
 * Every material in Pour needs the same thing from the layout — which cells are solid —
 * and nothing else. That is the whole of what they share; the physics is not shared at
 * all, because sand, water and lava turned out not to be one thing with three settings.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Terrain {
  readonly columns: number;
  readonly rows: number;
  /** 1 where the page is solid, 0 where material can move. */
  readonly solid: Uint8Array;
  isSolid(column: number, row: number): boolean;
  inside(column: number, row: number): boolean;
}

export function createTerrain(
  columns: number,
  rows: number,
  boxes: readonly Box[],
  cellSize: number
): Terrain {
  const solid = new Uint8Array(columns * rows);

  for (const box of boxes) {
    const left = Math.max(0, Math.floor(box.x / cellSize));
    const right = Math.min(columns - 1, Math.floor((box.x + box.width) / cellSize));
    const top = Math.max(0, Math.floor(box.y / cellSize));
    const bottom = Math.min(rows - 1, Math.floor((box.y + box.height) / cellSize));

    for (let row = top; row <= bottom; row += 1) {
      solid.fill(1, row * columns + left, row * columns + right + 1);
    }
  }

  return {
    columns,
    rows,
    solid,
    inside(column, row) {
      return column >= 0 && column < columns && row >= 0 && row < rows;
    },
    isSolid(column, row) {
      return column < 0 || column >= columns || row < 0 || row >= rows
        ? true
        : solid[row * columns + column] === 1;
    },
  };
}
