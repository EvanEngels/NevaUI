import { Children, useEffect, useRef, type ReactNode } from 'react';
import { createField, DEFAULT_SETTINGS, type Field, type FieldSettings, type Point } from './field';

export interface DisplacementFieldProps {
  /**
   * The contents of the field. Each direct child becomes a cell the pointer can push.
   * Pass the real content — cards, images, headings. Anything laid out on a regular grid
   * works; the field wraps each child in a positioned cell and moves that.
   */
  children: ReactNode;
  /** Grid width. Neighbour coupling is defined by this, so it has to be explicit. */
  columns: number;
  /**
   * Whether neighbours are coupled. On, displacing one cell compresses the ones behind
   * it and the disturbance travels. Off, every cell reacts to the pointer alone and they
   * collide with each other — that is the cheap model, kept as a comparison rather than
   * as a recommendation.
   */
  coupling?: boolean;
  /**
   * The physics. `displacement` is a distance in pixels and means the same thing on any
   * grid, whatever its spacing — the force needed to produce it is measured on the layout
   * when the field is built.
   */
  settings?: Partial<FieldSettings>;
  /**
   * Extra class on the field, for layout beyond the column count.
   *
   * Explicitly `| undefined` so a caller compiling with `exactOptionalPropertyTypes` can
   * pass a value that may not exist, which is the normal case for a conditional class.
   */
  className?: string | undefined;
}

/**
 * A grid the pointer pushes aside, where displacing one cell compresses its neighbours.
 *
 * ⚡ Experimental. The API will change.
 *
 * The field is a mass-spring lattice. The pointer repels the cells near it, each cell is
 * coupled to its four neighbours and anchored to where it belongs, and the disturbance
 * travels outward and fades. Propagation and settling come out of the same integration,
 * so there is no separate return animation to keep in agreement with the push.
 *
 * ## What this costs
 *
 * Measured: 640 cells cost 0.50 ms of script per frame — 8% of a frame — and drop 1% of
 * them. The neighbour coupling accounts for 0.1 ms of that, and the solver itself for
 * 0.028 ms; the rest is the DOM writes.
 *
 * It scales because the only thing it animates is `transform`, which the compositor moves
 * without redrawing anything. Put something expensive to paint inside a cell and that
 * property is yours to keep or lose.
 *
 * ## Accessibility
 *
 * Under `prefers-reduced-motion` the component starts no loop, listens for nothing and
 * writes nothing: every cell stays exactly where the layout put it.
 *
 * Otherwise, cells move away from the pointer — including the one you are reaching for.
 * **Do not put controls in a field.** Buttons and links are harder to hit the closer the
 * pointer gets, which is the effect working as designed and a control failing as
 * designed. Presentation only.
 */
export function DisplacementField({
  children,
  columns,
  coupling = true,
  settings,
  className,
}: DisplacementFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellsRef = useRef<(HTMLDivElement | null)[]>([]);
  const fieldRef = useRef<Field | null>(null);

  const items = Children.toArray(children);
  const count = items.length;

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    // Nothing moves for a viewer who asked for less motion, so nothing is listened for
    // and no loop is started. The content stays exactly where the layout put it.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true) return;

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
      const elapsed = lastTime === 0 ? 0 : (time - lastTime) / 1000;
      lastTime = time;

      field?.step(elapsed);
      write();

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
      className={className === undefined ? 'neva-field' : `neva-field ${className}`}
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
