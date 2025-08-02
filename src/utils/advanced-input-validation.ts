/**
 * 高度な入力検証システム
 * APIペイロード検証、ファイルアップロード検証、バイナリデータ検証、ビジネスロジック検証
 */

import { sanitizeInput } from './security'
import { SecurityAuditLogger } from './security-audit-logger'

export interface ValidationRule {
  name: string
  validate: (value: any, context?: ValidationContext) => ValidationResult
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
}

export interface ValidationContext {
  field: string
  parentObject?: any
  userId?: string
  sessionId?: string
  requestId?: string
  metadata?: Record<string, any>
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedValue?: any
  confidence: number // 0-1の信頼度
}

export interface FileValidationConfig {
  maxSize: number
  allowedTypes: string[]
  allowedExtensions: string[]
  scanForMalware: boolean
  checkMetadata: boolean
  validateStructure: boolean
}

export interface BusinessRule {
  name: string
  condition: (data: any, context?: ValidationContext) => boolean
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * 高度な入力検証システム
 */
export class AdvancedInputValidator {
  private static instance: AdvancedInputValidator
  private readonly validationRules = new Map<string, ValidationRule[]>()
  private readonly businessRules = new Map<string, BusinessRule[]>()
  private readonly auditLogger = SecurityAuditLogger.getInstance()
  private readonly fileValidationConfig: FileValidationConfig

  private constructor() {
    this.fileValidationConfig = {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/json'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.txt', '.json'],
      scanForMalware: true,
      checkMetadata: true,
      validateStructure: true
    }
    
    this.initializeDefaultRules()
  }

  static getInstance(): AdvancedInputValidator {
    if (!AdvancedInputValidator.instance) {
      AdvancedInputValidator.instance = new AdvancedInputValidator()
    }
    return AdvancedInputValidator.instance
  }

  /**
   * デフォルトルールの初期化
   */
  private initializeDefaultRules(): void {
    // 文字列検証ルール
    this.addValidationRule('string', {
      name: 'sql_injection_check',
      validate: (value: string) => this.validateSQLInjection(value),
      severity: 'critical',
      description: 'SQLインジェクション攻撃の検知'
    })

    this.addValidationRule('string', {
      name: 'xss_check',
      validate: (value: string) => this.validateXSS(value),
      severity: 'high',
      description: 'XSS攻撃の検知'
    })

    this.addValidationRule('string', {
      name: 'command_injection_check',
      validate: (value: string) => this.validateCommandInjection(value),
      severity: 'critical',
      description: 'コマンドインジェクション攻撃の検知'
    })

    this.addValidationRule('string', {
      name: 'path_traversal_check',
      validate: (value: string) => this.validatePathTraversal(value),
      severity: 'high',
      description: 'パストラバーサル攻撃の検知'
    })

    // 数値検証ルール
    this.addValidationRule('number', {
      name: 'range_check',
      validate: (value: number, context?: ValidationContext) => 
        this.validateNumberRange(value, context),
      severity: 'medium',
      description: '数値範囲の検証'
    })

    this.addValidationRule('number', {
      name: 'precision_check',
      validate: (value: number) => this.validateNumberPrecision(value),
      severity: 'low',
      description: '数値精度の検証'
    })

    // オブジェクト検証ルール
    this.addValidationRule('object', {
      name: 'structure_check',
      validate: (value: any, context?: ValidationContext) => 
        this.validateObjectStructure(value, context),
      severity: 'medium',
      description: 'オブジェクト構造の検証'
    })

    this.addValidationRule('object', {
      name: 'size_check',
      validate: (value: any) => this.validateObjectSize(value),
      severity: 'medium',
      description: 'オブジェクトサイズの検証'
    })

    // 配列検証ルール
    this.addValidationRule('array', {
      name: 'length_check',
      validate: (value: any[], context?: ValidationContext) => 
        this.validateArrayLength(value, context),
      severity: 'medium',
      description: '配列長の検証'
    })

    // メール検証ルール
    this.addValidationRule('email', {
      name: 'format_check',
      validate: (value: string) => this.validateEmailFormat(value),
      severity: 'medium',
      description: 'メールアドレス形式の検証'
    })

    this.addValidationRule('email', {
      name: 'domain_check',
      validate: (value: string) => this.validateEmailDomain(value),
      severity: 'low',
      description: 'メールドメインの検証'
    })

    // URL検証ルール
    this.addValidationRule('url', {
      name: 'protocol_check',
      validate: (value: string) => this.validateURLProtocol(value),
      severity: 'high',
      description: 'URLプロトコルの検証'
    })

    this.addValidationRule('url', {
      name: 'domain_whitelist_check',
      validate: (value: string) => this.validateURLDomain(value),
      severity: 'medium',
      description: 'URL ドメインホワイトリスト検証'
    })
  }

