import { beforeEach, describe, expect, it } from 'vitest'
import { Game } from '../../entities/Game'
import { Card } from '../../entities/Card'
// import { InsurancePremium } from '../../valueObjects/InsurancePremium' // 未使用

describe('保険料計算サービス統合テスト', () => {
  let game: Game

  beforeEach(() => {
    game = new Game({
      difficulty: 'normal',
      startingVitality: 100,
      startingHandSize: 5,
      maxHandSize: 10,
      dreamCardCount: 3
    })
    game.start()
  })

  describe('Gameエンティティとの統合', () => {
    it('ドメインサービスを使った保険料計算が正常動作', () => {
      // 保険カードを作成
      const healthInsurance = new Card({
        id: 'health-1',
        name: '健康保険',
        description: '基本的な健康保険',
        type: 'insurance',
        power: 0,
        cost: 10,
        insuranceType: 'health',
        coverage: 50,
        effects: []
      })

      // ゲームに保険を追加
      game.addInsurance(healthInsurance)

      // ドメインサービス経由で保険料負担を計算
      const burden = game.calculateInsuranceBurden()

      // 青年期の健康保険（基本料金10）なので-10の負担
      expect(burden).toBe(-10)
    })

    it('複数保険でペナルティが適用される', () => {
      // 3枚の保険を追加
      const cards = [
        createTestInsurance('health-1', 'health', 10),
        createTestInsurance('life-1', 'life', 10), 
        createTestInsurance('accident-1', 'accident', 10)
      ]

      cards.forEach(card => { game.addInsurance(card); })

      const burden = game.calculateInsuranceBurden()

      // 3枚なので10%ペナルティ: -(10*1.0 + 10*1.2 + 10*0.6) * 1.1 = -30.8 → -30（切り捨て）
      expect(burden).toBeLessThan(-25) // 少なくとも基本料金より高い負担
    })

    it('年齢が上がると保険料負担が増加', () => {
      const healthInsurance = createTestInsurance('health-1', 'health', 10)
      game.addInsurance(healthInsurance)

      // 青年期の負担
      const youthBurden = game.calculateInsuranceBurden()

      // 中年期に移行
      game.setStage('middle_age')
      const middleAgeBurden = game.calculateInsuranceBurden()

      // 中年期の方が負担が大きい
      expect(Math.abs(middleAgeBurden)).toBeGreaterThan(Math.abs(youthBurden))
    })

    it('保険予算提案機能が動作', () => {
      // 保守的な予算提案
      const conservativeBudget = game.getRecommendedInsuranceBudget('conservative')
      expect(conservativeBudget.getValue()).toBe(15) // 100 * 0.15

      // バランス型の予算提案
      const balancedBudget = game.getRecommendedInsuranceBudget('balanced')
      expect(balancedBudget.getValue()).toBe(25) // 100 * 0.25

      // 積極的な予算提案
      const aggressiveBudget = game.getRecommendedInsuranceBudget('aggressive')
      expect(aggressiveBudget.getValue()).toBe(35) // 100 * 0.35
    })

    it('個別カード保険料計算機能', () => {
      const cancerInsurance = createTestInsurance('cancer-1', 'cancer', 20)
      
      // ゲーム経由でカード保険料を計算
      const premium = game.calculateCardPremium(cancerInsurance)

      // がん保険は1.5倍なので20 * 1.5 = 30
      expect(premium.getValue()).toBe(30)
    })
  })

  describe('エラー処理と後方互換性', () => {
    it('ドメインサービスでエラーが発生してもフォールバック動作', () => {
      // 無効なカードを作成（エラーを意図的に発生）
      const invalidCard = new Card({
        id: 'invalid-1',
        name: '無効カード',
        description: '無効なカード',
        type: 'life', // 保険カードではない
        power: 10,
        cost: 5,
        effects: []
      })

      // 強制的に保険リストに追加（テスト用）
      game.insuranceCards.push(invalidCard)

      // エラーが発生してもフォールバック計算で動作する
      const burden = game.calculateInsuranceBurden()
      
      // フォールバック計算: 1枚なので0（3枚未満）
      expect(burden).toBe(0)
    })

    it('保険がない場合の正常動作', () => {
      const burden = game.calculateInsuranceBurden()
      expect(burden).toBe(0)

      const budget = game.getRecommendedInsuranceBudget()
      expect(budget.getValue()).toBe(25) // デフォルトのbalanced: 100 * 0.25
    })

    it('活力が低い場合の予算提案', () => {
      // 活力を20に減らす
      game.updateVitality(-80)
      
      const budget = game.getRecommendedInsuranceBudget('balanced')
      expect(budget.getValue()).toBe(5) // 20 * 0.25
    })
  })

  describe('実際のゲームプレイシナリオ', () => {
    it('ゲーム進行に伴う保険料変化シミュレーション', () => {
      // 青年期に基本的な保険を取得
      const healthInsurance = createTestInsurance('health-1', 'health', 15)
      game.addInsurance(healthInsurance)

      const youthPremium = Math.abs(game.calculateInsuranceBurden())

      // 中年期に進む
      game.setStage('middle_age')
      const middleAgePremium = Math.abs(game.calculateInsuranceBurden())

      // 追加の保険を取得
      const lifeInsurance = createTestInsurance('life-1', 'life', 20)
      game.addInsurance(lifeInsurance)

      const multiInsurancePremium = Math.abs(game.calculateInsuranceBurden())

      // 保険料が段階的に増加していることを確認
      expect(middleAgePremium).toBeGreaterThan(youthPremium)
      expect(multiInsurancePremium).toBeGreaterThan(middleAgePremium)
    })

    it('リスクプロファイル別予算提案の実用性', () => {
      const vitality = game.vitality

      const conservative = game.getRecommendedInsuranceBudget('conservative').getValue()
      const balanced = game.getRecommendedInsuranceBudget('balanced').getValue()
      const aggressive = game.getRecommendedInsuranceBudget('aggressive').getValue()

      // 順序性の確認
      expect(conservative).toBeLessThan(balanced)
      expect(balanced).toBeLessThan(aggressive)

      // 実用的な範囲内であることを確認
      expect(conservative).toBeGreaterThan(vitality * 0.1) // 最低10%以上
      expect(aggressive).toBeLessThan(vitality * 0.5) // 最大50%未満
    })
  })
})

/**
 * テスト用保険カードヘルパー
 */
function createTestInsurance(id: string, type: string, cost: number): Card {
  return new Card({
    id,
    name: `${type}保険`,
    description: `テスト用${type}保険`,
    type: 'insurance',
    power: 0,
    cost,
    insuranceType: type as any,
    coverage: 50,
    effects: []
  })
}