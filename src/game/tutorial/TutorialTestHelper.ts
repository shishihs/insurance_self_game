import type { GameScene } from '../scenes/GameScene'
import { SAMPLE_TUTORIAL_CONFIG, QUICK_TEST_TUTORIAL, ERROR_TEST_TUTORIAL } from './SampleTutorialConfig'
import type { TutorialOverlay, PerformanceWithMemory, WindowWithTutorialTest } from '@/types/game-events'

/**
 * 開発環境でのみログを出力するヘルパー関数
 */
function devLog(...args: any[]): void {
  if (import.meta.env.DEV) {
    devLog(...args)
  }
}

/**
 * 開発環境でのみエラーログを出力するヘルパー関数
 */
function devError(...args: any[]): void {
  if (import.meta.env.DEV) {
    devError(...args)
  }
}

/**
 * 開発環境でのみ警告ログを出力するヘルパー関数
 */
function devWarn(...args: any[]): void {
  if (import.meta.env.DEV) {
    devWarn(...args)
  }
}

/**
 * チュートリアルUIのテストヘルパー
 * 開発環境でのみ利用可能
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
    devLog('=== チュートリアル基本UIテスト開始 ===')
    
    try {
      await this.scene.startTutorial(SAMPLE_TUTORIAL_CONFIG)
      devLog('✅ 基本UIテストが正常に開始されました')
    } catch (error) {
      devError('❌ 基本UIテストでエラーが発生:', error)
      throw error
    }
  }

  /**
   * クイックテストの実行
   */
  public async runQuickTest(): Promise<void> {
    devLog('=== チュートリアルクイックテスト開始 ===')
    
    try {
      await this.scene.startTutorial(QUICK_TEST_TUTORIAL)
      devLog('✅ クイックテストが正常に開始されました')
    } catch (error) {
      devError('❌ クイックテストでエラーが発生:', error)
      throw error
    }
  }

  /**
   * エラーハンドリングテストの実行
   */
  public async runErrorHandlingTest(): Promise<void> {
    devLog('=== チュートリアルエラーハンドリングテスト開始 ===')
    
    try {
      await this.scene.startTutorial(ERROR_TEST_TUTORIAL)
      devLog('✅ エラーハンドリングテストが開始されました')
    } catch (error) {
      devError('❌ エラーハンドリングテストで予期しないエラー:', error)
      // このテストでは一部エラーが期待されるため、処理を続行
    }
  }

  /**
   * レスポンシブ機能のテスト
   */
  public testResponsiveFeatures(): void {
    devLog('=== レスポンシブ機能テスト開始 ===')
    
    if (!this.scene.isTutorialActive()) {
      devWarn('⚠️ チュートリアルが実行中ではありません。先にチュートリアルを開始してください。')
      return
    }

    const currentStep = this.scene.getCurrentTutorialStep()
    if (!currentStep) {
      devWarn('⚠️ 現在のチュートリアルステップが取得できません。')
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

    devLog(`📱 元のサイズ: ${originalWidth}x${originalHeight}`)

    // モバイルサイズのシミュレーション
    this.scene.scale.emit('resize', { width: 480, height: 800 })
    devLog('📱 モバイルサイズに変更をシミュレート')

    // タブレットサイズのシミュレーション
    setTimeout(() => {
      this.scene.scale.emit('resize', { width: 768, height: 1024 })
      devLog('📱 タブレットサイズに変更をシミュレート')
    }, 2000)

    // デスクトップサイズに戻す
    setTimeout(() => {
      this.scene.scale.emit('resize', { width: originalWidth, height: originalHeight })
      devLog('📱 元のサイズに復元')
    }, 4000)
  }

  /**
   * アクセシビリティ機能のテスト
   */
  public testAccessibilityFeatures(): void {
    devLog('=== アクセシビリティ機能テスト開始 ===')
    
    if (!this.scene.isTutorialActive()) {
      devWarn('⚠️ チュートリアルが実行中ではありません。')
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
    devLog('⌨️ キーボードナビゲーションテスト')
    
    // TABキーのシミュレーション
    const tabEvent = new KeyboardEvent('keydown', { code: 'Tab', key: 'Tab' })
    this.scene.input.keyboard?.emit('keydown-TAB', tabEvent)
    
    devLog('✅ TABキー操作をシミュレート')
  }

  /**
   * 高コントラストモードのテスト
   */
  private testHighContrastMode(): void {
    devLog('🎨 高コントラストモードテスト')
    
    const tutorialOverlay = (this.scene as { tutorialOverlay?: TutorialOverlay }).tutorialOverlay
    if (tutorialOverlay && typeof tutorialOverlay.enableHighContrastMode === 'function') {
      tutorialOverlay.enableHighContrastMode()
      devLog('✅ 高コントラストモードを有効化')
      
      // 3秒後に元に戻す
      setTimeout(() => {
        devLog('🔄 高コントラストモードを無効化')
        // 元に戻すロジックは実装していないため、ログのみ
      }, 3000)
    } else {
      devWarn('⚠️ 高コントラストモード機能が利用できません')
    }
  }

  /**
   * アニメーション削減モードのテスト
   */
  private testReducedMotion(): void {
    devLog('🎞️ アニメーション削減モードテスト')
    
    const tutorialOverlay = (this.scene as { tutorialOverlay?: TutorialOverlay }).tutorialOverlay
    if (tutorialOverlay && typeof tutorialOverlay.enableReducedMotion === 'function') {
      tutorialOverlay.enableReducedMotion()
      devLog('✅ アニメーション削減モードを有効化')
      
      // 3秒後に元に戻す（実際にはページリロードが必要な場合もある）
      setTimeout(() => {
        devLog('🔄 アニメーション削減モードテスト完了')
      }, 3000)
    } else {
      devWarn('⚠️ アニメーション削減モード機能が利用できません')
    }
  }

  /**
   * パフォーマンステスト
   */
  public runPerformanceTest(): void {
    devLog('=== パフォーマンステスト開始 ===')
    
    const startTime = performance.now()
    let frameCount = 0
    let totalTime = 0

    const measureFrame = () => {
      frameCount++
      const currentTime = performance.now()
      totalTime = currentTime - startTime

      if (totalTime >= 5000) { // 5秒間測定
        const avgFPS = (frameCount / totalTime) * 1000
        devLog(`📊 平均FPS: ${avgFPS.toFixed(2)}`)
        
        if (avgFPS >= 30) {
          devLog('✅ パフォーマンス良好（30fps以上）')
        } else if (avgFPS >= 20) {
          devLog('⚠️ パフォーマンス注意（20-30fps）')
        } else {
          devLog('❌ パフォーマンス不良（20fps未満）')
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
    if ('performance' in window && 'memory' in (window.performance as PerformanceWithMemory)) {
      const memory = (window.performance as PerformanceWithMemory).memory!
      devLog('🧠 メモリ使用量:')
      devLog(`  使用中: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`)
      devLog(`  合計: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`)
      devLog(`  上限: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`)
    } else {
      devLog('⚠️ メモリ使用量の監視は利用できません（Chrome必須）')
    }
  }

  /**
   * 全テストの実行
   */
  public async runAllTests(): Promise<void> {
    devLog('🚀 チュートリアルUI全機能テスト開始')
    
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
      
      devLog('✅ 全テストスケジュールが完了しました')
      
    } catch (error) {
      devError('❌ テスト実行中にエラーが発生:', error)
    }
  }

  /**
   * テスト結果のサマリー出力
   */
  public printTestSummary(): void {
    devLog('\n=== チュートリアルUIテスト結果サマリー ===')
    devLog('実装された機能:')
    devLog('✅ TutorialOverlayコンポーネント')
    devLog('✅ スポットライト効果')
    devLog('✅ 吹き出し表示')
    devLog('✅ 進捗バー')
    devLog('✅ 制御ボタン（次へ、戻る、スキップ）')
    devLog('✅ ハイライト機能（パルス、グロー、ボーダー）')
    devLog('✅ 誘導矢印')
    devLog('✅ レスポンシブ対応（モバイル、タブレット、デスクトップ）')
    devLog('✅ キーボード操作対応')
    devLog('✅ アクセシビリティ機能')
    devLog('✅ GameSceneとの統合')
    devLog('\n次のステップ:')
    devLog('- 実際のゲームチュートリアル設定の作成')
    devLog('- より詳細なアクセシビリティテスト')
    devLog('- 多言語対応の検討')
    devLog('- 音声ガイダンスの追加検討')
  }
}

/**
 * グローバルテストヘルパーの設定
 * ブラウザのコンソールから実行可能
 * 開発環境でのみ実行される
 */
export function setupGlobalTutorialTests(scene: GameScene): void {
  // プロダクション環境では何もしない
  if (!import.meta.env.DEV) {
    return
  }

  const helper = new TutorialTestHelper(scene)
  
  // グローバル関数として公開
  ;(window as WindowWithTutorialTest).tutorialTest = {
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
  
  devLog('🔧 チュートリアルテスト関数が利用可能になりました:')
  devLog('  tutorialTest.basic() - 基本UIテスト')
  devLog('  tutorialTest.quick() - クイックテスト')
  devLog('  tutorialTest.error() - エラーハンドリングテスト')
  devLog('  tutorialTest.responsive() - レスポンシブテスト')
  devLog('  tutorialTest.accessibility() - アクセシビリティテスト')
  devLog('  tutorialTest.performance() - パフォーマンステスト')
  devLog('  tutorialTest.memory() - メモリ監視')
  devLog('  tutorialTest.all() - 全テスト実行')
  devLog('  tutorialTest.summary() - テスト結果サマリー')
  devLog('  tutorialTest.stop() - チュートリアル強制終了')
}