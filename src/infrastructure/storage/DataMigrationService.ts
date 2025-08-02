/**
 * データマイグレーションサービス
 * 
 * LocalStorageからIndexedDBへの移行、バージョン管理、
 * データ構造の変更に対応するマイグレーション機能を提供
 */

import { IndexedDBManager } from './IndexedDBManager'
import { secureLocalStorage } from '@/utils/security'
import type { SaveData } from '@/game/state/GameStateManager'
import type { StatisticsData } from '@/domain/services/StatisticsDataService'

export interface MigrationResult {
  success: boolean
  migratedItems: number
  errors: string[]
  details: {
    saves: number
    statistics: boolean
    preferences: number
  }
}

export interface MigrationStrategy {
  version: string
  description: string
  migrate: () => Promise<void>
}

export class DataMigrationService {
  private static instance: DataMigrationService | null = null
  private readonly indexedDBManager: IndexedDBManager
  private readonly storage = secureLocalStorage()
  private readonly MIGRATION_KEY = 'game_migration_status'
  
  private constructor() {
    this.indexedDBManager = IndexedDBManager.getInstance()
  }
  
  static getInstance(): DataMigrationService {
    if (!DataMigrationService.instance) {
      DataMigrationService.instance = new DataMigrationService()
    }
    return DataMigrationService.instance
  }
  
  /**
   * マイグレーションが必要かチェック
   */
  async checkMigrationNeeded(): Promise<boolean> {
    try {
      const migrationStatus = await this.storage.getItem<{
        completed: boolean
        version: string
        timestamp: string
      }>(this.MIGRATION_KEY)
      
      // マイグレーション未実行の場合
      if (!migrationStatus?.completed) {
        return true
      }
      
      // LocalStorageにゲームデータが残っている場合
      const hasLegacyData = this.checkLegacyDataExists()
      return hasLegacyData
      
    } catch (error) {
      console.error('マイグレーションチェックエラー:', error)
      return true // エラーの場合は安全のためマイグレーションを実行
    }
  }
  
  /**
   * LocalStorageからIndexedDBへデータを移行
   */
  async migrateFromLocalStorage(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedItems: 0,
      errors: [],
      details: {
        saves: 0,
        statistics: false,
        preferences: 0
      }
    }
    
    try {
      // IndexedDBを初期化
      await this.indexedDBManager.initialize()
      
      // セーブデータの移行
      const savesMigrated = await this.migrateSaveData()
      result.details.saves = savesMigrated
      result.migratedItems += savesMigrated
      
      // 統計データの移行
      const statsMigrated = await this.migrateStatistics()
      result.details.statistics = statsMigrated
      if (statsMigrated) result.migratedItems++
      
      // 設定の移行
      const prefsMigrated = await this.migratePreferences()
      result.details.preferences = prefsMigrated
      result.migratedItems += prefsMigrated
      
      // マイグレーション完了を記録
      await this.recordMigrationComplete()
      
      result.success = true
      console.log('✅ データマイグレーション完了:', result)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors.push(errorMessage)
      console.error('❌ マイグレーションエラー:', error)
    }
    
