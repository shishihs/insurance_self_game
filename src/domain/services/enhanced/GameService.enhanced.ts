/**
 * 強化されたGameServiceクラス
 * 
 * Railway Orientedプログラミングと関数型パターンを活用した
 * ゲームロジック処理の改良版実装
 */

import type { GameId, PlayerId, TurnNumber, VitalityValue } from '../../../types/advanced-types'
import { Railway, Result } from '../../../errors/railway'
import { AsyncRailway, fromAsyncOperation } from '../../../errors/async-railway'
import type { Maybe} from '../../../functional/monads';
import { Either, none, some } from '../../../functional/monads'
import { ImmutableList, ImmutableMap } from '../../../functional/immutable'
import { compose, flow, pipe, when } from '../../../functional/composition'
import { 
  ErrorFactory, 
  GameRuleViolationError, 
  InsufficientResourcesError,
  InvalidCardOperationError,
  InvalidGameStateError
} from '../../../errors/error-types'
import { 
  defaultValueStrategy, 
  gameRecoveryStrategies,
  withRecovery 
} from '../../../errors/error-recovery'
import type { EnhancedCard } from '../../entities/enhanced/Card.enhanced'

// ===== ゲーム状態定義 =====

export type GameStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'ABANDONED'
export type GamePhase = 'SETUP' | 'DRAW' | 'PLAY' | 'RESOLVE' | 'END_TURN' | 'GAME_OVER'

export interface GameState {
  readonly id: GameId
  readonly playerId: PlayerId
  readonly status: GameStatus
  readonly phase: GamePhase
  readonly turn: TurnNumber
  readonly vitality: VitalityValue
  readonly maxVitality: VitalityValue
  readonly hand: ImmutableList<EnhancedCard>
  readonly deck: ImmutableList<EnhancedCard>
  readonly discardPile: ImmutableList<EnhancedCard>
  readonly activeCards: ImmutableList<EnhancedCard>
  readonly score: number
  readonly timestamp: Date
}

export interface GameConfig {
  readonly startingVitality: VitalityValue
  readonly maxHandSize: number
  readonly maxTurns: TurnNumber
  readonly difficultyMultiplier: number
}

export interface GameAction {
  readonly type: string
  readonly cardId?: string
  readonly targetId?: string
  readonly parameters?: Record<string, unknown>
}

export interface GameEvent {
  readonly id: string
  readonly type: string
  readonly gameId: GameId
  readonly turn: TurnNumber
  readonly timestamp: Date
  readonly data: Record<string, unknown>
}

// ===== 強化されたGameServiceクラス =====

