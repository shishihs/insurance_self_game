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
      const insurance1 = new Card({
        id: 'insurance-1',
        type: 'insurance',
        name: '保険1',
        description: 'テスト用保険1',
        power: 2,
        cost: 0,  // テスト用にコストを0に設定
        insuranceType: 'medical',
        durationType: 'term',
        remainingTurns: 3,
        effects: [{
          type: 'damage_reduction',
          value: 5,
          description: 'ダメージ-5'
        }]
      })
      const insurance2 = new Card({
        id: 'insurance-2',
        type: 'insurance',
        name: '保険2',
        description: 'テスト用保険2',
        power: 2,
        cost: 0,  // テスト用にコストを0に設定
        insuranceType: 'accident',
        durationType: 'term',
        remainingTurns: 3,
        effects: [{
          type: 'damage_reduction',
          value: 5,
          description: 'ダメージ-5'
        }]
      })
      const insurance3 = new Card({
        id: 'insurance-3',
        type: 'insurance',
        name: '保険3',
        description: 'テスト用保険3',
        power: 2,
        cost: 0,  // テスト用にコストを0に設定
        insuranceType: 'life',
        durationType: 'term',
        remainingTurns: 3,
        effects: [{
          type: 'damage_reduction',
          value: 5,
          description: 'ダメージ-5'
        }]
      })

      game.addInsurance(insurance1)
      game.addInsurance(insurance2)
      game.addInsurance(insurance3)

      // チャレンジでダメージを受ける（通常のチャレンジカードを直接作成）
      const challenge = new Card({
        id: 'test-challenge',
        type: 'challenge',
        name: '強力な挑戦',
        description: 'テスト用チャレンジ',
        power: 20,
        penalty: 10, // 固定ダメージ
        category: 'health',
        cost: 0,
        effects: []
      })

      // チャレンジを正式に開始
      game.startChallenge(challenge)

      // プレイヤーパワー10で挑戦（10ダメージを受けるはず）
      const lifeCard = Card.createLifeCard('生活カード', 10)
      game.addCardToHand(lifeCard)
      game.toggleCardSelection(lifeCard)

      const result = game.resolveChallenge()

      // デバッグ用ログ
      console.log('Challenge result:', result)
      console.log('Power breakdown:', result.powerBreakdown)
      console.log('Insurance burden:', game.insuranceBurden)
      console.log('Insurance cards:', game.activeInsurances.map(card => ({
        name: card.name,
        damageReduction: card.calculateDamageReduction()
      })))

      // 保険料負担を考慮した正確な計算
      const challengePower = 20
      const basePower = 10
      const insuranceBurden = game.insuranceBurden
      const effectivePower = basePower - insuranceBurden // 保険料負担でパワーが減る
      // const baseDamage = challengePower - effectivePower // 旧ロジック
      const baseDamage = 10 // penaltyベース

      // 保険軽減の計算
      const insuranceReductions = game.activeInsurances.map(card => card.calculateDamageReduction())
      const totalReductionBeforeLimit = insuranceReductions.reduce((sum, r) => sum + r, 0)
      const actualReduction = Math.min(totalReductionBeforeLimit, MAX_TOTAL_DAMAGE_REDUCTION)

      // 最終ダメージ
      const finalDamage = Math.max(baseDamage - actualReduction, MINIMUM_DAMAGE_AFTER_INSURANCE)

      console.log('Calculation details:', {
        challengePower,
        basePower,
        insuranceBurden,
        effectivePower,
        baseDamage,
        insuranceReductions,
        totalReductionBeforeLimit,
        actualReduction,
        finalDamage
      })

      expect(result.vitalityChange).toBe(-finalDamage)
    })

    it('最小ダメージ保証が適用される', () => {
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
            value: 10,
            description: 'ダメージ-10'
          }]
        })
        game.addInsurance(insurance)
      }

      // 小さなチャレンジ（通常のチャレンジカードを直接作成）
      const challenge = new Card({
        id: 'small-challenge',
        type: 'challenge',
        name: '小さな挑戦',
        description: 'テスト用チャレンジ',
        power: 5,
        category: 'health',
        cost: 0,
        effects: []
      })

      // チャレンジを正式に開始
      game.startChallenge(challenge)

      // プレイヤーパワー3で挑戦（2ダメージを受けるはず）
      const lifeCard = Card.createLifeCard('生活カード', 3)
      game.addCardToHand(lifeCard)
      game.toggleCardSelection(lifeCard)

      const result = game.resolveChallenge()

      // どんなに保険があっても最小ダメージは受ける
      expect(result.vitalityChange).toBe(-MINIMUM_DAMAGE_AFTER_INSURANCE)
    })
  })

  describe('ゲームバランスの確認', () => {
    it('適切な保険枚数でリスク管理ができる', () => {
      // 適度な保険2枚
      const insurance1 = new Card({
        id: 'moderate-insurance-1',
        type: 'insurance',
        name: '保険1',
        description: 'テスト用保険1',
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
      const insurance2 = new Card({
        id: 'moderate-insurance-2',
        type: 'insurance',
        name: '保険2',
        description: 'テスト用保険2',
        power: 2,
        cost: 0,  // テスト用にコストを0に設定
        insuranceType: 'accident',
        durationType: 'term',
        remainingTurns: 3,
        effects: [{
          type: 'damage_reduction',
          value: 3,
          description: 'ダメージ-3'
        }]
      })

      game.addInsurance(insurance1)
      game.addInsurance(insurance2)

      // 中程度のチャレンジ（通常のチャレンジカードを直接作成）
      const challenge = new Card({
        id: 'medium-challenge',
        type: 'challenge',
        name: '中程度の挑戦',
        description: 'テスト用チャレンジ',
        power: 15,
        penalty: 5,
        category: 'health',
        cost: 0,
        effects: []
      })

      // チャレンジを正式に開始
      game.startChallenge(challenge)

      // プレイヤーパワー10で挑戦
      const lifeCard = Card.createLifeCard('生活カード', 10)
      game.addCardToHand(lifeCard)
      game.toggleCardSelection(lifeCard)

      const result = game.resolveChallenge()

      // 基本ダメージ: 5 (penalty)
      // 保険軽減: 3 * 0.5 * 2 = 3（各保険1.5、合計3）
      // 実際のダメージ: 5 - 3 = 2
      expect(result.vitalityChange).toBe(-2)
    })

    it('保険がない場合は全ダメージを受ける', () => {
      // 保険なし（通常のチャレンジカードを直接作成）
      const challenge = new Card({
        id: 'no-insurance-challenge',
        type: 'challenge',
        name: '挑戦',
        description: 'テスト用チャレンジ',
        power: 15,
        penalty: 5,
        category: 'health',
        cost: 0,
        effects: []
      })

      // チャレンジを正式に開始
      game.startChallenge(challenge)

      const lifeCard = Card.createLifeCard('生活カード', 10)
      game.addCardToHand(lifeCard)
      game.toggleCardSelection(lifeCard)

      const result = game.resolveChallenge()

      // 基本ダメージ: 5 (penalty)（軽減なし）
      expect(result.vitalityChange).toBe(-5)
    })
  })
})