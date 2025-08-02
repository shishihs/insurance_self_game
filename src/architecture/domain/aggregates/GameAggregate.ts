import { AggregateRoot } from '../core/AggregateRoot'
import { EntityId, generateId } from '../core/EntityId'
import { BaseDomainEvent } from '../core/DomainEvent'
import { NumericValueObject } from '../core/ValueObject'

/**
 * Game ID value object
 */
export class GameId extends EntityId {
  static create(): GameId {
    return new GameId(generateId())
  }

  static fromString(id: string): GameId {
    return new GameId(id)
  }
}

/**
 * Vitality value object with business rules
 */
export class Vitality extends NumericValueObject {
  constructor(value: number, private readonly maxValue: number = 100) {
    super(value, 0, maxValue)
  }

  static create(value: number, maxValue: number = 100): Vitality {
    return new Vitality(value, maxValue)
  }

  increase(amount: number): Vitality {
    const newValue = Math.min(this.getValue() + amount, this.maxValue)
    return new Vitality(newValue, this.maxValue)
  }

  decrease(amount: number): Vitality {
    const newValue = Math.max(this.getValue() - amount, 0)
    return new Vitality(newValue, this.maxValue)
  }

  isDepleted(): boolean {
    return this.getValue() === 0
  }

  isAtMaximum(): boolean {
    return this.getValue() === this.maxValue
  }

  getPercentage(): number {
    return (this.getValue() / this.maxValue) * 100
  }
}

/**
 * Game status enumeration
 */
export enum GameStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  GAME_OVER = 'game_over'
}

/**
 * Game phase enumeration
 */
export enum GamePhase {
  SETUP = 'setup',
  DRAW = 'draw',
  CHALLENGE = 'challenge',
  RESOLUTION = 'resolution',
  END_TURN = 'end_turn'
}

/**
 * Game configuration value object
 */
export class GameConfiguration {
  constructor(
    public readonly difficulty: 'easy' | 'normal' | 'hard',
    public readonly startingVitality: number,
    public readonly maxHandSize: number,
    public readonly turnsPerStage: number
  ) {
    this.validate()
  }

  private validate(): void {
    if (this.startingVitality <= 0) {
      throw new Error('Starting vitality must be positive')
    }
    if (this.maxHandSize <= 0) {
      throw new Error('Max hand size must be positive')
    }
    if (this.turnsPerStage <= 0) {
      throw new Error('Turns per stage must be positive')
    }
  }

  static default(): GameConfiguration {
    return new GameConfiguration('normal', 100, 7, 10)
  }
}

/**
 * Game domain events
 */
export class GameStartedEvent extends BaseDomainEvent {
  constructor(gameId: GameId, configuration: GameConfiguration) {
    super(
      'GameStarted',
      gameId,
      'Game',
      1,
      {
        configuration
      }
    )
  }
}

export class GameEndedEvent extends BaseDomainEvent {
  constructor(
    gameId: GameId,
    version: number,
    finalStatus: GameStatus,
    finalVitality: number,
    turnsPlayed: number
  ) {
    super(
      'GameEnded',
      gameId,
      'Game',
      version,
      {
        finalStatus,
        finalVitality,
        turnsPlayed
      }
    )
  }
}

export class VitalityChangedEvent extends BaseDomainEvent {
  constructor(
    gameId: GameId,
    version: number,
    previousVitality: number,
    newVitality: number,
    reason: string
  ) {
    super(
      'VitalityChanged',
      gameId,
      'Game',
      version,
      {
        previousVitality,
        newVitality,
        reason
      }
    )
  }
}

/**
 * Game Aggregate Root
 * 
 * Encapsulates the core game state and business rules.
 * Follows DDD principles with clear boundaries and invariant enforcement.
 */
export class GameAggregate extends AggregateRoot<GameId> {
  private _status: GameStatus
  private _phase: GamePhase
  private _vitality: Vitality
  private readonly _configuration: GameConfiguration
  private _currentTurn: number
  private _startedAt?: Date
  private _completedAt?: Date

  private constructor(
    id: GameId,
    configuration: GameConfiguration
  ) {
    super(id)
    this._status = GameStatus.NOT_STARTED
    this._phase = GamePhase.SETUP
    this._configuration = configuration
    this._vitality = Vitality.create(configuration.startingVitality)
    this._currentTurn = 0
  }

  /**
   * Factory method to create a new game
   */
  static create(configuration: GameConfiguration = GameConfiguration.default()): GameAggregate {
    const game = new GameAggregate(GameId.create(), configuration)
    return game
  }

  /**
   * Factory method to reconstitute from persistence
   */
  static reconstitute(
    id: GameId,
    status: GameStatus,
    phase: GamePhase,
    vitality: Vitality,
    configuration: GameConfiguration,
    currentTurn: number,
    startedAt?: Date,
    completedAt?: Date
  ): GameAggregate {
    const game = new GameAggregate(id, configuration)
    game._status = status
    game._phase = phase
    game._vitality = vitality
    game._currentTurn = currentTurn
    game._startedAt = startedAt
    game._completedAt = completedAt
    return game
  }

