/**
 * リプレイ価値統合システム - 全システムの統合管理
 * 
 * このシステムは以下のサブシステムを統合します：
 * - 複数勝利条件システム
 * - 動的エンディング分岐システム
 * - ニューゲーム+システム
 * - エンドレス・チャレンジシステム
 * - 物語統合システム
 * - 秘密・隠し要素システム
 */

import type { Game } from '../domain/entities/Game'
import { ScoreSystem, VictoryEngine } from './victory'
import type { DetailedScore, PlayStyleAnalysis, VictoryResult } from './victory'
import { NarrativeIntegration, SecretSystem } from './narrative'
import type { EndingInfo, IntegratedEvent } from './narrative'
import { EndlessChallengeSystem, NewGamePlusSystem } from './newgame'
import type { Challenge, EndlessProgress, NewGamePlusData } from './newgame'

/**
 * 統合ゲーム結果
 */
export interface IntegratedGameResult {
  // 基本結果
  victories: VictoryResult[]
  detailedScore: DetailedScore
  playStyle: PlayStyleAnalysis
  
  // エンディング
  endingInfo: EndingInfo
  lifeSimulationSummary: string
  personalizedReflection: string
  
  // ニューゲーム+
  newGamePlusUpdates: {
    newUnlocks: string[]
    masteryGains: any[]
    newRecords: any[]
    carryOverBenefits: any[]
  }
  
  // 秘密発見
  newSecretsDiscovered: any[]
  secretDiscoveryReport: any[]
  
  // 推奨事項
  recommendations: GameRecommendation[]
}

/**
 * ゲーム推奨事項
 */
export interface GameRecommendation {
  type: 'victory_condition' | 'play_style' | 'game_mode' | 'challenge' | 'secret'
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  estimatedTime: string
  rewards: string[]
  priority: number // 1-10
}

/**
 * プレイヤー統計
 */
export interface PlayerStatistics {
  totalPlaytime: number
  totalGamesPlayed: number
  averageScore: number
  bestScore: number
  favoritePlayStyle: string
  achievementProgress: number
  secretDiscoveryRate: number
  masteryLevels: Record<string, number>
  personalRecords: Record<string, any>
}

/**
 * リプレイ価値統合システム
 */
export class ReplayabilitySystem {
  private readonly victoryEngine: VictoryEngine
  private readonly scoreSystem: ScoreSystem
  private readonly narrativeIntegration: NarrativeIntegration
  private readonly secretSystem: SecretSystem
  private readonly newGamePlusSystem: NewGamePlusSystem
  private readonly endlessChallengeSystem: EndlessChallengeSystem
  
  private readonly sessionData: Map<string, any>

  constructor() {
    this.victoryEngine = new VictoryEngine()
    this.scoreSystem = new ScoreSystem()
    this.narrativeIntegration = new NarrativeIntegration()
    this.secretSystem = new SecretSystem()
    this.newGamePlusSystem = new NewGamePlusSystem()
    this.endlessChallengeSystem = new EndlessChallengeSystem()
    
    this.sessionData = new Map()
    this.setupSystemIntegration()
  }

  /**
   * システム間の統合を設定
   */
  private setupSystemIntegration(): void {
    // 勝利エンジンのイベントリスナー
    this.victoryEngine.addEventListener('victory_achieved', (data) => {
      console.log(`🏆 勝利達成: ${data.type} (ランク: ${data.rank})`)
    })

    this.victoryEngine.addEventListener('milestone_reached', (data) => {
      console.log(`🎯 マイルストーン達成: ${data.name}`)
    })
  }

