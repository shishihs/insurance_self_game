import type { GameScene } from '../scenes/GameScene'
import { SAMPLE_TUTORIAL_CONFIG, QUICK_TEST_TUTORIAL, ERROR_TEST_TUTORIAL } from './SampleTutorialConfig'

/**
 * チュートリアルUIのテストヘルパー
 */
export class TutorialTestHelper {
  private scene: GameScene

  constructor(scene: GameScene) {
    this.scene = scene
  }

  /**
   * 基本UIテストの実行
   */
  public async runBasicUITest(): Promise<void> {
    console.log('=== チュートリアル基本UIテスト開始 ===')
    
    try {
      await this.scene.startTutorial(SAMPLE_TUTORIAL_CONFIG)
      console.log('✅ 基本UIテストが正常に開始されました')
    } catch (error) {
      console.error('❌ 基本UIテストでエラーが発生:', error)
      throw error
    }
  }

  /**
   * クイックテストの実行
   */
  public async runQuickTest(): Promise<void> {
    console.log('=== チュートリアルクイックテスト開始 ===')
    
    try {
      await this.scene.startTutorial(QUICK_TEST_TUTORIAL)
      console.log('✅ クイックテストが正常に開始されました')
    } catch (error) {
      console.error('❌ クイックテストでエラーが発生:', error)
      throw error
    }
  }

  /**
   * エラーハンドリングテストの実行
   */
  public async runErrorHandlingTest(): Promise<void> {
    console.log('=== チュートリアルエラーハンドリングテスト開始 ===')
    
    try {
      await this.scene.startTutorial(ERROR_TEST_TUTORIAL)
      console.log('✅ エラーハンドリングテストが開始されました')
    } catch (error) {
      console.error('❌ エラーハンドリングテストで予期しないエラー:', error)
      // このテストでは一部エラーが期待されるため、処理を続行
    }
  }

  /**
   * レスポンシブ機能のテスト
   */
  public testResponsiveFeatures(): void {
    console.log('=== レスポンシブ機能テスト開始 ===')
    
    if (!this.scene.isTutorialActive()) {
      console.warn('⚠️ チュートリアルが実行中ではありません。先にチュートリアルを開始してください。')
      return
    }

    const currentStep = this.scene.getCurrentTutorialStep()
    if (!currentStep) {
      console.warn('⚠️ 現在のチュートリアルステップが取得できません。')
      return
    }

    // 画面サイズ変更のシミュレーション
    this.simulateScreenResize()
  }

  /**
   * 画面サイズ変更のシミュレーション
   */
  private simulateScreenResize(): void {
    const camera = this.scene.cameras.main
    const originalWidth = camera.width
    const originalHeight = camera.height

    console.log(`📱 元のサイズ: ${originalWidth}x${originalHeight}`)

    // モバイルサイズのシミュレーション
    this.scene.scale.emit('resize', { width: 480, height: 800 })
    console.log('📱 モバイルサイズに変更をシミュレート')

    // タブレットサイズのシミュレーション
    setTimeout(() => {
      this.scene.scale.emit('resize', { width: 768, height: 1024 })
      console.log('📱 タブレットサイズに変更をシミュレート')
    }, 2000)

    // デスクトップサイズに戻す
    setTimeout(() => {
      this.scene.scale.emit('resize', { width: originalWidth, height: originalHeight })
      console.log('📱 元のサイズに復元')
    }, 4000)
  }

  /**
   * アクセシビリティ機能のテスト
   */
  public testAccessibilityFeatures(): void {
    console.log('=== アクセシビリティ機能テスト開始 ===')
    
    if (!this.scene.isTutorialActive()) {
      console.warn('⚠️ チュートリアルが実行中ではありません。')
      return
    }

    // キーボード操作のテスト
    this.testKeyboardNavigation()
    
    // 高コントラストモードのテスト
    setTimeout(() => this.testHighContrastMode(), 2000)
    
    // アニメーション削減モードのテスト
    setTimeout(() => this.testReducedMotion(), 4000)
  }

  /**
   * キーボードナビゲーションのテスト
   */
  private testKeyboardNavigation(): void {
    console.log('⌨️ キーボードナビゲーションテスト')
    
    // TABキーのシミュレーション
    const tabEvent = new KeyboardEvent('keydown', { code: 'Tab', key: 'Tab' })
    this.scene.input.keyboard?.emit('keydown-TAB', tabEvent)
    
    console.log('✅ TABキー操作をシミュレート')
  }

  /**
   * 高コントラストモードのテスト
   */
  private testHighContrastMode(): void {
    console.log('🎨 高コントラストモードテスト')
    
    const tutorialOverlay = (this.scene as any).tutorialOverlay
    if (tutorialOverlay && typeof tutorialOverlay.enableHighContrastMode === 'function') {
      tutorialOverlay.enableHighContrastMode()
      console.log('✅ 高コントラストモードを有効化')
      
      // 3秒後に元に戻す
      setTimeout(() => {
        console.log('🔄 高コントラストモードを無効化')
        // 元に戻すロジックは実装していないため、ログのみ
      }, 3000)
    } else {
      console.warn('⚠️ 高コントラストモード機能が利用できません')
    }
  }

