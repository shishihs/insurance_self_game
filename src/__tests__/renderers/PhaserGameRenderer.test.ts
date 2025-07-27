import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PhaserGameRenderer } from '@/game/renderers/PhaserGameRenderer'
import { GameScene } from '@/game/scenes/GameScene'
import { Game } from '@/domain/entities/Game'
import { Card } from '@/domain/entities/Card'
import type { ChallengeResult } from '@/domain/types/game.types'
import { TestDataGenerator } from '../utils/TestHelpers'

// Mock Phaser
vi.mock('phaser', () => ({
  Scene: class MockScene {
    constructor() {}
  }
}))

// Mock GameScene
const mockGameScene = {
  updateGameState: vi.fn(),
  showCardSelectionUI: vi.fn(),
  displayChallengeResult: vi.fn(),
  displayProgress: vi.fn(),
  displayVitality: vi.fn(),
  displayHand: vi.fn(),
  displayInsuranceCards: vi.fn(),
  displayChallenge: vi.fn(),
  displayInsuranceBurden: vi.fn(),
  showMessage: vi.fn(),
  showError: vi.fn(),
  showStageClear: vi.fn(),
  showVictory: vi.fn(),
  showGameOver: vi.fn(),
  waitForUserSelection: vi.fn().mockResolvedValue([])
}

vi.mock('@/game/scenes/GameScene', () => ({
  GameScene: vi.fn().mockImplementation(() => mockGameScene)
}))

