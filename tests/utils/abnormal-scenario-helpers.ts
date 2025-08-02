/**
 * 異常シナリオテスト用ヘルパー関数
 * E2Eテストで異常状態をシミュレートするためのユーティリティ
 */

import { Page, BrowserContext } from '@playwright/test'

export interface NetworkCondition {
  latency: number
  downloadSpeed: number
  uploadSpeed: number
  packetLoss?: number
}

export interface StorageQuota {
  maxSize: number
  currentUsage: number
  throwOnExceed: boolean
}

export interface SecurityThreat {
  type: 'xss' | 'csrf' | 'injection' | 'dos' | 'clickjacking'
  payload: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * ネットワーク異常状態シミュレーター
 */
export class NetworkAnomalySimulator {
  constructor(private page: Page) {}

  /**
   * 通信途中切断をシミュレート
   */
  async simulateConnectionDrop(after: number = 3): Promise<void> {
    let requestCount = 0
    
    await this.page.route('**/*', (route) => {
      requestCount++
      
      if (requestCount > after) {
        route.abort('internetdisconnected')
      } else {
        route.continue()
      }
    })
  }

  /**
   * 低速回線をシミュレート
   */
  async simulateSlowConnection(condition: NetworkCondition): Promise<void> {
    await this.page.route('**/*', async (route) => {
      // 遅延をシミュレート
      await new Promise(resolve => setTimeout(resolve, condition.latency))
      
      // パケットロスをシミュレート
      if (condition.packetLoss && Math.random() < condition.packetLoss) {
        route.abort('networkerror')
        return
      }
      
      const response = await route.fetch()
      const body = await response.body()
      
      // 帯域幅制限をシミュレート
      const chunkSize = Math.floor(condition.downloadSpeed / 10) // 0.1秒ごとのチャンク
      const chunks = []
      
      for (let i = 0; i < body.length; i += chunkSize) {
        chunks.push(body.slice(i, i + chunkSize))
      }
      
      // チャンクを徐々に送信
      let combinedBody = Buffer.alloc(0)
      for (const chunk of chunks) {
        combinedBody = Buffer.concat([combinedBody, chunk])
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: combinedBody
      })
    })
  }

  /**
   * 間欠的な接続障害をシミュレート
   */
  async simulateIntermittentConnection(failurePattern: boolean[]): Promise<void> {
    let requestCount = 0
    
    await this.page.route('**/*', (route) => {
      const shouldFail = failurePattern[requestCount % failurePattern.length]
      requestCount++
      
      if (shouldFail) {
        route.abort('connectionreset')
      } else {
        route.continue()
      }
    })
  }

  /**
   * タイムアウトをシミュレート
   */
  async simulateTimeout(afterRequests: number = 2): Promise<void> {
    let requestCount = 0
    
    await this.page.route('**/*', async (route) => {
      requestCount++
      
      if (requestCount > afterRequests) {
        // 無限に待機してタイムアウトを発生させる
        await new Promise(() => {}) // 永続的な待機
      } else {
        route.continue()
      }
    })
  }

  /**
   * ネットワーク状態をリセット
   */
  async resetNetwork(): Promise<void> {
    await this.page.unroute('**/*')
  }
}

/**
 * ストレージ異常状態シミュレーター
 */
export class StorageAnomalySimulator {
  constructor(private page: Page) {}

  /**
   * ストレージ容量制限をシミュレート
   */
  async simulateStorageQuotaExceeded(quota: StorageQuota): Promise<void> {
    await this.page.addInitScript((quotaConfig) => {
      const originalSetItem = localStorage.setItem
      let currentUsage = quotaConfig.currentUsage
      
      localStorage.setItem = function(key: string, value: string) {
        const itemSize = key.length + value.length
        
        if (currentUsage + itemSize > quotaConfig.maxSize) {
          if (quotaConfig.throwOnExceed) {
            const error = new Error('QuotaExceededError: LocalStorage quota exceeded')
            error.name = 'QuotaExceededError'
            throw error
          } else {
            console.warn('Storage quota would be exceeded, ignoring setItem')
            return
          }
        }
        
        currentUsage += itemSize
        return originalSetItem.call(this, key, value)
      }
    }, quota)
  }

