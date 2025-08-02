import { 
  type BugReportData, 
  Feedback, 
  FeedbackCategory, 
  FeedbackPriority,
  FeedbackStatus,
  type FeedbackSubmitter,
  type ReviewData,
  SatisfactionRating,
  type SystemInfo
} from '../entities/Feedback'

/**
 * フィードバック検索フィルター
 */
export interface FeedbackFilter {
  categories?: FeedbackCategory[]
  statuses?: FeedbackStatus[]
  priorities?: FeedbackPriority[]
  dateRange?: {
    start: Date
    end: Date
  }
  isAnonymous?: boolean
  tags?: string[]
  searchQuery?: string
}

/**
 * フィードバック統計情報
 */
export interface FeedbackStatistics {
  total: number
  byCategory: Record<FeedbackCategory, number>
  byStatus: Record<FeedbackStatus, number>
  byPriority: Record<FeedbackPriority, number>
  averageSatisfactionRating?: number
  resolvedCount: number
  pendingCount: number
  responseTime: {
    average: number // 平均応答時間（時間）
    median: number
  }
  trends: {
    daily: Record<string, number>
    weekly: Record<string, number>
    monthly: Record<string, number>
  }
}

/**
 * フィードバック作成パラメータ
 */
export interface CreateFeedbackParams {
  category: FeedbackCategory
  title: string
  description: string
  submitter: FeedbackSubmitter
  systemInfo: SystemInfo
  bugReportData?: BugReportData
  reviewData?: ReviewData
  tags?: string[]
}

/**
 * フィードバック管理サービス
 * フィードバックの作成、更新、検索、統計などを管理する
 */
export class FeedbackManagementService {
  private readonly feedbacks: Map<string, Feedback> = new Map()
  private readonly STORAGE_KEY = 'game_feedback_data'

  constructor() {
    this.loadFromStorage()
  }

  /**
   * 新しいフィードバックを作成
   */
  createFeedback(params: CreateFeedbackParams): Feedback {
    const feedback = new Feedback(params)
    this.feedbacks.set(feedback.id, feedback)
    this.saveToStorage()
    
    // 高優先度の場合は即座に通知
    if (feedback.isHighPriority()) {
      this.notifyHighPriorityFeedback(feedback)
    }
    
    return feedback
  }

  /**
   * バグレポートを作成
   */
  createBugReport(params: {
    title: string
    description: string
    submitter: FeedbackSubmitter
    systemInfo: SystemInfo
    bugReportData: BugReportData
    tags?: string[]
  }): Feedback {
    return this.createFeedback({
      category: FeedbackCategory.BUG_REPORT,
      title: params.title,
      description: params.description,
      submitter: params.submitter,
      systemInfo: params.systemInfo,
      bugReportData: params.bugReportData,
      tags: params.tags
    })
  }

  /**
   * レビュー・評価を作成
   */
  createReview(params: {
    title: string
    description: string
    submitter: FeedbackSubmitter
    systemInfo: SystemInfo
    reviewData: ReviewData
    tags?: string[]
  }): Feedback {
    return this.createFeedback({
      category: FeedbackCategory.GENERAL,
      title: params.title,
      description: params.description,
      submitter: params.submitter,
      systemInfo: params.systemInfo,
      reviewData: params.reviewData,
      tags: params.tags
    })
  }

  /**
   * フィードバックをIDで取得
   */
  getFeedbackById(id: string): Feedback | undefined {
    return this.feedbacks.get(id)
  }

  /**
   * フィルター条件でフィードバックを検索
   */
  searchFeedbacks(filter: FeedbackFilter = {}): Feedback[] {
    let results = Array.from(this.feedbacks.values())

    // カテゴリフィルター
    if (filter.categories && filter.categories.length > 0) {
      results = results.filter(f => filter.categories!.includes(f.category))
    }

    // ステータスフィルター
    if (filter.statuses && filter.statuses.length > 0) {
      results = results.filter(f => filter.statuses!.includes(f.status))
    }

    // 優先度フィルター
    if (filter.priorities && filter.priorities.length > 0) {
      results = results.filter(f => filter.priorities!.includes(f.priority))
    }

    // 期間フィルター
    if (filter.dateRange) {
      results = results.filter(f => 
        f.createdAt >= filter.dateRange!.start && 
        f.createdAt <= filter.dateRange!.end
      )
    }

    // 匿名フィルター
    if (filter.isAnonymous !== undefined) {
      results = results.filter(f => f.isAnonymous() === filter.isAnonymous)
    }

    // タグフィルター
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(f => 
        filter.tags!.some(tag => f.tags.includes(tag))
      )
    }

