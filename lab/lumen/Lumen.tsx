import { useEffect, useRef } from 'react';
import { measureFrame, type FrameSample } from '../playground/frames';
import './lumen.css';

export interface LumenProps {
  columns: number;
  rows: number;
  onFrame?: (sample: FrameSample) => void;
}

/**
 * Lumen — one light, and the surface works out the rest by itself.
 *
 * Every other lit-grid effect writes one value per tile per frame, so the cost of the
 * light grows with the size of the surface. Here the loop writes exactly two custom
 * properties, on the container, whatever the tile count.
 *
 * It works because each tile is told its own position once, at mount, as `--x` and
 * `--y`. From then on a tile knows where it is, CSS knows where the light is, and the
 * vector between them is a `calc()` the browser evaluates during style resolution —
 * which it was going to do anyway. The highlight offset, the shadow direction and the
 * falloff all fall out of that vector without JavaScript touching a single tile.
 *
 * The honest trade: JavaScript is O(1), painting stays O(n). That moves the cost from a
 * place we control badly to a place the compositor controls well, and it is the reason
 * this is worth trying — not a claim that the effect became free.
 */
export function Lumen({ columns, rows, onFrame }: LumenProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onFrameRef = useRef(onFrame);
  const count = columns * rows;

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    let frameHandle = 0;
    let lastTime = 0;
    let pending: { x: number; y: number } | null = null;

    /** Each tile learns its own centre once. Nothing rewrites this per frame. */
    const measure = (): void => {
      const tiles = host.querySelectorAll<HTMLElement>('.lumen__tile');
      for (const tile of tiles) {
        tile.style.setProperty('--x', `${(tile.offsetLeft + tile.offsetWidth / 2).toFixed(1)}px`);
        tile.style.setProperty('--y', `${(tile.offsetTop + tile.offsetHeight / 2).toFixed(1)}px`);
      }
    };

    const write = (time: number): void => {
      frameHandle = 0;
      const sample = measureFrame(time, lastTime, () => {
        if (pending === null) return;
        host.style.setProperty('--light-x', `${pending.x.toFixed(1)}px`);
        host.style.setProperty('--light-y', `${pending.y.toFixed(1)}px`);
      });
      lastTime = time;
      onFrameRef.current?.(sample);
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const bounds = host.getBoundingClientRect();
      pending = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      // Coalesced to one write per frame: several pointer events can arrive between two
      // frames, and only the last one is worth anything.
      if (frameHandle === 0) frameHandle = requestAnimationFrame(write);
    };

    const handlePointerLeave = (): void => {
      host.style.setProperty('--light-away', '1');
    };

    const handlePointerEnter = (): void => {
      host.style.setProperty('--light-away', '0');
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(host);

    host.addEventListener('pointermove', handlePointerMove);
    host.addEventListener('pointerleave', handlePointerLeave);
    host.addEventListener('pointerenter', handlePointerEnter);

    return () => {
      observer.disconnect();
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      host.removeEventListener('pointerenter', handlePointerEnter);
      if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
    };
  }, [count]);

  return (
    <div
      ref={hostRef}
      className="lumen"
      style={{ '--lumen-columns': columns } as React.CSSProperties}
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="lumen__tile" key={index} />
      ))}
      <div className="lumen__glow" aria-hidden="true" />
    </div>
  );
}
