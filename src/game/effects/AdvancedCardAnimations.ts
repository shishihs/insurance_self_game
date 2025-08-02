/**
 * 高度なカードアニメーションシステム
 * 3D変形、パーティクル、物理シミュレーションを統合
 */

export interface CardAnimationOptions {
  duration?: number
  easing?: string
  delay?: number
  intensity?: 'subtle' | 'normal' | 'dramatic'
  enableParticles?: boolean
  enablePhysics?: boolean
  enableGPUAcceleration?: boolean
  onStart?: () => void
  onComplete?: () => void
  onUpdate?: (progress: number) => void
}

export interface CardPhysicsConfig {
  gravity?: number
  bounce?: number
  friction?: number
  windForce?: { x: number; y: number }
}

export interface ParticleConfig {
  count?: number
  type?: 'sparkle' | 'smoke' | 'fire' | 'water' | 'magic' | 'coins' | 'stars'
  color?: string
  size?: { min: number; max: number }
  lifetime?: number
  spread?: number
}

/**
 * 高度なカードアニメーション管理クラス
 */
export class AdvancedCardAnimations {
  private readonly scene: Phaser.Scene
  private readonly particleEmitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map()
  private readonly physicsObjects: Map<string, Phaser.Physics.Arcade.Body> = new Map()
  private animationQueue: Array<() => Promise<void>> = []
  private readonly isProcessingQueue = false
  
  // パフォーマンス設定
  private readonly performanceConfig = {
    maxParticles: 100,
    maxConcurrentAnimations: 8,
    useGPUAcceleration: true,
    reducedMotion: false
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.initializePerformanceSettings()
  }

  /**
   * カードドロー - デッキから手札への流麗なアニメーション
   */
  async drawCard(
    card: Phaser.GameObjects.Container,
    fromPosition: { x: number; y: number },
    toPosition: { x: number; y: number },
    options: CardAnimationOptions = {}
  ): Promise<void> {
    const config = this.mergeDefaultOptions(options)
    
    return new Promise((resolve) => {
      // 初期設定
      card.setPosition(fromPosition.x, fromPosition.y)
      card.setScale(0.6)
      card.setAlpha(0.8)
      card.setRotation(Math.PI * -0.1) // 少し傾ける

      // フェーズ1: カードをめくりながら浮上
      this.scene.tweens.add({
        targets: card,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        rotation: 0,
        duration: config.duration * 0.3,
        ease: 'Back.easeOut(2)',
        delay: config.delay,
        onStart: () => {
          config.onStart?.()
          if (config.enableParticles) {
            this.createDrawParticles(fromPosition.x, fromPosition.y)
          }
        },
        onComplete: () => {
          // フェーズ2: 弧を描いて移動
          this.animateCardArc(card, fromPosition, toPosition, {
            ...config,
            duration: config.duration * 0.7,
            onComplete: () => {
              // フェーズ3: 着地のバウンス効果
              this.scene.tweens.add({
                targets: card,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 100,
                ease: 'Power2',
                yoyo: true,
                onComplete: () => {
                  config.onComplete?.()
                  resolve()
                }
              })
            }
          })
        }
      })
    })
  }

  /**
   * カードプレイ - 3D変形効果とパーティクルエフェクト
   */
  async playCard(
    card: Phaser.GameObjects.Container,
    targetPosition: { x: number; y: number },
    options: CardAnimationOptions = {}
  ): Promise<void> {
    const config = this.mergeDefaultOptions(options)
    
    return new Promise((resolve) => {
      const startPos = { x: card.x, y: card.y }
      
      // パーティクル準備
      if (config.enableParticles) {
        this.createPlayParticles(startPos.x, startPos.y, {
          type: 'magic',
          count: 15,
          color: this.getCardElementColor(card)
        })
      }

      // フェーズ1: 3D回転とスケール
      this.scene.tweens.add({
        targets: card,
        scaleX: 1.3,
        scaleY: 1.3,
        rotation: Math.PI * 0.05,
        duration: config.duration * 0.2,
        ease: 'Power3.easeOut',
        onStart: config.onStart,
        onComplete: () => {
          // フェーズ2: 移動とフリップ
          this.animateCard3DFlip(card, targetPosition, {
            ...config,
            duration: config.duration * 0.6,
            onComplete: () => {
              // フェーズ3: 着地エフェクト
              this.createLandingEffect(targetPosition.x, targetPosition.y)
              
              this.scene.tweens.add({
                targets: card,
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
                duration: config.duration * 0.2,
                ease: 'Bounce.easeOut',
                onComplete: () => {
                  config.onComplete?.()
                  resolve()
                }
              })
            }
          })
        }
      })
    })
  }

