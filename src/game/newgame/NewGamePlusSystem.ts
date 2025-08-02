/**
 * ニューゲーム+システム - 実績引き継ぎと上位難易度の実装
 * 
 * このシステムは以下の機能を提供します：
 * - 前回プレイの実績引き継ぎ
 * - 上位難易度モードの解放
 * - 新要素・隠し要素の追加
 * - 継続的なプレイヤーの成長体験
 */

import type { Game } from '../../domain/entities/Game'
import type { VictoryResult } from '../victory/VictoryConditions'
import type { DetailedScore } from '../victory/ScoreSystem'

/**
 * ニューゲーム+の継承データ
 */
export interface NewGamePlusData {
  playthrough: number                    // 周回数
  totalPlaytime: number                  // 累計プレイ時間（分）
  achievements: string[]                 // 獲得済み実績
  unlockedModes: GameMode[]             // 解放済みモード
  carryOverBenefits: CarryOverBenefit[] // 引き継ぎ特典
  previousBestScores: PreviousScore[]   // 過去最高スコア
  masteryLevels: MasteryLevel[]         // 熟練度レベル
  secretsDiscovered: string[]           // 発見した秘密
  personalRecords: PersonalRecord[]     // 個人記録
}

/**
 * ゲームモード
 */
export interface GameMode {
  id: string
  name: string
  description: string
  difficulty: number // 1-10
  unlockCondition: string
  modifiers: GameModifier[]
  rewards: ModeReward[]
}

/**
 * 引き継ぎ特典
 */
export interface CarryOverBenefit {
  id: string
  name: string
  description: string
  type: 'starting_bonus' | 'permanent_bonus' | 'unlock' | 'cosmetic'
  effect: BenefitEffect
  requirement: string
}

/**
 * 特典効果
 */
export interface BenefitEffect {
  type: 'vitality' | 'insurance' | 'cards' | 'experience' | 'unlock'
  value: number | string
  description: string
}

/**
 * 過去スコア記録
 */
export interface PreviousScore {
  playthrough: number
  totalScore: number
  victoryTypes: string[]
  rank: string
  date: Date
  notable: boolean // 特筆すべき記録か
}

/**
 * 熟練度レベル
 */
export interface MasteryLevel {
  category: 'insurance' | 'risk_management' | 'efficiency' | 'strategy' | 'survival'
  level: number // 1-100
  experience: number
  nextLevelExp: number
  bonuses: string[]
  milestones: string[]
}

/**
 * 個人記録
 */
export interface PersonalRecord {
  category: string
  value: number
  description: string
  achievedOn: Date
  playthroughNumber: number
}

/**
 * ゲーム修飾子
 */
export interface GameModifier {
  id: string
  name: string
  description: string
  type: 'difficulty' | 'mechanic' | 'narrative' | 'cosmetic'
  effect: ModifierEffect
}

/**
 * 修飾子効果
 */
export interface ModifierEffect {
  target: 'vitality' | 'insurance_cost' | 'card_power' | 'turn_limit' | 'challenge_difficulty'
  operation: 'multiply' | 'add' | 'set' | 'enable' | 'disable'
  value: number | boolean
}

/**
 * モード報酬
 */
export interface ModeReward {
  type: 'achievement' | 'title' | 'cosmetic' | 'unlock' | 'bonus'
  id: string
  name: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

/**
 * ニューゲーム+システム
 */
export class NewGamePlusSystem {
  private readonly newGamePlusData: NewGamePlusData
  private readonly availableModes: Map<string, GameMode>
  private activeModes: string[]

  constructor() {
    this.newGamePlusData = this.initializeNewGamePlusData()
    this.availableModes = new Map()
    this.activeModes = []
    this.initializeGameModes()
  }

