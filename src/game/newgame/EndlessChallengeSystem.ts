/**
 * エンドレス・チャレンジシステム - 無限のリプレイ価値
 * 
 * このシステムは以下の機能を提供します：
 * - エンドレスモード（無限続行）
 * - 日替わり/週替わりチャレンジ
 * - シーズナルイベント
 * - コミュニティチャレンジ
 * - 動的難易度調整
 */

import type { Game } from '../../domain/entities/Game'
import type { Card } from '../../domain/entities/Card'
import type { GameStage } from '../../domain/types/card.types'

/**
 * エンドレスモードの設定
 */
export interface EndlessModeConfig {
  startingDifficulty: number        // 初期難易度 (1-10)
  difficultyScaling: number         // 難易度上昇率
  rewardMultiplier: number          // 報酬倍率
  specialEventsEnabled: boolean     // 特殊イベント有効
  infiniteStages: boolean           // 無限ステージ
  progressiveUnlocks: boolean       // 段階的解放
}

/**
 * チャレンジの種類
 */
export type ChallengeType = 
  | 'daily'        // 日替わり
  | 'weekly'       // 週替わり
  | 'seasonal'     // シーズナル
  | 'community'    // コミュニティ
  | 'special'      // 特別
  | 'endless'      // エンドレス

/**
 * チャレンジ情報
 */
export interface Challenge {
  id: string
  type: ChallengeType
  name: string
  description: string
  objectives: ChallengeObjective[]
  constraints: ChallengeConstraint[]
  rewards: ChallengeReward[]
  difficulty: number
  timeLimit?: Date
  participantCount?: number
  isActive: boolean
  completionRate: number
}

/**
 * チャレンジ目標
 */
export interface ChallengeObjective {
  id: string
  description: string
  type: 'score' | 'survival' | 'speed' | 'efficiency' | 'special'
  target: number | string
  current: number | string
  completed: boolean
  progress: number // 0-100%
}

/**
 * チャレンジ制約
 */
export interface ChallengeConstraint {
  id: string
  type: 'no_insurance' | 'limited_turns' | 'low_vitality' | 'specific_cards' | 'special_rule'
  description: string
  value?: number | string
  active: boolean
}

/**
 * チャレンジ報酬
 */
export interface ChallengeReward {
  type: 'points' | 'title' | 'cosmetic' | 'unlock' | 'achievement'
  id: string
  name: string
  description: string
  value?: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

/**
 * エンドレス進行状況
 */
export interface EndlessProgress {
  currentWave: number              // 現在のウェーブ
  currentDifficulty: number        // 現在の難易度
  totalScore: number               // 累計スコア
  survivedWaves: number           // 生存ウェーブ数
  specialEventsEncountered: number // 特殊イベント遭遇数
  powerUpsCollected: string[]     // 収集したパワーアップ
  milestonesReached: Milestone[]  // 到達したマイルストーン
}

/**
 * マイルストーン
 */
export interface Milestone {
  wave: number
  name: string
  description: string
  reward: string
  achieved: boolean
  achievedAt?: Date
}

/**
 * 特殊イベント
 */
export interface SpecialEvent {
  id: string
  name: string
  description: string
  type: 'bonus' | 'challenge' | 'story' | 'mystery'
  triggerCondition: EventTrigger
  effects: EventEffect[]
  choices?: EventChoice[]
  rarity: number // 0-1, 低いほどレア
}

/**
 * イベント発動条件
 */
export interface EventTrigger {
  type: 'wave' | 'score' | 'vitality' | 'random' | 'time'
  condition: string
  value?: number
}

/**
 * イベント効果
 */
export interface EventEffect {
  type: 'vitality' | 'cards' | 'difficulty' | 'score' | 'special'
  value: number | string
  description: string
  duration?: number // ターン数、永続の場合は-1
}

/**
 * イベント選択肢
 */
export interface EventChoice {
  id: string
  text: string
  effects: EventEffect[]
  riskLevel: 'safe' | 'moderate' | 'risky' | 'extreme'
}

/**
 * シーズン情報
 */
export interface Season {
  id: string
  name: string
  theme: string
  startDate: Date
  endDate: Date
  specialRules: SeasonalRule[]
  exclusiveRewards: ChallengeReward[]
  isActive: boolean
}

/**
 * シーズナルルール
 */
export interface SeasonalRule {
  id: string
  name: string
  description: string
  effect: GameModifier
}

/**
 * ゲーム修飾子
 */
interface GameModifier {
  target: string
  operation: 'multiply' | 'add' | 'set' | 'enable'
  value: number | boolean | string
}

/**
 * エンドレス・チャレンジシステム
 */
export class EndlessChallengeSystem {
  private readonly activeChallenges: Map<string, Challenge>
  private endlessProgress: EndlessProgress
  private readonly specialEvents: Map<string, SpecialEvent>
  private readonly currentSeason?: Season
  private readonly dailyChallengeHistory: Challenge[]
  private readonly personalBests: Map<string, number>

