import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  clipPathOf,
  DEFAULT_FRACTURE,
  fracture,
  seededRandom,
  type FractureSettings,
  type Shard,
} from './shards';

export interface FractureProps {
  /**
   * What breaks. Every shard shows the same content, clipped to its own polygon, so the
   * break cuts through the real thing rather than through a picture of it.
   */
  children: ReactNode;
  settings?: Partial<FractureSettings> | undefined;
  /** How hard the shards leave, in pixels per second at the impact point. */
  force?: number | undefined;
  /** Milliseconds the shards stay scattered before finding their way back. */
  holdMs?: number | undefined;
  className?: string | undefined;
}

interface ShardMotion {
  element: HTMLElement | null;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  spin: number;
}

const TIMESTEP = 1 / 120;
const MAX_SUBSTEPS = 4;
const GRAVITY = 1500;
const AIR = 0.992;
const RETURN_STIFFNESS = 130;
const RETURN_DAMPING = 17;

/**
 * A panel that breaks where you strike it.
 *
 * ⚡ Experimental. The API will change.
 *
 * The break is computed from the point of impact, so hitting a corner and hitting the
 * middle produce different geometry. Rays and rings form a polar mesh clipped to the
 * panel; each shard is a DOM element with a clip-path and a transform. No canvas, no
 * WebGL.
 *
 * Every shard holds a copy of the children, so the break cuts through the real content
 * rather than a picture of it — text included, and the type stays sharp on both sides of
 * a cut because a shard is transformed rather than re-rendered.
 *
 * **What breaks is `children`, not the panel.** The panel is the frame that holds the
 * pieces and keeps them from flying over the page; a background painted on it stays whole
 * while the contents shatter. Put the surface you want broken inside.
 *
 * ## What this costs
 *
 * The per-frame cost is trivial and flat. What grows is the DOM: **nodes are shards times
 * the size of your content**, built in one burst on impact. A heading and a paragraph give
 * 630 nodes and a 1.6 ms break at 125 shards; a card with an image and six children would
 * give several thousand, and the break would not stay at 1.6 ms.
 *
 * The limit is the complexity of what you put inside, not the shard count.
 *
 * ## Accessibility
 *
 * **This is decoration, and it must never be the only way to do anything.** Striking a
 * panel is a pointer gesture with no keyboard equivalent, and the component deliberately
 * does not invent one: a decorative shatter is not a control, and giving it a tab stop and
 * a button role would announce an action that does nothing for anyone who takes it.
 *
 * The content underneath stays reachable throughout. The shards are `aria-hidden` copies
 * and the intact face stays in the accessibility tree, so the passage is offered once
 * rather than a hundred times.
 *
 * Under `prefers-reduced-motion` the panel still breaks — the crack is the content of the
 * interaction — but the pieces part by a few pixels and come straight back instead of
 * being thrown across the panel.
 */
