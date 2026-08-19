import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import path from 'path';

// Resolve the real node_modules root (worktree uses a symlink)
const nodeModulesRoot = path.resolve(__dirname, 'node_modules');

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react() as any, tsconfigPaths()],
  resolve: {
    alias: {
      react: path.resolve(nodeModulesRoot, 'react'),
      'react-dom': path.resolve(nodeModulesRoot, 'react-dom'),
      'react/jsx-dev-runtime': path.resolve(nodeModulesRoot, 'react/jsx-dev-runtime'),
      'react/jsx-runtime': path.resolve(nodeModulesRoot, 'react/jsx-runtime'),
    },
  },
  server: {
    fs: {
      allow: [__dirname, nodeModulesRoot],
    },
  },
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/db/**/*.ts',
        'src/lib/datajud/**/*.ts',
        'src/lib/dje/**/*.ts',
        'src/lib/export/**/*.ts',
        'src/lib/validations.ts',
        'src/auth/**/*.ts',
        'src/inngest/**/*.ts',
        'src/app/api/searches/**/*.ts',
        'src/app/api/dje/**/*.ts',
        'src/hooks/**/*.ts',
        'src/components/search/**/*.tsx',
        'src/components/history/**/*.tsx',
        'src/components/dje/**/*.tsx',
        'src/app/(protected)/dje/**/*.tsx',
      ],
      exclude: [
        'src/db/index.ts',
        'src/db/seed.ts',
        'src/db/__tests__/**',
        'src/lib/datajud/__tests__/**',
        'src/lib/datajud/tribunals.ts',
        'src/lib/dje/__tests__/**',
        'src/lib/export/__tests__/**',
        'src/auth/__tests__/**',
        'src/auth.ts',
        'src/app/(protected)/dje/__tests__/**',
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
