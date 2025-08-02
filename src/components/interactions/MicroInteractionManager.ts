/**
 * マイクロインタラクション管理システム
 * プレイヤー体験を向上させる微細なアニメーションとフィードバック
 */

import { InteractionAudioManager } from './InteractionAudioManager'

export interface InteractionConfig {
  type: 'hover' | 'click' | 'drag' | 'drop' | 'focus' | 'success' | 'error' | 'loading'
  element: HTMLElement
  intensity?: 'subtle' | 'normal' | 'strong'
  duration?: number
  delay?: number
  haptic?: boolean
  sound?: boolean
}

export interface HapticFeedback {
  pattern: 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification'
  duration?: number
}

export interface VisualFeedback {
  type: 'ripple' | 'glow' | 'pulse' | 'shake' | 'bounce' | 'scale' | 'highlight'
  color?: string
  size?: 'small' | 'medium' | 'large'
  position?: { x: number; y: number }
}

export class MicroInteractionManager {
  private readonly activeInteractions: Map<HTMLElement, AbortController> = new Map()
  private hapticEnabled: boolean = true
  private soundEnabled: boolean = true
  private reducedMotion: boolean = false
  private interactionQueue: InteractionConfig[] = []
  private readonly isProcessingQueue: boolean = false
  private readonly audioManager: InteractionAudioManager

  constructor() {
    this.detectReducedMotion()
    this.setupHapticSupport()
    this.createStyles()
    this.audioManager = new InteractionAudioManager()
  }

  /**
   * インタラクションを登録
   */
  registerInteraction(config: InteractionConfig): void {
    const { element, type } = config

    // 既存のインタラクションをクリーンアップ
    this.unregisterInteraction(element)

    const controller = new AbortController()
    this.activeInteractions.set(element, controller)

    switch (type) {
      case 'hover':
        this.setupHoverInteraction(element, config, controller.signal)
        break
      case 'click':
        this.setupClickInteraction(element, config, controller.signal)
        break
      case 'drag':
        this.setupDragInteraction(element, config, controller.signal)
        break
      case 'focus':
        this.setupFocusInteraction(element, config, controller.signal)
        break
    }
  }

  /**
   * インタラクションの登録解除
   */
  unregisterInteraction(element: HTMLElement): void {
    const controller = this.activeInteractions.get(element)
    if (controller) {
      controller.abort()
      this.activeInteractions.delete(element)
    }
  }

  /**
   * 即座のフィードバック実行
   */
  async triggerFeedback(element: HTMLElement, type: InteractionConfig['type'], options: Partial<InteractionConfig> = {}): Promise<void> {
    const config: InteractionConfig = {
      type,
      element,
      intensity: options.intensity || 'normal',
      duration: options.duration || 300,
      delay: options.delay || 0,
      haptic: options.haptic !== false,
      sound: options.sound !== false,
      ...options
    }

    if (config.delay > 0) {
      await this.delay(config.delay)
    }

    await Promise.all([
      this.triggerVisualFeedback(config),
      this.triggerHapticFeedback(config),
      this.triggerSoundFeedback(config)
    ])
  }

  /**
   * カードホバー効果
   */
  async cardHover(element: HTMLElement, isEntering: boolean): Promise<void> {
    if (this.reducedMotion) return

    const intensity = isEntering ? 1.05 : 1
    const shadow = isEntering ? '0 8px 25px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
    const glowOpacity = isEntering ? 0.3 : 0

    element.style.transition = 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
    element.style.transform = `scale(${intensity}) translateZ(0)`
    element.style.boxShadow = shadow
    element.style.setProperty('--glow-opacity', glowOpacity.toString())

    // Audio feedback
    if (isEntering && this.soundEnabled) {
      const rect = element.getBoundingClientRect()
      await this.audioManager.playCardInteraction('hover', {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      })
    }

    if (isEntering && this.hapticEnabled) {
      this.vibrate('selection')
    }
  }

  /**
   * カードクリック効果
   */
  async cardClick(element: HTMLElement, position?: { x: number; y: number }): Promise<void> {
    const feedback: VisualFeedback = {
      type: 'ripple',
      color: 'rgba(129, 140, 248, 0.3)',
      size: 'medium',
      position
    }

    // Audio feedback
    if (this.soundEnabled) {
      const rect = element.getBoundingClientRect()
      const clickPosition = position || {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      }
      await this.audioManager.playCardInteraction('select', clickPosition)
    }

    await Promise.all([
      this.createRippleEffect(element, feedback),
      this.cardPulse(element),
      this.hapticEnabled ? this.vibrate('impact') : Promise.resolve()
    ])
  }

