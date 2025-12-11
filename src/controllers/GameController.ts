import type { GameRenderer } from '../interfaces/GameRenderer'
import { Game } from '../domain/entities/Game'
import { Card } from '../domain/entities/Card'
import { CardFactory } from '../domain/services/CardFactory'
import type { ChallengeResult, GameConfig, PlayerStats } from '../domain/types/game.types'
import type { GameStage } from '../domain/types/card.types'
import { IdGenerator } from '../common/IdGenerator'

/**
 * ゲーム制御クラス
 * ドメインロジック（Game）とレンダラー（GameRenderer）を仲介
 * フレームワーク非依存の純粋なゲームフロー制御
 */
export class GameController {
  private readonly game: Game
  private readonly renderer: GameRenderer
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
    // await this.handleDrawPhase() // 廃止: チャレンジ決定後にドローする

    if (this.game.status !== 'in_progress') return
    await this.handleChallengePhase()

    // Phase 4: 保険フェーズ (ルールブック v2準拠) - 廃止 (チャレンジ成功報酬に統合)
    // await this.handleInsurancePhase()

    if (this.game.status !== 'in_progress') return
    // 保険更新（維持）フェーズ - 有効化
    await this.handleInsuranceRenewalPhase()

    if (this.game.status !== 'in_progress') return

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
  private async initializeGame(): Promise<void> {
    // ゲーム開始（ステータス変更）
    this.game.start()

    // v2: キャラクター選択フェーズの処理
    if (this.game.phase === 'character_selection') {
      // TODO: インタラクティブな選択をRendererに追加する
      // 現在はデフォルト(Solid)を自動選択
      this.game.selectCharacter('solid')
    }

    // v2: 夢選択フェーズの処理
    if (this.game.phase === 'dream_selection') {
      await this.handleDreamSelectionPhase()
    }

    // 初期手札ドロー (Game.selectDream で phase='draw' になっているはずだが、初期手札はまだ)
    // Game.selectDream内で changeTurn(1) しているので、ターン1のドローフェーズとして扱われるかも？
    // しかし GameController.playGame のループに入ると playTurn -> handleDrawPhase が呼ばれる。
    // initializeGame では「初期手札」を持つべきか？
    // Game.ts の constructor/start では drawしていない。
    // GameController の古いコードでは drawCards(startingHandSize) していた。

    // v2では selectDream 後に phase='draw', turn=1 になる。
    // ここで drawCards してしまうと、playTurn の handleDrawPhase でさらに引いてしまうかも？
    // handleDrawPhase は "maxHandSizeまで補充" するロジックなので、
    // ここで引いておけば handleDrawPhase では引かない（満タンなら）。

    // v2変更: 初期手札は0で開始し、チャレンジ選択後に引く
    // if (this.game.hand.length === 0) {
    //   this.game.drawCards(this.game.config.startingHandSize)
    // }

    this.updateDisplay()
    await this.renderer.showMessage('ゲームが開始されました！', 'success')
  }

  /**
   * 夢選択フェーズ
   */
  private async handleDreamSelectionPhase(): Promise<void> {
    this.log('夢選択フェーズ開始')

    // 選択肢は Game.start() -> startDreamSelectionPhase() で既に生成されている
    const choices = this.game.cardManager.getState().cardChoices
    if (!choices || choices.length === 0) {
      throw new Error('夢カードの選択肢がありません')
    }

    // ユーザーに選択させる
    const selectedDream = await this.renderer.askDreamSelection(choices)

    // 選択を適用
    this.game.selectDream(selectedDream)

    await this.renderer.showMessage(`夢「${selectedDream.name}」を選択しました！`, 'success')
  }