  constructor() {
    this.activeChallenges = new Map()
    this.endlessProgress = this.initializeEndlessProgress()
    this.specialEvents = new Map()
    this.dailyChallengeHistory = []
    this.personalBests = new Map()
    this.initializeSpecialEvents()
    this.generateDailyChallenge()
  }

  /**
   * エンドレス進行状況を初期化
   */
  private initializeEndlessProgress(): EndlessProgress {
    return {
      currentWave: 1,
      currentDifficulty: 1,
      totalScore: 0,
      survivedWaves: 0,
      specialEventsEncountered: 0,
      powerUpsCollected: [],
      milestonesReached: []
    }
  }

  /**
   * 特殊イベントを初期化
   */
  private initializeSpecialEvents(): void {
    // ボーナスイベント
    this.specialEvents.set('vitality_fountain', {
      id: 'vitality_fountain',
      name: '生命の泉',
      description: '神秘的な泉があなたの活力を回復してくれます',
      type: 'bonus',
      triggerCondition: {
        type: 'vitality',
        condition: 'less_than',
        value: 30
      },
      effects: [
        {
          type: 'vitality',
          value: 25,
          description: '活力が25回復'
        }
      ],
      rarity: 0.3
    })

    // チャレンジイベント
    this.specialEvents.set('insurance_salesman', {
      id: 'insurance_salesman',
      name: '保険営業マン',
      description: '熱心な保険営業マンに出会いました。どうしますか？',
      type: 'challenge',
      triggerCondition: {
        type: 'wave',
        condition: 'multiple_of',
        value: 5
      },
      effects: [],
      choices: [
        {
          id: 'buy_premium',
          text: 'プレミアム保険を購入する',
          effects: [
            { type: 'cards', value: 'premium_insurance', description: 'プレミアム保険カードを獲得' },
            { type: 'vitality', value: -10, description: '高額な保険料で活力減少' }
          ],
          riskLevel: 'moderate'
        },
        {
          id: 'negotiate',
          text: '値引き交渉をする',
          effects: [
            { type: 'cards', value: 'basic_insurance', description: '基本保険カードを獲得' },
            { type: 'vitality', value: -3, description: '交渉ストレス' }
          ],
          riskLevel: 'safe'
        },
        {
          id: 'refuse',
          text: 'きっぱりと断る',
          effects: [
            { type: 'score', value: 100, description: '決断力ボーナス' }
          ],
          riskLevel: 'safe'
        }
      ],
      rarity: 0.4
    })

    // ストーリーイベント
    this.specialEvents.set('life_crossroads', {
      id: 'life_crossroads',
      name: '人生の分岐点',
      description: '重要な人生の選択に直面しています',
      type: 'story',
      triggerCondition: {
        type: 'wave',
        condition: 'equal',
        value: 10
      },
      effects: [],
      choices: [
        {
          id: 'take_big_risk',
          text: '大きなリスクを取って夢を追う',
          effects: [
            { type: 'difficulty', value: 2, description: '難易度が上昇' },
            { type: 'score', value: 500, description: '大きなスコアボーナス' }
          ],
          riskLevel: 'extreme'
        },
        {
          id: 'stay_safe',
          text: '安全な道を選ぶ',
          effects: [
            { type: 'vitality', value: 15, description: '安心感による活力回復' },
            { type: 'cards', value: 'stability_bonus', description: '安定ボーナスカード' }
          ],
          riskLevel: 'safe'
        }
      ],
      rarity: 0.1
    })

    // 謎のイベント
    this.specialEvents.set('mystery_box', {
      id: 'mystery_box',
      name: '謎の箱',
      description: '謎めいた箱を発見しました。開けますか？',
      type: 'mystery',
      triggerCondition: {
        type: 'random',
        condition: 'probability',
        value: 0.05
      },
      effects: [],
      choices: [
        {
          id: 'open_box',
          text: '箱を開ける',
          effects: [
            { type: 'special', value: 'random_effect', description: 'ランダムな効果が発生' }
          ],
          riskLevel: 'risky'
        },
        {
          id: 'leave_box',
          text: '箱を置いて去る',
          effects: [
            { type: 'score', value: 50, description: '慎重さボーナス' }
          ],
          riskLevel: 'safe'
        }
      ],
      rarity: 0.05
    })
  }

