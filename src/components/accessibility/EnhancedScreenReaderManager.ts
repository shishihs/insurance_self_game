/**
 * 拡張スクリーンリーダーマネージャー
 * WCAG 2.1 AA準拠の包括的なスクリーンリーダー対応とゲーム特化型アナウンス
 */

import { ScreenReaderManager, type AnnouncementOptions, type GameStateAnnouncement } from './ScreenReaderManager'

export interface ContextualAnnouncement {
  main: string
  context?: string
  instructions?: string
  shortcuts?: string[]
  position?: string
  state?: string
}

export interface VerbosityLevel {
  level: 'minimal' | 'standard' | 'verbose'
  announcePositions: boolean
  announceStates: boolean
  announceInstructions: boolean
  announceShortcuts: boolean
  announceContext: boolean
}

export interface GameSpecificContext {
  vitality: number
  turn: number
  phase: string
  availableActions: string[]
  cardsInHand: number
  insuranceActive: boolean
  challengeInProgress: boolean
}

export class EnhancedScreenReaderManager extends ScreenReaderManager {
  private verbositySettings: VerbosityLevel = {
    level: 'standard',
    announcePositions: true,
    announceStates: true,
    announceInstructions: true,
    announceShortcuts: false,
    announceContext: true
  }
  
  private gameContext: GameSpecificContext = {
    vitality: 100,
    turn: 1,
    phase: 'draw',
    availableActions: [],
    cardsInHand: 0,
    insuranceActive: false,
    challengeInProgress: false
  }

  private speechSynthesis: SpeechSynthesis | null = null
  private speechVoices: SpeechSynthesisVoice[] = []
  private preferredVoice: SpeechSynthesisVoice | null = null
  private speechEnabled = false
  private speechRate = 1.0
  private speechPitch = 1.0
  private speechVolume = 0.8

  constructor() {
    super()
    this.initializeSpeechSynthesis()
    this.setupAdvancedLiveRegions()
    this.setupContextualDescriptions()
  }

  /**
   * 音声合成の初期化
   */
  private initializeSpeechSynthesis(): void {
    if ('speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis
      
      // 音声リストの読み込み完了を待つ
      const loadVoices = () => {
        this.speechVoices = this.speechSynthesis!.getVoices()
        this.selectBestVoice()
      }
      
      if (this.speechVoices.length === 0) {
        this.speechSynthesis.addEventListener('voiceschanged', loadVoices)
      } else {
        loadVoices()
      }
    }
  }

  /**
   * 最適な音声の選択
   */
  private selectBestVoice(): void {
    const japaneseVoices = this.speechVoices.filter(voice => 
      voice.lang.startsWith('ja') || voice.name.includes('Japanese')
    )
    
    if (japaneseVoices.length > 0) {
      // 女性の声を優先
      this.preferredVoice = japaneseVoices.find(voice => 
        voice.name.includes('Female') || voice.name.includes('女性')
      ) || japaneseVoices[0]
    } else {
      // 日本語がない場合は英語を選択
      this.preferredVoice = this.speechVoices.find(voice => 
        voice.lang.startsWith('en')
      ) || this.speechVoices[0]
    }
  }

  /**
   * 詳細度レベルの設定
   */
  public setVerbosityLevel(level: VerbosityLevel): void {
    this.verbositySettings = { ...level }
    this.announceVerbosityChange()
  }

  /**
   * ゲームコンテキストの更新
   */
  public updateGameContext(context: Partial<GameSpecificContext>): void {
    this.gameContext = { ...this.gameContext, ...context }
  }

  /**
   * 音声読み上げ設定
   */
  public setSpeechSettings(settings: {
    enabled?: boolean
    rate?: number
    pitch?: number
    volume?: number
    voice?: string
  }): void {
    if (settings.enabled !== undefined) {
      this.speechEnabled = settings.enabled
    }
    
    if (settings.rate !== undefined) {
      this.speechRate = Math.max(0.1, Math.min(2.0, settings.rate))
    }
    
    if (settings.pitch !== undefined) {
      this.speechPitch = Math.max(0, Math.min(2, settings.pitch))
    }
    
    if (settings.volume !== undefined) {
      this.speechVolume = Math.max(0, Math.min(1, settings.volume))
    }
    
    if (settings.voice) {
      const voice = this.speechVoices.find(v => v.name === settings.voice)
      if (voice) {
        this.preferredVoice = voice
      }
    }
  }

