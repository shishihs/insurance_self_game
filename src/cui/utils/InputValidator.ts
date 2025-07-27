import type { Card } from '@/domain/entities/Card'

/**
 * Input Validation and Sanitization Utility
 * Ensures safe and valid user input handling
 */
export class InputValidator {
  
  /**
   * Validate and parse card selection input
   */
  static parseCardSelection(
    input: string,
    availableCards: Card[],
    minSelection: number = 1,
    maxSelection: number = 1
  ): ParsedCardSelection {
    const result: ParsedCardSelection = {
      isValid: false,
      selectedIndices: [],
      selectedCards: [],
      errorMessage: ''
    }

    // Handle empty input
    if (!input || input.trim() === '') {
      if (minSelection === 0) {
        result.isValid = true
        return result
      } else {
        result.errorMessage = 'Selection is required'
        return result
      }
    }

    // Handle "0" or "none" for optional selections
    if ((input.trim() === '0' || input.toLowerCase().includes('none')) && minSelection === 0) {
      result.isValid = true
      return result
    }

    // Parse comma-separated indices
    const rawIndices = input.split(',')
      .map(s => s.trim())
      .filter(s => s !== '')

    if (rawIndices.length === 0) {
      result.errorMessage = 'No valid selection found'
      return result
    }

    // Validate each index
    const validIndices: number[] = []
    const invalidInputs: string[] = []

    for (const rawIndex of rawIndices) {
      const index = parseInt(rawIndex, 10)
      
      if (isNaN(index)) {
        invalidInputs.push(rawIndex)
        continue
      }

      // Convert to 0-based index
      const zeroBasedIndex = index - 1

      if (zeroBasedIndex < 0 || zeroBasedIndex >= availableCards.length) {
        invalidInputs.push(rawIndex)
        continue
      }

      validIndices.push(zeroBasedIndex)
    }

    // Report invalid inputs
    if (invalidInputs.length > 0) {
      result.errorMessage = `Invalid selection(s): ${invalidInputs.join(', ')}. Please use numbers 1-${availableCards.length}.`
      return result
    }

    // Remove duplicates
    const uniqueIndices = [...new Set(validIndices)]

    // Check selection count constraints
    if (uniqueIndices.length < minSelection) {
      result.errorMessage = `Please select at least ${minSelection} item(s).`
      return result
    }

    if (uniqueIndices.length > maxSelection) {
      result.errorMessage = `Please select at most ${maxSelection} item(s).`
      return result
    }

    // Success
    result.isValid = true
    result.selectedIndices = uniqueIndices
    result.selectedCards = uniqueIndices.map(i => availableCards[i])
    
    return result
  }

  /**
   * Validate yes/no confirmation input
   */
  static parseConfirmation(input: string, defaultValue?: 'yes' | 'no'): ParsedConfirmation {
    const result: ParsedConfirmation = {
      isValid: false,
      value: 'no',
      errorMessage: ''
    }

    const normalized = input.trim().toLowerCase()

    // Handle empty input with default
    if (normalized === '' && defaultValue) {
      result.isValid = true
      result.value = defaultValue
      return result
    }

    // Parse various yes/no formats
    const yesVariants = ['y', 'yes', 'true', '1', 'ok', 'sure', 'yeah', 'yep']
    const noVariants = ['n', 'no', 'false', '0', 'nope', 'nah']

    if (yesVariants.includes(normalized)) {
      result.isValid = true
      result.value = 'yes'
    } else if (noVariants.includes(normalized)) {
      result.isValid = true
      result.value = 'no'
    } else {
      result.errorMessage = 'Please enter "yes" or "no" (or "y"/"n")'
    }

    return result
  }

  /**
   * Validate action choice input (like challenge actions)
   */
  static parseActionChoice<T extends string>(
    input: string,
    validActions: T[],
    actionLabels?: Record<T, string>
  ): ParsedActionChoice<T> {
    const result: ParsedActionChoice<T> = {
      isValid: false,
      errorMessage: ''
    }

    const normalized = input.trim().toLowerCase()

    if (!normalized) {
      result.errorMessage = 'Please make a selection'
      return result
    }

    // Try to match by number (1-based index)
    const numberMatch = parseInt(normalized, 10)
    if (!isNaN(numberMatch)) {
      const zeroBasedIndex = numberMatch - 1
      if (zeroBasedIndex >= 0 && zeroBasedIndex < validActions.length) {
        result.isValid = true
        result.selectedAction = validActions[zeroBasedIndex]
        return result
      }
    }

    // Try to match by action name
    for (const action of validActions) {
      if (action.toLowerCase() === normalized) {
        result.isValid = true
        result.selectedAction = action
        return result
      }
    }

    // Try to match by label (if provided)
    if (actionLabels) {
      for (const [action, label] of Object.entries(actionLabels)) {
        if (label.toLowerCase() === normalized) {
          result.isValid = true
          result.selectedAction = action as T
          return result
        }
      }
    }

    // No match found
    const optionsList = validActions.map((action, index) => {
      const label = actionLabels?.[action] || action
      return `${index + 1}. ${label}`
    }).join(', ')

    result.errorMessage = `Invalid selection. Valid options: ${optionsList}`
    return result
  }

