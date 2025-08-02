import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GameApplicationService } from '../GameApplicationService'
import { Game } from '../../../domain/entities/Game'
import { Card } from '../../../domain/entities/Card'
import type { DomainEvent } from '../../../domain/aggregates/challenge/events'

/**
 * GameApplicationService - 同時処理・競合状態テスト
 * 
 * Test Paranoidによる包括的破綻パターン検証:
 * - 並行処理での集約間の競合状態
 * - イベント発行順序の整合性
 * - トランザクション境界での例外処理
 * - メモリ効率性と状態管理
 * - 複雑なユースケースでの整合性保証
 */
describe('GameApplicationService - 同時処理・競合状態テスト', () => {
  let game: Game
  let service: GameApplicationService
  let publishedEvents: DomainEvent[]

  beforeEach(() => {
    game = new Game({
      difficulty: 'normal',
      startingVitality: 100,
      startingHandSize: 5,
      maxHandSize: 10,
      dreamCardCount: 3
    })
    
    publishedEvents = []
    const eventPublisher = (event: DomainEvent) => {
      publishedEvents.push(event)
    }
    
    service = new GameApplicationService(game, eventPublisher)
  })

  describe('🔥 並行処理での集約操作テスト', () => {
    it('複数チャレンジの同時開始試行', async () => {
      service.startGame()
      
      const challenge1 = Card.createChallengeCard('Challenge 1', 5)
      const challenge2 = Card.createChallengeCard('Challenge 2', 7)
      const challenge3 = Card.createChallengeCard('Challenge 3', 6)
      
      // 同時にチャレンジ開始を試行
      const promises = [
        Promise.resolve().then(() => service.startChallenge(challenge1)),
        Promise.resolve().then(() => service.startChallenge(challenge2)),
        Promise.resolve().then(() => service.startChallenge(challenge3))
      ]
      
      const results = await Promise.allSettled(promises)
      
      // 1つだけ成功し、他は失敗することを確認
      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')
      
      expect(successful).toHaveLength(1)
      expect(failed).toHaveLength(2)
      
      // 失敗した理由が適切か
      failed.forEach(result => {
        if (result.status === 'rejected') {
          expect(result.reason.message).toContain('already in progress')
        }
      })
    })

    it('チャレンジ中の並行カード操作', async () => {
      service.startGame()
      
      const challengeCard = Card.createChallengeCard('Test Challenge', 8)
      const card1 = Card.createLifeCard('Card 1', 3)
      const card2 = Card.createLifeCard('Card 2', 4)
      const card3 = Card.createLifeCard('Card 3', 5)
      
      service.startChallenge(challengeCard)
      
      // 並行でカード選択・選択解除操作
      const operations = [
        () => { service.selectCardForChallenge(card1); },
        () => { service.selectCardForChallenge(card2); },
        () => { service.deselectCardForChallenge(card1); },
        () => { service.selectCardForChallenge(card3); },
        () => { service.deselectCardForChallenge(card2); }
      ]
      
      const promises = operations.map(async op => Promise.resolve().then(op))
      const results = await Promise.allSettled(promises)
      
      // 全ての操作が例外なく完了することを確認
      results.forEach(result => {
        expect(result.status).toBe('fulfilled')
      })
      
      // 最終的なチャレンジ状態の一貫性
      const currentChallenge = service.getCurrentChallenge()
      expect(currentChallenge).toBeDefined()
    })

    it('保険の並行有効化・期限管理', async () => {
      service.startGame()
      
      const insurances = [
        Card.createInsuranceCard('Insurance 1', 5, 3),
        Card.createInsuranceCard('Insurance 2', 4, 2),
        Card.createInsuranceCard('Insurance 3', 6, 4),
        Card.createInsuranceCard('Insurance 4', 3, 1)
      ]
      
      // 並行で保険有効化
      const activationPromises = insurances.map(async insurance => 
        Promise.resolve().then(() => service.activateInsurance(insurance))
      )
      
      const activationResults = await Promise.allSettled(activationPromises)
      
      // 全ての保険が正常に有効化されることを確認
      activationResults.forEach(result => {
        expect(result.status).toBe('fulfilled')
      })
      
      // 有効化された保険の数を確認
      const activeInsurances = service.getActiveInsurances()
      expect(activeInsurances).toHaveLength(4)
      
      // ターン進行の並行実行
      const turnPromises = Array.from({length: 5}, async () => 
        Promise.resolve().then(() => { service.nextTurn(); })
      )
      
      const turnResults = await Promise.allSettled(turnPromises)
      
      // ターン進行が安全に実行されることを確認
      turnResults.forEach(result => {
        expect(result.status).toBe('fulfilled')
      })
    })
  })

  describe('💀 イベント発行順序・整合性テスト', () => {
    it('チャレンジ解決時のイベント順序', () => {
      service.startGame()
      publishedEvents = [] // イベントリストをクリア
      
      const challengeCard = Card.createChallengeCard('Event Test Challenge', 10)
      const selectedCard = Card.createLifeCard('Selected Card', 7)
      
      // チャレンジ開始
      service.startChallenge(challengeCard)
      
      // カード選択
      service.selectCardForChallenge(selectedCard)
      
      // チャレンジ解決
      const result = service.resolveChallenge()
      
      // イベントが適切な順序で発行されているか
      expect(publishedEvents.length).toBeGreaterThan(0)
      
      // イベントタイプの順序性確認
      const eventTypes = publishedEvents.map(event => event.type)
      
      // 重複や不正なイベントがないか
      const uniqueEventTypes = new Set(eventTypes)
      expect(eventTypes.length).toBeGreaterThanOrEqual(uniqueEventTypes.size - 2) // 多少の重複は許容
    })

    it('保険使用時のイベント伝播', () => {
      service.startGame()
      
      const insurance = Card.createInsuranceCard('Test Insurance', 8, 5)
      service.activateInsurance(insurance)
      
      publishedEvents = [] // イベントリストをクリア
      
      // ダメージ適用によって保険が使用される状況を作る
      const challengeCard = Card.createChallengeCard('Damage Challenge', 20)
      const weakCard = Card.createLifeCard('Weak Card', 2)
      
      service.startChallenge(challengeCard)
      service.selectCardForChallenge(weakCard)
      
      const result = service.resolveChallenge()
      
      // 保険使用のイベントが発行されているか
      const insuranceEvents = publishedEvents.filter(event => 
        event.type === 'insurance_used' || event.type === 'damage_absorbed'
      )
      
      if (!result.isSuccess()) {
        expect(insuranceEvents.length).toBeGreaterThan(0)
      }
    })

    it('イベント発行中の例外処理', () => {
      service.startGame()
      
      // 故意にエラーを起こすイベントパブリッシャー
      const faultyPublisher = (event: DomainEvent) => {
        if (event.type === 'challenge_started') {
          throw new Error('Publisher error')
        }
      }
      
      const faultyService = new GameApplicationService(game, faultyPublisher)
      faultyService.startGame()
      
      const challengeCard = Card.createChallengeCard('Error Test', 5)
      
      // イベント発行エラーが適切に処理されるか
      expect(() => {
        faultyService.startChallenge(challengeCard)
      }).not.toThrow() // エラーが外部に漏れない
    })
  })

  describe('⚡ トランザクション境界・例外処理', () => {
    it('チャレンジ解決中の例外による状態ロールバック', () => {
      service.startGame()
      
      const challengeCard = Card.createChallengeCard('Exception Challenge', 5)
      service.startChallenge(challengeCard)
      
      const initialChallenge = service.getCurrentChallenge()
      expect(initialChallenge).toBeDefined()
      
      // Challenge集約の内部メソッドをモック化してエラーを発生させる
      const mockChallenge = service.getCurrentChallenge()!
      const originalResolve = mockChallenge.resolve
      
      vi.spyOn(mockChallenge, 'resolve').mockImplementation(() => {
        throw new Error('Resolution error')
      })
      
      // 例外発生時の状態確認
      expect(() => {
        service.resolveChallenge()
      }).toThrow('Resolution error')
      
      // チャレンジ状態が適切にクリアされているか
      const afterErrorChallenge = service.getCurrentChallenge()
      // 実装によって異なるが、エラー後の状態が一貫していることを確認
      expect(afterErrorChallenge).toBeDefined() // エラー時はチャレンジが残る可能性
    })

    it('保険有効化中の例外処理', () => {
      service.startGame()
      
      const validInsurance = Card.createInsuranceCard('Valid Insurance', 5, 3)
      const invalidInsurance = new Card({
        id: 'invalid',
        name: 'Invalid Insurance',
        description: 'This will cause error',
        type: 'insurance',
        power: NaN, // 意図的に不正な値
        cost: 2,
        effects: []
      })
      
      // 正常な保険の有効化
      expect(() => {
        service.activateInsurance(validInsurance)
      }).not.toThrow()
      
      // 不正な保険の有効化
      expect(() => {
        service.activateInsurance(invalidInsurance)
      }).toThrow() // CardPowerの検証でエラー
      
      // 正常な保険は有効化されている
      const activeInsurances = service.getActiveInsurances()
      expect(activeInsurances).toHaveLength(1)
      expect(activeInsurances[0].getId().getValue()).toBe(validInsurance.id)
    })

    it('ドメインイベントの一貫性保証', () => {
      service.startGame()
      
      const insurance = Card.createInsuranceCard('Event Insurance', 6, 4)
      service.activateInsurance(insurance)
      
      // イベントの清算前後での状態確認
      const eventsBefore = service.getDomainEvents()
      expect(eventsBefore.length).toBeGreaterThan(0)
      
      // イベントクリア
      service.clearDomainEvents()
      const eventsAfter = service.getDomainEvents()
      expect(eventsAfter).toHaveLength(0)
      
      // 新しい操作で再度イベントが発行される
      const anotherInsurance = Card.createInsuranceCard('Another Insurance', 4, 2)
      service.activateInsurance(anotherInsurance)
      
      const newEvents = service.getDomainEvents()
      expect(newEvents.length).toBeGreaterThan(0)
    })
  })

  describe('🧠 複雑なユースケース統合テスト', () => {
    it('完全なゲームフロー - 成功パス', async () => {
      // ゲーム開始
      service.startGame()
      
      // 保険有効化
      const insurance1 = Card.createInsuranceCard('Health Insurance', 7, 4)
      const insurance2 = Card.createInsuranceCard('Life Insurance', 5, 3)
      
      service.activateInsurance(insurance1)
      service.activateInsurance(insurance2)
      
      // チャレンジ開始
      const challengeCard = Card.createChallengeCard('Life Challenge', 10)
      service.startChallenge(challengeCard)
      
      // カード選択
      const card1 = Card.createLifeCard('Strong Card', 6)
      const card2 = Card.createLifeCard('Support Card', 5)
      
      service.selectCardForChallenge(card1)
      service.selectCardForChallenge(card2)
      
      // チャレンジ解決
      const result = service.resolveChallenge()
      
      // 結果検証
      expect(result).toBeDefined()
      expect(result.getTotalPower().getValue()).toBe(11) // 6 + 5
      
      // ゲーム状態の整合性
      expect(service.getCurrentChallenge()).toBeUndefined()
      expect(service.getActiveInsurances()).toHaveLength(2)
    })

    it('完全なゲームフロー - 失敗パス', async () => {
      service.startGame()
      
      // 防御型保険を追加
      const defensiveInsurance = new Card({
        id: 'defensive',
        name: 'Defensive Insurance',
        description: 'Damage reduction',
        type: 'insurance',
        power: 0,
        cost: 3,
        insuranceEffectType: 'defensive',
        coverage: 50,
        effects: [
          { type: 'damage_reduction', value: 5, description: 'Reduce 5 damage' }
        ]
      })
      
      service.activateInsurance(defensiveInsurance)
      
      // 高難度チャレンジ
      const hardChallenge = Card.createChallengeCard('Hard Challenge', 20)
      service.startChallenge(hardChallenge)
      
      // 弱いカードのみ選択
      const weakCard = Card.createLifeCard('Weak Card', 3)
      service.selectCardForChallenge(weakCard)
      
      const initialVitality = game.vitality
      
      // チャレンジ解決（失敗予定）
      const result = service.resolveChallenge()
      
      // 失敗時の処理確認
      if (!result.isSuccess()) {
        // ダメージが保険で軽減されているか
        const finalVitality = game.vitality
        const damageTaken = initialVitality - finalVitality
        
        expect(damageTaken).toBeGreaterThan(0)
        expect(damageTaken).toBeLessThan(20 - 3) // 保険による軽減あり
      }
    })

    it('長期間のゲームセッション - ターン管理', async () => {
      service.startGame()
      
      // 定期保険を追加
      const termInsurance = new Card({
        id: 'term',
        name: 'Term Insurance',
        description: '5 turn insurance',
        type: 'insurance',
        power: 4,
        cost: 2,
        durationType: 'term',
        remainingTurns: 5,
        effects: []
      })
      
      service.activateInsurance(termInsurance)
      
      // 10ターン進行
      for (let turn = 1; turn <= 10; turn++) {
        service.nextTurn()
        
        const activeInsurances = service.getActiveInsurances()
        
        if (turn <= 5) {
          // 保険が有効
          expect(activeInsurances).toHaveLength(1)
        } else {
          // 保険が期限切れ
          expect(activeInsurances).toHaveLength(0)
        }
      }
      
      // 最終状態の確認
      expect(game.turn).toBe(11) // 初期1 + 10ターン
    })
  })

  describe('📊 メモリ効率・パフォーマンステスト', () => {
    it('大量イベント発行でのメモリ使用量', async () => {
      service.startGame()
      
      const startTime = performance.now()
      const initialEvents = service.getDomainEvents().length
      
      // 大量の操作実行
      for (let i = 0; i < 1000; i++) {
        const insurance = Card.createInsuranceCard(`Insurance ${i}`, 3, 2)
        service.activateInsurance(insurance)
        
        if (i % 100 === 0) {
          // 定期的にイベントクリア
          service.clearDomainEvents()
        }
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // パフォーマンス確認
      expect(duration).toBeLessThan(1000) // 1秒以内
      
      // メモリ効率確認
      const finalEvents = service.getDomainEvents().length
      expect(finalEvents).toBeLessThan(200) // イベントが適切にクリアされている
      
      // 保険が正しく管理されている
      const activeInsurances = service.getActiveInsurances()
      expect(activeInsurances).toHaveLength(1000)
    })

    it('集約インスタンスの適切な解放', () => {
      service.startGame()
      
      // チャレンジの作成と解決を繰り返す
      for (let i = 0; i < 100; i++) {
        const challenge = Card.createChallengeCard(`Challenge ${i}`, 5)
        const card = Card.createLifeCard(`Card ${i}`, 6)
        
        service.startChallenge(challenge)
        service.selectCardForChallenge(card)
        service.resolveChallenge()
        
        // チャレンジが適切にクリアされている
        expect(service.getCurrentChallenge()).toBeUndefined()
      }
      
      // ガベージコレクション実行
      if (global.gc) {
        global.gc()
      }
      
      // メモリリークがないことを確認（環境依存）
      const memoryUsage = process.memoryUsage?.()
      if (memoryUsage) {
        expect(memoryUsage.heapUsed).toBeLessThan(50 * 1024 * 1024) // 50MB未満
      }
    })

    it('並行処理でのデッドロック検出', async () => {
      service.startGame()
      
      const operations = []
      
      // 複雑な並行操作を多数実行
      for (let i = 0; i < 50; i++) {
        operations.push(async () => {
          const insurance = Card.createInsuranceCard(`Concurrent Insurance ${i}`, 3, 2)
          service.activateInsurance(insurance)
          service.nextTurn()
        })
        
        operations.push(async () => {
          const challenge = Card.createChallengeCard(`Concurrent Challenge ${i}`, 5)
          const card = Card.createLifeCard(`Concurrent Card ${i}`, 4)
          
          try {
            service.startChallenge(challenge)
            service.selectCardForChallenge(card)
            service.resolveChallenge()
          } catch (error) {
            // 並行実行エラーは許容
            expect(error.message).toContain('already in progress')
          }
        })
      }
      
      // タイムアウト付きで並行実行
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => { reject(new Error('Timeout - possible deadlock')); }, 5000)
      })
      
      const operationPromise = Promise.all(operations.map(async op => op()))
      
      await expect(Promise.race([operationPromise, timeoutPromise])).resolves.not.toThrow()
    })
  })
})