  /**
   * ゲーム完了時の統合処理
   */
  async processGameCompletion(
    game: Game,
    playtimeMinutes: number
  ): Promise<IntegratedGameResult> {
    console.log('🎮 ゲーム完了処理を開始します...')

    // 1. 勝利条件とプレイスタイルの評価
    const gameResult = this.victoryEngine.evaluateVictory(game)
    const detailedScore = this.scoreSystem.calculateDetailedScore(game, gameResult.victories)

    // 2. 物語とエンディングの生成
    const narrativeResult = this.narrativeIntegration.generateIntegratedEnding(
      game, 
      gameResult.victories, 
      gameResult.playStyle
    )

    // 3. ニューゲーム+の更新
    const newGamePlusUpdates = this.newGamePlusSystem.processGameCompletion(
      game,
      gameResult.victories,
      detailedScore,
      playtimeMinutes
    )

    // 4. 秘密の発見チェック
    const newGamePlusData = this.newGamePlusSystem.getCurrentState().data
    const secretContext = {
      playthrough: newGamePlusData.playthrough,
      gameState: 'ending' as const,
      triggerEvent: 'game_completion',
      additionalInfo: { score: detailedScore.totalScore }
    }

    const newSecretsDiscovered = this.secretSystem.checkForSecrets(
      game,
      gameResult.victories,
      newGamePlusData,
      secretContext
    )

    // 5. 発見レポートの生成
    const secretDiscoveryReport = newSecretsDiscovered.map(secret => 
      this.secretSystem.generateDiscoveryReport(secret)
    )

    // 6. スコアの記録
    this.scoreSystem.recordScore(game, detailedScore, gameResult.victories)

    // 7. 推奨事項の生成
    const recommendations = this.generateRecommendations(
      game,
      gameResult.victories,
      gameResult.playStyle,
      newGamePlusData
    )

    console.log(`✅ ゲーム完了処理が完了しました。新発見: ${newSecretsDiscovered.length}件`)

    return {
      victories: gameResult.victories,
      detailedScore,
      playStyle: gameResult.playStyle,
      endingInfo: narrativeResult.endingInfo,
      lifeSimulationSummary: narrativeResult.lifeSimulationSummary,
      personalizedReflection: narrativeResult.personalizedReflection,
      newGamePlusUpdates,
      newSecretsDiscovered,
      secretDiscoveryReport,
      recommendations
    }
  }

  /**
   * ゲーム進行中のイベント処理
   */
  processGameEvent(
    eventType: 'turn_start' | 'turn_end' | 'challenge_completed' | 'insurance_added' | 'stage_changed',
    game: Game,
    additionalData?: any
  ): IntegratedEvent | null {
    return this.narrativeIntegration.processGameEvent(eventType, game, additionalData)
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(
    game: Game,
    victories: VictoryResult[],
    playStyle: PlayStyleAnalysis,
    newGamePlusData: NewGamePlusData
  ): GameRecommendation[] {
    const recommendations: GameRecommendation[] = []

    // 未達成の勝利条件を推奨
    const achievedTypes = new Set(victories.map(v => v.type))
    const allVictoryTypes = ['standard', 'speed', 'perfect', 'economy', 'challenge']
    
    allVictoryTypes.forEach(type => {
      if (!achievedTypes.has(type)) {
        recommendations.push({
          type: 'victory_condition',
          title: `${this.translateVictoryType(type)}に挑戦`,
          description: `${type}クリア条件を満たしてみましょう`,
          difficulty: this.getVictoryDifficulty(type),
          estimatedTime: this.getEstimatedTime(type),
          rewards: [`${type}クリア実績`, '特別な称号'],
          priority: this.calculateVictoryPriority(type, playStyle)
        })
      }
    })

    // プレイスタイルに基づく推奨
    playStyle.matchingVictoryConditions.forEach(condition => {
      if (!achievedTypes.has(condition)) {
        recommendations.push({
          type: 'play_style',
          title: `あなたに適した${this.translateVictoryType(condition)}`,
          description: `${playStyle.primaryStyle}スタイルに最適な挑戦です`,
          difficulty: 'medium',
          estimatedTime: '30-45分',
          rewards: ['プレイスタイル向上', '熟練度ボーナス'],
          priority: 8
        })
      }
    })

    // ニューゲーム+の推奨
    const availableModes = this.newGamePlusSystem.getCurrentState().availableModes
    if (availableModes.length > 0) {
      recommendations.push({
        type: 'game_mode',
        title: '新しいゲームモードに挑戦',
        description: `${availableModes.length}種類の新モードが利用可能です`,
        difficulty: 'hard',
        estimatedTime: '45-60分',
        rewards: ['新しい体験', '上級者実績'],
        priority: 6
      })
    }

    // エンドレスモードの推奨
    if (newGamePlusData.playthrough >= 2) {
      recommendations.push({
        type: 'challenge',
        title: 'エンドレスモードで限界に挑戦',
        description: '無限に続く挑戦で真の実力を試しましょう',
        difficulty: 'extreme',
        estimatedTime: '制限なし',
        rewards: ['最高記録更新', '伝説の称号'],
        priority: 4
      })
    }

    // 秘密発見の推奨
    const discoveryStatus = this.secretSystem.getDiscoveryStatus()
    if (discoveryStatus.completionPercentage < 100) {
      recommendations.push({
        type: 'secret',
        title: '隠された真実を探求',
        description: `${Math.round(100 - discoveryStatus.completionPercentage)}%の秘密が未発見です`,
        difficulty: 'medium',
        estimatedTime: '複数回プレイ',
        rewards: ['隠し要素解放', '深い理解'],
        priority: 5
      })
    }

    // 優先度順にソート
    return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 5)
  }

