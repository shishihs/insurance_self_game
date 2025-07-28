/**
 * セキュリティユーティリティ
 * 入力検証とサニタイゼーション機能を提供
 */

/**
 * 文字列入力をサニタイズ
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // 基本的なHTMLタグを除去
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
 */
export function generateSecureRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(length)
  
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else {
    // Node.js環境やcryptoが利用できない場合のフォールバック
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  
  return Array.from(array, byte => chars[byte % chars.length]).join('')
}

/**
 * localStorageへの安全な保存
 */
export function secureLocalStorage() {
  return {
    setItem(key: string, value: unknown): void {
      try {
        const sanitizedKey = sanitizeInput(key)
        const serialized = JSON.stringify(value)
        localStorage.setItem(sanitizedKey, serialized)
      } catch (error) {
        console.error('Failed to save to localStorage:', error)
      }
    },
    
    getItem<T>(key: string): T | null {
      try {
        const sanitizedKey = sanitizeInput(key)
        const item = localStorage.getItem(sanitizedKey)
        return item ? JSON.parse(item) : null
      } catch (error) {
        console.error('Failed to read from localStorage:', error)
        return null
      }
    },
    
    removeItem(key: string): void {
      try {
        const sanitizedKey = sanitizeInput(key)
        localStorage.removeItem(sanitizedKey)
      } catch (error) {
        console.error('Failed to remove from localStorage:', error)
      }
    }
  }
}