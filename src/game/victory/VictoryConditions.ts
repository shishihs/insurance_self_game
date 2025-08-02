/**
 * 複数勝利条件システム - 多様なクリア方法の実装
 * 
 * このシステムは以下の機能を提供します：
 * - スピードクリア: 制限時間内でのクリア
 * - パーフェクトクリア: ミス0回でのクリア
 * - エコノミークリア: 最小限のリソース使用
 * - チャレンジクリア: 高難易度条件でのクリア
 */

import type { Game } from '../../domain/entities/Game'
import type { GameStage } from '../../domain/types/card.types'

/**
 * 勝利条件の種類
 */
export type VictoryType = 
  | 'standard'      // 標準クリア: 活力維持して最終ステージ到達
  | 'speed'         // スピードクリア: 制限時間内
  | 'perfect'       // パーフェクトクリア: ミス0回
  | 'economy'       // エコノミークリア: 最小限リソース
  | 'challenge'     // チャレンジクリア: 高難易度条件
  | 'narrative'     // 物語クリア: 特定の選択ルート
  | 'completionist' // コンプリートクリア: 全要素達成

/**
 * 勝利条件の詳細情報
 */
export interface VictoryCondition {
  type: VictoryType
  name: string
  description: string
  requirements: VictoryRequirement[]
  rewards: VictoryReward[]
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme'
  unlocked: boolean
  hidden: boolean // 隠し勝利条件
}

/**
 * 勝利要件
 */
export interface VictoryRequirement {
  id: string
  type: 'time' | 'vitality' | 'turns' | 'mistakes' | 'insurance' | 'cards' | 'special'
  target: number | string
  operator: 'less_than' | 'less_equal' | 'equal' | 'greater_equal' | 'greater_than' | 'contains'
  description: string
  currentValue?: number | string
  satisfied: boolean
}

/**
 * 勝利報酬
 */
export interface VictoryReward {
  type: 'title' | 'achievement' | 'unlock' | 'cosmetic' | 'gameplay'
  id: string
  name: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

/**
 * 勝利結果
 */
export interface VictoryResult {
  achieved: boolean
  type: VictoryType
  condition: VictoryCondition
  score: number
  rank: 'D' | 'C' | 'B' | 'A' | 'S' | 'SS'
  timeBonus: number
  efficiencyBonus: number
  completionBonus: number
  totalScore: number
  newRecords: string[]
}

/**
 * 複数勝利条件システム
 */
export class VictoryConditions {
  private readonly conditions: Map<VictoryType, VictoryCondition>
  private readonly achievements: Set<string>
  private readonly records: Map<string, number>

  constructor() {
    this.conditions = new Map()
    this.achievements = new Set()
    this.records = new Map()
    this.initializeConditions()
  }

