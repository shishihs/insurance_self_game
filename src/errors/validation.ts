/**
 * 型安全バリデーションシステム
 * 
 * Railway Orientedプログラミングパターンを用いた
 * 複合的なバリデーション処理の実装
 */

import { Railway, Result } from './railway'
import type { ValidationError} from './error-types';
import { ErrorCollector, ErrorFactory, FieldValidationError } from './error-types'
import type { ValidationResult as AdvancedValidationResult, Schema } from '../types/advanced-types'

// ===== バリデーター基底型 =====

export type Validator<T> = (value: T) => Result<T, ValidationError>
export type AsyncValidator<T> = (value: T) => Promise<Result<T, ValidationError>>

export interface ValidationRule<T> {
  name: string
  validate: Validator<T>
  message: string
}

export interface AsyncValidationRule<T> {
  name: string
  validate: AsyncValidator<T>
  message: string
}

// ===== 基本バリデーター =====

export const required = <T>(message = 'この値は必須です'): Validator<T | null | undefined> => {
  return (value: T | null | undefined) => {
    return value != null 
      ? Result.ok(value)
      : Result.err(ErrorFactory.validation('required', message, value))
  }
}

export const minLength = (min: number, message?: string): Validator<string> => {
  const msg = message ?? `${min}文字以上で入力してください`
  return (value: string) => {
    return value.length >= min
      ? Result.ok(value)
      : Result.err(ErrorFactory.validation('minLength', msg, value))
  }
}

export const maxLength = (max: number, message?: string): Validator<string> => {
  const msg = message ?? `${max}文字以内で入力してください`
  return (value: string) => {
    return value.length <= max
      ? Result.ok(value)
      : Result.err(ErrorFactory.validation('maxLength', msg, value))
  }
}

export const pattern = (regex: RegExp, message = '形式が正しくありません'): Validator<string> => {
  return (value: string) => {
    return regex.test(value)
      ? Result.ok(value)
      : Result.err(ErrorFactory.validation('pattern', message, value))
  }
}

export const email = (message = 'メールアドレスの形式が正しくありません'): Validator<string> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return pattern(emailRegex, message)
}

export const url = (message = 'URLの形式が正しくありません'): Validator<string> => {
  return (value: string) => {
    try {
      new URL(value)
      return Result.ok(value)
    } catch {
      return Result.err(ErrorFactory.validation('url', message, value))
    }
  }
}

export const min = (minimum: number, message?: string): Validator<number> => {
  const msg = message ?? `${minimum}以上の値を入力してください`
  return (value: number) => {
    return value >= minimum
      ? Result.ok(value)
      : Result.err(ErrorFactory.validation('min', msg, value))
  }
}

export const max = (maximum: number, message?: string): Validator<number> => {
  const msg = message ?? `${maximum}以下の値を入力してください`
  return (value: number) => {
    return value <= maximum
      ? Result.ok(value)
      : Result.err(ErrorFactory.validation('max', msg, value))
  }
}

export const integer = (message = '整数で入力してください'): Validator<number> => {
  return (value: number) => {
    return Number.isInteger(value)
      ? Result.ok(value)
      : Result.err(ErrorFactory.validation('integer', message, value))
  }
}

export const positive = (message = '正の値を入力してください'): Validator<number> => {
  return (value: number) => {
    return value > 0
      ? Result.ok(value)
      : Result.err(ErrorFactory.validation('positive', message, value))
  }
}

export const nonNegative = (message = '0以上の値を入力してください'): Validator<number> => {
  return (value: number) => {
    return value >= 0
      ? Result.ok(value)
      : Result.err(ErrorFactory.validation('nonNegative', message, value))
  }
}

export const oneOf = <T>(
  allowedValues: readonly T[],
  message?: string
): Validator<T> => {
  const msg = message ?? `次の値のいずれかを選択してください: ${allowedValues.join(', ')}`
  return (value: T) => {
    return allowedValues.includes(value)
      ? Result.ok(value)
      : Result.err(ErrorFactory.validation('oneOf', msg, value))
  }
}

export const custom = <T>(
  predicate: (value: T) => boolean,
  message: string
): Validator<T> => {
  return (value: T) => {
    return predicate(value)
      ? Result.ok(value)
      : Result.err(ErrorFactory.validation('custom', message, value))
  }
}

