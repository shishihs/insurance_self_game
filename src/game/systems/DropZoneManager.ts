import type { Card } from '../../domain/entities/Card'
import type { Game } from '../../domain/entities/Game'

/**
 * ドロップゾーンの定義インターフェース
 */
export interface DropZone {
  /** ゾーンの一意ID */
  id: string
  /** ゾーンのタイプ */
  type: 'challenge' | 'discard' | 'special'
  /** 当たり判定の矩形範囲 */
  bounds: Phaser.Geom.Rectangle
  /** カードがドロップ可能かを判定する関数 */
  isValid: (card: Card, game: Game) => boolean
  /** ドロップ時の処理関数 */
  onDrop: (card: Card, game: Game) => void
  /** 優先度（重複時の解決に使用、高い方が優先） */
  priority: number
  /** 視覚的ハイライト用の表示オブジェクト */
  highlight?: Phaser.GameObjects.Graphics
  /** マグネティック効果の有効距離 */
  magneticDistance: number
}

/**
 * ドラッグ状態を管理するインターフェース
 */
export interface DragState {
  /** ドラッグ中かどうか */
  isDragging: boolean
  /** ドラッグ中のカード */
  draggedCard?: Phaser.GameObjects.Container
  /** ドラッグ開始時刻 */
  startTime?: number
  /** ドラッグ開始位置 */
  startPosition?: { x: number; y: number }
  /** 最後に検出されたドロップゾーン */
  lastNearestZone?: string | null
}

/**
 * 効率的なドロップゾーン管理システム
 * - 矩形判定による高速化
 * - 優先度システムによる重複解決
 * - 統一された状態管理
 * - 拡張可能な設計
 */
export class DropZoneManager {
  private zones: Map<string, DropZone> = new Map()
  private dragState: DragState = { isDragging: false }
  private scene: Phaser.Scene
  private game: Game
  
  // パフォーマンス最適化のための設定
  private readonly CHECK_INTERVAL = 16 // 60fps (1000ms / 60fps ≈ 16ms)
  private lastCheckTime = 0
  
