import { CardManager, type ICardManager } from '../services/CardManager'
import { InsurancePremiumCalculationService } from '../services/InsurancePremiumCalculationService'
import { GameStageManager } from '../services/GameStageManager'
import { InsuranceExpirationManager } from '../services/InsuranceExpirationManager'
import { ChallengeResolutionService } from '../services/ChallengeResolutionService'
import { GameStateContext } from '../services/GameStateService'
import { GameProgressService } from '../services/GameProgressService'
import { ChallengeResolutionService as NewChallengeResolutionService } from '../services/ChallengeStrategyService'
import type { GameConfig, PlayerStats } from '../types/game.types'
import type { GameStage } from '../types/card.types'

/**
 * サービスファクトリー
 * 
 * Factory パターンを適用してサービスインスタンスの生成を一元管理。
 * 依存性注入（DI）コンテナの簡易実装。
 * 単一責任の原則に従い、オブジェクト生成のロジックを分離。
 */

/**
 * サービス識別子
 */
export type ServiceIdentifier = 
  | 'cardManager'
  | 'insurancePremiumCalculation'
  | 'gameStageManager'
  | 'insuranceExpirationManager'
  | 'challengeResolution'  // 旧バージョン
  | 'challengeResolutionNew'  // 新バージョン
  | 'gameState'
  | 'gameProgress'

/**
 * サービス設定
 */
export interface ServiceConfig {
  gameConfig?: GameConfig
  initialStats?: Partial<PlayerStats>
  initialStage?: GameStage
}

/**
 * サービスインスタンスのライフサイクル
 */
export type ServiceLifetime = 'singleton' | 'transient' | 'scoped'

/**
 * サービス登録情報
 */
interface ServiceRegistration {
  factory: (config?: ServiceConfig) => any
  lifetime: ServiceLifetime
  instance?: any
}

/**
 * DIコンテナの実装
 */
export class ServiceContainer {
  private readonly services = new Map<ServiceIdentifier, ServiceRegistration>()
  private readonly scopeInstances = new Map<ServiceIdentifier, any>()

  /**
   * サービスを登録
   */
  register<T>(
    identifier: ServiceIdentifier,
    factory: (config?: ServiceConfig) => T,
    lifetime: ServiceLifetime = 'singleton'
  ): void {
    this.services.set(identifier, {
      factory,
      lifetime
    })
  }

  /**
   * サービスを解決
   */
  resolve<T>(identifier: ServiceIdentifier, config?: ServiceConfig): T {
    const registration = this.services.get(identifier)
    if (!registration) {
      throw new Error(`Service '${identifier}' is not registered`)
    }

    switch (registration.lifetime) {
      case 'singleton':
        if (!registration.instance) {
          registration.instance = registration.factory(config)
        }
        return registration.instance

      case 'scoped':
        if (!this.scopeInstances.has(identifier)) {
          this.scopeInstances.set(identifier, registration.factory(config))
        }
        return this.scopeInstances.get(identifier)

      case 'transient':
        return registration.factory(config)

      default:
        throw new Error(`Unknown service lifetime: ${registration.lifetime}`)
    }
  }

  /**
   * スコープをクリア（scoped サービス用）
   */
  clearScope(): void {
    this.scopeInstances.clear()
  }

  /**
   * すべてのサービスをクリア
   */
  clear(): void {
    this.services.clear()
    this.scopeInstances.clear()
  }

  /**
   * 登録されているサービス一覧を取得
   */
  getRegisteredServices(): ServiceIdentifier[] {
    return Array.from(this.services.keys())
  }
}

/**
 * サービスファクトリーの実装
 */
export class ServiceFactory {
  private static readonly container = new ServiceContainer()

  /**
   * デフォルトサービスを初期化
   */
  static initialize(): void {
    // カードマネージャー（各ゲームインスタンスで独立）
    this.container.register('cardManager', (config) => {
      return new CardManager()
    }, 'transient')

    // 保険料計算サービス（シングルトン）
    this.container.register('insurancePremiumCalculation', () => {
      return new InsurancePremiumCalculationService()
    }, 'singleton')

    // ゲームステージマネージャー（シングルトン）
    this.container.register('gameStageManager', () => {
      return new GameStageManager()
    }, 'singleton')

    // 保険期限管理サービス（シングルトン）
    this.container.register('insuranceExpirationManager', () => {
      return new InsuranceExpirationManager()
    }, 'singleton')

    // 旧チャレンジ解決サービス（シングルトン）
    this.container.register('challengeResolution', () => {
      return new ChallengeResolutionService()
    }, 'singleton')

    // 新チャレンジ解決サービス（シングルトン）
    this.container.register('challengeResolutionNew', () => {
      return new NewChallengeResolutionService()
    }, 'singleton')

    // ゲーム状態管理（各ゲームインスタンスで独立）
    this.container.register('gameState', () => {
      return new GameStateContext()
    }, 'transient')

    // ゲーム進行管理（各ゲームインスタンスで独立）
    this.container.register('gameProgress', (config) => {
      return new GameProgressService(
        config?.initialStats,
        config?.initialStage
      )
    }, 'transient')
  }

  /**
   * サービスを取得
   */
  static getService<T>(identifier: ServiceIdentifier, config?: ServiceConfig): T {
    return this.container.resolve<T>(identifier, config)
  }

