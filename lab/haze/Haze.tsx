import { useEffect, useRef, type ReactNode } from 'react';
import { createHealer, DEFAULT_HAZE, paintFog, wipe, type HazeSettings } from './fog';
import './haze.css';

export interface HazeProps {
  /** What the fog sits over. It stays visible and stays interactive. */
  children: ReactNode;
  settings?: Partial<HazeSettings>;
  className?: string | undefined;
  onSample?: ((sample: { frameMs: number; healing: boolean }) => void) | undefined;
}

/**
 * Smoke over an element, which the pointer wipes away and which closes back over.
 *
 * The gesture is wiping condensation off glass, and it needs two things: a surface that
 * thins where it has been touched, and one that fills in when it has not. Neither is a
 * fluid simulation. The fog is a texture drawn once; wiping removes alpha under the
 * pointer; healing lays the texture back down a little at a time.
 *
 * ## The rule that keeps it honest
 *
 * **The fog never hides anything.** It sits at an opacity where the content underneath
 * stays legible and stays clickable — wiping makes it clearer, it does not make it
 * available. Anything else turns a decoration into a gate that only a pointer can open,
 * and there is no keyboard equivalent for wiping a window.
 *
 * ## What it costs
 *
 * One canvas per element, and per frame either nothing or one composite of a
 * canvas-sized texture. The loop stops when the fog is whole and nothing is touching it,
 * so an element nobody is pointing at costs nothing at all.
 */
export function Haze({ children, settings, className, onSample }: HazeProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef(settings);
  const onSampleRef = useRef(onSample);

  useEffect(() => {
    settingsRef.current = settings;
    onSampleRef.current = onSample;
  }, [settings, onSample]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (host === null || canvas === null) return;

    const context = canvas.getContext('2d');
    if (context === null) return;

    const texture = document.createElement('canvas');
    const textureContext = texture.getContext('2d');
    if (textureContext === null) return;

    let frameHandle = 0;
    let lastTime = 0;
    let pointer: { x: number; y: number } | null = null;
    let previousPointer: { x: number; y: number } | null = null;
    let healed = 1;
    let healer = createHealer({ ...DEFAULT_HAZE, ...settingsRef.current });
    const random = Math.random;

    const config = (): HazeSettings => ({ ...DEFAULT_HAZE, ...settingsRef.current });

    const measure = (): void => {
      const bounds = host.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(bounds.width * ratio));
      const height = Math.max(1, Math.round(bounds.height * ratio));

      canvas.width = width;
      canvas.height = height;
      texture.width = width;
      texture.height = height;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const current = config();
      healer = createHealer(current);
      paintFog(textureContext, width, height, current, random);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, width, height);
      context.drawImage(texture, 0, 0);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      healed = 1;
    };

    const tick = (time: number): void => {
      const elapsed = lastTime === 0 ? 0 : (time - lastTime) / 1000;
      lastTime = time;
      const started = performance.now();
      const current = config();

      if (pointer !== null) {
        // The gap between two pointer events can be wider than the brush, so the wipe is
        // drawn along the line between them. Without it, a fast sweep leaves a dotted
        // trail of holes instead of a stroke.
        const from = previousPointer ?? pointer;
        const distance = Math.hypot(pointer.x - from.x, pointer.y - from.y);
        const steps = Math.max(1, Math.ceil(distance / (current.brush * 0.4)));
        for (let step = 1; step <= steps; step += 1) {
          const t = step / steps;
          wipe(
            context,
            from.x + (pointer.x - from.x) * t,
            from.y + (pointer.y - from.y) * t,
            current
          );
        }
        previousPointer = pointer;
        pointer = null;
        healed = 0;
        healer.reset();
      }

      const heal = healer.add(elapsed);
      if (heal > 0 && healed < 1) {
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalAlpha = heal;
        context.drawImage(texture, 0, 0);
        context.restore();
        healed += heal;
      }

      onSampleRef.current?.({ frameMs: performance.now() - started, healing: healed < 1 });

      /*
       * The loop runs while there is fog still owed or a pointer on the element, and not
       * merely while a frame had something to draw.
       *
       * Those are not the same, and the difference was a bug: healing accumulates a debt
       * and most frames pay nothing, so stopping on the first frame that drew nothing
       * stopped it on the first frame after a wipe — and the hole stayed open forever. It
       * looked correct in the code and correct in the helper's tests, and only moving the
       * pointer showed it.
       */
      if (healed >= 1) {
        frameHandle = 0;
        lastTime = 0;
        previousPointer = null;
        healer.reset();
        return;
      }
      frameHandle = requestAnimationFrame(tick);
    };

    const start = (): void => {
      if (frameHandle !== 0) return;
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
      start();
    };

    measure();

    let observedWidth = host.getBoundingClientRect().width;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? observedWidth;
      if (Math.abs(width - observedWidth) < 1) return;
      observedWidth = width;
      measure();
    });
    observer.observe(host);

    host.addEventListener('pointermove', handlePointerMove);
    host.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      observer.disconnect();
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
    };
  }, []);

  return (
    <div ref={hostRef} className={className === undefined ? 'haze' : `haze ${className}`}>
      {children}
      <canvas ref={canvasRef} className="haze__fog" aria-hidden="true" />
    </div>
  );
}
