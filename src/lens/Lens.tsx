import { useEffect, useRef, type ReactNode } from 'react';
import { clampFocus, copyTransform } from './magnify';
import './lens.css';

export interface LensProps {
  /** The content the lens magnifies. It stays where it is and stays interactive. */
  children: ReactNode;
  /** Magnification. */
  zoom?: number | undefined;
  /** Radius of the disc, in pixels. */
  radius?: number | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}

/**
 * A disc you move over dense content, which magnifies the **real DOM** beneath it rather
 * than a picture of it.
 *
 * ⚡ Experimental. The API will change. Text under the lens is text: it is selectable, it renders at the
 * magnified size rather than being resampled, and it stays sharp.
 *
 * ## How, and what that costs
 *
 * The content is cloned once, the clone is scaled, and the disc clips it. Moving the lens
 * is one transform write per frame, whatever is inside.
 *
 * The cost is the clone. [Fracture](../../docs/lab/fracture.md) established the shape of
 * this: duplicating content multiplies nodes, and the limit is the complexity of what you
 * put inside rather than anything the component does per frame. One copy here, not a
 * hundred, but it is still a copy of everything.
 *
 * ## What the lens lies about
 *
 * **It shows you something you cannot click.** The disc does not take pointer events, so
 * a link seen magnified is not the link you would hit — the real one is underneath, at its
 * real size and position. [Displacement Field](../../docs/lab/displacement-field.md)
 * reached the same conclusion from the other direction: an effect that moves what you are
 * aiming at has no business carrying controls.
 *
 * Under `prefers-reduced-motion` the lens never appears.
 */
export function Lens({ children, zoom = 2.2, radius = 96, className, style }: LensProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const discRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    const source = sourceRef.current;
    const disc = discRef.current;
    if (host === null || source === null || disc === null) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    if (reducedMotion) return;

    let clone: HTMLElement | null = null;
    let frameHandle = 0;
    let pending: { x: number; y: number } | null = null;

    const build = (): void => {
      disc.replaceChildren();
      const copy = source.cloneNode(true);
      if (!(copy instanceof HTMLElement)) return;
      // The copy is scenery: it must never be read out twice, and it must never be
      // reachable by tab. The original underneath is the real thing.
      copy.setAttribute('aria-hidden', 'true');
      copy.inert = true;
      copy.classList.add('neva-lens__copy');
      const bounds = host.getBoundingClientRect();
      copy.style.width = `${bounds.width}px`;
      copy.style.height = `${bounds.height}px`;
      disc.appendChild(copy);
      clone = copy;
    };

    const write = (): void => {
      frameHandle = 0;
      if (pending === null || clone === null) return;

      const bounds = host.getBoundingClientRect();
      const focus = clampFocus(pending, bounds.width, bounds.height, radius);
      const shift = copyTransform(focus, zoom, radius);

      disc.style.setProperty('--neva-lens-x', `${focus.x.toFixed(1)}px`);
      disc.style.setProperty('--neva-lens-y', `${focus.y.toFixed(1)}px`);
      clone.style.setProperty(
        'transform',
        `translate3d(${shift.x.toFixed(2)}px, ${shift.y.toFixed(2)}px, 0) scale(${zoom})`
      );
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const bounds = host.getBoundingClientRect();
      pending = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      host.classList.add('neva-lens--on');
      // Several pointer events can arrive between two frames and only the last matters.
      if (frameHandle === 0) frameHandle = requestAnimationFrame(write);
    };

    const handlePointerLeave = (): void => {
      host.classList.remove('neva-lens--on');
    };

    build();

    let observedWidth = host.getBoundingClientRect().width;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? observedWidth;
      if (Math.abs(width - observedWidth) < 1) return;
      observedWidth = width;
      build();
    });
    observer.observe(host);

    host.addEventListener('pointermove', handlePointerMove);
    host.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      observer.disconnect();
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
      disc.replaceChildren();
    };
  }, [zoom, radius, children]);

  return (
    <div
      ref={hostRef}
      className={className === undefined ? 'neva-lens' : `neva-lens ${className}`}
      style={{ ...style, '--neva-lens-radius': `${radius}px` } as React.CSSProperties}
    >
      <div ref={sourceRef} className="neva-lens__source">
        {children}
      </div>
      <div ref={discRef} className="neva-lens__disc" aria-hidden="true" />
    </div>
  );
}
