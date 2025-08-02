/** BGMトラック定義の型 */
interface TrackDefinition {
  name: string
  tempo: number
  key: string
  layers: string[]
}

/**
 * バックグラウンドミュージックマネージャー
 * Web Audio APIを使用したダイナミックBGMシステム
 * 
 * 特徴:
 * - ゲーム進行に合わせた動的なBGM切り替え
 * - フェードイン・フェードアウト効果
 * - レイヤー構造による複雑な音楽構成
 * - ループ再生とシームレスな遷移
 */
export class BackgroundMusicManager {
  private readonly audioContext: AudioContext
  private readonly masterGain: GainNode
  private readonly tracks: Map<string, BGMTrack> = new Map()
  private currentTrack: string | null = null
  private volume: number = 0.3
  private enabled: boolean = true
  
  /** BGMトラック定義 */
  private readonly trackDefinitions: Record<string, TrackDefinition> = {
    // メニュー画面用BGM
    menu: {
      name: 'menu',
      tempo: 80,
      key: 'C',
      layers: ['ambient', 'melody']
    },
    // ゲームプレイ用BGM（通常）
    gameplay_normal: {
      name: 'gameplay_normal',
      tempo: 120,
      key: 'G',
      layers: ['drums', 'bass', 'melody']
    },
    // ゲームプレイ用BGM（緊張）
    gameplay_tension: {
      name: 'gameplay_tension',
      tempo: 140,
      key: 'Am',
      layers: ['drums', 'bass', 'melody', 'strings']
    },
    // チャレンジ時BGM
    challenge: {
      name: 'challenge',
      tempo: 160,
      key: 'Em',
      layers: ['drums', 'bass', 'melody', 'synth']
    },
    // 勝利時BGM
    victory: {
      name: 'victory',
      tempo: 130,
      key: 'C',
      layers: ['full_orchestra']
    },
    // ゲームオーバー時BGM
    gameover: {
      name: 'gameover',
      tempo: 60,
      key: 'Dm',
      layers: ['strings', 'piano']
    }
  }
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.masterGain = this.audioContext.createGain()
    this.masterGain.connect(this.audioContext.destination)
    this.masterGain.gain.value = this.volume
    
    // 設定を読み込み
    this.loadSettings()
    
    // 各トラックを初期化
    this.initializeTracks()
  }
  
  /**
   * トラックの初期化
   */
  private initializeTracks(): void {
    Object.entries(this.trackDefinitions).forEach(([key, definition]) => {
      const track = new BGMTrack(this.audioContext, definition)
      track.connect(this.masterGain)
      this.tracks.set(key, track)
    })
  }
  
  /**
   * BGMを再生
   */
  async play(trackName: string, fadeInTime: number = 1.0): Promise<void> {
    if (!this.enabled) return
    
    // AudioContextのリジューム
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
    
    // 現在のトラックをフェードアウト
    if (this.currentTrack) {
      const currentTrack = this.tracks.get(this.currentTrack)
      if (currentTrack) {
        await currentTrack.fadeOut(fadeInTime * 0.5)
        currentTrack.stop()
      }
    }
    
    // 新しいトラックを再生
    const newTrack = this.tracks.get(trackName)
    if (newTrack) {
      newTrack.play()
      await newTrack.fadeIn(fadeInTime)
      this.currentTrack = trackName
    }
  }
  
  /**
   * BGMを停止
   */
  async stop(fadeOutTime: number = 1.0): Promise<void> {
    if (this.currentTrack) {
      const track = this.tracks.get(this.currentTrack)
      if (track) {
        await track.fadeOut(fadeOutTime)
        track.stop()
      }
      this.currentTrack = null
    }
  }
  
  /**
   * 特定のレイヤーの有効/無効を切り替え
   */
  setLayerEnabled(trackName: string, layerName: string, enabled: boolean): void {
    const track = this.tracks.get(trackName)
    if (track) {
      track.setLayerEnabled(layerName, enabled)
    }
  }
  
  /**
   * 音量設定
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime)
    this.saveSettings()
  }
  
  /**
   * BGMの有効/無効切り替え
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.stop(0.5)
    }
    this.saveSettings()
  }
  
  /**
   * 設定の保存
   */
  private saveSettings(): void {
    localStorage.setItem('bgm_volume', this.volume.toString())
    localStorage.setItem('bgm_enabled', this.enabled.toString())
  }
  
  /**
   * 設定の読み込み
   */
  private loadSettings(): void {
    const savedVolume = localStorage.getItem('bgm_volume')
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume)
      this.masterGain.gain.value = this.volume
    }
    
    const savedEnabled = localStorage.getItem('bgm_enabled')
    if (savedEnabled !== null) {
      this.enabled = savedEnabled === 'true'
    }
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    this.stop(0)
    this.tracks.forEach(track => { track.destroy(); })
    this.tracks.clear()
    
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }
  }
}

/**
 * BGMトラッククラス
 * 複数のレイヤーで構成される音楽トラック
 */