  /**
   * 検証ルールの追加
   */
  addValidationRule(type: string, rule: ValidationRule): void {
    if (!this.validationRules.has(type)) {
      this.validationRules.set(type, [])
    }
    
    this.validationRules.get(type)!.push(rule)
    
    this.auditLogger.logSecurityEvent(
      'validation_rule_added',
      'low',
      'advanced_input_validator',
      `新しい検証ルールが追加されました: ${type}.${rule.name}`,
      { type, ruleName: rule.name, severity: rule.severity }
    )
  }

  /**
   * ビジネスルールの追加
   */
  addBusinessRule(entity: string, rule: BusinessRule): void {
    if (!this.businessRules.has(entity)) {
      this.businessRules.set(entity, [])
    }
    
    this.businessRules.get(entity)!.push(rule)
  }

  /**
   * 包括的入力検証
   */
  async validateInput(
    value: any, 
    type: string, 
    context?: ValidationContext
  ): Promise<ValidationResult> {
    const rules = this.validationRules.get(type) || []
    const errors: string[] = []
    const warnings: string[] = []
    let sanitizedValue = value
    let totalConfidence = 0
    let validRules = 0

    // 基本型チェック
    if (!this.validateType(value, type)) {
      return {
        isValid: false,
        errors: [`Invalid type: expected ${type}, got ${typeof value}`],
        warnings: [],
        confidence: 0
      }
    }

    // 各検証ルールの実行
    for (const rule of rules) {
      try {
        const result = rule.validate(value, context)
        
        if (!result.isValid) {
          errors.push(...result.errors)
          
          // 重要度に応じて監査ログに記録
          if (rule.severity === 'critical' || rule.severity === 'high') {
            await this.auditLogger.logSecurityEvent(
              'validation_rule_failed',
              rule.severity as any,
              'advanced_input_validator',
              `検証ルール失敗: ${rule.name}`,
              {
                ruleName: rule.name,
                type,
                field: context?.field,
                errors: result.errors,
                value: this.sanitizeLogValue(value)
              }
            )
          }
        }
        
        warnings.push(...result.warnings)
        
        if (result.sanitizedValue !== undefined) {
          sanitizedValue = result.sanitizedValue
        }
        
        totalConfidence += result.confidence
        validRules++
        
      } catch (error) {
        warnings.push(`Rule execution failed: ${rule.name}`)
        
        await this.auditLogger.logSecurityEvent(
          'validation_rule_error',
          'medium',
          'advanced_input_validator',
          `検証ルール実行エラー: ${rule.name}`,
          {
            ruleName: rule.name,
            error: error instanceof Error ? error.message : String(error)
          }
        )
      }
    }

    const averageConfidence = validRules > 0 ? totalConfidence / validRules : 0

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue,
      confidence: averageConfidence
    }
  }

  /**
   * JSONペイロード検証
   */
  async validateJSONPayload(
    payload: any, 
    schema: any, 
    context?: ValidationContext
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    let sanitizedPayload = payload

    try {
      // スキーマ検証
      const schemaValidation = this.validateAgainstSchema(payload, schema)
      if (!schemaValidation.isValid) {
        errors.push(...schemaValidation.errors)
      }

      // ペイロードサイズ検証
      const payloadSize = JSON.stringify(payload).length
      if (payloadSize > 1024 * 1024) { // 1MB制限
        errors.push('Payload too large')
        
        await this.auditLogger.logSecurityEvent(
          'oversized_payload',
          'high',
          'advanced_input_validator',
          `過大なペイロードを検出: ${payloadSize} bytes`,
          { size: payloadSize, field: context?.field }
        )
      }

      // 深度検証
      const depth = this.calculateObjectDepth(payload)
      if (depth > 20) {
        errors.push('Object depth too high')
        
        await this.auditLogger.logSecurityEvent(
          'deep_object_nesting',
          'medium',
          'advanced_input_validator',
          `深いオブジェクトネスト: ${depth} levels`,
          { depth, field: context?.field }
        )
      }

      // 各フィールドの再帰的検証
      if (typeof payload === 'object' && payload !== null) {
        sanitizedPayload = await this.validateObjectRecursively(payload, context)
      }

    } catch (error) {
      errors.push('JSON payload validation failed')
      
      await this.auditLogger.logSecurityEvent(
        'json_validation_error',
        'medium',
        'advanced_input_validator',
        'JSON ペイロード検証エラー',
        {
          error: error instanceof Error ? error.message : String(error),
          field: context?.field
        }
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: sanitizedPayload,
      confidence: errors.length === 0 ? 0.9 : 0.1
    }
  }

  /**
   * ファイル検証
   */
  async validateFile(
    file: File, 
    context?: ValidationContext
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // ファイルサイズ検証
      if (file.size > this.fileValidationConfig.maxSize) {
        errors.push(`File too large: ${file.size} bytes`)
      }

      // ファイルタイプ検証
      if (!this.fileValidationConfig.allowedTypes.includes(file.type)) {
        errors.push(`Invalid file type: ${file.type}`)
      }

      // ファイル拡張子検証
      const extension = this.getFileExtension(file.name)
      if (!this.fileValidationConfig.allowedExtensions.includes(extension)) {
        errors.push(`Invalid file extension: ${extension}`)
      }

      // MIME タイプと拡張子の整合性チェック
      const mimeExtensionMatch = this.validateMimeExtensionMatch(file.type, extension)
      if (!mimeExtensionMatch) {
        warnings.push('MIME type and extension mismatch')
        
        await this.auditLogger.logSecurityEvent(
          'mime_extension_mismatch',
          'medium',
          'advanced_input_validator',
          'MIME タイプと拡張子の不整合',
          {
            fileName: file.name,
            mimeType: file.type,
            extension,
            size: file.size
          }
        )
      }

      // ファイル内容の検証
      if (this.fileValidationConfig.validateStructure) {
        const contentValidation = await this.validateFileContent(file)
        if (!contentValidation.isValid) {
          errors.push(...contentValidation.errors)
          warnings.push(...contentValidation.warnings)
        }
      }

      // マルウェアスキャン（簡易版）
      if (this.fileValidationConfig.scanForMalware) {
        const malwareCheck = await this.scanForMalware(file)
        if (!malwareCheck.isValid) {
          errors.push(...malwareCheck.errors)
        }
      }

      // メタデータ検証
      if (this.fileValidationConfig.checkMetadata) {
        const metadataCheck = await this.validateFileMetadata(file)
        warnings.push(...metadataCheck.warnings)
      }

    } catch (error) {
      errors.push('File validation failed')
      
      await this.auditLogger.logSecurityEvent(
        'file_validation_error',
        'medium',
        'advanced_input_validator',
        'ファイル検証エラー',
        {
          fileName: file.name,
          error: error instanceof Error ? error.message : String(error)
        }
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 0.8 : 0.2
    }
  }

  /**
   * ビジネスルール検証
   */
  async validateBusinessRules(
    entity: string, 
    data: any, 
    context?: ValidationContext
  ): Promise<ValidationResult> {
    const rules = this.businessRules.get(entity) || []
    const errors: string[] = []
    const warnings: string[] = []

    for (const rule of rules) {
      try {
        if (!rule.condition(data, context)) {
          if (rule.severity === 'critical' || rule.severity === 'high') {
            errors.push(rule.message)
          } else {
            warnings.push(rule.message)
          }

          await this.auditLogger.logSecurityEvent(
            'business_rule_violation',
            rule.severity as any,
            'advanced_input_validator',
            `ビジネスルール違反: ${rule.name}`,
            {
              entity,
              ruleName: rule.name,
              message: rule.message,
              userId: context?.userId
            }
          )
        }
      } catch (error) {
        warnings.push(`Business rule execution failed: ${rule.name}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 0.9 : 0.3
    }
  }

  // 個別検証メソッド

  private validateSQLInjection(value: string): ValidationResult {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\s)/i,
      /(\b(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/i,
      /(['"];?\s*(DROP|DELETE|INSERT|UPDATE)\s)/i,
      /(UNION\s+SELECT)/i,
      /(\b(EXEC|EXECUTE)\s*\()/i,
      /(--|\/\*|\*\/)/,
      /(\bCHAR\s*\(\s*\d+\s*\))/i,
      /(\bCONCAT\s*\()/i
    ]

    const suspiciousPatterns = sqlPatterns.filter(pattern => pattern.test(value))
    
    return {
      isValid: suspiciousPatterns.length === 0,
      errors: suspiciousPatterns.length > 0 ? ['Potential SQL injection detected'] : [],
      warnings: [],
      sanitizedValue: sanitizeInput(value),
      confidence: suspiciousPatterns.length === 0 ? 0.9 : 0.1
    }
  }

  private validateXSS(value: string): ValidationResult {
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
      /<embed[\s\S]*?>/gi,
      /<link[\s\S]*?>/gi,
      /javascript\s*:/gi,
      /on\w+\s*=/gi,
      /<img[\s\S]*?onerror[\s\S]*?>/gi,
      /<svg[\s\S]*?onload[\s\S]*?>/gi
    ]

    const suspiciousPatterns = xssPatterns.filter(pattern => pattern.test(value))
    
    return {
      isValid: suspiciousPatterns.length === 0,
      errors: suspiciousPatterns.length > 0 ? ['Potential XSS attack detected'] : [],
      warnings: [],
      sanitizedValue: sanitizeInput(value),
      confidence: suspiciousPatterns.length === 0 ? 0.9 : 0.1
    }
  }

  private validateCommandInjection(value: string): ValidationResult {
    const commandPatterns = [
      /[;&|`$\\]/,
      /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|wget|curl)\b/i,
      /(\|\s*(cat|ls|pwd|whoami|id|uname|ps|netstat))/i,
      /(&&|\|\|)/,
      /\$\(.*\)/,
      /`.*`/,
      /\b(rm|mv|cp|chmod|chown|kill|killall)\b/i
    ]

    const suspiciousPatterns = commandPatterns.filter(pattern => pattern.test(value))
    
    return {
      isValid: suspiciousPatterns.length === 0,
      errors: suspiciousPatterns.length > 0 ? ['Potential command injection detected'] : [],
      warnings: [],
      sanitizedValue: value.replace(/[;&|`$\\]/g, ''),
      confidence: suspiciousPatterns.length === 0 ? 0.9 : 0.1
    }
  }

  private validatePathTraversal(value: string): ValidationResult {
    const pathTraversalPatterns = [
      /\.\.\//,
      /\.\.\\/, 
      /%2e%2e%2f/i,
      /%2e%2e%5c/i,
      /\.\.%2f/i,
      /\.\.%5c/i,
      /\/etc\/passwd/i,
      /\/windows\/system32/i
    ]

    const suspiciousPatterns = pathTraversalPatterns.filter(pattern => pattern.test(value))
    
    return {
      isValid: suspiciousPatterns.length === 0,
      errors: suspiciousPatterns.length > 0 ? ['Potential path traversal detected'] : [],
      warnings: [],
      sanitizedValue: value.replace(/\.\.\//g, '').replace(/\.\.\\//g, ''),
      confidence: suspiciousPatterns.length === 0 ? 0.9 : 0.1
    }
  }

  private validateNumberRange(value: number, context?: ValidationContext): ValidationResult {
    // デフォルトの安全な範囲
    const minValue = -1000000
    const maxValue = 1000000
    
    const isValid = value >= minValue && value <= maxValue && Number.isFinite(value)
    
    return {
      isValid,
      errors: isValid ? [] : ['Number out of safe range'],
      warnings: [],
      confidence: isValid ? 0.9 : 0.1
    }
  }

  private validateNumberPrecision(value: number): ValidationResult {
    const maxDecimalPlaces = 10
    const decimalPlaces = (value.toString().split('.')[1] || '').length
    
    const isValid = decimalPlaces <= maxDecimalPlaces
    
    return {
      isValid,
      errors: isValid ? [] : ['Number precision too high'],
      warnings: [],
      confidence: isValid ? 0.9 : 0.7
    }
  }

  private validateObjectStructure(value: any, context?: ValidationContext): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // プロトタイプ汚染チェック
    if (value.hasOwnProperty('__proto__') || 
        value.hasOwnProperty('constructor') || 
        value.hasOwnProperty('prototype')) {
      errors.push('Potential prototype pollution detected')
    }

    // 循環参照チェック
    try {
      JSON.stringify(value)
    } catch (error) {
      if (error instanceof Error && error.message.includes('circular')) {
        errors.push('Circular reference detected')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 0.8 : 0.2
    }
  }

  private validateObjectSize(value: any): ValidationResult {
    const maxProperties = 1000
    const maxSize = 1024 * 1024 // 1MB

    let propertyCount = 0
    let estimatedSize = 0

    try {
      propertyCount = Object.keys(value).length
      estimatedSize = JSON.stringify(value).length
    } catch (error) {
      return {
        isValid: false,
        errors: ['Cannot calculate object size'],
        warnings: [],
        confidence: 0.1
      }
    }

    const errors: string[] = []
    
    if (propertyCount > maxProperties) {
      errors.push(`Too many properties: ${propertyCount}`)
    }
    
    if (estimatedSize > maxSize) {
      errors.push(`Object too large: ${estimatedSize} bytes`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      confidence: errors.length === 0 ? 0.9 : 0.3
    }
  }

  private validateArrayLength(value: any[], context?: ValidationContext): ValidationResult {
    const maxLength = 10000
    const isValid = value.length <= maxLength
    
    return {
      isValid,
      errors: isValid ? [] : [`Array too long: ${value.length}`],
      warnings: [],
      confidence: isValid ? 0.9 : 0.3
    }
  }

  private validateEmailFormat(value: string): ValidationResult {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    const isValid = emailRegex.test(value)
    
    return {
      isValid,
      errors: isValid ? [] : ['Invalid email format'],
      warnings: [],
      confidence: isValid ? 0.9 : 0.1
    }
  }

  private validateEmailDomain(value: string): ValidationResult {
    const suspiciousDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com'
    ]

    const domain = value.split('@')[1]?.toLowerCase()
    const isSuspicious = suspiciousDomains.includes(domain)
    
    return {
      isValid: !isSuspicious,
      errors: [],
      warnings: isSuspicious ? ['Suspicious email domain'] : [],
      confidence: isSuspicious ? 0.5 : 0.9
    }
  }

  private validateURLProtocol(value: string): ValidationResult {
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']
    
    try {
      const url = new URL(value)
      const isValid = allowedProtocols.includes(url.protocol)
      
      return {
        isValid,
        errors: isValid ? [] : [`Invalid protocol: ${url.protocol}`],
        warnings: [],
        confidence: isValid ? 0.9 : 0.1
      }
    } catch {
      return {
        isValid: false,
        errors: ['Invalid URL format'],
        warnings: [],
        confidence: 0.1
      }
    }
  }

  private validateURLDomain(value: string): ValidationResult {
    const allowedDomains = [
      'example.com',
      'github.com',
      'stackoverflow.com'
    ]

    try {
      const url = new URL(value)
      const isAllowed = allowedDomains.some(domain => 
        url.hostname === domain || url.hostname.endsWith(`.${  domain}`)
      )
      
      return {
        isValid: isAllowed,
        errors: isAllowed ? [] : [`Domain not whitelisted: ${url.hostname}`],
        warnings: [],
        confidence: isAllowed ? 0.9 : 0.3
      }
    } catch {
      return {
        isValid: false,
        errors: ['Invalid URL format'],
        warnings: [],
        confidence: 0.1
      }
    }
  }

  // ヘルパーメソッド

  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !isNaN(value)
      case 'boolean':
        return typeof value === 'boolean'
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value)
      case 'array':
        return Array.isArray(value)
      case 'email':
        return typeof value === 'string'
      case 'url':
        return typeof value === 'string'
      default:
        return false
    }
  }

  private validateAgainstSchema(payload: any, schema: any): ValidationResult {
    // 簡易スキーマ検証（実際にはAjvなどのライブラリを使用）
    const errors: string[] = []
    
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in payload)) {
          errors.push(`Required field missing: ${field}`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      confidence: errors.length === 0 ? 0.8 : 0.2
    }
  }

  private calculateObjectDepth(obj: any, depth = 0): number {
    if (depth > 50) return depth // 循環参照防止
    if (typeof obj !== 'object' || obj === null) return depth

    let maxDepth = depth
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const childDepth = this.calculateObjectDepth(obj[key], depth + 1)
        maxDepth = Math.max(maxDepth, childDepth)
      }
    }

    return maxDepth
  }

  private async validateObjectRecursively(obj: any, context?: ValidationContext): Promise<any> {
    const sanitized: any = {}

    for (const [key, value] of Object.entries(obj)) {
      const fieldContext = {
        ...context,
        field: context?.field ? `${context.field}.${key}` : key
      }

      if (typeof value === 'string') {
        const validation = await this.validateInput(value, 'string', fieldContext)
        sanitized[key] = validation.sanitizedValue || value
      } else if (typeof value === 'number') {
        const validation = await this.validateInput(value, 'number', fieldContext)
        sanitized[key] = validation.sanitizedValue || value
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          sanitized[key] = value // 配列の詳細検証は省略
        } else {
          sanitized[key] = await this.validateObjectRecursively(value, fieldContext)
        }
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  private getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'))
  }

  private validateMimeExtensionMatch(mimeType: string, extension: string): boolean {
    const mimeExtensionMap: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'text/plain': ['.txt'],
      'application/json': ['.json']
    }

    const expectedExtensions = mimeExtensionMap[mimeType]
    return expectedExtensions ? expectedExtensions.includes(extension) : false
  }

  private async validateFileContent(file: File): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // ファイルヘッダーの確認（マジックナンバー）
      const buffer = await file.slice(0, 20).arrayBuffer()
      const header = new Uint8Array(buffer)
      
      if (!this.validateFileHeader(header, file.type)) {
        warnings.push('File header does not match MIME type')
      }

    } catch (error) {
      errors.push('Cannot read file content')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 0.8 : 0.3
    }
  }

  private validateFileHeader(header: Uint8Array, mimeType: string): boolean {
    // 簡易マジックナンバーチェック
    const magicNumbers: Record<string, number[][]> = {
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38]]
    }

    const expectedMagic = magicNumbers[mimeType]
    if (!expectedMagic) return true // 未知のタイプは通す

    return expectedMagic.some(magic => 
      magic.every((byte, index) => header[index] === byte)
    )
  }

  private async scanForMalware(file: File): Promise<ValidationResult> {
    // 簡易マルウェアスキャン（実際にはより高度な検出が必要）
    const suspiciousPatterns = [
      'eval(',
      'document.write(',
      'setTimeout(',
      'setInterval(',
      '<script',
      'javascript:',
      'vbscript:'
    ]

    try {
      const content = await file.text()
      const foundPatterns = suspiciousPatterns.filter(pattern => 
        content.toLowerCase().includes(pattern)
      )

      return {
        isValid: foundPatterns.length === 0,
        errors: foundPatterns.length > 0 ? ['Suspicious content detected'] : [],
        warnings: [],
        confidence: foundPatterns.length === 0 ? 0.7 : 0.1
      }
    } catch {
      return {
        isValid: true,
        errors: [],
        warnings: ['Cannot scan file content'],
        confidence: 0.5
      }
    }
  }

  private async validateFileMetadata(file: File): ValidationResult {
    const warnings: string[] = []

    // ファイル名の検証
    if (file.name.length > 255) {
      warnings.push('Filename too long')
    }

    if (/[<>:"/\\|?*]/.test(file.name)) {
      warnings.push('Filename contains invalid characters')
    }

    // 最終更新日の検証
    if (file.lastModified > Date.now()) {
      warnings.push('File modification date is in the future')
    }

    return {
      isValid: true,
      errors: [],
      warnings,
      confidence: 0.8
    }
  }

  private sanitizeLogValue(value: any): string {
    const stringValue = String(value)
    if (stringValue.length > 100) {
      return `${stringValue.slice(0, 100)  }...`
    }
    return stringValue
  }
}

// エクスポート用インスタンス
export const advancedInputValidator = AdvancedInputValidator.getInstance()