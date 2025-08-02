/**
 * VoiceControlManager - Web Speech APIを使った次世代音声コントロール
 * 
 * 機能:
 * - 音声認識による完全なゲーム操作
 * - 多言語対応（日本語・英語）
 * - コンテキスト対応コマンド認識
 * - 音声フィードバック
 * - ノイズキャンセリング対応
 */

export interface VoiceCommand {
  patterns: string[]
  action: string
  parameters?: Record<string, any>
  context?: string[]
  confidence?: number
  description: string
  examples: string[]
}

export interface VoiceControlConfig {
  language: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  confidenceThreshold: number
  noiseReduction: boolean
  contextAware: boolean
  feedbackEnabled: boolean
}

export interface RecognitionResult {
  transcript: string
  confidence: number
  command?: VoiceCommand
  parameters?: Record<string, any>
  success: boolean
  error?: string
}

export class VoiceControlManager {
  private recognition: SpeechRecognition | null = null
  private synthesis: SpeechSynthesis | null = null
  private config: VoiceControlConfig
  private readonly commands: Map<string, VoiceCommand> = new Map()
  private currentContext: string[] = []
  private isListening = false
  private readonly listeners: Set<(result: RecognitionResult) => void> = new Set()
  
  // 音声コマンドの定義
  private readonly defaultCommands: VoiceCommand[] = [
    // ゲーム基本操作
    {
      patterns: ['カードを引く', 'ドローカード', 'カードドロー', 'draw card', 'draw'],
      action: 'draw_card',
      context: ['game', 'draw_phase'],
      description: 'カードを手札に追加します',
      examples: ['「カードを引く」', '「ドロー」']
    },
    {
      patterns: ['カードをプレイ', 'カード使用', 'プレイカード', 'play card', 'use card'],
      action: 'play_card',
      context: ['game', 'play_phase'],
      description: '選択したカードをプレイします',
      examples: ['「カードをプレイ」', '「カード使用」']
    },
    {
      patterns: ['保険を適用', '保険使用', 'インシュランス', 'use insurance', 'apply insurance'],
      action: 'use_insurance',
      context: ['game', 'insurance_phase'],
      description: '保険カードを適用します',
      examples: ['「保険を適用」', '「インシュランス」']
    },
    {
      patterns: ['チャレンジ実行', 'チャレンジスタート', 'start challenge', 'begin challenge'],
      action: 'start_challenge',
      context: ['game', 'challenge_phase'],
      description: 'チャレンジを開始します',
      examples: ['「チャレンジ実行」', '「チャレンジスタート」']
    },
    {
      patterns: ['ターン終了', 'エンドターン', 'end turn', 'finish turn'],
      action: 'end_turn',
      context: ['game'],
      description: 'ターンを終了します',
      examples: ['「ターン終了」', '「エンドターン」']
    },
    
    // カード選択
    {
      patterns: ['1番目のカード', '最初のカード', 'first card', 'card one'],
      action: 'select_card',
      parameters: { index: 0 },
      context: ['game'],
      description: '最初のカードを選択します',
      examples: ['「1番目のカード」', '「最初のカード」']
    },
    {
      patterns: ['2番目のカード', '2つ目のカード', 'second card', 'card two'],
      action: 'select_card',
      parameters: { index: 1 },
      context: ['game'],
      description: '2番目のカードを選択します',
      examples: ['「2番目のカード」', '「2つ目のカード」']
    },
    {
      patterns: ['最後のカード', 'ラストカード', 'last card', 'final card'],
      action: 'select_card',
      parameters: { index: -1 },
      context: ['game'],
      description: '最後のカードを選択します',
      examples: ['「最後のカード」', '「ラストカード」']
    },
    
    // ナビゲーション
    {
      patterns: ['メニューを開く', 'メニュー表示', 'open menu', 'show menu'],
      action: 'open_menu',
      description: 'メインメニューを開きます',
      examples: ['「メニューを開く」', '「メニュー表示」']
    },
    {
      patterns: ['設定を開く', '設定画面', 'open settings', 'preferences'],
      action: 'open_settings',
      description: '設定画面を開きます',
      examples: ['「設定を開く」', '「設定画面」']
    },
    {
      patterns: ['ヘルプ', 'ヘルプ表示', 'help', 'show help'],
      action: 'show_help',
      description: 'ヘルプを表示します',
      examples: ['「ヘルプ」', '「ヘルプ表示」']
    },
    {
      patterns: ['戻る', 'バック', 'go back', 'back'],
      action: 'go_back',
      description: '前の画面に戻ります',
      examples: ['「戻る」', '「バック」']
    },
    
    // アクセシビリティ
    {
      patterns: ['画面を読み上げ', 'スクリーンリーダー', 'read screen', 'screen reader'],
      action: 'read_screen',
      description: '現在の画面内容を読み上げます',
      examples: ['「画面を読み上げ」', '「スクリーンリーダー」']
    },
    {
      patterns: ['ゲーム状況説明', 'ステータス確認', 'game status', 'current status'],
      action: 'describe_game_state',
      context: ['game'],
      description: '現在のゲーム状況を説明します',
      examples: ['「ゲーム状況説明」', '「ステータス確認」']
    },
    {
      patterns: ['利用可能な操作', 'できること', 'available actions', 'what can I do'],
      action: 'list_available_actions',
      description: '現在利用可能な操作を説明します',
      examples: ['「利用可能な操作」', '「できること」']
    },
    
    // システム制御
    {
      patterns: ['音声認識停止', 'リスニング停止', 'stop listening', 'silence'],
      action: 'stop_listening',
      description: '音声認識を停止します',
      examples: ['「音声認識停止」', '「リスニング停止」']
    },
    {
      patterns: ['音声認識開始', 'リスニング開始', 'start listening', 'voice on'],
      action: 'start_listening',
      description: '音声認識を開始します',
      examples: ['「音声認識開始」', '「リスニング開始」']
    }
  ]

