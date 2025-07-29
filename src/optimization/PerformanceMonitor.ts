/**
 * 統合パフォーマンス監視システム
 * 全最適化システムを統合し、リアルタイムでパフォーマンスを監視・制御
 */

import { PerformanceOptimizer } from '../game/systems/PerformanceOptimizer'
import { AssetOptimizer } from './AssetOptimizer'
import { RenderOptimizer } from './RenderOptimizer'
import { MemoryOptimizer } from './MemoryOptimizer'
import { GameCache } from './CacheSystem'
import { PoolManager } from './ObjectPooling'

export interface PerformanceConfig {
  /** 監視間隔（ミリ秒） */
  monitoringInterval: number
  /** アラート閾値 */
  alertThresholds: {
    fps: number
    memory: number
    loadTime: number
  }
  /** 自動最適化の有効化 */
  autoOptimization: boolean
  /** デバッグモードの有効化 */
  debugMode: boolean
  /** パフォーマンスレポートの自動生成 */
  autoReporting: boolean
}

/**
 * 総合パフォーマンス統計
 */
export interface ComprehensiveStats {
  /** タイムスタンプ */
  timestamp: number
  /** 全体スコア（0-100） */
  overallScore: number
  /** FPS統計 */
  fps: {
    current: number
    average: number
    min: number
    max: number
    stability: number
  }
  /** メモリ統計 */
  memory: {
    used: number
    available: number
    usagePercent: number
    gcCount: number
    leakCount: number
  }
  /** レンダリング統計 */
  rendering: {
    drawCalls: number
    culledObjects: number
    batchEfficiency: number
    gpuUsage: number
  }
  /** アセット統計 */
  assets: {
    loadedCount: number
    cacheHitRate: number
    compressionRatio: number
    loadTime: number
  }
  /** システム統計 */
  system: {
    cpu: number
    temperature: number
    batteryLevel: number
    networkSpeed: number
  }
}

/**
 * パフォーマンスアラート
 */
export interface PerformanceAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  category: 'fps' | 'memory' | 'rendering' | 'assets' | 'system'
  message: string
  timestamp: number
  value: number
  threshold: number
  recommendations: string[]
}

/**
 * 統合パフォーマンス監視マネージャー
 */
export class PerformanceMonitor {
  private config: PerformanceConfig
  private isRunning: boolean = false
  private monitoringTimer: NodeJS.Timeout | null = null
  
  // 最適化システム
  private phaserOptimizer: PerformanceOptimizer | null = null
  private assetOptimizer: AssetOptimizer | null = null
  private renderOptimizer: RenderOptimizer | null = null
  private memoryOptimizer: MemoryOptimizer | null = null
  
  // 統計履歴
  private statsHistory: ComprehensiveStats[] = []
  private alerts: PerformanceAlert[] = []
  
