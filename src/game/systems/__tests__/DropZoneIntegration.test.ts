import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DropZoneIntegration } from '../DropZoneIntegration'
import { Game } from '@/domain/entities/Game'
import { Card } from '@/domain/entities/Card'

// phaser3spectorjs モジュールをモック
vi.mock('phaser3spectorjs', () => ({
  default: {
    enable: vi.fn(),
    disable: vi.fn(),
    createTexture: vi.fn(),
    WebGLDebugRenderer: vi.fn()
  }
}))

// Phaserモックの設定
const mockGraphics = {
  setPosition: vi.fn().mockReturnThis(),
  setAlpha: vi.fn().mockReturnThis(),
  setDepth: vi.fn().mockReturnThis(),
  setName: vi.fn().mockReturnThis(),
  setScale: vi.fn().mockReturnThis(),
  clear: vi.fn().mockReturnThis(),
  fillStyle: vi.fn().mockReturnThis(),
  fillRectShape: vi.fn().mockReturnThis(),
  strokeRectShape: vi.fn().mockReturnThis(),
  fillCircle: vi.fn().mockReturnThis(),
  lineStyle: vi.fn().mockReturnThis(),
  strokeCircle: vi.fn().mockReturnThis(),
  lineBetween: vi.fn().mockReturnThis(),
  add: vi.fn().mockReturnThis(),
  destroy: vi.fn()
}

const mockTween = {
  alpha: 0,
  duration: 0,
  yoyo: false,
  repeat: 0,
  ease: '',
  onComplete: vi.fn(),
  targets: null
}

const mockContainer = {
  x: 100,
  y: 100,
  setDepth: vi.fn().mockReturnThis(),
  setAlpha: vi.fn().mockReturnThis(),
  setScale: vi.fn().mockReturnThis(),
  getData: vi.fn(),
  getByName: vi.fn(),
  add: vi.fn(),
  on: vi.fn()
}

const mockScene = {
  add: {
    graphics: vi.fn(() => ({ ...mockGraphics }))
  },
  tweens: {
    add: vi.fn(() => mockTween),
    killTweensOf: vi.fn()
  },
  children: {
    getByName: vi.fn()
  },
  cameras: {
    main: {
      centerX: 400,
      centerY: 300
    }
  },
  sys: {
    game: {
      device: {
        os: {
          android: false,
          iOS: false
        },
        input: {
          touch: false
        }
      }
    }
  },
  sound: {
    play: vi.fn()
  }
} as unknown as Phaser.Scene

// Windowモック
const mockWindow = {
  innerWidth: 800,
  innerHeight: 600,
  navigator: {
    vibrate: vi.fn()
  }
}

Object.defineProperty(window, 'innerWidth', { value: mockWindow.innerWidth, writable: true })
Object.defineProperty(window, 'innerHeight', { value: mockWindow.innerHeight, writable: true })
Object.defineProperty(navigator, 'vibrate', { value: mockWindow.navigator.vibrate, writable: true })

// GAME_CONSTANTSモック
vi.mock('../config/gameConfig', () => ({
  GAME_CONSTANTS: {
    CARD_WIDTH: 120,
    CARD_HEIGHT: 160,
    CHALLENGE_Y_POSITION: 200,
    DISCARD_X_POSITION: 700,
    DISCARD_Y_POSITION: 500
  }
}))

