import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import path from 'path';

// Resolve the real node_modules root (worktree uses a symlink)
const nodeModulesRoot = path.resolve(__dirname, 'node_modules');

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react() as any, tsconfigPaths()],
  server: {
    fs: {
      allow: [__dirname, nodeModulesRoot],
    },
  },
  test: {
    exclude: [
      '**/node_modules/**',
      '**/.worktrees/**',
      '**/dist/**',
    ],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/db/**/*.ts',
        'src/lib/zenvia/**/*.ts',
        'src/lib/datajud/**/*.ts',
        'src/lib/dje/**/*.ts',
        'src/lib/export/**/*.ts',
        'src/lib/storage/**/*.ts',
        'src/lib/validations.ts',
        'src/lib/auth/**/*.ts',
        'src/lib/org-context.ts',
        'src/lib/errors.ts',
        'src/auth/**/*.ts',
        'src/inngest/**/*.ts',
        'src/app/api/searches/**/*.ts',
        'src/app/api/dje/**/*.ts',
        'src/hooks/**/*.ts',
        'src/components/search/**/*.tsx',
        'src/components/history/**/*.tsx',
        'src/components/dje/**/*.tsx',
        'src/app/(protected)/dje/**/*.tsx',
        'src/components/layout/**/*.tsx',
        'src/components/ui-custom/**/*.tsx',
        'src/components/billing/**/*.tsx',
        'src/app/api/billing/portal/**/*.ts',
      ],
      exclude: [
        'src/db/index.ts',
        'src/db/seed.ts',
        'src/db/__tests__/**',
        'src/lib/zenvia/__tests__/**',
        'src/lib/datajud/__tests__/**',
        'src/lib/datajud/tribunals.ts',
        'src/lib/dje/__tests__/**',
        'src/lib/export/__tests__/**',
        'src/lib/storage/__tests__/**',
        'src/lib/auth/__tests__/**',
        'src/auth/__tests__/**',
        'src/auth.ts',
        'src/app/(protected)/dje/__tests__/**',
        'src/components/layout/__tests__/**',
        'src/components/ui-custom/__tests__/**',
        'src/components/billing/__tests__/**',
        'src/app/api/billing/__tests__/**',
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