  /**
   * コンテキスト対応アナウンス
   */
  public announceContextual(announcement: ContextualAnnouncement, options: AnnouncementOptions = { priority: 'polite' }): void {
    const parts: string[] = []
    
    // メインメッセージ
    parts.push(announcement.main)
    
    // 詳細度に応じた追加情報
    if (this.verbositySettings.announceContext && announcement.context) {
      parts.push(announcement.context)
    }
    
    if (this.verbositySettings.announceInstructions && announcement.instructions) {
      parts.push(`操作方法: ${announcement.instructions}`)
    }
    
    if (this.verbositySettings.announceShortcuts && announcement.shortcuts && announcement.shortcuts.length > 0) {
      parts.push(`ショートカット: ${announcement.shortcuts.join('、')}`)
    }
    
    if (this.verbositySettings.announcePositions && announcement.position) {
      parts.push(`位置: ${announcement.position}`)
    }
    
    if (this.verbositySettings.announceStates && announcement.state) {
      parts.push(`状態: ${announcement.state}`)
    }
    
    const fullMessage = parts.join('。')
    this.announce(fullMessage, options)
    
    // 音声合成での読み上げ
    if (this.speechEnabled) {
      this.speak(fullMessage)
    }
  }

  /**
   * ゲーム状態の包括的なアナウンス
   */
  public announceFullGameState(): void {
    const contextParts: string[] = []
    
    contextParts.push(`ターン${this.gameContext.turn}`)
    contextParts.push(`活力${this.gameContext.vitality}`)
    contextParts.push(`手札${this.gameContext.cardsInHand}枚`)
    
    if (this.gameContext.insuranceActive) {
      contextParts.push('保険適用中')
    }
    
    if (this.gameContext.challengeInProgress) {
      contextParts.push('チャレンジ実行中')
    }
    
    contextParts.push(`現在フェーズ: ${this.translatePhase(this.gameContext.phase)}`)
    
    if (this.gameContext.availableActions.length > 0) {
      contextParts.push(`利用可能な行動: ${this.gameContext.availableActions.join('、')}`)
    }
    
    const fullContext = `ゲーム状態: ${contextParts.join('、')}`
    
    this.announceContextual({
      main: fullContext,
      instructions: this.getPhaseInstructions(this.gameContext.phase),
      shortcuts: this.getPhaseShortcuts(this.gameContext.phase)
    }, { priority: 'assertive' })
  }

  /**
   * カード詳細の段階的アナウンス
   */
  public announceCardWithLevels(card: any, level: 'brief' | 'standard' | 'detailed' = 'standard'): void {
    const announcement: ContextualAnnouncement = {
      main: `${card.name}`,
      context: '',
      instructions: '',
      shortcuts: []
    }
    
    switch (level) {
      case 'brief':
        announcement.main = `${card.name}`
        break
        
      case 'standard':
        announcement.main = `${card.name}、タイプ${card.type}`
        if (card.power !== undefined) {
          announcement.context = `パワー${card.power}`
        }
        announcement.instructions = 'Enterで選択、スペースでプレイ'
        break
        
      case 'detailed':
        announcement.main = `${card.name}、タイプ${card.type}`
        announcement.context = this.createDetailedCardContext(card)
        announcement.instructions = this.getCardInstructions(card)
        announcement.shortcuts = this.getCardShortcuts(card)
        break
    }
    
    this.announceContextual(announcement, { priority: 'polite' })
  }

  /**
   * エラー状況の詳細アナウンス
   */
  public announceErrorWithRecovery(error: string, recovery?: string[]): void {
    const announcement: ContextualAnnouncement = {
      main: `エラー: ${error}`,
      instructions: recovery ? `解決方法: ${recovery.join('または')}` : undefined
    }
    
    this.announceContextual(announcement, { priority: 'assertive', interrupt: true })
  }

  /**
   * 進捗の詳細アナウンス
   */
  public announceProgressWithETA(current: number, total: number, description: string, eta?: number): void {
    const percentage = Math.round((current / total) * 100)
    const progressText = `${description}: ${current}/${total} (${percentage}%)`
    
    const announcement: ContextualAnnouncement = {
      main: progressText,
      context: eta ? `予想残り時間: ${eta}秒` : undefined
    }
    
    this.announceContextual(announcement, { priority: 'polite' })
  }

