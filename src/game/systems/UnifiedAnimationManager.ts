/**
 * 統一されたアニメーションマネージャー
 * すべてのゲーム内アニメーションを一元管理
 */

import type { Ref } from 'vue';
import { ref } from 'vue'

// アニメーションタイプ
export type AnimationType = 
  | 'fadeIn' 
  | 'fadeOut' 
  | 'slideIn' 
  | 'slideOut' 
  | 'scaleIn' 
  | 'scaleOut'
  | 'bounce' 
  | 'shake' 
  | 'rotate' 
  | 'pulse'
  | 'flip'
  | 'glow'

// アニメーション設定
export interface AnimationConfig {
  duration?: number
  delay?: number
  easing?: string
  intensity?: 'low' | 'normal' | 'high'
  direction?: 'up' | 'down' | 'left' | 'right'
  loop?: boolean
  onComplete?: () => void
}

// アニメーション状態
interface AnimationState {
  id: string
  element: HTMLElement
  type: AnimationType
  config: AnimationConfig
  startTime: number
  isRunning: boolean
}

// パフォーマンス設定
interface PerformanceConfig {
  maxConcurrentAnimations: number
  enableGPUAcceleration: boolean
  reducedMotion: boolean
  targetFPS: number
}

export class UnifiedAnimationManager {
  private animations: Map<string, AnimationState> = new Map()
  private animationFrame: number | null = null
  private performanceConfig: PerformanceConfig
  private animationSpeed: Ref<number> = ref(1)
  private isPaused: Ref<boolean> = ref(false)
  private activeAnimationCount: Ref<number> = ref(0)

