import { WebAudioSoundGenerator } from './WebAudioSoundGenerator'

/**
 * サウンドマネージャー
 * ゲーム内のすべてのサウンドエフェクトを管理
 */
export class SoundManager {
  private scene: Phaser.Scene
  private enabled: boolean = true
  private volume: number = 0.5
  private sounds: Map<string, Phaser.Sound.BaseSound> = new Map()
  private webAudioGenerator: WebAudioSoundGenerator
  
  // サウンドエフェクトの定義
  private readonly soundEffects = {
    // カード操作
    cardDraw: { key: 'cardDraw', volume: 0.4 },
    cardSelect: { key: 'cardSelect', volume: 0.3 },
    cardDeselect: { key: 'cardDeselect', volume: 0.3 },
    cardPlay: { key: 'cardPlay', volume: 0.5 },
    cardShuffle: { key: 'cardShuffle', volume: 0.4 },
    
    // チャレンジ
    challengeStart: { key: 'challengeStart', volume: 0.5 },
    challengeSuccess: { key: 'challengeSuccess', volume: 0.6 },
    challengeFail: { key: 'challengeFail', volume: 0.5 },
    
    // ステージ
    stageComplete: { key: 'stageComplete', volume: 0.7 },
    gameOver: { key: 'gameOver', volume: 0.6 },
    gameVictory: { key: 'gameVictory', volume: 0.8 },
    
    // UI操作
    buttonClick: { key: 'buttonClick', volume: 0.3 },
    buttonHover: { key: 'buttonHover', volume: 0.2 },
    dialogOpen: { key: 'dialogOpen', volume: 0.4 },
    dialogClose: { key: 'dialogClose', volume: 0.4 },
    
    // 保険
    insuranceGet: { key: 'insuranceGet', volume: 0.5 },
    insuranceExpire: { key: 'insuranceExpire', volume: 0.4 },
    insuranceRenew: { key: 'insuranceRenew', volume: 0.4 },
    
    // 活力
    vitalityGain: { key: 'vitalityGain', volume: 0.4 },
    vitalityLoss: { key: 'vitalityLoss', volume: 0.5 },
    vitalityWarning: { key: 'vitalityWarning', volume: 0.6 },
    
    // 通知
    notification: { key: 'notification', volume: 0.4 },
    warning: { key: 'warning', volume: 0.5 },
    error: { key: 'error', volume: 0.5 }
  } as const
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.webAudioGenerator = new WebAudioSoundGenerator()
    this.loadSounds()
    this.setupVolumeControl()
    
