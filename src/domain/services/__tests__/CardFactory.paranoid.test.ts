import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CardFactory } from '../CardFactory'
import { Card } from '../../entities/Card'
import type { GameStage } from '../../types/card.types'
import { IdGenerator } from '../../../common/IdGenerator'

/**
 * CardFactory Domain Service - Test Paranoid 包括テスト
 * 
 * このテストは、CardFactoryドメインサービスのすべての可能な失敗パターンと
 * エッジケースを網羅的にテストします。
 * 
 * Test Paranoidアプローチ:
 * 1. すべてのメソッドの事前条件・事後条件・不変条件を検証
 * 2. 境界値とエラーケースを徹底的にテスト
 * 3. ファクトリーが生成するオブジェクトの整合性を厳密に検証
 * 4. パフォーマンスとメモリリークを監視
 */
describe('CardFactory Domain Service - Test Paranoid包括テスト', () => {
  
  beforeEach(() => {
    // テスト環境の初期化
    IdGenerator.resetCounter()
  })

  afterEach(() => {
    // テスト後のクリーンアップ
    IdGenerator.resetCounter()
  })

  describe('createStarterLifeCards()の契約テスト', () => {
    describe('基本機能の検証', () => {
      it('スターターライフカードを正確に生成する', () => {
        // Act
        const cards = CardFactory.createStarterLifeCards()
        
        // Assert: 事後条件の検証
        expect(Array.isArray(cards)).toBe(true)
        expect(cards.length).toBeGreaterThan(0)
        
        // すべてのカードが有効なCardインスタンスであることを確認
        cards.forEach(card => {
          expect(card).toBeInstanceOf(Card)
          expect(card.id).toBeDefined()
          expect(card.name).toBeDefined()
          expect(card.description).toBeDefined()
          expect(card.type).toBe('life')
          expect(typeof card.power).toBe('number')
          expect(typeof card.cost).toBe('number')
        })
      })

      it('生成されるカードの種類が期待値と一致する', () => {
        // Act
        const cards = CardFactory.createStarterLifeCards()
        
        // Assert: 期待されるカード名を検証
        const expectedCardNames = [
          '朝のジョギング',
          '栄養バランスの良い食事', 
          '新しいスキルの習得',
          'チームワーク',
          '家族との団らん',
          '趣味の時間',
          '計画的な貯蓄'
        ]
        
        const actualCardNames = cards.map(card => card.name)
        expect(actualCardNames).toEqual(expectedCardNames)
      })

      it('カテゴリ分類が正確である', () => {
        // Act
        const cards = CardFactory.createStarterLifeCards()
        
        // Assert: カテゴリ別の分類を検証
        const categoryCount = cards.reduce<Record<string, number>>((count, card) => {
          const category = (card as any).category
          count[category] = (count[category] || 0) + 1
          return count
        }, {})
        
        expect(categoryCount.health).toBe(2)
        expect(categoryCount.career).toBe(2)
        expect(categoryCount.family).toBe(1)
        expect(categoryCount.hobby).toBe(1)
        expect(categoryCount.finance).toBe(1)
      })
    })

    describe('境界値とエッジケーステスト', () => {
      it('複数回呼び出しても一貫した結果を返す', () => {
        // Act
        const cards1 = CardFactory.createStarterLifeCards()
        const cards2 = CardFactory.createStarterLifeCards()
        
        // Assert: カード名と基本プロパティが同じ
        expect(cards1.length).toBe(cards2.length)
        cards1.forEach((card, index) => {
          expect(card.name).toBe(cards2[index].name)
          expect(card.power).toBe(cards2[index].power)
          expect(card.cost).toBe(cards2[index].cost)
          expect(card.type).toBe(cards2[index].type)
        })
        
        // しかし、IDは異なる（各カードは新しいインスタンス）
        cards1.forEach((card, index) => {
          expect(card.id).not.toBe(cards2[index].id)
        })
      })

      it('パワーとコストが妥当な範囲内である', () => {
        // Act
        const cards = CardFactory.createStarterLifeCards()
        
        // Assert: スターターカードとしての妥当性
        cards.forEach(card => {
          expect(card.power).toBeGreaterThan(0)
          expect(card.power).toBeLessThanOrEqual(5) // スターターなので控えめ
          expect(card.cost).toBeGreaterThan(0)
          expect(card.cost).toBeLessThanOrEqual(3) // スターターなので安価
          expect(card.power).toBeGreaterThanOrEqual(card.cost) // コストパフォーマンス
        })
      })

      it('カードIDの一意性が保証される', () => {
        // Act
        const cards = CardFactory.createStarterLifeCards()
        
        // Assert: 全てのIDが異なる
        const ids = cards.map(card => card.id)
        const uniqueIds = new Set(ids)
        expect(uniqueIds.size).toBe(ids.length)
        
        // IDが有効な形式である
        ids.forEach(id => {
          expect(typeof id).toBe('string')
          expect(id.length).toBeGreaterThan(0)
          expect(id).toMatch(/^card_/)
        })
      })
    })

    describe('イミュータブル性とスレッドセーフティ', () => {
      it('戻り値の配列の変更が次の呼び出しに影響しない', () => {
        // Arrange
        const cards1 = CardFactory.createStarterLifeCards()
        const originalLength = cards1.length
        
        // Act: 配列を変更
        cards1.push({} as Card)
        cards1[0] = {} as Card
        
        // Assert: 次の呼び出しには影響しない
        const cards2 = CardFactory.createStarterLifeCards()
        expect(cards2.length).toBe(originalLength)
        expect(cards2[0]).toBeInstanceOf(Card)
        expect(cards2[0].name).toBe('朝のジョギング')
      })

      it('カードプロパティの変更が元の定義に影響しない', () => {
        // Arrange
        const cards1 = CardFactory.createStarterLifeCards()
        const firstCard = cards1[0]
        const originalName = firstCard.name
        const originalPower = firstCard.power
        
        // Act: カードプロパティへの変更を試みる（TypeScriptではreadonlyだが、実行時は代入可能）
        try {
          (firstCard as any).name = '改変されたカード'
          ;(firstCard as any)._power = 999
        } catch (e) {
          // 厳格モードでエラーが発生する可能性があるが、続行
        }
        
        // Assert: 新しく生成されるカードは元の定義を保持
        const cards2 = CardFactory.createStarterLifeCards()
        expect(cards2[0].name).toBe('朝のジョギング')
        expect(cards2[0].power).toBe(2)
        
        // 各カードは独立したインスタンス
        expect(cards2[0]).not.toBe(cards1[0])
      })
    })
  })

  describe('createBasicInsuranceCards()の契約テスト', () => {
    describe('正常な保険カード生成', () => {
      it('青年期の基本保険カードを正確に生成する', () => {
        // Act
        const cards = CardFactory.createBasicInsuranceCards('youth')
        
        // Assert: 事後条件
        expect(Array.isArray(cards)).toBe(true)
        expect(cards.length).toBe(3) // 医療、生命、収入保障
        
        cards.forEach(card => {
          expect(card).toBeInstanceOf(Card)
          expect(card.type).toBe('insurance')
          expect(card.power).toBeGreaterThan(0)
          expect(card.cost).toBeGreaterThan(0)
          expect(typeof card.name).toBe('string')
          expect(card.name.length).toBeGreaterThan(0)
        })
      })

      it('年齢段階別のボーナスが正確に適用される', () => {
        // Act
        const youthCards = CardFactory.createBasicInsuranceCards('youth')
        const middleCards = CardFactory.createBasicInsuranceCards('middle')
        const fulfillmentCards = CardFactory.createBasicInsuranceCards('fulfillment')
        
        // Assert: 年齢が上がるにつれてパワーが向上する
        const youthPowers = youthCards.map(card => card.power)
        const middlePowers = middleCards.map(card => card.power)
        const fulfillmentPowers = fulfillmentCards.map(card => card.power)
        
        // 中年期は青年期よりパワーが高い（ボーナス0.5）
        middlePowers.forEach((power, index) => {
          expect(power).toBeGreaterThanOrEqual(youthPowers[index])
        })
        
        // 充実期は中年期よりパワーが高い（ボーナス1.0）
        fulfillmentPowers.forEach((power, index) => {
          expect(power).toBeGreaterThanOrEqual(middlePowers[index])
        })
      })

      it('保険タイプが正確に設定される', () => {
        // Act
        const cards = CardFactory.createBasicInsuranceCards('youth')
        
        // Assert: 期待される保険タイプ
        const expectedTypes = ['medical', 'life', 'income']
        const actualTypes = cards.map(card => (card as any).insuranceType)
        
        expectedTypes.forEach(expectedType => {
          expect(actualTypes).toContain(expectedType)
        })
      })
    })

    describe('パラメータ検証とエラーハンドリング', () => {
      it('デフォルトパラメータで正常に動作する', () => {
        // Act
        const cards = CardFactory.createBasicInsuranceCards()
        
        // Assert: デフォルトは青年期
        expect(cards.length).toBe(3)
        cards.forEach(card => {
          expect(card).toBeInstanceOf(Card)
          expect(card.type).toBe('insurance')
        })
      })

      it('無効なステージでもエラーにならない', () => {
        // Act & Assert: TypeScriptの型システムで防がれるが、実行時には適切に処理
        expect(() => {
          CardFactory.createBasicInsuranceCards('invalid_stage' as GameStage)
        }).not.toThrow()
      })

      it('null/undefinedパラメータでも適切に処理される', () => {
        // Act & Assert
        expect(() => {
          CardFactory.createBasicInsuranceCards(null as any)
        }).not.toThrow()
        
        expect(() => {
          CardFactory.createBasicInsuranceCards(undefined as any)
        }).not.toThrow()
      })
    })

    describe('ビジネスルールの検証', () => {
      it('保険カードのコストとパワーが妥当な比率である', () => {
        // Act
        const cards = CardFactory.createBasicInsuranceCards('youth')
        
        // Assert: 保険カードとしての特性
        cards.forEach(card => {
          // 保険カードは防御的なので、コストに対してパワーが適度
          expect(card.power / card.cost).toBeGreaterThan(0.8)
          expect(card.power / card.cost).toBeLessThan(2.0)
          
          // 保険カードはある程度のコストがかかる
          expect(card.cost).toBeGreaterThanOrEqual(3)
          
          // パワーも相応にある
          expect(card.power).toBeGreaterThanOrEqual(4)
        })
      })

      it('保険カードの説明が適切に設定される', () => {
        // Act
        const cards = CardFactory.createBasicInsuranceCards('youth')
        
        // Assert: 保険らしい説明文
        cards.forEach(card => {
          expect(card.description).toContain('保障')
          expect(card.description.length).toBeGreaterThan(5)
        })
      })
    })
  })

  describe('createExtendedInsuranceCards()の契約テスト', () => {
    describe('拡張保険カードの生成検証', () => {
      it('基本保険カードより多くのカードを生成する', () => {
        // Act
        const basicCards = CardFactory.createBasicInsuranceCards('youth')
        const extendedCards = CardFactory.createExtendedInsuranceCards('youth')
        
        // Assert: 拡張版はより多くのカードを含む
        expect(extendedCards.length).toBeGreaterThan(basicCards.length)
        expect(extendedCards.length).toBeGreaterThanOrEqual(3)
      })

      it('年齢段階による特化カードが適切に含まれる', () => {
        // Act
        const youthCards = CardFactory.createExtendedInsuranceCards('youth')
        const middleCards = CardFactory.createExtendedInsuranceCards('middle')
        const fulfillmentCards = CardFactory.createExtendedInsuranceCards('fulfillment')
        
        // Assert: 各年齢段階で異なるカード構成
        expect(youthCards.length).toBeGreaterThan(0)
        expect(middleCards.length).toBeGreaterThan(0)
        expect(fulfillmentCards.length).toBeGreaterThan(0)
        
        // 年齢段階によってパワーとコストが異なる
        const youthPowers = youthCards.map(card => card.power)
        const middlePowers = middleCards.map(card => card.power)
        const fulfillmentPowers = fulfillmentCards.map(card => card.power)
        
        // 年齢が上がるにつれて、パワーボーナスが適用される
        const avgYouthPower = youthPowers.reduce((a, b) => a + b, 0) / youthPowers.length
        const avgMiddlePower = middlePowers.reduce((a, b) => a + b, 0) / middlePowers.length
        const avgFulfillmentPower = fulfillmentPowers.reduce((a, b) => a + b, 0) / fulfillmentPowers.length
        
        // 年齢ボーナスによりパワーが増加
        expect(avgMiddlePower).toBeGreaterThanOrEqual(avgYouthPower)
        expect(avgFulfillmentPower).toBeGreaterThanOrEqual(avgMiddlePower)
      })
    })
  })

  describe('createChallengeCards()の契約テスト', () => {
    describe('チャレンジカード生成の基本検証', () => {
      it('指定されたステージのチャレンジカードを生成する', () => {
        // Act
        const youthChallenges = CardFactory.createChallengeCards('youth')
        const middleChallenges = CardFactory.createChallengeCards('middle')
        const fulfillmentChallenges = CardFactory.createChallengeCards('fulfillment')
        
        // Assert: 各ステージでチャレンジカードが生成される
        expect(Array.isArray(youthChallenges)).toBe(true)
        expect(Array.isArray(middleChallenges)).toBe(true)
        expect(Array.isArray(fulfillmentChallenges)).toBe(true)
        
        expect(youthChallenges.length).toBeGreaterThan(0)
        expect(middleChallenges.length).toBeGreaterThan(0)
        expect(fulfillmentChallenges.length).toBeGreaterThan(0)
        
        // すべてのカードがdreamまたはchallengeタイプ
        const allChallenges = youthChallenges.concat(middleChallenges).concat(fulfillmentChallenges)
        allChallenges.forEach(card => {
          expect(['dream', 'challenge']).toContain(card.type)
          expect(card.power).toBeGreaterThan(0)
        })
      })

      it('ステージが進むにつれてチャレンジが困難になる', () => {
        // Act
        const youthChallenges = CardFactory.createChallengeCards('youth')
        const middleChallenges = CardFactory.createChallengeCards('middle')
        const fulfillmentChallenges = CardFactory.createChallengeCards('fulfillment')
        
        // Assert: 難易度の段階的上昇
        const youthAvgPower = youthChallenges.reduce((sum, card) => sum + card.power, 0) / youthChallenges.length
        const middleAvgPower = middleChallenges.reduce((sum, card) => sum + card.power, 0) / middleChallenges.length
        const fulfillmentAvgPower = fulfillmentChallenges.reduce((sum, card) => sum + card.power, 0) / fulfillmentChallenges.length
        
        expect(middleAvgPower).toBeGreaterThanOrEqual(youthAvgPower)
        expect(fulfillmentAvgPower).toBeGreaterThanOrEqual(middleAvgPower)
      })
    })
  })

  describe('ファクトリーの整合性とパフォーマンステスト', () => {
    describe('大量生成時の安定性', () => {
      it('大量のカード生成でもメモリリークしない', () => {
        // Arrange
        const iterations = 1000
        const startTime = performance.now()
        
        // Act: 大量のカード生成
        for (let i = 0; i < iterations; i++) {
          const cards = CardFactory.createStarterLifeCards()
          expect(cards.length).toBeGreaterThan(0)
        }
        
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // Assert: パフォーマンスが許容範囲内
        expect(duration).toBeLessThan(5000) // 5秒以内
        console.log(`Generated ${iterations * 7} cards in ${duration.toFixed(2)}ms`)
      })

      it('並行生成でも一貫性が保たれる', async () => {
        // Act: 複数のファクトリーメソッドを並行実行
        const promises = [
          () => CardFactory.createStarterLifeCards(),
          () => CardFactory.createBasicInsuranceCards('youth'),
          () => CardFactory.createExtendedInsuranceCards('middle'),
          () => CardFactory.createChallengeCards('fulfillment')
        ].map(async factory => Promise.resolve(factory()))
        
        // Assert: すべての生成が成功
        return Promise.all(promises).then(results => {
          results.forEach(cards => {
            expect(Array.isArray(cards)).toBe(true)
            expect(cards.length).toBeGreaterThan(0)
            cards.forEach(card => {
              expect(card).toBeInstanceOf(Card)
            })
          })
        })
      })
    })

    describe('カードプロパティの検証', () => {
      it('生成されるすべてのカードが必須プロパティを持つ', () => {
        // Act: 全種類のカードを生成
        const starterCards = CardFactory.createStarterLifeCards()
        const basicInsuranceCards = CardFactory.createBasicInsuranceCards('youth')
        const extendedInsuranceCards = CardFactory.createExtendedInsuranceCards('middle')
        const challengeCards = CardFactory.createChallengeCards('fulfillment')
        
        const allCards = starterCards
          .concat(basicInsuranceCards)
          .concat(extendedInsuranceCards)
          .concat(challengeCards)
        
        // Assert: 必須プロパティの存在
        allCards.forEach(card => {
          expect(card.id).toBeDefined()
          expect(typeof card.id).toBe('string')
          expect(card.id.length).toBeGreaterThan(0)
          
          expect(card.name).toBeDefined()
          expect(typeof card.name).toBe('string')
          expect(card.name.length).toBeGreaterThan(0)
          
          expect(card.description).toBeDefined()
          expect(typeof card.description).toBe('string')
          
          expect(card.type).toBeDefined()
          expect(['life', 'insurance', 'challenge', 'dream'].includes(card.type)).toBe(true)
          
          expect(typeof card.power).toBe('number')
          expect(card.power).toBeGreaterThan(0)
          expect(isFinite(card.power)).toBe(true)
          
          expect(typeof card.cost).toBe('number')
          expect(card.cost).toBeGreaterThanOrEqual(0)
          expect(isFinite(card.cost)).toBe(true)
        })
      })

      it('カードエフェクトが適切に設定される', () => {
        // Act
        const cards = CardFactory.createStarterLifeCards()
        
        // Assert: エフェクト配列の整合性
        cards.forEach(card => {
          expect(Array.isArray(card.effects)).toBe(true)
          
          card.effects.forEach(effect => {
            expect(effect).toBeDefined()
            expect(typeof effect).toBe('object')
          })
        })
      })
    })
  })

  describe('エラー耐性と回復力テスト', () => {
    describe('異常な入力に対する耐性', () => {
      it('IDジェネレータが枯渇してもエラーにならない', () => {
        // Arrange: IDジェネレータを極端に進める
        for (let i = 0; i < 10000; i++) {
          IdGenerator.generate()
        }
        
        // Act & Assert: 依然として正常に動作
        expect(() => {
          const cards = CardFactory.createStarterLifeCards()
          expect(cards.length).toBeGreaterThan(0)
        }).not.toThrow()
      })

      it('システムリソース不足時の適切な処理', () => {
        // Act: メモリを意図的に大量消費
        const largeArrays = []
        try {
          for (let i = 0; i < 1000; i++) {
            largeArrays.push(new Array(10000).fill(Math.random()))
          }
        } catch (e) {
          // メモリ不足は無視して続行
        }
        
        // Assert: リソース不足下でも基本機能は動作
        expect(() => {
          const cards = CardFactory.createStarterLifeCards()
          expect(cards.length).toBeGreaterThan(0)
        }).not.toThrow()
        
        // クリーンアップ
        largeArrays.length = 0
      })
    })
  })
})