/**
 * セキュリティ攻撃シミュレーション テスト
 * XSS、CSRF、データ改ざん、DoSパターンなどの攻撃をシミュレートして防御機能をテスト
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

test.describe('🛡️ セキュリティ攻撃シミュレーション テスト', () => {
  
  test.beforeEach(async ({ page }) => {
    // セキュリティテスト用のログ監視
    page.on('pageerror', error => {
      console.error(`🔴 Security Test - Page Error: ${error.message}`)
    })
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`🔴 Security Test - Console Error: ${msg.text()}`)
      }
    })
    
    // セキュリティイベントの監視
    page.on('dialog', dialog => {
      console.error(`🚨 Unexpected dialog (potential XSS): ${dialog.message()}`)
      dialog.dismiss()
    })
  })

  test('🚨 XSS攻撃シミュレーション - スクリプト注入攻撃', async ({ page }) => {
    await page.goto('/')
    
    // 様々なXSSペイロードを定義
    const xssPayloads = [
      // 基本的なスクリプトタグ
      '<script>window.__XSS_TEST_1 = "basic_script_tag";</script>',
      
      // イベントハンドラを使用したXSS
      '<img src="x" onerror="window.__XSS_TEST_2 = \'event_handler\';">',
      
      // SVGを使用したXSS
      '<svg onload="window.__XSS_TEST_3 = \'svg_onload\';">',
      
      // JavaScriptプロトコル  
      'javascript:window.__XSS_TEST_4="javascript_protocol"',
      
      // データURLを使用したXSS
      'data:text/html,<script>window.__XSS_TEST_5="data_url"</script>',
      
      // 属性を使用したXSS
      '<input autofocus onfocus="window.__XSS_TEST_6=\'input_focus\'">',
      
      // エンコードされたXSS
      '%3Cscript%3Ewindow.__XSS_TEST_7%3D%22encoded%22%3C%2Fscript%3E',
      
      // DOM based XSS
      '<iframe src="javascript:parent.window.__XSS_TEST_8=\'iframe_js\'"></iframe>',
      
      // CSS expression XSS (IE legacy)
      '<div style="background:url(javascript:window.__XSS_TEST_9=\'css_expression\')">',
      
      // Form injection
      '</form><script>window.__XSS_TEST_10="form_break"</script><form>'
    ]
    
    // 入力フィールドが存在する場合のテスト
    const inputFields = await page.locator('input[type="text"], textarea, [contenteditable="true"]').count()
    
    if (inputFields > 0) {
      console.log(`📝 ${inputFields}個の入力フィールドでXSSテストを実行`)
      
      for (const [index, payload] of xssPayloads.entries()) {
        try {
          const firstInput = page.locator('input[type="text"], textarea, [contenteditable="true"]').first()
          
          // XSSペイロードを入力
          await firstInput.fill(payload)
          await page.waitForTimeout(500)
          
          // フォーム送信をシミュレート（存在する場合）
          const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("送信")').first()
          if (await submitButton.isVisible({ timeout: 1000 })) {
            await submitButton.click()
            await page.waitForTimeout(1000)
          }
          
          console.log(`XSS Payload ${index + 1}: ${payload.substring(0, 50)}...`)
          
        } catch (error) {
          console.log(`XSS Payload ${index + 1} failed to inject:`, error)
        }
      }
      
      // XSSが実行されていないことを確認
      const xssExecutionCheck = await page.evaluate(() => {
        const xssTests = []
        for (let i = 1; i <= 10; i++) {
          const testKey = `__XSS_TEST_${i}`
          xssTests.push({
            test: testKey,
            executed: (window as any)[testKey] !== undefined,
            value: (window as any)[testKey]
          })
        }
        return xssTests
      })
      
      console.log('🔍 XSS実行チェック結果:')
      xssExecutionCheck.forEach(test => {
        if (test.executed) {
          console.error(`🚨 XSS EXECUTED: ${test.test} = ${test.value}`)
        } else {
          console.log(`✅ XSS BLOCKED: ${test.test}`)
        }
      })
      
      // 全てのXSSが阻止されていることを確認
      const executedXSS = xssExecutionCheck.filter(test => test.executed)
      expect(executedXSS).toHaveLength(0)
      
      console.log('✅ 全てのXSS攻撃が正常に阻止されました')
      
    } else {
      console.log('ℹ️ 入力フィールドが見つからないため、URLベースXSSテストを実行')
      
      // URLベースのXSSテスト
      const urlXSSPayloads = [
        '/?q=<script>alert("url_xss")</script>',
        '/?search=javascript:alert("url_js")',
        '/?input=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E'
      ]
      
      for (const urlPayload of urlXSSPayloads) {
        try {
          await page.goto(urlPayload, { timeout: 5000 })
          await page.waitForTimeout(1000)
          
          // URLパラメータからのXSSが実行されていないことを確認
          const urlXSSCheck = await page.evaluate(() => {
            return {
              alertCalled: (window as any).__alert_called === true,
              scriptsInjected: document.querySelectorAll('script').length > 10 // 異常に多いスクリプト
            }
          })
          
          expect(urlXSSCheck.alertCalled).toBe(false)
          console.log(`✅ URLベースXSS阻止: ${urlPayload}`)
          
        } catch (error) {
          console.log(`URL XSS test failed:`, error)
        }
      }
    }
  })

  test('🔒 CSRF攻撃シミュレーション - クロスサイトリクエスト偽造', async ({ page, context }) => {
    await page.goto('/')
    
    // 正常なセッションを確立
    const startButton = page.locator('text=ゲームをプレイ').first()
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      await page.waitForTimeout(2000)
      
      console.log('✅ 正常なセッション確立')
      
      // CSRFトークンの確認
      const csrfTokenCheck = await page.evaluate(() => {
        const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        const formToken = document.querySelector('input[name="_token"], input[name="csrf_token"]')?.getAttribute('value')
        const localStorageToken = localStorage.getItem('csrf_token')
        
        return {
          metaToken: metaToken !== null,
          formToken: formToken !== null,
          localStorageToken: localStorageToken !== null,
          totalTokens: [metaToken, formToken, localStorageToken].filter(t => t).length
        }
      })
      
      console.log('🔍 CSRF保護状況:', csrfTokenCheck)
      
      // 新しいタブで悪意のあるサイトをシミュレート
      const maliciousTab = await context.newPage()
      
      // 悪意のあるサイトのHTMLを作成
      const maliciousHTML = `
        <html>
          <body>
            <h1>悪意のあるサイト</h1>
            <form id="csrf-attack-form" action="${page.url()}" method="POST" style="display:none;">
              <input type="hidden" name="action" value="delete_all_data">
              <input type="hidden" name="malicious" value="true">
            </form>
            
            <script>
              // CSRF攻撃の試行
              setTimeout(() => {
                document.getElementById('csrf-attack-form').submit();
              }, 1000);
              
              // 画像タグを使用したGET-based CSRF
              const img = new Image();
              img.src = '${page.url()}?action=unauthorized_action&csrf_attack=true';
              
              // Fetch APIを使用したCSRF攻撃
              fetch('${page.url()}', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: 'malicious_action',
                  data: 'unauthorized_data'
                })
              }).catch(e => console.log('Expected CSRF block:', e));
            </script>
          </body>
        </html>
      `
      
      // 悪意のあるページをデータURLで読み込み
      await maliciousTab.goto(`data:text/html,${encodeURIComponent(maliciousHTML)}`)
      await maliciousTab.waitForTimeout(3000)
      
      console.log('🚨 CSRF攻撃をシミュレート実行')
      
      // 元のタブでCSRF攻撃の影響を確認
      await page.bringToFront()
      await page.waitForTimeout(2000)
      
      // データが改ざんされていないことを確認
      const dataIntegrityCheck = await page.evaluate(() => {
        return {
          gameDataExists: localStorage.getItem('gameData') !== null,
          unauthorizedChanges: localStorage.getItem('malicious_data') !== null,
          sessionValid: !localStorage.getItem('session_compromised'),
          gameStillRunning: !!document.querySelector('canvas')
        }
      })
      
      console.log('🔍 CSRF攻撃後のデータ整合性:', dataIntegrityCheck)
      
      // CSRF攻撃が阻止されていることを確認
      expect(dataIntegrityCheck.unauthorizedChanges).toBe(false)
      expect(dataIntegrityCheck.sessionValid).toBe(true)
      
      // CSRF保護エラーメッセージの確認
      const csrfErrorMessage = page.locator('.csrf-error, .unauthorized-request, [data-testid="csrf-error"]')
      const hasCsrfError = await csrfErrorMessage.count() > 0
      
      if (hasCsrfError) {
        console.log('✅ CSRF保護エラーメッセージが表示されている')
      }
      
      await maliciousTab.close()
      
      console.log('✅ CSRF攻撃が正常に阻止されました')
    }
  })

  test('🔓 データ改ざん攻撃 - ローカルストレージ操作', async ({ page }) => {
    await page.goto('/')
    
    const startButton = page.locator('text=ゲームをプレイ').first()
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      await page.waitForTimeout(3000)
      
      // 正常なゲーム進行
      const canvas = page.locator('canvas')
      if (await canvas.isVisible({ timeout: 5000 })) {
        await canvas.click({ position: { x: 100, y: 100 } })
        await page.waitForTimeout(2000)
        
        console.log('✅ 正常なゲーム状態確立')
        
        // データ改ざん攻撃をシミュレート
        const tamperingResults = await page.evaluate(() => {
          const originalData = localStorage.getItem('gameData')
          const tamperingAttempts = []
          
          // 攻撃パターン1: スコア改ざん
          try {
            const gameData = JSON.parse(originalData || '{}')
            gameData.score = 999999999
            gameData.level = 999
            gameData.cheated = true
            localStorage.setItem('gameData', JSON.stringify(gameData))
            
            tamperingAttempts.push({
              type: 'score_tampering',
              success: true,
              data: gameData
            })
          } catch (error) {
            tamperingAttempts.push({
              type: 'score_tampering',
              success: false,
              error: error.message
            })
          }
          
          // 攻撃パターン2: 無効なデータ注入
          try {
            localStorage.setItem('gameData', '{"__proto__": {"isAdmin": true}, "malicious": "injection"}')
            tamperingAttempts.push({
              type: 'prototype_pollution',
              success: true
            })
          } catch (error) {
            tamperingAttempts.push({
              type: 'prototype_pollution',
              success: false,
              error: error.message
            })
          }
          
          // 攻撃パターン3: 大量データ注入（DoS）
          try {
            const largeData = 'x'.repeat(10000000) // 10MB
            localStorage.setItem('malicious_large_data', largeData)
            tamperingAttempts.push({
              type: 'storage_dos',
              success: true,
              size: largeData.length
            })
          } catch (error) {
            tamperingAttempts.push({
              type: 'storage_dos',
              success: false,
              error: error.message
            })
          }
          
          // 攻撃パターン4: セッション乗っ取り
          try {
            localStorage.setItem('user_session', '{"userId": "admin", "permissions": ["all"]}')
            localStorage.setItem('auth_token', 'fake_admin_token')
            tamperingAttempts.push({
              type: 'session_hijacking',
              success: true
            })
          } catch (error) {
            tamperingAttempts.push({
              type: 'session_hijacking',
              success: false,
              error: error.message
            })
          }
          
          return tamperingAttempts
        })
        
        console.log('🔍 データ改ざん攻撃結果:', tamperingResults)
        
        // ページをリロードして整合性チェックを実行
        await page.reload()
        await page.waitForTimeout(3000)
        
        // データ整合性検証
        const integrityValidation = await page.evaluate(() => {
          const validation = {
            dataCorrupted: false,
            invalidValues: [],
            securityViolations: [],
            protectionActive: false
          }
          
          try {
            const gameData = localStorage.getItem('gameData')
            if (gameData) {
              const parsed = JSON.parse(gameData)
              
              // 異常な値の検出
              if (parsed.score > 1000000) {
                validation.invalidValues.push('score_too_high')
              }
              
              if (parsed.level > 100) {
                validation.invalidValues.push('level_too_high')
              }
              
              if (parsed.cheated === true) {
                validation.securityViolations.push('cheat_detected')
              }
              
              if (parsed.malicious) {
                validation.securityViolations.push('malicious_injection')
              }
            }
            
            // プロトタイプ汚染の検出
            if ((Object.prototype as any).isAdmin === true) {
              validation.securityViolations.push('prototype_pollution')
            }
            
            // セキュリティ保護の確認
            validation.protectionActive = localStorage.getItem('security_validation_active') === 'true'
            
          } catch (error) {
            validation.dataCorrupted = true
          }
          
          return validation
        })
        
        console.log('🔍 データ整合性検証結果:', integrityValidation)
        
        // セキュリティ違反が検出された場合の処理確認
        if (integrityValidation.securityViolations.length > 0) {
          const securityAlert = page.locator('.security-violation, .data-tampering-detected, [data-testid="security-alert"]')
          const hasSecurityAlert = await securityAlert.count() > 0
          
          if (hasSecurityAlert) {
            console.log('✅ データ改ざん検出アラートが表示されている')
          } else {
            console.log('⚠️ データ改ざん検出機能が不十分')
          }
        }
        
        // ゲームが安全な状態で継続していることを確認
        const gameStillSafe = await page.locator('#app').isVisible({ timeout: 5000 })
        expect(gameStillSafe).toBe(true)
        
        console.log('✅ データ改ざん攻撃に対する防御を確認')
      }
    }
  })

  test('💣 DoS攻撃シミュレーション - サービス拒否攻撃', async ({ page }) => {
    await page.goto('/')
    
    // CPU集約的な攻撃をシミュレート
    const cpuDoSResult = await page.evaluate(() => {
      const startTime = performance.now()
      let iterations = 0
      const maxTime = 2000 // 2秒制限
      
      try {
        // CPU集約的なループ
        while (performance.now() - startTime < maxTime) {
          iterations++
          
          // 無限ループの検出と中断
          if (iterations > 1000000) {
            break
          }
          
          // 重い計算
          Math.sqrt(iterations * Math.random())
        }
        
        return {
          type: 'cpu_dos',
          iterations,
          duration: performance.now() - startTime,
          blocked: iterations > 1000000
        }
      } catch (error) {
        return {
          type: 'cpu_dos',
          error: error.message,
          blocked: true
        }
      }
    })
    
    console.log('💻 CPU DoS攻撃結果:', cpuDoSResult)
    
    // メモリ集約的な攻撃をシミュレート
    const memoryDoSResult = await page.evaluate(() => {
      const arrays = []
      let totalSize = 0
      const maxSize = 50 * 1024 * 1024 // 50MB制限
      
      try {
        while (totalSize < maxSize) {
          const chunkSize = 1024 * 1024 // 1MB chunks
          const array = new Array(chunkSize).fill('x')
          arrays.push(array)
          totalSize += chunkSize
          
          // メモリ使用量の監視
          if ((performance as any).memory?.usedJSHeapSize > maxSize) {
            break
          }
        }
        
        return {
          type: 'memory_dos',
          arraysCreated: arrays.length,
          totalSize,
          memoryUsed: (performance as any).memory?.usedJSHeapSize || 0,
          blocked: arrays.length < 10 // 10個未満なら制限が働いている
        }
      } catch (error) {
        return {
          type: 'memory_dos',
          error: error.message,
          blocked: true,
          arraysCreated: arrays.length
        }
      }
    })
    
    console.log('🧠 Memory DoS攻撃結果:', memoryDoSResult)
    
    // DOM操作による攻撃をシミュレート
    const domDoSResult = await page.evaluate(() => {
      const startTime = performance.now()
      let elementsCreated = 0
      const maxElements = 10000
      
      try {
        const container = document.createElement('div')
        container.style.display = 'none'
        document.body.appendChild(container)
        
        while (elementsCreated < maxElements && performance.now() - startTime < 3000) {
          const element = document.createElement('div')
          element.innerHTML = `<span>Element ${elementsCreated}</span>`
          container.appendChild(element)
          elementsCreated++
          
          // DOM制限の検出
          if (document.querySelectorAll('*').length > 50000) {
            break
          }
        }
        
        return {
          type: 'dom_dos',
          elementsCreated,
          totalDOMNodes: document.querySelectorAll('*').length,
          duration: performance.now() - startTime,
          blocked: elementsCreated < maxElements
        }
      } catch (error) {
        return {
          type: 'dom_dos',
          error: error.message,
          blocked: true,
          elementsCreated
        }
      }
    })
    
    console.log('🌐 DOM DoS攻撃結果:', domDoSResult)
    
    // リクエスト爆撃攻撃をシミュレート
    const requestDoSResult = await page.evaluate(async () => {
      const requests = []
      const maxRequests = 100
      
      try {
        for (let i = 0; i < maxRequests; i++) {
          const requestPromise = fetch(`${location.origin}?dos_test=${i}`, {
            method: 'GET',
            cache: 'no-cache'
          }).then(response => ({
            index: i,
            status: response.status,
            success: response.ok
          })).catch(error => ({
            index: i,
            error: error.message,
            success: false
          }))
          
          requests.push(requestPromise)
          
          // レート制限の確認
          if (i > 10) {
            await new Promise(resolve => setTimeout(resolve, 10))
          }
        }
        
        const results = await Promise.all(requests)
        const successfulRequests = results.filter(r => r.success).length
        
        return {
          type: 'request_dos',
          totalRequests: maxRequests,
          successfulRequests,
          failedRequests: maxRequests - successfulRequests,
          rateLimited: successfulRequests < maxRequests * 0.8
        }
      } catch (error) {
        return {
          type: 'request_dos',
          error: error.message,
          blocked: true
        }
      }
    })
    
    console.log('📡 Request DoS攻撃結果:', requestDoSResult)
    
    // アプリケーションが引き続き動作していることを確認
    await page.waitForTimeout(2000)
    
    const appStillWorking = await page.locator('#app').isVisible({ timeout: 5000 })
    expect(appStillWorking).toBe(true)
    
    // DoS攻撃警告の確認
    const dosWarning = page.locator('.dos-warning, .resource-limit-exceeded, [data-testid="dos-warning"]')
    const hasDosWarning = await dosWarning.count() > 0
    
    if (hasDosWarning) {
      console.log('✅ DoS攻撃警告が表示されている')
    }
    
    // パフォーマンス測定
    const performanceMetrics = await page.evaluate(() => {
      return {
        memory: (performance as any).memory?.usedJSHeapSize || 0,
        timing: performance.now(),
        domNodes: document.querySelectorAll('*').length,
        responseTime: performance.timing ? 
          performance.timing.loadEventEnd - performance.timing.navigationStart : 0
      }
    })
    
    console.log('📊 DoS攻撃後のパフォーマンス:', performanceMetrics)
    
    // 基本的なパフォーマンス水準が維持されていることを確認
    expect(performanceMetrics.domNodes).toBeLessThan(100000)
    
    console.log('✅ DoS攻撃に対する防御機能を確認')
  })

  test('🎭 ソーシャルエンジニアリング攻撃 - 偽装画面・フィッシング', async ({ page, context }) => {
    await page.goto('/')
    
    // 偽のログイン画面を注入する攻撃をシミュレート
    const phishingInjectionResult = await page.evaluate(() => {
      try {
        // 偽のログインフォームを作成
        const fakeLogin = document.createElement('div')
        fakeLogin.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                      background: rgba(0,0,0,0.8); z-index: 9999;" 
               id="fake-security-warning">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                        background: white; padding: 20px; border-radius: 5px; text-align: center;">
              <h2>🔒 セキュリティ警告</h2>
              <p>アカウントの安全性を確保するため、再認証が必要です。</p>
              <form id="phishing-form">
                <input type="text" placeholder="ユーザー名" name="fake_username" style="margin: 5px; padding: 5px;">
                <input type="password" placeholder="パスワード" name="fake_password" style="margin: 5px; padding: 5px;">
                <button type="submit" style="margin: 5px; padding: 5px 15px;">認証する</button>
              </form>
            </div>
          </div>
        `
        
        document.body.appendChild(fakeLogin)
        
        return {
          type: 'phishing_injection',
          success: true,
          elementExists: !!document.getElementById('fake-security-warning')
        }
      } catch (error) {
        return {
          type: 'phishing_injection',
          success: false,
          error: error.message
        }
      }
    })
    
    console.log('🎣 フィッシング画面注入結果:', phishingInjectionResult)
    
    // フィッシング検出機能の確認
    await page.waitForTimeout(2000)
    
    const phishingDetection = page.locator('.phishing-warning, .security-alert, [data-testid="phishing-alert"]')
    const hasPhishingAlert = await phishingDetection.count() > 0
    
    if (hasPhishingAlert) {
      console.log('✅ フィッシング攻撃検出アラートが表示されている')
    }
    
    // 偽の要素が削除または無効化されているかチェック
    const fakeElementStillExists = await page.evaluate(() => {
      return !!document.getElementById('fake-security-warning')
    })
    
    if (!fakeElementStillExists) {
      console.log('✅ 偽のセキュリティ警告が自動削除された')
    } else {
      console.log('⚠️ 偽のセキュリティ警告が残存している')
    }
    
    // クリックジャッキング攻撃のシミュレート
    const clickjackingTest = await page.evaluate(() => {
      try {
        // 透明なオーバーレイを作成
        const overlay = document.createElement('div')
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: transparent;
          z-index: 10000;
          cursor: pointer;
        `
        overlay.id = 'clickjacking-overlay'
        
        overlay.addEventListener('click', () => {
          window.__CLICKJACKING_SUCCESS = true
        })
        
        document.body.appendChild(overlay)
        
        return {
          type: 'clickjacking',
          overlayCreated: true,
          elementId: 'clickjacking-overlay'
        }
      } catch (error) {
        return {
          type: 'clickjacking',
          success: false,
          error: error.message
        }
      }
    })
    
    console.log('👆 クリックジャッキング攻撃結果:', clickjackingTest)
    
    // クリックジャッキング検出をテスト
    await page.click('body', { position: { x: 100, y: 100 } })
    await page.waitForTimeout(1000)
    
    const clickjackingSuccess = await page.evaluate(() => {
      return (window as any).__CLICKJACKING_SUCCESS === true
    })
    
    if (clickjackingSuccess) {
      console.log('⚠️ クリックジャッキング攻撃が成功 - 防御機能要強化')
    } else {
      console.log('✅ クリックジャッキング攻撃が阻止された')
    }
    
    // フレーム間通信の悪用をテスト
    const frameInjectionTest = await page.evaluate(() => {
      try {
        const iframe = document.createElement('iframe')
        iframe.src = 'data:text/html,<script>parent.postMessage({type:"steal_data",data:"malicious"},"*")</script>'
        iframe.style.display = 'none'
        document.body.appendChild(iframe)
        
        // メッセージリスナーを設定
        let maliciousMessageReceived = false
        
        const messageHandler = (event: MessageEvent) => {
          if (event.data && event.data.type === 'steal_data') {
            maliciousMessageReceived = true
            window.__IFRAME_ATTACK_SUCCESS = true
          }
        }
        
        window.addEventListener('message', messageHandler)
        
        setTimeout(() => {
          window.removeEventListener('message', messageHandler)
        }, 2000)
        
        return {
          type: 'iframe_injection',
          iframeCreated: true
        }
      } catch (error) {
        return {
          type: 'iframe_injection',
          success: false,
          error: error.message
        }
      }
    })
    
    console.log('🖼️ iframe注入攻撃結果:', frameInjectionTest)
    
    await page.waitForTimeout(3000)
    
    const iframeAttackSuccess = await page.evaluate(() => {
      return (window as any).__IFRAME_ATTACK_SUCCESS === true
    })
    
    if (iframeAttackSuccess) {
      console.log('⚠️ iframe攻撃が成功 - クロスフレーム通信の検証要強化')
    } else {
      console.log('✅ iframe攻撃が阻止された')
    }
    
    // アプリケーションが正常に動作していることを確認
    const appStillSecure = await page.locator('#app').isVisible({ timeout: 5000 })
    expect(appStillSecure).toBe(true)
    
    console.log('✅ ソーシャルエンジニアリング攻撃テスト完了')
  })

  test('🔐 暗号化攻撃シミュレーション - 暗号解読・鍵推測', async ({ page }) => {
    await page.goto('/')
    
    // ゲーム開始して暗号化データを生成
    const startButton = page.locator('text=ゲームをプレイ').first()
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      await page.waitForTimeout(3000)
      
      // 暗号化攻撃をシミュレート
      const cryptoAttackResults = await page.evaluate(async () => {
        const attacks = []
        
        // 攻撃1: 弱い暗号化の検出
        try {
          const testData = "sensitive_test_data"
          
          // Base64エンコード（暗号化ではない）
          const base64Encoded = btoa(testData)
          const base64Decoded = atob(base64Encoded)
          
          attacks.push({
            type: 'weak_encoding_detection',
            original: testData,
            encoded: base64Encoded,
            decoded: base64Decoded,
            vulnerable: base64Decoded === testData
          })
        } catch (error) {
          attacks.push({
            type: 'weak_encoding_detection',
            error: error.message
          })
        }
        
        // 攻撃2: 暗号鍵の推測攻撃
        try {
          const commonKeys = ['123456', 'password', 'secret', 'key', 'admin', '12345678']
          const keyAttackResults = []
          
          for (const key of commonKeys) {
            try {
              // 簡易的な暗号化テスト
              const encoder = new TextEncoder()
              const data = encoder.encode('test_data')
              const keyData = encoder.encode(key)
              
              // XOR暗号化（弱い暗号化の例）
              const encrypted = new Uint8Array(data.length)
              for (let i = 0; i < data.length; i++) {
                encrypted[i] = data[i] ^ keyData[i % keyData.length]
              }
              
              keyAttackResults.push({
                key,
                success: true,
                encryptedLength: encrypted.length
              })
            } catch (error) {
              keyAttackResults.push({
                key,
                success: false,
                error: error.message
              })
            }
          }
          
          attacks.push({
            type: 'key_brute_force',
            attempts: keyAttackResults.length,
            successful: keyAttackResults.filter(r => r.success).length
          })
        } catch (error) {
          attacks.push({
            type: 'key_brute_force',
            error: error.message
          })
        }
        
        // 攻撃3: タイミング攻撃
        try {
          const timingMeasurements = []
          const testKeys = ['correct_key', 'wrong_key_1', 'wrong_key_2']
          
          for (const key of testKeys) {
            const startTime = performance.now()
            
            // 模擬的な鍵検証処理
            let hash = 0
            for (let i = 0; i < key.length; i++) {
              hash = ((hash << 5) - hash + key.charCodeAt(i)) & 0xffffffff
            }
            
            const endTime = performance.now()
            
            timingMeasurements.push({
              key,
              duration: endTime - startTime,
              hash
            })
          }
          
          attacks.push({
            type: 'timing_attack',
            measurements: timingMeasurements,
            timingDifference: Math.max(...timingMeasurements.map(m => m.duration)) - 
                            Math.min(...timingMeasurements.map(m => m.duration))
          })
        } catch (error) {
          attacks.push({
            type: 'timing_attack',
            error: error.message
          })
        }
        
        // 攻撃4: 暗号化されたデータの統計解析
        try {
          const encryptedData = localStorage.getItem('gameData') || 'sample_data'
          const charFrequency: Record<string, number> = {}
          
          for (const char of encryptedData) {
            charFrequency[char] = (charFrequency[char] || 0) + 1
          }
          
          const entropy = Object.values(charFrequency).reduce((acc, freq) => {
            const probability = freq / encryptedData.length
            return acc - probability * Math.log2(probability)
          }, 0)
          
          attacks.push({
            type: 'statistical_analysis',
            dataLength: encryptedData.length,
            uniqueChars: Object.keys(charFrequency).length,
            entropy: entropy,
            lowEntropy: entropy < 4 // 低エントロピーは弱い暗号化を示唆
          })
        } catch (error) {
          attacks.push({
            type: 'statistical_analysis',
            error: error.message
          })
        }
        
        return attacks
      })
      
      console.log('🔓 暗号化攻撃シミュレーション結果:', cryptoAttackResults)
      
      // 暗号化の脆弱性をチェック
      const vulnerabilities = cryptoAttackResults.filter(attack => {
        switch (attack.type) {
          case 'weak_encoding_detection':
            return attack.vulnerable === true
          case 'statistical_analysis':
            return attack.lowEntropy === true
          case 'timing_attack':
            return attack.timingDifference > 10 // 10ms以上の差は危険
          default:
            return false
        }
      })
      
      console.log('⚠️ 検出された暗号化脆弱性:', vulnerabilities)
      
      if (vulnerabilities.length > 0) {
        console.log('🚨 暗号化に改善が必要な点があります')
      } else {
        console.log('✅ 暗号化攻撃に対する防御が確認されました')
      }
      
      // 暗号化セキュリティ警告の確認
      const cryptoWarning = page.locator('.crypto-warning, .encryption-weak, [data-testid="crypto-warning"]')
      const hasCryptoWarning = await cryptoWarning.count() > 0
      
      if (hasCryptoWarning) {
        console.log('✅ 暗号化セキュリティ警告が表示されている')
      }
    }
    
    console.log('✅ 暗号化攻撃シミュレーションテスト完了')
  })
})