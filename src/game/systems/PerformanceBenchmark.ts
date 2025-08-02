/**
 * パフォーマンスベンチマークシステム
 * 
 * 主な機能:
 * - GPU/CPU パフォーマンステスト
 * - メモリリーク検出
 * - フレームレート安定性測定
 * - ユーザー体験指標の評価
 */

interface BenchmarkConfig {
  duration: number // 測定時間（秒）
  iterations: number // 反復回数
  warmupTime: number // ウォームアップ時間（秒）
  includeGPUTests: boolean
  includeCPUTests: boolean
  includeMemoryTests: boolean
}

interface BenchmarkResult {
  overall: {
    score: number // 総合スコア (0-100)
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    recommendedSettings: string
  }
  rendering: {
    averageFPS: number
    minFPS: number
    maxFPS: number
    frameTimeVariance: number
    drawCallsPerFrame: number
    trianglesPerFrame: number
    gpuUtilization: number
  }
  memory: {
    initialUsage: number // MB
    peakUsage: number // MB
    finalUsage: number // MB
    leakDetected: boolean
    gcEfficiency: number
  }
  cpu: {
    updateTime: number // ms
    scriptTime: number // ms
    idleTime: number // ms
    efficiency: number // %
  }
  device: {
    capabilities: any
    isOptimal: boolean
    bottlenecks: string[]
    recommendations: string[]
  }
}

interface StressTestConfig {
  objects: number
  particles: number
  animations: number
  duration: number
}

export class PerformanceBenchmark {
  private readonly scene: Phaser.Scene
  private isRunning: boolean = false
  private benchmarkData: any[] = []
  private startTime: number = 0
  
  // テスト用オブジェクト
  private testObjects: Phaser.GameObjects.GameObject[] = []
  private testParticles: Phaser.GameObjects.Particles.ParticleEmitter[] = []
  private testAnimations: Phaser.Tweens.Tween[] = []
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * 包括的なベンチマークテストを実行
   */
  public async runComprehensiveBenchmark(config?: Partial<BenchmarkConfig>): Promise<BenchmarkResult> {
    const benchConfig: BenchmarkConfig = {
      duration: 30,
      iterations: 3,
      warmupTime: 5,
      includeGPUTests: true,
      includeCPUTests: true,
      includeMemoryTests: true,
      ...config
    }
    
    console.log('包括的ベンチマークを開始します...')
    
    // ウォームアップ
    await this.warmup(benchConfig.warmupTime)
    
    const results: Partial<BenchmarkResult> = {}
    
    // レンダリングテスト
    if (benchConfig.includeGPUTests) {
      console.log('レンダリングテストを実行中...')
      results.rendering = await this.runRenderingBenchmark(benchConfig)
    }
    
    // メモリテスト
    if (benchConfig.includeMemoryTests) {
      console.log('メモリテストを実行中...')
      results.memory = await this.runMemoryBenchmark(benchConfig)
    }
    
    // CPUテスト
    if (benchConfig.includeCPUTests) {
      console.log('CPUテストを実行中...')
      results.cpu = await this.runCPUBenchmark(benchConfig)
    }
    
    // デバイス評価
    results.device = this.evaluateDevice()
    
    // 総合評価
    results.overall = this.calculateOverallScore(results as BenchmarkResult)
    
    console.log('ベンチマーク完了')
    return results as BenchmarkResult
  }

  /**
   * ウォームアップ処理
   */
  private async warmup(duration: number): Promise<void> {
    return new Promise(resolve => {
      let elapsed = 0
      const interval = setInterval(() => {
        elapsed++
        if (elapsed >= duration) {
          clearInterval(interval)
          resolve()
        }
      }, 1000)
    })
  }

