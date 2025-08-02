import type { Game } from '@/domain/entities/Game'
import type { CommandCategory, GameCommand } from './GameCommand'
import { CompositeCommand, NoOpCommand } from './GameCommand'

/**
 * コマンド履歴の設定
 */
export interface CommandHistoryConfig {
  maxHistorySize: number
  enableMerging: boolean
  mergeTimeWindow: number // ミリ秒
  undoableTurnLimit: number // Undo可能なターン数の制限
}

/**
 * コマンド履歴の統計
 */
export interface CommandHistoryStats {
  totalCommands: number
  undoableCommands: number
  commandsByCategory: Record<CommandCategory, number>
  averageCommandsPerTurn: number
  mergedCommands: number
}

/**
 * Undo/Redo操作の結果
 */
export interface UndoRedoResult {
  success: boolean
  message: string
  commandDescription?: string
  affectedCommands: number
}

/**
 * コマンド履歴管理クラス
 * Undo/Redo機能の中核を担う
 */
export class CommandHistory {
  private history: GameCommand[] = []
  private currentIndex = -1
  private readonly config: CommandHistoryConfig
  private stats: CommandHistoryStats
  
  constructor(config?: Partial<CommandHistoryConfig>) {
    this.config = {
      maxHistorySize: 50,
      enableMerging: true,
      mergeTimeWindow: 1000, // 1秒
      undoableTurnLimit: 3,
      ...config
    }
    
    this.stats = {
      totalCommands: 0,
      undoableCommands: 0,
      commandsByCategory: {
        card_selection: 0,
        challenge: 0,
        insurance: 0,
        turn_progression: 0,
        system: 0
      },
      averageCommandsPerTurn: 0,
      mergedCommands: 0
    }
  }
  
  /**
   * コマンドを実行して履歴に追加
   */
  async executeCommand(command: GameCommand, game: Game): Promise<UndoRedoResult> {
    try {
      // コマンドの妥当性をチェック
      if (!command.isValid(game)) {
        return {
          success: false,
          message: 'コマンドが無効です',
          affectedCommands: 0
        }
      }
      
      // コマンドを実行
      await command.execute(game)
      
      // 履歴に追加
      this.addToHistory(command)
      
      // 統計を更新
      this.updateStats(command)
      
      return {
        success: true,
        message: 'コマンドを実行しました',
        commandDescription: command.description,
        affectedCommands: 1
      }
      
    } catch (error) {
      return {
        success: false,
        message: `コマンド実行エラー: ${error instanceof Error ? error.message : String(error)}`,
        affectedCommands: 0
      }
    }
  }
  
  /**
   * 一つ前のコマンドを取り消し
   */
  async undo(game: Game): Promise<UndoRedoResult> {
    if (!this.canUndo()) {
      return {
        success: false,
        message: 'Undo可能なコマンドがありません',
        affectedCommands: 0
      }
    }
    
    const command = this.history[this.currentIndex]
    
    if (!command.canUndo) {
      return {
        success: false,
        message: 'このコマンドはUndo不可です',
        commandDescription: command.description,
        affectedCommands: 0
      }
    }
    
    try {
      await command.undo(game)
      this.currentIndex--
      
      return {
        success: true,
        message: 'コマンドを取り消しました',
        commandDescription: command.description,
        affectedCommands: 1
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Undoエラー: ${error instanceof Error ? error.message : String(error)}`,
        commandDescription: command.description,
        affectedCommands: 0
      }
    }
  }
  
  /**
   * 取り消したコマンドを再実行
   */
  async redo(game: Game): Promise<UndoRedoResult> {
    if (!this.canRedo()) {
      return {
        success: false,
        message: 'Redo可能なコマンドがありません',
        affectedCommands: 0
      }
    }
    
    const command = this.history[this.currentIndex + 1]
    
    try {
      await command.execute(game)
      this.currentIndex++
      
      return {
        success: true,
        message: 'コマンドを再実行しました',
        commandDescription: command.description,
        affectedCommands: 1
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Redoエラー: ${error instanceof Error ? error.message : String(error)}`,
        commandDescription: command.description,
        affectedCommands: 0
      }
    }
  }
  
  /**
   * 複数のコマンドを一括でUndo
   */
  async undoMultiple(count: number, game: Game): Promise<UndoRedoResult> {
    let undoneCount = 0
    let lastCommand: GameCommand | undefined
    
    for (let i = 0; i < count && this.canUndo(); i++) {
      const result = await this.undo(game)
      if (result.success) {
        undoneCount++
        lastCommand = this.history[this.currentIndex + 1]
      } else {
        break
      }
    }
    
    return {
      success: undoneCount > 0,
      message: undoneCount > 0 
        ? `${undoneCount}個のコマンドを取り消しました`
        : 'Undo可能なコマンドがありません',
      commandDescription: lastCommand?.description,
      affectedCommands: undoneCount
    }
  }
  
  /**
   * 特定のカテゴリのコマンドのみをUndo
   */
  async undoByCategory(category: CommandCategory, game: Game): Promise<UndoRedoResult> {
    const commandsToUndo: GameCommand[] = []
    
    // 現在位置から逆向きに検索
    for (let i = this.currentIndex; i >= 0; i--) {
      const command = this.history[i]
      if (command.category === category && command.canUndo) {
        commandsToUndo.push(command)
        break // 最初に見つかったもののみ
      }
    }
    
    if (commandsToUndo.length === 0) {
      return {
        success: false,
        message: `カテゴリ「${category}」のUndo可能なコマンドがありません`,
        affectedCommands: 0
      }
    }
    
    // Undoを実行
    const targetCommand = commandsToUndo[0]
    const targetIndex = this.history.indexOf(targetCommand)
    
    let undoneCount = 0
    while (this.currentIndex >= targetIndex) {
      const result = await this.undo(game)
      if (result.success) {
        undoneCount++
      } else {
        break
      }
    }
    
    return {
      success: undoneCount > 0,
      message: `カテゴリ「${category}」のコマンドを含む${undoneCount}個のコマンドを取り消しました`,
      commandDescription: targetCommand.description,
      affectedCommands: undoneCount
    }
  }
  
