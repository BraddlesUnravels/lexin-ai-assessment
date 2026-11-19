import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['tests/**/*.ui.{test,spec}.{ts,tsx}'],
        },
      },
      {
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['tests/**/*.ui.{test,spec}.{ts,tsx}'],
        },
      },
    ],
  },
});
