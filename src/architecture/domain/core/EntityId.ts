/**
 * Base class for strongly-typed entity identifiers
 * 
 * Implements the Identity pattern with:
 * - Type safety for entity IDs
 * - Value object semantics
 * - Validation rules
 */
export abstract class EntityId {
  constructor(private readonly value: string) {
    this.validateId(value)
  }

  /**
   * Get the string value of the ID
   */
  getValue(): string {
    return this.value
  }

  /**
   * Validate the ID format
   * Override in derived classes for specific validation rules
   */
  protected validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Entity ID cannot be empty')
    }
    
    if (id.length > 100) {
      throw new Error('Entity ID cannot exceed 100 characters')
    }
  }

  /**
   * Equality comparison
   */
  equals(other: EntityId): boolean {
    if (!other || other.constructor !== this.constructor) {
      return false
    }
    return this.value === other.value
  }

  /**
   * String representation
   */
  toString(): string {
    return this.value
  }

  /**
   * JSON serialization
   */
  toJSON(): string {
    return this.value
  }
}

/**
 * Generate a UUID-based ID
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Generate a timestamp-based ID with optional prefix
 */
export function generateTimestampId(prefix?: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  const id = `${timestamp}${random}`
  
  return prefix ? `${prefix}_${id}` : id
}