    // テキスト検索
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase()
      results = results.filter(f => 
        f.title.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query) ||
        f.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // 作成日時の降順でソート
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * フィードバックの状態を更新
   */
  updateFeedbackStatus(id: string, newStatus: FeedbackStatus): boolean {
    const feedback = this.feedbacks.get(id)
    if (!feedback) {
      return false
    }

    try {
      feedback.updateStatus(newStatus)
      this.saveToStorage()
      return true
    } catch (error) {
      console.error('Failed to update feedback status:', error)
      return false
    }
  }

  /**
   * フィードバックにタグを追加
   */
  addTagToFeedback(id: string, tag: string): boolean {
    const feedback = this.feedbacks.get(id)
    if (!feedback) {
      return false
    }

    feedback.addTag(tag)
    this.saveToStorage()
    return true
  }

  /**
   * フィードバックに管理者メモを追加
   */
  addAdminNote(id: string, note: string): boolean {
    const feedback = this.feedbacks.get(id)
    if (!feedback) {
      return false
    }

    feedback.addAdminNote(note)
    this.saveToStorage()
    return true
  }

  /**
   * フィードバック統計を取得
   */
  getStatistics(filter: FeedbackFilter = {}): FeedbackStatistics {
    const feedbacks = this.searchFeedbacks(filter)
    
    const stats: FeedbackStatistics = {
      total: feedbacks.length,
      byCategory: {} as Record<FeedbackCategory, number>,
      byStatus: {} as Record<FeedbackStatus, number>,
      byPriority: {} as Record<FeedbackPriority, number>,
      resolvedCount: 0,
      pendingCount: 0,
      responseTime: { average: 0, median: 0 },
      trends: {
        daily: {},
        weekly: {},
        monthly: {}
      }
    }

    // 初期化
    Object.values(FeedbackCategory).forEach(category => {
      stats.byCategory[category] = 0
    })
    Object.values(FeedbackStatus).forEach(status => {
      stats.byStatus[status] = 0
    })
    Object.values(FeedbackPriority).forEach(priority => {
      stats.byPriority[priority] = 0
    })

    // 統計計算
    const responseTimes: number[] = []
    let totalSatisfactionRating = 0
    let reviewCount = 0

    feedbacks.forEach(feedback => {
      // カテゴリ別
      stats.byCategory[feedback.category]++
      
      // ステータス別
      stats.byStatus[feedback.status]++
      
      // 優先度別
      stats.byPriority[feedback.priority]++

      // 解決・未解決カウント
      if (feedback.status === FeedbackStatus.RESOLVED || 
          feedback.status === FeedbackStatus.CLOSED) {
        stats.resolvedCount++
      } else {
        stats.pendingCount++
      }

      // 応答時間計算
      if (feedback.status !== FeedbackStatus.SUBMITTED) {
        const responseTime = (feedback.updatedAt.getTime() - feedback.createdAt.getTime()) / (1000 * 60 * 60) // 時間
        responseTimes.push(responseTime)
      }

      // 満足度評価
      if (feedback.reviewData) {
        totalSatisfactionRating += feedback.reviewData.overallRating
        reviewCount++
      }

      // トレンド分析
      const dateKey = feedback.createdAt.toISOString().split('T')[0] // YYYY-MM-DD
      stats.trends.daily[dateKey] = (stats.trends.daily[dateKey] || 0) + 1
    })

    // 平均満足度
    if (reviewCount > 0) {
      stats.averageSatisfactionRating = totalSatisfactionRating / reviewCount
    }

    // 応答時間統計
    if (responseTimes.length > 0) {
      stats.responseTime.average = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      
      const sortedTimes = responseTimes.sort((a, b) => a - b)
      const midIndex = Math.floor(sortedTimes.length / 2)
      stats.responseTime.median = sortedTimes.length % 2 === 0
        ? (sortedTimes[midIndex - 1] + sortedTimes[midIndex]) / 2
        : sortedTimes[midIndex]
    }

    return stats
  }

  /**
   * 高優先度フィードバックを取得
   */
  getHighPriorityFeedbacks(): Feedback[] {
    return this.searchFeedbacks({
      priorities: [FeedbackPriority.HIGH, FeedbackPriority.CRITICAL],
      statuses: [FeedbackStatus.SUBMITTED, FeedbackStatus.UNDER_REVIEW, FeedbackStatus.IN_PROGRESS]
    })
  }

  /**
   * 未解決のバグレポートを取得
   */
  getUnresolvedBugReports(): Feedback[] {
    return this.searchFeedbacks({
      categories: [FeedbackCategory.BUG_REPORT],
      statuses: [FeedbackStatus.SUBMITTED, FeedbackStatus.UNDER_REVIEW, FeedbackStatus.IN_PROGRESS]
    })
  }

