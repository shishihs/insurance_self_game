/**
 * ユーザーフレンドリーなエラーメッセージ管理システム
 * 技術的なエラーを分かりやすいメッセージに変換
 */

import type { ErrorInfo } from './ErrorHandler'

export interface UserMessage {
  title: string
  description: string
  actionLabel?: string
  actionType?: 'reload' | 'retry' | 'contact' | 'close' | 'navigate'
  actionData?: Record<string, any>
  icon?: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  showDetails?: boolean
  helpUrl?: string
}

export interface MessagePattern {
  id: string
  pattern: RegExp | string
  message: UserMessage
  conditions?: {
    category?: ErrorInfo['category'][]
    severity?: ErrorInfo['severity'][]
    context?: (errorInfo: ErrorInfo) => boolean
  }
}

export class UserFriendlyMessages {
  private readonly patterns: MessagePattern[] = []
  private readonly fallbackMessages: Map<ErrorInfo['category'], UserMessage> = new Map()

  constructor() {
    this.initializeDefaultPatterns()
    this.initializeFallbackMessages()
  }

  /**
   * デフォルトのメッセージパターンを初期化
   */
  private initializeDefaultPatterns(): void {
    // ネットワーク関連エラー
    this.patterns.push({
      id: 'network-offline',
      pattern: /network|offline|connection/i,
      message: {
        title: 'インターネット接続が切断されています',
        description: 'インターネット接続を確認して、もう一度お試しください。',
        actionLabel: '再試行',
        actionType: 'retry',
        icon: '📡',
        severity: 'error',
        helpUrl: '/help/network-issues'
      },
      conditions: {
        category: ['network']
      }
    })

    this.patterns.push({
      id: 'network-timeout',
      pattern: /timeout|slow/i,
      message: {
        title: '接続が遅くなっています',
        description: 'サーバーへの接続に時間がかかっています。しばらく待ってから再試行してください。',
        actionLabel: 'もう一度試す',
        actionType: 'retry',
        icon: '⏰',
        severity: 'warning'
      },
      conditions: {
        category: ['network', 'async']
      }
    })

    // ゲーム関連エラー
    this.patterns.push({
      id: 'game-save-failed',
      pattern: /save|storage|quota/i,
      message: {
        title: 'ゲームの保存に失敗しました',
        description: 'ゲームデータの保存に失敗しました。ストレージ容量を確認してください。',
        actionLabel: 'ストレージを確認',
        actionType: 'navigate',
        actionData: { url: '/settings/storage' },
        icon: '💾',
        severity: 'error',
        showDetails: true
      },
      conditions: {
        category: ['game', 'system']
      }
    })

    this.patterns.push({
      id: 'game-state-corrupted',
      pattern: /corrupted|invalid.*state|cannot.*read.*game/i,
      message: {
        title: 'ゲームデータに問題があります',
        description: 'ゲームデータが破損している可能性があります。新しいゲームを開始することをお勧めします。',
        actionLabel: '新しいゲーム',
        actionType: 'navigate',
        actionData: { url: '/new-game' },
        icon: '🎮',
        severity: 'critical',
        showDetails: true
      },
      conditions: {
        category: ['game'],
        severity: ['high', 'critical']
      }
    })

    // Vue/UI関連エラー
    this.patterns.push({
      id: 'ui-component-error',
      pattern: /component|render|mount/i,
      message: {
        title: '画面の表示エラー',
        description: '画面の一部が正しく表示されていません。ページを再読み込みすると解決する場合があります。',
        actionLabel: 'ページを再読み込み',
        actionType: 'reload',
        icon: '🖥️',
        severity: 'warning'
      },
      conditions: {
        category: ['vue']
      }
    })

    // パフォーマンス関連
    this.patterns.push({
      id: 'performance-memory',
      pattern: /memory|heap|stack.*overflow/i,
      message: {
        title: 'メモリ不足の可能性があります',
        description: '他のアプリケーションを閉じて、メモリを解放してください。',
        actionLabel: 'ページを再読み込み',
        actionType: 'reload',
        icon: '⚡',
        severity: 'error',
        helpUrl: '/help/performance'
      },
      conditions: {
        category: ['performance', 'system']
      }
    })

    // セキュリティ関連
    this.patterns.push({
      id: 'security-cors',
      pattern: /cors|cross.*origin|blocked/i,
      message: {
        title: 'セキュリティ制限が発生しました',
        description: 'ブラウザのセキュリティ設定により、一部の機能が制限されています。',
        actionLabel: 'サポートに連絡',
        actionType: 'contact',
        icon: '🔒',
        severity: 'error',
        helpUrl: '/help/security-issues'
      },
      conditions: {
        category: ['security']
      }
    })

    // 一般的なJavaScriptエラー
    this.patterns.push({
      id: 'js-undefined',
      pattern: /undefined|null.*property|cannot.*read/i,
      message: {
        title: '予期しないエラーが発生しました',
        description: 'アプリケーションで予期しない問題が発生しました。開発チームに報告されます。',
        actionLabel: 'ページを再読み込み',
        actionType: 'reload',
        icon: '⚠️',
        severity: 'error',
        showDetails: true
      },
      conditions: {
        category: ['javascript'],
        severity: ['high', 'critical']
      }
    })

    // ロード関連エラー
    this.patterns.push({
      id: 'resource-load-failed',
      pattern: /loading|chunk.*error|failed.*fetch.*resource/i,
      message: {
        title: 'リソースの読み込みに失敗しました',
        description: 'ページの一部のリソースが読み込まれませんでした。ページを再読み込みしてください。',
        actionLabel: 'ページを再読み込み',
        actionType: 'reload',
        icon: '📦',
        severity: 'warning'
      },
      conditions: {
        category: ['network', 'system']
      }
    })
  }

