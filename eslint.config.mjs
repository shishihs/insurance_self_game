import pluginVue from 'eslint-plugin-vue'
import pluginSecurity from 'eslint-plugin-security'
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
  pluginSecurity.configs.recommended,
  {
    rules: {
      // Vue specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': ['error', { ignorePattern: '^_' }],
      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/prop-name-casing': ['error', 'camelCase'],
      'vue/require-default-prop': 'error',
      'vue/require-explicit-emits': 'error',
      'vue/no-v-html': 'error',
      
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
        allowConciseArrowFunctionExpressionsStartingWithVoid: false
      }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/strict-boolean-expressions': ['error', {
        allowString: false,
        allowNumber: false,
        allowNullableObject: false
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports'
      }],
      '@typescript-eslint/consistent-type-exports': 'error',
      
      // 追加の厳格なTypeScriptルール
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-readonly-parameter-types': 'off', // パフォーマンス理由でオフ
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/restrict-plus-operands': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
        allowBoolean: true,
        allowAny: false,
        allowNullish: false
      }],
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'error',
      '@typescript-eslint/no-meaningless-void-operator': 'error',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/prefer-reduce-type-parameter': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase']
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase']
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow'
        },
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require'
        },
        {
          selector: 'typeLike',
          format: ['PascalCase']
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE']
        }
      ],
      
      // Security-focused rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-useless-escape': 'error',
      'guard-for-in': 'error',
      'no-caller': 'error',
      'no-delete-var': 'error',
      'no-label-var': 'error',
      'no-shadow-restricted-names': 'error',
      'no-undef-init': 'error',
      'no-global-assign': 'error',
      'no-implicit-globals': 'error',
      'no-octal': 'error',
      'no-octal-escape': 'error',
      'no-proto': 'error',
      'no-redeclare': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unused-expressions': 'error',
      'no-void': 'error',
      'no-with': 'error',
      'radix': 'error',
      'yoda': 'error',
      
      // Input validation and sanitization
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='eval']",
          message: "eval() は XSS 攻撃のリスクがあります。代替手段を使用してください。"
        },
        {
          selector: "CallExpression[callee.property.name='innerHTML']",
          message: "innerHTML は XSS 攻撃のリスクがあります。textContent または sanitizeHTML() を使用してください。"
        },
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message: "innerHTML への直接代入は XSS 攻撃のリスクがあります。sanitizeHTML() を使用してください。"
        }
      ],
      
      // General code quality rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'no-param-reassign': ['error', { props: true }],
      'no-nested-ternary': 'error',
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 4],
      'complexity': ['error', 15],
      'max-params': ['error', 4],
      
      // 追加のコード品質ルール
      'array-callback-return': ['error', { allowImplicit: true }],
      'consistent-return': 'error',
      'default-case': 'error',
      'default-case-last': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'grouped-accessor-pairs': 'error',
      'no-constructor-return': 'error',
      'no-duplicate-imports': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-empty-function': 'error',
      'no-eq-null': 'off', // eqeqeq handles this
      'no-extra-bind': 'error',
      'no-extra-label': 'error',
      'no-floating-decimal': 'error',
      'no-implicit-coercion': 'error',
      'no-invalid-this': 'error',
      'no-iterator': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-loop-func': 'error',
      'no-magic-numbers': ['warn', {
        ignore: [-1, 0, 1, 2],
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        ignoreClassFieldInitialValues: true
      }],
      'no-multi-assign': 'error',
      'no-new': 'error',
      'no-new-wrappers': 'error',
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      'no-promise-executor-return': 'error',
      'no-proto': 'error',
      'no-return-assign': 'error',
      'no-return-await': 'error',
      'no-script-url': 'error',
      'no-shadow': 'off', // @typescript-eslint/no-shadow handles this
      'no-template-curly-in-string': 'error',
      'no-undef-init': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unreachable-loop': 'error',
      'no-unused-expressions': ['error', {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true
      }],
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-exponentiation-operator': 'error',
      'prefer-named-capture-group': 'error',
      'prefer-object-spread': 'error',
      'prefer-promise-reject-errors': 'error',
      'prefer-regex-literals': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'require-atomic-updates': 'error',
      'require-await': 'off', // @typescript-eslint/require-await handles this
      'sort-imports': ['error', {
        ignoreCase: true,
        ignoreDeclarationSort: true,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single']
      }],
      'strict': ['error', 'never']
    }
  },
  skipFormatting
)