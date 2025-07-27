import type { Card } from '../../domain/entities/Card'
import type { Game } from '../../domain/entities/Game'

/**
 * バリデーション結果インターフェース
 */
export interface ValidationResult {
  isValid: boolean
  reason?: string
  suggestion?: string
}

/**
 * カスタムバリデーター関数の型定義
 */
export type DropZoneValidator = (card: Card, game: Game) => ValidationResult

/**
 * 一般的なドロップゾーンバリデーター関数群
 * 再利用可能で組み合わせ可能な設計
 */
export class DropZoneValidators {
  
  /**
   * チャレンジエリア用バリデーター
   */
  static challengeArea(): DropZoneValidator {
    return (card: Card, game: Game): ValidationResult => {
      // チャレンジが開始されているかチェック
      if (!game.currentChallenge) {
        return {
          isValid: false,
          reason: 'No active challenge',
          suggestion: 'Start a challenge first'
        }
      }

      // すでにチャレンジカードが配置されているかチェック
      if (game.currentChallenge.isCardPlaced) {
        return {
          isValid: false,
          reason: 'Challenge card already placed',
          suggestion: 'Complete current challenge or place card elsewhere'
        }
      }

      // カードタイプのチェック（基本的には全カード受け入れ可能）
      return { isValid: true }
    }
  }

  /**
   * 捨て札エリア用バリデーター
   */
  static discardArea(): DropZoneValidator {
    return (card: Card, game: Game): ValidationResult => {
      // 捨て札は基本的に常に有効
      // ただし、特殊な状況下では制限する可能性がある
      
      // 例：チュートリアル中は特定のカードのみ捨て札可能
      if (game.config.tutorialEnabled && game.phase === 'tutorial') {
        // チュートリアル固有のロジックをここに追加
      }

      return { isValid: true }
    }
  }

  /**
   * 保険エリア用バリデーター
   */
  static insuranceArea(): DropZoneValidator {
    return (card: Card, game: Game): ValidationResult => {
      // 保険カードのみ受け入れ
      if (card.type !== 'insurance') {
        return {
          isValid: false,
          reason: 'Only insurance cards allowed',
          suggestion: 'Use insurance cards for this area'
        }
      }

      // ゲームフェーズのチェック
      if (game.phase !== 'purchase' && game.phase !== 'renewal') {
        return {
          isValid: false,
          reason: 'Insurance purchase not available in current phase',
          suggestion: 'Wait for insurance purchase phase'
        }
      }

      // 重複チェック（同じ保険カードを複数購入できない場合）
      const existingInsurance = game.insuranceCards.find(
        existing => existing.id === card.id
      )
      if (existingInsurance) {
        return {
          isValid: false,
          reason: 'Insurance already purchased',
          suggestion: 'Choose a different insurance'
        }
      }

      return { isValid: true }
    }
  }

  /**
   * カードタイプ制限バリデーター
   */
  static cardTypeOnly(allowedTypes: string[]): DropZoneValidator {
    return (card: Card, game: Game): ValidationResult => {
      if (!allowedTypes.includes(card.type)) {
        return {
          isValid: false,
          reason: `Only ${allowedTypes.join(', ')} cards allowed`,
          suggestion: `Use a ${allowedTypes[0]} card instead`
        }
      }
      return { isValid: true }
    }
  }

  /**
   * ゲームフェーズ制限バリデーター
   */
  static phaseOnly(allowedPhases: string[]): DropZoneValidator {
    return (card: Card, game: Game): ValidationResult => {
      if (!allowedPhases.includes(game.phase)) {
        return {
          isValid: false,
          reason: `Not available in ${game.phase} phase`,
          suggestion: `Wait for ${allowedPhases[0]} phase`
        }
      }
      return { isValid: true }
    }
  }

  /**
   * カスタムロジックバリデーター
   */
  static custom(validationFn: (card: Card, game: Game) => boolean, 
                errorMessage: string = 'Custom validation failed',
                suggestion?: string): DropZoneValidator {
    return (card: Card, game: Game): ValidationResult => {
      const isValid = validationFn(card, game)
      return {
        isValid,
        reason: isValid ? undefined : errorMessage,
        suggestion: isValid ? undefined : suggestion
      }
    }
  }

  /**
   * 複数のバリデーターを結合（AND条件）
   */
  static combine(...validators: DropZoneValidator[]): DropZoneValidator {
    return (card: Card, game: Game): ValidationResult => {
      for (const validator of validators) {
        const result = validator(card, game)
        if (!result.isValid) {
          return result
        }
      }
      return { isValid: true }
    }
  }

