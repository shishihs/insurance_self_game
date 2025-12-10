import { beforeEach, describe, expect, it } from 'vitest'
import { Game } from '../Game'
import { Card } from '../Card'
import type { GameConfig } from '../../types/game.types'

describe('Game - Simplified Insurance System', () => {
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

  describe('Permanent Insurance Effects', () => {
    it('should treat all insurance cards as permanent', () => {
      // 永続保険カードを作成
      const permanentInsurance = new Card({
        id: 'permanent_1',
        name: '永続医療保険',
        description: '一生涯の医療保障',
        type: 'insurance',
        power: 4,
        cost: 3,
        effects: [{
          type: 'shield',
          value: 100,
          description: '100ポイントの保障'
        }],
        insuranceType: 'medical',
        coverage: 100,
        ageBonus: 0
      })

      // 保険をアクティブリストに追加
      game.activeInsurances.push(permanentInsurance)

      // 保険が永続的に有効であることを確認
      const activeInsurances = game.getActiveInsurances()
      expect(activeInsurances).toHaveLength(1)
      expect(activeInsurances[0].name).toBe('永続医療保険')

      // 複数ターン経過しても保険は有効
      for (let i = 0; i < 10; i++) {
        game.nextTurn()
      }

      const activeInsurancesAfterTurns = game.getActiveInsurances()
      expect(activeInsurancesAfterTurns).toHaveLength(1)
      expect(activeInsurancesAfterTurns[0].name).toBe('永続医療保険')
    })

    it('should calculate insurance burden based on number of active insurances', () => {
      // 3枚の保険カードを追加
      const insurances = [
        new Card({
          id: 'ins_1',
          name: '医療保険1',
          description: '医療保障',
          type: 'insurance',
          power: 3,
          cost: 2,
          effects: [],
          insuranceType: 'medical',
          coverage: 80,
          ageBonus: 0
        }),
        new Card({
          id: 'ins_2',
          name: '生命保険1',
          description: '生命保障',
          type: 'insurance',
          power: 4,
          cost: 3,
          effects: [],
          insuranceType: 'life',
          coverage: 150,
          ageBonus: 0
        }),
        new Card({
          id: 'ins_3',
          name: '収入保障保険1',
          description: '収入保障',
          type: 'insurance',
          power: 3,
          cost: 2,
          effects: [],
          insuranceType: 'income',
          coverage: 120,
          ageBonus: 0
        })
      ]

      insurances.forEach(insurance => {
        game.activeInsurances.push(insurance)
      })

      // 3枚の保険で負担が-4になることを確認 (実際の計算ロジックに基づく)
      const burden = game.calculateInsuranceBurden()
      expect(burden).toBe(-4)

      // 6枚に増やすと負担が増加することを確認 (~-9)
      const additionalInsurances = [
        new Card({
          id: 'ins_4',
          name: '医療保険2',
          description: '医療保障',
          type: 'insurance',
          power: 3,
          cost: 2,
          effects: [],
          insuranceType: 'medical',
          coverage: 80,
          ageBonus: 0
        }),
        new Card({
          id: 'ins_5',
          name: '生命保険2',
          description: '生命保障',
          type: 'insurance',
          power: 4,
          cost: 3,
          effects: [],
          insuranceType: 'life',
          coverage: 150,
          ageBonus: 0
        }),
        new Card({
          id: 'ins_6',
          name: '収入保障保険2',
          description: '収入保障',
          type: 'insurance',
          power: 3,
          cost: 2,
          effects: [],
          insuranceType: 'income',
          coverage: 120,
          ageBonus: 0
        })
      ]

      additionalInsurances.forEach(insurance => {
        game.activeInsurances.push(insurance)
      })

      const newBurden = game.calculateInsuranceBurden()
      expect(newBurden).toBe(-9)
    })

    it('should include insurance power in total power calculation', () => {
      // 保険カードを手札に追加
      const insuranceCard = new Card({
        id: 'hand_ins_1',
        name: '手札の医療保険',
        description: '使用可能な医療保険',
        type: 'insurance',
        power: 5,
        cost: 3,
        effects: [],
        insuranceType: 'medical',
        coverage: 100,
        ageBonus: 1  // 年齢ボーナス
      })

      game.addCardToHand(insuranceCard)
      game.toggleCardSelection(insuranceCard)

      // パワー計算に保険カードが含まれることを確認
      const powerBreakdown = game.calculateTotalPower([insuranceCard])
      expect(powerBreakdown.insurance).toBe(6) // 5 + 1(年齢ボーナス)
      expect(powerBreakdown.base).toBe(0)
      expect(powerBreakdown.total).toBe(6) // 負担がないので6のまま
    })
  })

  describe('Age Bonus System', () => {
    it('should apply age bonus to insurance cards', () => {
      const insuranceCard = new Card({
        id: 'age_bonus_ins',
        name: '年齢ボーナス保険',
        description: '年齢に応じて効果が上がる保険',
        type: 'insurance',
        power: 3,
        cost: 2,
        effects: [],
        insuranceType: 'medical',
        coverage: 100,
        ageBonus: 2
      })

      // 年齢ボーナスが正しく適用されることを確認
      const effectivePower = insuranceCard.calculateEffectivePower()
      expect(effectivePower).toBe(5) // 3 + 2(年齢ボーナス)
    })
  })
})