/**
 * インタラクションオーディオマネージャー
 * マイクロインタラクションと Web Audio API の統合システム
 */

import { WebAudioSoundGenerator } from '../../game/systems/WebAudioSoundGenerator'

export interface AudioFeedbackConfig {
  type: 'hover' | 'click' | 'drag' | 'drop' | 'success' | 'error' | 'notification'
  intensity?: 'subtle' | 'normal' | 'strong'
  spatial?: { x: number; y: number; z?: number }
  delay?: number
  variation?: boolean
}

export interface SpatialAudioConfig {
  x: number
  y: number
  z?: number
  distance?: number
}

export class InteractionAudioManager {
  private readonly audioGenerator: WebAudioSoundGenerator
  private isEnabled: boolean = true
  private masterVolume: number = 0.5
  private spatialEnabled: boolean = true
  private audioQueue: Array<{ config: AudioFeedbackConfig; timestamp: number }> = []
  private readonly isProcessingQueue: boolean = false

  // 音響効果の設定
  private readonly audioMappings = {
    hover: {
      frequency: 880,
      duration: 50,
      volume: 0.1,
      wave: 'sine' as OscillatorType
    },
    click: {
      frequency: 440,
      duration: 80,
      volume: 0.3,
      wave: 'square' as OscillatorType
    },
    drag: {
      frequency: 660,
      duration: 150,
      volume: 0.2,
      wave: 'sawtooth' as OscillatorType
    },
    drop: {
      frequency: 220,
      duration: 200,
      volume: 0.4,
      wave: 'triangle' as OscillatorType
    },
    success: {
      frequency: 523, // C5
      duration: 300,
      volume: 0.5,
      wave: 'sine' as OscillatorType
    },
    error: {
      frequency: 146, // D3
      duration: 400,
      volume: 0.4,
      wave: 'square' as OscillatorType
    },
    notification: {
      frequency: 659, // E5
      duration: 200,
      volume: 0.3,
      wave: 'sine' as OscillatorType
    }
  }

  constructor() {
    this.audioGenerator = new WebAudioSoundGenerator()
    this.loadSettings()
    this.setupEventListeners()
  }

  /**
   * インタラクション音を再生
   */
  async playInteractionSound(config: AudioFeedbackConfig): Promise<void> {
    if (!this.isEnabled) return

    // 遅延設定
    if (config.delay && config.delay > 0) {
      await this.delay(config.delay)
    }

    // 強度による音量調整
    const intensityMultiplier = this.getIntensityMultiplier(config.intensity)
    
    // 空間音響の適用
    const spatialConfig = config.spatial ? this.calculateSpatialAudio(config.spatial) : null

    try {
      switch (config.type) {
        case 'hover':
          await this.playHoverSound(intensityMultiplier, config.variation)
          break
        case 'click':
          await this.playClickSound(intensityMultiplier, spatialConfig)
          break
        case 'drag':
          await this.playDragSound(intensityMultiplier)
          break
        case 'drop':
          await this.playDropSound(intensityMultiplier)
          break
        case 'success':
          await this.playSuccessSound(intensityMultiplier)
          break
        case 'error':
          await this.playErrorSound(intensityMultiplier)
          break
        case 'notification':
          await this.playNotificationSound(intensityMultiplier)
          break
      }
    } catch (error) {
      console.warn('InteractionAudio playback error:', error)
    }
  }

  /**
   * カード操作音の再生
   */
  async playCardInteraction(
    action: 'hover' | 'select' | 'deselect' | 'drag_start' | 'drag_end' | 'drop_success' | 'drop_fail',
    position?: { x: number; y: number }
  ): Promise<void> {
    const actionMappings = {
      hover: { type: 'hover' as const, intensity: 'subtle' as const },
      select: { type: 'click' as const, intensity: 'normal' as const },
      deselect: { type: 'click' as const, intensity: 'subtle' as const },
      drag_start: { type: 'drag' as const, intensity: 'normal' as const },
      drag_end: { type: 'drop' as const, intensity: 'normal' as const },
      drop_success: { type: 'success' as const, intensity: 'strong' as const },
      drop_fail: { type: 'error' as const, intensity: 'normal' as const }
    }

    const mapping = actionMappings[action]
    await this.playInteractionSound({
      ...mapping,
      spatial: position,
      variation: true
    })
  }

  /**
   * ボタン操作音の再生
   */
  async playButtonInteraction(
    action: 'hover' | 'press' | 'release',
    buttonType: 'primary' | 'secondary' | 'danger' = 'primary'
  ): Promise<void> {
    const typeMultipliers = {
      primary: 1.0,
      secondary: 0.8,
      danger: 1.2
    }

    const actionConfigs = {
      hover: { type: 'hover' as const, intensity: 'subtle' as const },
      press: { type: 'click' as const, intensity: 'normal' as const },
      release: { type: 'notification' as const, intensity: 'subtle' as const }
    }

    const config = actionConfigs[action]
    await this.playInteractionSound({
      ...config,
      variation: true
    })
  }

