# 段階的移行ガイド

既存のコードベースを新しい型システムと関数型プログラミングパターンに移行するための詳細なガイドです。

## 移行の原則

### 1. 非破壊的移行
- 既存のコードを壊さずに段階的に移行
- 新機能は新しいパターンで実装
- 既存機能は徐々にリファクタリング

### 2. 型安全性の向上
- `any` 型の段階的排除
- Branded Types の導入
- 厳密な型ガードの実装

### 3. エラーハンドリングの改善
- `try-catch` から `Result` 型への移行
- Railway Oriented Programming パターンの適用
- 構造化エラー型の導入

## 移行手順

### Phase 1: 基盤整備（完了）

✅ **新しい型システムの導入**
- `src/types/advanced-types.ts` - 高度な型定義
- `src/functional/` - 関数型プログラミング基盤
- `src/errors/` - Railway Oriented Programming

✅ **コード品質ツールの強化**
- ESLint設定の厳格化
- Prettier設定の最適化
- コードメトリクス監視システム

### Phase 2: エンティティの移行

#### 2.1 Cardエンティティの移行

**既存**: `src/domain/entities/Card.ts`
**新版**: `src/domain/entities/enhanced/Card.enhanced.ts`

**移行ステップ**:
1. 新しいEnhancedCardクラスの並行開発
2. 既存のCardクラスからEnhancedCardへのアダプターパターン実装
3. テストの段階的移行
4. 依存関係の段階的置き換え

```typescript
// アダプターパターンの例
import { Card as LegacyCard } from '../Card'
import { EnhancedCard } from '../enhanced/Card.enhanced'

export class CardAdapter {
  static fromLegacy(legacyCard: LegacyCard): Result<EnhancedCard, ValidationError> {
    return EnhancedCard.create({
      name: legacyCard.name,
      description: legacyCard.description,
      type: legacyCard.type,
      power: legacyCard.power,
      cost: legacyCard.cost || 0,
      rarity: 'COMMON',
      effects: legacyCard.effects || []
    })
  }

  static toLegacy(enhancedCard: EnhancedCard): LegacyCard {
    // 必要に応じて既存形式に変換
    return new LegacyCard({
      id: enhancedCard.id,
      name: enhancedCard.name,
      description: enhancedCard.description,
      type: enhancedCard.type,
      power: enhancedCard.power
    })
  }
}
```

#### 2.2 Gameエンティティの移行

**既存**: `src/domain/entities/Game.ts`
**新版**: `src/domain/entities/enhanced/Game.enhanced.ts`

**移行ステップ**:
1. 新しいGameStateの型定義
2. Railway Orientedパターンでのゲームロジック再実装
3. 不変データ構造への移行
4. 副作用の分離と型安全化

### Phase 3: サービス層の移行

#### 3.1 GameServiceの移行

**既存**: `src/domain/services/GameService.ts`
**新版**: `src/domain/services/enhanced/GameService.enhanced.ts`

**主な変更点**:
- Result型を使った統一的なエラーハンドリング
- 不変データ構造（ImmutableList、ImmutableMap）の活用
- 純粋関数中心の設計
- 副作用の明示的な分離

#### 3.2 CardFactoryの移行

```typescript
// 既存のCardFactory
export class CardFactory {
  static create(data: any): Card {
    try {
      return new Card(data)
    } catch (error) {
      throw new Error('Card creation failed')
    }
  }
}

// 新しいCardFactory
export class EnhancedCardFactory {
  static create(data: CardData): Result<EnhancedCard, ValidationError> {
    return Railway.of(data)
      .bind(d => this.validateCardData(d))
      .map(validData => EnhancedCard.fromValidData(validData))
      .run()
  }

  private static validateCardData(data: CardData): Result<CardData, ValidationError> {
    return Railway.of(data)
      .bind(d => gameValidators.cardName(d.name).mapErr(e => e))
      .bind(d => gameValidators.power(d.power).mapErr(e => e))
      .bind(d => gameValidators.cardType(d.type).mapErr(e => e))
      .run()
  }
}
```

### Phase 4: コンポーネント層の移行

#### 4.1 Vue コンポーネントでの型安全性向上

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CardId, PowerValue } from '@/types/advanced-types'
import { EnhancedCard } from '@/domain/entities/enhanced/Card.enhanced'
import { Maybe, some, none } from '@/functional/monads'

// 型安全なプロップス定義
interface Props {
  cardId: CardId
  power: PowerValue
  interactive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  interactive: true
})

// Result型を使った状態管理
const cardState = ref<Maybe<EnhancedCard>>(none())

const cardPower = computed(() => 
  cardState.value.map(card => card.power).getOr(0 as PowerValue)
)

// エラーハンドリングを含むカード操作
async function playCard(): Promise<void> {
  const result = await gameService.playCard(props.cardId)
  
  result.fold(
    error => {
      // エラーハンドリング
      console.error('Card play failed:', error.userMessage)
      showErrorNotification(error.userMessage)
    },
    newState => {
      // 成功時の処理
      updateGameState(newState)
    }
  )
}
</script>
```

#### 4.2 Composables での関数型パターン活用

```typescript
// src/composables/useEnhancedGame.ts
import { ref, computed } from 'vue'
import type { GameId, PlayerId } from '@/types/advanced-types'
import { EnhancedGameService } from '@/domain/services/enhanced/GameService.enhanced'
import { Maybe, some, none } from '@/functional/monads'
import { ImmutableList } from '@/functional/immutable'

