import pluginVue from 'eslint-plugin-vue'
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  // Global ignores
  {
    ignores: [
      'dist/**', 
      'node_modules/**', 
      'coverage/**', 
      '.vscode/**', 
      '.idea/**', 
      '*.config.js', 
      'scripts/**', 
      '.claude/**',
      // Test files and development utilities
      'src/__tests__/**',
      'src/benchmark/**',
      'src/performance/**', 
      'src/research/**',
      'src/analytics/**',
      'src/ai/**',
      'src/optimization/**',
      'src/cli/**',
      'src/cui/**',
      'src/controllers/examples/**',
      'src/game/tutorial/**'
    ]
  },
  // Files to lint
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,vue}']
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'vue/no-unused-vars': ['error', { ignorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off', // Allow require in .js files
      '@typescript-eslint/no-explicit-any': 'warn' // Allow any in development files
    }
  },
  skipFormatting
)