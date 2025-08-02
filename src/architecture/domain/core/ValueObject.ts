/**
 * Base class for Value Objects
 * 
 * Implements the Value Object pattern with:
 * - Immutability
 * - Structural equality
 * - Validation rules
 * - Type safety
 */
export abstract class ValueObject<T = any> {
  constructor(protected readonly props: T) {
    this.validate(props)
  }

  /**
   * Get the value properties
   */
  getValue(): T {
    return this.props
  }

  /**
   * Validate the value object's properties
   * Override in derived classes for specific validation rules
   */
  protected abstract validate(props: T): void

  /**
   * Equality comparison based on structural equality
   */
  equals(other: ValueObject<T>): boolean {
    if (!other || other.constructor !== this.constructor) {
      return false
    }
    
    return this.deepEquals(this.props, other.props)
  }

  /**
   * Deep equality comparison for complex objects
   */
  private deepEquals(a: any, b: any): boolean {
    if (a === b) return true
    
    if (a === null || b === null || a === undefined || b === undefined) {
      return a === b
    }
    
    if (typeof a !== typeof b) return false
    
    if (typeof a === 'object') {
      const aKeys = Object.keys(a)
      const bKeys = Object.keys(b)
      
      if (aKeys.length !== bKeys.length) return false
      
      for (const key of aKeys) {
        if (!bKeys.includes(key)) return false
        if (!this.deepEquals(a[key], b[key])) return false
      }
      
      return true
    }
    
    return false
  }

  /**
   * Create a new instance with modified properties (immutable update)
   */
  protected withProps(newProps: Partial<T>): this {
    const UpdatedClass = this.constructor as new (props: T) => this
    return new UpdatedClass({ ...this.props, ...newProps })
  }

  /**
   * String representation
   */
  toString(): string {
    return JSON.stringify(this.props)
  }

  /**
   * JSON serialization
   */
  toJSON(): T {
    return this.props
  }
}

/**
 * Simple value object for primitive values
 */
export class PrimitiveValueObject<T extends string | number | boolean> extends ValueObject<T> {
  constructor(value: T) {
    super(value)
  }

  protected validate(value: T): void {
    if (value === null || value === undefined) {
      throw new Error('Value cannot be null or undefined')
    }
  }

  getValue(): T {
    return this.props
  }
}

/**
 * Numeric value object with range validation
 */
export class NumericValueObject extends ValueObject<number> {
  constructor(
    value: number,
    private readonly min?: number,
    private readonly max?: number
  ) {
    super(value)
  }

  protected validate(value: number): void {
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new Error('Value must be a finite number')
    }

    if (this.min !== undefined && value < this.min) {
      throw new Error(`Value ${value} is below minimum ${this.min}`)
    }

    if (this.max !== undefined && value > this.max) {
      throw new Error(`Value ${value} is above maximum ${this.max}`)
    }
  }

  getValue(): number {
    return this.props
  }

  add(amount: number): this {
    return this.withProps(this.props + amount)
  }

  subtract(amount: number): this {
    return this.withProps(this.props - amount)
  }

  multiply(factor: number): this {
    return this.withProps(this.props * factor)
  }

  isZero(): boolean {
    return this.props === 0
  }

  isPositive(): boolean {
    return this.props > 0
  }

  isNegative(): boolean {
    return this.props < 0
  }
}