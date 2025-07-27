import { DropZoneManager, type DropZone } from './DropZoneManager'
import { DropZoneValidators, DropZoneActions } from './DropZoneValidators'
import type { Game } from '../../domain/entities/Game'
import type { Card } from '../../domain/entities/Card'

/**
 * ゲーム定数の取得（外部依存を注入可能にする）
 */
interface GameConstants {
  CARD_WIDTH: number
  CARD_HEIGHT: number
  CHALLENGE_X_POSITION: number
  CHALLENGE_Y_POSITION: number
  DISCARD_X_POSITION: number
  DISCARD_Y_POSITION: number
  INSURANCE_X_POSITION?: number
  INSURANCE_Y_POSITION?: number
  DRAG_DROP: {
    SNAP_DISTANCE: number
    MAGNETIC_DISTANCE: number
  }
}

/**
 * DropZoneManagerとGameSceneの統合を簡単にするヘルパークラス
 * 既存のコードに最小限の変更で新しいシステムを導入可能
 */
export class DropZoneIntegration {
  private dropZoneManager: DropZoneManager
  private scene: Phaser.Scene
  private game: Game
  private constants: GameConstants

  constructor(scene: Phaser.Scene, game: Game, constants: GameConstants) {
    this.scene = scene
    this.game = game
    this.constants = constants
    this.dropZoneManager = new DropZoneManager(scene, game)
  }

  /**
   * 標準的なドロップゾーンセットを初期化
   * 既存のinitializeDropZones()メソッドを置き換え可能
   */
  public initializeStandardZones(): void {
    // チャレンジエリアのドロップゾーン
    this.addChallengeZone()
    
    // 捨て札エリアのドロップゾーン  
    this.addDiscardZone()
    
    // 保険エリアのドロップゾーン（ゲーム拡張時）
    this.addInsuranceZone()
  }

  /**
   * チャレンジエリアドロップゾーンを追加
   */
  private addChallengeZone(): void {
    const challengeZone: DropZone = {
      id: 'challenge',
      type: 'challenge',
      bounds: new Phaser.Geom.Rectangle(
        this.constants.CHALLENGE_X_POSITION - this.constants.CARD_WIDTH / 2 - 10,
        this.constants.CHALLENGE_Y_POSITION - this.constants.CARD_HEIGHT / 2 - 10,
        this.constants.CARD_WIDTH + 20,
        this.constants.CARD_HEIGHT + 20
      ),
      isValid: (card: Card, game: Game) => {
        const result = DropZoneValidators.challengeArea()(card, game)
        return result.isValid
      },
      onDrop: DropZoneActions.withErrorHandling(
        DropZoneActions.placeOnChallenge(),
        (error, card, game) => {
          console.error('Challenge drop failed:', error.message)
          // エラー時のフィードバック（例：カードを元の位置に戻す）
        }
      ),
      priority: 10,
      magneticDistance: this.constants.DRAG_DROP.MAGNETIC_DISTANCE || 80
    }
    
    this.dropZoneManager.registerZone(challengeZone)
  }

  /**
   * 捨て札エリアドロップゾーンを追加
   */
  private addDiscardZone(): void {
    const discardZone: DropZone = {
      id: 'discard',
      type: 'discard',
      bounds: new Phaser.Geom.Rectangle(
        this.constants.DISCARD_X_POSITION - this.constants.CARD_WIDTH / 2 - 10,
        this.constants.DISCARD_Y_POSITION - this.constants.CARD_HEIGHT / 2 - 10,
        this.constants.CARD_WIDTH + 20,
        this.constants.CARD_HEIGHT + 20
      ),
      isValid: (card: Card, game: Game) => {
        const result = DropZoneValidators.discardArea()(card, game)
        return result.isValid
      },
      onDrop: DropZoneActions.withErrorHandling(
        DropZoneActions.discardCard(),
        (error, card, game) => {
          console.error('Discard drop failed:', error.message)
        }
      ),
      priority: 5,
      magneticDistance: this.constants.DRAG_DROP.MAGNETIC_DISTANCE || 80
    }
    
    this.dropZoneManager.registerZone(discardZone)
  }

  /**
   * 保険エリアドロップゾーンを追加（拡張機能）
   */
  private addInsuranceZone(): void {
    if (!this.constants.INSURANCE_X_POSITION || !this.constants.INSURANCE_Y_POSITION) {
      return // 保険エリアが定義されていない場合はスキップ
    }

    const insuranceZone: DropZone = {
      id: 'insurance',
      type: 'special',
      bounds: new Phaser.Geom.Rectangle(
        this.constants.INSURANCE_X_POSITION - this.constants.CARD_WIDTH / 2 - 10,
        this.constants.INSURANCE_Y_POSITION - this.constants.CARD_HEIGHT / 2 - 10,
        this.constants.CARD_WIDTH + 20,
        this.constants.CARD_HEIGHT + 20
      ),
      isValid: (card: Card, game: Game) => {
        const result = DropZoneValidators.combine(
          DropZoneValidators.cardTypeOnly(['insurance']),
          DropZoneValidators.phaseOnly(['purchase', 'renewal']),
          DropZoneValidators.insuranceArea()
        )(card, game)
        return result.isValid
      },
      onDrop: DropZoneActions.withErrorHandling(
        DropZoneActions.purchaseInsurance(),
        (error, card, game) => {
          console.error('Insurance purchase failed:', error.message)
        }
      ),
      priority: 8,
      magneticDistance: this.constants.DRAG_DROP.MAGNETIC_DISTANCE || 80
    }
    
    this.dropZoneManager.registerZone(insuranceZone)
  }