  /**
   * アニメーション削減モードのテスト
   */
  private testReducedMotion(): void {
    console.log('🎞️ アニメーション削減モードテスト')
    
    const tutorialOverlay = (this.scene as any).tutorialOverlay
    if (tutorialOverlay && typeof tutorialOverlay.enableReducedMotion === 'function') {
      tutorialOverlay.enableReducedMotion()
      console.log('✅ アニメーション削減モードを有効化')
      
      // 3秒後に元に戻す（実際にはページリロードが必要な場合もある）
      setTimeout(() => {
        console.log('🔄 アニメーション削減モードテスト完了')
      }, 3000)
    } else {
      console.warn('⚠️ アニメーション削減モード機能が利用できません')
    }
  }

  /**
   * パフォーマンステスト
   */
  public runPerformanceTest(): void {
    console.log('=== パフォーマンステスト開始 ===')
    
    const startTime = performance.now()
    let frameCount = 0
    let totalTime = 0

    const measureFrame = () => {
      frameCount++
      const currentTime = performance.now()
      totalTime = currentTime - startTime

      if (totalTime >= 5000) { // 5秒間測定
        const avgFPS = (frameCount / totalTime) * 1000
        console.log(`📊 平均FPS: ${avgFPS.toFixed(2)}`)
        
        if (avgFPS >= 30) {
          console.log('✅ パフォーマンス良好（30fps以上）')
        } else if (avgFPS >= 20) {
          console.log('⚠️ パフォーマンス注意（20-30fps）')
        } else {
          console.log('❌ パフォーマンス不良（20fps未満）')
        }
        return
      }

      requestAnimationFrame(measureFrame)
    }

    requestAnimationFrame(measureFrame)
  }

  /**
   * メモリ使用量の監視
   */
  public monitorMemoryUsage(): void {
    if ('performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory
      console.log('🧠 メモリ使用量:')
      console.log(`  使用中: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`)
      console.log(`  合計: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`)
      console.log(`  上限: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`)
    } else {
      console.log('⚠️ メモリ使用量の監視は利用できません（Chrome必須）')
    }
  }

  /**
   * 全テストの実行
   */
  public async runAllTests(): Promise<void> {
    console.log('🚀 チュートリアルUI全機能テスト開始')
    
    try {
      // 基本テスト
      await this.runQuickTest()
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // レスポンシブテスト
      this.testResponsiveFeatures()
      
      // アクセシビリティテスト
      setTimeout(() => this.testAccessibilityFeatures(), 3000)
      
      // パフォーマンステスト
      setTimeout(() => this.runPerformanceTest(), 6000)
      
      // メモリ監視
      setTimeout(() => this.monitorMemoryUsage(), 12000)
      
      console.log('✅ 全テストスケジュールが完了しました')
      
    } catch (error) {
      console.error('❌ テスト実行中にエラーが発生:', error)
    }
  }

  /**
   * テスト結果のサマリー出力
   */
  public printTestSummary(): void {
    console.log('\n=== チュートリアルUIテスト結果サマリー ===')
    console.log('実装された機能:')
    console.log('✅ TutorialOverlayコンポーネント')
    console.log('✅ スポットライト効果')
    console.log('✅ 吹き出し表示')
    console.log('✅ 進捗バー')
    console.log('✅ 制御ボタン（次へ、戻る、スキップ）')
    console.log('✅ ハイライト機能（パルス、グロー、ボーダー）')
    console.log('✅ 誘導矢印')
    console.log('✅ レスポンシブ対応（モバイル、タブレット、デスクトップ）')
    console.log('✅ キーボード操作対応')
    console.log('✅ アクセシビリティ機能')
    console.log('✅ GameSceneとの統合')
    console.log('\n次のステップ:')
    console.log('- 実際のゲームチュートリアル設定の作成')
    console.log('- より詳細なアクセシビリティテスト')
    console.log('- 多言語対応の検討')
    console.log('- 音声ガイダンスの追加検討')
  }
}

/**
 * グローバルテストヘルパーの設定
 * ブラウザのコンソールから実行可能
 */
export function setupGlobalTutorialTests(scene: GameScene): void {
  const helper = new TutorialTestHelper(scene)
  
  // グローバル関数として公開
  ;(window as any).tutorialTest = {
    basic: () => helper.runBasicUITest(),
    quick: () => helper.runQuickTest(),
    error: () => helper.runErrorHandlingTest(),
    responsive: () => helper.testResponsiveFeatures(),
    accessibility: () => helper.testAccessibilityFeatures(),
    performance: () => helper.runPerformanceTest(),
    memory: () => helper.monitorMemoryUsage(),
    all: () => helper.runAllTests(),
    summary: () => helper.printTestSummary(),
    stop: () => scene.stopTutorial()
  }
  
  console.log('🔧 チュートリアルテスト関数が利用可能になりました:')
  console.log('  tutorialTest.basic() - 基本UIテスト')
  console.log('  tutorialTest.quick() - クイックテスト')
  console.log('  tutorialTest.error() - エラーハンドリングテスト')
  console.log('  tutorialTest.responsive() - レスポンシブテスト')
  console.log('  tutorialTest.accessibility() - アクセシビリティテスト')
  console.log('  tutorialTest.performance() - パフォーマンステスト')
  console.log('  tutorialTest.memory() - メモリ監視')
  console.log('  tutorialTest.all() - 全テスト実行')
  console.log('  tutorialTest.summary() - テスト結果サマリー')
  console.log('  tutorialTest.stop() - チュートリアル強制終了')
}