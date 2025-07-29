import { Card } from '../entities/Card'
import { CardFactory } from './CardFactory'
import type { GameStage, Difficulty, SkillRarity } from '../types/card.types'
import type { PlayerProgression } from './PlayerProgressionService'
import type { PlayerAchievements } from './AchievementSystemService'
import type { DynamicDifficulty } from './DifficultyBalanceService'

/**
 * プレイモード
 */
export type PlayMode = 
  | 'story'           // ストーリーモード（通常）
  | 'challenge'       // チャレンジモード（高難易度）
  | 'endless'         // エンドレスモード
  | 'puzzle'          // パズルモード（特定条件クリア）
  | 'speedrun'        // スピードランモード
  | 'custom'          // カスタムモード

/**
 * 日替りチャレンジ
 */
export interface DailyChallenge {
  id: string
  date: string
  name: string
  description: string
  mode: PlayMode
  rules: {
    timeLimit?: number      // 秒単位
    startingCards?: string[] // 初期カード指定
    bannedCards?: string[]   // 使用禁止カード
    specialConditions?: string[] // 特別な勝利条件
    modifiers?: {
      vitalityMultiplier?: number
      experienceMultiplier?: number
      cardRarityBonus?: number
    }
  }
  rewards: {
    experience: number
    exclusiveCards?: string[]
    title?: string
  }
  completionStatus: 'not_started' | 'in_progress' | 'completed' | 'failed'
  bestScore?: number
}

/**
 * カスタムルールセット
 */
export interface CustomRuleSet {
  id: string
  name: string
  description: string
  rules: {
    startingVitality?: number
    maxHandSize?: number
    challengeDeckSize?: number
    specialMechanics?: string[]
    winConditions?: string[]
  }
  difficulty: Difficulty
  isOfficial: boolean
  createdBy?: string
  popularity: number
  tags: string[]
}

/**
 * ランダムイベント
 */
export interface RandomEvent {
  id: string
  name: string
  description: string
  type: 'beneficial' | 'neutral' | 'challenging'
  triggerCondition: string
  effects: {
    vitalityChange?: number
    cardRewards?: Card[]
    temporaryModifiers?: {
      duration: number
      effects: string[]
    }
  }
  rarity: 'common' | 'rare' | 'legendary'
}

/**
 * 再プレイ性向上サービス
 * 様々なゲームモード、日替りチャレンジ、ランダム要素を管理
 */
export class ReplayabilityService {
  
  /**
   * 日替りチャレンジを生成
   */
  static generateDailyChallenge(date: Date): DailyChallenge {
    const seed = this.dateSeed(date)
    const challengeTemplates = this.getDailyChallengeTemplates()
    const template = challengeTemplates[seed % challengeTemplates.length]
    
    const dateString = date.toISOString().split('T')[0]
    
    return {
      id: `daily_${dateString}`,
      date: dateString,
      name: template.name,
      description: template.description,
      mode: template.mode,
      rules: { ...template.rules },
      rewards: { ...template.rewards },
      completionStatus: 'not_started'
    }
  }

  /**
   * 日替りチャレンジテンプレートを取得
   */
  private static getDailyChallengeTemplates(): Omit<DailyChallenge, 'id' | 'date' | 'completionStatus' | 'bestScore'>[] {
    return [
      {
        name: 'ミニマリストの挑戦',
        description: '手札5枚以下でゲームクリアを目指す',
        mode: 'challenge',
        rules: {
          startingCards: ['朝のジョギング', '栄養バランスの良い食事', 'チームワーク'],
          specialConditions: ['手札を5枚以下に保つ'],
          modifiers: { experienceMultiplier: 1.5 }
        },
        rewards: { experience: 500, title: 'ミニマリスト' }
      },
      {
        name: 'スピードマスター',
        description: '10分以内でゲームクリア',
        mode: 'speedrun',
        rules: {
          timeLimit: 600,
          modifiers: { experienceMultiplier: 2.0 }
        },
        rewards: { experience: 800, title: 'スピードランナー' }
      },
      {
        name: '保険なしサバイバル',
        description: '保険カードを使わずにクリア',
        mode: 'challenge',
        rules: {
          bannedCards: ['医療保険', '生命保険', '収入保障保険'],
          modifiers: { vitalityMultiplier: 1.2 }
        },
        rewards: { experience: 600, title: '自力救済者' }
      },
      {
        name: 'ラッキーセブン',
        description: '7ターンぴったりでクリア',
        mode: 'puzzle',
        rules: {
          specialConditions: ['7ターン目にゲームクリア'],
          modifiers: { cardRarityBonus: 0.3 }
        },
        rewards: { experience: 700, exclusiveCards: ['運命の導き'] }
      },
      {
        name: 'オールカテゴリー',
        description: '全カテゴリーのカードを1枚以上使用してクリア',
        mode: 'puzzle',
        rules: {
          specialConditions: ['健康・キャリア・家族・趣味・金融カードを各1枚以上使用']
        },
        rewards: { experience: 450, title: 'バランサー' }
      }
    ]
  }

