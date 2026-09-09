import { Children, useEffect, useRef, type ReactNode } from 'react';
import { createField, DEFAULT_SETTINGS, type Field, type FieldSettings, type Point } from './field';
import { measureFrame, type FrameSample } from '../playground/frames';
import './field.css';

export interface DisplacementFieldProps {
  children: ReactNode;
  /** Grid width. Neighbour coupling is defined by this, so it has to be explicit. */
  columns: number;
  /**
   * Control mode. When false the elements stop talking to each other and the field
   * degrades into independent falloff — the cheap model this Concept is measured against.
   */
  coupling?: boolean;
  settings?: Partial<FieldSettings>;
  /** Called with what the frame actually cost, so the playground reports facts. */
  onFrame?: (sample: FrameSample) => void;
}

export function DisplacementField({
  children,
  columns,
  coupling = true,
  settings,
  onFrame,
}: DisplacementFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellsRef = useRef<(HTMLDivElement | null)[]>([]);
  const fieldRef = useRef<Field | null>(null);
  const onFrameRef = useRef(onFrame);

  const items = Children.toArray(children);
  const count = items.length;

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    let field: Field | null = null;
    let frameHandle = 0;
    let lastTime = 0;
    let pointer: Point | null = null;

    const cells = (): HTMLDivElement[] =>
      cellsRef.current.slice(0, count).filter((cell): cell is HTMLDivElement => cell !== null);

    /**
     * Geometry is read here and only here: never inside a frame, where it would force
     * synchronous layout. Rebuilding the field on resize loses its motion, which is
     * acceptable — a resize is already a discontinuity.
     */
    const measure = (): void => {
      const restPositions = cells().map((cell) => ({
        x: cell.offsetLeft + cell.offsetWidth / 2,
        y: cell.offsetTop + cell.offsetHeight / 2,
      }));

      field = createField(restPositions, columns, { ...DEFAULT_SETTINGS, ...settings });
      field.settings.linkStiffness = coupling ? field.settings.linkStiffness : 0;
      fieldRef.current = field;
    };

    const write = (): void => {
      const currentCells = cells();
      field?.each((index, dx, dy) => {
        const cell = currentCells[index];
        if (cell === undefined) return;
        cell.style.setProperty('--dx', `${dx.toFixed(2)}px`);
        cell.style.setProperty('--dy', `${dy.toFixed(2)}px`);
      });
    };

    const tick = (time: number): void => {
      const sample = measureFrame(time, lastTime, (elapsed) => {
        field?.step(elapsed);
        write();
      });
      lastTime = time;
      onFrameRef.current?.(sample);

      // A field at rest with no pointer is doing nothing visible, so it stops running.
      // Leaving the loop alive would be exactly the hidden background work the project
      // contract forbids.
      if (field?.isAtRest() === true) {
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

    const handlePointerMove = (event: PointerEvent): void => {
      // The listener stores and returns. Input events are not frames.
      const bounds = container.getBoundingClientRect();
      pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      field?.setPointer(pointer);
      start();
    };

    const handlePointerLeave = (): void => {
      pointer = null;
      field?.setPointer(null);
      start();
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
      field?.setPointer(pointer);
      start();
    });
    observer.observe(container);

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      observer.disconnect();
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
      fieldRef.current = null;
    };
  }, [columns, count, coupling, settings]);

  return (
    <div
      ref={containerRef}
      className="neva-field"
      style={{ '--neva-field-columns': columns } as React.CSSProperties}
    >
      {items.map((item, index) => (
        <div
          // Cells are positional slots in a fixed grid: the index is the identity.
          key={index}
          className="neva-field__cell"
          ref={(element) => {
            cellsRef.current[index] = element;
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}
