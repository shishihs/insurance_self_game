/**
 * 動的エンディング分岐システム - プレイスタイルに基づく多様な結末
 * 
 * このシステムは以下の機能を提供します：
 * - プレイスタイル分析による動的エンディング選出
 * - 保険活用度による人生シミュレーション結果
 * - 選択した戦略による物語の変化
 * - パーソナライズされた評価とメッセージ
 */

import type { Game } from '../../domain/entities/Game'
import type { VictoryResult } from '../victory/VictoryConditions'
import type { PlayStyleAnalysis } from '../victory/VictoryEngine'

/**
 * エンディングの種類
 */
export type EndingType = 
  | 'perfect_life'      // 完璧な人生 - パーフェクトクリア
  | 'balanced_life'     // バランスの取れた人生 - 標準クリア
  | 'adventurous_life'  // 冒険的な人生 - アグレッシブプレイ
  | 'cautious_life'     // 慎重な人生 - 保険重視プレイ
  | 'efficient_life'    // 効率的な人生 - エコノミークリア
  | 'struggling_life'   // 苦労の人生 - 低スコアクリア
  | 'comeback_life'     // 復活の人生 - 逆転クリア
  | 'legendary_life'    // 伝説の人生 - 複数勝利条件
  | 'tragic_ending'     // 悲劇的結末 - ゲームオーバー
  | 'mysterious_ending' // 謎めいた結末 - 隠し条件

/**
 * エンディング情報
 */
export interface EndingInfo {
  type: EndingType
  title: string
  subtitle: string
  mainMessage: string
  scenes: EndingScene[]
  statistics: EndingStatistics
  personalizedMessage: string
  nextLifeAdvice: string[]
  unlocks: string[]
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

/**
 * エンディングシーン
 */
export interface EndingScene {
  id: string
  title: string
  description: string
  image?: string
  emotion: 'joy' | 'satisfaction' | 'pride' | 'contemplation' | 'bittersweet' | 'hope'
  duration: number // 表示時間（秒）
}

/**
 * エンディング統計情報
 */
export interface EndingStatistics {
  finalAge: string
  lifeAchievements: string[]
  relationshipStatus: string
  financialStatus: string
  healthStatus: string
  legacyDescription: string
  lifePhilosophy: string
}

/**
 * 人生の側面
 */
interface LifeAspect {
  health: number      // 健康度 (0-100)
  wealth: number      // 財産度 (0-100)
  wisdom: number      // 知恵度 (0-100)
  relationships: number // 人間関係 (0-100)
  fulfillment: number // 充実度 (0-100)
  legacy: number      // 遺産・影響力 (0-100)
}

/**
 * 動的エンディング分岐システム
 */
export class EndingSystem {
  private readonly endingTemplates: Map<EndingType, EndingTemplate>
  private readonly personalizedMessages: Map<string, string[]>

  constructor() {
    this.endingTemplates = new Map()
    this.personalizedMessages = new Map()
    this.initializeEndingTemplates()
    this.initializePersonalizedMessages()
  }

