import Phaser from 'phaser'
import { gameConfig } from './config/gameConfig'
import { PreloadScene } from './scenes/PreloadScene'
import { MainMenuScene } from './scenes/MainMenuScene'
import { GameScene } from './scenes/GameScene'

/**
 * Phaserゲームを管理するクラス
 */
export class GameManager {
  private game: Phaser.Game | null = null
  private static instance: GameManager | null = null

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager()
    }
    return GameManager.instance
  }

  /**
   * ゲームを初期化
   */
  initialize(parent: string | HTMLElement): void {
    if (this.game) {
      console.warn('Game is already initialized')
      return
    }

    // 設定をコピー（元の設定を変更しないため）
    const config = { ...gameConfig }
    config.parent = parent
    
    // シーンを追加
    config.scene = [
      PreloadScene,
      MainMenuScene,
      GameScene
    ]

    // ゲームインスタンスを作成
    this.game = new Phaser.Game(config)
  }

  /**
   * ゲームを破棄
   */
  destroy(): void {
    if (this.game) {
      this.game.destroy(true, false)
      this.game = null
    }
  }

  /**
   * ゲームが初期化されているか
   */
  isInitialized(): boolean {
    return this.game !== null
  }

  /**
   * 現在のシーンを取得
   */
  getCurrentScene(): string | null {
    if (!this.game) return null
    
    const scenes = this.game.scene.getScenes(true)
    return scenes.length > 0 ? scenes[0].scene.key : null
  }

  /**
   * シーンを切り替え
   */
  switchScene(sceneKey: string, data?: object): void {
    if (!this.game) {
      console.error('Game is not initialized')
      return
    }

    const currentScene = this.game.scene.getScenes(true)[0]
    if (currentScene) {
      currentScene.scene.start(sceneKey, data)
    }
  }

  /**
   * ゲームをリセット
   */
  reset(): void {
    if (!this.game) return
    
    // すべてのシーンを停止
    this.game.scene.getScenes(true).forEach(scene => {
      scene.scene.stop()
    })
    
    // プリロードシーンから再開
    this.game.scene.start('PreloadScene')
  }
}