/**
 * 秘密・隠し要素システム - 複数周回で明かされる真実
 * 
 * このシステムは以下の機能を提供します：
 * - 複数周回でのみ解放される秘密
 * - 隠されたストーリーライン
 * - 特別な条件で発生するイベント
 * - 段階的に明かされる世界の真実
 */

import type { Game } from '../../domain/entities/Game'
import type { VictoryResult } from '../victory/VictoryConditions'
import type { NewGamePlusData } from '../newgame/NewGamePlusSystem'

/**
 * 秘密の分類
 */
export type SecretCategory = 
  | 'lore'          // 世界観・設定
  | 'character'     // キャラクター
  | 'mechanics'     // ゲームシステム
  | 'easter_egg'    // イースターエッグ
  | 'meta'          // メタ要素
  | 'philosophical' // 哲学的テーマ

/**
 * 秘密の重要度
 */
export type SecretImportance = 
  | 'trivial'    // 些細な発見
  | 'interesting' // 興味深い事実
  | 'significant' // 重要な発見
  | 'profound'    // 深遠な真実
  | 'paradigm_shifting' // パラダイムシフト

/**
 * 秘密情報
 */
export interface Secret {
  id: string
  category: SecretCategory
  importance: SecretImportance
  name: string
  shortDescription: string
  fullRevelation: string
  unlockConditions: UnlockCondition[]
  prerequisites: string[] // 前提となる他の秘密のID
  discoveredOn?: Date
  discoveryPlaythrough?: number
  relatedSecrets: string[]
  hints: SecretHint[]
  rewards: SecretReward[]
}

/**
 * 解放条件
 */
export interface UnlockCondition {
  type: 'playthrough' | 'victory' | 'score' | 'time' | 'sequence' | 'special'
  description: string
  requirement: string | number | SpecialRequirement
  progress: number // 0-100%
  satisfied: boolean
}

/**
 * 特別な要求
 */
export interface SpecialRequirement {
  action: string
  context: string
  timing?: string
  frequency?: number
}

/**
 * 秘密のヒント
 */
export interface SecretHint {
  playthroughRequired: number
  hintText: string
  location: 'ending' | 'mid_game' | 'start' | 'special_event'
  subtle: boolean // 微妙なヒントか明確なヒントか
}

/**
 * 秘密の報酬
 */
export interface SecretReward {
  type: 'lore_entry' | 'art_unlock' | 'mode_unlock' | 'title' | 'achievement'
  id: string
  name: string
  description: string
}

/**
 * 発見の文脈
 */
export interface DiscoveryContext {
  playthrough: number
  gameState: 'playing' | 'ending' | 'menu'
  triggerEvent: string
  additionalInfo: Record<string, any>
}

/**
 * 真実のレイヤー
 */
export interface TruthLayer {
  layer: number
  name: string
  description: string
  requiredDiscoveries: string[]
  unlocked: boolean
  mainRevelation: string
  implications: string[]
}

/**
 * 秘密・隠し要素システム
 */
export class SecretSystem {
  private readonly secrets: Map<string, Secret>
  private readonly discoveredSecrets: Set<string>
  private truthLayers: TruthLayer[]
  private readonly hintDeliveryHistory: Map<string, Date[]>
  private readonly contextualClues: Map<string, string[]>

  constructor() {
    this.secrets = new Map()
    this.discoveredSecrets = new Set()
    this.truthLayers = []
    this.hintDeliveryHistory = new Map()
    this.contextualClues = new Map()
    this.initializeSecrets()
    this.initializeTruthLayers()
  }