  // ビジュアルエフェクト用
  private dragTrail?: Phaser.GameObjects.Graphics
  private magneticEffect?: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, game: Game) {
    this.scene = scene
    this.game = game
    this.initializeVisualEffects()
  }

  /**
   * ドロップゾーンを登録
   */
  public registerZone(zone: DropZone): void {
    if (this.zones.has(zone.id)) {
      throw new Error(`DropZone with id '${zone.id}' already exists`)
    }
    
    // ハイライト用グラフィックスを作成
    zone.highlight = this.scene.add.graphics()
    zone.highlight.setPosition(zone.bounds.x, zone.bounds.y)
    zone.highlight.setAlpha(0)
    zone.highlight.setDepth(100)
    
    this.zones.set(zone.id, zone)
  }

  /**
   * ドロップゾーンの登録を解除
   */
  public unregisterZone(zoneId: string): void {
    const zone = this.zones.get(zoneId)
    if (zone?.highlight) {
      zone.highlight.destroy()
    }
    this.zones.delete(zoneId)
  }

  /**
   * すべてのドロップゾーンをクリア
   */
  public clearAllZones(): void {
    this.zones.forEach(zone => {
      if (zone.highlight) {
        zone.highlight.destroy()
      }
    })
    this.zones.clear()
  }

  /**
   * ドラッグ開始処理
   */
  public startDrag(cardContainer: Phaser.GameObjects.Container): void {
    this.dragState = {
      isDragging: true,
      draggedCard: cardContainer,
      startTime: this.scene.time.now,
      startPosition: { x: cardContainer.x, y: cardContainer.y },
      lastNearestZone: null
    }
    
    // ドロップゾーンハイライトを表示
    this.updateZoneHighlights()
    
    // ドラッグトレイルをクリア
    if (this.dragTrail) {
      this.dragTrail.clear()
    }
  }

  /**
   * ドラッグ中の処理（最適化されたチェック）
   */
  public updateDrag(x: number, y: number): string | null {
    if (!this.dragState.isDragging) return null
    
    // フレームレート制限による最適化
    const currentTime = this.scene.time.now
    if (currentTime - this.lastCheckTime < this.CHECK_INTERVAL) {
      return this.dragState.lastNearestZone
    }
    this.lastCheckTime = currentTime
    
    // ドラッグトレイルを更新
    this.updateDragTrail(x, y)
    
    // 最適化された矩形判定でドロップゾーンを検索
    const nearestZone = this.findNearestValidZone(x, y)
    
    // マグネティック効果を更新
    this.updateMagneticEffect(nearestZone, x, y)
    
    // 状態を更新
    this.dragState.lastNearestZone = nearestZone?.id || null
    
    return this.dragState.lastNearestZone
  }

  /**
   * ドラッグ終了処理
   */
  public endDrag(x: number, y: number): { success: boolean; zone?: DropZone; error?: string } {
    if (!this.dragState.isDragging || !this.dragState.draggedCard) {
      return { success: false, error: 'No drag in progress' }
    }
    
    try {
      // ドロップゾーンを特定
      const targetZone = this.findNearestValidZone(x, y)
      
      // 状態をリセット
      this.resetDragState()
      
      if (targetZone) {
        // 有効なドロップゾーンにドロップ
        const card = this.dragState.draggedCard.getData('card') as Card
        targetZone.onDrop(card, this.game)
        return { success: true, zone: targetZone }
      } else {
        // 無効なドロップ
        return { success: false, error: 'No valid drop zone found' }
      }
    } catch (error) {
      this.resetDragState()
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * 効率的な矩形判定による最適なドロップゾーン検索
   */
  private findNearestValidZone(x: number, y: number): DropZone | null {
    if (!this.dragState.draggedCard) return null
    
    const card = this.dragState.draggedCard.getData('card') as Card
    const point = new Phaser.Geom.Point(x, y)
    
    let bestZone: DropZone | null = null
    let bestPriority = -1
    let bestDistance = Infinity
    
    // 矩形判定による高速フィルタリング
    for (const zone of this.zones.values()) {
      // まず矩形判定で候補を絞り込み
      if (!Phaser.Geom.Rectangle.Contains(zone.bounds, point.x, point.y)) {
        // 矩形外でもマグネティック距離内なら候補に含める
        const distance = this.getDistanceToZone(point.x, point.y, zone)
        if (distance > zone.magneticDistance) {
          continue
        }
      }
      
      // バリデーション（重い処理のため最後に実行）
      if (!zone.isValid(card, this.game)) {
        continue
      }
      
      // 距離を計算
      const distance = this.getDistanceToZone(point.x, point.y, zone)
      
      // 優先度と距離で最適なゾーンを決定
      if (zone.priority > bestPriority || 
          (zone.priority === bestPriority && distance < bestDistance)) {
        bestZone = zone
        bestPriority = zone.priority
        bestDistance = distance
      }
    }
    
    return bestZone
  }

  /**
   * ポイントとゾーンの距離を計算（最適化版）
   */
  private getDistanceToZone(x: number, y: number, zone: DropZone): number {
    const centerX = zone.bounds.x + zone.bounds.width / 2
    const centerY = zone.bounds.y + zone.bounds.height / 2
    
    // 平方根を使わない距離計算（高速化）
    const dx = x - centerX
    const dy = y - centerY
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * ゾーンハイライトを更新
   */
  private updateZoneHighlights(): void {
    if (!this.dragState.draggedCard) return
    
    const card = this.dragState.draggedCard.getData('card') as Card
    
    this.zones.forEach(zone => {
      if (!zone.highlight) return
      
      const isValid = zone.isValid(card, this.game)
      const color = isValid ? 0x00ff00 : 0xff0000
      const alpha = isValid ? 0.3 : 0.15
      
      // ハイライトを更新
      zone.highlight.clear()
      zone.highlight.fillStyle(color, alpha)
      zone.highlight.fillRoundedRect(0, 0, zone.bounds.width, zone.bounds.height, 8)
      zone.highlight.strokeRoundedRect(0, 0, zone.bounds.width, zone.bounds.height, 8)
      
      // アニメーション効果
      this.scene.tweens.add({
        targets: zone.highlight,
        alpha: alpha,
        duration: 200,
        ease: 'Power2'
      })
    })
  }

  /**
   * マグネティック効果を更新
   */
  private updateMagneticEffect(nearestZone: DropZone | null, x: number, y: number): void {
    if (!this.magneticEffect) return
    
    this.magneticEffect.clear()
    
    if (nearestZone) {
      const centerX = nearestZone.bounds.x + nearestZone.bounds.width / 2
      const centerY = nearestZone.bounds.y + nearestZone.bounds.height / 2
      const distance = this.getDistanceToZone(x, y, nearestZone)
      
      if (distance < nearestZone.magneticDistance) {
        // マグネティック効果のグロウを描画
        const intensity = 1 - (distance / nearestZone.magneticDistance)
        this.magneticEffect.fillStyle(0x00ffff, 0.4 * intensity)
        this.magneticEffect.fillCircle(centerX, centerY, nearestZone.bounds.width * 0.7)
      }
    }
  }

  /**
   * ドラッグトレイルを更新
   */
  private updateDragTrail(x: number, y: number): void {
    if (!this.dragTrail) return
    
    // トレイル効果を描画
    this.dragTrail.fillStyle(0x000000, 0.2)
    this.dragTrail.fillCircle(x - 5, y + 5, 30)
  }

  /**
   * ドラッグ状態をリセット
   */
  private resetDragState(): void {
    // ハイライトを隠す
    this.hideZoneHighlights()
    
    // ビジュアルエフェクトをクリア
    if (this.magneticEffect) {
      this.magneticEffect.clear()
    }
    if (this.dragTrail) {
      this.dragTrail.clear()
    }
    
    // 状態をリセット
    this.dragState = { isDragging: false }
  }

  /**
   * ゾーンハイライトを隠す
   */
  private hideZoneHighlights(): void {
    this.zones.forEach(zone => {
      if (zone.highlight) {
        this.scene.tweens.add({
          targets: zone.highlight,
          alpha: 0,
          duration: 200,
          ease: 'Power2'
        })
      }
    })
  }

  /**
   * ビジュアルエフェクトの初期化
   */
  private initializeVisualEffects(): void {
    this.dragTrail = this.scene.add.graphics()
    this.dragTrail.setDepth(900)
    
    this.magneticEffect = this.scene.add.graphics()
    this.magneticEffect.setDepth(950)
  }

  /**
   * リソースのクリーンアップ
   */
  public destroy(): void {
    this.clearAllZones()
    
    if (this.dragTrail) {
      this.dragTrail.destroy()
    }
    if (this.magneticEffect) {
      this.magneticEffect.destroy()
    }
  }

  /**
   * 現在のドラッグ状態を取得
   */
  public getDragState(): Readonly<DragState> {
    return { ...this.dragState }
  }

  /**
   * ゾーンの情報を取得
   */
  public getZone(zoneId: string): DropZone | undefined {
    return this.zones.get(zoneId)
  }

  /**
   * 登録されているゾーンの一覧を取得
   */
  public getAllZones(): ReadonlyMap<string, DropZone> {
    return this.zones
  }
}