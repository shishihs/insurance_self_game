import { Card } from '@/domain/entities/Card'
import { Game } from '@/domain/entities/Game'
import type { CardType } from '@/domain/types/card.types'

/**
 * バリデーター関数の型定義
 */
export type DropZoneValidator = (card: Card, game: Game) => boolean

/**
 * アクション関数の型定義
 */
export type DropZoneAction = (card: Card, game: Game) => void

/**
 * ドロップゾーンバリデーターのユーティリティクラス
 */
export class DropZoneValidators {
  /**
   * カードタイプのみを許可するバリデーター
   */
  static cardTypeOnly(allowedTypes: CardType[]): DropZoneValidator {
    return (card: Card) => allowedTypes.includes(card.type)
  }

  /**
   * 特定の段階でのみ許可するバリデーター
   */
  static phaseOnly(allowedPhases: string[]): DropZoneValidator {
    return (card: Card, game: Game) => {
      const currentPhase = game.getCurrentPhase?.() || 'unknown'
      return allowedPhases.includes(currentPhase)
    }
  }

  /**
   * 最小パワー要件のバリデーター
   */
  static minimumPower(minPower: number): DropZoneValidator {
    return (card: Card) => card.power >= minPower
  }

  /**
   * 最大パワー制限のバリデーター
   */
  static maximumPower(maxPower: number): DropZoneValidator {
    return (card: Card) => card.power <= maxPower
  }

  /**
   * コスト制限のバリデーター
   */
  static costLimit(maxCost: number): DropZoneValidator {
    return (card: Card) => card.cost <= maxCost
  }

  /**
   * 現在の活力チェックのバリデーター
   */
  static vitalityCheck(requiredVitality: number): DropZoneValidator {
    return (card: Card, game: Game) => game.vitality >= requiredVitality
  }

  /**
   * チャレンジ中でないことをチェック
   */
  static notInChallenge(): DropZoneValidator {
    return (card: Card, game: Game) => !game.currentChallenge
  }

  /**
   * チャレンジ中であることをチェック
   */
  static inChallenge(): DropZoneValidator {
    return (card: Card, game: Game) => !!game.currentChallenge
  }

  /**
   * 手札に余裕があることをチェック
   */
  static handSpaceAvailable(): DropZoneValidator {
    return (card: Card, game: Game) => {
      const currentHandSize = game.playerHand?.size() || 0
      const maxHandSize = game.maxHandSize || 7
      return currentHandSize < maxHandSize
    }
  }

  /**
   * カードが手札にあることをチェック
   */
  static cardInHand(): DropZoneValidator {
    return (card: Card, game: Game) => {
      return game.playerHand?.contains(card.id) || false
    }
  }

  /**
   * ステージ制限のバリデーター
   */
  static stageOnly(allowedStages: number[]): DropZoneValidator {
    return (card: Card, game: Game) => allowedStages.includes(game.stage)
  }

  /**
   * 年齢制限のバリデーター
   */
  static ageRange(minAge: number, maxAge: number): DropZoneValidator {
    return (card: Card, game: Game) => {
      const age = game.getPlayerAge?.() || 20
      return age >= minAge && age <= maxAge
    }
  }

  /**
   * カスタムバリデーター
   */
  static custom(validator: DropZoneValidator): DropZoneValidator {
    return validator
  }

  /**
   * 複数のバリデーターを組み合わせる（AND条件）
   */
  static combine(...validators: DropZoneValidator[]): DropZoneValidator {
    return (card: Card, game: Game) => {
      return validators.every(validator => validator(card, game))
    }
  }

  /**
   * 複数のバリデーターのいずれかを満たす（OR条件）
   */
  static either(...validators: DropZoneValidator[]): DropZoneValidator {
    return (card: Card, game: Game) => {
      return validators.some(validator => validator(card, game))
    }
  }

  /**
   * バリデーターを否定する（NOT条件）
   */
  static not(validator: DropZoneValidator): DropZoneValidator {
    return (card: Card, game: Game) => !validator(card, game)
  }

  /**
   * 条件付きバリデーター
   */
  static conditional(
    condition: DropZoneValidator,
    thenValidator: DropZoneValidator,
    elseValidator?: DropZoneValidator
  ): DropZoneValidator {
    return (card: Card, game: Game) => {
      if (condition(card, game)) {
        return thenValidator(card, game)
      } else if (elseValidator) {
        return elseValidator(card, game)
      }
      return true
    }
  }

  /**
   * 常に許可
   */
  static always(): DropZoneValidator {
    return () => true
  }

  /**
   * 常に拒否
   */
  static never(): DropZoneValidator {
    return () => false
  }
}

/**
 * ドロップゾーンアクションのユーティリティクラス
 */
export class DropZoneActions {
  /**
   * チャレンジを開始するアクション
   */
  static startChallenge(): DropZoneAction {
    return (card: Card, game: Game) => {
      if (!game.currentChallenge) {
        game.startChallenge(card)
      }
    }
  }

  /**
   * カードを捨て札に送るアクション
   */
  static discardCard(): DropZoneAction {
    return (card: Card, game: Game) => {
      game.playerHand?.removeCard(card.id)
      game.discardPile?.addCard(card)
    }
  }