  /**
   * エンドレスモードを開始
   */
  startEndlessMode(config: EndlessModeConfig): {
    gameConfig: any
    initialWave: EndlessWave
    milestones: Milestone[]
  } {
    this.endlessProgress = this.initializeEndlessProgress()
    this.endlessProgress.currentDifficulty = config.startingDifficulty

    const gameConfig = {
      mode: 'endless',
      difficulty: config.startingDifficulty,
      specialEventsEnabled: config.specialEventsEnabled,
      rewardMultiplier: config.rewardMultiplier
    }

    const initialWave = this.generateWave(1, config.startingDifficulty)
    const milestones = this.generateMilestones()

    return { gameConfig, initialWave, milestones }
  }

  /**
   * ウェーブを生成
   */
  private generateWave(waveNumber: number, difficulty: number): EndlessWave {
    const baseChallengePower = 10 + (waveNumber - 1) * 2
    const adjustedPower = Math.round(baseChallengePower * (1 + difficulty * 0.1))

    return {
      number: waveNumber,
      difficulty,
      challenges: this.generateWaveChallenges(adjustedPower, difficulty),
      specialEvent: this.maybeGenerateSpecialEvent(waveNumber),
      rewards: this.generateWaveRewards(waveNumber, difficulty),
      description: this.generateWaveDescription(waveNumber, difficulty)
    }
  }

  /**
   * ウェーブのチャレンジを生成
   */
  private generateWaveChallenges(basePower: number, difficulty: number): WaveChallenge[] {
    const challengeCount = Math.min(5, 2 + Math.floor(difficulty / 2))
    const challenges: WaveChallenge[] = []

    for (let i = 0; i < challengeCount; i++) {
      const power = basePower + Math.floor(Math.random() * 5) - 2
      challenges.push({
        id: `challenge_${i}`,
        name: this.generateChallengeName(),
        power: Math.max(1, power),
        type: this.selectChallengeType(difficulty),
        description: '困難なチャレンジがあなたを待っています',
        specialRules: this.generateSpecialRules(difficulty)
      })
    }

    return challenges
  }

  /**
   * 特殊イベントを生成（確率的）
   */
  private maybeGenerateSpecialEvent(waveNumber: number): SpecialEvent | undefined {
    for (const event of this.specialEvents.values()) {
      if (this.checkEventTrigger(event.triggerCondition, waveNumber)) {
        if (Math.random() < event.rarity) {
          return event
        }
      }
    }
    return undefined
  }

  /**
   * イベント発動条件をチェック
   */
  private checkEventTrigger(trigger: EventTrigger, waveNumber: number): boolean {
    switch (trigger.type) {
      case 'wave':
        switch (trigger.condition) {
          case 'equal':
            return waveNumber === trigger.value
          case 'multiple_of':
            return waveNumber % (trigger.value || 1) === 0
          case 'greater_than':
            return waveNumber > (trigger.value || 0)
          default:
            return false
        }
      case 'random':
        return trigger.condition === 'probability'
      case 'vitality':
        // 実際のゲーム状態が必要
        return true
      default:
        return false
    }
  }

  /**
   * ウェーブの報酬を生成
   */
  private generateWaveRewards(waveNumber: number, difficulty: number): ChallengeReward[] {
    const rewards: ChallengeReward[] = []
    
    // 基本スコア報酬
    rewards.push({
      type: 'points',
      id: 'wave_completion',
      name: 'ウェーブクリア',
      description: `ウェーブ${waveNumber}クリア報酬`,
      value: 100 + waveNumber * 50 + difficulty * 25,
      rarity: 'common'
    })

    // マイルストーン報酬
    if (waveNumber % 5 === 0) {
      rewards.push({
        type: 'cosmetic',
        id: `milestone_${waveNumber}`,
        name: `${waveNumber}ウェーブ記念品`,
        description: '特別な記念アイテム',
        rarity: 'rare'
      })
    }

    // 高難易度ボーナス
    if (difficulty >= 7) {
      rewards.push({
        type: 'points',
        id: 'high_difficulty_bonus',
        name: '高難易度ボーナス',
        description: '困難を乗り越えた証',
        value: difficulty * 100,
        rarity: 'epic'
      })
    }

    return rewards
  }

