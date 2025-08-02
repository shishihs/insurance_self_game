/**
 * ゲーム統合アニメーションマネージャー
 * Vue UI層とPhaser ゲーム層のアニメーションを統合管理
 */

import { CardAnimations } from '../animations/CardAnimations'
import type { SoundManager } from './SoundManager'

export interface GameAnimationConfig {
  enableSounds: boolean
  performanceMode: boolean
  reducedMotion: boolean
  animationSpeed: number // 0.5 - 2.0
}

export interface UIAnimationEvent {
  type: 'vitality_change' | 'insurance_update' | 'turn_start' | 'victory' | 'defeat'
  data: any
  callback?: () => void
}

export class AnimationManager {
  private readonly scene: Phaser.Scene
  private readonly cardAnimations: CardAnimations
  private readonly soundManager?: SoundManager
  private config: GameAnimationConfig

  // アニメーション状態管理
  private isAnimating: boolean = false
  private animationQueue: (() => Promise<void>)[] = []
  private vitalityBarElement?: HTMLElement
  private readonly statusElements: Map<string, HTMLElement> = new Map()

  constructor(scene: Phaser.Scene, soundManager?: SoundManager) {
    this.scene = scene
    this.cardAnimations = new CardAnimations(scene)
    this.soundManager = soundManager
    
    // デフォルト設定
    this.config = {
      enableSounds: true,
      performanceMode: this.detectPerformanceMode(),
      reducedMotion: this.detectReducedMotion(),
      animationSpeed: 1.0
    }

    this.initializeUIElements()
    this.applyPerformanceSettings()
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<GameAnimationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.applyPerformanceSettings()
  }

  /**
   * UIアニメーションイベントを処理
   */
  async handleUIEvent(event: UIAnimationEvent): Promise<void> {
    if (this.config.reducedMotion) {
      // モーション削減モードでは即座に完了
      event.callback?.()
      return
    }

    switch (event.type) {
      case 'vitality_change':
        await this.animateVitalityChange(event.data)
        break
      case 'insurance_update':
        await this.animateInsuranceUpdate(event.data)
        break
      case 'turn_start':
        await this.animateTurnStart(event.data)
        break
      case 'victory':
        await this.animateVictory(event.data)
        break
      case 'defeat':
        await this.animateDefeat(event.data)
        break
    }

    event.callback?.()
  }

  /**
   * 活力値変更アニメーション
   */
  private async animateVitalityChange(data: { oldValue: number; newValue: number; maxValue: number }): Promise<void> {
    const vitalityBar = this.vitalityBarElement
    if (!vitalityBar) return

    const { oldValue, newValue, maxValue } = data
    const isIncrease = newValue > oldValue
    const percentage = (newValue / maxValue) * 100

    // サウンド再生
    if (this.soundManager && this.config.enableSounds) {
      if (isIncrease) {
        this.soundManager.playEffect('vitality_gain')
      } else {
        this.soundManager.playEffect('vitality_loss')
      }
    }

    // バーのアニメーション
    return new Promise((resolve) => {
      // 一時的な色変更でフィードバック
      const originalColor = vitalityBar.style.backgroundColor
      vitalityBar.style.backgroundColor = isIncrease ? '#10B981' : '#EF4444'
      
      // 幅のアニメーション
      vitalityBar.style.transition = `width ${300 / this.config.animationSpeed}ms cubic-bezier(0.4, 0, 0.2, 1)`
      vitalityBar.style.width = `${percentage}%`

      // 色を元に戻す
      setTimeout(() => {
        vitalityBar.style.backgroundColor = originalColor
        resolve()
      }, 300 / this.config.animationSpeed)
    })
  }

  /**
   * 保険更新アニメーション
   */
  private async animateInsuranceUpdate(data: { type: string; action: 'add' | 'remove' | 'update' }): Promise<void> {
    const insuranceElement = this.statusElements.get('insurance')
    if (!insuranceElement) return

    // パルス効果
    return new Promise((resolve) => {
      insuranceElement.style.transform = 'scale(1.1)'
      insuranceElement.style.transition = `transform ${200 / this.config.animationSpeed}ms ease-out`
      
      setTimeout(() => {
        insuranceElement.style.transform = 'scale(1)'
        resolve()
      }, 200 / this.config.animationSpeed)
    })
  }