  // パフォーマンス追跡
  private performanceObserver: PerformanceObserver | null = null
  private metricsCollector: MetricsCollector
  private reportGenerator: ReportGenerator
  
  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      monitoringInterval: 1000, // 1秒
      alertThresholds: {
        fps: 30,
        memory: 80, // 80%
        loadTime: 3000 // 3秒
      },
      autoOptimization: true,
      debugMode: false,
      autoReporting: false,
      ...config
    }
    
    this.initializeMonitor()
  }
  
  /**
   * 監視システムの初期化
   */
  private initializeMonitor(): void {
    this.setupPerformanceObserver()
    this.metricsCollector = new MetricsCollector()
    this.reportGenerator = new ReportGenerator()
  }
  
  /**
   * パフォーマンスオブザーバーのセットアップ
   */
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.processPerformanceEntry(entry)
          }
        })
        
        this.performanceObserver.observe({
          entryTypes: ['navigation', 'resource', 'measure', 'paint']
        })
      } catch (error) {
        console.warn('PerformanceObserver の初期化に失敗:', error)
      }
    }
  }
  
  /**
   * パフォーマンスエントリの処理
   */
  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'navigation':
        this.handleNavigationTiming(entry as PerformanceNavigationTiming)
        break
      case 'resource':
        this.handleResourceTiming(entry as PerformanceResourceTiming)
        break
      case 'measure':
        this.handleUserTiming(entry)
        break
      case 'paint':
        this.handlePaintTiming(entry as PerformancePaintTiming)
        break
    }
  }
  
  /**
   * ナビゲーションタイミングの処理
   */
  private handleNavigationTiming(timing: PerformanceNavigationTiming): void {
    const loadTime = timing.loadEventEnd - timing.navigationStart
    
    if (loadTime > this.config.alertThresholds.loadTime) {
      this.createAlert({
        type: 'warning',
        category: 'system',
        message: `ページ読み込み時間が長すぎます: ${loadTime}ms`,
        value: loadTime,
        threshold: this.config.alertThresholds.loadTime,
        recommendations: [
          'アセットサイズの削減を検討してください',
          'CDNの使用を検討してください',
          'プリロード戦略を見直してください'
        ]
      })
    }
  }
  
  /**
   * リソースタイミングの処理
   */
  private handleResourceTiming(timing: PerformanceResourceTiming): void {
    const duration = timing.responseEnd - timing.startTime
    
    // 大きなリソースの検出
    if (timing.transferSize > 1024 * 1024) { // 1MB以上
      this.createAlert({
        type: 'info',
        category: 'assets',
        message: `大きなリソースが検出されました: ${timing.name} (${(timing.transferSize / 1024 / 1024).toFixed(2)}MB)`,
        value: timing.transferSize,
        threshold: 1024 * 1024,
        recommendations: [
          'リソースの圧縮を検討してください',
          '遅延読み込みを検討してください',
          'CDNの使用を検討してください'
        ]
      })
    }
  }
  
  /**
   * ユーザータイミングの処理
   */
  private handleUserTiming(entry: PerformanceEntry): void {\n    // カスタムメトリクスの処理\n    if (entry.name.startsWith('game-')) {\n      this.metricsCollector.addCustomMetric(entry.name, entry.duration || 0)\n    }\n  }\n  \n  /**\n   * ペイントタイミングの処理\n   */\n  private handlePaintTiming(timing: PerformancePaintTiming): void {\n    if (timing.name === 'first-contentful-paint') {\n      const fcp = timing.startTime\n      if (fcp > 2000) { // 2秒以上\n        this.createAlert({\n          type: 'warning',\n          category: 'rendering',\n          message: `First Contentful Paint が遅いです: ${fcp.toFixed(2)}ms`,\n          value: fcp,\n          threshold: 2000,\n          recommendations: [\n            'クリティカルCSSのインライン化を検討してください',\n            'フォントの最適化を検討してください',\n            'サーバーサイドレンダリングを検討してください'\n          ]\n        })\n      }\n    }\n  }\n  \n  /**\n   * 最適化システムの登録\n   */\n  registerOptimizers(optimizers: {\n    phaser?: PerformanceOptimizer\n    asset?: AssetOptimizer\n    render?: RenderOptimizer\n    memory?: MemoryOptimizer\n  }): void {\n    this.phaserOptimizer = optimizers.phaser || null\n    this.assetOptimizer = optimizers.asset || null\n    this.renderOptimizer = optimizers.render || null\n    this.memoryOptimizer = optimizers.memory || null\n  }\n  \n  /**\n   * 監視開始\n   */\n  start(): void {\n    if (this.isRunning) return\n    \n    this.isRunning = true\n    this.monitoringTimer = setInterval(() => {\n      this.collectStats()\n      this.analyzePerformance()\n      \n      if (this.config.autoOptimization) {\n        this.performAutoOptimization()\n      }\n    }, this.config.monitoringInterval)\n    \n    console.log('パフォーマンス監視を開始しました')\n  }\n  \n  /**\n   * 監視停止\n   */\n  stop(): void {\n    if (!this.isRunning) return\n    \n    this.isRunning = false\n    \n    if (this.monitoringTimer) {\n      clearInterval(this.monitoringTimer)\n      this.monitoringTimer = null\n    }\n    \n    if (this.performanceObserver) {\n      this.performanceObserver.disconnect()\n    }\n    \n    console.log('パフォーマンス監視を停止しました')\n  }\n  \n  /**\n   * 統計情報の収集\n   */\n  private collectStats(): void {\n    const timestamp = Date.now()\n    const stats: ComprehensiveStats = {\n      timestamp,\n      overallScore: 0,\n      fps: this.collectFPSStats(),\n      memory: this.collectMemoryStats(),\n      rendering: this.collectRenderingStats(),\n      assets: this.collectAssetStats(),\n      system: this.collectSystemStats()\n    }\n    \n    // 総合スコアの計算\n    stats.overallScore = this.calculateOverallScore(stats)\n    \n    this.statsHistory.push(stats)\n    \n    // 履歴のサイズ制限\n    if (this.statsHistory.length > 1000) {\n      this.statsHistory.shift()\n    }\n  }\n  \n  /**\n   * FPS統計の収集\n   */\n  private collectFPSStats(): ComprehensiveStats['fps'] {\n    const phaserStats = this.phaserOptimizer?.getPerformanceStats()\n    const recentStats = this.statsHistory.slice(-60) // 過去1分\n    \n    const currentFPS = phaserStats?.fps || 60\n    const fpsValues = recentStats.map(s => s.fps?.current || 60)\n    \n    return {\n      current: currentFPS,\n      average: fpsValues.length > 0 ? fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length : 60,\n      min: fpsValues.length > 0 ? Math.min(...fpsValues) : 60,\n      max: fpsValues.length > 0 ? Math.max(...fpsValues) : 60,\n      stability: this.calculateStability(fpsValues)\n    }\n  }\n  \n  /**\n   * メモリ統計の収集\n   */\n  private collectMemoryStats(): ComprehensiveStats['memory'] {\n    const memoryStats = this.memoryOptimizer?.getMemoryUsage() || {\n      usedHeapSize: 0,\n      heapSizeLimit: 0,\n      gcCount: 0,\n      detectedLeaks: 0\n    }\n    \n    const browserMemory = (performance as any).memory\n    const used = browserMemory ? browserMemory.usedJSHeapSize / 1024 / 1024 : memoryStats.usedHeapSize\n    const limit = browserMemory ? browserMemory.jsHeapSizeLimit / 1024 / 1024 : memoryStats.heapSizeLimit\n    \n    return {\n      used,\n      available: limit - used,\n      usagePercent: limit > 0 ? (used / limit) * 100 : 0,\n      gcCount: memoryStats.gcCount,\n      leakCount: memoryStats.detectedLeaks\n    }\n  }\n  \n  /**\n   * レンダリング統計の収集\n   */\n  private collectRenderingStats(): ComprehensiveStats['rendering'] {\n    const renderStats = this.renderOptimizer?.getStats() || {\n      drawCalls: 0,\n      culledObjects: 0,\n      renderedObjects: 0,\n      gpuUsage: 0\n    }\n    \n    return {\n      drawCalls: renderStats.drawCalls,\n      culledObjects: renderStats.culledObjects,\n      batchEfficiency: renderStats.renderedObjects > 0 ? \n        renderStats.renderedObjects / renderStats.drawCalls : 1,\n      gpuUsage: renderStats.gpuUsage\n    }\n  }\n  \n  /**\n   * アセット統計の収集\n   */\n  private collectAssetStats(): ComprehensiveStats['assets'] {\n    const assetStats = this.assetOptimizer?.getStats() || {\n      loadedAssets: 0,\n      totalAssets: 0,\n      cacheHitRate: 0,\n      averageLoadTime: 0\n    }\n    \n    return {\n      loadedCount: assetStats.loadedAssets,\n      cacheHitRate: assetStats.cacheHitRate,\n      compressionRatio: this.calculateCompressionRatio(),\n      loadTime: assetStats.averageLoadTime\n    }\n  }\n  \n  /**\n   * システム統計の収集\n   */\n  private collectSystemStats(): ComprehensiveStats['system'] {\n    return {\n      cpu: this.estimateCPUUsage(),\n      temperature: 0, // ブラウザでは取得困難\n      batteryLevel: this.getBatteryLevel(),\n      networkSpeed: this.estimateNetworkSpeed()\n    }\n  }\n  \n  /**\n   * 総合スコアの計算\n   */\n  private calculateOverallScore(stats: ComprehensiveStats): number {\n    const weights = {\n      fps: 0.3,\n      memory: 0.25,\n      rendering: 0.2,\n      assets: 0.15,\n      system: 0.1\n    }\n    \n    const scores = {\n      fps: Math.min(100, (stats.fps.current / 60) * 100 * stats.fps.stability),\n      memory: Math.max(0, 100 - stats.memory.usagePercent),\n      rendering: Math.min(100, stats.rendering.batchEfficiency * 100),\n      assets: Math.min(100, stats.assets.cacheHitRate),\n      system: Math.min(100, (1 - stats.system.cpu / 100) * 100)\n    }\n    \n    return Object.entries(weights).reduce((total, [key, weight]) => {\n      return total + scores[key as keyof typeof scores] * weight\n    }, 0)\n  }\n  \n  /**\n   * パフォーマンス分析\n   */\n  private analyzePerformance(): void {\n    const currentStats = this.statsHistory[this.statsHistory.length - 1]\n    if (!currentStats) return\n    \n    // FPS分析\n    if (currentStats.fps.current < this.config.alertThresholds.fps) {\n      this.createAlert({\n        type: 'warning',\n        category: 'fps',\n        message: `FPSが低下しています: ${currentStats.fps.current.toFixed(1)}fps`,\n        value: currentStats.fps.current,\n        threshold: this.config.alertThresholds.fps,\n        recommendations: this.generateFPSRecommendations(currentStats)\n      })\n    }\n    \n    // メモリ分析\n    if (currentStats.memory.usagePercent > this.config.alertThresholds.memory) {\n      this.createAlert({\n        type: 'error',\n        category: 'memory',\n        message: `メモリ使用量が高すぎます: ${currentStats.memory.usagePercent.toFixed(1)}%`,\n        value: currentStats.memory.usagePercent,\n        threshold: this.config.alertThresholds.memory,\n        recommendations: this.generateMemoryRecommendations(currentStats)\n      })\n    }\n    \n    // レンダリング分析\n    if (currentStats.rendering.drawCalls > 100) {\n      this.createAlert({\n        type: 'info',\n        category: 'rendering',\n        message: `描画呼び出し数が多いです: ${currentStats.rendering.drawCalls}`,\n        value: currentStats.rendering.drawCalls,\n        threshold: 100,\n        recommendations: this.generateRenderingRecommendations(currentStats)\n      })\n    }\n  }\n  \n  /**\n   * 自動最適化の実行\n   */\n  private performAutoOptimization(): void {\n    const currentStats = this.statsHistory[this.statsHistory.length - 1]\n    if (!currentStats) return\n    \n    // FPS最適化\n    if (currentStats.fps.current < this.config.alertThresholds.fps) {\n      this.phaserOptimizer?.optimizeSettings()\n    }\n    \n    // メモリ最適化\n    if (currentStats.memory.usagePercent > this.config.alertThresholds.memory) {\n      this.memoryOptimizer?.cleanup()\n    }\n    \n    // レンダリング最適化\n    if (currentStats.rendering.batchEfficiency < 0.5) {\n      this.renderOptimizer?.updateConfig({\n        enableBatching: true,\n        enableFrustumCulling: true\n      })\n    }\n  }\n  \n  /**\n   * アラートの作成\n   */\n  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {\n    const alert: PerformanceAlert = {\n      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,\n      timestamp: Date.now(),\n      ...alertData\n    }\n    \n    this.alerts.push(alert)\n    \n    // アラート履歴のサイズ制限\n    if (this.alerts.length > 100) {\n      this.alerts.shift()\n    }\n    \n    if (this.config.debugMode) {\n      console.warn('パフォーマンスアラート:', alert)\n    }\n  }\n  \n  /**\n   * FPS推奨事項の生成\n   */\n  private generateFPSRecommendations(stats: ComprehensiveStats): string[] {\n    const recommendations: string[] = []\n    \n    if (stats.rendering.drawCalls > 50) {\n      recommendations.push('描画呼び出し数を削減してください（バッチレンダリング）')\n    }\n    \n    if (stats.rendering.culledObjects < stats.rendering.drawCalls * 0.3) {\n      recommendations.push('フラスタムカリングを有効にしてください')\n    }\n    \n    if (stats.memory.usagePercent > 70) {\n      recommendations.push('メモリ使用量を削減してください')\n    }\n    \n    return recommendations\n  }\n  \n  /**\n   * メモリ推奨事項の生成\n   */\n  private generateMemoryRecommendations(stats: ComprehensiveStats): string[] {\n    const recommendations: string[] = []\n    \n    if (stats.memory.leakCount > 0) {\n      recommendations.push('メモリリークを修正してください')\n    }\n    \n    if (stats.assets.cacheHitRate < 50) {\n      recommendations.push('キャッシュ効率を改善してください')\n    }\n    \n    recommendations.push('不要なオブジェクトを解放してください')\n    recommendations.push('ガベージコレクションを強制実行してください')\n    \n    return recommendations\n  }\n  \n  /**\n   * レンダリング推奨事項の生成\n   */\n  private generateRenderingRecommendations(stats: ComprehensiveStats): string[] {\n    const recommendations: string[] = []\n    \n    if (stats.rendering.batchEfficiency < 0.5) {\n      recommendations.push('バッチレンダリングを最適化してください')\n    }\n    \n    if (stats.rendering.culledObjects < stats.rendering.drawCalls * 0.2) {\n      recommendations.push('カリング効率を改善してください')\n    }\n    \n    recommendations.push('オブジェクトプールを活用してください')\n    \n    return recommendations\n  }\n  \n  /**\n   * 統計情報の取得\n   */\n  getCurrentStats(): ComprehensiveStats | null {\n    return this.statsHistory[this.statsHistory.length - 1] || null\n  }\n  \n  /**\n   * 統計履歴の取得\n   */\n  getStatsHistory(minutes: number = 5): ComprehensiveStats[] {\n    const cutoff = Date.now() - minutes * 60 * 1000\n    return this.statsHistory.filter(stats => stats.timestamp > cutoff)\n  }\n  \n  /**\n   * アラート履歴の取得\n   */\n  getAlerts(minutes: number = 10): PerformanceAlert[] {\n    const cutoff = Date.now() - minutes * 60 * 1000\n    return this.alerts.filter(alert => alert.timestamp > cutoff)\n  }\n  \n  /**\n   * パフォーマンスレポートの生成\n   */\n  generateReport(): PerformanceReport {\n    return this.reportGenerator.generate({\n      stats: this.statsHistory,\n      alerts: this.alerts,\n      config: this.config\n    })\n  }\n  \n  /**\n   * ヘルパーメソッド\n   */\n  private calculateStability(values: number[]): number {\n    if (values.length < 2) return 1\n    \n    const mean = values.reduce((a, b) => a + b, 0) / values.length\n    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length\n    const standardDeviation = Math.sqrt(variance)\n    \n    return Math.max(0, 1 - (standardDeviation / mean))\n  }\n  \n  private calculateCompressionRatio(): number {\n    // 簡易的な圧縮率計算（実際の実装では詳細な計算が必要）\n    return 0.7 // 70%に圧縮されたと仮定\n  }\n  \n  private estimateCPUUsage(): number {\n    // CPU使用率の推定（ブラウザでは正確な値は取得困難）\n    const currentStats = this.getCurrentStats()\n    if (!currentStats) return 0\n    \n    // FPSとレンダリング統計から推定\n    const fpsRatio = currentStats.fps.current / 60\n    const renderingLoad = currentStats.rendering.drawCalls / 100\n    \n    return Math.min(100, (1 - fpsRatio) * 50 + renderingLoad * 50)\n  }\n  \n  private getBatteryLevel(): number {\n    // バッテリーレベルの取得（可能な場合）\n    if ('getBattery' in navigator) {\n      (navigator as any).getBattery().then((battery: any) => {\n        return battery.level * 100\n      })\n    }\n    return 100 // デフォルト値\n  }\n  \n  private estimateNetworkSpeed(): number {\n    // ネットワーク速度の推定\n    if ('connection' in navigator) {\n      const connection = (navigator as any).connection\n      return connection.downlink || 10 // Mbps\n    }\n    return 10 // デフォルト値\n  }\n  \n  /**\n   * リソースのクリーンアップ\n   */\n  cleanup(): void {\n    this.stop()\n    this.statsHistory.length = 0\n    this.alerts.length = 0\n  }\n}\n\n/**\n * メトリクス収集器\n */\nclass MetricsCollector {\n  private customMetrics: Map<string, number[]> = new Map()\n  \n  addCustomMetric(name: string, value: number): void {\n    const values = this.customMetrics.get(name) || []\n    values.push(value)\n    \n    // 履歴のサイズ制限\n    if (values.length > 100) {\n      values.shift()\n    }\n    \n    this.customMetrics.set(name, values)\n  }\n  \n  getCustomMetric(name: string): number[] {\n    return this.customMetrics.get(name) || []\n  }\n  \n  getAllMetrics(): Record<string, number[]> {\n    return Object.fromEntries(this.customMetrics.entries())\n  }\n}\n\n/**\n * レポート生成器\n */\nclass ReportGenerator {\n  generate(data: {\n    stats: ComprehensiveStats[]\n    alerts: PerformanceAlert[]\n    config: PerformanceConfig\n  }): PerformanceReport {\n    const { stats, alerts, config } = data\n    \n    if (stats.length === 0) {\n      return this.createEmptyReport()\n    }\n    \n    const latest = stats[stats.length - 1]\n    const timeRange = stats.length > 1 ? stats[stats.length - 1].timestamp - stats[0].timestamp : 0\n    \n    return {\n      timestamp: Date.now(),\n      timeRange,\n      summary: {\n        overallScore: latest.overallScore,\n        averageScore: stats.reduce((sum, s) => sum + s.overallScore, 0) / stats.length,\n        alertCount: alerts.length,\n        criticalIssues: alerts.filter(a => a.type === 'error').length\n      },\n      performance: {\n        fps: this.analyzeFPSPerformance(stats),\n        memory: this.analyzeMemoryPerformance(stats),\n        rendering: this.analyzeRenderingPerformance(stats),\n        assets: this.analyzeAssetPerformance(stats)\n      },\n      alerts: alerts.slice(-10), // 最新10件\n      recommendations: this.generateRecommendations(stats, alerts),\n      trends: this.analyzeTrends(stats)\n    }\n  }\n  \n  private createEmptyReport(): PerformanceReport {\n    return {\n      timestamp: Date.now(),\n      timeRange: 0,\n      summary: {\n        overallScore: 0,\n        averageScore: 0,\n        alertCount: 0,\n        criticalIssues: 0\n      },\n      performance: {\n        fps: { average: 0, min: 0, max: 0, stability: 1 },\n        memory: { average: 0, peak: 0, efficiency: 1 },\n        rendering: { efficiency: 0, optimization: 1 },\n        assets: { efficiency: 0, optimization: 1 }\n      },\n      alerts: [],\n      recommendations: ['データが不足しています'],\n      trends: {\n        improving: [],\n        degrading: [],\n        stable: []\n      }\n    }\n  }\n  \n  private analyzeFPSPerformance(stats: ComprehensiveStats[]): any {\n    const fpsValues = stats.map(s => s.fps.current)\n    \n    return {\n      average: fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length,\n      min: Math.min(...fpsValues),\n      max: Math.max(...fpsValues),\n      stability: stats[stats.length - 1]?.fps.stability || 1\n    }\n  }\n  \n  private analyzeMemoryPerformance(stats: ComprehensiveStats[]): any {\n    const memoryValues = stats.map(s => s.memory.usagePercent)\n    \n    return {\n      average: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,\n      peak: Math.max(...memoryValues),\n      efficiency: 1 - (Math.max(...memoryValues) / 100)\n    }\n  }\n  \n  private analyzeRenderingPerformance(stats: ComprehensiveStats[]): any {\n    const efficiencyValues = stats.map(s => s.rendering.batchEfficiency)\n    \n    return {\n      efficiency: efficiencyValues.reduce((a, b) => a + b, 0) / efficiencyValues.length,\n      optimization: Math.min(...efficiencyValues)\n    }\n  }\n  \n  private analyzeAssetPerformance(stats: ComprehensiveStats[]): any {\n    const cacheRates = stats.map(s => s.assets.cacheHitRate)\n    \n    return {\n      efficiency: cacheRates.reduce((a, b) => a + b, 0) / cacheRates.length,\n      optimization: Math.min(...cacheRates) / 100\n    }\n  }\n  \n  private generateRecommendations(stats: ComprehensiveStats[], alerts: PerformanceAlert[]): string[] {\n    const recommendations = new Set<string>()\n    \n    // アラートベースの推奨事項\n    alerts.forEach(alert => {\n      alert.recommendations.forEach(rec => recommendations.add(rec))\n    })\n    \n    // 統計ベースの推奨事項\n    const latest = stats[stats.length - 1]\n    if (latest) {\n      if (latest.fps.current < 45) {\n        recommendations.add('FPS最適化を実行してください')\n      }\n      if (latest.memory.usagePercent > 75) {\n        recommendations.add('メモリ使用量を削減してください')\n      }\n      if (latest.rendering.batchEfficiency < 0.6) {\n        recommendations.add('レンダリング効率を改善してください')\n      }\n    }\n    \n    return Array.from(recommendations)\n  }\n  \n  private analyzeTrends(stats: ComprehensiveStats[]): any {\n    if (stats.length < 2) {\n      return {\n        improving: [],\n        degrading: [],\n        stable: ['データが不足しています']\n      }\n    }\n    \n    const improving: string[] = []\n    const degrading: string[] = []\n    const stable: string[] = []\n    \n    // FPSトレンド分析\n    const fpsStart = stats[0].fps.current\n    const fpsEnd = stats[stats.length - 1].fps.current\n    const fpsDiff = fpsEnd - fpsStart\n    \n    if (fpsDiff > 5) {\n      improving.push('FPS')\n    } else if (fpsDiff < -5) {\n      degrading.push('FPS')\n    } else {\n      stable.push('FPS')\n    }\n    \n    // メモリトレンド分析\n    const memoryStart = stats[0].memory.usagePercent\n    const memoryEnd = stats[stats.length - 1].memory.usagePercent\n    const memoryDiff = memoryEnd - memoryStart\n    \n    if (memoryDiff < -5) {\n      improving.push('メモリ使用量')\n    } else if (memoryDiff > 5) {\n      degrading.push('メモリ使用量')\n    } else {\n      stable.push('メモリ使用量')\n    }\n    \n    return { improving, degrading, stable }\n  }\n}\n\n/**\n * パフォーマンスレポート\n */\nexport interface PerformanceReport {\n  timestamp: number\n  timeRange: number\n  summary: {\n    overallScore: number\n    averageScore: number\n    alertCount: number\n    criticalIssues: number\n  }\n  performance: {\n    fps: { average: number; min: number; max: number; stability: number }\n    memory: { average: number; peak: number; efficiency: number }\n    rendering: { efficiency: number; optimization: number }\n    assets: { efficiency: number; optimization: number }\n  }\n  alerts: PerformanceAlert[]\n  recommendations: string[]\n  trends: {\n    improving: string[]\n    degrading: string[]\n    stable: string[]\n  }\n}