export class EnhancedGameService {
  private readonly config: GameConfig
  private readonly eventLog: ImmutableList<GameEvent>

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      startingVitality: 100 as VitalityValue,
      maxHandSize: 7,
      maxTurns: 50 as TurnNumber,
      difficultyMultiplier: 1.0,
      ...config
    }
    this.eventLog = ImmutableList.empty()
  }

  // ===== ゲーム開始 =====

  async startGame(playerId: PlayerId, initialDeck: EnhancedCard[]): Promise<Result<GameState>> {
    return AsyncRailway.of(playerId)
      .flatMapAsync(async id => this.validatePlayer(id))
      .flatMapAsync(async () => this.validateDeck(initialDeck))
      .mapAsync(deck => this.createInitialGameState(playerId, deck))
      .flatMapAsync(async state => this.setupGame(state))
      .run()
  }

  private async validatePlayer(playerId: PlayerId): Promise<Result<PlayerId>> {
    // プレイヤーIDのバリデーション
    return Railway.of(playerId)
      .validate(id => id.length > 0, ErrorFactory.validation('playerId', 'プレイヤーIDは必須です'))
      .validate(id => id.startsWith('player_'), ErrorFactory.validation('playerId', 'プレイヤーIDの形式が正しくありません'))
      .run()
  }

  private async validateDeck(deck: EnhancedCard[]): Promise<Result<ImmutableList<EnhancedCard>>> {
    return Railway.of(deck)
      .validate(cards => cards.length >= 20, ErrorFactory.validation('deck', 'デッキは最低20枚必要です'))
      .validate(cards => cards.length <= 60, ErrorFactory.validation('deck', 'デッキは最大60枚までです'))
      .map(cards => ImmutableList.from(cards))
      .run()
  }

  private createInitialGameState(playerId: PlayerId, deck: ImmutableList<EnhancedCard>): GameState {
    const gameId = this.generateGameId()
    const shuffledDeck = this.shuffleDeck(deck)
    const initialHand = shuffledDeck.take(5)
    const remainingDeck = shuffledDeck.drop(5)

    return {
      id: gameId,
      playerId,
      status: 'NOT_STARTED',
      phase: 'SETUP',
      turn: 1 as TurnNumber,
      vitality: this.config.startingVitality,
      maxVitality: this.config.startingVitality,
      hand: initialHand,
      deck: remainingDeck,
      discardPile: ImmutableList.empty(),
      activeCards: ImmutableList.empty(),
      score: 0,
      timestamp: new Date()
    }
  }

  private async setupGame(state: GameState): Promise<Result<GameState>> {
    return Railway.of(state)
      .map(s => ({ ...s, status: 'IN_PROGRESS' as const, phase: 'DRAW' as const }))
      .tee(s => { this.logEvent('GAME_STARTED', s.id, { playerId: s.playerId }); })
      .run()
  }

  // ===== ターン処理 =====

  async processTurn(
    gameState: GameState,
    action: GameAction
  ): Promise<Result<GameState>> {
    return pipe(gameState)
      .pipe(state => this.validateGameState(state))
      .pipe(state => this.processAction(state, action))
      .pipe(state => this.applyEffects(state))
      .pipe(state => this.checkEndConditions(state))
      .pipe(result => this.handleResult(result))
      .unwrap()
  }

  private validateGameState(state: GameState): Result<GameState> {
    return Railway.of(state)
      .validate(s => s.status === 'IN_PROGRESS', new InvalidGameStateError(s.status, 'IN_PROGRESS'))
      .validate(s => s.vitality > 0, new GameRuleViolationError('vitality', 'プレイヤーの体力が0以下です'))
      .validate(s => s.turn <= this.config.maxTurns, new GameRuleViolationError('maxTurns', '最大ターン数を超えています'))
      .run()
  }

  private processAction(state: GameState, action: GameAction): Result<GameState> {
    const actionProcessors: Record<string, (state: GameState, action: GameAction) => Result<GameState>> = {
      'PLAY_CARD': (s, a) => this.playCard(s, a.cardId!),
      'DRAW_CARD': (s, _) => this.drawCard(s),
      'END_TURN': (s, _) => this.endTurn(s),
      'USE_SKILL': (s, a) => this.useSkill(s, a.cardId!, a.targetId),
      'DISCARD_CARD': (s, a) => this.discardCard(s, a.cardId!)
    }

    const processor = actionProcessors[action.type]
    if (!processor) {
      return Result.err(ErrorFactory.validation('action', `未知のアクション: ${action.type}`))
    }

    return withRecovery(
      () => processor(state, action),
      gameRecoveryStrategies.gameStateRecovery(() => state)
    )
  }

  // ===== カード操作 =====

  private playCard(state: GameState, cardId: string): Result<GameState> {
    return Railway.of(state)
      .bind(s => this.findCardInHand(s, cardId))
      .bind(({ state: s, card }) => this.validateCardPlay(s, card))
      .bind(({ state: s, card }) => this.executeCardEffect(s, card))
      .bind(s => this.moveCardToActive(s, cardId))
      .run()
  }

  private findCardInHand(
    state: GameState, 
    cardId: string
  ): Result<{ state: GameState; card: EnhancedCard }> {
    const cardMaybe = state.hand.find(card => card.id === cardId)
    
    return cardMaybe.isSome()
      ? Result.ok({ state, card: cardMaybe.value })
      : Result.err(new InvalidCardOperationError('play', cardId, 'カードが手札にありません'))
  }

  private validateCardPlay(
    state: GameState, 
    card: EnhancedCard
  ): Result<{ state: GameState; card: EnhancedCard }> {
    return Railway.of({ state, card })
      .validate(
        ({ state: s, card: c }) => s.hand.size() > 0,
        new GameRuleViolationError('hand', '手札が空です')
      )
      .validate(
        ({ state: s, card: c }) => c.cost <= s.vitality,
        new InsufficientResourcesError('vitality', card.cost, state.vitality)
      )
      .run()
  }

  private executeCardEffect(
    state: GameState, 
    card: EnhancedCard
  ): Result<GameState> {
    const effectHandlers: Record<string, (state: GameState, card: EnhancedCard) => Result<GameState>> = {
      'HEAL': (s, c) => this.applyHeal(s, c.power),
      'DAMAGE': (s, c) => this.applyDamage(s, c.power),
      'DRAW': (s, c) => this.drawCards(s, c.power),
      'BOOST': (s, c) => this.boostVitality(s, c.power)
    }

    return card.effects.reduce(
      (resultState: Result<GameState>, effect) => {
        return resultState.flatMap(s => {
          const handler = effectHandlers[effect.type]
          return handler ? handler(s, card) : Result.ok(s)
        })
      },
      Result.ok(state)
    )
  }

  private moveCardToActive(state: GameState, cardId: string): Result<GameState> {
    const card = state.hand.find(c => c.id === cardId)
    if (card.isNone()) {
      return Result.err(new InvalidCardOperationError('move', cardId, 'カードが見つかりません'))
    }

    const newHand = state.hand.filter(c => c.id !== cardId)
    const newActiveCards = state.activeCards.append(card.value)

    return Result.ok({
      ...state,
      hand: newHand,
      activeCards: newActiveCards,
      vitality: Math.max(0, state.vitality - card.value.cost) as VitalityValue
    })
  }

  // ===== 効果処理 =====

  private applyHeal(state: GameState, amount: number): Result<GameState> {
    const newVitality = Math.min(state.maxVitality, state.vitality + amount) as VitalityValue
    return Result.ok({ ...state, vitality: newVitality })
  }

  private applyDamage(state: GameState, amount: number): Result<GameState> {
    const newVitality = Math.max(0, state.vitality - amount) as VitalityValue
    return Result.ok({ ...state, vitality: newVitality })
  }

  private drawCards(state: GameState, count: number): Result<GameState> {
    if (state.deck.size() < count) {
      // デッキが足りない場合は捨て札をシャッフルして補充
      return this.reshuffleDeck(state).flatMap(newState => this.drawCards(newState, count))
    }

    const cardsToDraw = state.deck.take(count)
    const remainingDeck = state.deck.drop(count)
    const newHand = state.hand.concat(cardsToDraw)

    // 手札制限チェック
    if (newHand.size() > this.config.maxHandSize) {
      return Result.err(new GameRuleViolationError('handSize', '手札の上限を超えています'))
    }

    return Result.ok({
      ...state,
      hand: newHand,
      deck: remainingDeck
    })
  }

  private boostVitality(state: GameState, amount: number): Result<GameState> {
    const newMaxVitality = state.maxVitality + amount as VitalityValue
    const newVitality = state.vitality + amount as VitalityValue
    
    return Result.ok({
      ...state,
      vitality: newVitality,
      maxVitality: newMaxVitality
    })
  }

  // ===== ターン終了処理 =====

  private endTurn(state: GameState): Result<GameState> {
    return flow(
      this.processActiveCards,
      this.updateTurnCounter,
      this.resetPhase
    )(state)
  }

  private readonly processActiveCards = (state: GameState): Result<GameState> => {
    // アクティブカードの効果処理と破棄
    const expiredCards = state.activeCards.filter(card => this.shouldExpireCard(card))
    const remainingCards = state.activeCards.filter(card => !this.shouldExpireCard(card))
    const newDiscardPile = state.discardPile.concat(expiredCards)

    return Result.ok({
      ...state,
      activeCards: remainingCards,
      discardPile: newDiscardPile
    })
  }

  private readonly updateTurnCounter = (state: GameState): Result<GameState> => {
    const nextTurn = (state.turn + 1) as TurnNumber
    return Result.ok({ ...state, turn: nextTurn })
  }

  private readonly resetPhase = (state: GameState): Result<GameState> => {
    return Result.ok({ ...state, phase: 'DRAW' as const })
  }

  // ===== 終了条件チェック =====

  private checkEndConditions(state: GameState): Result<GameState> {
    return when(
      this.isGameEnded(state),
      () => Railway.of({ ...state, status: 'COMPLETED' as const, phase: 'GAME_OVER' as const }),
      () => Railway.of(state)
    ).run()
  }

  private isGameEnded(state: GameState): boolean {
    return state.vitality <= 0 || 
           state.turn >= this.config.maxTurns ||
           (state.deck.isEmpty() && state.hand.isEmpty())
  }

  // ===== ユーティリティメソッド =====

  private shuffleDeck(deck: ImmutableList<EnhancedCard>): ImmutableList<EnhancedCard> {
    const shuffled = deck.toArray()
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
    }
    return ImmutableList.from(shuffled)
  }

  private reshuffleDeck(state: GameState): Result<GameState> {
    if (state.discardPile.isEmpty()) {
      return Result.err(new GameRuleViolationError('deck', 'デッキと捨て札の両方が空です'))
    }

    const newDeck = this.shuffleDeck(state.discardPile)
    return Result.ok({
      ...state,
      deck: newDeck,
      discardPile: ImmutableList.empty()
    })
  }

  private shouldExpireCard(card: EnhancedCard): boolean {
    // カードの有効期限チェックロジック
    return card.effects.some(effect => effect.duration === 1)
  }

  private generateGameId(): GameId {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as GameId
  }

  private logEvent(eventType: string, gameId: GameId, data: Record<string, unknown>): void {
    const event: GameEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      gameId,
      turn: 0 as TurnNumber, // Will be set properly in actual implementation
      timestamp: new Date(),
      data
    }

    // イベントログに追加（実際の実装では永続化）
    console.log(`Game Event: ${eventType}`, event)
  }

  private handleResult(result: Result<GameState>): Result<GameState> {
    return result.mapErr(error => {
      this.logEvent('ERROR', 'unknown' as GameId, { error: error.message })
      return error
    })
  }

  private drawCard(state: GameState): Result<GameState> {
    return this.drawCards(state, 1)
  }

  private discardCard(state: GameState, cardId: string): Result<GameState> {
    const card = state.hand.find(c => c.id === cardId)
    if (card.isNone()) {
      return Result.err(new InvalidCardOperationError('discard', cardId, 'カードが手札にありません'))
    }

    const newHand = state.hand.filter(c => c.id !== cardId)
    const newDiscardPile = state.discardPile.append(card.value)

    return Result.ok({
      ...state,
      hand: newHand,
      discardPile: newDiscardPile
    })
  }

  private useSkill(state: GameState, cardId: string, targetId?: string): Result<GameState> {
    // スキル使用ロジック（実装省略）
    return Result.ok(state)
  }

  // ===== 公開インターフェース =====

  async getGameState(gameId: GameId): Promise<Maybe<GameState>> {
    // ゲーム状態の取得（実際の実装では永続化層から取得）
    return none() // プレースホルダー
  }

  async saveGameState(state: GameState): Promise<Result<void>> {
    // ゲーム状態の保存（実際の実装では永続化層に保存）
    return Result.ok(undefined)
  }

  getEventLog(): ImmutableList<GameEvent> {
    return this.eventLog
  }

  calculateScore(state: GameState): number {
    // スコア計算ロジック
    const baseScore = state.vitality * 10
    const turnBonus = Math.max(0, this.config.maxTurns - state.turn) * 5
    const cardBonus = state.activeCards.size() * 20

    return baseScore + turnBonus + cardBonus
  }
}