  /**
   * ニューゲーム+データを初期化
   */
  private initializeNewGamePlusData(): NewGamePlusData {
    return {
      playthrough: 0,
      totalPlaytime: 0,
      achievements: [],
      unlockedModes: [],
      carryOverBenefits: [],
      previousBestScores: [],
      masteryLevels: [
        {
          category: 'insurance',
          level: 1,
          experience: 0,
          nextLevelExp: 100,
          bonuses: [],
          milestones: []
        },
        {
          category: 'risk_management',
          level: 1,
          experience: 0,
          nextLevelExp: 100,
          bonuses: [],
          milestones: []
        },
        {
          category: 'efficiency',
          level: 1,
          experience: 0,
          nextLevelExp: 100,
          bonuses: [],
          milestones: []
        },
        {
          category: 'strategy',
          level: 1,
          experience: 0,
          nextLevelExp: 100,
          bonuses: [],
          milestones: []
        },
        {
          category: 'survival',
          level: 1,
          experience: 0,
          nextLevelExp: 100,
          bonuses: [],
          milestones: []
        }
      ],
      secretsDiscovered: [],
      personalRecords: []
    }
  }

  /**
   * ゲームモードを初期化
   */
  private initializeGameModes(): void {
    // ハードモード
    this.availableModes.set('hard_mode', {
      id: 'hard_mode',
      name: 'ハードモード',
      description: '活力回復が困難になり、保険料が高くなる',
      difficulty: 6,
      unlockCondition: '標準モードをクリア',
      modifiers: [
        {
          id: 'reduced_healing',
          name: '回復力低下',
          description: '活力回復効果が50%減少',
          type: 'difficulty',
          effect: { target: 'vitality', operation: 'multiply', value: 0.5 }
        },
        {
          id: 'expensive_insurance',
          name: '高額保険',
          description: '保険料が25%増加',
          type: 'difficulty',
          effect: { target: 'insurance_cost', operation: 'multiply', value: 1.25 }
        }
      ],
      rewards: [
        {
          type: 'achievement',
          id: 'hard_mode_clear',
          name: '困難克服者',
          description: 'ハードモードをクリアした',
          rarity: 'rare'
        },
        {
          type: 'unlock',
          id: 'expert_mode',
          name: 'エキスパートモード解放',
          description: '最高難易度モードが利用可能',
          rarity: 'epic'
        }
      ]
    })

    // エキスパートモード
    this.availableModes.set('expert_mode', {
      id: 'expert_mode',
      name: 'エキスパートモード',
      description: 'ターン制限があり、失敗のペナルティが重い',
      difficulty: 8,
      unlockCondition: 'ハードモードをクリア',
      modifiers: [
        {
          id: 'turn_limit',
          name: 'ターン制限',
          description: '30ターン以内にクリアする必要',
          type: 'difficulty',
          effect: { target: 'turn_limit', operation: 'set', value: 30 }
        },
        {
          id: 'heavy_penalties',
          name: '重いペナルティ',
          description: 'チャレンジ失敗時の活力減少が2倍',
          type: 'difficulty',
          effect: { target: 'vitality', operation: 'multiply', value: 2 }
        }
      ],
      rewards: [
        {
          type: 'title',
          id: 'expert_title',
          name: 'エキスパート',
          description: '専門家の称号',
          rarity: 'epic'
        },
        {
          type: 'unlock',
          id: 'nightmare_mode',
          name: 'ナイトメアモード解放',
          description: '悪夢の難易度が利用可能',
          rarity: 'legendary'
        }
      ]
    })

    // スピードランモード
    this.availableModes.set('speedrun_mode', {
      id: 'speedrun_mode',
      name: 'スピードランモード',
      description: 'タイムアタック専用モード',
      difficulty: 5,
      unlockCondition: 'スピードクリア達成',
      modifiers: [
        {
          id: 'time_pressure',
          name: 'タイムプレッシャー',
          description: '制限時間内にクリアが必要',
          type: 'mechanic',
          effect: { target: 'turn_limit', operation: 'set', value: 20 }
        },
        {
          id: 'speed_bonuses',
          name: 'スピードボーナス',
          description: '早いクリアでボーナススコア',
          type: 'mechanic',
          effect: { target: 'vitality', operation: 'add', value: 0 }
        }
      ],
      rewards: [
        {
          type: 'cosmetic',
          id: 'speed_theme',
          name: 'スピードテーマ',
          description: '高速感のあるビジュアルテーマ',
          rarity: 'rare'
        }
      ]
    })

    // ミニマリストモード
    this.availableModes.set('minimalist_mode', {
      id: 'minimalist_mode',
      name: 'ミニマリストモード',
      description: '最小限のリソースでクリアを目指す',
      difficulty: 7,
      unlockCondition: 'エコノミークリア達成',
      modifiers: [
        {
          id: 'limited_resources',
          name: 'リソース制限',
          description: '獲得できるカード数が制限される',
          type: 'difficulty',
          effect: { target: 'card_power', operation: 'multiply', value: 0.8 }
        },
        {
          id: 'efficiency_focus',
          name: '効率重視',
          description: '効率的なプレイでボーナス',
          type: 'mechanic',
          effect: { target: 'vitality', operation: 'add', value: 0 }
        }
      ],
      rewards: [
        {
          type: 'achievement',
          id: 'minimalist_master',
          name: 'ミニマリストマスター',
          description: '最小限で最大の成果を達成',
          rarity: 'epic'
        }
      ]
    })

    // ナイトメアモード
    this.availableModes.set('nightmare_mode', {
      id: 'nightmare_mode',
      name: 'ナイトメアモード',
      description: '究極の挑戦 - すべてが困難',
      difficulty: 10,
      unlockCondition: 'エキスパートモードをクリア',
      modifiers: [
        {
          id: 'nightmare_all',
          name: '悪夢の条件',
          description: 'すべての難易度修正が適用',
          type: 'difficulty',
          effect: { target: 'challenge_difficulty', operation: 'multiply', value: 2 }
        }
      ],
      rewards: [
        {
          type: 'title',
          id: 'nightmare_conqueror',
          name: '悪夢征服者',
          description: '不可能を可能にした者',
          rarity: 'legendary'
        },
        {
          type: 'unlock',
          id: 'ultimate_secrets',
          name: '究極の秘密解放',
          description: 'ゲームの最深部が開かれる',
          rarity: 'legendary'
        }
      ]
    })
  }

