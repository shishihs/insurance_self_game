import { SoundManager } from './SoundManager'
import { BackgroundMusicManager } from './BackgroundMusicManager'

/**
 * 統合サウンドマネージャー
 * 効果音とBGMを統一的に管理するクラス
 * 
 * 主な機能:
 * - 効果音とBGMの統合管理
 * - マスターボリューム制御
 * - 3Dサウンド対応（将来的な拡張）
 * - 音響設定の永続化
 * - パフォーマンス最適化
 */
export class IntegratedSoundManager {
  private readonly scene: Phaser.Scene
  private readonly soundManager: SoundManager
  private readonly bgmManager: BackgroundMusicManager
  private masterVolume: number = 0.7
  private sfxVolume: number = 0.5
  private bgmVolume: number = 0.3
  private currentGameState: GameSoundState = 'menu'
  
  /** ゲーム状態とBGMのマッピング */
  private readonly stateToTrackMap = {
    menu: 'menu',
    gameplay_normal: 'gameplay_normal',
    gameplay_tension: 'gameplay_tension',
    challenge: 'challenge',
    victory: 'victory',
    gameover: 'gameover'
  } as const
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.soundManager = new SoundManager(scene)
    this.bgmManager = new BackgroundMusicManager()
    
    // 設定を読み込み
    this.loadSettings()
    
    // 初期音量を設定
    this.updateVolumes()
    
    // キーボードショートカットを設定
    this.setupKeyboardShortcuts()
  }
  
  /**
   * 効果音を再生
   */
  playSFX(soundKey: Parameters<typeof this.soundManager.play>[0]): void {
    this.soundManager.play(soundKey)
  }
  
  /**
   * 効果音のシーケンスを再生
   */
  playSFXSequence(soundKeys: Parameters<typeof this.soundManager.playSequence>[0], delay?: number): void {
    this.soundManager.playSequence(soundKeys, delay)
  }
  
  /**
   * BGMを切り替え
   */
  async switchBGM(state: GameSoundState, fadeTime: number = 1.0): Promise<void> {
    this.currentGameState = state
    const trackName = this.stateToTrackMap[state]
    if (trackName) {
      await this.bgmManager.play(trackName, fadeTime)
    }
  }
  
  /**
   * BGMを停止
   */
  async stopBGM(fadeTime: number = 1.0): Promise<void> {
    await this.bgmManager.stop(fadeTime)
  }
  
  /**
   * BGMレイヤーの有効/無効切り替え
   */
  setBGMLayerEnabled(layerName: string, enabled: boolean): void {
    const trackName = this.stateToTrackMap[this.currentGameState]
    if (trackName) {
      this.bgmManager.setLayerEnabled(trackName, layerName, enabled)
    }
  }
  
  /**
   * マスターボリュームを設定
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    this.updateVolumes()
    this.saveSettings()
  }
  
  /**
   * 効果音ボリュームを設定
   */
  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume))
    this.updateVolumes()
    this.saveSettings()
  }
  
  /**
   * BGMボリュームを設定
   */
  setBGMVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume))
    this.updateVolumes()
    this.saveSettings()
  }
  
  /**
   * 音量を更新
   */
  private updateVolumes(): void {
    // 効果音の音量を更新
    const effectiveSFXVolume = this.masterVolume * this.sfxVolume
    this.soundManager.setVolume(effectiveSFXVolume)
    
    // BGMの音量を更新
    const effectiveBGMVolume = this.masterVolume * this.bgmVolume
    this.bgmManager.setVolume(effectiveBGMVolume)
  }
  
  /**
   * 全サウンドの有効/無効を切り替え
   */
  setEnabled(enabled: boolean): void {
    this.soundManager.setEnabled(enabled)
    this.bgmManager.setEnabled(enabled)
    this.saveSettings()
  }
  
  /**
   * サウンドが有効かどうか
   */
  isEnabled(): boolean {
    return this.soundManager.isEnabled()
  }
  
  /**
   * ゲーム状態に応じた音響調整
   */
  adaptToGameState(state: GameStateInfo): void {
    // 活力が低い時はBGMのテンポを遅く
    if (state.vitality < 30) {
      this.setBGMLayerEnabled('drums', false)
      this.setBGMLayerEnabled('strings', true)
    } else {
      this.setBGMLayerEnabled('drums', true)
      this.setBGMLayerEnabled('strings', false)
    }
    
    // チャレンジ中は緊張感のあるBGMに
    if (state.inChallenge) {
      this.switchBGM('challenge', 0.5)
    } else if (state.vitality < 20) {
      this.switchBGM('gameplay_tension', 1.0)
    } else {
      this.switchBGM('gameplay_normal', 1.0)
    }
  }
  
  /**
   * キーボードショートカットの設定
   */
  private setupKeyboardShortcuts(): void {
    const input = this.scene.input.keyboard
    
    // Mキー: サウンドのON/OFF切り替え
    input?.on('keydown-M', () => {
      const enabled = !this.isEnabled()
      this.setEnabled(enabled)
      this.playSFX('notification')
    })
    
    // -キー: 音量ダウン
    input?.on('keydown-MINUS', () => {
      this.setMasterVolume(this.masterVolume - 0.1)
      this.playSFX('buttonClick')
    })
    
    // +キー: 音量アップ
    input?.on('keydown-PLUS', () => {
      this.setMasterVolume(this.masterVolume + 0.1)
      this.playSFX('buttonClick')
    })
  }
  
  /**
   * 設定を保存
   */
  private saveSettings(): void {
    const settings = {
      masterVolume: this.masterVolume,
      sfxVolume: this.sfxVolume,
      bgmVolume: this.bgmVolume,
      enabled: this.isEnabled()
    }
    localStorage.setItem('integrated_sound_settings', JSON.stringify(settings))
  }
  
  /**
   * 設定を読み込み
   */
  private loadSettings(): void {
    const savedSettings = localStorage.getItem('integrated_sound_settings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        this.masterVolume = settings.masterVolume ?? 0.7
        this.sfxVolume = settings.sfxVolume ?? 0.5
        this.bgmVolume = settings.bgmVolume ?? 0.3
        
        // 有効/無効状態は個別のマネージャーが管理
      } catch (e) {
        console.warn('Failed to load sound settings:', e)
      }
    }
  }
  
  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): SoundDebugInfo {
    return {
      masterVolume: this.masterVolume,
      sfxVolume: this.sfxVolume,
      bgmVolume: this.bgmVolume,
      effectiveSFXVolume: this.masterVolume * this.sfxVolume,
      effectiveBGMVolume: this.masterVolume * this.bgmVolume,
      enabled: this.isEnabled(),
      currentBGM: this.currentGameState
    }
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    this.soundManager.destroy()
    this.bgmManager.destroy()
  }
}

/** ゲームのサウンド状態 */
type GameSoundState = 'menu' | 'gameplay_normal' | 'gameplay_tension' | 'challenge' | 'victory' | 'gameover'

/** ゲーム状態情報 */
interface GameStateInfo {
  vitality: number
  inChallenge: boolean
  stage: number
  insuranceCount: number
}

/** デバッグ情報 */
interface SoundDebugInfo {
  masterVolume: number
  sfxVolume: number
  bgmVolume: number
  effectiveSFXVolume: number
  effectiveBGMVolume: number
  enabled: boolean
  currentBGM: GameSoundState
}