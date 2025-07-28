import type { PlayerStats, GameStage, TurnResult } from '../types/game.types'
import type { ChallengeResult } from '../types/game.types'
import { IdGenerator } from '../../common/IdGenerator'

/**
 * ゲーム進行管理サービス
 * 
 * プレイヤーの統計、ターン管理、ステージ進行を担当するドメインサービス。
 * 単一責任の原則に従い、進行関連のロジックのみを管理。
 */

/**
 * ターン管理インターフェース
 */
export interface TurnManager {
  getCurrentTurn(): number
  incrementTurn(): void
  resetTurn(): void
  getSessionStartTime(): Date
  getElapsedTime(): number
}

/**
 * 統計情報管理インターフェース
 */
export interface StatisticsManager {
  getStats(): PlayerStats
  recordChallengeAttempt(result: ChallengeResult): void
  recordCardAcquisition(): void
  recordVitalityChange(newVitality: number): void
  resetStats(): void
}

/**
 * ターン管理の実装
 */
export class GameTurnManager implements TurnManager {
  private turn: number = 0
  private sessionStartTime: Date = new Date()

  getCurrentTurn(): number {
    return this.turn
  }

  incrementTurn(): void {
    this.turn++
  }

  resetTurn(): void {
    this.turn = 0
    this.sessionStartTime = new Date()
  }

  getSessionStartTime(): Date {
    return this.sessionStartTime
  }

  getElapsedTime(): number {
    return Date.now() - this.sessionStartTime.getTime()
  }
}

/**
 * 統計情報管理の実装
 */
export class GameStatisticsManager implements StatisticsManager {
  private stats: PlayerStats

  constructor(initialStats?: Partial<PlayerStats>) {
    this.stats = {
      totalChallenges: 0,
      successfulChallenges: 0,
      failedChallenges: 0,
      cardsAcquired: 0,
      highestVitality: initialStats?.highestVitality || 100,
      turnsPlayed: 0,
      ...initialStats
    }
  }

  getStats(): PlayerStats {
    return { ...this.stats }
  }

  recordChallengeAttempt(result: ChallengeResult): void {
    this.stats.totalChallenges++
    if (result.success) {
      this.stats.successfulChallenges++
    } else {
      this.stats.failedChallenges++
    }
  }

  recordCardAcquisition(): void {
    this.stats.cardsAcquired++
  }

  recordVitalityChange(newVitality: number): void {
    if (newVitality > this.stats.highestVitality) {
      this.stats.highestVitality = newVitality
    }
  }

  recordTurnPlayed(): void {
    this.stats.turnsPlayed++
  }

  resetStats(): void {
    const highestVitality = this.stats.highestVitality
    this.stats = {
      totalChallenges: 0,
      successfulChallenges: 0,
      failedChallenges: 0,
      cardsAcquired: 0,
      highestVitality,
      turnsPlayed: 0
    }
  }
}

/**
 * ステージ進行の設定
 */
export interface StageProgression {
  stage: GameStage
  requiredTurns: number
  label: string
  maxVitality: number
}

/**
 * ステージ進行管理サービス
 */
export class StageProgressionManager {
  private static readonly STAGE_DEFINITIONS: StageProgression[] = [
    { stage: 'youth', requiredTurns: 0, label: '青年期', maxVitality: 100 },
    { stage: 'middle', requiredTurns: 15, label: '中年期', maxVitality: 80 },
    { stage: 'fulfillment', requiredTurns: 30, label: '充実期', maxVitality: 60 }
  ]

  /**
   * ターン数に基づいて適切なステージを取得
   */
  getStageForTurn(turn: number): GameStage {
    for (let i = this.STAGE_DEFINITIONS.length - 1; i >= 0; i--) {
      const stage = this.STAGE_DEFINITIONS[i]
      if (turn >= stage.requiredTurns) {
        return stage.stage
      }
    }
    return 'youth'
  }

  /**
   * ステージ情報を取得
   */
  getStageInfo(stage: GameStage): StageProgression | undefined {
    return this.STAGE_DEFINITIONS.find(s => s.stage === stage)
  }

  /**
   * 次のステージを取得
   */
  getNextStage(currentStage: GameStage): GameStage | null {
    const currentIndex = this.STAGE_DEFINITIONS.findIndex(s => s.stage === currentStage)
    if (currentIndex === -1 || currentIndex === this.STAGE_DEFINITIONS.length - 1) {
      return null
    }
    return this.STAGE_DEFINITIONS[currentIndex + 1].stage
  }

  /**
   * 次のステージまでのターン数を取得
   */
  getTurnsUntilNextStage(currentStage: GameStage, currentTurn: number): number | null {
    const nextStage = this.getNextStage(currentStage)
    if (!nextStage) return null

    const nextStageInfo = this.getStageInfo(nextStage)
    if (!nextStageInfo) return null

    return Math.max(0, nextStageInfo.requiredTurns - currentTurn)
  }
}

/**
 * ゲーム進行の総合サービス
 */
export class GameProgressService {
  private turnManager: TurnManager
  private statisticsManager: StatisticsManager
  private stageProgressionManager: StageProgressionManager
  private currentStage: GameStage = 'youth'

  constructor(
    initialStats?: Partial<PlayerStats>,
    initialStage: GameStage = 'youth'
  ) {
    this.turnManager = new GameTurnManager()
    this.statisticsManager = new GameStatisticsManager(initialStats)
    this.stageProgressionManager = new StageProgressionManager()
    this.currentStage = initialStage
  }

  /**
   * ゲームを開始
   */
  startGame(): void {
    this.turnManager.resetTurn()
    this.statisticsManager.resetStats()
    this.currentStage = 'youth'
  }

