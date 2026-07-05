
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup/testEnv.ts'],
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
