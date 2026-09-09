import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createTrail, DEFAULT_TRAIL, type TrailSettings } from './trail';
import './wake.css';

export interface WakeProps {
  /** What leaves the trail. It follows the pointer inside the surface. */
  children: ReactNode;
  settings?: Partial<TrailSettings> | undefined;
  className?: string | undefined;
  onSample?: ((sample: { ghosts: number; speed: number; frameMs: number }) => void) | undefined;
}

/**
 * Fast movement leaves a wake of where it has been, which fades.
 *
 * The rule the whole thing hangs on: **a wake is a function of speed, not of movement.**
 * Something that drifts leaves nothing at all. Without that, every pointer movement on
 * the page smears, and the effect is decoration wearing the clothes of information.
 *
 * ## What it costs
 *
 * A ghost is a copy of the children, so the node count is the trail length times the size
 * of what is inside — the same shape of cost as
 * [Fracture](../../docs/lab/fracture.md) and [Lens](../../docs/lab/lens.md), and the
 * reason a wake belongs on a marker rather than on a card.
 *
 * Per frame it is one transform and one opacity per ghost, both composited.
 *
 * ## Accessibility
 *
 * The ghosts are `aria-hidden` and inert: the same content repeated a dozen times is
 * worse for a screen reader than no content at all. Under `prefers-reduced-motion` there
 * are no ghosts and no loop — the thing simply moves.
 */
export function Wake({ children, settings, className, onSample }: WakeProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const ghostRefs = useRef<(HTMLDivElement | null)[]>([]);
  const onSampleRef = useRef(onSample);
  const settingsRef = useRef(settings);

  const config = { ...DEFAULT_TRAIL, ...settings };
  const [reduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
  const ghostCount = reduced ? 0 : config.length;

  useEffect(() => {
    onSampleRef.current = onSample;
    settingsRef.current = settings;
  }, [onSample, settings]);

  useEffect(() => {
    const host = hostRef.current;
    const body = bodyRef.current;
    if (host === null || body === null || reduced) return;

    const trail = createTrail(ghostCount);
    let frameHandle = 0;
    let lastTime = 0;
    let pointer: { x: number; y: number } | null = null;
    let idleFrames = 0;

    const tick = (time: number): void => {
      const elapsed = lastTime === 0 ? 0 : (time - lastTime) / 1000;
      lastTime = time;
      const started = performance.now();
      const current = { ...DEFAULT_TRAIL, ...settingsRef.current };

      if (pointer !== null) {
        trail.push(pointer, elapsed);
        body.style.setProperty(
          'transform',
          `translate3d(${pointer.x.toFixed(1)}px, ${pointer.y.toFixed(1)}px, 0)`
        );
      }

      const ghosts = trail.ghosts(current);
      for (const [index, element] of ghostRefs.current.entries()) {
        if (element === null) continue;
        const ghost = ghosts[index];
        if (ghost === undefined) {
          element.style.setProperty('opacity', '0');
          continue;
        }
        element.style.setProperty(
          'transform',
          `translate3d(${ghost.x.toFixed(1)}px, ${ghost.y.toFixed(1)}px, 0)`
        );
        element.style.setProperty('opacity', ghost.opacity.toFixed(3));
      }

      onSampleRef.current?.({
        ghosts: ghosts.length,
        speed: trail.speed(),
        frameMs: performance.now() - started,
      });

      // A wake with no ghosts and nothing moving is a loop with nothing to do. A few
      // frames of grace, because a pointer that pauses for one frame has not stopped.
      idleFrames = ghosts.length === 0 ? idleFrames + 1 : 0;
      if (idleFrames > 20 && elapsed > 0) {
        frameHandle = 0;
        lastTime = 0;
        return;
      }
      frameHandle = requestAnimationFrame(tick);
    };

    const start = (): void => {
      if (frameHandle !== 0) return;
      lastTime = 0;
      idleFrames = 0;
      frameHandle = requestAnimationFrame(tick);
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const bounds = host.getBoundingClientRect();
      pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      start();
    };

    const handlePointerLeave = (): void => {
      pointer = null;
      trail.clear();
    };

    host.addEventListener('pointermove', handlePointerMove);
    host.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
    };
  }, [ghostCount, reduced]);

  return (
    <div ref={hostRef} className={className === undefined ? 'wake' : `wake ${className}`}>
      {Array.from({ length: ghostCount }, (_, index) => (
        <div
          key={index}
          className="wake__ghost"
          aria-hidden="true"
          ref={(element) => {
            ghostRefs.current[index] = element;
          }}
        >
          {children}
        </div>
      ))}
      <div ref={bodyRef} className="wake__body">
        {children}
      </div>
    </div>
  );
}
