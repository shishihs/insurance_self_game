import { describe, it, expect, beforeEach } from 'vitest'
import { Card } from '../../entities/Card'
import { Game } from '../../entities/Game'
import {
  MAX_DAMAGE_REDUCTION_PER_INSURANCE,
  MAX_TOTAL_DAMAGE_REDUCTION,
  INSURANCE_EFFECTIVENESS_RATE,
  MINIMUM_DAMAGE_AFTER_INSURANCE
} from '../../constants/insurance.constants'

describe('保険によるダメージ軽減の上限テスト (Issue #24)', () => {
  let game: Game

  beforeEach(() => {
    game = new Game({ startingVitality: 100 } as any)
    game.start()
    game.setPhase('draw')
  })

  describe('単一保険カードのダメージ軽減', () => {
    it('保険カード1枚の軽減量が上限を超えない', () => {
      // damage_reduction効果を持つ保険カードを作成
      const insurance = new Card({
        id: 'test-insurance',
        type: 'insurance',
        name: '強力な保険',
        description: 'テスト用保険',
        power: 2,
        cost: 0,  // テスト用にコストを0に設定
        insuranceType: 'medical',
        durationType: 'term',
        remainingTurns: 3,
        effects: [{
          type: 'damage_reduction',
          value: 10,  // 通常なら10ダメージ軽減
          description: 'ダメージ-10'
        }]
      })

      // 効果率を適用した軽減量を計算
      const expectedReduction = Math.min(
        10 * INSURANCE_EFFECTIVENESS_RATE,
        MAX_DAMAGE_REDUCTION_PER_INSURANCE
      )

      expect(insurance.calculateDamageReduction()).toBe(expectedReduction)
    })

    it('効果率が適用される', () => {
      // damage_reduction効果を持つ保険カード
      const insurance = new Card({
        id: 'test-insurance-2',
        type: 'insurance',
        name: '通常の保険',
        description: 'テスト用保険',
        power: 2,
        cost: 0,  // テスト用にコストを0に設定
        insuranceType: 'medical',
        durationType: 'term',
        remainingTurns: 3,
        effects: [{
          type: 'damage_reduction',
          value: 3,
          description: 'ダメージ-3'
        }]
      })

      // 3 * 0.5 = 1.5
      const expectedReduction = 3 * INSURANCE_EFFECTIVENESS_RATE

      expect(insurance.calculateDamageReduction()).toBe(expectedReduction)
    })
  })

  describe('複数保険カードの合計軽減', () => {
    it('複数の保険カードの合計軽減量が上限を超えない', () => {
      // 複数の強力な保険カードを追加（damage_reduction効果付き）
      // Value 4 * 0.5 = 2 reduction per card
      const createInsurance = (id: string, name: string) => new Card({
        id, type: 'insurance', name, description: 'test', power: 2, cost: 0,
        insuranceType: 'medical', durationType: 'term', remainingTurns: 3,
        effects: [{ type: 'damage_reduction', value: 4, description: 'damage-4' }]
      })

      game.addInsurance(createInsurance('insurance-1', '保険1'))
      game.addInsurance(createInsurance('insurance-2', '保険2'))
      game.addInsurance(createInsurance('insurance-3', '保険3'))

      // チャレンジでダメージを受ける（通常のチャレンジカードを直接作成）
      const challenge = new Card({
        id: 'test-challenge',
        type: 'challenge',
        name: '強力な挑戦',
        description: 'テスト用チャレンジ',
        power: 20, // Base Damage = 20
        penalty: 10,
        category: 'health',
        cost: 0,
        effects: []
      })

      // チャレンジを正式に開始
      game.startChallenge(challenge)

      // プレイヤーパワー10で挑戦（失敗確定）
      const lifeCard = Card.createLifeCard('生活カード', 10)
      game.addCardToHand(lifeCard)
      game.toggleCardSelection(lifeCard)

      const result = game.resolveChallenge()

      // 計算詳細:
      // Base Damage (Power) = 20
      // Reduction per card = 4 * 0.5 = 2.0
      // Total Reduction = 2.0 * 3 = 6.0
      // Final Damage = 20 - 6 = 14
      expect(result.vitalityChange).toBe(-14)
    })

    it('最小ダメージ保証が適用される', () => {
      // ... (existing implementation is fine, reduction 50 vs damage 5 -> min 1)
      // Just ensure power is small enough.
      // 非常に強力な保険カードを複数追加
      for (let i = 0; i < 5; i++) {
        const insurance = new Card({
          id: `insurance-${i}`,
          type: 'insurance',
          name: `保険${i}`,
          description: `テスト用保険${i}`,
          power: 2,
          cost: 0,
          insuranceType: 'medical',
          durationType: 'term',
          remainingTurns: 3,
          effects: [{
            type: 'damage_reduction',
            value: 20, // Large reduction
            description: 'ダメージ-20'
          }]
        })
        game.addInsurance(insurance)
      }

      // 小さなチャレンジ
      const challenge = new Card({
        id: 'small-challenge',
        type: 'challenge',
        name: '小さな挑戦',
        description: 'テスト用チャレンジ',
        power: 5, // Base Damage 5
        category: 'health',
        cost: 0,
        effects: []
      })

      game.startChallenge(challenge)
      const lifeCard = Card.createLifeCard('生活カード', 3)
      game.addCardToHand(lifeCard)
      game.toggleCardSelection(lifeCard)

      const result = game.resolveChallenge()
      expect(result.vitalityChange).toBe(-MINIMUM_DAMAGE_AFTER_INSURANCE)
    })
  })

  describe('ゲームバランスの確認', () => {
    it('適切な保険枚数でリスク管理ができる', () => {
      // 適度な保険2枚 (Value 3 -> 1.5 reduction)
      // Total 3.0 reduction
      const insurance1 = new Card({
        id: 'moderate-insurance-1', type: 'insurance', name: '保険1', description: 'test', power: 2, cost: 0,
        insuranceType: 'medical', durationType: 'term', remainingTurns: 3,
        effects: [{ type: 'damage_reduction', value: 3, description: 'damage-3' }]
      })
      const insurance2 = new Card({
        id: 'moderate-insurance-2', type: 'insurance', name: '保険2', description: 'test', power: 2, cost: 0,
        insuranceType: 'accident', durationType: 'term', remainingTurns: 3,
        effects: [{ type: 'damage_reduction', value: 3, description: 'damage-3' }]
      })

      game.addInsurance(insurance1)
      game.addInsurance(insurance2)

      // 中程度のチャレンジ
      const challenge = new Card({
        id: 'medium-challenge',
        type: 'challenge',
        name: '中程度の挑戦',
        description: 'テスト用チャレンジ',
        power: 5, // V3: Damage = Power = 5
        penalty: 5,
        category: 'health',
        cost: 0,
        effects: []
      })

      game.startChallenge(challenge)
      const lifeCard = Card.createLifeCard('生活カード', 0) // Power 0
      game.addCardToHand(lifeCard)
      game.toggleCardSelection(lifeCard)

      const result = game.resolveChallenge()

      // Base Damage: 5
      // Total Reduction: 3
      // Final Damage: 2
      expect(result.vitalityChange).toBe(-2)
    })

    it('保険がない場合は全ダメージを受ける', () => {
      // 保険なし
      const challenge = new Card({
        id: 'no-insurance-challenge',
        type: 'challenge',
        name: '挑戦',
        description: 'テスト用チャレンジ',
        power: 5, // V3: Damage = Power = 5
        penalty: 5,
        category: 'health',
        cost: 0,
        effects: []
      })

      game.startChallenge(challenge)
      const lifeCard = Card.createLifeCard('生活カード', 0)
      game.addCardToHand(lifeCard)
      game.toggleCardSelection(lifeCard)

      const result = game.resolveChallenge()

      // V3: 全ダメージ (Power value)
      expect(result.vitalityChange).toBe(-5)
    })
  })
})