  /**
   * 秘密を初期化
   */
  private initializeSecrets(): void {
    // レイヤー1: 表面的な秘密
    this.secrets.set('insurance_industry_truth', {
      id: 'insurance_industry_truth',
      category: 'lore',
      importance: 'interesting',
      name: '保険業界の真実',
      shortDescription: '保険業界の裏側に隠された真実',
      fullRevelation: '保険とは単なる商品ではなく、社会の不安を管理する複雑なシステムであることが明らかになります。人々の恐れや希望が、この業界の原動力となっているのです。',
      unlockConditions: [{
        type: 'playthrough',
        description: '2周目以降でプレイ',
        requirement: 2,
        progress: 0,
        satisfied: false
      }],
      prerequisites: [],
      relatedSecrets: ['risk_philosophy', 'human_nature_insurance'],
      hints: [
        {
          playthroughRequired: 1,
          hintText: '保険カードの説明文に、時々不自然な表現が見つかります...',
          location: 'mid_game',
          subtle: true
        }
      ],
      rewards: [
        {
          type: 'lore_entry',
          id: 'insurance_codex',
          name: '保険の真実',
          description: '保険業界の隠された側面についての詳細情報'
        }
      ]
    })

    // レイヤー2: 深い真実
    this.secrets.set('life_simulation_nature', {
      id: 'life_simulation_nature',
      category: 'meta',
      importance: 'profound',
      name: '人生シミュレーションの本質',
      shortDescription: 'このゲームが真に意味するもの',
      fullRevelation: 'あなたがプレイしているのは単なるゲームではありません。これは人生の選択とその結果について深く考えるための思考実験なのです。すべての決断、すべての保険、すべての結果は、現実の人生における重要な意思決定の縮図なのです。',
      unlockConditions: [
        {
          type: 'playthrough',
          description: '5周目以降でプレイ',
          requirement: 5,
          progress: 0,
          satisfied: false
        },
        {
          type: 'victory',
          description: '3つ以上の異なる勝利条件を達成',
          requirement: 3,
          progress: 0,
          satisfied: false
        }
      ],
      prerequisites: ['insurance_industry_truth', 'player_agency_illusion'],
      relatedSecrets: ['developer_message', 'philosophical_framework'],
      hints: [
        {
          playthroughRequired: 3,
          hintText: 'エンディングで「これは本当にゲームなのでしょうか？」という言葉が現れます',
          location: 'ending',
          subtle: false
        }
      ],
      rewards: [
        {
          type: 'mode_unlock',
          id: 'philosophical_mode',
          name: '哲学モード',
          description: '深い思考を促す特別なゲームモード'
        }
      ]
    })

    // レイヤー3: 最深の真実
    this.secrets.set('developers_true_intent', {
      id: 'developers_true_intent',
      category: 'meta',
      importance: 'paradigm_shifting',
      name: '開発者の真の意図',
      shortDescription: 'このゲームを作った真の理由',
      fullRevelation: '私たち開発者は、現代社会において人々が直面する選択の重みと、その選択がもたらす長期的な影響について深く考えてもらいたいと願っています。保険というテーマを通じて、リスク、安全、そして人生の不確実性について考察する機会を提供したかったのです。あなたがこのメッセージを読んでいるということは、その意図が少しでも伝わったということかもしれません。',
      unlockConditions: [
        {
          type: 'playthrough',
          description: '10周目以降でプレイ',
          requirement: 10,
          progress: 0,
          satisfied: false
        },
        {
          type: 'special',
          description: '特定の秘密のシーケンスを発見',
          requirement: {
            action: 'discover_sequence',
            context: 'philosophical_revelation',
            frequency: 1
          },
          progress: 0,
          satisfied: false
        }
      ],
      prerequisites: ['life_simulation_nature', 'philosophy_of_choice'],
      relatedSecrets: [],
      hints: [
        {
          playthroughRequired: 7,
          hintText: '開発者からの隠されたメッセージがあるようです...',
          location: 'special_event',
          subtle: true
        }
      ],
      rewards: [
        {
          type: 'achievement',
          id: 'truth_seeker',
          name: '真実の探求者',
          description: 'ゲームに隠された最深の意図を発見した'
        },
        {
          type: 'title',
          id: 'philosopher',
          name: '哲学者',
          description: 'ゲームの本質を理解した者'
        }
      ]
    })

    // イースターエッグ的な秘密
    this.secrets.set('konami_code_easter_egg', {
      id: 'konami_code_easter_egg',
      category: 'easter_egg',
      importance: 'trivial',
      name: '隠しコマンド',
      shortDescription: '開発者の遊び心',
      fullRevelation: '昔ながらのゲームの伝統を大切にする開発者たちが、現代のゲームにも少しの魔法を込めました。',
      unlockConditions: [{
        type: 'special',
        description: '特定のキー入力を実行',
        requirement: {
          action: 'key_sequence',
          context: 'main_menu',
          timing: 'any'
        },
        progress: 0,
        satisfied: false
      }],
      prerequisites: [],
      relatedSecrets: ['retro_gaming_homage'],
      hints: [
        {
          playthroughRequired: 1,
          hintText: '上上下下左右左右...',
          location: 'menu',
          subtle: true
        }
      ],
      rewards: [
        {
          type: 'art_unlock',
          id: 'retro_theme',
          name: 'レトロテーマ',
          description: '80年代風のビジュアルテーマ'
        }
      ]
    })

    // 哲学的な秘密
    this.secrets.set('philosophy_of_choice', {
      id: 'philosophy_of_choice',
      category: 'philosophical',
      importance: 'significant',
      name: '選択の哲学',
      shortDescription: '自由意志と決定論の問題',
      fullRevelation: '人生におけるすべての選択は、過去の経験、現在の状況、そして未来への期待の複雑な相互作用の結果です。保険を選ぶという行為でさえ、私たちの価値観、恐れ、希望を反映しています。あなたがゲーム内で行う選択は、現実の選択プロセスの縮図なのです。',
      unlockConditions: [
        {
          type: 'playthrough',
          description: '3周目以降で異なる戦略を採用',
          requirement: 3,
          progress: 0,
          satisfied: false
        },
        {
          type: 'victory',
          description: '正反対の勝利条件を両方達成',
          requirement: 'opposite_victories',
          progress: 0,
          satisfied: false
        }
      ],
      prerequisites: ['insurance_industry_truth'],
      relatedSecrets: ['determinism_vs_freedom', 'life_simulation_nature'],
      hints: [
        {
          playthroughRequired: 2,
          hintText: '同じ状況でも、あなたの選択は毎回異なるかもしれません',
          location: 'mid_game',
          subtle: true
        }
      ],
      rewards: [
        {
          type: 'lore_entry',
          id: 'philosophy_codex',
          name: '選択の本質',
          description: '意思決定の哲学的側面についての考察'
        }
      ]
    })
  }

