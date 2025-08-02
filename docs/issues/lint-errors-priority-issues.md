# GitHub Actions Lintエラー対応 Issue一覧

## Issue 1: [LINT] TypeScript型安全性の改善 - 関数戻り値型定義とTS厳格ルール対応

### 概要
GitHub ActionsのLintチェックでTypeScript厳格ルールに違反している箇所を修正します。

### 対象ファイルと問題
#### 1. `cui-playtest.mjs` (39件の関数戻り値型未定義)
- **エラー**: `Missing return type on function (@typescript-eslint/explicit-function-return-type)`
- **該当行**: 32, 45, 68, 80, 105, 111, 115, 130, 134, 141 + その他29箇所

#### 2. `src/App.vue` (命名規則違反)
- **エラー**: `Import name MobileErrorHandler must match camelCase`
- **該当行**: 10

#### 3. `src/application/__tests__/endToEnd.scenario.test.ts`
- **エラー1**: `Forbidden non-null assertion` (Line 72, 89)
- **エラー2**: `@typescript-eslint/no-unused-vars` (Line 283)

### タスク
- [ ] cui-playtest.mjsのすべての関数に戻り値型を追加
- [ ] MobileErrorHandlerのimport名をcamelCaseに修正
- [ ] 非null断言を安全なnullチェックに変更
- [ ] 未使用変数の削除

### 優先度
**High** - 型安全性はバグ防止の基本

### 見積もり
2-3時間

### 参考
[GitHub Actions実行結果](https://github.com/shishihs/insurance_self_game/actions/runs/12740491615)

---

## Issue 2: [REFACTOR] テスト関数の分割とリファクタリング

### 概要
50行を超える長すぎる関数を分割し、テストの可読性と保守性を向上させます。

### 対象ファイルと問題
#### 1. `src/application/__tests__/endToEnd.scenario.test.ts` (6関数)
- Line 8: 346行（最大50行）
- Line 19: 119行（最大50行）
- Line 140: 64行
- Line 206: 53行
- Line 261: 99行
- Line 362: 69行

#### 2. `src/application/__tests__/aggregate.integration.test.ts` (5関数)
- Line 10: 286行（最大50行）
- Line 23: 64行
- Line 111: 87行
- Line 221: 67行
- Line 311: 56行

#### 3. `src/App.vue` (1関数)
- Line 134: 81行

#### 4. `cui-playtest.mjs`
- logTurn関数の複雑度31（最大20）
- パラメータ数6（最大4）

### 改善方針
- 1つの関数は1つの責務に集中
- テストケースを論理的な単位で分割
- ヘルパー関数の抽出
- 共通処理のユーティリティ化

### 優先度
**Medium** - 保守性向上のため重要だが、動作には影響なし

### 見積もり
4-6時間

---

## Issue 3: [CLEANUP] 開発用ログとコードクリーンアップ

### 概要
Console.logの使用を適切な方法に変更し、未使用変数を削除します。

### 対象
#### 1. `src/App.vue` (console.log使用)
- Line 108: `console.log('エラーイベント受信:', error)`
- Line 117: `console.log('エラーイベント受信:', error)`
- Line 150: `console.log('ゲーム復元エラー:', error)`

#### 2. `cui-playtest.mjs` (未使用変数)
- Line 322: `totalCards` 変数が未使用

### 改善方針
- console.log → console.warn/errorに変更
- 開発環境のみで出力するようにする
- 未使用変数の削除

### 優先度
**Low** - 機能に影響なし、開発体験の改善

### 見積もり
30分

---

## 対応順序の推奨

### Phase 1: 緊急対応（即座に修正）
1. **Issue 1** - TypeScript型安全性の改善

### Phase 2: 品質改善（中期対応）
2. **Issue 2** - テスト関数の分割とリファクタリング

### Phase 3: クリーンアップ（低優先度）
3. **Issue 3** - 開発用ログとコードクリーンアップ

## エラー統計サマリー
- **総エラー数**: 47件
- **High Priority**: 43件（型安全性関連）
- **Medium Priority**: 13件（コード品質）
- **Low Priority**: 5件（開発体験）

これらの修正により、コードベースの型安全性と保守性が大幅に向上します。