  /**
   * ゲーム完了時の処理
   */
  processGameCompletion(
    game: Game,
    victories: VictoryResult[],
    detailedScore: DetailedScore,
    playtimeMinutes: number
  ): {
    newUnlocks: string[]
    masteryGains: MasteryGain[]
    newRecords: PersonalRecord[]
    carryOverBenefits: CarryOverBenefit[]
  } {
    // 周回数を増加
    this.newGamePlusData.playthrough++
    this.newGamePlusData.totalPlaytime += playtimeMinutes

    // スコア記録
    this.recordScore(game, victories, detailedScore)

    // 熟練度更新
    const masteryGains = this.updateMasteryLevels(game, victories, detailedScore)

    // 新しい解放要素をチェック
    const newUnlocks = this.checkNewUnlocks(victories, detailedScore)

    // 個人記録更新
    const newRecords = this.updatePersonalRecords(game, detailedScore)

    // 引き継ぎ特典を計算
    const carryOverBenefits = this.calculateCarryOverBenefits()

    return {
      newUnlocks,
      masteryGains,
      newRecords,
      carryOverBenefits
    }
  }

  /**
   * スコアを記録
   */
  private recordScore(game: Game, victories: VictoryResult[], detailedScore: DetailedScore): void {
    const scoreRecord: PreviousScore = {
      playthrough: this.newGamePlusData.playthrough,
      totalScore: detailedScore.totalScore,
      victoryTypes: victories.map(v => v.type),
      rank: detailedScore.rank.letter,
      date: new Date(),
      notable: detailedScore.totalScore > 8000 || victories.length > 2
    }

    this.newGamePlusData.previousBestScores.push(scoreRecord)

    // 最高記録のみ保持（各カテゴリ）
    this.newGamePlusData.previousBestScores.sort((a, b) => b.totalScore - a.totalScore)
    if (this.newGamePlusData.previousBestScores.length > 10) {
      this.newGamePlusData.previousBestScores = this.newGamePlusData.previousBestScores.slice(0, 10)
    }
  }