  /**
   * ターン開始アニメーション
   */
  private async animateTurnStart(data: { turnNumber: number; stage: string }): Promise<void> {
    // Vue側のターン表示にアニメーションイベントを送信
    this.sendEventToVueUI('turn-start', data)

    // サウンド再生
    if (this.soundManager && this.config.enableSounds) {
      this.soundManager.playEffect('turn_start')
    }

    // 画面全体のフラッシュ効果
    const flashOverlay = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0xFFFFFF,
      0.3
    )

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: flashOverlay,
        alpha: 0,
        duration: 300 / this.config.animationSpeed,
        ease: 'Power2',
        onComplete: () => {
          flashOverlay.destroy()
          resolve()
        }
      })
    })
  }

  /**
   * 勝利アニメーション
   */
  private async animateVictory(data: { finalVitality: number; cards: any[] }): Promise<void> {
    // サウンド再生
    if (this.soundManager && this.config.enableSounds) {
      this.soundManager.playEffect('victory')
    }

    // Vue側に勝利イベントを送信
    this.sendEventToVueUI('victory', data)

    // Phaser層: カード展開アニメーション
    if (data.cards && data.cards.length > 0) {
      await this.cardAnimations.victoryCardSpread(data.cards)
    }

    // 画面全体の勝利エフェクト
    const victoryOverlay = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x51CF66,
      0
    )

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: victoryOverlay,
        alpha: 0.2,
        duration: 500 / this.config.animationSpeed,
        ease: 'Power2',
        yoyo: true,
        onComplete: () => {
          victoryOverlay.destroy()
          resolve()
        }
      })
    })
  }

  /**
   * 敗北アニメーション
   */
  private async animateDefeat(data: { reason: string }): Promise<void> {
    // サウンド再生
    if (this.soundManager && this.config.enableSounds) {
      this.soundManager.playEffect('defeat')
    }

    // Vue側に敗北イベントを送信
    this.sendEventToVueUI('defeat', data)

    // 画面全体の敗北エフェクト（暗転）
    const defeatOverlay = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x000000,
      0
    )

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: defeatOverlay,
        alpha: 0.7,
        duration: 1000 / this.config.animationSpeed,
        ease: 'Power2',
        onComplete: () => {
          resolve()
        }
      })
    })
  }

  /**
   * カードアニメーションを取得
   */
  getCardAnimations(): CardAnimations {
    return this.cardAnimations
  }

  /**
   * アニメーションをキューに追加
   */
  queueAnimation(animationFn: () => Promise<void>): void {
    this.animationQueue.push(animationFn)
    this.processAnimationQueue()
  }

  /**
   * アニメーションキューを処理
   */
  private async processAnimationQueue(): Promise<void> {
    if (this.isAnimating || this.animationQueue.length === 0) return

    this.isAnimating = true

    while (this.animationQueue.length > 0) {
      const animation = this.animationQueue.shift()
      if (animation) {
        try {
          await animation()
        } catch (error) {
          console.error('Animation error:', error)
        }
      }
    }

    this.isAnimating = false
  }

  /**
   * Vue UI側にイベントを送信
   */
  private sendEventToVueUI(eventType: string, data: any): void {
    const event = new CustomEvent(`game-${eventType}`, { detail: data })
    window.dispatchEvent(event)
  }

  /**
   * UI要素の初期化
   */
  private initializeUIElements(): void {
    // Vue UI要素への参照を取得
    setTimeout(() => {
      this.vitalityBarElement = document.querySelector('.vitality-bar-fill') as HTMLElement
      
      // その他のステータス要素
      const insuranceElement = document.querySelector('.insurance-status') as HTMLElement
      if (insuranceElement) {
        this.statusElements.set('insurance', insuranceElement)
      }
    }, 100)
  }

  /**
   * パフォーマンス設定を適用
   */
  private applyPerformanceSettings(): void {
    this.cardAnimations.setPerformanceMode(this.config.performanceMode)
    
    if (this.config.reducedMotion) {
      // モーション削減時は即座に完了する設定
      this.config.animationSpeed = 10.0
    }
  }

  /**
   * パフォーマンスモードを検出
   */
  private detectPerformanceMode(): boolean {
    // GPU情報やメモリを基に判定
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    
    if (!gl) return true

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      // 低性能GPU の場合は true を返す
      return renderer.includes('Intel') && !renderer.includes('Iris')
    }

    return false
  }

  /**
   * モーション削減設定を検出
   */
  private detectReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /**
   * 全てのアニメーションを停止
   */
  stopAllAnimations(): void {
    this.animationQueue = []
    this.isAnimating = false
    this.scene.tweens.killAll()
  }

  /**
   * アニメーションマネージャーを破棄
   */
  destroy(): void {
    this.stopAllAnimations()
    this.statusElements.clear()
  }
}