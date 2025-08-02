import { type DropResult, type DropZone, DropZoneManager } from './DropZoneManager'
import { DropZonePresets } from './DropZoneValidators'
import type { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import { GAME_CONSTANTS } from '../config/gameConfig'

/**
 * モバイルデバイス検出結果
 */
interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  hasTouch: boolean
  orientation: 'portrait' | 'landscape'
}

/**
 * ドラッグ設定
 */
interface DragConfig {
  snapDistance: number
  touchOffset: { x: number; y: number }
  animationDuration: number
  throttleInterval: number
}

/**
 * 既存GameSceneとドロップゾーンシステムの統合クラス
 */
export class DropZoneIntegration {
  private readonly dropZoneManager: DropZoneManager
  private readonly scene: Phaser.Scene
  private readonly game: Game
  private readonly deviceInfo: DeviceInfo
  private readonly dragConfig: DragConfig
  
  // ドラッグ関連
  private draggedCard?: Phaser.GameObjects.Container
  private dragStartPosition = { x: 0, y: 0 }
  private isSnapping = false
  
  // パフォーマンス最適化
  private lastUpdateTime = 0
  private readonly UPDATE_THROTTLE = 16 // 60fps相当
  private readonly particlePool: Phaser.GameObjects.Graphics[] = []
  private readonly trailPool: Phaser.GameObjects.Graphics[] = []

  constructor(scene: Phaser.Scene, game: Game) {
    this.scene = scene
    this.game = game
    this.dropZoneManager = new DropZoneManager(scene)
    this.deviceInfo = this.detectDevice()
    this.dragConfig = this.createDragConfig()
    
    this.initializeDefaultZones()
  }

  /**
   * デバイス情報を検出
   */
  private detectDevice(): DeviceInfo {
    const isMobile = this.scene.sys.game.device.os.android || this.scene.sys.game.device.os.iOS
    const isTablet = isMobile && Math.min(window.innerWidth, window.innerHeight) >= 768
    const hasTouch = this.scene.sys.game.device.input.touch
    const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'

    return { isMobile, isTablet, hasTouch, orientation }
  }

  /**
   * ドラッグ設定を作成
   */
  private createDragConfig(): DragConfig {
    return {
      snapDistance: this.deviceInfo.isMobile ? 120 : 100,
      touchOffset: this.deviceInfo.isMobile ? { x: 0, y: -60 } : { x: 0, y: 0 },
      animationDuration: this.deviceInfo.isMobile ? 400 : 300,
      throttleInterval: this.deviceInfo.isMobile ? 20 : 16
    }
  }

  /**
   * デフォルトのドロップゾーンを初期化
   */
  private initializeDefaultZones(): void {
    // チャレンジゾーン
    const challengePreset = DropZonePresets.challengeZone()
    const challengeZone: DropZone = {
      id: 'challenge',
      type: 'challenge',
      bounds: new Phaser.Geom.Rectangle(
        this.scene.cameras.main.centerX - GAME_CONSTANTS.CARD_WIDTH / 2,
        GAME_CONSTANTS.CHALLENGE_Y_POSITION - GAME_CONSTANTS.CARD_HEIGHT / 2,
        GAME_CONSTANTS.CARD_WIDTH,
        GAME_CONSTANTS.CARD_HEIGHT
      ),
      isValid: challengePreset.validator,
      onDrop: (card: Card, game: Game) => {
        this.handleChallengeDrop(card)
        challengePreset.action(card, game)
      },
      priority: 10,
      magneticDistance: this.dragConfig.snapDistance,
      visualStyle: {
        validColor: 0x10B981,
        invalidColor: 0xEF4444,
        hoverColor: 0x059669
      }
    }

    // 捨て札ゾーン
    const discardPreset = DropZonePresets.discardZone()
    const discardZone: DropZone = {
      id: 'discard',
      type: 'discard',
      bounds: new Phaser.Geom.Rectangle(
        GAME_CONSTANTS.DISCARD_X_POSITION - GAME_CONSTANTS.CARD_WIDTH / 2,
        GAME_CONSTANTS.DISCARD_Y_POSITION - GAME_CONSTANTS.CARD_HEIGHT / 2,
        GAME_CONSTANTS.CARD_WIDTH,
        GAME_CONSTANTS.CARD_HEIGHT
      ),
      isValid: discardPreset.validator,
      onDrop: (card: Card, game: Game) => {
        this.handleDiscardDrop(card)
        discardPreset.action(card, game)
      },
      priority: 5,
      magneticDistance: this.dragConfig.snapDistance,
      visualStyle: {
        validColor: 0x6B7280,
        invalidColor: 0xEF4444,
        hoverColor: 0x4B5563
      }
    }

    this.dropZoneManager.addZone(challengeZone)
    this.dropZoneManager.addZone(discardZone)
  }

