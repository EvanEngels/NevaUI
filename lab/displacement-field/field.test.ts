import { describe, expect, it } from 'vitest';
import { createField, DEFAULT_SETTINGS, type FieldSettings, type Point } from './field';

/**
 * The risk here is the physics, not the rendering: a model that drifts, explodes or
 * fails to propagate would be invisible in a screenshot and fatal in a component.
 * These tests target exactly those failures, and the propagation one is the test that
 * decides whether this Concept is worth anything at all.
 */

const settings = (overrides: Partial<FieldSettings> = {}): FieldSettings => ({
  ...DEFAULT_SETTINGS,
  ...overrides,
});

/** A `columns` x `rows` grid with 50px spacing, in source order. */
const grid = (columns: number, rows: number): Point[] =>
  Array.from({ length: columns * rows }, (_, index) => ({
    x: (index % columns) * 50,
    y: Math.floor(index / columns) * 50,
  }));

const at = (points: readonly Point[], index: number): Point => {
  const point = points[index];
  if (point === undefined) throw new Error(`no element at index ${index}`);
  return point;
};

const advance = (field: { step(seconds: number): void }, seconds: number): void => {
  // Real frames, not one giant step: substep clamping only shows up over many frames.
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) {
    field.step(1 / 60);
  }
};

describe('displacement field', () => {
  it('stays exactly at rest when nothing touches it', () => {
    const field = createField(grid(5, 5), 5, settings());

    advance(field, 1);

    expect(field.isAtRest()).toBe(true);
    for (const displacement of field.displacements()) {
      expect(displacement.x).toBe(0);
      expect(displacement.y).toBe(0);
    }
  });

  it('pushes an element away from the pointer, not towards it', () => {
    const field = createField(grid(5, 5), 5, settings());

    // Left of the grid origin, so the element at (0,0) must move right.
    field.setPointer({ x: -20, y: 0 });
    advance(field, 0.25);

    expect(at(field.displacements(), 0).x).toBeGreaterThan(1);
  });

  it('propagates displacement beyond the pointer radius when neighbours are coupled', () => {
    const restPositions = grid(8, 1);
    const far = 6; // at x = 300, well outside the 180px radius

    const coupled = createField(restPositions, 8, settings());
    const control = createField(restPositions, 8, settings({ linkStiffness: 0 }));

    for (const field of [coupled, control]) {
      field.setPointer({ x: -20, y: 0 });
      advance(field, 0.5);
    }

    // The control cannot move this element: it is out of reach and talks to nobody.
    expect(Math.abs(at(control.displacements(), far).x)).toBeLessThan(0.001);

    // Coupling is the whole point of the Concept. The threshold is relative to the
    // element the pointer actually reaches: propagation has to stay perceptible, not
    // merely non-zero. If this ever fails, the cheap falloff model wins and the
    // lattice should be archived.
    const coupledDisplacements = coupled.displacements();
    const reached = Math.abs(at(coupledDisplacements, 0).x);
    const propagated = Math.abs(at(coupledDisplacements, far).x);

    expect(propagated / reached).toBeGreaterThan(0.05);
  });

  it('returns to rest after the pointer leaves', () => {
    const field = createField(grid(5, 5), 5, settings());

    field.setPointer({ x: -20, y: 0 });
    advance(field, 0.5);
    expect(field.isAtRest()).toBe(false);

    field.setPointer(null);
    advance(field, 5);

    expect(field.isAtRest()).toBe(true);
  });

  it('produces the requested displacement whatever the element spacing', () => {
    // The Lab found that a fixed force is not portable between layouts. This is that
    // finding turned into a guard: the same prop must mean the same distance on grids
    // of different density.
    const request = 30;

    const peakOf = (spacing: number): number => {
      const points = Array.from({ length: 121 }, (_, index) => ({
        x: (index % 11) * spacing,
        y: Math.floor(index / 11) * spacing,
      }));
      const field = createField(points, 11, settings({ displacement: request }));

      field.setPointer({ x: 5 * spacing, y: 5 * spacing });
      advance(field, 3);

      return field
        .displacements()
        .reduce((peak, point) => Math.max(peak, Math.hypot(point.x, point.y)), 0);
    };

    for (const spacing of [30, 56, 90]) {
      expect(peakOf(spacing)).toBeGreaterThan(request * 0.85);
      expect(peakOf(spacing)).toBeLessThan(request * 1.15);
    }
  });

  it('stays finite under a stiff configuration and long frame gaps', () => {
    // Stiffness far past what the fixed timestep can integrate accurately, driven with
    // frame gaps that would make a deltaTime-based integrator diverge.
    const field = createField(
      grid(6, 6),
      6,
      settings({ linkStiffness: 100000, anchorStiffness: 100000, displacement: 500 })
    );

    field.setPointer({ x: 0, y: 0 });
    for (let frame = 0; frame < 200; frame += 1) {
      field.step(0.5);
    }

    for (const displacement of field.displacements()) {
      expect(Number.isFinite(displacement.x)).toBe(true);
      expect(Number.isFinite(displacement.y)).toBe(true);
      expect(Math.abs(displacement.x)).toBeLessThanOrEqual(200);
      expect(Math.abs(displacement.y)).toBeLessThanOrEqual(200);
    }
  });
});
