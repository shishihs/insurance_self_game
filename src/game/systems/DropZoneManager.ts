import type { Card } from '@/domain/entities/Card'
import type { Game } from '@/domain/entities/Game'

/**
 * ドロップゾーンの定義
 */
export interface DropZone {
  id: string
  type: 'challenge' | 'discard' | 'special'
  bounds: Phaser.Geom.Rectangle
  isValid: (card: Card, game: Game) => boolean
  onDrop: (card: Card, game: Game) => void
  priority: number
  magneticDistance?: number
  visualStyle?: {
    validColor: number
    invalidColor: number
    hoverColor: number
  }
}

/**
 * ドロップ結果
 */
export interface DropResult {
  success: boolean
  zone?: DropZone
  error?: string
}

/**
 * ドラッグ状態
 */
interface DragState {
  isDragging: boolean
  card?: Card
  startPosition?: { x: number; y: number }
  currentPosition?: { x: number; y: number }
  hoveredZone?: DropZone
  validZones: DropZone[]
}

/**
 * 効率的なドロップゾーン管理システム
 */
export class DropZoneManager {
  private zones: Map<string, DropZone> = new Map()
  private scene: Phaser.Scene
  private dragState: DragState = {
    isDragging: false,
    validZones: []
  }
  private lastFrameTime = 0
  private readonly FRAME_INTERVAL = 16 // 60fps

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * ドロップゾーンを追加
   */
  addZone(zone: DropZone): void {
    this.zones.set(zone.id, zone)
  }

  /**
   * ドロップゾーンを削除
   */
  removeZone(zoneId: string): void {
    this.zones.delete(zoneId)
  }

  /**
   * ドラッグ開始
   */
  startDrag(card: Card, game: Game, position: { x: number; y: number }): void {
    this.dragState = {
      isDragging: true,
      card,
      startPosition: { ...position },
      currentPosition: { ...position },
      validZones: this.getValidZones(card, game),
      hoveredZone: undefined
    }

    // 有効なドロップゾーンをハイライト
    this.highlightValidZones()
  }

  /**
   * ドラッグ更新（フレームレート制御付き）
   */
  updateDrag(position: { x: number; y: number }, game: Game): void {
    if (!this.dragState.isDragging || !this.dragState.card) return

    const currentTime = Date.now()
    if (currentTime - this.lastFrameTime < this.FRAME_INTERVAL) return
    this.lastFrameTime = currentTime

    this.dragState.currentPosition = { ...position }

    // ホバーゾーンの更新
    const newHoveredZone = this.getZoneAtPosition(position.x, position.y)
    if (newHoveredZone !== this.dragState.hoveredZone) {
      this.updateHoverState(newHoveredZone, game)
    }
  }

