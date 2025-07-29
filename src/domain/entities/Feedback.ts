import { IdGenerator } from '../../common/IdGenerator'

/**
 * フィードバックのカテゴリ
 */
export enum FeedbackCategory {
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  UI_UX = 'ui_ux',
  GAMEPLAY = 'gameplay',
  PERFORMANCE = 'performance',
  ACCESSIBILITY = 'accessibility',
  GENERAL = 'general'
}

/**
 * フィードバックの優先度
 */
export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * フィードバックの状態
 */
export enum FeedbackStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

/**
 * 満足度評価
 */
export enum SatisfactionRating {
  VERY_UNSATISFIED = 1,
  UNSATISFIED = 2,
  NEUTRAL = 3,
  SATISFIED = 4,
  VERY_SATISFIED = 5
}

/**
 * フィードバック送信者の情報
 */
export interface FeedbackSubmitter {
  id?: string
  name?: string
  email?: string
  isAnonymous: boolean
  userAgent?: string
  sessionId?: string
}

/**
 * システム情報
 */
export interface SystemInfo {
  userAgent: string
  screenResolution: string
  viewport: string
  gameVersion: string
  timestamp: Date
  gameState?: {
    stage: string
    turn: number
    vitality: number
    phase: string
  }
}

/**
 * バグレポート固有の情報
 */
export interface BugReportData {
  stepsToReproduce: string[]
  expectedBehavior: string
  actualBehavior: string
  screenshot?: string
  errorMessage?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  reproductionRate: 'always' | 'often' | 'sometimes' | 'rarely'
}

/**
 * レビュー・評価データ
 */
export interface ReviewData {
  overallRating: SatisfactionRating
  aspects: {
    gameplay: SatisfactionRating
    ui: SatisfactionRating
    performance: SatisfactionRating
    accessibility: SatisfactionRating
  }
  wouldRecommend: boolean
  playTime?: number
}

/**
 * フィードバックエンティティ
 * ユーザーからのフィードバック情報を管理する
 */
export class Feedback {
  readonly id: string
  readonly category: FeedbackCategory
  readonly title: string
  readonly description: string
  readonly priority: FeedbackPriority
  readonly submitter: FeedbackSubmitter
  readonly systemInfo: SystemInfo
  readonly createdAt: Date
  
  private _status: FeedbackStatus
  private _updatedAt: Date
  private _tags: string[]
  private _adminNotes: string[]
  
  // カテゴリ別の詳細データ
  readonly bugReportData?: BugReportData
  readonly reviewData?: ReviewData
  
  constructor(params: {
    category: FeedbackCategory
    title: string
    description: string
    priority?: FeedbackPriority
    submitter: FeedbackSubmitter
    systemInfo: SystemInfo
    bugReportData?: BugReportData
    reviewData?: ReviewData
    tags?: string[]
  }) {
    this.id = IdGenerator.generateFeedbackId()
    this.category = params.category
    this.title = params.title
    this.description = params.description
    this.priority = params.priority || this.calculateAutoPriority(params)
    this.submitter = params.submitter
    this.systemInfo = params.systemInfo
    this.bugReportData = params.bugReportData
    this.reviewData = params.reviewData
    this.createdAt = new Date()
    
    this._status = FeedbackStatus.SUBMITTED
    this._updatedAt = new Date()
    this._tags = params.tags || []
    this._adminNotes = []
  }

  /**
   * フィードバックの状態を取得
   */
  get status(): FeedbackStatus {
    return this._status
  }

  /**
   * 最終更新日時を取得
   */
  get updatedAt(): Date {
    return this._updatedAt
  }

  /**
   * タグ一覧を取得
   */
  get tags(): string[] {
    return [...this._tags]
  }

  /**
   * 管理者メモを取得
   */
  get adminNotes(): string[] {
    return [...this._adminNotes]
  }

  /**
   * フィードバックの状態を更新
   */
  updateStatus(newStatus: FeedbackStatus): void {
    if (this.isValidStatusTransition(newStatus)) {
      this._status = newStatus
      this._updatedAt = new Date()
    } else {
      throw new Error(`Invalid status transition: ${this._status} -> ${newStatus}`)
    }
  }

  /**
   * タグを追加
   */
  addTag(tag: string): void {
    if (!this._tags.includes(tag)) {
      this._tags.push(tag)
      this._updatedAt = new Date()
    }
  }

  /**
   * タグを削除
   */
  removeTag(tag: string): void {
    const index = this._tags.indexOf(tag)
    if (index > -1) {
      this._tags.splice(index, 1)
      this._updatedAt = new Date()
    }
  }

  /**
   * 管理者メモを追加
   */
  addAdminNote(note: string): void {
    this._adminNotes.push(`${new Date().toISOString()}: ${note}`)
    this._updatedAt = new Date()
  }

