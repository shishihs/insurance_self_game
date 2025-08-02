import { BaseScene } from './BaseScene'

/**
 * アセットをロードするシーン
 */
export class PreloadScene extends BaseScene {
  constructor(config?: any) {
    super(config)
  }

  create(): void {
    // ベースクラスのcreateを呼び出し
    super.create()
    
    // preloadが完了したら自動的にメインメニューへ遷移
    this.time.delayedCall(500, () => {
      try {
        console.log('[PreloadScene] Starting MainMenuScene...')
        this.scene.start('MainMenuScene')
      } catch (error) {
        console.error('[PreloadScene] Failed to start MainMenuScene:', error)
        // フォールバック: 直接GameSceneへ
        try {
          this.scene.start('GameScene')
        } catch (fallbackError) {
          console.error('[PreloadScene] Failed to start any scene:', fallbackError)
        }
      }
    })
  }

  preload(): void {
    // パフォーマンス計測開始
    performance.mark('preload-start')
    
    // ローディングバーの作成
    const progressBar = this.add.graphics()
    const progressBox = this.add.graphics()
    progressBox.fillStyle(0x222222, 0.8)
    progressBox.fillRect(240, 270, 320, 50)

    const loadingText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      'Loading...',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#ffffff'
      }
    ).setOrigin(0.5)

    const percentText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 5,
      '0%',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#ffffff'
      }
    ).setOrigin(0.5)

    // ローディング進捗の更新
    this.load.on('progress', (value: number) => {
      // フレームをスキップして軽量化
      if (value % 0.1 < 0.01) { // 10%ごとに更新
        percentText.setText(`${Math.round(value * 100)}%`)
        progressBar.clear()
        progressBar.fillStyle(0xffffff, 1)
        progressBar.fillRect(250, 280, 300 * value, 30)
      }
    })

    // ローディング完了
    this.load.on('complete', () => {
      progressBar.destroy()
      progressBox.destroy()
      loadingText.destroy()
      percentText.destroy()
      
      // パフォーマンス計測終了
      performance.mark('preload-end')
      performance.measure('asset-loading', 'preload-start', 'preload-end')
      
      const measure = performance.getEntriesByName('asset-loading')[0]
      console.log(`✅ Asset loading completed in ${measure.duration.toFixed(2)}ms`)
    })

    // アセットのロードを非同期化
    this.loadAssetsInChunks()
  }
  
  /**
   * アセットをチャンク単位で非同期ロード
   */
  private async loadAssetsInChunks(): Promise<void> {
    try {
      // フレーム1: 重要なアセット
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          this.createCardBack()
          resolve()
        })
      })
      
      // フレーム2: 基本UIアセット
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          this.createBasicUIAssets()
          resolve()
        })
      })
      
      // フレーム3: カード表面
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          this.createCardFaces()
          resolve()
        })
      })
      
      // フレーム4: 追加UIアセット
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          this.createAdditionalUIAssets()
          resolve()
        })
      })
      
    } catch (error) {
      console.error('[PreloadScene] Error loading assets:', error)
    }
  }
  
  /**
   * アセットを非同期でロード
   */
  private async loadAssetsAsync(): Promise<void> {
    // 優先度の高いアセットを先に読み込む
    await this.loadCriticalAssets()
    
    // その他のアセットを遅延読み込み
    this.time.delayedCall(100, () => {
      this.loadSecondaryAssets()
    })
  }
  
  /**
   * 重要なアセットをロード
   */
  private async loadCriticalAssets(): Promise<void> {
    // カード裏面（必須）
    this.createCardBack()
    
    // 基本的なUIアセット
    this.createBasicUIAssets()
  }
  
  /**
   * 二次的なアセットをロード
   */
  private loadSecondaryAssets(): void {
    // カード表面
    this.createCardFaces()
    
    // 追加のUI要素
    this.createAdditionalUIAssets()
  }

  /**
   * アセットをロード
   */
  private loadAssets(): void {
    // カード裏面
    this.createCardBack()
    
    // カード表面（仮の画像を生成）
    this.createCardFaces()
    
    // UI要素
    this.createUIAssets()
  }

  /**
   * カード裏面を動的に生成
   */
  private createCardBack(): void {
    const graphics = this.add.graphics()
    
    // カード背景
    graphics.fillStyle(0x2C3E50, 1)
    graphics.fillRoundedRect(0, 0, 120, 180, 8)
    
    // パターンを簡素化（パフォーマンス向上）
    graphics.lineStyle(2, 0x34495E)
    // 中央に大きな円を一つ描画
    graphics.strokeCircle(60, 90, 40)
    // 四隅に小さな円
    graphics.strokeCircle(20, 20, 10)
    graphics.strokeCircle(100, 20, 10)
    graphics.strokeCircle(20, 160, 10)
    graphics.strokeCircle(100, 160, 10)
    
    // テクスチャとして保存
    graphics.generateTexture('card-back', 120, 180)
    graphics.destroy()
  }

  /**
   * カード表面を動的に生成
   */
  private createCardFaces(): void {
    // バッチ処理で生成
    const cardTypes = [
      { key: 'life-card-template', color: 0x4C6EF5 },
      { key: 'insurance-card-template', color: 0x51CF66 },
      { key: 'pitfall-card-template', color: 0xFF6B6B }
    ]
    
    cardTypes.forEach(({ key, color }) => {
      this.createCardFace(key, color)
    })
  }

  /**
   * カードテンプレートを作成
   */
  private createCardFace(key: string, color: number): void {
    const graphics = this.add.graphics()
    
    // カード背景
    graphics.fillStyle(color, 1)
    graphics.fillRoundedRect(0, 0, 120, 180, 8)
    
    // 白い内側の枠
    graphics.fillStyle(0xFFFFFF, 1)
    graphics.fillRoundedRect(5, 5, 110, 170, 6)
    
    // 上部のカラーバー
    graphics.fillStyle(color, 1)
    graphics.fillRect(5, 5, 110, 30)
    
    // テクスチャとして保存
    graphics.generateTexture(key, 120, 180)
    graphics.destroy()
  }

  /**
   * 基本的なUI要素を作成
   */
  private createBasicUIAssets(): void {
    // ボタン背景（必須）
    const buttonGraphics = this.add.graphics()
    buttonGraphics.fillStyle(0x4C6EF5, 1)
    buttonGraphics.fillRoundedRect(0, 0, 200, 50, 25)
    buttonGraphics.generateTexture('button-bg', 200, 50)
    buttonGraphics.destroy()
  }
  
  /**
   * 追加のUI要素を作成
   */
  private createAdditionalUIAssets(): void {
    // ハイライト
    const highlightGraphics = this.add.graphics()
    highlightGraphics.lineStyle(4, 0xFFD43B, 1)
    highlightGraphics.strokeRoundedRect(0, 0, 130, 190, 8)
    highlightGraphics.generateTexture('card-highlight', 130, 190)
    highlightGraphics.destroy()
  }

  protected initialize(): void {
    // プリロード完了後、メインメニューへ遷移
    this.scene.start('MainMenuScene')
  }
}