  /**
   * 熟練度レベルを更新
   */
  private updateMasteryLevels(
    game: Game, 
    victories: VictoryResult[], 
    detailedScore: DetailedScore
  ): MasteryGain[] {
    const gains: MasteryGain[] = []

    this.newGamePlusData.masteryLevels.forEach(mastery => {
      let expGain = 0

      switch (mastery.category) {
        case 'insurance':
          expGain = game.getActiveInsurances().length * 10 + (game.insuranceBurden > 0 ? 20 : 0)
          break
        case 'risk_management':
          const failureRate = game.stats.totalChallenges > 0 ? 
            game.stats.failedChallenges / game.stats.totalChallenges : 0
          expGain = Math.round((1 - failureRate) * 50)
          break
        case 'efficiency':
          expGain = Math.round(detailedScore.components.find(c => c.name === '効率性')?.value || 0) / 10
          break
        case 'strategy':
          expGain = victories.filter(v => ['perfect', 'economy', 'challenge'].includes(v.type)).length * 30
          break
        case 'survival':
          expGain = Math.round(game.vitality / 2)
          break
      }

      if (expGain > 0) {
        const previousLevel = mastery.level
        mastery.experience += expGain

        // レベルアップチェック
        while (mastery.experience >= mastery.nextLevelExp && mastery.level < 100) {
          mastery.experience -= mastery.nextLevelExp
          mastery.level++
          mastery.nextLevelExp = this.calculateNextLevelExp(mastery.level)
          
          // レベルアップボーナス
          this.addMasteryBonus(mastery)
        }

        if (mastery.level > previousLevel) {
          gains.push({
            category: mastery.category,
            previousLevel,
            newLevel: mastery.level,
            expGained: expGain,
            newBonuses: mastery.bonuses.slice(-(mastery.level - previousLevel))
          })
        }
      }
    })

    return gains
  }

  /**
   * 次のレベルに必要な経験値を計算
   */
  private calculateNextLevelExp(level: number): number {
    return Math.floor(100 * 1.1**(level - 1))
  }

  /**
   * 熟練度ボーナスを追加
   */
  private addMasteryBonus(mastery: MasteryLevel): void {
    const bonuses = {
      insurance: [
        '保険料5%減少', '保険効果10%向上', '保険選択肢増加',
        '保険期限延長', '特別保険解放'
      ],
      risk_management: [
        'チャレンジ予測精度向上', 'リスク回避ボーナス', '危機管理能力強化',
        '失敗時ダメージ軽減', '復活ボーナス'
      ],
      efficiency: [
        '活力効率10%向上', 'ターン効率化', 'リソース節約',
        'スピードボーナス', '完璧効率解放'
      ],
      strategy: [
        '戦略的思考強化', '長期計画ボーナス', '複合戦略解放',
        '最適化ガイド', '戦略マスター称号'
      ],
      survival: [
        '生存力向上', '回復力強化', '危機耐性',
        '不屈の精神', '生存マスター称号'
      ]
    }

    const categoryBonuses = bonuses[mastery.category]
    if (categoryBonuses && mastery.level <= categoryBonuses.length) {
      const newBonus = categoryBonuses[mastery.level - 1]
      if (!mastery.bonuses.includes(newBonus)) {
        mastery.bonuses.push(newBonus)
      }
    }
  }

  /**
   * 新しい解放要素をチェック
   */
  private checkNewUnlocks(victories: VictoryResult[], detailedScore: DetailedScore): string[] {
    const newUnlocks: string[] = []

    // 基本解放
    if (this.newGamePlusData.playthrough === 1) {
      newUnlocks.push('ハードモード解放')
      this.unlockMode('hard_mode')
    }

    // 勝利条件ベースの解放
    victories.forEach(victory => {
      switch (victory.type) {
        case 'speed':
          if (!this.isGameModeUnlocked('speedrun_mode')) {
            newUnlocks.push('スピードランモード解放')
            this.unlockMode('speedrun_mode')
          }
          break
        case 'economy':
          if (!this.isGameModeUnlocked('minimalist_mode')) {
            newUnlocks.push('ミニマリストモード解放')
            this.unlockMode('minimalist_mode')
          }
          break
      }
    })

    // スコアベースの解放
    if (detailedScore.rank.letter === 'S' || detailedScore.rank.letter === 'SS') {
      if (!this.isGameModeUnlocked('expert_mode')) {
        newUnlocks.push('エキスパートモード解放')
        this.unlockMode('expert_mode')
      }
    }

    // 熟練度ベースの解放
    const highMasteryCount = this.newGamePlusData.masteryLevels.filter(m => m.level >= 50).length
    if (highMasteryCount >= 3 && !this.isGameModeUnlocked('nightmare_mode')) {
      newUnlocks.push('ナイトメアモード解放')
      this.unlockMode('nightmare_mode')
    }

    return newUnlocks
  }