  /**
   * 真実のレイヤーを初期化
   */
  private initializeTruthLayers(): void {
    this.truthLayers = [
      {
        layer: 1,
        name: '表面の真実',
        description: '保険とリスク管理の基本的理解',
        requiredDiscoveries: ['insurance_industry_truth'],
        unlocked: false,
        mainRevelation: '保険は単なる商品以上の社会的システムである',
        implications: [
          '保険選択は価値観の反映',
          'リスク認識の個人差',
          '安心感の経済価値'
        ]
      },
      {
        layer: 2,
        name: '深層の真実',
        description: '人生の選択とその意味についての洞察',
        requiredDiscoveries: ['life_simulation_nature', 'philosophy_of_choice'],
        unlocked: false,
        mainRevelation: 'ゲームは人生の意思決定過程の縮図である',
        implications: [
          '選択の重要性の再認識',
          '結果への責任の理解',
          '不確実性との共存'
        ]
      },
      {
        layer: 3,
        name: '最深の真実',
        description: '存在と選択の本質的な問い',
        requiredDiscoveries: ['developers_true_intent', 'meta_game_nature'],
        unlocked: false,
        mainRevelation: 'ゲームという媒体を通じた哲学的探求',
        implications: [
          '現実とシミュレーションの境界',
          '体験による学習の価値',
          '共感と理解の促進'
        ]
      }
    ]
  }