  /**
   * マイルストーンを生成
   */
  private generateMilestones(): Milestone[] {
    const milestones: Milestone[] = []

    for (let wave = 5; wave <= 100; wave += 5) {
      milestones.push({
        wave,
        name: `${wave}ウェーブ達成`,
        description: `エンドレスモードで${wave}ウェーブを生き抜く`,
        reward: this.generateMilestoneReward(wave),
        achieved: false
      })
    }

    return milestones
  }

  /**
   * マイルストーン報酬を生成
   */
  private generateMilestoneReward(wave: number): string {
    if (wave >= 50) return 'レジェンド称号'
    if (wave >= 25) return 'エキスパート称号'
    if (wave >= 10) return '専用テーマ解放'
    return 'スコアボーナス'
  }

  /**
   * ウェーブを完了
   */
  completeWave(game: Game, waveResult: WaveResult): {
    nextWave?: EndlessWave
    newMilestones: Milestone[]
    finalScore?: number
    gameOver: boolean
  } {
    this.endlessProgress.survivedWaves++
    this.endlessProgress.totalScore += waveResult.scoreGained
    this.endlessProgress.currentWave++

    // 難易度を調整
    this.adjustDifficulty(waveResult)

    // マイルストーンチェック
    const newMilestones = this.checkMilestones()

    // ゲームオーバーチェック
    if (game.isGameOver()) {
      return {
        newMilestones,
        finalScore: this.endlessProgress.totalScore,
        gameOver: true
      }
    }

    // 次のウェーブを生成
    const nextWave = this.generateWave(
      this.endlessProgress.currentWave,
      this.endlessProgress.currentDifficulty
    )

    return {
      nextWave,
      newMilestones,
      gameOver: false
    }
  }

  /**
   * 難易度を動的調整
   */
  private adjustDifficulty(waveResult: WaveResult): void {
    const performance = waveResult.performance

    // パフォーマンスに基づく調整
    if (performance >= 0.9) {
      // 非常に良い成績 - 難易度上昇
      this.endlessProgress.currentDifficulty = Math.min(10, this.endlessProgress.currentDifficulty + 0.5)
    } else if (performance >= 0.7) {
      // 良い成績 - 小幅上昇
      this.endlessProgress.currentDifficulty = Math.min(10, this.endlessProgress.currentDifficulty + 0.2)
    } else if (performance < 0.3) {
      // 苦戦している - 難易度下降
      this.endlessProgress.currentDifficulty = Math.max(1, this.endlessProgress.currentDifficulty - 0.3)
    }
  }

  /**
   * マイルストーンチェック
   */
  private checkMilestones(): Milestone[] {
    const newMilestones: Milestone[] = []
    const currentWave = this.endlessProgress.currentWave - 1 // 完了したウェーブ

    this.endlessProgress.milestonesReached.forEach(milestone => {
      if (!milestone.achieved && currentWave >= milestone.wave) {
        milestone.achieved = true
        milestone.achievedAt = new Date()
        newMilestones.push(milestone)
      }
    })

    return newMilestones
  }

  /**
   * 日替わりチャレンジを生成
   */
  generateDailyChallenge(): Challenge {
    const today = new Date()
    const seed = today.getDate() + today.getMonth() * 31 + today.getFullYear() * 365

    // シード値に基づいて再現可能なランダム生成
    const random = this.seededRandom(seed)
    
    const challengeTypes = ['score', 'survival', 'speed', 'efficiency']
    const selectedType = challengeTypes[Math.floor(random() * challengeTypes.length)]

    const challenge: Challenge = {
      id: `daily_${today.getFullYear()}_${today.getMonth()}_${today.getDate()}`,
      type: 'daily',
      name: this.generateDailyChallengeTitle(selectedType),
      description: this.generateDailyChallengeDescription(selectedType),
      objectives: this.generateDailyChallengeObjectives(selectedType, random),
      constraints: this.generateDailyChallengeConstraints(random),
      rewards: this.generateDailyChallengeRewards(),
      difficulty: 5 + Math.floor(random() * 3), // 5-7
      timeLimit: new Date(today.getTime() + 24 * 60 * 60 * 1000), // 24時間
      isActive: true,
      completionRate: 0
    }

    this.activeChallenges.set(challenge.id, challenge)
    return challenge
  }

