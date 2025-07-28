import { Game } from '@/domain/entities/Game'
import type { IGameState, PlayerStats } from '@/domain/types/game.types'
import { secureLocalStorage } from '@/utils/security'

/**
 * セーブデータの構造
 */
export interface SaveData {
  version: string
  gameState: IGameState
  metadata: SaveMetadata
  statistics: EnhancedPlayerStats
}

/**
 * セーブデータのメタ情報
 */
export interface SaveMetadata {
  savedAt: Date
  playtime: number
  playerLevel: number
  slotName?: string
  description?: string
}

/**
 * 拡張プレイヤー統計
 */
export interface EnhancedPlayerStats extends PlayerStats {
  // 戦略分析
  insuranceUsagePatterns: InsuranceUsagePattern[]
  challengeSuccessRates: Record<string, number>
  averageVitalityByStage: Record<string, number>
  
  // プレイ履歴
  sessionsPlayed: number
  totalPlaytime: number
  bestScore: number
  gamesCompleted: number
  achievements: Achievement[]
  
  // 長期傾向
  progressionData: DailyProgress[]
  streaks: PlayStreak
  
  // 詳細統計
  mostUsedInsuranceType?: string
  averageTurnsPerGame: number
  fastestCompletion?: number
  longestStreak: number
}

/**
 * 保険使用パターン
 */
export interface InsuranceUsagePattern {
  insuranceType: string
  usageCount: number
  successRate: number
  averageBenefit: number
}

/**
 * 実績システム
 */
export interface Achievement {
  id: string
  name: string
  description: string
  unlockedAt: Date
  category: 'gameplay' | 'strategy' | 'milestone' | 'special'
  icon?: string
}

/**
 * 日次進捗データ
 */
export interface DailyProgress {
  date: string
  gamesPlayed: number
  bestScore: number
  totalPlaytime: number
  challengesCompleted: number
}

/**
 * プレイストリーク
 */
export interface PlayStreak {
  current: number
  best: number
  lastPlayedDate?: string
}

/**
 * ゲーム状態のスナップショット（Undo/Redo用）
 */
export interface GameStateSnapshot {
  id: string
  timestamp: Date
  gameState: IGameState
  description: string
  canUndo: boolean
}

/**
 * セーブスロット情報
 */
export interface SaveSlot {
  id: string
  name: string
  lastSaved: Date
  playtime: number
  stage: string
  turn: number
  vitality: number
  isEmpty: boolean
}

/**
 * 統合ゲーム状態管理システム
 * 
 * このクラスは以下の責務を持ちます：
 * - セーブ/ロード機能
 * - プレイヤー統計の追跡と管理
 * - Undo/Redo機能（制限付き）
 * - LocalStorage活用の最適化
 * - ゲーム状態の一元管理
 */
export class GameStateManager {
  private static instance: GameStateManager | null = null
  private readonly SAVE_VERSION = '1.0.0'
  private readonly MAX_SNAPSHOTS = 10
  private readonly MAX_SAVE_SLOTS = 3
  private readonly AUTO_SAVE_INTERVAL = 30000 // 30秒
  
  private currentGame: Game | null = null
  private snapshots: GameStateSnapshot[] = []
  private currentSnapshotIndex = -1
  private storage = secureLocalStorage()
  private autoSaveTimer: number | null = null
  private sessionStartTime: Date = new Date()
  private enhancedStats: EnhancedPlayerStats
  
