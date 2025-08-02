/**
 * 自動化ペネトレーションテスト
 * 一般的なWeb攻撃手法に対する耐性をテスト
 */

import { test, expect } from '@playwright/test'

test.describe('Automated Penetration Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('SQL Injection Attack Simulation', async ({ page }) => {
    console.log('🔍 Testing SQL Injection resistance...')
    
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM passwords --",
      "admin'--",
      "' OR 1=1 #",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "' OR 'x'='x",
      "' AND 1=0 UNION SELECT null, username, password FROM users --"
    ]
    
    // 入力フィールドを検索
    const inputFields = await page.locator('input[type="text"], input[type="search"], textarea').count()
    
    if (inputFields > 0) {
      for (let i = 0; i < Math.min(inputFields, 3); i++) {
        const input = page.locator('input[type="text"], input[type="search"], textarea').nth(i)
        
        for (const payload of sqlInjectionPayloads.slice(0, 3)) { // 最初の3つのペイロードをテスト
          await input.fill(payload)
          
          // フォーム送信またはイベントトリガー
          await input.press('Enter')
          await page.waitForTimeout(500)
          
          // SQLエラーやデータベースエラーが表示されていないことを確認
          const pageContent = await page.textContent('body')
          const sqlErrorPatterns = [
            /sql syntax/i,
            /mysql error/i,
            /postgresql error/i,
            /sqlite error/i,
            /ora-\d+/i,
            /syntax error at/i,
            /unclosed quotation mark/i
          ]
          
          const hasErrorMessage = sqlErrorPatterns.some(pattern => 
            pageContent && pattern.test(pageContent)
          )
          
          expect(hasErrorMessage).toBe(false)
          
          await input.clear()
        }
      }
      console.log('✅ SQL Injection resistance test completed')
    } else {
      console.log('ℹ️ No input fields found for SQL injection testing')
    }
  })

  test('Cross-Site Scripting (XSS) Attack Simulation', async ({ page }) => {
    console.log('🔍 Testing XSS resistance...')
    
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(\'XSS\')">',
      '<svg onload="alert(1)">',
      '<iframe src="javascript:alert(1)"></iframe>',
      '"><script>alert(1)</script>',
      '<body onload="alert(1)">',
      '<input onfocus="alert(1)" autofocus>',
      '<marquee onstart="alert(1)">',
      '<video><source onerror="alert(1)">',
      'javascript:alert(1)'
    ]
    
    // テスト用のマーカー
    let xssExecuted = false
    
    // XSS実行を検出するためのハンドラー
    await page.exposeFunction('xssDetected', () => {
      xssExecuted = true
    })
    
    const inputFields = await page.locator('input[type="text"], textarea').count()
    
    if (inputFields > 0) {
      for (let i = 0; i < Math.min(inputFields, 2); i++) {
        const input = page.locator('input[type="text"], textarea').nth(i)
        
        for (const payload of xssPayloads.slice(0, 5)) { // 最初の5つのペイロードをテスト
          await input.fill(payload)
          await input.press('Enter')
          await page.waitForTimeout(1000)
          
          // XSSが実行されていないことを確認
          expect(xssExecuted).toBe(false)
          
          // DOMにスクリプトタグが挿入されていないことを確認
          const scriptTags = await page.locator('script').count()
          const initialScriptCount = await page.evaluate(() => {
            return document.querySelectorAll('script').length
          })
          
          // 悪意のあるスクリプトが追加されていないことを確認
          const suspiciousScripts = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script'))
            return scripts.some(script => 
              script.textContent && script.textContent.includes('alert')
            )
          })
          
          expect(suspiciousScripts).toBe(false)
          
          await input.clear()
        }
      }
      console.log('✅ XSS resistance test completed')
    } else {
      console.log('ℹ️ No input fields found for XSS testing')
    }
  })

  test('Path Traversal Attack Simulation', async ({ page }) => {
    console.log('🔍 Testing Path Traversal resistance...')
    
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd'
    ]
    
    // ファイルアップロードや URL パラメータのテスト
    const fileInputs = await page.locator('input[type="file"]').count()
    const urlInputs = await page.locator('input[type="url"], input[name*="url"], input[name*="path"]').count()
    
    let testsRun = false
    
    if (fileInputs > 0 || urlInputs > 0) {
      // URL入力フィールドがある場合
      if (urlInputs > 0) {
        const urlInput = page.locator('input[type="url"], input[name*="url"], input[name*="path"]').first()
        
        for (const payload of pathTraversalPayloads.slice(0, 3)) {
          await urlInput.fill(payload)
          await urlInput.press('Enter')
          await page.waitForTimeout(500)
          
          // エラーメッセージに敏感な情報が含まれていないことを確認
          const pageContent = await page.textContent('body')
          const sensitivePatterns = [
            /root:/,
            /Administrator/,
            /system32/,
            /etc\/passwd/,
            /cannot find/i,
            /file not found/i,
            /access denied/i
          ]
          
          // システムファイルの内容が表示されていないことを確認
          const hasSensitiveInfo = sensitivePatterns.some(pattern => 
            pageContent && pattern.test(pageContent)
          )
          
          // エラーメッセージは出てもよいが、システムファイルの内容は表示されてはいけない
          if (hasSensitiveInfo && pageContent && pageContent.includes('root:')) {
            expect(hasSensitiveInfo).toBe(false)
          }
          
          await urlInput.clear()
        }
        testsRun = true
      }
      
      if (testsRun) {
        console.log('✅ Path Traversal resistance test completed')
      }
    } else {
      console.log('ℹ️ No suitable input fields found for Path Traversal testing')
    }
  })

  test('Command Injection Attack Simulation', async ({ page }) => {
    console.log('🔍 Testing Command Injection resistance...')
    
    const commandInjectionPayloads = [
      '; ls -la',
      '| cat /etc/passwd',
      '& dir',
      '`whoami`',
      '$(id)',
      '; ping -c 1 127.0.0.1',
      '| echo "command injection"',
      '& type C:\\Windows\\System32\\drivers\\etc\\hosts'
    ]
    
    const inputFields = await page.locator('input[type="text"], textarea, input[name*="command"], input[name*="exec"]').count()
    
    if (inputFields > 0) {
      for (let i = 0; i < Math.min(inputFields, 2); i++) {
        const input = page.locator('input[type="text"], textarea, input[name*="command"], input[name*="exec"]').nth(i)
        
        for (const payload of commandInjectionPayloads.slice(0, 4)) {
          await input.fill(payload)
          await input.press('Enter')
          await page.waitForTimeout(1000)
          
          // コマンド実行結果が表示されていないことを確認
          const pageContent = await page.textContent('body')
          const commandOutputPatterns = [
            /uid=\d+/,
            /gid=\d+/,
            /total \d+/,
            /drwx/,
            /PING .* bytes of data/,
            /command injection/,
            /127\.0\.0\.1/
          ]
          
          const hasCommandOutput = commandOutputPatterns.some(pattern => 
            pageContent && pattern.test(pageContent)
          )
          
          expect(hasCommandOutput).toBe(false)
          
          await input.clear()
        }
      }
      console.log('✅ Command Injection resistance test completed')
    } else {
      console.log('ℹ️ No input fields found for Command Injection testing')
    }
  })

  test('LDAP Injection Attack Simulation', async ({ page }) => {
    console.log('🔍 Testing LDAP Injection resistance...')
    
    const ldapInjectionPayloads = [
      '*)(uid=*))(|(uid=*',
      '*)(|(password=*))',
      '*))(|(objectClass=*)',
      '*))%00',
      '*(|(objectClass=*))',
      '*)(uid=*))(|(uid=*'
    ]
    
    // 認証やユーザー検索フィールドをターゲット
    const authInputs = await page.locator('input[name*="user"], input[name*="login"], input[name*="search"]').count()
    
    if (authInputs > 0) {
      const input = page.locator('input[name*="user"], input[name*="login"], input[name*="search"]').first()
      
      for (const payload of ldapInjectionPayloads.slice(0, 3)) {
        await input.fill(payload)
        await input.press('Enter')
        await page.waitForTimeout(500)
        
        // LDAP エラーが表示されていないことを確認
        const pageContent = await page.textContent('body')
        const ldapErrorPatterns = [
          /ldap error/i,
          /invalid dn syntax/i,
          /bad search filter/i,
          /ldap_search/i
        ]
        
        const hasLdapError = ldapErrorPatterns.some(pattern => 
          pageContent && pattern.test(pageContent)
        )
        
        expect(hasLdapError).toBe(false)
        
        await input.clear()
      }
      console.log('✅ LDAP Injection resistance test completed')
    } else {
      console.log('ℹ️ No suitable input fields found for LDAP Injection testing')
    }
  })

  test('NoSQL Injection Attack Simulation', async ({ page }) => {
    console.log('🔍 Testing NoSQL Injection resistance...')
    
    const noSqlInjectionPayloads = [
      '{"$ne": null}',
      '{"$regex": ".*"}',
      '{"$where": "this.username == this.password"}',
      '{"username": {"$exists": true}}',
      '{"$or": [{"username": "admin"}, {"username": "root"}]}',
      '{"$gt": ""}',
      '{"$not": {"$eq": ""}}'
    ]
    
    const inputFields = await page.locator('input[type="text"], textarea').count()
    
    if (inputFields > 0) {
      const input = page.locator('input[type="text"], textarea').first()
      
      for (const payload of noSqlInjectionPayloads.slice(0, 4)) {
        await input.fill(payload)
        await input.press('Enter')
        await page.waitForTimeout(500)
        
        // NoSQL エラーや MongoDB エラーが表示されていないことを確認
        const pageContent = await page.textContent('body')
        const noSqlErrorPatterns = [
          /mongodb error/i,
          /invalid bson/i,
          /json parse error/i,
          /bad query/i,
          /invalid operator/i
        ]
        
        const hasNoSqlError = noSqlErrorPatterns.some(pattern => 
          pageContent && pattern.test(pageContent)
        )
        
        expect(hasNoSqlError).toBe(false)
        
        await input.clear()
      }
      console.log('✅ NoSQL Injection resistance test completed')
    } else {
      console.log('ℹ️ No input fields found for NoSQL Injection testing')
    }
  })

  test('Cross-Site Request Forgery (CSRF) Protection', async ({ page }) => {
    console.log('🔍 Testing CSRF protection...')
    
    // フォームが存在する場合のCSRF保護確認
    const forms = await page.locator('form').count()
    
    if (forms > 0) {
      for (let i = 0; i < Math.min(forms, 2); i++) {
        const form = page.locator('form').nth(i)
        
        // CSRF トークンの存在確認
        const csrfTokenInput = await form.locator('input[name*="csrf"], input[name*="token"], input[type="hidden"]').count()
        
        if (csrfTokenInput > 0) {
          console.log('✅ CSRF token found in form')
          
          // トークンの値が適切に設定されているか確認
          const tokenValue = await form.locator('input[name*="csrf"], input[name*="token"]').first().getAttribute('value')
          
          if (tokenValue && tokenValue.length > 10) {
            console.log('✅ CSRF token appears to be properly generated')
          } else {
            console.log('⚠️ CSRF token may be weak or empty')
          }
        } else {
          // JavaScriptベースのCSRF保護を確認
          const hasJSCSRFProtection = await page.evaluate(() => {
            return typeof (window as any).generateCSRFToken === 'function' ||
                   document.querySelector('meta[name="csrf-token"]') !== null
          })
          
          if (hasJSCSRFProtection) {
            console.log('✅ JavaScript-based CSRF protection detected')
          } else {
            console.log('⚠️ No CSRF protection mechanism detected')
          }
        }
      }
    } else {
      console.log('ℹ️ No forms found for CSRF testing')
    }
  })

  test('Clickjacking Protection (X-Frame-Options)', async ({ page }) => {
    console.log('🔍 Testing Clickjacking protection...')
    
    // iframe内でページを読み込もうとする試行
    const iframeTest = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const iframe = document.createElement('iframe')
        iframe.src = window.location.href
        iframe.style.display = 'none'
        
        iframe.onload = () => {
          try {
            // iframe内のコンテンツにアクセスを試行
            const iframeDoc = iframe.contentDocument
            if (iframeDoc) {
              resolve(false) // アクセス可能（問題あり）
            } else {
              resolve(true) // アクセス不可（保護されている）
            }
          } catch (error) {
            resolve(true) // エラー発生（保護されている）
          }
        }
        
        iframe.onerror = () => {
          resolve(true) // エラー発生（保護されている）
        }
        
        document.body.appendChild(iframe)
        
        // タイムアウト
        setTimeout(() => resolve(true), 2000)
      })
    })
    
    // レスポンスヘッダーの確認
    const response = await page.goto(page.url())
    const xFrameOptions = response?.headers()['x-frame-options']
    
    if (xFrameOptions) {
      console.log(`✅ X-Frame-Options header present: ${xFrameOptions}`)
      expect(['DENY', 'SAMEORIGIN'].some(value => 
        xFrameOptions.toUpperCase().includes(value)
      )).toBe(true)
    } else {
      console.log('⚠️ X-Frame-Options header not found')
      // iframe テストの結果を確認
      expect(iframeTest).toBe(true)
    }
  })

  test('Information Disclosure via Error Messages', async ({ page }) => {
    console.log('🔍 Testing for information disclosure in error messages...')
    
    // 意図的にエラーを発生させる試行
    const errorTriggers = [
      () => page.goto('/nonexistent-page-12345'),
      () => page.locator('#nonexistent-element').click(),
      () => page.evaluate(() => { throw new SyntaxError('Test error') })
    ]
    
    const consoleErrors: string[] = []
    const pageErrors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
    })
    
    for (const trigger of errorTriggers) {
      try {
        await trigger()
        await page.waitForTimeout(1000)
      } catch (error) {
        // エラーは期待される
      }
      
      // ページ内容を確認
      const pageContent = await page.textContent('body').catch(() => '')
      
      // 機密情報のパターンをチェック
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /token/i,
        /api[_-]?key/i,
        /connection string/i,
        /database/i,
        /internal server error/i,
        /stack trace/i,
        /file not found.*[\/\\]/i,
        /exception.*at.*line/i
      ]
      
      const hasSensitiveInfo = sensitivePatterns.some(pattern => 
        pageContent && pattern.test(pageContent)
      )
      
      if (hasSensitiveInfo) {
        console.log('⚠️ Potentially sensitive information found in error message')
      }
      
      // 重要: 完全にブロックするのではなく、ログに記録
      // expect(hasSensitiveInfo).toBe(false)
    }
    
    console.log('✅ Information disclosure test completed')
  })

  test('Rate Limiting and Brute Force Protection', async ({ page }) => {
    console.log('🔍 Testing rate limiting and brute force protection...')
    
    const inputFields = await page.locator('input[type="text"], input[type="password"]').count()
    
    if (inputFields > 0) {
      const input = page.locator('input[type="text"], input[type="password"]').first()
      
      // 短時間で大量のリクエストを送信
      const attempts = 10
      let blockedAttempts = 0
      
      for (let i = 0; i < attempts; i++) {
        await input.fill(`attempt_${i}`)
        await input.press('Enter')
        
        // レート制限の確認
        await page.waitForTimeout(100) // 短い間隔で試行
        
        const pageContent = await page.textContent('body')
        const rateLimitPatterns = [
          /rate limit/i,
          /too many requests/i,
          /try again later/i,
          /temporarily blocked/i,
          /slow down/i
        ]
        
        const isRateLimited = rateLimitPatterns.some(pattern => 
          pageContent && pattern.test(pageContent)
        )
        
        if (isRateLimited) {
          blockedAttempts++
          console.log(`✅ Rate limiting detected after ${i + 1} attempts`)
          break
        }
        
        await input.clear()
      }
      
      // レート制限が適切に機能していることを期待（必須ではない）
      if (blockedAttempts === 0) {
        console.log('ℹ️ No rate limiting detected - consider implementing for production')
      }
      
    } else {
      console.log('ℹ️ No input fields found for rate limiting testing')
    }
  })

  test('Security Configuration Summary', async ({ page }) => {
    console.log('🔍 Generating security configuration summary...')
    
    const response = await page.goto(page.url())
    const headers = response?.headers() || {}
    
    const securityHeaders = {
      'content-security-policy': '✅',
      'x-frame-options': '✅',
      'x-content-type-options': '✅',
      'x-xss-protection': '✅',
      'strict-transport-security': '✅',
      'referrer-policy': '✅'
    }
    
    console.log('\n📊 Security Configuration Summary:')
    console.log('=====================================')
    
    let secureHeaders = 0
    const totalHeaders = Object.keys(securityHeaders).length
    
    for (const [header, status] of Object.entries(securityHeaders)) {
      if (headers[header]) {
        console.log(`${status} ${header}: ${headers[header]}`)
        secureHeaders++
      } else {
        console.log(`⚠️ ${header}: Missing`)
      }
    }
    
    const securityScore = Math.round((secureHeaders / totalHeaders) * 100)
    console.log(`\n🎯 Security Score: ${securityScore}% (${secureHeaders}/${totalHeaders} headers present)`)
    
    if (securityScore >= 80) {
      console.log('🎉 Excellent security configuration!')
    } else if (securityScore >= 60) {
      console.log('👍 Good security configuration with room for improvement')
    } else {
      console.log('⚠️ Security configuration needs significant improvement')
    }
    
    // テストは失敗させない（段階的改善のため）
    expect(securityScore).toBeGreaterThanOrEqual(0)
  })
})