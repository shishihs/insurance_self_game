import { BaseScene } from './BaseScene'

/**
 * パフォーマンス最適化されたゲームシーン用のmixin
 */
export const GameSceneOptimizationMixin = {
  /**
   * パフォーマンス最適化: 更新処理のスロットリング
   */
  setupPerformanceOptimizations(this: any): void {
    // フレームスキップの設定
    this.frameSkipCounter = 0
    this.frameSkipThreshold = 2 // 2フレームに1回更新
    
    // オブジェクトプーリング
    this.objectPools = {
      effects: [],
      texts: [],
      graphics: []
    }
    
    // レンダリング最適化
    this.cameras.main.setRoundPixels(true)
    
    // バッチ処理の有効化
    this.game.renderer.setMaxTextures(16)
  },

  /**
   * スロットル付きUI更新
   */
  throttledUIUpdate(this: any, deltaTime: number): void {
    // フレームスキップ
    this.frameSkipCounter++
    if (this.frameSkipCounter < this.frameSkipThreshold) {
      return
    }
    this.frameSkipCounter = 0
    
    // ダーティフラグに基づく選択的更新
    if (this.dirtyFlags.vitality && this.updateThrottleTimers.vitality <= 0) {
      this.updateVitalityBar()
      this.updateThrottleTimers.vitality = 100 // 100ms間隔
      this.dirtyFlags.vitality = false
    }
    
    if (this.dirtyFlags.insurance && this.updateThrottleTimers.insurance <= 0) {
      this.updateInsuranceList()
      this.updateThrottleTimers.insurance = 200 // 200ms間隔
      this.dirtyFlags.insurance = false
    }
    
    if (this.dirtyFlags.burden && this.updateThrottleTimers.burden <= 0) {
      this.updateBurdenIndicator()
      this.updateThrottleTimers.burden = 150 // 150ms間隔
      this.dirtyFlags.burden = false
    }
    
    // タイマーを減らす
    Object.keys(this.updateThrottleTimers).forEach(key => {
      if (this.updateThrottleTimers[key] > 0) {
        this.updateThrottleTimers[key] -= deltaTime
      }
    })
  },

  /**
   * オブジェクトプールからの取得
   */
  getFromPool(this: any, type: string): any {
    const pool = this.objectPools[type]
    if (pool && pool.length > 0) {
      return pool.pop()
    }
    return null
  },

  /**
   * オブジェクトプールへの返却
   */
  returnToPool(this: any, type: string, object: any): void {
    const pool = this.objectPools[type]
    if (pool && pool.length < 50) { // プールサイズ制限
      object.setVisible(false)
      object.setActive(false)
      pool.push(object)
    } else {
      object.destroy()
    }
  },

  /**
   * 最適化されたエフェクト生成
   */
  createOptimizedEffect(this: any, x: number, y: number, type: string): void {
    let effect = this.getFromPool('effects')
    
    if (!effect) {
      effect = this.add.graphics()
    } else {
      effect.clear()
      effect.setVisible(true)
      effect.setActive(true)
    }
    
    effect.setPosition(x, y)
    effect.setAlpha(1)
    effect.setScale(1)
    
    // エフェクトの描画（typeに応じて）
    switch (type) {
      case 'success':
        effect.fillStyle(0x4ADE80, 0.6)
        effect.fillCircle(0, 0, 20)
        break
      case 'failure':
        effect.lineStyle(4, 0xEF4444, 0.8)
        effect.beginPath()
        effect.moveTo(-15, -15)
        effect.lineTo(15, 15)
        effect.moveTo(15, -15)
        effect.lineTo(-15, 15)
        effect.strokePath()
        break
    }
    
    // アニメーション（完了後プールに返却）
    this.tweens.add({
      targets: effect,
      alpha: 0,
      scale: type === 'success' ? 3 : 1,
      duration: 500,
      ease: 'Power2.out',
      onComplete: () => {
        this.returnToPool('effects', effect)
      }
    })
  },

  /**
   * バッチ処理による手札の更新
   */
  batchUpdateHandCards(this: any): void {
    // 一度にすべてのカードを更新
    const updates: Array<{card: any, x: number, y: number}> = []
    
    this.handCards.forEach((cardContainer: any, index: number) => {
      const targetX = this.centerX - ((this.handCards.length - 1) * 60) / 2 + index * 60
      const targetY = this.cameras.main.height - 120
      
      updates.push({
        card: cardContainer,
        x: targetX,
        y: targetY
      })
    })
    
    // バッチでTween実行
    if (updates.length > 0) {
      this.tweens.add({
        targets: updates.map(u => u.card),
        duration: 300,
        ease: 'Power2.out',
        onUpdate: (tween: any) => {
          const progress = tween.progress
          updates.forEach((update, i) => {
            const target = tween.targets[i]
            if (target) {
              target.x = Phaser.Math.Linear(target.x, update.x, progress)
              target.y = Phaser.Math.Linear(target.y, update.y, progress)
            }
          })
        }
      })
    }
  },

  /**
   * テクスチャアトラスの使用
   */
  preloadOptimizedAssets(this: any): void {
    // 複数の画像を1つのアトラスにまとめる
    this.load.atlas('game-atlas', 'assets/game-atlas.png', 'assets/game-atlas.json')
  },

  /**
   * カメラカリングの最適化
   */
  setupCameraCulling(this: any): void {
    // カメラの可視範囲外のオブジェクトを自動的に非表示
    this.cameras.main.setBackgroundColor(0x1a1a1a)
    this.cameras.main.useBounds = true
    
    // カリングの有効化
    this.children.list.forEach((child: any) => {
      if (child.setScrollFactor) {
        child.setScrollFactor(1)
      }
    })
  },

  /**
   * メモリ最適化: 未使用リソースの解放
   */
  cleanupUnusedResources(this: any): void {
    // 使用されていないテクスチャの解放
    const textureKeys = this.textures.getTextureKeys()
    const usedTextures = new Set<string>()
    
    // 使用中のテクスチャを収集
    this.children.list.forEach((child: any) => {
      if (child.texture?.key) {
        usedTextures.add(child.texture.key)
      }
    })
    
    // 未使用のテクスチャを削除
    textureKeys.forEach(key => {
      if (!usedTextures.has(key) && !['__DEFAULT', '__MISSING', '__WHITE'].includes(key)) {
        try {
          this.textures.remove(key)
        } catch (e) {
          // エラーは無視
        }
      }
    })
  },

  /**
   * 描画呼び出しの最小化
   */
  minimizeDrawCalls(this: any): void {
    // 同じテクスチャを使用するオブジェクトをグループ化
    const textureGroups = new Map<string, any[]>()
    
    this.children.list.forEach((child: any) => {
      if (child.texture?.key) {
        const key = child.texture.key
        if (!textureGroups.has(key)) {
          textureGroups.set(key, [])
        }
        textureGroups.get(key)!.push(child)
      }
    })
    
    // グループごとに深度を調整してバッチ処理を促進
    let depth = 0
    textureGroups.forEach((group) => {
      group.forEach(child => {
        child.setDepth(depth)
      })
      depth++
    })
  }
}