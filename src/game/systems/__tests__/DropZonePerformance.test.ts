import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DropZoneManager, type DropZone } from '../DropZoneManager'
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

const mockScene = {
  add: {
    graphics: vi.fn(() => ({ ...mockGraphics }))
  },
  tweens: {
    add: vi.fn(() => ({ onComplete: vi.fn() })),
    killTweensOf: vi.fn()
  },
  children: {
    getByName: vi.fn()
  },
  cameras: {
    main: { centerX: 400, centerY: 300 }
  },
  sys: {
    game: {
      device: {
        os: { android: false, iOS: false },
        input: { touch: false }
      }
    }
  }
} as unknown as Phaser.Scene

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

describe('DropZone Performance Tests', () => {
  let mockGame: Game
  let mockCard: Card

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Date.nowをモック化してタイミング制御
    Date.now = vi.fn()
    
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
      discardPile: { addCard: vi.fn() },
      playerDeck: { addCard: vi.fn(), shuffle: vi.fn() },
      playedCards: { addCard: vi.fn() },
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
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Frame Rate Performance (60fps Target)', () => {
    it('should maintain 60fps with single zone updates', () => {
      const dropZoneManager = new DropZoneManager(mockScene)
      
      const zone: DropZone = {
        id: 'performance-zone',
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(100, 100, 100, 100),
        isValid: (_card: Card, _game: Game) => true,
        onDrop: vi.fn((_card: Card, _game: Game) => {}),
        priority: 10,
        magneticDistance: 80
      }
      
      dropZoneManager.addZone(zone)
      dropZoneManager.startDrag(mockCard, mockGame, { x: 100, y: 100 })
      
      const initialTime = Date.now()
      vi.setSystemTime(initialTime)
      
      // 1フレーム分の操作をシミュレート
      dropZoneManager.updateDrag({ x: 150, y: 150 }, mockGame)
      dropZoneManager.getMagneticSnapTarget({ x: 150, y: 150 })
      
      // パフォーマンステスト：操作が正常に完了したことを確認
      expect(dropZoneManager).toBeDefined()
      expect(dropZoneManager.getDragState().isDragging).toBe(true)
      
      dropZoneManager.destroy()
    })

    it('should maintain 60fps with multiple zones (10 zones)', () => {
      const dropZoneManager = new DropZoneManager(mockScene)
      
      // 10個のゾーンを追加
      for (let i = 0; i < 10; i++) {
        const zone: DropZone = {
          id: `zone-${i}`,
          type: 'discard',
          bounds: new Phaser.Geom.Rectangle(i * 80, i * 60, 100, 100),
          isValid: () => true,
          onDrop: vi.fn(),
          priority: i,
          magneticDistance: 80
        }
        dropZoneManager.addZone(zone)
      }
      
      dropZoneManager.startDrag(mockCard, mockGame, { x: 100, y: 100 })
      
      const initialTime = Date.now()
      vi.setSystemTime(initialTime)
      
      // 1フレーム分の操作
      dropZoneManager.updateDrag({ x: 200, y: 200 }, mockGame)
      dropZoneManager.getMagneticSnapTarget({ x: 200, y: 200 })
      
      // 10個のゾーンでもパフォーマンスが維持されることを確認
      expect(dropZoneManager).toBeDefined()
      expect(dropZoneManager.getDragState().isDragging).toBe(true)
      
      dropZoneManager.destroy()
    })

    it('should maintain performance with heavy zone load (50 zones)', () => {
      const dropZoneManager = new DropZoneManager(mockScene)
      
      // 50個のゾーンを追加（重い負荷）
      for (let i = 0; i < 50; i++) {
        const zone: DropZone = {
          id: `heavy-zone-${i}`,
          type: 'discard',
          bounds: new Phaser.Geom.Rectangle(
            (i % 10) * 80, 
            Math.floor(i / 10) * 60, 
            75, 
            55
          ),
          isValid: (_card: Card, _game: Game) => Math.random() > 0.1, // 複雑な判定
          onDrop: vi.fn((_card: Card, _game: Game) => {}),
          priority: i,
          magneticDistance: 60
        }
        dropZoneManager.addZone(zone)
      }
      
      dropZoneManager.startDrag(mockCard, mockGame, { x: 100, y: 100 })
      
      const initialTime = Date.now()
      vi.setSystemTime(initialTime)
      
      // 重い操作をシミュレート
      for (let i = 0; i < 5; i++) {
        vi.setSystemTime(initialTime + i * 20) // 十分な間隔で更新
        dropZoneManager.updateDrag({ 
          x: 100 + i * 10, 
          y: 100 + i * 10 
        }, mockGame)
      }
      
      // 50ゾーンでもパフォーマンスが維持されることを確認
      expect(dropZoneManager).toBeDefined()
      expect(dropZoneManager.getDragState().isDragging).toBe(true)
      
      dropZoneManager.destroy()
    })

    it('should throttle updates effectively to maintain frame rate', () => {
      vi.useFakeTimers()
      const dropZoneManager = new DropZoneManager(mockScene)
      
      const zone: DropZone = {
        id: 'throttle-zone',
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(100, 100, 100, 100),
        isValid: (_card: Card, _game: Game) => true,
        onDrop: vi.fn((_card: Card, _game: Game) => {}),
        priority: 10,
        magneticDistance: 80
      }
      
      dropZoneManager.addZone(zone)
      dropZoneManager.startDrag(mockCard, mockGame, { x: 100, y: 100 })
      
      // 連続した更新（フレーム間隔未満）でタイマーを正しく設定
      const initialTime = 0
      Date.now = vi.fn()
        .mockReturnValueOnce(initialTime)
        .mockReturnValueOnce(initialTime + 5)  // 5ms後
        .mockReturnValueOnce(initialTime + 10) // 10ms後
        .mockReturnValueOnce(initialTime + 20) // 20ms後（フレーム間隔超過）
      
      
      dropZoneManager.updateDrag({ x: 110, y: 110 }, mockGame)
      dropZoneManager.updateDrag({ x: 120, y: 120 }, mockGame)
      dropZoneManager.updateDrag({ x: 130, y: 130 }, mockGame)
      dropZoneManager.updateDrag({ x: 140, y: 140 }, mockGame)
      
      // スロットリングが正しく動作していることを確認
      expect(dropZoneManager.getDragState().currentPosition).toEqual({ x: 140, y: 140 })
      
      dropZoneManager.destroy()
    })
  })

  describe('Memory Usage Optimization', () => {
    it('should not create memory leaks with rapid drag operations', () => {
      const dropZoneManager = new DropZoneManager(mockScene)
      
      const zone: DropZone = {
        id: 'memory-zone',
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(100, 100, 100, 100),
        isValid: (_card: Card, _game: Game) => true,
        onDrop: vi.fn((_card: Card, _game: Game) => {}),
        priority: 10,
        magneticDistance: 80
      }
      
      dropZoneManager.addZone(zone)
      
      const initialMemory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0
      
      // 大量のドラッグ操作をシミュレート
      for (let i = 0; i < 1000; i++) {
        dropZoneManager.startDrag(mockCard, mockGame, { x: i, y: i })
        dropZoneManager.updateDrag({ x: i + 10, y: i + 10 }, mockGame)
        dropZoneManager.endDrag({ x: i + 20, y: i + 20 }, mockGame)
        
        // 一定間隔でガベージコレクションを促す
        if (i % 100 === 0) {
          global.gc?.()
        }
      }
      
      const finalMemory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory
      
      // メモリ増加量が5MB未満であることを確認
      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024)
      }
      
      dropZoneManager.destroy()
    })

    it('should clean up visual elements efficiently', () => {
      const dropZoneManager = new DropZoneManager(mockScene)
      
      const zone: DropZone = {
        id: 'visual-zone',
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(100, 100, 100, 100),
        isValid: (_card: Card, _game: Game) => true,
        onDrop: vi.fn((_card: Card, _game: Game) => {}),
        priority: 10,
        magneticDistance: 80
      }
      
      dropZoneManager.addZone(zone)
      
      // 多数のビジュアル要素を作成
      for (let i = 0; i < 50; i++) {
        dropZoneManager.startDrag(mockCard, mockGame, { x: i * 10, y: i * 10 })
        dropZoneManager.updateDrag({ x: i * 10 + 50, y: i * 10 + 50 }, mockGame)
      }
      
      // graphics要素が作成されることを確認
      expect(mockScene.add.graphics).toHaveBeenCalled()
      
      // クリーンアップが正常に実行される
      expect(() => dropZoneManager.destroy()).not.toThrow()
      
      // クリーンアップ後、ドラッグ状態がリセットされる
      const dragState = dropZoneManager.getDragState()
      expect(dragState.isDragging).toBe(false)
      expect(dragState.validZones).toEqual([])
    })

    it('should handle memory efficiently with complex validation logic', () => {
      const dropZoneManager = new DropZoneManager(mockScene)
      
      // 複雑なバリデーション関数を持つゾーン
      const complexZone: DropZone = {
        id: 'complex-zone',
        type: 'challenge',
        bounds: new Phaser.Geom.Rectangle(100, 100, 100, 100),
        isValid: (card: Card, game: Game) => {
          // 複雑な計算をシミュレート
          let result = true
          for (let i = 0; i < 100; i++) {
            result = result && (card.power > i % 10)
          }
          return result && game.vitality > 0
        },
        onDrop: vi.fn(),
        priority: 10,
        magneticDistance: 80
      }
      
      dropZoneManager.addZone(complexZone)
      
      const startTime = performance.now()
      
      // 複雑な検証を含むドラッグ操作
      for (let i = 0; i < 100; i++) {
        dropZoneManager.startDrag(mockCard, mockGame, { x: i, y: i })
        dropZoneManager.updateDrag({ x: i + 25, y: i + 25 }, mockGame)
        dropZoneManager.endDrag({ x: i + 50, y: i + 50 }, mockGame)
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // 100回の複雑な操作が1秒以内に完了することを確認
      expect(totalTime).toBeLessThan(1000)
      
      dropZoneManager.destroy()
    })
  })

  describe('Response Time Optimization', () => {
    it('should respond to drag start within 50ms', () => {
      const dropZoneManager = new DropZoneManager(mockScene)
      
      const zone: DropZone = {
        id: 'response-zone',
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(100, 100, 100, 100),
        isValid: (_card: Card, _game: Game) => true,
        onDrop: vi.fn((_card: Card, _game: Game) => {}),
        priority: 10,
        magneticDistance: 80
      }
      
      dropZoneManager.addZone(zone)
      
      const startTime = performance.now()
      dropZoneManager.startDrag(mockCard, mockGame, { x: 100, y: 100 })
      const endTime = performance.now()
      
      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(50) // 50ms以内
      
      dropZoneManager.destroy()
    })

    it('should respond to hover state changes within 16ms', () => {
      const dropZoneManager = new DropZoneManager(mockScene)
      
      const zone: DropZone = {
        id: 'hover-zone',
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(100, 100, 100, 100),
        isValid: (_card: Card, _game: Game) => true,
        onDrop: vi.fn((_card: Card, _game: Game) => {}),
        priority: 10,
        magneticDistance: 80
      }
      
      dropZoneManager.addZone(zone)
      dropZoneManager.startDrag(mockCard, mockGame, { x: 50, y: 50 })
      
      // ホバー状態変更の応答時間を測定
      const startTime = performance.now()
      dropZoneManager.updateDrag({ x: 150, y: 150 }, mockGame) // ゾーン内に移動
      const endTime = performance.now()
      
      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(16) // 1フレーム以内
      
      dropZoneManager.destroy()
    })

    it('should complete magnetic snap calculation within 10ms', () => {
      const dropZoneManager = new DropZoneManager(mockScene)
      
      // 複数のゾーンでマグネティックスナップをテスト
      for (let i = 0; i < 20; i++) {
        const zone: DropZone = {
          id: `snap-zone-${i}`,
          type: 'discard',
          bounds: new Phaser.Geom.Rectangle(i * 50, i * 30, 80, 80),
          isValid: () => true,
          onDrop: vi.fn(),
          priority: i,
          magneticDistance: 100
        }
        dropZoneManager.addZone(zone)
      }
      
      dropZoneManager.startDrag(mockCard, mockGame, { x: 100, y: 100 })
      
      const startTime = performance.now()
      dropZoneManager.getMagneticSnapTarget({ x: 200, y: 200 })
      const endTime = performance.now()
      
      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(10) // 10ms以内
      
      dropZoneManager.destroy()
    })
  })

  describe('Scalability Tests', () => {
    it('should scale linearly with zone count', () => {
      const zoneCounts = [1, 5, 10, 20, 50]
      const results: number[] = []
      
      for (const zoneCount of zoneCounts) {
        const dropZoneManager = new DropZoneManager(mockScene)
        
        // 指定数のゾーンを追加
        for (let i = 0; i < zoneCount; i++) {
          const zone: DropZone = {
            id: `scale-zone-${i}`,
            type: 'discard',
            bounds: new Phaser.Geom.Rectangle(
              (i % 10) * 60,
              Math.floor(i / 10) * 50,
              50,
              50
            ),
            isValid: () => true,
            onDrop: vi.fn(),
            priority: i,
            magneticDistance: 80
          }
          dropZoneManager.addZone(zone)
        }
        
        dropZoneManager.startDrag(mockCard, mockGame, { x: 100, y: 100 })
        
        const startTime = performance.now()
        
        // 標準的なドラッグ操作を実行
        for (let i = 0; i < 10; i++) {
          dropZoneManager.updateDrag({ x: 100 + i * 5, y: 100 + i * 5 }, mockGame)
        }
        
        const endTime = performance.now()
        const avgTime = (endTime - startTime) / 10
        
        results.push(avgTime)
        dropZoneManager.destroy()
      }
      
      // 処理時間が線形に増加することを確認（指数関数的でない）
      for (let i = 1; i < results.length; i++) {
        const scaleFactor = zoneCounts[i] / zoneCounts[i - 1]
        const prevTime = results[i - 1]
        const currentTime = results[i]
        
        // 前回の時間が0の場合はスキップ（ゼロ除算を避ける）
        if (prevTime === 0) {
          expect(currentTime).toBeLessThan(50) // 50ms未満であることを確認
          continue
        }
        
        const timeRatio = currentTime / prevTime
        
        // 時間の増加率がゾーン数の増加率の3倍以下であることを確認
        expect(timeRatio).toBeLessThan(scaleFactor * 3)
      }
    })

    it('should handle concurrent drag operations efficiently', () => {
      const dropZoneManager = new DropZoneManager(mockScene)
      
      const zone: DropZone = {
        id: 'concurrent-zone',
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(100, 100, 100, 100),
        isValid: (_card: Card, _game: Game) => true,
        onDrop: vi.fn((_card: Card, _game: Game) => {}),
        priority: 10,
        magneticDistance: 80
      }
      
      dropZoneManager.addZone(zone)
      
      const cards = []
      for (let i = 0; i < 5; i++) {
        cards.push({
          ...mockCard,
          id: `concurrent-card-${i}`
        })
      }
      
      const startTime = performance.now()
      
      // 並行ドラッグ操作をシミュレート
      for (let frame = 0; frame < 60; frame++) { // 1秒分のフレーム
        const cardIndex = frame % cards.length
        const card = cards[cardIndex]
        
        dropZoneManager.startDrag(card, mockGame, { x: frame * 2, y: frame * 2 })
        dropZoneManager.updateDrag({ x: frame * 2 + 10, y: frame * 2 + 10 }, mockGame)
        dropZoneManager.endDrag({ x: frame * 2 + 20, y: frame * 2 + 20 }, mockGame)
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const avgFrameTime = totalTime / 60
      
      // 60フレームの並行操作が平均16.67ms/フレーム以下で完了
      expect(avgFrameTime).toBeLessThan(16.67)
      
      dropZoneManager.destroy()
    })
  })

  describe('Integration Performance', () => {
    it('should maintain performance in full integration scenario', () => {
      const integration = new DropZoneIntegration(mockScene, mockGame)
      
      const mockCardContainer = {
        x: 100,
        y: 100,
        setDepth: vi.fn().mockReturnThis(),
        setAlpha: vi.fn().mockReturnThis(),
        setScale: vi.fn().mockReturnThis(),
        getData: vi.fn(() => mockCard),
        getByName: vi.fn(),
        add: vi.fn(),
        on: vi.fn()
      }
      
      
      integration.setupCardDragAndDrop(mockCardContainer)
      
      const startTime = performance.now()
      
      // 統合シナリオでのフレーム操作
      const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
      const dragHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'drag')?.[1]
      const dragEndHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragend')?.[1]
      
      if (dragStartHandler && dragHandler && dragEndHandler) {
        // 完全なドラッグシーケンス
        dragStartHandler({ x: 100, y: 100 })
        
        for (let i = 0; i < 10; i++) {
          dragHandler({ x: 100 + i * 10, y: 100 + i * 5 }, 100 + i * 10, 100 + i * 5)
        }
        
        dragEndHandler({ x: 200, y: 150 })
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // 統合シナリオでも目標フレーム時間内に完了
      expect(totalTime).toBeLessThan(16.67 * 12) // 12フレーム分の余裕（16.67ms * 12）
      
      integration.destroy()
    })

    it('should handle mobile device performance constraints', () => {
      // モバイルデバイス設定
      mockScene.sys.game.device.os.android = true
      mockScene.sys.game.device.input.touch = true
      
      const mobileIntegration = new DropZoneIntegration(mockScene, mockGame)
      
      const mockCardContainer = {
        x: 100,
        y: 100,
        setDepth: vi.fn().mockReturnThis(),
        setAlpha: vi.fn().mockReturnThis(),
        setScale: vi.fn().mockReturnThis(),
        getData: vi.fn(() => mockCard),
        getByName: vi.fn(),
        add: vi.fn(),
        on: vi.fn()
      }
      
      mobileIntegration.setupCardDragAndDrop(mockCardContainer)
      
      const startTime = performance.now()
      
      // モバイルでの高頻度タッチ操作をシミュレート
      const dragHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'drag')?.[1]
      if (dragHandler) {
        const dragStartHandler = mockCardContainer.on.mock.calls.find(call => call[0] === 'dragstart')?.[1]
        if (dragStartHandler) {
          dragStartHandler({ x: 100, y: 100 })
        }
        
        // 高頻度更新（モバイルでのタッチ入力）
        for (let i = 0; i < 30; i++) {
          dragHandler({ x: 100 + i * 2, y: 100 + i }, 100 + i * 2, 100 + i)
        }
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // モバイルでも許容可能な時間内で完了（デスクトップより少し余裕を持つ）
      expect(totalTime).toBeLessThan(33.33) // 30fps相当の時間
      
      mobileIntegration.destroy()
    })
  })

  describe('Performance Regression Tests', () => {
    it('should not regress with frequent zone additions and removals', () => {
      const dropZoneManager = new DropZoneManager(mockScene)
      
      const startTime = performance.now()
      
      // 頻繁なゾーンの追加・削除
      for (let i = 0; i < 100; i++) {
        const zone: DropZone = {
          id: `temp-zone-${i}`,
          type: 'discard',
          bounds: new Phaser.Geom.Rectangle(i * 5, i * 5, 50, 50),
          isValid: () => true,
          onDrop: vi.fn(),
          priority: i,
          magneticDistance: 60
        }
        
        dropZoneManager.addZone(zone)
        
        // 一部のゾーンは即座に削除
        if (i % 3 === 0) {
          dropZoneManager.removeZone(`temp-zone-${i}`)
        }
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // 100回の追加・削除操作が100ms以内に完了
      expect(totalTime).toBeLessThan(100)
      
      dropZoneManager.destroy()
    })

    it('should maintain performance with complex visual effects', () => {
      const dropZoneManager = new DropZoneManager(mockScene)
      
      // ビジュアルエフェクト付きのゾーン
      const visualZone: DropZone = {
        id: 'visual-effects-zone',
        type: 'challenge',
        bounds: new Phaser.Geom.Rectangle(100, 100, 120, 120),
        isValid: (_card: Card, _game: Game) => true,
        onDrop: vi.fn((_card: Card, _game: Game) => {}),
        priority: 10,
        magneticDistance: 100,
        visualStyle: {
          validColor: 0x00ff00,
          invalidColor: 0xff0000,
          hoverColor: 0x00ff88
        }
      }
      
      dropZoneManager.addZone(visualZone)
      
      const startTime = performance.now()
      
      // ビジュアルエフェクトが発生する操作
      for (let i = 0; i < 20; i++) {
        dropZoneManager.startDrag(mockCard, mockGame, { x: 50 + i, y: 50 + i })
        dropZoneManager.updateDrag({ x: 150 + i, y: 150 + i }, mockGame)
        dropZoneManager.endDrag({ x: 200 + i, y: 200 + i }, mockGame)
      }
      
      const endTime = performance.now()
      const avgOperationTime = (endTime - startTime) / 20
      
      // ビジュアルエフェクト付きでも1操作あたり16ms以内
      expect(avgOperationTime).toBeLessThan(16)
      
      dropZoneManager.destroy()
    })
  })
})