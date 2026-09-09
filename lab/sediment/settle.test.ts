import { describe, expect, it } from 'vitest';
import { createSettle, DEFAULT_SETTLE, type SettleSettings } from './settle';

/**
 * A settle that never arrives leaves the list a fraction of a pixel out of place forever,
 * and a loop that never stops keeps a page busy for nothing. Neither is visible on screen.
 */

const settings = (overrides: Partial<SettleSettings> = {}): SettleSettings => ({
  ...DEFAULT_SETTLE,
  ...overrides,
});

const run = (
  settle: ReturnType<typeof createSettle>,
  config = settings(),
  frames = 600
): number => {
  for (let frame = 0; frame < frames; frame += 1) {
    if (!settle.step(1 / 60, config)) return frame;
  }
  return -1;
};

describe('settle', () => {
  it('arrives exactly, not nearly', () => {
    const settle = createSettle(3);
    settle.displace(0, -40, 0);

    expect(run(settle)).toBeGreaterThan(0);
    // A spring approaches zero and never reaches it, so something has to end it. Resting
    // at 0.03px looks identical and is a list permanently off its own layout.
    for (const item of settle.items) {
      expect(item.y).toBe(0);
      expect(item.velocity).toBe(0);
    }
  });

  it('holds a staggered item still until its turn', () => {
    const settle = createSettle(2);
    settle.displace(0, -40, 0);
    settle.displace(1, -40, 0.5);

    for (let frame = 0; frame < 12; frame += 1) settle.step(1 / 60, settings());

    const [first, second] = settle.items;
    // Waiting means holding the offset, not easing from it: the pile absorbs one item at
    // a time rather than everything drifting together at different speeds.
    expect(Math.abs(first?.y ?? 0)).toBeLessThan(40);
    expect(second?.y).toBe(-40);
  });

  it('bounces when it is underdamped and does not when it is not', () => {
    const bouncy = createSettle(1);
    const firm = createSettle(1);
    bouncy.displace(0, -40, 0);
    firm.displace(0, -40, 0);

    let overshoot = 0;
    let firmest = 0;
    for (let frame = 0; frame < 240; frame += 1) {
      bouncy.step(1 / 60, settings({ damping: 5 }));
      firm.step(1 / 60, settings({ damping: 40 }));
      overshoot = Math.max(overshoot, bouncy.items[0]?.y ?? 0);
      firmest = Math.max(firmest, firm.items[0]?.y ?? 0);
    }

    // Displaced upward, so a positive offset is the item having gone past its place.
    expect(overshoot).toBeGreaterThan(1);
    expect(firmest).toBeLessThan(0.5);
  });

  it('survives a frame gap that means the tab was hidden', () => {
    const settle = createSettle(2);
    settle.displace(0, -40, 0);

    for (let frame = 0; frame < 60; frame += 1) settle.step(20, settings());

    for (const item of settle.items) {
      expect(Number.isFinite(item.y)).toBe(true);
      expect(Math.abs(item.y)).toBeLessThanOrEqual(40);
    }
  });

  it('keeps the offsets it already has when the list grows', () => {
    const settle = createSettle(2);
    settle.displace(0, -30, 0);
    settle.resize(4);

    expect(settle.items).toHaveLength(4);
    expect(settle.items[0]?.y).toBe(-30);
    expect(settle.items[3]?.y).toBe(0);
  });
});