  /**
   * エンディングテンプレートを初期化
   */
  private initializeEndingTemplates(): void {
    // 完璧な人生エンディング
    this.endingTemplates.set('perfect_life', {
      title: '完璧なる人生',
      subtitle: '全てを手にした者の物語',
      baseMessage: 'あなたは人生のすべての局面で理想的な選択を重ね、誰もが羨む完璧な人生を歩みました。',
      rarity: 'legendary',
      conditions: {
        minVitality: 80,
        maxFailures: 0,
        minInsuranceBalance: true
      }
    })

    // バランスの取れた人生エンディング
    this.endingTemplates.set('balanced_life', {
      title: '調和の取れた人生',
      subtitle: 'バランスこそ人生の真髄',
      baseMessage: 'リスクと安全、挑戦と安定の絶妙なバランスを保ち、充実した人生を送りました。',
      rarity: 'common',
      conditions: {
        minVitality: 30,
        balancedApproach: true
      }
    })

    // 冒険的な人生エンディング
    this.endingTemplates.set('adventurous_life', {
      title: '冒険者の人生',
      subtitle: 'リスクこそが人生の醍醐味',
      baseMessage: 'あなたは安全を捨て、常に冒険と挑戦を選び続けました。波乱万丈でしたが、充実した人生でした。',
      rarity: 'uncommon',
      conditions: {
        highRiskTolerance: true,
        minChallenges: 15
      }
    })

    // 慎重な人生エンディング
    this.endingTemplates.set('cautious_life', {
      title: '慎重な人生',
      subtitle: '安全第一の賢明な選択',
      baseMessage: 'あなたは常に慎重な選択を重ね、安定した人生を築きました。大きな波乱はありませんでしたが、平穏な日々を過ごしました。',
      rarity: 'common',
      conditions: {
        highInsuranceUsage: true,
        lowFailureRate: true
      }
    })

    // 効率的な人生エンディング
    this.endingTemplates.set('efficient_life', {
      title: '効率的な人生',
      subtitle: '最小の投入で最大の成果',
      baseMessage: 'あなたは無駄を排除し、効率的な人生設計で目標を達成しました。シンプルで美しい人生でした。',
      rarity: 'rare',
      conditions: {
        highEfficiency: true,
        lowResourceUsage: true
      }
    })

    // 復活の人生エンディング
    this.endingTemplates.set('comeback_life', {
      title: '不死鳥の人生',
      subtitle: '逆境からの華麗なる復活',
      baseMessage: 'どん底から這い上がり、最終的に大きな成功を収めました。あなたの復活劇は多くの人に希望を与えるでしょう。',
      rarity: 'epic',
      conditions: {
        hadLowVitality: true,
        strongFinish: true
      }
    })

    // 伝説の人生エンディング
    this.endingTemplates.set('legendary_life', {
      title: '伝説の人生',
      subtitle: '語り継がれる偉大なる足跡',
      baseMessage: 'あなたの人生は伝説となり、後世に語り継がれるでしょう。複数の分野で卓越した成果を残しました。',
      rarity: 'legendary',
      conditions: {
        multipleVictories: true,
        highScore: true
      }
    })

    // 悲劇的結末
    this.endingTemplates.set('tragic_ending', {
      title: '未完の人生',
      subtitle: '志半ばで倒れた勇者の物語',
      baseMessage: 'あなたの人生は途中で終わりましたが、その挑戦する姿勢は確かに価値のあるものでした。',
      rarity: 'common',
      conditions: {
        gameOver: true
      }
    })
  }

  /**
   * パーソナライズメッセージを初期化
   */
  private initializePersonalizedMessages(): void {
    this.personalizedMessages.set('aggressive', [
      'あなたの果敢な挑戦精神が、多くの困難を乗り越える原動力となりました。',
      'リスクを恐れない姿勢が、人生に大きな変化をもたらしました。',
      '積極的な行動力が、周囲の人々にも良い影響を与えました。'
    ])

    this.personalizedMessages.set('defensive', [
      'あなたの慎重な判断力が、多くの危機を未然に防ぎました。',
      '安全を重視する姿勢が、安定した人生の基盤となりました。',
      '計画的なアプローチが、長期的な成功につながりました。'
    ])

    this.personalizedMessages.set('balanced', [
      'あなたのバランス感覚が、人生のあらゆる局面で力を発揮しました。',
      '柔軟な思考が、多様な状況に適応する助けとなりました。',
      '調和を重視する姿勢が、周囲との良好な関係を築きました。'
    ])

    this.personalizedMessages.set('strategic', [
      'あなたの戦略的思考が、複雑な問題を解決する鍵となりました。',
      '長期的な視点が、将来への確かな道筋を築きました。',
      '計画的なアプローチが、効率的な目標達成を可能にしました。'
    ])
  }

  /**
   * エンディングを決定
   */
  determineEnding(
    game: Game, 
    victories: VictoryResult[], 
    playStyle: PlayStyleAnalysis
  ): EndingInfo {
    const endingType = this.selectEndingType(game, victories, playStyle)
    const template = this.endingTemplates.get(endingType)!
    
    const lifeAspects = this.calculateLifeAspects(game, playStyle)
    const scenes = this.generateEndingScenes(endingType, game, lifeAspects)
    const statistics = this.generateEndingStatistics(game, lifeAspects)
    const personalizedMessage = this.generatePersonalizedMessage(playStyle)
    const nextLifeAdvice = this.generateNextLifeAdvice(playStyle, game)
    const unlocks = this.determineUnlocks(endingType, victories)

    return {
      type: endingType,
      title: template.title,
      subtitle: template.subtitle,
      mainMessage: template.baseMessage,
      scenes,
      statistics,
      personalizedMessage,
      nextLifeAdvice,
      unlocks,
      rarity: template.rarity
    }
  }

