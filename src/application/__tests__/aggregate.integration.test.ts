import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GameApplicationService } from '../services/GameApplicationService'
import { Game } from '../../domain/entities/Game'
import { Card } from '../../domain/entities/Card'
import { Challenge } from '../../domain/aggregates/challenge/Challenge'
import { Insurance } from '../../domain/aggregates/insurance/Insurance'
import { CardFactory } from '../../domain/services/CardFactory'
import type { DomainEvent } from '../../domain/aggregates/challenge/events'

describe('集約間の統合テスト', () => {
  let gameService: GameApplicationService
  let game: Game
  let cardFactory: CardFactory
  let eventPublisher: vi.Mock

  beforeEach(() => {
    game = new Game()
    eventPublisher = vi.fn()
    gameService = new GameApplicationService(game, eventPublisher)
    cardFactory = new CardFactory()
  })

  describe('GameApplicationServiceを通じた集約の協調動作', () => {
    it('チャレンジの開始から解決までの一連の流れが正しく動作する', () => {
      // ゲーム開始
      gameService.startGame()
      expect(game.phase).toBe('preparation')

      // チャレンジカードを作成
      const challengeCard = new Card({
        id: 'challenge-1',
        name: '人間関係の課題',
        description: 'チャレンジテスト',
        type: 'challenge',
        power: 30,
        cost: 0,
        effects: []
      })

      // チャレンジ開始
      const challenge = gameService.startChallenge(challengeCard)
      expect(challenge).toBeInstanceOf(Challenge)
      expect(challenge.isInProgress()).toBe(true)
      expect(game.phase).toBe('challenge')

      // 対応カードを選択
      const lifeCard1 = cardFactory.createLifeCard({
        category: 'work',
        basePower: 15,
        baseCost: 5
      })
      const lifeCard2 = cardFactory.createLifeCard({
        category: 'love',
        basePower: 20,
        baseCost: 7
      })

      gameService.selectCardForChallenge(lifeCard1)
      gameService.selectCardForChallenge(lifeCard2)

      // イベントが発行されていることを確認
      expect(eventPublisher).toHaveBeenCalledTimes(2)
      expect(eventPublisher).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'CardSelectedForChallenge' })
      )

      // チャレンジ解決
      gameService.resolveChallenge()
      expect(result.isSuccess()).toBe(true)
      expect(result.getTotalPower().getValue()).toBe(35)
      expect(game.challengesCompleted).toBe(1)
    })

    it('チャレンジ失敗時のダメージ処理が正しく動作する', () => {
      gameService.startGame()

      const challengeCard = new Card({
        id: 'challenge-2',
        name: '困難な課題',
        description: '高難度チャレンジ',
        type: 'challenge',
        power: 50,
        cost: 0,
        effects: []
      })

      gameService.startChallenge(challengeCard)

      // 不十分なパワーのカードを選択
      const weakCard = cardFactory.createLifeCard({
        category: 'work',
        basePower: 10,
        baseCost: 3
      })
      gameService.selectCardForChallenge(weakCard)

      // 解決前の体力
      const vitalityBefore = game.vitality
      
      // チャレンジ解決（失敗）
      gameService.resolveChallenge()
      expect(result.isSuccess()).toBe(false)
      
      // ダメージが適用されていることを確認
      const damage = result.calculateDamage()
      expect(damage).toBe(40) // 50 - 10
      expect(game.vitality).toBe(vitalityBefore - damage)
    })
  })

  describe('Challenge集約とInsurance集約の連携', () => {
    it('保険がアクティブな状態でチャレンジ失敗時にダメージが軽減される', () => {
      gameService.startGame()
      const initialVitality = game.vitality

      // 保険カードを作成して有効化
      const insuranceCard = new Card({
        id: 'insurance-1',
        name: '健康保険',
        description: 'ダメージ軽減',
        type: 'insurance',
        power: 0,
        cost: 5,
        effects: [],
        insuranceType: 'health',
        coverage: 30,
        durationType: 'term',
        remainingTurns: 5
      })

      const insurance = gameService.activateInsurance(insuranceCard)
      expect(insurance).toBeInstanceOf(Insurance)
      expect(gameService.getActiveInsurances()).toHaveLength(1)

      // チャレンジを開始
      const challengeCard = new Card({
        id: 'challenge-3',
        name: '健康の危機',
        description: '高ダメージチャレンジ',
        type: 'challenge',
        power: 40,
        cost: 0,
        effects: []
      })

      gameService.startChallenge(challengeCard)

      // チャレンジを失敗させる（カードを選択しない）
      gameService.resolveChallenge()
      expect(result.isSuccess()).toBe(false)

      // ダメージが保険でカバーされることを確認
      const rawDamage = 40
      const expectedDamage = rawDamage - 30 // 保険のカバレッジ分を引く
      expect(game.vitality).toBe(initialVitality - expectedDamage)

      // 保険使用イベントが発行されていることを確認
      expect(eventPublisher).toHaveBeenCalledWith(
        expect.objectContaining({ 
          type: 'InsuranceUsed',
          damageAbsorbed: 30
        })
      )
    })

    it('複数の保険が順番にダメージを吸収する', () => {
      gameService.startGame()
      const initialVitality = game.vitality

      // 2つの保険を有効化
      const insurance1 = new Card({
        id: 'insurance-1',
        name: '健康保険',
        description: '第1保険',
        type: 'insurance',
        power: 0,
        cost: 3,
        effects: [],
        insuranceType: 'health',
        coverage: 20,
        durationType: 'term',
        remainingTurns: 5
      })

      const insurance2 = new Card({
        id: 'insurance-2',
        name: '生命保険',
        description: '第2保険',
        type: 'insurance',
        power: 0,
        cost: 5,
        effects: [],
        insuranceType: 'life',
        coverage: 30,
        durationType: 'whole_life'
      })

      gameService.activateInsurance(insurance1)
      gameService.activateInsurance(insurance2)
      expect(gameService.getActiveInsurances()).toHaveLength(2)

      // 大ダメージのチャレンジ
      const challengeCard = new Card({
        id: 'challenge-4',
        name: '重大な危機',
        description: '複数保険テスト',
        type: 'challenge',
        power: 60,
        cost: 0,
        effects: []
      })

      gameService.startChallenge(challengeCard)
      gameService.resolveChallenge()

      // ダメージ計算: 60 - (20 + 30) = 10
      expect(game.vitality).toBe(initialVitality - 10)
    })
  })

  describe('ドメインイベントの発行と処理', () => {
    it('全ての重要なアクションでドメインイベントが発行される', () => {
      const events: DomainEvent[] = []
      const customPublisher = vi.fn((event: DomainEvent) => {
        events.push(event)
      })
      
      const service = new GameApplicationService(game, customPublisher)
      service.startGame()

      // チャレンジ開始
      const challengeCard = new Card({
        id: 'ch-1',
        name: 'テストチャレンジ',
        description: 'イベントテスト',
        type: 'challenge',
        power: 25,
        cost: 0,
        effects: []
      })
      service.startChallenge(challengeCard)

      // カード選択
      const card = cardFactory.createLifeCard({
        category: 'work',
        basePower: 30,
        baseCost: 5
      })
      service.selectCardForChallenge(card)

      // チャレンジ解決
      service.resolveChallenge()

      // イベントの確認
      const eventTypes = events.map(e => e.type)
      expect(eventTypes).toContain('CardSelectedForChallenge')
      expect(eventTypes).toContain('ChallengeResolved')

      // イベントの詳細確認
      const resolvedEvent = events.find(e => e.type === 'ChallengeResolved')
      expect(resolvedEvent).toMatchObject({
        type: 'ChallengeResolved',
        success: true,
        totalPower: 30,
        requiredPower: 25
      })
    })

    it('保険関連のイベントが正しく発行される', () => {
      const events: DomainEvent[] = []
      const customPublisher = vi.fn((event: DomainEvent) => {
        events.push(event)
      })
      
      const service = new GameApplicationService(game, customPublisher)
      service.startGame()

      // 保険を有効化
      const insuranceCard = new Card({
        id: 'ins-1',
        name: 'テスト保険',
        description: 'イベントテスト',
        type: 'insurance',
        power: 0,
        cost: 4,
        effects: [],
        insuranceType: 'health',
        coverage: 25,
        durationType: 'term',
        remainingTurns: 3
      })

      service.activateInsurance(insuranceCard)

      // ターンを進めて保険期限をテスト
      service.nextTurn()
      service.nextTurn()
      service.nextTurn() // 3ターン目で期限切れ

      // イベントの確認
      const eventTypes = events.map(e => e.type)
      expect(eventTypes).toContain('InsuranceActivated')
      expect(eventTypes).toContain('InsuranceExpired')

      // 期限切れイベントの詳細確認
      const expiredEvent = events.find(e => e.type === 'InsuranceExpired')
      expect(expiredEvent).toBeDefined()
    })
  })

  describe('エラーケースと例外処理', () => {
    it('チャレンジ進行中に新しいチャレンジを開始しようとするとエラー', () => {
      gameService.startGame()

      const challenge1 = new Card({
        id: 'ch-1',
        name: 'チャレンジ1',
        description: 'エラーテスト',
        type: 'challenge',
        power: 20,
        cost: 0,
        effects: []
      })

      const challenge2 = new Card({
        id: 'ch-2',
        name: 'チャレンジ2',
        description: 'エラーテスト',
        type: 'challenge',
        power: 25,
        cost: 0,
        effects: []
      })

      gameService.startChallenge(challenge1)
      
      expect(() => gameService.startChallenge(challenge2))
        .toThrow('Another challenge is already in progress')
    })

    it('チャレンジがない状態でカード選択するとエラー', () => {
      gameService.startGame()

      const card = cardFactory.createLifeCard({
        category: 'work',
        basePower: 15,
        baseCost: 5
      })

      expect(() => gameService.selectCardForChallenge(card))
        .toThrow('No challenge in progress')
    })

    it('非保険カードで保険を有効化しようとするとエラー', () => {
      gameService.startGame()

      const lifeCard = cardFactory.createLifeCard({
        category: 'work',
        basePower: 20,
        baseCost: 5
      })

      expect(() => gameService.activateInsurance(lifeCard))
        .toThrow('Card must be of type "insurance"')
    })

    it('非チャレンジカードでチャレンジを開始しようとするとエラー', () => {
      gameService.startGame()

      const lifeCard = cardFactory.createLifeCard({
        category: 'work',
        basePower: 20,
        baseCost: 5
      })

      expect(() => gameService.startChallenge(lifeCard))
        .toThrow('Challenge card must be of type "challenge"')
    })
  })
})