  /**
   * カスタムルールセットを生成
   */
  static generateCustomRuleSet(
    name: string,
    baseRules: Partial<CustomRuleSet['rules']>,
    difficulty: Difficulty
  ): CustomRuleSet {
    return {
      id: `custom_${Date.now()}`,
      name,
      description: `プレイヤー作成のカスタムルール: ${name}`,
      rules: {
        startingVitality: 100,
        maxHandSize: 7,
        challengeDeckSize: 20,
        specialMechanics: [],
        winConditions: ['全ステージクリア'],
        ...baseRules
      },
      difficulty,
      isOfficial: false,
      popularity: 0,
      tags: ['カスタム', difficulty]
    }
  }

  /**
   * ランダムイベントを生成
   */
  static generateRandomEvent(
    stage: GameStage,
    playerLevel: number,
    difficulty: DynamicDifficulty
  ): RandomEvent | null {
    // レベルが低いうちはイベント発生率を下げる
    const eventChance = Math.min(0.3, playerLevel * 0.02)
    if (Math.random() > eventChance) {
      return null
    }

    const events = this.getRandomEventsPool(stage)
    const filteredEvents = events.filter(event => 
      this.isEventApplicable(event, playerLevel, difficulty)
    )

    if (filteredEvents.length === 0) {
      return null
    }

    return filteredEvents[Math.floor(Math.random() * filteredEvents.length)]
  }

  /**
   * ランダムイベントプールを取得
   */
  private static getRandomEventsPool(stage: GameStage): RandomEvent[] {
    const commonEvents = [
      {
        id: 'lucky_find',
        name: '思わぬ発見',
        description: '古い引き出しから忘れていた貯金を発見した',
        type: 'beneficial' as const,
        triggerCondition: 'random',
        effects: { vitalityChange: 5 },
        rarity: 'common' as const
      },
      {
        id: 'minor_setback',
        name: '小さなトラブル',
        description: '予期しない出費が発生した',
        type: 'challenging' as const,
        triggerCondition: 'random',
        effects: { vitalityChange: -3 },
        rarity: 'common' as const
      },
      {
        id: 'skill_insight',
        name: 'ひらめきの瞬間',
        description: '新しいスキルのヒントを得た',
        type: 'beneficial' as const,
        triggerCondition: 'random',
        effects: {
          cardRewards: [Card.createSkillCard('ひらめき', 'common', 4)]
        },
        rarity: 'rare' as const
      }
    ]

    const stageSpecificEvents = {
      youth: [
        {
          id: 'mentor_meeting',
          name: '人生の師匠との出会い',
          description: '経験豊富な先輩からアドバイスを受けた',
          type: 'beneficial' as const,
          triggerCondition: 'youth_stage',
          effects: {
            temporaryModifiers: {
              duration: 3,
              effects: ['経験値1.5倍']
            }
          },
          rarity: 'rare' as const
        }
      ],
      middle: [
        {
          id: 'family_support',
          name: '家族の支え',
          description: '困難な時期に家族が力になってくれた',
          type: 'beneficial' as const,
          triggerCondition: 'middle_stage',
          effects: { vitalityChange: 10 },
          rarity: 'common' as const
        }
      ],
      fulfillment: [
        {
          id: 'wisdom_moment',
          name: '人生の知恵',
          description: '長年の経験から深い洞察を得た',
          type: 'beneficial' as const,
          triggerCondition: 'fulfillment_stage',
          effects: {
            cardRewards: [Card.createSkillCard('人生の知恵', 'epic', 12)]
          },
          rarity: 'legendary' as const
        }
      ]
    }

    return [...commonEvents, ...stageSpecificEvents[stage]]
  }

