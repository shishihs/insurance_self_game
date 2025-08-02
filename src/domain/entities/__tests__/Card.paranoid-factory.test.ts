import { beforeEach, describe, expect, it } from 'vitest'
import { Card } from '../Card'
import type { CardEffect, SkillRarity } from '../../types/card.types'

/**
 * Card エンティティ - ファクトリーメソッド・値オブジェクト統合テスト
 * 
 * Test Paranoidによる包括的破綻パターン検証:
 * - ファクトリーメソッドの境界値処理
 * - 値オブジェクト統合での型安全性
 * - カード効果の複雑な組み合わせ
 * - メモリ効率性とオブジェクトプール
 * - 保険カードの複雑な計算ロジック
 */
describe('Card - ファクトリーメソッド・値オブジェクト統合テスト', () => {

  describe('🔥 ファクトリーメソッドの境界値テスト', () => {
    it('createLifeCard - 極端なパワー値での生成', () => {
      // 最大パワー
      const maxCard = Card.createLifeCard('Max Power', Number.MAX_SAFE_INTEGER)
      expect(maxCard.power).toBe(Number.MAX_SAFE_INTEGER)
      expect(maxCard.getPower().getValue()).toBe(Number.MAX_SAFE_INTEGER)
      
      // 最小パワー（負の値）
      const minCard = Card.createLifeCard('Min Power', -1000)
      expect(minCard.power).toBe(-1000)
      expect(minCard.getPower().getValue()).toBe(-1000)
      
      // ゼロパワー
      const zeroCard = Card.createLifeCard('Zero Power', 0)
      expect(zeroCard.power).toBe(0)
      expect(zeroCard.calculateEffectivePower()).toBe(0)
    })

    it('createInsuranceCard - 複雑な効果組み合わせ', () => {
      const effects: CardEffect[] = [
        { type: 'shield', value: 100, description: 'Shield 100' },
        { type: 'damage_reduction', value: 5, description: 'Reduce 5' },
        { type: 'turn_heal', value: 2, description: 'Heal 2' }
      ]
      
      const card = Card.createInsuranceCard('Complex Insurance', 10, 5, ...effects)
      
      expect(card.effects).toHaveLength(3)
      expect(card.hasEffect('shield')).toBe(true)
      expect(card.hasEffect('damage_reduction')).toBe(true)
      expect(card.hasEffect('turn_heal')).toBe(true)
      expect(card.getEffect('shield')?.value).toBe(100)
    })

    it('createSkillCard - レアリティ別のクールダウン処理', () => {
      const rarities: SkillRarity[] = ['common', 'rare', 'epic', 'legendary']
      
      rarities.forEach(rarity => {
        const card = Card.createSkillCard(`${rarity} Skill`, rarity, 5, 3)
        
        expect(card.skillProperties?.rarity).toBe(rarity)
        expect(card.skillProperties?.cooldown).toBe(3)
        expect(card.skillProperties?.remainingCooldown).toBe(0)
        expect(card.skillProperties?.masteryLevel).toBe(1)
      })
    })

    it('createComboCard - 必要カード配列の境界条件', () => {
      // 空の必要カード配列
      const emptyCombo = Card.createComboCard('Empty Combo', 5, [], 10)
      expect(emptyCombo.comboProperties?.requiredCards).toHaveLength(0)
      
      // 大量の必要カード
      const manyCards = Array.from({length: 100}, (_, i) => `card_${i}`)
      const complexCombo = Card.createComboCard('Complex Combo', 3, manyCards, 20)
      expect(complexCombo.comboProperties?.requiredCards).toHaveLength(100)
    })

    it('ファクトリーメソッドでのID生成一意性', () => {
      const cards = Array.from({length: 1000}, (_, i) => 
        Card.createLifeCard(`Card ${i}`, i)
      )
      
      const ids = cards.map(card => card.id)
      const uniqueIds = new Set(ids)
      
      expect(uniqueIds.size).toBe(1000) // 全てのIDがユニーク
    })
  })

  describe('💀 値オブジェクト統合での型安全性', () => {
    it('CardPower値オブジェクトの境界値統合', () => {
      const card = new Card({
        id: 'test',
        name: 'Test',
        description: 'Test',
        type: 'life',
        power: 50,
        cost: 10,
        effects: []
      })
      
      // CardPower値オブジェクトとの統合確認
      expect(card.getPower().getValue()).toBe(50)
      expect(card.power).toBe(50) // getter経由
      
      // 比較メソッドの動作確認
      expect(card.hasPowerAtLeast(30)).toBe(true)
      expect(card.hasPowerAtLeast(50)).toBe(true)
      expect(card.hasPowerAtLeast(51)).toBe(false)
    })

    it('InsurancePremium値オブジェクトの境界値統合', () => {
      const card = new Card({
        id: 'test',
        name: 'Test Insurance',
        description: 'Test',
        type: 'insurance',
        power: 30,
        cost: 15,
        effects: []
      })
      
      // InsurancePremium値オブジェクトとの統合確認
      expect(card.getCost().getValue()).toBe(15)
      expect(card.cost).toBe(15) // getter経由
      
      // コスト支払い可能性判定
      expect(card.isAffordableWith(20)).toBe(true)
      expect(card.isAffordableWith(15)).toBe(true)
      expect(card.isAffordableWith(14)).toBe(false)
    })

    it('null/undefined値での値オブジェクト生成エラー', () => {
      // 不正なパラメータでのカード生成
      expect(() => new Card({
        id: 'test',
        name: 'Test',
        description: 'Test', 
        type: 'life',
        power: NaN, // 不正な値
        cost: 0,
        effects: []
      })).toThrow()
      
      expect(() => new Card({
        id: 'test',
        name: 'Test',
        description: 'Test',
        type: 'life',
        power: 10,
        cost: Infinity, // 不正な値
        effects: []
      })).toThrow()
    })
  })

  describe('⚡ 保険カードの複雑な計算ロジック', () => {
    it('防御型保険のダメージ軽減計算', () => {
      const defensiveCard = new Card({
        id: 'defensive',
        name: 'Defensive Insurance',
        description: 'Damage reduction',
        type: 'insurance',
        power: 0,
        cost: 5,
        insuranceEffectType: 'defensive',
        coverage: 50,
        effects: [
          { type: 'damage_reduction', value: 10, description: 'Reduce 10 damage' }
        ]
      })
      
      expect(defensiveCard.isDefensiveInsurance()).toBe(true)
      expect(defensiveCard.calculateDamageReduction()).toBe(60) // coverage + effect
      expect(defensiveCard.calculateEffectivePower()).toBe(0) // 防御型はパワー提供しない
    })

    it('回復型保険のターン回復計算', () => {
      const recoveryCard = new Card({
        id: 'recovery',
        name: 'Recovery Insurance',
        description: 'Turn heal',
        type: 'insurance',
        power: 0,
        cost: 4,
        insuranceEffectType: 'recovery',
        coverage: 80,
        effects: [
          { type: 'turn_heal', value: 3, description: 'Heal 3 per turn' }
        ]
      })
      
      expect(recoveryCard.isRecoveryInsurance()).toBe(true)
      expect(recoveryCard.calculateTurnHeal()).toBe(7) // floor(80/20) + 3 = 4 + 3
      expect(recoveryCard.calculateEffectivePower()).toBe(0) // 回復型はパワー提供しない
    })

    it('特化型保険のチャレンジボーナス計算', () => {
      const specializedCard = new Card({
        id: 'specialized',
        name: 'Job Specialized Insurance',
        description: 'Job challenge bonus',
        type: 'insurance',
        power: 5,
        cost: 6,
        insuranceEffectType: 'specialized',
        coverage: 100,
        effects: [
          { 
            type: 'challenge_bonus', 
            value: 15, 
            description: 'Job bonus',
            condition: 'job,career,work,employment'
          }
        ]
      })
      
      expect(specializedCard.isSpecializedInsurance()).toBe(true)
      expect(specializedCard.calculateChallengeBonus('job')).toBe(15)
      expect(specializedCard.calculateChallengeBonus('career')).toBe(15)
      expect(specializedCard.calculateChallengeBonus('health')).toBe(0)
      expect(specializedCard.calculateEffectivePower()).toBe(0) // 特化型も基本はパワー提供しない
    })

    it('年齢ボーナス込みの有効パワー計算', () => {
      const insuranceCard = new Card({
        id: 'age_bonus',
        name: 'Age Bonus Insurance',
        description: 'Power with age bonus',
        type: 'insurance',
        power: 10,
        cost: 5,
        ageBonus: 5,
        insuranceEffectType: 'offensive',
        effects: []
      })
      
      expect(insuranceCard.calculateEffectivePower()).toBe(15) // 10 + 5
      expect(insuranceCard.calculateEffectivePower(3)).toBe(18) // 10 + 5 + 3
    })
  })

  describe('🔄 定期保険の期限管理', () => {
    it('remainingTurns の境界値処理', () => {
      const termInsurance = new Card({
        id: 'term',
        name: 'Term Insurance',
        description: 'Limited duration',
        type: 'insurance',
        power: 8,
        cost: 4,
        durationType: 'term',
        remainingTurns: 5,
        effects: []
      })
      
      expect(termInsurance.isTermInsurance()).toBe(true)
      expect(termInsurance.isExpired()).toBe(false)
      
      // ターン減少処理
      const afterTurn = termInsurance.decrementRemainingTurns()
      expect(afterTurn.remainingTurns).toBe(4)
      expect(afterTurn.isExpired()).toBe(false)
      
      // 元のインスタンスは変更されない（不変性）
      expect(termInsurance.remainingTurns).toBe(5)
    })

    it('期限切れ判定の境界条件', () => {
      const expiredInsurance = new Card({
        id: 'expired',
        name: 'Expired Insurance',
        description: 'Already expired',
        type: 'insurance',
        power: 8,
        cost: 4,
        durationType: 'term',
        remainingTurns: 0,
        effects: []
      })
      
      expect(expiredInsurance.isExpired()).toBe(true)
      
      // 既に期限切れでもdecrementは安全
      const stillExpired = expiredInsurance.decrementRemainingTurns()
      expect(stillExpired.remainingTurns).toBe(0)
      expect(stillExpired.isExpired()).toBe(true)
    })

    it('terminableオブジェクトの操作安全性', () => {
      const termCard = new Card({
        id: 'term_safe',
        name: 'Term Safe',
        description: 'Safe operations',
        type: 'insurance',
        power: 6,
        cost: 3,
        durationType: 'term',
        remainingTurns: 1,
        effects: []
      })
      
      // 最後のターンでの操作
      const lastTurn = termCard.decrementRemainingTurns()
      expect(lastTurn.remainingTurns).toBe(0)
      expect(lastTurn.isExpired()).toBe(true)
      
      // 期限切れ後の操作も安全
      const afterExpiry = lastTurn.decrementRemainingTurns()
      expect(afterExpiry.remainingTurns).toBe(0)
      expect(afterExpiry).not.toBe(lastTurn) // 新しいインスタンス
    })
  })

  describe('🧠 カードコピー・クローンの完全性', () => {
    it('copy メソッドでの深いコピー確認', () => {
      const original = new Card({
        id: 'original',
        name: 'Original Card',
        description: 'Original',
        type: 'insurance',
        power: 10,
        cost: 5,
        effects: [
          { type: 'shield', value: 50, description: 'Shield' },
          { type: 'damage_reduction', value: 5, description: 'Reduction' }
        ],
        skillProperties: {
          rarity: 'rare',
          cooldown: 3,
          remainingCooldown: 1,
          masteryLevel: 2
        }
      })
      
      const copied = original.copy({ power: 15, name: 'Copied Card' })
      
      // 更新された値
      expect(copied.power).toBe(15)
      expect(copied.name).toBe('Copied Card')
      
      // 変更されない値
      expect(copied.cost).toBe(5)
      expect(copied.effects).toHaveLength(2)
      expect(copied.skillProperties?.rarity).toBe('rare')
      
      // 配列の独立性確認
      expect(copied.effects).not.toBe(original.effects)
      expect(copied.effects[0]).toEqual(original.effects[0])
      
      // 元のインスタンスは変更されない
      expect(original.power).toBe(10)
      expect(original.name).toBe('Original Card')
    })

    it('clone メソッドの完全な複製', () => {
      const complex = new Card({
        id: 'complex',
        name: 'Complex Card',
        description: 'Complex',
        type: 'combo',
        power: 12,
        cost: 8,
        effects: [
          { type: 'shield', value: 100, description: 'Big Shield' }
        ],
        comboProperties: {
          requiredCards: ['card1', 'card2', 'card3'],
          comboBonus: 20
        },
        eventProperties: {
          duration: 5,
          globalEffect: true
        }
      })
      
      const cloned = complex.clone()
      
      // 全ての値が同じ
      expect(cloned).toEqual(complex)
      
      // しかし別のインスタンス
      expect(cloned).not.toBe(complex)
      expect(cloned.effects).not.toBe(complex.effects)
      expect(cloned.comboProperties?.requiredCards).not.toBe(complex.comboProperties?.requiredCards)
    })
  })

  describe('🎯 夢カード・レジェンダリーカード特殊処理', () => {
    it('夢カードの判定と分類', () => {
      const dreamCard = new Card({
        id: 'dream',
        name: 'Dream Achievement',
        description: 'Life dream',
        type: 'dream',
        power: 15,
        cost: 0,
        dreamCategory: 'physical',
        effects: []
      })
      
      expect(dreamCard.isDreamCard()).toBe(true)
      expect(dreamCard.dreamCategory).toBe('physical')
      expect(dreamCard.type).toBe('dream')
    })

    it('レジェンダリーカードのアンロック条件', () => {
      const legendary = Card.createLegendaryCard(
        'Ultimate Power',
        100,
        'Complete 1000 challenges'
      )
      
      expect(legendary.isLegendaryCard()).toBe(true)
      expect(legendary.isUnlockable).toBe(true)
      expect(legendary.unlockCondition).toBe('Complete 1000 challenges')
      expect(legendary.power).toBe(100)
    })
  })

  describe('🔒 カード効果の複雑な条件分岐', () => {
    it('hasEffect メソッドの正確性', () => {
      const multiEffectCard = new Card({
        id: 'multi',
        name: 'Multi Effect',
        description: 'Multiple effects',
        type: 'insurance',
        power: 8,
        cost: 6,
        effects: [
          { type: 'shield', value: 50, description: 'Shield' },
          { type: 'damage_reduction', value: 3, description: 'Reduction' },
          { type: 'turn_heal', value: 2, description: 'Heal' },
          { type: 'challenge_bonus', value: 5, description: 'Bonus', condition: 'health' }
        ]
      })
      
      expect(multiEffectCard.hasEffect('shield')).toBe(true)
      expect(multiEffectCard.hasEffect('damage_reduction')).toBe(true)
      expect(multiEffectCard.hasEffect('turn_heal')).toBe(true)
      expect(multiEffectCard.hasEffect('challenge_bonus')).toBe(true)
      expect(multiEffectCard.hasEffect('power_boost')).toBe(false)
    })

    it('getEffect メソッドでの具体的効果取得', () => {
      const effectCard = new Card({
        id: 'effect',
        name: 'Effect Card',
        description: 'Effect test',
        type: 'insurance',
        power: 5,
        cost: 3,
        effects: [
          { type: 'shield', value: 75, description: 'Big Shield' },
          { type: 'damage_reduction', value: 8, description: 'Strong Reduction' }
        ]
      })
      
      const shieldEffect = effectCard.getEffect('shield')
      expect(shieldEffect?.value).toBe(75)
      expect(shieldEffect?.description).toBe('Big Shield')
      
      const reductionEffect = effectCard.getEffect('damage_reduction')
      expect(reductionEffect?.value).toBe(8)
      
      const nonExistentEffect = effectCard.getEffect('turn_heal')
      expect(nonExistentEffect).toBeUndefined()
    })
  })

  describe('📊 パフォーマンス・メモリ効率性テスト', () => {
    it('大量カード生成でのメモリ使用量', () => {
      const startTime = performance.now()
      const cards: Card[] = []
      
      for (let i = 0; i < 5000; i++) {
        cards.push(Card.createLifeCard(`Card ${i}`, i % 100))
      }
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(200) // 200ms以内
      expect(cards.length).toBe(5000)
      
      // 全てのカードが正しく生成されている
      expect(cards[0].name).toBe('Card 0')
      expect(cards[4999].name).toBe('Card 4999')
    })

    it('カードコピー操作のパフォーマンス', () => {
      const baseCard = new Card({
        id: 'base',
        name: 'Base Card',
        description: 'Performance test',
        type: 'insurance',
        power: 10,
        cost: 5,
        effects: Array.from({length: 10}, (_, i) => ({
          type: 'shield' as const,
          value: i,
          description: `Effect ${i}`
        }))
      })
      
      const startTime = performance.now()
      const copies: Card[] = []
      
      for (let i = 0; i < 1000; i++) {
        copies.push(baseCard.copy({ power: i }))
      }
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(100) // 100ms以内
      expect(copies.length).toBe(1000)
      
      // 全てのコピーが独立している
      copies.forEach((card, index) => {
        expect(card.power).toBe(index)
        expect(card.effects).toHaveLength(10)
      })
    })
  })
})