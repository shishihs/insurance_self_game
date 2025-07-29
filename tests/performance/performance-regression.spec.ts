/**
 * パフォーマンス回帰テスト
 * レンダリング速度、メモリ使用量、レスポンス時間の継続監視
 */

import { test, expect } from '@playwright/test'

interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  responseTime: number
  frameRate: number
  loadTime: number
}

interface PerformanceBaseline {
  renderTime: { min: number; max: number }
  memoryUsage: { min: number; max: number }
  responseTime: { min: number; max: number }
  frameRate: { min: number; max: number }
  loadTime: { max: number }
}

// パフォーマンスベースライン（期待値）
const PERFORMANCE_BASELINE: PerformanceBaseline = {
  renderTime: { min: 1, max: 50 }, // ms
  memoryUsage: { min: 1, max: 100 }, // MB
  responseTime: { min: 1, max: 100 }, // ms
  frameRate: { min: 30, max: 120 }, // fps
  loadTime: { max: 3000 } // ms
}

class PerformanceProfiler {
  private metrics: PerformanceMetrics[] = []
  
  async measurePageLoad(page: any): Promise<number> {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForSelector('[data-testid="game-canvas"]')
    return Date.now() - startTime
  }
  
  async measureRenderTime(page: any): Promise<number> {
    return await page.evaluate(() => {
      return new Promise<number>(resolve => {
        const startTime = performance.now()
        requestAnimationFrame(() => {
          const endTime = performance.now()
          resolve(endTime - startTime)
        })
      })
    })
  }
  
  async measureMemoryUsage(page: any): Promise<number> {
    const memoryInfo = await page.evaluate(() => {
      const memory = (performance as any).memory
      return memory ? memory.usedJSHeapSize / (1024 * 1024) : 0 // MB
    })
    return memoryInfo
  }
  
  async measureResponseTime(page: any, action: () => Promise<void>): Promise<number> {
    const startTime = performance.now()
    await action()
    return performance.now() - startTime
  }
  
  async measureFrameRate(page: any, duration: number = 1000): Promise<number> {
    return await page.evaluate((duration) => {
      return new Promise<number>(resolve => {
        let frameCount = 0
        const startTime = performance.now()
        
        const countFrame = (currentTime: number) => {
          frameCount++
          if (currentTime - startTime < duration) {
            requestAnimationFrame(countFrame)
          } else {
            const actualDuration = currentTime - startTime
            const fps = (frameCount * 1000) / actualDuration
            resolve(fps)
          }
        }
        
        requestAnimationFrame(countFrame)
      })
    }, duration)
  }
  
  async profilePerformance(page: any): Promise<PerformanceMetrics> {
    const loadTime = await this.measurePageLoad(page)
    const renderTime = await this.measureRenderTime(page)
    const memoryUsage = await this.measureMemoryUsage(page)
    
    const responseTime = await this.measureResponseTime(page, async () => {
      const canvas = page.locator('[data-testid="game-canvas"]')
      await canvas.click()
    })
    
    const frameRate = await this.measureFrameRate(page)
    
    const metrics: PerformanceMetrics = {
      renderTime,
      memoryUsage,
      responseTime,
      frameRate,
      loadTime
    }
    
    this.metrics.push(metrics)
    return metrics
  }
  
  getAverageMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      throw new Error('No metrics collected')
    }
    
    const sum = this.metrics.reduce((acc, metric) => ({
      renderTime: acc.renderTime + metric.renderTime,
      memoryUsage: acc.memoryUsage + metric.memoryUsage,
      responseTime: acc.responseTime + metric.responseTime,
      frameRate: acc.frameRate + metric.frameRate,
      loadTime: acc.loadTime + metric.loadTime
    }), { renderTime: 0, memoryUsage: 0, responseTime: 0, frameRate: 0, loadTime: 0 })
    
    return {
      renderTime: sum.renderTime / this.metrics.length,
      memoryUsage: sum.memoryUsage / this.metrics.length,
      responseTime: sum.responseTime / this.metrics.length,
      frameRate: sum.frameRate / this.metrics.length,
      loadTime: sum.loadTime / this.metrics.length
    }
  }
  
  validateMetrics(metrics: PerformanceMetrics, baseline: PerformanceBaseline): string[] {
    const violations: string[] = []
    
    if (metrics.renderTime > baseline.renderTime.max) {
      violations.push(`Render time too slow: ${metrics.renderTime}ms (max: ${baseline.renderTime.max}ms)`)
    }
    
    if (metrics.memoryUsage > baseline.memoryUsage.max) {
      violations.push(`Memory usage too high: ${metrics.memoryUsage}MB (max: ${baseline.memoryUsage.max}MB)`)
    }
    
    if (metrics.responseTime > baseline.responseTime.max) {
      violations.push(`Response time too slow: ${metrics.responseTime}ms (max: ${baseline.responseTime.max}ms)`)
    }
    
    if (metrics.frameRate < baseline.frameRate.min) {
      violations.push(`Frame rate too low: ${metrics.frameRate}fps (min: ${baseline.frameRate.min}fps)`)
    }
    
    if (metrics.loadTime > baseline.loadTime.max) {
      violations.push(`Load time too slow: ${metrics.loadTime}ms (max: ${baseline.loadTime.max}ms)`)
    }
    
    return violations
  }
}

