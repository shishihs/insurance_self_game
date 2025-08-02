/**
 * Dependency Injection Container
 * 
 * Implements IoC (Inversion of Control) pattern with:
 * - Service registration and resolution
 * - Lifecycle management (singleton, transient, scoped)
 * - Circular dependency detection
 * - Type safety with TypeScript
 * - Decorator pattern for configuration
 */

/**
 * Service lifecycle types
 */
export enum ServiceLifetime {
  Singleton = 'singleton',   // One instance for entire application
  Transient = 'transient',   // New instance every time
  Scoped = 'scoped'          // One instance per scope (e.g., per request)
}

/**
 * Service descriptor
 */
export interface ServiceDescriptor<T = any> {
  token: string | symbol
  implementation?: new (...args: any[]) => T
  factory?: (container: Container) => T
  instance?: T
  lifetime: ServiceLifetime
  dependencies?: (string | symbol)[]
}

/**
 * Service registration interface
 */
export interface ServiceRegistration<T = any> {
  as(lifetime: ServiceLifetime): ServiceRegistration<T>
  withDependencies(...dependencies: (string | symbol)[]): ServiceRegistration<T>
}

/**
 * Container scope for managing scoped services
 */
export class ContainerScope {
  private readonly scopedInstances = new Map<string | symbol, any>()
  
  constructor(private readonly parent: Container) {}
  
  resolve<T>(token: string | symbol): T {
    return this.parent.resolveWithScope(token, this)
  }
  
  getScopedInstance<T>(token: string | symbol): T | undefined {
    return this.scopedInstances.get(token)
  }
  
  setScopedInstance<T>(token: string | symbol, instance: T): void {
    this.scopedInstances.set(token, instance)
  }
  
  dispose(): void {
    // Dispose scoped instances if they implement IDisposable
    for (const instance of this.scopedInstances.values()) {
      if (instance && typeof instance.dispose === 'function') {
        instance.dispose()
      }
    }
    this.scopedInstances.clear()
  }
}

/**
 * Main dependency injection container
 */
export class Container {
  private readonly services = new Map<string | symbol, ServiceDescriptor>()
  private readonly singletonInstances = new Map<string | symbol, any>()
  private resolutionStack: (string | symbol)[] = []
  
  /**
   * Register a service implementation
   */
  register<T>(
    token: string | symbol,
    implementation: new (...args: any[]) => T
  ): ServiceRegistration<T> {
    const descriptor: ServiceDescriptor<T> = {
      token,
      implementation,
      lifetime: ServiceLifetime.Transient,
      dependencies: []
    }
    
    this.services.set(token, descriptor)
    
    return {
      as: (lifetime: ServiceLifetime) => {
        descriptor.lifetime = lifetime
        return this
      },
      withDependencies: (...dependencies: (string | symbol)[]) => {
        descriptor.dependencies = dependencies
        return this
      }
    } as ServiceRegistration<T>
  }
  
  /**
   * Register a factory function
   */
  registerFactory<T>(
    token: string | symbol,
    factory: (container: Container) => T,
    lifetime: ServiceLifetime = ServiceLifetime.Transient
  ): void {
    const descriptor: ServiceDescriptor<T> = {
      token,
      factory,
      lifetime
    }
    
    this.services.set(token, descriptor)
  }
  
  /**
   * Register a singleton instance
   */
  registerInstance<T>(token: string | symbol, instance: T): void {
    const descriptor: ServiceDescriptor<T> = {
      token,
      instance,
      lifetime: ServiceLifetime.Singleton
    }
    
    this.services.set(token, descriptor)
    this.singletonInstances.set(token, instance)
  }
  
  /**
   * Resolve a service
   */
  resolve<T>(token: string | symbol): T {
    return this.resolveWithScope(token, null)
  }
  
  /**
   * Resolve with scope (internal method)
   */
  resolveWithScope<T>(token: string | symbol, scope: ContainerScope | null): T {
    // Check for circular dependencies
    if (this.resolutionStack.includes(token)) {
      const cycle = [...this.resolutionStack, token].join(' -> ')
      throw new Error(`Circular dependency detected: ${cycle}`)
    }
    
    const descriptor = this.services.get(token)
    if (!descriptor) {
      throw new Error(`Service not registered: ${String(token)}`)
    }
    
    // Handle different lifetimes
    switch (descriptor.lifetime) {
      case ServiceLifetime.Singleton:
        return this.resolveSingleton(descriptor)
        
      case ServiceLifetime.Scoped:
        if (!scope) {
          throw new Error(`Scoped service ${String(token)} requires a scope`)
        }
        return this.resolveScoped(descriptor, scope)
        
      case ServiceLifetime.Transient:
      default:
        return this.resolveTransient(descriptor, scope)
    }
  }
  
  /**
   * Resolve singleton instance
   */
  private resolveSingleton<T>(descriptor: ServiceDescriptor<T>): T {
    if (descriptor.instance) {
      return descriptor.instance
    }
    
    const existingInstance = this.singletonInstances.get(descriptor.token)
    if (existingInstance) {
      return existingInstance
    }
    
    const instance = this.createInstance(descriptor, null)
    this.singletonInstances.set(descriptor.token, instance)
    return instance
  }
  
