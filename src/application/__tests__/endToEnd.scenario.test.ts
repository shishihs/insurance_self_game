import { describe, it, expect, beforeEach } from 'vitest'
import { GameApplicationService } from '../services/GameApplicationService'
import { Game } from '../../domain/entities/Game'
import { Card } from '../../domain/entities/Card'
import { CardFactory } from '../../domain/services/CardFactory'
import { Deck } from '../../domain/entities/Deck'

describe('エンドツーエンドシナリオテスト', () => {
  let gameService: GameApplicationService
  let game: Game
  let cardFactory: CardFactory

  beforeEach(() => {
    game = new Game()
    gameService = new GameApplicationService(game)
    cardFactory = new CardFactory()
  })

  describe('ゲーム開始からチャレンジ解決までの一連の流れ', () => {
    it('典型的なゲームプレイシナリオが正しく動作する', () => {
      // 1. ゲーム開始
      gameService.startGame()
      expect(game.phase).toBe('preparation')
      expect(game.stage).toBe('youth')
      expect(game.vitality).toBe(100)
      expect(game.turn).toBe(1)

      // 2. 初期デッキの準備
      const lifeDeck = new Deck('ライフカードデッキ')
      const insuranceDeck = new Deck('保険カードデッキ')
      const challengeDeck = new Deck('チャレンジカードデッキ')

      // ライフカードを追加
      for (let i = 0; i < 5; i++) {
        lifeDeck.addCard(cardFactory.createLifeCard({
          category: 'work',
          basePower: 10 + i * 5,
          baseCost: 3 + i * 2
        }))
      }

      // 保険カードを追加
      insuranceDeck.addCard(new Card({
        id: 'insurance-health-1',
        name: '健康保険',
        description: '健康リスクをカバー',
        type: 'insurance',
        power: 0,
        cost: 5,
        effects: [],
        insuranceType: 'health',
        coverage: 25,
        durationType: 'term',
        remainingTurns: 5
      }))

      // チャレンジカードを追加
      challengeDeck.addCard(new Card({
        id: 'challenge-work-1',
        name: '仕事のプレッシャー',
        description: '締め切りに追われる',
        type: 'challenge',
        power: 25,
        cost: 0,
        effects: []
      }))

      // 3. drawフェーズに移行
      game.phase = 'draw'
      
      // 4. 最初のチャレンジ
      const firstChallenge = challengeDeck.drawCard()!
      const challenge = gameService.startChallenge(firstChallenge)
      expect(game.phase).toBe('challenge')
      expect(challenge.getRequiredPower().getValue()).toBe(25)

      // 4. 対応カードを選択
      const responseCards = lifeDeck.drawCards(3)
      responseCards.forEach(card => {
        gameService.selectCardForChallenge(card)
      })

      // 5. チャレンジ解決
      const result = gameService.resolveChallenge()
      expect(result.isSuccess()).toBe(true)
      expect(game.challengesCompleted).toBe(1)

      // 6. 保険の購入
      const insuranceCard = insuranceDeck.drawCard()!
      const insurance = gameService.activateInsurance(insuranceCard)
      expect(insurance.isActive()).toBe(true)
      expect(gameService.getActiveInsurances()).toHaveLength(1)

      // 7. ターンを進める
      gameService.nextTurn()
      expect(game.turn).toBe(2)
      
      // 保険の残りターン数が減少
      const activeInsurance = gameService.getActiveInsurances()[0]
      expect(activeInsurance.getRemainingTurns()).toBe(4)

      // 8. 年齢段階の進行確認（10ターンで中年期へ）
      for (let i = 0; i < 8; i++) {
        gameService.nextTurn()
      }
      expect(game.turn).toBe(10)
      expect(game.stage).toBe('middle_age')
    })

    it('保険を活用した高難度チャレンジ攻略シナリオ', () => {
      gameService.startGame()

      // 複数の保険を準備
      const healthInsurance = new Card({
        id: 'ins-health',
        name: '健康保険',
        description: 'ヘルスケア',
        type: 'insurance',
        power: 0,
        cost: 4,
        effects: [],
        insuranceType: 'health',
        coverage: 20,
        durationType: 'term',
        remainingTurns: 10,
        insuranceEffectType: 'defensive'
      })

      const lifeInsurance = new Card({
        id: 'ins-life',
        name: '生命保険',
        description: '万が一に備える',
        type: 'insurance',
        power: 0,
        cost: 6,
        effects: [],
        insuranceType: 'life',
        coverage: 40,
        durationType: 'whole_life',
        insuranceEffectType: 'defensive'
      })

      // 保険を有効化
      gameService.activateInsurance(healthInsurance)
      gameService.activateInsurance(lifeInsurance)

      // 高難度チャレンジ
      const hardChallenge = new Card({
        id: 'challenge-hard',
        name: '重大な健康問題',
        description: '大きな試練',
        type: 'challenge',
        power: 60,
        cost: 0,
        effects: []
      })

      // drawフェーズに移行
      game.phase = 'draw'
      
      gameService.startChallenge(hardChallenge)

      // 部分的な対応しかできない
      const weakCard = cardFactory.createLifeCard({
        category: 'health',
        basePower: 20,
        baseCost: 5
      })
      gameService.selectCardForChallenge(weakCard)

      // 初期体力を記録
      const vitalityBefore = game.vitality

      // チャレンジ解決（失敗）
      const result = gameService.resolveChallenge()
      expect(result.isSuccess()).toBe(false)

      // ダメージ計算: 60 - 20 = 40
      // 保険でカバー: 20 (health) + 40の一部 (life) = 40
      // 実際のダメージ: 0
      expect(game.vitality).toBe(vitalityBefore)
    })
  })

  describe('保険の使用とダメージ軽減', () => {
    it('定期保険の期限管理が正しく動作する', () => {
      gameService.startGame()

      // 定期保険を有効化
      const termInsurance = new Card({
        id: 'term-ins',
        name: '定期保険',
        description: '期限付き保障',
        type: 'insurance',
        power: 0,
        cost: 3,
        effects: [],
        insuranceType: 'health',
        coverage: 30,
        durationType: 'term',
        remainingTurns: 3
      })

      gameService.activateInsurance(termInsurance)
      const insurance = gameService.getActiveInsurances()[0]

      // 初期状態
      expect(insurance.isActive()).toBe(true)
      expect(insurance.getRemainingTurns()).toBe(3)

      // 3ターン経過させる
      gameService.nextTurn()
      expect(insurance.getRemainingTurns()).toBe(2)
      
      gameService.nextTurn()
      expect(insurance.getRemainingTurns()).toBe(1)
      
      gameService.nextTurn()
      expect(insurance.getRemainingTurns()).toBe(0)
      expect(insurance.isExpired()).toBe(true)

      // 期限切れ保険はアクティブリストから削除される
      expect(gameService.getActiveInsurances()).toHaveLength(0)
    })

    it('終身保険は期限なく継続する', () => {
      gameService.startGame()

      // 終身保険を有効化
      const wholeLifeInsurance = new Card({
        id: 'whole-life',
        name: '終身保険',
        description: '一生涯保障',
        type: 'insurance',
        power: 0,
        cost: 10,
        effects: [],
        insuranceType: 'life',
        coverage: 50,
        durationType: 'whole_life'
      })

      gameService.activateInsurance(wholeLifeInsurance)
      const insurance = gameService.getActiveInsurances()[0]

      // 多数のターンを経過させても有効
      for (let i = 0; i < 20; i++) {
        gameService.nextTurn()
      }

      expect(insurance.isActive()).toBe(true)
      expect(insurance.getRemainingTurns()).toBeUndefined()
      expect(gameService.getActiveInsurances()).toHaveLength(1)
    })

    it('複数チャレンジでの保険の累積使用', () => {
      gameService.startGame()

      // 高カバレッジの保険を有効化
      const insurance = new Card({
        id: 'multi-use',
        name: '包括保険',
        description: '複数回使用可能',
        type: 'insurance',
        power: 0,
        cost: 8,
        effects: [],
        insuranceType: 'health',
        coverage: 15,
        durationType: 'whole_life'
      })

      gameService.activateInsurance(insurance)
      const activeInsurance = gameService.getActiveInsurances()[0]

      // 複数のチャレンジで保険を使用
      const challenges = [
        { power: 20, response: 10 }, // ダメージ10
        { power: 25, response: 15 }, // ダメージ10
        { power: 30, response: 20 }  // ダメージ10
      ]

      let totalDamageAbsorbed = 0

      challenges.forEach(({ power, response }, index) => {
        const challengeCard = new Card({
          id: `ch-${index}`,
          name: `チャレンジ${index + 1}`,
          description: '連続チャレンジ',
          type: 'challenge',
          power,
          cost: 0,
          effects: []
        })

        const responseCard = cardFactory.createLifeCard({
          category: 'work',
          basePower: response,
          baseCost: 5
        })

        // drawフェーズに移行
        game.phase = 'draw'
        gameService.startChallenge(challengeCard)
        gameService.selectCardForChallenge(responseCard)
        gameService.resolveChallenge()

        totalDamageAbsorbed += 10 // 各チャレンジで10ダメージ吸収
      })

      // 保険の使用統計を確認
      expect(activeInsurance.getUsageCount()).toBe(3)
      expect(activeInsurance.getTotalDamageAbsorbed()).toBe(30)
    })
  })

  describe('ターン進行と保険期限管理', () => {
    it('複数の定期保険の期限が正しく管理される', () => {
      gameService.startGame()

      // 異なる期限の定期保険を複数有効化
      const insurances = [
        {
          id: 'term-1',
          name: '短期保険',
          remainingTurns: 2
        },
        {
          id: 'term-2',
          name: '中期保険',
          remainingTurns: 5
        },
        {
          id: 'term-3',
          name: '長期保険',
          remainingTurns: 10
        }
      ]

      insurances.forEach(({ id, name, remainingTurns }) => {
        const card = new Card({
          id,
          name,
          description: '期限テスト',
          type: 'insurance',
          power: 0,
          cost: 3,
          effects: [],
          insuranceType: 'health',
          coverage: 20,
          durationType: 'term',
          remainingTurns
        })
        gameService.activateInsurance(card)
      })

      expect(gameService.getActiveInsurances()).toHaveLength(3)

      // 2ターン後: 短期保険が期限切れ
      gameService.nextTurn()
      gameService.nextTurn()
      expect(gameService.getActiveInsurances()).toHaveLength(2)

      // さらに3ターン後: 中期保険も期限切れ
      for (let i = 0; i < 3; i++) {
        gameService.nextTurn()
      }
      expect(gameService.getActiveInsurances()).toHaveLength(1)

      // さらに5ターン後: 長期保険も期限切れ
      for (let i = 0; i < 5; i++) {
        gameService.nextTurn()
      }
      expect(gameService.getActiveInsurances()).toHaveLength(0)
    })

    it('年齢による保険料の増加が正しく反映される', () => {
      gameService.startGame()

      const baseInsurance = new Card({
        id: 'age-test',
        name: '年齢連動保険',
        description: '保険料が年齢で変動',
        type: 'insurance',
        power: 0,
        cost: 10,
        effects: [],
        insuranceType: 'health',
        coverage: 30,
        durationType: 'whole_life'
      })

      const insurance = gameService.activateInsurance(baseInsurance)

      // 青年期の保険料
      expect(insurance.calculateAdjustedPremium('youth').getValue()).toBe(10)

      // 中年期の保険料（1.2倍）
      expect(insurance.calculateAdjustedPremium('middle_age').getValue()).toBe(12)

      // 老年期の保険料（1.5倍）
      expect(insurance.calculateAdjustedPremium('elder').getValue()).toBe(15)
    })
  })

  describe('ゲームオーバー条件', () => {
    it('体力が0になるとゲームオーバー', () => {
      gameService.startGame()

      // 致命的なチャレンジ
      const fatalChallenge = new Card({
        id: 'fatal',
        name: '致命的な危機',
        description: 'ゲームオーバーテスト',
        type: 'challenge',
        power: 150,
        cost: 0,
        effects: []
      })

      // drawフェーズに移行
      game.phase = 'draw'
      gameService.startChallenge(fatalChallenge)
      // カードを選択せずに解決
      gameService.resolveChallenge()

      expect(game.vitality).toBe(0)
      expect(game.isGameOver()).toBe(true)
    })

    it('保険でゲームオーバーを回避できる', () => {
      gameService.startGame()

      // 強力な保険を有効化
      const strongInsurance = new Card({
        id: 'strong-ins',
        name: '完全保障',
        description: 'ゲームオーバー回避',
        type: 'insurance',
        power: 0,
        cost: 15,
        effects: [],
        insuranceType: 'life',
        coverage: 200,
        durationType: 'whole_life'
      })

      gameService.activateInsurance(strongInsurance)

      // 致命的なチャレンジ
      const fatalChallenge = new Card({
        id: 'fatal-2',
        name: '超大型の危機',
        description: '保険テスト',
        type: 'challenge',
        power: 150,
        cost: 0,
        effects: []
      })

      // drawフェーズに移行
      game.phase = 'draw'
      gameService.startChallenge(fatalChallenge)
      gameService.resolveChallenge()

      // 保険のおかげで生存
      expect(game.vitality).toBeGreaterThan(0)
      expect(game.isGameOver()).toBe(false)
    })
  })
})