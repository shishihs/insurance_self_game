/**
 * セキュリティユーティリティ
 * 入力検証、サニタイゼーション、脅威検出、データ保護機能を提供
 * OWASP Top 10 対策を実装
 */

/**
 * XSS攻撃対策強化版入力サニタイゼーション
 * HTMLタグ、スクリプト、危険な文字を除去
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('入力は文字列である必要があります')
  }
  
  return input
    // XSS対策: HTMLタグとスクリプト関連文字を除去
    .replace(/<[^>]*>/g, '') // HTMLタグ全般
    .replace(/javascript:/gi, '') // JavaScriptプロトコル
    .replace(/on\w+\s*=/gi, '') // イベントハンドラー
    .replace(/[<>"'&]/g, (match) => {
      const htmlEntities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      }
      return htmlEntities[match] || match
    })
    .replace(/\x00-\x1f\x7f-\x9f/g, '') // 制御文字を除去
    .trim()
    .slice(0, 1000) // 長さ制限
}

/**
 * 数値入力を検証
 */
export function validateNumber(
  value: unknown,
  min: number,
  max: number,
  allowFloat = false
): number | null {
  const num = Number(value)
  
  if (isNaN(num)) {
    return null
  }
  
  if (!allowFloat && !Number.isInteger(num)) {
    return null
  }
  
  if (num < min || num > max) {
    return null
  }
  
  return num
}

/**
 * 配列の長さを検証
 */
export function validateArrayLength<T>(
  array: T[],
  minLength: number,
  maxLength: number
): boolean {
  return array.length >= minLength && array.length <= maxLength
}

/**
 * レート制限クラス
 */
export class RateLimiter {
  private attempts = new Map<string, number[]>()
  
  /**
   * アクションが許可されているかチェック
   */
  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now()
    const userAttempts = this.attempts.get(key) || []
    
    // 古いエントリを削除
    const validAttempts = userAttempts.filter(time => now - time < windowMs)
    
    if (validAttempts.length >= maxAttempts) {
      return false
    }
    
    validAttempts.push(now)
    this.attempts.set(key, validAttempts)
    return true
  }
  
  /**
   * 特定のキーのレート制限をリセット
   */
  reset(key: string): void {
    this.attempts.delete(key)
  }
  
  /**
   * 全てのレート制限をクリア
   */
  clear(): void {
    this.attempts.clear()
  }
}

/**
 * セキュアなランダム文字列を生成
 * CSRFトークン、セッションID等に使用
 */
export function generateSecureRandomString(length: number): string {
  if (length <= 0 || length > 256) {
    throw new Error('長さは1から256の間である必要があります')
  }
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(length)
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array)
  } else {
    // フォールバック（セキュリティレベル低下の警告）
    console.warn('⚠️ セキュリティ警告: crypto.getRandomValues が利用できません。フォールバック実装を使用します。')
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  
  return Array.from(array, byte => chars[byte % chars.length]).join('')
}

/**
 * CSRF トークンを生成
 */
export function generateCSRFToken(): string {
  return generateSecureRandomString(32)
}

/**
 * セキュアハッシュ生成（簡易版）
 */
export async function generateSecureHash(data: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } else {
    // フォールバック: 簡易ハッシュ（セキュリティレベル低下）
    console.warn('⚠️ セキュリティ警告: crypto.subtle が利用できません。簡易ハッシュを使用します。')
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32bit整数に変換
    }
    return Math.abs(hash).toString(16)
  }
}

/**
 * 暗号化対応 localStorageへの安全な保存
 * データ改ざん検知機能付き
 */
export function secureLocalStorage() {
  const ENCRYPTION_KEY_PREFIX = 'game_enc_'
  const INTEGRITY_SUFFIX = '_integrity'
  
  return {
    async setItem(key: string, value: unknown, encrypt = false): Promise<void> {
      try {
        const sanitizedKey = sanitizeInput(key)
        let serialized = JSON.stringify(value)
        
        if (encrypt) {
          // 簡易暗号化（本格実装では Web Crypto API使用推奨）
          const encryptionKey = await this.getOrCreateEncryptionKey()
          serialized = await this.simpleEncrypt(serialized, encryptionKey)
        }
        
        // 整合性チェック用ハッシュを生成
        const integrityHash = await generateSecureHash(serialized)
        
        localStorage.setItem(sanitizedKey, serialized)
        localStorage.setItem(sanitizedKey + INTEGRITY_SUFFIX, integrityHash)
        
      } catch (error) {
        console.error('❌ セキュアストレージ保存失敗:', error)
        throw new Error(`ストレージ保存に失敗: ${error instanceof Error ? error.message : String(error)}`)
      }
    },
    
    async getItem<T>(key: string, decrypt = false): Promise<T | null> {
      try {
        const sanitizedKey = sanitizeInput(key)
        const item = localStorage.getItem(sanitizedKey)
        const integrityHash = localStorage.getItem(sanitizedKey + INTEGRITY_SUFFIX)
        
        if (!item) return null
        
        // 整合性チェック
        if (integrityHash) {
          const currentHash = await generateSecureHash(item)
          if (currentHash !== integrityHash) {
            console.error('❌ データ改ざんを検出しました:', sanitizedKey)
            this.removeItem(sanitizedKey) // 改ざんされたデータを削除
            throw new Error('データ改ざんが検出されました')
          }
        }
        
        let data = item
        if (decrypt) {
          const encryptionKey = await this.getOrCreateEncryptionKey()
          data = await this.simpleDecrypt(data, encryptionKey)
        }
        
        return JSON.parse(data)
      } catch (error) {
        console.error('❌ セキュアストレージ読み込み失敗:', error)
        return null
      }
    },
    
    removeItem(key: string): void {
      try {
        const sanitizedKey = sanitizeInput(key)
        localStorage.removeItem(sanitizedKey)
        localStorage.removeItem(sanitizedKey + INTEGRITY_SUFFIX)
      } catch (error) {
        console.error('❌ セキュアストレージ削除失敗:', error)
      }
    },
    
    async getOrCreateEncryptionKey(): Promise<string> {
      const keyName = ENCRYPTION_KEY_PREFIX + 'master'
      let key = localStorage.getItem(keyName)
      
      if (!key) {
        key = generateSecureRandomString(32)
        localStorage.setItem(keyName, key)
      }
      
      return key
    },
    
    async simpleEncrypt(data: string, key: string): Promise<string> {
      // 注意: これは簡易実装です。本格的な暗号化にはWeb Crypto APIを使用してください
      const result = []
      for (let i = 0; i < data.length; i++) {
        const keyChar = key.charCodeAt(i % key.length)
        const dataChar = data.charCodeAt(i)
        result.push(String.fromCharCode(dataChar ^ keyChar))
      }
      return btoa(result.join(''))
    },
    
    async simpleDecrypt(encryptedData: string, key: string): Promise<string> {
      try {
        const data = atob(encryptedData)
        const result = []
        for (let i = 0; i < data.length; i++) {
          const keyChar = key.charCodeAt(i % key.length)
          const dataChar = data.charCodeAt(i)
          result.push(String.fromCharCode(dataChar ^ keyChar))
        }
        return result.join('')
      } catch {
        throw new Error('復号化に失敗しました')
      }
    }
  }
}