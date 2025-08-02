import { describe, expect, it } from 'vitest'
import { RiskRewardChallenge } from '../RiskRewardChallenge'

describe('RiskRewardChallenge', () => {
  describe('constructor', () => {
    it('基本的なリスク・リワードチャレンジを作成できる', () => {
      const challenge = new RiskRewardChallenge({
        name: 'テストチャレンジ',
        description: 'テスト説明',
        power: 10,
        riskLevel: 'medium',
        successBonus: 5,
        failurePenalty: 3
      })

      expect(challenge.name).toBe('テストチャレンジ')
      expect(challenge.description).toBe('テスト説明')
      expect(challenge.power).toBe(10)
      expect(challenge.riskLevel).toBe('medium')
      expect(challenge.successBonus).toBe(5)
      expect(challenge.failurePenalty).toBe(3)
      expect(challenge.insuranceImmunity).toBe(false)
      expect(challenge.type).toBe('challenge')
    })

    it('極限リスクチャレンジは保険が無効になる', () => {
      const challenge = new RiskRewardChallenge({
        name: '極限チャレンジ',
        description: '最高難度',
        power: 15,
        riskLevel: 'extreme',
        successBonus: 20,
        failurePenalty: 15
      })

      expect(challenge.insuranceImmunity).toBe(true)
      expect(challenge.effects).toHaveLength(1)
      expect(challenge.effects[0]).toMatchObject({
        type: 'special_action',
        description: '保険効果無効化'
      })
    })

    it('保険無効フラグを明示的に設定できる', () => {
      const challenge = new RiskRewardChallenge({
        name: '特殊チャレンジ',
        description: '保険が効かない',
        power: 8,
        riskLevel: 'high',
        successBonus: 10,
        failurePenalty: 8,
        insuranceImmunity: true
      })

      expect(challenge.insuranceImmunity).toBe(true)
    })

    it('夢カテゴリーを設定できる', () => {
      const challenge = new RiskRewardChallenge({
        name: '夢チャレンジ',
        description: '夢を追う',
        power: 7,
        riskLevel: 'low',
        successBonus: 3,
        failurePenalty: 2,
        dreamCategory: 'social'
      })

      expect(challenge.dreamCategory).toBe('social')
    })
  })

  describe('getRiskMultiplier', () => {
    it('各リスクレベルで正しい倍率が返される', () => {
      const lowRisk = new RiskRewardChallenge({
        name: '低リスク',
        description: '',
        power: 5,
        riskLevel: 'low',
        successBonus: 2,
        failurePenalty: 1
      })
      expect(lowRisk.getRiskMultiplier()).toBe(1.2)

      const mediumRisk = new RiskRewardChallenge({
        name: '中リスク',
        description: '',
        power: 7,
        riskLevel: 'medium',
        successBonus: 5,
        failurePenalty: 3
      })
      expect(mediumRisk.getRiskMultiplier()).toBe(1.5)

      const highRisk = new RiskRewardChallenge({
        name: '高リスク',
        description: '',
        power: 10,
        riskLevel: 'high',
        successBonus: 10,
        failurePenalty: 7
      })
      expect(highRisk.getRiskMultiplier()).toBe(2.0)

      const extremeRisk = new RiskRewardChallenge({
        name: '極限リスク',
        description: '',
        power: 15,
        riskLevel: 'extreme',
        successBonus: 20,
        failurePenalty: 15
      })
      expect(extremeRisk.getRiskMultiplier()).toBe(3.0)
    })
  })

  describe('calculateActualReward', () => {
    it('成功時の報酬が正しく計算される', () => {
      const challenge = new RiskRewardChallenge({
        name: 'テスト',
        description: '',
        power: 10,
        riskLevel: 'medium', // 倍率1.5
        successBonus: 5,
        failurePenalty: 3
      })

      const baseReward = 10
      // floor(10 * 1.5) + 5 = 15 + 5 = 20
      expect(challenge.calculateActualReward(baseReward)).toBe(20)
    })

    it('極限リスクの報酬計算が正しい', () => {
      const challenge = new RiskRewardChallenge({
        name: '極限',
        description: '',
        power: 20,
        riskLevel: 'extreme', // 倍率3.0
        successBonus: 25,
        failurePenalty: 20
      })

      const baseReward = 15
      // floor(15 * 3.0) + 25 = 45 + 25 = 70
      expect(challenge.calculateActualReward(baseReward)).toBe(70)
    })
  })

  describe('calculateActualPenalty', () => {
    it('失敗時のペナルティが正しく計算される', () => {
      const challenge = new RiskRewardChallenge({
        name: 'テスト',
        description: '',
        power: 10,
        riskLevel: 'high', // 倍率2.0
        successBonus: 10,
        failurePenalty: 8
      })

      const basePenalty = 5
      // floor(5 * 2.0) + 8 = 10 + 8 = 18
      expect(challenge.calculateActualPenalty(basePenalty)).toBe(18)
    })

    it('低リスクのペナルティ計算が正しい', () => {
      const challenge = new RiskRewardChallenge({
        name: '低リスク',
        description: '',
        power: 5,
        riskLevel: 'low', // 倍率1.2
        successBonus: 2,
        failurePenalty: 1
      })

      const basePenalty = 10
      // floor(10 * 1.2) + 1 = 12 + 1 = 13
      expect(challenge.calculateActualPenalty(basePenalty)).toBe(13)
    })
  })

  describe('getRiskDescription', () => {
    it('各リスクレベルの説明が正しく返される', () => {
      const lowRisk = new RiskRewardChallenge({
        name: '', description: '', power: 5,
        riskLevel: 'low', successBonus: 2, failurePenalty: 1
      })
      expect(lowRisk.getRiskDescription()).toContain('低リスク')

      const mediumRisk = new RiskRewardChallenge({
        name: '', description: '', power: 7,
        riskLevel: 'medium', successBonus: 5, failurePenalty: 3
      })
      expect(mediumRisk.getRiskDescription()).toContain('中リスク')

      const highRisk = new RiskRewardChallenge({
        name: '', description: '', power: 10,
        riskLevel: 'high', successBonus: 10, failurePenalty: 7
      })
      expect(highRisk.getRiskDescription()).toContain('高リスク')

      const extremeRisk = new RiskRewardChallenge({
        name: '', description: '', power: 15,
        riskLevel: 'extreme', successBonus: 20, failurePenalty: 15
      })
      expect(extremeRisk.getRiskDescription()).toContain('極限リスク')
      expect(extremeRisk.getRiskDescription()).toContain('保険も効かない')
    })
  })

  describe('getChallengeDetails', () => {
    it('チャレンジの詳細情報が正しくフォーマットされる', () => {
      const challenge = new RiskRewardChallenge({
        name: 'テスト',
        description: '',
        power: 10,
        riskLevel: 'high',
        successBonus: 8,
        failurePenalty: 6
      })

      const details = challenge.getChallengeDetails()
      expect(details).toContain('必要パワー: 10')
      expect(details).toContain('リスクレベル: HIGH')
      expect(details).toContain('成功ボーナス: +8 活力')
      expect(details).toContain('失敗ペナルティ: -6 活力')
      expect(details).not.toContain('保険無効')
    })

    it('保険無効チャレンジの詳細に警告が含まれる', () => {
      const challenge = new RiskRewardChallenge({
        name: '極限',
        description: '',
        power: 20,
        riskLevel: 'extreme',
        successBonus: 25,
        failurePenalty: 20
      })

      const details = challenge.getChallengeDetails()
      expect(details).toContain('⚠️ 保険無効')
    })
  })

  describe('createRiskChallenge', () => {
    describe('青春期のチャレンジ生成', () => {
      it('低リスクチャレンジが正しく生成される', () => {
        const challenge = RiskRewardChallenge.createRiskChallenge('youth', 'low')
        expect(challenge.name).toBe('新しいスポーツへの挑戦')
        expect(challenge.power).toBe(5)
        expect(challenge.successBonus).toBe(2)
        expect(challenge.failurePenalty).toBe(1)
        expect(challenge.riskLevel).toBe('low')
      })

      it('中リスクチャレンジが正しく生成される', () => {
        const challenge = RiskRewardChallenge.createRiskChallenge('youth', 'medium')
        expect(challenge.name).toBe('起業への第一歩')
        expect(challenge.power).toBe(7)
        expect(challenge.riskLevel).toBe('medium')
      })

      it('高リスクチャレンジが正しく生成される', () => {
        const challenge = RiskRewardChallenge.createRiskChallenge('youth', 'high')
        expect(challenge.name).toBe('海外留学')
        expect(challenge.power).toBe(9)
        expect(challenge.riskLevel).toBe('high')
      })

      it('極限リスクチャレンジが正しく生成される', () => {
        const challenge = RiskRewardChallenge.createRiskChallenge('youth', 'extreme')
        expect(challenge.name).toBe('人生を賭けた大勝負')
        expect(challenge.power).toBe(12)
        expect(challenge.riskLevel).toBe('extreme')
        expect(challenge.insuranceImmunity).toBe(true)
        expect(challenge.dreamCategory).toBe('mixed')
      })
    })

    describe('中年期のチャレンジ生成', () => {
      it('各リスクレベルのチャレンジが正しく生成される', () => {
        const low = RiskRewardChallenge.createRiskChallenge('middle', 'low')
        expect(low.name).toBe('副業の開始')
        expect(low.power).toBe(6)

        const medium = RiskRewardChallenge.createRiskChallenge('middle', 'medium')
        expect(medium.name).toBe('独立開業')
        expect(medium.power).toBe(9)

        const high = RiskRewardChallenge.createRiskChallenge('middle', 'high')
        expect(high.name).toBe('大型投資')
        expect(high.power).toBe(11)

        const extreme = RiskRewardChallenge.createRiskChallenge('middle', 'extreme')
        expect(extreme.name).toBe('人生の大転換')
        expect(extreme.power).toBe(15)
      })
    })

    describe('充実期のチャレンジ生成', () => {
      it('各リスクレベルのチャレンジが正しく生成される', () => {
        const low = RiskRewardChallenge.createRiskChallenge('fulfillment', 'low')
        expect(low.name).toBe('新しい趣味への挑戦')
        expect(low.power).toBe(7)

        const medium = RiskRewardChallenge.createRiskChallenge('fulfillment', 'medium')
        expect(medium.name).toBe('ボランティア活動')
        expect(medium.power).toBe(10)

        const high = RiskRewardChallenge.createRiskChallenge('fulfillment', 'high')
        expect(high.name).toBe('遺産の活用')
        expect(high.power).toBe(13)

        const extreme = RiskRewardChallenge.createRiskChallenge('fulfillment', 'extreme')
        expect(extreme.name).toBe('人生最後の大冒険')
        expect(extreme.power).toBe(18)
        expect(extreme.successBonus).toBe(25)
        expect(extreme.failurePenalty).toBe(20)
      })
    })

    it('極限リスク以外のチャレンジは物理カテゴリーになる', () => {
      const low = RiskRewardChallenge.createRiskChallenge('youth', 'low')
      expect(low.dreamCategory).toBe('physical')

      const medium = RiskRewardChallenge.createRiskChallenge('middle', 'medium')
      expect(medium.dreamCategory).toBe('physical')

      const high = RiskRewardChallenge.createRiskChallenge('fulfillment', 'high')
      expect(high.dreamCategory).toBe('physical')
    })
  })
})