    // ユーザーインタラクション後にオーディオコンテキストを開始
    this.scene.input.once('pointerdown', () => {
      this.webAudioGenerator.resume()
    })
  }
  
  /**
   * サウンドのプリロード
   */
  private loadSounds(): void {
    // 実際のサウンドファイルは後でアセットとして追加
    // ここでは仮の実装として、Web Audio APIで簡単なサウンドを生成
    this.generateSyntheticSounds()
  }
  
  /**
   * 合成音の生成（仮実装）
   */
  private generateSyntheticSounds(): void {
    // Phaser 3のWeb Audio APIを使用した簡単なサウンド生成
    // 実際のサウンドファイルが用意されるまでの仮実装
    
    // カードドロー音（高音のピッという音）
    this.createSyntheticSound('cardDraw', 800, 0.05)
    
    // カード選択音（中音のクリック音）
    this.createSyntheticSound('cardSelect', 600, 0.03)
    this.createSyntheticSound('cardDeselect', 500, 0.03)
    
    // カードプレイ音（低音のドスンという音）
    this.createSyntheticSound('cardPlay', 300, 0.1)
    
    // チャレンジ成功音（上昇音）
    this.createSyntheticSound('challengeSuccess', 400, 0.2, 'up')
    
    // チャレンジ失敗音（下降音）
    this.createSyntheticSound('challengeFail', 400, 0.2, 'down')
    
    // ボタンクリック音
    this.createSyntheticSound('buttonClick', 700, 0.02)
    this.createSyntheticSound('buttonHover', 900, 0.01)
    
    // 通知音
    this.createSyntheticSound('notification', 660, 0.1)
    this.createSyntheticSound('warning', 440, 0.15)
  }
  
  /**
   * 合成音を作成
   */
  private createSyntheticSound(
    key: string, 
    frequency: number, 
    duration: number, 
    _type: 'normal' | 'up' | 'down' = 'normal'
  ): void {
    // Web Audio Context を使用した簡単な音生成
    const audioContext = this.scene.sound.context as AudioContext
    if (!audioContext) return
    
    // この実装は仮のものです
    // 実際のゲームでは、proper な音声ファイルを使用してください
  }
  
  /**
   * サウンドエフェクトを再生
   */
  play(soundKey: keyof typeof this.soundEffects): void {
    if (!this.enabled) return
    
    const soundConfig = this.soundEffects[soundKey]
    if (!soundConfig) return
    
    // Web Audio APIで音を再生
    try {
      switch (soundKey) {
        case 'buttonClick':
          this.webAudioGenerator.playButtonClick()
          break
        case 'buttonHover':
          this.webAudioGenerator.playButtonHover()
          break
        case 'cardDraw':
          this.webAudioGenerator.playCardDraw()
          break
        case 'cardSelect':
        case 'cardDeselect':
          this.webAudioGenerator.playCardSelect()
          break
        case 'challengeSuccess':
          this.webAudioGenerator.playChallengeSuccess()
          break
        case 'challengeFail':
          this.webAudioGenerator.playChallengeFail()
          break
        case 'vitalityGain':
          this.webAudioGenerator.playVitalityGain()
          break
        case 'vitalityLoss':
          this.webAudioGenerator.playVitalityLoss()
          break
        case 'warning':
        case 'vitalityWarning':
          this.webAudioGenerator.playWarning()
          break
        case 'notification':
        case 'insuranceGet':
        case 'insuranceRenew':
          this.webAudioGenerator.playNotification()
          break
        case 'gameOver':
          this.webAudioGenerator.playGameOver()
          break
        case 'gameVictory':
          this.webAudioGenerator.playVictory()
          break
        default:
          // その他の音は通知音で代用
          this.webAudioGenerator.playNotification()
      }
    } catch (error) {
      console.warn('Sound playback error:', error)
    }
  }
  
  /**
   * 複数のサウンドを連続再生
   */
  playSequence(soundKeys: (keyof typeof this.soundEffects)[], delay: number = 100): void {
    soundKeys.forEach((key, index) => {
      this.scene.time.delayedCall(index * delay, () => {
        this.play(key)
      })
    })
  }
  
  /**
   * ランダムなバリエーションで再生
   */
  playWithVariation(soundKey: keyof typeof this.soundEffects, _variations: number = 3): void {
    // バリエーション番号を追加（例: cardDraw1, cardDraw2, cardDraw3）
    // const variation = Phaser.Math.Between(1, variations)
    this.play(soundKey)
  }
  
  /**
   * 音量設定
   */
  setVolume(volume: number): void {
    this.volume = Phaser.Math.Clamp(volume, 0, 1)
    this.updateAllSoundVolumes()
  }
  
  /**
   * 音量を取得
   */
  getVolume(): number {
    return this.volume
  }
  
  /**
   * サウンドの有効/無効を切り替え
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.stopAll()
    }
  }
  
  /**
   * サウンドが有効かどうか
   */
  isEnabled(): boolean {
    return this.enabled
  }
  
  /**
   * すべてのサウンドを停止
   */
  stopAll(): void {
    this.sounds.forEach(sound => {
      if (sound.isPlaying) {
        sound.stop()
      }
    })
  }
  
  /**
   * 音量コントロールのセットアップ
   */
  private setupVolumeControl(): void {
    // ローカルストレージから音量設定を読み込み
    const savedVolume = localStorage.getItem('gameVolume')
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume)
    }
    
    const savedEnabled = localStorage.getItem('soundEnabled')
    if (savedEnabled !== null) {
      this.enabled = savedEnabled === 'true'
    }
  }
  
  /**
   * 音量設定を保存
   */
  saveSettings(): void {
    localStorage.setItem('gameVolume', this.volume.toString())
    localStorage.setItem('soundEnabled', this.enabled.toString())
  }
  
  /**
   * すべてのサウンドの音量を更新
   */
  private updateAllSoundVolumes(): void {
    this.sounds.forEach(sound => {
      sound.volume = this.volume
    })
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    this.stopAll()
    this.sounds.clear()
    this.webAudioGenerator.destroy()
  }
}