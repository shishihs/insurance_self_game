import type { DomainEvent } from './DomainEvent'
import type { EntityId } from './EntityId'

/**
 * Aggregate Root Base Class
 * 
 * Implements the foundational pattern for DDD aggregate roots with:
 * - Domain event collection and management
 * - Identity management
 * - Invariant enforcement
 */
export abstract class AggregateRoot<TId extends EntityId> {
  private _domainEvents: DomainEvent[] = []
  private _version: number = 0
  
  constructor(protected readonly _id: TId) {}

  /**
   * Get the aggregate's unique identifier
   */
  get id(): TId {
    return this._id
  }

  /**
   * Get the current version (for optimistic concurrency control)
   */
  get version(): number {
    return this._version
  }

  /**
   * Increment version (called after successful persistence)
   */
  incrementVersion(): void {
    this._version++
  }

  /**
   * Add a domain event to be published after persistence
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  /**
   * Get all uncommitted domain events
   */
  getUncommittedEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents]
  }

  /**
   * Mark all events as committed (clear the events list)
   */
  markEventsAsCommitted(): void {
    this._domainEvents = []
  }

  /**
   * Check if the aggregate has uncommitted events
   */
  hasUncommittedEvents(): boolean {
    return this._domainEvents.length > 0
  }

  /**
   * Equality comparison based on ID
   */
  equals(other: AggregateRoot<TId>): boolean {
    if (!other || other.constructor !== this.constructor) {
      return false
    }
    return this._id.equals(other._id)
  }

  /**
   * Validate the aggregate's invariants
   * Override in derived classes to implement specific business rules
   */
  protected abstract validateInvariants(): void

  /**
   * Apply business rules and ensure consistency
   * Call this method after any state change
   */
  protected ensureInvariants(): void {
    this.validateInvariants()
  }
}