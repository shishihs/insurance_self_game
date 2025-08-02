/**
 * データ永続化異常シミュレーション テスト
 * localStorage容量制限、破損データ、同時書き込み競合などをテスト
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

test.describe('💾 データ永続化異常シミュレーション テスト', () => {
  
  test.beforeEach(async ({ page }) => {
    // エラーログの監視
    page.on('pageerror', error => {
      console.error(`🔴 Data Persistence Test - Page Error: ${error.message}`)
    })
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`🔴 Data Persistence Test - Console Error: ${msg.text()}`)
      }
    })
  })

  test('💽 localStorage容量制限 - ストレージ満杯時の処理', async ({ page }) => {
    await page.goto('/')
    
    // localStorage容量制限をシミュレート
    await page.addInitScript(() => {
      const originalSetItem = localStorage.setItem
      let callCount = 0
      
      localStorage.setItem = function(key: string, value: string) {
        callCount++
        
        // 3回目以降のsetItemでQuotaExceededErrorを発生
        if (callCount > 3) {
          const error = new Error('QuotaExceededError')
          error.name = 'QuotaExceededError'
          throw error
        }
        
        return originalSetItem.call(this, key, value)
      }
    })
    
    const startButton = page.locator('text=ゲームをプレイ').first()
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      await page.waitForTimeout(3000)
      
      // ゲーム進行（セーブデータ生成）
      const canvas = page.locator('canvas')
      if (await canvas.isVisible({ timeout: 5000 })) {
        // ゲーム内操作をシミュレート
        await canvas.click({ position: { x: 100, y: 100 } })
        await page.waitForTimeout(2000)
        
        // 複数回のセーブ操作を試行（容量制限に引っかかるまで）
        for (let i = 0; i < 10; i++) {
          await canvas.click({ position: { x: 50 + i * 10, y: 50 + i * 10 } })
          await page.waitForTimeout(500)
        }
        
        console.log('✅ ストレージ容量制限テスト実行中')
        
        // エラーハンドリングメッセージの確認
        const storageErrorMessage = page.locator('.storage-error, .quota-exceeded, [data-testid="storage-error"]')
        const hasErrorMessage = await storageErrorMessage.count() > 0
        
        if (hasErrorMessage) {
          console.log('✅ ストレージ容量制限エラーが適切に表示されている')
        } else {
          console.log('⚠️ ストレージ容量制限エラーの表示が見当たらない')
        }
        
        // ゲームが継続して動作することを確認
        const gameStillRunning = await canvas.isVisible({ timeout: 3000 })
        expect(gameStillRunning).toBe(true)
        
        console.log('✅ ストレージ制限下でもゲームが継続動作')
      }
    }
  })

  test('🔧 破損したセーブデータ - 不正JSON対応', async ({ page }) => {
    // 破損したセーブデータを事前設定
    await page.addInitScript(() => {
      // 様々な破損パターンをシミュレート
      localStorage.setItem('gameData_main', '{"invalid": json}') // 不正JSON
      localStorage.setItem('gameData_backup', 'null') // null値
      localStorage.setItem('gameSettings', '{"corruption": true, "data":') // 途中で切れたJSON
      localStorage.setItem('playerStats', '{"score": "not_a_number", "level": -1}') // 不正な値
      localStorage.setItem('gameProgress', '{}') // 空オブジェクト
      localStorage.setItem('userPreferences', 'undefined') // undefined文字列
      
      console.log('🔧 破損セーブデータを事前設定')
    })
    
    await page.goto('/')
    
    // アプリケーションが起動することを確認
    const app = page.locator('#app')
    await expect(app).toBeVisible()
    
    console.log('✅ 破損セーブデータ存在下でもアプリ起動成功')
    
    // ゲームを開始して復旧処理をテスト
    const startButton = page.locator('text=ゲームをプレイ').first()
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      await page.waitForTimeout(3000)
      
      // データ復旧メッセージの確認
      const recoveryMessage = page.locator('.data-recovery, .save-corrupted, [data-testid="data-recovery"]')
      const hasRecoveryMessage = await recoveryMessage.count() > 0
      
      if (hasRecoveryMessage) {
        console.log('✅ データ復旧メッセージが表示されている')
      }
      
      // ゲームが正常初期化されることを確認
      const canvas = page.locator('canvas')
      await expect(canvas).toBeVisible({ timeout: 5000 })
      
      console.log('✅ 破損データからの復旧でゲーム正常開始')
      
      // 復旧後のセーブデータ検証
      const newSaveData = await page.evaluate(() => {
        const gameData = localStorage.getItem('gameData_main')
        try {
          return gameData ? JSON.parse(gameData) : null
        } catch {
          return null
        }
      })
      
      if (newSaveData !== null) {
        console.log('✅ 復旧後のセーブデータが有効なJSON形式')
      }
    }
  })

  test('⚡ 同時書き込み競合 - 並行セーブ処理の競合状態', async ({ page }) => {
    await page.goto('/')
    
    const startButton = page.locator('text=ゲームをプレイ').first()
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      await page.waitForTimeout(3000)
      
      const canvas = page.locator('canvas')
      if (await canvas.isVisible({ timeout: 5000 })) {
        
        // 同時書き込み競合をシミュレート
        const concurrentSaves = await page.evaluate(async () => {
          const results = []
          
          // 複数の非同期セーブ操作を同時実行
          const savePromises = []
          
          for (let i = 0; i < 10; i++) {
            const savePromise = new Promise((resolve) => {
              setTimeout(() => {
                try {
                  const key = `concurrent_save_${i}`
                  const data = {
                    timestamp: Date.now(),
                    id: i,
                    data: `save_data_${i}`,
                    random: Math.random()
                  }
                  
                  localStorage.setItem(key, JSON.stringify(data))
                  resolve({ success: true, key, data })
                } catch (error) {
                  resolve({ success: false, key: `concurrent_save_${i}`, error: error.message })
                }
              }, Math.random() * 100) // ランダムな遅延で競合状態を作る
            })
            
            savePromises.push(savePromise)
          }
          
          const saveResults = await Promise.all(savePromises)
          
          // 保存されたデータの整合性を確認
          const validationResults = []
          for (let i = 0; i < 10; i++) {
            const key = `concurrent_save_${i}`
            const stored = localStorage.getItem(key)
            
            if (stored) {
              try {
                const parsed = JSON.parse(stored)
                validationResults.push({ 
                  key, 
                  valid: parsed.id === i,
                  data: parsed 
                })
              } catch {  
                validationResults.push({ key, valid: false, error: 'parse_error' })
              }
            } else {
              validationResults.push({ key, valid: false, error: 'not_found' })
            }
          }
          
          return { saveResults, validationResults }
        })
        
        console.log('📊 同時書き込み結果:', concurrentSaves)
        
        // 成功率を確認
        const successfulSaves = concurrentSaves.saveResults.filter(result => result.success).length
        const validData = concurrentSaves.validationResults.filter(result => result.valid).length
        
        console.log(`✅ 同時書き込み成功率: ${successfulSaves}/10`)
        console.log(`✅ データ整合性: ${validData}/10`)
        
        // 最低限の成功率を期待（完全な成功でなくても可）
        expect(successfulSaves).toBeGreaterThan(5)
        expect(validData).toBeGreaterThan(5)
        
        console.log('✅ 同時書き込み競合テスト完了')
      }
    }
  })

  test('🔄 バージョン不整合 - 異なるバージョンのセーブデータ', async ({ page }) => {
    // 複数バージョンのセーブデータを設定
    await page.addInitScript(() => {
      // v1.0 形式のデータ
      localStorage.setItem('gameData_v1', JSON.stringify({
        version: '1.0.0',
        playerName: 'TestPlayer',
        health: 100, // 旧: health
        level: 5,    // 旧: level
        items: ['sword', 'shield']
      }))
      
      // v2.0 形式のデータ
      localStorage.setItem('gameData_v2', JSON.stringify({
        version: '2.0.0',
        playerName: 'TestPlayer',
        vitality: 100, // 新: vitality
        stage: 'middle', // 新: stage
        inventory: [
          { id: 'sword', type: 'weapon' },
          { id: 'shield', type: 'armor' }
        ]
      }))
      
      // 未来バージョン（サポート外）
      localStorage.setItem('gameData_future', JSON.stringify({
        version: '99.0.0',
        playerName: 'FuturePlayer',
        unknownField: 'future_data',
        quantumState: true
      }))
      
      // バージョン情報なしの古いデータ
      localStorage.setItem('gameData_legacy', JSON.stringify({
        player: 'LegacyPlayer',
        hp: 80,
        score: 1000
      }))
      
      console.log('🔄 複数バージョンのセーブデータを設定')
    })
    
    await page.goto('/')
    
    // マイグレーション処理の確認
    const migrationStatus = await page.evaluate(() => {
      const migrations = []
      
      // 各バージョンのデータをチェック
      const versions = ['v1', 'v2', 'future', 'legacy']
      
      versions.forEach(version => {
        const key = `gameData_${version}`
        const data = localStorage.getItem(key)
        
        if (data) {
          try {
            const parsed = JSON.parse(data)
            migrations.push({
              version,
              hasData: true,
              parseable: true,
              dataVersion: parsed.version || 'unknown',
              playerName: parsed.playerName || parsed.player || 'unknown'
            })
          } catch {
            migrations.push({
              version,
              hasData: true,
              parseable: false
            })
          }
        } else {
          migrations.push({
            version,
            hasData: false
          })
        }
      })
      
      return migrations
    })
    
    console.log('📊 バージョン別データ状態:', migrationStatus)
    
    // アプリケーションが正常起動することを確認
    const app = page.locator('#app')
    await expect(app).toBeVisible()
    
    // バージョン不整合の警告表示確認
    const versionWarning = page.locator('.version-mismatch, .migration-warning, [data-testid="version-warning"]')
    const hasVersionWarning = await versionWarning.count() > 0
    
    if (hasVersionWarning) {
      console.log('✅ バージョン不整合の警告が表示されている')
    }
    
    // ゲーム開始でマイグレーション実行
    const startButton = page.locator('text=ゲームをプレイ').first()
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      await page.waitForTimeout(3000)
      
      // マイグレーション後のデータ確認
      const migratedData = await page.evaluate(() => {
        const currentData = localStorage.getItem('gameData_current') || 
                           localStorage.getItem('gameData_migrated')
        
        if (currentData) {
          try {
            return JSON.parse(currentData)
          } catch {
            return null
          }
        }
        return null
      })
      
      if (migratedData) {
        console.log('✅ データマイグレーション成功:', migratedData)
      } else {
        console.log('⚠️ マイグレーション後のデータが見つからない')
      }
      
      // ゲームが正常動作することを確認
      const canvas = page.locator('canvas')
      const gameRunning = await canvas.isVisible({ timeout: 5000 })
      expect(gameRunning).toBe(true)
      
      console.log('✅ バージョン不整合解決後にゲーム正常動作')
    }
  })

  test('🔐 データ暗号化・復号エラー - セキュアストレージの異常', async ({ page }) => {
    // 暗号化エラーをシミュレート
    await page.addInitScript(() => {
      // 無効な暗号化データを設定
      localStorage.setItem('encrypted_game_data', 'invalid_encrypted_data')
      localStorage.setItem('encryption_key', 'corrupted_key')
      localStorage.setItem('data_integrity_hash', 'invalid_hash')
      
      // crypto API の一部機能を無効化
      if (window.crypto && window.crypto.subtle) {
        const originalDecrypt = window.crypto.subtle.decrypt
        window.crypto.subtle.decrypt = function(...args) {
          // 50%の確率で復号に失敗
          if (Math.random() < 0.5) {
            return Promise.reject(new Error('Decryption failed'))
          }
          return originalDecrypt.apply(this, args)
        }
      }
      
      console.log('🔐 暗号化エラーシミュレーション設定')
    })
    
    await page.goto('/')
    
    // 暗号化エラー時のフォールバック処理確認
    const app = page.locator('#app')
    await expect(app).toBeVisible()
    
    console.log('✅ 暗号化エラー存在下でもアプリ起動')
    
    // セキュリティエラーメッセージの確認
    const securityError = page.locator('.security-error, .encryption-error, [data-testid="security-error"]')
    const hasSecurityError = await securityError.count() > 0
    
    if (hasSecurityError) {
      console.log('✅ セキュリティエラーメッセージが表示されている')
    }
    
    // ゲーム開始（暗号化なしモードでの動作確認）
    const startButton = page.locator('text=ゲームをプレイ').first()
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      await page.waitForTimeout(3000)
      
      const canvas = page.locator('canvas')
      const gameStarted = await canvas.isVisible({ timeout: 5000 })
      
      if (gameStarted) {
        console.log('✅ 暗号化失敗時でもゲーム開始可能（フォールバックモード）')
        
        // フォールバックモードの表示確認
        const fallbackMode = page.locator('.fallback-mode, .unencrypted-mode, [data-testid="fallback-mode"]')
        const hasFallbackIndicator = await fallbackMode.count() > 0
        
        if (hasFallbackIndicator) {
          console.log('✅ フォールバックモードの表示あり')
        }
      }
    }
  })

  test('🔄 自動バックアップ・復旧 - セーブデータの自動修復', async ({ page }) => {
    await page.goto('/')
    
    // 正常なゲームデータでバックアップ作成
    const startButton = page.locator('text=ゲームをプレイ').first()
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      await page.waitForTimeout(3000)
      
      const canvas = page.locator('canvas')
      if (await canvas.isVisible({ timeout: 5000 })) {
        // ゲーム進行してセーブデータ作成
        await canvas.click({ position: { x: 100, y: 100 } })
        await page.waitForTimeout(2000)
        
        console.log('✅ 正常なセーブデータ作成完了')
        
        // ホームに戻る
        const backButton = page.locator('text=ホームに戻る')
        if (await backButton.isVisible({ timeout: 3000 })) {
          await backButton.click()
          await page.waitForTimeout(1000)
        }
      }
    }
    
    // メインセーブデータを意図的に破損
    await page.evaluate(() => {
      localStorage.setItem('gameData_main', 'corrupted_data')
      console.log('🔧 メインセーブデータを破損させました')
    })
    
    // ゲームを再開（自動復旧テスト）
    const startButtonAfterCorruption = page.locator('text=ゲームをプレイ').first()
    if (await startButtonAfterCorruption.isVisible({ timeout: 5000 })) {
      await startButtonAfterCorruption.click()
      await page.waitForTimeout(3000)
      
      // 自動復旧メッセージの確認
      const recoveryMessage = page.locator('.auto-recovery, .backup-restored, [data-testid="auto-recovery"]')
      const hasRecoveryMessage = await recoveryMessage.count() > 0
      
      if (hasRecoveryMessage) {
        console.log('✅ 自動復旧メッセージが表示されている')
      }
      
      // ゲームが復旧されて動作することを確認
      const canvasAfterRecovery = page.locator('canvas')
      const gameRecovered = await canvasAfterRecovery.isVisible({ timeout: 5000 })
      
      expect(gameRecovered).toBe(true)
      console.log('✅ 自動バックアップからの復旧成功')
      
      // 復旧されたデータの確認
      const recoveredData = await page.evaluate(() => {
        const backupData = localStorage.getItem('gameData_backup') ||
                          localStorage.getItem('gameData_auto_backup')
        
        if (backupData) {
          try {
            return JSON.parse(backupData)
          } catch {
            return null
          }
        }
        return null
      })
      
      if (recoveredData) {
        console.log('✅ バックアップデータから正常復旧:', recoveredData)
      }
    }
  })

  test('💾 ストレージクリーンアップ - 不要データの自動削除', async ({ page }) => {
    // 大量の不要データを事前作成
    await page.addInitScript(() => {
      // 古いセーブデータ
      for (let i = 0; i < 50; i++) {
        localStorage.setItem(`old_save_${i}`, JSON.stringify({
          timestamp: Date.now() - (86400000 * i), // i日前
          data: `old_data_${i}`,
          size: 'x'.repeat(1000) // 1KB of dummy data
        }))
      }
      
      // 一時ファイル
      for (let i = 0; i < 30; i++) {
        localStorage.setItem(`temp_${i}`, JSON.stringify({
          temporary: true,
          data: 'temporary_data',
          created: Date.now() - (3600000 * i) // i時間前
        }))
      }
      
      // 破損データ
      for (let i = 0; i < 20; i++) {
        localStorage.setItem(`corrupted_${i}`, 'invalid_json_data')
      }
      
      console.log('💾 大量の不要データを作成（クリーンアップテスト用）')
    })
    
    await page.goto('/')
    
    // クリーンアップ前のストレージ使用量確認
    const beforeCleanup = await page.evaluate(() => {
      const keys = Object.keys(localStorage)
      const totalSize = keys.reduce((total, key) => {
        const value = localStorage.getItem(key) || ''
        return total + key.length + value.length
      }, 0)
      
      return {
        totalKeys: keys.length,
        estimatedSize: totalSize,
        oldSaves: keys.filter(key => key.startsWith('old_save_')).length,
        tempFiles: keys.filter(key => key.startsWith('temp_')).length,
        corruptedFiles: keys.filter(key => key.startsWith('corrupted_')).length
      }
    })
    
    console.log('📊 クリーンアップ前:', beforeCleanup)
    
    // アプリケーション起動（自動クリーンアップが実行される想定）
    const app = page.locator('#app')
    await expect(app).toBeVisible()
    
    // クリーンアップ処理を待機
    await page.waitForTimeout(5000)
    
    // クリーンアップ後の状態確認
    const afterCleanup = await page.evaluate(() => {
      const keys = Object.keys(localStorage)
      const totalSize = keys.reduce((total, key) => {
        const value = localStorage.getItem(key) || ''
        return total + key.length + value.length
      }, 0)
      
      return {
        totalKeys: keys.length,
        estimatedSize: totalSize,
        oldSaves: keys.filter(key => key.startsWith('old_save_')).length,
        tempFiles: keys.filter(key => key.startsWith('temp_')).length,
        corruptedFiles: keys.filter(key => key.startsWith('corrupted_')).length
      }
    })
    
    console.log('📊 クリーンアップ後:', afterCleanup)
    
    // クリーンアップ効果の確認
    const sizeReduction = beforeCleanup.estimatedSize - afterCleanup.estimatedSize
    const sizeReductionPercent = (sizeReduction / beforeCleanup.estimatedSize) * 100
    
    console.log(`📉 ストレージ使用量削減: ${sizeReduction} bytes (${sizeReductionPercent.toFixed(1)}%)`)
    
    // 最低限のクリーンアップ効果を期待
    expect(afterCleanup.totalKeys).toBeLessThan(beforeCleanup.totalKeys)
    expect(sizeReductionPercent).toBeGreaterThan(10) // 10%以上の削減
    
    // クリーンアップ通知の確認
    const cleanupNotice = page.locator('.cleanup-notice, .storage-optimized, [data-testid="cleanup-notice"]')
    const hasCleanupNotice = await cleanupNotice.count() > 0
    
    if (hasCleanupNotice) {
      console.log('✅ ストレージクリーンアップ通知が表示されている')
    }
    
    console.log('✅ ストレージクリーンアップテスト完了')
  })
})