  /**
   * ゲーム進行に基づいて秘密をチェック
   */
  checkForSecrets(
    game: Game,
    victories: VictoryResult[],
    newGamePlusData: NewGamePlusData,
    context: DiscoveryContext
  ): Secret[] {
    const newlyDiscovered: Secret[] = []

    for (const secret of this.secrets.values()) {
      if (this.discoveredSecrets.has(secret.id)) continue

      if (this.checkUnlockConditions(secret, game, victories, newGamePlusData, context)) {
        this.discoveredSecrets.add(secret.id)
        secret.discoveredOn = new Date()
        secret.discoveryPlaythrough = context.playthrough
        newlyDiscovered.push(secret)

        // 関連する真実レイヤーを更新
        this.updateTruthLayers()
      }
    }

    return newlyDiscovered
  }

  /**
   * 解放条件をチェック
   */
  private checkUnlockConditions(
    secret: Secret,
    game: Game,
    victories: VictoryResult[],
    newGamePlusData: NewGamePlusData,
    context: DiscoveryContext
  ): boolean {
    // 前提条件チェック
    if (!this.checkPrerequisites(secret.prerequisites)) {
      return false
    }

    // すべての解放条件が満たされているかチェック
    return secret.unlockConditions.every(condition => 
      this.evaluateUnlockCondition(condition, game, victories, newGamePlusData, context)
    )
  }

  /**
   * 前提条件をチェック
   */
  private checkPrerequisites(prerequisites: string[]): boolean {
    return prerequisites.every(prereqId => this.discoveredSecrets.has(prereqId))
  }

  /**
   * 個別の解放条件を評価
   */
  private evaluateUnlockCondition(
    condition: UnlockCondition,
    game: Game,
    victories: VictoryResult[],
    newGamePlusData: NewGamePlusData,
    context: DiscoveryContext
  ): boolean {
    switch (condition.type) {
      case 'playthrough':
        const playthroughReq = condition.requirement as number
        condition.progress = Math.min(100, (context.playthrough / playthroughReq) * 100)
        condition.satisfied = context.playthrough >= playthroughReq
        return condition.satisfied

      case 'victory':
        if (typeof condition.requirement === 'number') {
          condition.progress = Math.min(100, (victories.length / condition.requirement) * 100)
          condition.satisfied = victories.length >= condition.requirement
        } else if (condition.requirement === 'opposite_victories') {
          const hasAggressive = victories.some(v => ['speed', 'challenge'].includes(v.type))
          const hasDefensive = victories.some(v => ['perfect', 'economy'].includes(v.type))
          condition.satisfied = hasAggressive && hasDefensive
          condition.progress = condition.satisfied ? 100 : 50
        }
        return condition.satisfied

      case 'score':
        // スコア関連の条件（実装に応じて）
        return false

      case 'special':
        const specialReq = condition.requirement as SpecialRequirement
        return this.evaluateSpecialRequirement(specialReq, context)

      default:
        return false
    }
  }

  /**
   * 特別な要求を評価
   */
  private evaluateSpecialRequirement(
    requirement: SpecialRequirement,
    context: DiscoveryContext
  ): boolean {
    switch (requirement.action) {
      case 'discover_sequence':
        // 特定の秘密の発見順序をチェック
        return this.checkDiscoverySequence(requirement.context)
      
      case 'key_sequence':
        // キー入力シーケンス（実際の実装では入力履歴を追跡）
        return context.triggerEvent === 'konami_code'

      default:
        return false
    }
  }

  /**
   * 発見シーケンスをチェック
   */
  private checkDiscoverySequence(context: string): boolean {
    // 哲学的啓示シーケンス
    if (context === 'philosophical_revelation') {
      const requiredOrder = [
        'insurance_industry_truth',
        'philosophy_of_choice',
        'life_simulation_nature'
      ]
      
      let lastIndex = -1
      for (const secretId of requiredOrder) {
        if (!this.discoveredSecrets.has(secretId)) return false
        
        const secret = this.secrets.get(secretId)
        if (!secret?.discoveryPlaythrough) return false
        
        if (secret.discoveryPlaythrough <= lastIndex) return false
        lastIndex = secret.discoveryPlaythrough
      }
      return true
    }

    return false
  }

