# GitHub Issues - Priority 4 (Low)

## Issue 9: 💡 Low: Method complexity and parameter count improvements

**Labels**: `Priority 4 - Low`, `code-quality`, `refactoring`

### 問題の概要
一部のメソッドで複雑度とパラメータ数がESLintの推奨値を超えており、コードの可読性と保守性に改善の余地があります。

### 影響範囲
- **可読性**: メソッドの理解と修正の困難
- **テスタビリティ**: 単体テストの作成困難
- **保守性**: 将来の機能拡張時の影響範囲拡大

### エラー詳細
```
cui-playtest.mjs:523:3   error  Method 'logTurn' has too many parameters (6). Maximum allowed is 4
cui-playtest.mjs:523:10  error  Method 'logTurn' has a complexity of 31. Maximum allowed is 15
```

### 該当ファイル
- `cui-playtest.mjs` (主要)
- その他の複雑なメソッドを含むファイル

### 修正方法の提案

#### 1. パラメータ数の削減
```typescript
// Before
function logTurn(playerId: string, turnNumber: number, action: string, 
                cardId: string, result: string, vitality: number): void {
  // implementation
}

// After - オブジェクトパラメータを使用
interface TurnLogParams {
  playerId: string;
  turnNumber: number;
  action: string;
  cardId: string;
  result: string;
  vitality: number;
}

function logTurn(params: TurnLogParams): void {
  // implementation
}
```

#### 2. 複雑度の削減
```typescript
// Before - 複雑度31の大きなメソッド
function logTurn(params: TurnLogParams): void {
  // 31行の複雑な処理
}

// After - 小さなメソッドに分割
function logTurn(params: TurnLogParams): void {
  const formattedLog = formatTurnLog(params);
  const validation = validateTurnData(params);
  const output = generateOutput(formattedLog, validation);
  writeToLog(output);
}

private formatTurnLog(params: TurnLogParams): string { }
private validateTurnData(params: TurnLogParams): boolean { }
private generateOutput(log: string, isValid: boolean): string { }
private writeToLog(output: string): void { }
```

#### 3. 段階的リファクタリング
1. **Extract Method**: 複雑な処理を小さなメソッドに分割
2. **Parameter Object**: 多数のパラメータをオブジェクトにまとめる
3. **Strategy Pattern**: 複雑な条件分岐をパターン化

### 優先度
**Low** - 機能に直接影響しないが、長期的なコード品質向上に寄与

### 作業見積もり
- 所要時間: 2-3時間程度
- 難易度: 中（設計スキルが必要）

---

## Issue 10: 💡 Low: General code style and formatting improvements

**Labels**: `Priority 4 - Low`, `code-style`, `formatting`

### 問題の概要
その他の軽微なコードスタイルの改善点があり、全体的なコード品質向上に寄与できます。

### 影響範囲
- **コード統一性**: プロジェクト全体の一貫性向上
- **開発体験**: より読みやすく美しいコード
- **新規参加者**: コードベースの理解促進

### 改善対象
1. **インデント・スペーシングの統一**
2. **未使用import文の削除**
3. **コメントの整理と改善**
4. **型アサーションの最適化**

### 修正方法の提案
1. **自動整形ツールの活用**:
   ```bash
   npm run lint -- --fix
   npm run prettier
   ```

2. **段階的改善**:
   - ファイル単位での整理
   - 機能別での統一性確保
   - レビュープロセスでの品質向上

3. **ツール設定の最適化**:
   - ESLint設定の調整
   - Prettier設定の統一
   - VS Code設定の共有

### 優先度
**Low** - 機能に影響しないが、開発体験向上に寄与

### 作業見積もり
- 所要時間: 1-2時間程度
- 難易度: 低（主に自動化ツールの活用）

---

# 全体サマリー

## Issue作成の優先順位
1. **Priority 1 (Critical)**: 2 Issues - デプロイブロッカー
2. **Priority 2 (High)**: 3 Issues - 型安全性・品質
3. **Priority 3 (Medium)**: 3 Issues - コード一貫性
4. **Priority 4 (Low)**: 2 Issues - 長期的品質向上

## 推奨作業順序
1. Parse errors → Unused variables (Priority 1)
2. Function return types → Any types → Boolean expressions (Priority 2)  
3. Naming conventions → Import styles (Priority 3)
4. Complexity reduction → Style improvements (Priority 4)

## 全体作業見積もり
- **緊急対応** (Priority 1): 1.5時間
- **重要対応** (Priority 2): 7-9時間
- **推奨対応** (Priority 3): 6-8時間
- **改善対応** (Priority 4): 3-5時間

**合計**: 17.5-23.5時間程度