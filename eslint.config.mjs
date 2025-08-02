import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import vuePlugin from 'eslint-plugin-vue'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

const compat = new FlatCompat()

export default [
  // Base JavaScript rules
  js.configs.recommended,
  
  // Vue files configuration
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue']
      },
      globals: {
        ...globals.browser,
        ...globals.es2022
      }
    },
    plugins: {
      'vue': vuePlugin,
      '@typescript-eslint': typescriptEslint
    },
    rules: {
      ...vuePlugin.configs['vue3-recommended'].rules,
      // TypeScript rules for Vue files
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      // Vue-specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'error',
      'vue/attributes-order': 'warn'
    }
  },
  
  // TypeScript files configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.app.json'
      },
      globals: {
        ...globals.browser,
        ...globals.es2022
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off'
    }
  },
  
  // Test files configuration
  {
    files: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js', 'src/__tests__/**/*'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.app.json'
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'warn', // Less strict in tests
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off' // Allow console in tests
    }
  },
  
  // Global ignores
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.nuxt/',
      '.output/',
      '.vite/',
      '*.min.js',
      'coverage/',
      'test-results/',
      '.eslintcache',
      '*.config.js',
      '*.config.ts',
      'vite.config.*',
      'vitest.config.*',
      'playwright.config.*'
    ]
  }
]