  /**
   * カード破棄 - 物理シミュレーション付き
   */
  async discardCard(
    card: Phaser.GameObjects.Container,
    discardPile: { x: number; y: number },
    options: CardAnimationOptions = {}
  ): Promise<void> {
    const config = this.mergeDefaultOptions(options)
    
    return new Promise((resolve) => {
      const startPos = { x: card.x, y: card.y }
      
      if (config.enablePhysics) {
        // 物理シミュレーション付き破棄
        this.animateCardPhysics(card, discardPile, {
          gravity: 800,
          bounce: 0.3,
          friction: 0.95,
          windForce: { x: Math.random() * 100 - 50, y: -50 }
        }, config)
      } else {
        // 標準アニメーション
        this.animateCardDisintegration(card, discardPile, config)
      }

      // パーティクルエフェクト
      if (config.enableParticles) {
        this.createDiscardParticles(startPos.x, startPos.y, {
          type: 'smoke',
          count: 10,
          color: '#666666'
        })
      }

      // 完了コールバック
      setTimeout(() => {
        config.onComplete?.()
        resolve()
      }, config.duration)
    })
  }

  /**
   * ホバー効果 - カードの浮上とグロウ
   */
  hoverCard(card: Phaser.GameObjects.Container, isHovering: boolean): void {
    if (this.performanceConfig.reducedMotion) return

    const targetScale = isHovering ? 1.05 : 1
    const targetY = isHovering ? card.y - 10 : card.y + (isHovering ? 0 : 10)
    
    // 既存のホバーアニメーションを停止
    this.scene.tweens.killTweensOf(card)
    
    // 新しいアニメーション
    this.scene.tweens.add({
      targets: card,
      scaleX: targetScale,
      scaleY: targetScale,
      y: targetY,
      duration: 200,
      ease: 'Power2.easeOut'
    })

    if (isHovering) {
      this.addCardGlow(card)
    } else {
      this.removeCardGlow(card)
    }
  }

  /**
   * ドラッグ開始 - リフトアップ効果
   */
  startDrag(card: Phaser.GameObjects.Container): void {
    this.scene.tweens.add({
      targets: card,
      scaleX: 1.1,
      scaleY: 1.1,
      rotation: Math.PI * 0.02,
      duration: 150,
      ease: 'Back.easeOut(2)'
    })

    this.addCardShadow(card, 'drag')
    
    if (!this.performanceConfig.reducedMotion) {
      this.createDragTrail(card)
    }
  }

