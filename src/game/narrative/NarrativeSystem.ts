/**
 * 物語統合システム - ゲームプレイと物語の深い統合
 * 
 * このシステムは以下の機能を提供します：
 * - プレイヤーの選択に基づく動的な物語生成
 * - ゲーム進行に応じたナラティブイベント
 * - 保険活用度による人生ストーリーの変化
 * - インタラクティブな人生シミュレーション要素
 */

import type { Game } from '../../domain/entities/Game'
import type { Card } from '../../domain/entities/Card'
import type { GameStage } from '../../domain/types/card.types'

/**
 * 物語イベントの種類
 */
export type NarrativeEventType = 
  | 'life_milestone'      // 人生の節目
  | 'insurance_decision'  // 保険に関する決断
  | 'challenge_encounter' // チャレンジとの遭遇
  | 'relationship_event'  // 人間関係イベント
  | 'career_development'  // キャリア発展
  | 'health_event'        // 健康関連イベント
  | 'wisdom_gain'         // 知恵・学びの獲得
  | 'legacy_moment'       // 遺産・影響に関わる瞬間

/**
 * 物語イベント
 */
export interface NarrativeEvent {
  id: string
  type: NarrativeEventType
  title: string
  description: string
  storyText: string
  choices?: NarrativeChoice[]
  consequences: NarrativeConsequence[]
  emotionalImpact: EmotionalImpact
  stageRelevance: GameStage[]
  rarity: 'common' | 'rare' | 'unique'
}

/**
 * 物語選択肢
 */
export interface NarrativeChoice {
  id: string
  text: string
  description: string
  requirements?: ChoiceRequirement[]
  consequences: NarrativeConsequence[]
  personalityAlignment: 'aggressive' | 'defensive' | 'balanced' | 'strategic'
}

/**
 * 選択肢の条件
 */
export interface ChoiceRequirement {
  type: 'vitality' | 'insurance_count' | 'turn' | 'card_type' | 'achievement'
  value: number | string
  operator: 'greater' | 'less' | 'equal' | 'has'
}

/**
 * 物語の結果
 */
export interface NarrativeConsequence {
  type: 'vitality' | 'insurance' | 'story_flag' | 'relationship' | 'wisdom' | 'unlock'
  value: number | string
  description: string
}

/**
 * 感情的影響
 */
export interface EmotionalImpact {
  primary: 'joy' | 'sadness' | 'anxiety' | 'hope' | 'pride' | 'regret' | 'determination'
  intensity: number // 1-10
  duration: 'momentary' | 'short' | 'lasting' | 'permanent'
}

/**
 * 人生の側面
 */
export interface LifeAspects {
  relationships: number    // 人間関係 (0-100)
  career: number          // キャリア (0-100)
  health: number          // 健康 (0-100)
  wisdom: number          // 知恵 (0-100)
  reputation: number      // 評判 (0-100)
  happiness: number       // 幸福度 (0-100)
}

/**
 * 物語フラグ
 */
export interface StoryFlags {
  hasFamily: boolean
  isMarried: boolean
  hasChildren: boolean
  isSuccessful: boolean
  isCautious: boolean
  isAdventurous: boolean
  hasOvercomeTrauma: boolean
  isWise: boolean
  isGenerous: boolean
  isRespected: boolean
}

/**
 * 物語統合システム
 */
export class NarrativeSystem {
  private readonly narrativeEvents: Map<string, NarrativeEvent>
  private readonly activeStoryFlags: StoryFlags
  private readonly lifeAspects: LifeAspects
  private readonly eventHistory: NarrativeEvent[]
  private readonly personalityProfile: PersonalityProfile

  constructor() {
    this.narrativeEvents = new Map()
    this.activeStoryFlags = this.initializeStoryFlags()
    this.lifeAspects = this.initializeLifeAspects()
    this.eventHistory = []
    this.personalityProfile = this.initializePersonalityProfile()
    this.initializeNarrativeEvents()
  }

  /**
   * ストーリーフラグを初期化
   */
  private initializeStoryFlags(): StoryFlags {
    return {
      hasFamily: false,
      isMarried: false,
      hasChildren: false,
      isSuccessful: false,
      isCautious: false,
      isAdventurous: false,
      hasOvercomeTrauma: false,
      isWise: false,
      isGenerous: false,
      isRespected: false
    }
  }