export function useEnhancedGame() {
  const gameService = new EnhancedGameService()
  const currentGame = ref<Maybe<GameState>>(none())
  
  const isGameActive = computed(() => 
    currentGame.value
      .map(game => game.status === 'IN_PROGRESS')
      .getOr(false)
  )
  
  const playerHand = computed(() =>
    currentGame.value
      .map(game => game.hand)
      .getOr(ImmutableList.empty())
  )
  
  async function startNewGame(playerId: PlayerId, deck: EnhancedCard[]) {
    const result = await gameService.startGame(playerId, deck)
    
    result.fold(
      error => console.error('Game start failed:', error),
      newGame => currentGame.value = some(newGame)
    )
    
    return result
  }
  
  return {
    currentGame: readonly(currentGame),
    isGameActive,
    playerHand,
    startNewGame
  }
}
```

### Phase 5: テストの移行

#### 5.1 テストでの関数型パターン活用

```typescript
// src/__tests__/enhanced/Card.enhanced.test.ts
import { describe, it, expect } from 'vitest'
import { EnhancedCard } from '@/domain/entities/enhanced/Card.enhanced'
import { Result } from '@/errors/railway'

describe('EnhancedCard', () => {
  describe('creation', () => {
    it('should create a valid life card', () => {
      const result = EnhancedCard.createLifeCard('テストカード', 10)
      
      expect(result.isOk()).toBe(true)
      result.fold(
        error => fail(`Unexpected error: ${error.message}`),
        card => {
          expect(card.name).toBe('テストカード')
          expect(card.power).toBe(10)
          expect(card.isLifeCard()).toBe(true)
        }
      )
    })
    
    it('should fail validation for invalid power', () => {
      const result = EnhancedCard.createLifeCard('無効カード', -5)
      
      expect(result.isErr()).toBe(true)
      result.fold(
        error => expect(error.message).toContain('パワーは0以上'),
        card => fail('Should have failed validation')
      )
    })
  })
  
  describe('functional operations', () => {
    it('should filter by rarity correctly', () => {
      const commonCard = EnhancedCard.createLifeCard('コモン', 5).getOr(null)!
      const rareCard = EnhancedCard.createSkillCard('レア', 10, 'RARE').getOr(null)!
      
      expect(commonCard.filterByRarity('UNCOMMON').isNone()).toBe(true)
      expect(rareCard.filterByRarity('UNCOMMON').isSome()).toBe(true)
    })
  })
})
```

## 移行のベストプラクティス

### 1. 漸進的な導入
- 新機能から新しいパターンを適用
- 既存コードは必要に応じて段階的にリファクタリング
- テストを先に書いて安全性を確保

### 2. アダプターパターンの活用
- 新旧システム間の橋渡し
- 互換性を保ちながら段階的移行
- 依存関係の逆転を活用

### 3. 型安全性の段階的向上
```typescript
// Step 1: 基本的な型定義
interface User {
  id: string
  name: string
}

// Step 2: Branded Types の導入
type UserId = Brand<string, 'UserId'>
interface User {
  id: UserId
  name: string
}

// Step 3: Result型での包装
function getUser(id: UserId): Result<User, UserNotFoundError> {
  // 実装
}
```

### 4. エラーハンドリングの統一
```typescript
// 既存のエラーハンドリング
try {
  const result = dangerousOperation()
  return result
} catch (error) {
  console.error(error)
  throw error
}

// 新しいエラーハンドリング
const result = Railway.of(input)
  .bind(validateInput)
  .bind(processData)
  .bind(saveResult)
  .run()

return result.fold(
  error => handleSpecificError(error),
  success => success
)
```

## 移行の進捗管理

### 移行チェックリスト

#### Phase 2: エンティティ移行
- [ ] Card → EnhancedCard
- [ ] Game → EnhancedGame  
- [ ] Deck → EnhancedDeck
- [ ] Player → EnhancedPlayer

#### Phase 3: サービス移行
- [ ] GameService → EnhancedGameService
- [ ] CardFactory → EnhancedCardFactory
- [ ] ValidationService → 型安全バリデーション

#### Phase 4: UI層移行
- [ ] Vue コンポーネントの型安全化
- [ ] Composables の関数型パターン適用
- [ ] エラーハンドリングの統一

#### Phase 5: テスト移行
- [ ] 単体テストの関数型パターン適用
- [ ] 統合テストのResult型活用
- [ ] E2Eテストの型安全化

## トラブルシューティング

### よくある問題と解決策

1. **型エラーの解決**
   - `unknown` や `any` を避け、適切な型注釈を使用
   - 型ガードを活用して実行時安全性を確保

2. **パフォーマンスの考慮**
   - 不変データ構造のパフォーマンス特性を理解
   - 必要に応じて構造的共有を活用

3. **既存コードとの互換性**
   - アダプターパターンで段階的移行
   - ファサードパターンで複雑性を隠蔽

## 移行完了後の利点

1. **型安全性の向上**
   - コンパイル時のエラー検出
   - IDEでの優れた補完機能

2. **エラーハンドリングの改善**
   - 明示的なエラー処理
   - エラーの構造化と回復戦略

3. **保守性の向上**
   - 純粋関数による予測可能性
   - 不変データによる副作用の削減

4. **テスタビリティの向上**
   - 関数型パターンによる単体テストの簡素化
   - モックの必要性の削減

5. **開発体験の向上**
   - 型による自己文書化
   - リファクタリングの安全性