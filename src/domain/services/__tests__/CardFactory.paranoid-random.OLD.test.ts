import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CardFactory } from '../CardFactory'
import type { GameStage } from '../../types/card.types'

/**
 * CardFactory - ランダム性・確率分布テスト
 * 
 * Test Paranoidによる包括的破綻パターン検証:
 * - ランダム生成の偏りと分布検証
 * - 確率計算の精度テスト  
 * - 極端な入力での安定性
 * - 大量生成でのパフォーマンス
 * - 決定論的テストのためのシード制御
 */
describe('CardFactory - ランダム性・確率分布テスト', () => {

  beforeEach(() => {
    // テストごとにMath.randomをリセット
    vi.unstubAllGlobals()
  })

  describe('🎲 ランダム生成の分布検証', () => {
    it('チャレンジカード生成の確率分布', () => {
      const stages: GameStage[] = ['youth', 'middle', 'fulfillment']
      const generationCounts = new Map<GameStage, number[]>()
      
      // 各ステージで1000回生成
      stages.forEach(stage => {
        const cardCounts: number[] = []
        
        for (let i = 0; i < 1000; i++) {
          const cards = CardFactory.createChallengeCards(stage)
          cardCounts.push(cards.length)
        }
        
        generationCounts.set(stage, cardCounts)
      })
      
      // 分布の検証
      generationCounts.forEach((counts, stage) => {
        const average = counts.reduce((a, b) => a + b, 0) / counts.length
        
        // 平均が期待範囲内（3-4枚）
        expect(average).toBeGreaterThan(3)
        expect(average).toBeLessThan(5)
        
        // 標準偏差の確認（分散が適切）
        const variance = counts.reduce((sum, count) => sum + (count - average)**2, 0) / counts.length
        const stdDev = Math.sqrt(variance)
        expect(stdDev).toBeGreaterThan(0.3) // 適度なばらつき
        expect(stdDev).toBeLessThan(1.0) // 過度なばらつきは避ける
      })
    })

    it('保険種類選択肢の重複なしランダム選択', () => {
      const selectionResults = new Map<string, number>()
      
      // 1000回の選択肢生成
      for (let i = 0; i < 1000; i++) {
        const choices = CardFactory.createInsuranceTypeChoices('youth')
        
        // 重複がないことを確認
        const types = choices.map(c => c.insuranceType)
        const uniqueTypes = new Set(types)
        expect(uniqueTypes.size).toBe(types.length)
        
        // 各タイプの出現回数をカウント
        choices.forEach(choice => {
          const key = choice.insuranceType
          selectionResults.set(key, (selectionResults.get(key) || 0) + 1)
        })
      }
      
      // すべてのタイプが適度に選ばれているか
      const counts = Array.from(selectionResults.values())
      const minCount = Math.min(...counts)
      const maxCount = Math.max(...counts)
      
      // 極端な偏りがないことを確認（最大と最小の差が2倍以内）
      expect(maxCount / minCount).toBeLessThan(2.5)
    })

    it('リスク・リワードチャレンジの確率分布', () => {
      // Math.randomをモック化して確率を制御
      const mockRandom = vi.fn()
      vi.stubGlobal('Math', { ...Math, random: mockRandom })
      
      // 異なる確率での生成テスト
      const probabilities = [0.1, 0.2, 0.5, 0.8, 0.9]
      
      probabilities.forEach(prob => {
        mockRandom.mockReturnValue(prob)
        
        const challenges = CardFactory.createRiskRewardChallenges('youth')
        
        if (prob < 0.2) {
          // 20%未満の場合はリスクチャレンジが生成される
          expect(challenges.length).toBeGreaterThan(0)
        } else {
          // 20%以上の場合は生成されない
          expect(challenges).toHaveLength(0)
        }
      })
    })
  })

  describe('💀 極端な入力での安定性テスト', () => {
    it('Math.random が極端な値を返す場合', () => {
      const extremeValues = [0, 0.000001, 0.999999, 1]
      
      extremeValues.forEach(value => {
        vi.stubGlobal('Math', { ...Math, random: () => value })
        
        expect(() => {
          CardFactory.createChallengeCards('youth')
        }).not.toThrow()
        
        expect(() => {
          CardFactory.createInsuranceTypeChoices('middle')
        }).not.toThrow()
        
        expect(() => {
          CardFactory.createRiskRewardChallenges('fulfillment')
        }).not.toThrow()
      })
    })

    it('不正なステージでの安全な動作', () => {
      const invalidStages = [
        'invalid' as GameStage,
        '' as GameStage,
        null as any,
        undefined as any
      ]
      
      invalidStages.forEach(stage => {
        expect(() => {
          CardFactory.createChallengeCards(stage)
        }).not.toThrow() // フォールバック動作
        
        expect(() => {
          CardFactory.createExtendedInsuranceCards(stage)
        }).not.toThrow()
      })
    })

    it('配列操作での境界条件', () => {
      // 空の配列から選択する状況を強制的に作成
      vi.stubGlobal('Math', { 
        ...Math, 
        random: () => 0.999, // 最後の要素を常に選択
        floor: (x: number) => Math.floor(x)
      })
      
      const choices = CardFactory.createInsuranceTypeChoices('youth')
      expect(choices).toHaveLength(3) // 期待される数
      
      // 各選択肢が適切に生成されている
      choices.forEach(choice => {
        expect(choice.insuranceType).toBeDefined()
        expect(choice.name).toBeDefined()
        expect(choice.termOption.cost).toBeGreaterThan(0)
        expect(choice.wholeLifeOption.cost).toBeGreaterThan(0)
      })
    })
  })

  describe('⚡ 決定論的テスト・シード制御', () => {
    it('同じシードで同じ結果が生成される', () => {
      // カスタムシード実装
      let seed = 12345
      const seededRandom = () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
      
      vi.stubGlobal('Math', { ...Math, random: seededRandom })
      
      // 最初の生成
      const cards1 = CardFactory.createChallengeCards('youth')
      const choices1 = CardFactory.createInsuranceTypeChoices('middle')
      
      // シードをリセット
      seed = 12345
      
      // 同じ結果が得られるか
      const cards2 = CardFactory.createChallengeCards('youth')
      const choices2 = CardFactory.createInsuranceTypeChoices('middle')
      
      expect(cards1).toHaveLength(cards2.length)
      expect(choices1).toHaveLength(choices2.length)
      
      // カードの詳細も一致するか
      cards1.forEach((card, index) => {
        expect(card.name).toBe(cards2[index].name)
        expect(card.power).toBe(cards2[index].power)
      })
    })

    it('異なるシードで異なる結果', () => {
      const results: any[] = []
      
      // 5つの異なるシードでテスト
      for (let seedBase = 1; seedBase <= 5; seedBase++) {
        let seed = seedBase * 1000
        const seededRandom = () => {
          seed = (seed * 9301 + 49297) % 233280
          return seed / 233280
        }
        
        vi.stubGlobal('Math', { ...Math, random: seededRandom })
        
        const cards = CardFactory.createChallengeCards('youth')
        const choices = CardFactory.createInsuranceTypeChoices('middle')
        
        results.push({
          cardCount: cards.length,
          firstCardName: cards[0]?.name,
          choiceTypes: choices.map(c => c.insuranceType)
        })
      }
      
      // 結果に多様性があることを確認
      const cardCounts = results.map(r => r.cardCount)
      const uniqueCounts = new Set(cardCounts)
      expect(uniqueCounts.size).toBeGreaterThan(1) // 異なる結果
      
      const firstNames = results.map(r => r.firstCardName)
      const uniqueNames = new Set(firstNames)
      expect(uniqueNames.size).toBeGreaterThan(1) // 異なるカード名
    })
  })

  describe('🔄 大量生成でのパフォーマンス・メモリ', () => {
    it('大量カード生成のパフォーマンス', () => {
      const startTime = performance.now()
      const allCards: any[] = []
      
      // 各ファクトリーメソッドを大量実行
      for (let i = 0; i < 1000; i++) {
        allCards.push(...CardFactory.createStarterLifeCards())
        allCards.push(...CardFactory.createBasicInsuranceCards('youth'))
        allCards.push(...CardFactory.createChallengeCards('middle'))
        allCards.push(...CardFactory.createSkillCards('fulfillment'))
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(1000) // 1秒以内
      expect(allCards.length).toBeGreaterThan(10000)
      
      // メモリ使用量の確認（概算）
      const sampleCard = allCards[0]
      expect(sampleCard).toHaveProperty('name')
      expect(sampleCard).toHaveProperty('power')
    })

    it('ランダム生成の均等性統計テスト', () => {
      const distributionTest = new Map<number, number>()
      
      // 1000回の生成で枚数分布を調査
      for (let i = 0; i < 1000; i++) {
        const cards = CardFactory.createChallengeCards('youth')
        const count = cards.length
        distributionTest.set(count, (distributionTest.get(count) || 0) + 1)
      }
      
      // 分布の統計的検証
      const counts = Array.from(distributionTest.keys()).sort()
      const frequencies = counts.map(count => distributionTest.get(count)!)
      
      // 最小と最大の枚数
      expect(Math.min(...counts)).toBe(3) // 最小3枚
      expect(Math.max(...counts)).toBe(4) // 最大4枚
      
      // 頻度の検証（カイ二乗検定の簡易版）
      const totalGeneration = 1000
      const expectedFrequency = totalGeneration / counts.length
      
      frequencies.forEach(frequency => {
        const deviation = Math.abs(frequency - expectedFrequency)
        expect(deviation).toBeLessThan(expectedFrequency * 0.3) // 30%以内の偏差
      })
    })

    it('メモリリークの検出', () => {
      // ガベージコレクション前の状態
      const initialMemory = process.memoryUsage?.() || { heapUsed: 0 }
      
      // 大量のカード生成と破棄
      for (let cycle = 0; cycle < 100; cycle++) {
        const tempCards = []
        
        for (let i = 0; i < 100; i++) {
          tempCards.push(...CardFactory.createStarterLifeCards())
          tempCards.push(...CardFactory.createExtendedInsuranceCards('middle'))
        }
        
        // 配列をクリア（参照を削除）
        tempCards.length = 0
      }
      
      // ガベージコレクションを強制実行（環境依存）
      if (global.gc) {
        global.gc()
      }
      
      // メモリ使用量の確認
      const finalMemory = process.memoryUsage?.() || { heapUsed: 0 }
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed
      
      // 異常なメモリ増加がないことを確認（10MB以内）
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024)
    })
  })

  describe('🎯 実際のゲームシナリオでの統合テスト', () => {
    it('全ステージでのカード生成一貫性', () => {
      const stages: GameStage[] = ['youth', 'middle', 'fulfillment']
      const generationResults = new Map<GameStage, any>()
      
      stages.forEach(stage => {
        const starterCards = CardFactory.createStarterLifeCards()
        const insuranceCards = CardFactory.createExtendedInsuranceCards(stage)
        const challengeCards = CardFactory.createChallengeCards(stage)
        const skillCards = CardFactory.createSkillCards(stage)
        
        generationResults.set(stage, {
          starter: starterCards.length,
          insurance: insuranceCards.length,
          challenge: challengeCards.length,
          skill: skillCards.length,
          totalPower: [...starterCards, ...insuranceCards, ...challengeCards, ...skillCards]
            .reduce((sum, card) => sum + card.power, 0)
        })
      })
      
      // ステージが進むにつれてパワーが増加する傾向
      const youthResult = generationResults.get('youth')!
      const middleResult = generationResults.get('middle')!
      const fulfillmentResult = generationResults.get('fulfillment')!
      
      expect(middleResult.totalPower).toBeGreaterThanOrEqual(youthResult.totalPower)
      expect(fulfillmentResult.totalPower).toBeGreaterThanOrEqual(middleResult.totalPower)
    })

    it('保険種類選択の現実的なバランス', () => {
      const balanceTest = {
        termSelections: 0,
        wholeLifeSelections: 0,
        costDifferences: [] as number[]
      }
      
      // 100回の選択肢生成でバランスを検証
      for (let i = 0; i < 100; i++) {
        const choices = CardFactory.createInsuranceTypeChoices('middle')
        
        choices.forEach(choice => {
          const termCost = choice.termOption.cost
          const wholeLifeCost = choice.wholeLifeOption.cost
          
          // コスト差を記録
          balanceTest.costDifferences.push(wholeLifeCost - termCost)
          
          // より安い方が選ばれる傾向をシミュレート
          if (termCost < wholeLifeCost) {
            balanceTest.termSelections++
          } else {
            balanceTest.wholeLifeSelections++
          }
        })
      }
      
      // 定期保険が基本的に安いことを確認
      const avgCostDifference = balanceTest.costDifferences.reduce((a, b) => a + b, 0) / balanceTest.costDifferences.length
      expect(avgCostDifference).toBeGreaterThan(0) // 終身保険の方が高い
      
      // 極端な偏りがないことを確認
      const totalSelections = balanceTest.termSelections + balanceTest.wholeLifeSelections
      const termRatio = balanceTest.termSelections / totalSelections
      expect(termRatio).toBeGreaterThan(0.3) // 30%以上は定期保険が選ばれる
    })

    it('年齢ボーナス計算の一貫性', () => {
      const stages: GameStage[] = ['youth', 'middle', 'fulfillment']
      const bonusProgression: number[] = []
      
      stages.forEach(stage => {
        const insuranceCards = CardFactory.createExtendedInsuranceCards(stage)
        
        // 年齢ボーナスがあるカードの平均ボーナス
        const bonusCards = insuranceCards.filter(card => card.ageBonus && card.ageBonus > 0)
        if (bonusCards.length > 0) {
          const avgBonus = bonusCards.reduce((sum, card) => sum + (card.ageBonus || 0), 0) / bonusCards.length
          bonusProgression.push(avgBonus)
        } else {
          bonusProgression.push(0)
        }
      })
      
      // 年齢が上がるにつれてボーナスが増加する
      expect(bonusProgression[1]).toBeGreaterThanOrEqual(bonusProgression[0]) // middle >= youth
      expect(bonusProgression[2]).toBeGreaterThanOrEqual(bonusProgression[1]) // fulfillment >= middle
    })
  })
})