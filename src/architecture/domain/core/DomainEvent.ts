import type { EntityId } from './EntityId'

/**
 * Base interface for all domain events
 * 
 * Implements the Domain Event pattern with:
 * - Event identification and timing
 * - Aggregate association
 * - Metadata for event processing
 */
export interface DomainEvent {
  /**
   * Unique identifier for this event instance
   */
  readonly eventId: string

  /**
   * Type of the event (used for routing and handling)
   */
  readonly eventType: string

  /**
   * ID of the aggregate that produced this event
   */
  readonly aggregateId: EntityId

  /**
   * Type of the aggregate that produced this event
   */
  readonly aggregateType: string

  /**
   * Version of the aggregate when the event was produced
   */
  readonly aggregateVersion: number

  /**
   * Timestamp when the event occurred
   */
  readonly occurredAt: Date

  /**
   * Event payload data
   */
  readonly eventData: Record<string, any>

  /**
   * Metadata for event processing
   */
  readonly metadata: EventMetadata
}

/**
 * Metadata associated with domain events
 */
export interface EventMetadata {
  /**
   * User or system that triggered the event
   */
  readonly causedBy?: string

  /**
   * Correlation ID for tracking related events
   */
  readonly correlationId?: string

  /**
   * Context information
   */
  readonly context?: Record<string, any>
}

/**
 * Abstract base class for domain events
 */
export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string
  public readonly occurredAt: Date
  public readonly metadata: EventMetadata

  constructor(
    public readonly eventType: string,
    public readonly aggregateId: EntityId,
    public readonly aggregateType: string,
    public readonly aggregateVersion: number,
    public readonly eventData: Record<string, any>,
    metadata: Partial<EventMetadata> = {}
  ) {
    this.eventId = crypto.randomUUID()
    this.occurredAt = new Date()
    this.metadata = {
      correlationId: metadata.correlationId || crypto.randomUUID(),
      ...metadata
    }
  }
}

/**
 * Type for event handlers
 */
export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (event: TEvent) => void | Promise<void>

/**
 * Interface for event publishers
 */
export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>
  publishAll(events: DomainEvent[]): Promise<void>
}

/**
 * Interface for event subscribers
 */
export interface EventSubscriber {
  subscribe<TEvent extends DomainEvent>(
    eventType: string,
    handler: EventHandler<TEvent>
  ): void
  
  unsubscribe(eventType: string, handler: EventHandler): void
}