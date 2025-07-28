/**
 * Configuration preset for factory instances
 */
export interface ConfigPreset<T> {
  name: string
  description: string
  config: T
}

/**
 * Base factory class for creating configured instances
 * Provides common functionality for all factory classes in the codebase
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export abstract class BaseFactory<TInstance, TConfig> {
  /**
   * Registry of configuration presets
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected static presets = new Map<string, Map<string, ConfigPreset<any>>>()

  /**
   * Get factory name for preset storage
   */
  protected static getFactoryName(): string {
    return this.name
  }

  /**
   * Register a configuration preset
   */
  protected static registerPreset<T>(name: string, preset: ConfigPreset<T>): void {
    const factoryName = this.getFactoryName()
    if (!this.presets.has(factoryName)) {
      this.presets.set(factoryName, new Map())
    }
    this.presets.get(factoryName)!.set(name, preset)
  }

  /**
   * Get a registered preset
   */
  protected static getPreset<T>(name: string): ConfigPreset<T> | undefined {
    const factoryName = this.getFactoryName()
    return this.presets.get(factoryName)?.get(name) as ConfigPreset<T> | undefined
  }

  /**
   * Create instance with preset configuration
   */
  protected static createWithPreset<TInstance, TConfig>(
    presetName: string,
    createFn: (config: TConfig) => TInstance
  ): TInstance {
    const preset = this.getPreset<TConfig>(presetName)
    if (!preset) {
      throw new Error(`Preset '${presetName}' not found in ${this.getFactoryName()}`)
    }
    return createFn(preset.config)
  }

  /**
   * List all available presets
   */
  static listPresets(): string[] {
    const factoryName = this.getFactoryName()
    const presets = this.presets.get(factoryName)
    return presets ? Array.from(presets.keys()) : []
  }

  /**
   * Get preset details
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getPresetDetails(name: string): ConfigPreset<any> | undefined {
    return this.getPreset(name)
  }
}

/**
 * Simplified factory base for classes with single configuration type
 */
export abstract class SimpleFactory<TInstance, TConfig> extends BaseFactory<TInstance, TConfig> {
  /**
   * Create instance - must be implemented by subclasses
   */
  protected abstract createInstance(config: TConfig): TInstance

  /**
   * Create development instance
   */
  static createDevelopment<TInstance, TConfig>(
    this: new() => SimpleFactory<TInstance, TConfig> & typeof SimpleFactory
  ): TInstance {
    return this.createWithPreset<TInstance, TConfig>('development', (config) => {
      const instance = new this()
      return instance.createInstance(config)
    })
  }

  /**
   * Create production instance
   */
  static createProduction<TInstance, TConfig>(
    this: new() => SimpleFactory<TInstance, TConfig> & typeof SimpleFactory
  ): TInstance {
    return this.createWithPreset<TInstance, TConfig>('production', (config) => {
      const instance = new this()
      return instance.createInstance(config)
    })
  }

  /**
   * Create test instance
   */
  static createTest<TInstance, TConfig>(
    this: new() => SimpleFactory<TInstance, TConfig> & typeof SimpleFactory
  ): TInstance {
    return this.createWithPreset<TInstance, TConfig>('test', (config) => {
      const instance = new this()
      return instance.createInstance(config)
    })
  }
}

/**
 * Factory mixin for adding factory methods to existing classes
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
export function FactoryMixin<TBase extends new(...args: any[]) => {}>(Base: TBase) {
  return class extends Base {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static presets = new Map<string, ConfigPreset<any>>()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static registerPreset(name: string, preset: ConfigPreset<any>): void {
      this.presets.set(name, preset)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static createFromPreset(presetName: string, ...args: any[]): InstanceType<TBase> {
      const preset = this.presets.get(presetName)
      if (!preset) {
        throw new Error(`Preset '${presetName}' not found`)
      }
      return new this(...args, preset.config) as InstanceType<TBase>
    }

    static listPresets(): string[] {
      return Array.from(this.presets.keys())
    }
  }
}