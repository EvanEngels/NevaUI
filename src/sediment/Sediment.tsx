import { Children, useEffect, useRef, type ReactNode } from 'react';
import { createSettle, DEFAULT_SETTLE, type Settle, type SettleSettings } from './settle';
import './sediment.css';

export interface SedimentProps {
  /** The list. Each direct child is one item, and each needs a stable key. */
  children: ReactNode;
  settings?: Partial<SettleSettings> | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}

/**
 * A list that settles when it changes.
 *
 * ⚡ Experimental. The API will change.
 *
 * An item that arrives falls into place and the items below it absorb the shift, one
 * after another, instead of the whole list sliding to a new arrangement. The difference
 * matters when the list changes while someone is reading it: a slide says something
 * changed, a settle says what and from where.
 *
 * ## How
 *
 * FLIP, and a spring. The browser lays the list out as it always would; the component
 * records where every item ended up, offsets each one back to where it was, and lets a
 * spring carry it home. Nothing fights the layout — it only borrows the difference.
 *
 * Only `transform` is animated, which is why the cost does not grow the way an effect
 * that touches layout would. See [Lumen's notes](../../docs/lab/lumen.md) for what
 * happens when it does.
 *
 * ## Accessibility
 *
 * Under `prefers-reduced-motion` nothing is offset and no loop is started: items appear
 * where the layout put them, immediately. The list is the content; the settle is a way of
 * noticing it changed, and noticing must not depend on it.
 */
export function Sediment({ children, settings, className, style }: SedimentProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const settleRef = useRef<Settle | null>(null);
  const positionsRef = useRef(new Map<string, number>());
  const settingsRef = useRef(settings);

  const items = Children.toArray(children);
  const keys = items.map((item, index) =>
    typeof item === 'object' && item !== null && 'key' in item && item.key !== null
      ? String(item.key)
      : String(index)
  );
  const signature = keys.join('|');

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    const config = { ...DEFAULT_SETTLE, ...settingsRef.current };
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    const rows = Array.from(host.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement
    );
    const previous = positionsRef.current;
    const current = new Map<string, number>();
    for (const [index, row] of rows.entries()) {
      const key = keys[index];
      if (key !== undefined) current.set(key, row.offsetTop);
    }

    if (reducedMotion) {
      positionsRef.current = current;
      return;
    }

    let settle = settleRef.current;
    if (settle === null) {
      settle = createSettle(rows.length);
      settleRef.current = settle;
    } else {
      settle.resize(rows.length);
    }

    // The offset is where the item was minus where it is now. An item that is new to the
    // list has no "was", so it arrives from just above its place rather than from nowhere.
    let staggered = 0;
    for (const [index, row] of rows.entries()) {
      const key = keys[index];
      if (key === undefined) continue;
      const now = current.get(key) ?? row.offsetTop;
      const before = previous.get(key);
      const offset = before === undefined ? -Math.max(24, row.offsetHeight * 0.6) : before - now;
      if (Math.abs(offset) < 0.5) continue;
      settle.displace(index, offset, staggered * config.stagger);
      staggered += 1;
    }
    positionsRef.current = current;

    if (staggered === 0 && settle.atRest()) return;

    let frameHandle = 0;
    let lastTime = 0;

    const write = (): void => {
      for (const [index, row] of rows.entries()) {
        const item = settle?.items[index];
        if (item === undefined) continue;
        row.style.setProperty('--dy', `${item.y.toFixed(2)}px`);
      }
    };

    const tick = (time: number): void => {
      const elapsed = lastTime === 0 ? 0 : (time - lastTime) / 1000;
      lastTime = time;
      const moving = settle?.step(elapsed, config) ?? false;
      write();

      // As in Threads: the frame that starts a loop has no previous frame, so its elapsed
      // time is zero and nothing has moved yet. That is not evidence of being at rest.
      if (!moving && elapsed > 0) {
        frameHandle = 0;
        return;
      }
      frameHandle = requestAnimationFrame(tick);
    };

    frameHandle = requestAnimationFrame(tick);

    return () => {
      if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
    };
  }, [signature, keys]);

  return (
    <div
      ref={hostRef}
      className={className === undefined ? 'neva-sediment' : `neva-sediment ${className}`}
      style={style}
    >
      {items}
    </div>
  );
}
