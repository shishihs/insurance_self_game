# GitHub Issues - Priority 1 (Critical)

## Issue 1: 🚨 Critical: Parse errors blocking compilation in commands directory

**Labels**: `Priority 1 - Critical`, `bug`, `deploy-blocker`

### 問題の概要
src/game/commands/配下の3ファイルでパースエラーが発生しており、コンパイルをブロックしています。

### 影響範囲
- **即座の影響**: GitHub Actionsのビルドが失敗し、デプロイがブロックされる
- **開発への影響**: 該当ファイルを含む機能開発が不可能

### エラー詳細
```
C:\Users\shish\Workspace\insurance_game\src\game\commands\CommandHistory.ts
  3:61  error  Parsing error: Invalid character

C:\Users\shish\Workspace\insurance_game\src\game\commands\GameCommand.ts
  1:50  error  Parsing error: Invalid character

C:\Users\shish\Workspace\insurance_game\src\game\commands\UndoRedoManager.ts
  1:50  error  Parsing error: Invalid character
```

### 該当ファイル
- `src/game/commands/CommandHistory.ts`
- `src/game/commands/GameCommand.ts` 
- `src/game/commands/UndoRedoManager.ts`

### 修正方法の提案
1. 各ファイルの該当行を確認し、無効な文字（おそらく全角文字や特殊文字）を特定
2. 無効な文字を削除または適切な文字に置換
3. ファイルのエンコーディング（UTF-8）を確認

### 優先度
**Critical** - デプロイを完全にブロックするため、最優先で修正が必要

### 作業見積もり
- 所要時間: 30分程度
- 難易度: 低（文字コードの問題の可能性が高い）

---

## Issue 2: 🚨 Critical: Unused variables causing build failures

**Labels**: `Priority 1 - Critical`, `code-quality`, `lint-error`

### 問題の概要
複数のファイルで未使用変数・引数がlintエラーとして検出され、strict modeでビルドが失敗しています。

### 影響範囲
- **即座の影響**: CIパイプラインでの品質チェック失敗
- **開発への影響**: 新しいコミットがマージできない

### エラー詳細
```
cui-playtest.mjs:322:11  error  'totalCards' is assigned a value but never used
src/game/input/TouchGestureManager.ts:219:29  error  'event' is defined but never used
src/game/input/TouchGestureManager.ts:231:11  error  'fakeTouch' is assigned a value but never used
```

### 該当ファイル
- `cui-playtest.mjs`
- `src/game/input/TouchGestureManager.ts`
- その他の関連ファイル

### 修正方法の提案
1. **即座の修正**: 未使用変数・引数に `_` プレフィックスを追加
   ```typescript
   // Before
   function handleTouchCancel(event: TouchEvent) { }
   
   // After  
   function handleTouchCancel(_event: TouchEvent) { }
   ```

2. **根本的修正**: 本当に不要な変数は削除、必要な変数は適切に使用

3. **ESLint設定調整**: プロジェクトの要件に応じてルールを調整

### 優先度
**Critical** - ビルド失敗を防ぐため最優先で修正が必要

### 作業見積もり
- 所要時間: 1時間程度
- 難易度: 低（機械的な修正が主体）