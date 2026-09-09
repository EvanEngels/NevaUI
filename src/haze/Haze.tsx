import { useEffect, useRef, type ReactNode } from 'react';
import { createSmoke, DEFAULT_SMOKE, type SmokeSettings } from './smoke';
import './haze.css';

export interface HazeProps {
  /** What the smoke drifts over. It stays visible and stays interactive. */
  children: ReactNode;
  settings?: Partial<SmokeSettings> | undefined;
  /** Size of one simulation cell in pixels. Smoke has no detail worth resolving finely. */
  cellSize?: number | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}

/**
 * Smoke over an element, drifting, which the pointer wipes away and which closes back
 * over.
 *
 * ⚡ Experimental. The API will change.
 *
 * A density field carried along a current, on a coarse grid, drawn to a small canvas and
 * scaled up with smoothing on — the interpolation the browser does for free is the last
 * step of the simulation. See `smoke.ts` for the model and `noise.ts` for why the current
 * needs no pressure solve.
 *
 * ## The rule this is built around
 *
 * **The smoke never hides anything.** It sits at a density where the content underneath
 * stays legible and stays clickable; wiping makes it clearer, it does not make it
 * available. Anything else turns a decoration into a gate that only a pointer can open,
 * and there is no keyboard equivalent for waving smoke away.
 *
 * ## This one never stops
 *
 * Every other experiment in this project stops its loop when nothing is moving. Drifting
 * smoke has no such state — the current keeps turning — so this runs for as long as the
 * element is on screen, and an `IntersectionObserver` is what stops it rather than
 * stillness. Under `prefers-reduced-motion` it draws once and never again.
 */
export function Haze({ children, settings, cellSize = 10, className, style }: HazeProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (host === null || canvas === null) return;

    const context = canvas.getContext('2d');
    if (context === null) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    let smoke = createSmoke(1, 1);
    let image: ImageData | null = null;
    let frameHandle = 0;
    let lastTime = 0;
    let visible = true;
    let pointer: { x: number; y: number } | null = null;
    let previousPointer: { x: number; y: number } | null = null;

    const config = (): SmokeSettings => ({ ...DEFAULT_SMOKE, ...settingsRef.current });

    const measure = (): void => {
      const bounds = host.getBoundingClientRect();
      const columns = Math.max(2, Math.round(bounds.width / cellSize));
      const rows = Math.max(2, Math.round(bounds.height / cellSize));

      canvas.width = columns;
      canvas.height = rows;
      // The canvas is one pixel per cell and stretched by CSS with smoothing left on, so
      // the browser's own interpolation softens the field for free.
      image = context.createImageData(columns, rows);

      smoke = createSmoke(columns, rows, Math.floor(bounds.width) || 1);
      smoke.fill(config().density);
    };

    const draw = (): void => {
      if (image === null) return;
      const data = image.data;
      for (let index = 0; index < smoke.density.length; index += 1) {
        const pixel = index * 4;
        data[pixel] = 236;
        data[pixel + 1] = 238;
        data[pixel + 2] = 242;
        data[pixel + 3] = Math.max(0, Math.min(255, Math.round((smoke.density[index] ?? 0) * 255)));
      }
      context.putImageData(image, 0, 0);
    };

    const tick = (time: number): void => {
      const elapsed = lastTime === 0 ? 0 : (time - lastTime) / 1000;
      lastTime = time;
      const current = config();

      if (pointer !== null) {
        const from = previousPointer ?? pointer;
        const radius = current.brush / cellSize;
        const distance = Math.hypot(pointer.x - from.x, pointer.y - from.y);
        // The gap between two pointer events can be wider than the brush, so the wipe is
        // drawn along the line between them; without it a fast sweep leaves a dotted trail.
        const steps = Math.max(1, Math.ceil(distance / (radius * 0.4)));
        for (let step = 1; step <= steps; step += 1) {
          const t = step / steps;
          smoke.wipe(
            (from.x + (pointer.x - from.x) * t) / cellSize,
            (from.y + (pointer.y - from.y) * t) / cellSize,
            radius,
            0.9
          );
        }
        previousPointer = pointer;
        pointer = null;
      }

      smoke.step(elapsed, current);
      draw();

      if (!visible) {
        frameHandle = 0;
        lastTime = 0;
        return;
      }
      frameHandle = requestAnimationFrame(tick);
    };

    const start = (): void => {
      if (frameHandle !== 0 || reducedMotion) return;
      lastTime = 0;
      frameHandle = requestAnimationFrame(tick);
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const bounds = host.getBoundingClientRect();
      pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      start();
    };

    const handlePointerLeave = (): void => {
      pointer = null;
      previousPointer = null;
    };

    measure();
    draw();

    // Smoke that drifts has no rest, so what stops the loop is the element leaving the
    // screen rather than the picture settling.
    const onScreen = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) start();
    });
    onScreen.observe(host);

    let observedWidth = host.getBoundingClientRect().width;
    const size = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? observedWidth;
      if (Math.abs(width - observedWidth) < 1) return;
      observedWidth = width;
      measure();
      draw();
    });
    size.observe(host);

    host.addEventListener('pointermove', handlePointerMove);
    host.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      onScreen.disconnect();
      size.disconnect();
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
    };
  }, [cellSize]);

  return (
    <div
      ref={hostRef}
      className={className === undefined ? 'neva-haze' : `neva-haze ${className}`}
      style={style}
    >
      {children}
      <canvas ref={canvasRef} className="neva-haze__smoke" aria-hidden="true" />
    </div>
  );
}