  /**
   * 勝利条件を初期化
   */
  private initializeConditions(): void {
    // 標準クリア
    this.conditions.set('standard', {
      type: 'standard',
      name: '人生の達人',
      description: '活力を維持しながら人生の全ステージをクリアする',
      requirements: [
        {
          id: 'final_vitality',
          type: 'vitality',
          target: 30,
          operator: 'greater_equal',
          description: '最終活力30以上',
          satisfied: false
        },
        {
          id: 'complete_all_stages',
          type: 'special',
          target: 'all_stages_completed',
          operator: 'equal',
          description: 'すべてのステージをクリア',
          satisfied: false
        }
      ],
      rewards: [
        {
          type: 'title',
          id: 'life_master',
          name: '人生の達人',
          description: '安定した人生を歩み抜いた証',
          rarity: 'common'
        }
      ],
      difficulty: 'normal',
      unlocked: true,
      hidden: false
    })

    // スピードクリア
    this.conditions.set('speed', {
      type: 'speed',
      name: '電光石火',
      description: '20分以内に全ステージをクリアする',
      requirements: [
        {
          id: 'completion_time',
          type: 'time',
          target: 1200, // 20分 = 1200秒
          operator: 'less_than',
          description: '20分以内でクリア',
          satisfied: false
        },
        {
          id: 'final_vitality_speed',
          type: 'vitality',
          target: 20,
          operator: 'greater_equal',
          description: '最終活力20以上',
          satisfied: false
        }
      ],
      rewards: [
        {
          type: 'title',
          id: 'lightning_runner',
          name: '電光石火',
          description: '迅速な判断力の証',
          rarity: 'rare'
        },
        {
          type: 'unlock',
          id: 'speed_mode',
          name: 'スピードモード解放',
          description: 'タイムアタックモードが利用可能',
          rarity: 'epic'
        }
      ],
      difficulty: 'hard',
      unlocked: false,
      hidden: false
    })

    // パーフェクトクリア
    this.conditions.set('perfect', {
      type: 'perfect',
      name: '完璧主義者',
      description: 'チャレンジに一度も失敗せずにクリアする',
      requirements: [
        {
          id: 'zero_failures',
          type: 'mistakes',
          target: 0,
          operator: 'equal',
          description: 'チャレンジ失敗0回',
          satisfied: false
        },
        {
          id: 'high_vitality',
          type: 'vitality',
          target: 50,
          operator: 'greater_equal',
          description: '最終活力50以上',
          satisfied: false
        }
      ],
      rewards: [
        {
          type: 'title',
          id: 'perfectionist',
          name: '完璧主義者',
          description: '一切の妥協を許さない意志の証',
          rarity: 'epic'
        },
        {
          type: 'cosmetic',
          id: 'golden_cards',
          name: 'ゴールデンカード',
          description: 'カードが金色に輝く',
          rarity: 'legendary'
        }
      ],
      difficulty: 'extreme',
      unlocked: false,
      hidden: false
    })

    // エコノミークリア
    this.conditions.set('economy', {
      type: 'economy',
      name: '倹約家',
      description: '最小限の保険でクリアする',
      requirements: [
        {
          id: 'max_insurance_burden',
          type: 'insurance',
          target: 20,
          operator: 'less_equal',
          description: '最大保険料負担20以下',
          satisfied: false
        },
        {
          id: 'minimal_cards',
          type: 'cards',
          target: 30,
          operator: 'less_equal',
          description: '獲得カード30枚以下',
          satisfied: false
        }
      ],
      rewards: [
        {
          type: 'title',
          id: 'economizer',
          name: '倹約家',
          description: '最小限のリソースで最大の成果を上げた証',
          rarity: 'rare'
        },
        {
          type: 'gameplay',
          id: 'efficiency_bonus',
          name: '効率ボーナス',
          description: '次回プレイ時にリソース効率+20%',
          rarity: 'epic'
        }
      ],
      difficulty: 'hard',
      unlocked: false,
      hidden: false
    })

    // チャレンジクリア
    this.conditions.set('challenge', {
      type: 'challenge',
      name: '挑戦者',
      description: '高難易度設定でクリアする',
      requirements: [
        {
          id: 'hard_difficulty',
          type: 'special',
          target: 'hard_mode',
          operator: 'equal',
          description: 'ハードモードでプレイ',
          satisfied: false
        },
        {
          id: 'survive_vitality',
          type: 'vitality',
          target: 1,
          operator: 'greater_equal',
          description: '活力1以上で生存',
          satisfied: false
        }
      ],
      rewards: [
        {
          type: 'title',
          id: 'challenger',
          name: '挑戦者',
          description: '困難に立ち向かう勇気の証',
          rarity: 'epic'
        },
        {
          type: 'unlock',
          id: 'nightmare_mode',
          name: 'ナイトメアモード解放',
          description: '最高難易度モードが利用可能',
          rarity: 'legendary'
        }
      ],
      difficulty: 'extreme',
      unlocked: false,
      hidden: false
    })

    // 隠し勝利条件：完璧主義+スピード
    this.conditions.set('completionist', {
      type: 'completionist',
      name: '伝説の完走者',
      description: 'すべての条件を満たしてクリアする',
      requirements: [
        {
          id: 'perfect_and_speed',
          type: 'special',
          target: 'perfect_speed_combo',
          operator: 'equal',
          description: 'パーフェクト+スピードクリア',
          satisfied: false
        },
        {
          id: 'all_achievements',
          type: 'special',
          target: 'all_basic_achievements',
          operator: 'equal',
          description: '基本実績をすべて達成',
          satisfied: false
        }
      ],
      rewards: [
        {
          type: 'title',
          id: 'legend',
          name: '伝説の完走者',
          description: '全ての可能性を極めし者の証',
          rarity: 'legendary'
        },
        {
          type: 'unlock',
          id: 'ultimate_mode',
          name: 'アルティメットモード解放',
          description: '究極のゲームモードが利用可能',
          rarity: 'legendary'
        }
      ],
      difficulty: 'extreme',
      unlocked: false,
      hidden: true
    })
  }

