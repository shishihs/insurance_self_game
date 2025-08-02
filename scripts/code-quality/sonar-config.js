/**
 * SonarJS 品質ルール設定
 * 
 * 高品質なJavaScript/TypeScriptコードを保証するための
 * 包括的なコード品質ルール設定
 */

module.exports = {
  // コードの複雑さとサイズ
  'cognitive-complexity': ['error', 15],
  'max-switch-cases': ['error', 30],
  'no-collapsible-if': 'error',
  'no-collection-size-mischeck': 'error',
  'no-duplicate-string': ['error', 3],
  'no-duplicated-branches': 'error',
  'no-element-overwrite': 'error',
  'no-empty-collection': 'error',
  'no-extra-arguments': 'error',
  'no-gratuitous-expressions': 'error',
  'no-identical-conditions': 'error',
  'no-identical-expressions': 'error',
  'no-ignored-return': 'error',
  'no-inverted-boolean-check': 'error',
  'no-one-iteration-loop': 'error',
  'no-redundant-boolean': 'error',
  'no-redundant-jump': 'error',
  'no-same-line-conditional': 'error',
  'no-small-switch': 'error',
  'no-unused-collection': 'error',
  'no-use-of-empty-return-value': 'error',
  'non-existent-operator': 'error',
  'prefer-immediate-return': 'error',
  'prefer-object-literal': 'error',
  'prefer-single-boolean-return': 'error',
  'prefer-while': 'error',

  // セキュリティ
  'encryption-secure-mode': 'error',
  'hashing': 'error',
  'no-clear-text-protocols': 'error',
  'no-hardcoded-credentials': 'error',
  'no-hardcoded-ip': 'error',
  'no-weak-cipher': 'error',
  'pseudo-random': 'error',
  'session-regeneration': 'error',
  'sockets': 'error',
  'stateful-regex': 'error',

  // バグ発見
  'arguments-order': 'error',
  'array-constructor': 'error',
  'constructor-for-side-effects': 'error',
  'for-in': 'error',
  'function-inside-loop': 'error',
  'no-accessor-field-mismatch': 'error',
  'no-all-duplicated-branches': 'error',
  'no-array-delete': 'error',
  'no-delete-var': 'error',
  'no-duplicate-in-composite': 'error',
  'no-empty-function': 'error',
  'no-empty-test-file': 'error',
  'no-for-in-iterable': 'error',
  'no-function-declaration-in-block': 'error',
  'no-global-this': 'error',
  'no-in-misuse': 'error',
  'no-incomplete-assertions': 'error',
  'no-incorrect-string-concat': 'error',
  'no-invalid-await': 'error',
  'no-invariant-returns': 'error',
  'no-misleading-array-reverse': 'error',
  'no-nested-assignment': 'error',
  'no-nested-incdec': 'error',
  'no-nested-switch': 'error',
  'no-nested-template-literals': 'error',
  'no-return-type-any': 'error',
  'no-try-promise': 'error',
  'no-undefined-assignment': 'error',
  'no-undefined-argument': 'error',
  'no-unenclosed-multiline-block': 'error',
  'no-unreachable': 'error',
  'no-unsafe-unary-minus': 'error',
  'no-unthrown-error': 'error',
  'no-unused-function-argument': 'error',
  'no-useless-intersection': 'error',
  'no-variable-usage-before-declaration': 'error',
  'operation-returning-nan': 'error',
  'prefer-promise-shorthand': 'error',
  'values-not-convertible-to-numbers': 'error',

  // コードスタイルと可読性
  'class-name': 'error',
  'file-name-differ-from-class': 'error',
  'function-name': 'error',
  'max-union-size': ['error', 3],
  'no-angular-bypass-sanitization': 'error',
  'no-builtin-override': 'error',
  'no-commented-code': 'error',
  'no-dead-store': 'error',
  'no-ignore-return-value': 'error',
  'no-implicit-dependencies': 'error',
  'no-inconsistent-returns': 'error',
  'no-misleading-character-class': 'error',
  'no-mixed-content': 'error',
  'no-primitive-wrappers': 'error',
  'no-reference-error': 'error',
  'no-typeof-undefined': 'error',
  'no-useless-call': 'error',
  'prefer-default-last': 'error',
  'prefer-for-of': 'error',
  'prefer-type-guard': 'error',
  'single-char-in-character-classes': 'error',
  'todo-tag': 'warn',
  'unused-import': 'error',
  'use-isnan': 'error',

  // テスト関連
  'no-duplicate-string': ['error', { threshold: 3, ignoreStrings: 'test,Test,TEST' }],
  'no-empty-test-file': 'error',
  'no-focused-tests': 'error',
  'no-identical-functions': ['error', 3],
  'no-skipped-tests': 'warn',

  // Node.js 特有
  'file-permissions': 'error',
  'no-require-or-define': 'error',
  'os-command': 'error',
  'process-argv': 'error',
  'weak-ssl': 'error',

  // React/Vue 特有（該当する場合）
  'jsx-no-constructed-context-values': 'error',
  'jsx-no-useless-fragment': 'error',
  'no-hook-setter-in-body': 'error',
  'no-unstable-nested-components': 'error',

  // TypeScript 特有
  'no-array-index-key': 'error',
  'no-base-to-string': 'error',
  'no-misused-promises': 'error',
  'no-redundant-type-constituents': 'error',
  'no-unsafe-argument': 'error',
  'no-unsafe-assignment': 'error',
  'no-unsafe-call': 'error',
  'no-unsafe-member-access': 'error',
  'no-unsafe-return': 'error',
  'prefer-enum-initializers': 'error',
  'prefer-nullish-coalescing': 'error',
  'prefer-optional-chain': 'error',
  'prefer-string-starts-ends-with': 'error'
}

