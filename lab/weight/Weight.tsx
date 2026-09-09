import { useEffect, useRef } from 'react';
import { DEFAULT_WEIGHT, splitWords, weightAt, type WeightSettings } from './light';
import './weight.css';

export interface WeightProps {
  children: string;
  settings?: Partial<WeightSettings>;
  /** Draws each word's frozen box, to show why the text does not move. */
  showBoxes?: boolean;
}

interface Word {
  element: HTMLElement;
  centreX: number;
  centreY: number;
  weight: number;
}

export function Weight({ children, settings, showBoxes = false }: WeightProps) {
  const hostRef = useRef<HTMLParagraphElement>(null);
  const text = children;

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    const config = { ...DEFAULT_WEIGHT, ...settings };
    let words: Word[] = [];
    let frameHandle = 0;
    let pointer: { x: number; y: number } | null = null;

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
      const elements = Array.from(host.querySelectorAll<HTMLElement>('.weight__word'));

      // Back into flow at resting weight, so the browser decides the line breaks.
      host.style.height = '';
      host.classList.remove('weight--pinned');
      for (const element of elements) {
        element.style.cssText = '';
        element.style.fontWeight = String(config.restWeight);
      }

      // Every read happens before every write: one layout pass, not one per word.
      const hostBounds = host.getBoundingClientRect();
      const boxes = elements.map((element) => element.getBoundingClientRect());
      const height = host.offsetHeight;

      host.style.height = `${height}px`;
      host.classList.add('weight--pinned');

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

    host.addEventListener('pointermove', handlePointerMove);
    host.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      observer.disconnect();
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      if (frameHandle !== 0) cancelAnimationFrame(frameHandle);
    };
  }, [text, settings]);

  return (
    <p
      ref={hostRef}
      className={showBoxes ? 'weight weight--boxes' : 'weight'}
      // Word boxes are a rendering detail; the paragraph still reads as one text.
      key={text}
    >
      {splitWords(text).map((word, index) => (
        <span className="weight__word" key={`${index}-${word}`}>
          {word}
        </span>
      ))}
    </p>
  );
}