  /**
   * エンディングタイプを選択
   */
  private selectEndingType(
    game: Game, 
    victories: VictoryResult[], 
    playStyle: PlayStyleAnalysis
  ): EndingType {
    // ゲームオーバーの場合
    if (game.isGameOver()) {
      return 'tragic_ending'
    }

    // 複数勝利条件達成
    if (victories.length >= 3) {
      return 'legendary_life'
    }

    // パーフェクト勝利
    if (victories.some(v => v.type === 'perfect')) {
      return 'perfect_life'
    }

    // 復活パターン
    if (this.isComeback(game)) {
      return 'comeback_life'
    }

    // プレイスタイル別分岐
    switch (playStyle.primaryStyle) {
      case 'aggressive':
        return 'adventurous_life'
      case 'defensive':
        return 'cautious_life'
      case 'strategic':
        return victories.some(v => v.type === 'economy') ? 'efficient_life' : 'balanced_life'
      default:
        return 'balanced_life'
    }
  }

  /**
   * 人生の側面を計算
   */
  private calculateLifeAspects(game: Game, playStyle: PlayStyleAnalysis): LifeAspect {
    const vitality = game.vitality
    const insuranceUsage = game.getActiveInsurances().length
    const successRate = game.stats.totalChallenges > 0 ? 
      (game.stats.successfulChallenges / game.stats.totalChallenges) * 100 : 0

    return {
      health: Math.min(100, vitality * 1.2),
      wealth: Math.min(100, (100 - game.insuranceBurden) + (successRate * 0.5)),
      wisdom: Math.min(100, game.stats.totalChallenges * 3 + insuranceUsage * 5),
      relationships: Math.min(100, 50 + (playStyle.primaryStyle === 'balanced' ? 30 : 20)),
      fulfillment: Math.min(100, vitality + successRate),
      legacy: Math.min(100, successRate * 0.8 + (game.stats.cardsAcquired || 0) * 2)
    }
  }

  /**
   * エンディングシーンを生成
   */
  private generateEndingScenes(endingType: EndingType, game: Game, lifeAspects: LifeAspect): EndingScene[] {
    const scenes: EndingScene[] = []

    switch (endingType) {
      case 'perfect_life':
        scenes.push(
          {
            id: 'perfect_youth',
            title: '輝く青春',
            description: 'あなたは青春時代を謳歌し、夢に向かって力強く歩み始めました。',
            emotion: 'joy',
            duration: 3
          },
          {
            id: 'perfect_career',
            title: '理想的なキャリア',
            description: '中年期には理想的なキャリアを築き、社会に大きく貢献しました。',
            emotion: 'pride',
            duration: 3
          },
          {
            id: 'perfect_legacy',
            title: '永続する遺産',
            description: '充実期には後進の指導に励み、あなたの知恵は次世代に受け継がれました。',
            emotion: 'satisfaction',
            duration: 4
          }
        )
        break

      case 'adventurous_life':
        scenes.push(
          {
            id: 'adventure_start',
            title: '冒険の始まり',
            description: 'あなたは安全な道を選ばず、未知への挑戦を続けました。',
            emotion: 'joy',
            duration: 3
          },
          {
            id: 'adventure_trials',
            title: '試練の日々',
            description: '多くの困難に直面しましたが、それがあなたを強くしました。',
            emotion: 'contemplation',
            duration: 3
          },
          {
            id: 'adventure_wisdom',
            title: '冒険者の知恵',
            description: '豊富な経験から得た知恵は、何ものにも代えがたい財産となりました。',
            emotion: 'satisfaction',
            duration: 4
          }
        )
        break

      case 'cautious_life':
        scenes.push(
          {
            id: 'cautious_planning',
            title: '慎重な計画',
            description: 'あなたは常に先を見据え、慎重に人生を設計しました。',
            emotion: 'contemplation',
            duration: 3
          },
          {
            id: 'cautious_stability',
            title: '安定した日々',
            description: '大きな波乱はありませんでしたが、平穏で満ち足りた日々を過ごしました。',
            emotion: 'satisfaction',
            duration: 3
          },
          {
            id: 'cautious_peace',
            title: '心の平安',
            description: '人生の終盤、あなたは深い心の平安を得ることができました。',
            emotion: 'contemplation',
            duration: 4
          }
        )
        break

      case 'comeback_life':
        scenes.push(
          {
            id: 'comeback_fall',
            title: 'どん底の時代',
            description: 'あなたの人生には暗い時期がありました。すべてを失ったかに見えました。',
            emotion: 'bittersweet',
            duration: 3
          },
          {
            id: 'comeback_rise',
            title: '復活への道',
            description: 'しかし、あなたは諦めませんでした。一歩ずつ這い上がりました。',
            emotion: 'hope',
            duration: 3
          },
          {
            id: 'comeback_triumph',
            title: '勝利の瞬間',
            description: '最終的に、あなたは見事な復活を遂げ、多くの人に希望を与えました。',
            emotion: 'pride',
            duration: 4
          }
        )
        break

      default:
        scenes.push(
          {
            id: 'balanced_journey',
            title: '人生の旅路',
            description: 'あなたの人生は様々な経験に彩られた、豊かな旅路でした。',
            emotion: 'satisfaction',
            duration: 5
          }
        )
    }

    return scenes
  }

