import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals, so React Testing Library cannot register its own
// automatic cleanup. Unmounting here keeps DOM state from leaking between tests.
afterEach(cleanup);

/**
 * jsdom does not implement ResizeObserver, and components that measure their own layout
 * legitimately use it. The stub observes nothing and fires nothing, which is the truth
 * in an environment with no layout: it lets the component mount without pretending the
 * observer works. Anything that actually depends on a resize firing has to be tested in
 * a real browser instead.
 */
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}
