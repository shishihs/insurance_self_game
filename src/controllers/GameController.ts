import type { GameRenderer } from '@/interfaces/GameRenderer'
import { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import { CardFactory } from '@/domain/services/CardFactory'
import type { GameConfig, ChallengeResult, PlayerStats } from '@/domain/types/game.types'
import type { GameStage } from '@/domain/types/card.types'

/**
 * ゲーム制御クラス
 * ドメインロジック（Game）とレンダラー（GameRenderer）を仲介
 * フレームワーク非依存の純粋なゲームフロー制御
 */
export class GameController {
  private game: Game
  private renderer: GameRenderer
  private isGameRunning: boolean = false
  private debugMode: boolean = false

  constructor(config: GameConfig, renderer: GameRenderer) {
    this.game = new Game(config)
    this.renderer = renderer
  }

  // === 公開API ===

  /**
   * メインゲームループ
   * ゲーム全体の進行を制御
   */
  async playGame(): Promise<PlayerStats> {
    try {
      this.isGameRunning = true
      await this.renderer.initialize()
      
      this.log('ゲーム開始')
      await this.initializeGame()
      
      // メインゲームループ
      while (this.isGameRunning && this.game.status === 'in_progress') {
        await this.playTurn()
        
        // ゲーム終了条件のチェック
        if (this.checkGameEndConditions()) {
          break
        }
      }
      
      // 最終結果の表示
      await this.showFinalResult()
      
    } catch (error) {
      this.handleGameError(error as Error)
    } finally {
      this.isGameRunning = false
      this.renderer.dispose()
    }
    
    return this.game.stats
  }

  /**
   * 1ターンの実行
   */
  async playTurn(): Promise<void> {
    this.log(`=== ターン ${this.game.turn} 開始 ===`)
    
    // フェーズごとの処理
    await this.handleDrawPhase()
    await this.handleChallengePhase()
    await this.handleInsuranceRenewalPhase()
    
    // ターン終了処理
    this.game.nextTurn()
    this.updateDisplay()
    
    this.log(`=== ターン ${this.game.turn - 1} 完了 ===`)
  }

  /**
   * ゲーム状態の取得
   */
  getGameState(): Game {
    return this.game
  }

  /**
   * ゲームの強制終了
   */
  stopGame(): void {
    this.isGameRunning = false
    this.log('ゲーム強制終了')
  }

  /**
   * デバッグモードの切り替え
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled
    this.renderer.setDebugMode(enabled)
  }

  // === プライベートメソッド ===

  /**
   * ゲーム初期化
   */
  private async initializeGame(): void {
    // ゲーム開始
    this.game.start()
    
    // 初期手札ドロー
    this.game.drawCards(this.game.config.startingHandSize)

    this.updateDisplay()
    await this.renderer.showMessage('ゲームが開始されました！', 'success')
  }

  /**
   * ドローフェーズ
   */
  private async handleDrawPhase(): void {
    this.game.phase = 'draw'
    this.log('ドローフェーズ開始')
    
    // 手札上限まで補充
    const currentHandSize = this.game.hand.length
    const cardsToDrawn = Math.max(0, this.game.config.maxHandSize - currentHandSize)
    
    if (cardsToDrawn > 0) {
      this.game.drawCards(cardsToDrawn)
    }
    
    this.updateDisplay()
    this.log(`手札を ${this.game.hand.length} 枚に補充`)
  }

  /**
   * チャレンジフェーズ
   */
  private async handleChallengePhase(): void {
    this.game.phase = 'challenge'
    this.log('チャレンジフェーズ開始')
    
    // チャレンジカードドロー（3枚から選択）
    const challengeChoices = []
    for (let i = 0; i < 3; i++) {
      const card = this.game.challengeDeck.drawCard()
      if (card) {
        challengeChoices.push(card)
      }
    }
    
    if (challengeChoices.length === 0) {
      // チャレンジデッキ切れの場合、次のステージに進む
      await this.handleStageTransition()
      return
    }
    
    // プレイヤーに選択してもらう（ここでは最初のカードを選択）
    const challengeCard = challengeChoices[0]
    
    this.game.currentChallenge = challengeCard
    this.updateDisplay()
    
    // プレイヤーの行動選択
    const action = await this.renderer.askChallengeAction(challengeCard)
    
    if (action === 'skip') {
      await this.renderer.showMessage('チャレンジをスキップしました')
      this.game.currentChallenge = undefined
      return
    }
    
    // チャレンジ実行
    await this.executeChallengeFlow(challengeCard)
  }

  /**
   * チャレンジ実行フロー
   */
  private async executeChallengeFlow(challengeCard: Card): Promise<void> {
    // カード選択
    if (this.game.hand.length === 0) {
      await this.renderer.showMessage('手札がありません。チャレンジに失敗しました。', 'warning')
      this.game.startChallenge(challengeCard)
      const result = this.game.resolveChallenge()
      this.renderer.showChallengeResult(result)
      return
    }
    
    const selectedCards = await this.askCardSelectionForChallenge(challengeCard)
    
    // チャレンジ開始
    this.game.startChallenge(challengeCard)
    
    // カードを選択
    for (const card of selectedCards) {
      this.game.toggleCardSelection(card)
    }
    
    // チャレンジ実行
    const result = this.game.resolveChallenge()
    this.renderer.showChallengeResult(result)
    
    // 結果に応じた処理
    if (result.success) {
      await this.handleChallengeSuccess(result)
    } else {
      await this.handleChallengeFailure(result)
    }
    
    // チャレンジカードは一度使ったら終わり（再利用しない）
    this.game.currentChallenge = undefined
    this.updateDisplay()
  }

  /**
   * チャレンジ用カード選択
   */
  private async askCardSelectionForChallenge(challengeCard: Card): Promise<Card[]> {
    const message = `チャレンジ「${challengeCard.name}」（必要パワー: ${challengeCard.power}）に使用するカードを選択してください`
    
    // すべての手札から選択可能
    return await this.renderer.askCardSelection(
      this.game.hand,
      0, // 最小選択数: 0（何も選択しなくても良い）
      this.game.hand.length, // 最大選択数: 手札すべて
      message
    )
  }

  /**
   * チャレンジ成功時の処理
   */
  private async handleChallengeSuccess(result: ChallengeResult): Promise<void> {
    this.game.stats.successfulChallenges++
    
    // カード選択がある場合
    if (result.cardChoices && result.cardChoices.length > 0) {
      const selectedCard = await this.renderer.askCardSelection(
        result.cardChoices,
        1,
        1,
        '報酬として受け取るカードを選択してください'
      )
      
      if (selectedCard.length > 0) {
        this.game.addCardToPlayerDeck(selectedCard[0])
        this.game.stats.cardsAcquired++
        await this.renderer.showMessage(`「${selectedCard[0].name}」を獲得しました！`, 'success')
      }
    }
    
    // 保険カード獲得の機会
    if (Math.random() < 0.3) { // 30%の確率
      await this.handleInsuranceAcquisition()
    }
  }

  /**
   * チャレンジ失敗時の処理
   */
  private async handleChallengeFailure(_result: ChallengeResult): Promise<void> {
    this.game.stats.failedChallenges++
    
    // 体力がなくなった場合はゲームオーバー
    if (this.game.vitality <= 0) {
      this.game.status = 'game_over'
      this.isGameRunning = false
    }
  }

  /**
   * 保険獲得フロー
   */
  private async handleInsuranceAcquisition(): Promise<void> {
    const availableTypes: ('whole_life' | 'term')[] = ['whole_life', 'term']
    const selectedType = await this.renderer.askInsuranceTypeChoice(availableTypes)
    
    // 保険カードを生成
    const insuranceCards = CardFactory.createInsuranceCards(this.game.stage, selectedType, 3)
    
    if (insuranceCards.length > 0) {
      const selectedInsurance = await this.renderer.askInsuranceChoice(
        insuranceCards,
        '獲得する保険を選択してください'
      )
      
      this.game.insuranceCards.push(selectedInsurance)
      await this.renderer.showMessage(`「${selectedInsurance.name}」保険を獲得しました！`, 'success')
      this.updateDisplay()
    }
  }

  /**
   * 保険更新フェーズ
   */
  private async handleInsuranceRenewalPhase(): void {
    if (this.game.insuranceCards.length === 0) {
      return
    }
    
    this.log('保険更新フェーズ開始')
    
    for (const insurance of [...this.game.insuranceCards]) {
      const renewalCost = this.calculateRenewalCost(insurance)
      
      const choice = await this.renderer.askInsuranceRenewalChoice(insurance, renewalCost)
      
      if (choice === 'renew') {
        if (this.game.vitality >= renewalCost) {
          this.game.vitality -= renewalCost
          this.game.insuranceBurden += renewalCost
          await this.renderer.showMessage(`「${insurance.name}」を更新しました（コスト: ${renewalCost}）`, 'success')
        } else {
          await this.renderer.showMessage(`体力不足のため「${insurance.name}」を更新できませんでした`, 'warning')
          this.expireInsurance(insurance)
        }
      } else {
        this.expireInsurance(insurance)
        await this.renderer.showMessage(`「${insurance.name}」が失効しました`)
      }
    }
    
    this.updateDisplay()
  }

  /**
   * 保険の失効処理
   */
  private expireInsurance(insurance: Card): void {
    const index = this.game.insuranceCards.indexOf(insurance)
    if (index >= 0) {
      this.game.insuranceCards.splice(index, 1)
      this.game.expiredInsurances.push(insurance)
    }
  }

  /**
   * 保険更新コストの計算
   */
  private calculateRenewalCost(insurance: Card): number {
    // 基本コスト + 年齢による増加
    const baseCost = insurance.cost || 1
    // ステージごとの倍率
    const ageMultiplier = {
      youth: 1.0,
      middle: 1.2,
      fulfillment: 1.5
    }[this.game.stage] || 1.0
    return Math.ceil(baseCost * ageMultiplier)
  }

  /**
   * ステージ遷移処理
   */
  private async handleStageTransition(): Promise<void> {
    this.game.status = 'stage_clear'
    this.renderer.showStageClear(this.game.stage, this.game.stats)
    
    // 次のステージがある場合
    const nextStage = this.getNextStage(this.game.stage)
    if (nextStage) {
      this.game.stage = nextStage
      this.game.status = 'in_progress'
      
      // 新しいチャレンジデッキ作成
      const challengeCards = CardFactory.createChallengeCards(nextStage)
      this.game.challengeDeck.addCards(challengeCards)
      this.game.challengeDeck.shuffle()
      
      await this.renderer.showMessage(`ステージ ${nextStage} に進みました！`, 'success')
    } else {
      // 全ステージクリア
      this.game.status = 'victory'
      this.isGameRunning = false
    }
  }

  /**
   * 次のステージを取得
   */
  private getNextStage(currentStage: GameStage): GameStage | null {
    const stages: GameStage[] = ['youth', 'middle', 'fulfillment']
    const currentIndex = stages.indexOf(currentStage)
    return currentIndex >= 0 && currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null
  }

  /**
   * ゲーム終了条件チェック
   */
  private checkGameEndConditions(): boolean {
    if (this.game.vitality <= 0) {
      this.game.status = 'game_over'
      return true
    }
    
    if (this.game.status === 'victory' || this.game.status === 'game_over') {
      return true
    }
    
    return false
  }

  /**
   * 最終結果表示
   */
  private async showFinalResult(): Promise<void> {
    if (this.game.status === 'victory') {
      this.renderer.showVictory(this.game.stats)
    } else if (this.game.status === 'game_over') {
      this.renderer.showGameOver(this.game.stats)
    }
  }

  /**
   * 画面表示の更新
   */
  private updateDisplay(): void {
    this.renderer.displayGameState(this.game)
    this.renderer.displayHand(this.game.hand)
    this.renderer.displayVitality(this.game.vitality, this.game.maxVitality)
    this.renderer.displayInsuranceCards(this.game.insuranceCards)
    this.renderer.displayInsuranceBurden(this.game.insuranceBurden)
    this.renderer.displayProgress(this.game.stage, this.game.turn)
    
    if (this.game.currentChallenge) {
      this.renderer.displayChallenge(this.game.currentChallenge)
    }
  }

  /**
   * エラーハンドリング
   */
  private handleGameError(error: Error): void {
    this.log(`ゲームエラー: ${error.message}`, 'error')
    this.renderer.showError(`ゲームでエラーが発生しました: ${error.message}`)
    this.isGameRunning = false
  }

  /**
   * ログ出力
   */
  private log(message: string, _level: 'info' | 'error' = 'info'): void {
    if (this.debugMode) {
      console.log(`[GameController] ${message}`)
    }
  }
}

/**
 * GameControllerファクトリー
 */
export class GameControllerFactory {
  /**
   * ゲームコントローラーを作成
   */
  static create(config: GameConfig, renderer: GameRenderer): GameController {
    return new GameController(config, renderer)
  }

  /**
   * デフォルト設定でゲームコントローラーを作成
   */
  static createDefault(renderer: GameRenderer): GameController {
    const defaultConfig: GameConfig = {
      difficulty: 'normal',
      startingVitality: 20,
      startingHandSize: 5,
      maxHandSize: 7,
      dreamCardCount: 2
    }
    
    return new GameController(defaultConfig, renderer)
  }
}