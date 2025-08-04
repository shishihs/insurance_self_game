import chalk from 'chalk'
import { GamePerformanceAnalyzer } from './GamePerformanceAnalyzer'
import { MemoryProfiler } from './MemoryProfiler'
import { OptimizationSuite } from '../optimization'
import type { PerformanceMetrics } from './GamePerformanceAnalyzer'
import type { MemorySnapshot } from './MemoryProfiler'
import type { OptimizationReport } from '../optimization'

/**
 * Configuration for real-time monitoring
 */
export interface MonitorConfig {
  refreshInterval: number      // Milliseconds between updates
  showMemoryDetails: boolean   // Show detailed memory breakdown
  showOptimizationStats: boolean // Show optimization suite statistics
  showCPUGraph: boolean       // Show ASCII CPU usage graph
  showMemoryGraph: boolean    // Show ASCII memory usage graph
  maxHistoryPoints: number    // Maximum history points for graphs
  alertThresholds: {
    memoryUsage: number       // MB
    cpuUsage: number         // Percentage
    gcTime: number           // Milliseconds
  }
}

/**
 * Dashboard display state
 */
interface DashboardState {
  isRunning: boolean
  startTime: number
  updateCount: number
  alerts: AlertMessage[]
  cpuHistory: number[]
  memoryHistory: number[]
  lastMetrics?: PerformanceMetrics
  lastMemorySnapshot?: MemorySnapshot
}

/**
 * Alert message
 */
interface AlertMessage {
  timestamp: number
  type: 'warning' | 'error' | 'info'
  message: string
  metric?: string
  value?: number
}

/**
 * Real-time performance monitoring dashboard
 */
export class RealTimeMonitor {
  private config: MonitorConfig
  private state: DashboardState
  private performanceAnalyzer: GamePerformanceAnalyzer
  private memoryProfiler: MemoryProfiler
  private optimizationSuite: OptimizationSuite
  private updateTimer: ReturnType<typeof setTimeout> | null = null
  private displayLines: number = 0

  constructor(config?: Partial<MonitorConfig>) {
    this.config = {
      refreshInterval: 1000, // 1 second
      showMemoryDetails: true,
      showOptimizationStats: true,
      showCPUGraph: true,
      showMemoryGraph: true,
      maxHistoryPoints: 50,
      alertThresholds: {
        memoryUsage: 500, // 500MB
        cpuUsage: 80,     // 80%
        gcTime: 100       // 100ms
      },
      ...config
    }

    this.state = {
      isRunning: false,
      startTime: 0,
      updateCount: 0,
      alerts: [],
      cpuHistory: [],
      memoryHistory: []
    }

    this.performanceAnalyzer = new GamePerformanceAnalyzer({
      enableMemoryMonitoring: true,
      enableCpuMonitoring: true,
      enableGcMonitoring: true,
      samplingInterval: 0 // Manual sampling
    })

    this.memoryProfiler = new MemoryProfiler({
      samplingInterval: this.config.refreshInterval,
      enableHeapDumps: false
    })

    this.optimizationSuite = OptimizationSuite.getInstance()
  }

  /**
   * Start real-time monitoring
   */
  start(): void {
    if (this.state.isRunning) {
      this.addAlert('warning', 'Monitor is already running')
      return
    }

    console.clear()
    this.state.isRunning = true
    this.state.startTime = Date.now()
    this.state.updateCount = 0
    this.state.alerts = []

    // Initialize performance monitoring
    this.performanceAnalyzer.startMonitoring()
    this.memoryProfiler.startProfiling(`monitor-${Date.now()}`)
    this.optimizationSuite.enableMonitoring()

    // Start update loop
    this.updateTimer = setInterval(() => {
      this.updateDashboard()
    }, this.config.refreshInterval)

    this.addAlert('info', 'Real-time monitoring started')
    this.updateDashboard()
  }

