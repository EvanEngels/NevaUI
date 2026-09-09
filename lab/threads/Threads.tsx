import { Children, useEffect, useRef, type ReactNode } from 'react';
import { createRope, DEFAULT_ROPE, ropePath, segmentFor, type Point, type Rope } from './rope';
import './threads.css';

export interface Link {
  /** `data-thread` value of the element the thread starts at. */
  from: string;
  /** `data-thread` value of the element it ends at. */
  to: string;
}

export interface ThreadsSettings {
  /** Length of a resting thread as a multiple of the gap it crosses. 1 is a straight line. */
  slack: number;
  /** Slack of a thread whose end is being pointed at. */
  taut: number;
  /** Points per thread. More is smoother and slower. */
  points: number;
}

/** Simulated frames run at creation so a thread appears hanging rather than straight. */
const SETTLE_FRAMES = 150;

export const DEFAULT_THREADS: ThreadsSettings = {
  slack: 1.14,
  taut: 1.01,
  points: 18,
};

export interface ThreadsProps {
  children: ReactNode;
  /** Which elements are related. Both ends name a `data-thread` in the children. */
  links: readonly Link[];
  settings?: Partial<ThreadsSettings> | undefined;
  className?: string | undefined;
  onSample?: ((sample: { threads: number; frameMs: number; resting: boolean }) => void) | undefined;
}

/**
 * Relationships drawn as physical threads: they hang between the elements they join, and
 * tighten when you point at one end.
 *
 * The rope solver is [Tether](../../docs/archive/tether.md), brought back from the
 * archive. It was put away because nothing answered the question its Spark asked — what
 * is it for — and this is the answer.
 *
 * ## What changed when it came back
 *
 * A tether had one end held and one end in your hand, so when you pulled past its length
 * the hand could give. A thread has both ends held by elements and **neither can give**.
 * Asking for a rope shorter than the gap is an unsolvable constraint, and a solver that
 * fails at it stretches like elastic — the wrong material again, from the other side.
 *
 * So a thread's length follows the layout, and what it keeps is slack. Tightening is
 * lowering slack, not shortening a fixed rope.
 *
 * ## Accessibility
 *
 * **The threads are decoration over a relationship that has to exist without them.** A
 * line between two boxes says nothing to a screen reader and nothing to anyone who cannot
 * see it, so whatever the threads illustrate must also be in the content or the markup.
 * Under `prefers-reduced-motion` they are drawn once, straight and still.
 */
export function Threads({ children, links, settings, className, onSample }: ThreadsProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const onSampleRef = useRef(onSample);

  useEffect(() => {
    onSampleRef.current = onSample;
  }, [onSample]);

  const items = Children.toArray(children);
  const key = links.map((link) => `${link.from}>${link.to}`).join('|');

  useEffect(() => {
    const host = hostRef.current;
    const svg = svgRef.current;
    if (host === null || svg === null) return;

    const config = { ...DEFAULT_THREADS, ...settings };
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    interface Thread {
      link: Link;
      path: SVGPathElement;
      rope: Rope;
      from: Point;
      to: Point;
    }

    let threads: Thread[] = [];
    let frameHandle = 0;
    let lastTime = 0;
    let hovered: string | null = null;

    const centreOf = (name: string, bounds: DOMRect): Point | null => {
      const element = host.querySelector<HTMLElement>(`[data-thread="${name}"]`);
      if (element === null) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left - bounds.left + rect.width / 2,
        y: rect.top - bounds.top + rect.height / 2,
      };
    };

    const measure = (): void => {
      const bounds = host.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);

      // Emptying the element rather than the array. Removing only the paths this run
      // knows about leaves behind any created by a previous mount — which is exactly what
      // happened: React runs an effect twice in development and the page ended up with
      // fourteen paths for seven links, invisibly doubling the drawing every frame.
      svg.replaceChildren();
      threads = [];

      for (const link of links) {
        const from = centreOf(link.from, bounds);
        const to = centreOf(link.to, bounds);
        if (from === null || to === null) continue;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'threads__line');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);

        const rope = createRope(from, to, {
          ...DEFAULT_ROPE,
          points: config.points,
          segmentLength: segmentFor(from, to, config.slack, config.points),
        });

        /*
         * Let it hang before it is ever drawn.
         *
         * A rope is created with every point on the straight line between its ends and
         * every velocity at zero, which means it reports itself at rest — and a loop that
         * stops at rest stopped on the first frame, leaving the threads as straight lines
         * for good. Settling here also means threads are already hanging when the page
         * appears, instead of visibly falling into place on load.
         */
        for (let settle = 0; settle < SETTLE_FRAMES; settle += 1) rope.step(1 / 60);

        threads.push({ link, path, rope, from, to });
      }
    };

    const write = (): void => {
      for (const thread of threads) {
        thread.path.setAttribute('d', ropePath(thread.rope.points()));
      }
    };

    const tick = (time: number): void => {
      const elapsed = lastTime === 0 ? 0 : (time - lastTime) / 1000;
      lastTime = time;
      const started = performance.now();

      let resting = true;
      for (const thread of threads) {
        const touched =
          hovered !== null && (thread.link.from === hovered || thread.link.to === hovered);
        // Tightening is a change of slack, applied to the rest length the solver already
        // uses. Nothing else about a highlighted thread is different.
        thread.rope.settings.segmentLength = segmentFor(
          thread.from,
          thread.to,
          touched ? config.taut : config.slack,
          config.points
        );
        thread.rope.step(elapsed);
        if (!thread.rope.isAtRest()) resting = false;
      }
      write();

      onSampleRef.current?.({
        threads: threads.length,
        frameMs: performance.now() - started,
        resting,
      });

      /*
       * The rest check is skipped on the frame that starts the loop.
       *
       * That frame has no previous timestamp, so its elapsed time is zero, nothing is
       * integrated and every rope truthfully reports itself at rest — so the loop stopped
       * immediately and pointing at a node did nothing at all. The first frame of a loop
       * is not evidence about whether the loop is needed.
       */
      if (resting && elapsed > 0) {
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

    const handlePointerOver = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const node = target.closest<HTMLElement>('[data-thread]');
      const name = node?.dataset['thread'] ?? null;
      if (name === hovered) return;
      hovered = name;
      start();
    };

    const handlePointerLeave = (): void => {
      if (hovered === null) return;
      hovered = null;
      start();
    };

    measure();
    write();
    start();

    let observedWidth = host.getBoundingClientRect().width;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? observedWidth;
      if (Math.abs(width - observedWidth) < 1) return;
      observedWidth = width;
      measure();
      write();
      start();
    });
    observer.observe(host);

    host.addEventListener('pointerover', handlePointerOver);
    host.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      observer.disconnect();
      host.removeEventListener('pointerover', handlePointerOver);
      host.removeEventListener('pointerleave', handlePointerLeave);
      if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
      svg.replaceChildren();
    };
  }, [key, links, settings]);

  return (
    <div ref={hostRef} className={className === undefined ? 'threads' : `threads ${className}`}>
      {/* Decoration over a relationship that must exist without it. */}
      <svg ref={svgRef} className="threads__canvas" aria-hidden="true" />
      {items}
    </div>
  );
}
