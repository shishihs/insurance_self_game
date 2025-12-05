import type { Card } from '../entities/Card'
import type { ChallengeResult, InsuranceTypeSelectionResult, TurnResult } from '../types/game.types'
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
  protected async validate(game: Game, count: number): Promise<ActionResult<void>> {
    if (count <= 0) {
      return { success: false, error: 'ドロー枚数は1以上である必要があります' }
    }

    if (count > 10) {
      return { success: false, error: 'ドロー枚数は10枚以下である必要があります' }
    }

    return { success: true }
  }

  protected async process(game: Game, count: number): Promise<ActionResult<Card[]>> {
    // CardManagerから直接カードをドロー
    const result = game.cardManager.drawCards(count)

    // ドロー完了後、チャレンジフェーズへ移行するか、次のアクションを促す
    // ここではシンプルに、ドロー後はチャレンジフェーズへ移行するロジックを追加
    // ただし、Gameクラスにフェーズ変更メソッドが必要
    // Game.tsのchangePhaseはpublicではない可能性があるため、確認が必要だが
    // GameActionProcessorはGameの内部ロジックの一部として機能するため、
    // Gameクラスに `completeDrawPhase()` のようなメソッドを追加するのが理想的。
    game.completeDrawPhase() // ドローフェーズ完了処理を呼び出す

    return {
      success: true,
      data: result.drawnCards,
      effects: [
        {
          type: 'card_draw',
          description: `${count}枚のカードをドローしました`,
          cards: result.drawnCards
        },
        {
          type: 'stage_advance', // フェーズ変更を通知
          description: 'チャレンジフェーズへ移行しました'
        }
      ]
    }
  }
}

/**
 * チャレンジ開始処理
 */
export class StartChallengeProcessor extends BaseActionProcessor<Card, void> {
  protected async validate(game: Game, challengeCard: Card): Promise<ActionResult<void>> {
    if (game.phase !== 'draw') {
      return { success: false, error: 'ドローフェーズでのみチャレンジを開始できます' }
    }

    if (challengeCard.type !== 'challenge') {
      return { success: false, error: 'チャレンジカード以外は選択できません' }
    }

    return { success: true }
  }

  protected async process(game: Game, challengeCard: Card): Promise<ActionResult<void>> {
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
 * チャレンジ解決処理
 */
export class ResolveChallengeProcessor extends BaseActionProcessor<void, ChallengeResult> {
  protected async validate(game: Game, input: void): Promise<ActionResult<void>> {
    if (!game.currentChallenge) {
      return { success: false, error: 'アクティブなチャレンジがありません' }
    }

    if (game.selectedCards.length === 0) {
      return { success: false, error: 'カードが選択されていません' }
    }

    return { success: true }
  }

  protected async process(game: Game, input: void): Promise<ActionResult<ChallengeResult>> {
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
  protected async validate(
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

  protected async process(
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