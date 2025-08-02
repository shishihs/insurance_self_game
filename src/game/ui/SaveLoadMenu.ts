import Phaser from 'phaser'
import { SaveLoadService, SaveLoadUtils, type SaveLoadResult } from '../state/SaveLoadService'
import type { SaveSlot } from '../state/GameStateManager'
import { Game } from '@/domain/entities/Game'

/**
 * セーブ/ロードメニューの設定
 */
interface SaveLoadMenuConfig {
  scene: Phaser.Scene
  x: number
  y: number
  width: number
  height: number
  currentGame?: Game
}

/**
 * セーブ/ロードメニューのUI
 * Phaserゲーム内でセーブ/ロード操作を行うためのメニュー
 */
export class SaveLoadMenu extends Phaser.GameObjects.Container {
  private saveLoadService: SaveLoadService
  private currentGame?: Game
  private background: Phaser.GameObjects.Rectangle
  private titleText: Phaser.GameObjects.Text
  private tabContainer: Phaser.GameObjects.Container
  private contentContainer: Phaser.GameObjects.Container
  private closeButton: Phaser.GameObjects.Text
  
  private currentTab: 'save' | 'load' = 'save'
  private slots: SaveSlot[] = []
  private slotElements: Map<string, Phaser.GameObjects.Container> = new Map()
  
  private readonly config: SaveLoadMenuConfig
  
  constructor(config: SaveLoadMenuConfig) {
    super(config.scene, config.x, config.y)
    
    this.config = config
    this.currentGame = config.currentGame
    this.saveLoadService = new SaveLoadService()
    
    this.setSize(config.width, config.height)
    this.createUI()
    this.refreshSlots()
    
    config.scene.add.existing(this)
  }
  
  /**
   * UIを作成
   */
  private createUI(): void {
    // 背景
    this.background = this.scene.add.rectangle(
      0, 0, 
      this.config.width, this.config.height,
      0x000000, 0.8
    )
    this.add(this.background)
    
    // タイトル
    this.titleText = this.scene.add.text(
      0, -this.config.height / 2 + 30,
      'セーブ / ロード',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5, 0)
    this.add(this.titleText)
    
    // 閉じるボタン
    this.closeButton = this.scene.add.text(
      this.config.width / 2 - 20, -this.config.height / 2 + 20,
      '×',
      {
        fontSize: '32px',
        color: '#ff6b6b',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5, 0)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => this.close())
    .on('pointerover', () => this.closeButton.setColor('#ff5252'))
    .on('pointerout', () => this.closeButton.setColor('#ff6b6b'))
    
    this.add(this.closeButton)
    
    // タブ
    this.createTabs()
    
    // コンテンツエリア
    this.contentContainer = this.scene.add.container(0, -50)
    this.add(this.contentContainer)
  }
  
  /**
   * タブを作成
   */
  private createTabs(): void {
    this.tabContainer = this.scene.add.container(0, -this.config.height / 2 + 80)
    
    const tabWidth = 120
    const tabHeight = 40
    
    // セーブタブ
    const saveTab = this.createTab(-tabWidth / 2 - 10, 0, tabWidth, tabHeight, 'セーブ', 'save')
    
    // ロードタブ
    const loadTab = this.createTab(tabWidth / 2 + 10, 0, tabWidth, tabHeight, 'ロード', 'load')
    
    this.tabContainer.add([saveTab, loadTab])
    this.add(this.tabContainer)
    
    this.updateTabAppearance()
  }
  
