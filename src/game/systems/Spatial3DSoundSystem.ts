/**
 * 3D空間音響システム
 * Web Audio APIのPannerNodeを使用した3Dサウンド効果
 * 
 * 特徴:
 * - カードの位置に応じた音の定位
 * - 距離による音量減衰
 * - ドップラー効果（オプション）
 * - リスナー位置の動的更新
 */
export class Spatial3DSoundSystem {
  private audioContext: AudioContext
  private listener: AudioListener
  private panners: Map<string, PannerNode> = new Map()
  private gains: Map<string, GainNode> = new Map()
  
  /** 3Dサウンド設定 */
  private readonly config = {
    // 距離モデル
    distanceModel: 'inverse' as DistanceModelType,
    // 参照距離（この距離で音量が1.0）
    refDistance: 100,
    // 最大距離（この距離を超えると音量が0）
    maxDistance: 1000,
    // ロールオフ係数（距離による減衰の強さ）
    rolloffFactor: 1,
    // コーン設定（指向性音源用）
    coneInnerAngle: 360,
    coneOuterAngle: 360,
    coneOuterGain: 0
  }
  
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
    this.listener = this.audioContext.listener
    
    // リスナーの初期位置を設定（画面中央）
    this.setListenerPosition(0, 0, 0)
  }
  
  /**
   * 3D音源を作成
   */
  create3DSound(
    soundId: string,
    source: AudioNode,
    position: { x: number, y: number, z?: number }
  ): { panner: PannerNode, gain: GainNode } {
    // 既存の音源があれば削除
    this.remove3DSound(soundId)
    
    // PannerNodeを作成
    const panner = this.audioContext.createPanner()
    const gain = this.audioContext.createGain()
    
    // パラメータを設定
    panner.panningModel = 'HRTF' // より高品質な3D音響
    panner.distanceModel = this.config.distanceModel
    panner.refDistance = this.config.refDistance
    panner.maxDistance = this.config.maxDistance
    panner.rolloffFactor = this.config.rolloffFactor
    
    // コーン設定（指向性音源の場合）
    panner.coneInnerAngle = this.config.coneInnerAngle
    panner.coneOuterAngle = this.config.coneOuterAngle
    panner.coneOuterGain = this.config.coneOuterGain
    
    // 位置を設定
    this.setPosition(panner, position)
    
    // 接続
    source.connect(panner)
    panner.connect(gain)
    
    // 保存
    this.panners.set(soundId, panner)
    this.gains.set(soundId, gain)
    
    return { panner, gain }
  }
  
  /**
   * 音源の位置を更新
   */
  updatePosition(
    soundId: string,
    position: { x: number, y: number, z?: number },
    smoothTime: number = 0
  ): void {
    const panner = this.panners.get(soundId)
    if (!panner) return
    
    const currentTime = this.audioContext.currentTime
    const z = position.z || 0
    
    if (smoothTime > 0) {
      // スムーズな移動
      panner.positionX.linearRampToValueAtTime(position.x, currentTime + smoothTime)
      panner.positionY.linearRampToValueAtTime(position.y, currentTime + smoothTime)
      panner.positionZ.linearRampToValueAtTime(z, currentTime + smoothTime)
    } else {
      // 即座に移動
      this.setPosition(panner, position)
    }
  }
  
  /**
   * 音源の向きを設定
   */
  setOrientation(
    soundId: string,
    orientation: { x: number, y: number, z: number }
  ): void {
    const panner = this.panners.get(soundId)
    if (!panner) return
    
    const currentTime = this.audioContext.currentTime
    panner.orientationX.setValueAtTime(orientation.x, currentTime)
    panner.orientationY.setValueAtTime(orientation.y, currentTime)
    panner.orientationZ.setValueAtTime(orientation.z, currentTime)
  }
  
  /**
   * リスナーの位置を設定
   */
  setListenerPosition(x: number, y: number, z: number): void {
    const currentTime = this.audioContext.currentTime
    
    if (this.listener.positionX) {
      // 新しいAPI
      this.listener.positionX.setValueAtTime(x, currentTime)
      this.listener.positionY.setValueAtTime(y, currentTime)
      this.listener.positionZ.setValueAtTime(z, currentTime)
    } else {
      // 古いAPI（フォールバック）
      this.listener.setPosition(x, y, z)
    }
  }
  
  /**
   * リスナーの向きを設定
   */
  setListenerOrientation(
    forward: { x: number, y: number, z: number },
    up: { x: number, y: number, z: number }
  ): void {
    const currentTime = this.audioContext.currentTime
    
    if (this.listener.forwardX) {
      // 新しいAPI
      this.listener.forwardX.setValueAtTime(forward.x, currentTime)
      this.listener.forwardY.setValueAtTime(forward.y, currentTime)
      this.listener.forwardZ.setValueAtTime(forward.z, currentTime)
      this.listener.upX.setValueAtTime(up.x, currentTime)
      this.listener.upY.setValueAtTime(up.y, currentTime)
      this.listener.upZ.setValueAtTime(up.z, currentTime)
    } else {
      // 古いAPI（フォールバック）
      this.listener.setOrientation(
        forward.x, forward.y, forward.z,
        up.x, up.y, up.z
      )
    }
  }
  
  /**
   * カード位置から3D音響位置を計算
   */
  calculateCardPosition(
    cardX: number,
    cardY: number,
    screenWidth: number,
    screenHeight: number
  ): { x: number, y: number, z: number } {
    // 画面中央を原点とした座標系に変換
    const x = (cardX - screenWidth / 2) / 10  // スケール調整
    const y = (screenHeight / 2 - cardY) / 10  // Y軸を反転
    const z = 0  // 2D画面なのでZ軸は0
    
    return { x, y, z }
  }
  
  /**
   * 指向性音源を作成（例：スピーカーのような音源）
   */
  createDirectionalSound(
    soundId: string,
    source: AudioNode,
    position: { x: number, y: number, z?: number },
    direction: { x: number, y: number, z: number },
    coneAngle: number = 60
  ): { panner: PannerNode, gain: GainNode } {
    const result = this.create3DSound(soundId, source, position)
    
    // 指向性を設定
    result.panner.coneInnerAngle = coneAngle
    result.panner.coneOuterAngle = coneAngle * 2
    result.panner.coneOuterGain = 0.1
    
    // 向きを設定
    this.setOrientation(soundId, direction)
    
    return result
  }
  
  /**
   * 環境音響エフェクトを適用
   */
  applyEnvironmentalEffects(
    soundId: string,
    environment: 'indoor' | 'outdoor' | 'cave' | 'hall'
  ): void {
    const gain = this.gains.get(soundId)
    if (!gain) return
    
    // ConvolverNodeを使用したリバーブ効果
    const convolver = this.audioContext.createConvolver()
    const wetGain = this.audioContext.createGain()
    const dryGain = this.audioContext.createGain()
    
    // 環境に応じたリバーブ設定
    const reverbSettings = {
      indoor: { wetLevel: 0.2, impulseLength: 0.5 },
      outdoor: { wetLevel: 0.05, impulseLength: 0.1 },
      cave: { wetLevel: 0.6, impulseLength: 2.0 },
      hall: { wetLevel: 0.4, impulseLength: 1.5 }
    }
    
    const settings = reverbSettings[environment]
    wetGain.gain.value = settings.wetLevel
    dryGain.gain.value = 1 - settings.wetLevel
    
    // 簡易的なインパルスレスポンスを生成
    const impulseBuffer = this.createImpulseResponse(settings.impulseLength)
    convolver.buffer = impulseBuffer
    
    // 接続を再構成
    gain.disconnect()
    gain.connect(dryGain)
    gain.connect(convolver)
    convolver.connect(wetGain)
    
    // 最終出力に接続
    dryGain.connect(this.audioContext.destination)
    wetGain.connect(this.audioContext.destination)
  }
  
  /**
   * インパルスレスポンスを生成（リバーブ用）
   */
  private createImpulseResponse(duration: number): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate
    const length = sampleRate * duration
    const impulse = this.audioContext.createBuffer(2, length, sampleRate)
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        // 指数減衰するホワイトノイズ
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2)
      }
    }
    
    return impulse
  }
  
  /**
   * 位置を設定（内部ヘルパー）
   */
  private setPosition(
    panner: PannerNode,
    position: { x: number, y: number, z?: number }
  ): void {
    const currentTime = this.audioContext.currentTime
    const z = position.z || 0
    
    if (panner.positionX) {
      // 新しいAPI
      panner.positionX.setValueAtTime(position.x, currentTime)
      panner.positionY.setValueAtTime(position.y, currentTime)
      panner.positionZ.setValueAtTime(z, currentTime)
    } else {
      // 古いAPI（フォールバック）
      panner.setPosition(position.x, position.y, z)
    }
  }
  
  /**
   * 3D音源を削除
   */
  remove3DSound(soundId: string): void {
    const panner = this.panners.get(soundId)
    const gain = this.gains.get(soundId)
    
    if (panner) {
      panner.disconnect()
      this.panners.delete(soundId)
    }
    
    if (gain) {
      gain.disconnect()
      this.gains.delete(soundId)
    }
  }
  
  /**
   * 全ての3D音源を削除
   */
  removeAll(): void {
    this.panners.forEach((panner, id) => {
      this.remove3DSound(id)
    })
  }
  
  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): Spatial3DDebugInfo {
    const listenerPos = {
      x: this.listener.positionX?.value || 0,
      y: this.listener.positionY?.value || 0,
      z: this.listener.positionZ?.value || 0
    }
    
    const sources: Record<string, any> = {}
    this.panners.forEach((panner, id) => {
      sources[id] = {
        x: panner.positionX?.value || 0,
        y: panner.positionY?.value || 0,
        z: panner.positionZ?.value || 0
      }
    })
    
    return {
      listenerPosition: listenerPos,
      activeSources: sources,
      sourceCount: this.panners.size
    }
  }
}

/** 3Dサウンドデバッグ情報 */
interface Spatial3DDebugInfo {
  listenerPosition: { x: number, y: number, z: number }
  activeSources: Record<string, { x: number, y: number, z: number }>
  sourceCount: number
}