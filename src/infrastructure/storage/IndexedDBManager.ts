/**
 * IndexedDBマネージャー
 * 
 * ゲームデータの永続化、効率的な検索、大容量データ保存を提供
 * LocalStorageの5MB制限を超えるデータにも対応
 */

import type { SaveData } from '@/game/state/GameStateManager'
import type { StatisticsData } from '@/domain/services/StatisticsDataService'
import type { Game } from '@/domain/entities/Game'

export interface DBSchema {
  saves: {
    key: string
    value: SaveData
    indexes: {
      'by-date': Date
      'by-stage': string
      'by-playtime': number
    }
  }
  statistics: {
    key: string
    value: StatisticsData
    indexes: {
      'by-date': Date
    }
  }
  gameHistory: {
    key: string
    value: SerializedGame
    indexes: {
      'by-date': Date
      'by-status': string
      'by-score': number
    }
  }
  achievements: {
    key: string
    value: Achievement
    indexes: {
      'by-date': Date
      'by-category': string
    }
  }
  preferences: {
    key: string
    value: unknown
  }
}

export interface SerializedGame {
  id: string
  startedAt: Date
  completedAt?: Date
  status: string
  stage: string
  vitality: number
  turn: number
  score: number
  data: string // JSON stringified game data
}

export interface Achievement {
  id: string
  name: string
  description: string
  unlockedAt: Date
  category: string
  icon?: string
  progress?: number
}

export class IndexedDBManager {
  private static instance: IndexedDBManager | null = null
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'InsuranceGameDB'
  private readonly DB_VERSION = 2
  private isInitialized = false
  
  private constructor() {}
  
  static getInstance(): IndexedDBManager {
    if (!IndexedDBManager.instance) {
      IndexedDBManager.instance = new IndexedDBManager()
    }
    return IndexedDBManager.instance
  }
  
  /**
   * データベースを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      this.db = await this.openDatabase()
      this.isInitialized = true
      console.log('✅ IndexedDB initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize IndexedDB:', error)
      throw new Error('データベースの初期化に失敗しました')
    }
  }
  
  /**
   * データベースを開く
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)
      
      request.onerror = () => {
        reject(new Error('データベースを開けませんでした'))
      }
      
      request.onsuccess = () => {
        resolve(request.result)
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // セーブデータストア
        if (!db.objectStoreNames.contains('saves')) {
          const savesStore = db.createObjectStore('saves', { keyPath: 'id' })
          savesStore.createIndex('by-date', 'metadata.savedAt', { unique: false })
          savesStore.createIndex('by-stage', 'gameState.stage', { unique: false })
          savesStore.createIndex('by-playtime', 'metadata.playtime', { unique: false })
        }
        
        // 統計データストア
        if (!db.objectStoreNames.contains('statistics')) {
          const statsStore = db.createObjectStore('statistics', { keyPath: 'id' })
          statsStore.createIndex('by-date', 'lastUpdated', { unique: false })
        }
        
        // ゲーム履歴ストア
        if (!db.objectStoreNames.contains('gameHistory')) {
          const historyStore = db.createObjectStore('gameHistory', { keyPath: 'id' })
          historyStore.createIndex('by-date', 'startedAt', { unique: false })
          historyStore.createIndex('by-status', 'status', { unique: false })
          historyStore.createIndex('by-score', 'score', { unique: false })
        }
        
        // 実績ストア
        if (!db.objectStoreNames.contains('achievements')) {
          const achievementsStore = db.createObjectStore('achievements', { keyPath: 'id' })
          achievementsStore.createIndex('by-date', 'unlockedAt', { unique: false })
          achievementsStore.createIndex('by-category', 'category', { unique: false })
        }
        
        // 設定ストア
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' })
        }
      }
    })
  }
  
  /**
   * セーブデータを保存
   */
  async saveSaveData(slotId: string, saveData: SaveData): Promise<void> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const transaction = this.db.transaction(['saves'], 'readwrite')
    const store = transaction.objectStore('saves')
    