// ===== バリデーター組み合わせ =====

export const and = <T>(
  ...validators: Validator<T>[]
): Validator<T> => {
  return (value: T) => {
    return Railway.of(value)
      .bind(v => validators.reduce(
        (acc, validator) => acc.flatMap(validator),
        Result.ok(v)
      ))
      .run()
  }
}

export const or = <T>(
  ...validators: Validator<T>[]
): Validator<T> => {
  return (value: T) => {
    for (const validator of validators) {
      const result = validator(value)
      if (result.isOk()) {
        return result
      }
    }
    return Result.err(ErrorFactory.validation('or', 'いずれの条件も満たしていません', value))
  }
}

export const optional = <T>(
  validator: Validator<T>
): Validator<T | null | undefined> => {
  return (value: T | null | undefined) => {
    if (value == null) {
      return Result.ok(value)
    }
    return validator(value)
  }
}

export const array = <T>(
  itemValidator: Validator<T>,
  message = '配列の要素が無効です'
): Validator<T[]> => {
  return (values: T[]) => {
    const errors: ValidationError[] = []
    const validatedItems: T[] = []

    for (let i = 0; i < values.length; i++) {
      const result = itemValidator(values[i]!)
      if (result.isErr()) {
        errors.push(result.error)
      } else {
        validatedItems.push(result.value)
      }
    }

    return errors.length > 0
      ? Result.err(ErrorFactory.validation('array', message, values))
      : Result.ok(validatedItems)
  }
}

export const object = <T extends Record<string, unknown>>(
  schema: { [K in keyof T]: Validator<T[K]> }
): Validator<T> => {
  return (value: T) => {
    const collector = new ErrorCollector()
    const validated: Partial<T> = {}

    for (const [key, validator] of Object.entries(schema)) {
      const fieldValue = value[key as keyof T]
      const result = (validator as Validator<any>)(fieldValue)
      
      if (result.isErr()) {
        collector.add(result.error)
      } else {
        (validated as any)[key] = result.value
      }
    }

    return collector.hasErrors()
      ? Result.err(collector.toSchemaValidationError())
      : Result.ok(validated as T)
  }
}

// ===== 非同期バリデーション =====

export const asyncRequired = <T>(
  message = 'この値は必須です'
): AsyncValidator<T | null | undefined> => {
  return async (value: T | null | undefined) => {
    return required<T>(message)(value)
  }
}

export const asyncCustom = <T>(
  predicate: (value: T) => Promise<boolean>,
  message: string
): AsyncValidator<T> => {
  return async (value: T) => {
    const isValid = await predicate(value)
    return isValid
      ? Result.ok(value)
      : Result.err(ErrorFactory.validation('asyncCustom', message, value))
  }
}

export const asyncAnd = <T>(
  ...validators: AsyncValidator<T>[]
): AsyncValidator<T> => {
  return async (value: T) => {
    for (const validator of validators) {
      const result = await validator(value)
      if (result.isErr()) {
        return result
      }
    }
    return Result.ok(value)
  }
}

export const asyncObject = <T extends Record<string, unknown>>(
  schema: { [K in keyof T]: AsyncValidator<T[K]> }
): AsyncValidator<T> => {
  return async (value: T) => {
    const collector = new ErrorCollector()
    const validated: Partial<T> = {}

    for (const [key, validator] of Object.entries(schema)) {
      const fieldValue = value[key as keyof T]
      const result = await (validator as AsyncValidator<any>)(fieldValue)
      
      if (result.isErr()) {
        collector.add(result.error)
      } else {
        (validated as any)[key] = result.value
      }
    }

    return collector.hasErrors()
      ? Result.err(collector.toSchemaValidationError())
      : Result.ok(validated as T)
  }
}

// ===== ゲーム固有バリデーション =====