  /**
   * エンディング統計情報を生成
   */
  private generateEndingStatistics(game: Game, lifeAspects: LifeAspect): EndingStatistics {
    return {
      finalAge: this.calculateFinalAge(game.stage),
      lifeAchievements: this.generateLifeAchievements(lifeAspects),
      relationshipStatus: this.getRelationshipStatus(lifeAspects.relationships),
      financialStatus: this.getFinancialStatus(lifeAspects.wealth),
      healthStatus: this.getHealthStatus(lifeAspects.health),
      legacyDescription: this.getLegacyDescription(lifeAspects.legacy),
      lifePhilosophy: this.getLifePhilosophy(lifeAspects)
    }
  }

  /**
   * パーソナライズメッセージを生成
   */
  private generatePersonalizedMessage(playStyle: PlayStyleAnalysis): string {
    const messages = this.personalizedMessages.get(playStyle.primaryStyle) || []
    const randomIndex = Math.floor(Math.random() * messages.length)
    return messages[randomIndex] || 'あなたは自分らしい人生を歩みました。'
  }

  /**
   * 次の人生へのアドバイスを生成
   */
  private generateNextLifeAdvice(playStyle: PlayStyleAnalysis, game: Game): string[] {
    const advice: string[] = []

    // プレイスタイル別アドバイス
    switch (playStyle.primaryStyle) {
      case 'aggressive':
        advice.push('時には慎重さも必要です。保険の活用を検討してみましょう。')
        advice.push('チャレンジクリアやスピードクリアに挑戦してみましょう。')
        break
      case 'defensive':
        advice.push('もう少し冒険してみても良いかもしれません。')
        advice.push('エコノミークリアに挑戦してみましょう。')
        break
      case 'balanced':
        advice.push('バランス型のあなたは、どの勝利条件でも達成可能です。')
        advice.push('特定の分野を極めてみるのも良いでしょう。')
        break
      case 'strategic':
        advice.push('戦略的思考を活かして、複合的な勝利条件に挑戦しましょう。')
        advice.push('パーフェクトクリアやコンプリートクリアが向いています。')
        break
    }

    // 成績別アドバイス
    if (game.vitality < 30) {
      advice.push('活力管理を見直してみましょう。保険の活用が鍵です。')
    }

    if (game.stats.failedChallenges > 5) {
      advice.push('チャレンジの選択をより慎重に行いましょう。')
    }

    return advice
  }

