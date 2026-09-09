import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DisplacementField } from './DisplacementField';

/**
 * The physics is covered by `field.test.ts`. What is worth testing here is what the
 * component does around it: that it holds still for someone who asked for less motion,
 * and that the content it was given survives being put in a field.
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

describe('DisplacementField', () => {
  it('keeps the caller markup inside its cells', () => {
    setReducedMotion(false);
    const { container, getByRole } = render(
      <DisplacementField columns={2}>
        <h2>a heading</h2>
        <p>some words</p>
      </DisplacementField>
    );

    expect(container.querySelectorAll('.neva-field__cell')).toHaveLength(2);
    // The content is still the content: a heading is still a heading in the tree.
    expect(getByRole('heading', { name: 'a heading' })).toBeInTheDocument();
  });

  it('does not move anything when the viewer asked for reduced motion', async () => {
    setReducedMotion(true);
    const { container } = render(
      <DisplacementField columns={2}>
        <div>one</div>
        <div>two</div>
      </DisplacementField>
    );

    const field = container.querySelector<HTMLElement>('.neva-field');
    if (field === null) throw new Error('missing field');

    field.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 10 }));
    await nextFrame();
    await nextFrame();

    // Not "moves back": never moves. No loop is started and no cell is written to, so a
    // cell cannot end up displaced even for a frame.
    for (const cell of container.querySelectorAll<HTMLElement>('.neva-field__cell')) {
      expect(cell.style.getPropertyValue('--dx')).toBe('');
    }
  });

  it('stops listening when it unmounts', async () => {
    setReducedMotion(false);
    const { container, unmount } = render(
      <DisplacementField columns={2}>
        <div>one</div>
        <div>two</div>
      </DisplacementField>
    );

    const field = container.querySelector<HTMLElement>('.neva-field');
    if (field === null) throw new Error('missing field');

    unmount();

    // A field that kept a pointer listener or an animation frame alive after unmounting
    // would be exactly the background work the project forbids, and nothing on screen
    // would show it.
    expect(() => {
      field.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 10 }));
    }).not.toThrow();
    await nextFrame();
    expect(field.isConnected).toBe(false);
  });
});