  /**
   * ドラッグ&ドロップの詳細ガイダンス
   */
  public announceDragDropGuidance(phase: 'start' | 'move' | 'drop' | 'cancel', details: any): void {
    let announcement: ContextualAnnouncement
    
    switch (phase) {
      case 'start':
        announcement = {
          main: `${details.itemName}のドラッグを開始`,
          instructions: '矢印キーで移動、スペースでドロップ、Escapeでキャンセル',
          shortcuts: ['矢印キー: 移動', 'スペース: ドロップ', 'Escape: キャンセル']
        }
        break
        
      case 'move':
        announcement = {
          main: `${details.targetName}の上`,
          position: details.position || '不明',
          state: details.canDrop ? 'ドロップ可能' : 'ドロップ不可'
        }
        break
        
      case 'drop':
        announcement = {
          main: details.success 
            ? `${details.targetName}に${details.itemName}をドロップしました`
            : `ドロップに失敗: ${details.reason}`,
          context: details.success ? details.result : undefined
        }
        break
        
      case 'cancel':
        announcement = {
          main: 'ドラッグ操作をキャンセルしました',
          instructions: '元の操作を続行できます'
        }
        break
    }
    
    this.announceContextual(announcement, { 
      priority: phase === 'drop' && !details.success ? 'assertive' : 'polite' 
    })
  }

  /**
   * テーブル・リスト構造の説明
   */
  public announceTableStructure(table: HTMLTableElement): void {
    const rows = table.rows.length
    const cols = table.rows[0]?.cells.length || 0
    const hasHeaders = table.querySelector('th') !== null
    
    const announcement: ContextualAnnouncement = {
      main: `テーブル: ${rows}行${cols}列`,
      context: hasHeaders ? 'ヘッダーあり' : 'ヘッダーなし',
      instructions: '矢印キーで移動、Ctrl+矢印キーで端まで移動'
    }
    
    this.announceContextual(announcement, { priority: 'polite' })
  }

  /**
   * 音声合成による読み上げ
   */
  private speak(text: string): void {
    if (!this.speechSynthesis || !this.speechEnabled) return
    
    // 既存の発話を停止
    this.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    
    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice
    }
    
    utterance.rate = this.speechRate
    utterance.pitch = this.speechPitch
    utterance.volume = this.speechVolume
    
    // エラーハンドリング
    utterance.onerror = (event) => {
      console.warn('Speech synthesis error:', event.error)
    }
    
