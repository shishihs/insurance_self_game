# GitHub Issues - Priority 3 (Medium)

## Issue 6: 📋 Medium: Private property naming convention violations

**Labels**: `Priority 3 - Medium`, `code-style`, `naming-convention`

### 問題の概要
プライベートプロパティとメソッドが命名規約（先頭アンダースコア）に従っておらず、コードの可読性と一貫性が損なわれています。

### 影響範囲
- **コード品質**: チーム内での一貫性欠如
- **保守性**: プライベート/パブリックの区別が不明確
- **新規開発者**: コードベースの理解の困難

### エラー詳細
```
src/game/input/TouchGestureManager.ts - 多数のプライベートプロパティ・メソッド
  85:11  error  Class Property name `element` must have one leading underscore(s)
  86:11  error  Class Property name `touchPoints` must have one leading underscore(s)
  123:11 error  Class Method name `setupEventListeners` must have one leading underscore(s)
  137:11 error  Class Method name `handleTouchStart` must have one leading underscore(s)
```

### 該当ファイル
- `src/game/input/TouchGestureManager.ts` (主要)
- その他のクラスファイルでも類似パターンの可能性

### 修正方法の提案
1. **プライベートプロパティの修正**:
   ```typescript
   // Before
   private element: HTMLElement;
   private touchPoints: Map<number, TouchPoint>;
   
   // After
   private _element: HTMLElement;
   private _touchPoints: Map<number, TouchPoint>;
   ```

2. **プライベートメソッドの修正**:
   ```typescript
   // Before
   private setupEventListeners(): void { }
   private handleTouchStart(event: TouchEvent): void { }
   
   // After
   private _setupEventListeners(): void { }
   private _handleTouchStart(event: TouchEvent): void { }
   ```

3. **一括リネーム**: IDEの一括リネーム機能を活用

### 優先度
**Medium** - 機能に影響しないが、コード品質向上のため対応が望ましい

### 作業見積もり
- 所要時間: 2-3時間程度
- 難易度: 低（機械的なリネーム作業）

---

## Issue 7: 📋 Medium: Game configuration constant naming violations

**Labels**: `Priority 3 - Medium`, `code-style`, `naming-convention`

### 問題の概要
gameConfig.tsで定数名がUPPER_CASE形式で定義されているが、ESLint設定ではcamelCase形式を要求しており、規約違反となっています。

### 影響範囲
- **設定管理**: ゲーム設定の参照時の一貫性欠如
- **チーム開発**: 命名規約の統一性問題
- **将来の拡張**: 新しい設定追加時の規約混乱

### エラー詳細
```
src/game/config/gameConfig.ts - 42個の命名規約違反
  96:3   error  Object Literal Property name `CARD_WIDTH` must match camelCase
  97:3   error  Object Literal Property name `CARD_HEIGHT` must match camelCase
  98:3   error  Object Literal Property name `CARD_SCALE` must match camelCase
  121:3  error  Object Literal Property name `STAGE_TURNS` must match camelCase
  128:3  error  Object Literal Property name `VICTORY_VITALITY` must match camelCase
```

### 該当ファイル
- `src/game/config/gameConfig.ts`

### 修正方法の提案
1. **方針決定**: どちらの命名規約を採用するか決定
   - **Option A**: UPPER_CASEを維持し、ESLint設定を調整
   - **Option B**: camelCaseに統一し、全体を変更

2. **Option B採用の場合の修正例**:
   ```typescript
   // Before
   export const GAME_CONFIG = {
     CARD_WIDTH: 100,
     CARD_HEIGHT: 140,
     CARD_SCALE: 1.0,
   };
   
   // After
   export const gameConfig = {
     cardWidth: 100,
     cardHeight: 140,
     cardScale: 1.0,
   };
   ```

3. **全体の影響確認**: 設定値を参照している全ファイルの更新

### 優先度
**Medium** - プロジェクト全体の一貫性に関わるが、機能影響は限定的

### 作業見積もり
- 所要時間: 3-4時間程度（影響範囲調査含む）
- 難易度: 中（全体への影響調査が必要）

---

## Issue 8: 📋 Medium: Import type annotation inconsistencies

**Labels**: `Priority 3 - Medium`, `typescript`, `import-style`

### 問題の概要
型のみをimportする際の記法が一貫していません。consistent-type-importsルールに違反しています。

### 影響範囲
- **バンドルサイズ**: 不要なランタイムimportの可能性
- **コンパイル効率**: TypeScriptコンパイラの最適化阻害
- **コード品質**: import文の一貫性欠如

### エラー詳細
```
src/game/config/gameConfig.ts:70:51  error  `import()` type annotations are forbidden
src/game/config/gameConfig.ts:88:8   error  `import()` type annotations are forbidden
```

### 該当ファイル
- `src/game/config/gameConfig.ts`
- その他のファイルでも類似パターンの可能性

### 修正方法の提案
1. **type-only import の使用**:
   ```typescript
   // Before
   import { SomeType } from './module';
   
   // After
   import type { SomeType } from './module';
   ```

2. **dynamic import の型アノテーション修正**:
   ```typescript
   // Before
   const module = await import('./module') as typeof import('./module');
   
   // After
   const module = await import('./module');
   ```

### 優先度
**Medium** - バンドル最適化とコード品質向上のため対応が望ましい

### 作業見積もり
- 所要時間: 1時間程度
- 難易度: 低（機械的な修正が主体）