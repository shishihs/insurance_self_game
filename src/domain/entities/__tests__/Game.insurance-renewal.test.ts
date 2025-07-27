import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from '../Game'
import { Card } from '../Card'
import type { GameConfig } from '../../types/game.types'
import type { InsuranceCardData } from '../../types/card.types'

describe('Game - Insurance Renewal System', () => {
  let game: Game
  let config: GameConfig

  beforeEach(() => {
    config = {
      difficulty: 'normal',
      startingVitality: 20,
      startingHandSize: 5,
      maxHandSize: 7,
      dreamCardCount: 3
    }
    game = new Game(config)
    game.start()
  })

  describe('getPendingRenewalInsurances', () => {
    it('should return insurances with 2 or fewer remaining turns', () => {
      // 期限が近い定期保険を作成
      const termInsurance: InsuranceCardData = {
        id: 'term_1',
        name: '定期保険A',
        description: 'テスト用定期保険',
        type: 'insurance',
        power: 3,
        cost: 2,
        effects: [],
        insuranceType: 'life',
        coverage: 5,
        durationType: 'term',
        remainingTurns: 2,
        ageBonus: 0
      }

      const termInsurance2: InsuranceCardData = {
        id: 'term_2',
        name: '定期保険B',
        description: 'テスト用定期保険',
        type: 'insurance',
        power: 4,
        cost: 3,
        effects: [],
        insuranceType: 'life',
        coverage: 6,
        durationType: 'term',
        remainingTurns: 5,
        ageBonus: 0
      }

      const card1 = new Card(termInsurance)
      const card2 = new Card(termInsurance2)

      game.insuranceCards = [card1, card2]
      
      // updatePendingRenewals を呼び出すためのプライベートメソッドアクセス
      ;(game as any).updatePendingRenewals()

      const pendingRenewals = game.getPendingRenewalInsurances()
      
      expect(pendingRenewals).toHaveLength(1)
      expect(pendingRenewals[0].cardId).toBe('term_1')
      expect(pendingRenewals[0].remainingTurns).toBe(2)
    })
  })

  describe('calculateRenewalCost', () => {
    it('should calculate correct renewal costs for different ages', () => {
      const testCard = new Card({
        id: 'test_1',
        name: 'テスト保険',
        description: 'テスト用',
        type: 'insurance',
        power: 3,
        cost: 2,
        effects: [],
        insuranceType: 'life',
        coverage: 5,
        durationType: 'term',
        remainingTurns: 3,
        ageBonus: 0
      })

      // 青年期: +1コスト
      expect(game.calculateRenewalCost(testCard, 'youth')).toBe(3)
      
      // 中年期: +2コスト
      expect(game.calculateRenewalCost(testCard, 'middle')).toBe(4)
      
      // 充実期: +3コスト
      expect(game.calculateRenewalCost(testCard, 'fulfillment')).toBe(5)
    })
  })

  describe('renewInsurance', () => {
    it('should successfully renew insurance when player has enough vitality', () => {
      const termInsurance: InsuranceCardData = {
        id: 'term_1',
        name: '定期保険A',
        description: 'テスト用定期保険',
        type: 'insurance',
        power: 3,
        cost: 2,
        effects: [],
        insuranceType: 'life',
        coverage: 5,
        durationType: 'term',
        remainingTurns: 2,
        ageBonus: 0
      }

      const card = new Card(termInsurance)
      game.insuranceCards = [card]
      game.vitality = 10

      // 更新リストを準備
      ;(game as any).updatePendingRenewals()

      const result = game.renewInsurance('term_1')

      expect(result.action).toBe('renewed')
      expect(result.costPaid).toBe(3) // 青年期なので2+1=3
      expect(game.vitality).toBe(7) // 10-3=7

      // 期限が10ターン延長されているかチェック
      const renewedCard = game.insuranceCards.find(c => c.id === 'term_1')
      expect(renewedCard?.remainingTurns).toBe(12) // 2+10=12
    })

    it('should fail to renew when player has insufficient vitality', () => {
      const termInsurance: InsuranceCardData = {
        id: 'term_1',
        name: '定期保険A',
        description: 'テスト用定期保険',
        type: 'insurance',
        power: 3,
        cost: 2,
        effects: [],
        insuranceType: 'life',
        coverage: 5,
        durationType: 'term',
        remainingTurns: 2,
        ageBonus: 0
      }

      const card = new Card(termInsurance)
      game.insuranceCards = [card]
      game.vitality = 2 // 更新コスト3より少ない

      // 更新リストを準備
      ;(game as any).updatePendingRenewals()

      const result = game.renewInsurance('term_1')

      expect(result.action).toBe('expired')
      expect(result.costPaid).toBeUndefined()
      expect(game.vitality).toBe(2) // 変化なし
      expect(result.message).toContain('活力不足')
    })
  })

  describe('expireInsurance', () => {
    it('should expire insurance and move to expired list', () => {
      const termInsurance: InsuranceCardData = {
        id: 'term_1',
        name: '定期保険A',
        description: 'テスト用定期保険',
        type: 'insurance',
        power: 3,
        cost: 2,
        effects: [],
        insuranceType: 'life',
        coverage: 5,
        durationType: 'term',
        remainingTurns: 2,
        ageBonus: 0
      }

      const card = new Card(termInsurance)
      game.insuranceCards = [card]

      const result = game.expireInsurance('term_1')

      expect(result.action).toBe('expired')
      expect(game.insuranceCards).toHaveLength(0)
      expect(game.expiredInsurances).toHaveLength(1)
      expect(game.expiredInsurances[0].id).toBe('term_1')
    })
  })

  describe('Integration with existing updateInsuranceExpiration', () => {
    it('should update pending renewals when insurance expiration is updated', () => {
      const termInsurance: InsuranceCardData = {
        id: 'term_1',
        name: '定期保険A',
        description: 'テスト用定期保険',
        type: 'insurance',
        power: 3,
        cost: 2,
        effects: [],
        insuranceType: 'life',
        coverage: 5,
        durationType: 'term',
        remainingTurns: 3,
        ageBonus: 0
      }

      const card = new Card(termInsurance)
      game.insuranceCards = [card]

      // nextTurn() を呼び出すと updateInsuranceExpiration() が呼ばれる
      game.nextTurn()

      const pendingRenewals = game.getPendingRenewalInsurances()
      
      // 残りターンが2になったので、警告対象になる
      expect(pendingRenewals).toHaveLength(1)
      expect(pendingRenewals[0].remainingTurns).toBe(2)
    })
  })
})