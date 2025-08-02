import type { GameId } from '../../domain/aggregates/GameAggregate'

/**
 * Command Pattern Implementation
 * 
 * Commands represent user intentions and encapsulate all information needed
 * to perform an action. They follow the Command pattern for:
 * - Undo/Redo functionality
 * - Queuing operations
 * - Logging and auditing
 * - Request validation
 */

/**
 * Base command interface
 */
export interface Command {
  readonly type: string
  readonly timestamp: Date
  readonly userId?: string
  readonly correlationId: string
}

/**
 * Base command implementation
 */
export abstract class BaseCommand implements Command {
  public readonly timestamp = new Date()
  public readonly correlationId = crypto.randomUUID()

  constructor(
    public readonly type: string,
    public readonly userId?: string
  ) {}
}

// ============================================================================
// GAME LIFECYCLE COMMANDS
// ============================================================================

/**
 * Start a new game command
 */
export class StartGameCommand extends BaseCommand {
  constructor(
    public readonly configuration: {
      difficulty: 'easy' | 'normal' | 'hard'
      startingVitality: number
      maxHandSize: number
      turnsPerStage: number
    },
    userId?: string
  ) {
    super('StartGame', userId)
  }
}

/**
 * Pause game command
 */
export class PauseGameCommand extends BaseCommand {
  constructor(
    public readonly gameId: GameId,
    userId?: string
  ) {
    super('PauseGame', userId)
  }
}

/**
 * Resume game command
 */
export class ResumeGameCommand extends BaseCommand {
  constructor(
    public readonly gameId: GameId,
    userId?: string
  ) {
    super('ResumeGame', userId)
  }
}

/**
 * End game command
 */
export class EndGameCommand extends BaseCommand {
  constructor(
    public readonly gameId: GameId,
    public readonly reason: 'player_quit' | 'game_over' | 'victory',
    userId?: string
  ) {
    super('EndGame', userId)
  }
}

// ============================================================================
// GAMEPLAY COMMANDS
// ============================================================================

/**
 * Draw cards command
 */
export class DrawCardsCommand extends BaseCommand {
  constructor(
    public readonly gameId: GameId,
    public readonly count: number,
    userId?: string
  ) {
    super('DrawCards', userId)
  }
}

/**
 * Play cards command
 */
export class PlayCardsCommand extends BaseCommand {
  constructor(
    public readonly gameId: GameId,
    public readonly cardIds: string[],
    public readonly targetId?: string,
    userId?: string
  ) {
    super('PlayCards', userId)
  }
}

/**
 * Start challenge command
 */
export class StartChallengeCommand extends BaseCommand {
  constructor(
    public readonly gameId: GameId,
    public readonly challengeType: string,
    userId?: string
  ) {
    super('StartChallenge', userId)
  }
}

/**
 * Resolve challenge command
 */
export class ResolveChallengeCommand extends BaseCommand {
  constructor(
    public readonly gameId: GameId,
    public readonly selectedCardIds: string[],
    public readonly strategyChoice?: string,
    userId?: string
  ) {
    super('ResolveChallenge', userId)
  }
}

/**
 * Apply damage command
 */
export class ApplyDamageCommand extends BaseCommand {
  constructor(
    public readonly gameId: GameId,
    public readonly amount: number,
    public readonly source: string,
    public readonly reason: string,
    userId?: string
  ) {
    super('ApplyDamage', userId)
  }
}

/**
 * Heal command
 */
export class HealCommand extends BaseCommand {
  constructor(
    public readonly gameId: GameId,
    public readonly amount: number,
    public readonly source: string,
    public readonly reason: string,
    userId?: string
  ) {
    super('Heal', userId)
  }
}

/**
 * Advance turn command
 */
export class AdvanceTurnCommand extends BaseCommand {
  constructor(
    public readonly gameId: GameId,
    userId?: string
  ) {
    super('AdvanceTurn', userId)
  }
}

// ============================================================================
// INSURANCE COMMANDS
// ============================================================================

/**
 * Purchase insurance command
 */
export class PurchaseInsuranceCommand extends BaseCommand {
  constructor(
    public readonly gameId: GameId,
    public readonly insuranceType: string,
    public readonly coverage: number,
    public readonly duration: number,
    userId?: string
  ) {
    super('PurchaseInsurance', userId)
  }
}

/**
 * Activate insurance command
 */
export class ActivateInsuranceCommand extends BaseCommand {
  constructor(
    public readonly gameId: GameId,
    public readonly insuranceId: string,
    public readonly damageAmount: number,
    userId?: string
  ) {
    super('ActivateInsurance', userId)
  }
}

/**
 * Renew insurance command
 */
export class RenewInsuranceCommand extends BaseCommand {
  constructor(
    public readonly gameId: GameId,
    public readonly insuranceId: string,
    public readonly newDuration: number,
    userId?: string
  ) {
    super('RenewInsurance', userId)
  }
}

// ============================================================================
// COMMAND RESULT
// ============================================================================

/**
 * Command execution result
 */
export interface CommandResult<T = any> {
  success: boolean
  data?: T
  error?: string
  validationErrors?: string[]
  events?: string[]
}

/**
 * Successful command result factory
 */
export function successResult<T>(data?: T, events?: string[]): CommandResult<T> {
  return {
    success: true,
    data,
    events
  }
}

/**
 * Failed command result factory
 */
export function failureResult(error: string, validationErrors?: string[]): CommandResult {
  return {
    success: false,
    error,
    validationErrors
  }
}

// ============================================================================
// COMMAND HANDLER INTERFACE
// ============================================================================

/**
 * Command handler interface
 */
export interface CommandHandler<TCommand extends Command, TResult = any> {
  handle(command: TCommand): Promise<CommandResult<TResult>>
  canHandle(command: Command): boolean
}

/**
 * Command bus interface for routing commands to handlers
 */
export interface CommandBus {
  dispatch<TResult = any>(command: Command): Promise<CommandResult<TResult>>
  register<TCommand extends Command>(
    commandType: string,
    handler: CommandHandler<TCommand>
  ): void
}