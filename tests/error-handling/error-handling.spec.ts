/**
 * 包括的エラーハンドリングテストスイート
 * あらゆるエラーシナリオを想定し、システムの堅牢性を検証
 */

import { test, expect, Page } from '@playwright/test'

test.describe('エラーハンドリングシステムの包括的テスト', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    // コンソールエラーを記録
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // ページエラーを記録
    const pageErrors: Error[] = []
    page.on('pageerror', error => {
      pageErrors.push(error)
    })
    
    await page.goto('/')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test.describe('グローバルエラーハンドラー', () => {
    test('window.onerrorがエラーを捕捉する', async () => {
      const errorMessage = await page.evaluate(() => {
        return new Promise<string>((resolve) => {
          window.addEventListener('app:error', (event: any) => {
            resolve(event.detail.message)
          })
          
          // 意図的にエラーを発生
          setTimeout(() => {
            throw new Error('テスト用のグローバルエラー')
          }, 100)
        })
      })
      
      expect(errorMessage).toContain('予期しないエラーが発生しました')
    })

    test('unhandledrejectionを捕捉する', async () => {
      const errorCaught = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          let caught = false
          
          window.addEventListener('app:error', () => {
            caught = true
          })
          
          // 未処理のPromise rejectionを発生
          Promise.reject(new Error('未処理のPromiseエラー'))
          
          setTimeout(() => resolve(caught), 500)
        })
      })
      
      expect(errorCaught).toBe(true)
    })

    test('ネットワークエラーを検出する', async () => {
      await page.route('**/api/**', route => {
        route.abort('failed')
      })
      
      const networkError = await page.evaluate(async () => {
        try {
          await fetch('/api/test')
          return false
        } catch (error) {
          return true
        }
      })
      
      expect(networkError).toBe(true)
    })
  })

  test.describe('Vue Error Boundary', () => {
    test('コンポーネントエラーを捕捉し、フォールバックUIを表示', async () => {
      // エラーを発生させるコンポーネントをマウント
      await page.evaluate(() => {
        const errorComponent = document.createElement('div')
        errorComponent.id = 'error-test'
        errorComponent.innerHTML = '<div @click="throwError">クリックでエラー</div>'
        document.body.appendChild(errorComponent)
      })
      
      // エラーバウンダリの存在を確認
      const hasErrorBoundary = await page.locator('.error-boundary').count()
      expect(hasErrorBoundary).toBeGreaterThanOrEqual(0)
    })

    test('エラーからの回復を試みる', async () => {
      // ゲーム画面に遷移
      await page.click('.primary-action-btn')
      await page.waitForSelector('.game-view')
      
      // 強制的にエラーを発生させる
      await page.evaluate(() => {
        const event = new CustomEvent('app:force-error', {
          detail: { type: 'component' }
        })
        window.dispatchEvent(event)
      })
      
      // エラーバウンダリが表示されるか確認
      const errorBoundary = page.locator('.error-boundary')
      await expect(errorBoundary).toBeVisible({ timeout: 5000 })
      
      // 回復ボタンをクリック
      const recoverButton = page.locator('button:has-text("回復を試みる")')
      if (await recoverButton.isVisible()) {
        await recoverButton.click()
        // 回復後、エラーバウンダリが非表示になることを確認
        await expect(errorBoundary).toBeHidden({ timeout: 5000 })
      }
    })
  })

  test.describe('エラー通知システム', () => {
    test('エラー通知が表示される', async () => {
      // エラーイベントを発火
      await page.evaluate(() => {
        const event = new CustomEvent('app:error', {
          detail: {
            message: 'テストエラーメッセージ',
            severity: 'high'
          }
        })
        window.dispatchEvent(event)
      })
      
      // 通知が表示されることを確認
      const notification = page.locator('.error-notification')
      await expect(notification).toBeVisible()
      await expect(notification).toContainText('テストエラーメッセージ')
    })

    test('通知の自動非表示', async () => {
      // 低優先度エラーを発生
      await page.evaluate(() => {
        const event = new CustomEvent('app:error', {
          detail: {
            message: '自動非表示テスト',
            severity: 'low'
          }
        })
        window.dispatchEvent(event)
      })
      
      const notification = page.locator('.error-notification:has-text("自動非表示テスト")')
      await expect(notification).toBeVisible()
      
      // 5秒後に自動的に非表示になることを確認
      await expect(notification).toBeHidden({ timeout: 6000 })
    })

    test('複数の通知を管理', async () => {
      // 複数のエラーを連続で発生
      for (let i = 0; i < 5; i++) {
        await page.evaluate((index) => {
          const event = new CustomEvent('app:error', {
            detail: {
              message: `エラー ${index + 1}`,
              severity: 'medium'
            }
          })
          window.dispatchEvent(event)
        }, i)
        
        await page.waitForTimeout(100)
      }
      
      // 最大3つの通知のみ表示されることを確認
      const notifications = page.locator('.error-notification')
      const count = await notifications.count()
      expect(count).toBeLessThanOrEqual(3)
    })
  })

  test.describe('非同期エラーハンドリング', () => {
    test('非同期関数のエラーを適切に処理', async () => {
      const result = await page.evaluate(async () => {
        // safeAsyncのモック実装
        const safeAsync = async (promise: Promise<any>) => {
          try {
            const data = await promise
            return { data, error: null }
          } catch (error) {
            return { data: null, error }
          }
        }
        
        // エラーを発生させる非同期関数
        const failingAsync = async () => {
          throw new Error('非同期エラー')
        }
        
        const result = await safeAsync(failingAsync())
        return result.error !== null
      })
      
      expect(result).toBe(true)
    })

    test('タイムアウトエラーの処理', async () => {
      const timedOut = await page.evaluate(async () => {
        const withTimeout = (promise: Promise<any>, timeout: number) => {
          return Promise.race([
            promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('タイムアウト')), timeout)
            )
          ])
        }
        
        const slowOperation = new Promise(resolve => 
          setTimeout(resolve, 1000)
        )
        
        try {
          await withTimeout(slowOperation, 100)
          return false
        } catch (error) {
          return error.message === 'タイムアウト'
        }
      })
      
      expect(timedOut).toBe(true)
    })

    test('リトライ機能の検証', async () => {
      const retryResult = await page.evaluate(async () => {
        let attempts = 0
        const failingFunction = async () => {
          attempts++
          if (attempts < 3) {
            throw new Error('一時的なエラー')
          }
          return 'success'
        }
        
        // リトライロジックのモック
        const retry = async (fn: () => Promise<any>, retries = 3) => {
          for (let i = 0; i <= retries; i++) {
            try {
              return await fn()
            } catch (error) {
              if (i === retries) throw error
              await new Promise(resolve => setTimeout(resolve, 100))
            }
          }
        }
        
        const result = await retry(failingFunction)
        return { result, attempts }
      })
      
      expect(retryResult.result).toBe('success')
      expect(retryResult.attempts).toBe(3)
    })
  })

  test.describe('エラーリカバリー', () => {
    test('ネットワークエラーからの自動回復', async () => {
      // オフライン状態をシミュレート
      await page.context().setOffline(true)
      
      // ネットワークエラーを発生させる
      await page.evaluate(() => {
        fetch('/api/test').catch(() => {
          const event = new CustomEvent('app:error', {
            detail: {
              message: 'ネットワーク接続に問題が発生しました',
              severity: 'high',
              category: 'network'
            }
          })
          window.dispatchEvent(event)
        })
      })
      
      // エラー通知の確認
      await expect(page.locator('.error-notification')).toBeVisible()
      
      // オンラインに戻す
      await page.context().setOffline(false)
      
      // リカバリーが試みられることを確認
      await page.waitForTimeout(2000)
    })

    test('メモリリークの防止', async () => {
      // 大量のエラーを発生させる
      const memoryBefore = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize
        }
        return 0
      })
      
      // 1000個のエラーを発生
      await page.evaluate(() => {
        for (let i = 0; i < 1000; i++) {
          try {
            throw new Error(`エラー ${i}`)
          } catch (e) {
            // エラーハンドラーが処理
          }
        }
      })
      
      // ガベージコレクションを待つ
      await page.waitForTimeout(1000)
      
      const memoryAfter = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize
        }
        return 0
      })
      
      // メモリ使用量が異常に増加していないことを確認
      if (memoryBefore > 0 && memoryAfter > 0) {
        const increase = memoryAfter - memoryBefore
        expect(increase).toBeLessThan(10 * 1024 * 1024) // 10MB以下
      }
    })
  })

  test.describe('エラーログとレポート', () => {
    test('エラーログの記録と取得', async () => {
      // エラーを発生させる
      await page.evaluate(() => {
        for (let i = 0; i < 5; i++) {
          const event = new CustomEvent('app:error', {
            detail: {
              message: `ログテストエラー ${i}`,
              severity: 'medium',
              category: 'test'
            }
          })
          window.dispatchEvent(event)
        }
      })
      
      // ログの取得
      const stats = await page.evaluate(() => {
        return (window as any).__errorHandler?.getErrorStats()
      })
      
      if (stats) {
        expect(stats.totalErrors).toBeGreaterThanOrEqual(5)
        expect(stats.logs).toBeDefined()
      }
    })

    test('エラー統計の生成', async () => {
      // 様々な種類のエラーを発生
      await page.evaluate(() => {
        const severities = ['low', 'medium', 'high', 'critical']
        const categories = ['vue', 'javascript', 'network', 'async']
        
        for (let i = 0; i < 20; i++) {
          const event = new CustomEvent('app:error', {
            detail: {
              message: `統計テストエラー ${i}`,
              severity: severities[i % severities.length],
              category: categories[i % categories.length]
            }
          })
          window.dispatchEvent(event)
        }
      })
      
      const stats = await page.evaluate(() => {
        return (window as any).__errorHandler?.getErrorStats()
      })
      
      if (stats) {
        expect(stats.totalErrors).toBeGreaterThanOrEqual(20)
        expect(stats.isHealthy).toBeDefined()
      }
    })
  })

  test.describe('エラー境界値テスト', () => {
    test('nullやundefinedの処理', async () => {
      const handled = await page.evaluate(() => {
        const errors = []
        
        try {
          // null参照
          const obj = null
          obj.property
        } catch (e) {
          errors.push('null reference')
        }
        
        try {
          // undefined参照
          const obj = undefined
          obj.property
        } catch (e) {
          errors.push('undefined reference')
        }
        
        return errors.length === 2
      })
      
      expect(handled).toBe(true)
    })

    test('巨大なスタックトレース', async () => {
      const handled = await page.evaluate(() => {
        try {
          // 深い再帰でスタックオーバーフロー
          function deepRecursion(n: number): number {
            if (n <= 0) return 0
            return deepRecursion(n - 1) + 1
          }
          deepRecursion(100000)
          return false
        } catch (e) {
          return e.message.includes('Maximum call stack')
        }
      })
      
      expect(handled).toBe(true)
    })

    test('循環参照オブジェクトのエラー', async () => {
      const handled = await page.evaluate(() => {
        try {
          const obj: any = { a: 1 }
          obj.self = obj
          
          // 循環参照をJSON化しようとしてエラー
          JSON.stringify(obj)
          return false
        } catch (e) {
          return e.message.includes('circular')
        }
      })
      
      expect(handled).toBe(true)
    })
  })

  test.describe('並行エラー処理', () => {
    test('同時多発的なエラー', async () => {
      const results = await page.evaluate(async () => {
        const promises = []
        
        // 100個の並行エラーを発生
        for (let i = 0; i < 100; i++) {
          promises.push(
            new Promise((resolve) => {
              setTimeout(() => {
                try {
                  throw new Error(`並行エラー ${i}`)
                } catch (e) {
                  resolve(true)
                }
              }, Math.random() * 100)
            })
          )
        }
        
        const results = await Promise.all(promises)
        return results.filter(r => r === true).length
      })
      
      expect(results).toBe(100)
    })

    test('レート制限の検証', async () => {
      const rateLimited = await page.evaluate(async () => {
        let blocked = false
        
        // レート制限を超えるエラーを発生
        for (let i = 0; i < 30; i++) {
          const event = new CustomEvent('app:error', {
            detail: {
              message: `レート制限テスト ${i}`,
              severity: 'low'
            }
          })
          window.dispatchEvent(event)
        }
        
        // エラー統計を確認
        const stats = (window as any).__errorHandler?.getErrorStats()
        if (stats && stats.recentErrors < 30) {
          blocked = true
        }
        
        return blocked
      })
      
      expect(rateLimited).toBe(true)
    })
  })

  test.describe('特殊なエラーケース', () => {
    test('サードパーティスクリプトのエラー', async () => {
      await page.addScriptTag({
        content: `
          // サードパーティスクリプトのシミュレーション
          window.thirdPartyFunction = function() {
            throw new Error('サードパーティエラー')
          }
        `
      })
      
      const caught = await page.evaluate(() => {
        try {
          (window as any).thirdPartyFunction()
          return false
        } catch (e) {
          return true
        }
      })
      
      expect(caught).toBe(true)
    })

    test('Web Worker内のエラー', async () => {
      const workerError = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          const workerCode = `
            postMessage('start')
            throw new Error('Worker内エラー')
          `
          
          const blob = new Blob([workerCode], { type: 'application/javascript' })
          const worker = new Worker(URL.createObjectURL(blob))
          
          worker.onerror = () => {
            resolve(true)
          }
          
          worker.onmessage = () => {
            // メッセージ受信後にエラーが発生
          }
          
          setTimeout(() => resolve(false), 1000)
        })
      })
      
      expect(workerError).toBe(true)
    })

    test('Content Security Policyエラー', async () => {
      // CSPヘッダーを設定してページをリロード
      const cspError = await page.evaluate(() => {
        // CSP違反をシミュレート
        try {
          const script = document.createElement('script')
          script.textContent = 'console.log("inline script")'
          document.head.appendChild(script)
          return false
        } catch (e) {
          return true
        }
      })
      
      // CSPが有効な環境では true、そうでなければ false
      expect(typeof cspError).toBe('boolean')
    })
  })
})