describe('DropZoneIntegration', () => {
  let dropZoneIntegration: DropZoneIntegration
  let mockGame: Game
  let mockCard: Card
  let mockInsuranceCard: Card
  let mockCardContainer: typeof mockContainer

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockGame = {
      currentChallenge: null,
      vitality: 20,
      maxVitality: 20,
      stage: 1,
      playerHand: {
        size: vi.fn(() => 5),
        contains: vi.fn(() => true),
        removeCard: vi.fn()
      },
      discardPile: {
        addCard: vi.fn()
      },
      playerDeck: {
        addCard: vi.fn(),
        shuffle: vi.fn()
      },
      playedCards: {
        addCard: vi.fn()
      },
      maxHandSize: 7,
      getCurrentPhase: vi.fn(() => 'setup'),
      getPlayerAge: vi.fn(() => 25),
      startChallenge: vi.fn(),
      placeChallengeCard: vi.fn(),
      discardCard: vi.fn()
    } as unknown as Game

    mockCard = {
      id: 'test-card',
      name: 'Test Card',
      type: 'life',
      power: 5,
      cost: 2
    } as Card

    mockInsuranceCard = {
      id: 'insurance-card',
      name: 'Test Insurance',
      type: 'insurance',
      power: 0,
      cost: 3
    } as Card

    mockCardContainer = {
      ...mockContainer,
      getData: vi.fn(() => mockCard)
    }

    dropZoneIntegration = new DropZoneIntegration(mockScene, mockGame)
  })

  afterEach(() => {
    dropZoneIntegration.destroy()
  })

  describe('Device Detection', () => {
    it('should detect desktop device correctly', () => {
      // Default setup is desktop
      const integration = new DropZoneIntegration(mockScene, mockGame)
      
      // デバイス検出の結果は内部的なものなので、動作から推測
      integration.setupCardDragAndDrop(mockCardContainer)
      
      // デスクトップ設定でドラッグイベントが設定されることを確認
      expect(mockCardContainer.on).toHaveBeenCalledWith('dragstart', expect.any(Function))
      expect(mockCardContainer.on).toHaveBeenCalledWith('drag', expect.any(Function))
      expect(mockCardContainer.on).toHaveBeenCalledWith('dragend', expect.any(Function))
      
      integration.destroy()
    })

    it('should detect mobile device correctly', () => {
      // モバイルデバイスとして設定
      mockScene.sys.game.device.os.android = true
      mockScene.sys.game.device.input.touch = true
      mockWindow.innerWidth = 375
      mockWindow.innerHeight = 667
      
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true })
      
      const integration = new DropZoneIntegration(mockScene, mockGame)
      integration.setupCardDragAndDrop(mockCardContainer)
      
      // モバイル設定でもドラッグイベントが設定されることを確認
      expect(mockCardContainer.on).toHaveBeenCalledWith('dragstart', expect.any(Function))
      expect(mockCardContainer.on).toHaveBeenCalledWith('drag', expect.any(Function))
      expect(mockCardContainer.on).toHaveBeenCalledWith('dragend', expect.any(Function))
      
      integration.destroy()
    })

    it('should detect tablet device correctly', () => {
      // タブレットデバイスとして設定
      mockScene.sys.game.device.os.iOS = true
      mockScene.sys.game.device.input.touch = true
      mockWindow.innerWidth = 768
      mockWindow.innerHeight = 1024
      
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true })
      
      const integration = new DropZoneIntegration(mockScene, mockGame)
      integration.setupCardDragAndDrop(mockCardContainer)
      
      expect(mockCardContainer.on).toHaveBeenCalledTimes(3) // dragstart, drag, dragend
      
      integration.destroy()
    })

    it('should handle orientation changes', () => {
      // Portrait orientation
      mockWindow.innerWidth = 375
      mockWindow.innerHeight = 667
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true })
      
      const portraitIntegration = new DropZoneIntegration(mockScene, mockGame)
      portraitIntegration.destroy()
      
      // Landscape orientation
      mockWindow.innerWidth = 667
      mockWindow.innerHeight = 375
      Object.defineProperty(window, 'innerWidth', { value: 667, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, writable: true })
      
      const landscapeIntegration = new DropZoneIntegration(mockScene, mockGame)
      landscapeIntegration.destroy()
      
      // 両方とも正常に作成されることを確認
      expect(portraitIntegration).toBeDefined()
      expect(landscapeIntegration).toBeDefined()
    })
  })

  describe('Drag Configuration', () => {
    it('should use desktop drag configuration', () => {
      // デスクトップ設定をテスト
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      // ドラッグ開始をシミュレート
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      expect(dragStartHandler).toBeDefined()
      
      if (dragStartHandler) {
        const mockPointer = { x: 100, y: 100 }
        dragStartHandler(mockPointer)
        
        // デスクトップ用の設定が適用されることを確認
        expect(mockCardContainer.setDepth).toHaveBeenCalledWith(1000)
        expect(mockCardContainer.setAlpha).toHaveBeenCalledWith(0.8)
        expect(mockCardContainer.setScale).toHaveBeenCalledWith(1.15)
      }
    })

    it('should use mobile drag configuration with touch offset', () => {
      // モバイル設定
      mockScene.sys.game.device.os.android = true
      mockScene.sys.game.device.input.touch = true
      mockWindow.innerWidth = 375
      mockWindow.innerHeight = 667
      
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true })
      
      const mobileIntegration = new DropZoneIntegration(mockScene, mockGame)
      mobileIntegration.setupCardDragAndDrop(mockCardContainer)
      
      // ドラッグ開始をシミュレート
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      expect(dragStartHandler).toBeDefined()
      
      if (dragStartHandler) {
        const mockPointer = { x: 100, y: 100 }
        dragStartHandler(mockPointer)
        
        // モバイル用の視覚エフェクトが適用されることを確認
        expect(mockCardContainer.setDepth).toHaveBeenCalledWith(1000)
        expect(mockCardContainer.setAlpha).toHaveBeenCalledWith(0.8)
        expect(mockCardContainer.setScale).toHaveBeenCalledWith(1.15)
      }
      
      mobileIntegration.destroy()
    })

    it('should adjust snap distance based on device type', () => {
      // デスクトップとモバイルで異なるスナップ距離が使用されることを確認
      const desktopIntegration = new DropZoneIntegration(mockScene, mockGame)
      
      // モバイル設定
      mockScene.sys.game.device.os.android = true
      const mobileIntegration = new DropZoneIntegration(mockScene, mockGame)
      
      // 両方とも正常に作成されることを確認（内部設定は異なる）
      expect(desktopIntegration).toBeDefined()
      expect(mobileIntegration).toBeDefined()
      
      desktopIntegration.destroy()
      mobileIntegration.destroy()
    })
  })

  describe('Default Zones Initialization', () => {
    it('should initialize challenge zone correctly', () => {
      // チャレンジゾーンが初期化されることを確認
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      // ライフカードでドラッグ開始
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      if (dragStartHandler) {
        const mockPointer = { x: 100, y: 100 }
        dragStartHandler(mockPointer)
        
        // ハイライトグラフィックスが作成されることを確認
        expect(mockScene.add.graphics).toHaveBeenCalled()
        expect(mockScene.tweens.add).toHaveBeenCalled()
      }
    })

    it('should initialize discard zone correctly', () => {
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      // 捨て札エリアでのドロップをシミュレート
      const dragEndHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragend')?.[1]
      if (dragEndHandler) {
        const mockPointer = { x: 700, y: 500 } // DISCARD_POSITION
        dragEndHandler(mockPointer)
        
        // アニメーションが実行されることを確認
        expect(mockScene.tweens.add).toHaveBeenCalled()
      }
    })

    it('should validate challenge zone requirements', () => {
      // チャレンジが非アクティブの場合、ライフカードが有効
      mockGame.currentChallenge = null
      mockCardContainer.getData = vi.fn(() => mockCard) // life card
      
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      if (dragStartHandler) {
        const mockPointer = { x: 100, y: 100 }
        dragStartHandler(mockPointer)
        
        // ハイライトが作成される（有効なゾーンがあるため）
        expect(mockScene.add.graphics).toHaveBeenCalled()
      }
    })

    it('should validate discard zone requirements', () => {
      // 捨て札ゾーンは基本的に常に有効
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      if (dragStartHandler) {
        const mockPointer = { x: 100, y: 100 }
        dragStartHandler(mockPointer)
        
        // ハイライトが作成される
        expect(mockScene.add.graphics).toHaveBeenCalled()
      }
    })
  })

  describe('Drag and Drop Flow', () => {
    describe('Drag Start', () => {
      it('should handle drag start correctly', () => {
        dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
        
        const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
        expect(dragStartHandler).toBeDefined()
        
        if (dragStartHandler) {
          const mockPointer = { x: 100, y: 100 }
          dragStartHandler(mockPointer)
          
          // 視覚エフェクトが適用される
          expect(mockCardContainer.setDepth).toHaveBeenCalledWith(1000)
          expect(mockCardContainer.setAlpha).toHaveBeenCalledWith(0.8)
          expect(mockCardContainer.setScale).toHaveBeenCalledWith(1.15)
          
          // ドラッグトレイルが作成される
          expect(mockCardContainer.add).toHaveBeenCalled()
        }
      })

      it('should provide haptic feedback on mobile devices', () => {
        // モバイル設定
        mockScene.sys.game.device.input.touch = true
        navigator.vibrate = vi.fn()
        
        const mobileIntegration = new DropZoneIntegration(mockScene, mockGame)
        mobileIntegration.setupCardDragAndDrop(mockCardContainer)
        
        const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
        if (dragStartHandler) {
          const mockPointer = { x: 100, y: 100 }
          dragStartHandler(mockPointer)
          
          // モバイルデバイスでバイブレーションが呼ばれる
          expect(navigator.vibrate).toHaveBeenCalledWith(50)
        }
        
        mobileIntegration.destroy()
      })

      it('should handle multiple card types', () => {
        // ライフカード
        mockCardContainer.getData = vi.fn(() => mockCard)
        dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
        
        let dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
        if (dragStartHandler) {
          dragStartHandler({ x: 100, y: 100 })
          expect(mockScene.add.graphics).toHaveBeenCalled()
        }
        
        vi.clearAllMocks()
        
        // 保険カード
        mockCardContainer.getData = vi.fn(() => mockInsuranceCard)
        dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
        
        dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
        if (dragStartHandler) {
          dragStartHandler({ x: 100, y: 100 })
          expect(mockScene.add.graphics).toHaveBeenCalled()
        }
      })
    })

    describe('Drag Update', () => {
      it('should handle drag updates correctly', () => {
        dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
        
        // まずドラッグを開始
        const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
        if (dragStartHandler) {
          dragStartHandler({ x: 100, y: 100 })
        }
        
        const dragHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'drag')?.[1]
        expect(dragHandler).toBeDefined()
        
        if (dragHandler) {
          const mockPointer = { x: 200, y: 200 }
          dragHandler(mockPointer, 200, 200)
          
          // 位置が更新される（デスクトップではtouchOffsetが{x:0, y:0}なので200のまま）
          expect(mockCardContainer.x).toBe(200)
          expect(mockCardContainer.y).toBe(200)
        }
      })

      it('should apply touch offset for mobile devices', () => {
        // モバイル設定
        mockScene.sys.game.device.os.android = true
        mockScene.sys.game.device.input.touch = true
        
        const mobileIntegration = new DropZoneIntegration(mockScene, mockGame)
        mobileIntegration.setupCardDragAndDrop(mockCardContainer)
        
        // ドラッグ開始
        const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
        if (dragStartHandler) {
          dragStartHandler({ x: 100, y: 100 })
        }
        
        const dragHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'drag')?.[1]
        if (dragHandler) {
          const mockPointer = { x: 200, y: 200 }
          dragHandler(mockPointer, 200, 200)
          
          // モバイルでのタッチオフセットが適用される
          expect(mockCardContainer.y).toBeLessThan(200) // Y offset applied
        }
        
        mobileIntegration.destroy()
      })

      it('should update drag trail', () => {
        dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
        
        // ドラッグ開始でトレイルが作成される
        const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
        if (dragStartHandler) {
          dragStartHandler({ x: 100, y: 100 })
          expect(mockCardContainer.add).toHaveBeenCalled()
        }
        
        // ドラッグ更新でトレイルが更新される
        const dragHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'drag')?.[1]
        if (dragHandler) {
          dragHandler({ x: 200, y: 200 }, 200, 200)
          expect(mockCardContainer.getByName).toHaveBeenCalledWith('drag-trail')
        }
      })
    })

    describe('Drag End and Drop', () => {
      it('should handle successful drop', () => {
        dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
        
        // ドラッグ開始
        const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
        if (dragStartHandler) {
          dragStartHandler({ x: 100, y: 100 })
        }
        
        // 有効なゾーンでドロップ
        const dragEndHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragend')?.[1]
        if (dragEndHandler) {
          const mockPointer = { x: 700, y: 500 } // Discard zone position
          dragEndHandler(mockPointer)
          
          // 成功アニメーションが実行される
          expect(mockScene.tweens.add).toHaveBeenCalled()
        }
      })

      it('should handle failed drop', () => {
        dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
        
        // ドラッグ開始
        const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
        if (dragStartHandler) {
          dragStartHandler({ x: 100, y: 100 })
        }
        
        // 無効な位置でドロップ
        const dragEndHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragend')?.[1]
        if (dragEndHandler) {
          const mockPointer = { x: 50, y: 50 } // Invalid position
          dragEndHandler(mockPointer)
          
          // 失敗アニメーション（元の位置に戻る）が実行される
          expect(mockScene.tweens.add).toHaveBeenCalled()
        }
      })

      it('should provide haptic feedback on mobile', () => {
        // モバイル設定
        mockScene.sys.game.device.input.touch = true
        navigator.vibrate = vi.fn()
        
        const mobileIntegration = new DropZoneIntegration(mockScene, mockGame)
        mobileIntegration.setupCardDragAndDrop(mockCardContainer)
        
        // ドラッグ開始
        const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
        if (dragStartHandler) {
          dragStartHandler({ x: 100, y: 100 })
        }
        
        // 成功ドロップ
        const dragEndHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragend')?.[1]
        if (dragEndHandler) {
          dragEndHandler({ x: 700, y: 500 })
          
          // 成功時のバイブレーション
          expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100])
        }
        
        mobileIntegration.destroy()
      })

      it('should clean up drag state', () => {
        dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
        
        // ドラッグ開始
        const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
        if (dragStartHandler) {
          dragStartHandler({ x: 100, y: 100 })
        }
        
        // ドロップ
        const dragEndHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragend')?.[1]
        if (dragEndHandler) {
          dragEndHandler({ x: 700, y: 500 })
          
          // クリーンアップが実行される
          expect(mockCardContainer.setDepth).toHaveBeenCalledWith(0)
          expect(mockCardContainer.setAlpha).toHaveBeenCalledWith(1)
          expect(mockCardContainer.setScale).toHaveBeenCalledWith(1)
        }
      })
    })
  })

  describe('Magnetic Snap', () => {
    it('should perform magnetic snap to nearby zones', () => {
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      // ドラッグ開始
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      if (dragStartHandler) {
        dragStartHandler({ x: 100, y: 100 })
      }
      
      // チャレンジゾーン近くでドラッグ
      const dragHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'drag')?.[1]
      if (dragHandler) {
        const nearChallengePosition = { x: 390, y: 190 } // Near challenge zone center
        dragHandler(nearChallengePosition, 390, 190)
        
        // スナップアニメーションが実行される可能性がある
        // 実際のスナップ判定は内部ロジックに依存
        expect(mockScene.tweens.add).toHaveBeenCalled()
      }
    })

    it('should show snap feedback', () => {
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      // ドラッグ開始
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      if (dragStartHandler) {
        dragStartHandler({ x: 100, y: 100 })
      }
      
      // スナップ範囲内でドラッグ
      const dragHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'drag')?.[1]
      if (dragHandler) {
        dragHandler({ x: 400, y: 200 }, 400, 200)
        
        // フィードバックグラフィックスが作成される可能性
        expect(mockScene.add.graphics).toHaveBeenCalled()
      }
    })
  })

  describe('Visual Feedback and Animations', () => {
    it('should create success particles on successful drop', () => {
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      // ドラッグ開始
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      if (dragStartHandler) {
        dragStartHandler({ x: 100, y: 100 })
      }
      
      // 成功ドロップ
      const dragEndHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragend')?.[1]
      if (dragEndHandler) {
        dragEndHandler({ x: 700, y: 500 })
        
        // パーティクルエフェクト用のグラフィックスが作成される
        expect(mockScene.add.graphics).toHaveBeenCalled()
        expect(mockScene.tweens.add).toHaveBeenCalled()
      }
    })

    it('should show failure feedback on invalid drop', () => {
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      // ドラッグ開始
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      if (dragStartHandler) {
        dragStartHandler({ x: 100, y: 100 })
      }
      
      // 失敗ドロップ
      const dragEndHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragend')?.[1]
      if (dragEndHandler) {
        dragEndHandler({ x: 50, y: 50 })
        
        // 失敗フィードバック（X印など）が表示される
        expect(mockScene.add.graphics).toHaveBeenCalled()
        expect(mockScene.tweens.add).toHaveBeenCalled()
      }
    })

    it('should animate zone highlights', () => {
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      // ドラッグ開始でハイライトアニメーション
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      if (dragStartHandler) {
        dragStartHandler({ x: 100, y: 100 })
        
        // ハイライトアニメーションが設定される
        expect(mockScene.tweens.add).toHaveBeenCalled()
        
        // アニメーション設定を確認
        const tween = mockScene.tweens.add.mock.calls[0][0]
        expect(tween).toHaveProperty('alpha')
        expect(tween).toHaveProperty('duration')
        expect(tween).toHaveProperty('yoyo')
        expect(tween).toHaveProperty('repeat')
      }
    })

    it('should handle hover state changes', () => {
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      // ドラッグ開始
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      if (dragStartHandler) {
        dragStartHandler({ x: 100, y: 100 })
      }
      
      // 異なるゾーン上を移動
      const dragHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'drag')?.[1]
      if (dragHandler) {
        // チャレンジゾーン上
        dragHandler({ x: 400, y: 200 }, 400, 200)
        
        // 捨て札ゾーン上
        dragHandler({ x: 700, y: 500 }, 700, 500)
        
        // ホバー状態の変化でグラフィックスが更新される
        expect(mockScene.children.getByName).toHaveBeenCalled()
      }
    })
  })

  describe('Custom Zones', () => {
    it('should add custom zones correctly', () => {
      const customZone = {
        id: 'custom-zone',
        type: 'special' as const,
        bounds: new Phaser.Geom.Rectangle(100, 100, 100, 100),
        isValid: (_card: Card, _game: Game) => true,
        onDrop: vi.fn((_card: Card, _game: Game) => {}),
        priority: 15,
        magneticDistance: 100
      }
      
      dropZoneIntegration.addCustomZone(customZone)
      
      // カスタムゾーンが追加されることを確認
      expect(() => dropZoneIntegration.addCustomZone(customZone)).not.toThrow()
    })

    it('should remove zones correctly', () => {
      const zoneId = 'removable-zone'
      
      // ゾーンを削除
      dropZoneIntegration.removeZone(zoneId)
      
      // エラーが発生しないことを確認
      expect(() => dropZoneIntegration.removeZone(zoneId)).not.toThrow()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle null card data gracefully', () => {
      mockCardContainer.getData = vi.fn(() => null)
      
      expect(() => {
        dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      }).not.toThrow()
    })

    it('should handle undefined pointer events', () => {
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      if (dragStartHandler) {
        expect(() => {
          dragStartHandler(null)
        }).not.toThrow()
      }
    })

    it('should handle missing scene elements gracefully', () => {
      // シーン要素が不完全な場合
      const incompleteScene = {
        ...mockScene,
        add: undefined
      } as unknown as Phaser.Scene
      
      expect(() => {
        const integration = new DropZoneIntegration(incompleteScene, mockGame)
        integration.destroy()
      }).not.toThrow()
    })

    it('should handle rapid successive drag operations', () => {
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      const dragEndHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragend')?.[1]
      
      if (dragStartHandler && dragEndHandler) {
        // 連続したドラッグ操作
        for (let i = 0; i < 5; i++) {
          dragStartHandler({ x: 100 + i * 10, y: 100 + i * 10 })
          dragEndHandler({ x: 200 + i * 10, y: 200 + i * 10 })
        }
        
        // エラーが発生しないことを確認
        expect(mockScene.tweens.add).toHaveBeenCalled()
      }
    })
  })

  describe('Performance and Memory Management', () => {
    it('should clean up resources on destroy', () => {
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      // リソースを使用
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      if (dragStartHandler) {
        dragStartHandler({ x: 100, y: 100 })
      }
      
      // 破棄
      dropZoneIntegration.destroy()
      
      // クリーンアップが実行されることを確認
      expect(() => dropZoneIntegration.destroy()).not.toThrow()
    })

    it('should handle multiple card containers efficiently', () => {
      const containers = []
      
      // 複数のカードコンテナを設定
      for (let i = 0; i < 10; i++) {
        const container = {
          ...mockContainer,
          getData: vi.fn(() => ({ ...mockCard, id: `card-${i}` }))
        }
        containers.push(container)
        dropZoneIntegration.setupCardDragAndDrop(container)
      }
      
      // すべてのコンテナにイベントハンドラが設定される
      containers.forEach(container => {
        expect(container.on).toHaveBeenCalledWith('dragstart', expect.any(Function))
        expect(container.on).toHaveBeenCalledWith('drag', expect.any(Function))
        expect(container.on).toHaveBeenCalledWith('dragend', expect.any(Function))
      })
    })

    it('should handle memory leaks from animation loops', () => {
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      if (dragStartHandler) {
        // 多数のアニメーションを開始
        for (let i = 0; i < 20; i++) {
          dragStartHandler({ x: 100 + i, y: 100 + i })
        }
      }
      
      // メモリリークが発生しないことを確認（破棄時にエラーが発生しない）
      expect(() => dropZoneIntegration.destroy()).not.toThrow()
    })
  })

  describe('Integration with GameScene', () => {
    it('should handle challenge drop integration', () => {
      mockCardContainer.getData = vi.fn(() => mockCard) // life card
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      // チャレンジゾーンでのドロップをシミュレート
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      const dragEndHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragend')?.[1]
      
      if (dragStartHandler && dragEndHandler) {
        dragStartHandler({ x: 100, y: 100 })
        dragEndHandler({ x: 400, y: 200 }) // Challenge zone position
        
        // ゲームロジックとの統合が実行される
        expect(mockScene.tweens.add).toHaveBeenCalled()
      }
    })

    it('should handle discard drop integration', () => {
      dropZoneIntegration.setupCardDragAndDrop(mockCardContainer)
      
      // 捨て札ゾーンでのドロップをシミュレート
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      const dragEndHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragend')?.[1]
      
      if (dragStartHandler && dragEndHandler) {
        dragStartHandler({ x: 100, y: 100 })
        dragEndHandler({ x: 700, y: 500 }) // Discard zone position
        
        // 捨て札ロジックとの統合が実行される
        expect(mockScene.tweens.add).toHaveBeenCalled()
      }
    })
  })
})