/**
 * 並行処理と競合状態テスト
 * 同時操作、レースコンディション、スレッドセーフティを検証
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Game } from '../../domain/entities/Game'
import { Card } from '../../domain/entities/Card'
import { Challenge } from '../../domain/aggregates/challenge/Challenge'

class ConcurrencyTester {
  private operationCounter = 0
  private results: Array<{ operation: string; timestamp: number; success: boolean; error?: string }> = []
  
  async executeParallel<T>(operations: Array<() => Promise<T>>, maxConcurrency = 5): Promise<Array<T | Error>> {
    const semaphore = new Array(maxConcurrency).fill(null)
    const results: Array<T | Error> = []
    
    const executeOperation = async (operation: () => Promise<T>, index: number): Promise<void> => {
      try {
        const result = await operation()
        results[index] = result
      } catch (error) {
        results[index] = error as Error
      }
    }
    
    const promises = operations.map((operation, index) => executeOperation(operation, index))
    await Promise.all(promises)
    
    return results
  }
  
  logOperation(operation: string, success: boolean, error?: string) {
    this.results.push({
      operation,
      timestamp: Date.now(),
      success,
      error
    })
    this.operationCounter++
  }
  
  getOperationReport(): { total: number; successful: number; failed: number; results: any[] } {
    const successful = this.results.filter(r => r.success).length
    const failed = this.results.filter(r => !r.success).length
    
    return {
      total: this.results.length,
      successful,
      failed,
      results: this.results
    }
  }
  
  reset() {
    this.operationCounter = 0
    this.results = []
  }
}

describe('並行処理と競合状態テスト', () => {
  let game: Game
  let concurrencyTester: ConcurrencyTester
  
  beforeEach(() => {
    game = new Game()
    concurrencyTester = new ConcurrencyTester()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    concurrencyTester.reset()
  })

  describe('カード操作の競合状態', () => {
    it('同一カードの同時プレイ操作', async () => {
      const card = Card.createAction('競合テストカード', 10, 5)
      game.addCardToHand(card)
      game.proceedToActionPhase()
      
      const playOperations = Array(10).fill(null).map((_, index) => async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
          game.playCard(card)
          concurrencyTester.logOperation(`play-${index}`, true)
          return 'success'
        } catch (error) {
          concurrencyTester.logOperation(`play-${index}`, false, error.message)
          return 'error'
        }
      })
      
      const results = await concurrencyTester.executeParallel(playOperations)
      const report = concurrencyTester.getOperationReport()
      
      // 1回だけ成功し、残りは失敗することを期待
      expect(report.successful).toBe(1)
      expect(report.failed).toBe(9)
      
      // カードが手札から削除されていることを確認
      expect(game.getHandCards()).not.toContain(card)
    })
    
    it('複数カードの同時追加操作', async () => {
      const cards = Array(20).fill(null).map((_, i) => 
        Card.createAction(`カード${i}`, 10, 1)
      )
      
      const addOperations = cards.map((card, index) => async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 20))
          game.addCardToHand(card)
          concurrencyTester.logOperation(`add-${index}`, true)
          return card.id
        } catch (error) {
          concurrencyTester.logOperation(`add-${index}`, false, error.message)
          return null
        }
      })
      
      const results = await concurrencyTester.executeParallel(addOperations, 10)
      const report = concurrencyTester.getOperationReport()
      
      console.log('カード追加競合テスト結果:', report)
      
      // 手札の整合性を確認
      const finalHandSize = game.getHandCards().length
      expect(finalHandSize).toBeGreaterThan(0)
      expect(finalHandSize).toBeLessThanOrEqual(20)
      
      // 成功した操作数と手札サイズが一致することを確認
      expect(report.successful).toBe(finalHandSize)
    })
    
    it('カードドローの競合処理', async () => {
      // 複数の同時ドロー操作
      const drawOperations = Array(15).fill(null).map((_, index) => async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 15))
          const drawnCard = game.drawCard()
          concurrencyTester.logOperation(`draw-${index}`, true)
          return drawnCard
        } catch (error) {
          concurrencyTester.logOperation(`draw-${index}`, false, error.message)
          return null
        }
      })
      
      const results = await concurrencyTester.executeParallel(drawOperations, 8)
      const report = concurrencyTester.getOperationReport()
      
      console.log('カードドロー競合テスト結果:', report)
      
      // ドローしたカードのIDが重複していないことを確認
      const drawnCards = results.filter(r => r && !(r instanceof Error) && r !== null)
      const cardIds = drawnCards.map(card => (card as any).id)
      const uniqueIds = new Set(cardIds)
      
      expect(uniqueIds.size).toBe(cardIds.length) // ID重複なし
    })
  })

  describe('ゲーム状態の競合管理', () => {
    it('体力変更の同時操作', async () => {
      const healthOperations = [
        ...Array(5).fill(null).map((_, i) => async () => {
          try {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 30))
            game.takeDamage(10)
            concurrencyTester.logOperation(`damage-${i}`, true)
            return game.getPlayerVitality()
          } catch (error) {
            concurrencyTester.logOperation(`damage-${i}`, false, error.message)
            return null
          }
        }),
        ...Array(3).fill(null).map((_, i) => async () => {
          try {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 30))
            game.restoreVitality(15)
            concurrencyTester.logOperation(`heal-${i}`, true)
            return game.getPlayerVitality()
          } catch (error) {
            concurrencyTester.logOperation(`heal-${i}`, false, error.message)
            return null
          }
        })
      ]
      
      const initialVitality = game.getPlayerVitality()
      const results = await concurrencyTester.executeParallel(healthOperations, 6)
      const finalVitality = game.getPlayerVitality()
      
      const report = concurrencyTester.getOperationReport()
      console.log('体力変更競合テスト結果:', { initialVitality, finalVitality, report })
      
      // 体力値の整合性確認
      expect(finalVitality).toBeGreaterThanOrEqual(0)
      expect(finalVitality).toBeLessThanOrEqual(game.getMaxVitality())
      
      // 順序によらず一貫した結果が得られることを確認
      const vitalityResults = results.filter(r => typeof r === 'number') as number[]
      vitalityResults.forEach(vitality => {
        expect(vitality).toBeGreaterThanOrEqual(0)
        expect(vitality).toBeLessThanOrEqual(game.getMaxVitality())
      })
    })
    
    it('ターン進行の競合制御', async () => {
      const turnOperations = Array(8).fill(null).map((_, index) => async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 25))
          
          if (game.getCurrentPhase().toString() === 'DRAW') {
            game.proceedToActionPhase()
          }
          
          game.endTurn()
          
          concurrencyTester.logOperation(`turn-${index}`, true)
          return game.getCurrentTurn()
        } catch (error) {
          concurrencyTester.logOperation(`turn-${index}`, false, error.message)
          return null
        }
      })
      
      const initialTurn = game.getCurrentTurn()
      const results = await concurrencyTester.executeParallel(turnOperations, 4)
      const finalTurn = game.getCurrentTurn()
      
      const report = concurrencyTester.getOperationReport()
      console.log('ターン進行競合テスト結果:', { initialTurn, finalTurn, report })
      
      // ターン番号の単調増加を確認
      expect(finalTurn).toBeGreaterThan(initialTurn)
      
      // 成功した操作数とターン進行が論理的に一致
      const successfulTurns = report.successful
      expect(finalTurn - initialTurn).toBeLessThanOrEqual(successfulTurns + 1)
    })
    
    it('フェーズ遷移の競合安全性', async () => {
      const phaseOperations = [
        async () => {
          try {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 20))
            game.proceedToActionPhase()
            concurrencyTester.logOperation('to-action', true)
            return 'ACTION'
          } catch (error) {
            concurrencyTester.logOperation('to-action', false, error.message)
            return null
          }
        },
        async () => {
          try {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 20))
            game.proceedToChallenge()
            concurrencyTester.logOperation('to-challenge', true)
            return 'CHALLENGE'
          } catch (error) {
            concurrencyTester.logOperation('to-challenge', false, error.message)
            return null
          }
        },
        async () => {
          try {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 20))
            game.endTurn()
            concurrencyTester.logOperation('end-turn', true)
            return 'DRAW'
          } catch (error) {
            concurrencyTester.logOperation('end-turn', false, error.message)
            return null
          }
        }
      ]
      
      const results = await concurrencyTester.executeParallel(phaseOperations, 3)
      const report = concurrencyTester.getOperationReport()
      
      console.log('フェーズ遷移競合テスト結果:', report)
      
      // 最終的に有効なフェーズ状態であることを確認
      const finalPhase = game.getCurrentPhase()
      const validPhases = ['DRAW', 'ACTION', 'CHALLENGE']
      expect(validPhases).toContain(finalPhase.toString())
    })
  })

  describe('チャレンジシステムの競合処理', () => {
    it('同一チャレンジの同時選択', async () => {
      game.proceedToActionPhase()
      game.proceedToChallenge()
      
      const challenges = game.getAvailableChallenges()
      if (challenges.length === 0) {
        // テスト用チャレンジを追加
        const testChallenge = Challenge.create('競合テスト', 10, 20)
        game.addAvailableChallenge(testChallenge)
      }
      
      const challenge = game.getAvailableChallenges()[0]
      
      const selectOperations = Array(6).fill(null).map((_, index) => async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 15))
          game.selectChallenge(challenge)
          concurrencyTester.logOperation(`select-${index}`, true)
          return challenge.id
        } catch (error) {
          concurrencyTester.logOperation(`select-${index}`, false, error.message)
          return null
        }
      })
      
      const results = await concurrencyTester.executeParallel(selectOperations, 4)
      const report = concurrencyTester.getOperationReport()
      
      console.log('チャレンジ選択競合テスト結果:', report)
      
      // 1回だけ成功することを期待
      expect(report.successful).toBe(1)
      expect(game.getCurrentChallenge()).toBe(challenge)
    })
    
    it('チャレンジ解決の競合制御', async () => {
      // チャレンジ設定
      game.proceedToActionPhase()
      game.proceedToChallenge()
      
      const challenge = Challenge.create('解決テスト', 10, 15)
      game.addAvailableChallenge(challenge)
      game.selectChallenge(challenge)
      
      // チャレンジ用カードを追加
      const challengeCard = Card.createAction('チャレンジカード', 20, 5)
      game.addCardToHand(challengeCard)
      game.selectCardsForChallenge([challengeCard])
      
      const resolveOperations = Array(5).fill(null).map((_, index) => async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 20))
          const result = game.resolveChallenge()
          concurrencyTester.logOperation(`resolve-${index}`, true)
          return result
        } catch (error) {
          concurrencyTester.logOperation(`resolve-${index}`, false, error.message)
          return null
        }
      })
      
      const results = await concurrencyTester.executeParallel(resolveOperations, 3)
      const report = concurrencyTester.getOperationReport()
      
      console.log('チャレンジ解決競合テスト結果:', report)
      
      // 1回だけ成功することを期待
      expect(report.successful).toBe(1)
    })
  })

  describe('保険システムの競合処理', () => {
    it('同一保険の同時購入', async () => {
      game.proceedToActionPhase()
      
      const insuranceCard = Card.createInsurance('競合保険', 10, 50, 'term')
      
      const purchaseOperations = Array(7).fill(null).map((_, index) => async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 18))
          game.addCardToHand(insuranceCard)
          game.playCard(insuranceCard)
          concurrencyTester.logOperation(`purchase-${index}`, true)
          return insuranceCard.id
        } catch (error) {
          concurrencyTester.logOperation(`purchase-${index}`, false, error.message)
          return null
        }
      })
      
      const results = await concurrencyTester.executeParallel(purchaseOperations, 4)
      const report = concurrencyTester.getOperationReport()
      
      console.log('保険購入競合テスト結果:', report)
      
      // 重複購入が適切に制御されることを確認
      const activeInsurances = game.getActiveInsurances()
      const duplicateInsurances = activeInsurances.filter(ins => ins.name === insuranceCard.name)
      
      // 同一保険の重複購入制御がある場合
      expect(duplicateInsurances.length).toBeLessThanOrEqual(report.successful)
    })
    
    it('保険適用の競合処理', async () => {
      // 保険を事前に購入
      const insurance = Card.createInsurance('適用テスト保険', 5, 30, 'permanent')
      game.addCardToHand(insurance)
      game.proceedToActionPhase()
      game.playCard(insurance)
      
      // 同時にダメージを受ける状況を作成
      const damageOperations = Array(4).fill(null).map((_, index) => async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 12))
          game.takeDamage(25) // 保険適用が必要なダメージ
          concurrencyTester.logOperation(`damage-${index}`, true)
          return game.getPlayerVitality()
        } catch (error) {
          concurrencyTester.logOperation(`damage-${index}`, false, error.message)
          return null
        }
      })
      
      const initialVitality = game.getPlayerVitality()
      const results = await concurrencyTester.executeParallel(damageOperations, 4)
      const finalVitality = game.getPlayerVitality()
      
      const report = concurrencyTester.getOperationReport()
      console.log('保険適用競合テスト結果:', { initialVitality, finalVitality, report })
      
      // 保険が適切に適用されることを確認
      expect(finalVitality).toBeGreaterThanOrEqual(0)
      
      // 保険適用により期待されるダメージ軽減が行われているか
      const expectedDamage = 25 * report.successful
      const actualDamage = initialVitality - finalVitality
      expect(actualDamage).toBeLessThan(expectedDamage) // 保険により軽減
    })
  })

  describe('データ整合性の競合テスト', () => {
    it('ゲーム状態の原子性保証', async () => {
      const complexOperations = [
        async () => {
          try {
            // 複合操作: カード追加 + プレイ + ターン終了
            const card = Card.createAction('複合操作カード', 10, 5)
            game.addCardToHand(card)
            game.proceedToActionPhase()
            game.playCard(card)
            game.endTurn()
            concurrencyTester.logOperation('complex-1', true)
            return 'success'
          } catch (error) {
            concurrencyTester.logOperation('complex-1', false, error.message)
            return 'error'
          }
        },
        async () => {
          try {
            // 別の複合操作: 体力操作 + 保険購入
            game.takeDamage(20)
            const insurance = Card.createInsurance('複合保険', 8, 40, 'term')
            game.addCardToHand(insurance)
            if (game.getCurrentPhase().toString() === 'DRAW') {
              game.proceedToActionPhase()
            }
            game.playCard(insurance)
            concurrencyTester.logOperation('complex-2', true)
            return 'success'
          } catch (error) {
            concurrencyTester.logOperation('complex-2', false, error.message)
            return 'error'
          }
        }
      ]
      
      const results = await concurrencyTester.executeParallel(complexOperations, 2)
      const report = concurrencyTester.getOperationReport()
      
      console.log('データ整合性競合テスト結果:', report)
      
      // 最終的なゲーム状態が整合性を保っていることを確認
      expect(game.getPlayerVitality()).toBeGreaterThanOrEqual(0)
      expect(game.getPlayerVitality()).toBeLessThanOrEqual(game.getMaxVitality())
      expect(game.getCurrentTurn()).toBeGreaterThanOrEqual(1)
      expect(game.getPlayerAge()).toBeGreaterThanOrEqual(20)
    })
    
    it('ID生成の一意性保証', async () => {
      const idGenerationOperations = Array(50).fill(null).map((_, index) => async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 5))
          const card = Card.createAction(`ID生成テスト${index}`, 10, 1)
          concurrencyTester.logOperation(`id-gen-${index}`, true)
          return card.id
        } catch (error) {
          concurrencyTester.logOperation(`id-gen-${index}`, false, error.message)
          return null
        }
      })
      
      const results = await concurrencyTester.executeParallel(idGenerationOperations, 10)
      const report = concurrencyTester.getOperationReport()
      
      console.log('ID生成競合テスト結果:', report)
      
      // 生成されたIDの一意性を確認
      const generatedIds = results.filter(id => id && typeof id === 'string') as string[]
      const uniqueIds = new Set(generatedIds)
      
      expect(uniqueIds.size).toBe(generatedIds.length) // 重複なし
      expect(generatedIds.length).toBe(report.successful)
    })
  })

  describe('競合状態のストレステスト', () => {
    it('高負荷下での安定性', async () => {
      const highLoadOperations = Array(100).fill(null).map((_, index) => async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 2))
          
          // ランダムな操作を実行
          const operations = [
            () => {
              const card = Card.createAction(`負荷テスト${index}`, 5, 1)
              game.addCardToHand(card)
            },
            () => game.takeDamage(1),
            () => game.restoreVitality(2),
            () => {
              if (game.getCurrentPhase().toString() === 'DRAW') {
                game.proceedToActionPhase()
              }
            }
          ]
          
          const randomOp = operations[Math.floor(Math.random() * operations.length)]
          randomOp()
          
          concurrencyTester.logOperation(`load-${index}`, true)
          return 'success'
        } catch (error) {
          concurrencyTester.logOperation(`load-${index}`, false, error.message)
          return 'error'
        }
      })
      
      const startTime = Date.now()
      const results = await concurrencyTester.executeParallel(highLoadOperations, 20)
      const endTime = Date.now()
      
      const report = concurrencyTester.getOperationReport()
      
      console.log('高負荷競合テスト結果:', {
        ...report,
        duration: `${endTime - startTime}ms`,
        operationsPerSecond: (report.total / ((endTime - startTime) / 1000)).toFixed(2)
      })
      
      // パフォーマンス基準の確認
      expect(endTime - startTime).toBeLessThan(5000) // 5秒以内に完了
      
      // 成功率の確認
      const successRate = report.successful / report.total
      expect(successRate).toBeGreaterThan(0.7) // 70%以上の成功率
      
      // 最終状態の整合性確認
      expect(game.getPlayerVitality()).toBeGreaterThanOrEqual(0)
      expect(game.getPlayerVitality()).toBeLessThanOrEqual(game.getMaxVitality())
    })
  })
})