# Architecture Refactoring Strategy

> 📌 **このドキュメントはリファクタリングの羅針盤です。**
> 進捗の追跡は [REFACTORING_PROGRESS.md](./REFACTORING_PROGRESS.md) を参照してください。

## 1. 現状の課題 (Current State)

### God Object (`Game.ts`)
- `Game.ts` が1,388行を超えており、状態保持、ルール計算、フェーズ管理、カード操作、保険ロジックのすべてを担っている。
- 修正の影響範囲が予測しづらく、コンフリクトの温床になっている。

### 混在するモデル (Mixed Models)
- 旧来の `src/domain/entities/Game.ts` と、新規の `src/domain/aggregates/` が共存している。
- `GameApplicationService.ts` がどちらを扱うべきか曖昧になっている。

### テストの内部実装依存 (Brittle Tests)
- `drawCardsSync` のような、本番では使われない「テスト用同期メソッド」に依存したテストが多い。
- 非同期処理への完全移行を阻害している。

---

## 2. 対応方針 (Refactoring Strategy)

### 基本原則

1. **分解と委譲 (Decompose & Delegate)** - `Game.ts` を一度に消すのではなく、内部ロジックを独立した「小さな集約（Aggregate）」に切り出し、`Game.ts` はそれらを呼び出すだけの「ファサード（窓口）」にする。

2. **イベント駆動への統一** - メソッドの戻り値で結果を返すだけでなく、`DomainEvent` を発行して状態変化を通知する仕組みに統一する。

3. **テストのブラックボックス化** - テストは「公開API（非同期）」のみを使用するように修正し、内部実装が変わっても壊れないテストにする。

---

### Phase 1: コアロジックの抽出 (Component Extraction)

`Game.ts` を削除するのではなく、内部ロジックを以下の「サブコンポーネント（ValueObject または Entity）」に委譲する形へリファクタリングする。

#### 1.1 DeckSystem (CardInventory)

**責務**: 山札(Deck)、手札(Hand)、捨て札(Discard) の管理。

**メソッド**: `draw()`, `discard()`, `shuffle()`, `returnToDeck()`

**現状**: `CardManager.ts` として基盤は存在。`Game.ts` の `_hand`, `_deck` 操作ロジックを完全に委譲する。

```typescript
// 目標形: Game.ts での使用例
class Game {
  private readonly deckSystem: DeckSystem

  async drawCards(count: number): Promise<Card[]> {
    const result = this.deckSystem.draw(count)
    // イベントを収集
    this.collectEvents(result.events)
    return result.cards
  }
}
```

#### 1.2 InsurancePortfolio

**責務**: 加入中の保険一覧の管理、適用判定、期限切れチェック。

**メソッド**: `addPolicy()`, `evaluateCoverage()`, `tickTurns()`, `calculateTotalBurden()`

**現状**: `Insurance` 集約と `InsuranceExpirationManager` が存在。一元化が必要。

```typescript
// 目標形: InsurancePortfolio の設計
class InsurancePortfolio {
  private policies: Map<string, Insurance> = new Map()
  
  addPolicy(card: Card): DomainEvent[] {
    const insurance = Insurance.create(card)
    this.policies.set(insurance.getId().getValue(), insurance)
    return insurance.getUncommittedEvents()
  }
  
  tickTurns(): DomainEvent[] {
    const events: DomainEvent[] = []
    for (const policy of this.policies.values()) {
      events.push(...policy.decrementTurn())
      if (policy.isExpired()) {
        this.policies.delete(policy.getId().getValue())
      }
    }
    return events
  }
}
```

#### 1.3 TurnManager (PhaseSystem)

**責務**: フェーズ遷移のルール管理（Draw -> Action -> End）。

**現状**: `GameTurnManager.ts` として存在。`Game.ts` の `nextTurn()` / `phase` 変更ロジックを完全に移動。

```typescript
// 目標形: Game.ts での使用例
class Game {
  private readonly turnManager: TurnManager
  
  nextTurn(): TurnResult {
    const result = this.turnManager.advance(this.getState())
    this.collectEvents(result.events)
    return result
  }
}
```

**移行ステップ:**
1. 新しいクラスを作成（例: `src/domain/components/DeckSystem.ts`）
2. `Game.ts` のプロパティとしてインスタンス化
3. `Game.ts` のメソッド（例: `drawCards`）の中身を、新しいクラスの呼び出しに書き換える
4. テストが通ることを確認

---

### Phase 2: GameAggregate への統一 (Unification)