class BGMTrack {
  private readonly audioContext: AudioContext
  private readonly outputGain: GainNode
  private readonly layers: Map<string, BGMLayer> = new Map()
  private isPlaying: boolean = false
  private readonly definition: TrackDefinition
  
  constructor(audioContext: AudioContext, definition: TrackDefinition) {
    this.audioContext = audioContext
    this.definition = definition
    this.outputGain = this.audioContext.createGain()
    
    // レイヤーを作成
    this.createLayers()
  }
  
  /**
   * レイヤーの作成
   */
  private createLayers(): void {
    this.definition.layers.forEach((layerName: string) => {
      const layer = new BGMLayer(this.audioContext, layerName, this.definition)
      layer.connect(this.outputGain)
      this.layers.set(layerName, layer)
    })
  }
  
  /**
   * 出力ノードに接続
   */
  connect(destination: AudioNode): void {
    this.outputGain.connect(destination)
  }
  
  /**
   * 再生開始
   */
  play(): void {
    if (!this.isPlaying) {
      const startTime = this.audioContext.currentTime
      this.layers.forEach(layer => { layer.play(startTime); })
      this.isPlaying = true
    }
  }
  
  /**
   * 停止
   */
  stop(): void {
    if (this.isPlaying) {
      this.layers.forEach(layer => { layer.stop(); })
      this.isPlaying = false
    }
  }
  
  /**
   * フェードイン
   */
  async fadeIn(duration: number): Promise<void> {
    const currentTime = this.audioContext.currentTime
    this.outputGain.gain.setValueAtTime(0, currentTime)
    this.outputGain.gain.linearRampToValueAtTime(1, currentTime + duration)
    
    return new Promise(resolve => {
      setTimeout(() => { resolve(); }, duration * 1000)
    })
  }
  
  /**
   * フェードアウト
   */
  async fadeOut(duration: number): Promise<void> {
    const currentTime = this.audioContext.currentTime
    this.outputGain.gain.setValueAtTime(this.outputGain.gain.value, currentTime)
    this.outputGain.gain.linearRampToValueAtTime(0, currentTime + duration)
    
    return new Promise(resolve => {
      setTimeout(() => { resolve(); }, duration * 1000)
    })
  }
  
  /**
   * レイヤーの有効/無効切り替え
   */
  setLayerEnabled(layerName: string, enabled: boolean): void {
    const layer = this.layers.get(layerName)
    if (layer) {
      layer.setEnabled(enabled)
    }
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    this.stop()
    this.layers.forEach(layer => { layer.destroy(); })
    this.layers.clear()
  }
}

/**
 * BGMレイヤークラス
 * 個別の楽器や音響要素を表現
 */
class BGMLayer {
  private readonly audioContext: AudioContext
  private readonly gainNode: GainNode
  private sources: OscillatorNode[] = []
  private readonly layerName: string
  private readonly definition: TrackDefinition
  private enabled: boolean = true
  
  constructor(audioContext: AudioContext, layerName: string, definition: TrackDefinition) {
    this.audioContext = audioContext
    this.layerName = layerName
    this.definition = definition
    this.gainNode = this.audioContext.createGain()
    this.gainNode.gain.value = this.getLayerVolume()
  }
  
  /**
   * レイヤーごとの音量設定
   */
  private getLayerVolume(): number {
    const volumes: Record<string, number> = {
      'ambient': 0.2,
      'melody': 0.4,
      'drums': 0.3,
      'bass': 0.4,
      'strings': 0.3,
      'synth': 0.3,
      'piano': 0.4,
      'full_orchestra': 0.5
    }
    return volumes[this.layerName] || 0.3
  }
  
  /**
   * 出力ノードに接続
   */
  connect(destination: AudioNode): void {
    this.gainNode.connect(destination)
  }
  
  /**
   * 再生開始
   */
  play(startTime: number): void {
    // レイヤーに応じた音源を生成
    this.createSoundForLayer(startTime)
  }
  
  /**
   * レイヤーに応じた音源生成
   */
  private createSoundForLayer(startTime: number): void {
    switch (this.layerName) {
      case 'ambient':
        this.createAmbientSound(startTime)
        break
      case 'melody':
        this.createMelodySound(startTime)
        break
      case 'drums':
        this.createDrumSound(startTime)
        break
      case 'bass':
        this.createBassSound(startTime)
        break
      case 'strings':
        this.createStringsSound(startTime)
        break
      default:
        this.createGenericSound(startTime)
    }
  }
  
  /**
   * アンビエント音の生成
   */
  private createAmbientSound(startTime: number): void {
    // 低周波のパッド音
    const osc1 = this.audioContext.createOscillator()
    const osc2 = this.audioContext.createOscillator()
    const filter = this.audioContext.createBiquadFilter()
    
    osc1.type = 'sine'
    osc2.type = 'sine'
    filter.type = 'lowpass'
    filter.frequency.value = 800
    
    // コード進行（C major）
    const baseFreq = 130.81 // C3
    osc1.frequency.value = baseFreq
    osc2.frequency.value = baseFreq * 1.5 // 5度上
    
    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(this.gainNode)
    
    osc1.start(startTime)
    osc2.start(startTime)
    
    this.sources.push(osc1, osc2)
  }
  
