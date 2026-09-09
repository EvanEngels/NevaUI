import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Weight } from './Weight';

/**
 * The falloff is covered by `light.test.ts`. What matters here is that the component
 * hands back the text it was given, and that it holds still for a viewer who asked it to.
 */

const PASSAGE = 'Two  spaces, a dash — and a trailing word.';

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const setReducedMotion = (reduce: boolean): void => {
  vi.stubGlobal('matchMedia', (query: string): Partial<MediaQueryList> => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Weight', () => {
  it('renders the passage character for character', () => {
    setReducedMotion(false);
    const { container } = render(<Weight>{PASSAGE}</Weight>);

    const paragraph = container.querySelector('.neva-weight');
    // Splitting a passage into words and joining it back is where a component quietly
    // rewrites someone's copy — double spaces collapsed, punctuation moved.
    expect(paragraph?.textContent).toBe(PASSAGE);
  });

  it('changes no weight when the viewer asked for reduced motion', async () => {
    setReducedMotion(true);
    const { container } = render(<Weight>{PASSAGE}</Weight>);

    const paragraph = container.querySelector<HTMLElement>('.neva-weight');
    if (paragraph === null) throw new Error('missing paragraph');

    const before = Array.from(container.querySelectorAll<HTMLElement>('.neva-weight__word')).map(
      (word) => word.style.fontWeight
    );

    paragraph.dispatchEvent(new PointerEvent('pointermove', { clientX: 20, clientY: 10 }));
    await nextFrame();
    await nextFrame();

    const after = Array.from(container.querySelectorAll<HTMLElement>('.neva-weight__word')).map(
      (word) => word.style.fontWeight
    );

    expect(after).toEqual(before);
  });
});
