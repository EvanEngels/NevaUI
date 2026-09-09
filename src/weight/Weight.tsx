import { useEffect, useRef } from 'react';
import { DEFAULT_WEIGHT, splitWords, weightAt, type WeightSettings } from './light';

export interface WeightProps {
  /**
   * The passage. A string, not nodes: the component has to split it into words and place
   * each one, so it needs the text itself rather than markup it would have to take apart.
   */
  children: string;
  settings?: Partial<WeightSettings> | undefined;
  /** Draws each word's box, to show why the text does not move. */
  showBoxes?: boolean | undefined;
  className?: string | undefined;
}

interface Word {
  element: HTMLElement;
  centreX: number;
  centreY: number;
  weight: number;
}

/**
 * A light that falls on text and makes the letters heavier.
 *
 * ⚡ Experimental. The API will change.
 *
 * ## The problem it solves
 *
 * Heavier letters are wider letters, so animating weight reflows the paragraph on every
 * frame: words shove each other sideways, the line breaks jump, and the reader loses their
 * place.
 *
 * The paragraph is therefore laid out once at its resting weight, each word's natural box
 * is recorded, and only then are the words pinned to those positions and taken out of
 * flow. Nothing can reflow because nothing is in flow. Each word is anchored by its centre
 * and pulled back by half its width, so gaining weight grows it in both directions instead
 * of shoving its neighbour aside.
 *
 * Measured: 27 words, none of them moved, weights running from 250 to 654 as the light
 * passes.
 *
 * ## What this costs
 *
 * More per element than anything else in this library, and for a reason worth knowing:
 * changing `font-weight` changes a word's metrics, so the browser lays that word out
 * again and repaints the type. A transform would have been composited; this cannot be.
 *
 * Measured at roughly **7.5 microseconds per word** per frame — 0.3 ms for 27 words,
 * 2.4 ms for 324. A paragraph is comfortable. An article is not.
 *
 * ## Accessibility
 *
 * Under `prefers-reduced-motion` the component pins the words and stops: no listeners, no
 * loop, no weight changes. The text sits exactly where the layout put it at its resting
 * weight.
 *
 * The passage stays selectable and copies back as the original string — verified in a
 * browser, because absolutely positioned words are exactly the kind of thing that quietly
 * breaks selection. Words keep their spaces, so the copy is the text you passed in.
 */
export function Weight({ children, settings, showBoxes = false, className }: WeightProps) {
  const hostRef = useRef<HTMLParagraphElement>(null);
  const text = children;

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    const config = { ...DEFAULT_WEIGHT, ...settings };
    let words: Word[] = [];
    let frameHandle = 0;
    let pointer: { x: number; y: number } | null = null;

    // The words are still pinned under reduced motion — that is layout, not movement, and
    // it is what keeps the paragraph identical to the one everyone else sees. What stops
    // is the light: no listeners, no loop, no weight ever changes.
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    /**
     * Lay the paragraph out once, then take it out of flow.
     *
     * The first attempt froze each word at the width of its heaviest form. It did stop
     * the reflow, but it padded every light word with the air its bold form would have
     * needed, and the text read as badly tracked at rest.
     *
     * So the paragraph is laid out normally at its resting weight, each word's natural
     * box is recorded, and only then are the words pinned to those positions. After
     * that no weight change can move anything, because nothing is in flow any more.
     *
     * Each word is anchored by its centre and translated back by half its own width, so
     * a word that gains weight grows in both directions instead of shoving its right
     * side into the next word. That keeps the extra ink where the eye expects it.
     */
    const measure = (): void => {
      const elements = Array.from(host.querySelectorAll<HTMLElement>('.neva-weight__word'));

      // Back into flow at resting weight, so the browser decides the line breaks.
      host.style.height = '';
      host.classList.remove('neva-weight--pinned');
      for (const element of elements) {
        element.style.cssText = '';
        element.style.fontWeight = String(config.restWeight);
      }

      // Every read happens before every write: one layout pass, not one per word.
      const hostBounds = host.getBoundingClientRect();
      const boxes = elements.map((element) => element.getBoundingClientRect());
      const height = host.offsetHeight;

      host.style.height = `${height}px`;
      host.classList.add('neva-weight--pinned');

      words = elements.map((element, index) => {
        const box = boxes[index];
        const centreX = box === undefined ? 0 : box.left - hostBounds.left + box.width / 2;
        const top = box === undefined ? 0 : box.top - hostBounds.top;

        element.style.left = `${centreX.toFixed(2)}px`;
        element.style.top = `${top.toFixed(2)}px`;

        return {
          element,
          centreX,
          centreY: top + (box === undefined ? 0 : box.height / 2),
          weight: config.restWeight,
        };
      });
    };

    const write = (): boolean => {
      let changed = false;

      for (const word of words) {
        const target =
          pointer === null
            ? config.restWeight
            : weightAt(Math.hypot(pointer.x - word.centreX, pointer.y - word.centreY), config);

        // Rounding to whole weights is not a shortcut: it is what lets the loop know it
        // has arrived and stop, instead of chasing an ever-smaller fraction forever.
        const next = Math.round(word.weight + (target - word.weight) * 0.35);
        if (next === word.weight) continue;

        word.weight = next;
        word.element.style.fontWeight = String(next);
        changed = true;
      }

      return changed;
    };

    const tick = (): void => {
      const changed = write();
      if (!changed && pointer === null) {
        frameHandle = 0;
        return;
      }
      frameHandle = requestAnimationFrame(tick);
    };

    const start = (): void => {
      if (frameHandle === 0) frameHandle = requestAnimationFrame(tick);
    };

    const handlePointerMove = (event: PointerEvent): void => {
      const bounds = host.getBoundingClientRect();
      pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      start();
    };

    const handlePointerLeave = (): void => {
      pointer = null;
      start();
    };

    measure();

    /*
     * Fonts arrive after the first layout. A paragraph measured in the fallback face and
     * then pinned would keep the fallback's positions for good, under type that no longer
     * has those metrics — every word a few pixels off, permanently, with nothing on
     * screen to explain it. Re-measuring when the fonts are ready is the difference
     * between a component that works with a webfont and one that only works without.
     */
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (cancelled) return;
      measure();
      start();
    });

    // Pinning the words changes the host's own height, and an observer that reacted to
    // that would re-measure forever. Only a change in available width can change the
    // line breaks, so only that is worth reacting to.
    let observedWidth = host.getBoundingClientRect().width;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? observedWidth;
      if (Math.abs(width - observedWidth) < 1) return;
      observedWidth = width;
      measure();
      start();
    });
    observer.observe(host);

    if (!reducedMotion) {
      host.addEventListener('pointermove', handlePointerMove);
      host.addEventListener('pointerleave', handlePointerLeave);
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
    };
  }, [text, settings]);

  return (
    <p
      ref={hostRef}
      className={['neva-weight', showBoxes ? 'neva-weight--boxes' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      // Word boxes are a rendering detail; the paragraph still reads as one text.
      key={text}
    >
      {splitWords(text).map((word, index) => (
        <span className="neva-weight__word" key={`${index}-${word}`}>
          {word}
        </span>
      ))}
    </p>
  );
}