export function Fracture({
  children,
  settings,
  force = 900,
  holdMs = 900,
  className,
}: FractureProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  const motionsRef = useRef<ShardMotion[]>([]);
  const [shards, setShards] = useState<Shard[] | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const host = hostRef.current;
      if (host === null || shards !== null) return;

      const bounds = host.getBoundingClientRect();
      const impact = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const config = { ...DEFAULT_FRACTURE, ...settings };
      const random = seededRandom(Math.floor(event.clientX * 31 + event.clientY * 17) || 1);

      // Reduced motion keeps the meaning and drops the flight. The panel still breaks —
      // the crack is the content of the interaction — but the pieces part by a few pixels
      // and come straight back instead of being thrown across the panel.
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
      const throwForce = reduced ? force * 0.05 : force;

      const pieces = fracture(bounds.width, bounds.height, impact, config, random);

      // Closer to the impact means faster: this is the only place the break carries any
      // sense of energy, and a uniform speed reads as a slide, not a shatter.
      motionsRef.current = pieces.map((shard) => {
        const falloff = 1 / (1 + shard.distance / 180);
        const speed = throwForce * falloff * (0.7 + random() * 0.6);
        return {
          element: null,
          x: 0,
          y: 0,
          velocityX: shard.direction.x * speed,
          velocityY: shard.direction.y * speed - speed * 0.25,
          rotation: 0,
          spin: (random() - 0.5) * 220 * falloff,
        };
      });

      setSize({ width: bounds.width, height: bounds.height });
      setShards(pieces);
    },
    [force, settings, shards]
  );

  useEffect(() => {
    if (shards === null) return;

    let frameHandle = 0;
    let lastTime = 0;
    let accumulator = 0;
    let simulatedMs = 0;
    let returning = false;

    const integrate = (): void => {
      for (const motion of motionsRef.current) {
        if (returning) {
          // One spring, critically-ish damped, pulling every piece back to where it
          // belongs. The break needs no separate reassembly animation.
          motion.velocityX +=
            (-RETURN_STIFFNESS * motion.x - RETURN_DAMPING * motion.velocityX) * TIMESTEP;
          motion.velocityY +=
            (-RETURN_STIFFNESS * motion.y - RETURN_DAMPING * motion.velocityY) * TIMESTEP;
          motion.spin +=
            (-RETURN_STIFFNESS * motion.rotation - RETURN_DAMPING * motion.spin) * TIMESTEP;
        } else {
          motion.velocityY += GRAVITY * TIMESTEP;
          motion.velocityX *= AIR;
          motion.velocityY *= AIR;
        }

        motion.x += motion.velocityX * TIMESTEP;
        motion.y += motion.velocityY * TIMESTEP;
        motion.rotation += motion.spin * TIMESTEP;
      }
    };

    const settled = (): boolean =>
      returning &&
      motionsRef.current.every(
        (motion) =>
          Math.hypot(motion.x, motion.y) < 0.4 && Math.hypot(motion.velocityX, motion.velocityY) < 2
      );

    const tick = (time: number): void => {
      const elapsed = lastTime === 0 ? 0 : (time - lastTime) / 1000;
      lastTime = time;

      {
        accumulator += elapsed;
        let substeps = 0;
        while (accumulator >= TIMESTEP && substeps < MAX_SUBSTEPS) {
          integrate();
          accumulator -= TIMESTEP;
          substeps += 1;
        }
        if (substeps === MAX_SUBSTEPS) accumulator = 0;

        // The hold counts simulated time, not wall time. Frames stop arriving in a
        // background tab while the clock keeps running, and counting wall time there
        // would spend the entire scatter on a tab nobody is looking at — the viewer
        // comes back to a panel that is already reassembling.
        simulatedMs += substeps * TIMESTEP * 1000;
        if (simulatedMs > holdMs) returning = true;

        for (const motion of motionsRef.current) {
          motion.element?.style.setProperty(
            'transform',
            `translate3d(${motion.x.toFixed(2)}px, ${motion.y.toFixed(2)}px, 0) rotate(${motion.rotation.toFixed(2)}deg)`
          );
        }
      }

      if (settled()) {
        // The panel is whole again, so the shard elements stop existing rather than
        // sitting in the DOM at transform: none.
        setShards(null);
        return;
      }

      frameHandle = requestAnimationFrame(tick);
    };

    frameHandle = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameHandle);
    };
  }, [shards, holdMs]);

  return (
    <div
      ref={hostRef}
      className={['neva-fracture', shards === null ? '' : 'neva-fracture--broken', className ?? '']
        .filter(Boolean)
        .join(' ')}
      onPointerDown={handlePointerDown}
    >
      {/*
        The intact face. While broken it is invisible but still present, because the
        shards are copies and a screen reader should be offered the content once, not
        fifty-two times.
      */}
      <div className="neva-fracture__face">{children}</div>

      {shards?.map((shard, index) => (
        <div
          key={index}
          className="neva-fracture__shard"
          aria-hidden="true"
          style={{ clipPath: clipPathOf(shard, size.width, size.height) }}
          ref={(element) => {
            const motion = motionsRef.current[index];
            if (motion !== undefined) motion.element = element;
          }}
        >
          <div className="neva-fracture__face" style={{ width: size.width, height: size.height }}>
            {children}
          </div>
        </div>
      ))}
    </div>
  );
}
