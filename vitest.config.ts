import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    pool: 'forks', // Use forks instead of threads to avoid NODE_OPTIONS issue
  },
});
