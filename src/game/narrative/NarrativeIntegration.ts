/**
 * 物語統合管理システム - ゲームプレイと物語の統合的管理
 * 
 * このシステムは以下の機能を提供します：
 * - ゲーム進行と物語イベントの同期
 * - プレイヤーの決断による物語分岐
 * - インタラクティブな人生シミュレーション
 * - エンディングシステムとの連携
 */

import type { Game } from '../../domain/entities/Game'
import type { Card } from '../../domain/entities/Card'
import { type NarrativeChoice, type NarrativeEvent, NarrativeSystem } from './NarrativeSystem'
import { type EndingInfo, EndingSystem } from './EndingSystem'
import type { VictoryResult } from '../victory/VictoryConditions'
import type { PlayStyleAnalysis } from '../victory/VictoryEngine'

/**
 * 統合イベント情報
 */
export interface IntegratedEvent {
  gameEvent: 'turn_start' | 'turn_end' | 'challenge_completed' | 'insurance_added' | 'stage_changed'
  narrativeEvent?: NarrativeEvent
  contextualInfo: string
  playerImpact: PlayerImpact
}

/**
 * プレイヤーへの影響
 */
export interface PlayerImpact {
  mechanicalChanges: MechanicalChange[]
  storyChanges: StoryChange[]
  emotionalResonance: EmotionalResonance
}

/**
 * メカニカルな変更
 */
export interface MechanicalChange {
  type: 'vitality' | 'insurance' | 'card' | 'achievement'
  value: number | string
  description: string
}

/**
 * ストーリーの変更
 */
export interface StoryChange {
  aspect: 'personality' | 'relationships' | 'reputation' | 'life_path'
  change: string
  significance: 'minor' | 'moderate' | 'major' | 'pivotal'
}

/**
 * 感情的共鳴
 */
export interface EmotionalResonance {
  primaryEmotion: string
  intensity: number
  personalConnection: string
  futureImplications: string[]
}

/**
 * 人生シミュレーション状態
 */
export interface LifeSimulationState {
  currentNarrative: string
  keyDecisionsMade: KeyDecision[]
  lifeTrajectory: LifeTrajectoryPoint[]
  personalGrowth: PersonalGrowthMetric[]
  relationshipNetwork: Relationship[]
}

/**
 * 重要な決断
 */
export interface KeyDecision {
  turnNumber: number
  stageAge: string
  decisionType: 'career' | 'family' | 'health' | 'financial' | 'personal'
  description: string
  chosenPath: string
  alternativePaths: string[]
  consequences: string[]
  regretLevel: number // 0-10
}

/**
 * 人生軌道のポイント
 */
export interface LifeTrajectoryPoint {
  age: string
  majorEvent: string
  lifeAspectScores: Record<string, number>
  overallSatisfaction: number
  growthAreas: string[]
}

/**
 * 個人成長指標
 */
export interface PersonalGrowthMetric {
  category: 'wisdom' | 'resilience' | 'empathy' | 'leadership' | 'creativity'
  currentLevel: number
  growthRate: number
  milestonesAchieved: string[]
}

/**
 * 人間関係
 */
export interface Relationship {
  type: 'family' | 'friend' | 'colleague' | 'mentor' | 'community'
  quality: number // 0-100
  influence: 'positive' | 'neutral' | 'negative'
  description: string
}

/**
 * 物語統合管理システム
 */
export class NarrativeIntegration {
  private readonly narrativeSystem: NarrativeSystem
  private readonly endingSystem: EndingSystem
  private readonly lifeSimulationState: LifeSimulationState
  private readonly activeIntegratedEvents: IntegratedEvent[]

  constructor() {
    this.narrativeSystem = new NarrativeSystem()
    this.endingSystem = new EndingSystem()
    this.lifeSimulationState = this.initializeLifeSimulation()
    this.activeIntegratedEvents = []
  }

  /**
   * 人生シミュレーション状態を初期化
   */
  private initializeLifeSimulation(): LifeSimulationState {
    return {
      currentNarrative: '若い可能性に満ちたあなたの人生が始まろうとしています。',
      keyDecisionsMade: [],
      lifeTrajectory: [{
        age: '青年期',
        majorEvent: '人生の始まり',
        lifeAspectScores: {
          health: 90,
          relationships: 60,
          career: 40,
          wisdom: 30,
          happiness: 70
        },
        overallSatisfaction: 60,
        growthAreas: ['キャリア形成', '人間関係の構築', '専門知識の習得']
      }],
      personalGrowth: [
        { category: 'wisdom', currentLevel: 30, growthRate: 0, milestonesAchieved: [] },
        { category: 'resilience', currentLevel: 50, growthRate: 0, milestonesAchieved: [] },
        { category: 'empathy', currentLevel: 60, growthRate: 0, milestonesAchieved: [] },
        { category: 'leadership', currentLevel: 20, growthRate: 0, milestonesAchieved: [] },
        { category: 'creativity', currentLevel: 40, growthRate: 0, milestonesAchieved: [] }
      ],
      relationshipNetwork: [
        { type: 'family', quality: 80, influence: 'positive', description: '温かく支えてくれる家族' },
        { type: 'friend', quality: 70, influence: 'positive', description: '数人の親しい友人' }
      ]
    }
  }