  /**
   * Stop real-time monitoring
   */
  stop(): void {
    if (!this.state.isRunning) {
      this.addAlert('warning', 'Monitor is not running')
      return
    }

    this.state.isRunning = false

    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
    }

    // Stop performance monitoring
    this.performanceAnalyzer.stopMonitoring()
    this.memoryProfiler.stopProfiling()
    this.optimizationSuite.disableMonitoring()

    this.addAlert('info', 'Real-time monitoring stopped')
    this.updateDashboard()

    console.log(chalk.green('\n✅ Monitoring session completed'))
  }

  /**
   * Get current monitoring status
   */
  getStatus(): {
    isRunning: boolean
    uptime: number
    updateCount: number
    alertCount: number
    lastUpdate: string
  } {
    return {
      isRunning: this.state.isRunning,
      uptime: this.state.isRunning ? Date.now() - this.state.startTime : 0,
      updateCount: this.state.updateCount,
      alertCount: this.state.alerts.length,
      lastUpdate: this.state.lastMetrics ? new Date().toISOString() : 'Never'
    }
  }

  /**
   * Add custom alert
   */
  addCustomAlert(type: 'warning' | 'error' | 'info', message: string): void {
    this.addAlert(type, message)
  }

  /**
   * Take performance snapshot
   */
  takeSnapshot(): {
    timestamp: string
    performance: PerformanceMetrics | undefined
    memory: MemorySnapshot | undefined
    optimization: OptimizationReport
  } {
    return {
      timestamp: new Date().toISOString(),
      performance: this.state.lastMetrics,
      memory: this.state.lastMemorySnapshot,
      optimization: this.optimizationSuite.getPerformanceReport()
    }
  }

  // === Private Methods ===

  private updateDashboard(): void {
    // Clear previous display
    if (this.displayLines > 0) {
      process.stdout.write('\x1B[' + this.displayLines + 'A')
      process.stdout.write('\x1B[0J')
    }

    // Collect current metrics
    this.collectMetrics()

    // Render dashboard
    const output = this.renderDashboard()
    console.log(output)

    // Count lines for next clear
    this.displayLines = output.split('\n').length

    this.state.updateCount++
  }

  private collectMetrics(): void {
    try {
      // Get performance metrics
      this.state.lastMetrics = this.performanceAnalyzer.getCurrentMetrics()
      
      // Get memory snapshot
      this.state.lastMemorySnapshot = this.memoryProfiler.getCurrentMemoryStats()

      // Update history
      if (this.state.lastMetrics) {
        this.state.cpuHistory.push(this.state.lastMetrics.cpuUsage)
        this.state.memoryHistory.push(this.state.lastMetrics.memoryUsage.used)

        // Trim history
        if (this.state.cpuHistory.length > this.config.maxHistoryPoints) {
          this.state.cpuHistory = this.state.cpuHistory.slice(-this.config.maxHistoryPoints)
        }
        if (this.state.memoryHistory.length > this.config.maxHistoryPoints) {
          this.state.memoryHistory = this.state.memoryHistory.slice(-this.config.maxHistoryPoints)
        }

        // Check for alerts
        this.checkAlerts(this.state.lastMetrics)
      }

    } catch (error) {
      this.addAlert('error', `Failed to collect metrics: ${error}`)
    }
  }

  private renderDashboard(): string {
    const lines: string[] = []
    const width = Math.min(process.stdout.columns || 120, 120)
    const separator = '═'.repeat(width)

    // Header
    lines.push(chalk.bold.cyan('⚡ REAL-TIME PERFORMANCE MONITOR'))
    lines.push(chalk.gray(separator))

    // Status bar
    const uptime = this.state.isRunning ? Date.now() - this.state.startTime : 0
    const uptimeStr = this.formatDuration(uptime)
    const status = this.state.isRunning ? chalk.green('RUNNING') : chalk.red('STOPPED')
    lines.push(`Status: ${status} | Uptime: ${uptimeStr} | Updates: ${this.state.updateCount} | Alerts: ${this.state.alerts.length}`)
    lines.push('')

    // Performance metrics
    if (this.state.lastMetrics) {
      lines.push(chalk.bold.white('📊 Performance Metrics'))
      lines.push(this.renderPerformanceMetrics(this.state.lastMetrics))
      lines.push('')
    }

    // Memory details
    if (this.config.showMemoryDetails && this.state.lastMemorySnapshot) {
      lines.push(chalk.bold.white('🧠 Memory Analysis'))
      lines.push(this.renderMemoryDetails(this.state.lastMemorySnapshot))
      lines.push('')
    }

    // CPU Graph
    if (this.config.showCPUGraph && this.state.cpuHistory.length > 1) {
      lines.push(chalk.bold.white('📈 CPU Usage History'))
      lines.push(this.renderGraph(this.state.cpuHistory, 'CPU %', 0, 100))
      lines.push('')
    }

    // Memory Graph
    if (this.config.showMemoryGraph && this.state.memoryHistory.length > 1) {
      lines.push(chalk.bold.white('📈 Memory Usage History'))
      const maxMemory = Math.max(...this.state.memoryHistory) * 1.1
      lines.push(this.renderGraph(this.state.memoryHistory, 'Memory MB', 0, maxMemory))
      lines.push('')
    }

    // Optimization stats
    if (this.config.showOptimizationStats) {
      lines.push(chalk.bold.white('⚙️ Optimization Status'))
      lines.push(this.renderOptimizationStats())
      lines.push('')
    }

    // Recent alerts
    if (this.state.alerts.length > 0) {
      lines.push(chalk.bold.white('🚨 Recent Alerts'))
      lines.push(this.renderAlerts())
      lines.push('')
    }

    // Footer
    lines.push(chalk.gray(separator))
    lines.push(chalk.dim(`Last Update: ${new Date().toLocaleTimeString()} | Press Ctrl+C to stop`))

    return lines.join('\n')
  }

  private renderPerformanceMetrics(metrics: PerformanceMetrics): string {
    const lines: string[] = []
    
    // Memory usage
    const memUsage = metrics.memoryUsage
    const memColor = memUsage.used > this.config.alertThresholds.memoryUsage ? chalk.red : 
                    memUsage.used > this.config.alertThresholds.memoryUsage * 0.8 ? chalk.yellow : chalk.green
    lines.push(`  Memory: ${memColor(memUsage.used.toFixed(1))}MB / ${memUsage.heapTotal.toFixed(1)}MB heap | RSS: ${memUsage.rss.toFixed(1)}MB`)

    // CPU usage
    const cpuColor = metrics.cpuUsage > this.config.alertThresholds.cpuUsage ? chalk.red :
                    metrics.cpuUsage > this.config.alertThresholds.cpuUsage * 0.8 ? chalk.yellow : chalk.green
    lines.push(`  CPU: ${cpuColor(metrics.cpuUsage.toFixed(1))}% | Execution: ${metrics.gameExecutionTime.toFixed(1)}ms`)

    // GC metrics
    const gcColor = metrics.gcMetrics.avgCollectionTime > this.config.alertThresholds.gcTime ? chalk.red :
                   metrics.gcMetrics.avgCollectionTime > this.config.alertThresholds.gcTime * 0.8 ? chalk.yellow : chalk.green
    lines.push(`  GC: ${metrics.gcMetrics.totalCollections} collections | Avg: ${gcColor(metrics.gcMetrics.avgCollectionTime.toFixed(1))}ms`)

    // Performance scores
    const overall = metrics.performanceScores.overall
    const scoreColor = overall < 50 ? chalk.red : overall < 70 ? chalk.yellow : chalk.green
    lines.push(`  Scores: Memory ${metrics.performanceScores.memoryEfficiency.toFixed(0)}/100 | Speed ${metrics.performanceScores.executionSpeed.toFixed(0)}/100 | Overall ${scoreColor(overall.toFixed(0))}/100`)

    return lines.join('\n')
  }

  private renderMemoryDetails(snapshot: MemorySnapshot): string {
    const lines: string[] = []
    
    const totalMB = snapshot.totalHeapSize / (1024 * 1024)
    const usedMB = snapshot.usedHeapSize / (1024 * 1024)
    const externalMB = snapshot.externalMemory / (1024 * 1024)
    
    const usage = (usedMB / totalMB) * 100
    const usageBar = this.createProgressBar(usage, 30)
    
    lines.push(`  Heap Usage: ${usageBar} ${usage.toFixed(1)}%`)
    lines.push(`  Used: ${usedMB.toFixed(1)}MB | Total: ${totalMB.toFixed(1)}MB | External: ${externalMB.toFixed(1)}MB`)
    
    if (snapshot.numberOfDetachedContexts > 0) {
      lines.push(`  ⚠️ Detached Contexts: ${snapshot.numberOfDetachedContexts}`)
    }

    return lines.join('\n')
  }

  private renderGraph(data: number[], label: string, min: number, max: number): string {
    const width = 60
    const height = 8
    const lines: string[] = []

    // Normalize data to graph dimensions
    const normalizedData = data.map(value => {
      const normalized = (value - min) / (max - min)
      return Math.max(0, Math.min(1, normalized))
    })

    // Create graph
    for (let row = height - 1; row >= 0; row--) {
      let line = '  '
      const threshold = row / (height - 1)
      
      for (let col = 0; col < Math.min(width, normalizedData.length); col++) {
        const dataIndex = normalizedData.length > width ? 
          Math.floor((col / width) * normalizedData.length) : col
        
        const value = normalizedData[dataIndex]
        
        if (value >= threshold) {
          const color = value > 0.8 ? chalk.red : value > 0.6 ? chalk.yellow : chalk.green
          line += color('█')
        } else {
          line += chalk.dim('░')
        }
      }
      
      // Add scale
      const scaleValue = min + (max - min) * threshold
      line += chalk.dim(` ${scaleValue.toFixed(0)}`)
      
      lines.push(line)
    }

    // Add X-axis
    lines.push('  ' + chalk.dim('─'.repeat(Math.min(width, normalizedData.length))))
    lines.push(`  ${chalk.dim(label)} (${data.length} samples)`)

    return lines.join('\n')
  }

  private renderOptimizationStats(): string {
    try {
      const report = this.optimizationSuite.getPerformanceReport()
      const lines: string[] = []
      
      if (report.pools?.efficiency) {
        const eff = report.pools.efficiency
        lines.push(`  Object Pools: ${eff.overallEfficiency.toFixed(1)}% efficiency | ${eff.estimatedMemorySaved.toFixed(1)}MB saved`)
      }
      
      if (report.cache?.overall) {
        const cache = report.cache.overall
        lines.push(`  Cache: ${cache.totalHitRate.toFixed(1)}% hit rate | ${(cache.totalMemoryUsage / (1024 * 1024)).toFixed(1)}MB used`)
      }
      
      if (report.recommendations?.length > 0) {
        lines.push(`  💡 ${report.recommendations.length} optimization suggestions available`)
      }
      
      return lines.length > 0 ? lines.join('\n') : '  No optimization data available'
      
    } catch (error) {
      return `  Error loading optimization stats: ${error}`
    }
  }

  private renderAlerts(): string {
    const recentAlerts = this.state.alerts.slice(-5) // Show last 5 alerts
    const lines: string[] = []
    
    recentAlerts.forEach(alert => {
      const time = new Date(alert.timestamp).toLocaleTimeString()
      const icon = alert.type === 'error' ? '❌' : alert.type === 'warning' ? '⚠️' : 'ℹ️'
      const color = alert.type === 'error' ? chalk.red : alert.type === 'warning' ? chalk.yellow : chalk.blue
      
      lines.push(`  ${icon} ${color(time)} ${alert.message}`)
    })
    
    return lines.join('\n')
  }

  private createProgressBar(percentage: number, width: number): string {
    const filled = Math.round((percentage / 100) * width)
    const empty = width - filled
    
    const color = percentage > 80 ? chalk.red : percentage > 60 ? chalk.yellow : chalk.green
    return '[' + color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty)) + ']'
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000) % 60
    const minutes = Math.floor(ms / (1000 * 60)) % 60
    const hours = Math.floor(ms / (1000 * 60 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  private checkAlerts(metrics: PerformanceMetrics): void {
    const now = Date.now()
    
    // Memory alerts
    if (metrics.memoryUsage.used > this.config.alertThresholds.memoryUsage) {
      this.addAlert('warning', `High memory usage: ${metrics.memoryUsage.used.toFixed(1)}MB`, 'memory', metrics.memoryUsage.used)
    }
    
    // CPU alerts
    if (metrics.cpuUsage > this.config.alertThresholds.cpuUsage) {
      this.addAlert('warning', `High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`, 'cpu', metrics.cpuUsage)
    }
    
    // GC alerts
    if (metrics.gcMetrics.avgCollectionTime > this.config.alertThresholds.gcTime) {
      this.addAlert('warning', `Long GC pauses: ${metrics.gcMetrics.avgCollectionTime.toFixed(1)}ms`, 'gc', metrics.gcMetrics.avgCollectionTime)
    }
    
    // Performance score alerts
    if (metrics.performanceScores.overall < 30) {
      this.addAlert('error', `Poor performance score: ${metrics.performanceScores.overall.toFixed(0)}/100`, 'performance', metrics.performanceScores.overall)
    }
  }

  private addAlert(type: 'warning' | 'error' | 'info', message: string, metric?: string, value?: number): void {
    // Avoid duplicate alerts within 30 seconds
    const recentSimilar = this.state.alerts.find(alert => 
      alert.message === message && 
      Date.now() - alert.timestamp < 30000
    )
    
    if (recentSimilar) return
    
    this.state.alerts.push({
      timestamp: Date.now(),
      type,
      message,
      metric,
      value
    })
    
    // Keep only last 50 alerts
    if (this.state.alerts.length > 50) {
      this.state.alerts = this.state.alerts.slice(-50)
    }
  }
}

/**
 * Factory for creating real-time monitors with preset configurations
 */
export class RealTimeMonitorFactory {
  /**
   * Create monitor for development
   */
  static createDevelopmentMonitor(): RealTimeMonitor {
    return new RealTimeMonitor({
      refreshInterval: 1000,
      showMemoryDetails: true,
      showOptimizationStats: true,
      showCPUGraph: true,
      showMemoryGraph: true,
      alertThresholds: {
        memoryUsage: 200, // 200MB
        cpuUsage: 70,     // 70%
        gcTime: 50        // 50ms
      }
    })
  }

  /**
   * Create monitor for production
   */
  static createProductionMonitor(): RealTimeMonitor {
    return new RealTimeMonitor({
      refreshInterval: 5000, // 5 seconds
      showMemoryDetails: false,
      showOptimizationStats: false,
      showCPUGraph: false,
      showMemoryGraph: false,
      alertThresholds: {
        memoryUsage: 1000, // 1GB
        cpuUsage: 90,      // 90%
        gcTime: 200        // 200ms
      }
    })
  }

  /**
   * Create monitor for performance testing
   */
  static createTestingMonitor(): RealTimeMonitor {
    return new RealTimeMonitor({
      refreshInterval: 500, // 500ms
      showMemoryDetails: true,
      showOptimizationStats: true,
      showCPUGraph: true,
      showMemoryGraph: true,
      maxHistoryPoints: 100,
      alertThresholds: {
        memoryUsage: 500, // 500MB
        cpuUsage: 80,     // 80%
        gcTime: 100       // 100ms
      }
    })
  }
}

export default RealTimeMonitor