  /**
   * カードにドラッグ機能を追加
   */
  setupCardDragAndDrop(cardContainer: Phaser.GameObjects.Container): void {
    const card = cardContainer.getData('card') as Card

    // ドラッグ開始
    cardContainer.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      this.startDrag(cardContainer, pointer, card)
    })

    // ドラッグ中
    cardContainer.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.updateDrag(cardContainer, pointer, dragX, dragY)
    })

    // ドラッグ終了
    cardContainer.on('dragend', (pointer: Phaser.Input.Pointer) => {
      this.endDrag(cardContainer, pointer, card)
    })
  }

  /**
   * ドラッグ開始処理
   */
  private startDrag(
    cardContainer: Phaser.GameObjects.Container, 
    pointer: Phaser.Input.Pointer, 
    card: Card
  ): void {
    // null pointer チェック
    if (!pointer || !cardContainer || !card) {
      console.warn('[DropZoneIntegration] startDrag: invalid parameters')
      return
    }
    
    this.draggedCard = cardContainer
    this.dragStartPosition = { x: cardContainer.x, y: cardContainer.y }

    // デバイス情報を考慮した位置調整
    const adjustedPosition = {
      x: pointer.x + this.dragConfig.touchOffset.x,
      y: pointer.y + this.dragConfig.touchOffset.y
    }

    // ドロップゾーンシステムにドラッグ開始を通知
    this.dropZoneManager.startDrag(card, this.game, adjustedPosition)

    // 視覚エフェクト
    cardContainer.setDepth(1000)
    cardContainer.setAlpha(0.8)
    cardContainer.setScale(1.15)

    // ドラッグトレイル作成
    this.createDragTrail(cardContainer)

    // モバイルデバイスでの振動フィードバック
    if (this.deviceInfo.hasTouch && navigator.vibrate) {
      navigator.vibrate(50)
    }
  }

  /**
   * ドラッグ更新処理（最適化版）
   */
  private updateDrag(
    cardContainer: Phaser.GameObjects.Container,
    pointer: Phaser.Input.Pointer,
    dragX: number,
    dragY: number
  ): void {
    // null チェック
    if (!cardContainer || dragX === undefined || dragY === undefined) {
      console.warn('[DropZoneIntegration] updateDrag: invalid parameters')
      return
    }
    
    // スロットリング: 60fps相当でフレームレート制限
    const currentTime = Date.now()
    if (currentTime - this.lastUpdateTime < this.UPDATE_THROTTLE) {
      // 位置だけ更新（軽量処理）
      cardContainer.x = dragX + this.dragConfig.touchOffset.x
      cardContainer.y = dragY + this.dragConfig.touchOffset.y
      return
    }
    this.lastUpdateTime = currentTime
    
    // デバイス情報を考慮した位置調整
    const adjustedPosition = {
      x: dragX + this.dragConfig.touchOffset.x,
      y: dragY + this.dragConfig.touchOffset.y
    }

    cardContainer.x = adjustedPosition.x
    cardContainer.y = adjustedPosition.y

    // ドロップゾーンシステムに位置更新を通知
    this.dropZoneManager.updateDrag(adjustedPosition, this.game)

    // マグネティックスナップのチェック（スロットリング対象外の処理のみ）
    if (!this.isSnapping) {
      const snapTarget = this.dropZoneManager.getMagneticSnapTarget(adjustedPosition)
      if (snapTarget) {
        this.performMagneticSnap(cardContainer, snapTarget.snapPosition)
      }
    }

    // ドラッグトレイルの更新（軽量化）
    this.updateDragTrailOptimized(cardContainer)
  }

  /**
   * ドラッグ終了処理
   */
  private endDrag(
    cardContainer: Phaser.GameObjects.Container,
    _pointer: Phaser.Input.Pointer,
    _card: Card
  ): void {
    // null チェック
    if (!cardContainer) {
      console.warn('[DropZoneIntegration] endDrag: invalid cardContainer')
      return
    }
    
    const finalPosition = {
      x: cardContainer.x,
      y: cardContainer.y
    }

    // ドロップ処理
    const dropResult = this.dropZoneManager.endDrag(finalPosition, this.game)
    
    if (dropResult.success) {
      this.handleSuccessfulDrop(cardContainer, dropResult)
    } else {
      this.handleFailedDrop(cardContainer, dropResult)
    }

    // クリーンアップ
    this.cleanupDrag(cardContainer)
    this.draggedCard = undefined
  }

  /**
   * マグネティックスナップの実行
   */
  private performMagneticSnap(
    cardContainer: Phaser.GameObjects.Container,
    snapPosition: { x: number; y: number }
  ): void {
    this.isSnapping = true

    // スナップアニメーション
    this.scene.tweens.add({
      targets: cardContainer,
      x: snapPosition.x,
      y: snapPosition.y,
      duration: 200,
      ease: 'Back.out',
      onComplete: () => {
        this.isSnapping = false
        
        // スナップ成功のビジュアルフィードバック
        this.showSnapFeedback(cardContainer)
      }
    })

    // スナップ効果音（サウンドエフェクトが実装されている場合）
    // this.scene.sound.play('snap-sound', { volume: 0.3 })
  }

  /**
   * ドロップ成功時の処理
   */
  private handleSuccessfulDrop(cardContainer: Phaser.GameObjects.Container, _result: DropResult): void {
    // 成功アニメーション
    this.scene.tweens.add({
      targets: cardContainer,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
      ease: 'Back.out',
      yoyo: true,
      onComplete: () => {
        // パーティクルエフェクト
        this.createSuccessParticles(cardContainer.x, cardContainer.y)
        
        // カードをフェードアウト
        this.scene.tweens.add({
          targets: cardContainer,
          alpha: 0,
          scale: 0.8,
          duration: this.dragConfig.animationDuration,
          ease: 'Power2',
          onComplete: () => {
            // 手札から削除などの処理は各ドロップゾーンのアクションで実行済み
          }
        })
      }
    })

    // モバイルでの振動フィードバック
    if (this.deviceInfo.hasTouch && navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }
  }

  /**
   * ドロップ失敗時の処理
   */
  private handleFailedDrop(cardContainer: Phaser.GameObjects.Container, result: DropResult): void {
    // 元の位置に戻すアニメーション
    this.scene.tweens.add({
      targets: cardContainer,
      x: this.dragStartPosition.x,
      y: this.dragStartPosition.y,
      duration: this.dragConfig.animationDuration,
      ease: 'Elastic.out'
    })

    // 失敗の視覚フィードバック
    this.showFailureFeedback(cardContainer)

    // エラーメッセージの表示（オプション）
    if (result.error) {
      console.warn(`Drop failed: ${result.error}`)
    }

    // モバイルでの振動フィードバック
    if (this.deviceInfo.hasTouch && navigator.vibrate) {
      navigator.vibrate(200)
    }
  }

  /**
   * ドラッグトレイルの作成
   */
  private createDragTrail(cardContainer: Phaser.GameObjects.Container): void {
    const trail = this.scene.add.graphics()
    trail.fillStyle(0x667eea, 0.3)
    trail.fillCircle(0, 0, 15)
    trail.setDepth(999)
    trail.setName('drag-trail')
    cardContainer.add(trail)
  }

  /**
   * ドラッグトレイルの更新（最適化版）
   */
  private updateDragTrailOptimized(cardContainer: Phaser.GameObjects.Container): void {
    const trail = cardContainer.getByName('drag-trail')
    if (trail) {
      // より高速なフェードアウト（計算量削減）
      const newAlpha = trail.alpha - 0.05
      if (newAlpha < 0.1) {
        this.returnTrailToPool(trail)
        cardContainer.remove(trail)
      } else {
        trail.setAlpha(newAlpha)
      }
    }
  }

  /**
   * ドラッグトレイルの更新（従来版）
   */
  private updateDragTrail(cardContainer: Phaser.GameObjects.Container): void {
    const trail = cardContainer.getByName('drag-trail')
    if (trail) {
      // トレイルのフェードアウト
      trail.setAlpha(trail.alpha * 0.95)
      if (trail.alpha < 0.1) {
        trail.destroy()
      }
    }
  }

  /**
   * スナップフィードバックの表示
   */
  private showSnapFeedback(cardContainer: Phaser.GameObjects.Container): void {
    const feedback = this.scene.add.graphics()
    feedback.lineStyle(3, 0x10B981, 0.8)
    feedback.strokeCircle(cardContainer.x, cardContainer.y, 80)
    feedback.setDepth(1001)

    this.scene.tweens.add({
      targets: feedback,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => { feedback.destroy(); }
    })
  }

  /**
   * 失敗フィードバックの表示
   */
  private showFailureFeedback(cardContainer: Phaser.GameObjects.Container): void {
    // 振動アニメーション
    const originalX = cardContainer.x
    this.scene.tweens.add({
      targets: cardContainer,
      x: originalX - 10,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Power2'
    })

    // X印の表示
    const x = this.scene.add.graphics()
    x.lineStyle(4, 0xEF4444, 0.8)
    x.lineBetween(-20, -20, 20, 20)
    x.lineBetween(-20, 20, 20, -20)
    x.setPosition(cardContainer.x, cardContainer.y)
    x.setDepth(1001)

    this.scene.tweens.add({
      targets: x,
      alpha: 0,
      scale: 2,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => { x.destroy(); }
    })
  }

  /**
   * 成功パーティクルの作成（最適化版）
   */
  private createSuccessParticles(x: number, y: number): void {
    // オブジェクトプールを使用してパーティクル効果を最適化
    for (let i = 0; i < 8; i++) {
      let particle = this.particlePool.pop()
      
      if (!particle) {
        particle = this.scene.add.graphics()
      }
      
      particle.clear()
      particle.fillStyle(0x10B981, 0.8)
      particle.fillCircle(0, 0, 4)
      particle.setPosition(x, y)
      particle.setDepth(1002)
      particle.setAlpha(0.8)
      particle.setScale(1)

      const angle = (i / 8) * Math.PI * 2
      const distance = 100

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 2,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          // パーティクルをプールに戻す
          this.returnParticleToPool(particle)
        }
      })
    }
  }

  /**
   * パーティクルをプールに戻す
   */
  private returnParticleToPool(particle: Phaser.GameObjects.Graphics): void {
    if (this.particlePool.length < 20) { // プールサイズ制限
      particle.setVisible(false)
      this.particlePool.push(particle)
    } else {
      particle.destroy()
    }
  }

  /**
   * トレイルをプールに戻す
   */
  private returnTrailToPool(trail: Phaser.GameObjects.Graphics): void {
    if (this.trailPool.length < 10) { // プールサイズ制限
      trail.setVisible(false)
      trail.setAlpha(1)
      this.trailPool.push(trail)
    } else {
      trail.destroy()
    }
  }

  /**
   * ドラッグのクリーンアップ
   */
  private cleanupDrag(cardContainer: Phaser.GameObjects.Container): void {
    cardContainer.setDepth(0)
    cardContainer.setAlpha(1)
    cardContainer.setScale(1)

    // トレイルの削除
    const trail = cardContainer.getByName('drag-trail')
    if (trail) {
      trail.destroy()
    }
  }

  /**
   * チャレンジドロップの処理
   */
  private handleChallengeDrop(card: Card): void {
    // 既存のGameSceneロジックとの統合
    if (import.meta.env.DEV) {
      console.log(`Challenge started with card: ${card.name}`)
    }
  }

  /**
   * 捨て札ドロップの処理
   */
  private handleDiscardDrop(card: Card): void {
    // 既存のGameSceneロジックとの統合
    if (import.meta.env.DEV) {
      console.log(`Card discarded: ${card.name}`)
    }
  }

  /**
   * カスタムドロップゾーンを追加
   */
  addCustomZone(zone: DropZone): void {
    this.dropZoneManager.addZone(zone)
  }

  /**
   * ドロップゾーンを削除
   */
  removeZone(zoneId: string): void {
    this.dropZoneManager.removeZone(zoneId)
  }

  /**
   * パフォーマンス統計の取得
   */
  getPerformanceStats(): {
    poolStats: {
      particles: number
      trails: number
    }
    updateFrequency: number
    throttleRate: number
  } {
    return {
      poolStats: {
        particles: this.particlePool.length,
        trails: this.trailPool.length
      },
      updateFrequency: this.UPDATE_THROTTLE,
      throttleRate: this.lastUpdateTime > 0 ? 1000 / this.UPDATE_THROTTLE : 0
    }
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    // プールの中身を全て破棄
    this.particlePool.forEach(particle => { particle.destroy(); })
    this.trailPool.forEach(trail => { trail.destroy(); })
    
    this.particlePool.length = 0
    this.trailPool.length = 0
    
    this.dropZoneManager.destroy()
  }
}