  /**
   * 人生の側面を初期化
   */
  private initializeLifeAspects(): LifeAspects {
    return {
      relationships: 50,
      career: 50,
      health: 80,
      wisdom: 30,
      reputation: 50,
      happiness: 60
    }
  }

  /**
   * 性格プロファイルを初期化
   */
  private initializePersonalityProfile(): PersonalityProfile {
    return {
      riskTolerance: 50,
      socialNeed: 50,
      ambition: 50,
      empathy: 50,
      creativity: 50,
      stability: 50
    }
  }

  /**
   * 物語イベントを初期化
   */
  private initializeNarrativeEvents(): void {
    // 青春期のイベント
    this.narrativeEvents.set('youth_first_job', {
      id: 'youth_first_job',
      type: 'career_development',
      title: '初めての仕事',
      description: 'あなたは人生初の本格的な仕事に就きました',
      storyText: '大学を卒業し、あなたは人生初の本格的な仕事に就きました。新しい環境、新しい責任、そして無限の可能性が広がっています。この選択があなたの人生を大きく左右するでしょう。',
      choices: [
        {
          id: 'take_risks',
          text: '挑戦的なプロジェクトに参加する',
          description: 'リスクは高いが、成功すれば大きな成長が期待できる',
          consequences: [
            { type: 'vitality', value: -5, description: 'ストレスが増加' },
            { type: 'story_flag', value: 'isAdventurous', description: '冒険的な性格が強化' }
          ],
          personalityAlignment: 'aggressive'
        },
        {
          id: 'steady_approach',
          text: '着実に基礎を固める',
          description: '安定した成長を選び、基礎力を身につける',
          consequences: [
            { type: 'vitality', value: 2, description: '安定したペースで成長' },
            { type: 'story_flag', value: 'isCautious', description: '慎重な性格が強化' }
          ],
          personalityAlignment: 'defensive'
        }
      ],
      consequences: [],
      emotionalImpact: {
        primary: 'hope',
        intensity: 7,
        duration: 'lasting'
      },
      stageRelevance: ['youth'],
      rarity: 'common'
    })

    this.narrativeEvents.set('youth_insurance_decision', {
      id: 'youth_insurance_decision',
      type: 'insurance_decision',
      title: '初めての保険選択',
      description: '人生初の重要な保険選択に直面しました',
      storyText: '友人から「若いうちに保険に入った方がいい」と勧められました。まだ若く健康なあなたにとって、保険は必要ないように思えますが、将来への備えとして検討すべきかもしれません。',
      choices: [
        {
          id: 'buy_insurance',
          text: '保険に加入する',
          description: '将来への備えとして保険に加入',
          consequences: [
            { type: 'insurance', value: 1, description: '保険カードを獲得' },
            { type: 'story_flag', value: 'isCautious', description: '計画的な思考が強化' }
          ],
          personalityAlignment: 'defensive'
        },
        {
          id: 'skip_insurance',
          text: '今は必要ないと判断する',
          description: '若さと健康を理由に保険を見送る',
          consequences: [
            { type: 'vitality', value: 3, description: '保険料の負担がない分、活力が向上' },
            { type: 'story_flag', value: 'isAdventurous', description: 'リスクテイカーな面が強化' }
          ],
          personalityAlignment: 'aggressive'
        }
      ],
      consequences: [],
      emotionalImpact: {
        primary: 'anxiety',
        intensity: 4,
        duration: 'short'
      },
      stageRelevance: ['youth'],
      rarity: 'common'
    })

    // 中年期のイベント
    this.narrativeEvents.set('middle_family_responsibility', {
      id: 'middle_family_responsibility',
      type: 'relationship_event',
      title: '家族への責任',
      description: '家族を持ったあなたに新たな責任が生まれました',
      storyText: '結婚し、子供も生まれ、あなたには大きな責任が生まれました。家族の幸せと安全を守るため、これまで以上に慎重な判断が求められます。保険や将来設計について真剣に考える時期です。',
      choices: [
        {
          id: 'comprehensive_insurance',
          text: '包括的な保険に加入する',
          description: '家族全体をカバーする手厚い保険',
          consequences: [
            { type: 'insurance', value: 2, description: '家族向け保険を複数獲得' },
            { type: 'story_flag', value: 'hasFamily', description: '家族思いの特性が強化' }
          ],
          personalityAlignment: 'defensive'
        },
        {
          id: 'balanced_approach',
          text: 'バランス型の保険を選ぶ',
          description: '必要最小限の保険で効率的にリスクをカバー',
          consequences: [
            { type: 'insurance', value: 1, description: '効率的な保険を獲得' },
            { type: 'wisdom', value: 5, description: '賢明な判断力が向上' }
          ],
          personalityAlignment: 'strategic'
        }
      ],
      consequences: [],
      emotionalImpact: {
        primary: 'determination',
        intensity: 8,
        duration: 'permanent'
      },
      stageRelevance: ['middle'],
      rarity: 'common'
    })

    this.narrativeEvents.set('middle_career_crisis', {
      id: 'middle_career_crisis',
      type: 'career_development',
      title: 'キャリアの危機',
      description: '予期しない困難があなたのキャリアに影響を与えています',
      storyText: '会社の業績悪化により、あなたのポジションが危険にさらされています。これまで築いてきたキャリアが揺らぐ中、どのような選択をするかが今後の人生を大きく左右するでしょう。',
      choices: [
        {
          id: 'fight_for_position',
          text: '現在のポジションを守り抜く',
          description: '困難な状況でも現職にとどまり、状況改善を図る',
          consequences: [
            { type: 'vitality', value: -8, description: 'ストレスが大幅に増加' },
            { type: 'story_flag', value: 'hasOvercomeTrauma', description: '困難を乗り越えた経験' }
          ],
          personalityAlignment: 'aggressive'
        },
        {
          id: 'seek_new_opportunity',
          text: '新しい機会を求めて転職する',
          description: '安定を捨てて新たな挑戦に向かう',
          consequences: [
            { type: 'vitality', value: -3, description: '一時的な不安定さ' },
            { type: 'story_flag', value: 'isAdventurous', description: '変化を恐れない強さ' }
          ],
          personalityAlignment: 'balanced'
        }
      ],
      consequences: [],
      emotionalImpact: {
        primary: 'anxiety',
        intensity: 9,
        duration: 'lasting'
      },
      stageRelevance: ['middle'],
      rarity: 'rare'
    })

    // 充実期のイベント
    this.narrativeEvents.set('fulfillment_legacy_decision', {
      id: 'fulfillment_legacy_decision',
      type: 'legacy_moment',
      title: '遺産と影響',
      description: '人生の集大成として、何を後世に残すかを考える時期です',
      storyText: '人生の充実期を迎えたあなたは、これまでの経験と知恵をどのように次世代に伝えるかを考えています。あなたの選択が、多くの人々の人生に影響を与える可能性があります。',
      choices: [
        {
          id: 'mentor_young_people',
          text: '若い世代の指導に専念する',
          description: '経験と知恵を若者に伝える',
          consequences: [
            { type: 'wisdom', value: 10, description: '教える過程で自身の知恵も深まる' },
            { type: 'story_flag', value: 'isWise', description: '賢者としての評価を確立' }
          ],
          personalityAlignment: 'strategic'
        },
        {
          id: 'philanthropic_work',
          text: '社会貢献活動に取り組む',
          description: '困っている人々への支援活動',
          consequences: [
            { type: 'vitality', value: 5, description: '人助けによる充実感' },
            { type: 'story_flag', value: 'isGenerous', description: '寛大な人格が評価される' }
          ],
          personalityAlignment: 'balanced'
        }
      ],
      consequences: [],
      emotionalImpact: {
        primary: 'pride',
        intensity: 8,
        duration: 'permanent'
      },
      stageRelevance: ['fulfillment'],
      rarity: 'rare'
    })
  }

