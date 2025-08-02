import type { GameAggregate, GameId } from '../../domain/aggregates/GameAggregate'
import type { DomainEvent } from '../../domain/core/DomainEvent'

/**
 * SOLID Principles Applied:
 * 
 * S - Single Responsibility: Each interface has one clear purpose
 * O - Open/Closed: Interfaces are open for extension, closed for modification
 * L - Liskov Substitution: All implementations are interchangeable
 * I - Interface Segregation: Small, focused interfaces rather than large ones
 * D - Dependency Inversion: Depend on abstractions, not concretions
 */

// ============================================================================
// SINGLE RESPONSIBILITY PRINCIPLE - Each interface has one clear purpose
// ============================================================================

/**
 * Game persistence operations
 */
export interface IGameRepository {
  findById(id: GameId): Promise<GameAggregate | null>
  save(game: GameAggregate): Promise<void>
  delete(id: GameId): Promise<void>
  findActiveGames(): Promise<GameAggregate[]>
}

/**
 * Event publishing operations
 */
export interface IEventPublisher {
  publish(event: DomainEvent): Promise<void>
  publishBatch(events: DomainEvent[]): Promise<void>
}

/**
 * Game state queries (CQRS pattern)
 */
export interface IGameQueryService {
  getGameById(id: string): Promise<GameStateDto | null>
  getActiveGames(): Promise<GameSummaryDto[]>
  getGameStatistics(id: string): Promise<GameStatisticsDto | null>
}

/**
 * Card operations
 */
export interface ICardService {
  drawCards(gameId: GameId, count: number): Promise<CardDto[]>
  shuffleDeck(gameId: GameId): Promise<void>
  validateCardPlay(gameId: GameId, cardIds: string[]): Promise<boolean>
}

/**
 * Challenge operations
 */
export interface IChallengeService {
  createChallenge(gameId: GameId, challengeType: string): Promise<ChallengeDto>
  resolveChallenge(gameId: GameId, selectedCards: string[]): Promise<ChallengeResultDto>
  validateChallengeConditions(gameId: GameId): Promise<boolean>
}

// ============================================================================
// INTERFACE SEGREGATION PRINCIPLE - Small, focused interfaces
// ============================================================================

/**
 * Game creation operations (segregated from main game operations)
 */
export interface IGameFactory {
  createNewGame(configuration: GameConfigurationDto): Promise<GameAggregate>
  createFromTemplate(templateId: string): Promise<GameAggregate>
}

/**
 * Game validation operations (segregated from business logic)
 */
export interface IGameValidator {
  validateGameStart(game: GameAggregate): Promise<ValidationResult>
  validateGameAction(game: GameAggregate, action: GameActionDto): Promise<ValidationResult>
  validateGameCompletion(game: GameAggregate): Promise<ValidationResult>
}

/**
 * Game notification operations (segregated from core game logic)
 */
export interface IGameNotificationService {
  notifyGameStarted(gameId: GameId): Promise<void>
  notifyGameEnded(gameId: GameId, result: GameResultDto): Promise<void>
  notifyPlayerAction(gameId: GameId, action: string): Promise<void>
}

/**
 * Game analytics operations (segregated from core game logic)
 */
export interface IGameAnalyticsService {
  trackGameStart(gameId: GameId): Promise<void>
  trackGameAction(gameId: GameId, action: string, metadata: Record<string, any>): Promise<void>
  trackGameEnd(gameId: GameId, result: GameResultDto): Promise<void>
}

// ============================================================================
// DEPENDENCY INVERSION PRINCIPLE - Depend on abstractions
// ============================================================================

/**
 * External services abstraction
 */
export interface IExternalServiceClient {
  sendRequest<T>(endpoint: string, data: any): Promise<T>
  healthCheck(): Promise<boolean>
}

/**
 * Caching abstraction
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

/**
 * Logging abstraction
 */
export interface ILogger {
  info(message: string, metadata?: Record<string, any>): void
  warn(message: string, metadata?: Record<string, any>): void
  error(message: string, error?: Error, metadata?: Record<string, any>): void
  debug(message: string, metadata?: Record<string, any>): void
}

/**
 * Configuration abstraction
 */
export interface IConfigurationService {
  get<T>(key: string, defaultValue?: T): T
  set<T>(key: string, value: T): void
  exists(key: string): boolean
}

// ============================================================================
// DATA TRANSFER OBJECTS (DTOs)
// ============================================================================

export interface GameConfigurationDto {
  difficulty: 'easy' | 'normal' | 'hard'
  startingVitality: number
  maxHandSize: number
  turnsPerStage: number
}

export interface GameStateDto {
  id: string
  status: string
  phase: string
  vitality: number
  maxVitality: number
  currentTurn: number
  startedAt?: string
  completedAt?: string
}

export interface GameSummaryDto {
  id: string
  status: string
  vitality: number
  currentTurn: number
  lastPlayedAt: string
}

export interface GameStatisticsDto {
  gamesPlayed: number
  averageVitality: number
  averageTurns: number
  completionRate: number
}

export interface CardDto {
  id: string
  name: string
  type: string
  power: number
  cost: number
  description: string
}

export interface ChallengeDto {
  id: string
  name: string
  description: string
  requiredPower: number
  rewards: string[]
  penalties: string[]
}

export interface ChallengeResultDto {
  success: boolean
  powerUsed: number
  powerRequired: number
  rewards: string[]
  penalties: string[]
}

export interface GameActionDto {
  type: string
  payload: Record<string, any>
  timestamp: string
}

export interface GameResultDto {
  gameId: string
  status: 'completed' | 'game_over'
  finalVitality: number
  turnsPlayed: number
  score: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}