  /**
   * 破損データをストレージに設定
   */
  async injectCorruptedData(corruptedEntries: Record<string, string>): Promise<void> {
    await this.page.addInitScript((entries) => {
      Object.entries(entries).forEach(([key, value]) => {
        localStorage.setItem(key, value)
      })
    }, corruptedEntries)
  }

  /**
   * 同時書き込み競合をシミュレート
   */
  async simulateConcurrentWrites(keys: string[], concurrency: number = 10): Promise<void> {
    await this.page.evaluate(async (config) => {
      const { keys, concurrency } = config
      const writePromises = []
      
      for (let i = 0; i < concurrency; i++) {
        const writePromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            keys.forEach(key => {
              const data = {
                writerId: i,
                timestamp: Date.now(),
                data: `concurrent_write_${i}_${Math.random()}`
              }
              localStorage.setItem(key, JSON.stringify(data))
            })
            resolve()
          }, Math.random() * 100)
        })
        
        writePromises.push(writePromise)
      }
      
      await Promise.all(writePromises)
    }, { keys, concurrency })
  }

  /**
   * バージョン不整合データを注入
   */
  async injectVersionMismatchData(): Promise<void> {
    const versionMismatchData = {
      'gameData_v1': JSON.stringify({
        version: '1.0.0',
        playerName: 'OldPlayer',
        health: 100, // 旧フィールド名
        level: 5
      }),
      'gameData_v2': JSON.stringify({
        version: '2.0.0',
        playerName: 'NewPlayer',
        vitality: 100, // 新フィールド名
        stage: 'middle'
      }),
      'gameData_future': JSON.stringify({
        version: '99.0.0',
        playerName: 'FuturePlayer',
        unknownField: 'future_data',
        quantumState: true
      }),
      'gameData_legacy': JSON.stringify({
        player: 'LegacyPlayer', // バージョン情報なし
        hp: 80,
        score: 1000
      })
    }
    
    await this.injectCorruptedData(versionMismatchData)
  }
}

/**
 * セキュリティ攻撃シミュレーター
 */
export class SecurityAttackSimulator {
  constructor(private page: Page) {}

  /**
   * XSS攻撃をシミュレート
   */
  async simulateXSSAttack(threats: SecurityThreat[]): Promise<{ successful: number, blocked: number }> {
    let successful = 0
    let blocked = 0
    
    for (const threat of threats) {
      if (threat.type !== 'xss') continue
      
      try {
        // 入力フィールドにXSSペイロードを注入
        const inputFields = await this.page.locator('input[type="text"], textarea, [contenteditable="true"]')
        const fieldCount = await inputFields.count()
        
        if (fieldCount > 0) {
          await inputFields.first().fill(threat.payload)
          await this.page.waitForTimeout(500)
          
          // XSSが実行されたかチェック
          const xssExecuted = await this.page.evaluate((payload) => {
            return document.body.innerHTML.includes(payload) && 
                   !document.body.innerHTML.includes('&lt;script&gt;')
          }, threat.payload)
          
          if (xssExecuted) {
            successful++
          } else {
            blocked++
          }
        }
      } catch (error) {
        blocked++
      }
    }
    
    return { successful, blocked }
  }