  /**
   * シード値ベースの疑似乱数生成器
   */
  private seededRandom(seed: number): () => number {
    let state = seed
    return () => {
      state = (state * 1664525 + 1013904223) % 2**32
      return state / 2**32
    }
  }

  /**
   * 週替わりチャレンジを生成
   */
  generateWeeklyChallenge(): Challenge {
    const now = new Date()
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    
    const challenge: Challenge = {
      id: `weekly_${weekStart.getTime()}`,
      type: 'weekly',
      name: '週間エキスパートチャレンジ',
      description: '一週間限定の高難易度チャレンジ',
      objectives: [
        {
          id: 'weekly_score',
          description: '週間累計スコア15000点達成',
          type: 'score',
          target: 15000,
          current: 0,
          completed: false,
          progress: 0
        },
        {
          id: 'weekly_survival',
          description: '3回連続でクリア達成',
          type: 'survival',
          target: 3,
          current: 0,
          completed: false,
          progress: 0
        }
      ],
      constraints: [
        {
          id: 'hard_mode_only',
          type: 'special_rule',
          description: 'ハードモード以上でのみ有効',
          active: true
        }
      ],
      rewards: [
        {
          type: 'title',
          id: 'weekly_champion',
          name: '週間チャンピオン',
          description: '週間チャレンジの勝者',
          rarity: 'epic'
        },
        {
          type: 'points',
          id: 'weekly_bonus',
          name: '週間ボーナス',
          description: '大量のボーナスポイント',
          value: 5000,
          rarity: 'rare'
        }
      ],
      difficulty: 8,
      timeLimit: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      completionRate: 0
    }

    this.activeChallenges.set(challenge.id, challenge)
    return challenge
  }

  /**
   * チャレンジの進行状況を更新
   */
  updateChallengeProgress(challengeId: string, game: Game, result: any): boolean {
    const challenge = this.activeChallenges.get(challengeId)
    if (!challenge?.isActive) return false

    let anyObjectiveCompleted = false

    challenge.objectives.forEach(objective => {
      if (objective.completed) return

      const newValue = this.calculateObjectiveProgress(objective, game, result)
      objective.current = newValue

      if (typeof objective.target === 'number' && typeof newValue === 'number') {
        objective.progress = Math.min(100, (newValue / objective.target) * 100)
        if (newValue >= objective.target) {
          objective.completed = true
          anyObjectiveCompleted = true
        }
      }
    })

    return anyObjectiveCompleted
  }

  /**
   * 目標の進行状況を計算
   */
  private calculateObjectiveProgress(objective: ChallengeObjective, game: Game, result: any): number | string {
    switch (objective.type) {
      case 'score':
        return result.totalScore || 0
      case 'survival':
        return game.isCompleted() ? (objective.current as number) + 1 : objective.current
      case 'speed':
        return game.turn
      case 'efficiency':
        return game.getAvailableVitality()
      default:
        return objective.current
    }
  }

  /**
   * 現在のアクティブチャレンジを取得
   */
  getActiveChallenges(): Challenge[] {
    const now = new Date()
    return Array.from(this.activeChallenges.values()).filter(challenge => {
      if (!challenge.timeLimit) return challenge.isActive
      return challenge.isActive && challenge.timeLimit > now
    })
  }

  /**
   * エンドレスモードの統計を取得
   */
  getEndlessStats(): {
    progress: EndlessProgress
    personalBests: Map<string, number>
    totalPlaytime: number
    favoriteWaveRange: string
  } {
    const personalBests = new Map(this.personalBests)
    
    // 最高到達ウェーブを記録
    if (this.endlessProgress.survivedWaves > (personalBests.get('highest_wave') || 0)) {
      personalBests.set('highest_wave', this.endlessProgress.survivedWaves)
    }

    return {
      progress: this.endlessProgress,
      personalBests,
      totalPlaytime: 0, // 実装では実際のプレイ時間を追跡
      favoriteWaveRange: this.calculateFavoriteWaveRange()
    }
  }