    const dataWithId = {
      ...saveData,
      id: slotId
    }
    
    return new Promise((resolve, reject) => {
      const request = store.put(dataWithId)
      
      request.onsuccess = () => {
        console.log(`✅ Save data stored: slot ${slotId}`)
        resolve()
      }
      
      request.onerror = () => {
        reject(new Error('セーブデータの保存に失敗しました'))
      }
    })
  }
  
  /**
   * セーブデータを読み込み
   */
  async loadSaveData(slotId: string): Promise<SaveData | null> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const transaction = this.db.transaction(['saves'], 'readonly')
    const store = transaction.objectStore('saves')
    
    return new Promise((resolve, reject) => {
      const request = store.get(slotId)
      
      request.onsuccess = () => {
        const result = request.result
        if (result) {
          // idプロパティを除去して返す
          const { id, ...saveData } = result
          resolve(saveData as SaveData)
        } else {
          resolve(null)
        }
      }
      
      request.onerror = () => {
        reject(new Error('セーブデータの読み込みに失敗しました'))
      }
    })
  }
  
  /**
   * 全てのセーブデータを取得
   */
  async getAllSaveData(): Promise<Array<SaveData & { id: string }>> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const transaction = this.db.transaction(['saves'], 'readonly')
    const store = transaction.objectStore('saves')
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      
      request.onsuccess = () => {
        resolve(request.result || [])
      }
      
      request.onerror = () => {
        reject(new Error('セーブデータの取得に失敗しました'))
      }
    })
  }
  
  /**
   * セーブデータを削除
   */
  async deleteSaveData(slotId: string): Promise<void> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const transaction = this.db.transaction(['saves'], 'readwrite')
    const store = transaction.objectStore('saves')
    
    return new Promise((resolve, reject) => {
      const request = store.delete(slotId)
      
      request.onsuccess = () => {
        console.log(`🗑️ Save data deleted: slot ${slotId}`)
        resolve()
      }
      
      request.onerror = () => {
        reject(new Error('セーブデータの削除に失敗しました'))
      }
    })
  }
  
  /**
   * 統計データを保存
   */
  async saveStatistics(stats: StatisticsData): Promise<void> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const transaction = this.db.transaction(['statistics'], 'readwrite')
    const store = transaction.objectStore('statistics')
    
    const dataWithMeta = {
      ...stats,
      id: 'main_statistics',
      lastUpdated: new Date()
    }
    
    return new Promise((resolve, reject) => {
      const request = store.put(dataWithMeta)
      
      request.onsuccess = () => {
        console.log('✅ Statistics saved')
        resolve()
      }
      
      request.onerror = () => {
        reject(new Error('統計データの保存に失敗しました'))
      }
    })
  }
  
  /**
   * 統計データを読み込み
   */
  async loadStatistics(): Promise<StatisticsData | null> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const transaction = this.db.transaction(['statistics'], 'readonly')
    const store = transaction.objectStore('statistics')
    
    return new Promise((resolve, reject) => {
      const request = store.get('main_statistics')
      
      request.onsuccess = () => {
        const result = request.result
        if (result) {
          const { id, lastUpdated, ...stats } = result
          resolve(stats as StatisticsData)
        } else {
          resolve(null)
        }
      }
      
      request.onerror = () => {
        reject(new Error('統計データの読み込みに失敗しました'))
      }
    })
  }
  
  /**
   * ゲーム履歴を追加
   */
  async addGameToHistory(game: Game): Promise<void> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const transaction = this.db.transaction(['gameHistory'], 'readwrite')
    const store = transaction.objectStore('gameHistory')
    
    const serializedGame: SerializedGame = {
      id: game.id,
      startedAt: game.startedAt || new Date(),
      completedAt: game.completedAt,
      status: game.status,
      stage: game.stage,
      vitality: game.vitality,
      turn: game.turn,
      score: game.stats.score || 0,
      data: JSON.stringify(game.getSnapshot())
    }
    
    return new Promise((resolve, reject) => {
      const request = store.add(serializedGame)
      
      request.onsuccess = () => {
        console.log('✅ Game added to history')
        resolve()
      }
      
      request.onerror = () => {
        reject(new Error('ゲーム履歴の追加に失敗しました'))
      }
    })
  }
  
  /**
   * ゲーム履歴を検索
   */
  async searchGameHistory(criteria: {
    status?: string
    minScore?: number
    maxScore?: number
    startDate?: Date
    endDate?: Date
    limit?: number
  }): Promise<SerializedGame[]> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const transaction = this.db.transaction(['gameHistory'], 'readonly')
    const store = transaction.objectStore('gameHistory')
    
    return new Promise((resolve, reject) => {
      const results: SerializedGame[] = []
      let count = 0
      const limit = criteria.limit || 100
      
      let cursor: IDBRequest<IDBCursorWithValue | null>
      
      if (criteria.status) {
        const index = store.index('by-status')
        cursor = index.openCursor(IDBKeyRange.only(criteria.status))
      } else if (criteria.minScore !== undefined || criteria.maxScore !== undefined) {
        const index = store.index('by-score')
        const range = IDBKeyRange.bound(
          criteria.minScore || 0,
          criteria.maxScore || Infinity
        )
        cursor = index.openCursor(range)
      } else {
        cursor = store.openCursor()
      }
      
      cursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        
        if (cursor && count < limit) {
          const game = cursor.value
          
          // 日付フィルタ
          if (criteria.startDate && game.startedAt < criteria.startDate) {
            cursor.continue()
            return
          }
          
          if (criteria.endDate && game.startedAt > criteria.endDate) {
            cursor.continue()
            return
          }
          
          results.push(game)
          count++
          cursor.continue()
        } else {
          resolve(results)
        }
      }
      
      cursor.onerror = () => {
        reject(new Error('ゲーム履歴の検索に失敗しました'))
      }
    })
  }
  
  /**
   * 実績を保存
   */
  async saveAchievement(achievement: Achievement): Promise<void> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const transaction = this.db.transaction(['achievements'], 'readwrite')
    const store = transaction.objectStore('achievements')
    
    return new Promise((resolve, reject) => {
      const request = store.put(achievement)
      
      request.onsuccess = () => {
        console.log(`🏆 Achievement saved: ${achievement.name}`)
        resolve()
      }
      
      request.onerror = () => {
        reject(new Error('実績の保存に失敗しました'))
      }
    })
  }
  
  /**
   * 全ての実績を取得
   */
  async getAllAchievements(): Promise<Achievement[]> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const transaction = this.db.transaction(['achievements'], 'readonly')
    const store = transaction.objectStore('achievements')
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      
      request.onsuccess = () => {
        resolve(request.result || [])
      }
      
      request.onerror = () => {
        reject(new Error('実績の取得に失敗しました'))
      }
    })
  }
  
  /**
   * 設定を保存
   */
  async savePreference(key: string, value: unknown): Promise<void> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const transaction = this.db.transaction(['preferences'], 'readwrite')
    const store = transaction.objectStore('preferences')
    
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value })
      
      request.onsuccess = () => {
        resolve()
      }
      
      request.onerror = () => {
        reject(new Error('設定の保存に失敗しました'))
      }
    })
  }
  
  /**
   * 設定を読み込み
   */
  async loadPreference<T>(key: string): Promise<T | null> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const transaction = this.db.transaction(['preferences'], 'readonly')
    const store = transaction.objectStore('preferences')
    
    return new Promise((resolve, reject) => {
      const request = store.get(key)
      
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.value : null)
      }
      
      request.onerror = () => {
        reject(new Error('設定の読み込みに失敗しました'))
      }
    })
  }
  
  /**
   * データベースのサイズを取得
   */
  async getDatabaseSize(): Promise<{ used: number; percentage: number }> {
    try {
      // navigator.storage.estimate() を使用して使用量を取得
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        const used = estimate.usage || 0
        const quota = estimate.quota || 0
        
        return {
          used,
          percentage: quota > 0 ? (used / quota) * 100 : 0
        }
      }
      
      // フォールバック: 簡易計算
      return {
        used: 0,
        percentage: 0
      }
    } catch (error) {
      console.error('ストレージ使用量の取得に失敗:', error)
      return {
        used: 0,
        percentage: 0
      }
    }
  }
  
  /**
   * データベースをクリア
   */
  async clearDatabase(): Promise<void> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const storeNames = ['saves', 'statistics', 'gameHistory', 'achievements', 'preferences']
    const transaction = this.db.transaction(storeNames, 'readwrite')
    
    const promises = storeNames.map(storeName => {
      return new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore(storeName)
        const request = store.clear()
        
        request.onsuccess = () => resolve()
        request.onerror = () => reject(new Error(`${storeName}のクリアに失敗しました`))
      })
    })
    
    await Promise.all(promises)
    console.log('✅ Database cleared')
  }
  
  /**
   * データをエクスポート
   */
  async exportAllData(): Promise<{
    saves: Array<SaveData & { id: string }>
    statistics: StatisticsData | null
    gameHistory: SerializedGame[]
    achievements: Achievement[]
    preferences: Record<string, unknown>
  }> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const [saves, statistics, gameHistory, achievements] = await Promise.all([
      this.getAllSaveData(),
      this.loadStatistics(),
      this.searchGameHistory({}),
      this.getAllAchievements()
    ])
    
    // 設定を全て取得
    const preferencesTransaction = this.db.transaction(['preferences'], 'readonly')
    const preferencesStore = preferencesTransaction.objectStore('preferences')
    
    const preferences: Record<string, unknown> = {}
    
    await new Promise<void>((resolve, reject) => {
      const cursor = preferencesStore.openCursor()
      
      cursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          preferences[cursor.value.key] = cursor.value.value
          cursor.continue()
        } else {
          resolve()
        }
      }
      
      cursor.onerror = () => {
        reject(new Error('設定のエクスポートに失敗しました'))
      }
    })
    
    return {
      saves,
      statistics,
      gameHistory,
      achievements,
      preferences
    }
  }
  
  /**
   * データをインポート
   */
  async importAllData(data: {
    saves?: Array<SaveData & { id: string }>
    statistics?: StatisticsData
    gameHistory?: SerializedGame[]
    achievements?: Achievement[]
    preferences?: Record<string, unknown>
  }): Promise<void> {
    if (!this.db) throw new Error('データベースが初期化されていません')
    
    const promises: Promise<void>[] = []
    
    // セーブデータのインポート
    if (data.saves) {
      for (const save of data.saves) {
        promises.push(this.saveSaveData(save.id, save))
      }
    }
    
    // 統計データのインポート
    if (data.statistics) {
      promises.push(this.saveStatistics(data.statistics))
    }
    
    // ゲーム履歴のインポート
    if (data.gameHistory) {
      const transaction = this.db.transaction(['gameHistory'], 'readwrite')
      const store = transaction.objectStore('gameHistory')
      
      for (const game of data.gameHistory) {
        promises.push(new Promise((resolve, reject) => {
          const request = store.put(game)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(new Error('ゲーム履歴のインポートに失敗しました'))
        }))
      }
    }
    
    // 実績のインポート
    if (data.achievements) {
      for (const achievement of data.achievements) {
        promises.push(this.saveAchievement(achievement))
      }
    }
    
    // 設定のインポート
    if (data.preferences) {
      for (const [key, value] of Object.entries(data.preferences)) {
        promises.push(this.savePreference(key, value))
      }
    }
    
    await Promise.all(promises)
    console.log('✅ Data import completed')
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.isInitialized = false
    }
  }
}