  /**
   * 最新のレビューを取得
   */
  getRecentReviews(limit: number = 10): Feedback[] {
    const reviews = this.searchFeedbacks({
      categories: [FeedbackCategory.GENERAL]
    }).filter(f => f.isReview())

    return reviews.slice(0, limit)
  }

  /**
   * フィードバックを削除
   */
  deleteFeedback(id: string): boolean {
    const result = this.feedbacks.delete(id)
    if (result) {
      this.saveToStorage()
    }
    return result
  }

  /**
   * 全フィードバックを取得
   */
  getAllFeedbacks(): Feedback[] {
    return Array.from(this.feedbacks.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * フィードバックデータをエクスポート
   */
  exportFeedbacks(): string {
    const data = Array.from(this.feedbacks.values()).map(f => f.toJSON())
    return JSON.stringify(data, null, 2)
  }

  /**
   * フィードバックデータをインポート
   */
  importFeedbacks(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData)
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format')
      }

      data.forEach(item => {
        const feedback = Feedback.fromJSON(item)
        this.feedbacks.set(feedback.id, feedback)
      })

      this.saveToStorage()
      return true
    } catch (error) {
      console.error('Failed to import feedbacks:', error)
      return false
    }
  }

  /**
   * 満足度調査の結果を取得
   */
  getSatisfactionSurveyResults(): {
    averageRating: number
    totalResponses: number
    ratingDistribution: Record<SatisfactionRating, number>
    aspectRatings: {
      gameplay: number
      ui: number
      performance: number
      accessibility: number
    }
    recommendationRate: number
  } {
    const reviews = this.getAllFeedbacks().filter(f => f.isReview())
    
    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalResponses: 0,
        ratingDistribution: {} as Record<SatisfactionRating, number>,
        aspectRatings: { gameplay: 0, ui: 0, performance: 0, accessibility: 0 },
        recommendationRate: 0
      }
    }

    let totalRating = 0
    let totalRecommendations = 0
    const ratingDistribution: Record<SatisfactionRating, number> = {
      [SatisfactionRating.VERY_UNSATISFIED]: 0,
      [SatisfactionRating.UNSATISFIED]: 0,
      [SatisfactionRating.NEUTRAL]: 0,
      [SatisfactionRating.SATISFIED]: 0,
      [SatisfactionRating.VERY_SATISFIED]: 0
    }
    
    const aspectTotals = { gameplay: 0, ui: 0, performance: 0, accessibility: 0 }

    reviews.forEach(feedback => {
      if (feedback.reviewData) {
        const { overallRating, aspects, wouldRecommend } = feedback.reviewData
        
        totalRating += overallRating
        ratingDistribution[overallRating]++
        
        if (wouldRecommend) totalRecommendations++
        
        aspectTotals.gameplay += aspects.gameplay
        aspectTotals.ui += aspects.ui
        aspectTotals.performance += aspects.performance
        aspectTotals.accessibility += aspects.accessibility
      }
    })

    return {
      averageRating: totalRating / reviews.length,
      totalResponses: reviews.length,
      ratingDistribution,
      aspectRatings: {
        gameplay: aspectTotals.gameplay / reviews.length,
        ui: aspectTotals.ui / reviews.length,
        performance: aspectTotals.performance / reviews.length,
        accessibility: aspectTotals.accessibility / reviews.length
      },
      recommendationRate: (totalRecommendations / reviews.length) * 100
    }
  }

  /**
   * ローカルストレージからデータを読み込み
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      if (data) {
        const feedbacksData = JSON.parse(data)
        feedbacksData.forEach((item: any) => {
          const feedback = Feedback.fromJSON(item)
          this.feedbacks.set(feedback.id, feedback)
        })
      }
    } catch (error) {
      console.error('Failed to load feedback data from storage:', error)
    }
  }

  /**
   * ローカルストレージにデータを保存
   */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.feedbacks.values()).map(f => f.toJSON())
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save feedback data to storage:', error)
    }
  }

  /**
   * 高優先度フィードバックの通知
   */
  private notifyHighPriorityFeedback(feedback: Feedback): void {
    // 実際の実装では、管理者への通知やアラートを送信
    console.warn(`🚨 高優先度フィードバック: ${feedback.getSummary()}`)
    
    // 将来的には以下のような通知機能を実装可能：
    // - メール通知
    // - Slack通知
    // - デスクトップ通知
    // - 管理画面での強調表示
  }
}