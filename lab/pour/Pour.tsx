import { useEffect, useRef, type ReactNode } from 'react';
import {
  createGrid,
  FILLED,
  MATERIALS,
  type Box,
  type Grid,
  type MaterialSettings,
} from './grains';
import './pour.css';

export interface PourProps {
  /** The page the material falls onto. Every element inside is terrain. */
  children: ReactNode;
  material?: keyof typeof MATERIALS;
  /** Size of one cell in pixels. Smaller is finer and costs more. */
  cellSize?: number;
  /** 1 pours downward, -1 turns the glass over. */
  gravity?: 1 | -1;
  /** Whether material is still arriving. */
  pouring?: boolean;
  /** Which descendants count as terrain. */
  terrainSelector?: string;
  onSample?: (sample: { filled: number; stepMs: number; drawMs: number }) => void;
}

/**
 * Material poured onto the page, which piles up on the page itself.
 *
 * The elements underneath are written into the simulation as solid cells, so a heading
 * holds a ridge and a card sheds a slope. The effect is made of the layout rather than
 * played over it, and it is different on every page.
 *
 * One canvas, one typed array, no DOM per grain — which is the only reason tens of
 * thousands of cells are possible at all.
 */
export function Pour({
  children,
  material = 'sand',
  cellSize = 5,
  gravity = 1,
  pouring = true,
  terrainSelector = '[data-pour-terrain]',
  onSample,
}: PourProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The loop reads its settings from a ref rather than from its closure, so changing a
  // control does not tear down the simulation and lose the pile that is already there.
  const stateRef = useRef({ material, gravity, pouring, cellSize });
  const onSampleRef = useRef(onSample);

  useEffect(() => {
    stateRef.current = { material, gravity, pouring, cellSize };
    onSampleRef.current = onSample;
  }, [material, gravity, pouring, cellSize, onSample]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (host === null || canvas === null) return;

    const context = canvas.getContext('2d', { alpha: true });
    if (context === null) return;

    let grid: Grid | null = null;
    let image: ImageData | null = null;
    let frameHandle = 0;
    let lastTime = 0;
    let currentCellSize = stateRef.current.cellSize;

    const random = Math.random;

    const measure = (): void => {
      const bounds = host.getBoundingClientRect();
      currentCellSize = stateRef.current.cellSize;
      const columns = Math.max(1, Math.floor(bounds.width / currentCellSize));
      const rows = Math.max(1, Math.floor(bounds.height / currentCellSize));

      const previous = grid;
      grid = createGrid(columns, rows);
      grid.gravity = stateRef.current.gravity;

      // The canvas is one pixel per cell and stretched by CSS with smoothing off, so the
      // browser scales it for free instead of JavaScript drawing thousands of rectangles.
      canvas.width = columns;
      canvas.height = rows;
      image = context.createImageData(columns, rows);

      const boxes: Box[] = [];
      for (const element of host.querySelectorAll<HTMLElement>(terrainSelector)) {
        const rect = element.getBoundingClientRect();
        boxes.push({
          x: rect.left - bounds.left,
          y: rect.top - bounds.top,
          width: rect.width,
          height: rect.height,
        });
      }
      grid.setTerrain(boxes, currentCellSize);

      // A resize is a discontinuity; carrying a pile across a new grid would misplace it.
      if (previous !== null) previous.clear();
    };

    const draw = (): void => {
      if (grid === null || image === null) return;
      const settings: MaterialSettings = MATERIALS[stateRef.current.material];
      const [red, green, blue] = settings.colour;
      const data = image.data;

      for (let index = 0; index < grid.cells.length; index += 1) {
        const pixel = index * 4;
        if (grid.cells[index] !== FILLED) {
          data[pixel + 3] = 0;
          continue;
        }
        // Per-cell jitter, so a pile reads as grains rather than as a flat wash.
        const jitter = (((grid.shade[index] ?? 0) / 255) * 2 - 1) * settings.variation;
        data[pixel] = clampByte(red * (1 + jitter));
        data[pixel + 1] = clampByte(green * (1 + jitter));
        data[pixel + 2] = clampByte(blue * (1 + jitter));
        data[pixel + 3] = 255;
      }

      context.putImageData(image, 0, 0);
    };

    const tick = (time: number): void => {
      const elapsed = lastTime === 0 ? 0 : (time - lastTime) / 1000;
      lastTime = time;

      const settings = MATERIALS[stateRef.current.material];
      const stepStart = performance.now();
      if (grid !== null) {
        grid.gravity = stateRef.current.gravity;
        if (stateRef.current.pouring) grid.pour(elapsed, settings, random);
        grid.step(settings, random);
      }
      const stepMs = performance.now() - stepStart;

      const drawStart = performance.now();
      draw();
      const drawMs = performance.now() - drawStart;

      onSampleRef.current?.({ filled: grid?.filledCount() ?? 0, stepMs, drawMs });
      frameHandle = requestAnimationFrame(tick);
    };

    measure();
    frameHandle = requestAnimationFrame(tick);

    let observedWidth = host.getBoundingClientRect().width;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? observedWidth;
      if (Math.abs(width - observedWidth) < 1) return;
      observedWidth = width;
      measure();
    });
    observer.observe(host);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameHandle);
    };
  }, [terrainSelector]);

  return (
    <div ref={hostRef} className="pour">
      {children}
      {/*
        Decoration over content that must stand on its own: the material is invisible to
        assistive technology and cannot be clicked through to.
      */}
      <canvas ref={canvasRef} className="pour__canvas" aria-hidden="true" />
    </div>
  );
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