    this.speechSynthesis.speak(utterance)
  }

  /**
   * 高度なライブリージョンの設定
   */
  private setupAdvancedLiveRegions(): void {
    // ゲーム特化型ライブリージョン
    const gameStatusRegion = document.createElement('div')
    gameStatusRegion.id = 'game-status-live'
    gameStatusRegion.setAttribute('aria-live', 'polite')
    gameStatusRegion.setAttribute('aria-relevant', 'text')
    gameStatusRegion.setAttribute('aria-atomic', 'true')
    gameStatusRegion.className = 'sr-only'
    document.body.appendChild(gameStatusRegion)
    
    // エラー専用リージョン
    const errorRegion = document.createElement('div')
    errorRegion.id = 'error-live'
    errorRegion.setAttribute('aria-live', 'assertive')
    errorRegion.setAttribute('aria-relevant', 'additions')
    errorRegion.setAttribute('aria-atomic', 'true')
    errorRegion.className = 'sr-only'
    document.body.appendChild(errorRegion)
    
    // 進捗専用リージョン
    const progressRegion = document.createElement('div')
    progressRegion.id = 'progress-live'
    progressRegion.setAttribute('aria-live', 'polite')
    progressRegion.setAttribute('aria-relevant', 'text')
    progressRegion.setAttribute('aria-atomic', 'false')
    progressRegion.className = 'sr-only'
    document.body.appendChild(progressRegion)
  }

  /**
   * コンテキスト説明の設定
   */
  private setupContextualDescriptions(): void {
    // ページ全体の説明
    const pageDescription = document.createElement('div')
    pageDescription.id = 'page-description'
    pageDescription.className = 'sr-only'
    pageDescription.textContent = this.getPageDescription()
    document.body.insertBefore(pageDescription, document.body.firstChild)
    
    // ゲーム説明
    const gameDescription = document.createElement('div')
    gameDescription.id = 'game-description'
    gameDescription.className = 'sr-only'
    gameDescription.textContent = this.getGameDescription()
    document.body.appendChild(gameDescription)
  }

  private getPageDescription(): string {
    return '人生充実ゲーム: 保険カードを使って人生のチャレンジに挑戦するカードゲームです。' +
           'キーボードでの操作が可能で、スクリーンリーダーに対応しています。'
  }

  private getGameDescription(): string {
    return 'ゲームの目標は活力を維持しながら様々なチャレンジをクリアすることです。' +
           '保険カードを使って リスクを軽減できます。F1キーでヘルプを表示できます。'
  }

  private translatePhase(phase: string): string {
    const phaseMap: Record<string, string> = {
      'draw': 'カード引きフェーズ',
      'play': 'カードプレイフェーズ',
      'challenge': 'チャレンジフェーズ',
      'insurance': '保険選択フェーズ',
      'end': 'ターン終了フェーズ'
    }
    
    return phaseMap[phase] || phase
  }

  private getPhaseInstructions(phase: string): string {
    const instructionMap: Record<string, string> = {
      'draw': 'カードを引いてください',
      'play': 'プレイするカードを選択してください',
      'challenge': 'チャレンジを選択してください',
      'insurance': '保険カードを選択してください',
      'end': 'ターンを終了してください'
    }
    
    return instructionMap[phase] || 'ゲームを続行してください'
  }

  private getPhaseShortcuts(phase: string): string[] {
    const shortcutMap: Record<string, string[]> = {
      'draw': ['D: カードを引く'],
      'play': ['スペース: カードプレイ', 'I: 保険選択'],
      'challenge': ['C: チャレンジ選択', 'S: スキップ'],
      'insurance': ['I: 保険適用', 'N: 保険なし'],
      'end': ['E: ターン終了']
    }
    
    return shortcutMap[phase] || ['F1: ヘルプ']
  }

  private createDetailedCardContext(card: any): string {
    const parts: string[] = []
    
    if (card.power !== undefined) {
      parts.push(`パワー${card.power}`)
    }
    
    if (card.cost !== undefined) {
      parts.push(`コスト${card.cost}`)
    }
    
    if (card.rarity) {
      parts.push(`レアリティ${card.rarity}`)
    }
    
    if (card.description) {
      parts.push(`効果: ${card.description}`)
    }
    
    return parts.join('、')
  }

  private getCardInstructions(card: any): string {
    const instructions = ['Enterで選択']
    
    if (card.type === 'insurance') {
      instructions.push('Iで即座に適用')
    } else {
      instructions.push('スペースでプレイ')
    }
    
    if (card.canDiscard) {
      instructions.push('Deleteで破棄')
    }
    
    return instructions.join('、')
  }

  private getCardShortcuts(card: any): string[] {
    const shortcuts = ['Enter: 選択']
    
    if (card.type === 'insurance') {
      shortcuts.push('I: 適用')
    } else {
      shortcuts.push('スペース: プレイ')
    }
    
    return shortcuts
  }

  private announceVerbosityChange(): void {
    const levelNames = {
      'minimal': '最小',
      'standard': '標準',
      'verbose': '詳細'
    }
    
    const announcement = `詳細度を${levelNames[this.verbositySettings.level]}に変更しました`
    this.announce(announcement, { priority: 'assertive' })
  }

  /**
   * 利用可能な音声の取得
   */
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.speechVoices
  }

  /**
   * 音声合成のテスト
   */
  public testSpeech(text: string = 'これは音声合成のテストです'): void {
    this.speak(text)
  }

  /**
   * 統計情報の取得
   */
  public getScreenReaderStats(): any {
    return {
      verbosityLevel: this.verbositySettings.level,
      speechEnabled: this.speechEnabled,
      currentVoice: this.preferredVoice?.name || 'デフォルト',
      availableVoices: this.speechVoices.length,
      gameContext: this.gameContext
    }
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    super.destroy()
    
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel()
    }
    
    // 追加したライブリージョンを削除
    const additionalRegions = [
      'game-status-live',
      'error-live', 
      'progress-live',
      'page-description',
      'game-description'
    ]
    
    additionalRegions.forEach(id => {
      const element = document.getElementById(id)
      if (element) {
        element.remove()
      }
    })
  }
}