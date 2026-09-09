import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Lumen } from './Lumen';

/**
 * Two properties of this component would regress without anyone noticing on screen: that
 * the light costs the same whatever the surface, and that it holds still for someone who
 * asked for less motion. Both are the reasons the component exists, so both are tested.
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

const faces = (count: number) =>
  Array.from({ length: count }, (_, index) => <article key={index}>face {index}</article>);

describe('Lumen', () => {
  it('answers a pointer move by writing to the surface and to no face', async () => {
    setReducedMotion(false);
    const { container } = render(<Lumen>{faces(12)}</Lumen>);

    const host = container.querySelector<HTMLElement>('.neva-lumen');
    if (host === null) throw new Error('missing surface');
    const children = Array.from(host.children) as HTMLElement[];
    expect(children).toHaveLength(12);

    // Only the centre each face was told once, when the surface was measured.
    const before = children.map((face) => face.getAttribute('style'));

    host.dispatchEvent(new PointerEvent('pointermove', { clientX: 40, clientY: 25 }));
    await nextFrame();
    await nextFrame();

    expect(host.style.getPropertyValue('--neva-light-x')).not.toBe('');
    expect(children.map((face) => face.getAttribute('style'))).toEqual(before);
  });

  it('keeps the caller markup rather than wrapping it', () => {
    setReducedMotion(false);
    const { container } = render(
      <Lumen>
        <button type="button">press</button>
      </Lumen>
    );

    const host = container.querySelector<HTMLElement>('.neva-lumen');
    expect(host?.firstElementChild?.tagName).toBe('BUTTON');
  });

  it('writes nothing when the viewer asked for reduced motion', async () => {
    setReducedMotion(true);
    const { container } = render(<Lumen>{faces(4)}</Lumen>);

    const host = container.querySelector<HTMLElement>('.neva-lumen');
    if (host === null) throw new Error('missing surface');

    host.dispatchEvent(new PointerEvent('pointermove', { clientX: 40, clientY: 25 }));
    await nextFrame();
    await nextFrame();

    // An inline value here would override the resting position the stylesheet sets, so
    // "ignore the events" is not good enough: the component must not write at all.
    expect(host.style.getPropertyValue('--neva-light-x')).toBe('');
  });
});