  /**
   * カテゴリ別のフォールバックメッセージを初期化
   */
  private initializeFallbackMessages(): void {
    this.fallbackMessages.set('network', {
      title: 'ネットワークエラー',
      description: 'ネットワーク接続に問題が発生しました。',
      actionLabel: '再試行',
      actionType: 'retry',
      icon: '🌐',
      severity: 'error'
    })

    this.fallbackMessages.set('vue', {
      title: 'UI エラー',
      description: '画面の表示に問題が発生しました。',
      actionLabel: 'ページを再読み込み',
      actionType: 'reload',
      icon: '🖼️',
      severity: 'warning'
    })

    this.fallbackMessages.set('javascript', {
      title: 'アプリケーションエラー',
      description: 'アプリケーションで問題が発生しました。',
      actionLabel: 'ページを再読み込み',
      actionType: 'reload',
      icon: '⚙️',
      severity: 'error'
    })

    this.fallbackMessages.set('game', {
      title: 'ゲームエラー',
      description: 'ゲーム中に問題が発生しました。',
      actionLabel: 'ゲームを再開',
      actionType: 'retry',
      icon: '🎮',
      severity: 'error'
    })

    this.fallbackMessages.set('async', {
      title: '処理エラー',
      description: '非同期処理でエラーが発生しました。',
      actionLabel: '再試行',
      actionType: 'retry',
      icon: '⏳',
      severity: 'warning'
    })

    this.fallbackMessages.set('performance', {
      title: 'パフォーマンスの問題',
      description: 'アプリケーションの動作が重くなっています。',
      actionLabel: 'ページを再読み込み',
      actionType: 'reload',
      icon: '🚀',
      severity: 'warning'
    })

    this.fallbackMessages.set('security', {
      title: 'セキュリティエラー',
      description: 'セキュリティ制限により操作が制限されました。',
      actionLabel: 'サポートに連絡',
      actionType: 'contact',
      icon: '🔐',
      severity: 'error'
    })

    this.fallbackMessages.set('user', {
      title: 'ユーザー操作エラー',
      description: '操作に問題が発生しました。',
      actionLabel: 'もう一度試す',
      actionType: 'retry',
      icon: '👤',
      severity: 'info'
    })

    this.fallbackMessages.set('system', {
      title: 'システムエラー',
      description: 'システムで問題が発生しました。',
      actionLabel: 'ページを再読み込み',
      actionType: 'reload',
      icon: '🖥️',
      severity: 'error'
    })
  }