  /**
   * ゲーム状態に基づいて物語イベントを生成
   */
  generateNarrativeEvent(game: Game): NarrativeEvent | null {
    const availableEvents = this.getAvailableEvents(game)
    
    if (availableEvents.length === 0) {
      return null
    }

    // 重み付きランダム選択
    const event = this.selectWeightedRandomEvent(availableEvents)
    
    // イベント履歴に追加
    this.eventHistory.push(event)
    
    return event
  }

  /**
   * 利用可能なイベントを取得
   */
  private getAvailableEvents(game: Game): NarrativeEvent[] {
    const events: NarrativeEvent[] = []

    for (const event of this.narrativeEvents.values()) {
      if (this.isEventAvailable(event, game)) {
        events.push(event)
      }
    }

    return events
  }

  /**
   * イベントが利用可能かチェック
   */
  private isEventAvailable(event: NarrativeEvent, game: Game): boolean {
    // ステージの適合性をチェック
    if (!event.stageRelevance.includes(game.stage)) {
      return false
    }

    // 既に発生したイベントは除外（ユニークイベントの場合）
    if (event.rarity === 'unique' && 
        this.eventHistory.some(e => e.id === event.id)) {
      return false
    }

    // 特定の条件をチェック
    return this.checkEventConditions(event, game)
  }