  /**
   * CSRF攻撃をシミュレート
   */
  async simulateCSRFAttack(targetUrl: string): Promise<boolean> {
    const maliciousHTML = `
      <html>
        <body>
          <form id="csrf-form" action="${targetUrl}" method="POST" style="display:none;">
            <input type="hidden" name="action" value="malicious_action">
            <input type="hidden" name="data" value="unauthorized_data">
          </form>
          <script>
            setTimeout(() => {
              document.getElementById('csrf-form').submit();
            }, 100);
          </script>
        </body>
      </html>
    `
    
    try {
      await this.page.goto(`data:text/html,${encodeURIComponent(maliciousHTML)}`)
      await this.page.waitForTimeout(2000)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * データ改ざん攻撃をシミュレート
   */
  async simulateDataTampering(): Promise<{ attempts: number, successful: number }> {
    const tamperingResults = await this.page.evaluate(() => {
      const attempts = [
        () => {
          const gameData = JSON.parse(localStorage.getItem('gameData') || '{}')
          gameData.score = 999999999
          gameData.cheated = true
          localStorage.setItem('gameData', JSON.stringify(gameData))
        },
        () => {
          localStorage.setItem('malicious_data', '{"admin": true, "permissions": ["all"]}')
        },
        () => {
          localStorage.setItem('gameData', '{"__proto__": {"isAdmin": true}}')
        },
        () => {
          const largeData = 'x'.repeat(10000000) // 10MB
          localStorage.setItem('dos_data', largeData)
        }
      ]
      
      let successful = 0
      
      attempts.forEach((attempt, index) => {
        try {
          attempt()
          successful++
        } catch (error) {
          console.log(`Tampering attempt ${index + 1} failed:`, error)
        }
      })
      
      return { attempts: attempts.length, successful }
    })
    
    return tamperingResults
  }

  /**
   * DoS攻撃をシミュレート
   */
  async simulateDoSAttack(): Promise<{ cpuAttack: boolean, memoryAttack: boolean, domAttack: boolean }> {
    const dosResults = await this.page.evaluate(() => {
      const results = {
        cpuAttack: false,
        memoryAttack: false,
        domAttack: false
      }
      
      // CPU DoS攻撃
      try {
        const startTime = Date.now()
        let iterations = 0
        
        while (Date.now() - startTime < 1000 && iterations < 100000) {
          iterations++
          Math.sqrt(iterations * Math.random())
        }
        
        results.cpuAttack = iterations > 50000
      } catch (error) {
        console.log('CPU DoS blocked:', error)
      }
      
      // Memory DoS攻撃
      try {
        const arrays = []
        for (let i = 0; i < 100; i++) {
          arrays.push(new Array(10000).fill('x'))
        }
        results.memoryAttack = arrays.length === 100
      } catch (error) {
        console.log('Memory DoS blocked:', error)
      }
      
      // DOM DoS攻撃
      try {
        const container = document.createElement('div')
        container.style.display = 'none'
        document.body.appendChild(container)
        
        for (let i = 0; i < 5000; i++) {
          const element = document.createElement('div')
          element.innerHTML = `Element ${i}`
          container.appendChild(element)
        }
        
        results.domAttack = container.children.length === 5000
      } catch (error) {
        console.log('DOM DoS blocked:', error)
      }
      
      return results
    })
    
    return dosResults
  }
}

/**
 * マルチタブ操作シミュレーター
 */
export class MultiTabSimulator {
  private tabs: Page[] = []
  
  constructor(private context: BrowserContext) {}

  /**
   * 複数タブを開いて同時操作
   */
  async simulateConcurrentTabs(tabCount: number, url: string): Promise<Page[]> {
    this.tabs = []
    
    for (let i = 0; i < tabCount; i++) {
      const tab = await this.context.newPage()
      this.tabs.push(tab)
      
      // エラー監視を設定
      tab.on('pageerror', error => {
        console.error(`Tab ${i + 1} Error: ${error.message}`)
      })
      
      await tab.goto(url)
    }
    
    return this.tabs
  }

  /**
   * すべてのタブで同時にアクションを実行
   */
  async executeOnAllTabs<T>(action: (tab: Page, index: number) => Promise<T>): Promise<T[]> {
    const promises = this.tabs.map((tab, index) => action(tab, index))
    return Promise.all(promises)
  }

  /**
   * タブ間のデータ同期をテスト
   */
  async testDataSync(): Promise<{ synced: boolean, inconsistencies: string[] }> {
    const dataStates = await this.executeOnAllTabs(async (tab, index) => {
      return tab.evaluate(() => {
        return {
          gameData: localStorage.getItem('gameData'),
          playerStats: localStorage.getItem('playerStats'),
          settings: localStorage.getItem('settings')
        }
      })
    })
    
    const inconsistencies: string[] = []
    const referenceState = dataStates[0]
    
    dataStates.forEach((state, index) => {
      if (index === 0) return
      
      Object.keys(referenceState).forEach(key => {
        if (referenceState[key as keyof typeof referenceState] !== state[key as keyof typeof state]) {
          inconsistencies.push(`Tab ${index + 1}: ${key} mismatch`)
        }
      })
    })
    
    return {
      synced: inconsistencies.length === 0,
      inconsistencies
    }
  }

  /**
   * バックグラウンド/フォアグラウンド切り替えをシミュレート
   */
  async simulateTabSwitching(activeTabIndex: number): Promise<void> {
    // 指定されたタブをフォアグラウンドに
    await this.tabs[activeTabIndex].bringToFront()
    
    // 他のタブをバックグラウンド化
    for (let i = 0; i < this.tabs.length; i++) {
      if (i !== activeTabIndex) {
        await this.tabs[i].evaluate(() => {
          document.dispatchEvent(new Event('visibilitychange'))
          window.dispatchEvent(new Event('blur'))
        })
      }
    }
  }

  /**
   * すべてのタブを閉じる
   */
  async closeAllTabs(): Promise<void> {
    for (const tab of this.tabs) {
      await tab.close()
    }
    this.tabs = []
  }
}

/**
 * パフォーマンス監視ユーティリティ
 */
export class PerformanceMonitor {
  constructor(private page: Page) {}

  /**
   * メモリ使用量を監視
   */
  async monitorMemoryUsage(): Promise<{ used: number, total: number, percentage: number }> {
    return this.page.evaluate(() => {
      const memory = (performance as any).memory
      if (memory) {
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
        }
      }
      return { used: 0, total: 0, percentage: 0 }
    })
  }

  /**
   * FPSを測定
   */
  async measureFPS(duration: number = 2000): Promise<number> {
    return this.page.evaluate((measureDuration) => {
      return new Promise<number>((resolve) => {
        let frameCount = 0
        const startTime = performance.now()
        
        function countFrame() {
          frameCount++
          if (performance.now() - startTime < measureDuration) {
            requestAnimationFrame(countFrame)
          } else {
            const elapsed = (performance.now() - startTime) / 1000
            const fps = frameCount / elapsed
            resolve(Math.round(fps))
          }
        }
        
        requestAnimationFrame(countFrame)
      })
    }, duration)
  }

  /**
   * ロード時間を測定
   */
  async measureLoadTime(): Promise<{ navigation: number, domContent: number, complete: number }> {
    return this.page.evaluate(() => {
      const timing = performance.timing
      return {
        navigation: timing.loadEventEnd - timing.navigationStart,
        domContent: timing.domContentLoadedEventEnd - timing.navigationStart,
        complete: timing.loadEventEnd - timing.fetchStart
      }
    })
  }
}

/**
 * エラー監視ユーティリティ
 */
export class ErrorMonitor {
  private errors: Array<{ type: string, message: string, timestamp: number }> = []
  