  /**
   * カードコンテナにドラッグ&ドロップ機能を追加
   * 既存のsetupCardDragAndDropを置き換え可能
   */
  public setupCardDragAndDrop(cardContainer: Phaser.GameObjects.Container): void {
    // ドラッグ可能に設定
    this.scene.input.setDraggable(cardContainer)
    
    // ドラッグ開始
    cardContainer.on('dragstart', () => {
      this.dropZoneManager.startDrag(cardContainer)
      cardContainer.setScale(1.1) // 視覚的フィードバック
      cardContainer.setAlpha(0.9)
      cardContainer.setDepth(1000)
    })

    // ドラッグ中
    cardContainer.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      // モバイル対応のオフセット調整
      const isMobile = this.scene.scale.orientation === Phaser.Scale.LANDSCAPE || 
                      this.scene.scale.orientation === Phaser.Scale.PORTRAIT
      const offsetY = isMobile ? -30 : 0

      cardContainer.x = dragX
      cardContainer.y = dragY + offsetY

      // ドロップゾーンの更新（最適化されたチェック）
      this.dropZoneManager.updateDrag(dragX, dragY + offsetY)
    })

    // ドラッグ終了
    cardContainer.on('dragend', () => {
      const result = this.dropZoneManager.endDrag(cardContainer.x, cardContainer.y)
      
      // 視覚的フィードバックをリセット
      cardContainer.setScale(1)
      cardContainer.setAlpha(1)
      
      if (result.success && result.zone) {
        // 成功時：ドロップゾーンに移動
        this.animateToDropZone(cardContainer, result.zone)
      } else {
        // 失敗時：元の位置に戻す
        this.animateBackToHand(cardContainer, result.error)
      }
    })

    // クリック（選択）処理も統合
    cardContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return
      cardContainer.setData('dragStartTime', this.scene.time.now)
    })

    cardContainer.on('pointerup', () => {
      const dragStartTime = cardContainer.getData('dragStartTime')
      const isDragging = cardContainer.getData('isDragging')
      
      // 短いクリックの場合は選択処理
      if (!isDragging && dragStartTime && this.scene.time.now - dragStartTime < 200) {
        this.handleCardSelection(cardContainer)
      }
      
      cardContainer.setData('isDragging', false)
    })
  }

  /**
   * カードをドロップゾーンに移動するアニメーション
   */
  private animateToDropZone(cardContainer: Phaser.GameObjects.Container, zone: DropZone): void {
    const centerX = zone.bounds.x + zone.bounds.width / 2
    const centerY = zone.bounds.y + zone.bounds.height / 2

    this.scene.tweens.add({
      targets: cardContainer,
      x: centerX,
      y: centerY,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // ドロップ成功エフェクト
        this.showDropSuccessEffect(centerX, centerY)
      }
    })
  }

  /**
   * カードを手札に戻すアニメーション
   */
  private animateBackToHand(cardContainer: Phaser.GameObjects.Container, error?: string): void {
    const originalPosition = cardContainer.getData('originalPosition') || 
                           { x: cardContainer.x, y: cardContainer.y }

    // 振動効果
    this.scene.tweens.add({
      targets: cardContainer,
      x: cardContainer.x + 10,
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        // 元の位置に戻す
        this.scene.tweens.add({
          targets: cardContainer,
          x: originalPosition.x,
          y: originalPosition.y,
          duration: 400,
          ease: 'Power2.easeOut'
        })
      }
    })

    // エラーメッセージ表示（オプション）
    if (error) {
      this.showErrorMessage(error)
    }
  }

  /**
   * カード選択処理（既存ロジックとの互換性維持）
   */
  private handleCardSelection(cardContainer: Phaser.GameObjects.Container): void {
    // 既存の選択ロジックを呼び出し
    // この部分は既存のGameSceneのtoggleCardSelectionメソッドに委譲
    if (this.scene.data) {
      this.scene.data.events.emit('cardSelected', cardContainer)
    }
  }

  /**
   * ドロップ成功エフェクト
   */
  private showDropSuccessEffect(x: number, y: number): void {
    const effect = this.scene.add.graphics()
    effect.fillStyle(0x00ff00, 0.8)
    effect.fillCircle(x, y, 30)
    effect.setDepth(1100)

    this.scene.tweens.add({
      targets: effect,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 500,
      ease: 'Power2.easeOut',
      onComplete: () => effect.destroy()
    })
  }

  /**
   * エラーメッセージ表示
   */
  private showErrorMessage(message: string): void {
    console.warn('Drop failed:', message)
    // 実際のゲームではUIにエラーメッセージを表示
  }

  /**
   * カスタムドロップゾーンを追加
   */
  public addCustomZone(zone: DropZone): void {
    this.dropZoneManager.registerZone(zone)
  }

  /**
   * ドロップゾーンマネージャーへの直接アクセス（上級者向け）
   */
  public getDropZoneManager(): DropZoneManager {
    return this.dropZoneManager
  }

  /**
   * リソースのクリーンアップ
   */
  public destroy(): void {
    this.dropZoneManager.destroy()
  }

  /**
   * デバッグ情報取得
   */
  public getDebugInfo(): object {
    return {
      zones: Array.from(this.dropZoneManager.getAllZones().keys()),
      dragState: this.dropZoneManager.getDragState(),
      constants: this.constants
    }
  }
}