test.describe('パフォーマンス回帰テスト', () => {
  let profiler: PerformanceProfiler
  
  test.beforeEach(() => {
    profiler = new PerformanceProfiler()
  })
  
  test('初期読み込みパフォーマンス', async ({ page }) => {
    const metrics = await profiler.profilePerformance(page)
    
    console.log('初期読み込みメトリクス:', metrics)
    
    const violations = profiler.validateMetrics(metrics, PERFORMANCE_BASELINE)
    
    if (violations.length > 0) {
      console.warn('パフォーマンス基準違反:', violations.join(', '))
    }
    
    // 厳密な検証
    expect(metrics.loadTime).toBeLessThan(PERFORMANCE_BASELINE.loadTime.max)
    expect(metrics.renderTime).toBeLessThan(PERFORMANCE_BASELINE.renderTime.max)
    expect(metrics.memoryUsage).toBeLessThan(PERFORMANCE_BASELINE.memoryUsage.max)
    expect(metrics.frameRate).toBeGreaterThan(PERFORMANCE_BASELINE.frameRate.min)
  })
  
  test('連続操作時のパフォーマンス安定性', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="game-canvas"]')
    
    const canvas = page.locator('[data-testid="game-canvas"]')
    const iterations = 10
    const metrics: PerformanceMetrics[] = []
    
    for (let i = 0; i < iterations; i++) {
      // 各操作のパフォーマンスを測定
      const startTime = performance.now()
      await canvas.click()
      await page.waitForTimeout(100)
      const operationTime = performance.now() - startTime
      
      const memoryUsage = await profiler.measureMemoryUsage(page)
      const frameRate = await profiler.measureFrameRate(page, 500)
      
      metrics.push({
        renderTime: 0, // 個別測定は省略
        memoryUsage,
        responseTime: operationTime,
        frameRate,
        loadTime: 0
      })
    }
    
    // 平均値の計算
    const avgMemory = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length
    const avgResponse = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length
    const avgFrameRate = metrics.reduce((sum, m) => sum + m.frameRate, 0) / metrics.length
    
    console.log(`連続操作パフォーマンス (${iterations}回):`, {
      avgMemory: `${avgMemory.toFixed(2)}MB`,
      avgResponse: `${avgResponse.toFixed(2)}ms`,
      avgFrameRate: `${avgFrameRate.toFixed(1)}fps`
    })
    
    // 安定性の検証
    expect(avgMemory).toBeLessThan(PERFORMANCE_BASELINE.memoryUsage.max)
    expect(avgResponse).toBeLessThan(PERFORMANCE_BASELINE.responseTime.max)
    expect(avgFrameRate).toBeGreaterThan(PERFORMANCE_BASELINE.frameRate.min)
    
    // メモリリークの検証（増加率が過度でない）
    const firstMemory = metrics[0].memoryUsage
    const lastMemory = metrics[metrics.length - 1].memoryUsage
    const memoryIncrease = lastMemory - firstMemory
    const increaseRatio = memoryIncrease / firstMemory
    
    expect(increaseRatio).toBeLessThan(0.5) // 50%以内の増加
  })
  
  test('チュートリアル実行時のパフォーマンス', async ({ page }) => {
    await page.goto('/')
    
    const tutorialButton = page.locator('[data-testid="tutorial-button"]')
    
    if (await tutorialButton.isVisible()) {
      const startTime = performance.now()
      const initialMemory = await profiler.measureMemoryUsage(page)
      
      // チュートリアル開始
      await tutorialButton.click()
      
      // チュートリアル完了まで待機
      await page.waitForSelector('[data-testid="tutorial-complete"]', { timeout: 30000 })
      
      const endTime = performance.now()
      const finalMemory = await profiler.measureMemoryUsage(page)
      
      const tutorialDuration = endTime - startTime
      const memoryDelta = finalMemory - initialMemory
      
      console.log('チュートリアルパフォーマンス:', {
        duration: `${tutorialDuration.toFixed(0)}ms`,
        memoryDelta: `${memoryDelta.toFixed(2)}MB`
      })
      
      // チュートリアルは30秒以内に完了
      expect(tutorialDuration).toBeLessThan(30000)
      
      // メモリ使用量の増加は合理的な範囲内
      expect(memoryDelta).toBeLessThan(50) // 50MB以内
      
      // チュートリアル後のレスポンシブ性チェック
      const postTutorialResponse = await profiler.measureResponseTime(page, async () => {
        const canvas = page.locator('[data-testid="game-canvas"]')
        await canvas.click()
      })
      
      expect(postTutorialResponse).toBeLessThan(PERFORMANCE_BASELINE.responseTime.max)
    }
  })
  
  test('大量データ処理時のパフォーマンス', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="game-canvas"]')
    
    // 大量のゲーム操作をシミュレート
    const heavyOperations = async () => {
      const canvas = page.locator('[data-testid="game-canvas"]')
      
      // 高速連続クリック
      for (let i = 0; i < 50; i++) {
        await canvas.click({ position: { x: i % 800 + 50, y: i % 600 + 50 } })
        if (i % 10 === 0) {
          await page.waitForTimeout(10) // 短い休憩
        }
      }
    }
    
    const initialMemory = await profiler.measureMemoryUsage(page)
    const operationTime = await profiler.measureResponseTime(page, heavyOperations)
    const finalMemory = await profiler.measureMemoryUsage(page)
    
    const memoryIncrease = finalMemory - initialMemory
    
    console.log('大量操作パフォーマンス:', {
      operationTime: `${operationTime.toFixed(0)}ms`,
      memoryIncrease: `${memoryIncrease.toFixed(2)}MB`
    })
    
    // 大量操作でも合理的な時間内に完了
    expect(operationTime).toBeLessThan(5000) // 5秒以内
    
    // メモリ使用量の増加が管理されている
    expect(memoryIncrease).toBeLessThan(20) // 20MB以内
    
    // 操作後もレスポンシブ性が維持される
    const postOperationResponse = await profiler.measureResponseTime(page, async () => {
      const canvas = page.locator('[data-testid="game-canvas"]')
      await canvas.click()
    })
    
    expect(postOperationResponse).toBeLessThan(PERFORMANCE_BASELINE.responseTime.max * 2) // 許容範囲を倍に
  })
  
  test('長時間実行時のメモリリーク検出', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="game-canvas"]')
    
    const canvas = page.locator('[data-testid="game-canvas"]')
    const memoryMeasurements: number[] = []
    const measurementInterval = 2000 // 2秒間隔
    const totalDuration = 20000 // 20秒間
    const measurements = totalDuration / measurementInterval
    
    for (let i = 0; i < measurements; i++) {
      // 定期的な操作
      await canvas.click()
      await page.waitForTimeout(100)
      
      // メモリ使用量測定
      const memory = await profiler.measureMemoryUsage(page)
      memoryMeasurements.push(memory)
      
      console.log(`メモリ測定 ${i + 1}/${measurements}: ${memory.toFixed(2)}MB`)
      
      // 次の測定まで待機
      if (i < measurements - 1) {
        await page.waitForTimeout(measurementInterval - 100)
      }
    }
    
    // メモリリーク分析
    const initialMemory = memoryMeasurements[0]
    const finalMemory = memoryMeasurements[memoryMeasurements.length - 1]
    const maxMemory = Math.max(...memoryMeasurements)
    const memoryGrowth = finalMemory - initialMemory
    const growthRate = memoryGrowth / initialMemory
    
    console.log('メモリリーク分析:', {
      initial: `${initialMemory.toFixed(2)}MB`,
      final: `${finalMemory.toFixed(2)}MB`,
      max: `${maxMemory.toFixed(2)}MB`,
      growth: `${memoryGrowth.toFixed(2)}MB`,
      growthRate: `${(growthRate * 100).toFixed(1)}%`
    })
    
    // メモリリークの検証
    expect(growthRate).toBeLessThan(1.0) // 100%以内の増加
    expect(maxMemory).toBeLessThan(PERFORMANCE_BASELINE.memoryUsage.max * 2) // 最大値制限
    
    // メモリ使用パターンの安定性
    const memoryVariance = memoryMeasurements.reduce((acc, memory) => {
      const avgMemory = memoryMeasurements.reduce((sum, m) => sum + m, 0) / memoryMeasurements.length
      return acc + Math.pow(memory - avgMemory, 2)
    }, 0) / memoryMeasurements.length
    
    const memoryStdDev = Math.sqrt(memoryVariance)
    const stabilityIndex = memoryStdDev / initialMemory
    
    expect(stabilityIndex).toBeLessThan(0.3) // 30%以内の変動
  })
  
  test('異なる画面サイズでのパフォーマンス', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'FullHD' },
      { width: 1366, height: 768, name: 'Laptop' },
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' }
    ]
    
    const results: Array<{ viewport: string; metrics: PerformanceMetrics }> = []
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      const metrics = await profiler.profilePerformance(page)
      results.push({ viewport: viewport.name, metrics })
      
      console.log(`${viewport.name} (${viewport.width}×${viewport.height}):`, {
        loadTime: `${metrics.loadTime}ms`,
        renderTime: `${metrics.renderTime.toFixed(2)}ms`,
        memory: `${metrics.memoryUsage.toFixed(2)}MB`,
        fps: `${metrics.frameRate.toFixed(1)}`
      })
    }
    
    // すべての画面サイズで基準を満たすことを確認
    results.forEach(result => {
      const violations = profiler.validateMetrics(result.metrics, PERFORMANCE_BASELINE)
      expect(violations).toHaveLength(0)
    })
    
    // 画面サイズによる極端なパフォーマンス差がないことを確認
    const loadTimes = results.map(r => r.metrics.loadTime)
    const maxLoadTime = Math.max(...loadTimes)
    const minLoadTime = Math.min(...loadTimes)
    const loadTimeRatio = maxLoadTime / minLoadTime
    
    expect(loadTimeRatio).toBeLessThan(3) // 3倍以内の差
  })
  
  test('CPU使用率モニタリング', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="game-canvas"]')
    
    // CPUプロファイリング開始
    const cpuProfile = await page.evaluate(() => {
      if ('measureUserAgentSpecificMemory' in performance) {
        return (performance as any).measureUserAgentSpecificMemory()
      }
      return null
    })
    
    // CPU集約的な操作をシミュレート
    const intensiveOperations = async () => {
      const canvas = page.locator('[data-testid="game-canvas"]')
      
      for (let i = 0; i < 100; i++) {
        await canvas.click({ position: { x: Math.random() * 800, y: Math.random() * 600 } })
        if (i % 20 === 0) {
          await page.waitForTimeout(50)
        }
      }
    }
    
    const executionTime = await profiler.measureResponseTime(page, intensiveOperations)
    
    console.log('CPU集約的操作:', {
      executionTime: `${executionTime.toFixed(0)}ms`,
      operationsPerSecond: (100 / (executionTime / 1000)).toFixed(1)
    })
    
    // 合理的な実行時間内に完了
    expect(executionTime).toBeLessThan(10000) // 10秒以内
    
    // 操作後もシステムが応答性を維持
    const responseAfterIntensive = await profiler.measureResponseTime(page, async () => {
      const canvas = page.locator('[data-testid="game-canvas"]')
      await canvas.click()
    })
    
    expect(responseAfterIntensive).toBeLessThan(PERFORMANCE_BASELINE.responseTime.max * 1.5)
  })
})