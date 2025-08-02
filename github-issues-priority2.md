# GitHub Issues - Priority 2 (High)

## Issue 3: ⚠️ High: Missing function return types across multiple files

**Labels**: `Priority 2 - High`, `typescript`, `code-quality`

### 問題の概要
多数のファイルで関数の戻り値型が明示的に定義されておらず、TypeScriptの型安全性が損なわれています。

### 影響範囲
- **型安全性**: 実行時エラーの可能性増加
- **開発体験**: IDEでの型推論とインテリセンス機能の低下
- **保守性**: コードの理解とメンテナンスの困難化

### エラー詳細
```
cui-playtest.mjs - 32個のexplicit-function-return-typeエラー
src/game/animations/CardAnimations.ts - 複数の関数で戻り値型未定義
src/game/scenes/BaseScene.ts - 11個のエラー
src/game/scenes/GameScene.ts - 26個のエラー
```

### 該当ファイル
- `cui-playtest.mjs` (32箇所)
- `src/game/animations/CardAnimations.ts`
- `src/game/scenes/BaseScene.ts`
- `src/game/scenes/GameScene.ts`
- `src/game/renderers/PhaserGameRenderer.ts`
- `src/game/progression/PlayerProgressionService.ts`

### 修正方法の提案
1. **段階的修正**: ファイル単位で順次対応
   ```typescript
   // Before
   function createCard() {
     return new Card();
   }
   
   // After
   function createCard(): Card {
     return new Card();
   }
   ```

2. **優先順位**: 
   - Core game logic files (GameScene.ts, BaseScene.ts)
   - Animation and rendering files
   - Test and utility files

3. **自動化**: ESLint auto-fix機能の活用（一部対応可能）

### 優先度
**High** - 型安全性とコード品質に直接影響するため早急な対応が必要

### 作業見積もり
- 所要時間: 3-4時間程度
- 難易度: 中（型推論の理解が必要）

---

## Issue 4: ⚠️ High: Explicit any type usage compromising type safety

**Labels**: `Priority 2 - High`, `typescript`, `type-safety`

### 問題の概要
複数のファイルで`any`型が明示的に使用されており、TypeScriptの型システムの利点が失われています。

### 影響範囲
- **型安全性**: 実行時型エラーのリスク増加
- **バグ発見**: コンパイル時のエラー検出機能の無効化
- **IDE支援**: オートコンプリートと型チェック機能の低下

### エラー詳細
```
src/game/input/TouchGestureManager.ts:15:11  error  Unexpected any. Specify a different type
```

### 該当ファイル
- `src/game/input/TouchGestureManager.ts`
- その他のファイルでもany型使用の可能性

### 修正方法の提案
1. **具体的型定義**: any型を適切な型に置換
   ```typescript
   // Before
   private listeners: any = {};
   
   // After
   private listeners: Record<string, EventListener[]> = {};
   ```

2. **Union型の活用**: 複数の型の可能性がある場合
   ```typescript
   // Before
   let result: any;
   
   // After
   let result: string | number | null;
   ```

3. **Generic型の使用**: 型パラメータで柔軟性を保持
   ```typescript
   // Before
   function process(data: any): any { }
   
   // After
   function process<T>(data: T): T { }
   ```

### 優先度
**High** - 型安全性の根幹に関わるため早急な対応が必要

### 作業見積もり
- 所要時間: 2-3時間程度
- 難易度: 中（適切な型設計が必要）

---

## Issue 5: ⚠️ High: Strict boolean expression violations

**Labels**: `Priority 2 - High`, `typescript`, `strict-mode`

### 問題の概要
null/undefinedの可能性がある値をboolean コンテキストで使用しており、strict-boolean-expressions ルールに違反しています。

### 影響範囲
- **実行時エラー**: null/undefined関連のランタイムエラーの可能性
- **予期しない動作**: falsy値の扱いによる論理エラー
- **デバッグの困難**: 条件分岐の意図が不明確

### エラー詳細
```
src/game/input/TouchGestureManager.ts:117:9   error  Unexpected nullable object value in conditional
src/game/input/TouchGestureManager.ts:180:11  error  Unexpected nullable object value in conditional
src/game/input/TouchGestureManager.ts:199:11  error  Unexpected nullable object value in conditional
```

### 該当ファイル
- `src/game/input/TouchGestureManager.ts`
- その他のファイルでも類似パターンの可能性

### 修正方法の提案
1. **明示的null チェック**: 
   ```typescript
   // Before
   if (this.element) { }
   
   // After
   if (this.element !== null) { }
   ```

2. **Optional chaining**: 
   ```typescript
   // Before
   if (obj && obj.property) { }
   
   // After
   if (obj?.property) { }
   ```

3. **Nullish coalescing**: 
   ```typescript
   // Before
   const value = data || defaultValue;
   
   // After
   const value = data ?? defaultValue;
   ```

### 優先度
**High** - 実行時安全性に直接関わるため早急な対応が必要

### 作業見積もり
- 所要時間: 2時間程度
- 難易度: 中（null安全性の理解が必要）