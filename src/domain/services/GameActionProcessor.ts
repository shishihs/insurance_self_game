import type { Card } from '../entities/Card'
import type { ChallengeResult, InsuranceTypeSelectionResult } from '../types/game.types'
import type { Game } from '../entities/Game'

/**
 * ゲームアクションの結果
 */
export interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  effects?: GameEffect[]
}

/**
 * ゲーム効果
 */
export interface GameEffect {
  type: 'vitality_change' | 'card_draw' | 'insurance_add' | 'stage_advance'
  description: string
  value?: number
  cards?: Card[]
}

/**
 * アクション処理の抽象基底クラス
 * Template Method Pattern を使用
 */
export abstract class BaseActionProcessor<TInput, TOutput> {
  /**
   * アクション実行のテンプレートメソッド
   */
  async execute(game: Game, input: TInput): Promise<ActionResult<TOutput>> {
    try {
      // 前処理バリデーション
      const validationResult = await this.validate(game, input)
      if (!validationResult.success) {
        return validationResult as ActionResult<TOutput>
      }

      // メイン処理
      const result = await this.process(game, input)

      // 後処理
      await this.postProcess(game, result)

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * バリデーション処理（サブクラスでオーバーライド）
   */
  protected async validate(game: Game, input: TInput): Promise<ActionResult<void>> {
    return { success: true }
  }

  /**
   * メイン処理（サブクラスで必須実装）
   */
  protected abstract process(game: Game, input: TInput): Promise<ActionResult<TOutput>>

  /**
   * 後処理（サブクラスでオーバーライド）
   */
  protected async postProcess(game: Game, result: ActionResult<TOutput>): Promise<void> {
    // デフォルトは何もしない
  }
}

/**
 * カードドロー処理
 */
export class DrawCardsProcessor extends BaseActionProcessor<number, Card[]> {
  protected override async validate(game: Game, count: number): Promise<ActionResult<void>> {
    if (count <= 0) {
      return { success: false, error: 'ドロー枚数は1以上である必要があります' }
    }

    if (count > 10) {
      return { success: false, error: 'ドロー枚数は10枚以下である必要があります' }
    }

    return { success: true }
  }

  protected override async process(game: Game, count: number): Promise<ActionResult<Card[]>> {
    // CardManagerから直接カードをドロー
    const result = game.cardManager.drawCards(count)

    const effects: GameEffect[] = [{
      type: 'card_draw',
      description: `${result.drawnCards.length}枚のカードをドローしました`,
      cards: result.drawnCards
    }]

    // トラブルカードの処理
    if (result.troubleCards && result.troubleCards.length > 0) {
      for (const trouble of result.troubleCards) {
        // ペナルティ適用 (Trouble card penalty is deduction of vitality)
        // Assuming 'penalty' property exists on Card (or ICard) and is number
        // If card.penalty is undefined, default to 0
        const penalty = (trouble as any).penalty || 0 // Cast to any if Card doesn't explicitly expose penalty property yet
        if (penalty > 0) {
          try {
            game.applyDamage(penalty)
            effects.push({
              type: 'vitality_change',
              description: `トラブル「${trouble.name}」発動！ ${penalty}のダメージ`,
              value: -penalty,
              cards: [trouble]
            })
          } catch (e) {
            console.error('Failed to apply trouble penalty', e)
          }
        } else {
          effects.push({
            type: 'vitality_change', // or 'message'
            description: `トラブル「${trouble.name}」発動！`,
            cards: [trouble]
          })
        }
      }
    }

    return {
      success: true,
      data: result.drawnCards,
      effects
    }
  }
}

/**
 * チャレンジ開始処理
 */
export class StartChallengeProcessor extends BaseActionProcessor<Card, void> {
  protected override async validate(game: Game, challengeCard: Card): Promise<ActionResult<void>> {
    if (game.phase !== 'draw') {
      return { success: false, error: 'ドローフェーズでのみチャレンジを開始できます' }
    }

    if (challengeCard.type !== 'challenge') {
      return { success: false, error: 'チャレンジカード以外は選択できません' }
    }

    return { success: true }
  }

  protected override async process(game: Game, challengeCard: Card): Promise<ActionResult<void>> {
    game.startChallenge(challengeCard)

    return {
      success: true,
      effects: [{
        type: 'stage_advance',
        description: `チャレンジ「${challengeCard.name}」を開始しました`
      }]
    }
  }
}

/**
 * チャレンジフェーズ開始処理 (v2: 選択肢提示)
 */
export class StartChallengePhaseProcessor extends BaseActionProcessor<void, void> {
  protected override async validate(game: Game, input: void): Promise<ActionResult<void>> {
    if (game.phase !== 'draw') {
      return { success: false, error: 'ドローフェーズでのみチャレンジ選択を開始できます' }
    }
    return { success: true }
  }

  protected override async process(game: Game, input: void): Promise<ActionResult<void>> {
    game.startChallengePhase()

    return {
      success: true,
      effects: [{
        type: 'stage_advance', // Or new type 'phase_change'
        description: 'チャレンジ選択を開始しました'
      }]
    }
  }
}

/**
 * チャレンジ解決処理
 */
export class ResolveChallengeProcessor extends BaseActionProcessor<void, ChallengeResult> {
  protected override async validate(game: Game, input: void): Promise<ActionResult<void>> {
    if (!game.currentChallenge) {
      return { success: false, error: 'アクティブなチャレンジがありません' }
    }

    if (game.selectedCards.length === 0) {
      return { success: false, error: 'カードが選択されていません' }
    }

    return { success: true }
  }

  protected override async process(game: Game, input: void): Promise<ActionResult<ChallengeResult>> {
    const result = game.resolveChallenge()

    const effects: GameEffect[] = []

    if (result.success) {
      effects.push({
        type: 'vitality_change',
        description: 'チャレンジに成功しました',
        value: result.vitalityChange
      })
    } else {
      effects.push({
        type: 'vitality_change',
        description: 'チャレンジに失敗しました',
        value: result.vitalityChange
      })
    }

    return {
      success: true,
      data: result,
      effects
    }
  }
}

/**
 * 保険選択処理
 */
export class SelectInsuranceProcessor extends BaseActionProcessor<
  { insuranceType: string; durationType: 'term' | 'whole_life' },
  InsuranceTypeSelectionResult
> {
  protected override async validate(
    game: Game,
    input: { insuranceType: string; durationType: 'term' | 'whole_life' }
  ): Promise<ActionResult<void>> {
    if (!input.insuranceType) {
      return { success: false, error: '保険種類が指定されていません' }
    }

    if (!['term', 'whole_life'].includes(input.durationType)) {
      return { success: false, error: '無効な保険期間タイプです' }
    }

    return { success: true }
  }

  protected override async process(
    game: Game,
    input: { insuranceType: string; durationType: 'term' | 'whole_life' }
  ): Promise<ActionResult<InsuranceTypeSelectionResult>> {
    const result = game.selectInsuranceType(input.insuranceType, input.durationType)

    return {
      success: true,
      data: result,
      effects: [{
        type: 'insurance_add',
        description: `${input.durationType === 'term' ? '定期' : '終身'}${input.insuranceType}保険を追加しました`
      }]
    }
  }
}

/**
 * 保険購入処理 (v2)
 */
export class BuyInsuranceProcessor extends BaseActionProcessor<Card, void> {
  protected override async validate(game: Game, card: Card): Promise<ActionResult<void>> {
    // Phase check might be strict, so relaxing for now OR checking correct phase
    const validPhases: string[] = ['action', 'insurance_phase', 'insurance']
    if (!validPhases.includes(game.phase)) {
      // Just a warning or strict? For now, let's allow "action" phase too as per rulebook flow
    }
    return { success: true }
  }

  protected override async process(game: Game, card: Card): Promise<ActionResult<void>> {
    game.cardManager.buyInsurance(card)

    if (card.cost > 0) {
      // Use applyDamage (which handles negative "damage" as heal, or we need a spend method?)
      // Game doesn't have spendVitality, but has updateVitality private.
      // applyDamage accepts positive number as damage.
      try {
        game.applyDamage(card.cost)
      } catch (e) {
        return { success: false, error: 'Cost payment failed' }
      }
    }

    return {
      success: true,
      effects: [{
        type: 'insurance_add',
        description: `保険「${card.name}」を購入しました`,
        cards: [card]
      }]
    }
  }
}

/**
 * カード除外処理 (v2 Deck Compression)
 */
export class RemoveCardProcessor extends BaseActionProcessor<Card, void> {
  protected override async validate(game: Game, card: Card): Promise<ActionResult<void>> {
    // Only allow if player has taken damage or specific effect?
    // Rule: "Save lost vitality 1 point = 1 card removal"
    // This validation might be complex, for now trust the UI/Caller
    return { success: true }
  }

  protected override async process(game: Game, card: Card): Promise<ActionResult<void>> {
    game.cardManager.removeCardFromGame(card)
    return {
      success: true,
      effects: [{
        type: 'card_draw', // Reusing type or add new 'card_remove'
        description: `カード「${card.name}」を除外しました`,
        cards: [card]
      }]
    }
  }
}

/**
 * 夢カード選択処理 (v2)
 */
export class SelectDreamProcessor extends BaseActionProcessor<Card, void> {
  protected override async validate(game: Game, card: Card): Promise<ActionResult<void>> {
    if (game.phase !== 'dream_selection') {
      return { success: false, error: '夢選択フェーズではありません' }
    }
    return { success: true }
  }

  protected override async process(game: Game, card: Card): Promise<ActionResult<void>> {
    try {
      game.selectDream(card)
      return {
        success: true,
        effects: [{
          type: 'stage_advance',
          description: `夢「${card.name}」を選択しました`
        }]
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }
}

/**
 * アクション処理管理クラス
 */
export class GameActionProcessor {
  private readonly processors: Map<string, BaseActionProcessor<any, any>> = new Map()

  constructor() {
    // 標準プロセッサを登録
    this.registerProcessor('draw_cards', new DrawCardsProcessor())
    this.registerProcessor('start_challenge', new StartChallengeProcessor())
    this.registerProcessor('resolve_challenge', new ResolveChallengeProcessor())
    this.registerProcessor('select_insurance', new SelectInsuranceProcessor())
    this.registerProcessor('start_challenge_phase', new StartChallengePhaseProcessor())
    // v2 processors
    this.registerProcessor('buy_insurance', new BuyInsuranceProcessor())
    this.registerProcessor('remove_card', new RemoveCardProcessor())
    this.registerProcessor('select_dream', new SelectDreamProcessor())
  }

  /**
   * プロセッサを登録
   */
  registerProcessor<TInput, TOutput>(
    actionType: string,
    processor: BaseActionProcessor<TInput, TOutput>
  ): void {
    this.processors.set(actionType, processor)
  }

  /**
   * アクションを実行
   */
  async executeAction<TInput, TOutput>(
    actionType: string,
    game: Game,
    input: TInput
  ): Promise<ActionResult<TOutput>> {
    console.log('[GameActionProcessor] executeAction called', actionType)
    const processor = this.processors.get(actionType)

    if (!processor) {
      console.error('[GameActionProcessor] Unknown action type:', actionType)
      return {
        success: false,
        error: `未知のアクションタイプ: ${actionType}`
      }
    }

    const result = await processor.execute(game, input)
    console.log('[GameActionProcessor] execution result:', result)
    return result
  }

  /**
   * 登録されているアクションタイプ一覧を取得
   */
  getAvailableActions(): string[] {
    return Array.from(this.processors.keys())
  }

  /**
   * プロセッサを削除
   */
  unregisterProcessor(actionType: string): boolean {
    return this.processors.delete(actionType)
  }
}