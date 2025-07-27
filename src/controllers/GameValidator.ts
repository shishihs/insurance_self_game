import type { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import type { GameConfig } from '@/domain/types/game.types'

/**
 * ゲーム状態のバリデーション結果
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * ゲームバリデーター
 * ゲーム状態の整合性チェックとエラー検出
 */
export class GameValidator {
  
  /**
   * ゲーム設定の検証
   */
  static validateGameConfig(config: GameConfig): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // 必須フィールドの検証
    if (config.startingVitality <= 0) {
      errors.push('初期体力は1以上である必要があります')
    }
    
    if (config.startingHandSize < 0) {
      errors.push('初期手札サイズは0以上である必要があります')
    }
    
    if (config.maxHandSize < config.startingHandSize) {
      errors.push('最大手札サイズは初期手札サイズ以上である必要があります')
    }
    
    if (config.dreamCardCount < 0) {
      errors.push('夢カード数は0以上である必要があります')
    }
    
    // 警告レベルの検証
    if (config.startingVitality > 100) {
      warnings.push('初期体力が100を超えています。ゲームバランスを確認してください')
    }
    
    if (config.maxHandSize > 15) {
      warnings.push('最大手札サイズが15を超えています。UI表示を確認してください')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * ゲーム状態の検証
   */
  static validateGameState(game: Game): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // 体力の検証
    if (game.vitality < 0) {
      errors.push('体力が負の値になっています')
    }
    
    if (game.vitality > game.maxVitality) {
      errors.push('体力が最大値を超えています')
    }
    
    // 手札の検証
    if (game.playerHand.length > game.config.maxHandSize) {
      errors.push(`手札が最大サイズ(${game.config.maxHandSize})を超えています: ${game.playerHand.length}`)
    }
    
    // ターン数の検証
    if (game.turn < 0) {
      errors.push('ターン数が負の値になっています')
    }
    
    // フェーズの検証
    if (!this.isValidPhaseTransition(game)) {
      warnings.push('無効なフェーズ遷移の可能性があります')
    }
    
    // デッキの検証
    const deckValidation = this.validateDeck(game.playerDeck.getCards())
    if (!deckValidation.isValid) {
      errors.push(...deckValidation.errors)
    }
    
    // 保険カードの検証
    const insuranceValidation = this.validateInsuranceCards(game.insuranceCards)
    if (!insuranceValidation.isValid) {
      errors.push(...insuranceValidation.errors)
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * カード選択の検証
   */
  static validateCardSelection(
    selectedCards: Card[], 
    availableCards: Card[], 
    minSelection: number = 1, 
    maxSelection: number = 1
  ): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // 選択数の検証
    if (selectedCards.length < minSelection) {
      errors.push(`最低${minSelection}枚のカードを選択する必要があります`)
    }
    
    if (selectedCards.length > maxSelection) {
      errors.push(`最大${maxSelection}枚まで選択可能です`)
    }
    
    // 選択カードが利用可能カードに含まれているかの検証
    for (const selectedCard of selectedCards) {
      if (!availableCards.some(card => card.id === selectedCard.id)) {
        errors.push(`選択されたカード「${selectedCard.name}」は選択可能なカードに含まれていません`)
      }
    }
    
    // 重複選択の検証
    const uniqueIds = new Set(selectedCards.map(card => card.id))
    if (uniqueIds.size !== selectedCards.length) {
      errors.push('同じカードを複数回選択することはできません')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * チャレンジ実行の検証
   */
  static validateChallengeExecution(
    challengeCard: Card, 
    selectedCards: Card[], 
    playerHand: Card[]
  ): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // チャレンジカードの検証
    if (!challengeCard) {
      errors.push('チャレンジカードが指定されていません')
      return { isValid: false, errors, warnings }
    }
    
    if (challengeCard.power === undefined) {
      errors.push('チャレンジカードにパワーが設定されていません')
    }
    
    // 選択カードの検証
    const cardSelectionValidation = this.validateCardSelection(
      selectedCards, 
      playerHand, 
      0, 
      playerHand.length
    )
    
    if (!cardSelectionValidation.isValid) {
      errors.push(...cardSelectionValidation.errors)
    }
    
    // パワー計算の妥当性チェック
    const totalPower = selectedCards.reduce((sum, card) => sum + (card.power || 0), 0)
    // const requiredPower = challengeCard.power || 0  // 現在未使用だが将来的に使用予定
    
    if (totalPower === 0 && selectedCards.length > 0) {
      warnings.push('選択されたカードにパワーが設定されていません')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * 保険更新の検証
   */
  static validateInsuranceRenewal(
    insurance: Card, 
    renewalCost: number, 
    currentVitality: number
  ): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    if (!insurance) {
      errors.push('保険カードが指定されていません')
      return { isValid: false, errors, warnings }
    }
    
    if (renewalCost < 0) {
      errors.push('更新コストが負の値です')
    }
    
    if (renewalCost > currentVitality) {
      errors.push(`更新コスト(${renewalCost})が現在の体力(${currentVitality})を上回っています`)
    }
    
    if (renewalCost > currentVitality * 0.8) {
      warnings.push('更新コストが体力の80%を超えています。慎重に検討してください')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  // === プライベートヘルパーメソッド ===
  
  /**
   * フェーズ遷移の妥当性チェック
   */
  private static isValidPhaseTransition(game: Game): boolean {
    // 簡単な妥当性チェック
    // より詳細な検証ロジックは必要に応じて追加
    const validPhases = ['setup', 'draw', 'challenge', 'resolution', 'card_selection', 'upgrade', 'end']
    return validPhases.includes(game.phase)
  }
  
  /**
   * デッキの検証
   */
  private static validateDeck(cards: Card[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // カードの重複ID検証
    const cardIds = cards.map(card => card.id)
    const uniqueIds = new Set(cardIds)
    
    if (uniqueIds.size !== cardIds.length) {
      errors.push('デッキに重複したIDのカードが含まれています')
    }
    
    // カードの妥当性検証
    for (const card of cards) {
      if (!card.id || !card.name) {
        errors.push('無効なカード（IDまたは名前が未設定）がデッキに含まれています')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * 保険カードの検証
   */
  private static validateInsuranceCards(insuranceCards: Card[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    for (const insurance of insuranceCards) {
      if (!insurance.type || !['whole_life', 'term'].includes(insurance.type)) {
        errors.push(`無効な保険タイプ: ${insurance.type}`)
      }
      
      if (insurance.cost === undefined || insurance.cost < 0) {
        errors.push(`保険「${insurance.name}」のコストが無効です`)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

/**
 * ゲームエラー型定義
 */
export class GameValidationError extends Error {
  constructor(
    message: string, 
    public readonly validationResult: ValidationResult
  ) {
    super(message)
    this.name = 'GameValidationError'
  }
}

/**
 * バリデーション警告型定義
 */
export class GameValidationWarning extends Error {
  constructor(
    message: string, 
    public readonly warnings: string[]
  ) {
    super(message)
    this.name = 'GameValidationWarning'
  }
}