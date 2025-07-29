/**
 * 統一されたID生成ユーティリティ
 * 
 * システム全体で一貫したID生成ロジックを提供し、
 * 重複コードを排除します。
 */
export class IdGenerator {
  private static counter = 0
  
  /**
   * 汎用的なユニークIDを生成
   * @param prefix プレフィックス（例: 'card', 'game', 'cmd'）
   * @returns ユニークなID文字列
   */
  static generate(prefix: string = 'id'): string {
    return `${prefix}_${Date.now()}_${this.getRandomString()}`
  }

  /**
   * カード用IDを生成
   */
  static generateCardId(): string {
    return this.generate('card')
  }

  /**
   * ゲーム用IDを生成
   */
  static generateGameId(): string {
    return this.generate('game')
  }

  /**
   * コマンド用IDを生成
   */
  static generateCommandId(): string {
    return this.generate('cmd')
  }

  /**
   * 通知用IDを生成
   */
  static generateNotificationId(): string {
    return this.generate('notification')
  }

  /**
   * フィードバック用IDを生成
   */
  static generateFeedbackId(): string {
    return this.generate('feedback')
  }

  /**
   * 連番付きIDを生成（テスト時の予測可能性のため）
   */
  static generateSequential(prefix: string = 'seq'): string {
    return `${prefix}_${++this.counter}`
  }

  /**
   * UUIDライクなIDを生成（より強固な一意性が必要な場合）
   */
  static generateUUID(prefix?: string): string {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
    return prefix ? `${prefix}_${uuid}` : uuid
  }

  /**
   * ランダム文字列を生成（内部用）
   */
  private static getRandomString(length: number = 9): string {
    return Math.random().toString(36).substr(2, length)
  }

  /**
   * カウンターをリセット（テスト用）
   */
  static resetCounter(): void {
    this.counter = 0
  }

  /**
   * 現在のカウンター値を取得（テスト用）
   */
  static getCurrentCounter(): number {
    return this.counter
  }
}

/**
 * IDの妥当性をチェックするユーティリティ
 */
export class IdValidator {
  /**
   * IDが有効な形式かチェック
   */
  static isValid(id: string): boolean {
    if (!id || typeof id !== 'string') return false
    
    // 基本的なパターンチェック: prefix_timestamp_randomstring
    const basicPattern = /^[a-zA-Z_]+_\d+_[a-zA-Z0-9]+$/
    if (basicPattern.test(id)) return true
    
    // UUIDパターンチェック
    const uuidPattern = /^[a-zA-Z_]*_?[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidPattern.test(id)
  }

  /**
   * IDからプレフィックスを抽出
   */
  static extractPrefix(id: string): string | null {
    if (!this.isValid(id)) return null
    
    const parts = id.split('_')
    return parts.length > 0 ? parts[0] : null
  }

  /**
   * IDがSpecificなプレフィックスを持っているかチェック
   */
  static hasPrefix(id: string, expectedPrefix: string): boolean {
    const prefix = this.extractPrefix(id)
    return prefix === expectedPrefix
  }
}