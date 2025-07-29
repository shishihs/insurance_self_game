import type { 
  Plugin, 
  PluginManager as IPluginManager, 
  PluginMetadata,
  AsyncResult,
  Result
} from '../types/enhanced-types'

/**
 * プラグインマネージャーの実装
 * 
 * Strategy Pattern: プラグインによる機能拡張
 * Observer Pattern: プラグインイベントの通知
 * Factory Pattern: プラグインインスタンスの作成
 */
export class PluginManager implements IPluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private activePlugins: Set<string> = new Set()
  private hooks: Map<string, Array<Function>> = new Map()
  private eventListeners: Map<string, Array<Function>> = new Map()

  /**
   * プラグインをインストール
   */
  async install(plugin: Plugin): AsyncResult<void> {
    try {
      // メタデータ検証
      const validationResult = this.validatePlugin(plugin)
      if (!validationResult.success) {
        return validationResult
      }

      // 依存関係チェック
      const dependencyResult = await this.checkDependencies(plugin.metadata)
      if (!dependencyResult.success) {
        return dependencyResult
      }

      // 既存プラグインとの競合チェック
      if (this.plugins.has(plugin.metadata.name)) {
        return {
          success: false,
          error: `プラグイン "${plugin.metadata.name}" は既にインストールされています`
        }
      }

      // プラグインを登録
      this.plugins.set(plugin.metadata.name, plugin)

      // インストールライフサイクルを実行
      if (plugin.onInstall) {
        await plugin.onInstall()
      }

      // フックを登録
      this.registerPluginHooks(plugin)

      this.emitEvent('plugin:installed', { 
        name: plugin.metadata.name, 
        version: plugin.metadata.version 
      })

      return { success: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * プラグインをアンインストール
   */
  async uninstall(pluginName: string): AsyncResult<void> {
    try {
      const plugin = this.plugins.get(pluginName)
      if (!plugin) {
        return {
          success: false,
          error: `プラグイン "${pluginName}" が見つかりません`
        }
      }

      // 有効になっている場合は先に無効化
      if (this.activePlugins.has(pluginName)) {
        const deactivateResult = await this.deactivate(pluginName)
        if (!deactivateResult.success) {
          return deactivateResult
        }
      }

      // アンインストールライフサイクルを実行
      if (plugin.onUninstall) {
        await plugin.onUninstall()
      }

      // フックを解除
      this.unregisterPluginHooks(plugin)

      // プラグインを削除
      this.plugins.delete(pluginName)

      this.emitEvent('plugin:uninstalled', { name: pluginName })

      return { success: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * プラグインを有効化
   */
  async activate(pluginName: string): AsyncResult<void> {
    try {
      const plugin = this.plugins.get(pluginName)
      if (!plugin) {
        return {
          success: false,
          error: `プラグイン "${pluginName}" が見つかりません`
        }
      }

      if (this.activePlugins.has(pluginName)) {
        return { success: true } // 既に有効
      }

      // 依存関係チェック
      const dependencyResult = await this.checkActiveDependencies(plugin.metadata)
      if (!dependencyResult.success) {
        return dependencyResult
      }

      // 有効化ライフサイクルを実行
      if (plugin.onActivate) {
        await plugin.onActivate()
      }

      this.activePlugins.add(pluginName)

      this.emitEvent('plugin:activated', { 
        name: pluginName, 
        version: plugin.metadata.version 
      })

      return { success: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * プラグインを無効化
   */
  async deactivate(pluginName: string): AsyncResult<void> {
    try {
      const plugin = this.plugins.get(pluginName)
      if (!plugin) {
        return {
          success: false,
          error: `プラグイン "${pluginName}" が見つかりません`
        }
      }

      if (!this.activePlugins.has(pluginName)) {
        return { success: true } // 既に無効
      }

      // 無効化ライフサイクルを実行
      if (plugin.onDeactivate) {
        await plugin.onDeactivate()
      }

      this.activePlugins.delete(pluginName)

      this.emitEvent('plugin:deactivated', { name: pluginName })

      return { success: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * プラグインを取得
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name)
  }

  /**
   * 全プラグインを取得
   */
  getAllPlugins(): readonly Plugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * プラグインが有効かチェック
   */
  isActive(pluginName: string): boolean {
    return this.activePlugins.has(pluginName)
  }

  /**
   * フックを実行
   */
  async executeHook(hookName: string, ...args: any[]): Promise<any[]> {
    const hooks = this.hooks.get(hookName) || []
    const results: any[] = []

    for (const hook of hooks) {
      try {
        const result = await hook(...args)
        results.push(result)
      } catch (error) {
        console.error(`フック "${hookName}" の実行中にエラーが発生しました:`, error)
      }
    }

    return results
  }

  /**
   * イベントリスナーを登録
   */
  addEventListener(eventName: string, listener: Function): () => void {
    const listeners = this.eventListeners.get(eventName) || []
    listeners.push(listener)
    this.eventListeners.set(eventName, listeners)

    // リスナー解除関数を返す
    return () => {
      const current = this.eventListeners.get(eventName) || []
      const index = current.indexOf(listener)
      if (index > -1) {
        current.splice(index, 1)
      }
    }
  }

  /**
   * プラグイン情報を取得
   */
  getPluginInfo(): Array<{
    name: string
    version: string
    description: string
    active: boolean
    dependencies: readonly string[]
  }> {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.metadata.name,
      version: plugin.metadata.version,
      description: plugin.metadata.description,
      active: this.activePlugins.has(plugin.metadata.name),
      dependencies: plugin.metadata.dependencies
    }))
  }

  /**
   * プラグイン検証（内部使用）
   */
  private validatePlugin(plugin: Plugin): Result<void> {
    const { metadata } = plugin

    if (!metadata.name || !metadata.version) {
      return {
        success: false,
        error: 'プラグインの名前とバージョンは必須です'
      }
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(metadata.name)) {
      return {
        success: false,
        error: 'プラグイン名は英数字、ハイフン、アンダースコアのみ使用可能です'
      }
    }

    if (!/^\d+\.\d+\.\d+$/.test(metadata.version)) {
      return {
        success: false,
        error: 'バージョンはセマンティックバージョニング形式である必要があります'
      }
    }

    return { success: true }
  }

  /**
   * 依存関係チェック（インストール時）
   */
  private async checkDependencies(metadata: PluginMetadata): AsyncResult<void> {
    for (const dependency of metadata.dependencies) {
      if (!this.plugins.has(dependency)) {
        return {
          success: false,
          error: `依存プラグイン "${dependency}" がインストールされていません`
        }
      }
    }

    return { success: true }
  }

  /**
   * アクティブ依存関係チェック（有効化時）
   */
  private async checkActiveDependencies(metadata: PluginMetadata): AsyncResult<void> {
    for (const dependency of metadata.dependencies) {
      if (!this.activePlugins.has(dependency)) {
        return {
          success: false,
          error: `依存プラグイン "${dependency}" が有効になっていません`
        }
      }
    }

    return { success: true }
  }

  /**
   * プラグインフックを登録（内部使用）
   */
  private registerPluginHooks(plugin: Plugin): void {
    for (const [hookName, hookFunction] of Object.entries(plugin.hooks)) {
      const hooks = this.hooks.get(hookName) || []
      hooks.push(hookFunction)
      this.hooks.set(hookName, hooks)
    }
  }

  /**
   * プラグインフックを解除（内部使用）
   */
  private unregisterPluginHooks(plugin: Plugin): void {
    for (const [hookName, hookFunction] of Object.entries(plugin.hooks)) {
      const hooks = this.hooks.get(hookName) || []
      const index = hooks.indexOf(hookFunction)
      if (index > -1) {
        hooks.splice(index, 1)
      }
    }
  }

  /**
   * イベント発行（内部使用）
   */
  private emitEvent(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName) || []
    listeners.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        console.error(`イベントリスナーでエラーが発生しました (${eventName}):`, error)
      }
    })
  }

  /**
   * 全プラグインを無効化
   */
  async deactivateAll(): Promise<void> {
    const activePluginNames = Array.from(this.activePlugins)
    
    for (const pluginName of activePluginNames) {
      await this.deactivate(pluginName)
    }
  }

  /**
   * 全プラグインをアンインストール
   */
  async uninstallAll(): Promise<void> {
    await this.deactivateAll()
    
    const pluginNames = Array.from(this.plugins.keys())
    
    for (const pluginName of pluginNames) {
      await this.uninstall(pluginName)
    }
  }
}

/**
 * グローバルプラグインマネージャーインスタンス
 */
export const globalPluginManager = new PluginManager()

/**
 * プラグイン開発用のベースクラス
 */
export abstract class BasePlugin implements Plugin {
  abstract readonly metadata: PluginMetadata
  abstract readonly hooks: Record<string, Function>

  async onInstall?(): Promise<void> {
    // デフォルト実装は何もしない
  }

  async onActivate?(): Promise<void> {
    // デフォルト実装は何もしない
  }

  async onDeactivate?(): Promise<void> {
    // デフォルト実装は何もしない
  }

  async onUninstall?(): Promise<void> {
    // デフォルト実装は何もしない
  }

  /**
   * プラグイン設定を取得
   */
  protected getConfig<T>(key: string, defaultValue: T): T {
    // 実装は設定システムに依存
    return defaultValue
  }

  /**
   * プラグインログを出力
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const prefix = `[Plugin:${this.metadata.name}]`
    
    switch (level) {
      case 'info':
        console.log(`${prefix} ${message}`)
        break
      case 'warn':
        console.warn(`${prefix} ${message}`)
        break
      case 'error':
        console.error(`${prefix} ${message}`)
        break
    }
  }
}