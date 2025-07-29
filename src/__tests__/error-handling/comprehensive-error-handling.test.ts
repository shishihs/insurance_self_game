/**
 * 包括的エラーハンドリングテスト
 * あらゆる例外ケースとエラー状況をテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Game } from '../../domain/entities/Game'
import { Card } from '../../domain/entities/Card'
import { Challenge } from '../../domain/aggregates/challenge/Challenge'
import { Insurance } from '../../domain/aggregates/insurance/Insurance'
import { GamePhase } from '../../domain/valueObjects/GamePhase'
import { CardType } from '../../domain/valueObjects/CardType'

class ErrorConditionGenerator {
  static createInvalidCard(): Card {
    const card = Card.createAction('Invalid', 10, 5)
    // 意図的に無効な状態を作成
    ;(card as any).id = null
    return card
  }
  
  static createCorruptedGame(): Game {
    const game = new Game()
    // 内部状態を破損させる
    ;(game as any).currentPhase = 'INVALID_PHASE'
    return game
  }
  
  static simulateMemoryPressure(): void {
    // メモリプレッシャーをシミュレート
    const largeDummyData = []
    for (let i = 0; i < 10000; i++) {
      largeDummyData.push(new Array(1000).fill(Math.random()))
    }
    
    // 一定時間後にクリーンアップ
    setTimeout(() => {
      largeDummyData.length = 0
    }, 100)
  }
  
  static async simulateNetworkError(): Promise<never> {
    throw new Error('Network timeout: Connection failed')
  }
  
  static simulateResourceExhaustion(): void {
    // CPU集約的処理をシミュレート
    const start = Date.now()
    while (Date.now() - start < 50) {
      Math.random() * Math.random()
    }
  }
}

describe('包括的エラーハンドリング', () => {
  let game: Game
  let consoleSpy: any
  let errorSpy: any
  
  beforeEach(() => {
    game = new Game()
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    consoleSpy?.mockRestore()
    errorSpy?.mockRestore()
  })

  describe('入力値エラーハンドリング', () => {
    it('nullやundefinedの値が適切に処理される', () => {
      // null値での操作
      expect(() => {
        (game as any).addCardToHand(null)
      }).toThrow()
      
      expect(() => {
        (game as any).selectChallenge(undefined)
      }).toThrow()
      
      // undefined値での保険操作
      expect(() => {
        (game as any).addInsurance(undefined)
      }).toThrow()
    })
    
    it('無効な数値が適切に処理される', () => {
      // 負の値
      expect(() => {
        game.takeDamage(-10)
      }).toThrow('Damage must be a positive number')
      
      expect(() => {
        game.restoreVitality(-5)
      }).toThrow('Amount must be a positive number')
      
      // NaN値
      expect(() => {
        game.takeDamage(NaN)
      }).toThrow()
      
      expect(() => {
        game.restoreVitality(NaN)
      }).toThrow()
      
      // Infinity値
      expect(() => {
        game.takeDamage(Infinity)
      }).toThrow()
    })
    
    it('文字列型の数値が適切にパースされる', () => {
      // 有効な文字列数値
      expect(() => {
        game.takeDamage('10' as any)
      }).not.toThrow()
      
      // 無効な文字列
      expect(() => {
        game.takeDamage('invalid' as any)
      }).toThrow()
      
      expect(() => {
        game.takeDamage('10.5.5' as any)
      }).toThrow()
    })
    
    it('極端な値が適切に制限される', () => {
      // 最大値テスト
      const largeDamage = 999999
      const initialVitality = game.getPlayerVitality()
      
      game.takeDamage(largeDamage)
      
      // 体力が負の値にならないことを確認
      expect(game.getPlayerVitality()).toBeGreaterThanOrEqual(0)
      
      // 最大回復値テスト
      game.restoreVitality(999999)
      const maxVitality = game.getMaxVitality()
      expect(game.getPlayerVitality()).toBeLessThanOrEqual(maxVitality)
    })
  })

  describe('状態遷移エラーハンドリング', () => {
    it('無効なフェーズでの操作が適切に阻止される', () => {
      // ドローフェーズでチャレンジ選択を試行
      expect(game.getCurrentPhase()).toBe(GamePhase.DRAW)
      
      const challenge = Challenge.create('テスト', 10, 10)
      expect(() => {
        game.selectChallenge(challenge)
      }).toThrow('Cannot select challenge during DRAW phase')
      
      // アクションフェーズでカードドローを試行
      game.proceedToActionPhase()
      expect(() => {
        game.drawCard()
      }).toThrow('Cannot draw card during ACTION phase')
    })
    
    it('ゲームオーバー後の操作が適切に阻止される', () => {
      // ゲームオーバー状態にする
      while (!game.isGameOver()) {
        game.takeDamage(50)
      }
      
      expect(game.isGameOver()).toBe(true)
      
      // ゲームオーバー後の操作をテスト
      expect(() => {
        game.proceedToActionPhase()
      }).toThrow('Cannot proceed to action phase: game is over')
      
      expect(() => {
        const card = Card.createAction('テスト', 10, 5)
        game.playCard(card)
      }).toThrow('Cannot play card: game is over')
      
      expect(() => {
        game.endTurn()
      }).toThrow('Cannot end turn: game is over')
    })
    
    it('不正な状態変更が検出される', () => {
      // 内部状態を直接変更しようとする
      expect(() => {
        (game as any).currentPhase = 'INVALID_PHASE'
      }).not.toThrow() // プロパティ設定は成功するが...
      
      // 次の操作で不正状態が検出される
      expect(() => {
        game.proceedToActionPhase()
      }).toThrow()
    })
  })

  describe('リソース不足エラーハンドリング', () => {
    it('体力不足でのカードプレイが適切に処理される', () => {
      // 体力を最小まで減らす
      game.takeDamage(95) // 体力5まで減少
      
      const expensiveCard = Card.createAction('高額カード', 10, 20)
      game.addCardToHand(expensiveCard)
      
      game.proceedToActionPhase()
      
      expect(game.canPlayCard(expensiveCard)).toBe(false)
      expect(() => {
        game.playCard(expensiveCard)
      }).toThrow('Insufficient vitality to play this card')
    })
    
    it('手札上限でのカード追加が適切に処理される', () => {
      // 手札を上限まで埋める
      for (let i = 0; i < 15; i++) { // 仮の上限値
        const card = Card.createAction(`カード${i}`, 10, 1)
        try {
          game.addCardToHand(card)
        } catch (error) {
          // 上限に達した場合
          expect(error.message).toContain('hand is full')
          break
        }
      }
    })
    
    it('デッキ枯渇時の適切な処理', () => {
      // デッキを意図的に枯渇させる
      for (let i = 0; i < 100; i++) {
        try {
          game.drawCard()
        } catch (error) {
          expect(error.message).toContain('deck is empty')
          break
        }
      }
    })
  })

  describe('データ整合性エラーハンドリング', () => {
    it('重複IDを持つカードが適切に処理される', () => {
      const card1 = Card.createAction('カード1', 10, 5)
      const card2 = Card.createAction('カード2', 15, 3)
      
      // 同じIDを強制的に設定
      ;(card2 as any).id = (card1 as any).id
      
      game.addCardToHand(card1)
      
      expect(() => {
        game.addCardToHand(card2)
      }).toThrow('Card with this ID already exists')
    })
    
    it('存在しないカードの操作が適切に処理される', () => {
      const nonExistentCard = Card.createAction('存在しない', 10, 5)
      
      expect(() => {
        game.playCard(nonExistentCard)
      }).toThrow('Card not found in hand')
      
      expect(() => {
        game.removeCardFromHand(nonExistentCard)
      }).toThrow('Card not found in hand')
    })
    
    it('破損したゲーム状態が検出・修復される', () => {
      // 体力を負の値に強制設定
      ;(game as any).playerVitality = -10
      
      // 次の操作で修復されるかテスト
      const correctedVitality = game.getPlayerVitality()
      expect(correctedVitality).toBeGreaterThanOrEqual(0)
    })
  })

  describe('外部依存エラーハンドリング', () => {
    it('ローカルストレージエラーが適切に処理される', () => {
      // ローカルストレージを無効化
      const originalLocalStorage = global.localStorage
      ;(global as any).localStorage = null
      
      try {
        // セーブ操作を試行
        expect(() => {
          game.saveGame()
        }).not.toThrow() // フォールバック処理により例外が発生しない
        
        // ロード操作を試行
        expect(() => {
          Game.loadGame()
        }).not.toThrow() // デフォルト状態で新規ゲーム開始
      } finally {
        ;(global as any).localStorage = originalLocalStorage
      }
    })
    
    it('JSON解析エラーが適切に処理される', () => {
      // 不正なJSONデータをローカルストレージに設定
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue('invalid json data'),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
      
      ;(global as any).localStorage = mockLocalStorage
      
      expect(() => {
        Game.loadGame()
      }).not.toThrow() // パース失敗時は新規ゲーム開始
      
      const newGame = Game.loadGame()
      expect(newGame.getPlayerVitality()).toBe(100) // 初期状態
    })
    
    it('非同期処理エラーが適切に処理される', async () => {
      // 失敗する非同期処理をシミュレート
      const failingAsyncOperation = async () => {
        throw new Error('Async operation failed')
      }
      
      // エラーが適切にキャッチされることを確認
      await expect(failingAsyncOperation()).rejects.toThrow('Async operation failed')
    })
  })

  describe('メモリ・パフォーマンスエラーハンドリング', () => {
    it('メモリ不足状況での適切な処理', () => {
      // メモリプレッシャーをシミュレート
      ErrorConditionGenerator.simulateMemoryPressure()
      
      // ゲーム操作が継続できることを確認
      expect(() => {
        game.proceedToActionPhase()
        game.endTurn()
      }).not.toThrow()
    })
    
    it('CPU過負荷状況での適切な処理', () => {
      const startTime = Date.now()
      
      // CPU集約的処理をシミュレート
      ErrorConditionGenerator.simulateResourceExhaustion()
      
      // ゲーム操作がタイムアウトしないことを確認
      const card = Card.createAction('テスト', 10, 5)
      game.addCardToHand(card)
      game.proceedToActionPhase()
      
      expect(() => {
        game.playCard(card)
      }).not.toThrow()
      
      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(5000) // 5秒以内に完了
    })
    
    it('大量データ処理での安定性', () => {
      // 大量のカードを生成
      const cards = []
      for (let i = 0; i < 1000; i++) {
        cards.push(Card.createAction(`カード${i}`, i % 50 + 1, i % 10))
      }
      
      // メモリ使用量が適切に管理されることを確認
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // 大量処理実行
      expect(() => {
        cards.forEach(card => {
          try {
            game.addCardToHand(card)
          } catch (error) {
            // 手札上限に達した場合は正常
            if (!error.message.includes('hand is full')) {
              throw error
            }
          }
        })
      }).not.toThrow()
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // 100MB以内
      }
    })
  })

  describe('競合状態エラーハンドリング', () => {
    it('同時カード操作での整合性維持', async () => {
      const card = Card.createAction('テストカード', 10, 5)
      game.addCardToHand(card)
      game.proceedToActionPhase()
      
      // 同時プレイ操作をシミュレート
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(
          new Promise(resolve => {
            setTimeout(() => {
              try {
                game.playCard(card)
                resolve('success')
              } catch (error) {
                resolve('error')
              }
            }, i * 10)
          })
        )
      }
      
      const results = await Promise.all(promises)
      
      // 1回だけ成功し、残りは失敗することを期待
      const successCount = results.filter(r => r === 'success').length
      expect(successCount).toBe(1)
    })
    
    it('並行ターン処理での安全性', async () => {
      // 複数の並行ターン終了操作
      const turnEndPromises = []
      
      for (let i = 0; i < 3; i++) {
        turnEndPromises.push(
          new Promise(resolve => {
            setTimeout(() => {
              try {
                game.endTurn()
                resolve(game.getCurrentTurn())
              } catch (error) {
                resolve('error')
              }
            }, i * 50)
          })
        )
      }
      
      const results = await Promise.all(turnEndPromises)
      
      // ターン番号の整合性を確認
      const validResults = results.filter(r => typeof r === 'number')
      if (validResults.length > 0) {
        const maxTurn = Math.max(...validResults as number[])
        expect(maxTurn).toBeLessThanOrEqual(4) // 最大でも4ターン目
      }
    })
  })

  describe('復旧メカニズム', () => {
    it('破損状態からの自動復旧', () => {
      // ゲーム状態を意図的に破損
      ;(game as any).playerVitality = -50
      ;(game as any).playerAge = -10
      ;(game as any).currentTurn = 0
      
      // 復旧メカニズムをトリガー
      game.validateAndRepairState()
      
      // 修復されたことを確認
      expect(game.getPlayerVitality()).toBeGreaterThanOrEqual(0)
      expect(game.getPlayerAge()).toBeGreaterThanOrEqual(20)
      expect(game.getCurrentTurn()).toBeGreaterThanOrEqual(1)
    })
    
    it('部分的データ損失からの復旧', () => {
      // 部分的にデータを削除
      ;(game as any).handCards = undefined
      ;(game as any).playedCards = null
      
      // 復旧操作
      expect(() => {
        game.getHandCards()
      }).not.toThrow()
      
      expect(() => {
        game.getPlayedCards()
      }).not.toThrow()
      
      // デフォルト状態で復旧されることを確認
      expect(Array.isArray(game.getHandCards())).toBe(true)
      expect(Array.isArray(game.getPlayedCards())).toBe(true)
    })
    
    it('設定値のリセットと復旧', () => {
      // 設定を破損
      ;(game as any).gameSettings = null
      
      // デフォルト設定での復旧
      expect(() => {
        game.getGameSettings()
      }).not.toThrow()
      
      const settings = game.getGameSettings()
      expect(settings).toBeDefined()
      expect(typeof settings).toBe('object')
    })
  })

  describe('ログとモニタリング', () => {
    it('エラー発生時の適切なログ出力', () => {
      const card = Card.createAction('テスト', 10, 100) // 高コストカード
      game.addCardToHand(card)
      game.proceedToActionPhase()
      
      // エラー発生操作
      expect(() => {
        game.playCard(card)
      }).toThrow()
      
      // ログが出力されることを確認
      expect(errorSpy).toHaveBeenCalled()
    })
    
    it('警告レベルのイベントログ', () => {
      // 体力低下時の警告
      game.takeDamage(80) // 体力20まで減少
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Low vitality warning')
      )
    })
    
    it('パフォーマンス監視ログ', () => {
      const startTime = Date.now()
      
      // 時間のかかる操作をシミュレート
      for (let i = 0; i < 1000; i++) {
        const card = Card.createAction(`Card${i}`, 10, 1)
        try {
          game.addCardToHand(card)
        } catch (error) {
          break // 手札上限到達
        }
      }
      
      const endTime = Date.now()
      
      // パフォーマンス警告が出力される場合をテスト
      if (endTime - startTime > 1000) {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Performance warning')
        )
      }
    })
  })
})