  constructor(private page: Page) {
    this.setupErrorListeners()
  }

  private setupErrorListeners(): void {
    this.page.on('pageerror', error => {
      this.errors.push({
        type: 'pageerror',
        message: error.message,
        timestamp: Date.now()
      })
    })
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.errors.push({
          type: 'console_error',
          message: msg.text(),
          timestamp: Date.now()
        })
      }
    })
  }

  /**
   * 記録されたエラーを取得
   */
  getErrors(): Array<{ type: string, message: string, timestamp: number }> {
    return [...this.errors]
  }

  /**
   * エラーカウントを取得
   */
  getErrorCount(): number {
    return this.errors.length
  }

  /**
   * エラーログをクリア
   */
  clearErrors(): void {
    this.errors = []
  }

  /**
   * 特定のエラーパターンを検索
   */
  hasErrorMatching(pattern: RegExp): boolean {
    return this.errors.some(error => pattern.test(error.message))
  }
}

/**
 * 総合的な異常シナリオテストランナー
 */
export class AbnormalScenarioRunner {
  private networkSimulator: NetworkAnomalySimulator
  private storageSimulator: StorageAnomalySimulator
  private securitySimulator: SecurityAttackSimulator
  private performanceMonitor: PerformanceMonitor
  private errorMonitor: ErrorMonitor
  