  /**
   * ゲーム状態変化音の再生
   */
  async playGameStateSound(
    state: 'turn_start' | 'vitality_change' | 'stage_progress' | 'achievement',
    data?: any
  ): Promise<void> {
    switch (state) {
      case 'turn_start':
        await this.playSequentialTones([523, 659, 784], 100) // C-E-G chord (major)
        break
      case 'vitality_change':
        if (data?.change > 0) {
          await this.playAscendingTone(440, 660, 200)
        } else {
          await this.playDescendingTone(660, 440, 200)
        }
        break
      case 'stage_progress':
        await this.playProgressSound()
        break
      case 'achievement':
        await this.playAchievementFanfare()
        break
    }
  }

  /**
   * 環境音的なフィードバック
   */
  async playAmbientFeedback(
    type: 'typing' | 'loading' | 'processing' | 'complete',
    duration = 1000
  ): Promise<void> {
    switch (type) {
      case 'typing':
        await this.playTypingSound(duration)
        break
      case 'loading':
        await this.playLoadingSound(duration)
        break
      case 'processing':
        await this.playProcessingSound(duration)
        break
      case 'complete':
        await this.playCompletionSound()
        break
    }
  }

  /**
   * 空間音響の有効/無効
   */
  setSpatialEnabled(enabled: boolean): void {
    this.spatialEnabled = enabled
    this.saveSettings()
  }

  /**
   * マスター音量設定
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
    this.saveSettings()
  }

  /**
   * オーディオの有効/無効
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    this.saveSettings()
  }

  /**
   * 設定取得
   */
  getSettings() {
    return {
      enabled: this.isEnabled,
      volume: this.masterVolume,
      spatialEnabled: this.spatialEnabled
    }
  }

  private async playHoverSound(intensity: number, variation = false): Promise<void> {
    const config = this.audioMappings.hover
    const frequency = variation ? this.addVariation(config.frequency, 0.1) : config.frequency
    
    await this.audioGenerator.createCustomSound({
      frequency,
      duration: config.duration,
      volume: config.volume * intensity * this.masterVolume,
      waveType: config.wave,
      envelope: {
        attack: 0.01,
        decay: 0.05,
        sustain: 0.3,
        release: 0.1
      }
    })
  }

  private async playClickSound(intensity: number, spatial?: SpatialAudioConfig | null): Promise<void> {
    const config = this.audioMappings.click
    let volume = config.volume * intensity * this.masterVolume

    // 空間音響の適用
    if (spatial && this.spatialEnabled) {
      volume *= spatial.distance || 1
    }

    await this.audioGenerator.createCustomSound({
      frequency: config.frequency,
      duration: config.duration,
      volume,
      waveType: config.wave,
      envelope: {
        attack: 0.005,
        decay: 0.02,
        sustain: 0.1,
        release: 0.05
      }
    })
  }