  /**
   * イベントが適用可能かチェック
   */
  private static isEventApplicable(
    event: RandomEvent,
    playerLevel: number,
    difficulty: DynamicDifficulty
  ): boolean {
    // レア度による出現制限
    const rarityThresholds = {
      common: 1,
      rare: 5,
      legendary: 15
    }

    return playerLevel >= rarityThresholds[event.rarity]
  }

  /**
   * プレイヤーに合わせたゲームモード推奨
   */
  static recommendGameMode(
    progression: PlayerProgression,
    achievements: PlayerAchievements,
    recentPlayHistory: string[]
  ): {
    primaryRecommendation: PlayMode
    alternatives: PlayMode[]
    reasoning: string
  } {
    const level = progression.level.currentLevel
    const completedAchievements = achievements.achievements.filter(a => a.isUnlocked).length

    // 最近のプレイ履歴を分析
    const modeCounts = recentPlayHistory.reduce((counts, mode) => {
      counts[mode] = (counts[mode] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    const mostPlayedMode = Object.entries(modeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as PlayMode

    let primaryRecommendation: PlayMode
    let reasoning: string

    if (level <= 5) {
      primaryRecommendation = 'story'
      reasoning = '基本システムの習得のため、ストーリーモードがおすすめです'
    } else if (level <= 15 && completedAchievements < 10) {
      primaryRecommendation = 'challenge'
      reasoning = 'スキル向上のため、チャレンジモードで腕を磨きましょう'
    } else if (mostPlayedMode && modeCounts[mostPlayedMode] >= 3) {
      // 同じモードを連続でプレイしている場合は別モードを推奨
      const alternatives = ['story', 'challenge', 'endless', 'puzzle'] as PlayMode[]
      primaryRecommendation = alternatives.find(mode => mode !== mostPlayedMode) || 'endless'
      reasoning = '新鮮な体験のため、違うモードを試してみませんか？'
    } else if (level >= 20) {
      primaryRecommendation = 'endless'
      reasoning = '高レベルプレイヤーには無限の挑戦ができるエンドレスモードがおすすめです'
    } else {
      primaryRecommendation = 'story'
      reasoning = 'バランスの取れた体験のため、ストーリーモードがおすすめです'
    }

    const alternatives: PlayMode[] = (['story', 'challenge', 'endless', 'puzzle', 'speedrun'] as PlayMode[])
      .filter(mode => mode !== primaryRecommendation)
      .slice(0, 3)

    return {
      primaryRecommendation,
      alternatives,
      reasoning
    }
  }

  /**
   * シーズナルコンテンツを生成
   */
  static generateSeasonalContent(date: Date): {
    theme: string
    specialCards: Card[]
    bonusRules: string[]
    duration: number // 日数
  } {
    const month = date.getMonth() + 1
    
    const seasonalThemes = {
      1: { theme: '新年の決意', specialCards: ['新年チャレンジ'], bonusRules: ['経験値2倍'] },
      3: { theme: '春の新生活', specialCards: ['新生活準備'], bonusRules: ['キャリアカード効果アップ'] },
      6: { theme: '梅雨の読書', specialCards: ['集中力向上'], bonusRules: ['スキルカード出現率アップ'] },
      9: { theme: '秋の実り', specialCards: ['豊穣の恵み'], bonusRules: ['コンボボーナス増加'] },
      12: { theme: '年末総決算', specialCards: ['一年の振り返り'], bonusRules: ['全カテゴリー効果アップ'] }
    }

    const defaultContent = { 
      theme: '通常期間', 
      specialCards: [], 
      bonusRules: [] 
    }

    const content = seasonalThemes[month as keyof typeof seasonalThemes] || defaultContent
    
    return {
      ...content,
      specialCards: content.specialCards.map(name => 
        Card.createEventCard(name, 8, 7, false)
      ),
      duration: 30
    }
  }

  /**
   * プレイヤーのプレイスタイル分析
   */
  static analyzePlayStyle(
    gameHistory: Array<{
      mode: PlayMode
      cardsUsed: string[]
      strategy: string
      result: 'victory' | 'defeat'
      duration: number
    }>
  ): {
    primaryStyle: 'aggressive' | 'defensive' | 'balanced' | 'experimental'
    preferences: {
      favoriteCardTypes: string[]
      preferredGameLength: 'short' | 'medium' | 'long'
      riskTolerance: 'low' | 'medium' | 'high'
    }
    recommendations: string[]
  } {
    if (gameHistory.length < 5) {
      return {
        primaryStyle: 'experimental',
        preferences: {
          favoriteCardTypes: [],
          preferredGameLength: 'medium',
          riskTolerance: 'medium'
        },
        recommendations: ['より多くのゲームをプレイしてスタイル分析の精度を上げましょう']
      }
    }

    // カード使用頻度を分析
    const cardUsage: Record<string, number> = {}
    gameHistory.forEach(game => {
      game.cardsUsed.forEach(card => {
        cardUsage[card] = (cardUsage[card] || 0) + 1
      })
    })

    const favoriteCardTypes = Object.entries(cardUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([card]) => card)

    // ゲーム時間の傾向
    const averageDuration = gameHistory.reduce((sum, game) => sum + game.duration, 0) / gameHistory.length
    const preferredGameLength = averageDuration < 300 ? 'short' : averageDuration < 600 ? 'medium' : 'long'

    // 勝率を分析
    const winRate = gameHistory.filter(game => game.result === 'victory').length / gameHistory.length

    // プレイスタイルを判定
    let primaryStyle: 'aggressive' | 'defensive' | 'balanced' | 'experimental'
    if (winRate > 0.8) {
      primaryStyle = 'defensive'
    } else if (winRate > 0.6) {
      primaryStyle = 'balanced'
    } else if (preferredGameLength === 'short') {
      primaryStyle = 'aggressive'
    } else {
      primaryStyle = 'experimental'
    }

    const riskTolerance = winRate < 0.4 ? 'high' : winRate > 0.8 ? 'low' : 'medium'

    // 推奨事項
    const recommendations: string[] = []
    if (primaryStyle === 'aggressive' && winRate < 0.5) {
      recommendations.push('もう少し慎重な戦略を試してみませんか？')
    } else if (primaryStyle === 'defensive' && winRate > 0.9) {
      recommendations.push('より挑戦的なプレイで経験値を稼ぎましょう')
    }

    return {
      primaryStyle,
      preferences: {
        favoriteCardTypes,
        preferredGameLength,
        riskTolerance
      },
      recommendations
    }
  }

  /**
   * 日付からシード値を生成
   */
  private static dateSeed(date: Date): number {
    const str = date.toISOString().split('T')[0]
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32bit integer
    }
    return Math.abs(hash)
  }

  /**
   * ウィークリーチャレンジを生成
   */
  static generateWeeklyChallenge(weekStart: Date): DailyChallenge {
    const seed = this.dateSeed(weekStart)
    const weekNumber = Math.floor(seed / 7)
    
    return {
      id: `weekly_${weekNumber}`,
      date: weekStart.toISOString().split('T')[0],
      name: `第${weekNumber % 52 + 1}週チャレンジ`,
      description: '1週間限定の特別なチャレンジに挑戦しよう',
      mode: 'challenge',
      rules: {
        modifiers: {
          experienceMultiplier: 2.5,
          cardRarityBonus: 0.5
        },
        specialConditions: ['週間限定報酬あり']
      },
      rewards: {
        experience: 1500,
        exclusiveCards: ['週間チャンピオン']
      },
      completionStatus: 'not_started'
    }
  }
}