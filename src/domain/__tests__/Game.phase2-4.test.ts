import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from '../entities/Game'
import { Card } from '../entities/Card'
import type { GameConfig } from '../types/game.types'
import type { InsuranceCardData } from '../types/card.types'

describe('Game - Phase 2-4: 保険カード期限管理', () => {
  let game: Game
  let config: GameConfig

  beforeEach(() => {
    config = {
      difficulty: 'normal',
      startingVitality: 30,
      startingHandSize: 3,
      maxHandSize: 7,
      dreamCardCount: 3
    }
    game = new Game(config)
    game.start()
  })

  // テスト用の定期保険カードを作成
  const createTermInsuranceCard = (remainingTurns: number): Card => {
    const cardData: InsuranceCardData = {
      id: `term_insurance_${remainingTurns}`,
      name: `定期保険 (${remainingTurns}ターン)`,
      description: `${remainingTurns}ターン有効な定期保険`,
      type: 'insurance',
      power: 3,
      cost: 1,
      effects: [],
      insuranceType: 'health',
      coverage: 5,
      durationType: 'term',
      remainingTurns: remainingTurns,
      ageBonus: 0
    }
    return new Card(cardData)
  }

  // テスト用の終身保険カードを作成
  const createWholeLifeInsuranceCard = (): Card => {
    const cardData: InsuranceCardData = {
      id: 'whole_life_insurance',
      name: '終身保険',
      description: '永続的な終身保険',
      type: 'insurance',
      power: 2,
      cost: 2,
      effects: [],
      insuranceType: 'health',
      coverage: 3,
      durationType: 'whole_life',
      ageBonus: 0
    }
    return new Card(cardData)
  }

  describe('保険カードの追加と管理', () => {
    it('selectCard()で保険カードを選択すると、insuranceCardsリストに追加される', () => {
      // カード選択フェーズを設定
      game.setPhase('card_selection')
      const termInsurance = createTermInsuranceCard(3)
      game.setCardChoices([termInsurance])

      // 保険カードを選択
      game.selectCard(termInsurance.id)

      // 保険カードリストに追加されていることを確認
      expect(game.insuranceCards).toHaveLength(1)
      expect(game.insuranceCards[0].id).toBe(termInsurance.id)
    })

    it('保険以外のカードを選択してもinsuranceCardsリストには追加されない', () => {
      // カード選択フェーズを設定
      game.setPhase('card_selection')
      const lifeCard = new Card({
        id: 'life_card',
        name: '人生カード',
        description: 'テスト用人生カード',
        type: 'life',
        power: 2,
        cost: 1,
        effects: []
      })
      game.setCardChoices([lifeCard])

      // 人生カードを選択
      game.selectCard(lifeCard.id)

      // 保険カードリストは空のまま
      expect(game.insuranceCards).toHaveLength(0)
    })
  })

  describe('定期保険の期限管理', () => {
    it('nextTurn()で定期保険の残りターン数が減少する', () => {
      // 3ターンの定期保険を追加
      const termInsurance = createTermInsuranceCard(3)
      game.insuranceCards.push(termInsurance)

      // 次のターンへ
      game.nextTurn()

      // 残りターン数が2になっていることを確認
      expect(game.insuranceCards).toHaveLength(1)
      expect(game.insuranceCards[0].remainingTurns).toBe(2)
    })

    it('残りターン数が0になると期限切れリストに移動する', () => {
      // 1ターンの定期保険を追加
      const termInsurance = createTermInsuranceCard(1)
      game.insuranceCards.push(termInsurance)

      // 次のターンへ
      game.nextTurn()

      // 保険カードリストから削除され、期限切れリストに追加される
      expect(game.insuranceCards).toHaveLength(0)
      expect(game.expiredInsurances).toHaveLength(1)
      expect(game.expiredInsurances[0].id).toBe(termInsurance.id)
    })

    it('終身保険は期限切れにならない', () => {
      // 終身保険を追加
      const wholeLifeInsurance = createWholeLifeInsuranceCard()
      game.insuranceCards.push(wholeLifeInsurance)

      // 複数ターン経過
      for (let i = 0; i < 5; i++) {
        game.nextTurn()
      }

      // 終身保険は残り続ける
      expect(game.insuranceCards).toHaveLength(1)
      expect(game.insuranceCards[0].id).toBe(wholeLifeInsurance.id)
      expect(game.expiredInsurances).toHaveLength(0)
    })

    it('複数の保険カードを正しく管理する', () => {
      // 異なる期限の保険カードを追加
      const term1 = createTermInsuranceCard(1)
      const term2 = createTermInsuranceCard(2)
      const term3 = createTermInsuranceCard(3)
      const wholeLife = createWholeLifeInsuranceCard()
      
      game.insuranceCards.push(term1, term2, term3, wholeLife)

      // 1ターン目
      game.nextTurn()
      expect(game.insuranceCards).toHaveLength(3) // term2, term3, wholeLife
      expect(game.expiredInsurances).toHaveLength(1) // term1

      // 2ターン目
      game.nextTurn()
      expect(game.insuranceCards).toHaveLength(2) // term3, wholeLife
      expect(game.expiredInsurances).toHaveLength(2) // term1, term2

      // 3ターン目
      game.nextTurn()
      expect(game.insuranceCards).toHaveLength(1) // wholeLife only
      expect(game.expiredInsurances).toHaveLength(3) // term1, term2, term3
    })
  })

  describe('期限切れ通知管理', () => {
    it('getExpiredInsurances()で期限切れカードを取得できる', () => {
      const termInsurance = createTermInsuranceCard(1)
      game.insuranceCards.push(termInsurance)
      
      game.nextTurn()
      
      const expired = game.getExpiredInsurances()
      expect(expired).toHaveLength(1)
      expect(expired[0].id).toBe(termInsurance.id)
    })

    it('clearExpiredInsurances()で期限切れ通知をクリアできる', () => {
      const termInsurance = createTermInsuranceCard(1)
      game.insuranceCards.push(termInsurance)
      
      game.nextTurn()
      expect(game.expiredInsurances).toHaveLength(1)
      
      game.clearExpiredInsurances()
      expect(game.expiredInsurances).toHaveLength(0)
      expect(game.getExpiredInsurances()).toHaveLength(0)
    })

    it('getActiveInsurances()で現在有効な保険カードを取得できる', () => {
      const term = createTermInsuranceCard(3)
      const wholeLife = createWholeLifeInsuranceCard()
      game.insuranceCards.push(term, wholeLife)
      
      const active = game.getActiveInsurances()
      expect(active).toHaveLength(2)
      expect(active[0].id).toBe(term.id)
      expect(active[1].id).toBe(wholeLife.id)
    })
  })

  describe('ゲーム状態のスナップショット', () => {
    it('保険カード情報がスナップショットに含まれる', () => {
      const term = createTermInsuranceCard(2)
      const expired = createTermInsuranceCard(1)
      
      game.insuranceCards.push(term)
      game.expiredInsurances.push(expired)
      
      const snapshot = game.getSnapshot()
      
      expect(snapshot.insuranceCards).toBeDefined()
      expect(snapshot.insuranceCards).toHaveLength(1)
      expect(snapshot.insuranceCards![0].id).toBe(term.id)
      
      expect(snapshot.expiredInsurances).toBeDefined()
      expect(snapshot.expiredInsurances).toHaveLength(1)
      expect(snapshot.expiredInsurances![0].id).toBe(expired.id)
    })
  })
})