// 品質ゲート設定
module.exports.qualityGate = {
  // メトリクス閾値
  metrics: {
    // 複雑さ
    complexity: {
      function: 15,
      file: 200,
      class: 80
    },
    
    // サイズ
    lines: {
      function: 100,
      file: 1000,
      class: 500
    },
    
    // 重複
    duplicatedLines: {
      percentage: 5.0,
      blocks: 10
    },
    
    // カバレッジ
    coverage: {
      line: 80.0,
      condition: 70.0,
      function: 80.0
    },
    
    // 技術的負債
    technicalDebt: {
      rating: 'A', // A, B, C, D, E
      ratio: 5.0  // %
    },
    
    // 信頼性
    reliability: {
      rating: 'A',
      bugs: 0
    },
    
    // セキュリティ
    security: {
      rating: 'A',
      vulnerabilities: 0,
      hotspots: 0
    },
    
    // 保守性
    maintainability: {
      rating: 'A',
      codeSmells: 50
    }
  },
  
  // 条件設定
  conditions: [
    {
      metric: 'new_coverage',
      operator: 'LT',
      value: '80.0',
      onLeakPeriod: true
    },
    {
      metric: 'new_duplicated_lines_density',
      operator: 'GT',
      value: '3.0',
      onLeakPeriod: true
    },
    {
      metric: 'new_maintainability_rating',
      operator: 'GT',
      value: '1',
      onLeakPeriod: true
    },
    {
      metric: 'new_reliability_rating',
      operator: 'GT',
      value: '1',
      onLeakPeriod: true
    },
    {
      metric: 'new_security_rating',
      operator: 'GT',
      value: '1',
      onLeakPeriod: true
    },
    {
      metric: 'new_security_hotspots_reviewed',
      operator: 'LT',
      value: '100',
      onLeakPeriod: true
    }
  ]
}

// プロジェクト設定テンプレート
module.exports.projectTemplate = {
  'sonar.projectKey': 'insurance_game',
  'sonar.projectName': 'Insurance Game',
  'sonar.projectVersion': '1.0',
  'sonar.sources': 'src',
  'sonar.tests': 'src/__tests__',
  'sonar.test.inclusions': '**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx',
  'sonar.coverage.exclusions': '**/*.test.*,**/*.spec.*,**/node_modules/**,**/dist/**',
  'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
  'sonar.typescript.tsconfigPath': 'tsconfig.json',
  'sonar.eslint.reportPaths': 'eslint-report.json',
  'sonar.exclusions': 'node_modules/**,dist/**,coverage/**,.git/**',
  'sonar.sourceEncoding': 'UTF-8',
  
  // 言語設定
  'sonar.javascript.environments': 'amd,applescript,atomtest,browser,commonjs,devtools,embertest,es6,greasemonkey,jasmine,jest,jquery,meteor,mocha,nashorn,node,phantomjs,prototypejs,qunit,serviceworker,shelljs,webextensions,worker',
  
  // 品質プロファイル
  'sonar.profile': 'Sonar way',
  
  // 新しいコード定義
  'sonar.leak.period': '30'
}

// カスタムルール設定
module.exports.customRules = {
  // ゲーム固有のルール
  'game-specific-naming': {
    enabled: true,
    patterns: {
      gameId: /^game_[a-zA-Z0-9_]+$/,
      cardId: /^card_[a-zA-Z0-9_]+$/,
      playerId: /^player_[a-zA-Z0-9_]+$/
    }
  },
  
  // パフォーマンス関連
  'performance-sensitive': {
    enabled: true,
    checkObjectCreationInLoops: true,
    checkLargeArrayOperations: true,
    maxIterations: 1000
  },
  
  // アクセシビリティ
  'accessibility-compliance': {
    enabled: true,
    requireAriaLabels: true,
    requireAltText: true,
    requireTabIndex: false
  }
}