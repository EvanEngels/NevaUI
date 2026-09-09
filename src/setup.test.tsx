import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

// This is not a product test. It validates the toolchain itself: TSX compilation,
// the jsdom environment, React Testing Library rendering and the jest-dom matchers.
// It exists so a broken setup fails loudly before any component depends on it.
describe('test environment', () => {
  it('renders React into jsdom and exposes jest-dom matchers', () => {
    render(<button type="button">press</button>);

    expect(screen.getByRole('button', { name: 'press' })).toBeInTheDocument();
  });
});