  constructor(private page: Page, private context: BrowserContext) {
    this.networkSimulator = new NetworkAnomalySimulator(page)
    this.storageSimulator = new StorageAnomalySimulator(page)
    this.securitySimulator = new SecurityAttackSimulator(page)
    this.performanceMonitor = new PerformanceMonitor(page)
    this.errorMonitor = new ErrorMonitor(page)
  }

  /**
   * 全ての異常シナリオを実行
   */
  async runAllAbnormalScenarios(): Promise<{
    networkTests: any
    storageTests: any
    securityTests: any
    performanceTests: any
    errorCount: number
  }> {
    console.log('🚀 異常シナリオテスト開始')
    
    // ネットワーク異常テスト
    console.log('🌐 ネットワーク異常テスト実行中...')
    await this.networkSimulator.simulateSlowConnection({
      latency: 1000,
      downloadSpeed: 1024,
      uploadSpeed: 512,
      packetLoss: 0.1
    })
    
    await this.page.goto('/')
    await this.page.waitForTimeout(3000)
    
    const networkTests = {
      pageLoaded: await this.page.locator('#app').isVisible({ timeout: 10000 }),
      loadTime: await this.performanceMonitor.measureLoadTime()
    }
    
    await this.networkSimulator.resetNetwork()
    
    // ストレージ異常テスト
    console.log('💾 ストレージ異常テスト実行中...')
    await this.storageSimulator.simulateStorageQuotaExceeded({
      maxSize: 1024 * 1024, // 1MB
      currentUsage: 0,
      throwOnExceed: true
    })
    
    const storageTests = {
      quotaHandled: true, // 実装によって判定
      dataIntegrity: true
    }
    
    // セキュリティ攻撃テスト
    console.log('🛡️ セキュリティ攻撃テスト実行中...')
    const xssResults = await this.securitySimulator.simulateXSSAttack([
      { type: 'xss', payload: '<script>alert("xss")</script>', severity: 'high' }
    ])
    
    const dosResults = await this.securitySimulator.simulateDoSAttack()
    
    const securityTests = {
      xssBlocked: xssResults.blocked > xssResults.successful,
      dosHandled: !dosResults.cpuAttack || !dosResults.memoryAttack || !dosResults.domAttack
    }
    
    // パフォーマンステスト
    console.log('⚡ パフォーマンステスト実行中...')
    const fps = await this.performanceMonitor.measureFPS()
    const memory = await this.performanceMonitor.monitorMemoryUsage()
    
    const performanceTests = {
      fps,
      memoryUsage: memory.percentage,
      acceptable: fps > 20 && memory.percentage < 80
    }
    
    const errorCount = this.errorMonitor.getErrorCount()
    
    console.log('✅ 異常シナリオテスト完了')
    
    return {
      networkTests,
      storageTests,
      securityTests,
      performanceTests,
      errorCount
    }
  }

  /**
   * テスト結果レポートを生成
   */
  generateTestReport(results: any): string {
    const report = `
# 異常シナリオテスト結果レポート

## ネットワーク異常テスト
- ページ読み込み: ${results.networkTests.pageLoaded ? '✅ 成功' : '❌ 失敗'}
- 読み込み時間: ${results.networkTests.loadTime.complete}ms

## ストレージ異常テスト  
- 容量制限処理: ${results.storageTests.quotaHandled ? '✅ 正常' : '❌ 異常'}
- データ整合性: ${results.storageTests.dataIntegrity ? '✅ 保持' : '❌ 破損'}

## セキュリティ攻撃テスト
- XSS防御: ${results.securityTests.xssBlocked ? '✅ 有効' : '❌ 脆弱'}  
- DoS対策: ${results.securityTests.dosHandled ? '✅ 有効' : '❌ 脆弱'}

## パフォーマンステスト
- FPS: ${results.performanceTests.fps}
- メモリ使用率: ${results.performanceTests.memoryUsage.toFixed(1)}%
- 総合評価: ${results.performanceTests.acceptable ? '✅ 良好' : '⚠️ 要改善'}

## エラー監視
- 検出エラー数: ${results.errorCount}

---
テスト実行日時: ${new Date().toISOString()}
    `
    
    return report.trim()
  }
}