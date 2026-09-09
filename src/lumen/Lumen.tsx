import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

export interface LumenProps {
  /**
   * The lit surface. Each direct child becomes a lit face, so pass the real content —
   * cards, tiles, images — rather than wrapping it in anything first.
   */
  children: ReactNode;
  /**
   * Extra class on the surface, for layout. Lumen sets no layout of its own.
   *
   * Explicitly `| undefined` so a caller compiling with `exactOptionalPropertyTypes` can
   * pass a value that may not exist, which is the normal case for a conditional class.
   */
  className?: string | undefined;
  /**
   * Inline style on the surface. Present because the component deliberately imposes no
   * layout, so the caller needs somewhere to put one — a grid, or a custom property that
   * drives it.
   */
  style?: CSSProperties;
  /**
   * How the light reaches the faces.
   *
   * `'flat'` (the default) moves one composited layer over the surface. Nothing repaints
   * as the light moves, whatever is on screen.
   *
   * `'faces'` gives every face its own highlight and its own shadow, thrown away from the
   * light. It is the better-looking one and it **repaints every visible face on every
   * frame** — see the cost note on the component.
   */
  depth?: 'flat' | 'faces';
}

/**
 * A surface lit by a single moving light.
 *
 * ⚡ Experimental. The API will change.
 *
 * Every other version of this effect writes one style per element per frame, so the cost
 * of the light grows with the surface. Lumen writes **two custom properties, on the
 * container, whatever the element count**.
 *
 * It works because each face is told its own centre once, when the surface is measured.
 * From then on a face knows where it is, CSS knows where the light is, and the vector
 * between them is a `calc()` the browser evaluates during style resolution — which it was
 * going to do anyway. Highlight offset, shadow direction and falloff all come out of that
 * vector without JavaScript touching a single face.
 *
 * ## What this costs
 *
 * Two writes per frame was always true and never the point. What matters is what those
 * two writes make the browser redraw.
 *
 * `depth="flat"`, the default, moves a single composited layer. Nothing repaints as the
 * light moves — the cost does not grow with the surface at all.
 *
 * `depth="faces"` derives a highlight and a shadow per face from the same two properties.
 * It looks better and it repaints **every visible face on every frame**, so its cost grows
 * with what is on screen. Reported from use: it stutters well before the face count sounds
 * large. Rows scrolled out of view are free — they are never painted — so the number that
 * matters is faces visible at once, not faces total.
 *
 * ## Accessibility
 *
 * Lumen is decoration over content that must already stand on its own: the light adds no
 * information, and every face keeps whatever semantics you gave it. Under
 * `prefers-reduced-motion` the light stops following the pointer and rests at the top of
 * the surface, so the depth remains and the movement does not. Nothing here is focusable,
 * because there is nothing here to operate.
 */
export function Lumen({ children, className, style, depth = 'flat' }: LumenProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    let frameHandle = 0;
    let pending: { x: number; y: number } | null = null;

    // Under reduced motion the light does not follow anything, so the component writes
    // nothing at all and the stylesheet's resting position stands. Attaching the
    // listeners and then ignoring them would leave inline values overriding it.
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    /**
     * Each face learns its own centre. This is the only time a face is written to, and
     * it happens outside any frame — measuring inside one would force synchronous layout
     * on every element, which is the cost this component exists to avoid.
     */
    const measure = (): void => {
      // Only the per-face mode needs to know where each face is. In flat mode the light
      // is one layer that knows its own position, so no face is written to at all.
      if (depth !== 'faces') return;

      for (const face of host.children) {
        if (!(face instanceof HTMLElement)) continue;
        face.style.setProperty(
          '--neva-face-x',
          `${(face.offsetLeft + face.offsetWidth / 2).toFixed(1)}px`
        );
        face.style.setProperty(
          '--neva-face-y',
          `${(face.offsetTop + face.offsetHeight / 2).toFixed(1)}px`
        );
      }
    };

    const write = (): void => {
      frameHandle = 0;
      if (pending === null) return;
      host.style.setProperty('--neva-light-x', `${pending.x.toFixed(1)}px`);
      host.style.setProperty('--neva-light-y', `${pending.y.toFixed(1)}px`);
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const bounds = host.getBoundingClientRect();
      pending = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      // Several pointer events can arrive between two frames and only the last one is
      // worth anything, so the write is coalesced to one per frame.
      if (frameHandle === 0) frameHandle = requestAnimationFrame(write);
    };

    const setAway = (away: boolean): void => {
      host.style.setProperty('--neva-light-away', away ? '1' : '0');
    };

    const handlePointerLeave = (): void => {
      setAway(true);
    };
    const handlePointerEnter = (): void => {
      setAway(false);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(host);
    if (depth === 'faces') {
      for (const face of host.children) observer.observe(face);
    }

    if (!reducedMotion) {
      host.addEventListener('pointermove', handlePointerMove);
      host.addEventListener('pointerleave', handlePointerLeave);
      host.addEventListener('pointerenter', handlePointerEnter);
    }

    return () => {
      observer.disconnect();
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      host.removeEventListener('pointerenter', handlePointerEnter);
      if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
    };
    // The children are read from the DOM, so a changing child list has to re-measure.
  }, [children, depth]);

  return (
    <div
      ref={hostRef}
      className={className === undefined ? 'neva-lumen' : `neva-lumen ${className}`}
      style={style}
      data-neva-depth={depth}
    >
      {children}
    </div>
  );
}