  /**
   * Sanitize user input to prevent issues
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[^\w\s,.-]/g, '') // Remove special characters except basic punctuation
      .slice(0, 1000) // Limit length
  }

  /**
   * Validate numeric input with range checking
   */
  static parseNumericInput(
    input: string,
    min?: number,
    max?: number,
    allowDecimals: boolean = false
  ): ParsedNumericInput {
    const result: ParsedNumericInput = {
      isValid: false,
      errorMessage: ''
    }

    const sanitized = this.sanitizeInput(input)
    
    if (!sanitized) {
      result.errorMessage = 'Please enter a number'
      return result
    }

    const parsed = allowDecimals ? parseFloat(sanitized) : parseInt(sanitized, 10)

    if (isNaN(parsed)) {
      result.errorMessage = 'Please enter a valid number'
      return result
    }

    if (min !== undefined && parsed < min) {
      result.errorMessage = `Number must be at least ${min}`
      return result
    }

    if (max !== undefined && parsed > max) {
      result.errorMessage = `Number must be at most ${max}`
      return result
    }

    result.isValid = true
    result.value = parsed
    return result
  }

  /**
   * Validate text input with length constraints
   */
  static parseTextInput(
    input: string,
    minLength: number = 0,
    maxLength: number = 100,
    allowEmpty: boolean = false
  ): ParsedTextInput {
    const result: ParsedTextInput = {
      isValid: false,
      value: '',
      errorMessage: ''
    }

    const sanitized = this.sanitizeInput(input)

    if (!allowEmpty && !sanitized) {
      result.errorMessage = 'Input cannot be empty'
      return result
    }

    if (sanitized.length < minLength) {
      result.errorMessage = `Input must be at least ${minLength} characters`
      return result
    }

    if (sanitized.length > maxLength) {
      result.errorMessage = `Input must be at most ${maxLength} characters`
      return result
    }

    result.isValid = true
    result.value = sanitized
    return result
  }

  /**
   * Create helpful error message with suggestions
   */
  static createHelpfulErrorMessage(
    originalError: string,
    context: 'card_selection' | 'confirmation' | 'action_choice' | 'numeric' | 'text',
    additionalInfo?: any
  ): string {
    let helpText = originalError + '\n'

    switch (context) {
      case 'card_selection':
        helpText += '💡 Tip: Enter card numbers separated by commas (e.g., "1,3,5")'
        if (additionalInfo?.minSelection === 0) {
          helpText += ' or "0" to select none'
        }
        break

      case 'confirmation':
        helpText += '💡 Tip: Enter "y" for yes or "n" for no'
        break

      case 'action_choice':
        helpText += '💡 Tip: Enter the number or name of your choice'
        break

      case 'numeric':
        helpText += '💡 Tip: Enter a number'
        if (additionalInfo?.min !== undefined || additionalInfo?.max !== undefined) {
          helpText += ` between ${additionalInfo.min || 0} and ${additionalInfo.max || 'unlimited'}`
        }
        break

      case 'text':
        helpText += '💡 Tip: Enter text'
        if (additionalInfo?.maxLength) {
          helpText += ` (max ${additionalInfo.maxLength} characters)`
        }
        break
    }

    return helpText
  }
}

/**
 * Parsed card selection result
 */
export interface ParsedCardSelection {
  isValid: boolean
  selectedIndices: number[]
  selectedCards: Card[]
  errorMessage: string
}

/**
 * Parsed confirmation result
 */
export interface ParsedConfirmation {
  isValid: boolean
  value: 'yes' | 'no'
  errorMessage: string
}

/**
 * Parsed action choice result
 */
export interface ParsedActionChoice<T> {
  isValid: boolean
  selectedAction?: T
  errorMessage: string
}

/**
 * Parsed numeric input result
 */
export interface ParsedNumericInput {
  isValid: boolean
  value?: number
  errorMessage: string
}

/**
 * Parsed text input result
 */
export interface ParsedTextInput {
  isValid: boolean
  value: string
  errorMessage: string
}