  /**
   * ドローフェーズ
   */
  private async handleDrawPhase(): Promise<void> {
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
  private async handleChallengePhase(): Promise<void> {
    this.log('チャレンジフェーズ開始')

    // v2: 2枚引いて選択させる
    try {
      this.game.startChallengePhase()
    } catch (e) {
      // チャレンジデッキ切れなどの場合
      if (this.game.challengeDeck.size() === 0) {
        await this.handleStageTransition()
        return
      }
      throw e
    }

    const choices = this.game.cardManager.getState().cardChoices
    if (!choices || choices.length === 0) {
      // フォールバック（通常ありえない）
      await this.handleStageTransition()
      return
    }

    // プレイヤーに選択してもらう
    const selectedChallenge = await this.renderer.askChallengeSelection(choices)

    // チャレンジ開始（選択されなかったカードはデッキに戻る/捨てられる等の処理が内部で行われる）
    this.game.startChallenge(selectedChallenge)

    // v2: 課題選択後にカードを7枚引く（ドキドキ感のため）
    await this.game.drawCards(7)
    this.log(`課題「${selectedChallenge.name}」に挑戦！カードを7枚引きました`)

    this.updateDisplay()
    console.log('[DEBUG-GC] Pre-Execution')

    // チャレンジ実行
    await this.executeChallengeFlow(selectedChallenge)
    console.log('[DEBUG-GC] Post-Execution')
  }

  /**
   * チャレンジ実行フロー
   */
  private async executeChallengeFlow(challengeCard: Card): Promise<void> {
    // カード選択
    if (this.game.hand.length === 0) {
      console.log('[DEBUG-GC] No hand!')
      await this.renderer.showMessage('手札がありません。チャレンジに失敗しました。', 'warning')
      // startChallengeは既に呼ばれている
      const result = this.game.resolveChallenge()
      this.renderer.showChallengeResult(result)
      await this.handleChallengeFailure(result) // 結果処理も呼ぶ必要あり
      return
    }

    // チャレンジ用カード選択依頼
    console.log(`[DEBUG-GC] Asking card selection... Hand size: ${this.game.hand.length}`)
    const selectedCards = await this.askCardSelectionForChallenge(challengeCard)
    console.log(`[DEBUG-GC] Selected cards: ${selectedCards.length}`)

    // 選択されたカードをセット（トグル）
    for (const card of selectedCards) {
      this.game.toggleCardSelection(card)
    }

    // チャレンジ実行（判定）
    console.log(`[DEBUG-GC] Resolving challenge...`)
    const result = this.game.resolveChallenge()
    console.log(`[DEBUG-GC] Challenge resolved. Success: ${result.success}`)
    this.renderer.showChallengeResult(result)

    // 結果に応じた処理
    if (result.success) {
      await this.handleChallengeSuccess(result)
    } else {
      await this.handleChallengeFailure(result)
    }

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
    // 統計更新はGameChallengeServiceで行われるため削除
    // this.game.stats.successfulChallenges++

    // 1. 保険種類選択フロー（チャレンジ成功報酬）
    if (result.insuranceTypeChoices && result.insuranceTypeChoices.length > 0) {
      await this.handleInsuranceTypeSelection(result.insuranceTypeChoices)
    }

    // 2. 報酬カード選択がある場合
    if (result.cardChoices && result.cardChoices.length > 0) {
      const selectedCard = await this.renderer.askCardSelection(
        result.cardChoices,
        1,
        1,
        '報酬として受け取るカードを選択してください'
      )

      if (selectedCard.length > 0) {
        const cardToAcquire = selectedCard[0]
        if (cardToAcquire) {
          this.game.addCardToPlayerDeck(cardToAcquire)
          this.game.stats.cardsAcquired++
          await this.renderer.showMessage(`「${cardToAcquire.name}」を獲得しました！`, 'success')
        }
      }
    }
  }

  /**
   * 保険種類選択フロー（チャレンジ成功報酬）
   */
  private async handleInsuranceTypeSelection(choices: import('../domain/types/game.types').InsuranceTypeChoice[]): Promise<void> {
    this.log('保険種類選択フロー開始')

    // 1. 保険の種類を選択（医療、生命など）
    const insuranceCards = choices.map(choice =>
      new Card({
        id: IdGenerator.generateCardId(),
        name: choice.baseCard.name,
        description: choice.baseCard.description,
        type: 'insurance',
        power: choice.baseCard.power,
        cost: choice.termOption.cost, // デフォルトで定期保険のコストを表示
        effects: []
      })
    )

    const selectedInsuranceCard = await this.renderer.askInsuranceChoice(
      insuranceCards,
      '獲得する保険の種類を選択してください'
    )

    // 選択された保険の種類を特定
    const selectedChoice = choices.find(c => c.baseCard.name === selectedInsuranceCard.name)
    if (!selectedChoice) {
      this.log('保険選択がキャンセルされました')
      return
    }

    // 2. 定期保険 or 終身保険を選択
    const availableTypes: ('whole_life' | 'term')[] = ['term', 'whole_life']
    const durationType = await this.renderer.askInsuranceTypeChoice(availableTypes)

    // 3. 保険カードを生成してゲームに追加
    const insuranceResult = this.game.selectInsuranceType(selectedChoice.insuranceType, durationType)

    if (insuranceResult.success && insuranceResult.selectedCard) {
      await this.renderer.showMessage(
        `「${insuranceResult.selectedCard.name}」(${durationType === 'term' ? '定期' : '終身'})を獲得しました！`,
        'success'
      )
    }

    this.updateDisplay()
  }

  /**
   * チャレンジ失敗時の処理
   */
  private async handleChallengeFailure(_result: ChallengeResult): Promise<void> {
    // 統計更新はGameChallengeServiceで行われるため削除
    // this.game.stats.failedChallenges++

    // 体力がなくなった場合はゲームオーバー
    if (this.game.vitality <= 0) {
      this.game.status = 'game_over'
      this.isGameRunning = false
    }
  }

  /**
   * 保険フェーズ (Phase 4-A)
   */
  private async handleInsurancePhase(): Promise<void> {
    this.log('保険フェーズ開始')

    // 保険市場（4枚）を表示して購入を促す
    if (this.game.insuranceMarket.length < 4) {
      // 簡易実装：市場補充
      // 本当はGameクラスかServiceでやるべき
    }

    // プレイヤーに購入の意思確認
    const wantToBuy = await this.renderer.askConfirmation('保険を契約しますか？', 'no')
    if (wantToBuy === 'yes') {
      await this.handleInsuranceAcquisition()
    }
  }

  /**
   * 保険獲得フロー（Phase 4内用）
   */
  private async handleInsuranceAcquisition(): Promise<void> {
    const availableTypes: ('whole_life' | 'term')[] = ['whole_life', 'term']
    const _selectedType = await this.renderer.askInsuranceTypeChoice(availableTypes)

    // 保険カードを生成
    // CardFactory.createInsuranceCards は存在しないので修正
    const insuranceCards = CardFactory.createBasicInsuranceCards(this.game.stage)
      .filter(c => c.insuranceType === 'life' || c.insuranceType === 'medical') // 簡易フィルタ

    if (insuranceCards.length > 0) {
      const selectedInsurance = await this.renderer.askInsuranceChoice(
        insuranceCards,
        '獲得する保険を選択してください'
      )

      // Gameに保険を追加
      // Game.addInsuranceCard のようなメソッドがあるか確認が必要だが、一旦直接配列操作 + 活力コストで代用
      // 本来は game.addInsurance(card) 等を使うべき
      this.game.activeInsurances.push(selectedInsurance)

      await this.renderer.showMessage(`「${selectedInsurance.name}」保険を獲得しました！`, 'success')

      // コスト支払い（契約コスト）
      const cost = selectedInsurance.cost
      if (this.game.vitality >= cost) {
        this.game.heal(-cost)
        await this.renderer.showMessage(`契約コスト ${cost} を支払いました`, 'info')
      }

      this.updateDisplay()
    }
  }

  /**
 * 保険更新フェーズ
 */
  private async handleInsuranceRenewalPhase(): Promise<void> {
    if (this.game.activeInsurances.length === 0) {
      return
    }

    this.log('保険更新フェーズ開始')

    // コピーを作成してループ（失効による配列変更対策）
    for (const insurance of [...this.game.activeInsurances]) {
      // 終身保険は更新不要
      if (insurance.isWholeLifeInsurance()) {
        continue
      }

      // 定期保険: 残り期間が1ターン以内の場合のみ更新確認
      if (insurance.isTermInsurance()) {
        const remaining = insurance.remainingTurns || 0
        if (remaining > 1) {
          continue
        }

        const renewalCost = this.calculateRenewalCost(insurance)
        const choice = await this.renderer.askInsuranceRenewalChoice(insurance, renewalCost)

        if (choice === 'renew') {
          if (this.game.vitality >= renewalCost) {
            this.game.heal(-renewalCost)

            // 期間を延長（元の期間またはデフォルト5ターン）
            insurance.remainingTurns = (insurance.durationType === 'term' ? 5 : 10)

            await this.renderer.showMessage(`「${insurance.name}」を更新しました（期間延長, コスト: ${renewalCost}）`, 'success')
          } else {
            await this.renderer.showMessage(`体力不足のため「${insurance.name}」を更新できませんでした`, 'warning')
            // ここでは失効させない（次ターンの期限切れ処理に任せる）
          }
        } else {
          // 「更新しない」を選んだ場合も、ここでは即時失効させず、期間満了を待つ
          await this.renderer.showMessage(`「${insurance.name}」の更新を見送りました`)
        }
      }
    }

    this.updateDisplay()
  }

  /**
   * 保険の失効処理
   */
  private expireInsurance(insurance: Card): void {
    const index = this.game.activeInsurances.indexOf(insurance)
    if (index > -1) {
      this.game.activeInsurances.splice(index, 1)
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
    return currentIndex >= 0 && currentIndex < stages.length - 1 ? stages[currentIndex + 1] ?? null : null
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
    this.renderer.displayInsuranceCards(this.game.activeInsurances)
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
      startingVitality: 15,
      startingHandSize: 5,
      maxHandSize: 7,
      dreamCardCount: 2
    }

    return new GameController(defaultConfig, renderer)
  }
}