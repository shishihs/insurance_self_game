/**
 * CUIプレイテスト専用の軽量GameController
 * 正しいゲームルールに従って動作する簡易版
 */
import { Game } from '../domain/entities/Game'
import { Card } from '../domain/entities/Card'
import { CardFactory } from '../domain/services/CardFactory'
import { VitalityCalculationService } from '../domain/services/VitalityCalculationService'
import { GameStageManager } from '../domain/services/GameStageManager'
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
      // 充実期まで到達している場合は勝利
      if (this.game.stage === 'fulfillment') {
        this.game.advanceStage() // これで victory ステータスになる
      } else {
        // まだ未到達の場合は次のステージに進める
        this.game.advanceStage()
      }
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
    const handCards = this.drawStandardHand()

    // 3. パワー計算と成功判定
    const totalPower = this.calculateTotalPower(handCards)
    const success = totalPower >= requiredPower

    // 4. 結果処理（統一サービス使用）
    const vitalityCalculation = VitalityCalculationService.calculateVitalityChange(
      this.game,
      success,
      totalPower,
      requiredPower
    )

    const result = {
      success,
      totalPower,
      requiredPower,
      vitalityChange: vitalityCalculation.finalChange,
      vitalityDetails: vitalityCalculation.details
    }

    // 活力更新（統一サービス使用）
    const beforeVitality = this.game.vitality
    VitalityCalculationService.applyVitalityChange(this.game, result.vitalityChange)
    const afterVitality = this.game.vitality
    
    // デバッグログ出力（詳細な活力変化追跡）
    console.log(`🔄 ${vitalityCalculation.details}`)
    console.log(`   活力変化: ${beforeVitality} → ${afterVitality} (変化量: ${afterVitality - beforeVitality})`)
    
    // 活力変化の不整合チェック
    const expectedChange = result.vitalityChange
    const actualChange = afterVitality - beforeVitality
    if (expectedChange !== actualChange) {
      console.warn(`⚠️ 活力変化の不整合検出: 期待値${expectedChange}, 実際${actualChange}`)
    }

    // ゲームオーバーは Game クラスが自動的に判定する

    // 成功時は保険選択（定期/終身の戦略的選択）
    if (success && this.game.status === 'in_progress') {
      await this.selectInsuranceType(selectedChallenge, interactiveMode)
    }

    // ターン終了処理（ゲームが継続中の場合のみ）
    if (this.game.status === 'in_progress') {
      this.game.nextTurn()
      
      // ステージ進行状況をチェック
      this.checkAndLogStageProgression()
      
      // ゲーム状態の整合性をチェック
      this.validateGameStateConsistency()
    }

    // ログ記録
    const currentTurn = this.game.status === 'in_progress' ? this.game.turn - 1 : this.game.turn
    renderer.logTurn(
      currentTurn,
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
   * 標準手札をドロー（固定5枚）
   * 修正版: 必要パワー分ではなく、標準的な手札枚数をドロー
   */
  private drawStandardHand(): Card[] {
    const handCards: Card[] = []
    const cardPool = this.createLifeCardPool()
    
    // 固定5枚をドロー（標準的なカードゲームのルール）
    const handSize = 5
    
    for (let i = 0; i < handSize; i++) {
      const randomIndex = Math.floor(Math.random() * cardPool.length)
      handCards.push(cardPool[randomIndex])
    }

    console.log(`手札をドロー: ${handSize}枚（標準的なカードゲームルール）`)
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
  // 旧実装削除: VitalityCalculationServiceに移行済み
  // 統一サービスで活力計算と保険効果を一元管理

  /**
   * ゲーム全体状態の一貫性をチェック
   */
  private validateGameStateConsistency(): void {
    const currentVitality = this.game.vitality
    const maxVitality = this.game.maxVitality
    const insuranceCount = this.game.insuranceCards.length
    const stage = this.game.stage
    const turn = this.game.turn
    
    // 基本的な整合性チェック
    const issues: string[] = []
    
    if (currentVitality < 0) {
      issues.push(`活力が負の値: ${currentVitality}`)
    }
    
    if (currentVitality > maxVitality) {
      issues.push(`活力が上限超過: ${currentVitality}/${maxVitality}`)
    }
    
    // ステージに応じた上限チェック
    const expectedMaxVitality = { youth: 35, middle: 30, fulfillment: 27 }[stage]
    if (maxVitality !== expectedMaxVitality) {
      issues.push(`ステージ${stage}の活力上限異常: 期待${expectedMaxVitality}, 実際${maxVitality}`)
    }
    
    if (issues.length > 0) {
      console.warn(`🚨 ゲーム状態の不整合検出:`)
      issues.forEach(issue => console.warn(`   ${issue}`))
    }
    
    // 詳細状態ログ（定期的に出力）
    if (turn % 3 === 0) {
      console.log(`📊 ゲーム状態詳細 (ターン${turn}):`)
      console.log(`   ステージ: ${stage}, 活力: ${currentVitality}/${maxVitality}`)
      console.log(`   保険枚数: ${insuranceCount}, ステータス: ${this.game.status}`)
    }
  }

  /**
   * ステージ進行状況をチェックしてログ出力
   */
  private checkAndLogStageProgression(): void {
    const stageManager = new GameStageManager()
    const progression = stageManager.checkStageProgression(this.game.stage, this.game.turn)
    
    // ステージ変更があった場合
    if (progression.hasChanged && progression.transitionMessage) {
      console.log(progression.transitionMessage)
      
      // 新しいステージの詳細情報を表示
      const stageDetails = GameStageManager.getStageDetails(progression.newStage, this.game.turn)
      console.log(`📋 ${stageDetails.stageName}: ${stageDetails.description}`)
      console.log(`   体力上限: ${stageDetails.vitalityLimit}`)
      console.log(`   特徴: ${stageDetails.characteristics.join(', ')}`)
    }
    
    // 次のステージ移行予告
    if (progression.upcomingTransition) {
      console.log(progression.upcomingTransition)
    }
    
    // 初回起動時にステージ進行条件を表示
    if (this.game.turn === 1) {
      const transitionInfo = GameStageManager.getStageTransitionInfo()
      console.log(`📅 ステージ進行条件: ${transitionInfo.description}`)
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
      cost, // コストを作成時に指定
      {
        type: 'shield',
        value: coverage,
        description: `${coverage}ポイントの保障（10ターン限定）`
      }
    )
    
    // プロパティを適用した新しいカードを作成
    const finalInsuranceCard = insuranceCard.copy({
      coverage,
      durationType: 'term',
      remainingTurns: 10
    })
    
    this.game.addInsurance(finalInsuranceCard)
    console.log(`📋 定期保険追加: ${insuranceCard.name} (保障:${coverage}, 残り10ターン, コスト:${cost})`)
  }

  /**
   * 終身保険を追加
   */
  private addWholeLifeInsurance(challenge: Card, cost: number, coverage: number): void {
    const insuranceCard = Card.createInsuranceCard(
      `終身${challenge.name}保険`,
      2, // 基本パワー+2
      cost, // コストを作成時に指定
      {
        type: 'shield',
        value: coverage,
        description: `${coverage}ポイントの永続保障`
      }
    )
    
    // 年齢ボーナス適用
    const ageBonus = this.calculateAgeBonus()
    const finalPower = 2 + ageBonus  // 基本パワー2 + 年齢ボーナス
    
    // プロパティを適用した新しいカードを作成
    const finalInsuranceCard = insuranceCard.copy({
      power: finalPower,
      coverage,
      durationType: 'whole_life'
    })
    
    if (ageBonus > 0) {
      console.log(`🎯 年齢ボーナス: +${ageBonus}パワー`)
    }
    
    this.game.addInsurance(finalInsuranceCard)
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
    // 全ステージのチャレンジカードを生成
    const allCards: Card[] = []
    const stages: ('youth' | 'middle' | 'fulfillment')[] = ['youth', 'middle', 'fulfillment']
    
    stages.forEach(stage => {
      const stageCards = CardFactory.createChallengeCards(stage)
      allCards.push(...stageCards)
    })
    
    // isUsedプロパティを追加
    return allCards.map(card => ({
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