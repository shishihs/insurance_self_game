# Architecture Refactoring Strategy

## 1. 現状の課題 (Current State)

### God Object (`Game.ts`)
- `Game.ts` が1,000行を超えており、状態保持、ルール計算、フェーズ管理、カード操作、保険ロジックのすべてを担っている。
- 修正の影響範囲が予測しづらく、コンフリクトの温床になっている。

### 混在するモデル (Mixed Models)
- 旧来の `src/domain/entities/Game.ts` と、新規の `src/domain/aggregates/GameAggregate.ts` が共存している。
- `GameApplicationService.ts` がどちらを扱うべきか曖昧になっている（今回の対応でキャスト修正が必要になった原因）。

### テストの内部実装依存 (Brittle Tests)
- `drawCardsSync` のような、本番では使われない「テスト用同期メソッド」に依存したテストが多い。
- 非同期処理への完全移行を阻害している。

---

## 2. 対応方針 (Refactoring Strategy)

### Phase 1: コアロジックの抽出 (Component Extraction)
`Game.ts` を削除するのではなく、内部ロジックを以下の「サブコンポーネント（ValueObject または Entity）」に委譲する形へリファクタリングする。

1.  **DeckSystem (CardInventory)**
    *   責務: 山札(Deck)、手札(Hand)、捨て札(Discard) の管理。
    *   メソッド: `draw()`, `discard()`, `shuffle()`, `returnToDeck()`
    *   現状の `_hand`, `_deck` などの配列操作ロジックをここに移動。

2.  **InsurancePortfolio**
    *   責務: 加入中の保険一覧の管理、適用判定、期限切れチェック。
    *   メソッド: `addPolicy()`, `evaluateCoverage()`, `tickTurns()`

3.  **TurnManager (PhaseSystem)**
    *   責務: フェーズ遷移のルール管理（Draw -> Action -> End）。
    *   `Game.ts` の `nextTurn()` や `phase` 変更ロジックを移動。

**移行ステップ:**
1. 新しいクラスを作成（例: `src/domain/components/DeckSystem.ts`）。
2. `Game.ts` のプロパティとしてインスタンス化。
3. `Game.ts` のメソッド（例: `drawCards`）の中身を、新しいクラスの呼び出しに書き換える。
4. テストが通ることを確認。

### Phase 2: GameAggregate への統一 (Unification)
`Game.ts` (Entity) が薄くなった段階で、`GameAggregate.ts` (DDD Aggregate) と統合する。
- 最終的に `GameApplicationService` は `GameAggregate` のみを扱うようにする。
- `useGameState` などのUI層も `GameAggregate` のインターフェースのみに依存させる。

### Phase 3: テストの健全化 (Test Sanitization)
内部実装に依存するテストを排除する。

- **Action**: `drawCardsSync` を使用しているテスト (`CardFactory.paranoid-random.test.ts` など) を特定。
- **Modification**: `await game.drawCards()` を使用するように書き換える。
- **Removal**: `drawCardsSync` メソッドを `Game.ts` から完全に削除する。

---

## 3. 実装の進め方 (Execution Plan)

並行開発が終わった後、以下の順序で実施することを推奨する。

1. **[Refactor] Deck System抽出**
    - 最もロジックが複雑でバグりやすい「カード操作」を最初に切り出す。
    - 影響範囲: `Game.ts`, `CardManager.ts`

2. **[Refactor] Insurance System抽出**
    - イベント駆動 (`InsuranceUsedEvent`など) と相性が良いため、イベント発行ロジックを含めて整理する。

3. **[Task] テストコードの非同期化修正**
    - `drawCardsSync` 撲滅キャンペーン。これが終わらないと `Game.ts` の構造変更が難しい。

4. **[Arch] GameAggregate への完全移行**
    - 既存の `src/domain/entities/Game.ts` を廃止し、全ての参照を `aggregates/GameAggregate` に切り替える。