  /**
   * 真実レイヤーを更新
   */
  private updateTruthLayers(): void {
    this.truthLayers.forEach(layer => {
      if (!layer.unlocked) {
        const allDiscovered = layer.requiredDiscoveries.every(secretId =>
          this.discoveredSecrets.has(secretId)
        )
        
        if (allDiscovered) {
          layer.unlocked = true
        }
      }
    })
  }

  /**
   * ヒントを提供
   */
  provideHints(
    context: DiscoveryContext,
    location: SecretHint['location']
  ): SecretHint[] {
    const availableHints: SecretHint[] = []

    for (const secret of this.secrets.values()) {
      if (this.discoveredSecrets.has(secret.id)) continue

      for (const hint of secret.hints) {
        if (hint.location === location && 
            context.playthrough >= hint.playthroughRequired) {
          
          // ヒント配信履歴をチェック（同じヒントを何度も出さない）
          const hintKey = `${secret.id}_${hint.hintText}`
          const lastDelivered = this.hintDeliveryHistory.get(hintKey)
          
          if (!lastDelivered || this.shouldDeliverHintAgain(lastDelivered)) {
            availableHints.push(hint)
            
            // 配信履歴を更新
            if (!this.hintDeliveryHistory.has(hintKey)) {
              this.hintDeliveryHistory.set(hintKey, [])
            }
            this.hintDeliveryHistory.get(hintKey)!.push(new Date())
          }
        }
      }
    }

    return availableHints
  }

  /**
   * ヒントを再配信すべきかチェック
   */
  private shouldDeliverHintAgain(deliveryHistory: Date[]): boolean {
    if (deliveryHistory.length === 0) return true
    
    const lastDelivery = deliveryHistory[deliveryHistory.length - 1]
    const daysSinceLastDelivery = (Date.now() - lastDelivery.getTime()) / (1000 * 60 * 60 * 24)
    
    // 7日以上経過していれば再配信
    return daysSinceLastDelivery >= 7
  }

  /**
   * 文脈的手がかりを生成
   */
  generateContextualClues(game: Game, context: DiscoveryContext): string[] {
    const clues: string[] = []

    // 未発見の秘密に対する微妙な手がかり
    for (const secret of this.secrets.values()) {
      if (this.discoveredSecrets.has(secret.id)) continue

      if (this.shouldProvideContextualClue(secret, game, context)) {
        const clue = this.generateSubtleClue(secret, game)
        if (clue) clues.push(clue)
      }
    }

    return clues
  }

  /**
   * 文脈的手がかりを提供すべきかチェック
   */
  private shouldProvideContextualClue(
    secret: Secret,
    game: Game,
    context: DiscoveryContext
  ): boolean {
    // プレイスタイルや選択に基づいて手がかり提供を判断
    switch (secret.id) {
      case 'philosophy_of_choice':
        // 異なる戦略を採用している場合にヒント
        return context.playthrough >= 2 && game.stats.totalChallenges > 10
      
      case 'life_simulation_nature':
        // 高いスコアを達成している場合にヒント
        return context.playthrough >= 3
      
      default:
        return Math.random() < 0.1 // 10%の確率でランダムヒント
    }
  }

  /**
   * 微妙な手がかりを生成
   */
  private generateSubtleClue(secret: Secret, game: Game): string | null {
    const clueTemplates = {
      'philosophy_of_choice': [
        'あなたの選択パターンに、何か一貫性があるような...',
        '同じ状況でも、時によって異なる判断をしていませんか？',
        '選択の背後にある動機について考えたことはありますか？'
      ],
      'life_simulation_nature': [
        'このゲームの本当の目的は何でしょうか？',
        '現実とゲームの境界線について考えてみてください',
        'あなたがここで学んでいることは何ですか？'
      ],
      'insurance_industry_truth': [
        '保険カードの説明文に、興味深い表現が隠されています',
        '保険業界の本質について、もう少し深く考えてみませんか？',
        'リスクの管理は、単なるビジネス以上の意味があります'
      ]
    }

    const templates = clueTemplates[secret.id as keyof typeof clueTemplates]
    if (templates) {
      return templates[Math.floor(Math.random() * templates.length)]
    }

    return null
  }

