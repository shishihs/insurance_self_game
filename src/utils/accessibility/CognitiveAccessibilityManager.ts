/**
 * CognitiveAccessibilityManager - 認知負荷を軽減するインターフェース設計システム
 * 
 * 機能:
 * - 情報過多の防止とプログレッシブディスクロージャー
 * - 認知的複雑さの測定と最適化
 * - 集中力支援機能
 * - メモリ負荷軽減
 * - 意思決定支援
 * - 認知症・失読症・ADHD対応
 */

export interface CognitiveLoad {
  informational: number    // 情報量（0-1）
  interactional: number   // インタラクション複雑さ（0-1）
  visual: number          // 視覚的複雑さ（0-1）
  temporal: number        // 時間的プレッシャー（0-1）
  memorial: number        // 記憶負荷（0-1）
  decisional: number      // 意思決定複雑さ（0-1）
  overall: number         // 総合負荷（0-1）
}

export interface CognitiveProfile {
  attentionSpan: 'short' | 'medium' | 'long'
  processingSpeed: 'slow' | 'normal' | 'fast'
  memoryCapacity: 'limited' | 'normal' | 'extensive'
  multitaskingAbility: 'low' | 'medium' | 'high'
  preferredLearningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed'
  needsSimplification: boolean
  needsRepetition: boolean
  needsContext: boolean
  fatigueLevel: number // 0-1
}

export interface CognitiveConfig {
  enableProgressiveDisclosure: boolean
  maxSimultaneousElements: number
  autoSimplificationThreshold: number
  contextualHelpEnabled: boolean
  memoryAidsEnabled: boolean
  fatigueMonitoring: boolean
  customizations: {
    reduceAnimations: boolean
    simplifyLanguage: boolean
    increaseFontSize: boolean
    highContrast: boolean
    reduceClutter: boolean
  }
}

