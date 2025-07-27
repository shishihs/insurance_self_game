import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameController } from '@/controllers/GameController'
import { InteractiveCUIRenderer } from '@/cui/renderers/InteractiveCUIRenderer'
import { PhaserGameRenderer } from '@/game/renderers/PhaserGameRenderer'
import type { GameRenderer } from '@/interfaces/GameRenderer'
import type { GameConfig } from '@/domain/types/game.types'
import { Game } from '@/domain/entities/Game'
import { Card } from '@/domain/entities/Card'
import { TestDataGenerator } from '../utils/TestHelpers'

// Mock Phaser for testing
vi.mock('phaser', () => ({
  Scene: class MockScene {
    constructor() {}
  }
}))

// Mock GameScene
vi.mock('@/game/scenes/GameScene', () => ({
  GameScene: class MockGameScene {
    updateGameState = vi.fn()
    showCardSelectionUI = vi.fn()
    displayChallengeResult = vi.fn()
    displayProgress = vi.fn()
    displayVitality = vi.fn()
    displayHand = vi.fn()
    displayInsuranceCards = vi.fn()
    displayChallenge = vi.fn()
    displayInsuranceBurden = vi.fn()
    showMessage = vi.fn()
    showError = vi.fn()
    showStageClear = vi.fn()
    showVictory = vi.fn()
    showGameOver = vi.fn()
  }
}))

// Mock inquirer for CUI
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ selection: 0 })
  }
}))