  /**
   * Undo可能かチェック
   */
  canUndo(): boolean {
    return this.currentIndex >= 0 && 
           this.currentIndex < this.history.length &&
           this.history[this.currentIndex].canUndo
  }
  
  /**
   * Redo可能かチェック
   */
  canRedo(): boolean {
    return this.currentIndex + 1 < this.history.length
  }
  
  /**
   * Undo可能なコマンド数を取得
   */
  getUndoableCount(): number {
    let count = 0
    for (let i = this.currentIndex; i >= 0; i--) {
      if (this.history[i].canUndo) {
        count++
      } else {
        break
      }
    }
    return count
  }
  
  /**
   * Redo可能なコマンド数を取得
   */
  getRedoableCount(): number {
    return this.history.length - 1 - this.currentIndex
  }
  
  /**
   * 履歴をクリア
   */
  clear(): void {
    this.history = []
    this.currentIndex = -1
    this.resetStats()
  }
  
  /**
   * 現在の履歴状態を取得
   */
  getHistoryState(): {
    canUndo: boolean
    canRedo: boolean
    undoableCount: number
    redoableCount: number
    currentCommand?: string
    nextCommand?: string
  } {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoableCount: this.getUndoableCount(),
      redoableCount: this.getRedoableCount(),
      currentCommand: this.currentIndex >= 0 
        ? this.history[this.currentIndex].description 
        : undefined,
      nextCommand: this.canRedo() 
        ? this.history[this.currentIndex + 1].description 
        : undefined
    }
  }
  
  /**
   * 履歴の統計を取得
   */
  getStats(): CommandHistoryStats {
    return { ...this.stats }
  }
  
  /**
   * 履歴の詳細を取得（デバッグ用）
   */
  getHistoryDetails(): Array<{
    index: number
    command: string
    category: CommandCategory
    timestamp: Date
    canUndo: boolean
    isCurrent: boolean
  }> {
    return this.history.map((command, index) => ({
      index,
      command: command.description,
      category: command.category,
      timestamp: command.timestamp,
      canUndo: command.canUndo,
      isCurrent: index === this.currentIndex
    }))
  }
  
  /**
   * 特定時点までの状態を復元
   */
  async restoreToPoint(targetIndex: number, game: Game): Promise<UndoRedoResult> {
    if (targetIndex < -1 || targetIndex >= this.history.length) {
      return {
        success: false,
        message: '無効な復元ポイントです',
        affectedCommands: 0
      }
    }
    
    let affectedCommands = 0
    
    // 現在位置からターゲットまでUndo
    while (this.currentIndex > targetIndex) {
      const result = await this.undo(game)
      if (result.success) {
        affectedCommands++
      } else {
        break
      }
    }
    
    // ターゲットから現在位置までRedo
    while (this.currentIndex < targetIndex) {
      const result = await this.redo(game)
      if (result.success) {
        affectedCommands++
      } else {
        break
      }
    }
    
    return {
      success: true,
      message: `${affectedCommands}個のコマンドを処理して状態を復元しました`,
      affectedCommands
    }
  }
  
  // === プライベートメソッド ===
  
  /**
   * コマンドを履歴に追加
   */
  private addToHistory(command: GameCommand): void {
    // Redoスタックをクリア
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }
    
    // コマンドマージを試行
    if (this.config.enableMerging && this.canMergeWithLast(command)) {
      const lastCommand = this.history[this.currentIndex]
      const mergedCommand = lastCommand.mergeWith(command)
      
      if (!(mergedCommand instanceof NoOpCommand)) {
        this.history[this.currentIndex] = mergedCommand
        this.stats.mergedCommands++
      } else {
        // 相殺の場合は前のコマンドを削除
        this.history.pop()
        this.currentIndex--
      }
    } else {
      // 通常の追加
      this.history.push(command)
      this.currentIndex++
    }
    
    // 履歴サイズの制限
    if (this.history.length > this.config.maxHistorySize) {
      const removeCount = this.history.length - this.config.maxHistorySize
      this.history = this.history.slice(removeCount)
      this.currentIndex -= removeCount
    }
  }
  
  /**
   * 最後のコマンドとマージ可能かチェック
   */
  private canMergeWithLast(command: GameCommand): boolean {
    if (this.currentIndex < 0) return false
    
    const lastCommand = this.history[this.currentIndex]
    const timeDiff = command.timestamp.getTime() - lastCommand.timestamp.getTime()
    
    return timeDiff <= this.config.mergeTimeWindow && 
           lastCommand.canMergeWith(command)
  }
  
  /**
   * 統計を更新
   */
  private updateStats(command: GameCommand): void {
    this.stats.totalCommands++
    
    if (command.canUndo) {
      this.stats.undoableCommands++
    }
    
    this.stats.commandsByCategory[command.category]++
  }
  
  /**
   * 統計をリセット
   */
  private resetStats(): void {
    this.stats = {
      totalCommands: 0,
      undoableCommands: 0,
      commandsByCategory: {
        card_selection: 0,
        challenge: 0,
        insurance: 0,
        turn_progression: 0,
        system: 0
      },
      averageCommandsPerTurn: 0,
      mergedCommands: 0
    }
  }
}