export interface AccessibilityAdaptation {
  elementType: 'button' | 'text' | 'image' | 'form' | 'navigation' | 'content'
  modifications: {
    simplifyText?: boolean
    addVisualCues?: boolean
    reduceOptions?: boolean
    addMemoryAids?: boolean
    increaseClickTargets?: boolean
    addProgressIndicators?: boolean
  }
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export class CognitiveAccessibilityManager {
  private config: CognitiveConfig
  private userProfile: CognitiveProfile
  private currentLoad: CognitiveLoad
  private readonly adaptations: Map<string, AccessibilityAdaptation> = new Map()
  private readonly interactionHistory: Array<{ timestamp: number, action: string, duration: number }> = []
  private fatigueMonitor: NodeJS.Timeout | null = null
  private readonly focusManager: FocusManager
  private readonly memoryAids: MemoryAidManager
  private readonly progressTracker: ProgressTrackingManager

  constructor(config: Partial<CognitiveConfig> = {}, userProfile: Partial<CognitiveProfile> = {}) {
    this.config = {
      enableProgressiveDisclosure: true,
      maxSimultaneousElements: 7, // Miller's rule: 7±2
      autoSimplificationThreshold: 0.7,
      contextualHelpEnabled: true,
      memoryAidsEnabled: true,
      fatigueMonitoring: true,
      customizations: {
        reduceAnimations: false,
        simplifyLanguage: false,
        increaseFontSize: false,
        highContrast: false,
        reduceClutter: true
      },
      ...config
    }

    this.userProfile = {
      attentionSpan: 'medium',
      processingSpeed: 'normal',
      memoryCapacity: 'normal',
      multitaskingAbility: 'medium',
      preferredLearningStyle: 'mixed',
      needsSimplification: false,
      needsRepetition: false,
      needsContext: false,
      fatigueLevel: 0,
      ...userProfile
    }

    this.currentLoad = this.calculateInitialLoad()
    this.focusManager = new FocusManager(this.config, this.userProfile)
    this.memoryAids = new MemoryAidManager(this.config)
    this.progressTracker = new ProgressTrackingManager()

    this.setupCognitiveSupport()
    this.startFatigueMonitoring()
  }

  /**
   * 認知負荷の計算
   */
  public calculateCognitiveLoad(element: HTMLElement): CognitiveLoad {
    const informational = this.calculateInformationalLoad(element)
    const interactional = this.calculateInteractionalLoad(element)
    const visual = this.calculateVisualLoad(element)
    const temporal = this.calculateTemporalLoad(element)
    const memorial = this.calculateMemorialLoad(element)
    const decisional = this.calculateDecisionalLoad(element)

    const overall = (informational + interactional + visual + temporal + memorial + decisional) / 6

    return {
      informational,
      interactional,
      visual,
      temporal,
      memorial,
      decisional,
      overall
    }
  }

  /**
   * 情報負荷の計算
   */
  private calculateInformationalLoad(element: HTMLElement): number {
    const textContent = element.textContent || ''
    const textLength = textContent.length
    const wordCount = textContent.split(/\s+/).length
    const complexity = this.calculateTextComplexity(textContent)

    // 情報密度の計算
    const density = textLength / Math.max(element.offsetWidth * element.offsetHeight, 1)
    
    // 正規化 (0-1)
    const lengthScore = Math.min(textLength / 1000, 1)
    const wordScore = Math.min(wordCount / 200, 1)
    const densityScore = Math.min(density * 10000, 1)

    return (lengthScore + wordScore + complexity + densityScore) / 4
  }

  /**
   * インタラクション負荷の計算
   */
  private calculateInteractionalLoad(element: HTMLElement): number {
    const interactiveElements = element.querySelectorAll('button, input, select, textarea, a[href]')
    const clickableCount = interactiveElements.length
    
    // フォーム要素の複雑さ
    const formComplexity = this.calculateFormComplexity(element)
    
    // ナビゲーション複雑さ
    const navComplexity = this.calculateNavigationComplexity(element)

    const countScore = Math.min(clickableCount / this.config.maxSimultaneousElements, 1)
    
    return (countScore + formComplexity + navComplexity) / 3
  }

  /**
   * 視覚負荷の計算
   */
  private calculateVisualLoad(element: HTMLElement): number {
    const colors = this.countDistinctColors(element)
    const fonts = this.countDistinctFonts(element)
    const images = element.querySelectorAll('img, video, canvas').length
    const animations = element.querySelectorAll('[style*="animation"], .animate').length

    const colorScore = Math.min(colors / 10, 1)
    const fontScore = Math.min(fonts / 5, 1)
    const imageScore = Math.min(images / 10, 1)
    const animationScore = Math.min(animations / 5, 1)

    return (colorScore + fontScore + imageScore + animationScore) / 4
  }

  /**
   * 時間的負荷の計算
   */
  private calculateTemporalLoad(element: HTMLElement): number {
    // タイマーやプログレスバーの存在
    const timers = element.querySelectorAll('[data-timer], .timer, .countdown').length
    const progressBars = element.querySelectorAll('progress, .progress').length
    
    // 自動更新要素
    const autoUpdating = element.querySelectorAll('[data-auto-update]').length

    const timerScore = Math.min(timers / 3, 1)
    const progressScore = Math.min(progressBars / 3, 1)
    const updateScore = Math.min(autoUpdating / 5, 1)

    return (timerScore + progressScore + updateScore) / 3
  }

  /**
   * 記憶負荷の計算
   */
  private calculateMemorialLoad(element: HTMLElement): number {
    // 記憶が必要な情報の量
    const memoryRequiredElements = element.querySelectorAll(
      '[data-remember], .remember, .step-indicator, .breadcrumb'
    ).length

    // 複数ステップのプロセス
    const stepIndicators = element.querySelectorAll('.step, [data-step]').length
    
    // 入力フィールドの数（記憶が必要）
    const inputFields = element.querySelectorAll('input:not([type="submit"]), textarea').length

    const memoryScore = Math.min(memoryRequiredElements / 5, 1)
    const stepScore = Math.min(stepIndicators / 7, 1)
    const inputScore = Math.min(inputFields / 10, 1)

    return (memoryScore + stepScore + inputScore) / 3
  }

  /**
   * 意思決定負荷の計算
   */
  private calculateDecisionalLoad(element: HTMLElement): number {
    // 選択肢の数
    const selectElements = element.querySelectorAll('select option')
    const radioGroups = new Set()
    element.querySelectorAll('input[type="radio"]').forEach(radio => {
      radioGroups.add((radio as HTMLInputElement).name)
    })
    
    const checkboxes = element.querySelectorAll('input[type="checkbox"]').length
    const buttons = element.querySelectorAll('button:not([disabled]), .button').length

    const optionScore = Math.min(selectElements.length / 20, 1)
    const radioScore = Math.min(radioGroups.size / 5, 1)
    const checkboxScore = Math.min(checkboxes / 10, 1)
    const buttonScore = Math.min(buttons / 8, 1)

    return (optionScore + radioScore + checkboxScore + buttonScore) / 4
  }

  /**
   * テキスト複雑さの計算
   */
  private calculateTextComplexity(text: string): number {
    if (!text) return 0

    const words = text.split(/\s+/)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    // 平均単語長
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
    
    // 平均文長
    const avgSentenceLength = words.length / sentences.length
    
    // 漢字・カタカナ・ひらがなの比率（日本語の場合）
    const kanjiCount = (text.match(/[\u4e00-\u9faf]/g) || []).length
    const katakanaCount = (text.match(/[\u30a0-\u30ff]/g) || []).length
    const hiraganaCount = (text.match(/[\u3040-\u309f]/g) || []).length
    
    const complexCharRatio = (kanjiCount + katakanaCount) / text.length

    const wordLengthScore = Math.min(avgWordLength / 10, 1)
    const sentenceLengthScore = Math.min(avgSentenceLength / 25, 1)
    const complexityScore = Math.min(complexCharRatio, 1)

    return (wordLengthScore + sentenceLengthScore + complexityScore) / 3
  }

  /**
   * 認知負荷に基づく自動最適化
   */
  public optimizeForCognitiveLoad(element: HTMLElement): void {
    const load = this.calculateCognitiveLoad(element)
    this.currentLoad = load

    if (load.overall > this.config.autoSimplificationThreshold) {
      this.applySimplificationStrategies(element, load)
    }

    this.applyUserProfileAdaptations(element)
    this.setupContextualHelp(element)
    this.addMemoryAids(element)
  }

  /**
   * 簡素化戦略の適用
   */
  private applySimplificationStrategies(element: HTMLElement, load: CognitiveLoad): void {
    // 情報負荷が高い場合
    if (load.informational > 0.7) {
      this.implementProgressiveDisclosure(element)
      this.simplifyLanguage(element)
    }

    // インタラクション負荷が高い場合
    if (load.interactional > 0.7) {
      this.reduceSimultaneousOptions(element)
      this.addGuidedInteraction(element)
    }

    // 視覚負荷が高い場合
    if (load.visual > 0.7) {
      this.simplifyVisualDesign(element)
      this.reduceVisualClutter(element)
    }

    // 記憶負荷が高い場合
    if (load.memorial > 0.7) {
      this.addMemorySupports(element)
      this.implementBreadcrumbs(element)
    }

    // 意思決定負荷が高い場合
    if (load.decisional > 0.7) {
      this.implementDecisionSupport(element)
      this.addRecommendations(element)
    }
  }

  /**
   * プログレッシブディスクロージャーの実装
   */
  private implementProgressiveDisclosure(element: HTMLElement): void {
    if (!this.config.enableProgressiveDisclosure) return

    const sections = element.querySelectorAll('[data-disclosure-level]')
    sections.forEach((section, index) => {
      const level = parseInt(section.getAttribute('data-disclosure-level') || '1')
      
      if (level > 1) {
        section.classList.add('disclosure-hidden')
        
        // 展開ボタンを追加
        const expandButton = document.createElement('button')
        expandButton.textContent = '詳細を表示'
        expandButton.className = 'disclosure-toggle'
        expandButton.setAttribute('aria-expanded', 'false')
        expandButton.setAttribute('aria-controls', `disclosure-${index}`)
        
        section.id = `disclosure-${index}`
        section.before(expandButton)
        
        expandButton.addEventListener('click', () => {
          const isExpanded = section.classList.toggle('disclosure-hidden')
          expandButton.setAttribute('aria-expanded', (!isExpanded).toString())
          expandButton.textContent = isExpanded ? '詳細を表示' : '詳細を隠す'
        })
      }
    })
  }

  /**
   * 言語の簡素化
   */
  private simplifyLanguage(element: HTMLElement): void {
    if (!this.config.customizations.simplifyLanguage) return

    // 複雑な単語の置換辞書
    const simplifications: Record<string, string> = {
      '実装': '作成',
      '最適化': '改善',
      '効率的': '早い',
      '包括的': '全体的',
      '詳細': '細かい説明',
      '設定': '設定',
      '機能': '働き',
      '操作': '使い方'
    }

    const textNodes = this.getTextNodes(element)
    textNodes.forEach(node => {
      let text = node.textContent || ''
      Object.entries(simplifications).forEach(([complex, simple]) => {
        text = text.replace(new RegExp(complex, 'g'), simple)
      })
      node.textContent = text
    })
  }

  /**
   * 同時オプションの削減
   */
  private reduceSimultaneousOptions(element: HTMLElement): void {
    const interactiveElements = element.querySelectorAll('button, input, select, a[href]')
    
    if (interactiveElements.length > this.config.maxSimultaneousElements) {
      // 優先度の低い要素を一時的に隠す
      Array.from(interactiveElements)
        .slice(this.config.maxSimultaneousElements)
        .forEach((el, index) => {
          el.classList.add('cognitive-hidden')
          
          // 「さらに表示」ボタンを追加
          if (index === 0) {
            const showMoreButton = document.createElement('button')
            showMoreButton.textContent = 'さらに表示'
            showMoreButton.className = 'show-more-options'
            
            showMoreButton.addEventListener('click', () => {
              element.querySelectorAll('.cognitive-hidden').forEach(hiddenEl => {
                hiddenEl.classList.remove('cognitive-hidden')
              })
              showMoreButton.remove()
            })
            
            el.before(showMoreButton)
          }
        })
    }
  }

  /**
   * 視覚デザインの簡素化
   */
  private simplifyVisualDesign(element: HTMLElement): void {
    if (this.config.customizations.reduceClutter) {
      // 装飾的な要素を隠す
      element.querySelectorAll('.decoration, .ornament, [data-decorative]').forEach(el => {
        (el as HTMLElement).style.display = 'none'
      })

      // アニメーションを削減
      if (this.config.customizations.reduceAnimations) {
        element.querySelectorAll('*').forEach(el => {
          (el as HTMLElement).style.animation = 'none'
          ;(el as HTMLElement).style.transition = 'none'
        })
      }
    }
  }

  /**
   * メモリ支援の追加
   */
  private addMemorySupports(element: HTMLElement): void {
    // ブレッドクラム（パンくずリスト）の追加
    this.implementBreadcrumbs(element)
    
    // 進行状況インジケーター
    this.addProgressIndicators(element)
    
    // 前回の選択の記憶
    this.implementSelectionMemory(element)
  }

  /**
   * ブレッドクラムの実装
   */
  private implementBreadcrumbs(element: HTMLElement): void {
    const existingBreadcrumb = element.querySelector('.cognitive-breadcrumb')
    if (existingBreadcrumb) return

    const breadcrumb = document.createElement('nav')
    breadcrumb.className = 'cognitive-breadcrumb'
    breadcrumb.setAttribute('aria-label', '現在位置')
    
    const ol = document.createElement('ol')
    ol.className = 'breadcrumb-list'
    
    // 現在のページの階層を推定
    const hierarchy = this.estimatePageHierarchy()
    hierarchy.forEach((item, index) => {
      const li = document.createElement('li')
      li.className = 'breadcrumb-item'
      
      if (index < hierarchy.length - 1) {
        const link = document.createElement('a')
        link.href = item.url || '#'
        link.textContent = item.name
        li.appendChild(link)
      } else {
        li.textContent = item.name
        li.setAttribute('aria-current', 'page')
      }
      
      ol.appendChild(li)
    })
    
    breadcrumb.appendChild(ol)
    element.prepend(breadcrumb)
  }

  /**
   * 意思決定支援の実装
   */
  private implementDecisionSupport(element: HTMLElement): void {
    const choiceElements = element.querySelectorAll('select, input[type="radio"], .choice-group')
    
    choiceElements.forEach(choiceEl => {
      // 推奨オプションの表示
      this.addRecommendationBadges(choiceEl as HTMLElement)
      
      // 選択の影響を説明
      this.addChoiceConsequences(choiceEl as HTMLElement)
      
      // デフォルト選択の提供
      this.setSmartDefaults(choiceEl as HTMLElement)
    })
  }

  /**
   * コンテキストヘルプの設定
   */
  private setupContextualHelp(element: HTMLElement): void {
    if (!this.config.contextualHelpEnabled) return

    const helpableElements = element.querySelectorAll('[data-help], .needs-help')
    
    helpableElements.forEach((el, index) => {
      const helpButton = document.createElement('button')
      helpButton.className = 'contextual-help-trigger'
      helpButton.setAttribute('aria-label', 'ヘルプを表示')
      helpButton.innerHTML = '?'
      
      const helpContent = el.getAttribute('data-help') || 'ヘルプ情報が利用できます'
      const helpId = `help-${index}`
      
      helpButton.addEventListener('click', () => {
        this.showContextualHelp(helpContent, el as HTMLElement, helpId)
      })
      
      el.appendChild(helpButton)
    })
  }

  /**
   * ユーザープロファイル適応の適用
   */
  private applyUserProfileAdaptations(element: HTMLElement): void {
    // 注意力持続時間に基づく調整
    if (this.userProfile.attentionSpan === 'short') {
      this.addFrequentBreaks(element)
      this.implementMicroInteractions(element)
    }

    // 処理速度に基づく調整
    if (this.userProfile.processingSpeed === 'slow') {
      this.extendTimeouts(element)
      this.addProcessingIndicators(element)
    }

    // 記憶容量に基づく調整
    if (this.userProfile.memoryCapacity === 'limited') {
      this.maximizeMemoryAids(element)
      this.implementStepByStepGuidance(element)
    }

    // 疲労レベルに基づく調整
    if (this.userProfile.fatigueLevel > 0.7) {
      this.appliFatigueReduction(element)
    }
  }

  /**
   * 疲労監視の開始
   */
  private startFatigueMonitoring(): void {
    if (!this.config.fatigueMonitoring) return

    this.fatigueMonitor = setInterval(() => {
      this.updateFatigueLevel()
      
      if (this.userProfile.fatigueLevel > 0.8) {
        this.suggestBreak()
      }
    }, 60000) // 1分毎にチェック
  }

  /**
   * 疲労レベルの更新
   */
  private updateFatigueLevel(): void {
    const recentInteractions = this.interactionHistory.filter(
      interaction => Date.now() - interaction.timestamp < 600000 // 過去10分
    )

    const interactionRate = recentInteractions.length / 10 // per minute
    const avgDuration = recentInteractions.reduce((sum, int) => sum + int.duration, 0) / recentInteractions.length

    // 疲労レベルの計算（簡易版）
    const fatigueIndicators = [
      interactionRate > 10 ? 0.3 : 0, // 高頻度操作
      avgDuration > 5000 ? 0.2 : 0,  // 長時間操作
      recentInteractions.some(int => int.action === 'error') ? 0.2 : 0 // エラーの発生
    ]

    this.userProfile.fatigueLevel = Math.min(
      fatigueIndicators.reduce((sum, indicator) => sum + indicator, 0),
      1
    )
  }

  /**
   * 休憩の提案
   */
  private suggestBreak(): void {
    const breakSuggestion = document.createElement('div')
    breakSuggestion.className = 'break-suggestion'
    breakSuggestion.innerHTML = `
      <div class="break-message">
        <h3>休憩をおすすめします</h3>
        <p>少し休憩を取ることで、より良いパフォーマンスを発揮できます。</p>
        <button class="take-break-btn">5分休憩</button>
        <button class="continue-btn">続行</button>
      </div>
    `

    document.body.appendChild(breakSuggestion)

    breakSuggestion.querySelector('.take-break-btn')?.addEventListener('click', () => {
      this.implementBreakMode()
      breakSuggestion.remove()
    })

    breakSuggestion.querySelector('.continue-btn')?.addEventListener('click', () => {
      breakSuggestion.remove()
    })
  }

  /**
   * 休憩モードの実装
   */
  private implementBreakMode(): void {
    const overlay = document.createElement('div')
    overlay.className = 'break-mode-overlay'
    overlay.innerHTML = `
      <div class="break-content">
        <h2>休憩中</h2>
        <div class="break-timer">5:00</div>
        <p>リラックスして目を休めてください</p>
        <button class="end-break-btn">休憩を終了</button>
      </div>
    `

    document.body.appendChild(overlay)

    let timeLeft = 300 // 5分
    const timer = setInterval(() => {
      timeLeft--
      const minutes = Math.floor(timeLeft / 60)
      const seconds = timeLeft % 60
      const timerElement = overlay.querySelector('.break-timer')
      if (timerElement) {
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`
      }

      if (timeLeft <= 0) {
        clearInterval(timer)
        overlay.remove()
        this.userProfile.fatigueLevel = 0
      }
    }, 1000)

    overlay.querySelector('.end-break-btn')?.addEventListener('click', () => {
      clearInterval(timer)
      overlay.remove()
      this.userProfile.fatigueLevel *= 0.5 // 部分的な回復
    })
  }

  // ヘルパーメソッド
  private getTextNodes(element: HTMLElement): Text[] {
    const textNodes: Text[] = []
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )

    let node
    while (node = walker.nextNode()) {
      textNodes.push(node as Text)
    }

    return textNodes
  }

  private countDistinctColors(element: HTMLElement): number {
    const colors = new Set<string>()
    const allElements = element.querySelectorAll('*')
    
    allElements.forEach(el => {
      const styles = getComputedStyle(el)
      colors.add(styles.color)
      colors.add(styles.backgroundColor)
      colors.add(styles.borderColor)
    })

    return colors.size
  }

  private countDistinctFonts(element: HTMLElement): number {
    const fonts = new Set<string>()
    const allElements = element.querySelectorAll('*')
    
    allElements.forEach(el => {
      const styles = getComputedStyle(el)
      fonts.add(styles.fontFamily)
    })

    return fonts.size
  }

  private calculateFormComplexity(element: HTMLElement): number {
    const inputs = element.querySelectorAll('input, select, textarea')
    const requiredFields = element.querySelectorAll('[required]')
    const validationRules = element.querySelectorAll('[pattern], [min], [max]')

    const inputScore = Math.min(inputs.length / 15, 1)
    const requiredScore = Math.min(requiredFields.length / 10, 1)
    const validationScore = Math.min(validationRules.length / 8, 1)

    return (inputScore + requiredScore + validationScore) / 3
  }

  private calculateNavigationComplexity(element: HTMLElement): number {
    const navElements = element.querySelectorAll('nav, .navigation, .menu')
    const links = element.querySelectorAll('a[href]')
    const dropdowns = element.querySelectorAll('.dropdown, [data-dropdown]')

    const navScore = Math.min(navElements.length / 3, 1)
    const linkScore = Math.min(links.length / 20, 1)
    const dropdownScore = Math.min(dropdowns.length / 5, 1)

    return (navScore + linkScore + dropdownScore) / 3
  }

  private calculateInitialLoad(): CognitiveLoad {
    return {
      informational: 0,
      interactional: 0,
      visual: 0,
      temporal: 0,
      memorial: 0,
      decisional: 0,
      overall: 0
    }
  }

  private setupCognitiveSupport(): void {
    // CSS変数の設定
    document.documentElement.style.setProperty('--cognitive-max-elements', this.config.maxSimultaneousElements.toString())
    
    // 基本スタイルの注入
    this.injectCognitiveStyles()
  }

  private injectCognitiveStyles(): void {
    const styles = `
      .disclosure-hidden { display: none; }
      .disclosure-toggle {
        background: var(--primary-100);
        border: 1px solid var(--primary-300);
        border-radius: 4px;
        padding: 8px 16px;
        margin: 8px 0;
        cursor: pointer;
        font-size: 14px;
      }
      .cognitive-hidden { opacity: 0.3; pointer-events: none; }
      .show-more-options {
        background: var(--secondary-100);
        border: 2px dashed var(--secondary-300);
        border-radius: 8px;
        padding: 12px 24px;
        margin: 16px 0;
        cursor: pointer;
        width: 100%;
      }
      .cognitive-breadcrumb {
        background: var(--bg-secondary);
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 16px;
      }
      .breadcrumb-list {
        display: flex;
        list-style: none;
        padding: 0;
        margin: 0;
        gap: 8px;
      }
      .breadcrumb-item:not(:last-child)::after {
        content: ' › ';
        margin-left: 8px;
        color: var(--text-secondary);
      }
      .contextual-help-trigger {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--info-100);
        border: 1px solid var(--info-300);
        color: var(--info-600);
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        margin-left: 8px;
      }
      .break-suggestion {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .break-message {
        background: white;
        padding: 32px;
        border-radius: 16px;
        text-align: center;
        max-width: 400px;
      }
      .break-mode-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        color: white;
      }
      .break-content {
        text-align: center;
      }
      .break-timer {
        font-size: 48px;
        font-weight: bold;
        margin: 24px 0;
      }
    `

    const styleElement = document.createElement('style')
    styleElement.textContent = styles
    document.head.appendChild(styleElement)
  }

  // 追加の実装メソッド（簡略化）
  private estimatePageHierarchy(): Array<{ name: string, url?: string }> {
    return [
      { name: 'ホーム', url: '/' },
      { name: '現在のページ' }
    ]
  }

  private addRecommendationBadges(element: HTMLElement): void {
    // 実装省略
  }

  private addChoiceConsequences(element: HTMLElement): void {
    // 実装省略
  }

  private setSmartDefaults(element: HTMLElement): void {
    // 実装省略
  }

  private showContextualHelp(content: string, element: HTMLElement, id: string): void {
    // 実装省略
  }

  private addFrequentBreaks(element: HTMLElement): void {
    // 実装省略
  }

  private implementMicroInteractions(element: HTMLElement): void {
    // 実装省略
  }

  private extendTimeouts(element: HTMLElement): void {
    // 実装省略
  }

  private addProcessingIndicators(element: HTMLElement): void {
    // 実装省略
  }

  private maximizeMemoryAids(element: HTMLElement): void {
    // 実装省略
  }

  private implementStepByStepGuidance(element: HTMLElement): void {
    // 実装省略
  }

  private appliFatigueReduction(element: HTMLElement): void {
    // 実装省略
  }

  private addProgressIndicators(element: HTMLElement): void {
    // 実装省略
  }

  private implementSelectionMemory(element: HTMLElement): void {
    // 実装省略
  }

  private addGuidedInteraction(element: HTMLElement): void {
    // 実装省略
  }

  private reduceVisualClutter(element: HTMLElement): void {
    // 実装省略
  }

  private addRecommendations(element: HTMLElement): void {
    // 実装省略
  }

  /**
   * 現在の認知負荷を取得
   */
  public getCurrentLoad(): CognitiveLoad {
    return { ...this.currentLoad }
  }

  /**
   * ユーザープロファイルの更新
   */
  public updateUserProfile(updates: Partial<CognitiveProfile>): void {
    this.userProfile = { ...this.userProfile, ...updates }
  }

  /**
   * 設定の更新
   */
  public updateConfig(updates: Partial<CognitiveConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * インタラクション履歴の記録
   */
  public recordInteraction(action: string, duration: number): void {
    this.interactionHistory.push({
      timestamp: Date.now(),
      action,
      duration
    })

    // 履歴を最新100件に制限
    if (this.interactionHistory.length > 100) {
      this.interactionHistory.shift()
    }
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    if (this.fatigueMonitor) {
      clearInterval(this.fatigueMonitor)
    }
    this.focusManager?.destroy()
    this.memoryAids?.destroy()
    this.progressTracker?.destroy()
  }
}

// 簡易版の関連クラス
class FocusManager {
  constructor(private readonly config: CognitiveConfig, private readonly profile: CognitiveProfile) {}
  destroy(): void {}
}

class MemoryAidManager {
  constructor(private readonly config: CognitiveConfig) {}
  destroy(): void {}
}

class ProgressTrackingManager {
  destroy(): void {}
}

// Vue Composition API用のフック
export function useCognitiveAccessibility(
  config: Partial<CognitiveConfig> = {},
  userProfile: Partial<CognitiveProfile> = {}
) {
  const { ref, onMounted, onUnmounted } = require('vue')
  
  const cognitiveManager = ref<CognitiveAccessibilityManager | null>(null)
  const currentLoad = ref<CognitiveLoad | null>(null)
  const userFatigueLevel = ref(0)

  onMounted(() => {
    cognitiveManager.value = new CognitiveAccessibilityManager(config, userProfile)
    currentLoad.value = cognitiveManager.value.getCurrentLoad()
    userFatigueLevel.value = cognitiveManager.value['userProfile'].fatigueLevel

    onUnmounted(() => {
      cognitiveManager.value?.destroy()
    })
  })

  const optimizeElement = (element: HTMLElement) => {
    cognitiveManager.value?.optimizeForCognitiveLoad(element)
    currentLoad.value = cognitiveManager.value?.getCurrentLoad() || null
  }

  const calculateLoad = (element: HTMLElement) => {
    return cognitiveManager.value?.calculateCognitiveLoad(element)
  }

  const recordInteraction = (action: string, duration: number) => {
    cognitiveManager.value?.recordInteraction(action, duration)
  }

  return {
    cognitiveManager,
    currentLoad,
    userFatigueLevel,
    optimizeElement,
    calculateLoad,
    recordInteraction
  }
}