  /**
   * 解放要素を決定
   */
  private determineUnlocks(endingType: EndingType, victories: VictoryResult[]): string[] {
    const unlocks: string[] = []

    switch (endingType) {
      case 'perfect_life':
        unlocks.push('パーフェクトモード解放')
        unlocks.push('ゴールデンテーマ解放')
        break
      case 'legendary_life':
        unlocks.push('レジェンドモード解放')
        unlocks.push('特別称号「伝説の人」')
        break
      case 'comeback_life':
        unlocks.push('サバイバルモード解放')
        unlocks.push('特別称号「不死鳥」')
        break
    }

    // 勝利条件による解放
    victories.forEach(victory => {
      switch (victory.type) {
        case 'speed':
          unlocks.push('タイムアタックモード解放')
          break
        case 'economy':
          unlocks.push('ミニマリストモード解放')
          break
        case 'challenge':
          unlocks.push('エクストリームモード解放')
          break
      }
    })

    return unlocks
  }

  // ヘルパーメソッド
  private isComeback(game: Game): boolean {
    // 簡略化: 活力が低い状態から回復した場合
    return game.vitality >= 30 && game.stats.failedChallenges >= 3
  }

  private calculateFinalAge(stage: string): string {
    switch (stage) {
      case 'youth': return '若年期（25歳相当）'
      case 'middle': return '中年期（45歳相当）'
      case 'fulfillment': return '充実期（65歳相当）'
      default: return '不明'
    }
  }

  private generateLifeAchievements(lifeAspects: LifeAspect): string[] {
    const achievements: string[] = []

    if (lifeAspects.health > 80) achievements.push('健康な体を維持')
    if (lifeAspects.wealth > 80) achievements.push('経済的安定を確立')
    if (lifeAspects.wisdom > 80) achievements.push('豊富な人生経験を獲得')
    if (lifeAspects.relationships > 80) achievements.push('良好な人間関係を構築')
    if (lifeAspects.fulfillment > 80) achievements.push('充実した人生を実現')
    if (lifeAspects.legacy > 80) achievements.push('後世に残る業績を達成')

    return achievements.length > 0 ? achievements : ['かけがえのない人生を歩んだ']
  }

  private getRelationshipStatus(relationships: number): string {
    if (relationships >= 80) return '多くの人に愛され、深い絆を築いた'
    if (relationships >= 60) return '良好な人間関係を維持した'
    if (relationships >= 40) return '必要最小限の関係を保った'
    return '孤独を好み、独立した道を歩んだ'
  }

  private getFinancialStatus(wealth: number): string {
    if (wealth >= 80) return '豊かな経済状況を築いた'
    if (wealth >= 60) return '安定した経済基盤を確立した'
    if (wealth >= 40) return '質素ながらも充足した生活を送った'
    return '物質的豊かさより精神的価値を重視した'
  }

  private getHealthStatus(health: number): string {
    if (health >= 80) return '生涯にわたって健康を維持した'
    if (health >= 60) return '大きな病気もなく過ごした'
    if (health >= 40) return '健康に気を遣いながら生活した'
    return '身体の限界と向き合いながら生きた'
  }

  private getLegacyDescription(legacy: number): string {
    if (legacy >= 80) return 'あなたの功績は長く語り継がれるでしょう'
    if (legacy >= 60) return 'あなたの影響は次世代に受け継がれました'
    if (legacy >= 40) return 'あなたは確実な足跡を残しました'
    return 'あなたは自分らしい人生を歩みました'
  }

  private getLifePhilosophy(lifeAspects: LifeAspect): string {
    const maxAspect = Object.entries(lifeAspects).reduce((a, b) => 
      lifeAspects[a[0] as keyof LifeAspect] > lifeAspects[b[0] as keyof LifeAspect] ? a : b
    )

    switch (maxAspect[0]) {
      case 'health': return '健康第一、心身の調和を重視した人生'
      case 'wealth': return '経済的安定、物質的豊かさを追求した人生'
      case 'wisdom': return '学び続け、知識と経験を積み重ねた人生'
      case 'relationships': return '人とのつながりを大切にした人生'
      case 'fulfillment': return '自己実現、充実感を追求した人生'
      case 'legacy': return '後世への貢献、社会的影響を重視した人生'
      default: return 'バランスの取れた、調和のある人生'
    }
  }
}

/**
 * エンディングテンプレート
 */
interface EndingTemplate {
  title: string
  subtitle: string
  baseMessage: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  conditions: Record<string, any>
}