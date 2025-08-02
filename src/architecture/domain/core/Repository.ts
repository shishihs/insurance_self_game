import type { AggregateRoot } from './AggregateRoot'
import type { EntityId } from './EntityId'

/**
 * Generic repository interface for aggregate persistence
 * 
 * Implements the Repository pattern with:
 * - Generic type safety
 * - Standard CRUD operations
 * - Query capabilities
 * - Transaction support
 */
export interface Repository<T extends AggregateRoot<TId>, TId extends EntityId> {
  /**
   * Find an aggregate by its ID
   */
  findById(id: TId): Promise<T | null>

  /**
   * Find aggregates by a specification
   */
  findBySpecification(spec: Specification<T>): Promise<T[]>

  /**
   * Save an aggregate (insert or update)
   */
  save(aggregate: T): Promise<void>

  /**
   * Delete an aggregate
   */
  delete(aggregate: T): Promise<void>

  /**
   * Check if an aggregate exists
   */
  exists(id: TId): Promise<boolean>

  /**
   * Get the next available ID
   */
  nextId(): TId
}

/**
 * Specification interface for query criteria
 */
export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean
  and(other: Specification<T>): Specification<T>
  or(other: Specification<T>): Specification<T>
  not(): Specification<T>
}

/**
 * Abstract base class for specifications
 */
export abstract class BaseSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other)
  }

  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other)
  }

  not(): Specification<T> {
    return new NotSpecification(this)
  }
}

/**
 * Composite specifications
 */
class AndSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>
  ) {
    super()
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate)
  }
}

class OrSpecification<T> extends BaseSpecification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>
  ) {
    super()
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate)
  }
}

class NotSpecification<T> extends BaseSpecification<T> {
  constructor(private readonly spec: Specification<T>) {
    super()
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate)
  }
}

/**
 * Unit of Work interface for transaction management
 */
export interface UnitOfWork {
  /**
   * Register an aggregate as new
   */
  registerNew<T extends AggregateRoot<any>>(aggregate: T, repository: Repository<T, any>): void

  /**
   * Register an aggregate as dirty (modified)
   */
  registerDirty<T extends AggregateRoot<any>>(aggregate: T, repository: Repository<T, any>): void

  /**
   * Register an aggregate for deletion
   */
  registerDeleted<T extends AggregateRoot<any>>(aggregate: T, repository: Repository<T, any>): void

  /**
   * Commit all changes in a single transaction
   */
  commit(): Promise<void>

  /**
   * Roll back all changes
   */
  rollback(): Promise<void>
}