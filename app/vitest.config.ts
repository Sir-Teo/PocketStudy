import { configDefaults, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, {
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    css: true,
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
