import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clipPathOf,
  DEFAULT_FRACTURE,
  fracture,
  seededRandom,
  type FractureSettings,
  type Shard,
} from './shards';
import { measureFrame, type FrameSample } from '../playground/frames';
import './fracture.css';

export interface FractureProps {
  settings?: Partial<FractureSettings>;
  /** How hard the shards leave, in pixels per second at the impact point. */
  force?: number;
  /** Milliseconds the shards stay scattered before finding their way back. */
  holdMs?: number;
  onFrame?: (sample: FrameSample) => void;
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

export function Fracture({ settings, force = 900, holdMs = 900, onFrame }: FractureProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

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

      const pieces = fracture(bounds.width, bounds.height, impact, config, random);

      // Closer to the impact means faster: this is the only place the break carries any
      // sense of energy, and a uniform speed reads as a slide, not a shatter.
      motionsRef.current = pieces.map((shard) => {
        const falloff = 1 / (1 + shard.distance / 180);
        const speed = force * falloff * (0.7 + random() * 0.6);
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
      const sample = measureFrame(time, lastTime, (elapsed) => {
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
      });
      lastTime = time;
      onFrameRef.current?.(sample);

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
      className={shards === null ? 'fracture' : 'fracture fracture--broken'}
      onPointerDown={handlePointerDown}
    >
      <div className="fracture__art" />

      {shards?.map((shard, index) => (
        <div
          key={index}
          className="fracture__shard"
          style={{ clipPath: clipPathOf(shard, size.width, size.height) }}
          ref={(element) => {
            const motion = motionsRef.current[index];
            if (motion !== undefined) motion.element = element;
          }}
        />
      ))}

      <p className="fracture__hint">{shards === null ? 'strike the panel' : ''}</p>
    </div>
  );
}