  constructor(config: Partial<VoiceControlConfig> = {}) {
    this.config = {
      language: 'ja-JP',
      continuous: true,
      interimResults: false,
      maxAlternatives: 3,
      confidenceThreshold: 0.7,
      noiseReduction: true,
      contextAware: true,
      feedbackEnabled: true,
      ...config
    }

    this.initializeSpeechRecognition()
    this.initializeSpeechSynthesis()
    this.loadCommands()
  }

  /**
   * 音声認識の初期化
   */
  private initializeSpeechRecognition(): void {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech Recognition API is not supported in this browser')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    this.recognition = new SpeechRecognition()

    this.recognition.lang = this.config.language
    this.recognition.continuous = this.config.continuous
    this.recognition.interimResults = this.config.interimResults
    this.recognition.maxAlternatives = this.config.maxAlternatives

    this.setupRecognitionEvents()
  }

  /**
   * 音声合成の初期化
   */
  private initializeSpeechSynthesis(): void {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis
    }
  }

  /**
   * デフォルトコマンドの読み込み
   */
  private loadCommands(): void {
    this.defaultCommands.forEach(command => {
      this.addCommand(command)
    })
  }

  /**
   * 音声認識イベントの設定
   */
  private setupRecognitionEvents(): void {
    if (!this.recognition) return

    this.recognition.onstart = () => {
      this.isListening = true
      this.speakFeedback('音声認識を開始しました')
    }

    this.recognition.onend = () => {
      this.isListening = false
      // 継続的な認識の場合は自動再開
      if (this.config.continuous) {
        setTimeout(() => {
          this.startListening()
        }, 100)
      }
    }

    this.recognition.onresult = (event) => {
      this.handleRecognitionResult(event)
    }

    this.recognition.onerror = (event) => {
      this.handleRecognitionError(event)
    }

    this.recognition.onnomatch = () => {
      this.speakFeedback('認識できませんでした。もう一度お試しください。')
    }
  }

  /**
   * 音声認識結果の処理
   */
  private handleRecognitionResult(event: SpeechRecognitionEvent): void {
    const results = Array.from(event.results)
    const lastResult = results[results.length - 1]

    if (!lastResult.isFinal) return

    const alternatives = Array.from(lastResult).map(alt => ({
      transcript: alt.transcript.trim(),
      confidence: alt.confidence
    }))

    // 最も信頼度の高い結果を選択
    const bestResult = alternatives.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    )

    if (bestResult.confidence < this.config.confidenceThreshold) {
      this.notifyListeners({
        transcript: bestResult.transcript,
        confidence: bestResult.confidence,
        success: false,
        error: '信頼度が低すぎます'
      })
      this.speakFeedback('聞き取れませんでした。もう一度お試しください。')
      return
    }

    // コマンドの照合と実行
    const matchedCommand = this.matchCommand(bestResult.transcript)
    
    if (matchedCommand) {
      this.executeCommand(matchedCommand, bestResult)
    } else {
      this.handleUnknownCommand(bestResult.transcript)
    }
  }

  /**
   * 音声認識エラーの処理
   */
  private handleRecognitionError(event: SpeechRecognitionErrorEvent): void {
    let errorMessage = 'エラーが発生しました'
    
    switch (event.error) {
      case 'no-speech':
        errorMessage = '音声が検出されませんでした'
        break
      case 'audio-capture':
        errorMessage = 'マイクにアクセスできません'
        break
      case 'not-allowed':
        errorMessage = 'マイクの使用が許可されていません'
        break
      case 'network':
        errorMessage = 'ネットワークエラーが発生しました'
        break
      case 'service-not-allowed':
        errorMessage = '音声認識サービスが利用できません'
        break
    }

    this.notifyListeners({
      transcript: '',
      confidence: 0,
      success: false,
      error: errorMessage
    })

    if (this.config.feedbackEnabled) {
      this.speakFeedback(errorMessage)
    }
  }

  /**
   * コマンドのマッチング
   */
  private matchCommand(transcript: string): VoiceCommand | null {
    const normalizedTranscript = this.normalizeText(transcript)
    let bestMatch: { command: VoiceCommand, score: number } | null = null

    for (const command of this.commands.values()) {
      // コンテキストフィルタリング
      if (this.config.contextAware && command.context && 
          !command.context.some(ctx => this.currentContext.includes(ctx))) {
        continue
      }

      // パターンマッチング
      for (const pattern of command.patterns) {
        const normalizedPattern = this.normalizeText(pattern)
        const score = this.calculateSimilarity(normalizedTranscript, normalizedPattern)
        
        if (score > 0.8 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { command, score }
        }
      }
    }

    return bestMatch?.command || null
  }

  /**
   * テキストの正規化
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[、。！？\s]/g, '')
      .replace(/[ァ-ン]/g, (match) => {
        // ひらがなに変換
        return String.fromCharCode(match.charCodeAt(0) - 0x60)
      })
  }

  /**
   * 文字列の類似度計算（Levenshtein距離ベース）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length
    const len2 = str2.length
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null))

    for (let i = 0; i <= len1; i++) matrix[i][0] = i
    for (let j = 0; j <= len2; j++) matrix[0][j] = j

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        )
      }
    }

    const maxLen = Math.max(len1, len2)
    return maxLen === 0 ? 1 : 1 - (matrix[len1][len2] / maxLen)
  }

  /**
   * コマンドの実行
   */
  private executeCommand(command: VoiceCommand, result: { transcript: string, confidence: number }): void {
    const recognitionResult: RecognitionResult = {
      transcript: result.transcript,
      confidence: result.confidence,
      command,
      parameters: command.parameters,
      success: true
    }

    this.notifyListeners(recognitionResult)

    if (this.config.feedbackEnabled) {
      this.speakFeedback(`${command.description}を実行します`)
    }
  }

  /**
   * 未知のコマンドの処理
   */
  private handleUnknownCommand(transcript: string): void {
    this.notifyListeners({
      transcript,
      confidence: 0,
      success: false,
      error: 'コマンドが見つかりません'
    })

    if (this.config.feedbackEnabled) {
      this.speakFeedback('そのコマンドは認識できません。「ヘルプ」と言って利用可能なコマンドを確認してください。')
    }
  }

  /**
   * 音声フィードバック
   */
  private speakFeedback(text: string): void {
    if (!this.synthesis || !this.config.feedbackEnabled) return

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = this.config.language
    utterance.rate = 1.1
    utterance.pitch = 1.0
    utterance.volume = 0.8

    this.synthesis.speak(utterance)
  }

  /**
   * 音声認識の開始
   */
  public startListening(): void {
    if (!this.recognition || this.isListening) return

    try {
      this.recognition.start()
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
    }
  }

  /**
   * 音声認識の停止
   */
  public stopListening(): void {
    if (!this.recognition || !this.isListening) return

    this.recognition.stop()
    this.speakFeedback('音声認識を停止しました')
  }

  /**
   * コマンドの追加
   */
  public addCommand(command: VoiceCommand): void {
    this.commands.set(command.action, command)
  }

  /**
   * コマンドの削除
   */
  public removeCommand(action: string): void {
    this.commands.delete(action)
  }

  /**
   * コンテキストの設定
   */
  public setContext(context: string[]): void {
    this.currentContext = [...context]
  }

  /**
   * コンテキストの追加
   */
  public addContext(context: string): void {
    if (!this.currentContext.includes(context)) {
      this.currentContext.push(context)
    }
  }

  /**
   * コンテキストの削除
   */
  public removeContext(context: string): void {
    const index = this.currentContext.indexOf(context)
    if (index > -1) {
      this.currentContext.splice(index, 1)
    }
  }

  /**
   * 利用可能なコマンドの取得
   */
  public getAvailableCommands(): VoiceCommand[] {
    if (!this.config.contextAware) {
      return Array.from(this.commands.values())
    }

    return Array.from(this.commands.values()).filter(command => 
      !command.context || command.context.some(ctx => this.currentContext.includes(ctx))
    )
  }

  /**
   * 音声認識の状態取得
   */
  public isRecognitionAvailable(): boolean {
    return this.recognition !== null
  }

  /**
   * 現在の認識状態取得
   */
  public getIsListening(): boolean {
    return this.isListening
  }

  /**
   * イベントリスナーの登録
   */
  public subscribe(callback: (result: RecognitionResult) => void): () => void {
    this.listeners.add(callback)
    
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * リスナーへの通知
   */
  private notifyListeners(result: RecognitionResult): void {
    this.listeners.forEach(callback => {
      try {
        callback(result)
      } catch (error) {
        console.error('VoiceControlManager listener error:', error)
      }
    })
  }

  /**
   * 設定の更新
   */
  public updateConfig(newConfig: Partial<VoiceControlConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (this.recognition) {
      this.recognition.lang = this.config.language
      this.recognition.continuous = this.config.continuous
      this.recognition.interimResults = this.config.interimResults
      this.recognition.maxAlternatives = this.config.maxAlternatives
    }
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    this.stopListening()
    this.listeners.clear()
    this.commands.clear()
  }
}

