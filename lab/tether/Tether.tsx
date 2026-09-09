import { useEffect, useRef } from 'react';
import { createRope, DEFAULT_ROPE, ropePath, type Point, type RopeSettings } from './rope';
import './tether.css';

export interface TetherProps {
  settings?: Partial<RopeSettings>;
  /** Radius, in pixels, within which a pointer press grabs the weight. */
  grabRadius?: number;
}

/**
 * The rope is one `<path>`. Whatever the point count, a frame writes a single `d`
 * attribute and one transform for the weight — the browser draws the curve, not
 * JavaScript.
 */
export function Tether({ settings, grabRadius = 44 }: TetherProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const bobRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const path = pathRef.current;
    const bob = bobRef.current;
    if (host === null || path === null || bob === null) return;

    const config = { ...DEFAULT_ROPE, ...settings };
    let anchor: Point = { x: 0, y: 0 };
    let rope = createRope(anchor, config);
    let frameHandle = 0;
    let lastTime = 0;
    let holding = false;

    const measure = (): void => {
      const bounds = host.getBoundingClientRect();
      anchor = { x: bounds.width / 2, y: bounds.height * 0.14 };
      rope = createRope(anchor, config);
    };

    const write = (): void => {
      const points = rope.points();
      const end = points[points.length - 1];
      path.setAttribute('d', ropePath(points));
      if (end !== undefined) {
        bob.setAttribute('transform', `translate(${end.x.toFixed(2)} ${end.y.toFixed(2)})`);
      }
    };

    const tick = (time: number): void => {
      const elapsed = lastTime === 0 ? 0 : (time - lastTime) / 1000;
      lastTime = time;

      rope.step(elapsed);
      write();

      if (rope.isAtRest()) {
        frameHandle = 0;
        lastTime = 0;
        return;
      }
      frameHandle = requestAnimationFrame(tick);
    };

    const start = (): void => {
      if (frameHandle !== 0) return;
      lastTime = 0;
      frameHandle = requestAnimationFrame(tick);
    };

    const localPoint = (event: PointerEvent): Point => {
      const bounds = host.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };

    const handlePointerDown = (event: PointerEvent): void => {
      const point = localPoint(event);
      const points = rope.points();
      const end = points[points.length - 1];
      if (end === undefined) return;

      if (Math.hypot(point.x - end.x, point.y - end.y) > grabRadius) return;

      holding = true;
      // Capture keeps the drag alive when the pointer leaves the panel. It throws for a
      // pointer id the browser does not own — a synthetic event in a test, or a pointer
      // already released — and losing capture is not a reason to lose the drag.
      try {
        host.setPointerCapture(event.pointerId);
      } catch {
        // Dragging still works, it just stops at the edge of the panel.
      }
      host.classList.add('tether--held');
      rope.grab(point);
      start();
    };

    const handlePointerMove = (event: PointerEvent): void => {
      if (!holding) return;
      rope.grab(localPoint(event));
      start();
    };

    const release = (): void => {
      if (!holding) return;
      holding = false;
      host.classList.remove('tether--held');
      rope.grab(null);
      start();
    };

    measure();
    write();
    start();

    const observer = new ResizeObserver(() => {
      measure();
      write();
      start();
    });
    observer.observe(host);

    host.addEventListener('pointerdown', handlePointerDown);
    host.addEventListener('pointermove', handlePointerMove);
    host.addEventListener('pointerup', release);
    host.addEventListener('pointercancel', release);

    return () => {
      observer.disconnect();
      host.removeEventListener('pointerdown', handlePointerDown);
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerup', release);
      host.removeEventListener('pointercancel', release);
      if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
    };
  }, [settings, grabRadius]);

  return (
    <div ref={hostRef} className="tether">
      <svg className="tether__canvas" aria-hidden="true">
        <path ref={pathRef} className="tether__line" fill="none" />
        <g ref={bobRef} className="tether__bob">
          <circle r="17" className="tether__bob-halo" />
          <circle r="9" className="tether__bob-core" />
        </g>
      </svg>
      <p className="tether__hint">grab the weight</p>
    </div>
  );
}
