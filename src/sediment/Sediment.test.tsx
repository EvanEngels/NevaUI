import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Sediment } from './Sediment';

/**
 * The spring is covered by `settle.test.ts`. What matters here is that the list is still
 * a list — the settle borrows the layout rather than replacing it — and that it holds
 * still for a viewer who asked it to.
 */

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

describe('Sediment', () => {
  it('renders the list as the list, with nothing wrapped around each item', () => {
    setReducedMotion(false);
    const { container, getByRole } = render(
      <Sediment>
        <article key="a">
          <h3>first</h3>
        </article>
        <article key="b">second</article>
      </Sediment>
    );

    const host = container.querySelector('.neva-sediment');
    // Two children, not two children inside two wrappers: the browser lays out the
    // caller's list, and the component only borrows the difference.
    expect(host?.children).toHaveLength(2);
    expect(getByRole('heading', { name: 'first' })).toBeInTheDocument();
  });

  it('offsets nothing when the viewer asked for reduced motion', async () => {
    setReducedMotion(true);
    const { container, rerender } = render(
      <Sediment>
        <article key="a">first</article>
      </Sediment>
    );

    rerender(
      <Sediment>
        <article key="new">arrived</article>
        <article key="a">first</article>
      </Sediment>
    );
    await nextFrame();
    await nextFrame();

    // Not "settles instantly": never displaced at all, so a cell cannot be caught
    // mid-flight even for a frame.
    for (const row of container.querySelectorAll<HTMLElement>('.neva-sediment > *')) {
      expect(row.style.getPropertyValue('--dy')).toBe('');
    }
  });
});