  /**
   * Resolve scoped instance
   */
  private resolveScoped<T>(descriptor: ServiceDescriptor<T>, scope: ContainerScope): T {
    const existingInstance = scope.getScopedInstance<T>(descriptor.token)
    if (existingInstance) {
      return existingInstance
    }
    
    const instance = this.createInstance(descriptor, scope)
    scope.setScopedInstance(descriptor.token, instance)
    return instance
  }
  
  /**
   * Resolve transient instance
   */
  private resolveTransient<T>(descriptor: ServiceDescriptor<T>, scope: ContainerScope | null): T {
    return this.createInstance(descriptor, scope)
  }
  
  /**
   * Create new instance
   */
  private createInstance<T>(descriptor: ServiceDescriptor<T>, scope: ContainerScope | null): T {
    this.resolutionStack.push(descriptor.token)
    
    try {
      if (descriptor.factory) {
        return descriptor.factory(this)
      }
      
      if (descriptor.implementation) {
        const dependencies = this.resolveDependencies(descriptor.dependencies || [], scope)
        return new descriptor.implementation(...dependencies)
      }
      
      if (descriptor.instance) {
        return descriptor.instance
      }
      
      throw new Error(`No implementation found for service: ${String(descriptor.token)}`)
    } finally {
      this.resolutionStack.pop()
    }
  }
  
  /**
   * Resolve dependencies
   */
  private resolveDependencies(dependencies: (string | symbol)[], scope: ContainerScope | null): any[] {
    return dependencies.map(dep => this.resolveWithScope(dep, scope))
  }
  
  /**
   * Create a new scope
   */
  createScope(): ContainerScope {
    return new ContainerScope(this)
  }
  
  /**
   * Check if service is registered
   */
  isRegistered(token: string | symbol): boolean {
    return this.services.has(token)
  }
  
  /**
   * Get all registered service tokens
   */
  getRegisteredServices(): (string | symbol)[] {
    return Array.from(this.services.keys())
  }
  
  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.services.clear()
    this.singletonInstances.clear()
    this.resolutionStack = []
  }
  
  /**
   * Dispose container and all singleton instances
   */
  dispose(): void {
    // Dispose singleton instances if they implement IDisposable
    for (const instance of this.singletonInstances.values()) {
      if (instance && typeof instance.dispose === 'function') {
        instance.dispose()
      }
    }
    
    this.clear()
  }
}

// ============================================================================
// SERVICE TOKENS (using symbols for type safety)
// ============================================================================

export const SERVICE_TOKENS = {
  // Domain services
  GAME_REPOSITORY: Symbol('IGameRepository'),
  EVENT_PUBLISHER: Symbol('IEventPublisher'),
  
  // Application services
  GAME_QUERY_SERVICE: Symbol('IGameQueryService'),
  CARD_SERVICE: Symbol('ICardService'),
  CHALLENGE_SERVICE: Symbol('IChallengeService'),
  GAME_FACTORY: Symbol('IGameFactory'),
  GAME_VALIDATOR: Symbol('IGameValidator'),
  
  // Infrastructure services
  CACHE_SERVICE: Symbol('ICacheService'),
  LOGGER: Symbol('ILogger'),
  CONFIGURATION_SERVICE: Symbol('IConfigurationService'),
  EXTERNAL_SERVICE_CLIENT: Symbol('IExternalServiceClient'),
  
  // Notification services
  GAME_NOTIFICATION_SERVICE: Symbol('IGameNotificationService'),
  GAME_ANALYTICS_SERVICE: Symbol('IGameAnalyticsService'),
  
  // Command handling
  COMMAND_BUS: Symbol('CommandBus'),
  COMMAND_HANDLERS: Symbol('CommandHandlers')
} as const

// ============================================================================
// DECORATORS FOR SERVICE REGISTRATION
// ============================================================================

/**
 * Injectable decorator for marking classes as services
 */
export function Injectable(token?: string | symbol, lifetime?: ServiceLifetime) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    // Store metadata for auto-registration
    Reflect.defineMetadata('injectable', {
      token: token || constructor.name,
      lifetime: lifetime || ServiceLifetime.Transient
    }, constructor)
    
    return constructor
  }
}

/**
 * Inject decorator for marking constructor dependencies
 */
export function Inject(token: string | symbol) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata('inject:tokens', target) || []
    existingTokens[parameterIndex] = token
    Reflect.defineMetadata('inject:tokens', existingTokens, target)
  }
}

// ============================================================================
// AUTO-REGISTRATION HELPER
// ============================================================================

/**
 * Auto-register services marked with @Injectable
 */
export function autoRegisterServices(container: Container, services: any[]): void {
  for (const service of services) {
    const metadata = Reflect.getMetadata('injectable', service)
    if (metadata) {
      const dependencies = Reflect.getMetadata('inject:tokens', service) || []
      container
        .register(metadata.token, service)
        .as(metadata.lifetime)
        .withDependencies(...dependencies)
    }
  }
}

// ============================================================================
// GLOBAL CONTAINER INSTANCE
// ============================================================================

/**
 * Global container instance (use sparingly, prefer explicit injection)
 */
export const globalContainer = new Container()