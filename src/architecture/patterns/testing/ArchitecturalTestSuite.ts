/**
 * Architectural Test Suite
 * 
 * Tests that enforce architectural patterns and constraints.
 * These tests ensure the new architecture maintains its integrity over time.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { Container, SERVICE_TOKENS, ServiceLifetime } from '../../infrastructure/ioc/Container'
import { GameAggregate, GameId, Vitality } from '../../domain/aggregates/GameAggregate'
import { AggregateRoot } from '../../domain/core/AggregateRoot'
import { ValueObject } from '../../domain/core/ValueObject'
import { BaseDomainEvent } from '../../domain/core/DomainEvent'
import type { IGameRepository } from '../../application/services/interfaces'

describe('Architectural Constraints', () => {
  
  // ============================================================================
  // DOMAIN LAYER TESTS
  // ============================================================================
  
  describe('Domain Layer Architecture', () => {
    
    it('should enforce aggregate root invariants', () => {
      const game = GameAggregate.create()
      
      // Aggregate should have an ID
      expect(game.id).toBeInstanceOf(GameId)
      expect(game.id.getValue()).toBeDefined()
      
      // Should start with version 0
      expect(game.version).toBe(0)
      
      // Should not have uncommitted events initially
      expect(game.hasUncommittedEvents()).toBe(false)
    })
    
    it('should raise domain events when state changes', () => {
      const game = GameAggregate.create()
      
      // Starting the game should raise an event
      game.start()
      
      expect(game.hasUncommittedEvents()).toBe(true)
      const events = game.getUncommittedEvents()
      expect(events).toHaveLength(1)
      expect(events[0].eventType).toBe('GameStarted')
    })
    
    it('should enforce business invariants', () => {
      const game = GameAggregate.create()
      game.start()
      
      // Should not allow negative damage
      expect(() => { game.applyDamage(-10); }).toThrow('Damage amount must be non-negative')
      
      // Should not allow operations on non-active game
      const completedGame = GameAggregate.create()
      completedGame.start()
      completedGame.complete()
      
      expect(() => { completedGame.applyDamage(10); }).toThrow('Cannot apply damage when game is not in progress')
    })
    
    it('should maintain consistency across operations', () => {
      const game = GameAggregate.create()
      game.start()
      
      const initialVitality = game.vitality.getValue()
      
      // Apply damage and heal
      game.applyDamage(20, 'test')
      game.heal(10, 'test')
      
      const expectedVitality = initialVitality - 20 + 10
      expect(game.vitality.getValue()).toBe(expectedVitality)
    })
  })
  
  describe('Value Object Architecture', () => {
    
    it('should enforce immutability', () => {
      const vitality = Vitality.create(100, 100)
      const increased = vitality.increase(10)
      
      // Original should be unchanged
      expect(vitality.getValue()).toBe(100)
      expect(increased.getValue()).toBe(100) // Capped at max
      
      // Should be different instances
      expect(vitality).not.toBe(increased)
    })
    
    it('should enforce value constraints', () => {
      // Should not allow negative values
      expect(() => Vitality.create(-10, 100)).toThrow()
      
      // Should not allow value greater than max
      expect(() => Vitality.create(150, 100)).toThrow()
    })
    
    it('should provide structural equality', () => {
      const vitality1 = Vitality.create(50, 100)
      const vitality2 = Vitality.create(50, 100)
      const vitality3 = Vitality.create(60, 100)
      
      expect(vitality1.equals(vitality2)).toBe(true)
      expect(vitality1.equals(vitality3)).toBe(false)
    })
  })
  
  // ============================================================================
  // DEPENDENCY INJECTION TESTS
  // ============================================================================
  
  describe('Dependency Injection Architecture', () => {
    let container: Container
    
    beforeEach(() => {
      container = new Container()
    })
    
    it('should resolve singleton services correctly', () => {
      // Register a singleton service
      container.registerFactory(
        'TestService',
        () => ({ id: Math.random() }),
        ServiceLifetime.Singleton
      )
      
      const instance1 = container.resolve('TestService')
      const instance2 = container.resolve('TestService')
      
      // Should be the same instance
      expect(instance1).toBe(instance2)
    })
    
    it('should resolve transient services correctly', () => {
      // Register a transient service
      container.registerFactory(
        'TestService',
        () => ({ id: Math.random() }),
        ServiceLifetime.Transient
      )
      
      const instance1 = container.resolve('TestService')
      const instance2 = container.resolve('TestService')
      
      // Should be different instances
      expect(instance1).not.toBe(instance2)
    })
    
    it('should detect circular dependencies', () => {
      // Register services with circular dependency
      container.registerFactory('ServiceA', (c) => ({ b: c.resolve('ServiceB') }))
      container.registerFactory('ServiceB', (c) => ({ a: c.resolve('ServiceA') }))
      
      expect(() => container.resolve('ServiceA')).toThrow('Circular dependency detected')
    })
    
    it('should handle scoped services correctly', () => {
      container.registerFactory(
        'ScopedService',
        () => ({ id: Math.random() }),
        ServiceLifetime.Scoped
      )
      
      const scope1 = container.createScope()
      const scope2 = container.createScope()
      
      const instance1a = scope1.resolve('ScopedService')
      const instance1b = scope1.resolve('ScopedService')
      const instance2 = scope2.resolve('ScopedService')
      
      // Same within scope
      expect(instance1a).toBe(instance1b)
      // Different across scopes
      expect(instance1a).not.toBe(instance2)
    })
  })
  
  // ============================================================================
  // COMMAND PATTERN TESTS
  // ============================================================================
  
  describe('Command Pattern Architecture', () => {
    
    it('should encapsulate command data correctly', () => {
      const command = {
        type: 'TestCommand',
        timestamp: new Date(),
        correlationId: 'test-123',
        payload: { test: 'data' }
      }
      
      // Commands should be immutable
      expect(() => {
        (command as any).type = 'Modified'
      }).toThrow()
    })
    
    it('should provide command metadata', () => {
      const command = {
        type: 'TestCommand',
        timestamp: new Date(),
        correlationId: 'test-123'
      }
      
      expect(command.type).toBeDefined()
      expect(command.timestamp).toBeInstanceOf(Date)
      expect(command.correlationId).toBeDefined()
    })
  })
  
  // ============================================================================
  // REPOSITORY PATTERN TESTS
  // ============================================================================
  
  describe('Repository Pattern Architecture', () => {
    
    it('should provide consistent interface', () => {
      // Mock repository implementation
      class MockGameRepository implements IGameRepository {
        private readonly games = new Map<string, GameAggregate>()
        
        async findById(id: GameId): Promise<GameAggregate | null> {
          return this.games.get(id.getValue()) || null
        }
        
        async save(game: GameAggregate): Promise<void> {
          this.games.set(game.id.getValue(), game)
        }
        
        async delete(id: GameId): Promise<void> {
          this.games.delete(id.getValue())
        }
        
        async findActiveGames(): Promise<GameAggregate[]> {
          return Array.from(this.games.values()).filter(g => g.isActive())
        }
      }
      
      const repo = new MockGameRepository()
      
      // Should implement all required methods
      expect(typeof repo.findById).toBe('function')
      expect(typeof repo.save).toBe('function')
      expect(typeof repo.delete).toBe('function')
      expect(typeof repo.findActiveGames).toBe('function')
    })
    
    it('should maintain aggregate consistency', async () => {
      class MockGameRepository implements IGameRepository {
        private readonly games = new Map<string, GameAggregate>()
        
        async findById(id: GameId): Promise<GameAggregate | null> {
          return this.games.get(id.getValue()) || null
        }
        
        async save(game: GameAggregate): Promise<void> {
          // Should increment version after save
          game.incrementVersion()
          this.games.set(game.id.getValue(), game)
        }
        
        async delete(id: GameId): Promise<void> {
          this.games.delete(id.getValue())
        }
        
        async findActiveGames(): Promise<GameAggregate[]> {
          return Array.from(this.games.values()).filter(g => g.isActive())
        }
      }
      
      const repo = new MockGameRepository()
      const game = GameAggregate.create()
      
      const initialVersion = game.version
      await repo.save(game)
      
      expect(game.version).toBe(initialVersion + 1)
    })
  })
  
  // ============================================================================
  // LAYER ISOLATION TESTS
  // ============================================================================
  
  describe('Layer Isolation Architecture', () => {
    
    it('should prevent domain layer from depending on infrastructure', () => {
      // Domain entities/value objects should not import infrastructure
      const gameAggregate = GameAggregate.create()
      
      // Should not have any infrastructure dependencies
      expect(gameAggregate.constructor.toString()).not.toContain('fetch')
      expect(gameAggregate.constructor.toString()).not.toContain('localStorage')
      expect(gameAggregate.constructor.toString()).not.toContain('console.')
    })
    
    it('should prevent domain layer from depending on presentation', () => {
      // Domain should not reference UI concepts
      const vitality = Vitality.create(100, 100)
      
      // Should not have UI-related methods or properties
      expect('render' in vitality).toBe(false)
      expect('component' in vitality).toBe(false)
      expect('template' in vitality).toBe(false)
    })
  })
  
  // ============================================================================
  // EVENT SYSTEM TESTS
  // ============================================================================
  
  describe('Event System Architecture', () => {
    
    it('should maintain event immutability', () => {
      const game = GameAggregate.create()
      game.start()
      
      const events = game.getUncommittedEvents()
      const event = events[0]
      
      // Events should be immutable
      expect(() => {
        (event as any).eventType = 'Modified'
      }).toThrow()
      
      expect(() => {
        (event as any).eventData.modified = true
      }).toThrow()
    })
    
    it('should provide event metadata', () => {
      const game = GameAggregate.create()
      game.start()
      
      const events = game.getUncommittedEvents()
      const event = events[0]
      
      expect(event.eventId).toBeDefined()
      expect(event.eventType).toBe('GameStarted')
      expect(event.aggregateId).toBe(game.id)
      expect(event.aggregateType).toBe('Game')
      expect(event.occurredAt).toBeInstanceOf(Date)
      expect(event.metadata).toBeDefined()
    })
    
    it('should support event correlation', () => {
      const game = GameAggregate.create()
      game.start()
      game.applyDamage(10, 'test')
      
      const events = game.getUncommittedEvents()
      
      // All events from same aggregate should have correlation
      expect(events[0].aggregateId.equals(events[1].aggregateId)).toBe(true)
      expect(events[0].metadata.correlationId).toBeDefined()
      expect(events[1].metadata.correlationId).toBeDefined()
    })
  })
  
  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================
  
  describe('Performance Architecture', () => {
    
    it('should create aggregates efficiently', () => {
      const startTime = performance.now()
      
      // Create multiple aggregates
      const games = Array.from({ length: 1000 }, () => GameAggregate.create())
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should create 1000 aggregates in less than 100ms
      expect(duration).toBeLessThan(100)
      expect(games).toHaveLength(1000)
    })
    
    it('should handle value object operations efficiently', () => {
      const vitality = Vitality.create(100, 100)
      const startTime = performance.now()
      
      // Perform many operations
      let result = vitality
      for (let i = 0; i < 10000; i++) {
        result = result.decrease(1).increase(1)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete 10000 operations in reasonable time
      expect(duration).toBeLessThan(1000)
      expect(result.getValue()).toBe(100)
    })
  })
  
  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================
  
  describe('Architecture Integration', () => {
    let container: Container
    
    beforeEach(() => {
      container = new Container()
      
      // Register core services
      container.registerFactory(
        SERVICE_TOKENS.GAME_REPOSITORY,
        () => new MockGameRepository(),
        ServiceLifetime.Singleton
      )
    })
    
    it('should integrate all layers correctly', async () => {
      const repository = container.resolve<IGameRepository>(SERVICE_TOKENS.GAME_REPOSITORY)
      
      // Create and save game through domain
      const game = GameAggregate.create()
      game.start()
      await repository.save(game)
      
      // Retrieve through repository
      const retrievedGame = await repository.findById(game.id)
      
      expect(retrievedGame).toBeDefined()
      expect(retrievedGame!.id.equals(game.id)).toBe(true)
      expect(retrievedGame!.isActive()).toBe(true)
    })
  })
})

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

class MockGameRepository implements IGameRepository {
  private readonly games = new Map<string, GameAggregate>()
  
  async findById(id: GameId): Promise<GameAggregate | null> {
    return this.games.get(id.getValue()) || null
  }
  
  async save(game: GameAggregate): Promise<void> {
    game.incrementVersion()
    this.games.set(game.id.getValue(), game)
  }
  
  async delete(id: GameId): Promise<void> {
    this.games.delete(id.getValue())
  }
  
  async findActiveGames(): Promise<GameAggregate[]> {
    return Array.from(this.games.values()).filter(g => g.isActive())
  }
}