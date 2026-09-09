/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    // Consumers need type declarations; dts emits them next to the bundle.
    dts({ include: ['src'], exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'] }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      // React is a peer dependency: it must never be bundled into the library.
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    sourcemap: true,
  },
  test: {
    // No global injection: tests import what they use, so nothing is implicit.
    globals: false,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