  // Getters
  get status(): GameStatus { return this._status }
  get phase(): GamePhase { return this._phase }
  get vitality(): Vitality { return this._vitality }
  get configuration(): GameConfiguration { return this._configuration }
  get currentTurn(): number { return this._currentTurn }
  get startedAt(): Date | undefined { return this._startedAt }
  get completedAt(): Date | undefined { return this._completedAt }

  /**
   * Start the game
   */
  start(): void {
    if (this._status !== GameStatus.NOT_STARTED) {
      throw new Error('Game can only be started when not started')
    }

    this._status = GameStatus.IN_PROGRESS
    this._phase = GamePhase.DRAW
    this._startedAt = new Date()
    this._currentTurn = 1

    this.addDomainEvent(new GameStartedEvent(this.id, this._configuration))
    this.ensureInvariants()
  }

  /**
   * Apply damage to vitality
   */
  applyDamage(amount: number, reason: string = 'challenge_failure'): void {
    if (this._status !== GameStatus.IN_PROGRESS) {
      throw new Error('Cannot apply damage when game is not in progress')
    }

    if (amount < 0) {
      throw new Error('Damage amount must be non-negative')
    }

    const previousVitality = this._vitality.getValue()
    this._vitality = this._vitality.decrease(amount)

    this.addDomainEvent(
      new VitalityChangedEvent(
        this.id,
        this.version,
        previousVitality,
        this._vitality.getValue(),
        reason
      )
    )

    // Check for game over condition
    if (this._vitality.isDepleted()) {
      this.endGame(GameStatus.GAME_OVER)
    }

    this.ensureInvariants()
  }

  /**
   * Heal vitality
   */
  heal(amount: number, reason: string = 'healing'): void {
    if (this._status !== GameStatus.IN_PROGRESS) {
      throw new Error('Cannot heal when game is not in progress')
    }

    if (amount < 0) {
      throw new Error('Heal amount must be non-negative')
    }

    const previousVitality = this._vitality.getValue()
    this._vitality = this._vitality.increase(amount)

    this.addDomainEvent(
      new VitalityChangedEvent(
        this.id,
        this.version,
        previousVitality,
        this._vitality.getValue(),
        reason
      )
    )

    this.ensureInvariants()
  }

  /**
   * Advance to next turn
   */
  nextTurn(): void {
    if (this._status !== GameStatus.IN_PROGRESS) {
      throw new Error('Cannot advance turn when game is not in progress')
    }

    this._currentTurn++
    this._phase = GamePhase.DRAW

    this.ensureInvariants()
  }

  /**
   * Change game phase
   */
  changePhase(newPhase: GamePhase): void {
    if (this._status !== GameStatus.IN_PROGRESS) {
      throw new Error('Cannot change phase when game is not in progress')
    }

    this._phase = newPhase
    this.ensureInvariants()
  }

  /**
   * Pause the game
   */
  pause(): void {
    if (this._status !== GameStatus.IN_PROGRESS) {
      throw new Error('Can only pause a game in progress')
    }

    this._status = GameStatus.PAUSED
    this.ensureInvariants()
  }

  /**
   * Resume the game
   */
  resume(): void {
    if (this._status !== GameStatus.PAUSED) {
      throw new Error('Can only resume a paused game')
    }

    this._status = GameStatus.IN_PROGRESS
    this.ensureInvariants()
  }

  /**
   * End the game with specified status
   */
  private endGame(finalStatus: GameStatus.COMPLETED | GameStatus.GAME_OVER): void {
    this._status = finalStatus
    this._completedAt = new Date()

    this.addDomainEvent(
      new GameEndedEvent(
        this.id,
        this.version,
        this._status,
        this._vitality.getValue(),
        this._currentTurn
      )
    )

    this.ensureInvariants()
  }

  /**
   * Complete the game successfully
   */
  complete(): void {
    if (this._status !== GameStatus.IN_PROGRESS) {
      throw new Error('Can only complete a game in progress')
    }

    this.endGame(GameStatus.COMPLETED)
  }

  /**
   * Check if game is active
   */
  isActive(): boolean {
    return this._status === GameStatus.IN_PROGRESS
  }

  /**
   * Check if game is finished
   */
  isFinished(): boolean {
    return this._status === GameStatus.COMPLETED || this._status === GameStatus.GAME_OVER
  }

  /**
   * Validate business invariants
   */
  protected validateInvariants(): void {
    // Game must have valid vitality
    if (!this._vitality || this._vitality.getValue() < 0) {
      throw new Error('Game vitality must be non-negative')
    }

    // Turn must be positive when game is started
    if (this._status !== GameStatus.NOT_STARTED && this._currentTurn <= 0) {
      throw new Error('Current turn must be positive for started games')
    }

    // Completed games must have completion date
    if (this.isFinished() && !this._completedAt) {
      throw new Error('Finished games must have completion date')
    }

    // Started games must have start date
    if (this._status !== GameStatus.NOT_STARTED && !this._startedAt) {
      throw new Error('Started games must have start date')
    }
  }
}