  /**
   * カードドラッグ開始効果
   */
  async cardDragStart(element: HTMLElement): Promise<void> {
    if (this.reducedMotion) return

    element.style.transition = 'all 150ms ease-out'
    element.style.transform = 'scale(1.08) rotate(2deg) translateZ(0)'
    element.style.boxShadow = '0 12px 35px rgba(0, 0, 0, 0.25)'
    element.style.zIndex = '1000'
    element.style.opacity = '0.9'

    // Audio feedback
    if (this.soundEnabled) {
      await this.audioManager.playCardInteraction('drag_start')
    }

    if (this.hapticEnabled) {
      this.vibrate('medium')
    }
  }

  /**
   * カードドロップ効果
   */
  async cardDrop(element: HTMLElement, success: boolean): Promise<void> {
    const scale = success ? 1.1 : 0.95
    const rotation = success ? 0 : -1
    const color = success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'

    element.style.transition = 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)'
    element.style.transform = `scale(${scale}) rotate(${rotation}deg)`
    element.style.backgroundColor = color

    // Audio feedback
    if (this.soundEnabled) {
      const rect = element.getBoundingClientRect()
      await this.audioManager.playCardInteraction(
        success ? 'drop_success' : 'drop_fail',
        {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        }
      )
    }

    setTimeout(() => {
      element.style.transform = 'scale(1) rotate(0deg)'
      element.style.backgroundColor = ''
      element.style.zIndex = ''
      element.style.opacity = ''
    }, 300)