  /**
   * レンダリングベンチマーク
   */
  private async runRenderingBenchmark(config: BenchmarkConfig): Promise<any> {
    const frameData: number[] = []
    const drawCallData: number[] = []
    let minFPS = Infinity
    let maxFPS = 0
    
    return new Promise(resolve => {
      let startTime = performance.now()
      let frameCount = 0
      
      const collectData = () => {
        const currentTime = performance.now()
        const deltaTime = currentTime - startTime
        const fps = 1000 / deltaTime
        
        frameData.push(fps)
        minFPS = Math.min(minFPS, fps)
        maxFPS = Math.max(maxFPS, fps)
        
        // WebGLの統計情報を収集
        const renderer = this.scene.game.renderer
        if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
          drawCallData.push(renderer.drawingBufferHeight) // プロキシとして使用
        }
        
        frameCount++
        startTime = currentTime
        
        if (deltaTime / 1000 < config.duration) {
          requestAnimationFrame(collectData)
        } else {
          // ストレステストオブジェクトを作成
          this.createStressTestObjects()
          
          // 結果を計算
          const averageFPS = frameData.reduce((a, b) => a + b, 0) / frameData.length
          const variance = this.calculateVariance(frameData)
          
          resolve({
            averageFPS: Math.round(averageFPS),
            minFPS: Math.round(minFPS),
            maxFPS: Math.round(maxFPS),
            frameTimeVariance: Math.round(variance * 100) / 100,
            drawCallsPerFrame: Math.round(drawCallData.reduce((a, b) => a + b, 0) / drawCallData.length),
            trianglesPerFrame: this.estimateTrianglesPerFrame(),
            gpuUtilization: this.estimateGPUUtilization(averageFPS)
          })
        }
      }
      
      requestAnimationFrame(collectData)
    })
  }

  /**
   * メモリベンチマーク
   */
  private async runMemoryBenchmark(config: BenchmarkConfig): Promise<any> {
    const initialMemory = this.getCurrentMemoryUsage()
    let peakMemory = initialMemory
    
    // メモリリークテスト用オブジェクトを作成
    for (let i = 0; i < 1000; i++) {
      const sprite = this.scene.add.sprite(
        Math.random() * 800,
        Math.random() * 600,
        '__DEFAULT'
      )
      this.testObjects.push(sprite)
      
      // 定期的にメモリ使用量をチェック
      if (i % 100 === 0) {
        const currentMemory = this.getCurrentMemoryUsage()
        peakMemory = Math.max(peakMemory, currentMemory)
      }
    }
    
    // ガベージコレクションを強制実行
    if ('gc' in window) {
      (window as any).gc()
    }
    
    // オブジェクトを削除
    this.testObjects.forEach(obj => obj.destroy())
    this.testObjects = []
    
    // 少し待ってからメモリをチェック
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const finalMemory = this.getCurrentMemoryUsage()
    const leakDetected = finalMemory > initialMemory * 1.1 // 10%以上増加した場合はリーク疑い
    
    return {
      initialUsage: Math.round(initialMemory),
      peakUsage: Math.round(peakMemory),
      finalUsage: Math.round(finalMemory),
      leakDetected,
      gcEfficiency: Math.round(((peakMemory - finalMemory) / peakMemory) * 100)
    }
  }

  /**
   * CPUベンチマーク
   */
  private async runCPUBenchmark(config: BenchmarkConfig): Promise<any> {
    const updateTimes: number[] = []
    const scriptTimes: number[] = []
    
    return new Promise(resolve => {
      let iterations = 0
      const maxIterations = config.duration * 60 // 60fps想定
      
      const measureCPU = () => {
        const startTime = performance.now()
        
        // CPU集約的なタスクをシミュレート
        this.simulateCPUWork()
        
        const endTime = performance.now()
        const updateTime = endTime - startTime
        
        updateTimes.push(updateTime)
        
        // スクリプト実行時間の測定
        const scriptStart = performance.now()
        this.runComplexScript()
        const scriptEnd = performance.now()
        
        scriptTimes.push(scriptEnd - scriptStart)
        
        iterations++
        
        if (iterations < maxIterations) {
          requestAnimationFrame(measureCPU)
        } else {
          const avgUpdateTime = updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length
          const avgScriptTime = scriptTimes.reduce((a, b) => a + b, 0) / scriptTimes.length
          const idleTime = Math.max(0, 16.67 - avgUpdateTime - avgScriptTime) // 60fps target
          const efficiency = Math.round((idleTime / 16.67) * 100)
          
          resolve({
            updateTime: Math.round(avgUpdateTime * 100) / 100,
            scriptTime: Math.round(avgScriptTime * 100) / 100,
            idleTime: Math.round(idleTime * 100) / 100,
            efficiency
          })
        }
      }
      
      measureCPU()
    })
  }

  /**
   * ストレステスト
   */
  public async runStressTest(config: StressTestConfig): Promise<any> {
    console.log('ストレステストを開始...')
    
    const initialFPS = this.scene.game.loop.actualFps || 60
    
    // 大量のオブジェクトを作成
    for (let i = 0; i < config.objects; i++) {
      const sprite = this.scene.add.sprite(
        Math.random() * 800,
        Math.random() * 600,
        '__DEFAULT'
      )
      sprite.setScale(0.5)
      this.testObjects.push(sprite)
    }
    
    // パーティクルシステムを作成
    for (let i = 0; i < config.particles; i++) {
      const emitter = this.scene.add.particles(
        Math.random() * 800,
        Math.random() * 600,
        '__DEFAULT',
        {
          speed: { min: 50, max: 100 },
          lifespan: 2000,
          quantity: 5
        }
      )
      this.testParticles.push(emitter)
    }
    
    // アニメーションを作成
    for (let i = 0; i < config.animations; i++) {
      const target = this.testObjects[i % this.testObjects.length]
      if (target) {
        const tween = this.scene.tweens.add({
          targets: target,
          x: Math.random() * 800,
          y: Math.random() * 600,
          duration: 2000,
          yoyo: true,
          repeat: -1
        })
        this.testAnimations.push(tween)
      }
    }
    
    // 指定時間待機
    await new Promise(resolve => setTimeout(resolve, config.duration * 1000))
    
    const finalFPS = this.scene.game.loop.actualFps || 60
    const fpsDropPercentage = ((initialFPS - finalFPS) / initialFPS) * 100
    
    // クリーンアップ
    this.cleanupStressTest()
    
    return {
      initialFPS: Math.round(initialFPS),
      finalFPS: Math.round(finalFPS),
      fpsDropPercentage: Math.round(fpsDropPercentage),
      objectsCreated: config.objects,
      particlesCreated: config.particles,
      animationsCreated: config.animations,
      performance: fpsDropPercentage < 20 ? 'excellent' : 
                   fpsDropPercentage < 40 ? 'good' : 
                   fpsDropPercentage < 60 ? 'fair' : 'poor'
    }
  }

  /**
   * ストレステストオブジェクトの作成
   */
  private createStressTestObjects(): void {
    // 軽いストレステスト用のオブジェクトを作成
    for (let i = 0; i < 500; i++) {
      const sprite = this.scene.add.sprite(
        Math.random() * 800,
        Math.random() * 600,
        '__DEFAULT'
      )
      sprite.setScale(0.3)
      this.testObjects.push(sprite)
    }
  }

  /**
   * CPU集約的なタスクのシミュレーション
   */
  private simulateCPUWork(): void {
    // 数学的計算を行ってCPU負荷をかける
    let result = 0
    for (let i = 0; i < 10000; i++) {
      result += Math.sin(i) * Math.cos(i) + Math.sqrt(i)
    }
  }

  /**
   * 複雑なスクリプトの実行
   */
  private runComplexScript(): void {
    // 配列操作やオブジェクト操作
    const data = []
    for (let i = 0; i < 1000; i++) {
      data.push({
        id: i,
        value: Math.random(),
        processed: false
      })
    }
    
    // ソートと変換
    data.sort((a, b) => a.value - b.value)
    data.forEach(item => {
      item.processed = item.value > 0.5
    })
  }

  /**
   * 現在のメモリ使用量を取得
   */
  private getCurrentMemoryUsage(): number {
    if ('memory' in performance && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024 // MB
    }
    return 0
  }

  /**
   * 分散の計算
   */
  private calculateVariance(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length
    const variance = data.reduce((acc, val) => acc + (val - mean) ** 2, 0) / data.length
    return Math.sqrt(variance)
  }

  /**
   * フレームあたりの三角形数を推定
   */
  private estimateTrianglesPerFrame(): number {
    // 簡易的な推定
    return this.scene.children.length * 2 // スプライトは通常2つの三角形
  }

  /**
   * GPU使用率を推定
   */
  private estimateGPUUtilization(averageFPS: number): number {
    const targetFPS = 60
    const utilization = Math.min(100, (1 - (averageFPS / targetFPS)) * 100)
    return Math.max(0, Math.round(utilization))
  }

  /**
   * デバイス評価
   */
  private evaluateDevice(): any {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    
    const capabilities = {
      supportsWebGL: !!gl,
      maxTextureSize: gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0,
      devicePixelRatio: window.devicePixelRatio,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      deviceMemory: (navigator as any).deviceMemory || 'unknown'
    }
    
    const bottlenecks: string[] = []
    const recommendations: string[] = []
    
    // ボトルネックの特定
    if (capabilities.hardwareConcurrency <= 2) {
      bottlenecks.push('CPU cores')
      recommendations.push('CPUアニメーションを削減')
    }
    
    if (capabilities.devicePixelRatio > 2) {
      bottlenecks.push('High DPI display')
      recommendations.push('レンダースケールを調整')
    }
    
    if (!capabilities.supportsWebGL) {
      bottlenecks.push('WebGL support')
      recommendations.push('Canvas レンダラーに切り替え')
    }
    
    const isOptimal = bottlenecks.length === 0
    
    return {
      capabilities,
      isOptimal,
      bottlenecks,
      recommendations
    }
  }

  /**
   * 総合スコアの計算
   */
  private calculateOverallScore(result: BenchmarkResult): any {
    let score = 100
    
    // FPSスコア
    const fpsScore = Math.min(100, (result.rendering.averageFPS / 60) * 40)
    
    // メモリスコア
    const memoryScore = result.memory.leakDetected ? 0 : 30
    
    // CPU効率スコア
    const cpuScore = (result.cpu.efficiency / 100) * 30
    
    score = fpsScore + memoryScore + cpuScore
    
    // グレード決定
    let grade: 'A' | 'B' | 'C' | 'D' | 'F'
    if (score >= 90) grade = 'A'
    else if (score >= 80) grade = 'B'
    else if (score >= 70) grade = 'C'
    else if (score >= 60) grade = 'D'
    else grade = 'F'
    
    // 推奨設定
    let recommendedSettings = 'high'
    if (score < 70) recommendedSettings = 'medium'
    if (score < 50) recommendedSettings = 'low'
    
    return {
      score: Math.round(score),
      grade,
      recommendedSettings
    }
  }

  /**
   * ストレステストのクリーンアップ
   */
  private cleanupStressTest(): void {
    this.testObjects.forEach(obj => obj.destroy())
    this.testParticles.forEach(emitter => emitter.destroy())
    this.testAnimations.forEach(tween => tween.destroy())
    
    this.testObjects = []
    this.testParticles = []
    this.testAnimations = []
  }

  /**
   * ベンチマーク結果の保存
   */
  public saveBenchmarkResult(result: BenchmarkResult): void {
    const timestamp = new Date().toISOString()
    const data = {
      timestamp,
      result,
      userAgent: navigator.userAgent,
      deviceInfo: this.evaluateDevice().capabilities
    }
    
    localStorage.setItem(`benchmark_${timestamp}`, JSON.stringify(data))
    console.log('ベンチマーク結果を保存しました:', data)
  }

  /**
   * 保存されたベンチマーク結果の取得
   */
  public getSavedResults(): any[] {
    const results = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('benchmark_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          results.push(data)
        } catch (e) {
          console.error('ベンチマーク結果の読み込みエラー:', e)
        }
      }
    }
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }
}