import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    passWithNoTests: true,
    include: [
      'src/**/__tests__/**/*.test.ts',
      'src/**/__tests__/**/*.test.tsx'
    ],
    exclude: [
      'node_modules/**',
      'dist/**'
    ],
    globals: true,
    // Improve test performance and reliability
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 2,
        minForks: 1
      }
    },
    // Reduce test noise
    silent: process.env.VITEST_VERBOSE !== 'true',
    // Reduced timeout for faster feedback
    testTimeout: 10000,
    hookTimeout: 10000,
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