  /**
   * プレイヤー統計を取得
   */
  getPlayerStatistics(): PlayerStatistics {
    const scoreStats = this.scoreSystem.getStatistics()
    const newGamePlusState = this.newGamePlusSystem.getCurrentState()
    const secretStatus = this.secretSystem.getDiscoveryStatus()

    // 熟練度レベルの変換
    const masteryLevels: Record<string, number> = {}
    newGamePlusState.data.masteryLevels.forEach(mastery => {
      masteryLevels[mastery.category] = mastery.level
    })

    // 個人記録の変換
    const personalRecords: Record<string, any> = {}
    newGamePlusState.data.personalRecords.forEach(record => {
      personalRecords[record.category] = record.value
    })

    return {
      totalPlaytime: newGamePlusState.data.totalPlaytime,
      totalGamesPlayed: scoreStats.totalGames,
      averageScore: scoreStats.averageScore,
      bestScore: scoreStats.bestScore,
      favoritePlayStyle: scoreStats.mostCommonRank,
      achievementProgress: newGamePlusState.data.achievements.length,
      secretDiscoveryRate: secretStatus.completionPercentage,
      masteryLevels,
      personalRecords
    }
  }

  /**
   * アクティブなチャレンジを取得
   */
  getActiveChallenges(): Challenge[] {
    return this.endlessChallengeSystem.getActiveChallenges()
  }

  /**
   * エンドレスモードを開始
   */
  startEndlessMode(config: any) {
    return this.endlessChallengeSystem.startEndlessMode(config)
  }

  /**
   * ニューゲーム+を開始
   */
  startNewGamePlus(selectedModes: string[] = []) {
    return this.newGamePlusSystem.startNewGamePlus(selectedModes)
  }

  /**
   * 物語選択肢を実行
   */
  executeNarrativeChoice(choiceId: string, game: Game) {
    return this.narrativeIntegration.executeNarrativeChoice(choiceId, game)
  }

  /**
   * 秘密のヒントを取得
   */
  getSecretHints(context: any, location: any) {
    return this.secretSystem.provideHints(context, location)
  }

  /**
   * 統合状態を取得
   */
  getSystemStatus(): {
    victoryEngine: any
    narrative: any
    newGamePlus: any
    secrets: any
    challenges: any
  } {
    return {
      victoryEngine: this.victoryEngine.getPlayStyleHistory(),
      narrative: this.narrativeIntegration.getCurrentState(),
      newGamePlus: this.newGamePlusSystem.getCurrentState(),
      secrets: this.secretSystem.getDiscoveryStatus(),
      challenges: this.endlessChallengeSystem.getEndlessStats()
    }
  }

  // ヘルパーメソッド
  private translateVictoryType(type: string): string {
    const translations = {
      'standard': '標準クリア',
      'speed': 'スピードクリア',
      'perfect': 'パーフェクトクリア',
      'economy': 'エコノミークリア',
      'challenge': 'チャレンジクリア'
    }
    return translations[type as keyof typeof translations] || type
  }

  private getVictoryDifficulty(type: string): 'easy' | 'medium' | 'hard' | 'extreme' {
    const difficulties = {
      'standard': 'easy',
      'speed': 'medium',
      'economy': 'medium',
      'perfect': 'hard',
      'challenge': 'extreme'
    }
    return difficulties[type as keyof typeof difficulties] || 'medium'
  }

  private getEstimatedTime(type: string): string {
    const times = {
      'standard': '30-45分',
      'speed': '15-25分',
      'economy': '35-50分',
      'perfect': '45-60分',
      'challenge': '60-90分'
    }
    return times[type as keyof typeof times] || '30-45分'
  }

  private calculateVictoryPriority(type: string, playStyle: PlayStyleAnalysis): number {
    if (playStyle.matchingVictoryConditions.includes(type as any)) {
      return 9
    }
    
    const basePriorities = {
      'standard': 7,
      'speed': 6,
      'economy': 6,
      'perfect': 4,
      'challenge': 3
    }
    
    return basePriorities[type as keyof typeof basePriorities] || 5
  }
}