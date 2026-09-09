import { describe, expect, it } from 'vitest';
import { createHealer, DEFAULT_HAZE, MIN_VISIBLE_ALPHA, type HazeSettings } from './fog';

/**
 * The texture and the wipe are canvas work and are judged by looking at them. What is
 * worth testing is the rule that lets the loop stop, because getting it wrong means an
 * element nobody is touching repaints itself sixty times a second forever, and nothing
 * on screen shows it.
 */

const settings = (overrides: Partial<HazeSettings> = {}): HazeSettings => ({
  ...DEFAULT_HAZE,
  ...overrides,
});

describe('haze healing', () => {
  it('draws nothing on a frame worth less than a pixel', () => {
    const healer = createHealer(settings());
    expect(healer.add(1 / 60)).toBe(0);
  });

  it('still heals at a rate no single frame could show', () => {
    // The trap this exists for: at sixty frames a second the default rate owes 0.0037 per
    // frame and a pixel needs 0.0039. Discarding each frame as too small means the fog
    // never closes at all, while every line of the code looks correct.
    const healer = createHealer(settings());

    let drawn = 0;
    for (let frame = 0; frame < 60; frame += 1) drawn += healer.add(1 / 60);

    expect(drawn).toBeCloseTo(settings().healRate, 4);
  });

  it('owes nothing it has already paid', () => {
    const healer = createHealer(settings());

    // Run until a frame pays out, whenever that falls, then check the next one is free.
    let flushed = 0;
    for (let frame = 0; frame < 20 && flushed === 0; frame += 1) flushed = healer.add(1 / 60);

    expect(flushed).toBeGreaterThan(0);
    expect(healer.add(1 / 60)).toBe(0);
  });

  it('ignores a gap that means the tab was hidden', () => {
    const patient = createHealer(settings());
    const absent = createHealer(settings());

    // Ten seconds is not a long frame, it is an absent one. Healing all of it at once
    // would erase a wipe the viewer made before switching away.
    expect(absent.add(10)).toBeCloseTo(patient.add(0.1), 6);
  });

  it('never heals at all when the rate is zero', () => {
    const healer = createHealer(settings({ healRate: 0 }));
    let drawn = 0;
    for (let frame = 0; frame < 600; frame += 1) drawn += healer.add(1 / 60);
    expect(drawn).toBe(0);
  });

  it('agrees with the alpha a canvas can actually store', () => {
    expect(MIN_VISIBLE_ALPHA).toBeCloseTo(1 / 255, 10);
  });
});