  /**
   * ドラッグ終了とドロップ処理
   */
  endDrag(position: { x: number; y: number }, game: Game): DropResult {
    if (!this.dragState.isDragging || !this.dragState.card) {
      return { success: false, error: 'No active drag operation' }
    }

    const dropZone = this.getZoneAtPosition(position.x, position.y)
    let result: DropResult

    if (dropZone && this.isValidDrop(this.dragState.card, dropZone, game)) {
      try {
        dropZone.onDrop(this.dragState.card, game)
        result = { success: true, zone: dropZone }
      } catch (error) {
        result = { 
          success: false, 
          error: `Drop action failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }
      }
    } else {
      result = { 
        success: false, 
        error: dropZone ? 'Invalid drop target' : 'No drop zone found' 
      }
    }

    // クリーンアップ
    this.clearHighlights()
    this.dragState = {
      isDragging: false,
      validZones: []
    }

    return result
  }

  /**
   * 位置からドロップゾーンを取得（優先度順）
   */
  private getZoneAtPosition(x: number, y: number): DropZone | undefined {
    const candidateZones = Array.from(this.zones.values())
      .filter(zone => zone.bounds.contains(x, y))
      .sort((a, b) => b.priority - a.priority)

    return candidateZones[0]
  }

  /**
   * 有効なドロップゾーンを取得
   */
  private getValidZones(card: Card, game: Game): DropZone[] {
    return Array.from(this.zones.values())
      .filter(zone => {
        try {
          return zone.isValid(card, game)
        } catch (error) {
          console.warn(`Validation error for zone ${zone.id}:`, error)
          return false
        }
      })
  }

  /**
   * ドロップが有効かチェック
   */
  private isValidDrop(card: Card, zone: DropZone, game: Game): boolean {
    try {
      return this.dragState.validZones.includes(zone) && zone.isValid(card, game)
    } catch (error) {
      console.warn(`Validation error for zone ${zone.id}:`, error)
      return false
    }
  }

  /**
   * 有効なゾーンをハイライト
   */
  private highlightValidZones(): void {
    this.dragState.validZones.forEach(zone => {
      const graphics = this.scene.add.graphics()
      graphics.fillStyle(zone.visualStyle?.validColor || 0x00ff00, 0.3)
      graphics.fillRectShape(zone.bounds)
      graphics.lineStyle(2, zone.visualStyle?.validColor || 0x00ff00, 0.8)
      graphics.strokeRectShape(zone.bounds)
      graphics.setName(`highlight-${zone.id}`)

      // パルスアニメーション
      this.scene.tweens.add({
        targets: graphics,
        alpha: 0.5,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Power2'
      })
    })
  }

  /**
   * ホバー状態を更新
   */
  private updateHoverState(newHoveredZone: DropZone | undefined, game: Game): void {
    // 前のホバー状態をクリア
    if (this.dragState.hoveredZone) {
      const oldGraphics = this.scene.children.getByName(`hover-${this.dragState.hoveredZone.id}`)
      if (oldGraphics) {
        oldGraphics.destroy()
      }
    }

    this.dragState.hoveredZone = newHoveredZone

    // 新しいホバー状態を表示
    if (newHoveredZone && this.dragState.card) {
      const isValid = this.isValidDrop(this.dragState.card, newHoveredZone, game)
      const color = isValid 
        ? (newHoveredZone.visualStyle?.hoverColor || 0x00ff88)
        : (newHoveredZone.visualStyle?.invalidColor || 0xff0000)

      const graphics = this.scene.add.graphics()
      graphics.fillStyle(color, 0.5)
      graphics.fillRectShape(newHoveredZone.bounds)
      graphics.lineStyle(3, color, 1.0)
      graphics.strokeRectShape(newHoveredZone.bounds)
      graphics.setName(`hover-${newHoveredZone.id}`)

      // ホバーアニメーション
      graphics.setScale(0.9)
      this.scene.tweens.add({
        targets: graphics,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 200,
        ease: 'Back.out'
      })
    }
  }

  /**
   * すべてのハイライトをクリア
   */
  private clearHighlights(): void {
    this.zones.forEach(zone => {
      const highlight = this.scene.children.getByName(`highlight-${zone.id}`)
      const hover = this.scene.children.getByName(`hover-${zone.id}`)
      
      if (highlight) {
        this.scene.tweens.add({
          targets: highlight,
          alpha: 0,
          duration: 200,
          onComplete: () => highlight.destroy()
        })
      }
      
      if (hover) {
        hover.destroy()
      }
    })
  }

  /**
   * マグネティックスナップの距離チェック
   */
  getMagneticSnapTarget(position: { x: number; y: number }): { zone: DropZone; snapPosition: { x: number; y: number } } | null {
    if (!this.dragState.card) return null

    for (const zone of this.dragState.validZones) {
      const distance = zone.magneticDistance || 100
      const centerX = zone.bounds.x + zone.bounds.width / 2
      const centerY = zone.bounds.y + zone.bounds.height / 2
      
      const dx = position.x - centerX
      const dy = position.y - centerY
      const distanceToCenter = Math.sqrt(dx * dx + dy * dy)

      if (distanceToCenter <= distance) {
        return {
          zone,
          snapPosition: { x: centerX, y: centerY }
        }
      }
    }

    return null
  }

  /**
   * 現在のドラッグ状態を取得
   */
  getDragState(): Readonly<DragState> {
    return { ...this.dragState }
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.clearHighlights()
    this.zones.clear()
    this.dragState = {
      isDragging: false,
      validZones: []
    }
  }
}