  /**
   * ゲーム状態から勝利条件をチェック
   */
  checkVictoryConditions(game: Game): VictoryResult[] {
    const results: VictoryResult[] = []

    for (const [type, condition] of this.conditions) {
      if (!condition.unlocked && !this.isConditionUnlocked(condition, game)) {
        continue
      }

      const result = this.evaluateCondition(condition, game)
      if (result.achieved) {
        results.push(result)
        this.recordAchievement(condition)
      }
    }

    return results
  }

  /**
   * 特定の勝利条件を評価
   */
  private evaluateCondition(condition: VictoryCondition, game: Game): VictoryResult {
    const satisfied = condition.requirements.map(req => 
      this.evaluateRequirement(req, game)
    )

    // すべての要件が満たされているかチェック
    const achieved = satisfied.every(s => s)

    // スコア計算
    const score = this.calculateScore(condition, game)
    const rank = this.calculateRank(score)

    return {
      achieved,
      type: condition.type,
      condition,
      score: score.baseScore,
      rank,
      timeBonus: score.timeBonus,
      efficiencyBonus: score.efficiencyBonus,
      completionBonus: score.completionBonus,
      totalScore: score.totalScore,
      newRecords: this.checkNewRecords(condition, score.totalScore)
    }
  }

  /**
   * 要件を評価
   */
  private evaluateRequirement(requirement: VictoryRequirement, game: Game): boolean {
    let currentValue: number | string

    switch (requirement.type) {
      case 'vitality':
        currentValue = game.vitality
        break
      case 'time':
        currentValue = this.getGameDuration(game)
        break
      case 'turns':
        currentValue = game.turn
        break
      case 'mistakes':
        currentValue = game.stats.failedChallenges || 0
        break
      case 'insurance':
        currentValue = Math.max(...[game.insuranceBurden, 0])
        break
      case 'cards':
        currentValue = game.stats.cardsAcquired || 0
        break
      case 'special':
        return this.evaluateSpecialRequirement(requirement, game)
      default:
        return false
    }

    requirement.currentValue = currentValue

    // 数値比較
    if (typeof currentValue === 'number' && typeof requirement.target === 'number') {
      switch (requirement.operator) {
        case 'less_than':
          requirement.satisfied = currentValue < requirement.target
          break
        case 'less_equal':
          requirement.satisfied = currentValue <= requirement.target
          break
        case 'equal':
          requirement.satisfied = currentValue === requirement.target
          break
        case 'greater_equal':
          requirement.satisfied = currentValue >= requirement.target
          break
        case 'greater_than':
          requirement.satisfied = currentValue > requirement.target
          break
        default:
          requirement.satisfied = false
      }
    }

    return requirement.satisfied
  }

  /**
   * 特別な要件を評価
   */
  private evaluateSpecialRequirement(requirement: VictoryRequirement, game: Game): boolean {
    switch (requirement.target) {
      case 'all_stages_completed':
        requirement.satisfied = game.stage === 'fulfillment' && game.isCompleted()
        break
      case 'hard_mode':
        requirement.satisfied = game.config.difficulty === 'hard'
        break
      case 'perfect_speed_combo':
        const perfectAchieved = this.achievements.has('perfectionist')
        const speedAchieved = this.achievements.has('lightning_runner')
        requirement.satisfied = perfectAchieved && speedAchieved
        break
      case 'all_basic_achievements':
        const basicAchievements = ['life_master', 'lightning_runner', 'economizer', 'challenger']
        requirement.satisfied = basicAchievements.every(id => this.achievements.has(id))
        break
      default:
        requirement.satisfied = false
    }

    return requirement.satisfied
  }