    return result
  }
  
  /**
   * セーブデータを移行
   */
  private async migrateSaveData(): Promise<number> {
    let migratedCount = 0
    
    try {
      // LocalStorageから全てのセーブスロットを確認
      for (let i = 1; i <= 3; i++) {
        const slotId = i.toString()
        const saveKey = `game_save_${slotId}`
        const saveData = await this.storage.getItem<SaveData>(saveKey)
        
        if (saveData) {
          // IndexedDBに保存
          await this.indexedDBManager.saveSaveData(slotId, saveData)
          migratedCount++
          
          console.log(`📦 セーブデータ移行完了: スロット ${slotId}`)
        }
      }
      
      // 自動セーブも移行
      const autoSaveData = await this.storage.getItem<SaveData>('game_save_auto')
      if (autoSaveData) {
        await this.indexedDBManager.saveSaveData('auto', autoSaveData)
        migratedCount++
      }
      
    } catch (error) {
      console.error('セーブデータ移行エラー:', error)
      throw error
    }
    
    return migratedCount
  }
  
  /**
   * 統計データを移行
   */
  private async migrateStatistics(): Promise<boolean> {
    try {
      // 拡張統計データを取得
      const enhancedStats = await this.storage.getItem<any>('game_enhanced_stats')
      
      if (enhancedStats) {
        // StatisticsData形式に変換
        const statisticsData: StatisticsData = {
          totalGames: enhancedStats.gamesCompleted || 0,
          completedGames: enhancedStats.gamesCompleted || 0,
          victoryGames: 0, // 詳細データがない場合は0
          gameOverCount: 0,
          totalPlayTime: enhancedStats.totalPlaytime || 0,
          averageGameDuration: 0,
          
          totalChallenges: enhancedStats.totalChallenges || 0,
          successfulChallenges: enhancedStats.successfulChallenges || 0,
          challengeSuccessRate: this.calculateSuccessRate(
            enhancedStats.successfulChallenges,
            enhancedStats.totalChallenges
          ),
          averageVitality: 0,
          highestVitality: enhancedStats.highestVitality || 0,
          lowestVitality: 0,
          
          averageTurnsPerGame: enhancedStats.averageTurnsPerGame || 0,
          stageReachCounts: enhancedStats.stageReachCounts || {
            youth: 0,
            middle: 0,
            fulfillment: 0
          },
          stageSuccessRates: enhancedStats.stageSuccessRates || {
            youth: 0,
            middle: 0,
            fulfillment: 0
          },
          
          cardsAcquiredTotal: enhancedStats.cardsAcquired || 0,
          averageCardsPerGame: 0,
          cardTypeUsage: {},
          favoriteCardTypes: [],
          
          totalInsurancePurchases: 0,
          insuranceTypeUsage: {},
          averageInsuranceBurden: 0,
          insuranceEffectiveness: 0,
          
          gameHistoryByDate: enhancedStats.progressionData?.map((p: any) => ({
            date: p.date,
            gamesPlayed: p.gamesPlayed || 0,
            averageScore: p.bestScore || 0,
            totalPlayTime: p.totalPlaytime || 0
          })) || [],
          
          decisionPatterns: [],
          
          recentTrends: {
            performanceImprovement: 0,
            playTimeIncrease: 0,
            difficultyPreference: 'normal',
            mostActiveTimeSlots: []
          }
        }
        
        // IndexedDBに保存
        await this.indexedDBManager.saveStatistics(statisticsData)
        
        console.log('📊 統計データ移行完了')
        return true
      }
      
    } catch (error) {
      console.error('統計データ移行エラー:', error)
      throw error
    }
    
    return false
  }
  
  /**
   * 設定を移行
   */
  private async migratePreferences(): Promise<number> {
    let migratedCount = 0
    
    try {
      // 既知の設定キーをチェック
      const preferenceKeys = [
        'game_settings',
        'game_volume',
        'game_difficulty',
        'game_theme',
        'game_language',
        'game_tutorial_completed'
      ]
      
      for (const key of preferenceKeys) {
        const value = await this.storage.getItem(key)
        if (value !== null) {
          await this.indexedDBManager.savePreference(key, value)
          migratedCount++
        }
      }
      
      console.log(`⚙️ 設定データ移行完了: ${migratedCount}件`)
      
    } catch (error) {
      console.error('設定データ移行エラー:', error)
      throw error
    }
    
    return migratedCount
  }
  
  /**
   * レガシーデータの存在チェック
   */
  private checkLegacyDataExists(): boolean {
    try {
      // LocalStorageにゲーム関連のキーが存在するかチェック
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('game_')) {
          return true
        }
      }
      return false
    } catch (error) {
      console.error('レガシーデータチェックエラー:', error)
      return false
    }
  }
  
  /**
   * マイグレーション完了を記録
   */
  private async recordMigrationComplete(): Promise<void> {
    await this.storage.setItem(this.MIGRATION_KEY, {
      completed: true,
      version: '2.0.0',
      timestamp: new Date().toISOString()
    })
  }
  
  /**
   * 成功率を計算
   */
  private calculateSuccessRate(successful: number, total: number): number {
    if (total === 0) return 0
    return (successful / total) * 100
  }
  
  /**
   * レガシーデータをクリーンアップ（オプション）
   */
  async cleanupLegacyData(confirm = false): Promise<void> {
    if (!confirm) {
      console.warn('⚠️ cleanupLegacyData: confirmパラメータがfalseのため、クリーンアップをスキップします')
      return
    }
    
    try {
      const keysToRemove: string[] = []
      
      // ゲーム関連のキーを収集
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('game_')) {
          keysToRemove.push(key)
        }
      }
      
      // 収集したキーを削除
      for (const key of keysToRemove) {
        localStorage.removeItem(key)
      }
      
      console.log(`🧹 レガシーデータクリーンアップ完了: ${keysToRemove.length}件削除`)
      
    } catch (error) {
      console.error('クリーンアップエラー:', error)
      throw error
    }
  }
  
  /**
   * マイグレーションステータスをリセット（デバッグ用）
   */
  async resetMigrationStatus(): Promise<void> {
    await this.storage.removeItem(this.MIGRATION_KEY)
    console.log('🔄 マイグレーションステータスをリセットしました')
  }
  
  /**
   * データ整合性チェック
   */
  async verifyDataIntegrity(): Promise<{
    isValid: boolean
    issues: string[]
  }> {
    const issues: string[] = []
    
    try {
      // IndexedDBのデータを確認
      const allSaves = await this.indexedDBManager.getAllSaveData()
      const statistics = await this.indexedDBManager.loadStatistics()
      
      // セーブデータの検証
      for (const save of allSaves) {
        if (!save.version || !save.gameState || !save.metadata) {
          issues.push(`セーブスロット ${save.id}: 必須フィールドが不足しています`)
        }
      }
      
      // 統計データの検証
      if (statistics) {
        if (statistics.totalGames < statistics.completedGames) {
          issues.push('統計データ: 総ゲーム数が完了ゲーム数より少ない')
        }
        
        if (statistics.totalChallenges < statistics.successfulChallenges) {
          issues.push('統計データ: 総チャレンジ数が成功チャレンジ数より少ない')
        }
      }
      
    } catch (error) {
      issues.push(`検証エラー: ${error instanceof Error ? error.message : String(error)}`)
    }
    
    return {
      isValid: issues.length === 0,
      issues
    }
  }
}