  /**
   * ドロップ成功 - 派手な成功エフェクト
   */
  async dropSuccess(
    card: Phaser.GameObjects.Container,
    targetPosition: { x: number; y: number }
  ): Promise<void> {
    return new Promise((resolve) => {
      // 成功パーティクル
      this.createSuccessParticles(targetPosition.x, targetPosition.y)
      
      // カードの成功アニメーション
      this.scene.tweens.add({
        targets: card,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 100,
        ease: 'Power2',
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          this.removeCardShadow(card)
          resolve()
        }
      })

      // 成功のグロウエフェクト
      this.createSuccessGlow(targetPosition.x, targetPosition.y)
    })
  }

  /**
   * ドロップ失敗 - バウンスバック効果
   */
  async dropFailed(
    card: Phaser.GameObjects.Container,
    originalPosition: { x: number; y: number }
  ): Promise<void> {
    return new Promise((resolve) => {
      // エラーパーティクル
      this.createErrorParticles(card.x, card.y)
      
      // エラーシェイクとバウンスバック
      this.scene.tweens.add({
        targets: card,
        x: card.x + 5,
        duration: 50,
        ease: 'Power2',
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          // 元の位置に戻る
          this.animateCardArc(card, 
            { x: card.x, y: card.y }, 
            originalPosition,
            {
              duration: 500,
              easing: 'Bounce.easeOut',
              onComplete: () => {
                this.removeCardShadow(card)
                resolve()
              }
            }
          )
        }
      })
    })
  }

  /**
   * 勝利演出 - カードの華やかな展開
   */
  async victoryAnimation(cards: Phaser.GameObjects.Container[]): Promise<void> {
    return new Promise((resolve) => {
      // 中央の勝利パーティクル
      const centerX = this.scene.scale.width / 2
      const centerY = this.scene.scale.height / 2
      
      this.createVictoryParticles(centerX, centerY)
      
      // カードを扇形に展開
      const promises = cards.map(async (card, index) => {
        return new Promise<void>((cardResolve) => {
          const angle = (index - cards.length / 2) * 20
          const distance = 120
          const targetX = centerX + Math.sin(Phaser.Math.DegToRad(angle)) * distance
          const targetY = centerY - Math.cos(Phaser.Math.DegToRad(angle)) * distance

          this.scene.tweens.add({
            targets: card,
            x: targetX,
            y: targetY,
            rotation: Phaser.Math.DegToRad(angle),
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 1000,
            ease: 'Back.easeOut(1.5)',
            delay: index * 100,
            onComplete: () => { cardResolve(); }
          })
        })
      })

      Promise.all(promises).then(() => {
        setTimeout(resolve, 500) // 少し余韻を持たせる
      })
    })
  }

  // === プライベートメソッド ===

  private mergeDefaultOptions(options: CardAnimationOptions): Required<CardAnimationOptions> {
    return {
      duration: 600,
      easing: 'Power2.easeOut',
      delay: 0,
      intensity: 'normal',
      enableParticles: true,
      enablePhysics: false,
      enableGPUAcceleration: this.performanceConfig.useGPUAcceleration,
      onStart: () => {},
      onComplete: () => {},
      onUpdate: () => {},
      ...options
    }
  }

  private initializePerformanceSettings(): void {
    // モーション削減設定の確認
    this.performanceConfig.reducedMotion = 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // 低性能デバイスの検出
    const isLowEndDevice = navigator.hardwareConcurrency <= 2 || 
                          /Android.*; wv/.test(navigator.userAgent)
    
    if (isLowEndDevice) {
      this.performanceConfig.maxParticles = 50
      this.performanceConfig.maxConcurrentAnimations = 4
    }
  }

  private animateCardArc(
    card: Phaser.GameObjects.Container,
    from: { x: number; y: number },
    to: { x: number; y: number },
    options: CardAnimationOptions
  ): void {
    const controlY = Math.min(from.y, to.y) - 80
    const path = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(from.x, from.y),
      new Phaser.Math.Vector2((from.x + to.x) / 2, controlY),
      new Phaser.Math.Vector2(to.x, to.y)
    )

    this.scene.tweens.add({
      targets: card,
      duration: options.duration,
      ease: options.easing,
      onUpdate: (tween) => {
        const point = path.getPoint(tween.progress)
        card.setPosition(point.x, point.y)
        
        // 移動方向に合わせて軽く回転
        const prevPoint = path.getPoint(Math.max(0, tween.progress - 0.01))
        const angle = Phaser.Math.Angle.Between(prevPoint.x, prevPoint.y, point.x, point.y)
        card.setRotation(angle * 0.1)
        
        options.onUpdate?.(tween.progress)
      },
      onComplete: options.onComplete
    })
  }

  private animateCard3DFlip(
    card: Phaser.GameObjects.Container,
    targetPosition: { x: number; y: number },
    options: CardAnimationOptions
  ): void {
    // 3D回転エフェクトをシミュレート
    this.scene.tweens.add({
      targets: card,
      scaleX: 0.1,
      duration: options.duration * 0.5,
      ease: 'Power2.easeIn',
      onComplete: () => {
        // 中間点で位置移動
        card.setPosition(targetPosition.x, targetPosition.y)
        
        this.scene.tweens.add({
          targets: card,
          scaleX: 1,
          duration: options.duration * 0.5,
          ease: 'Power2.easeOut',
          onComplete: options.onComplete
        })
      }
    })
  }

  private animateCardPhysics(
    card: Phaser.GameObjects.Container,
    target: { x: number; y: number },
    physics: CardPhysicsConfig,
    options: CardAnimationOptions
  ): void {
    let velocityX = (target.x - card.x) / options.duration * 1000 + (physics.windForce?.x || 0)
    let velocityY = (target.y - card.y) / options.duration * 1000 + (physics.windForce?.y || 0)
    
    const animate = () => {
      // 重力適用
      velocityY += (physics.gravity || 800) * 0.016
      
      // 位置更新
      card.x += velocityX * 0.016
      card.y += velocityY * 0.016
      
      // 摩擦適用
      velocityX *= (physics.friction || 0.99)
      velocityY *= (physics.friction || 0.99)
      
      // 回転
      card.rotation += velocityX * 0.0001
      
      // 境界チェック
      if (card.y > this.scene.scale.height + 100) {
        return // アニメーション終了
      }
      
      requestAnimationFrame(animate)
    }
    
    animate()
  }

  private animateCardDisintegration(
    card: Phaser.GameObjects.Container,
    target: { x: number; y: number },
    options: CardAnimationOptions
  ): void {
    // フェード＋分解エフェクト
    this.scene.tweens.add({
      targets: card,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      rotation: Math.random() * Math.PI * 0.2 - Math.PI * 0.1,
      duration: options.duration,
      ease: options.easing,
      onComplete: options.onComplete
    })
  }

  private createDrawParticles(x: number, y: number): void {
    this.createParticleEffect(x, y, {
      type: 'sparkle',
      count: 8,
      color: '#FFD700',
      size: { min: 2, max: 6 },
      spread: 30
    })
  }

  private createPlayParticles(x: number, y: number, config: ParticleConfig): void {
    this.createParticleEffect(x, y, {
      count: 12,
      size: { min: 3, max: 8 },
      spread: 40,
      ...config
    })
  }

  private createDiscardParticles(x: number, y: number, config: ParticleConfig): void {
    this.createParticleEffect(x, y, {
      count: 8,
      size: { min: 2, max: 5 },
      spread: 25,
      ...config
    })
  }

  private createSuccessParticles(x: number, y: number): void {
    this.createParticleEffect(x, y, {
      type: 'stars',
      count: 15,
      color: '#51CF66',
      size: { min: 4, max: 10 },
      spread: 50
    })
  }

  private createErrorParticles(x: number, y: number): void {
    this.createParticleEffect(x, y, {
      type: 'smoke',
      count: 6,
      color: '#FF6B6B',
      size: { min: 3, max: 7 },
      spread: 30
    })
  }

  private createVictoryParticles(x: number, y: number): void {
    // 複数のパーティクルウェーブ
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.createParticleEffect(x, y, {
          type: 'stars',
          count: 20,
          color: '#FFD700',
          size: { min: 5, max: 12 },
          spread: 80
        })
      }, i * 200)
    }
  }

  private createParticleEffect(x: number, y: number, config: ParticleConfig): void {
    if (this.performanceConfig.reducedMotion) return
    
    const particleCount = Math.min(config.count || 10, this.performanceConfig.maxParticles)
    
    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.circle(x, y, 
        Phaser.Math.Between(config.size?.min || 2, config.size?.max || 6),
        Phaser.Display.Color.HexStringToColor(config.color || '#FFFFFF').color
      )
      
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
      const speed = 50 + Math.random() * 100
      const spread = config.spread || 40
      
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * spread,
        y: y + Math.sin(angle) * spread,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: config.lifetime || 800,
        ease: 'Power2.easeOut',
        onComplete: () => { particle.destroy(); }
      })
    }
  }

  private getCardElementColor(card: Phaser.GameObjects.Container): string {
    // カードのタイプに基づいて色を決定
    // 実装は具体的なカードシステムに依存
    return '#4DABF7' // デフォルトは青
  }

  private addCardGlow(card: Phaser.GameObjects.Container): void {
    const existingGlow = card.getByName('cardGlow')
    if (existingGlow) return

    const glow = this.scene.add.circle(0, 0, 80, 0x4DABF7, 0.2)
    glow.name = 'cardGlow'
    card.addAt(glow, 0)
  }

  private removeCardGlow(card: Phaser.GameObjects.Container): void {
    const glow = card.getByName('cardGlow')
    if (glow) glow.destroy()
  }

  private addCardShadow(card: Phaser.GameObjects.Container, type: 'hover' | 'drag' = 'hover'): void {
    const existingShadow = card.getByName('cardShadow')
    if (existingShadow) existingShadow.destroy()

    const intensity = type === 'drag' ? 0.4 : 0.2
    const size = type === 'drag' ? 100 : 80
    
    const shadow = this.scene.add.ellipse(0, 8, size, 20, 0x000000, intensity)
    shadow.name = 'cardShadow'
    card.addAt(shadow, 0)
  }

  private removeCardShadow(card: Phaser.GameObjects.Container): void {
    const shadow = card.getByName('cardShadow')
    if (shadow) shadow.destroy()
  }

  private createDragTrail(card: Phaser.GameObjects.Container): void {
    // ドラッグ時のトレイルエフェクト実装
    // 実装は複雑になるため、現在は省略
  }

  private createLandingEffect(x: number, y: number): void {
    const ripple = this.scene.add.circle(x, y, 20, 0x4DABF7, 0.3)
    
    this.scene.tweens.add({
      targets: ripple,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 400,
      ease: 'Power2.easeOut',
      onComplete: () => { ripple.destroy(); }
    })
  }

  private createSuccessGlow(x: number, y: number): void {
    const glow = this.scene.add.circle(x, y, 40, 0x51CF66, 0.5)
    
    this.scene.tweens.add({
      targets: glow,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 600,
      ease: 'Power2.easeOut',
      onComplete: () => { glow.destroy(); }
    })
  }

  /**
   * リソースのクリーンアップ
   */
  destroy(): void {
    this.particleEmitters.forEach(emitter => { emitter.destroy(); })
    this.particleEmitters.clear()
    this.physicsObjects.clear()
    this.animationQueue = []
  }
}