  /**
   * ゲーム時間を取得（秒）
   */
  private getGameDuration(game: Game): number {
    if (!game.startedAt) return 0
    const endTime = game.completedAt || new Date()
    return Math.floor((endTime.getTime() - game.startedAt.getTime()) / 1000)
  }

  /**
   * スコアを計算
   */
  private calculateScore(condition: VictoryCondition, game: Game): {
    baseScore: number
    timeBonus: number
    efficiencyBonus: number
    completionBonus: number
    totalScore: number
  } {
    let baseScore = 1000

    // 難易度によるベーススコア調整
    switch (condition.difficulty) {
      case 'easy':
        baseScore = 500
        break
      case 'normal':
        baseScore = 1000
        break
      case 'hard':
        baseScore = 2000
        break
      case 'extreme':
        baseScore = 5000
        break
    }

    // タイムボーナス
    const duration = this.getGameDuration(game)
    const timeBonus = Math.max(0, 1000 - duration * 2)

    // 効率ボーナス（活力/ターン比）
    const efficiency = game.vitality / Math.max(game.turn, 1)
    const efficiencyBonus = Math.floor(efficiency * 100)

    // 完走ボーナス
    const completionBonus = game.vitality > 50 ? 500 : 0

    const totalScore = baseScore + timeBonus + efficiencyBonus + completionBonus

    return {
      baseScore,
      timeBonus,
      efficiencyBonus,
      completionBonus,
      totalScore
    }
  }

  /**
   * スコアからランクを算出
   */
  private calculateRank(score: { totalScore: number }): 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' {
    const total = score.totalScore

    if (total >= 10000) return 'SS'
    if (total >= 7500) return 'S'
    if (total >= 5000) return 'A'
    if (total >= 3000) return 'B'
    if (total >= 1500) return 'C'
    return 'D'
  }

  /**
   * 新記録をチェック
   */
  private checkNewRecords(condition: VictoryCondition, score: number): string[] {
    const records: string[] = []
    const recordKey = condition.type

    if (!this.records.has(recordKey) || this.records.get(recordKey)! < score) {
      this.records.set(recordKey, score)
      records.push(`${condition.name}の新記録！`)
    }

    return records
  }

  /**
   * 実績を記録
   */
  private recordAchievement(condition: VictoryCondition): void {
    condition.rewards.forEach(reward => {
      this.achievements.add(reward.id)
    })
  }

  /**
   * 条件の解放チェック
   */
  private isConditionUnlocked(condition: VictoryCondition, game: Game): boolean {
    // 基本条件は常に解放
    if (condition.type === 'standard') {
      condition.unlocked = true
      return true
    }

    // 標準クリア達成で他の条件が解放
    if (this.achievements.has('life_master')) {
      condition.unlocked = true
      return true
    }

    return false
  }

  /**
   * 利用可能な勝利条件を取得
   */
  getAvailableConditions(): VictoryCondition[] {
    return Array.from(this.conditions.values())
      .filter(condition => condition.unlocked && !condition.hidden)
  }

  /**
   * 隠し勝利条件を取得
   */
  getHiddenConditions(): VictoryCondition[] {
    return Array.from(this.conditions.values())
      .filter(condition => condition.hidden)
  }

  /**
   * 達成済み実績を取得
   */
  getAchievements(): string[] {
    return Array.from(this.achievements)
  }

  /**
   * 記録を取得
   */
  getRecords(): Map<string, number> {
    return new Map(this.records)
  }

  /**
   * 勝利条件の進捗を取得
   */
  getProgress(game: Game): Map<VictoryType, { progress: number, nextMilestone: string }> {
    const progress = new Map()

    for (const [type, condition] of this.conditions) {
      if (!condition.unlocked) continue

      const satisfiedCount = condition.requirements.filter(req => 
        this.evaluateRequirement(req, game)
      ).length

      const progressPercent = (satisfiedCount / condition.requirements.length) * 100
      const nextRequirement = condition.requirements.find(req => !req.satisfied)

      progress.set(type, {
        progress: progressPercent,
        nextMilestone: nextRequirement?.description || '達成済み'
      })
    }

    return progress
  }
}