  /**
   * 個人記録を更新
   */
  private updatePersonalRecords(game: Game, detailedScore: DetailedScore): PersonalRecord[] {
    const newRecords: PersonalRecord[] = []

    const recordCandidates = [
      {
        category: '最高スコア',
        value: detailedScore.totalScore,
        description: `総合スコア ${detailedScore.totalScore}点`
      },
      {
        category: '最短ターン',
        value: game.turn,
        description: `${game.turn}ターンでクリア`
      },
      {
        category: '最高活力',
        value: game.vitality,
        description: `最終活力 ${game.vitality}`
      },
      {
        category: '最多保険',
        value: game.getActiveInsurances().length,
        description: `${game.getActiveInsurances().length}種類の保険を活用`
      }
    ]

    recordCandidates.forEach(candidate => {
      const existingRecord = this.newGamePlusData.personalRecords.find(r => r.category === candidate.category)
      
      const isNewRecord = !existingRecord || 
        (candidate.category === '最短ターン' ? candidate.value < existingRecord.value : candidate.value > existingRecord.value)

      if (isNewRecord) {
        const newRecord: PersonalRecord = {
          category: candidate.category,
          value: candidate.value,
          description: candidate.description,
          achievedOn: new Date(),
          playthroughNumber: this.newGamePlusData.playthrough
        }

        if (existingRecord) {
          const index = this.newGamePlusData.personalRecords.indexOf(existingRecord)
          this.newGamePlusData.personalRecords[index] = newRecord
        } else {
          this.newGamePlusData.personalRecords.push(newRecord)
        }

        newRecords.push(newRecord)
      }
    })

    return newRecords
  }

  /**
   * 引き継ぎ特典を計算
   */
  private calculateCarryOverBenefits(): CarryOverBenefit[] {
    const benefits: CarryOverBenefit[] = []

    // 周回数に応じた基本特典
    if (this.newGamePlusData.playthrough >= 1) {
      benefits.push({
        id: 'veteran_wisdom',
        name: '経験者の知恵',
        description: '開始時に追加の活力を獲得',
        type: 'starting_bonus',
        effect: {
          type: 'vitality',
          value: Math.min(20, this.newGamePlusData.playthrough * 5),
          description: `開始時活力+${Math.min(20, this.newGamePlusData.playthrough * 5)}`
        },
        requirement: '1周以上クリア'
      })
    }

    // 熟練度に応じた特典
    this.newGamePlusData.masteryLevels.forEach(mastery => {
      if (mastery.level >= 25) {
        benefits.push({
          id: `mastery_${mastery.category}`,
          name: `${this.translateMasteryCategory(mastery.category)}の達人`,
          description: `${mastery.category}関連の効果が向上`,
          type: 'permanent_bonus',
          effect: {
            type: 'experience',
            value: 10,
            description: `${mastery.category}経験値獲得+10%`
          },
          requirement: `${mastery.category}熟練度25以上`
        })
      }
    })

    // 高スコア達成特典
    const bestScore = Math.max(...this.newGamePlusData.previousBestScores.map(s => s.totalScore), 0)
    if (bestScore >= 8000) {
      benefits.push({
        id: 'high_score_bonus',
        name: 'ハイスコアボーナス',
        description: '開始時に追加の保険カードを選択可能',
        type: 'starting_bonus',
        effect: {
          type: 'cards',
          value: 1,
          description: '開始時保険カード選択+1'
        },
        requirement: '8000点以上のスコア達成'
      })
    }

    this.newGamePlusData.carryOverBenefits = benefits
    return benefits
  }

  /**
   * ゲームモードを解放
   */
  private unlockMode(modeId: string): void {
    const mode = this.availableModes.get(modeId)
    if (mode && !this.isGameModeUnlocked(modeId)) {
      this.newGamePlusData.unlockedModes.push(mode)
    }
  }

  /**
   * ゲームモードが解放されているかチェック
   */
  private isGameModeUnlocked(modeId: string): boolean {
    return this.newGamePlusData.unlockedModes.some(mode => mode.id === modeId)
  }

