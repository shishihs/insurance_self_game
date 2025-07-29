/**
 * Web Audio APIを使用したサウンド生成器
 * 高品質なゲームサウンドを動的に生成
 */
export class WebAudioSoundGenerator {
  private audioContext: AudioContext
  
  constructor() {
    this.audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)()
  }
  
  /**
   * ボタンクリック音
   */
  playButtonClick(): void {
    const time = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.connect(gain)
    gain.connect(this.audioContext.destination)
    
    osc.frequency.setValueAtTime(800, time)
    osc.frequency.exponentialRampToValueAtTime(400, time + 0.05)
    
    gain.gain.setValueAtTime(0.3, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05)
    
    osc.start(time)
    osc.stop(time + 0.05)
  }
  
  /**
   * ボタンホバー音
   */
  playButtonHover(): void {
    const time = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.connect(gain)
    gain.connect(this.audioContext.destination)
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, time)
    
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(0.1, time + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.03)
    
    osc.start(time)
    osc.stop(time + 0.03)
  }
  
  /**
   * カードドロー音
   */
  playCardDraw(): void {
    const time = this.audioContext.currentTime
    
    // ホワイトノイズでシャッという音
    const bufferSize = 0.1 * this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    
    const noise = this.audioContext.createBufferSource()
    const filter = this.audioContext.createBiquadFilter()
    const gain = this.audioContext.createGain()
    
    noise.buffer = buffer
    filter.type = 'highpass'
    filter.frequency.setValueAtTime(1000, time)
    filter.frequency.exponentialRampToValueAtTime(3000, time + 0.1)
    
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.audioContext.destination)
    
    gain.gain.setValueAtTime(0.2, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1)
    
    noise.start(time)
    noise.stop(time + 0.1)
  }
  
  /**
   * カード選択音
   */
  playCardSelect(): void {
    const time = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.connect(gain)
    gain.connect(this.audioContext.destination)
    
    osc.type = 'square'
    osc.frequency.setValueAtTime(600, time)
    osc.frequency.exponentialRampToValueAtTime(800, time + 0.05)
    
    gain.gain.setValueAtTime(0.15, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05)
    
    osc.start(time)
    osc.stop(time + 0.05)
  }
  
  /**
   * チャレンジ成功音
   */
  playChallengeSuccess(): void {
    const time = this.audioContext.currentTime
    
    // 3つの音を重ねて豊かな成功音を作成
    const notes = [523.25, 659.25, 783.99] // C5, E5, G5
    
    notes.forEach((freq, index) => {
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      
      osc.connect(gain)
      gain.connect(this.audioContext.destination)
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, time + index * 0.05)
      
      gain.gain.setValueAtTime(0, time + index * 0.05)
      gain.gain.linearRampToValueAtTime(0.2, time + index * 0.05 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.01, time + index * 0.05 + 0.3)
      
      osc.start(time + index * 0.05)
      osc.stop(time + index * 0.05 + 0.3)
    })
  }
  
  /**
   * チャレンジ失敗音
   */
  playChallengeFail(): void {
    const time = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.connect(gain)
    gain.connect(this.audioContext.destination)
    
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(300, time)
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.2)
    
    gain.gain.setValueAtTime(0.2, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2)
    
    osc.start(time)
    osc.stop(time + 0.2)
  }
  
  /**
   * 活力増加音
   */
  playVitalityGain(): void {
    const time = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.connect(gain)
    gain.connect(this.audioContext.destination)
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, time)
    osc.frequency.exponentialRampToValueAtTime(800, time + 0.15)
    
    gain.gain.setValueAtTime(0.15, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15)
    
    osc.start(time)
    osc.stop(time + 0.15)
  }
  
  /**
   * 活力減少音
   */
  playVitalityLoss(): void {
    const time = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.connect(gain)
    gain.connect(this.audioContext.destination)
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, time)
    osc.frequency.exponentialRampToValueAtTime(200, time + 0.15)
    
    gain.gain.setValueAtTime(0.15, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15)
    
    osc.start(time)
    osc.stop(time + 0.15)
  }
  
  /**
   * 警告音
   */
  playWarning(): void {
    const time = this.audioContext.currentTime
    
    // 2回ビープ音
    for (let i = 0; i < 2; i++) {
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      
      osc.connect(gain)
      gain.connect(this.audioContext.destination)
      
      osc.type = 'square'
      osc.frequency.setValueAtTime(880, time + i * 0.15)
      
      gain.gain.setValueAtTime(0.1, time + i * 0.15)
      gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.15 + 0.1)
      
      osc.start(time + i * 0.15)
      osc.stop(time + i * 0.15 + 0.1)
    }
  }
  
  /**
   * 通知音
   */
  playNotification(): void {
    const time = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.connect(gain)
    gain.connect(this.audioContext.destination)
    
    osc.type = 'sine'
    // ド→ミの音程
    osc.frequency.setValueAtTime(523.25, time)
    osc.frequency.setValueAtTime(659.25, time + 0.05)
    
    gain.gain.setValueAtTime(0.15, time)
    gain.gain.setValueAtTime(0.15, time + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1)
    
    osc.start(time)
    osc.stop(time + 0.1)
  }
  
  /**
   * ゲームオーバー音
   */
  playGameOver(): void {
    const time = this.audioContext.currentTime
    
    // 低い音で徐々に下がる
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.connect(gain)
    gain.connect(this.audioContext.destination)
    
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(200, time)
    osc.frequency.exponentialRampToValueAtTime(50, time + 1)
    
    gain.gain.setValueAtTime(0.2, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 1)
    
    osc.start(time)
    osc.stop(time + 1)
  }
  
  /**
   * 勝利音
   */
  playVictory(): void {
    const time = this.audioContext.currentTime
    
    // ファンファーレ風の音
    const notes = [
      { freq: 523.25, start: 0 },     // C5
      { freq: 523.25, start: 0.1 },   // C5
      { freq: 523.25, start: 0.2 },   // C5
      { freq: 659.25, start: 0.3 },   // E5
      { freq: 783.99, start: 0.5 },   // G5
      { freq: 1046.50, start: 0.7 }   // C6
    ]
    
    notes.forEach(({ freq, start }) => {
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      
      osc.connect(gain)
      gain.connect(this.audioContext.destination)
      
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, time + start)
      
      gain.gain.setValueAtTime(0, time + start)
      gain.gain.linearRampToValueAtTime(0.15, time + start + 0.02)
      gain.gain.setValueAtTime(0.15, time + start + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.01, time + start + 0.2)
      
      osc.start(time + start)
      osc.stop(time + start + 0.2)
    })
  }
  
  /**
   * オーディオコンテキストのリジューム
   */
  async resume(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }
  
  /**
   * 保険カード獲得音
   */
  playInsuranceGet(): void {
    const time = this.audioContext.currentTime
    
    // コインを拾うような明るい音
    const notes = [659.25, 783.99, 1046.50] // E5, G5, C6
    
    notes.forEach((freq, index) => {
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      
      osc.connect(gain)
      gain.connect(this.audioContext.destination)
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, time + index * 0.03)
      
      gain.gain.setValueAtTime(0, time + index * 0.03)
      gain.gain.linearRampToValueAtTime(0.2, time + index * 0.03 + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.01, time + index * 0.03 + 0.15)
      
      osc.start(time + index * 0.03)
      osc.stop(time + index * 0.03 + 0.15)
    })
  }
  
  /**
   * 保険カード期限切れ音
   */
  playInsuranceExpire(): void {
    const time = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.connect(gain)
    gain.connect(this.audioContext.destination)
    
    // 下降する悲しげな音
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(440, time)
    osc.frequency.exponentialRampToValueAtTime(220, time + 0.3)
    
    gain.gain.setValueAtTime(0.2, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3)
    
    osc.start(time)
    osc.stop(time + 0.3)
  }
  
  /**
   * ステージクリア音
   */
  playStageComplete(): void {
    const time = this.audioContext.currentTime
    
    // 段階的に上昇する達成感のある音
    const notes = [
      { freq: 523.25, start: 0 },     // C5
      { freq: 659.25, start: 0.1 },   // E5
      { freq: 783.99, start: 0.2 },   // G5
      { freq: 1046.50, start: 0.3 },  // C6
      { freq: 1318.51, start: 0.4 }   // E6
    ]
    
    notes.forEach(({ freq, start }) => {
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      
      osc.connect(gain)
      gain.connect(this.audioContext.destination)
      
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, time + start)
      
      gain.gain.setValueAtTime(0, time + start)
      gain.gain.linearRampToValueAtTime(0.15, time + start + 0.02)
      gain.gain.setValueAtTime(0.15, time + start + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.01, time + start + 0.3)
      
      osc.start(time + start)
      osc.stop(time + start + 0.3)
    })
  }
  
  /**
   * チャレンジ開始音
   */
  playChallengeStart(): void {
    const time = this.audioContext.currentTime
    
    // 緊張感のある開始音
    const osc1 = this.audioContext.createOscillator()
    const osc2 = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(this.audioContext.destination)
    
    // 不協和音的な音程
    osc1.type = 'sawtooth'
    osc2.type = 'sawtooth'
    osc1.frequency.setValueAtTime(261.63, time) // C4
    osc2.frequency.setValueAtTime(277.18, time) // C#4
    
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(0.2, time + 0.05)
    gain.gain.setValueAtTime(0.2, time + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2)
    
    osc1.start(time)
    osc2.start(time)
    osc1.stop(time + 0.2)
    osc2.stop(time + 0.2)
  }
  
  /**
   * カードシャッフル音
   */
  playCardShuffle(): void {
    const time = this.audioContext.currentTime
    
    // 複数の短いホワイトノイズバーストでシャッフル感を表現
    for (let i = 0; i < 5; i++) {
      const bufferSize = 0.02 * this.audioContext.sampleRate
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
      const data = buffer.getChannelData(0)
      
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1
      }
      
      const noise = this.audioContext.createBufferSource()
      const filter = this.audioContext.createBiquadFilter()
      const gain = this.audioContext.createGain()
      
      noise.buffer = buffer
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(2000 + i * 500, time + i * 0.03)
      filter.Q.value = 10
      
      noise.connect(filter)
      filter.connect(gain)
      gain.connect(this.audioContext.destination)
      
      gain.gain.setValueAtTime(0.1, time + i * 0.03)
      gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.03 + 0.02)
      
      noise.start(time + i * 0.03)
      noise.stop(time + i * 0.03 + 0.02)
    }
  }
  
  /**
   * ダイアログ開く音
   */
  playDialogOpen(): void {
    const time = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.connect(gain)
    gain.connect(this.audioContext.destination)
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, time)
    osc.frequency.exponentialRampToValueAtTime(800, time + 0.1)
    
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(0.15, time + 0.02)
    gain.gain.setValueAtTime(0.15, time + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1)
    
    osc.start(time)
    osc.stop(time + 0.1)
  }
  
  /**
   * ダイアログ閉じる音
   */
  playDialogClose(): void {
    const time = this.audioContext.currentTime
    const osc = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc.connect(gain)
    gain.connect(this.audioContext.destination)
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, time)
    osc.frequency.exponentialRampToValueAtTime(400, time + 0.1)
    
    gain.gain.setValueAtTime(0.15, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1)
    
    osc.start(time)
    osc.stop(time + 0.1)
  }
  
  /**
   * エラー音
   */
  playError(): void {
    const time = this.audioContext.currentTime
    
    // 不快な不協和音
    const osc1 = this.audioContext.createOscillator()
    const osc2 = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()
    
    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(this.audioContext.destination)
    
    osc1.type = 'square'
    osc2.type = 'square'
    osc1.frequency.setValueAtTime(220, time)
    osc2.frequency.setValueAtTime(233.08, time) // 不協和音程
    
    gain.gain.setValueAtTime(0.2, time)
    gain.gain.setValueAtTime(0.2, time + 0.1)
    gain.gain.setValueAtTime(0, time + 0.15)
    gain.gain.setValueAtTime(0.2, time + 0.2)
    gain.gain.setValueAtTime(0.2, time + 0.3)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.35)
    
    osc1.start(time)
    osc2.start(time)
    osc1.stop(time + 0.35)
    osc2.stop(time + 0.35)
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }
  }
}