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
  private createTab(\n    x: number, y: number, width: number, height: number, \n    label: string, type: 'save' | 'load'\n  ): Phaser.GameObjects.Container {\n    const container = this.scene.add.container(x, y)\n    \n    const background = this.scene.add.rectangle(0, 0, width, height, 0x333333)\n    const text = this.scene.add.text(0, 0, label, {\n      fontSize: '16px',\n      color: '#ffffff',\n      fontFamily: 'Arial'\n    }).setOrigin(0.5, 0.5)\n    \n    container.add([background, text])\n    container.setInteractive(\n      new Phaser.Geom.Rectangle(-width/2, -height/2, width, height),\n      Phaser.Geom.Rectangle.Contains\n    )\n    .on('pointerdown', () => this.switchTab(type))\n    .on('pointerover', () => {\n      if (this.currentTab !== type) {\n        background.setFillStyle(0x444444)\n      }\n    })\n    .on('pointerout', () => {\n      if (this.currentTab !== type) {\n        background.setFillStyle(0x333333)\n      }\n    })\n    \n    container.setData('background', background)\n    container.setData('type', type)\n    \n    return container\n  }\n  \n  /**\n   * タブを切り替え\n   */\n  private switchTab(tab: 'save' | 'load'): void {\n    this.currentTab = tab\n    this.updateTabAppearance()\n    this.refreshContent()\n  }\n  \n  /**\n   * タブの外観を更新\n   */\n  private updateTabAppearance(): void {\n    this.tabContainer.each((child) => {\n      const container = child as Phaser.GameObjects.Container\n      const background = container.getData('background') as Phaser.GameObjects.Rectangle\n      const type = container.getData('type') as string\n      \n      if (type === this.currentTab) {\n        background.setFillStyle(0x4c6ef5)\n      } else {\n        background.setFillStyle(0x333333)\n      }\n    })\n  }\n  \n  /**\n   * スロット情報を更新\n   */\n  private refreshSlots(): void {\n    this.slots = this.saveLoadService.getSaveSlots()\n    this.refreshContent()\n  }\n  \n  /**\n   * コンテンツエリアを更新\n   */\n  private refreshContent(): void {\n    // 既存のコンテンツをクリア\n    this.contentContainer.removeAll(true)\n    this.slotElements.clear()\n    \n    // ストレージ情報を表示\n    this.createStorageInfo()\n    \n    // スロット一覧を表示\n    this.createSlotList()\n    \n    // ボタンを作成\n    this.createActionButtons()\n  }\n  \n  /**\n   * ストレージ情報を作成\n   */\n  private createStorageInfo(): void {\n    const storageInfo = this.saveLoadService.getStorageInfo()\n    const usageText = `ストレージ使用量: ${SaveLoadUtils.formatSize(storageInfo.usage.used)} / ${SaveLoadUtils.formatSize(storageInfo.usage.used + storageInfo.usage.available)} (${storageInfo.usage.percentage.toFixed(1)}%)`\n    \n    const text = this.scene.add.text(\n      0, 20,\n      usageText,\n      {\n        fontSize: '12px',\n        color: '#cccccc',\n        fontFamily: 'Arial'\n      }\n    ).setOrigin(0.5, 0)\n    \n    this.contentContainer.add(text)\n  }\n  \n  /**\n   * スロット一覧を作成\n   */\n  private createSlotList(): void {\n    const startY = 60\n    const slotHeight = 80\n    const slotSpacing = 10\n    \n    this.slots.forEach((slot, index) => {\n      const y = startY + index * (slotHeight + slotSpacing)\n      const slotElement = this.createSlotElement(slot, 0, y, this.config.width - 40, slotHeight)\n      \n      this.contentContainer.add(slotElement)\n      this.slotElements.set(slot.id, slotElement)\n    })\n  }\n  \n  /**\n   * 個別スロット要素を作成\n   */\n  private createSlotElement(\n    slot: SaveSlot, \n    x: number, y: number, width: number, height: number\n  ): Phaser.GameObjects.Container {\n    const container = this.scene.add.container(x, y)\n    \n    // 背景\n    const bgColor = slot.isEmpty ? 0x2a2a2a : 0x3a3a3a\n    const background = this.scene.add.rectangle(0, 0, width, height, bgColor)\n    container.add(background)\n    \n    if (slot.isEmpty) {\n      // 空のスロット\n      const emptyText = this.scene.add.text(0, 0, `空のスロット ${slot.id}`, {\n        fontSize: '16px',\n        color: '#888888',\n        fontFamily: 'Arial'\n      }).setOrigin(0.5, 0.5)\n      \n      container.add(emptyText)\n      \n      if (this.currentTab === 'save' && this.currentGame) {\n        this.makeSlotInteractive(container, slot, 'save')\n      }\n    } else {\n      // データがあるスロット\n      const nameText = this.scene.add.text(-width/2 + 10, -height/2 + 10, slot.name, {\n        fontSize: '16px',\n        color: '#ffffff',\n        fontFamily: 'Arial'\n      })\n      \n      const infoText = this.scene.add.text(\n        -width/2 + 10, -height/2 + 35,\n        `${slot.stage} - ターン${slot.turn} | 活力: ${slot.vitality}`,\n        {\n          fontSize: '12px',\n          color: '#cccccc',\n          fontFamily: 'Arial'\n        }\n      )\n      \n      const timeText = this.scene.add.text(\n        -width/2 + 10, -height/2 + 55,\n        `最終セーブ: ${slot.lastSaved.toLocaleString()} | プレイ時間: ${SaveLoadUtils.formatPlaytime(slot.playtime)}`,\n        {\n          fontSize: '10px',\n          color: '#aaaaaa',\n          fontFamily: 'Arial'\n        }\n      )\n      \n      container.add([nameText, infoText, timeText])\n      \n      // 削除ボタン\n      const deleteButton = this.scene.add.text(\n        width/2 - 20, -height/2 + 10,\n        '🗑️',\n        {\n          fontSize: '16px'\n        }\n      ).setInteractive({ useHandCursor: true })\n      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {\n        pointer.event.stopPropagation()\n        this.deleteSlot(slot)\n      })\n      \n      container.add(deleteButton)\n      \n      // スロットをクリック可能にする\n      const actionType = this.currentTab === 'save' ? 'save' : 'load'\n      this.makeSlotInteractive(container, slot, actionType)\n    }\n    \n    return container\n  }\n  \n  /**\n   * スロットをインタラクティブにする\n   */\n  private makeSlotInteractive(\n    container: Phaser.GameObjects.Container,\n    slot: SaveSlot,\n    action: 'save' | 'load'\n  ): void {\n    const bounds = container.getBounds()\n    \n    container.setInteractive(\n      new Phaser.Geom.Rectangle(\n        -bounds.width/2, -bounds.height/2, \n        bounds.width, bounds.height\n      ),\n      Phaser.Geom.Rectangle.Contains,\n      true\n    )\n    .on('pointerdown', () => {\n      if (action === 'save') {\n        this.saveToSlot(slot)\n      } else {\n        this.loadFromSlot(slot)\n      }\n    })\n    .on('pointerover', () => {\n      const background = container.getAt(0) as Phaser.GameObjects.Rectangle\n      background.setFillStyle(0x4a4a4a)\n    })\n    .on('pointerout', () => {\n      const background = container.getAt(0) as Phaser.GameObjects.Rectangle\n      const bgColor = slot.isEmpty ? 0x2a2a2a : 0x3a3a3a\n      background.setFillStyle(bgColor)\n    })\n  }\n  \n  /**\n   * アクションボタンを作成\n   */\n  private createActionButtons(): void {\n    const buttonY = this.config.height / 2 - 60\n    \n    // エクスポートボタン\n    const exportButton = this.createButton(\n      -100, buttonY, 180, 35,\n      'データをエクスポート',\n      () => this.exportData()\n    )\n    \n    // インポートボタン\n    const importButton = this.createButton(\n      100, buttonY, 180, 35,\n      'データをインポート',\n      () => this.importData()\n    )\n    \n    this.contentContainer.add([exportButton, importButton])\n  }\n  \n  /**\n   * ボタンを作成\n   */\n  private createButton(\n    x: number, y: number, width: number, height: number,\n    text: string, callback: () => void\n  ): Phaser.GameObjects.Container {\n    const container = this.scene.add.container(x, y)\n    \n    const background = this.scene.add.rectangle(0, 0, width, height, 0x4c6ef5)\n    const buttonText = this.scene.add.text(0, 0, text, {\n      fontSize: '14px',\n      color: '#ffffff',\n      fontFamily: 'Arial'\n    }).setOrigin(0.5, 0.5)\n    \n    container.add([background, buttonText])\n    container.setInteractive(\n      new Phaser.Geom.Rectangle(-width/2, -height/2, width, height),\n      Phaser.Geom.Rectangle.Contains\n    )\n    .on('pointerdown', callback)\n    .on('pointerover', () => background.setFillStyle(0x5c7cff))\n    .on('pointerout', () => background.setFillStyle(0x4c6ef5))\n    \n    return container\n  }\n  \n  /**\n   * スロットにセーブ\n   */\n  private async saveToSlot(slot: SaveSlot): Promise<void> {\n    if (!this.currentGame) {\n      this.showMessage('セーブするゲームがありません', 'error')\n      return\n    }\n    \n    try {\n      const slotName = SaveLoadUtils.generateSlotName(this.currentGame.getSnapshot())\n      \n      const result = await this.saveLoadService.saveGame(\n        this.currentGame,\n        slot.id,\n        {\n          slotName,\n          overwrite: true\n        }\n      )\n      \n      if (result.success) {\n        this.showMessage(result.message, 'success')\n        this.refreshSlots()\n      } else {\n        this.showMessage(result.message, 'error')\n      }\n    } catch (error) {\n      this.showMessage(`セーブエラー: ${error}`, 'error')\n    }\n  }\n  \n  /**\n   * スロットからロード\n   */\n  private async loadFromSlot(slot: SaveSlot): Promise<void> {\n    if (slot.isEmpty) {\n      this.showMessage('空のスロットです', 'error')\n      return\n    }\n    \n    try {\n      const result = await this.saveLoadService.loadGame(slot.id, {\n        validateData: true\n      })\n      \n      if (result.success && result.data) {\n        this.showMessage(result.message, 'success')\n        \n        // ゲームロードイベントを発行\n        this.scene.events.emit('gameLoaded', result.data)\n        this.close()\n      } else {\n        this.showMessage(result.message, 'error')\n      }\n    } catch (error) {\n      this.showMessage(`ロードエラー: ${error}`, 'error')\n    }\n  }\n  \n  /**\n   * スロットを削除\n   */\n  private deleteSlot(slot: SaveSlot): void {\n    const result = this.saveLoadService.deleteSave(slot.id)\n    \n    if (result.success) {\n      this.showMessage(result.message, 'success')\n      this.refreshSlots()\n    } else {\n      this.showMessage(result.message, 'error')\n    }\n  }\n  \n  /**\n   * データをエクスポート\n   */\n  private exportData(): void {\n    const result = this.saveLoadService.exportSaveData()\n    \n    if (result.success && result.data) {\n      // ブラウザでファイルダウンロードを実行\n      const blob = new Blob([result.data], { type: 'application/json' })\n      const url = URL.createObjectURL(blob)\n      const a = document.createElement('a')\n      a.href = url\n      a.download = `game_save_export_${new Date().toISOString().slice(0, 10)}.json`\n      document.body.appendChild(a)\n      a.click()\n      document.body.removeChild(a)\n      URL.revokeObjectURL(url)\n      \n      this.showMessage('データをエクスポートしました', 'success')\n    } else {\n      this.showMessage(result.message, 'error')\n    }\n  }\n  \n  /**\n   * データをインポート\n   */\n  private importData(): void {\n    const input = document.createElement('input')\n    input.type = 'file'\n    input.accept = '.json'\n    \n    input.onchange = async (event) => {\n      const file = (event.target as HTMLInputElement).files?.[0]\n      if (!file) return\n      \n      try {\n        const text = await file.text()\n        \n        if (!SaveLoadUtils.isValidSaveDataString(text)) {\n          this.showMessage('無効なセーブデータファイルです', 'error')\n          return\n        }\n        \n        const result = await this.saveLoadService.importSaveData(text)\n        \n        if (result.success) {\n          this.showMessage(result.message, 'success')\n          this.refreshSlots()\n        } else {\n          this.showMessage(result.message, 'error')\n        }\n      } catch (error) {\n        this.showMessage(`インポートエラー: ${error}`, 'error')\n      }\n    }\n    \n    input.click()\n  }\n  \n  /**\n   * メッセージを表示\n   */\n  private showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {\n    const color = type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'\n    \n    const messageText = this.scene.add.text(\n      0, this.config.height / 2 - 20,\n      message,\n      {\n        fontSize: '14px',\n        color,\n        fontFamily: 'Arial',\n        backgroundColor: '#000000',\n        padding: { x: 10, y: 5 }\n      }\n    ).setOrigin(0.5, 1)\n    \n    this.add(messageText)\n    \n    // 3秒後にメッセージを削除\n    this.scene.time.delayedCall(3000, () => {\n      messageText.destroy()\n    })\n  }\n  \n  /**\n   * 現在のゲームを設定\n   */\n  setCurrentGame(game: Game): void {\n    this.currentGame = game\n    this.refreshContent()\n  }\n  \n  /**\n   * メニューを閉じる\n   */\n  close(): void {\n    this.scene.events.emit('saveLoadMenuClosed')\n    this.destroy()\n  }\n  \n  /**\n   * メニューを表示\n   */\n  show(): void {\n    this.setVisible(true)\n    this.refreshSlots()\n  }\n  \n  /**\n   * メニューを非表示\n   */\n  hide(): void {\n    this.setVisible(false)\n  }\n}