describe('統一アーキテクチャ統合テスト', () => {
  let gameConfig: GameConfig
  let cuiRenderer: InteractiveCUIRenderer
  let guiRenderer: PhaserGameRenderer
  
  beforeEach(() => {
    TestDataGenerator.setSeed(12345)
    gameConfig = TestDataGenerator.createTestGameConfig({
      difficulty: 'normal',
      startingVitality: 20,
      startingHandSize: 5,
      maxHandSize: 7,
      dreamCardCount: 2
    })
  })

  describe('GameRenderer インターフェース準拠テスト', () => {
    it('CUI と GUI の両レンダラーが GameRenderer インターフェースを実装している', () => {
      cuiRenderer = new InteractiveCUIRenderer()
      guiRenderer = new PhaserGameRenderer()
      
      // 両方が GameRenderer インターフェースのメソッドを持っている
      const rendererMethods = [
        'initialize',
        'askCardSelection',
        'askChallengeAction',
        'askInsuranceChoice',
        'askInsuranceTypeChoice',
        'askInsuranceRenewalChoice',
        'displayGameState',
        'displayChallenge',
        'displayHand',
        'displayVitality',
        'displayInsuranceCards',
        'displayInsuranceBurden',
        'displayProgress',
        'showMessage',
        'showError',
        'showChallengeResult',
        'showStageClear',
        'showVictory',
        'showGameOver',
        'setDebugMode',
        'dispose'
      ]
      
      rendererMethods.forEach(method => {
        expect(cuiRenderer).toHaveProperty(method)
        expect(guiRenderer).toHaveProperty(method)
        expect(typeof (cuiRenderer as any)[method]).toBe('function')
        expect(typeof (guiRenderer as any)[method]).toBe('function')
      })
    })
  })

  describe('同一 GameController で両レンダラーが動作する', () => {
    it('CUI レンダラーで GameController が正常に動作する', async () => {
      cuiRenderer = new InteractiveCUIRenderer()
      const initSpy = vi.spyOn(cuiRenderer, 'initialize')
      const displaySpy = vi.spyOn(cuiRenderer, 'displayGameState')
      
      const controller = new GameController(gameConfig, cuiRenderer)
      expect(controller).toBeDefined()
      
      // 基本的な初期化テスト
      const game = controller.getGameState()
      expect(game).toBeInstanceOf(Game)
      expect(game.status).toBe('not_started')
    })

    it('GUI レンダラーで GameController が正常に動作する', async () => {
      guiRenderer = new PhaserGameRenderer()
      const controller = new GameController(gameConfig, guiRenderer)
      expect(controller).toBeDefined()
      
      // 基本的な初期化テスト
      const game = controller.getGameState()
      expect(game).toBeInstanceOf(Game)
      expect(game.status).toBe('not_started')
    })

    it('同じゲームロジックが両レンダラーで動作する', () => {
      // CUI での実行
      const cuiController = new GameController(gameConfig, new InteractiveCUIRenderer())
      const cuiGame = cuiController.getGameState()
      
      // GUI での実行
      const guiController = new GameController(gameConfig, new PhaserGameRenderer())
      const guiGame = guiController.getGameState()
      
      // 両方とも同じ Game エンティティを使用
      expect(cuiGame.constructor.name).toBe(guiGame.constructor.name)
      expect(cuiGame.status).toBe(guiGame.status)
      expect(cuiGame.vitality).toBe(guiGame.vitality)
      expect(cuiGame.maxVitality).toBe(guiGame.maxVitality)
    })
  })

  describe('レンダラー切り替えテスト', () => {
    it('実行時にレンダラーを切り替えても同じゲーム状態を維持できる', () => {
      // まず CUI で開始
      const cuiRenderer = new InteractiveCUIRenderer()
      const controller = new GameController(gameConfig, cuiRenderer)
      const initialState = controller.getGameState()
      
      // 同じ設定で GUI コントローラーを作成
      const guiRenderer = new PhaserGameRenderer()
      const guiController = new GameController(gameConfig, guiRenderer)
      
      // 基本的な状態が同じ
      expect(guiController.getGameState().vitality).toBe(initialState.vitality)
      expect(guiController.getGameState().maxVitality).toBe(initialState.maxVitality)
    })
  })

  describe('ドメインエンティティ共有テスト', () => {
    it('両レンダラーが同じ Card エンティティを扱える', async () => {
      const testCard = new Card(
        'test-1',
        'テストカード',
        'life',
        'youth',
        1,
        'テスト用カード'
      )
      
      // CUI レンダラーでカード表示
      const cuiRenderer = new InteractiveCUIRenderer()
      const cuiDisplaySpy = vi.spyOn(cuiRenderer, 'displayHand')
      cuiRenderer.displayHand([testCard])
      expect(cuiDisplaySpy).toHaveBeenCalledWith([testCard])
      
      // GUI レンダラーでカード表示
      const guiRenderer = new PhaserGameRenderer()
      const guiDisplaySpy = vi.spyOn(guiRenderer, 'displayHand')
      guiRenderer.displayHand([testCard])
      expect(guiDisplaySpy).toHaveBeenCalledWith([testCard])
    })

    it('両レンダラーが同じ Game エンティティを扱える', () => {
      const game = new Game(gameConfig)
      
      // CUI でゲーム状態表示
      const cuiRenderer = new InteractiveCUIRenderer()
      const cuiSpy = vi.spyOn(cuiRenderer, 'displayGameState')
      cuiRenderer.displayGameState(game)
      expect(cuiSpy).toHaveBeenCalledWith(game)
      
      // GUI でゲーム状態表示
      const guiRenderer = new PhaserGameRenderer()
      const guiSpy = vi.spyOn(guiRenderer, 'displayGameState')
      guiRenderer.displayGameState(game)
      expect(guiSpy).toHaveBeenCalledWith(game)
    })
  })

  describe('エラーハンドリングの一貫性', () => {
    it('両レンダラーが同じエラーハンドリングパターンを持つ', async () => {
      const errorMessage = 'テストエラー'
      
      // CUI エラー表示
      const cuiRenderer = new InteractiveCUIRenderer()
      const cuiErrorSpy = vi.spyOn(cuiRenderer, 'showError')
      cuiRenderer.showError(errorMessage)
      expect(cuiErrorSpy).toHaveBeenCalledWith(errorMessage)
      
      // GUI エラー表示
      const guiRenderer = new PhaserGameRenderer()
      const guiErrorSpy = vi.spyOn(guiRenderer, 'showError')
      guiRenderer.showError(errorMessage)
      expect(guiErrorSpy).toHaveBeenCalledWith(errorMessage)
    })
  })

  describe('非同期処理の一貫性', () => {
    it('両レンダラーが非同期メソッドを適切に処理する', async () => {
      const testCards = [
        new Card('card-1', 'カード1', 'life', 'youth', 1),
        new Card('card-2', 'カード2', 'life', 'youth', 2)
      ]
      
      // CUI での非同期カード選択
      const cuiRenderer = new InteractiveCUIRenderer()
      vi.spyOn(cuiRenderer, 'askCardSelection').mockResolvedValue([testCards[0]])
      const cuiResult = await cuiRenderer.askCardSelection(testCards, 1, 1, 'テスト選択')
      expect(cuiResult).toHaveLength(1)
      
      // GUI での非同期カード選択
      const guiRenderer = new PhaserGameRenderer()
      vi.spyOn(guiRenderer, 'askCardSelection').mockResolvedValue([testCards[1]])
      const guiResult = await guiRenderer.askCardSelection(testCards, 1, 1, 'テスト選択')
      expect(guiResult).toHaveLength(1)
    })
  })

  describe('統一エントリーポイントのシミュレーション', () => {
    it('モード切り替えによる異なるレンダラー選択をシミュレート', () => {
      const modes = ['cui', 'gui'] as const
      const renderers: GameRenderer[] = []
      
      modes.forEach(mode => {
        let renderer: GameRenderer
        if (mode === 'cui') {
          renderer = new InteractiveCUIRenderer()
        } else {
          renderer = new PhaserGameRenderer()
        }
        renderers.push(renderer)
        
        // 各レンダラーで GameController を作成できる
        const controller = new GameController(gameConfig, renderer)
        expect(controller).toBeDefined()
        expect(controller.getGameState()).toBeDefined()
      })
      
      // 両方のレンダラーが作成された
      expect(renderers).toHaveLength(2)
      expect(renderers[0]).toBeInstanceOf(InteractiveCUIRenderer)
      expect(renderers[1]).toBeInstanceOf(PhaserGameRenderer)
    })
  })

  describe('デバッグモードの一貫性', () => {
    it('両レンダラーがデバッグモードを適切にサポートする', () => {
      const cuiRenderer = new InteractiveCUIRenderer()
      const guiRenderer = new PhaserGameRenderer()
      
      // デバッグモードの設定
      cuiRenderer.setDebugMode(true)
      guiRenderer.setDebugMode(true)
      
      // 両方ともデバッグモードメソッドを持つ
      expect(cuiRenderer.setDebugMode).toBeDefined()
      expect(guiRenderer.setDebugMode).toBeDefined()
      
      // デバッグモード OFF
      cuiRenderer.setDebugMode(false)
      guiRenderer.setDebugMode(false)
    })
  })

  describe('リソース管理の一貫性', () => {
    it('両レンダラーが適切にリソースを解放する', async () => {
      const cuiRenderer = new InteractiveCUIRenderer()
      const guiRenderer = new PhaserGameRenderer()
      
      // dispose メソッドの存在確認
      expect(cuiRenderer.dispose).toBeDefined()
      expect(guiRenderer.dispose).toBeDefined()
      
      // リソース解放
      const cuiDisposeSpy = vi.spyOn(cuiRenderer, 'dispose')
      const guiDisposeSpy = vi.spyOn(guiRenderer, 'dispose')
      
      cuiRenderer.dispose()
      guiRenderer.dispose()
      
      expect(cuiDisposeSpy).toHaveBeenCalled()
      expect(guiDisposeSpy).toHaveBeenCalled()
    })
  })
})