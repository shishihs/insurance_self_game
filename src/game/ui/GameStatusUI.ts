import type { Scene } from 'phaser'
import type { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import { GAME_CONSTANTS } from '../config/gameConfig'

/**
 * ゲームステータスUI
 * 活力、保険状態、ステージ情報などを見やすく表示
 */
export class GameStatusUI {
  private readonly scene: Scene
  private readonly container: Phaser.GameObjects.Container
  
  // 活力バー関連
  private vitalityContainer?: Phaser.GameObjects.Container
  private vitalityBar?: Phaser.GameObjects.Graphics
  private vitalityText?: Phaser.GameObjects.Text
  private vitalityIcon?: Phaser.GameObjects.Text
  private vitalityGlow?: Phaser.GameObjects.Graphics
  
  // 保険リスト関連
  private insuranceContainer?: Phaser.GameObjects.Container
  private readonly insuranceItems: Map<string, Phaser.GameObjects.Container> = new Map()
  
  // ステージ情報
  private stageContainer?: Phaser.GameObjects.Container
  private stageText?: Phaser.GameObjects.Text
  private turnText?: Phaser.GameObjects.Text
  
  // 負担度インジケーター
  private burdenContainer?: Phaser.GameObjects.Container
  private burdenBar?: Phaser.GameObjects.Graphics
  private burdenText?: Phaser.GameObjects.Text
  
  constructor(scene: Scene) {
    this.scene = scene
    this.container = scene.add.container(0, 0)
    this.createUI()
  }
  
  /**
   * UI作成
   */
  private createUI(): void {
    this.createVitalityBar()
    this.createInsuranceList()
    this.createStageInfo()
    this.createBurdenIndicator()
  }
  
  /**
   * 活力バーの作成（改善版）
   */
  private createVitalityBar(): void {
    const x = 20
    const y = 20
    const width = 300
    const height = 40
    
    this.vitalityContainer = this.scene.add.container(x, y)
    
    // 背景とフレーム
    const bgGraphics = this.scene.add.graphics()
    
    // 外側のグロー効果
    bgGraphics.fillStyle(0x000000, 0.3)
    bgGraphics.fillRoundedRect(-2, -2, width + 4, height + 4, 12)
    
    // メインフレーム
    bgGraphics.lineStyle(2, 0x4B5563, 1)
    bgGraphics.fillStyle(0x1F2937, 0.9)
    bgGraphics.fillRoundedRect(0, 0, width, height, 10)
    bgGraphics.strokeRoundedRect(0, 0, width, height, 10)
    
    // グロー効果用のグラフィックス
    this.vitalityGlow = this.scene.add.graphics()
    
    // 活力バー本体
    this.vitalityBar = this.scene.add.graphics()
    
    // アイコン
    this.vitalityIcon = this.scene.add.text(15, height / 2, '❤️', {
      fontSize: '24px',
      fontFamily: 'Arial'
    }).setOrigin(0.5)
    
    // 活力値テキスト
    this.vitalityText = this.scene.add.text(width - 15, height / 2, '100/100', {
      fontSize: '16px',
      fontFamily: 'Noto Sans JP',
      fontStyle: 'bold',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(1, 0.5)
    
    // ラベル
    const label = this.scene.add.text(45, height / 2, '活力', {
      fontSize: '14px',
      fontFamily: 'Noto Sans JP',
      color: '#D1D5DB'
    }).setOrigin(0, 0.5)
    
    this.vitalityContainer.add([
      bgGraphics,
      this.vitalityGlow,
      this.vitalityBar,
      this.vitalityIcon,
      label,
      this.vitalityText
    ])
    
    this.container.add(this.vitalityContainer)
  }
  
  /**
   * 保険リストの作成（改善版）
   */
  private createInsuranceList(): void {
    const x = 20
    const y = 80
    
    this.insuranceContainer = this.scene.add.container(x, y)
    
    // ヘッダー
    const headerBg = this.scene.add.graphics()
    headerBg.fillStyle(0x6366F1, 0.2)
    headerBg.fillRoundedRect(0, 0, 250, 30, 8)
    
    const headerIcon = this.scene.add.text(15, 15, '🛡️', {
      fontSize: '18px',
      fontFamily: 'Arial'
    }).setOrigin(0.5)
    
    const headerText = this.scene.add.text(35, 15, '保険契約', {
      fontSize: '14px',
      fontFamily: 'Noto Sans JP',
      fontStyle: 'bold',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5)
    
    this.insuranceContainer.add([headerBg, headerIcon, headerText])
    this.container.add(this.insuranceContainer)
  }
  
  /**
   * ステージ情報の作成
   */
  private createStageInfo(): void {
    const x = this.scene.cameras.main.width - 200
    const y = 20
    
    this.stageContainer = this.scene.add.container(x, y)
    
    // 背景
    const bg = this.scene.add.graphics()
    bg.fillStyle(0x000000, 0.7)
    bg.fillRoundedRect(0, 0, 180, 60, 10)
    
    // ステージテキスト
    this.stageText = this.scene.add.text(90, 20, '青年期', {
      fontSize: '18px',
      fontFamily: 'Noto Sans JP',
      fontStyle: 'bold',
      color: '#FFFFFF',
      align: 'center'
    }).setOrigin(0.5)
    
    // ターンテキスト
    this.turnText = this.scene.add.text(90, 40, 'ターン 1', {
      fontSize: '14px',
      fontFamily: 'Noto Sans JP',
      color: '#9CA3AF',
      align: 'center'
    }).setOrigin(0.5)
    
    this.stageContainer.add([bg, this.stageText, this.turnText])
    this.container.add(this.stageContainer)
  }
  
  /**
   * 負担度インジケーターの作成
   */
  private createBurdenIndicator(): void {
    const x = this.scene.cameras.main.width - 200
    const y = 100
    const width = 180
    const height = 30
    
    this.burdenContainer = this.scene.add.container(x, y)
    
    // 背景
    const bg = this.scene.add.graphics()
    bg.fillStyle(0x000000, 0.7)
    bg.fillRoundedRect(0, 0, width, height, 8)
    
    // アイコンとラベル
    const icon = this.scene.add.text(15, height / 2, '⚖️', {
      fontSize: '16px',
      fontFamily: 'Arial'
    }).setOrigin(0.5)
    
    const label = this.scene.add.text(35, height / 2, '負担度', {
      fontSize: '12px',
      fontFamily: 'Noto Sans JP',
      color: '#9CA3AF'
    }).setOrigin(0, 0.5)
    
    // 負担度バー
    this.burdenBar = this.scene.add.graphics()
    
    // 負担度テキスト
    this.burdenText = this.scene.add.text(width - 10, height / 2, '0%', {
      fontSize: '12px',
      fontFamily: 'Noto Sans JP',
      fontStyle: 'bold',
      color: '#FFFFFF'
    }).setOrigin(1, 0.5)
    
    this.burdenContainer.add([bg, icon, label, this.burdenBar, this.burdenText])
    this.container.add(this.burdenContainer)
  }
  
  /**
   * 活力バーの更新
   */
  updateVitality(current: number, max: number): void {
    if (!this.vitalityBar || !this.vitalityText || !this.vitalityGlow) return
    
    const width = 300
    const height = 40
    const barWidth = Math.max(0, (current / max) * (width - 80))
    const percentage = current / max
    
    // バーの色を活力値に応じて変更
    let barColor: number
    let glowColor: number
    
    if (percentage > 0.7) {
      barColor = 0x10B981 // 緑
      glowColor = 0x34D399
    } else if (percentage > 0.3) {
      barColor = 0xF59E0B // 黄色
      glowColor = 0xFBBF24
    } else {
      barColor = 0xEF4444 // 赤
      glowColor = 0xF87171
    }
    
    // バーを再描画
    this.vitalityBar.clear()
    
    // グラデーション効果のある活力バー
    const gradient = this.scene.add.graphics()
    gradient.fillStyle(barColor, 1)
    gradient.fillRoundedRect(60, 8, barWidth, height - 16, 6)
    
    // 光沢効果
    gradient.fillStyle(0xFFFFFF, 0.3)
    gradient.fillRoundedRect(60, 8, barWidth, (height - 16) / 2, 6)
    
    this.vitalityBar.add(gradient)
    
    // グロー効果
    this.vitalityGlow.clear()
    if (percentage < 0.3) {
      // 低活力時は脈動するグロー効果
      this.vitalityGlow.lineStyle(3, glowColor, 0.5)
      this.vitalityGlow.strokeRoundedRect(60, 8, barWidth, height - 16, 6)
      
      this.scene.tweens.add({
        targets: this.vitalityGlow,
        alpha: 0.2,
        duration: 1000,
        yoyo: true,
        repeat: -1
      })
    }
    
    // テキスト更新
    this.vitalityText.setText(`${current}/${max}`)
    
    // アイコンのアニメーション（低活力時）
    if (percentage < 0.3 && this.vitalityIcon) {
      this.scene.tweens.add({
        targets: this.vitalityIcon,
        scale: 1.2,
        duration: 500,
        yoyo: true,
        repeat: -1
      })
    }
  }
  
  /**
   * 保険リストの更新
   */
  updateInsuranceList(insuranceCards: Card[]): void {
    if (!this.insuranceContainer) return
    
    // 既存のアイテムをクリア
    this.insuranceItems.forEach(item => { item.destroy(); })
    this.insuranceItems.clear()
    
    // 新しい保険アイテムを作成
    insuranceCards.forEach((card, index) => {
      const itemY = 40 + index * 35
      const itemContainer = this.scene.add.container(0, itemY)
      
      // アイテム背景
      const itemBg = this.scene.add.graphics()
      itemBg.fillStyle(0x4B5563, 0.3)
      itemBg.fillRoundedRect(5, 0, 240, 30, 6)
      
      // 保険タイプアイコン
      const icon = card.durationType === 'permanent' ? '♾️' : '⏱️'
      const iconText = this.scene.add.text(15, 15, icon, {
        fontSize: '16px',
        fontFamily: 'Arial'
      }).setOrigin(0.5)
      
      // 保険名
      const nameText = this.scene.add.text(35, 15, card.name, {
        fontSize: '12px',
        fontFamily: 'Noto Sans JP',
        color: '#E5E7EB'
      }).setOrigin(0, 0.5)
      
      // 保険料（コスト）
      const premiumText = this.scene.add.text(200, 15, `¥${card.cost}`, {
        fontSize: '12px',
        fontFamily: 'Noto Sans JP',
        fontStyle: 'bold',
        color: '#FBBF24'
      }).setOrigin(1, 0.5)
      
      // 有効性インジケーター
      const statusDot = this.scene.add.graphics()
      const isActive = card.remainingTurns === undefined || card.remainingTurns > 0
      statusDot.fillStyle(isActive ? 0x10B981 : 0x6B7280, 1)
      statusDot.fillCircle(230, 15, 4)
      
      itemContainer.add([itemBg, iconText, nameText, premiumText, statusDot])
      this.insuranceContainer.add(itemContainer)
      this.insuranceItems.set(card.id, itemContainer)
    })
  }
  
  /**
   * ステージ情報の更新
   */
  updateStageInfo(stage: string, turn: number): void {
    if (!this.stageText || !this.turnText) return
    
    const stageNames: Record<string, string> = {
      youth: '青年期',
      middle: '中年期',
      senior: '老年期'
    }
    
    this.stageText.setText(stageNames[stage] || stage)
    this.turnText.setText(`ターン ${turn}`)
    
    // ステージ変更時のアニメーション
    this.scene.tweens.add({
      targets: this.stageContainer,
      scale: 1.1,
      duration: 300,
      yoyo: true,
      ease: 'Power2'
    })
  }
  
  /**
   * 負担度の更新
   */
  updateBurden(burden: number): void {
    if (!this.burdenBar || !this.burdenText) return
    
    const width = 100
    const height = 14
    const barWidth = Math.min(burden, 100) * (width / 100)
    
    // 負担度に応じた色
    let color: number
    if (burden < 30) {
      color = 0x10B981
    } else if (burden < 70) {
      color = 0xF59E0B
    } else {
      color = 0xEF4444
    }
    
    this.burdenBar.clear()
    this.burdenBar.fillStyle(color, 0.8)
    this.burdenBar.fillRoundedRect(75, 8, barWidth, height, 7)
    
    this.burdenText.setText(`${Math.round(burden)}%`)
  }
  
  /**
   * ゲーム状態の更新
   */
  updateFromGame(game: Game): void {
    this.updateVitality(game.vitality, game.maxVitality)
    this.updateInsuranceList(game.insuranceCards)
    this.updateStageInfo(game.stage, game.turn)
    this.updateBurden(game.insuranceBurden)
  }
  
  /**
   * UIの破棄
   */
  destroy(): void {
    this.container.destroy()
  }
}