// Vue Composition API用のフック
export function useVoiceControl(config: Partial<VoiceControlConfig> = {}) {
  const { ref, onMounted, onUnmounted } = require('vue')
  
  const voiceControl = ref<VoiceControlManager | null>(null)
  const isListening = ref(false)
  const lastResult = ref<RecognitionResult | null>(null)
  const availableCommands = ref<VoiceCommand[]>([])

  onMounted(() => {
    voiceControl.value = new VoiceControlManager(config)
    
    const unsubscribe = voiceControl.value.subscribe((result) => {
      lastResult.value = result
    })

    availableCommands.value = voiceControl.value.getAvailableCommands()

    onUnmounted(() => {
      unsubscribe()
      voiceControl.value?.destroy()
    })
  })

  const startListening = () => {
    voiceControl.value?.startListening()
    isListening.value = true
  }

  const stopListening = () => {
    voiceControl.value?.stopListening()
    isListening.value = false
  }

  const setContext = (context: string[]) => {
    voiceControl.value?.setContext(context)
    availableCommands.value = voiceControl.value?.getAvailableCommands() || []
  }

  return {
    voiceControl,
    isListening,
    lastResult,
    availableCommands,
    startListening,
    stopListening,
    setContext
  }
}

// グローバル型定義の拡張
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}