  private constructor() {
    this.enhancedStats = this.initializeEnhancedStats()
    this.setupAutoSave()
  }
  
  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager()
    }
    return GameStateManager.instance
  }
  
  /**
   * 現在のゲームインスタンスを設定
   */
  setCurrentGame(game: Game): void {
    this.currentGame = game
    this.sessionStartTime = new Date()
    
    // 既存の統計データを読み込み
    this.loadEnhancedStats()
    
    // セッション開始を記録
    this.enhancedStats.sessionsPlayed++
    this.updateDailyProgress()
  }
  
  /**
   * セーブデータを保存
   */
  async save(slotId: string, metadata?: Partial<SaveMetadata>): Promise<void> {
    if (!this.currentGame) {
      throw new Error('No active game to save')
    }
    
    try {
      const gameState = this.currentGame.getSnapshot()
      const playtime = this.calculateSessionPlaytime()
      
      const saveData: SaveData = {
        version: this.SAVE_VERSION,
        gameState,
        metadata: {
          savedAt: new Date(),
          playtime: playtime + (this.enhancedStats.totalPlaytime || 0),
          playerLevel: this.calculatePlayerLevel(),
          slotName: metadata?.slotName || `セーブデータ ${slotId}`,
          description: metadata?.description
        },
        statistics: this.enhancedStats
      }
      
      const saveKey = `game_save_${slotId}`
      this.storage.setItem(saveKey, saveData)
      
      // セーブスロット一覧を更新
      this.updateSaveSlotList(slotId, saveData)
      
      console.log(`✅ ゲームを保存しました: スロット ${slotId}`)
    } catch (error) {
      console.error('❌ セーブエラー:', error)
      throw new Error('セーブに失敗しました')
    }
  }
  
  /**
   * セーブデータを読み込み
   */
  async load(slotId: string): Promise<Game | null> {
    try {
      const saveKey = `game_save_${slotId}`
      const saveData = this.storage.getItem<SaveData>(saveKey)
      
      if (!saveData) {
        console.log(`セーブデータが見つかりません: スロット ${slotId}`)
        return null
      }
      
      // バージョンチェック
      if (saveData.version !== this.SAVE_VERSION) {
        console.warn('セーブデータのバージョンが異なります。移行を試行します。')
        // TODO: データ移行処理を実装
      }
      
      // ゲーム状態から新しいGameインスタンスを復元
      const game = this.restoreGameFromState(saveData.gameState)
      
      // 統計データを復元
      this.enhancedStats = saveData.statistics
      
      console.log(`✅ ゲームを読み込みました: スロット ${slotId}`)
      return game
      
    } catch (error) {
      console.error('❌ ロードエラー:', error)
      throw new Error('ロードに失敗しました')
    }
  }
  
  /**
   * 自動セーブを実行
   */
  async autoSave(): Promise<void> {
    if (!this.currentGame || this.currentGame.status !== 'in_progress') {
      return
    }
    
    try {
      await this.save('auto', { 
        slotName: '自動セーブ',
        description: `ターン ${this.currentGame.turn} - ${this.currentGame.stage}`
      })
    } catch (error) {
      console.warn('自動セーブに失敗しました:', error)
    }
  }
  
  /**
   * 利用可能なセーブスロット一覧を取得
   */
  getSaveSlots(): SaveSlot[] {
    const slots: SaveSlot[] = []
    
    for (let i = 1; i <= this.MAX_SAVE_SLOTS; i++) {
      const slotId = i.toString()
      const saveKey = `game_save_${slotId}`
      const saveData = this.storage.getItem<SaveData>(saveKey)
      
      if (saveData) {
        slots.push({
          id: slotId,
          name: saveData.metadata.slotName || `セーブデータ ${slotId}`,
          lastSaved: new Date(saveData.metadata.savedAt),
          playtime: saveData.metadata.playtime,
          stage: saveData.gameState.stage,
          turn: saveData.gameState.turn,
          vitality: saveData.gameState.vitality,
          isEmpty: false
        })
      } else {
        slots.push({
          id: slotId,
          name: `空のスロット ${slotId}`,
          lastSaved: new Date(0),
          playtime: 0,
          stage: '',
          turn: 0,
          vitality: 0,
          isEmpty: true
        })
      }
    }
    
    return slots
  }
  
  /**
   * セーブデータを削除
   */
  deleteSave(slotId: string): void {
    const saveKey = `game_save_${slotId}`
    this.storage.removeItem(saveKey)
    console.log(`🗑️ セーブデータを削除しました: スロット ${slotId}`)
  }
  
  /**
   * ゲーム状態のスナップショットを作成（Undo/Redo用）
   */
  createSnapshot(description: string): void {
    if (!this.currentGame) return
    
    const snapshot: GameStateSnapshot = {
      id: `snapshot_${Date.now()}`,
      timestamp: new Date(),
      gameState: this.currentGame.getSnapshot(),
      description,
      canUndo: true
    }
    
    // スナップショット履歴を管理
    this.snapshots = this.snapshots.slice(0, this.currentSnapshotIndex + 1)
    this.snapshots.push(snapshot)
    
    // 最大数を超えた場合は古いものを削除
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift()
    } else {
      this.currentSnapshotIndex++
    }
  }
  
  /**
   * 一つ前の状態に戻る
   */
  undo(): boolean {
    if (!this.canUndo()) return false
    
    this.currentSnapshotIndex--
    const snapshot = this.snapshots[this.currentSnapshotIndex]
    this.restoreFromSnapshot(snapshot)
    
    return true
  }
  
  /**
   * やり直し（Redo）
   */
  redo(): boolean {
    if (!this.canRedo()) return false
    
    this.currentSnapshotIndex++
    const snapshot = this.snapshots[this.currentSnapshotIndex]
    this.restoreFromSnapshot(snapshot)
    
    return true
  }
  
  /**
   * Undoが可能かチェック
   */
  canUndo(): boolean {
    return this.currentSnapshotIndex > 0
  }
  
  /**
   * Redoが可能かチェック
   */
  canRedo(): boolean {
    return this.currentSnapshotIndex < this.snapshots.length - 1
  }
  
  /**
   * 拡張統計を取得
   */
  getEnhancedStats(): EnhancedPlayerStats {
    return { ...this.enhancedStats }
  }
  
  /**
   * 統計を更新
   */
  updateStatistics(updates: Partial<EnhancedPlayerStats>): void {
    this.enhancedStats = { ...this.enhancedStats, ...updates }
    this.saveEnhancedStats()
  }
  
  /**
   * ゲーム完了時の統計更新
   */
  onGameComplete(finalStats: PlayerStats): void {
    const playtime = this.calculateSessionPlaytime()
    
    // 基本統計を更新
    this.enhancedStats.gamesCompleted++
    this.enhancedStats.totalPlaytime += playtime
    this.enhancedStats.bestScore = Math.max(this.enhancedStats.bestScore, finalStats.score || 0)
    
    // 平均ターン数を更新
    const totalGames = this.enhancedStats.gamesCompleted
    this.enhancedStats.averageTurnsPerGame = 
      (this.enhancedStats.averageTurnsPerGame * (totalGames - 1) + finalStats.turnsPlayed) / totalGames
    
    // 最速完了時間を更新
    if (!this.enhancedStats.fastestCompletion || playtime < this.enhancedStats.fastestCompletion) {
      this.enhancedStats.fastestCompletion = playtime
    }
    
    // ストリークを更新
    this.updatePlayStreak()
    
    // 実績チェック
    this.checkAchievements()
    
    // 日次進捗を更新
    this.updateDailyProgress()
    
    this.saveEnhancedStats()
  }
  
  /**
   * データのエクスポート
   */
  exportData(): string {
    const exportData = {
      version: this.SAVE_VERSION,
      exportedAt: new Date(),
      saves: this.getAllSaveData(),
      statistics: this.enhancedStats
    }
    
    return JSON.stringify(exportData, null, 2)
  }
  
  /**
   * データのインポート
   */
  async importData(dataString: string): Promise<void> {
    try {
      const importData = JSON.parse(dataString)
      
      // バージョンチェック
      if (importData.version !== this.SAVE_VERSION) {
        throw new Error('互換性のないデータ形式です')
      }
      
      // セーブデータをインポート
      if (importData.saves) {
        for (const [slotId, saveData] of Object.entries(importData.saves)) {
          const saveKey = `game_save_${slotId}`
          this.storage.setItem(saveKey, saveData)
        }
      }
      
      // 統計データをインポート
      if (importData.statistics) {
        this.enhancedStats = importData.statistics
        this.saveEnhancedStats()
      }
      
      console.log('✅ データのインポートが完了しました')
    } catch (error) {
      console.error('❌ インポートエラー:', error)
      throw new Error('データのインポートに失敗しました')
    }
  }
  
  /**
   * ストレージ使用状況を取得
   */
  getStorageUsage(): { used: number; available: number; percentage: number } {
    let totalSize = 0
    
    // 全てのゲーム関連データのサイズを計算
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('game_')) {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += key.length + value.length
        }
      }
    }
    
    // 一般的なLocalStorageの制限は5MB
    const STORAGE_LIMIT = 5 * 1024 * 1024
    
    return {
      used: totalSize,
      available: STORAGE_LIMIT - totalSize,
      percentage: (totalSize / STORAGE_LIMIT) * 100
    }
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
    
    // 最終的な統計保存
    this.saveEnhancedStats()
  }
  
  // === プライベートメソッド ===
  
  private initializeEnhancedStats(): EnhancedPlayerStats {
    return {
      // 基本統計
      totalChallenges: 0,
      successfulChallenges: 0,
      failedChallenges: 0,
      cardsAcquired: 0,
      highestVitality: 0,
      turnsPlayed: 0,
      
      // 拡張統計
      insuranceUsagePatterns: [],
      challengeSuccessRates: {},
      averageVitalityByStage: {},
      sessionsPlayed: 0,
      totalPlaytime: 0,
      bestScore: 0,
      gamesCompleted: 0,
      achievements: [],
      progressionData: [],
      streaks: { current: 0, best: 0 },
      averageTurnsPerGame: 0,
      longestStreak: 0
    }
  }
  
  private setupAutoSave(): void {
    this.autoSaveTimer = window.setInterval(() => {
      this.autoSave()
    }, this.AUTO_SAVE_INTERVAL)
  }
  
  private calculateSessionPlaytime(): number {
    return Date.now() - this.sessionStartTime.getTime()
  }
  
  private calculatePlayerLevel(): number {
    // 経験値ベースのレベル計算
    const totalExperience = 
      this.enhancedStats.gamesCompleted * 100 +
      this.enhancedStats.successfulChallenges * 10 +
      this.enhancedStats.achievements.length * 50
    
    return Math.floor(Math.sqrt(totalExperience / 100)) + 1
  }
  
  private restoreGameFromState(gameState: IGameState): Game {
    // TODO: ゲーム状態からGameインスタンスを完全復元する処理
    // 現在は簡易実装
    const game = new Game(gameState.config)
    // 状態を復元...
    return game
  }
  
  private restoreFromSnapshot(snapshot: GameStateSnapshot): void {
    if (!this.currentGame) return
    
    // TODO: スナップショットからゲーム状態を復元
    console.log(`Restoring from snapshot: ${snapshot.description}`)
  }
  
  private updateSaveSlotList(slotId: string, saveData: SaveData): void {
    const slotsKey = 'game_save_slots'
    const slots = this.storage.getItem<Record<string, any>>(slotsKey) || {}
    
    slots[slotId] = {
      name: saveData.metadata.slotName,
      lastSaved: saveData.metadata.savedAt,
      playtime: saveData.metadata.playtime
    }
    
    this.storage.setItem(slotsKey, slots)
  }
  
  private loadEnhancedStats(): void {
    const statsKey = 'game_enhanced_stats'
    const savedStats = this.storage.getItem<EnhancedPlayerStats>(statsKey)
    
    if (savedStats) {
      this.enhancedStats = { ...this.enhancedStats, ...savedStats }
    }
  }
  
  private saveEnhancedStats(): void {
    const statsKey = 'game_enhanced_stats'
    this.storage.setItem(statsKey, this.enhancedStats)
  }
  
  private updatePlayStreak(): void {
    const today = new Date().toDateString()
    const lastPlayedDate = this.enhancedStats.streaks.lastPlayedDate
    
    if (lastPlayedDate === today) {
      // 今日既にプレイ済みの場合はストリーク維持
      return
    }
    
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (lastPlayedDate === yesterday.toDateString()) {
      // 連続プレイの場合はストリーク継続
      this.enhancedStats.streaks.current++
      this.enhancedStats.streaks.best = Math.max(
        this.enhancedStats.streaks.best, 
        this.enhancedStats.streaks.current
      )
    } else {
      // ストリーク切れの場合はリセット
      this.enhancedStats.streaks.current = 1
    }
    
    this.enhancedStats.streaks.lastPlayedDate = today
    this.enhancedStats.longestStreak = this.enhancedStats.streaks.best
  }
  
  private updateDailyProgress(): void {
    const today = new Date().toDateString()
    const existingProgress = this.enhancedStats.progressionData.find(p => p.date === today)
    
    if (existingProgress) {
      existingProgress.gamesPlayed++
      existingProgress.totalPlaytime += this.calculateSessionPlaytime()
    } else {
      this.enhancedStats.progressionData.push({
        date: today,
        gamesPlayed: 1,
        bestScore: this.enhancedStats.bestScore,
        totalPlaytime: this.calculateSessionPlaytime(),
        challengesCompleted: this.enhancedStats.successfulChallenges
      })
    }
    
    // 古いデータを削除（30日より古いもの）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    this.enhancedStats.progressionData = this.enhancedStats.progressionData.filter(
      p => new Date(p.date) >= thirtyDaysAgo
    )
  }
  
  private checkAchievements(): void {
    const newAchievements: Achievement[] = []
    
    // ゲーム完了数による実績
    if (this.enhancedStats.gamesCompleted === 1) {
      newAchievements.push({
        id: 'first_completion',
        name: '初回クリア',
        description: '初めてゲームをクリアしました',
        unlockedAt: new Date(),
        category: 'milestone'
      })
    }
    
    if (this.enhancedStats.gamesCompleted === 10) {
      newAchievements.push({
        id: 'veteran_player',
        name: 'ベテランプレイヤー',
        description: '10回ゲームをクリアしました',
        unlockedAt: new Date(),
        category: 'milestone'
      })
    }
    
    // ストリークによる実績
    if (this.enhancedStats.streaks.current === 7) {
      newAchievements.push({
        id: 'weekly_streak',
        name: '継続は力なり',
        description: '7日連続でプレイしました',
        unlockedAt: new Date(),
        category: 'gameplay'
      })
    }
    
    // 新規実績を追加
    newAchievements.forEach(achievement => {
      const exists = this.enhancedStats.achievements.some(a => a.id === achievement.id)
      if (!exists) {
        this.enhancedStats.achievements.push(achievement)
        console.log(`🏆 新しい実績を獲得しました: ${achievement.name}`)
      }
    })
  }
  
  private getAllSaveData(): Record<string, SaveData> {
    const saves: Record<string, SaveData> = {}
    
    for (let i = 1; i <= this.MAX_SAVE_SLOTS; i++) {
      const slotId = i.toString()
      const saveKey = `game_save_${slotId}`
      const saveData = this.storage.getItem<SaveData>(saveKey)
      
      if (saveData) {
        saves[slotId] = saveData
      }
    }
    
    return saves
  }
}