  /**
   * ゲームイベントを処理し、物語と統合する
   */
  processGameEvent(
    eventType: IntegratedEvent['gameEvent'], 
    game: Game, 
    additionalData?: any
  ): IntegratedEvent | null {
    const narrativeEvent = this.tryGenerateNarrativeEvent(eventType, game)
    
    if (!narrativeEvent) {
      return null
    }

    const contextualInfo = this.generateContextualInfo(eventType, game, narrativeEvent)
    const playerImpact = this.calculatePlayerImpact(narrativeEvent, game)

    const integratedEvent: IntegratedEvent = {
      gameEvent: eventType,
      narrativeEvent,
      contextualInfo,
      playerImpact
    }

    this.activeIntegratedEvents.push(integratedEvent)
    this.updateLifeSimulation(integratedEvent, game)

    return integratedEvent
  }

  /**
   * 物語イベントの生成を試行
   */
  private tryGenerateNarrativeEvent(
    eventType: IntegratedEvent['gameEvent'], 
    game: Game
  ): NarrativeEvent | null {
    // 特定のゲームイベントでのみ物語イベントを生成
    const triggerEvents = ['turn_start', 'challenge_completed', 'stage_changed']
    
    if (!triggerEvents.includes(eventType)) {
      return null
    }

    // 確率的に物語イベントを生成（30%の確率）
    if (Math.random() > 0.3) {
      return null
    }

    return this.narrativeSystem.generateNarrativeEvent(game)
  }

  /**
   * 文脈情報を生成
   */
  private generateContextualInfo(
    eventType: IntegratedEvent['gameEvent'],
    game: Game,
    narrativeEvent: NarrativeEvent
  ): string {
    const context = []

    // ゲーム状況の説明
    context.push(`現在のターン: ${game.turn}`)
    context.push(`人生ステージ: ${this.getStageDescription(game.stage)}`)
    context.push(`活力レベル: ${this.getVitalityDescription(game.vitality)}`)

    // 物語的文脈
    if (narrativeEvent) {
      context.push(`物語の展開: ${narrativeEvent.title}`)
    }

    return context.join(' | ')
  }

  /**
   * プレイヤーへの影響を計算
   */
  private calculatePlayerImpact(narrativeEvent: NarrativeEvent, game: Game): PlayerImpact {
    return {
      mechanicalChanges: [],
      storyChanges: [{
        aspect: 'life_path',
        change: `${narrativeEvent.title}という人生の節目を迎えました`,
        significance: 'moderate'
      }],
      emotionalResonance: {
        primaryEmotion: narrativeEvent.emotionalImpact.primary,
        intensity: narrativeEvent.emotionalImpact.intensity,
        personalConnection: this.generatePersonalConnection(narrativeEvent, game),
        futureImplications: this.generateFutureImplications(narrativeEvent)
      }
    }
  }

  /**
   * 個人的なつながりを生成
   */
  private generatePersonalConnection(narrativeEvent: NarrativeEvent, game: Game): string {
    const connections = {
      'youth_first_job': 'あなたの社会人としての第一歩が、将来のキャリアの基盤となります',
      'youth_insurance_decision': '若い時の保険選択が、リスク管理に対する考え方を形成します',
      'middle_family_responsibility': '家族への愛と責任感が、あなたの行動指針を決定します',
      'middle_career_crisis': '困難な時期の選択が、あなたの真の強さを試します',
      'fulfillment_legacy_decision': 'これまでの経験が、後世への贈り物となります'
    }

    return connections[narrativeEvent.id as keyof typeof connections] || 
           'この経験があなたの人生観に新たな視点をもたらします'
  }

  /**
   * 将来への示唆を生成
   */
  private generateFutureImplications(narrativeEvent: NarrativeEvent): string[] {
    const implications: string[] = []

    switch (narrativeEvent.type) {
      case 'career_development':
        implications.push('キャリアの方向性に影響を与える')
        implications.push('将来の収入や安定性に関わる')
        break
      case 'insurance_decision':
        implications.push('リスク管理戦略が形成される')
        implications.push('将来の安心感に影響する')
        break
      case 'relationship_event':
        implications.push('人間関係の質が変化する')
        implications.push('社会的サポートに影響する')
        break
      case 'legacy_moment':
        implications.push('人生の意味と価値が明確化される')
        implications.push('後世への影響力が決まる')
        break
      default:
        implications.push('人生観に新たな側面が加わる')
    }

    return implications
  }