  /**
   * 発見レポートを生成
   */
  generateDiscoveryReport(secret: Secret): {
    announcement: string
    detailedExplanation: string
    implications: string[]
    nextSteps: string[]
  } {
    return {
      announcement: `秘密を発見しました: ${secret.name}`,
      detailedExplanation: secret.fullRevelation,
      implications: this.generateImplications(secret),
      nextSteps: this.generateNextSteps(secret)
    }
  }

  /**
   * 含意を生成
   */
  private generateImplications(secret: Secret): string[] {
    const implications: string[] = []

    switch (secret.importance) {
      case 'paradigm_shifting':
        implications.push('この発見は、ゲーム全体の見方を変える可能性があります')
        implications.push('現実世界での意思決定にも影響を与えるかもしれません')
        break
      
      case 'profound':
        implications.push('深い哲学的思考を促す発見です')
        implications.push('他のプレイヤーとこの体験を共有することをお勧めします')
        break
      
      case 'significant':
        implications.push('ゲームのより深い層を理解する手助けとなります')
        break
      
      default:
        implications.push('興味深い発見です')
    }

    return implications
  }

  /**
   * 次のステップを生成
   */
  private generateNextSteps(secret: Secret): string[] {
    const nextSteps: string[] = []

    // 関連する秘密のヒント
    if (secret.relatedSecrets.length > 0) {
      nextSteps.push('関連する他の秘密を探してみましょう')
    }

    // 未解放の真実レイヤーがある場合
    const unlockedLayersCount = this.truthLayers.filter(l => l.unlocked).length
    if (unlockedLayersCount < this.truthLayers.length) {
      nextSteps.push('より深い真実の層が存在するかもしれません')
    }

    // プレイスタイルに基づく提案
    if (secret.category === 'philosophical') {
      nextSteps.push('異なるプレイスタイルで再度プレイしてみてください')
    }

    return nextSteps
  }

  /**
   * 現在の発見状況を取得
   */
  getDiscoveryStatus(): {
    discoveredSecrets: Secret[]
    totalSecrets: number
    unlockedTruthLayers: TruthLayer[]
    completionPercentage: number
    nextMilestones: string[]
  } {
    const discoveredSecrets = Array.from(this.discoveredSecrets.values())
      .map(id => this.secrets.get(id)!)
      .filter(Boolean)

    const unlockedTruthLayers = this.truthLayers.filter(layer => layer.unlocked)
    
    const completionPercentage = (this.discoveredSecrets.size / this.secrets.size) * 100

    const nextMilestones = this.generateNextMilestones()

    return {
      discoveredSecrets,
      totalSecrets: this.secrets.size,
      unlockedTruthLayers,
      completionPercentage,
      nextMilestones
    }
  }

  /**
   * 次のマイルストーンを生成
   */
  private generateNextMilestones(): string[] {
    const milestones: string[] = []

    // 未発見の重要な秘密
    for (const secret of this.secrets.values()) {
      if (!this.discoveredSecrets.has(secret.id) && 
          secret.importance === 'profound' || secret.importance === 'paradigm_shifting') {
        milestones.push(`重要な秘密「${secret.name}」の発見`)
      }
    }

    // 未解放の真実レイヤー
    for (const layer of this.truthLayers) {
      if (!layer.unlocked) {
        milestones.push(`真実のレイヤー「${layer.name}」の解放`)
        break // 次のレイヤーのみ表示
      }
    }

    return milestones
  }
}