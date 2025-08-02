/**
 * 構造化エラー型定義
 * 
 * アプリケーション固有のエラー型を階層化し、
 * エラーハンドリングの精度と保守性を向上させる
 */

// ===== 基底エラークラス =====

export abstract class AppError extends Error {
  abstract readonly code: string
  abstract readonly category: ErrorCategory
  abstract readonly severity: ErrorSeverity
  abstract readonly recoverable: boolean
  abstract readonly userMessage: string

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = this.constructor.name
    
    // Error.captureStackTrace が存在する場合のみ使用
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON(): ErrorInfo {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      context: this.context,
      stack: this.stack,
      timestamp: new Date().toISOString()
    }
  }

  toString(): string {
    const contextStr = this.context ? ` Context: ${JSON.stringify(this.context)}` : ''
    return `${this.name}[${this.code}]: ${this.message}${contextStr}`
  }
}

// ===== エラーカテゴリー =====

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  SYSTEM = 'SYSTEM',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  USER_INPUT = 'USER_INPUT',
  CONFIGURATION = 'CONFIGURATION'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorInfo {
  name: string
  code: string
  message: string
  userMessage: string
  category: ErrorCategory
  severity: ErrorSeverity
  recoverable: boolean
  context?: Record<string, unknown>
  stack?: string
  timestamp: string
}

// ===== ゲーム固有エラー =====

export class GameError extends AppError {
  readonly category = ErrorCategory.BUSINESS_LOGIC
  readonly severity = ErrorSeverity.MEDIUM
  readonly recoverable = true
}

export class InvalidGameStateError extends GameError {
  readonly code = 'INVALID_GAME_STATE'
  readonly userMessage = 'ゲームの状態が不正です。'

  constructor(currentState: string, expectedState: string, context?: Record<string, unknown>) {
    super(
      `Invalid game state: expected ${expectedState}, got ${currentState}`,
      { currentState, expectedState, ...context }
    )
  }
}

export class InvalidCardOperationError extends GameError {
  readonly code = 'INVALID_CARD_OPERATION'
  readonly userMessage = 'このカード操作は実行できません。'

  constructor(operation: string, cardId: string, reason: string, context?: Record<string, unknown>) {
    super(
      `Invalid card operation '${operation}' on card ${cardId}: ${reason}`,
      { operation, cardId, reason, ...context }
    )
  }
}

export class InsufficientResourcesError extends GameError {
  readonly code = 'INSUFFICIENT_RESOURCES'
  readonly userMessage = 'リソースが不足しています。'

  constructor(resource: string, required: number, available: number, context?: Record<string, unknown>) {
    super(
      `Insufficient ${resource}: required ${required}, available ${available}`,
      { resource, required, available, ...context }
    )
  }
}

export class GameRuleViolationError extends GameError {
  readonly code = 'GAME_RULE_VIOLATION'
  readonly userMessage = 'ゲームルールに違反する操作です。'

  constructor(rule: string, violation: string, context?: Record<string, unknown>) {
    super(
      `Game rule violation - ${rule}: ${violation}`,
      { rule, violation, ...context }
    )
  }
}

// ===== バリデーションエラー =====

export class ValidationError extends AppError {
  readonly category = ErrorCategory.VALIDATION
  readonly severity = ErrorSeverity.LOW
  readonly recoverable = true
}

export class FieldValidationError extends ValidationError {
  readonly code = 'FIELD_VALIDATION_ERROR'
  readonly userMessage = '入力値が正しくありません。'

  constructor(
    public readonly field: string,
    public readonly violations: ValidationViolation[],
    context?: Record<string, unknown>
  ) {
    const violationMessages = violations.map(v => v.message).join(', ')
    super(
      `Field validation failed for '${field}': ${violationMessages}`,
      { field, violations, ...context }
    )
  }
}

export class SchemaValidationError extends ValidationError {
  readonly code = 'SCHEMA_VALIDATION_ERROR'
  readonly userMessage = 'データ形式が正しくありません。'

  constructor(
    public readonly violations: ValidationViolation[],
    context?: Record<string, unknown>
  ) {
    const violationMessages = violations.map(v => `${v.field}: ${v.message}`).join(', ')
    super(
      `Schema validation failed: ${violationMessages}`,
      { violations, ...context }
    )
  }
}

export interface ValidationViolation {
  field: string
  message: string
  code: string
  value?: unknown
}

// ===== システムエラー =====

export class SystemError extends AppError {
  readonly category = ErrorCategory.SYSTEM
  readonly severity = ErrorSeverity.HIGH
  readonly recoverable = false
}

export class ConfigurationError extends SystemError {
  readonly code = 'CONFIGURATION_ERROR'
  readonly userMessage = 'システム設定に問題があります。'

  constructor(setting: string, issue: string, context?: Record<string, unknown>) {
    super(
      `Configuration error for '${setting}': ${issue}`,
      { setting, issue, ...context }
    )
  }
}

export class ExternalServiceError extends AppError {
  readonly category = ErrorCategory.EXTERNAL_SERVICE
  readonly severity = ErrorSeverity.MEDIUM
  readonly recoverable = true
  readonly code = 'EXTERNAL_SERVICE_ERROR'
  readonly userMessage = '外部サービスとの通信でエラーが発生しました。'

  constructor(
    public readonly service: string,
    public readonly statusCode?: number,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(
      `External service error from ${service}${statusCode ? ` (HTTP ${statusCode})` : ''}`,
      { service, statusCode, ...context },
      cause
    )
  }
}

// ===== ネットワークエラー =====