    if (this.hapticEnabled) {
      this.vibrate(success ? 'notification' : 'light')
    }
  }

  /**
   * ボタンプレス効果
   */
  async buttonPress(element: HTMLElement, type: 'primary' | 'secondary' | 'danger' = 'primary'): Promise<void> {
    const colors = {
      primary: 'rgba(129, 140, 248, 0.3)',
      secondary: 'rgba(156, 163, 175, 0.3)',
      danger: 'rgba(239, 68, 68, 0.3)'
    }

    // Audio feedback
    if (this.soundEnabled) {
      await this.audioManager.playButtonInteraction('press', type)
    }

    // 押下効果
    element.style.transition = 'all 100ms ease-out'
    element.style.transform = 'scale(0.95) translateZ(0)'
    
    setTimeout(() => {
      element.style.transition = 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)'
      element.style.transform = 'scale(1) translateZ(0)'
    }, 100)

    // リップル効果
    await this.createRippleEffect(element, {
      type: 'ripple',
      color: colors[type],
      size: 'large'
    })

    if (this.hapticEnabled) {
      this.vibrate('impact')
    }
  }

  /**
   * 成功アニメーション
   */
  async successAnimation(element: HTMLElement): Promise<void> {
    const keyframes = [
      { transform: 'scale(1)', backgroundColor: 'transparent' },
      { transform: 'scale(1.1)', backgroundColor: 'rgba(34, 197, 94, 0.2)' },
      { transform: 'scale(1.05)', backgroundColor: 'rgba(34, 197, 94, 0.1)' },
      { transform: 'scale(1)', backgroundColor: 'transparent' }
    ]

    const animation = element.animate(keyframes, {
      duration: 600,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    })

    if (this.hapticEnabled) {
      this.vibrate('notification')
    }

    return animation.finished
  }

  /**
   * エラーアニメーション
   */
  async errorAnimation(element: HTMLElement): Promise<void> {
    const keyframes = [
      { transform: 'translateX(0)', backgroundColor: 'transparent' },
      { transform: 'translateX(-10px)', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
      { transform: 'translateX(10px)', backgroundColor: 'rgba(239, 68, 68, 0.2)' },
      { transform: 'translateX(-8px)', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
      { transform: 'translateX(8px)', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
      { transform: 'translateX(0)', backgroundColor: 'transparent' }
    ]

    const animation = element.animate(keyframes, {
      duration: 400,
      easing: 'ease-in-out'
    })

    if (this.hapticEnabled) {
      setTimeout(async () => this.vibrate('light'), 0)
      setTimeout(async () => this.vibrate('light'), 200)
    }

    return animation.finished
  }

  /**
   * ローディングアニメーション
   */
  createLoadingAnimation(element: HTMLElement): () => void {
    if (this.reducedMotion) {
      element.style.opacity = '0.7'
      return () => { element.style.opacity = '' }
    }

    const keyframes = [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0.7, transform: 'scale(0.98)' },
      { opacity: 1, transform: 'scale(1)' }
    ]

    const animation = element.animate(keyframes, {
      duration: 1500,
      iterations: Infinity,
      easing: 'ease-in-out'
    })

    return () => {
      animation.cancel()
      element.style.opacity = ''
      element.style.transform = ''
    }
  }

  /**
   * ツールチップ表示アニメーション
   */
  async showTooltip(element: HTMLElement, text: string, position: 'top' | 'bottom' | 'left' | 'right' = 'top'): Promise<HTMLElement> {
    const tooltip = this.createTooltipElement(text, position)
    const rect = element.getBoundingClientRect()
    
    // 位置計算
    this.positionTooltip(tooltip, rect, position)
    
    document.body.appendChild(tooltip)

    // アニメーション
    if (!this.reducedMotion) {
      const keyframes = [
        { opacity: 0, transform: 'scale(0.8) translateY(10px)' },
        { opacity: 1, transform: 'scale(1) translateY(0)' }
      ]
      
      await tooltip.animate(keyframes, {
        duration: 200,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        fill: 'forwards'
      }).finished
    }

    return tooltip
  }

  /**
   * 設定メソッド
   */
  setHapticEnabled(enabled: boolean): void {
    this.hapticEnabled = enabled
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled
    this.audioManager.setEnabled(enabled)
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled
  }

  private setupHoverInteraction(element: HTMLElement, config: InteractionConfig, signal: AbortSignal): void {
    const handleMouseEnter = () => {
      if (!signal.aborted) {
        this.cardHover(element, true)
      }
    }

    const handleMouseLeave = () => {
      if (!signal.aborted) {
        this.cardHover(element, false)
      }
    }

    element.addEventListener('mouseenter', handleMouseEnter, { signal })
    element.addEventListener('mouseleave', handleMouseLeave, { signal })
  }

  private setupClickInteraction(element: HTMLElement, config: InteractionConfig, signal: AbortSignal): void {
    const handleClick = (event: MouseEvent) => {
      if (!signal.aborted) {
        const rect = element.getBoundingClientRect()
        const position = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        }
        this.cardClick(element, position)
      }
    }

    element.addEventListener('click', handleClick, { signal })
  }

  private setupDragInteraction(element: HTMLElement, config: InteractionConfig, signal: AbortSignal): void {
    const handleDragStart = () => {
      if (!signal.aborted) {
        this.cardDragStart(element)
      }
    }

    const handleDragEnd = () => {
      if (!signal.aborted) {
        element.style.transform = ''
        element.style.boxShadow = ''
        element.style.zIndex = ''
        element.style.opacity = ''
      }
    }

    element.addEventListener('dragstart', handleDragStart, { signal })
    element.addEventListener('dragend', handleDragEnd, { signal })
  }

  private setupFocusInteraction(element: HTMLElement, config: InteractionConfig, signal: AbortSignal): void {
    const handleFocus = () => {
      if (!signal.aborted && !this.reducedMotion) {
        element.style.transition = 'all 200ms ease-out'
        element.style.boxShadow = '0 0 0 3px rgba(129, 140, 248, 0.3)'
      }
    }

    const handleBlur = () => {
      if (!signal.aborted) {
        element.style.boxShadow = ''
      }
    }

    element.addEventListener('focus', handleFocus, { signal })
    element.addEventListener('blur', handleBlur, { signal })
  }

  private async triggerVisualFeedback(config: InteractionConfig): Promise<void> {
    if (this.reducedMotion) return

    const { element, type, intensity } = config

    switch (type) {
      case 'success':
        return this.successAnimation(element)
      case 'error':
        return this.errorAnimation(element)
      case 'click':
        return this.cardClick(element)
      default:
        return Promise.resolve()
    }
  }

  private async triggerHapticFeedback(config: InteractionConfig): Promise<void> {
    if (!this.hapticEnabled || !config.haptic) return

    const { type, intensity } = config
    let pattern: HapticFeedback['pattern'] = 'light'

    switch (type) {
      case 'click':
        pattern = intensity === 'strong' ? 'impact' : 'selection'
        break
      case 'success':
        pattern = 'notification'
        break
      case 'error':
        pattern = 'light'
        break
      case 'drag':
        pattern = 'medium'
        break
    }

    return this.vibrate(pattern)
  }

  private async triggerSoundFeedback(config: InteractionConfig): Promise<void> {
    if (!this.soundEnabled || !config.sound) return
    // サウンドフィードバックは次のタスクで実装
    return Promise.resolve()
  }

  private async createRippleEffect(element: HTMLElement, feedback: VisualFeedback): Promise<void> {
    if (this.reducedMotion) return

    const ripple = document.createElement('div')
    ripple.className = 'micro-interaction-ripple'
    
    const rect = element.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    const x = feedback.position ? feedback.position.x : rect.width / 2
    const y = feedback.position ? feedback.position.y : rect.height / 2

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
      background: ${feedback.color || 'rgba(129, 140, 248, 0.3)'};
      border-radius: 50%;
      transform: scale(0);
      pointer-events: none;
      z-index: 1000;
    `

    // 相対位置設定
    const originalPosition = element.style.position
    if (!originalPosition || originalPosition === 'static') {
      element.style.position = 'relative'
    }

    element.appendChild(ripple)

    const animation = ripple.animate([
      { transform: 'scale(0)', opacity: 1 },
      { transform: 'scale(1)', opacity: 0 }
    ], {
      duration: 600,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    })

    await animation.finished
    ripple.remove()

    // 元の位置設定を復元
    if (!originalPosition || originalPosition === 'static') {
      element.style.position = originalPosition
    }
  }

  private async cardPulse(element: HTMLElement): Promise<void> {
    if (this.reducedMotion) return

    const animation = element.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.02)' },
      { transform: 'scale(1)' }
    ], {
      duration: 150,
      easing: 'ease-out'
    })

    return animation.finished
  }

  private async vibrate(pattern: HapticFeedback['pattern']): Promise<void> {
    if (!navigator.vibrate || !this.hapticEnabled) return

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      selection: [5],
      impact: [15],
      notification: [10, 50, 10]
    }

    navigator.vibrate(patterns[pattern])
  }

  private createTooltipElement(text: string, position: string): HTMLElement {
    const tooltip = document.createElement('div')
    tooltip.className = `micro-interaction-tooltip tooltip-${position}`
    tooltip.textContent = text
    tooltip.setAttribute('role', 'tooltip')
    
    return tooltip
  }

  private positionTooltip(tooltip: HTMLElement, rect: DOMRect, position: string): void {
    const margin = 8
    
    switch (position) {
      case 'top':
        tooltip.style.left = `${rect.left + rect.width / 2}px`
        tooltip.style.top = `${rect.top - margin}px`
        tooltip.style.transform = 'translateX(-50%) translateY(-100%)'
        break
      case 'bottom':
        tooltip.style.left = `${rect.left + rect.width / 2}px`
        tooltip.style.top = `${rect.bottom + margin}px`
        tooltip.style.transform = 'translateX(-50%)'
        break
      case 'left':
        tooltip.style.left = `${rect.left - margin}px`
        tooltip.style.top = `${rect.top + rect.height / 2}px`
        tooltip.style.transform = 'translateX(-100%) translateY(-50%)'
        break
      case 'right':
        tooltip.style.left = `${rect.right + margin}px`
        tooltip.style.top = `${rect.top + rect.height / 2}px`
        tooltip.style.transform = 'translateY(-50%)'
        break
    }
  }

  private detectReducedMotion(): void {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      this.reducedMotion = mediaQuery.matches
      
      mediaQuery.addEventListener('change', (e) => {
        this.reducedMotion = e.matches
      })
    }
  }

  private setupHapticSupport(): void {
    this.hapticEnabled = 'vibrate' in navigator
  }

  private createStyles(): void {
    const style = document.createElement('style')
    style.textContent = `
      .micro-interaction-tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        z-index: 10000;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .micro-interaction-tooltip::before {
        content: '';
        position: absolute;
        width: 0;
        height: 0;
        border: 4px solid transparent;
      }

      .tooltip-top::before {
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        border-top-color: rgba(0, 0, 0, 0.9);
      }

      .tooltip-bottom::before {
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        border-bottom-color: rgba(0, 0, 0, 0.9);
      }

      .tooltip-left::before {
        right: -8px;
        top: 50%;
        transform: translateY(-50%);
        border-left-color: rgba(0, 0, 0, 0.9);
      }

      .tooltip-right::before {
        left: -8px;
        top: 50%;
        transform: translateY(-50%);
        border-right-color: rgba(0, 0, 0, 0.9);
      }

      @media (prefers-reduced-motion: reduce) {
        .micro-interaction-tooltip {
          opacity: 1 !important;
          transform: none !important;
        }
      }
    `
    document.head.appendChild(style)
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.activeInteractions.forEach(controller => { controller.abort(); })
    this.activeInteractions.clear()
    this.interactionQueue = []
    this.audioManager.destroy()
  }
}