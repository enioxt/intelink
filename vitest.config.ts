import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        include: ['**/*.test.ts', '**/*.test.tsx'],
        exclude: [
            '**/node_modules/**',
            '**/tests/e2e/**',
            '**/tests/eval/**',  // eval runner is an entry script, not a test suite
            '**/.next/**',
        ],
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});
