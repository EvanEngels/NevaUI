import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals, so React Testing Library cannot register its own
// automatic cleanup. Unmounting here keeps DOM state from leaking between tests.
afterEach(cleanup);