  /**
   * カスタムサービスを登録
   */
  static registerService<T>(
    identifier: ServiceIdentifier,
    factory: (config?: ServiceConfig) => T,
    lifetime: ServiceLifetime = 'singleton'
  ): void {
    this.container.register(identifier, factory, lifetime)
  }

  /**
   * サービス設定をリセット
   */
  static reset(): void {
    this.container.clear()
    this.initialize()
  }

  /**
   * 特定のサービスタイプ用のヘルパーメソッド
   */
  static createCardManager(config?: GameConfig): ICardManager {
    return this.getService<ICardManager>('cardManager', { gameConfig: config })
  }

  static getInsurancePremiumCalculationService(): InsurancePremiumCalculationService {
    return this.getService<InsurancePremiumCalculationService>('insurancePremiumCalculation')
  }

  static getGameStageManager(): GameStageManager {
    return this.getService<GameStageManager>('gameStageManager')
  }

  static getInsuranceExpirationManager(): InsuranceExpirationManager {
    return this.getService<InsuranceExpirationManager>('insuranceExpirationManager')
  }

  static getChallengeResolutionService(): ChallengeResolutionService {
    return this.getService<ChallengeResolutionService>('challengeResolution')
  }

  static getNewChallengeResolutionService(): NewChallengeResolutionService {
    return this.getService<NewChallengeResolutionService>('challengeResolutionNew')
  }

  static createGameStateContext(): GameStateContext {
    return this.getService<GameStateContext>('gameState')
  }

  static createGameProgressService(
    initialStats?: Partial<PlayerStats>,
    initialStage?: GameStage
  ): GameProgressService {
    return this.getService<GameProgressService>('gameProgress', {
      initialStats,
      initialStage
    })
  }
}

/**
 * サービスロケーターパターンの実装
 * （ServiceFactory の代替実装）
 */
export class ServiceLocator {
  private static readonly services = new Map<string, any>()

  /**
   * サービスを設定
   */
  static setService<T>(key: string, service: T): void {
    this.services.set(key, service)
  }

  /**
   * サービスを取得
   */
  static getService<T>(key: string): T {
    const service = this.services.get(key)
    if (!service) {
      throw new Error(`Service '${key}' not found`)
    }
    return service
  }

  /**
   * サービスが存在するかチェック
   */
  static hasService(key: string): boolean {
    return this.services.has(key)
  }

  /**
   * すべてのサービスをクリア
   */
  static clearAll(): void {
    this.services.clear()
  }
}

/**
 * モジュール式サービス管理
 */
export interface ServiceModule {
  name: string
  dependencies: string[]
  configure(container: ServiceContainer): void
}

/**
 * モジュールローダー
 */
export class ModuleLoader {
  private static readonly modules = new Map<string, ServiceModule>()
  private static loadOrder: string[] = []

  /**
   * モジュールを登録
   */
  static registerModule(module: ServiceModule): void {
    this.modules.set(module.name, module)
  }

  /**
   * モジュールを読み込み
   */
  static loadModules(container: ServiceContainer): void {
    this.calculateLoadOrder()
    
    for (const moduleName of this.loadOrder) {
      const module = this.modules.get(moduleName)
      if (module) {
        console.log(`Loading module: ${moduleName}`)
        module.configure(container)
      }
    }
  }

  /**
   * 依存関係に基づいて読み込み順序を計算
   */
  private static calculateLoadOrder(): void {
    const visited = new Set<string>()
    const visiting = new Set<string>()
    this.loadOrder = []

    const visit = (moduleName: string) => {
      if (visiting.has(moduleName)) {
        throw new Error(`Circular dependency detected: ${moduleName}`)
      }
      if (visited.has(moduleName)) {
        return
      }

      visiting.add(moduleName)
      const module = this.modules.get(moduleName)
      if (module) {
        for (const dep of module.dependencies) {
          visit(dep)
        }
      }
      visiting.delete(moduleName)
      visited.add(moduleName)
      this.loadOrder.push(moduleName)
    }

    for (const moduleName of this.modules.keys()) {
      visit(moduleName)
    }
  }
}

// サービスファクトリーを初期化
ServiceFactory.initialize()

/**
 * 使用例とベストプラクティス
 */
export class ServiceFactoryUsageExample {
  /**
   * ゲームインスタンス作成時の推奨パターン
   */
  static createGameServices(config?: GameConfig): {
    cardManager: ICardManager
    stateContext: GameStateContext
    progressService: GameProgressService
    challengeService: NewChallengeResolutionService
  } {
    return {
      cardManager: ServiceFactory.createCardManager(config),
      stateContext: ServiceFactory.createGameStateContext(),
      progressService: ServiceFactory.createGameProgressService(),
      challengeService: ServiceFactory.getNewChallengeResolutionService()
    }
  }

  /**
   * テスト時のモックサービス設定例
   */
  static setupTestServices(): void {
    // モックサービスを登録
    ServiceFactory.registerService('cardManager', () => {
      // モックCardManagerを返す
      return {} as ICardManager
    }, 'transient')

    ServiceFactory.registerService('challengeResolutionNew', () => {
      // モックChallengeResolutionServiceを返す
      return {} as NewChallengeResolutionService
    }, 'singleton')
  }
}