  /**
   * ターンを進める
   */
  nextTurn(): TurnResult {
    this.turnManager.incrementTurn()
    this.statisticsManager.recordTurnPlayed()

    const currentTurn = this.turnManager.getCurrentTurn()
    const newStage = this.stageProgressionManager.getStageForTurn(currentTurn)
    
    let stageChanged = false
    if (newStage !== this.currentStage) {
      this.currentStage = newStage
      stageChanged = true
    }

    return {
      turn: currentTurn,
      stage: this.currentStage,
      stageChanged,
      insuranceExpirations: undefined, // これは別のサービスで管理
      newExpiredCount: 0,
      remainingInsuranceCount: 0
    }
  }

  /**
   * チャレンジ結果を記録
   */
  recordChallengeResult(result: ChallengeResult): void {
    this.statisticsManager.recordChallengeAttempt(result)
  }

  /**
   * カード取得を記録
   */
  recordCardAcquisition(): void {
    this.statisticsManager.recordCardAcquisition()
  }

  /**
   * 活力変更を記録
   */
  recordVitalityChange(newVitality: number): void {
    this.statisticsManager.recordVitalityChange(newVitality)
  }

  /**
   * 現在のターン数を取得
   */
  getCurrentTurn(): number {
    return this.turnManager.getCurrentTurn()
  }

  /**
   * 現在のステージを取得
   */
  getCurrentStage(): GameStage {
    return this.currentStage
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): PlayerStats {
    return this.statisticsManager.getStats()
  }

  /**
   * セッション時間を取得
   */
  getSessionTime(): number {
    return this.turnManager.getElapsedTime()
  }

  /**
   * 次のステージまでの情報を取得
   */
  getNextStageInfo(): { stage: GameStage | null; turnsUntil: number | null } {
    const nextStage = this.stageProgressionManager.getNextStage(this.currentStage)
    const turnsUntil = this.stageProgressionManager.getTurnsUntilNextStage(
      this.currentStage,
      this.turnManager.getCurrentTurn()
    )

    return { stage: nextStage, turnsUntil }
  }

  /**
   * 現在のステージ情報を取得
   */
  getCurrentStageInfo(): StageProgression | undefined {
    return this.stageProgressionManager.getStageInfo(this.currentStage)
  }

  /**
   * プレイ効率を計算
   */
  calculateEfficiency(): {
    successRate: number
    averageTurnsPerChallenge: number
    cardAcquisitionRate: number
  } {
    const stats = this.getStatistics()
    const successRate = stats.totalChallenges > 0 
      ? stats.successfulChallenges / stats.totalChallenges 
      : 0

    const averageTurnsPerChallenge = stats.totalChallenges > 0
      ? stats.turnsPlayed / stats.totalChallenges
      : 0

    const cardAcquisitionRate = stats.turnsPlayed > 0
      ? stats.cardsAcquired / stats.turnsPlayed
      : 0

    return {
      successRate,
      averageTurnsPerChallenge,
      cardAcquisitionRate
    }
  }

  /**
   * パフォーマンス診断
   */
  diagnosePerformance(): {
    level: 'excellent' | 'good' | 'average' | 'needs_improvement'
    recommendations: string[]
  } {
    const efficiency = this.calculateEfficiency()
    const stats = this.getStatistics()

    if (efficiency.successRate >= 0.8 && stats.turnsPlayed >= 10) {
      return {
        level: 'excellent',
        recommendations: ['素晴らしいプレイです！この調子で続けてください。']
      }
    }

    if (efficiency.successRate >= 0.6) {
      return {
        level: 'good',
        recommendations: [
          'チャレンジ成功率を向上させるため、より戦略的なカード選択を心がけましょう。'
        ]
      }
    }

    if (efficiency.successRate >= 0.4) {
      return {
        level: 'average',
        recommendations: [
          '保険カードの活用を検討してください。',
          'チャレンジする前にカードの組み合わせを慎重に検討しましょう。'
        ]
      }
    }

    return {
      level: 'needs_improvement',
      recommendations: [
        'ゲームの基本戦略を見直しましょう。',
        'チャレンジの難易度と手札の強さを比較して判断してください。',
        '保険カードを積極的に活用してリスクを軽減しましょう。'
      ]
    }
  }
}

/**
 * 進行状況のイベント
 */
export interface ProgressEvent {
  id: string
  timestamp: Date
  type: 'turn_advanced' | 'stage_changed' | 'milestone_reached'
  data: any
}

/**
 * 進行状況のイベント発行者
 */
export class ProgressEventEmitter {
  private events: ProgressEvent[] = []
  private listeners: Map<string, ((event: ProgressEvent) => void)[]> = new Map()

  /**
   * イベントリスナーを登録
   */
  on(eventType: string, listener: (event: ProgressEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(listener)
  }

  /**
   * イベントを発行
   */
  emit(type: ProgressEvent['type'], data: any): void {
    const event: ProgressEvent = {
      id: IdGenerator.generate('event'),
      timestamp: new Date(),
      type,
      data
    }

    this.events.push(event)

    // リスナーに通知
    const typeListeners = this.listeners.get(type) || []
    const allListeners = this.listeners.get('*') || []
    
    [...typeListeners, ...allListeners].forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in progress event listener:', error)
      }
    })
  }

  /**
   * イベント履歴を取得
   */
  getEvents(): ReadonlyArray<ProgressEvent> {
    return [...this.events]
  }

  /**
   * イベント履歴をクリア
   */
  clearEvents(): void {
    this.events = []
  }
}