import type { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import type { GamePhase } from '@/domain/types/game.types'
import { IdGenerator } from '../../common/IdGenerator'

/**
 * ゲームコマンドの基底インターフェース
 * Command Patternの実装
 */
export interface GameCommand {
  readonly id: string
  readonly timestamp: Date
  readonly description: string
  readonly canUndo: boolean
  readonly category: CommandCategory
  
  /**
   * コマンドを実行
   */
  execute(game: Game): Promise<void>
  
  /**
   * コマンドを元に戻す
   */
  undo(game: Game): Promise<void>
  
  /**
   * コマンドの妥当性をチェック
   */
  isValid(game: Game): boolean
  
  /**
   * コマンドが他のコマンドと結合可能かチェック
   */
  canMergeWith(other: GameCommand): boolean
  
  /**
   * 他のコマンドと結合
   */
  mergeWith(other: GameCommand): GameCommand
}

/**
 * コマンドのカテゴリ
 */
export type CommandCategory = 
  | 'card_selection'    // カード選択関連
  | 'challenge'         // チャレンジ関連
  | 'insurance'         // 保険関連
  | 'turn_progression'  // ターン進行
  | 'system'           // システム関連

/**
 * 基底コマンドクラス
 */
export abstract class BaseGameCommand implements GameCommand {
  readonly id: string
  readonly timestamp: Date
  readonly canUndo: boolean = true
  
  constructor(
    public readonly description: string,
    public readonly category: CommandCategory,
    canUndo: boolean = true
  ) {
    this.id = this.generateId()
    this.timestamp = new Date()
    this.canUndo = canUndo
  }
  
  abstract execute(game: Game): Promise<void>
  abstract undo(game: Game): Promise<void>
  
  isValid(game: Game): boolean {
    return game.isInProgress()
  }
  
  canMergeWith(other: GameCommand): boolean {
    return false // デフォルトでは結合しない
  }
  
  mergeWith(other: GameCommand): GameCommand {
    throw new Error('このコマンドは結合をサポートしていません')
  }
  
  private generateId(): string {
    return IdGenerator.generateCommandId()
  }
}

/**
 * カード選択コマンド
 */
export class CardSelectionCommand extends BaseGameCommand {
  private previousSelection: Card[] = []
  
  constructor(
    private readonly cardToToggle: Card,
    private readonly selectAction: boolean // true: 選択, false: 選択解除
  ) {
    super(
      `カード「${cardToToggle.name}」を${selectAction ? '選択' : '選択解除'}`,
      'card_selection'
    )
  }
  
  async execute(game: Game): Promise<void> {
    // 現在の選択状態を保存
    this.previousSelection = [...game.selectedCards]
    
    // カードの選択状態を切り替え
    game.toggleCardSelection(this.cardToToggle)
  }
  
  async undo(game: Game): Promise<void> {
    // 選択状態を元に戻す
    // まず全選択を解除
    game.selectedCards.forEach(card => {
      game.toggleCardSelection(card)
    })
    
    // 前の選択状態を復元
    this.previousSelection.forEach(card => {
      if (!game.selectedCards.includes(card)) {
        game.toggleCardSelection(card)
      }
    })
  }
  
  canMergeWith(other: GameCommand): boolean {
    return other instanceof CardSelectionCommand &&
           other.cardToToggle.id === this.cardToToggle.id &&
           Math.abs(other.timestamp.getTime() - this.timestamp.getTime()) < 1000 // 1秒以内
  }
  
  mergeWith(other: GameCommand): GameCommand {
    if (!this.canMergeWith(other)) {
      throw new Error('このコマンドとは結合できません')
    }
    
    const otherCmd = other as CardSelectionCommand
    
    // 同じカードの連続した選択/選択解除は相殺
    if (this.selectAction !== otherCmd.selectAction) {
      return new NoOpCommand('カード選択の相殺')
    }
    
    // 同じアクションの場合は後の方を使用
    return otherCmd
  }
}

/**
 * チャレンジ実行コマンド
 */
export class ChallengeCommand extends BaseGameCommand {
  private previousState: {
    phase: GamePhase
    vitality: number
    selectedCards: Card[]
    currentChallenge?: Card
    turn: number
  } | null = null
  
  constructor(
    private readonly challengeCard: Card
  ) {
    super(
      `チャレンジ「${challengeCard.name}」を実行`,
      'challenge',
      false // チャレンジは通常Undo不可
    )
  }
  
  async execute(game: Game): Promise<void> {
    // 状態を保存（デバッグ用）
    this.previousState = {
      phase: game.phase,
      vitality: game.vitality,
      selectedCards: [...game.selectedCards],
      currentChallenge: game.currentChallenge,
      turn: game.turn
    }
    
    // チャレンジを開始
    game.startChallenge(this.challengeCard)
    
    // チャレンジを解決
    const result = game.resolveChallenge()
    
    console.log(`チャレンジ結果: ${result.success ? '成功' : '失敗'}`)
  }
  
  async undo(game: Game): Promise<void> {
    throw new Error('チャレンジコマンドはUndo不可です')
  }
  
  isValid(game: Game): boolean {
    return super.isValid(game) && 
           game.phase === 'draw' && 
           game.selectedCards.length > 0
  }
}

/**
 * 保険購入コマンド
 */
export class InsurancePurchaseCommand extends BaseGameCommand {
  private wasAdded = false
  
  constructor(
    private readonly insuranceType: string,
    private readonly durationType: 'term' | 'whole_life'
  ) {
    super(
      `保険「${insuranceType}」(${durationType === 'term' ? '定期' : '終身'})を購入`,
      'insurance'
    )
  }
  
  async execute(game: Game): Promise<void> {
    const result = game.selectInsuranceType(this.insuranceType, this.durationType)
    this.wasAdded = result.success
    
    if (!result.success) {
      throw new Error(`保険購入に失敗: ${result.message}`)
    }
  }
  
  async undo(game: Game): Promise<void> {
    if (!this.wasAdded) return
    
    // 最後に追加された保険を削除
    const lastInsurance = game.insuranceCards[game.insuranceCards.length - 1]
    if (lastInsurance && lastInsurance.insuranceType === this.insuranceType) {
      game.insuranceCards.pop()
      
      // プレイヤーデッキからも削除
      const playerDeck = game.playerDeck
      const cards = playerDeck.cards
      const cardIndex = cards.findIndex(card => card.id === lastInsurance.id)
      if (cardIndex !== -1) {
        cards.splice(cardIndex, 1)
      }
      
      // 統計を調整
      game.stats.cardsAcquired = Math.max(0, game.stats.cardsAcquired - 1)
    }
  }
  
  isValid(game: Game): boolean {
    return super.isValid(game) && 
           game.phase === 'insurance_type_selection' &&
           game.currentInsuranceTypeChoices !== undefined
  }
}

/**
 * ターン進行コマンド
 */
export class NextTurnCommand extends BaseGameCommand {
  private previousState: {
    turn: number
    phase: GamePhase
    handSize: number
    insuranceCount: number
  } | null = null
  
  constructor() {
    super('次のターンへ進行', 'turn_progression', false)
  }
  
  async execute(game: Game): Promise<void> {
    // 状態を保存
    this.previousState = {
      turn: game.turn,
      phase: game.phase,
      handSize: game.hand.length,
      insuranceCount: game.insuranceCards.length
    }
    
    // ターン進行
    const result = game.nextTurn()
    
    console.log(`ターン ${game.turn} に進行。期限切れ保険: ${result.newExpiredCount}件`)
  }
  
  async undo(game: Game): Promise<void> {
    throw new Error('ターン進行コマンドはUndo不可です')
  }
  
  isValid(game: Game): boolean {
    return super.isValid(game) && game.phase === 'resolution'
  }
}

/**
 * 何もしないコマンド（コマンド結合時の相殺用）
 */
export class NoOpCommand extends BaseGameCommand {
  constructor(description: string) {
    super(description, 'system')
  }
  
  async execute(game: Game): Promise<void> {
    // 何もしない
  }
  
  async undo(game: Game): Promise<void> {
    // 何もしない
  }
}

/**
 * 複合コマンド（複数のコマンドをまとめて実行）
 */
export class CompositeCommand extends BaseGameCommand {
  constructor(
    private readonly commands: GameCommand[],
    description?: string
  ) {
    super(
      description || `${commands.length}個のコマンドを実行`,
      'system'
    )
  }
  
  async execute(game: Game): Promise<void> {
    for (const command of this.commands) {
      await command.execute(game)
    }
  }
  
  async undo(game: Game): Promise<void> {
    // 逆順でUndo実行
    for (let i = this.commands.length - 1; i >= 0; i--) {
      if (this.commands[i].canUndo) {
        await this.commands[i].undo(game)
      }
    }
  }
  
  isValid(game: Game): boolean {
    return this.commands.every(cmd => cmd.isValid(game))
  }
}

/**
 * スナップショットコマンド（特定時点の状態を保存）
 */
export class SnapshotCommand extends BaseGameCommand {
  private snapshot: any = null
  
  constructor(description: string) {
    super(description, 'system', false)
  }
  
  async execute(game: Game): Promise<void> {
    this.snapshot = game.getSnapshot()
  }
  
  async undo(game: Game): Promise<void> {
    throw new Error('スナップショットコマンドはUndo不可です')
  }
  
  getSnapshot(): any {
    return this.snapshot
  }
}