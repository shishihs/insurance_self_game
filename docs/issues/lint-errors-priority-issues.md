# GitHub Actions Lintエラー対応 Issue一覧

> **最終更新**: 2025/08/02  
> **ステータス**: 一部修正済み、一部継続中

## 🚨 **Critical Issues from Priority 1 Report**

以下のクリティカルな問題がGitHub Issues Priority 1レポートで発見されました：

### 🚨 **新たに発見されたパースエラー** (Critical)

**問題**: src/game/commands/配下の3ファイルでパースエラーが発生し、コンパイルをブロック

**該当ファイルとエラー位置**:
```
C:\Users\shish\Workspace\insurance_game\src\game\commands\CommandHistory.ts
  3:61  error  Parsing error: Invalid character

C:\Users\shish\Workspace\insurance_game\src\game\commands\GameCommand.ts
  1:50  error  Parsing error: Invalid character

C:\Users\shish\Workspace\insurance_game\src\game\commands\UndoRedoManager.ts
  1:50  error  Parsing error: Invalid character
```

**影響範囲**:
- ❗ **即座の影響**: GitHub Actionsのビルドが失敗し、デプロイがブロック
- ❗ **開発への影響**: 該当ファイルを含む機能開発が不可能

**推測原因**: 無効な文字（おそらく全角文字や特殊文字）

**作業見積もり**: 30分程度
**優先度**: **Critical**

### 🚨 **未使用変数によるビルド失敗** (Critical)

**問題**: 複数ファイルで未使用変数・引数がlintエラーとして検出され、strict modeでビルドが失敗

**該当箇所**:
```
cui-playtest.mjs:322:11  error  'totalCards' is assigned a value but never used
src/game/input/TouchGestureManager.ts:219:29  error  'event' is defined but never used
src/game/input/TouchGestureManager.ts:231:11  error  'fakeTouch' is assigned a value but never used
```

**影響範囲**:
- ❗ **即座の影響**: CIパイプラインでの品質チェック失敗
- ❗ **開発への影響**: 新しいコミットがマージできない

**作業見積もり**: 1時間程度
**優先度**: **Critical**

---

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
- ✅ MobileErrorHandlerのimport名をcamelCaseに修正 (修正済み)
- [ ] 非null断言を安全なnullチェックに変更
- ⚠️ 未使用変数の削除 (新たなケースが発見 - 上記Critical項目参照)

### 優先度
**Critical** - 新たなパースエラーと未使用変数がデプロイをブロック

### 見積もり
2-3時間 (パースエラー修正に30分、未使用変数修正に1時間追加)

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

## ❗ **緊急対応ロードマップ (2025/08/02更新)**

### Phase 0: 緊急デプロイブロックエラー修正（即座実行） 🚨
1. **パースエラー修正** - src/game/commands/の3ファイル (30分)
2. **未使用変数修正** - cui-playtest.mjs、TouchGestureManager.ts (1時間)

### Phase 1: 緊急対応（即座に修正）
1. **Issue 1** - TypeScript型安全性の改善 (残りの部分)

### Phase 2: 品質改善（中期対応）
2. **Issue 2** - テスト関数の分割とリファクタリング

### Phase 3: クリーンアップ（低優先度）
3. **Issue 3** - 開発用ログとコードクリーンアップ

## エラー統計サマリー (更新版)

### 現在のステータス
- **総エラー数**: 50+件 (新たなパースエラーを含む)
- **Critical Priority**: 6件 (デプロイブロッカー)
- **High Priority**: 43件 (型安全性関連)
- **Medium Priority**: 13件 (コード品質)
- **Low Priority**: 5件 (開発体験)

### 緊急度別分類
1. **🚨 Critical (即座対応)**: パースエラー、未使用変数
2. **⚠️ High (今週中)**: 型安全性、関数戻り値型
3. **📊 Medium (今月中)**: テストリファクタリング
4. **🧹 Low (機会があるとき)**: コンソールログ整理

### 期待される改善効果
これらの修正により、コードベースの型安全性、保守性、およびデプロイの安定性が大幅に向上します。

---

**❗ 注意**: パースエラーと未使用変数エラーはデプロイを完全にブロックするため、他の作業よりも最優先で対応する必要があります。**