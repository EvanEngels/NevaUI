import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Lumen } from './Lumen';

/**
 * The claim this experiment is built on is that the per-frame cost does not grow with
 * the surface. That is not something you can see by looking at it, and it is exactly the
 * kind of property that quietly regresses the first time someone adds a per-tile tweak.
 * So it is the thing under test.
 */

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

describe('Lumen', () => {
  it('answers a pointer move by writing to the container and to no tile', async () => {
    const { container } = render(<Lumen columns={4} rows={3} />);

    const host = container.querySelector<HTMLElement>('.lumen');
    const tiles = Array.from(container.querySelectorAll<HTMLElement>('.lumen__tile'));
    if (host === null) throw new Error('missing host');
    expect(tiles).toHaveLength(12);

    // Only the position each tile was told once at mount.
    const before = tiles.map((tile) => tile.getAttribute('style'));

    host.dispatchEvent(new PointerEvent('pointermove', { clientX: 40, clientY: 25 }));
    await nextFrame();
    await nextFrame();

    expect(host.style.getPropertyValue('--light-x')).not.toBe('');
    expect(tiles.map((tile) => tile.getAttribute('style'))).toEqual(before);
  });
});