  /**
   * フィードバックの優先度を自動計算
   */
  private calculateAutoPriority(params: {
    category: FeedbackCategory
    bugReportData?: BugReportData
    reviewData?: ReviewData
  }): FeedbackPriority {
    // バグレポートの場合、重要度に基づいて優先度を決定
    if (params.category === FeedbackCategory.BUG_REPORT && params.bugReportData) {
      switch (params.bugReportData.severity) {
        case 'critical':
          return FeedbackPriority.CRITICAL
        case 'high':
          return FeedbackPriority.HIGH
        case 'medium':
          return FeedbackPriority.MEDIUM
        case 'low':
          return FeedbackPriority.LOW
      }
    }

    // レビューの場合、評価に基づいて優先度を決定
    if (params.category === FeedbackCategory.GENERAL && params.reviewData) {
      if (params.reviewData.overallRating <= 2) {
        return FeedbackPriority.HIGH // 低評価は優先度高
      } else if (params.reviewData.overallRating >= 4) {
        return FeedbackPriority.MEDIUM // 高評価は中程度
      }
    }

    // アクセシビリティは常に高優先度
    if (params.category === FeedbackCategory.ACCESSIBILITY) {
      return FeedbackPriority.HIGH
    }

    return FeedbackPriority.MEDIUM
  }

  /**
   * 状態遷移の妥当性をチェック
   */
  private isValidStatusTransition(newStatus: FeedbackStatus): boolean {
    const validTransitions: Record<FeedbackStatus, FeedbackStatus[]> = {
      [FeedbackStatus.SUBMITTED]: [
        FeedbackStatus.UNDER_REVIEW,
        FeedbackStatus.CLOSED
      ],
      [FeedbackStatus.UNDER_REVIEW]: [
        FeedbackStatus.IN_PROGRESS,
        FeedbackStatus.CLOSED,
        FeedbackStatus.SUBMITTED
      ],
      [FeedbackStatus.IN_PROGRESS]: [
        FeedbackStatus.RESOLVED,
        FeedbackStatus.UNDER_REVIEW,
        FeedbackStatus.CLOSED
      ],
      [FeedbackStatus.RESOLVED]: [
        FeedbackStatus.CLOSED,
        FeedbackStatus.IN_PROGRESS
      ],
      [FeedbackStatus.CLOSED]: []
    }

    return validTransitions[this._status].includes(newStatus)
  }

  /**
   * バグレポートかどうか判定
   */
  isBugReport(): boolean {
    return this.category === FeedbackCategory.BUG_REPORT && !!this.bugReportData
  }

  /**
   * レビューかどうか判定
   */
  isReview(): boolean {
    return !!this.reviewData
  }

  /**
   * 匿名フィードバックかどうか判定
   */
  isAnonymous(): boolean {
    return this.submitter.isAnonymous
  }

  /**
   * 高優先度かどうか判定
   */
  isHighPriority(): boolean {
    return this.priority === FeedbackPriority.HIGH || 
           this.priority === FeedbackPriority.CRITICAL
  }

  /**
   * フィードバックの概要を取得
   */
  getSummary(): string {
    const categoryLabel = this.getCategoryLabel()
    const priorityLabel = this.getPriorityLabel()
    const statusLabel = this.getStatusLabel()
    
    return `[${categoryLabel}] ${this.title} (${priorityLabel}) - ${statusLabel}`
  }

  /**
   * カテゴリのラベルを取得
   */
  private getCategoryLabel(): string {
    const labels: Record<FeedbackCategory, string> = {
      [FeedbackCategory.BUG_REPORT]: 'バグ報告',
      [FeedbackCategory.FEATURE_REQUEST]: '機能要望',
      [FeedbackCategory.UI_UX]: 'UI/UX',
      [FeedbackCategory.GAMEPLAY]: 'ゲームプレイ',
      [FeedbackCategory.PERFORMANCE]: 'パフォーマンス',
      [FeedbackCategory.ACCESSIBILITY]: 'アクセシビリティ',
      [FeedbackCategory.GENERAL]: '一般'
    }
    return labels[this.category]
  }

  /**
   * 優先度のラベルを取得
   */
  private getPriorityLabel(): string {
    const labels: Record<FeedbackPriority, string> = {
      [FeedbackPriority.LOW]: '低',
      [FeedbackPriority.MEDIUM]: '中',
      [FeedbackPriority.HIGH]: '高',
      [FeedbackPriority.CRITICAL]: '緊急'
    }
    return labels[this.priority]
  }

  /**
   * 状態のラベルを取得
   */
  private getStatusLabel(): string {
    const labels: Record<FeedbackStatus, string> = {
      [FeedbackStatus.SUBMITTED]: '提出済み',
      [FeedbackStatus.UNDER_REVIEW]: '確認中',
      [FeedbackStatus.IN_PROGRESS]: '対応中',
      [FeedbackStatus.RESOLVED]: '解決済み',
      [FeedbackStatus.CLOSED]: '完了'
    }
    return labels[this.status]
  }

  /**
   * JSON形式にシリアライズ
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      category: this.category,
      title: this.title,
      description: this.description,
      priority: this.priority,
      status: this._status,
      submitter: this.submitter,
      systemInfo: this.systemInfo,
      bugReportData: this.bugReportData,
      reviewData: this.reviewData,
      tags: this._tags,
      adminNotes: this._adminNotes,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString()
    }
  }

  /**
   * JSON形式からデシリアライズ
   */
  static fromJSON(data: Record<string, any>): Feedback {
    const feedback = new Feedback({
      category: data.category,
      title: data.title,
      description: data.description,
      priority: data.priority,
      submitter: data.submitter,
      systemInfo: {
        ...data.systemInfo,
        timestamp: new Date(data.systemInfo.timestamp)
      },
      bugReportData: data.bugReportData,
      reviewData: data.reviewData,
      tags: data.tags
    })

    // 内部状態を復元
    feedback._status = data.status
    feedback._updatedAt = new Date(data.updatedAt)
    feedback._adminNotes = data.adminNotes || []

    return feedback
  }
}