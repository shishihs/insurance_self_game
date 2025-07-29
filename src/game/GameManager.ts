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
      return
    }

    try {
      
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
      
    } catch (error) {
      console.error('❌ GameManager: ゲーム初期化エラー:', error)
      throw error
    }
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
      if (import.meta.env.DEV) console.error('Game is not initialized')
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

  /**
   * キャッシュをクリア（メモリ最適化）
   */
  clearCache(): void {
    if (!this.game) return
    
    // テクスチャキャッシュをクリア（使用中のものは除く）
    const textureManager = this.game.textures
    const keysToRemove: string[] = []
    
    textureManager.list.forEach((texture, key) => {
      // システムテクスチャ以外を削除対象に
      if (key !== '__DEFAULT' && key !== '__MISSING' && key !== '__WHITE') {
        keysToRemove.push(key)
      }
    })
    
    // 使用されていないテクスチャを削除
    keysToRemove.forEach(key => {
      try {
        textureManager.remove(key)
      } catch (e) {
        // 使用中のテクスチャは削除できない
      }
    })
    
    // サウンドキャッシュをクリア
    if (this.game.sound) {
      this.game.sound.removeAll()
    }
    
    // ガベージコレクションをトリガー（可能な場合）
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc()
    }
  }
}