describe('PhaserGameRenderer Tests', () => {
  let renderer: PhaserGameRenderer
  let testGame: Game
  
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Create test data
    TestDataGenerator.setSeed(12345)
    const config = TestDataGenerator.createTestGameConfig()
    testGame = new Game(config)
    
    // Create renderer
    renderer = new PhaserGameRenderer()
  })

  describe('初期化とセットアップ', () => {
    it('正しく初期化される', () => {
      expect(renderer).toBeDefined()
      expect(renderer).toBeInstanceOf(PhaserGameRenderer)
    })

    it('GameScene を設定できる', () => {
      const scene = new GameScene() as any
      renderer.setGameScene(scene)
      
      // シーンが設定されたことを確認（内部状態のテスト）
      expect(renderer['gameScene']).toBe(mockGameScene)
    })

    it('initialize メソッドが Promise を返す', async () => {
      const result = renderer.initialize()
      expect(result).toBeInstanceOf(Promise)
      await expect(result).resolves.toBeUndefined()
    })
  })

  describe('ゲーム状態の表示', () => {
    beforeEach(() => {
      renderer.setGameScene(mockGameScene as any)
    })

    it('displayGameState が GameScene に委譲される', () => {
      renderer.displayGameState(testGame)
      expect(mockGameScene.updateGameState).toHaveBeenCalledWith(testGame)
    })

    it('displayHand が GameScene に委譲される', () => {
      const cards = [
        new Card('card-1', 'カード1', 'life', 'youth', 1),
        new Card('card-2', 'カード2', 'life', 'youth', 2)
      ]
      renderer.displayHand(cards)
      expect(mockGameScene.displayHand).toHaveBeenCalledWith(cards)
    })

    it('displayVitality が GameScene に委譲される', () => {
      renderer.displayVitality(15, 20)
      expect(mockGameScene.displayVitality).toHaveBeenCalledWith(15, 20)
    })

    it('displayInsuranceCards が GameScene に委譲される', () => {
      const insuranceCards = [
        new Card('ins-1', '保険1', 'insurance', 'youth', 2)
      ]
      renderer.displayInsuranceCards(insuranceCards)
      expect(mockGameScene.displayInsuranceCards).toHaveBeenCalledWith(insuranceCards)
    })

    it('displayChallenge が GameScene に委譲される', () => {
      const challengeCard = new Card('ch-1', 'チャレンジ', 'challenge', 'youth', 5)
      renderer.displayChallenge(challengeCard)
      expect(mockGameScene.displayChallenge).toHaveBeenCalledWith(challengeCard)
    })

    it('displayInsuranceBurden が GameScene に委譲される', () => {
      renderer.displayInsuranceBurden(3)
      expect(mockGameScene.displayInsuranceBurden).toHaveBeenCalledWith(3)
    })

    it('displayProgress が GameScene に委譲される', () => {
      renderer.displayProgress('youth', 5)
      expect(mockGameScene.displayProgress).toHaveBeenCalledWith('youth', 5)
    })
  })

  describe('ユーザー入力処理', () => {
    beforeEach(() => {
      renderer.setGameScene(mockGameScene as any)
    })

    it('askCardSelection が GameScene の UI を使用する', async () => {
      const cards = [
        new Card('card-1', 'カード1', 'life', 'youth', 1),
        new Card('card-2', 'カード2', 'life', 'youth', 2)
      ]
      const selectedCard = cards[0]
      
      mockGameScene.showCardSelectionUI.mockImplementation(() => {})
      mockGameScene.waitForUserSelection.mockResolvedValue([selectedCard])
      
      const result = await renderer.askCardSelection(cards, 1, 1, 'テスト選択')
      
      expect(mockGameScene.showCardSelectionUI).toHaveBeenCalledWith(
        cards,
        1,
        1,
        'テスト選択'
      )
      expect(result).toEqual([selectedCard])
    })

    it('askChallengeAction が適切な選択肢を表示する', async () => {
      const challengeCard = new Card('ch-1', 'チャレンジ', 'challenge', 'youth', 5)
      
      mockGameScene.showCardSelectionUI.mockImplementation(() => {})
      mockGameScene.waitForUserSelection.mockResolvedValue(['attempt'])
      
      const result = await renderer.askChallengeAction(challengeCard)
      
      expect(mockGameScene.showCardSelectionUI).toHaveBeenCalled()
      expect(result).toBe('attempt')
    })

    it('askInsuranceChoice が保険選択を処理する', async () => {
      const insuranceCards = [
        new Card('ins-1', '保険1', 'insurance', 'youth', 2),
        new Card('ins-2', '保険2', 'insurance', 'youth', 3)
      ]
      const selectedInsurance = insuranceCards[1]
      
      mockGameScene.showCardSelectionUI.mockImplementation(() => {})
      mockGameScene.waitForUserSelection.mockResolvedValue([selectedInsurance])
      
      const result = await renderer.askInsuranceChoice(insuranceCards, 'どの保険を選びますか？')
      
      expect(result).toBe(selectedInsurance)
    })

    it('askInsuranceTypeChoice が保険タイプ選択を処理する', async () => {
      const types: ('whole_life' | 'term')[] = ['whole_life', 'term']
      
      mockGameScene.showCardSelectionUI.mockImplementation(() => {})
      mockGameScene.waitForUserSelection.mockResolvedValue(['whole_life'])
      
      const result = await renderer.askInsuranceTypeChoice(types)
      
      expect(result).toBe('whole_life')
    })

    it('askInsuranceRenewalChoice が更新選択を処理する', async () => {
      const insurance = new Card('ins-1', '保険1', 'insurance', 'youth', 2)
      
      mockGameScene.showCardSelectionUI.mockImplementation(() => {})
      mockGameScene.waitForUserSelection.mockResolvedValue(['renew'])
      
      const result = await renderer.askInsuranceRenewalChoice(insurance, 3)
      
      expect(result).toBe('renew')
    })
  })

  describe('メッセージ表示', () => {
    beforeEach(() => {
      renderer.setGameScene(mockGameScene as any)
    })

    it('showMessage が GameScene に委譲される', async () => {
      await renderer.showMessage('テストメッセージ', 'success')
      expect(mockGameScene.showMessage).toHaveBeenCalledWith('テストメッセージ', 'success')
    })

    it('showError が GameScene に委譲される', () => {
      renderer.showError('エラーメッセージ')
      expect(mockGameScene.showError).toHaveBeenCalledWith('エラーメッセージ')
    })

    it('showChallengeResult が GameScene に委譲される', () => {
      const result: ChallengeResult = {
        success: true,
        damage: 0,
        cardChoices: []
      }
      renderer.showChallengeResult(result)
      expect(mockGameScene.displayChallengeResult).toHaveBeenCalledWith(result)
    })

    it('showStageClear が GameScene に委譲される', () => {
      const stats = TestDataGenerator.createTestPlayerStats()
      renderer.showStageClear('youth', stats)
      expect(mockGameScene.showStageClear).toHaveBeenCalledWith('youth', stats)
    })

    it('showVictory が GameScene に委譲される', () => {
      const stats = TestDataGenerator.createTestPlayerStats()
      renderer.showVictory(stats)
      expect(mockGameScene.showVictory).toHaveBeenCalledWith(stats)
    })

    it('showGameOver が GameScene に委譲される', () => {
      const stats = TestDataGenerator.createTestPlayerStats()
      renderer.showGameOver(stats)
      expect(mockGameScene.showGameOver).toHaveBeenCalledWith(stats)
    })
  })

  describe('エラーハンドリング', () => {
    it('GameScene が設定されていない場合のエラーハンドリング', () => {
      // GameScene を設定せずにメソッドを呼び出す
      expect(() => renderer.displayGameState(testGame)).not.toThrow()
      expect(() => renderer.displayHand([])).not.toThrow()
      
      // 非同期メソッドもエラーを投げない
      expect(renderer.askCardSelection([], 0, 1, 'test')).resolves.toEqual([])
    })

    it('GameScene のメソッドがエラーを投げた場合の処理', () => {
      renderer.setGameScene(mockGameScene as any)
      mockGameScene.updateGameState.mockImplementation(() => {
        throw new Error('GameScene error')
      })
      
      // エラーがキャッチされて処理される
      expect(() => renderer.displayGameState(testGame)).not.toThrow()
    })
  })

  describe('デバッグモード', () => {
    it('デバッグモードを設定できる', () => {
      renderer.setDebugMode(true)
      // デバッグモードの設定が成功（エラーが発生しない）
      expect(() => renderer.setDebugMode(false)).not.toThrow()
    })
  })

  describe('リソース管理', () => {
    it('dispose メソッドが正しく動作する', () => {
      renderer.setGameScene(mockGameScene as any)
      expect(() => renderer.dispose()).not.toThrow()
    })
  })
})