  /**
   * 新しいゲームを開始
   */
  startNewGamePlus(selectedModes: string[] = []): {
    gameConfig: any
    appliedBenefits: CarryOverBenefit[]
    activeModifiers: GameModifier[]
  } {
    this.activeModes = selectedModes.filter(modeId => this.isGameModeUnlocked(modeId))
    
    const activeModifiers: GameModifier[] = []
    this.activeModes.forEach(modeId => {
      const mode = this.availableModes.get(modeId)
      if (mode) {
        activeModifiers.push(...mode.modifiers)
      }
    })

    const gameConfig = this.buildGameConfig(activeModifiers)
    const appliedBenefits = this.newGamePlusData.carryOverBenefits

    return {
      gameConfig,
      appliedBenefits,
      activeModifiers
    }
  }

  /**
   * ゲーム設定を構築
   */
  private buildGameConfig(modifiers: GameModifier[]): any {
    const config = {
      difficulty: 'normal',
      startingVitality: 100,
      startingHandSize: 5,
      maxHandSize: 10,
      dreamCardCount: 3,
      newGamePlus: true,
      playthrough: this.newGamePlusData.playthrough
    }

    // 引き継ぎ特典を適用
    this.newGamePlusData.carryOverBenefits.forEach(benefit => {
      if (benefit.type === 'starting_bonus' && benefit.effect.type === 'vitality') {
        config.startingVitality += benefit.effect.value as number
      }
    })

    // モディファイアを適用
    modifiers.forEach(modifier => {
      this.applyModifierToConfig(config, modifier)
    })

    return config
  }

  /**
   * モディファイアを設定に適用
   */
  private applyModifierToConfig(config: any, modifier: GameModifier): void {
    const { target, operation, value } = modifier.effect

    switch (target) {
      case 'vitality':
        if (operation === 'multiply') {
          config.startingVitality = Math.round(config.startingVitality * (value as number))
        } else if (operation === 'add') {
          config.startingVitality += value as number
        }
        break
      case 'turn_limit':
        if (operation === 'set') {
          config.turnLimit = value as number
        }
        break
    }
  }

  /**
   * 現在の状態を取得
   */
  getCurrentState(): {
    data: NewGamePlusData
    availableModes: GameMode[]
    recommendations: string[]
  } {
    const availableModes = Array.from(this.availableModes.values())
      .filter(mode => this.isGameModeUnlocked(mode.id))

    const recommendations = this.generateRecommendations()

    return {
      data: this.newGamePlusData,
      availableModes,
      recommendations
    }
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = []

    // 熟練度に基づく推奨
    const lowMasteryAreas = this.newGamePlusData.masteryLevels
      .filter(m => m.level < 20)
      .map(m => this.translateMasteryCategory(m.category))

    if (lowMasteryAreas.length > 0) {
      recommendations.push(`${lowMasteryAreas.join('、')}の熟練度向上を目指しましょう`)
    }

    // 未達成の勝利条件
    const achievedVictories = new Set(
      this.newGamePlusData.previousBestScores.flatMap(s => s.victoryTypes)
    )

    const allVictoryTypes = ['standard', 'speed', 'perfect', 'economy', 'challenge']
    const unachievedVictories = allVictoryTypes.filter(v => !achievedVictories.has(v))

    if (unachievedVictories.length > 0) {
      recommendations.push(`未達成の勝利条件: ${unachievedVictories.join('、')}に挑戦しましょう`)
    }

    // 難易度向上の推奨
    if (this.newGamePlusData.playthrough >= 3 && this.isGameModeUnlocked('hard_mode')) {
      recommendations.push('上位難易度モードに挑戦してみましょう')
    }

    return recommendations
  }

  // ヘルパーメソッド
  private translateMasteryCategory(category: string): string {
    const translations = {
      'insurance': '保険活用',
      'risk_management': 'リスク管理',
      'efficiency': '効率性',
      'strategy': '戦略性',
      'survival': '生存力'
    }
    return translations[category as keyof typeof translations] || category
  }
}

/**
 * 熟練度獲得情報
 */
interface MasteryGain {
  category: string
  previousLevel: number
  newLevel: number
  expGained: number
  newBonuses: string[]
}