  /**
   * イベント条件をチェック
   */
  private checkEventConditions(event: NarrativeEvent, game: Game): boolean {
    switch (event.id) {
      case 'youth_insurance_decision':
        return game.turn >= 3 && game.getActiveInsurances().length === 0
      
      case 'middle_family_responsibility':
        return game.turn >= 8 && !this.activeStoryFlags.hasFamily
      
      case 'middle_career_crisis':
        return game.turn >= 12 && game.stats.failedChallenges >= 2
      
      case 'fulfillment_legacy_decision':
        return game.turn >= 18 && (this.activeStoryFlags.isWise || this.activeStoryFlags.isSuccessful)
      
      default:
        return true
    }
  }

  /**
   * 重み付きランダムでイベントを選択
   */
  private selectWeightedRandomEvent(events: NarrativeEvent[]): NarrativeEvent {
    const weights = events.map(e => {
      switch (e.rarity) {
        case 'common': return 10
        case 'rare': return 3
        case 'unique': return 1
        default: return 5
      }
    })

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < events.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return events[i]
      }
    }

    return events[events.length - 1]
  }

  /**
   * 選択肢を実行
   */
  executeChoice(choiceId: string, game: Game): {
    consequences: NarrativeConsequence[]
    storyUpdate: string
    personalityChange: Partial<PersonalityProfile>
  } {
    const choice = this.findChoiceById(choiceId)
    if (!choice) {
      throw new Error(`Choice not found: ${choiceId}`)
    }

    // 結果を適用
    const appliedConsequences = this.applyConsequences(choice.consequences, game)
    
    // パーソナリティの更新
    const personalityChange = this.updatePersonality(choice)
    
    // ストーリー更新メッセージ
    const storyUpdate = this.generateStoryUpdate(choice, appliedConsequences)

    return {
      consequences: appliedConsequences,
      storyUpdate,
      personalityChange
    }
  }

  /**
   * 選択肢をIDで検索
   */
  private findChoiceById(choiceId: string): NarrativeChoice | null {
    for (const event of this.narrativeEvents.values()) {
      if (event.choices) {
        const choice = event.choices.find(c => c.id === choiceId)
        if (choice) return choice
      }
    }
    return null
  }

  /**
   * 結果を適用
   */
  private applyConsequences(consequences: NarrativeConsequence[], game: Game): NarrativeConsequence[] {
    const applied: NarrativeConsequence[] = []

    consequences.forEach(consequence => {
      switch (consequence.type) {
        case 'vitality':
          if (typeof consequence.value === 'number') {
            if (consequence.value > 0) {
              game.heal(consequence.value)
            } else {
              game.applyDamage(-consequence.value)
            }
            applied.push(consequence)
          }
          break

        case 'insurance':
          // 実際の実装では保険カードを追加
          applied.push(consequence)
          break

        case 'story_flag':
          if (typeof consequence.value === 'string') {
            (this.activeStoryFlags as any)[consequence.value] = true
            applied.push(consequence)
          }
          break

        case 'wisdom':
          if (typeof consequence.value === 'number') {
            this.lifeAspects.wisdom = Math.min(100, this.lifeAspects.wisdom + consequence.value)
            applied.push(consequence)
          }
          break

        default:
          applied.push(consequence)
      }
    })

    return applied
  }

  /**
   * パーソナリティを更新
   */
  private updatePersonality(choice: NarrativeChoice): Partial<PersonalityProfile> {
    const changes: Partial<PersonalityProfile> = {}

    switch (choice.personalityAlignment) {
      case 'aggressive':
        this.personalityProfile.riskTolerance = Math.min(100, this.personalityProfile.riskTolerance + 5)
        this.personalityProfile.ambition = Math.min(100, this.personalityProfile.ambition + 3)
        changes.riskTolerance = 5
        changes.ambition = 3
        break

      case 'defensive':
        this.personalityProfile.stability = Math.min(100, this.personalityProfile.stability + 5)
        this.personalityProfile.riskTolerance = Math.max(0, this.personalityProfile.riskTolerance - 2)
        changes.stability = 5
        changes.riskTolerance = -2
        break

      case 'balanced':
        this.personalityProfile.empathy = Math.min(100, this.personalityProfile.empathy + 3)
        this.personalityProfile.creativity = Math.min(100, this.personalityProfile.creativity + 2)
        changes.empathy = 3
        changes.creativity = 2
        break

      case 'strategic':
        this.personalityProfile.ambition = Math.min(100, this.personalityProfile.ambition + 4)
        this.personalityProfile.stability = Math.min(100, this.personalityProfile.stability + 3)
        changes.ambition = 4
        changes.stability = 3
        break
    }

    return changes
  }

  /**
   * ストーリー更新メッセージを生成
   */
  private generateStoryUpdate(choice: NarrativeChoice, consequences: NarrativeConsequence[]): string {
    let message = `あなたは「${choice.text}」を選択しました。\n\n`
    
    consequences.forEach(consequence => {
      message += `• ${consequence.description}\n`
    })

    return message.trim()
  }

  /**
   * 現在のストーリー状況を取得
   */
  getCurrentStoryStatus(): {
    flags: StoryFlags
    lifeAspects: LifeAspects
    personality: PersonalityProfile
    eventHistory: NarrativeEvent[]
    storyProgression: number
  } {
    return {
      flags: { ...this.activeStoryFlags },
      lifeAspects: { ...this.lifeAspects },
      personality: { ...this.personalityProfile },
      eventHistory: [...this.eventHistory],
      storyProgression: this.calculateStoryProgression()
    }
  }

  /**
   * ストーリーの進行度を計算
   */
  private calculateStoryProgression(): number {
    const totalFlags = Object.keys(this.activeStoryFlags).length
    const activeFlags = Object.values(this.activeStoryFlags).filter(Boolean).length
    
    const eventProgression = Math.min(100, (this.eventHistory.length / 10) * 100)
    const flagProgression = (activeFlags / totalFlags) * 100
    
    return Math.round((eventProgression + flagProgression) / 2)
  }

  /**
   * パーソナライズされた物語サマリーを生成
   */
  generatePersonalizedSummary(game: Game): string {
    const summary: string[] = []

    // 基本的な人生の歩み
    summary.push(`あなたは${this.getPersonalityDescription()}として人生を歩んできました。`)

    // 主要な決断について
    if (this.activeStoryFlags.isCautious) {
      summary.push('慎重な判断を重ね、安定した基盤を築きました。')
    }
    if (this.activeStoryFlags.isAdventurous) {
      summary.push('リスクを恐れず、新しい挑戦を続けました。')
    }
    if (this.activeStoryFlags.hasFamily) {
      summary.push('家族を大切にし、責任感ある選択をしてきました。')
    }
    if (this.activeStoryFlags.hasOvercomeTrauma) {
      summary.push('困難な時期を乗り越え、強い精神力を身につけました。')
    }

    // 現在の状況
    const vitalityStatus = game.vitality >= 60 ? '充実した' : 
                          game.vitality >= 30 ? '安定した' : '困難な'
    summary.push(`現在、あなたは${vitalityStatus}状況にあります。`)

    return summary.join(' ')
  }

  /**
   * パーソナリティの説明を取得
   */
  private getPersonalityDescription(): string {
    const { riskTolerance, ambition, empathy, stability } = this.personalityProfile

    if (riskTolerance > 70) return '冒険を愛する革新者'
    if (stability > 70) return '安定を重視する実用主義者'
    if (ambition > 70) return '目標達成に燃える挑戦者'
    if (empathy > 70) return '他者を思いやる協調者'
    
    return 'バランスの取れた現実主義者'
  }
}

/**
 * パーソナリティプロファイル
 */
interface PersonalityProfile {
  riskTolerance: number  // リスク許容度 (0-100)
  socialNeed: number     // 社交性の必要度 (0-100)
  ambition: number       // 野心・向上心 (0-100)
  empathy: number        // 共感性 (0-100)
  creativity: number     // 創造性 (0-100)
  stability: number      // 安定性への欲求 (0-100)
}