  constructor(config?: Partial<PerformanceConfig>) {
    this.performanceConfig = {
      maxConcurrentAnimations: 10,
      enableGPUAcceleration: true,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      targetFPS: 60,
      ...config
    }

    // モーション設定の変更を監視
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.performanceConfig.reducedMotion = e.matches
    })

    // アニメーションループ開始
    this.startAnimationLoop()
  }

  /**
   * アニメーションを開始
   */
  animate(element: HTMLElement, type: AnimationType, config: AnimationConfig = {}): string {
    const id = this.generateAnimationId()
    
    // パフォーマンス制限チェック
    if (this.activeAnimationCount.value >= this.performanceConfig.maxConcurrentAnimations) {
      console.warn('Maximum concurrent animations reached')
      config.onComplete?.()
      return id
    }

    // モーション削減モードの場合は即座に完了
    if (this.performanceConfig.reducedMotion) {
      this.applyReducedMotionAnimation(element, type, config)
      config.onComplete?.()
      return id
    }

    // アニメーション状態を作成
    const state: AnimationState = {
      id,
      element,
      type,
      config: {
        duration: 300,
        delay: 0,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        intensity: 'normal',
        ...config
      },
      startTime: performance.now() + (config.delay || 0),
      isRunning: true
    }

    // GPU最適化
    if (this.performanceConfig.enableGPUAcceleration) {
      element.style.willChange = 'transform, opacity'
    }

    // アニメーションを登録
    this.animations.set(id, state)
    this.activeAnimationCount.value++

    // アニメーションクラスを適用
    this.applyAnimationClass(element, type, state.config)

    return id
  }

  /**
   * パーティクルエフェクトを生成
   */
  createParticles(
    x: number, 
    y: number, 
    type: 'success' | 'error' | 'celebration' | 'sparkle' | 'coins',
    count: number = 10
  ): void {
    if (this.performanceConfig.reducedMotion) return

    const container = this.getOrCreateParticleContainer()
    const particles: HTMLElement[] = []

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div')
      particle.className = `particle particle-${type}`
      particle.style.position = 'fixed'
      particle.style.left = `${x}px`
      particle.style.top = `${y}px`
      particle.style.pointerEvents = 'none'
      particle.style.zIndex = '9999'

      // パーティクルのカスタマイズ
      this.customizeParticle(particle, type, i)

      container.appendChild(particle)
      particles.push(particle)

      // アニメーション開始
      this.animateParticle(particle, type, i, () => {
        particle.remove()
      })
    }
  }

  /**
   * シーン遷移アニメーション
   */
  transitionScene(
    fromElement: HTMLElement | null,
    toElement: HTMLElement,
    type: 'fade' | 'slide' | 'zoom' | 'flip' = 'fade',
    direction: 'left' | 'right' | 'up' | 'down' = 'left'
  ): Promise<void> {
    return new Promise((resolve) => {
      if (this.performanceConfig.reducedMotion) {
        if (fromElement) fromElement.style.display = 'none'
        toElement.style.display = 'block'
        resolve()
        return
      }

      const duration = 400
      const easing = 'cubic-bezier(0.4, 0, 0.2, 1)'

      // 遷移コンテナを準備
      const container = toElement.parentElement
      if (!container) {
        resolve()
        return
      }

      container.style.position = 'relative'
      container.style.overflow = 'hidden'

      // 新しい要素の準備
      toElement.style.position = 'absolute'
      toElement.style.top = '0'
      toElement.style.left = '0'
      toElement.style.width = '100%'
      toElement.style.display = 'block'

      // アニメーションを適用
      this.applySceneTransition(fromElement, toElement, type, direction, duration, easing)

      // アニメーション完了後の処理
      setTimeout(() => {
        if (fromElement) {
          fromElement.style.display = 'none'
          fromElement.style.position = ''
          fromElement.style.transform = ''
          fromElement.style.opacity = ''
        }
        toElement.style.position = ''
        toElement.style.transform = ''
        toElement.style.opacity = ''
        container.style.position = ''
        container.style.overflow = ''
        resolve()
      }, duration)
    })
  }

  /**
   * 勝利演出
   */
  playVictoryAnimation(container: HTMLElement): void {
    if (this.performanceConfig.reducedMotion) {
      // 簡略化された勝利表示
      const message = document.createElement('div')
      message.className = 'victory-message-simple'
      message.textContent = '勝利！'
      container.appendChild(message)
      return
    }

    // 背景エフェクト
    const overlay = document.createElement('div')
    overlay.className = 'victory-overlay'
    container.appendChild(overlay)

    // 勝利メッセージ
    const message = document.createElement('div')
    message.className = 'victory-message'
    message.innerHTML = `
      <h1 class="victory-title">Victory!</h1>
      <p class="victory-subtitle">素晴らしい戦略でした！</p>
    `
    container.appendChild(message)

    // パーティクルエフェクト
    const rect = container.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // 複数のパーティクルウェーブ
    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => {
        this.createParticles(centerX, centerY, 'celebration', 20)
      }, wave * 200)
    }

    // アニメーション適用
    this.animate(overlay, 'fadeIn', { duration: 300 })
    this.animate(message, 'scaleIn', { 
      duration: 600, 
      delay: 300,
      intensity: 'high'
    })

    // 自動削除
    setTimeout(() => {
      this.animate(message, 'scaleOut', { 
        duration: 300,
        onComplete: () => message.remove()
      })
      this.animate(overlay, 'fadeOut', { 
        duration: 300,
        onComplete: () => overlay.remove()
      })
    }, 3000)
  }

  /**
   * 敗北演出
   */
  playDefeatAnimation(container: HTMLElement): void {
    if (this.performanceConfig.reducedMotion) {
      const message = document.createElement('div')
      message.className = 'defeat-message-simple'
      message.textContent = '敗北...'
      container.appendChild(message)
      return
    }

    // 暗転エフェクト
    const overlay = document.createElement('div')
    overlay.className = 'defeat-overlay'
    container.appendChild(overlay)

    // 敗北メッセージ
    const message = document.createElement('div')
    message.className = 'defeat-message'
    message.innerHTML = `
      <h1 class="defeat-title">Game Over</h1>
      <p class="defeat-subtitle">次回はきっと勝てます！</p>
    `
    container.appendChild(message)

    // アニメーション適用
    this.animate(overlay, 'fadeIn', { duration: 600, intensity: 'low' })
    this.animate(message, 'slideIn', { 
      duration: 800, 
      delay: 300,
      direction: 'down'
    })

    // 自動削除
    setTimeout(() => {
      this.animate(message, 'fadeOut', { 
        duration: 300,
        onComplete: () => message.remove()
      })
      this.animate(overlay, 'fadeOut', { 
        duration: 300,
        onComplete: () => overlay.remove()
      })
    }, 3000)
  }

  /**
   * カード操作時のエフェクト
   */
  playCardEffect(card: HTMLElement, effect: 'play' | 'draw' | 'discard' | 'power'): void {
    if (this.performanceConfig.reducedMotion) return

    const rect = card.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2

    switch (effect) {
      case 'play':
        this.animate(card, 'pulse', { duration: 300, intensity: 'normal' })
        this.createParticles(x, y, 'sparkle', 5)
        break
      case 'draw':
        this.animate(card, 'slideIn', { duration: 400, direction: 'up' })
        break
      case 'discard':
        this.animate(card, 'fadeOut', { duration: 300 })
        this.createParticles(x, y, 'error', 3)
        break
      case 'power':
        this.animate(card, 'glow', { duration: 600, loop: true })
        this.createParticles(x, y, 'sparkle', 8)
        break
    }
  }

  /**
   * アニメーション速度を設定
   */
  setAnimationSpeed(speed: number): void {
    this.animationSpeed.value = Math.max(0.1, Math.min(2, speed))
    document.documentElement.style.setProperty('--animation-speed-multiplier', speed.toString())
  }

  /**
   * すべてのアニメーションを一時停止
   */
  pauseAll(): void {
    this.isPaused.value = true
    this.animations.forEach(animation => {
      if (animation.element) {
        animation.element.style.animationPlayState = 'paused'
      }
    })
  }

  /**
   * すべてのアニメーションを再開
   */
  resumeAll(): void {
    this.isPaused.value = false
    this.animations.forEach(animation => {
      if (animation.element) {
        animation.element.style.animationPlayState = 'running'
      }
    })
  }

  /**
   * 特定のアニメーションを停止
   */
  stop(animationId: string): void {
    const animation = this.animations.get(animationId)
    if (animation) {
      this.cleanupAnimation(animation)
      this.animations.delete(animationId)
      this.activeAnimationCount.value--
    }
  }

  /**
   * すべてのアニメーションを停止
   */
  stopAll(): void {
    this.animations.forEach(animation => {
      this.cleanupAnimation(animation)
    })
    this.animations.clear()
    this.activeAnimationCount.value = 0
  }

  /**
   * リソースのクリーンアップ
   */
  destroy(): void {
    this.stopAll()
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
    
    // パーティクルコンテナを削除
    const container = document.getElementById('particle-container')
    if (container) {
      container.remove()
    }
  }

  // === プライベートメソッド ===

  private generateAnimationId(): string {
    return `anim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private startAnimationLoop(): void {
    const loop = () => {
      if (!this.isPaused.value) {
        this.updateAnimations()
      }
      this.animationFrame = requestAnimationFrame(loop)
    }
    loop()
  }

  private updateAnimations(): void {
    const now = performance.now()
    const completedAnimations: string[] = []

    this.animations.forEach((animation, id) => {
      if (!animation.isRunning) return

      const elapsed = now - animation.startTime
      const duration = (animation.config.duration || 300) / this.animationSpeed.value

      if (elapsed >= duration) {
        completedAnimations.push(id)
        animation.config.onComplete?.()
      }
    })

    // 完了したアニメーションを削除
    completedAnimations.forEach(id => {
      const animation = this.animations.get(id)
      if (animation) {
        this.cleanupAnimation(animation)
        this.animations.delete(id)
        this.activeAnimationCount.value--
      }
    })
  }

  private applyAnimationClass(element: HTMLElement, type: AnimationType, config: AnimationConfig): void {
    const duration = (config.duration || 300) / this.animationSpeed.value
    const delay = config.delay || 0
    const easing = config.easing || 'cubic-bezier(0.4, 0, 0.2, 1)'

    // 既存のアニメーションクラスを削除
    element.classList.remove(...Array.from(element.classList).filter(c => c.startsWith('anim-')))

    // 新しいアニメーションクラスを追加
    const animClass = `anim-${type}-${config.intensity || 'normal'}`
    element.classList.add(animClass)

    // アニメーションスタイルを設定
    element.style.animationDuration = `${duration}ms`
    element.style.animationDelay = `${delay}ms`
    element.style.animationTimingFunction = easing
    element.style.animationFillMode = 'both'

    if (config.loop) {
      element.style.animationIterationCount = 'infinite'
    }
  }

  private applyReducedMotionAnimation(element: HTMLElement, type: AnimationType, config: AnimationConfig): void {
    // モーション削減時は最終状態に即座に遷移
    switch (type) {
      case 'fadeIn':
        element.style.opacity = '1'
        break
      case 'fadeOut':
        element.style.opacity = '0'
        break
      case 'scaleIn':
        element.style.transform = 'scale(1)'
        break
      case 'scaleOut':
        element.style.transform = 'scale(0)'
        break
      default:
        break
    }
  }

  private cleanupAnimation(animation: AnimationState): void {
    if (animation.element) {
      // willChangeを削除
      animation.element.style.willChange = ''
      
      // アニメーション関連のスタイルをリセット
      animation.element.style.animationDuration = ''
      animation.element.style.animationDelay = ''
      animation.element.style.animationTimingFunction = ''
      animation.element.style.animationFillMode = ''
      animation.element.style.animationIterationCount = ''
      
      // アニメーションクラスを削除
      const animClasses = Array.from(animation.element.classList).filter(c => c.startsWith('anim-'))
      animation.element.classList.remove(...animClasses)
    }
  }

  private getOrCreateParticleContainer(): HTMLElement {
    let container = document.getElementById('particle-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'particle-container'
      container.style.position = 'fixed'
      container.style.top = '0'
      container.style.left = '0'
      container.style.width = '100%'
      container.style.height = '100%'
      container.style.pointerEvents = 'none'
      container.style.zIndex = '9999'
      document.body.appendChild(container)
    }
    return container
  }

  private customizeParticle(particle: HTMLElement, type: string, index: number): void {
    const size = 8 + Math.random() * 8
    const hue = this.getParticleHue(type)
    
    particle.style.width = `${size}px`
    particle.style.height = `${size}px`
    particle.style.backgroundColor = `hsl(${hue}, 70%, 60%)`
    particle.style.borderRadius = '50%'
    particle.style.opacity = '1'

    // タイプ別のカスタマイズ
    switch (type) {
      case 'celebration':
        particle.style.backgroundColor = `hsl(${Math.random() * 360}, 80%, 60%)`
        particle.style.boxShadow = `0 0 ${size}px hsla(${hue}, 80%, 60%, 0.5)`
        break
      case 'sparkle':
        particle.style.borderRadius = '0'
        particle.style.transform = `rotate(${Math.random() * 360}deg)`
        particle.innerHTML = '✦'
        particle.style.fontSize = `${size}px`
        particle.style.backgroundColor = 'transparent'
        particle.style.color = `hsl(${hue}, 80%, 70%)`
        break
      case 'coins':
        particle.innerHTML = '💰'
        particle.style.fontSize = `${size * 2}px`
        particle.style.backgroundColor = 'transparent'
        break
    }
  }

  private getParticleHue(type: string): number {
    switch (type) {
      case 'success': return 120 // 緑
      case 'error': return 0 // 赤
      case 'celebration': return 45 // 金
      case 'sparkle': return 260 // 紫
      case 'coins': return 45 // 金
      default: return 200 // 青
    }
  }

  private animateParticle(particle: HTMLElement, type: string, index: number, onComplete: () => void): void {
    const angle = (Math.PI * 2 * index) / 10 + Math.random() * 0.5
    const velocity = 100 + Math.random() * 100
    const duration = 1000 + Math.random() * 500
    const startTime = performance.now()

    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = elapsed / duration

      if (progress >= 1) {
        onComplete()
        return
      }

      const distance = velocity * progress
      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance - (progress * progress * 200) // 重力効果

      particle.style.transform = `translate(${x}px, ${y}px) scale(${1 - progress * 0.5})`
      particle.style.opacity = `${1 - progress}`

      requestAnimationFrame(animate)
    }

    animate()
  }

  private applySceneTransition(
    fromElement: HTMLElement | null,
    toElement: HTMLElement,
    type: string,
    direction: string,
    duration: number,
    easing: string
  ): void {
    const transforms = {
      slide: {
        left: { from: 'translateX(100%)', to: 'translateX(-100%)' },
        right: { from: 'translateX(-100%)', to: 'translateX(100%)' },
        up: { from: 'translateY(100%)', to: 'translateY(-100%)' },
        down: { from: 'translateY(-100%)', to: 'translateY(100%)' }
      },
      zoom: {
        from: 'scale(0.8)',
        to: 'scale(1.2)'
      }
    }

    toElement.style.transition = `all ${duration}ms ${easing}`
    if (fromElement) {
      fromElement.style.transition = `all ${duration}ms ${easing}`
    }

    // 初期状態を設定
    if (type === 'fade') {
      toElement.style.opacity = '0'
    } else if (type === 'slide') {
      toElement.style.transform = transforms.slide[direction as keyof typeof transforms.slide].from
    } else if (type === 'zoom') {
      toElement.style.transform = transforms.zoom.from
      toElement.style.opacity = '0'
    }

    // アニメーション開始
    requestAnimationFrame(() => {
      if (type === 'fade') {
        toElement.style.opacity = '1'
        if (fromElement) fromElement.style.opacity = '0'
      } else if (type === 'slide') {
        toElement.style.transform = 'translateX(0) translateY(0)'
        if (fromElement) {
          fromElement.style.transform = transforms.slide[direction as keyof typeof transforms.slide].to
        }
      } else if (type === 'zoom') {
        toElement.style.transform = 'scale(1)'
        toElement.style.opacity = '1'
        if (fromElement) {
          fromElement.style.transform = transforms.zoom.to
          fromElement.style.opacity = '0'
        }
      }
    })
  }
}

// シングルトンインスタンス
let animationManagerInstance: UnifiedAnimationManager | null = null

export function getUnifiedAnimationManager(): UnifiedAnimationManager {
  if (!animationManagerInstance) {
    animationManagerInstance = new UnifiedAnimationManager()
  }
  return animationManagerInstance
}