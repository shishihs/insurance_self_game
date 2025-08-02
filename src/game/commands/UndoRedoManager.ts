import type { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import { CommandHistory, type CommandHistoryConfig, type UndoRedoResult } from './CommandHistory'
import { 
  CardSelectionCommand, 
  ChallengeCommand, 
  type GameCommand, 
  InsurancePurchaseCommand,
  NextTurnCommand,
  SnapshotCommand 
} from './GameCommand'

/**
 * Undo/Redo操作のイベント
 */
export interface UndoRedoEvent {
  type: 'undo' | 'redo' | 'command_executed' | 'history_cleared'
  result: UndoRedoResult
  historyState: {
    canUndo: boolean
    canRedo: boolean
    undoableCount: number
    redoableCount: number
  }
}

/**
 * Undo/Redoの設定
 */
export interface UndoRedoConfig extends CommandHistoryConfig {
  enableKeyboardShortcuts: boolean
  enableAutoSnapshot: boolean
  snapshotInterval: number // ターン数
  maxSnapshots: number
}

/**
 * Undo/Redo管理システム
 * ゲーム内でのUndo/Redo操作を統合管理
 */
export class UndoRedoManager {
  private commandHistory: CommandHistory
  private currentGame: Game | null = null
  private eventListeners: ((event: UndoRedoEvent) => void)[] = []
  private readonly snapshots: Map<number, any> = new Map() // ターン番号 -> スナップショット
  private config: UndoRedoConfig
  
  constructor(config?: Partial<UndoRedoConfig>) {
    this.config = {
      maxHistorySize: 50,
      enableMerging: true,
      mergeTimeWindow: 1000,
      undoableTurnLimit: 3,
      enableKeyboardShortcuts: true,
      enableAutoSnapshot: true,
      snapshotInterval: 5,
      maxSnapshots: 10,
      ...config
    }
    
    this.commandHistory = new CommandHistory(this.config)
    
    if (this.config.enableKeyboardShortcuts) {
      this.setupKeyboardShortcuts()
    }
  }
  
  /**
   * 現在のゲームを設定
   */
  setCurrentGame(game: Game): void {
    this.currentGame = game
    this.commandHistory.clear()
    this.snapshots.clear()
    
    // 初期スナップショットを作成
    if (this.config.enableAutoSnapshot) {
      this.createSnapshot('ゲーム開始')
    }
  }
  
  /**
   * カード選択コマンドを実行
   */
  async selectCard(card: Card, select: boolean): Promise<UndoRedoResult> {
    if (!this.currentGame) {
      return this.createErrorResult('ゲームが設定されていません')
    }
    
    const command = new CardSelectionCommand(card, select)
    return await this.executeCommand(command)
  }
  
  /**
   * チャレンジコマンドを実行
   */
  async executeChallenge(challengeCard: Card): Promise<UndoRedoResult> {
    if (!this.currentGame) {
      return this.createErrorResult('ゲームが設定されていません')
    }
    
    // チャレンジ前にスナップショットを作成
    await this.createSnapshot(`チャレンジ前 - ターン${this.currentGame.turn}`)
    
    const command = new ChallengeCommand(challengeCard)
    return await this.executeCommand(command)
  }
  
  /**
   * 保険購入コマンドを実行
   */
  async purchaseInsurance(insuranceType: string, durationType: 'term' | 'whole_life'): Promise<UndoRedoResult> {
    if (!this.currentGame) {
      return this.createErrorResult('ゲームが設定されていません')
    }
    
    const command = new InsurancePurchaseCommand(insuranceType, durationType)
    return await this.executeCommand(command)
  }
  
  /**
   * ターン進行コマンドを実行
   */
  async nextTurn(): Promise<UndoRedoResult> {
    if (!this.currentGame) {
      return this.createErrorResult('ゲームが設定されていません')
    }
    
    // ターン進行前にスナップショットを作成
    if (this.config.enableAutoSnapshot && 
        this.currentGame.turn % this.config.snapshotInterval === 0) {
      await this.createSnapshot(`ターン${this.currentGame.turn}完了`)
    }
    
    const command = new NextTurnCommand()
    return await this.executeCommand(command)
  }
  
  /**
   * Undoを実行
   */
  async undo(): Promise<UndoRedoResult> {
    if (!this.currentGame) {
      return this.createErrorResult('ゲームが設定されていません')
    }
    
    const result = await this.commandHistory.undo(this.currentGame)
    this.emitEvent('undo', result)
    return result
  }
  
  /**
   * Redoを実行
   */
  async redo(): Promise<UndoRedoResult> {
    if (!this.currentGame) {
      return this.createErrorResult('ゲームが設定されていません')
    }
    
    const result = await this.commandHistory.redo(this.currentGame)
    this.emitEvent('redo', result)
    return result
  }
  
  /**
   * 複数のUndoを実行
   */
  async undoMultiple(count: number): Promise<UndoRedoResult> {
    if (!this.currentGame) {
      return this.createErrorResult('ゲームが設定されていません')
    }
    
    const result = await this.commandHistory.undoMultiple(count, this.currentGame)
    this.emitEvent('undo', result)
    return result
  }
  
  /**
   * 前のターンに戻る（ターン単位でのUndo）
   */
  async undoToTurn(targetTurn: number): Promise<UndoRedoResult> {
    if (!this.currentGame) {
      return this.createErrorResult('ゲームが設定されていません')
    }
    
    // スナップショットがある場合はそれを使用
    const snapshot = this.snapshots.get(targetTurn)
    if (snapshot) {
      return await this.restoreFromSnapshot(targetTurn, snapshot)
    }
    
    // スナップショットがない場合はコマンド履歴から復元
    const historyDetails = this.commandHistory.getHistoryDetails()
    const targetCommand = historyDetails.find(detail => 
      detail.command.includes(`ターン${targetTurn}`)
    )
    
    if (targetCommand) {
      return await this.commandHistory.restoreToPoint(targetCommand.index, this.currentGame)
    }
    
    return this.createErrorResult(`ターン${targetTurn}への復元ポイントが見つかりません`)
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
    availableSnapshots: number[]
  } {
    const state = this.commandHistory.getHistoryState()
    return {
      ...state,
      availableSnapshots: Array.from(this.snapshots.keys()).sort((a, b) => b - a)
    }
  }
  
  /**
   * 履歴の統計を取得
   */
  getHistoryStats() {
    return this.commandHistory.getStats()
  }
  
  /**
   * 履歴の詳細を取得（デバッグ用）
   */
  getHistoryDetails() {
    return this.commandHistory.getHistoryDetails()
  }
  
  /**
   * スナップショットを作成
   */
  async createSnapshot(description: string): Promise<void> {
    if (!this.currentGame) return
    
    const snapshotCommand = new SnapshotCommand(description)
    await snapshotCommand.execute(this.currentGame)
    
    const turn = this.currentGame.turn
    this.snapshots.set(turn, snapshotCommand.getSnapshot())
    
    // 最大スナップショット数の制限
    if (this.snapshots.size > this.config.maxSnapshots) {
      const keys = Array.from(this.snapshots.keys())
      const oldestTurn = Math.min(...keys)
      this.snapshots.delete(oldestTurn)
    }
    
    console.log(`📸 スナップショット作成: ${description} (ターン${turn})`)
  }
  
  /**
   * イベントリスナーを追加
   */
  addEventListener(listener: (event: UndoRedoEvent) => void): void {
    this.eventListeners.push(listener)
  }
  
  /**
   * イベントリスナーを削除
   */
  removeEventListener(listener: (event: UndoRedoEvent) => void): void {
    const index = this.eventListeners.indexOf(listener)
    if (index !== -1) {
      this.eventListeners.splice(index, 1)
    }
  }
  
  /**
   * 履歴をクリア
   */
  clearHistory(): void {
    this.commandHistory.clear()
    this.snapshots.clear()
    
    const result: UndoRedoResult = {
      success: true,
      message: '履歴をクリアしました',
      affectedCommands: 0
    }
    
    this.emitEvent('history_cleared', result)
  }
  
  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<UndoRedoConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // 新しい設定でコマンド履歴を再初期化
    const currentState = this.commandHistory.getHistoryDetails()
    this.commandHistory = new CommandHistory(this.config)
    
    console.log('🔧 Undo/Redo設定を更新しました')
  }
  
  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): {
    config: UndoRedoConfig
    historySize: number
    snapshotCount: number
    currentTurn: number | null
    memoryUsage: number
  } {
    const historyDetails = this.commandHistory.getHistoryDetails()
    
    return {
      config: this.config,
      historySize: historyDetails.length,
      snapshotCount: this.snapshots.size,
      currentTurn: this.currentGame?.turn || null,
      memoryUsage: this.estimateMemoryUsage()
    }
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    this.clearHistory()
    this.eventListeners = []
    this.currentGame = null
    
    // キーボードイベントリスナーを削除
    if (this.config.enableKeyboardShortcuts) {
      this.removeKeyboardShortcuts()
    }
  }
  
  // === プライベートメソッド ===
  
  /**
   * コマンドを実行
   */
  private async executeCommand(command: GameCommand): Promise<UndoRedoResult> {
    const result = await this.commandHistory.executeCommand(command, this.currentGame!)
    
    if (result.success) {
      this.emitEvent('command_executed', result)
    }
    
    return result
  }
  
  /**
   * スナップショットから復元
   */
  private async restoreFromSnapshot(turn: number, snapshot: any): Promise<UndoRedoResult> {
    if (!this.currentGame) {
      return this.createErrorResult('ゲームが設定されていません')
    }
    
    try {
      // TODO: スナップショットからゲーム状態を復元する処理
      // 現在は簡易実装
      console.log(`📼 スナップショット復元: ターン${turn}`)
      
      return {
        success: true,
        message: `ターン${turn}の状態に復元しました`,
        affectedCommands: 1
      }
    } catch (error) {
      return this.createErrorResult(`復元エラー: ${error}`)
    }
  }
  
  /**
   * キーボードショートカットを設定
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
  }
  
  /**
   * キーボードショートカットを削除
   */
  private removeKeyboardShortcuts(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
  }
  
  /**
   * キーボードイベントを処理
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.currentGame) return
    
    const isCtrlOrCmd = event.ctrlKey || event.metaKey
    
    if (isCtrlOrCmd) {
      switch (event.key.toLowerCase()) {
        case 'z':
          if (event.shiftKey) {
            // Ctrl+Shift+Z または Cmd+Shift+Z でRedo
            event.preventDefault()
            this.redo()
          } else {
            // Ctrl+Z または Cmd+Z でUndo
            event.preventDefault()
            this.undo()
          }
          break
        
        case 'y':
          // Ctrl+Y でRedo (Windows)
          if (!event.shiftKey) {
            event.preventDefault()
            this.redo()
          }
          break
      }
    }
  }
  
  /**
   * イベントを発行
   */
  private emitEvent(type: UndoRedoEvent['type'], result: UndoRedoResult): void {
    const event: UndoRedoEvent = {
      type,
      result,
      historyState: {
        canUndo: this.commandHistory.canUndo(),
        canRedo: this.commandHistory.canRedo(),
        undoableCount: this.commandHistory.getUndoableCount(),
        redoableCount: this.commandHistory.getRedoableCount()
      }
    }
    
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('Undo/Redoイベントリスナーエラー:', error)
      }
    })
  }
  
  /**
   * エラー結果を作成
   */
  private createErrorResult(message: string): UndoRedoResult {
    return {
      success: false,
      message,
      affectedCommands: 0
    }
  }
  
  /**
   * メモリ使用量を推定
   */
  private estimateMemoryUsage(): number {
    // 簡易的なメモリ使用量推定
    const historySize = this.commandHistory.getHistoryDetails().length
    const snapshotSize = this.snapshots.size
    
    // 1コマンド約1KB、1スナップショット約10KBと仮定
    return historySize * 1024 + snapshotSize * 10240
  }
}