export class NetworkError extends AppError {
  readonly category = ErrorCategory.NETWORK
  readonly severity = ErrorSeverity.MEDIUM
  readonly recoverable = true
}

export class TimeoutError extends NetworkError {
  readonly code = 'TIMEOUT_ERROR'
  readonly userMessage = '通信がタイムアウトしました。'

  constructor(
    public readonly operation: string,
    public readonly timeoutMs: number,
    context?: Record<string, unknown>
  ) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      { operation, timeoutMs, ...context }
    )
  }
}

export class ConnectionError extends NetworkError {
  readonly code = 'CONNECTION_ERROR'
  readonly userMessage = 'ネットワーク接続でエラーが発生しました。'

  constructor(
    public readonly endpoint: string,
    public readonly reason: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(
      `Connection error to ${endpoint}: ${reason}`,
      { endpoint, reason, ...context },
      cause
    )
  }
}

// ===== 認証・認可エラー =====

export class AuthenticationError extends AppError {
  readonly category = ErrorCategory.AUTHENTICATION
  readonly severity = ErrorSeverity.HIGH
  readonly recoverable = true
  readonly code = 'AUTHENTICATION_ERROR'
  readonly userMessage = '認証に失敗しました。'

  constructor(reason: string, context?: Record<string, unknown>) {
    super(`Authentication failed: ${reason}`, context)
  }
}

export class AuthorizationError extends AppError {
  readonly category = ErrorCategory.AUTHORIZATION
  readonly severity = ErrorSeverity.HIGH
  readonly recoverable = false
  readonly code = 'AUTHORIZATION_ERROR'
  readonly userMessage = 'この操作を実行する権限がありません。'

  constructor(
    public readonly resource: string,
    public readonly action: string,
    context?: Record<string, unknown>
  ) {
    super(
      `Authorization failed: insufficient permissions for '${action}' on '${resource}'`,
      { resource, action, ...context }
    )
  }
}

// ===== エラーファクトリー =====

export class ErrorFactory {
  static validation(
    field: string,
    message: string,
    value?: unknown
  ): FieldValidationError {
    return new FieldValidationError(field, [{ field, message, code: 'INVALID_VALUE', value }])
  }

  static gameState(
    currentState: string,
    expectedState: string
  ): InvalidGameStateError {
    return new InvalidGameStateError(currentState, expectedState)
  }

  static cardOperation(
    operation: string,
    cardId: string,
    reason: string
  ): InvalidCardOperationError {
    return new InvalidCardOperationError(operation, cardId, reason)
  }

  static insufficientResources(
    resource: string,
    required: number,
    available: number
  ): InsufficientResourcesError {
    return new InsufficientResourcesError(resource, required, available)
  }

  static ruleViolation(rule: string, violation: string): GameRuleViolationError {
    return new GameRuleViolationError(rule, violation)
  }

  static timeout(operation: string, timeoutMs: number): TimeoutError {
    return new TimeoutError(operation, timeoutMs)
  }

  static connection(endpoint: string, reason: string, cause?: Error): ConnectionError {
    return new ConnectionError(endpoint, reason, undefined, cause)
  }

  static externalService(
    service: string,
    statusCode?: number,
    cause?: Error
  ): ExternalServiceError {
    return new ExternalServiceError(service, statusCode, undefined, cause)
  }

  static configuration(setting: string, issue: string): ConfigurationError {
    return new ConfigurationError(setting, issue)
  }

  static authentication(reason: string): AuthenticationError {
    return new AuthenticationError(reason)
  }

  static authorization(resource: string, action: string): AuthorizationError {
    return new AuthorizationError(resource, action)
  }
}

// ===== エラー分析ユーティリティ =====

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError
}

export const isRecoverableError = (error: unknown): boolean => {
  return isAppError(error) && error.recoverable
}

export const getErrorSeverity = (error: unknown): ErrorSeverity => {
  return isAppError(error) ? error.severity : ErrorSeverity.CRITICAL
}

export const getErrorCategory = (error: unknown): ErrorCategory => {
  return isAppError(error) ? error.category : ErrorCategory.SYSTEM
}

export const shouldRetryError = (error: unknown): boolean => {
  if (!isAppError(error)) return false
  
  return error.category === ErrorCategory.NETWORK ||
         error.category === ErrorCategory.EXTERNAL_SERVICE ||
         (error.category === ErrorCategory.SYSTEM && error.recoverable)
}

export const getUserMessage = (error: unknown): string => {
  if (isAppError(error)) {
    return error.userMessage
  }
  return 'システムエラーが発生しました。'
}

// ===== エラー集約 =====

export class ErrorCollector {
  private errors: AppError[] = []

  add(error: AppError): void {
    this.errors.push(error)
  }

  addValidation(field: string, message: string, value?: unknown): void {
    this.add(ErrorFactory.validation(field, message, value))
  }

  hasErrors(): boolean {
    return this.errors.length > 0
  }

  getErrors(): readonly AppError[] {
    return [...this.errors]
  }

  getCriticalErrors(): AppError[] {
    return this.errors.filter(error => error.severity === ErrorSeverity.CRITICAL)
  }

  getRecoverableErrors(): AppError[] {
    return this.errors.filter(error => error.recoverable)
  }

  clear(): void {
    this.errors = []
  }

  toSchemaValidationError(): SchemaValidationError {
    const violations = this.errors.map(error => ({
      field: error.context?.field as string || 'unknown',
      message: error.message,
      code: error.code,
      value: error.context?.value
    }))
    
    return new SchemaValidationError(violations)
  }
}