`Game.ts` (Entity) が薄くなった段階で、`GameAggregate.ts` (DDD Aggregate) と統合する。

**統一後のアーキテクチャ**:
```
GameAggregate
├── DeckSystem (カード管理)
├── InsurancePortfolio (保険管理)
├── TurnManager (ターン/フェーズ管理)
└── 集約ルートとしての調整機能
```

**移行手順**:
1. `GameAggregate` が全てのサブコンポーネントを保持
2. `GameApplicationService` は `GameAggregate` のみを使用
3. `useGameState` などのUI層も `GameAggregate` のインターフェースのみに依存
4. 旧 `Game.ts` を deprecated 化し、最終的に削除

---

### Phase 3: テストの健全化 (Test Sanitization)

#### `drawCardsSync` 撲滅キャンペーン

**対象メソッド**:
- `Game.drawCardsSync()` - テスト専用の同期版メソッド

**修正パターン**:
```typescript
// Before (同期版)
it('should draw cards', () => {
  const cards = game.drawCardsSync(3)
  expect(cards).toHaveLength(3)
})

// After (非同期版)
it('should draw cards', async () => {
  const cards = await game.drawCards(3)
  expect(cards).toHaveLength(3)
})
```

**削除手順**:
1. 各テストファイルで `drawCardsSync` を `await game.drawCards()` に置換
2. テスト関数を `async` に変更
3. 全テストがパスすることを確認
4. `Game.ts` から `drawCardsSync` メソッドを削除

---

## 3. 実装の進め方 (Execution Plan)

### 優先順位

| 順序 | タスク | 種別 | 理由 |
|------|--------|------|------|
| 1 | テストコードの非同期化修正 | Task | `drawCardsSync` 撲滅。これが終わらないと構造変更が難しい |
| 2 | DeckSystem 抽出 | Refactor | 最もロジックが複雑でバグりやすい「カード操作」を最初に切り出す |
| 3 | InsurancePortfolio 抽出 | Refactor | イベント駆動との相性が良い |
| 4 | TurnManager 統合 | Refactor | 既存の `GameTurnManager` を整理 |
| 5 | GameAggregate への完全移行 | Arch | 全ての参照を切り替え |

### 影響範囲

| コンポーネント | 主な変更箇所 |
|----------------|-------------|
| DeckSystem | `Game.ts`, `CardManager.ts` |
| InsurancePortfolio | `Game.ts`, `Insurance.ts`, `InsuranceExpirationManager.ts` |
| TurnManager | `Game.ts`, `GameTurnManager.ts`, `GameStageManager.ts` |
| GameAggregate | `GameApplicationService.ts`, `useGameState`, UI層全般 |

---

## 4. イベント駆動設計ガイドライン

### ドメインイベントの設計原則

1. **過去形で命名** - `CardDrawn`, `InsuranceActivated`, `TurnAdvanced`
2. **不変オブジェクト** - 作成後は変更不可
3. **最小限の情報** - 再構築に必要な情報のみを含む

### 統一イベント基盤

```typescript
// src/domain/events/DomainEvent.ts
export abstract class DomainEvent {
  readonly occurredAt: Date = new Date()
  abstract get type(): string
}

// 各コンポーネントのイベント例
export class CardsDrawnEvent extends DomainEvent {
  constructor(
    public readonly cardIds: string[],
    public readonly source: 'deck' | 'discard'
  ) { super() }
  get type() { return 'CardsDrawn' }
}

export class TurnAdvancedEvent extends DomainEvent {
  constructor(
    public readonly fromTurn: number,
    public readonly toTurn: number,
    public readonly stageChanged: boolean
  ) { super() }
  get type() { return 'TurnAdvanced' }
}
```

---

## 5. 判断基準

### いつ Game.ts にロジックを残すか

- **残す場合**: 複数のサブコンポーネントを調整する必要がある場合
- **移動する場合**: 単一の責務に収まるロジック

### コンポーネントの境界

```
✅ DeckSystem の責務
- カードのドロー
- カードの捨て札
- デッキのシャッフル
- 手札上限の管理

❌ DeckSystem に含めないもの
- カードの効果適用 → ChallengeResolution
- 保険カードの有効化 → InsurancePortfolio
```

---

## 関連ドキュメント

- [REFACTORING_PROGRESS.md](./REFACTORING_PROGRESS.md) - 進捗追跡
- [TECH_SPEC.md](../design/TECH_SPEC.md) - 技術仕様
- [TECHNICAL_DEBT.md](../development/TECHNICAL_DEBT.md) - 技術的負債
