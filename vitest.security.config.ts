import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    passWithNoTests: true,
    include: [
      'src/__tests__/security/**/*.test.ts',
      'src/__tests__/security/**/*.spec.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**'
    ],
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    bail: 0,
    isolate: true,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/utils/security*.ts',
        'src/utils/xss-csrf-protection.ts',
        'src/utils/security-extensions.ts',
        'src/utils/security-audit-logger.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'phaser3spectorjs': fileURLToPath(new URL('./src/test/mocks/phaser3spectorjs.ts', import.meta.url))
    }
  }
})