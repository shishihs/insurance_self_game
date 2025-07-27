# TDD/DDD分析レポート - 保険ゲームアーキテクチャ

> **最終更新**: 2025/01/27  
> **文書種別**: 正式仕様書  
> **更新頻度**: 定期的

## 🔍 現状分析

### 1. ドメイン層の分離状況

#### 良い点 ✅
- `src/domain/` にドメインロジックが集約されている
- エンティティ (`Card`, `Game`, `Deck`) が明確に定義されている
- ドメインサービス (`CardFactory`, `CardManager`) が存在
- 型定義が `types/` に整理されている

#### 問題点 ❌
- **UI層への依存**: `GameScene` が巨大で、ビジネスロジックとUI処理が混在
- **テスト不足**: ドメインモデルのテストカバレッジが低い
- **集約の境界が不明確**: `Game` エンティティが過度に多くの責務を持つ
- **ドメインイベントの欠如**: 状態変更の通知メカニズムがない

### 2. t-wadaさんのプラクティスとの比較

#### 現状の乖離
1. **テストファースト開発の不徹底**
   - 実装後にテストを書いている形跡
   - テストが仕様を表現していない

2. **値オブジェクトの不足**
   - プリミティブ型の使いすぎ（例: `vitality: number`）
   - ビジネスルールが分散している

3. **副作用の管理**
   - ドメインモデル内で直接状態を変更
   - 純粋関数の不足

## 🎯 改善提案

### 1. ドメインモデルの純粋性向上

```typescript
// Before: 副作用を含むメソッド
class Game {
  startChallenge(challengeCard: Card): void {
    this.currentChallenge = challengeCard
    this.phase = 'challenge'
    // 直接状態を変更している
  }
}

// After: イベントソーシングパターン
class Game {
  startChallenge(challengeCard: Card): DomainEvent[] {
    const events: DomainEvent[] = []
    
    if (!this.canStartChallenge()) {
      throw new CannotStartChallengeError()
    }
    
    events.push(new ChallengeStartedEvent(this.id, challengeCard.id))
    return events
  }
  
  // イベントから状態を再構築
  apply(event: DomainEvent): Game {
    switch (event.type) {
      case 'ChallengeStarted':
        return new Game({
          ...this,
          currentChallenge: event.challengeCard,
          phase: 'challenge'
        })
    }
  }
}
```

### 2. 値オブジェクトの導入

```typescript
// 活力を値オブジェクトとして定義
export class Vitality {
  private constructor(
    private readonly value: number,
    private readonly max: number
  ) {
    if (value < 0 || value > max) {
      throw new InvalidVitalityError()
    }
  }
  
  static create(value: number, max: number): Vitality {
    return new Vitality(value, max)
  }
  
  decrease(amount: number): Vitality {
    return new Vitality(Math.max(0, this.value - amount), this.max)
  }
  
  increase(amount: number): Vitality {
    return new Vitality(Math.min(this.max, this.value + amount), this.max)
  }
  
  get percentage(): number {
    return (this.value / this.max) * 100
  }
  
  isDepleted(): boolean {
    return this.value === 0
  }
}
```

### 3. 集約の再設計

```typescript
// チャレンジを独立した集約として分離
export class Challenge {
  private constructor(
    public readonly id: ChallengeId,
    public readonly card: Card,
    public readonly requiredPower: number,
    private selectedCards: Card[] = [],
    private status: ChallengeStatus = 'in_progress'
  ) {}
  
  static create(card: Card): Challenge {
    return new Challenge(
      ChallengeId.generate(),
      card,
      card.power
    )
  }
  
  selectCard(card: Card): DomainEvent[] {
    if (this.status !== 'in_progress') {
      throw new ChallengeAlreadyResolvedError()
    }
    
    return [new CardSelectedForChallengeEvent(this.id, card.id)]
  }
  
  resolve(): ChallengeResult {
    const totalPower = this.selectedCards.reduce((sum, card) => sum + card.power, 0)
    const isSuccess = totalPower >= this.requiredPower
    
    return new ChallengeResult(
      this.id,
      isSuccess,
      totalPower,
      this.requiredPower
    )
  }
}
```

### 4. アプリケーションサービスの導入

```typescript
export class GameApplicationService {
  constructor(
    private gameRepository: GameRepository,
    private eventStore: EventStore,
    private eventPublisher: EventPublisher
  ) {}
  
  async startChallenge(gameId: string, challengeCardId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId)
    if (!game) throw new GameNotFoundError()
    
    const challengeCard = game.findCardById(challengeCardId)
    if (!challengeCard) throw new CardNotFoundError()
    
    // ドメインロジックの実行
    const events = game.startChallenge(challengeCard)
    
    // イベントの永続化
    await this.eventStore.saveEvents(events)
    
    // イベントの発行（UIへの通知）
    events.forEach(event => this.eventPublisher.publish(event))
  }
}
```

### 5. テストファーストの実践

```typescript
describe('Challenge', () => {
  describe('カード選択', () => {
    it('チャレンジ中はカードを選択できる', () => {
      // Given
      const challengeCard = CardFactory.createChallengeCard('事故', 30)
      const challenge = Challenge.create(challengeCard)
      const lifeCard = CardFactory.createLifeCard('日常', 10)
      
      // When
      const events = challenge.selectCard(lifeCard)
      
      // Then
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(CardSelectedForChallengeEvent)
      expect(events[0].cardId).toBe(lifeCard.id)
    })
    
    it('解決済みのチャレンジではカードを選択できない', () => {
      // Given
      const challenge = createResolvedChallenge()
      const card = CardFactory.createLifeCard('日常', 10)
      
      // When/Then
      expect(() => challenge.selectCard(card))
        .toThrow(ChallengeAlreadyResolvedError)
    })
  })
})
```

## 📋 実装ロードマップ

### Phase 1: 値オブジェクトの導入（1週間）
- [ ] Vitality値オブジェクトの実装
- [ ] CardPower値オブジェクトの実装
- [ ] InsurancePremium値オブジェクトの実装
- [ ] 既存コードのリファクタリング

### Phase 2: 集約の再設計（2週間）
- [ ] Challenge集約の分離
- [ ] Insurance集約の作成
- [ ] Game集約の責務削減
- [ ] リポジトリパターンの実装

### Phase 3: イベントソーシング（2週間）
- [ ] ドメインイベントの定義
- [ ] イベントストアの実装
- [ ] イベントパブリッシャーの実装
- [ ] UI層へのイベント通知

### Phase 4: テストの充実（継続的）
- [ ] ユニットテストのカバレッジ向上（目標: 90%）
- [ ] プロパティベーステストの導入
- [ ] 仕様テストの整備

## 🎓 参考資料

### t-wada流TDD
- テストが仕様書となるように書く
- Red-Green-Refactorサイクルの厳守
- テストの可読性を最優先

### エヴァンス流DDD
- ユビキタス言語の徹底
- 境界づけられたコンテキストの明確化
- 集約の不変条件の保護

## ✅ チェックリスト

### ドメイン層の純粋性
- [ ] ドメインモデルはフレームワーク非依存か？
- [ ] ビジネスロジックがUIから分離されているか？
- [ ] 副作用が適切に管理されているか？

### テスタビリティ
- [ ] ユニットテストが書きやすいか？
- [ ] モックを多用していないか？
- [ ] テストが仕様を表現しているか？

### 保守性
- [ ] 新機能追加が既存コードに影響しないか？
- [ ] ビジネスルールの変更が容易か？
- [ ] コードが自己文書化されているか？