  /**
   * メロディー音の生成
   */
  private createMelodySound(startTime: number): void {
    const tempo = this.definition.tempo
    const beatDuration = 60 / tempo
    
    // 簡単なメロディーパターン
    const notes = [523.25, 587.33, 659.25, 523.25] // C5, D5, E5, C5
    
    notes.forEach((freq, index) => {
      const osc = this.audioContext.createOscillator()
      const envelope = this.audioContext.createGain()
      
      osc.type = 'triangle'
      osc.frequency.value = freq
      
      const noteStart = startTime + index * beatDuration
      envelope.gain.setValueAtTime(0, noteStart)
      envelope.gain.linearRampToValueAtTime(0.3, noteStart + 0.01)
      envelope.gain.setValueAtTime(0.3, noteStart + beatDuration * 0.8)
      envelope.gain.linearRampToValueAtTime(0, noteStart + beatDuration)
      
      osc.connect(envelope)
      envelope.connect(this.gainNode)
      
      osc.start(noteStart)
      osc.stop(noteStart + beatDuration)
      
      this.sources.push(osc)
    })
  }
  
  /**
   * ドラム音の生成
   */
  private createDrumSound(startTime: number): void {
    const tempo = this.definition.tempo
    const beatDuration = 60 / tempo
    
    // キックドラムパターン
    for (let i = 0; i < 4; i++) {
      const kickTime = startTime + i * beatDuration
      this.createKick(kickTime)
      
      // ハイハット
      if (i % 2 === 1) {
        this.createHihat(kickTime + beatDuration * 0.5)
      }
    }
  }
  
  /**
   * キックドラムの生成
   */
  private createKick(time: number): void {
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.frequency.setValueAtTime(150, time)
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5)
    
    gain.gain.setValueAtTime(0.7, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5)
    
    osc.connect(gain)
    gain.connect(this.gainNode)
    
    osc.start(time)
    osc.stop(time + 0.5)
    
    this.sources.push(osc)
  }
  
  /**
   * ハイハットの生成
   */
  private createHihat(time: number): void {
    const bufferSize = 0.05 * this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    // ホワイトノイズ生成
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    
    const noise = this.audioContext.createBufferSource()
    const filter = this.audioContext.createBiquadFilter()
    const gain = this.audioContext.createGain()
    
    noise.buffer = buffer
    filter.type = 'highpass'
    filter.frequency.value = 8000
    
    gain.gain.setValueAtTime(0.3, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05)
    
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.gainNode)
    
    noise.start(time)
    noise.stop(time + 0.05)
  }
  
  /**
   * ベース音の生成
   */
  private createBassSound(startTime: number): void {
    const tempo = this.definition.tempo
    const beatDuration = 60 / tempo
    
    // ベースライン
    const bassNotes = [65.41, 82.41, 98.00, 65.41] // C2, E2, G2, C2
    
    bassNotes.forEach((freq, index) => {
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      
      const noteStart = startTime + index * beatDuration
      gain.gain.setValueAtTime(0.4, noteStart)
      gain.gain.setValueAtTime(0.4, noteStart + beatDuration * 0.8)
      gain.gain.exponentialRampToValueAtTime(0.01, noteStart + beatDuration)
      
      osc.connect(gain)
      gain.connect(this.gainNode)
      
      osc.start(noteStart)
      osc.stop(noteStart + beatDuration)
      
      this.sources.push(osc)
    })
  }
  
  /**
   * ストリングス音の生成
   */
  private createStringsSound(startTime: number): void {
    // 複数のオシレーターでストリングスを模倣
    const frequencies = [261.63, 329.63, 392.00] // C4, E4, G4
    
    frequencies.forEach(freq => {
      for (let i = 0; i < 3; i++) {
        const osc = this.audioContext.createOscillator()
        const gain = this.audioContext.createGain()
        
        osc.type = 'sawtooth'
        osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.01) // 微妙なデチューン
        
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.1, startTime + 2)
        
        osc.connect(gain)
        gain.connect(this.gainNode)
        
        osc.start(startTime)
        
        this.sources.push(osc)
      }
    })
  }
  
  /**
   * 汎用音源の生成
   */
  private createGenericSound(startTime: number): void {
    const osc = this.audioContext.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 440
    osc.connect(this.gainNode)
    osc.start(startTime)
    this.sources.push(osc)
  }
  
  /**
   * 停止
   */
  stop(): void {
    this.sources.forEach(source => {
      try {
        source.stop()
      } catch {
        // 既に停止している場合は無視
      }
    })
    this.sources = []
  }
  
  /**
   * 有効/無効の切り替え
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    const targetGain = enabled ? this.getLayerVolume() : 0
    this.gainNode.gain.linearRampToValueAtTime(
      targetGain,
      this.audioContext.currentTime + 0.5
    )
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    this.stop()
  }
}