  /**
   * お気に入りのウェーブ範囲を計算
   */
  private calculateFavoriteWaveRange(): string {
    const survived = this.endlessProgress.survivedWaves
    if (survived >= 50) return '50+ウェーブ'
    if (survived >= 25) return '25-49ウェーブ'
    if (survived >= 10) return '10-24ウェーブ'
    return '1-9ウェーブ'
  }

  // ヘルパーメソッド
  private generateChallengeName(): string {
    const names = [
      '運命の試練', '困難への挑戦', '逆境の克服', '未知への探求',
      '勇気の証明', '知恵の試験', '忍耐のテスト', '決断の瞬間'
    ]
    return names[Math.floor(Math.random() * names.length)]
  }

  private selectChallengeType(difficulty: number): string {
    const types = ['vitality', 'insurance', 'efficiency', 'survival']
    return types[Math.floor(Math.random() * types.length)]
  }

  private generateSpecialRules(difficulty: number): string[] {
    if (difficulty < 5) return []
    
    const rules = ['制限時間あり', '特殊条件', '追加効果']
    return rules.slice(0, Math.floor(difficulty / 3))
  }

  private generateWaveDescription(waveNumber: number, difficulty: number): string {
    if (waveNumber <= 5) return '人生の序章 - まだ穏やかな日々'
    if (waveNumber <= 15) return '試練の始まり - 困難が現れ始める'
    if (waveNumber <= 30) return '本格的な挑戦 - 真の実力が試される'
    if (waveNumber <= 50) return '熟練者の域 - 高度な戦略が求められる'
    return '伝説への道 - 未踏の領域'
  }

  private generateDailyChallengeTitle(type: string): string {
    const titles = {
      score: '今日のハイスコア挑戦',
      survival: '今日のサバイバル',
      speed: '今日のスピードラン',
      efficiency: '今日の効率チャレンジ'
    }
    return titles[type as keyof typeof titles] || '今日の特別チャレンジ'
  }

  private generateDailyChallengeDescription(type: string): string {
    const descriptions = {
      score: '高スコアを目指して挑戦しましょう',
      survival: '困難な状況下での生存に挑戦',
      speed: '制限時間内でのクリアを目指す',
      efficiency: '最小限のリソースで最大の成果を'
    }
    return descriptions[type as keyof typeof descriptions] || '特別な条件での挑戦'
  }

  private generateDailyChallengeObjectives(type: string, random: () => number): ChallengeObjective[] {
    const baseTargets = {
      score: 5000 + Math.floor(random() * 3000),
      survival: 3 + Math.floor(random() * 3),
      speed: 15 + Math.floor(random() * 10),
      efficiency: 50 + Math.floor(random() * 30)
    }

    return [{
      id: `daily_${type}`,
      description: `${type}目標達成`,
      type: type as any,
      target: baseTargets[type as keyof typeof baseTargets],
      current: 0,
      completed: false,
      progress: 0
    }]
  }

  private generateDailyChallengeConstraints(random: () => number): ChallengeConstraint[] {
    const constraints = []
    
    if (random() < 0.3) {
      constraints.push({
        id: 'limited_insurance',
        type: 'limited_turns',
        description: '保険は最大2つまで',
        value: 2,
        active: true
      })
    }

    return constraints
  }

  private generateDailyChallengeRewards(): ChallengeReward[] {
    return [
      {
        type: 'points',
        id: 'daily_completion',
        name: '日替わりボーナス',
        description: 'デイリーチャレンジクリア報酬',
        value: 1000,
        rarity: 'common'
      },
      {
        type: 'achievement',
        id: 'daily_achiever',
        name: '日課の達成者',
        description: 'デイリーチャレンジを完了',
        rarity: 'common'
      }
    ]
  }
}

/**
 * エンドレスウェーブ
 */
interface EndlessWave {
  number: number
  difficulty: number
  challenges: WaveChallenge[]
  specialEvent?: SpecialEvent
  rewards: ChallengeReward[]
  description: string
}

/**
 * ウェーブのチャレンジ
 */
interface WaveChallenge {
  id: string
  name: string
  power: number
  type: string
  description: string
  specialRules: string[]
}

/**
 * ウェーブ結果
 */
interface WaveResult {
  completed: boolean
  scoreGained: number
  performance: number // 0-1
  specialEventChoice?: string
}