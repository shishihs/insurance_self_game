/**
 * カード専用アニメーションシステム
 * プレイヤー体験を向上させる洗練されたアニメーション効果
 */

export interface CardAnimationConfig {
  duration: number
  ease: string
  delay?: number
  onComplete?: () => void
  onUpdate?: (progress: number) => void
}

export interface CardFlipConfig extends CardAnimationConfig {
  showBack: boolean
  flipAxis: 'x' | 'y'
}

export interface CardMoveConfig extends CardAnimationConfig {
  from: { x: number; y: number }
  to: { x: number; y: number }
  curve?: 'linear' | 'bounce' | 'elastic' | 'bezier'
  height?: number // ジャンプアニメーション用
}

export interface CardScaleConfig extends CardAnimationConfig {
  from: number
  to: number
  overshoot?: boolean // リバウンド効果
}

export class CardAnimations {
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * カードフリップアニメーション（3D効果付き）
   */
  async flipCard(card: Phaser.GameObjects.Container, config: CardFlipConfig): Promise<void> {
    return new Promise((resolve) => {
      const { duration, ease, showBack, flipAxis } = config
      
      // フリップの第1段階: カードを半分まで回転
      this.scene.tweens.add({
        targets: card,
        scaleX: flipAxis === 'y' ? 0 : card.scaleX,
        scaleY: flipAxis === 'x' ? 0 : card.scaleY,
        duration: duration / 2,
        ease,
        onComplete: () => {
          // 中間点でカード面を切り替え
          this.switchCardFace(card, showBack)
          
          // フリップの第2段階: カードを元のサイズに戻す
          this.scene.tweens.add({
            targets: card,
            scaleX: card.scaleX ?? 1,
            scaleY: card.scaleY ?? 1,
            duration: duration / 2,
            ease,
            onComplete: () => {
              config.onComplete?.()
              resolve()
            }
          })
        }
      })
    })
  }

