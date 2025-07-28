/**
 * CUIプレイテスト専用の軽量GameController
 * 正しいゲームルールに従って動作する簡易版
 */
import { Game } from '../domain/entities/Game'
import { Card } from '../domain/entities/Card'
import { CardFactory } from '../domain/services/CardFactory'
import type { GameConfig } from '../domain/types/game.types'

export interface SimpleGameRenderer {
  logTurn(turnNumber: number, challenges: Card[], selectedChallenge: Card, handCards: Card[], result: any, gameState: any): void
}

// Strategy Pattern: チャレンジ選択戦略
interface ChallengeSelectionStrategy {
  selectChallenge(challenges: Card[], game: Game): Card
}

class InteractiveChallengeStrategy implements ChallengeSelectionStrategy {
  async selectChallenge(challenges: Card[], game: Game): Promise<Card> {
    console.log('\n🎯 チャレンジを選択してください:')
    challenges.forEach((challenge, index) => {
      const requiredPower = this.getRequiredPower(challenge, game)
      console.log(`${index + 1}. ${challenge.name} (必要パワー: ${requiredPower})`)
    })

    // CUI環境では入力を待てないため、ランダム選択にフォールバック
    const randomIndex = Math.floor(Math.random() * challenges.length)
    const selected = challenges[randomIndex]
    console.log(`⭐ 選択: ${selected.name}`)
    return selected
  }

  private getRequiredPower(challenge: Card, game: Game): number {
    const basePower = challenge.power || 2
    const adjustment = PlaytestGameController.GAME_CONSTANTS.STAGE_POWER_ADJUSTMENTS[game.stage] || 0
    return basePower + adjustment
  }
}

class AIChallengeStrategy implements ChallengeSelectionStrategy {
  selectChallenge(challenges: Card[], game: Game): Card {
    // 最も必要パワーが低いものを選択（成功率重視）
    return challenges.reduce((easiest, current) => 
      this.getRequiredPower(current, game) < this.getRequiredPower(easiest, game) ? current : easiest
    )
  }

  private getRequiredPower(challenge: Card, game: Game): number {
    const basePower = challenge.power || 2
    const adjustment = PlaytestGameController.GAME_CONSTANTS.STAGE_POWER_ADJUSTMENTS[game.stage] || 0
    return basePower + adjustment
  }
}

// チャレンジカードの使用状態を管理する型
type ChallengeCardWithStatus = Card & { isUsed?: boolean }

/**
 * パフォーマンス統計
 */
interface PerformanceStats {
  averageDecisionTime: number
  totalDecisions: number
  cacheHitRate: number
  memoryUsage: number
}

export class PlaytestGameController {
  // ゲーム設定定数
  private static readonly GAME_CONSTANTS = {
    CHALLENGES_PER_TURN: 3,
    CHALLENGE_COUNT: 20,
    LIFE_CARD_POOL_SIZE: 30,
    CARD_RATIOS: {
      POSITIVE_RATIO: 0.6,      // 60%: ポジティブカード
      NEUTRAL_RATIO: 0.2,       // 20%: ニュートラルカード
      NEGATIVE_RATIO: 0.2       // 20%: ネガティブカード
    },
    STAGE_POWER_ADJUSTMENTS: {
      youth: 0,
      middle: 1,
      fulfillment: 2
    } as const,
    INSURANCE_BURDEN_THRESHOLD: 3,  // 3枚ごとに負担発生
    VITALITY_RECOVERY_RATE: 0.5,    // 余剰パワーの半分回復
    INSURANCE_DAMAGE_REDUCTION: 0.7, // 保険で最大70%ダメージ軽減
    MIN_DAMAGE_RETENTION: 0.3       // 最低30%のダメージは残る
  } as const

  private game: Game
  private challengeCards: ChallengeCardWithStatus[] = []
  private currentChallenges: Card[] = []
  private interactiveStrategy: InteractiveChallengeStrategy
  private aiStrategy: AIChallengeStrategy
  