  private async playDragSound(intensity: number): Promise<void> {
    const config = this.audioMappings.drag
    
    await this.audioGenerator.createCustomSound({
      frequency: config.frequency,
      duration: config.duration,
      volume: config.volume * intensity * this.masterVolume,
      waveType: config.wave,
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.8,
        release: 0.3
      }
    })
  }

  private async playDropSound(intensity: number): Promise<void> {
    const config = this.audioMappings.drop
    
    await this.audioGenerator.createCustomSound({
      frequency: config.frequency,
      duration: config.duration,
      volume: config.volume * intensity * this.masterVolume,
      waveType: config.wave,
      envelope: {
        attack: 0.01,
        decay: 0.05,
        sustain: 0.2,
        release: 0.2
      }
    })
  }

  private async playSuccessSound(intensity: number): Promise<void> {
    // Major chord progression (C-E-G)
    await this.playSequentialTones([523, 659, 784], 80, intensity)
  }

  private async playErrorSound(intensity: number): Promise<void> {
    // Dissonant interval
    await this.playSimultaneousTones([146, 156], 400, intensity)
  }

  private async playNotificationSound(intensity: number): Promise<void> {
    const config = this.audioMappings.notification
    
    await this.audioGenerator.createCustomSound({
      frequency: config.frequency,
      duration: config.duration,
      volume: config.volume * intensity * this.masterVolume,
      waveType: config.wave,
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.5,
        release: 0.2
      }
    })
  }

  private async playSequentialTones(frequencies: number[], interval: number, intensity = 1): Promise<void> {
    for (let i = 0; i < frequencies.length; i++) {
      setTimeout(() => {
        this.audioGenerator.createCustomSound({
          frequency: frequencies[i],
          duration: interval * 2,
          volume: 0.3 * intensity * this.masterVolume,
          waveType: 'sine',
          envelope: {
            attack: 0.01,
            decay: 0.05,
            sustain: 0.3,
            release: 0.1
          }
        })
      }, i * interval)
    }
  }

  private async playSimultaneousTones(frequencies: number[], duration: number, intensity = 1): Promise<void> {
    const promises = frequencies.map(freq =>
      this.audioGenerator.createCustomSound({
        frequency: freq,
        duration,
        volume: 0.2 * intensity * this.masterVolume,
        waveType: 'square',
        envelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.4,
          release: 0.2
        }
      })
    )
    
    await Promise.all(promises)
  }

  private async playAscendingTone(startFreq: number, endFreq: number, duration: number): Promise<void> {
    // Frequency sweep implementation would go here
    // For now, play start and end frequencies
    await this.playSequentialTones([startFreq, endFreq], duration / 2)
  }

  private async playDescendingTone(startFreq: number, endFreq: number, duration: number): Promise<void> {
    await this.playSequentialTones([startFreq, endFreq], duration / 2)
  }

  private async playProgressSound(): Promise<void> {
    // Ascending scale
    const scale = [440, 494, 523, 587, 659, 698, 784, 880] // A4 to A5
    await this.playSequentialTones(scale, 50)
  }

  private async playAchievementFanfare(): Promise<void> {
    // Triumphant chord progression
    const chords = [
      [523, 659, 784], // C major
      [587, 698, 880], // D major  
      [523, 659, 784]  // C major
    ]
    
    for (let i = 0; i < chords.length; i++) {
      setTimeout(() => {
        this.playSimultaneousTones(chords[i], 200, 0.8)
      }, i * 150)
    }
  }

  private async playTypingSound(duration: number): Promise<void> {
    const interval = setInterval(() => {
      this.audioGenerator.createCustomSound({
        frequency: 800 + Math.random() * 200,
        duration: 30,
        volume: 0.1 * this.masterVolume,
        waveType: 'square',
        envelope: {
          attack: 0.001,
          decay: 0.01,
          sustain: 0.1,
          release: 0.02
        }
      })
    }, 80)

    setTimeout(() => { clearInterval(interval); }, duration)
  }

  private async playLoadingSound(duration: number): Promise<void> {
    let frequency = 220
    const interval = setInterval(() => {
      frequency += 20
      if (frequency > 440) frequency = 220
      
      this.audioGenerator.createCustomSound({
        frequency,
        duration: 100,
        volume: 0.15 * this.masterVolume,
        waveType: 'sine',
        envelope: {
          attack: 0.02,
          decay: 0.05,
          sustain: 0.3,
          release: 0.1
        }
      })
    }, 200)

    setTimeout(() => { clearInterval(interval); }, duration)
  }

  private async playProcessingSound(duration: number): Promise<void> {
    // Subtle pulsing sound
    const interval = setInterval(() => {
      this.audioGenerator.createCustomSound({
        frequency: 330,
        duration: 150,
        volume: 0.08 * this.masterVolume,
        waveType: 'triangle',
        envelope: {
          attack: 0.05,
          decay: 0.1,
          sustain: 0.2,
          release: 0.1
        }
      })
    }, 300)

    setTimeout(() => { clearInterval(interval); }, duration)
  }

  private async playCompletionSound(): Promise<void> {
    await this.playSequentialTones([659, 784, 988], 100, 0.6) // E-G-B
  }

  private getIntensityMultiplier(intensity?: 'subtle' | 'normal' | 'strong'): number {
    switch (intensity) {
      case 'subtle': return 0.5
      case 'strong': return 1.5
      default: return 1.0
    }
  }

  private calculateSpatialAudio(spatial: { x: number; y: number; z?: number }): SpatialAudioConfig {
    // Simple distance-based attenuation
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    
    const distance = Math.sqrt(
      (spatial.x - centerX)**2 + 
      (spatial.y - centerY)**2
    ) / Math.max(centerX, centerY)
    
    return {
      x: spatial.x,
      y: spatial.y,
      z: spatial.z || 0,
      distance: Math.max(0.1, 1 - distance) // Minimum 10% volume
    }
  }

  private addVariation(baseValue: number, amount: number): number {
    const variation = (Math.random() - 0.5) * 2 * amount
    return baseValue * (1 + variation)
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private loadSettings(): void {
    const settings = localStorage.getItem('interactionAudioSettings')
    if (settings) {
      try {
        const parsed = JSON.parse(settings)
        this.isEnabled = parsed.enabled ?? true
        this.masterVolume = parsed.volume ?? 0.5
        this.spatialEnabled = parsed.spatialEnabled ?? true
      } catch {
        // Use defaults if parsing fails
      }
    }
  }

  private saveSettings(): void {
    const settings = {
      enabled: this.isEnabled,
      volume: this.masterVolume,
      spatialEnabled: this.spatialEnabled
    }
    localStorage.setItem('interactionAudioSettings', JSON.stringify(settings))
  }

  private setupEventListeners(): void {
    // Listen for user interaction to enable audio context
    const enableAudio = () => {
      this.audioGenerator.resume()
      document.removeEventListener('click', enableAudio, { once: true })
      document.removeEventListener('keydown', enableAudio, { once: true })
    }

    document.addEventListener('click', enableAudio, { once: true })
    document.addEventListener('keydown', enableAudio, { once: true })
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.audioGenerator.destroy()
    this.audioQueue = []
  }
}