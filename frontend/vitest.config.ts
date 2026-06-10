import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Les tests portent sur de la logique pure (utils) : pas besoin du DOM ni de TestBed.
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