  // パフォーマンス統計
  private performanceStats: PerformanceStats = {
    averageDecisionTime: 0,
    totalDecisions: 0,
    cacheHitRate: 0,
    memoryUsage: 0
  }
  private decisionTimes: number[] = []

  constructor(config?: GameConfig) {
    this.game = new Game(config)
    this.interactiveStrategy = new InteractiveChallengeStrategy()
    this.aiStrategy = new AIChallengeStrategy()
    this.initializeGame()
  }

  private initializeGame(): void {
    // ゲーム開始
    this.game.start()
    
    // チャレンジカードを生成
    this.challengeCards = this.createChallengeCards()
    
    // ログ出力
    console.log(`🎮 ゲーム初期化完了`)
    console.log(`📊 初期活力: ${this.game.vitality}`)
    console.log(`🎯 初期ステージ: ${this.game.stage}`)
  }

  /**
   * 1ターンをプレイ
   */
  async playTurn(renderer: SimpleGameRenderer, interactiveMode: boolean = false): Promise<boolean> {
    if (this.game.isGameOver() || this.game.status !== 'in_progress') {
      return false
    }

    // 1. チャレンジ選択フェーズ
    this.currentChallenges = this.drawChallenges()
    
    // チャレンジが尽きた場合はゲーム終了
    if (this.currentChallenges.length === 0) {
      this.game.status = 'victory'
      return false
    }

    // チャレンジ選択（戦略パターン使用）
    const strategy = interactiveMode ? this.interactiveStrategy : this.aiStrategy
    const selectedChallenge = await strategy.selectChallenge(this.currentChallenges, this.game)

    // 選択されたチャレンジを使用済みにマーク
    const originalChallenge = this.challengeCards.find(c => c.id === selectedChallenge.id)
    if (originalChallenge) {
      originalChallenge.isUsed = true
    }

    // 2. 挑戦フェーズ - 手札ドロー
    const requiredPower = this.getRequiredPower(selectedChallenge)
    const handCards = this.drawHandCards(requiredPower)

    // 3. パワー計算と成功判定
    const totalPower = this.calculateTotalPower(handCards)
    const success = totalPower >= requiredPower

    // 4. 結果処理
    const result = {
      success,
      totalPower,
      requiredPower,
      vitalityChange: this.calculateVitalityChange(success, totalPower, requiredPower)
    }

    // 活力更新
    this.updateVitality(result.vitalityChange)

    // 成功時は保険選択（定期/終身の戦略的選択）
    if (success) {
      await this.selectInsuranceType(selectedChallenge, interactiveMode)
    }

    // ターン終了処理
    this.game.nextTurn()

    // ログ記録
    renderer.logTurn(
      this.game.turn - 1, // nextTurn()後なので-1
      this.currentChallenges,
      selectedChallenge,
      handCards,
      result,
      {
        vitality: this.game.vitality,
        stage: this.game.stage,
        insuranceCards: this.game.insuranceCards
      }
    )

    return !this.game.isGameOver()
  }