  /**
   * カード移動アニメーション（カーブ軌道付き）
   */
  async moveCard(card: Phaser.GameObjects.Container, config: CardMoveConfig): Promise<void> {
    return new Promise((resolve) => {
      const { from, to, duration, ease, curve, height = 50 } = config

      // 直線移動
      if (curve === 'linear') {
        this.scene.tweens.add({
          targets: card,
          x: to.x,
          y: to.y,
          duration,
          ease,
          onComplete: () => {
            config.onComplete?.()
            resolve()
          }
        })
        return
      }

      // カーブ移動（ベジェ曲線）
      const path = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(from.x, from.y),
        new Phaser.Math.Vector2((from.x + to.x) / 2, from.y - height),
        new Phaser.Math.Vector2(to.x, to.y)
      )

      this.scene.tweens.add({
        targets: card,
        duration,
        ease,
        onUpdate: (tween: Phaser.Tweens.Tween) => {
          const point = path.getPoint(tween.progress)
          card.setPosition(point.x, point.y)
          config.onUpdate?.(tween.progress)
        },
        onComplete: () => {
          config.onComplete?.()
          resolve()
        }
      })
    })
  }

  /**
   * カードスケールアニメーション（オーバーシュート効果付き）
   */
  async scaleCard(card: Phaser.GameObjects.Container, config: CardScaleConfig): Promise<void> {
    return new Promise((resolve) => {
      const { from, to, duration, ease, overshoot } = config

      if (overshoot === true) {
        // オーバーシュート効果: 目標値を超えてから戻る
        const overshootScale = to * 1.15
        
        this.scene.tweens.add({
          targets: card,
          scaleX: overshootScale,
          scaleY: overshootScale,
          duration: duration * 0.7,
          ease: 'Power2',
          onComplete: () => {
            this.scene.tweens.add({
              targets: card,
              scaleX: to,
              scaleY: to,
              duration: duration * 0.3,
              ease: 'Back.easeOut',
              onComplete: () => {
                config.onComplete?.()
                resolve()
              }
            })
          }
        })
      } else {
        this.scene.tweens.add({
          targets: card,
          scaleX: to,
          scaleY: to,
          duration,
          ease,
          onComplete: () => {
            config.onComplete?.()
            resolve()
          }
        })
      }
    })
  }

  /**
   * カードドロー演出（デッキから手札へ）
   */
  async drawCardAnimation(card: Phaser.GameObjects.Container, deckPosition: { x: number; y: number }, handPosition: { x: number; y: number }): Promise<void> {
    return new Promise(async (resolve) => {
      // 1. カードをデッキ位置に配置
      card.setPosition(deckPosition.x, deckPosition.y)
      card.setScale(0.8)
      card.setAlpha(1)
      
      // 2. フリップしながら移動
      await this.flipCard(card, {
        duration: 200,
        ease: 'Power2',
        showBack: false,
        flipAxis: 'y'
      })

      // 3. 手札位置へ弧を描いて移動
      await this.moveCard(card, {
        from: deckPosition,
        to: handPosition,
        duration: 400,
        ease: 'Power2',
        curve: 'bezier',
        height: 80
      })

      // 4. 最終スケール調整
      await this.scaleCard(card, {
        from: 0.8,
        to: 1,
        duration: 200,
        ease: 'Back.easeOut',
        overshoot: true
      })

      resolve()
    })
  }

  /**
   * ドラッグ開始時のリフトアップ効果
   */
  liftCard(card: Phaser.GameObjects.Container): void {
    // 影とグロウ効果を追加
    this.addDropShadow(card)
    
    this.scene.tweens.add({
      targets: card,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 150,
      ease: 'Power2'
    })
  }

  /**
   * ドロップ成功時のパルス効果
   */
  async dropSuccessEffect(card: Phaser.GameObjects.Container): Promise<void> {
    return new Promise((resolve) => {
      // グリーンのグロウエフェクト
      const glowEffect = this.scene.add.circle(card.x, card.y, 80, 0x51CF66, 0.3)
      
      this.scene.tweens.add({
        targets: glowEffect,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          glowEffect.destroy()
        }
      })

      // カードのパルス効果
      this.scene.tweens.add({
        targets: card,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 100,
        ease: 'Power2',
        yoyo: true,
        onComplete: () => { resolve(); }
      })
    })
  }

  /**
   * ドロップ失敗時のバウンス効果
   */
  async dropFailEffect(card: Phaser.GameObjects.Container, originalPosition: { x: number; y: number }): Promise<void> {
    return new Promise((resolve) => {
      // 赤いエラーエフェクト
      const errorEffect = this.scene.add.circle(card.x, card.y, 60, 0xFF6B6B, 0.4)
      
      this.scene.tweens.add({
        targets: errorEffect,
        scaleX: 1.3,
        scaleY: 1.3,
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => {
          errorEffect.destroy()
        }
      })

      // カードを元の位置にバウンスして戻す
      this.moveCard(card, {
        from: { x: card.x, y: card.y },
        to: originalPosition,
        duration: 500,
        ease: 'Bounce.easeOut',
        curve: 'bezier',
        height: 30
      }).then(() => { resolve(); })
    })
  }

  /**
   * 勝利時のカード展開アニメーション
   */
  async victoryCardSpread(cards: Phaser.GameObjects.Container[]): Promise<void> {
    return new Promise((resolve) => {
      const promises = cards.map(async (card, index) => {
        return new Promise<void>((cardResolve) => {
          // 各カードを扇形に配置
          const angle = (index - cards.length / 2) * 15
          const distance = 50
          const targetX = card.x + Math.sin(Phaser.Math.DegToRad(angle)) * distance
          const targetY = card.y - Math.cos(Phaser.Math.DegToRad(angle)) * distance

          this.scene.tweens.add({
            targets: card,
            x: targetX,
            y: targetY,
            rotation: Phaser.Math.DegToRad(angle),
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 800,
            ease: 'Back.easeOut',
            delay: index * 100,
            onComplete: () => { cardResolve(); }
          })
        })
      })

      Promise.all(promises).then(() => { resolve(); })
    })
  }

  /**
   * カード面の切り替え（フリップ中に使用）
   */
  private switchCardFace(card: Phaser.GameObjects.Container, showBack: boolean): void {
    // カード面の表示/非表示を切り替える
    const cardBack = card.getByName('cardBack')
    const cardFront = card.getByName('cardFront')
    
    if (cardBack !== null && cardBack !== undefined && cardFront !== null && cardFront !== undefined) {
      cardBack.setVisible(showBack)
      cardFront.setVisible(!showBack)
    }
  }

  /**
   * ドロップシャドウエフェクトを追加
   */
  private addDropShadow(card: Phaser.GameObjects.Container): void {
    // 既存のシャドウを削除
    const existingShadow = card.getByName('dropShadow')
    if (existingShadow !== null && existingShadow !== undefined) existingShadow.destroy()

    // 新しいシャドウを作成
    const shadow = this.scene.add.ellipse(0, 5, 140, 30, 0x000000, 0.3)
    shadow.name = 'dropShadow'
    card.addAt(shadow, 0) // 最背面に配置
  }

  /**
   * 全てのアニメーションを停止
   */
  stopAllAnimations(card: Phaser.GameObjects.Container): void {
    this.scene.tweens.killTweensOf(card)
  }

  /**
   * パフォーマンス最適化のためのアニメーション設定
   */
  setPerformanceMode(enabled: boolean): void {
    if (enabled) {
      // 低性能デバイス向け設定
      Phaser.Tweens.Tween.prototype.ease = 'Linear'
    } else {
      // 通常設定に戻す
      Phaser.Tweens.Tween.prototype.ease = 'Power2'
    }
  }
}