  /**
   * 個別タブを作成
   */
  private createTab(
    x: number, y: number, width: number, height: number,
    label: string, type: 'save' | 'load'
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    
    const background = this.scene.add.rectangle(0, 0, width, height, 0x333333)
    const text = this.scene.add.text(0, 0, label, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5, 0.5)
    
    container.add([background, text])
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width/2, -height/2, width, height),
      Phaser.Geom.Rectangle.Contains
    )
    .on('pointerdown', () => this.switchTab(type))
    .on('pointerover', () => {
      if (this.currentTab !== type) {
        background.setFillStyle(0x444444)
      }
    })
    .on('pointerout', () => {
      if (this.currentTab !== type) {
        background.setFillStyle(0x333333)
      }
    })
    
    container.setData('background', background)
    container.setData('type', type)
    
    return container
  }
  
  /**
   * タブを切り替え
   */
  private switchTab(tab: 'save' | 'load'): void {
    this.currentTab = tab
    this.updateTabAppearance()
    this.refreshContent()
  }
  
  /**
   * タブの外観を更新
   */
  private updateTabAppearance(): void {
    this.tabContainer.each((child) => {
      const container = child as Phaser.GameObjects.Container
      const background = container.getData('background') as Phaser.GameObjects.Rectangle
      const type = container.getData('type') as string
      
      if (type === this.currentTab) {
        background.setFillStyle(0x4c6ef5)
      } else {
        background.setFillStyle(0x333333)
      }
    })
  }
  
  /**
   * スロット情報を更新
   */
  private refreshSlots(): void {
    this.slots = this.saveLoadService.getSaveSlots()
    this.refreshContent()
  }
  
  /**
   * コンテンツエリアを更新
   */
  private refreshContent(): void {
    // 既存のコンテンツをクリア
    this.contentContainer.removeAll(true)
    this.slotElements.clear()
    
    // ストレージ情報を表示
    this.createStorageInfo()
    
    // スロット一覧を表示
    this.createSlotList()
    
    // ボタンを作成
    this.createActionButtons()
  }
  
  /**
   * ストレージ情報を作成
   */
  private createStorageInfo(): void {
    const storageInfo = this.saveLoadService.getStorageInfo()
    const usageText = `ストレージ使用量: ${SaveLoadUtils.formatSize(storageInfo.usage.used)} / ${SaveLoadUtils.formatSize(storageInfo.usage.used + storageInfo.usage.available)} (${storageInfo.usage.percentage.toFixed(1)}%)`
    
    const text = this.scene.add.text(
      0, 20,
      usageText,
      {
        fontSize: '12px',
        color: '#cccccc',
        fontFamily: 'Arial'
      }
    ).setOrigin(0.5, 0)
    
    this.contentContainer.add(text)
  }
  
  /**
   * スロット一覧を作成
   */
  private createSlotList(): void {
    const startY = 60
    const slotHeight = 80
    const slotSpacing = 10
    
    this.slots.forEach((slot, index) => {
      const y = startY + index * (slotHeight + slotSpacing)
      const slotElement = this.createSlotElement(slot, 0, y, this.config.width - 40, slotHeight)
      
      this.contentContainer.add(slotElement)
      this.slotElements.set(slot.id, slotElement)
    })
  }
  
  /**
   * 個別スロット要素を作成
   */
  private createSlotElement(
    slot: SaveSlot, 
    x: number, y: number, width: number, height: number
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    
    // 背景
    const bgColor = slot.isEmpty ? 0x2a2a2a : 0x3a3a3a
    const background = this.scene.add.rectangle(0, 0, width, height, bgColor)
    container.add(background)
    
    if (slot.isEmpty) {
      // 空のスロット
      const emptyText = this.scene.add.text(0, 0, `空のスロット ${slot.id}`, {
        fontSize: '16px',
        color: '#888888',
        fontFamily: 'Arial'
      }).setOrigin(0.5, 0.5)
      
      container.add(emptyText)
      
      if (this.currentTab === 'save' && this.currentGame) {
        this.makeSlotInteractive(container, slot, 'save')
      }
    } else {
      // データがあるスロット
      const nameText = this.scene.add.text(-width/2 + 10, -height/2 + 10, slot.name, {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial'
      })
      
      const infoText = this.scene.add.text(
        -width/2 + 10, -height/2 + 35,
        `${slot.stage} - ターン${slot.turn} | 活力: ${slot.vitality}`,
        {
          fontSize: '12px',
          color: '#cccccc',
          fontFamily: 'Arial'
        }
      )
      
      const timeText = this.scene.add.text(
        -width/2 + 10, -height/2 + 55,
        `最終セーブ: ${slot.lastSaved.toLocaleString()} | プレイ時間: ${SaveLoadUtils.formatPlaytime(slot.playtime)}`,
        {
          fontSize: '10px',
          color: '#aaaaaa',
          fontFamily: 'Arial'
        }
      )
      
      container.add([nameText, infoText, timeText])
      
      // 削除ボタン
      const deleteButton = this.scene.add.text(
        width/2 - 20, -height/2 + 10,
        '🗑️',
        {
          fontSize: '16px'
        }
      ).setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation()
        this.deleteSlot(slot)
      })
      
      container.add(deleteButton)
      
      // スロットをクリック可能にする
      const actionType = this.currentTab === 'save' ? 'save' : 'load'
      this.makeSlotInteractive(container, slot, actionType)
    }
    
    return container
  }
  
  /**
   * スロットをインタラクティブにする
   */
  private makeSlotInteractive(
    container: Phaser.GameObjects.Container,
    slot: SaveSlot,
    action: 'save' | 'load'
  ): void {
    const bounds = container.getBounds()
    
    container.setInteractive(
      new Phaser.Geom.Rectangle(
        -bounds.width/2, -bounds.height/2, 
        bounds.width, bounds.height
      ),
      Phaser.Geom.Rectangle.Contains,
      true
    )
    .on('pointerdown', () => {
      if (action === 'save') {
        this.saveToSlot(slot)
      } else {
        this.loadFromSlot(slot)
      }
    })
    .on('pointerover', () => {
      const background = container.getAt(0) as Phaser.GameObjects.Rectangle
      background.setFillStyle(0x4a4a4a)
    })
    .on('pointerout', () => {
      const background = container.getAt(0) as Phaser.GameObjects.Rectangle
      const bgColor = slot.isEmpty ? 0x2a2a2a : 0x3a3a3a
      background.setFillStyle(bgColor)
    })
  }
  
  /**
   * アクションボタンを作成
   */
  private createActionButtons(): void {
    const buttonY = this.config.height / 2 - 60
    
    // エクスポートボタン
    const exportButton = this.createButton(
      -100, buttonY, 180, 35,
      'データをエクスポート',
      () => this.exportData()
    )
    
    // インポートボタン
    const importButton = this.createButton(
      100, buttonY, 180, 35,
      'データをインポート',
      () => this.importData()
    )
    
    this.contentContainer.add([exportButton, importButton])
  }
  
  /**
   * ボタンを作成
   */
  private createButton(
    x: number, y: number, width: number, height: number,
    text: string, callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    
    const background = this.scene.add.rectangle(0, 0, width, height, 0x4c6ef5)
    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5, 0.5)
    
    container.add([background, buttonText])
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width/2, -height/2, width, height),
      Phaser.Geom.Rectangle.Contains
    )
    .on('pointerdown', callback)
    .on('pointerover', () => background.setFillStyle(0x5c7cff))
    .on('pointerout', () => background.setFillStyle(0x4c6ef5))
    
    return container
  }
  
  /**
   * スロットにセーブ
   */
  private async saveToSlot(slot: SaveSlot): Promise<void> {
    if (!this.currentGame) {
      this.showMessage('セーブするゲームがありません', 'error')
      return
    }
    
    try {
      const slotName = SaveLoadUtils.generateSlotName(this.currentGame.getSnapshot())
      
      const result = await this.saveLoadService.saveGame(
        this.currentGame,
        slot.id,
        {
          slotName,
          overwrite: true
        }
      )
      
      if (result.success) {
        this.showMessage(result.message, 'success')
        this.refreshSlots()
      } else {
        this.showMessage(result.message, 'error')
      }
    } catch (error) {
      this.showMessage(`セーブエラー: ${error}`, 'error')
    }
  }
  
  /**
   * スロットからロード
   */
  private async loadFromSlot(slot: SaveSlot): Promise<void> {
    if (slot.isEmpty) {
      this.showMessage('空のスロットです', 'error')
      return
    }
    
    try {
      const result = await this.saveLoadService.loadGame(slot.id, {
        validateData: true
      })
      
      if (result.success && result.data) {
        this.showMessage(result.message, 'success')
        
        // ゲームロードイベントを発行
        this.scene.events.emit('gameLoaded', result.data)
        this.close()
      } else {
        this.showMessage(result.message, 'error')
      }
    } catch (error) {
      this.showMessage(`ロードエラー: ${error}`, 'error')
    }
  }
  
  /**
   * スロットを削除
   */
  private deleteSlot(slot: SaveSlot): void {
    const result = this.saveLoadService.deleteSave(slot.id)
    
    if (result.success) {
      this.showMessage(result.message, 'success')
      this.refreshSlots()
    } else {
      this.showMessage(result.message, 'error')
    }
  }
  
  /**
   * データをエクスポート
   */
  private exportData(): void {
    const result = this.saveLoadService.exportSaveData()
    
    if (result.success && result.data) {
      // ブラウザでファイルダウンロードを実行
      const blob = new Blob([result.data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `game_save_export_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      this.showMessage('データをエクスポートしました', 'success')
    } else {
      this.showMessage(result.message, 'error')
    }
  }
  
  /**
   * データをインポート
   */
  private importData(): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      try {
        const text = await file.text()
        
        if (!SaveLoadUtils.isValidSaveDataString(text)) {
          this.showMessage('無効なセーブデータファイルです', 'error')
          return
        }
        
        const result = await this.saveLoadService.importSaveData(text)
        
        if (result.success) {
          this.showMessage(result.message, 'success')
          this.refreshSlots()
        } else {
          this.showMessage(result.message, 'error')
        }
      } catch (error) {
        this.showMessage(`インポートエラー: ${error}`, 'error')
      }
    }
    
    input.click()
  }
  
  /**
   * メッセージを表示
   */
  private showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const color = type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'
    
    const messageText = this.scene.add.text(
      0, this.config.height / 2 - 20,
      message,
      {
        fontSize: '14px',
        color,
        fontFamily: 'Arial',
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5, 1)
    
    this.add(messageText)
    
    // 3秒後にメッセージを削除
    this.scene.time.delayedCall(3000, () => {
      messageText.destroy()
    })
  }
  
  /**
   * 現在のゲームを設定
   */
  setCurrentGame(game: Game): void {
    this.currentGame = game
    this.refreshContent()
  }
  
  /**
   * メニューを閉じる
   */
  close(): void {
    this.scene.events.emit('saveLoadMenuClosed')
    this.destroy()
  }
  
  /**
   * メニューを表示
   */
  show(): void {
    this.setVisible(true)
    this.refreshSlots()
  }
  
  /**
   * メニューを非表示
   */
  hide(): void {
    this.setVisible(false)
  }
}