  /**
   * チャレンジカードをドロー
   */
  private drawChallenges(): Card[] {
    const available = this.challengeCards.filter(card => !card.isUsed)
    if (available.length === 0) return []

    const count = Math.min(PlaytestGameController.GAME_CONSTANTS.CHALLENGES_PER_TURN, available.length)
    const challenges: Card[] = []

    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * available.length)
      const card = available.splice(randomIndex, 1)[0]
      challenges.push(card)
    }

    return challenges
  }


  /**
   * ステージに応じた必要パワーを取得
   */
  private getRequiredPower(challenge: Card): number {
    const basePower = challenge.power || 2
    
    // ステージによる調整（定数使用）
    const adjustment = PlaytestGameController.GAME_CONSTANTS.STAGE_POWER_ADJUSTMENTS[this.game.stage] || 0
    return basePower + adjustment
  }

  /**
   * 手札をドロー（必要パワー分）
   */
  private drawHandCards(requiredPower: number): Card[] {
    const handCards: Card[] = []
    const cardPool = this.createLifeCardPool()

    // 必要パワー分だけカードをドロー
    for (let i = 0; i < requiredPower; i++) {
      const randomIndex = Math.floor(Math.random() * cardPool.length)
      handCards.push(cardPool[randomIndex])
    }

    return handCards
  }

  /**
   * 固定初期デッキを作成（デザイン仕様通り18枚）
   */
  private createLifeCardPool(): Card[] {
    const cards: Card[] = []

    // ポジティブカード（8枚）- デザイン仕様通り
    for (let i = 0; i < 4; i++) cards.push(Card.createLifeCard('アルバイト収入', 1))
    for (let i = 0; i < 2; i++) cards.push(Card.createLifeCard('親の仕送り', 2))
    for (let i = 0; i < 2; i++) cards.push(Card.createLifeCard('友人の励まし', 1))

    // ネガティブカード（10枚）- デザイン仕様通り
    for (let i = 0; i < 3; i++) cards.push(Card.createLifeCard('浪費癖', -1)) // -1パワー
    for (let i = 0; i < 3; i++) cards.push(Card.createLifeCard('衝動買い', 0))
    for (let i = 0; i < 2; i++) cards.push(Card.createLifeCard('ギャンブル', -1)) // -1パワー
    cards.push(Card.createLifeCard('友人の結婚式', 0))
    cards.push(Card.createLifeCard('風邪をひく', 0))

    console.log(`🎴 固定初期デッキ作成: 合計${cards.length}枚（ポジ8+ネガ10）`)
    console.log(`📊 バランス: ポジティブ${8}枚(44%), ネガティブ${10}枚(56%)`)
    
    return cards
  }

  /**
   * 総パワーを計算（保険料負担込み）
   */
  private calculateTotalPower(cards: Card[]): number {
    const basePower = cards.reduce((total, card) => total + (card.power || 0), 0)
    const insuranceBonus = this.calculateInsuranceBonus()
    const insuranceBurden = this.calculateInsuranceBurden()
    
    const totalPower = basePower + insuranceBonus - insuranceBurden
    
    console.log(`💪 パワー計算: 基本${basePower} + 保険${insuranceBonus} - 負担${insuranceBurden} = 実質${totalPower}`)
    
    return totalPower
  }

  /**
   * 保険ボーナスを計算
   */
  private calculateInsuranceBonus(): number {
    return this.game.insuranceCards.reduce((total, card) => {
      return total + (card.power || 0)
    }, 0)
  }

  /**
   * 保険料負担を計算（3枚ごとに-1パワー）
   */
  private calculateInsuranceBurden(): number {
    const insuranceCount = this.game.insuranceCards.length
    const burden = Math.floor(insuranceCount / 3)
    
    if (burden > 0) {
      console.log(`⚖️ 保険料負担: ${insuranceCount}枚の保険により-${burden}パワー`)
    }
    
    return burden
  }

  /**
   * 活力変化を計算（保険効果込み）
   */
  private calculateVitalityChange(success: boolean, totalPower: number, requiredPower: number): number {
    let change: number
    
    if (success) {
      // 成功時は余剰パワーの半分を活力回復
      change = Math.floor((totalPower - requiredPower) / 2)
    } else {
      // 失敗時は不足分だけ活力減少
      change = -(requiredPower - totalPower)
      
      // 保険効果でダメージを軽減
      const damageReduction = this.calculateInsuranceCoverage(-change)
      change = Math.max(change + damageReduction, Math.floor(change * 0.3)) // 最低30%のダメージは残る
      
      console.log(`🛡️ 保険効果: ${damageReduction}ポイントのダメージを軽減`)
    }
    
    return change
  }

  /**
   * 保険効果による軽減量を計算
   */
  private calculateInsuranceCoverage(damage: number): number {
    const insuranceCards = this.game.insuranceCards
    if (insuranceCards.length === 0) return 0

    // 保険の合計保障力を計算
    const totalCoverage = insuranceCards.reduce((total, card) => {
      return total + (card.coverage || 0)
    }, 0)

    // ダメージの70%まで軽減可能（保険の保障力に基づく）
    const maxReduction = Math.floor(damage * 0.7)
    const actualReduction = Math.min(totalCoverage, maxReduction)
    
    return actualReduction
  }

  /**
   * 活力を更新
   */
  private updateVitality(change: number): void {
    if (change > 0) {
      this.game.heal(change)
    } else if (change < 0) {
      this.game.applyDamage(-change)
    }
  }

  /**
   * 保険種類選択（定期/終身の戦略的選択）
   */
  private async selectInsuranceType(challenge: Card, interactiveMode: boolean): Promise<void> {
    const baseCost = 3
    const termCost = Math.ceil(baseCost * 0.7) // 定期保険は70%コスト
    const wholeLifeCost = baseCost // 終身保険は100%コスト
    const coverageValue = (challenge.power || 2) * 10
    
    console.log('\n💰 保険種類を選択してください:')
    console.log(`1. 定期保険 - コスト:${termCost}, 期限:10ターン (低コスト、期限あり)`)
    console.log(`2. 終身保険 - コスト:${wholeLifeCost}, 永続効果 (高コスト、永続)`)
    
    // 年齢に応じた推奨表示
    const recommendation = this.getInsuranceRecommendation()
    console.log(`💡 推奨: ${recommendation}`)
    
    // 選択実行（CUI環境では判断基準に基づいて選択）
    const choice = this.makeInsuranceChoice(termCost, wholeLifeCost)
    
    if (choice === 'term') {
      this.addTermInsurance(challenge, termCost, coverageValue)
    } else {
      this.addWholeLifeInsurance(challenge, wholeLifeCost, coverageValue)
    }
  }

  /**
   * 年齢に応じた保険推奨を取得
   */
  private getInsuranceRecommendation(): string {
    const stage = this.game.stage
    const insuranceCount = this.game.insuranceCards.length
    
    if (stage === 'youth') {
      return insuranceCount < 3 ? '定期保険推奨（コスト抑制）' : 'バランス型（重要事項は終身）'
    } else if (stage === 'middle') {
      return 'バランス型（見直し時期）'
    } else {
      return '終身保険推奨（安定重視）'
    }
  }

  /**
   * 保険選択の判断（AI判断）
   */
  private makeInsuranceChoice(termCost: number, wholeLifeCost: number): 'term' | 'whole_life' {
    const stage = this.game.stage
    const insuranceCount = this.game.insuranceCards.length
    const vitality = this.game.vitality
    
    // 判断基準
    if (stage === 'youth' && insuranceCount < 5) {
      // 青年期はコスト重視
      console.log('⭐ 選択: 定期保険（青年期・コスト重視）')
      return 'term'
    } else if (stage === 'fulfillment' || vitality < 20) {
      // 充実期or低活力時は安定重視
      console.log('⭐ 選択: 終身保険（安定重視）')
      return 'whole_life'
    } else {
      // 中年期はバランス型（50-50の確率）
      const choice = Math.random() < 0.5 ? 'term' : 'whole_life'
      console.log(`⭐ 選択: ${choice === 'term' ? '定期' : '終身'}保険（中年期・バランス型）`)
      return choice
    }
  }

  /**
   * 定期保険を追加
   */
  private addTermInsurance(challenge: Card, cost: number, coverage: number): void {
    const insuranceCard = Card.createInsuranceCard(
      `定期${challenge.name}保険`,
      2, // 基本パワー+2
      {
        type: 'shield',
        value: coverage,
        description: `${coverage}ポイントの保障（10ターン限定）`
      }
    )
    
    insuranceCard.coverage = coverage
    insuranceCard.durationType = 'term'
    insuranceCard.remainingTurns = 10
    insuranceCard.cost = cost
    
    this.game.addInsurance(insuranceCard)
    console.log(`📋 定期保険追加: ${insuranceCard.name} (保障:${coverage}, 残り10ターン, コスト:${cost})`)
  }

  /**
   * 終身保険を追加
   */
  private addWholeLifeInsurance(challenge: Card, cost: number, coverage: number): void {
    const insuranceCard = Card.createInsuranceCard(
      `終身${challenge.name}保険`,
      2, // 基本パワー+2  
      {
        type: 'shield',
        value: coverage,
        description: `${coverage}ポイントの永続保障`
      }
    )
    
    insuranceCard.coverage = coverage
    insuranceCard.durationType = 'whole_life'
    insuranceCard.cost = cost
    
    // 年齢ボーナス適用
    const ageBonus = this.calculateAgeBonus()
    if (ageBonus > 0) {
      insuranceCard.power += ageBonus
      console.log(`🎯 年齢ボーナス: +${ageBonus}パワー`)
    }
    
    this.game.addInsurance(insuranceCard)
    console.log(`📋 終身保険追加: ${insuranceCard.name} (保障:${coverage}, 永続, コスト:${cost})`)
  }

  /**
   * 年齢ボーナスを計算
   */
  private calculateAgeBonus(): number {
    switch(this.game.stage) {
      case 'middle': return 0.5
      case 'fulfillment': return 1.0
      default: return 0
    }
  }

  /**
   * チャレンジカードを作成（CardFactoryを使用）
   */
  private createChallengeCards(): ChallengeCardWithStatus[] {
    // CardFactoryから基本チャレンジカードを生成
    const baseCards = CardFactory.createChallengeCards(this.game.stage)
    
    // isUsedプロパティを追加
    return baseCards.map(card => ({
      ...card,
      isUsed: false
    } as ChallengeCardWithStatus))
  }

  /**
   * ゲーム状態を取得
   */
  getGameState(): Game {
    return this.game
  }

  /**
   * 残りチャレンジ数を取得
   */
  getRemainingChallenges(): number {
    return this.challengeCards.filter(card => !card.isUsed).length
  }

  /**
   * パフォーマンス統計を取得
   */
  getPerformanceStats(): PerformanceStats & { gameStats?: Record<string, unknown>; dragDropStats?: Record<string, unknown> } {
    // ゲームのパフォーマンス統計を取得
    const gameStats = this.game.getPerformanceStats()
    
    // 平均判断時間を計算
    if (this.decisionTimes.length > 0) {
      this.performanceStats.averageDecisionTime = 
        this.decisionTimes.reduce((sum, time) => sum + time, 0) / this.decisionTimes.length
    }
    
    // メモリ使用量の推定
    this.performanceStats.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024 // MB
    
    return {
      ...this.performanceStats,
      gameStats,
      // ドラッグ&ドロップ統計は実際のGameSceneから取得する必要がある
      dragDropStats: {
        note: 'Use GameScene.getDropZoneIntegration().getPerformanceStats() for drag & drop stats'
      }
    }
  }

  /**
   * パフォーマンス最適化の推奨事項を取得
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = []
    const stats = this.getPerformanceStats()
    
    if (stats.averageDecisionTime > 100) {
      recommendations.push('AI決定時間が長すぎます。戦略アルゴリズムの最適化を推奨します。')
    }
    
    if (stats.memoryUsage > 50) {
      recommendations.push('メモリ使用量が多いです。オブジェクトプールの活用を推奨します。')
    }
    
    if (stats.gameStats?.cacheHitRate < 0.8) {
      recommendations.push('キャッシュヒット率が低いです。キャッシュ戦略の見直しを推奨します。')
    }
    
    return recommendations
  }
}