  /**
   * エラー情報からユーザーフレンドリーなメッセージを生成
   */
  generateUserMessage(errorInfo: ErrorInfo): UserMessage {
    // パターンマッチングを試行
    for (const pattern of this.patterns) {
      if (this.matchesPattern(errorInfo, pattern)) {
        return this.enrichMessage(pattern.message, errorInfo)
      }
    }

    // フォールバックメッセージを使用
    const fallback = this.fallbackMessages.get(errorInfo.category)
    if (fallback) {
      return this.enrichMessage(fallback, errorInfo)
    }

    // 最終フォールバック
    return this.enrichMessage({
      title: 'エラーが発生しました',
      description: 'アプリケーションで問題が発生しました。しばらく時間をおいてから再試行してください。',
      actionLabel: 'ページを再読み込み',
      actionType: 'reload',
      icon: '❗',
      severity: 'error'
    }, errorInfo)
  }

  /**
   * パターンがエラーにマッチするかチェック
   */
  private matchesPattern(errorInfo: ErrorInfo, pattern: MessagePattern): boolean {
    // メッセージパターンのチェック
    const messageMatch = pattern.pattern instanceof RegExp
      ? pattern.pattern.test(errorInfo.message)
      : errorInfo.message.toLowerCase().includes(pattern.pattern.toLowerCase())

    if (!messageMatch) {
      return false
    }

    // 条件のチェック
    if (pattern.conditions) {
      const { category, severity, context } = pattern.conditions

      if (category && !category.includes(errorInfo.category)) {
        return false
      }

      if (severity && !severity.includes(errorInfo.severity)) {
        return false
      }

      if (context && !context(errorInfo)) {
        return false
      }
    }

    return true
  }

  /**
   * メッセージを拡張（時間情報など）
   */
  private enrichMessage(message: UserMessage, errorInfo: ErrorInfo): UserMessage {
    const timeString = new Date(errorInfo.timestamp).toLocaleTimeString()
    
    return {
      ...message,
      description: `${message.description}${errorInfo.context?.deviceInfo?.isMobile ? ' (モバイル)' : ''}`,
      actionData: {
        ...message.actionData,
        timestamp: errorInfo.timestamp,
        errorId: errorInfo.fingerprint,
        component: errorInfo.component
      }
    }
  }

  /**
   * カスタムパターンを追加
   */
  addPattern(pattern: MessagePattern): void {
    // 既存のパターンと重複しないかチェック
    const exists = this.patterns.some(p => p.id === pattern.id)
    if (exists) {
      console.warn(`Pattern with id "${pattern.id}" already exists`)
      return
    }

    this.patterns.unshift(pattern) // 新しいパターンを優先
  }

  /**
   * パターンを削除
   */
  removePattern(id: string): boolean {
    const index = this.patterns.findIndex(p => p.id === id)
    if (index !== -1) {
      this.patterns.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * すべてのパターンを取得
   */
  getPatterns(): MessagePattern[] {
    return [...this.patterns]
  }

  /**
   * メッセージのプレビュー（テスト用）
   */
  previewMessage(errorMessage: string, category: ErrorInfo['category'], severity: ErrorInfo['severity'] = 'medium'): UserMessage {
    const mockError: ErrorInfo = {
      message: errorMessage,
      category,
      severity,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    }

    return this.generateUserMessage(mockError)
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    return {
      patternsCount: this.patterns.length,
      categoriesCount: this.fallbackMessages.size,
      patterns: this.patterns.map(p => ({
        id: p.id,
        hasConditions: Boolean(p.conditions)
      }))
    }
  }
}

// シングルトンインスタンス
export const userFriendlyMessages = new UserFriendlyMessages()