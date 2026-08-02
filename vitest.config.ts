import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/db/**/*.ts', 'src/lib/datajud/**/*.ts', 'src/auth/**/*.ts'],
      exclude: [
        'src/db/index.ts',
        'src/db/seed.ts',
        'src/db/__tests__/**',
        'src/lib/datajud/__tests__/**',
        'src/lib/datajud/tribunals.ts',
        'src/auth/__tests__/**',
        'src/auth.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 60,
        branches: 80,
        statements: 80,
      },
    },
  },
});
