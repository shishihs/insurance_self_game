import type { Game } from '@/domain/entities/Game'
import type { GameConfig, IGameState } from '@/domain/types/game.types'
import { GameStateManager, type SaveData, type SaveSlot } from './GameStateManager'

/**
 * セーブ/ロード操作の結果
 */
export interface SaveLoadResult {
  success: boolean
  message: string
  data?: any
}

/**
 * セーブ/ロードオプション
 */
export interface SaveOptions {
  slotName?: string
  description?: string
  overwrite?: boolean
}

export interface LoadOptions {
  validateData?: boolean
  backupCurrent?: boolean
}

/**
 * セーブ/ロード専用サービス
 * GameStateManagerの高レベルAPIを提供
 */
export class SaveLoadService {
  private stateManager: GameStateManager
  
  constructor() {
    this.stateManager = GameStateManager.getInstance()
  }
  
  /**
   * ゲームを指定スロットにセーブ
   */
  async saveGame(
    game: Game, 
    slotId: string, 
    options: SaveOptions = {}
  ): Promise<SaveLoadResult> {
    try {
      // 既存データの確認
      if (!options.overwrite) {
        const existingSlots = this.stateManager.getSaveSlots()
        const targetSlot = existingSlots.find(slot => slot.id === slotId)
        
        if (targetSlot && !targetSlot.isEmpty) {
          return {
            success: false,
            message: `スロット ${slotId} には既にデータが存在します。上書きする場合は overwrite オプションを有効にしてください。`
          }
        }
      }
      
      // ゲーム状態を設定してセーブ
      this.stateManager.setCurrentGame(game)
      await this.stateManager.save(slotId, {
        slotName: options.slotName,
        description: options.description
      })
      
      return {
        success: true,
        message: `ゲームをスロット ${slotId} に保存しました`
      }
      
    } catch (error) {
      return {
        success: false,
        message: `セーブに失敗しました: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
  
  /**
   * 指定スロットからゲームをロード
   */
  async loadGame(
    slotId: string, 
    options: LoadOptions = {}
  ): Promise<SaveLoadResult> {
    try {
      // データ検証
      if (options.validateData) {
        const validation = await this.validateSaveData(slotId)
        if (!validation.isValid) {
          return {
            success: false,
            message: `セーブデータが破損しています: ${validation.error}`
          }
        }
      }
      
      // 現在のゲームをバックアップ（オプション）
      if (options.backupCurrent) {
        // TODO: 現在のゲーム状態をバックアップ
      }
      
      // ゲームをロード
      const game = await this.stateManager.load(slotId)
      
      if (!game) {
        return {
          success: false,
          message: `スロット ${slotId} にセーブデータが見つかりません`
        }
      }
      
      return {
        success: true,
        message: `スロット ${slotId} からゲームを読み込みました`,
        data: game
      }
      
    } catch (error) {
      return {
        success: false,
        message: `ロードに失敗しました: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
  
  /**
   * 自動セーブを実行
   */
  async performAutoSave(game: Game): Promise<SaveLoadResult> {
    try {
      this.stateManager.setCurrentGame(game)
      await this.stateManager.autoSave()
      
      return {
        success: true,
        message: '自動セーブが完了しました'
      }
      
    } catch (error) {
      return {
        success: false,
        message: `自動セーブに失敗しました: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
  
  /**
   * 利用可能なセーブスロット一覧を取得
   */
  getSaveSlots(): SaveSlot[] {
    return this.stateManager.getSaveSlots()
  }
  
  /**
   * セーブデータを削除
   */
  deleteSave(slotId: string): SaveLoadResult {
    try {
      this.stateManager.deleteSave(slotId)
      
      return {
        success: true,
        message: `スロット ${slotId} のセーブデータを削除しました`
      }
      
    } catch (error) {
      return {
        success: false,
        message: `削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
  
  /**
   * セーブデータをエクスポート
   */
  exportSaveData(): SaveLoadResult {
    try {
      const exportData = this.stateManager.exportData()
      
      return {
        success: true,
        message: 'セーブデータをエクスポートしました',
        data: exportData
      }
      
    } catch (error) {
      return {
        success: false,
        message: `エクスポートに失敗しました: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
  
  /**
   * セーブデータをインポート
   */
  async importSaveData(dataString: string): Promise<SaveLoadResult> {
    try {
      await this.stateManager.importData(dataString)
      
      return {
        success: true,
        message: 'セーブデータをインポートしました'
      }
      
    } catch (error) {
      return {
        success: false,
        message: `インポートに失敗しました: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
  
  /**
   * ストレージ使用状況を取得
   */
  getStorageInfo(): {
    usage: { used: number; available: number; percentage: number }
    slots: SaveSlot[]
    totalSaves: number
  } {
    const usage = this.stateManager.getStorageUsage()
    const slots = this.getSaveSlots()
    const totalSaves = slots.filter(slot => !slot.isEmpty).length
    
    return {
      usage,
      slots,
      totalSaves
    }
  }
  
  /**
   * セーブデータの妥当性を検証
   */
  private async validateSaveData(slotId: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const storage = this.stateManager['storage'] // プライベートプロパティへのアクセス
      const saveKey = `game_save_${slotId}`
      const saveData = storage.getItem<SaveData>(saveKey)
      
      if (!saveData) {
        return { isValid: false, error: 'セーブデータが存在しません' }
      }
      
      // 基本構造の検証
      if (!saveData.version || !saveData.gameState || !saveData.metadata) {
        return { isValid: false, error: 'セーブデータの構造が不正です' }
      }
      
      // ゲーム状態の基本プロパティをチェック
      const requiredProps = ['id', 'status', 'phase', 'stage', 'turn', 'vitality']
      for (const prop of requiredProps) {
        if (!(prop in saveData.gameState)) {
          return { isValid: false, error: `必須プロパティ '${prop}' が見つかりません` }
        }
      }
      
      return { isValid: true }
      
    } catch (error) {
      return { isValid: false, error: `検証中にエラーが発生しました: ${error}` }
    }
  }
}

/**
 * セーブ/ロード操作のヘルパー関数群
 */
export class SaveLoadUtils {
  /**
   * セーブデータのサイズを人間が読みやすい形式で取得
   */
  static formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }
  
  /**
   * プレイ時間を人間が読みやすい形式で取得
   */
  static formatPlaytime(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`
    } else {
      return `${minutes}分`
    }
  }
  
  /**
   * セーブスロット名の自動生成
   */
  static generateSlotName(gameState: IGameState): string {
    const stageNames = {
      youth: '青年期',
      middle: '中年期',
      fulfillment: '充実期'
    }
    
    const stageName = stageNames[gameState.stage] || gameState.stage
    return `${stageName} - ターン${gameState.turn} (活力: ${gameState.vitality})`
  }
  
  /**
   * セーブデータの妥当性を簡易チェック
   */
  static isValidSaveDataString(dataString: string): boolean {
    try {
      const data = JSON.parse(dataString)
      return (
        data.version &&
        data.gameState &&
        data.metadata &&
        typeof data.gameState.vitality === 'number' &&
        typeof data.gameState.turn === 'number'
      )
    } catch {
      return false
    }
  }
  
  /**
   * セーブスロットのソート（最後に保存したものから順）
   */
  static sortSlotsByLastSaved(slots: SaveSlot[]): SaveSlot[] {
    return [...slots].sort((a, b) => {
      if (a.isEmpty && b.isEmpty) return 0
      if (a.isEmpty) return 1
      if (b.isEmpty) return -1
      return b.lastSaved.getTime() - a.lastSaved.getTime()
    })
  }
}