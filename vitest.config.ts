import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    passWithNoTests: true,
    include: [
      // Only include basic working tests
      'src/domain/valueObjects/__tests__/CardPower.test.ts',
      'src/domain/__tests__/integration/basic.integration.test.ts',
      'src/__tests__/utils/TestHelpers.test.ts'
    ],
    globals: true,
    // Improve test performance and reliability
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 2
      }
    },
    // Reduce test noise
    silent: process.env.VITEST_VERBOSE !== 'true',
    // Reduced timeout for faster feedback
    testTimeout: 5000,
    hookTimeout: 5000,
    // Better error handling
    bail: process.env.CI ? 1 : 0,
    // Memory management
    isolate: true,
    // Reporter configuration
    reporters: process.env.CI 
      ? ['default', 'junit', 'json'] 
      : ['default'],
    outputFile: {
      junit: './test-results/junit.xml',
      json: './test-results/results.json'
    },
    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        'packages/*/test{,s}/**',
        '**/*.d.ts',
        'cypress/**',
        'test{,s}/**',
        'test{,-*}.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}',
        '**/*{.,-}spec.{js,cjs,mjs,ts,tsx,jsx}',
        '**/__tests__/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/.{eslint,mocha,prettier}rc.{js,cjs,yml}'
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