  /**
   * カードをデッキに戻すアクション
   */
  static returnToDeck(shuffle = false): DropZoneAction {
    return (card: Card, game: Game) => {
      game.playerHand?.removeCard(card.id)
      game.playerDeck?.addCard(card)
      if (shuffle) {
        game.playerDeck?.shuffle()
      }
    }
  }

  /**
   * 活力を消費するアクション
   */
  static consumeVitality(amount: number): DropZoneAction {
    return (card: Card, game: Game) => {
      game.vitality = Math.max(0, game.vitality - amount)
    }
  }

  /**
   * 活力を回復するアクション
   */
  static restoreVitality(amount: number): DropZoneAction {
    return (card: Card, game: Game) => {
      const maxVitality = game.maxVitality || 20
      game.vitality = Math.min(maxVitality, game.vitality + amount)
    }
  }

  /**
   * カードをプレイするアクション
   */
  static playCard(): DropZoneAction {
    return (card: Card, game: Game) => {
      // カードの効果を適用
      if (card.type === 'life' && card.power > 0) {
        game.vitality = Math.min(game.maxVitality || 20, game.vitality + card.power)
      }
      
      // 手札から削除
      game.playerHand?.removeCard(card.id)
      
      // プレイエリアに追加（実装によって異なる）
      game.playedCards?.addCard(card)
    }
  }

  /**
   * 特殊効果を発動するアクション
   */
  static triggerSpecialEffect(effectName: string): DropZoneAction {
    return (card: Card, game: Game) => {
      // 特殊効果の実装（ゲーム固有）
      console.log(`Triggering special effect: ${effectName} for card ${card.name}`)
      
      // 例：保険カードの効果
      if (card.type === 'insurance') {
        // 保険効果の適用ロジック
      }
    }
  }

  /**
   * ログを出力するアクション
   */
  static log(message: string): DropZoneAction {
    return (card: Card, game: Game) => {
      console.log(`[DropZone] ${message}`, { card: card.name, gameState: game.stage })
    }
  }

  /**
   * 複数のアクションを順次実行
   */
  static sequence(...actions: DropZoneAction[]): DropZoneAction {
    return (card: Card, game: Game) => {
      actions.forEach(action => action(card, game))
    }
  }

  /**
   * 条件付きアクション
   */
  static conditional(
    condition: DropZoneValidator,
    thenAction: DropZoneAction,
    elseAction?: DropZoneAction
  ): DropZoneAction {
    return (card: Card, game: Game) => {
      if (condition(card, game)) {
        thenAction(card, game)
      } else if (elseAction) {
        elseAction(card, game)
      }
    }
  }

  /**
   * カスタムアクション
   */
  static custom(action: DropZoneAction): DropZoneAction {
    return action
  }

  /**
   * 何もしないアクション
   */
  static noop(): DropZoneAction {
    return () => {}
  }

  /**
   * エラーをスローするアクション（デバッグ用）
   */
  static throwError(message: string): DropZoneAction {
    return () => {
      throw new Error(message)
    }
  }
}

/**
 * よく使用されるバリデーター・アクションの組み合わせ
 */
export class DropZonePresets {
  /**
   * チャレンジゾーンの設定
   */
  static challengeZone() {
    return {
      validator: DropZoneValidators.combine(
        DropZoneValidators.cardTypeOnly(['life']),
        DropZoneValidators.notInChallenge(),
        DropZoneValidators.cardInHand()
      ),
      action: DropZoneActions.sequence(
        DropZoneActions.log('Starting challenge'),
        DropZoneActions.startChallenge()
      )
    }
  }

  /**
   * 捨て札ゾーンの設定
   */
  static discardZone() {
    return {
      validator: DropZoneValidators.combine(
        DropZoneValidators.cardInHand(),
        DropZoneValidators.not(DropZoneValidators.inChallenge())
      ),
      action: DropZoneActions.sequence(
        DropZoneActions.log('Discarding card'),
        DropZoneActions.discardCard()
      )
    }
  }

  /**
   * 保険プレイゾーンの設定
   */
  static insurancePlayZone() {
    return {
      validator: DropZoneValidators.combine(
        DropZoneValidators.cardTypeOnly(['insurance']),
        DropZoneValidators.cardInHand(),
        DropZoneValidators.vitalityCheck(1)
      ),
      action: DropZoneActions.sequence(
        DropZoneActions.log('Playing insurance card'),
        DropZoneActions.playCard(),
        DropZoneActions.consumeVitality(1)
      )
    }
  }

  /**
   * 特殊能力ゾーンの設定
   */
  static specialAbilityZone(requiredCardType: CardType, vitalityCost: number) {
    return {
      validator: DropZoneValidators.combine(
        DropZoneValidators.cardTypeOnly([requiredCardType]),
        DropZoneValidators.vitalityCheck(vitalityCost),
        DropZoneValidators.cardInHand()
      ),
      action: DropZoneActions.sequence(
        DropZoneActions.log(`Using special ability (cost: ${vitalityCost})`),
        DropZoneActions.consumeVitality(vitalityCost),
        DropZoneActions.triggerSpecialEffect('special-ability'),
        DropZoneActions.discardCard()
      )
    }
  }
}