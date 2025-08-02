/**
 * ストレージアダプター
 * 
 * LocalStorageとIndexedDBの統一インターフェースを提供
 * 自動的に適切なストレージを選択し、フォールバック機能を提供
 */

import { IndexedDBManager } from './IndexedDBManager'
import { DataMigrationService } from './DataMigrationService'
import { secureLocalStorage } from '@/utils/security'
import type { SaveData } from '@/game/state/GameStateManager'
import type { StatisticsData } from '@/domain/services/StatisticsDataService'

export type StorageType = 'indexeddb' | 'localstorage'

export interface StorageCapabilities {
  available: boolean
  type: StorageType
  maxSize: number
  persistent: boolean
}

export class StorageAdapter {
  private static instance: StorageAdapter | null = null
  private readonly indexedDBManager: IndexedDBManager
  private readonly migrationService: DataMigrationService
  private readonly localStorage = secureLocalStorage()
  private primaryStorage: StorageType = 'indexeddb'
  private isInitialized = false
  
  private constructor() {
    this.indexedDBManager = IndexedDBManager.getInstance()
    this.migrationService = DataMigrationService.getInstance()
  }
  
  static getInstance(): StorageAdapter {
    if (!StorageAdapter.instance) {
      StorageAdapter.instance = new StorageAdapter()
    }
    return StorageAdapter.instance
  }
  
  /**
   * ストレージアダプターを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      // IndexedDBの初期化を試行
      await this.indexedDBManager.initialize()
      
      // マイグレーションチェック
      const migrationNeeded = await this.migrationService.checkMigrationNeeded()
      if (migrationNeeded) {
        console.log('📦 データマイグレーションを開始します...')
        const result = await this.migrationService.migrateFromLocalStorage()
        if (result.success) {
          console.log(`✅ ${result.migratedItems}件のデータを移行しました`)
        }
      }
      
      this.primaryStorage = 'indexeddb'
      this.isInitialized = true
      
    } catch (error) {
      console.warn('⚠️ IndexedDB初期化失敗、LocalStorageにフォールバック:', error)
      this.primaryStorage = 'localstorage'
      this.isInitialized = true
    }
  }
  
  /**
   * 利用可能なストレージ機能を確認
   */
  async checkCapabilities(): Promise<StorageCapabilities> {
    if (this.primaryStorage === 'indexeddb') {
      try {
        const size = await this.indexedDBManager.getDatabaseSize()
        return {
          available: true,
          type: 'indexeddb',
          maxSize: Infinity, // IndexedDBは実質無制限
          persistent: true
        }
      } catch {
        // フォールバック
      }
    }
    
    // LocalStorageの場合
    return {
      available: true,
      type: 'localstorage',
      maxSize: 5 * 1024 * 1024, // 5MB
      persistent: false
    }
  }
  
  /**
   * セーブデータを保存
   */
  async saveSaveData(slotId: string, saveData: SaveData): Promise<void> {
    await this.ensureInitialized()
    
    if (this.primaryStorage === 'indexeddb') {
      try {
        await this.indexedDBManager.saveSaveData(slotId, saveData)
        return
      } catch (error) {
        console.warn('IndexedDB保存失敗、LocalStorageにフォールバック:', error)
      }
    }
    
    // LocalStorageフォールバック
    const saveKey = `game_save_${slotId}`
    await this.localStorage.setItem(saveKey, saveData)
  }
  
  /**
   * セーブデータを読み込み
   */
  async loadSaveData(slotId: string): Promise<SaveData | null> {
    await this.ensureInitialized()
    
    if (this.primaryStorage === 'indexeddb') {
      try {
        const data = await this.indexedDBManager.loadSaveData(slotId)
        if (data) return data
      } catch (error) {
        console.warn('IndexedDB読み込み失敗、LocalStorageから試行:', error)
      }
    }
    
    // LocalStorageフォールバック
    const saveKey = `game_save_${slotId}`
    return await this.localStorage.getItem<SaveData>(saveKey)
  }
  
  /**
   * 全てのセーブデータを取得
   */
  async getAllSaveData(): Promise<Array<SaveData & { id: string }>> {
    await this.ensureInitialized()
    
    if (this.primaryStorage === 'indexeddb') {
      try {
        return await this.indexedDBManager.getAllSaveData()
      } catch (error) {
        console.warn('IndexedDB取得失敗、LocalStorageから試行:', error)
      }
    }
    
    // LocalStorageフォールバック
    const saves: Array<SaveData & { id: string }> = []
    
    for (let i = 1; i <= 3; i++) {
      const slotId = i.toString()
      const saveKey = `game_save_${slotId}`
      const saveData = await this.localStorage.getItem<SaveData>(saveKey)
      
      if (saveData) {
        saves.push({ ...saveData, id: slotId })
      }
    }
    
    // 自動セーブも確認
    const autoSave = await this.localStorage.getItem<SaveData>('game_save_auto')
    if (autoSave) {
      saves.push({ ...autoSave, id: 'auto' })
    }
    
    return saves
  }
  
  /**
   * セーブデータを削除
   */
  async deleteSaveData(slotId: string): Promise<void> {
    await this.ensureInitialized()
    
    // 両方のストレージから削除を試行
    if (this.primaryStorage === 'indexeddb') {
      try {
        await this.indexedDBManager.deleteSaveData(slotId)
      } catch (error) {
        console.warn('IndexedDB削除失敗:', error)
      }
    }
    
    // LocalStorageからも削除
    const saveKey = `game_save_${slotId}`
    this.localStorage.removeItem(saveKey)
  }
  