  /**
   * 人生シミュレーション状態を更新
   */
  private updateLifeSimulation(event: IntegratedEvent, game: Game): void {
    // 現在のナラティブを更新
    if (event.narrativeEvent) {
      this.lifeSimulationState.currentNarrative = event.narrativeEvent.storyText
    }

    // 人生軌道の更新
    const currentTrajectory: LifeTrajectoryPoint = {
      age: this.getStageDescription(game.stage),
      majorEvent: event.narrativeEvent?.title || '日常の積み重ね',
      lifeAspectScores: this.calculateCurrentLifeAspects(game),
      overallSatisfaction: this.calculateOverallSatisfaction(game),
      growthAreas: this.identifyGrowthAreas(game)
    }

    this.lifeSimulationState.lifeTrajectory.push(currentTrajectory)

    // 個人成長の更新
    this.updatePersonalGrowth(event, game)

    // 人間関係の更新
    this.updateRelationshipNetwork(event)
  }

  /**
   * 現在の人生側面スコアを計算
   */
  private calculateCurrentLifeAspects(game: Game): Record<string, number> {
    return {
      health: Math.min(100, game.vitality * 1.2),
      relationships: 50 + (game.stats.successfulChallenges * 2),
      career: 30 + (game.turn * 2) + (game.stats.cardsAcquired * 1.5),
      wisdom: 20 + (game.stats.totalChallenges * 3),
      happiness: 40 + (game.vitality * 0.5) + (game.stats.successfulChallenges * 2)
    }
  }

  /**
   * 全体的満足度を計算
   */
  private calculateOverallSatisfaction(game: Game): number {
    const aspects = this.calculateCurrentLifeAspects(game)
    const average = Object.values(aspects).reduce((sum, val) => sum + val, 0) / Object.keys(aspects).length
    return Math.min(100, Math.round(average))
  }

  /**
   * 成長領域を特定
   */
  private identifyGrowthAreas(game: Game): string[] {
    const areas: string[] = []
    const aspects = this.calculateCurrentLifeAspects(game)

    if (aspects.health < 60) areas.push('健康管理')
    if (aspects.relationships < 60) areas.push('人間関係の構築')
    if (aspects.career < 60) areas.push('キャリア開発')
    if (aspects.wisdom < 60) areas.push('知識と経験の蓄積')
    if (aspects.happiness < 60) areas.push('幸福感の向上')

    return areas.length > 0 ? areas : ['現状維持と更なる向上']
  }

  /**
   * 個人成長を更新
   */
  private updatePersonalGrowth(event: IntegratedEvent, game: Game): void {
    if (!event.narrativeEvent) return

    this.lifeSimulationState.personalGrowth.forEach(growth => {
      switch (growth.category) {
        case 'wisdom':
          if (event.narrativeEvent!.type === 'life_milestone') {
            growth.currentLevel = Math.min(100, growth.currentLevel + 5)
            growth.growthRate += 1
          }
          break
        case 'resilience':
          if (game.stats.failedChallenges > 0) {
            growth.currentLevel = Math.min(100, growth.currentLevel + 3)
            growth.growthRate += 0.5
          }
          break
        case 'empathy':
          if (event.narrativeEvent!.type === 'relationship_event') {
            growth.currentLevel = Math.min(100, growth.currentLevel + 4)
            growth.growthRate += 0.8
          }
          break
        case 'leadership':
          if (event.narrativeEvent!.type === 'career_development') {
            growth.currentLevel = Math.min(100, growth.currentLevel + 3)
            growth.growthRate += 0.6
          }
          break
        case 'creativity':
          if (game.stats.cardsAcquired > 10) {
            growth.currentLevel = Math.min(100, growth.currentLevel + 2)
            growth.growthRate += 0.3
          }
          break
      }
    })
  }

  /**
   * 人間関係ネットワークを更新
   */
  private updateRelationshipNetwork(event: IntegratedEvent): void {
    if (!event.narrativeEvent) return

    if (event.narrativeEvent.type === 'relationship_event') {
      // 家族関係の更新
      const familyRelation = this.lifeSimulationState.relationshipNetwork.find(r => r.type === 'family')
      if (familyRelation) {
        familyRelation.quality = Math.min(100, familyRelation.quality + 5)
      }
    }
  }

