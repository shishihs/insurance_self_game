/**
 * CUIプレイテスト専用の軽量GameController
 * 正しいゲームルールに従って動作する簡易版
 */
import { Game } from '../domain/entities/Game'
import { Card } from '../domain/entities/Card'
import type { GameConfig } from '../domain/types/game.types'

export interface SimpleGameRenderer {
  logTurn(turnNumber: number, challenges: Card[], selectedChallenge: Card, handCards: Card[], result: any, gameState: any): void
}

// チャレンジカードの使用状態を管理する型
type ChallengeCardWithStatus = Card & { isUsed?: boolean }

export class PlaytestGameController {
  private game: Game
  private challengeCards: ChallengeCardWithStatus[] = []
  private currentChallenges: Card[] = []

  constructor(config?: GameConfig) {
    this.game = new Game(config)
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
  async playTurn(renderer: SimpleGameRenderer): Promise<boolean> {
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

    // AIによるチャレンジ選択（ランダム）
    const selectedChallenge = this.selectChallengeByAI(this.currentChallenges)

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

    // 成功時は保険獲得
    if (success) {
      this.addInsurance(selectedChallenge)
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
   * チャレンジカードを3枚ドロー
   */
  private drawChallenges(): Card[] {
    const available = this.challengeCards.filter(card => !card.isUsed)
    if (available.length === 0) return []

    const count = Math.min(3, available.length)
    const challenges: Card[] = []

    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * available.length)
      const card = available.splice(randomIndex, 1)[0]
      challenges.push(card)
    }

    return challenges
  }

  /**
   * AIによるチャレンジ選択（簡易版）
   */
  private selectChallengeByAI(challenges: Card[]): Card {
    // 最も必要パワーが低いものを選択（成功率重視）
    return challenges.reduce((easiest, current) => 
      this.getRequiredPower(current) < this.getRequiredPower(easiest) ? current : easiest
    )
  }

  /**
   * ステージに応じた必要パワーを取得
   */
  private getRequiredPower(challenge: Card): number {
    const basePower = challenge.power || 2
    
    // ステージによる調整
    switch (this.game.stage) {
      case 'youth': return basePower
      case 'middle': return basePower + 1
      case 'fulfillment': return basePower + 2
      default: return basePower
    }
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
   * 人生カードプールを作成
   */
  private createLifeCardPool(): Card[] {
    const cards: Card[] = []

    // ポジティブカード（8枚）
    for (let i = 0; i < 4; i++) cards.push(Card.createLifeCard('アルバイト収入', 1))
    for (let i = 0; i < 2; i++) cards.push(Card.createLifeCard('親の仕送り', 2))
    for (let i = 0; i < 2; i++) cards.push(Card.createLifeCard('友人の励まし', 1))

    // ネガティブカード（10枚）
    for (let i = 0; i < 3; i++) cards.push(Card.createLifeCard('浪費癖', -1))
    for (let i = 0; i < 3; i++) cards.push(Card.createLifeCard('衝動買い', 0))
    for (let i = 0; i < 2; i++) cards.push(Card.createLifeCard('ギャンブル', -1))
    cards.push(Card.createLifeCard('友人の結婚式', 0))
    cards.push(Card.createLifeCard('風邪をひく', 0))

    return cards
  }

  /**
   * 総パワーを計算
   */
  private calculateTotalPower(cards: Card[]): number {
    return cards.reduce((total, card) => total + (card.power || 0), 0)
  }

  /**
   * 活力変化を計算
   */
  private calculateVitalityChange(success: boolean, totalPower: number, requiredPower: number): number {
    if (success) {
      // 成功時は余剰パワーの半分を活力回復
      return Math.floor((totalPower - requiredPower) / 2)
    } else {
      // 失敗時は不足分だけ活力減少
      return -(requiredPower - totalPower)
    }
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
   * 保険を追加
   */
  private addInsurance(challenge: Card): void {
    const insuranceCard = Card.createInsuranceCard(
      `${challenge.name}保険`,
      2 // 基本パワー+2
    )
    
    this.game.addInsurance(insuranceCard)
  }

  /**
   * チャレンジカードを作成
   */
  private createChallengeCards(): ChallengeCardWithStatus[] {
    const cards: ChallengeCardWithStatus[] = []

    // 基本的なチャレンジカードを作成し、isUsedプロパティを追加
    const challengeNames = [
      { name: '健康づくり', power: 2 },
      { name: '資格取得', power: 3 },
      { name: '人脈作り', power: 2 },
      { name: '結婚', power: 4 },
      { name: 'マイホーム購入', power: 5 },
      { name: '子供の誕生', power: 4 },
      { name: '独立・起業', power: 5 },
      { name: '海外旅行', power: 3 },
      { name: '親の介護', power: 4 },
      { name: '転職', power: 3 }
    ]

    for (const { name, power } of challengeNames) {
      const card = Card.createChallengeCard(name, power) as ChallengeCardWithStatus
      card.isUsed = false
      cards.push(card)
    }

    return cards
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
}