  /**
   * 複数のバリデーターのいずれかが通れば有効（OR条件）
   */
  static either(...validators: DropZoneValidator[]): DropZoneValidator {
    return (card: Card, game: Game): ValidationResult => {
      const failureReasons: string[] = []
      
      for (const validator of validators) {
        const result = validator(card, game)
        if (result.isValid) {
          return result
        }
        if (result.reason) {
          failureReasons.push(result.reason)
        }
      }
      
      return {
        isValid: false,
        reason: `None of the conditions met: ${failureReasons.join('; ')}`,
        suggestion: 'Check the requirements for this area'
      }
    }
  }

  /**
   * 条件付きバリデーター
   */
  static conditional(
    condition: (game: Game) => boolean,
    whenTrue: DropZoneValidator,
    whenFalse: DropZoneValidator
  ): DropZoneValidator {
    return (card: Card, game: Game): ValidationResult => {
      const validator = condition(game) ? whenTrue : whenFalse
      return validator(card, game)
    }
  }

  /**
   * デバッグ用：常に無効なバリデーター
   */
  static never(reason: string = 'Always invalid'): DropZoneValidator {
    return (): ValidationResult => ({
      isValid: false,
      reason,
      suggestion: 'This zone is currently disabled'
    })
  }

  /**
   * デバッグ用：常に有効なバリデーター
   */
  static always(): DropZoneValidator {
    return (): ValidationResult => ({ isValid: true })
  }
}

/**
 * ドロップゾーンアクションの型定義
 */
export type DropZoneAction = (card: Card, game: Game) => void | Promise<void>

/**
 * 一般的なドロップゾーンアクション関数群
 */
export class DropZoneActions {
  
  /**
   * チャレンジエリアにカードを配置
   */
  static placeOnChallenge(): DropZoneAction {
    return (card: Card, game: Game): void => {
      if (!game.currentChallenge) {
        throw new Error('No active challenge to place card on')
      }
      
      try {
        game.placeChallengeCard(card)
      } catch (error) {
        console.error('Failed to place challenge card:', error)
        throw error
      }
    }
  }

  /**
   * 捨て札エリアにカードを移動
   */
  static discardCard(): DropZoneAction {
    return (card: Card, game: Game): void => {
      try {
        game.discardCard(card)
      } catch (error) {
        console.error('Failed to discard card:', error)
        throw error
      }
    }
  }

  /**
   * 保険を購入
   */
  static purchaseInsurance(): DropZoneAction {
    return (card: Card, game: Game): void => {
      if (card.type !== 'insurance') {
        throw new Error('Only insurance cards can be purchased')
      }
      
      try {
        // 保険購入ロジック（実装に応じて調整）
        game.insuranceCards.push(card)
        // 手札から削除
        const cardManager = (game as any).cardManager
        if (cardManager) {
          cardManager.removeFromHand(card)
        }
      } catch (error) {
        console.error('Failed to purchase insurance:', error)
        throw error
      }
    }
  }

  /**
   * カスタムアクション
   */
  static custom(actionFn: (card: Card, game: Game) => void): DropZoneAction {
    return actionFn
  }

  /**
   * 複数のアクションを順次実行
   */
  static sequence(...actions: DropZoneAction[]): DropZoneAction {
    return async (card: Card, game: Game): Promise<void> => {
      for (const action of actions) {
        await action(card, game)
      }
    }
  }

  /**
   * エラーハンドリング付きアクション
   */
  static withErrorHandling(
    action: DropZoneAction,
    onError?: (error: Error, card: Card, game: Game) => void
  ): DropZoneAction {
    return async (card: Card, game: Game): Promise<void> => {
      try {
        await action(card, game)
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        if (onError) {
          onError(err, card, game)
        } else {
          console.error('DropZone action failed:', err)
        }
        throw err
      }
    }
  }

  /**
   * ログ付きアクション
   */
  static withLogging(action: DropZoneAction, logPrefix: string = ''): DropZoneAction {
    return async (card: Card, game: Game): Promise<void> => {
      console.log(`${logPrefix}Executing action for card:`, card.id)
      const startTime = performance.now()
      
      try {
        await action(card, game)
        const duration = performance.now() - startTime
        console.log(`${logPrefix}Action completed in ${duration.toFixed(2)}ms`)
      } catch (error) {
        const duration = performance.now() - startTime
        console.error(`${logPrefix}Action failed after ${duration.toFixed(2)}ms:`, error)
        throw error
      }
    }
  }
}