export const gameValidators = {
  cardId: and(
    required('カードIDは必須です'),
    pattern(/^card_[a-zA-Z0-9_]+$/, 'カードIDの形式が正しくありません')
  ),

  gameId: and(
    required('ゲームIDは必須です'),
    pattern(/^game_[a-zA-Z0-9_]+$/, 'ゲームIDの形式が正しくありません')
  ),

  playerId: and(
    required('プレイヤーIDは必須です'),
    pattern(/^player_[a-zA-Z0-9_]+$/, 'プレイヤーIDの形式が正しくありません')
  ),

  vitality: and(
    required('体力値は必須です'),
    integer('体力値は整数で入力してください'),
    nonNegative('体力値は0以上で入力してください'),
    max(200, '体力値は200以下で入力してください')
  ),

  power: and(
    required('パワー値は必須です'),
    integer('パワー値は整数で入力してください'),
    nonNegative('パワー値は0以上で入力してください')
  ),

  turn: and(
    required('ターン数は必須です'),
    integer('ターン数は整数で入力してください'),
    positive('ターン数は1以上で入力してください')
  ),

  difficulty: oneOf(
    ['easy', 'normal', 'hard', 'expert'] as const,
    '難易度が無効です'
  ),

  gameStatus: oneOf(
    ['not_started', 'in_progress', 'stage_clear', 'game_over', 'victory'] as const,
    'ゲーム状態が無効です'
  )
}

// ===== バリデーション実行器 =====

export class ValidationRunner<T> {
  private readonly validators: Validator<T>[] = []
  private readonly asyncValidators: AsyncValidator<T>[] = []

  add(validator: Validator<T>): this {
    this.validators.push(validator)
    return this
  }

  addAsync(validator: AsyncValidator<T>): this {
    this.asyncValidators.push(validator)
    return this
  }

  validate(value: T): Result<T, ValidationError> {
    return and(...this.validators)(value)
  }

  async validateAsync(value: T): Promise<Result<T, ValidationError>> {
    // 同期バリデーションを先に実行
    const syncResult = this.validate(value)
    if (syncResult.isErr()) {
      return syncResult
    }

    // 非同期バリデーションを実行
    return asyncAnd(...this.asyncValidators)(value)
  }
}

// ===== フォームバリデーション =====

export interface FormField<T> {
  value: T
  validators: Validator<T>[]
  asyncValidators?: AsyncValidator<T>[]
}

export interface FormSchema {
  [key: string]: FormField<any>
}

export class FormValidator<T extends FormSchema> {
  constructor(private readonly schema: T) {}

  validate(data: { [K in keyof T]: T[K]['value'] }): Result<
    { [K in keyof T]: T[K]['value'] }, 
    ValidationError
  > {
    const collector = new ErrorCollector()
    const validated: any = {}

    for (const [key, field] of Object.entries(this.schema)) {
      const value = data[key as keyof T]
      const validator = and(...field.validators)
      const result = validator(value)

      if (result.isErr()) {
        collector.add(result.error)
      } else {
        validated[key] = result.value
      }
    }

    return collector.hasErrors()
      ? Result.err(collector.toSchemaValidationError())
      : Result.ok(validated)
  }

  async validateAsync(data: { [K in keyof T]: T[K]['value'] }): Promise<Result<
    { [K in keyof T]: T[K]['value'] },
    ValidationError
  >> {
    // 同期バリデーションを先に実行
    const syncResult = this.validate(data)
    if (syncResult.isErr()) {
      return syncResult
    }

    // 非同期バリデーションを実行
    const collector = new ErrorCollector()
    const validated: any = { ...syncResult.value }

    for (const [key, field] of Object.entries(this.schema)) {
      if (field.asyncValidators && field.asyncValidators.length > 0) {
        const value = data[key as keyof T]
        const validator = asyncAnd(...field.asyncValidators)
        const result = await validator(value)

        if (result.isErr()) {
          collector.add(result.error)
        }
      }
    }

    return collector.hasErrors()
      ? Result.err(collector.toSchemaValidationError())
      : Result.ok(validated)
  }
}

// ===== バリデーション結果の集約 =====

export const collectValidationResults = <T>(
  results: Result<T, ValidationError>[]
): Result<T[], ValidationError> => {
  const collector = new ErrorCollector()
  const values: T[] = []

  for (const result of results) {
    if (result.isErr()) {
      collector.add(result.error)
    } else {
      values.push(result.value)
    }
  }

  return collector.hasErrors()
    ? Result.err(collector.toSchemaValidationError())
    : Result.ok(values)
}