  /**
   * 物語選択肢を実行
   */
  executeNarrativeChoice(choiceId: string, game: Game): {
    result: any
    updatedSimulation: LifeSimulationState
    keyDecision: KeyDecision
  } {
    const result = this.narrativeSystem.executeChoice(choiceId, game)
    
    // 重要な決断として記録
    const keyDecision: KeyDecision = {
      turnNumber: game.turn,
      stageAge: this.getStageDescription(game.stage),
      decisionType: this.determineDecisionType(choiceId),
      description: `物語上の重要な選択を行いました`,
      chosenPath: choiceId,
      alternativePaths: [], // 実装では他の選択肢も記録
      consequences: result.consequences.map(c => c.description),
      regretLevel: 0 // 初期値
    }

    this.lifeSimulationState.keyDecisionsMade.push(keyDecision)

    return {
      result,
      updatedSimulation: this.lifeSimulationState,
      keyDecision
    }
  }

  /**
   * 統合エンディングを生成
   */
  generateIntegratedEnding(
    game: Game,
    victories: VictoryResult[],
    playStyle: PlayStyleAnalysis
  ): {
    endingInfo: EndingInfo
    lifeSimulationSummary: string
    personalizedReflection: string
  } {
    const endingInfo = this.endingSystem.determineEnding(game, victories, playStyle)
    const lifeSimulationSummary = this.generateLifeSimulationSummary()
    const personalizedReflection = this.generatePersonalizedReflection(game)

    return {
      endingInfo,
      lifeSimulationSummary,
      personalizedReflection
    }
  }

  /**
   * 人生シミュレーションのサマリーを生成
   */
  private generateLifeSimulationSummary(): string {
    const decisions = this.lifeSimulationState.keyDecisionsMade
    const growth = this.lifeSimulationState.personalGrowth
    const relationships = this.lifeSimulationState.relationshipNetwork

    const summary = []

    // 主要な決断のサマリー
    if (decisions.length > 0) {
      summary.push(`人生で${decisions.length}の重要な決断を下しました。`)
      
      const highImpactDecisions = decisions.filter(d => d.consequences.length > 2)
      if (highImpactDecisions.length > 0) {
        summary.push(`特に${highImpactDecisions.length}の決断が人生に大きな影響を与えました。`)
      }
    }

    // 成長のサマリー
    const highGrowthAreas = growth.filter(g => g.currentLevel > 70)
    if (highGrowthAreas.length > 0) {
      const areas = highGrowthAreas.map(g => this.translateGrowthCategory(g.category)).join('、')
      summary.push(`${areas}の分野で特に成長を遂げました。`)
    }

    // 人間関係のサマリー
    const strongRelationships = relationships.filter(r => r.quality > 70)
    if (strongRelationships.length > 0) {
      summary.push(`${strongRelationships.length}の良好な人間関係を築きました。`)
    }

    return summary.join(' ')
  }

  /**
   * パーソナライズされた振り返りを生成
   */
  private generatePersonalizedReflection(game: Game): string {
    const narrativeStatus = this.narrativeSystem.getCurrentStoryStatus()
    const personalizedSummary = this.narrativeSystem.generatePersonalizedSummary(game)
    
    const reflection = [
      personalizedSummary,
      `あなたの人生は${narrativeStatus.storyProgression}%の物語的完成度に達しました。`,
      `この経験を通じて、あなた自身の価値観や生き方について新たな発見があったことでしょう。`
    ]

    return reflection.join(' ')
  }

  /**
   * 現在の状態を取得
   */
  getCurrentState(): {
    narrativeStatus: any
    lifeSimulation: LifeSimulationState
    activeEvents: IntegratedEvent[]
  } {
    return {
      narrativeStatus: this.narrativeSystem.getCurrentStoryStatus(),
      lifeSimulation: this.lifeSimulationState,
      activeEvents: [...this.activeIntegratedEvents]
    }
  }

  // ヘルパーメソッド
  private getStageDescription(stage: string): string {
    const descriptions = {
      'youth': '青年期（20-30代）',
      'middle': '中年期（40-50代）',
      'fulfillment': '充実期（60代以降）'
    }
    return descriptions[stage as keyof typeof descriptions] || '不明な時期'
  }

  private getVitalityDescription(vitality: number): string {
    if (vitality >= 80) return '非常に健康'
    if (vitality >= 60) return '健康'
    if (vitality >= 40) return '普通'
    if (vitality >= 20) return '不調'
    return '深刻な状態'
  }

  private determineDecisionType(choiceId: string): KeyDecision['decisionType'] {
    if (choiceId.includes('job') || choiceId.includes('career')) return 'career'
    if (choiceId.includes('family') || choiceId.includes('relationship')) return 'family'
    if (choiceId.includes('insurance') || choiceId.includes('financial')) return 'financial'
    if (choiceId.includes('health')) return 'health'
    return 'personal'
  }

  private translateGrowthCategory(category: string): string {
    const translations = {
      'wisdom': '知恵',
      'resilience': '回復力',
      'empathy': '共感力',
      'leadership': 'リーダーシップ',
      'creativity': '創造性'
    }
    return translations[category as keyof typeof translations] || category
  }
}