  /**
   * 統計データを保存
   */
  async saveStatistics(stats: StatisticsData): Promise<void> {
    await this.ensureInitialized()
    
    if (this.primaryStorage === 'indexeddb') {
      try {
        await this.indexedDBManager.saveStatistics(stats)
        return
      } catch (error) {
        console.warn('IndexedDB統計保存失敗、LocalStorageにフォールバック:', error)
      }
    }
    
    // LocalStorageフォールバック
    await this.localStorage.setItem('game_statistics', stats)
  }
  
  /**
   * 統計データを読み込み
   */
  async loadStatistics(): Promise<StatisticsData | null> {
    await this.ensureInitialized()
    
    if (this.primaryStorage === 'indexeddb') {
      try {
        const stats = await this.indexedDBManager.loadStatistics()
        if (stats) return stats
      } catch (error) {
        console.warn('IndexedDB統計読み込み失敗、LocalStorageから試行:', error)
      }
    }
    
    // LocalStorageフォールバック
    return await this.localStorage.getItem<StatisticsData>('game_statistics')
  }
  
  /**
   * 設定を保存
   */
  async savePreference(key: string, value: unknown): Promise<void> {
    await this.ensureInitialized()
    
    if (this.primaryStorage === 'indexeddb') {
      try {
        await this.indexedDBManager.savePreference(key, value)
        return
      } catch (error) {
        console.warn('IndexedDB設定保存失敗、LocalStorageにフォールバック:', error)
      }
    }
    
    // LocalStorageフォールバック
    await this.localStorage.setItem(key, value)
  }
  
  /**
   * 設定を読み込み
   */
  async loadPreference<T>(key: string): Promise<T | null> {
    await this.ensureInitialized()
    
    if (this.primaryStorage === 'indexeddb') {
      try {
        const value = await this.indexedDBManager.loadPreference<T>(key)
        if (value !== null) return value
      } catch (error) {
        console.warn('IndexedDB設定読み込み失敗、LocalStorageから試行:', error)
      }
    }
    
    // LocalStorageフォールバック
    return await this.localStorage.getItem<T>(key)
  }
  
  /**
   * ストレージ使用状況を取得
   */
  async getStorageUsage(): Promise<{
    used: number
    available: number
    percentage: number
    type: StorageType
  }> {
    await this.ensureInitialized()
    
    if (this.primaryStorage === 'indexeddb') {
      try {
        const size = await this.indexedDBManager.getDatabaseSize()
        return {
          used: size.used,
          available: Infinity,
          percentage: size.percentage,
          type: 'indexeddb'
        }
      } catch (error) {
        console.warn('IndexedDBサイズ取得失敗:', error)
      }
    }
    
    // LocalStorageの使用状況
    let totalSize = 0
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('game_')) {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += key.length + value.length
        }
      }
    }
    
    const STORAGE_LIMIT = 5 * 1024 * 1024 // 5MB
    
    return {
      used: totalSize,
      available: STORAGE_LIMIT - totalSize,
      percentage: (totalSize / STORAGE_LIMIT) * 100,
      type: 'localstorage'
    }
  }
  
  /**
   * データをエクスポート
   */
  async exportAllData(): Promise<string> {
    await this.ensureInitialized()
    
    if (this.primaryStorage === 'indexeddb') {
      try {
        const data = await this.indexedDBManager.exportAllData()
        return JSON.stringify(data, null, 2)
      } catch (error) {
        console.warn('IndexedDBエクスポート失敗:', error)
      }
    }
    
    // LocalStorageからエクスポート
    const exportData: any = {
      saves: await this.getAllSaveData(),
      statistics: await this.loadStatistics(),
      preferences: {}
    }
    
    // 設定を収集
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('game_') && !key.startsWith('game_save_')) {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            exportData.preferences[key] = JSON.parse(value)
          } catch {
            exportData.preferences[key] = value
          }
        }
      }
    }
    
    return JSON.stringify(exportData, null, 2)
  }
  
  /**
   * データをインポート
   */
  async importAllData(dataString: string): Promise<void> {
    await this.ensureInitialized()
    
    const data = JSON.parse(dataString)
    
    if (this.primaryStorage === 'indexeddb') {
      try {
        await this.indexedDBManager.importAllData(data)
        return
      } catch (error) {
        console.warn('IndexedDBインポート失敗:', error)
        throw error
      }
    }
    
    // LocalStorageへインポート
    if (data.saves) {
      for (const save of data.saves) {
        await this.saveSaveData(save.id, save)
      }
    }
    
    if (data.statistics) {
      await this.saveStatistics(data.statistics)
    }
    
    if (data.preferences) {
      for (const [key, value] of Object.entries(data.preferences)) {
        await this.savePreference(key, value)
      }
    }
  }
  
  /**
   * ストレージをクリア
   */
  async clearAllData(): Promise<void> {
    await this.ensureInitialized()
    
    // IndexedDBをクリア
    if (this.primaryStorage === 'indexeddb') {
      try {
        await this.indexedDBManager.clearDatabase()
      } catch (error) {
        console.warn('IndexedDBクリア失敗:', error)
      }
    }
    
    // LocalStorageもクリア
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('game_')) {
        keysToRemove.push(key)
      }
    }
    
    for (const key of keysToRemove) {
      localStorage.removeItem(key)
    }
    
    console.log('✅ 全てのゲームデータをクリアしました')
  }
  
  /**
   * 初期化確認
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.primaryStorage === 'indexeddb') {
      this.indexedDBManager.destroy()
    }
    this.isInitialized = false
  }
}