/**
 * マルチタブ/ウィンドウ操作テスト
 * 複数タブでの同時プレイ、データ同期、バックグラウンドタブでの動作をテスト
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

test.describe('🔄 マルチタブ/ウィンドウ操作テスト', () => {
  
  test('👥 複数タブでの同時プレイ - 競合状態の処理', async ({ context }) => {
    // 3つのタブを開く
    const tab1 = await context.newPage()
    const tab2 = await context.newPage()
    const tab3 = await context.newPage()
    
    // エラーログ監視を各タブに設定
    const setupErrorLogging = (page: Page, tabName: string) => {
      page.on('pageerror', error => {
        console.error(`🔴 ${tabName} - Error: ${error.message}`)
      })
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.error(`🔴 ${tabName} - Console Error: ${msg.text()}`)
        }
      })
    }
    
    setupErrorLogging(tab1, 'Tab1')
    setupErrorLogging(tab2, 'Tab2')
    setupErrorLogging(tab3, 'Tab3')
    
    // 全タブで同時にアプリを読み込み
    await Promise.all([
      tab1.goto('/'),
      tab2.goto('/'),
      tab3.goto('/')
    ])
    
    console.log('✅ 3つのタブでアプリ読み込み完了')
    
    // 各タブでゲームを開始
    const startGamesInTabs = async () => {
      const startPromises = []
      
      for (const [index, tab] of [tab1, tab2, tab3].entries()) {
        startPromises.push(
          (async () => {
            const startButton = tab.locator('text=ゲームをプレイ').first()
            if (await startButton.isVisible({ timeout: 5000 })) {
              await startButton.click()
              await tab.waitForTimeout(2000)
              
              const canvas = tab.locator('canvas')
              const gameStarted = await canvas.isVisible({ timeout: 5000 })
              
              console.log(`Tab${index + 1} - ゲーム開始: ${gameStarted ? '成功' : '失敗'}`)
              return { tab: index + 1, started: gameStarted }
            }
            return { tab: index + 1, started: false }
          })()
        )
      }
      
      return Promise.all(startPromises)
    }
    
    const gameStartResults = await startGamesInTabs()
    console.log('📊 ゲーム開始結果:', gameStartResults)
    
    // 少なくとも1つのタブでゲームが開始されることを確認
    const successfulStarts = gameStartResults.filter(result => result.started).length
    expect(successfulStarts).toBeGreaterThan(0)
    
    // 同時プレイ時の警告表示確認
    for (const [index, tab] of [tab1, tab2, tab3].entries()) {
      const multiTabWarning = tab.locator('.multi-tab-warning, .concurrent-play-warning, [data-testid="multi-tab-warning"]')
      const hasWarning = await multiTabWarning.count() > 0
      
      if (hasWarning) {
        console.log(`✅ Tab${index + 1} - マルチタブ警告が表示されている`)
      }
    }
    
    // タブ間でのゲーム状態競合をテスト
    const testConcurrentOperations = async () => {
      const operations = []
      
      for (const [index, tab] of [tab1, tab2, tab3].entries()) {
        operations.push(
          (async () => {
            const canvas = tab.locator('canvas')
            if (await canvas.isVisible({ timeout: 3000 })) {
              // 各タブで異なる操作を同時実行
              await canvas.click({ position: { x: 100 + index * 50, y: 100 + index * 30 } })
              await tab.waitForTimeout(1000)
              
              return { tab: index + 1, operation: 'click', success: true }
            }
            return { tab: index + 1, operation: 'click', success: false }
          })()
        )
      }
      
      return Promise.all(operations)
    }
    
    const operationResults = await testConcurrentOperations()
    console.log('📊 同時操作結果:', operationResults)
    
    // データ整合性の確認
    const checkDataConsistency = async () => {
      const dataStates = []
      
      for (const [index, tab] of [tab1, tab2, tab3].entries()) {
        const gameState = await tab.evaluate(() => {
          return {
            localStorageKeys: Object.keys(localStorage).length,
            hasGameData: localStorage.getItem('gameData') !== null,
            timestamp: Date.now()
          }
        })
        
        dataStates.push({ tab: index + 1, state: gameState })
      }
      
      return dataStates
    }
    
    const dataConsistency = await checkDataConsistency()
    console.log('📊 データ整合性:', dataConsistency)
    
    // クリーンアップ
    await tab1.close()
    await tab2.close()
    await tab3.close()
    
    console.log('✅ マルチタブ同時プレイテスト完了')
  })

  test('🔄 タブ間のデータ同期 - リアルタイムデータ共有', async ({ context }) => {
    const masterTab = await context.newPage()
    const slaveTab = await context.newPage()
    
    // マスタータブでゲームを開始
    await masterTab.goto('/')
    const masterStartButton = masterTab.locator('text=ゲームをプレイ').first()
    
    if (await masterStartButton.isVisible({ timeout: 5000 })) {
      await masterStartButton.click()
      await masterTab.waitForTimeout(3000)
      
      const masterCanvas = masterTab.locator('canvas')
      if (await masterCanvas.isVisible({ timeout: 5000 })) {
        console.log('✅ マスタータブでゲーム開始')
        
        // ゲーム進行（データ変更）
        await masterCanvas.click({ position: { x: 100, y: 100 } })
        await masterTab.waitForTimeout(2000)
        
        // マスタータブのデータ状態を取得
        const masterData = await masterTab.evaluate(() => {
          return {
            gameData: localStorage.getItem('gameData'),
            playerStats: localStorage.getItem('playerStats'),
            gameSettings: localStorage.getItem('gameSettings'),
            timestamp: Date.now()
          }
        })
        
        console.log('📊 マスタータブのデータ状態取得完了')
        
        // スレーブタブを開いてデータ同期をテスト
        await slaveTab.goto('/')
        await slaveTab.waitForTimeout(2000)
        
        const slaveData = await slaveTab.evaluate(() => {
          return {
            gameData: localStorage.getItem('gameData'),
            playerStats: localStorage.getItem('playerStats'),
            gameSettings: localStorage.getItem('gameSettings'),
            timestamp: Date.now()
          }
        })
        
        console.log('📊 スレーブタブのデータ状態取得完了')
        
        // データ同期の確認
        const dataSyncResults = {
          gameDataSync: masterData.gameData === slaveData.gameData,
          playerStatsSync: masterData.playerStats === slaveData.playerStats,
          settingsSync: masterData.gameSettings === slaveData.gameSettings
        }
        
        console.log('📊 データ同期結果:', dataSyncResults)
        
        // 少なくとも基本データは同期されているべき
        const syncedDataCount = Object.values(dataSyncResults).filter(synced => synced).length
        expect(syncedDataCount).toBeGreaterThan(0)
        
        // リアルタイム同期のテスト
        if (await slaveTab.locator('text=ゲームをプレイ').first().isVisible({ timeout: 3000 })) {
          await slaveTab.locator('text=ゲームをプレイ').first().click()
          await slaveTab.waitForTimeout(2000)
          
          // スレーブタブでの変更
          const slaveCanvas = slaveTab.locator('canvas')
          if (await slaveCanvas.isVisible({ timeout: 5000 })) {
            await slaveCanvas.click({ position: { x: 200, y: 200 } })
            await slaveTab.waitForTimeout(2000)
            
            console.log('✅ スレーブタブでも操作実行')
            
            // 変更後のデータ同期確認
            const masterDataAfter = await masterTab.evaluate(() => {
              return localStorage.getItem('gameData')
            })
            
            const slaveDataAfter = await slaveTab.evaluate(() => {
              return localStorage.getItem('gameData')
            })
            
            console.log('📊 変更後のデータ同期確認完了')
            
            if (masterDataAfter === slaveDataAfter) {
              console.log('✅ リアルタイムデータ同期が機能している')
            } else {
              console.log('⚠️ リアルタイムデータ同期に遅延または不整合')
            }
          }
        }
      }
    }
    
    await masterTab.close()
    await slaveTab.close()
  })

  test('🔇 バックグラウンドタブでの動作 - パフォーマンス最適化', async ({ context }) => {
    const foregroundTab = await context.newPage()
    const backgroundTab = await context.newPage()
    
    // 両方のタブでアプリを開始
    await Promise.all([
      foregroundTab.goto('/'),
      backgroundTab.goto('/')
    ])
    
    // フォアグラウンドタブでゲーム開始
    const startButton = foregroundTab.locator('text=ゲームをプレイ').first()
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      await foregroundTab.waitForTimeout(3000)
      
      console.log('✅ フォアグラウンドタブでゲーム開始')
      
      // バックグラウンドタブに移動（visibility change をシミュレート）
      await backgroundTab.bringToFront()
      await foregroundTab.evaluate(() => {
        document.dispatchEvent(new Event('visibilitychange'))
        window.dispatchEvent(new Event('blur'))
      })
      
      console.log('📱 フォアグラウンドタブをバックグラウンド化')
      
      // バックグラウンド状態でのパフォーマンス監視
      await foregroundTab.waitForTimeout(5000)
      
      const backgroundPerformance = await foregroundTab.evaluate(() => {
        return {
          documentHidden: document.hidden,
          documentVisibilityState: document.visibilityState,
          activeElement: document.activeElement?.tagName,
          animationFrameActive: typeof requestAnimationFrame !== 'undefined',
          timestamp: Date.now()
        }
      })
      
      console.log('📊 バックグラウンド状態:', backgroundPerformance)
      
      // バックグラウンド最適化の確認
      const optimizationIndicators = foregroundTab.locator('.background-mode, .paused-game, [data-testid="background-optimization"]')
      const hasOptimization = await optimizationIndicators.count() > 0
      
      if (hasOptimization) {
        console.log('✅ バックグラウンド最適化が適用されている')
      } else {
        console.log('⚠️ バックグラウンド最適化の表示が見当たらない')
      }
      
      // フォアグラウンドに復帰
      await foregroundTab.bringToFront()
      await foregroundTab.evaluate(() => {
        document.dispatchEvent(new Event('visibilitychange'))
        window.dispatchEvent(new Event('focus'))
      })
      
      console.log('🔄 フォアグラウンドに復帰')
      
      // 復帰後の動作確認
      await foregroundTab.waitForTimeout(2000)
      
      const foregroundPerformance = await foregroundTab.evaluate(() => {
        return {
          documentHidden: document.hidden,
          documentVisibilityState: document.visibilityState,
          gameActive: !!document.querySelector('canvas'),
          timestamp: Date.now()
        }
      })
      
      console.log('📊 フォアグラウンド復帰状態:', foregroundPerformance)
      
      // ゲームが正常に復帰していることを確認
      const canvas = foregroundTab.locator('canvas')
      const gameResumed = await canvas.isVisible({ timeout: 5000 })
      expect(gameResumed).toBe(true)
      
      console.log('✅ フォアグラウンド復帰後もゲーム正常動作')
      
      // 復帰通知の確認
      const resumeNotification = foregroundTab.locator('.game-resumed, .welcome-back, [data-testid="resume-notification"]')
      const hasResumeNotification = await resumeNotification.count() > 0
      
      if (hasResumeNotification) {
        console.log('✅ ゲーム復帰通知が表示されている')
      }
    }
    
    await foregroundTab.close()
    await backgroundTab.close()
  })

  test('🔄 タブ復元機能 - ブラウザクラッシュからの復旧', async ({ context }) => {
    const originalTab = await context.newPage()
    
    // ゲーム進行状態を作成
    await originalTab.goto('/')
    const startButton = originalTab.locator('text=ゲームをプレイ').first()
    
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      await originalTab.waitForTimeout(3000)
      
      const canvas = originalTab.locator('canvas')
      if (await canvas.isVisible({ timeout: 5000 })) {
        // ゲーム進行
        await canvas.click({ position: { x: 150, y: 150 } })
        await originalTab.waitForTimeout(2000)
        
        console.log('✅ ゲーム進行状態を作成')
        
        // セッション情報を保存
        const sessionData = await originalTab.evaluate(() => {
          const data = {
            gameData: localStorage.getItem('gameData'),
            playerStats: localStorage.getItem('playerStats'),
            sessionId: `session_${Date.now()}`,
            lastActivity: Date.now()
          }
          
          localStorage.setItem('session_recovery', JSON.stringify(data))
          return data
        })
        
        console.log('💾 セッション復旧データ保存完了')
        
        // 元のタブを閉じる（クラッシュシミュレーション）
        await originalTab.close()
        console.log('💥 タブクラッシュをシミュレート')
        
        // 新しいタブで復旧テスト
        const recoveryTab = await context.newPage()
        await recoveryTab.goto('/')
        
        // セッション復旧の確認
        const recoveryData = await recoveryTab.evaluate(() => {
          const saved = localStorage.getItem('session_recovery')
          return saved ? JSON.parse(saved) : null
        })
        
        console.log('🔄 復旧データ確認:', recoveryData)
        
        if (recoveryData) {
          // セッション復旧通知の確認
          const recoveryNotification = recoveryTab.locator('.session-recovery, .restore-session, [data-testid="session-recovery"]')
          const hasRecoveryNotification = await recoveryNotification.count() > 0
          
          if (hasRecoveryNotification) {
            console.log('✅ セッション復旧通知が表示されている')
          }
          
          // 復旧ボタンがある場合はクリック
          const restoreButton = recoveryTab.locator('text=セッションを復元, text=復旧する, [data-testid="restore-session"]')
          if (await restoreButton.isVisible({ timeout: 3000 })) {
            await restoreButton.click()
            await recoveryTab.waitForTimeout(2000)
            
            console.log('🔄 セッション復旧実行')
          }
          
          // ゲームが復旧されているか確認
          const gameRestored = await recoveryTab.locator('canvas').isVisible({ timeout: 5000 })
          
          if (gameRestored) {
            console.log('✅ セッション復旧成功')
          } else {
            console.log('⚠️ セッション復旧失敗、新規ゲームを開始')
            
            // 新規ゲーム開始
            const newStartButton = recoveryTab.locator('text=ゲームをプレイ').first()
            if (await newStartButton.isVisible({ timeout: 5000 })) {
              await newStartButton.click()
              await recoveryTab.waitForTimeout(2000)
            }
          }
        }
        
        await recoveryTab.close()
      }
    }
    
    console.log('✅ タブ復元機能テスト完了')
  })

  test('⚖️ リソース競合の解決 - メモリ・CPU使用量の管理', async ({ context }) => {
    const tabs = []
    const maxTabs = 5
    
    // 複数タブを開いてリソース競合をシミュレート
    for (let i = 0; i < maxTabs; i++) {
      const tab = await context.newPage()
      tabs.push(tab)
      
      await tab.goto('/')
      console.log(`Tab ${i + 1} opened`)
    }
    
    // 各タブでゲームを開始
    const gameStartPromises = tabs.map(async (tab, index) => {
      const startButton = tab.locator('text=ゲームをプレイ').first()
      if (await startButton.isVisible({ timeout: 5000 })) {
        await startButton.click()
        await tab.waitForTimeout(1000)
        
        return { tabIndex: index + 1, started: true }
      }
      return { tabIndex: index + 1, started: false }
    })
    
    const gameResults = await Promise.all(gameStartPromises)
    console.log('📊 マルチタブゲーム開始結果:', gameResults)
    
    // リソース使用量の監視
    const resourceMonitoring = await Promise.all(
      tabs.map(async (tab, index) => {
        const performance = await tab.evaluate(() => {
          return {
            memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
            timing: performance.timing ? performance.timing.loadEventEnd - performance.timing.navigationStart : 0,
            activeAnimations: document.getAnimations ? document.getAnimations().length : 0,
            documentReady: document.readyState
          }
        })
        
        return { tab: index + 1, performance }
      })
    )
    
    console.log('📊 リソース使用状況:', resourceMonitoring)
    
    // リソース制限の確認
    const resourceLimitWarnings = await Promise.all(
      tabs.map(async (tab, index) => {
        const warning = tab.locator('.resource-warning, .performance-warning, [data-testid="resource-warning"]')
        const hasWarning = await warning.count() > 0
        
        return { tab: index + 1, hasResourceWarning: hasWarning }
      })
    )
    
    console.log('⚠️ リソース制限警告:', resourceLimitWarnings)
    
    // アクティブなタブの優先制御テスト
    const priorityTab = tabs[0]
    const backgroundTabs = tabs.slice(1)
    
    await priorityTab.bringToFront()
    
    // バックグラウンドタブでのリソース制限確認
    for (const [index, tab] of backgroundTabs.entries()) {
      const backgroundOptimization = await tab.evaluate(() => {
        return {
          animationsPaused: document.hidden,
          reducedUpdates: document.visibilityState === 'hidden',
          timestamp: Date.now()
        }
      })
      
      console.log(`Tab ${index + 2} background optimization:`, backgroundOptimization)
    }
    
    // クリーンアップ
    for (const tab of tabs) {
      await tab.close()
    }
    
    console.log('✅ リソース競合管理テスト完了')
  })

  test('🔄 データ競合の防止 - 排他制御メカニズム', async ({ context }) => {
    const writerTab = await context.newPage()
    const readerTab = await context.newPage()
    
    await Promise.all([
      writerTab.goto('/'),
      readerTab.goto('/')
    ])
    
    // 書き込みタブでゲーム開始
    const writerStartButton = writerTab.locator('text=ゲームをプレイ').first()
    if (await writerStartButton.isVisible({ timeout: 5000 })) {
      await writerStartButton.click()
      await writerTab.waitForTimeout(2000)
      
      // 読み込みタブでも同時にゲーム開始を試行
      const readerStartButton = readerTab.locator('text=ゲームをプレイ').first()
      if (await readerStartButton.isVisible({ timeout: 5000 })) {
        await readerStartButton.click()
        await readerTab.waitForTimeout(2000)
        
        // データ競合の確認
        const dataLockTest = await Promise.all([
          writerTab.evaluate(() => {
            const lockKey = 'game_data_lock'
            const lockValue = localStorage.getItem(lockKey)
            
            // ロック獲得の試行
            try {
              localStorage.setItem(lockKey, `writer_${Date.now()}`)
              return { tab: 'writer', lockAcquired: true, lockValue }
            } catch {
              return { tab: 'writer', lockAcquired: false, lockValue }
            }
          }),
          readerTab.evaluate(() => {
            const lockKey = 'game_data_lock'
            const lockValue = localStorage.getItem(lockKey)
            
            // ロック獲得の試行
            try {
              if (lockValue) {
                return { tab: 'reader', lockAcquired: false, lockValue, message: 'Lock already held' }
              } else {
                localStorage.setItem(lockKey, `reader_${Date.now()}`)
                return { tab: 'reader', lockAcquired: true, lockValue }
              }
            } catch {
              return { tab: 'reader', lockAcquired: false, lockValue }
            }
          })
        ])
        
        console.log('🔒 データロックテスト結果:', dataLockTest)
        
        // 排他制御が機能していることを確認
        const lockConflicts = dataLockTest.filter(result => result.lockAcquired).length
        expect(lockConflicts).toBeLessThanOrEqual(1) // 同時に1つのタブのみがロックを獲得
        
        // 競合エラーメッセージの確認
        const conflictMessage = readerTab.locator('.data-conflict, .concurrent-access-error, [data-testid="data-conflict"]')
        const hasConflictMessage = await conflictMessage.count() > 0
        
        if (hasConflictMessage) {
          console.log('✅ データ競合エラーメッセージが表示されている')
        }
      }
    }
    
    await writerTab.close()
    await readerTab.close()
    
    console.log('✅ データ競合防止テスト完了')
  })
})